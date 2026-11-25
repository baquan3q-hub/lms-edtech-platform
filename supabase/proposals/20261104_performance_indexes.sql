-- CANDIDATE ONLY: not part of migration-order.json; never auto-apply to live DB.
-- Compare performance-catalog.sql output with these definitions first. IF NOT EXISTS
-- checks names, not equivalent indexes. Keep only candidates supported by EXPLAIN.
-- Regular CREATE INDEX is for a local/restored staging DB. For production, prepare
-- a separate CONCURRENTLY rollout outside a transaction after staging validation.
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

-- Shared actor lookup: WHERE user_id=? AND status='active' ORDER BY created_at.
CREATE INDEX IF NOT EXISTS perf_memberships_active_user_created
ON public.school_memberships(user_id, created_at, id)
INCLUDE (school_id, role) WHERE status = 'active';

-- Latest activation status; supports deterministic tie-breaking by id.
CREATE INDEX IF NOT EXISTS perf_activations_user_recent
ON public.account_activations(user_id, created_at DESC, id DESC) INCLUDE (status);

-- Student/parent active-class lookup; existing (class_id,student_id) is reversed.
CREATE INDEX IF NOT EXISTS perf_enrollments_active_student_class
ON public.enrollments(student_id, class_id) WHERE status = 'active';

-- Teacher assignment lookup including school isolation.
CREATE INDEX IF NOT EXISTS perf_assignments_school_teacher_class
ON public.class_teacher_assignments(school_id, teacher_id, class_id)
WHERE status = 'active';

-- Parent linked-child lookup. Date validity still requires a predicate at read time.
CREATE INDEX IF NOT EXISTS perf_guardians_verified_school_parent
ON public.parent_students(school_id, parent_id, student_id)
WHERE verification_status = 'verified';

-- Attendance drill-down filtered by class and date.
CREATE INDEX IF NOT EXISTS perf_attendance_sessions_class_date
ON public.attendance_sessions(class_id, session_date DESC, id);
CREATE INDEX IF NOT EXISTS perf_attendance_records_student_session
ON public.attendance_records(student_id, session_id) INCLUDE (status);

-- Recent notifications without an is_read filter: the existing index has is_read
-- between user_id and created_at, which cannot directly supply this global order.
CREATE INDEX IF NOT EXISTS perf_notifications_user_recent
ON public.notifications(user_id, created_at DESC, id DESC);
COMMIT;
