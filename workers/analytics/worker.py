"""A leased PostgreSQL outbox consumer; no access to raw student answers.

Use a login role that inherits only lms_analytics_worker. Never use the database
owner or Supabase service role. Projection refresh and acknowledgement share a
transaction. Periodic reconciliation also repairs missed legacy events.
"""
import json
import logging
import os
import signal
import time
from uuid import UUID, uuid4

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from metrics import compute_metrics, RULES_VERSION

EVENTS = ["exam.submitted", "homework.submitted", "exam.grade_published", "homework.grade_published", "attendance.changed", "enrollment.changed"]
running = True
log = logging.getLogger("lms.analytics")


class InvalidEvent(ValueError):
    pass


class LeaseLost(RuntimeError):
    pass


def event_scope(event: dict) -> tuple[str, str, str]:
    if event["schema_version"] != 1:
        raise InvalidEvent("UNSUPPORTED_EVENT_VERSION")
    try:
        payload = event["payload"]
        return tuple(str(UUID(str(value))) for value in (
            event["school_id"], payload["student_id"], payload["class_id"]
        ))
    except (ValueError, TypeError, KeyError) as error:
        raise InvalidEvent("INVALID_EVENT_SCOPE") from error


def retry_delay(attempt: int) -> int:
    return min(300, 5 * 2 ** max(0, min(attempt - 1, 10)))


def claim(conn) -> dict | None:
    token = uuid4()
    with conn.transaction():
        conn.execute("""UPDATE public.outbox_events SET status='dead_letter',locked_until=NULL,claim_token=NULL,
            last_error_code='ATTEMPTS_EXHAUSTED'
            WHERE attempts>=max_attempts AND event_type=ANY(%s)
              AND (status='pending' OR (status='processing' AND (locked_until IS NULL OR locked_until<now())))""", (EVENTS,))
        return conn.execute("""WITH candidate AS (
            SELECT id FROM public.outbox_events WHERE event_type=ANY(%s) AND attempts<max_attempts
              AND ((status='pending' AND available_at<=now()) OR (status='processing' AND (locked_until IS NULL OR locked_until<now())))
            ORDER BY available_at,created_at,id FOR UPDATE SKIP LOCKED LIMIT 1
          ) UPDATE public.outbox_events e SET status='processing', attempts=e.attempts+1,
              claim_token=%s,locked_until=now()+interval '60 seconds'
            FROM candidate c WHERE e.id=c.id RETURNING e.*""", (EVENTS, token)).fetchone()


def refresh(conn, scope: tuple[str, str, str]) -> None:
    # Serialize the same aggregate before reading its source facts. A replay
    # recomputes the current truth instead of incrementing a counter twice.
    conn.execute("SELECT pg_advisory_xact_lock(hashtextextended(%s,0))", (":".join(scope),))
    facts = conn.execute("""SELECT * FROM public.learning_metric_facts
        WHERE school_id=%s AND student_id=%s AND class_id=%s""", scope).fetchone()
    if facts is None:
        conn.execute("DELETE FROM public.learning_metric_projections WHERE school_id=%s AND student_id=%s AND class_id=%s", scope)
        return
    conn.execute("""INSERT INTO public.learning_metric_projections(school_id,student_id,class_id,metrics,rules_version,computed_at)
        VALUES(%s,%s,%s,%s,%s,now()) ON CONFLICT(school_id,student_id,class_id)
        DO UPDATE SET metrics=excluded.metrics,rules_version=excluded.rules_version,computed_at=excluded.computed_at""",
        (*scope, Jsonb(compute_metrics(facts)), RULES_VERSION))


def process(conn, event: dict) -> None:
    scope = event_scope(event)
    with conn.transaction():
        lease = conn.execute("""SELECT id FROM public.outbox_events
            WHERE id=%s AND claim_token=%s AND status='processing' AND locked_until>now() FOR UPDATE""",
            (event["id"], event["claim_token"])).fetchone()
        if lease is None:
            raise LeaseLost()
        refresh(conn, scope)
        updated = conn.execute("""UPDATE public.outbox_events SET status='completed',processed_at=now(),
            claim_token=NULL,locked_until=NULL,last_error_code=NULL,last_error_message=NULL
            WHERE id=%s AND claim_token=%s AND locked_until>clock_timestamp()""", (event["id"], event["claim_token"]))
        if updated.rowcount != 1:
            raise LeaseLost()  # Roll back the projection too.


def fail(conn, event: dict, error: Exception) -> None:
    permanent = isinstance(error, InvalidEvent)
    code = str(error) if permanent else "PROCESSING_FAILED"
    # Do not persist SQL values, student identifiers or credentials in error text.
    with conn.transaction():
        conn.execute("""UPDATE public.outbox_events SET
            status=CASE WHEN %s OR attempts>=max_attempts THEN 'dead_letter' ELSE 'pending' END,
            available_at=now()+(%s * interval '1 second'),last_error_code=%s,
            last_error_message=NULL,claim_token=NULL,locked_until=NULL
            WHERE id=%s AND claim_token=%s""",
            (permanent,retry_delay(event["attempts"]),code,event["id"],event["claim_token"]))


def reconcile(conn) -> int:
    scopes = conn.execute("SELECT DISTINCT school_id,student_id,class_id FROM public.learning_metric_facts").fetchall()
    for row in scopes:
        if not running:
            break
        with conn.transaction():
            refresh(conn, tuple(str(row[k]) for k in ("school_id", "student_id", "class_id")))
    return len(scopes)


def stop(_signum, _frame):
    global running
    running = False


def main():
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    dsn = os.environ.get("ANALYTICS_DATABASE_URL")
    if not dsn:
        raise SystemExit("ANALYTICS_DATABASE_URL is required")
    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    while running:
        try:
            with psycopg.connect(dsn, autocommit=True, row_factory=dict_row,
                                 connect_timeout=10, options="-c statement_timeout=30000 -c lock_timeout=10000") as conn:
                capabilities = conn.execute("""SELECT
                  pg_has_role(current_user,'lms_analytics_worker','member') AS worker,
                  has_table_privilege(current_user,'public.exam_submissions','SELECT') AS raw_access""").fetchone()
                if not capabilities["worker"] or capabilities["raw_access"]:
                    raise SystemExit("Worker requires its restricted database role")
                next_reconcile = 0.0
                while running:
                    if time.monotonic() >= next_reconcile:
                        count = reconcile(conn)
                        next_reconcile = time.monotonic() + 120
                        log.info(json.dumps({"event":"analytics.reconciled","aggregates":count}))
                    event = claim(conn)
                    if event is None:
                        time.sleep(3)
                        continue
                    try:
                        process(conn, event)
                    except LeaseLost:
                        log.warning(json.dumps({"event":"analytics.lease_lost","eventId":str(event["id"])}))
                    except Exception as error:
                        fail(conn, event, error)
                        log.warning(json.dumps({"event":"analytics.job_failed","eventId":str(event["id"]),"permanent":isinstance(error, InvalidEvent)}))
        except psycopg.Error:
            log.error('{"event":"analytics.database_unavailable"}')
            time.sleep(5)


if __name__ == "__main__":
    main()
