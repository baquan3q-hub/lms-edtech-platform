-- Forward-only migration. Apply to a restored staging database before production.
BEGIN;

ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS teacher_id uuid REFERENCES public.users(id);
ALTER TABLE public.exam_submissions ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 0;
ALTER TABLE public.homework_submissions ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 0;
ALTER TABLE public.outbox_events ADD COLUMN IF NOT EXISTS schema_version integer NOT NULL DEFAULT 1;
ALTER TABLE public.outbox_events ADD COLUMN IF NOT EXISTS claim_token uuid;
ALTER TABLE public.outbox_events ADD COLUMN IF NOT EXISTS locked_until timestamptz;
ALTER TABLE public.learning_ai_jobs ALTER COLUMN exam_id DROP NOT NULL;
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='learning_ai_jobs' AND column_name='source_hash') THEN
    ALTER TABLE public.learning_ai_jobs ALTER COLUMN source_hash DROP NOT NULL;
  END IF;
END $$;
ALTER TABLE public.learning_ai_jobs ALTER COLUMN actual_tokens DROP NOT NULL;
ALTER TABLE public.learning_ai_jobs ADD COLUMN IF NOT EXISTS source_data_hash text;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin');
$$;

CREATE OR REPLACE FUNCTION public.school_actor_active(p_actor uuid, p_school uuid, p_roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT p_actor IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.account_activations a WHERE a.user_id = p_actor AND a.status <> 'used'
      AND a.id = (SELECT b.id FROM public.account_activations b WHERE b.user_id = p_actor ORDER BY b.created_at DESC, b.id DESC LIMIT 1)
  ) AND (EXISTS (SELECT 1 FROM public.users WHERE id = p_actor AND role = 'super_admin')
    OR EXISTS (SELECT 1 FROM public.school_memberships WHERE user_id = p_actor AND school_id = p_school AND status = 'active' AND role = ANY(p_roles)));
$$;

CREATE OR REPLACE FUNCTION public.can_teach_school_class(p_actor uuid, p_class uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classes c WHERE c.id = p_class AND c.school_id IS NOT NULL
      AND public.school_actor_active(p_actor, c.school_id, ARRAY['admin','teacher'])
      AND (EXISTS(SELECT 1 FROM public.users WHERE id=p_actor AND role='super_admin')
        OR EXISTS(SELECT 1 FROM public.school_memberships WHERE user_id=p_actor AND school_id=c.school_id AND status='active' AND role='admin')
        OR EXISTS(SELECT 1 FROM public.class_teacher_assignments a WHERE a.class_id=c.id AND a.teacher_id=p_actor AND a.school_id=c.school_id
          AND a.status='active' AND a.valid_from <= (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AND (a.valid_to IS NULL OR a.valid_to >= (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date))
        OR (c.teacher_id=p_actor AND NOT EXISTS(SELECT 1 FROM public.class_teacher_assignments a WHERE a.class_id=c.id AND a.teacher_id=p_actor)))
  );
$$;

CREATE OR REPLACE FUNCTION public.enroll_school_student(p_actor uuid, p_school uuid, p_class uuid, p_student uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE c public.classes; enrollment_id uuid;
BEGIN
  IF NOT public.school_actor_active(p_actor,p_school,ARRAY['admin']) OR NOT EXISTS(
    SELECT 1 FROM public.school_memberships WHERE user_id=p_student AND school_id=p_school AND role='student' AND status='active'
  ) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  SELECT * INTO c FROM public.classes WHERE id=p_class AND school_id=p_school FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CLASS_NOT_FOUND'; END IF;
  SELECT id INTO enrollment_id FROM public.enrollments WHERE class_id=p_class AND student_id=p_student AND status='active' LIMIT 1;
  IF FOUND THEN RETURN enrollment_id; END IF;
  IF (SELECT count(*) FROM public.enrollments WHERE class_id=p_class AND status='active') >= c.max_students THEN RAISE EXCEPTION 'CLASS_FULL'; END IF;
  SELECT id INTO enrollment_id FROM public.enrollments WHERE class_id=p_class AND student_id=p_student ORDER BY enrolled_at DESC LIMIT 1;
  IF FOUND THEN UPDATE public.enrollments SET status='active', enrolled_at=now() WHERE id=enrollment_id;
  ELSE INSERT INTO public.enrollments(class_id,student_id,status) VALUES(p_class,p_student,'active') RETURNING id INTO enrollment_id; END IF;
  INSERT INTO public.audit_events(school_id,actor_id,action,entity_type,entity_id,after_state)
    VALUES(p_school,p_actor,'enrollment.created','enrollments',enrollment_id,jsonb_build_object('class_id',p_class,'student_id',p_student));
  RETURN enrollment_id;
END $$;

CREATE OR REPLACE FUNCTION public.reorder_school_content(p_actor uuid,p_class uuid,p_updates jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  -- Serialize edits to this tree before checking parent relationships.
  PERFORM 1 FROM public.classes WHERE id=p_class FOR UPDATE;
  IF NOT public.can_teach_school_class(p_actor,p_class) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF jsonb_typeof(p_updates) <> 'array' OR jsonb_array_length(p_updates) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'INVALID_ORDER'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_to_recordset(p_updates) AS u(id uuid,parent_id uuid,order_index integer)
    LEFT JOIN public.course_items i ON i.id=u.id AND i.class_id=p_class
    LEFT JOIN public.course_items parent ON parent.id=u.parent_id AND parent.class_id=p_class AND parent.type='folder'
    WHERE i.id IS NULL OR u.order_index IS NULL OR u.order_index<0 OR (u.parent_id IS NOT NULL AND parent.id IS NULL))
    OR (SELECT count(*) <> count(DISTINCT id) FROM jsonb_to_recordset(p_updates) AS u(id uuid))
    THEN RAISE EXCEPTION 'INVALID_TREE'; END IF;
  UPDATE public.course_items i SET parent_id=u.parent_id,order_index=u.order_index
    FROM jsonb_to_recordset(p_updates) AS u(id uuid,parent_id uuid,order_index integer) WHERE i.id=u.id AND i.class_id=p_class;
  IF EXISTS (
    WITH RECURSIVE tree AS (
      SELECT id,parent_id,ARRAY[id] AS path,false AS cycle FROM public.course_items WHERE class_id=p_class
      UNION ALL SELECT t.id,i.parent_id,t.path||i.id,i.id=ANY(t.path)
        FROM tree t JOIN public.course_items i ON i.id=t.parent_id WHERE NOT t.cycle
    ) SELECT 1 FROM tree WHERE cycle
  ) THEN RAISE EXCEPTION 'CONTENT_CYCLE'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.set_school_grade(p_actor uuid,p_kind text,p_submission uuid,p_score numeric,p_publish boolean,p_reason text,p_feedback text DEFAULT NULL,p_rubric jsonb DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE row_data jsonb; class_id uuid; school_id uuid; max_score numeric; next_status text; prior_status text; new_revision integer; table_name text;
BEGIN
  IF p_kind NOT IN ('exam','homework') THEN RAISE EXCEPTION 'INVALID_KIND'; END IF;
  table_name := CASE WHEN p_kind='exam' THEN 'exam_submissions' ELSE 'homework_submissions' END;
  EXECUTE format('SELECT to_jsonb(s) FROM public.%I s WHERE id=$1 FOR UPDATE',table_name) INTO row_data USING p_submission;
  IF row_data IS NULL THEN RAISE EXCEPTION 'SUBMISSION_NOT_FOUND'; END IF;
  IF p_kind='exam' THEN SELECT e.class_id,e.school_id,(row_data->>'total_points')::numeric INTO class_id,school_id,max_score FROM public.exams e WHERE e.id=(row_data->>'exam_id')::uuid;
  ELSE SELECT h.class_id,h.school_id,coalesce((row_data->>'total_points')::numeric,h.total_points) INTO class_id,school_id,max_score FROM public.homework h WHERE h.id=(row_data->>'homework_id')::uuid; END IF;
  IF school_id IS NULL OR NOT public.can_teach_school_class(p_actor,class_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF p_score IS NULL OR p_score='NaN'::numeric OR p_score<0 OR p_score>max_score THEN RAISE EXCEPTION 'INVALID_SCORE'; END IF;
  prior_status := row_data->>'grading_status';
  IF prior_status='locked' THEN RAISE EXCEPTION 'GRADE_LOCKED'; END IF;
  IF prior_status='published' AND (row_data->>'score')::numeric IS DISTINCT FROM p_score AND length(trim(coalesce(p_reason,'')))=0 THEN RAISE EXCEPTION 'REASON_REQUIRED'; END IF;
  next_status := CASE WHEN p_publish OR prior_status='published' THEN 'published' ELSE 'draft' END;
  IF (row_data->>'score')::numeric IS NOT DISTINCT FROM p_score AND prior_status=next_status
    AND (p_feedback IS NULL OR row_data->>'feedback' IS NOT DISTINCT FROM p_feedback)
    AND (p_rubric IS NULL OR row_data->'rubric_grades' IS NOT DISTINCT FROM p_rubric) THEN RETURN next_status; END IF;
  IF p_kind='exam' THEN
    UPDATE public.exam_submissions SET score=p_score,grading_status=next_status,graded_by=p_actor,graded_at=now(),rubric_grades=coalesce(p_rubric,rubric_grades) WHERE id=p_submission;
  ELSE
    UPDATE public.homework_submissions SET score=p_score,grading_status=next_status,graded_by=p_actor,graded_at=now(),feedback=coalesce(p_feedback,feedback),status='graded' WHERE id=p_submission;
  END IF;
  IF row_data->>'score' IS NOT NULL AND (row_data->>'score')::numeric IS DISTINCT FROM p_score THEN
    INSERT INTO public.score_adjustments(school_id,submission_type,submission_id,actor_id,old_score,new_score,reason,rubric_breakdown)
      VALUES(school_id,p_kind,p_submission,p_actor,(row_data->>'score')::numeric,p_score,coalesce(nullif(trim(p_reason),''),'Chấm điểm ban đầu'),p_rubric);
  END IF;
  INSERT INTO public.audit_events(school_id,actor_id,action,entity_type,entity_id,before_state,after_state,reason)
    VALUES(school_id,p_actor,p_kind||'.grade_saved',table_name,p_submission,
      jsonb_build_object('score',row_data->'score','grading_status',prior_status),jsonb_build_object('score',p_score,'grading_status',next_status),p_reason);
  RETURN next_status;
END $$;

-- Core writes and their events commit together, including writes from legacy adapters.
CREATE OR REPLACE FUNCTION public.emit_submission_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE kind text; resource_id uuid; resource_class uuid; resource_school uuid; event_type text;
BEGIN
  kind := CASE WHEN TG_TABLE_NAME='exam_submissions' THEN 'exam' ELSE 'homework' END;
  resource_id := (to_jsonb(NEW)->>(kind||'_id'))::uuid;
  IF kind='exam' THEN SELECT class_id,school_id INTO resource_class,resource_school FROM public.exams WHERE id=resource_id;
  ELSE SELECT class_id,school_id INTO resource_class,resource_school FROM public.homework WHERE id=resource_id; END IF;
  IF resource_school IS NULL THEN RAISE EXCEPTION 'MISSING_SCHOOL_SCOPE'; END IF;
  IF TG_OP='INSERT' THEN NEW.revision:=1; event_type:=kind||'.submitted';
  ELSE
    NEW.revision:=OLD.revision+1;
    IF NEW.answers IS DISTINCT FROM OLD.answers THEN event_type:=kind||'.submitted';
    ELSIF NEW.grading_status IN ('published','locked') AND (NEW.score IS DISTINCT FROM OLD.score OR NEW.grading_status IS DISTINCT FROM OLD.grading_status) THEN event_type:=kind||'.grade_published';
    END IF;
  END IF;
  IF event_type IS NOT NULL THEN
    INSERT INTO public.outbox_events(school_id,event_type,aggregate_type,aggregate_id,event_key,payload,schema_version)
      VALUES(resource_school,event_type,TG_TABLE_NAME,NEW.id,event_type||':'||NEW.id||':'||NEW.revision,
        jsonb_build_object('student_id',NEW.student_id,'class_id',resource_class,'resource_id',resource_id,'revision',NEW.revision),1);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER learning_exam_outbox BEFORE INSERT OR UPDATE ON public.exam_submissions FOR EACH ROW EXECUTE FUNCTION public.emit_submission_event();
CREATE TRIGGER learning_homework_outbox BEFORE INSERT OR UPDATE ON public.homework_submissions FOR EACH ROW EXECUTE FUNCTION public.emit_submission_event();

CREATE TABLE public.learning_metric_projections (
  school_id uuid NOT NULL REFERENCES public.schools(id), student_id uuid NOT NULL REFERENCES public.users(id),
  class_id uuid NOT NULL REFERENCES public.classes(id), metrics jsonb NOT NULL,
  rules_version text NOT NULL, computed_at timestamptz NOT NULL DEFAULT now(),
  support_count integer GENERATED ALWAYS AS (coalesce(jsonb_array_length(metrics->'support_signals'),0)) STORED,
  PRIMARY KEY(school_id,student_id,class_id)
);
ALTER TABLE public.learning_metric_projections ENABLE ROW LEVEL SECURITY;
CREATE INDEX learning_metrics_priority ON public.learning_metric_projections(school_id,class_id,support_count DESC,student_id);
REVOKE ALL ON public.learning_metric_projections FROM anon,authenticated;
GRANT ALL ON public.learning_metric_projections TO service_role;

-- Curated source facts: no names, answers, unpublished scores or telemetry judgments.
CREATE VIEW public.learning_metric_facts AS
SELECT c.school_id,e.student_id,e.class_id,
  (SELECT count(*) FROM public.homework h WHERE h.class_id=c.id AND h.is_published AND h.publication_status='published') AS assigned_count,
  (SELECT count(*) FROM public.homework_submissions s JOIN public.homework h ON h.id=s.homework_id WHERE h.class_id=c.id AND s.student_id=e.student_id AND h.is_published AND h.publication_status='published') AS submitted_count,
  (SELECT count(*) FROM public.homework_submissions s JOIN public.homework h ON h.id=s.homework_id WHERE h.class_id=c.id AND s.student_id=e.student_id AND h.is_published AND h.publication_status='published' AND (h.due_date IS NULL OR s.submitted_at<=h.due_date)) AS on_time_count,
  (SELECT jsonb_agg(x.value) FROM (
    SELECT value FROM (SELECT DISTINCT ON (s.exam_id) s.score/nullif(s.total_points,0)*10 AS value FROM public.exam_submissions s JOIN public.exams ex ON ex.id=s.exam_id
      WHERE ex.class_id=c.id AND ex.school_id=c.school_id AND s.student_id=e.student_id AND s.grading_status IN ('published','locked') AND s.score IS NOT NULL AND s.total_points>0
      ORDER BY s.exam_id,s.submitted_at DESC NULLS LAST,s.id DESC) latest_exams
    UNION ALL SELECT s.score/nullif(coalesce((to_jsonb(s)->>'total_points')::numeric,h.total_points),0)*10 FROM public.homework_submissions s JOIN public.homework h ON h.id=s.homework_id
      WHERE h.class_id=c.id AND h.school_id=c.school_id AND s.student_id=e.student_id AND s.grading_status IN ('published','locked') AND s.score IS NOT NULL AND h.total_points>0
  ) x) AS published_scores,
  (SELECT count(*) FROM public.attendance_records a JOIN public.attendance_sessions s ON s.id=a.session_id WHERE s.class_id=c.id AND a.student_id=e.student_id AND a.status='absent') AS unexcused_absences
FROM public.enrollments e JOIN public.classes c ON c.id=e.class_id WHERE e.status='active' AND c.school_id IS NOT NULL;
REVOKE ALL ON public.learning_metric_facts FROM public,anon,authenticated;
GRANT SELECT ON public.learning_metric_facts TO service_role;

-- Direct browser access cannot expose answer keys or bypass publication DTOs.
DO $$ DECLARE policy record; table_name text; BEGIN
  FOREACH table_name IN ARRAY ARRAY['exams','exam_submissions','homework','homework_submissions','item_contents'] LOOP
    FOR policy IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=table_name LOOP
      EXECUTE format('DROP POLICY %I ON public.%I',policy.policyname,table_name);
    END LOOP;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',table_name);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon,authenticated',table_name);
    EXECUTE format('GRANT ALL ON public.%I TO service_role',table_name);
  END LOOP;
END $$;

DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='lms_analytics_worker') THEN CREATE ROLE lms_analytics_worker NOLOGIN; END IF;
END $$;
GRANT USAGE ON SCHEMA public TO lms_analytics_worker;
GRANT SELECT ON public.outbox_events,public.learning_metric_facts TO lms_analytics_worker;
GRANT UPDATE(status,attempts,available_at,last_error_code,last_error_message,processed_at,claim_token,locked_until) ON public.outbox_events TO lms_analytics_worker;
CREATE POLICY analytics_queue ON public.outbox_events FOR ALL TO lms_analytics_worker USING (true) WITH CHECK (true);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.learning_metric_projections TO lms_analytics_worker;
CREATE POLICY analytics_projections ON public.learning_metric_projections FOR ALL TO lms_analytics_worker USING (true) WITH CHECK (true);

REVOKE ALL ON FUNCTION public.enroll_school_student(uuid,uuid,uuid,uuid),public.reorder_school_content(uuid,uuid,jsonb),public.set_school_grade(uuid,text,uuid,numeric,boolean,text,text,jsonb) FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.enroll_school_student(uuid,uuid,uuid,uuid),public.reorder_school_content(uuid,uuid,jsonb),public.set_school_grade(uuid,text,uuid,numeric,boolean,text,text,jsonb) TO service_role;
COMMIT;
