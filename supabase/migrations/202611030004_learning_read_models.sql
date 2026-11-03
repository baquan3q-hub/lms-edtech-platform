BEGIN;
CREATE INDEX IF NOT EXISTS exams_published_due ON public.exams(class_id,due_date) WHERE is_published AND publication_status='published';
CREATE INDEX IF NOT EXISTS homework_published_due ON public.homework(class_id,due_date) WHERE is_published AND publication_status='published';
CREATE INDEX IF NOT EXISTS exam_student_recent ON public.exam_submissions(student_id,exam_id,submitted_at DESC);
CREATE INDEX IF NOT EXISTS homework_student_recent ON public.homework_submissions(student_id,homework_id,submitted_at DESC);
CREATE OR REPLACE FUNCTION public.get_student_today(p_student uuid,p_school uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.school_actor_active(p_student,p_school,ARRAY['student']) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  WITH my_classes AS (
    SELECT DISTINCT c.id,c.name FROM public.classes c JOIN public.enrollments e ON e.class_id=c.id
    WHERE e.student_id=p_student AND e.status='active' AND c.school_id=p_school
  ), work AS (
    SELECT x.id,x.title,x.class_id,c.name AS class_name,x.due_date,'exam' AS kind,s.id AS submission_id,s.grading_status,s.graded_at
    FROM my_classes c JOIN public.exams x ON x.class_id=c.id
    LEFT JOIN LATERAL(SELECT id,grading_status,graded_at FROM public.exam_submissions WHERE exam_id=x.id AND student_id=p_student ORDER BY submitted_at DESC NULLS LAST,id DESC LIMIT 1) s ON true
    WHERE x.school_id=p_school AND x.is_published AND x.publication_status='published'
    UNION ALL
    SELECT h.id,h.title,h.class_id,c.name,h.due_date,'homework',s.id,s.grading_status,s.graded_at
    FROM my_classes c JOIN public.homework h ON h.class_id=c.id
    LEFT JOIN LATERAL(SELECT id,grading_status,graded_at FROM public.homework_submissions WHERE homework_id=h.id AND student_id=p_student ORDER BY submitted_at DESC NULLS LAST,id DESC LIMIT 1) s ON true
    WHERE h.school_id=p_school AND h.is_published AND h.publication_status='published'
  ), items AS (
    SELECT *,jsonb_build_object('id',id,'title',title,'kind',kind,'className',coalesce(class_name,'Lớp học'),
      'dueAt',due_date,'overdue',coalesce(due_date<now(),false),
      'href','/student/classes/'||class_id||CASE WHEN kind='exam' THEN '/exams/' ELSE '/homework/' END||id) AS item FROM work
  ) SELECT jsonb_build_object(
    'classes',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'name',name) ORDER BY name,id) FROM my_classes),'[]'::jsonb),
    'tasks',coalesce((SELECT jsonb_agg(item ORDER BY due_date NULLS LAST,id) FROM (SELECT * FROM items WHERE submission_id IS NULL ORDER BY due_date NULLS LAST,id LIMIT 8) pending),'[]'::jsonb),
    'feedback',coalesce((SELECT jsonb_agg(item ORDER BY graded_at DESC NULLS LAST,id) FROM (SELECT * FROM items WHERE grading_status IN ('published','locked') ORDER BY graded_at DESC NULLS LAST,id LIMIT 6) published),'[]'::jsonb),
    'pendingCount',(SELECT count(*) FROM items WHERE submission_id IS NULL),
    'hasMore',(SELECT count(*)>8 FROM items WHERE submission_id IS NULL)
  ) INTO result;
  RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.get_teaching_classes(p_actor uuid,p_school uuid)
RETURNS TABLE(id uuid,name text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
  SELECT c.id,c.name FROM public.classes c WHERE c.school_id=p_school
    AND public.school_actor_active(p_actor,p_school,ARRAY['teacher','admin']) AND public.can_teach_school_class(p_actor,c.id)
    ORDER BY c.name,c.id;
$$;
REVOKE ALL ON FUNCTION public.get_student_today(uuid,uuid),public.get_teaching_classes(uuid,uuid) FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_today(uuid,uuid),public.get_teaching_classes(uuid,uuid) TO service_role;

-- Legacy sessions span schools. Aggregate only samples within authorized class paths.
CREATE OR REPLACE FUNCTION public.learning_activity_summary_scoped(
  p_actor uuid,p_school uuid,p_classes uuid[],p_students uuid[],p_from timestamptz,p_until timestamptz)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
WITH clipped AS (
  SELECT s.student_id,s.active,s.video,
    tstzrange(greatest(s.observed_from,p_from),least(s.observed_to,p_until),'[)') r
  FROM public.learning_session_samples s
  WHERE s.student_id=ANY(p_students) AND s.observed_to>p_from AND s.observed_from<p_until
    AND s.observed_to>s.observed_from AND p_until>p_from
    AND EXISTS(SELECT 1 FROM public.classes c JOIN public.enrollments e ON e.class_id=c.id
      WHERE c.id=ANY(p_classes) AND c.school_id=p_school AND e.student_id=s.student_id AND e.status='active'
      AND public.school_actor_active(p_actor,p_school,ARRAY['teacher','admin'])
      AND public.can_teach_school_class(p_actor,c.id)
      AND (s.page_path='/student/classes/'||c.id OR s.page_path LIKE '/student/classes/'||c.id||'/%'))
), ranges AS (
  SELECT student_id,count(*) samples,min(lower(r)) started_at,max(upper(r)) last_seen_at,
    range_agg(r) opened,range_agg(r) FILTER(WHERE active) interacted,range_agg(r) FILTER(WHERE video) watched
  FROM clipped GROUP BY student_id
), totals AS (
  SELECT student_id,samples,started_at,last_seen_at,NULL::timestamptz ended_at,NULL::text end_reason,'recorded'::text state,
    coalesce((SELECT sum(extract(epoch FROM upper(r)-lower(r))) FROM unnest(opened) r),0) open_seconds,
    coalesce((SELECT sum(extract(epoch FROM upper(r)-lower(r))) FROM unnest(interacted) r),0) active_seconds,
    coalesce((SELECT sum(extract(epoch FROM upper(r)-lower(r))) FROM unnest(watched) r),0) video_seconds
  FROM ranges
) SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM totals t;
$$;
REVOKE ALL ON FUNCTION public.learning_activity_summary_scoped(uuid,uuid,uuid[],uuid[],timestamptz,timestamptz) FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.learning_activity_summary_scoped(uuid,uuid,uuid[],uuid[],timestamptz,timestamptz) TO service_role;
COMMIT;
