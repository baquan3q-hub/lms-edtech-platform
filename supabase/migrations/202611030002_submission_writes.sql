BEGIN;
ALTER TABLE public.homework_submissions ADD COLUMN IF NOT EXISTS questions_snapshot jsonb;
ALTER TABLE public.homework_submissions ADD COLUMN IF NOT EXISTS total_points numeric;

CREATE OR REPLACE FUNCTION public.begin_school_exam(p_student uuid,p_exam uuid)
RETURNS public.exam_attempts LANGUAGE plpgsql SECURITY DEFINER SET search_path = public,pg_temp AS $$
DECLARE e public.exams; a public.exam_attempts; next_number integer; expiry timestamptz;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_student::text||':'||p_exam::text,0));
  SELECT * INTO e FROM public.exams WHERE id=p_exam FOR SHARE;
  IF NOT FOUND OR e.school_id IS NULL OR NOT e.is_published OR e.publication_status<>'published' THEN RAISE EXCEPTION 'EXAM_UNAVAILABLE'; END IF;
  IF NOT public.school_actor_active(p_student,e.school_id,ARRAY['student']) OR NOT EXISTS(
    SELECT 1 FROM public.enrollments WHERE student_id=p_student AND class_id=e.class_id AND status='active'
  ) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  SELECT * INTO a FROM public.exam_attempts WHERE exam_id=p_exam AND student_id=p_student AND submitted_at IS NULL AND expires_at>now() ORDER BY attempt_no DESC LIMIT 1;
  IF FOUND THEN RETURN a; END IF;
  IF e.due_date IS NOT NULL AND e.due_date<=now() THEN RAISE EXCEPTION 'EXAM_DEADLINE_EXPIRED'; END IF;
  SELECT coalesce(max(attempt_no),0)+1 INTO next_number FROM public.exam_attempts WHERE exam_id=p_exam AND student_id=p_student;
  IF next_number>e.max_attempts THEN RAISE EXCEPTION 'MAX_ATTEMPTS_REACHED'; END IF;
  IF e.duration_minutes IS NULL OR e.duration_minutes<=0 THEN RAISE EXCEPTION 'INVALID_DURATION'; END IF;
  expiry:=least(now()+make_interval(mins=>e.duration_minutes),coalesce(e.due_date,'infinity'::timestamptz));
  INSERT INTO public.exam_attempts(exam_id,student_id,school_id,attempt_no,expires_at,snapshot,draft_answers,draft_version)
    VALUES(e.id,p_student,e.school_id,next_number,expiry,jsonb_build_object('questions',e.questions,'total_points',e.total_points,'created_at',now()),'[]',0)
    RETURNING * INTO a;
  RETURN a;
END $$;

CREATE OR REPLACE FUNCTION public.submit_school_homework(p_student uuid,p_homework uuid,p_answers jsonb,p_request_key text)
RETURNS public.homework_submissions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public,pg_temp AS $$
DECLARE h public.homework; s public.homework_submissions; existing_key public.idempotency_keys;
  q jsonb; answer jsonb; points numeric:=0; manual boolean:=false; body_hash text; attempts integer;
BEGIN
  IF p_request_key IS NULL OR length(p_request_key)>100 OR length(p_request_key)<1 OR jsonb_typeof(p_answers)<>'array' OR jsonb_array_length(p_answers)>100 THEN RAISE EXCEPTION 'INVALID_SUBMISSION'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_student::text||':'||p_homework::text,0));
  SELECT * INTO h FROM public.homework WHERE id=p_homework FOR SHARE;
  IF NOT FOUND OR h.school_id IS NULL THEN RAISE EXCEPTION 'HOMEWORK_NOT_FOUND'; END IF;
  IF NOT public.school_actor_active(p_student,h.school_id,ARRAY['student']) OR NOT EXISTS(
    SELECT 1 FROM public.enrollments WHERE student_id=p_student AND class_id=h.class_id AND status='active'
  ) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  body_hash:=md5(jsonb_build_object('homework_id',p_homework,'answers',p_answers)::text);
  SELECT * INTO existing_key FROM public.idempotency_keys WHERE school_id=h.school_id AND actor_id=p_student AND operation='homework.submit' AND request_key=p_request_key;
  IF FOUND THEN
    IF existing_key.request_hash<>body_hash THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT'; END IF;
    SELECT * INTO s FROM public.homework_submissions WHERE id=(existing_key.response_data->>'submission_id')::uuid;
    RETURN s;
  END IF;
  IF NOT h.is_published OR h.publication_status<>'published' OR (h.due_date IS NOT NULL AND h.due_date<now()) THEN RAISE EXCEPTION 'HOMEWORK_UNAVAILABLE_OR_EXPIRED'; END IF;
  IF (SELECT count(*)<>count(DISTINCT value->>'question_id') FROM jsonb_array_elements(p_answers)) OR EXISTS(
    SELECT 1 FROM jsonb_array_elements(p_answers) supplied(value) WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(h.questions) defined(value) WHERE defined.value->>'id'=supplied.value->>'question_id')
  ) THEN RAISE EXCEPTION 'INVALID_ANSWERS'; END IF;
  FOR q IN SELECT value FROM jsonb_array_elements(h.questions) LOOP
    SELECT value INTO answer FROM jsonb_array_elements(p_answers) WHERE value->>'question_id'=q->>'id';
    IF q->>'type'='multiple_choice' THEN
      IF EXISTS(SELECT 1 FROM jsonb_array_elements(q->'options') o WHERE o->>'id'=answer->>'selected_option_id' AND o->>'isCorrect'='true') THEN points:=points+coalesce((q->>'points')::numeric,0); END IF;
    ELSE manual:=true; END IF;
  END LOOP;
  SELECT * INTO s FROM public.homework_submissions WHERE homework_id=p_homework AND student_id=p_student ORDER BY submitted_at DESC LIMIT 1 FOR UPDATE;
  IF FOUND THEN
    IF s.grading_status='locked' OR coalesce(s.attempts,1)>=h.max_attempts THEN RAISE EXCEPTION 'MAX_ATTEMPTS_REACHED'; END IF;
    UPDATE public.homework_submissions SET answers=p_answers,score=CASE WHEN manual THEN NULL ELSE points END,
      grading_status=CASE WHEN manual THEN 'ungraded' ELSE 'draft' END,status='submitted',feedback=NULL,graded_by=NULL,graded_at=NULL,
      total_points=h.total_points,questions_snapshot=h.questions,submitted_at=now(),attempts=coalesce(s.attempts,1)+1,
      attempt_history=coalesce(s.attempt_history,'[]'::jsonb)||jsonb_build_array(to_jsonb(s)-'attempt_history') WHERE id=s.id RETURNING * INTO s;
  ELSE
    INSERT INTO public.homework_submissions(homework_id,student_id,answers,score,grading_status,status,total_points,questions_snapshot,submitted_at,attempts)
      VALUES(h.id,p_student,p_answers,CASE WHEN manual THEN NULL ELSE points END,CASE WHEN manual THEN 'ungraded' ELSE 'draft' END,'submitted',h.total_points,h.questions,now(),1) RETURNING * INTO s;
  END IF;
  INSERT INTO public.idempotency_keys(school_id,actor_id,operation,request_key,request_hash,response_data,status)
    VALUES(h.school_id,p_student,'homework.submit',p_request_key,body_hash,jsonb_build_object('submission_id',s.id),'completed');
  RETURN s;
END $$;

CREATE OR REPLACE FUNCTION public.emit_learning_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public,pg_temp AS $$
DECLARE row_data jsonb; cls uuid; school uuid; kind text;
BEGIN
  row_data:=coalesce(to_jsonb(NEW),to_jsonb(OLD));
  IF TG_OP='UPDATE' AND to_jsonb(NEW) IS NOT DISTINCT FROM to_jsonb(OLD) THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME='attendance_records' THEN
    SELECT s.class_id INTO cls FROM public.attendance_sessions s WHERE s.id=(row_data->>'session_id')::uuid;
    kind:='attendance.changed';
  ELSE cls:=(row_data->>'class_id')::uuid; kind:='enrollment.changed'; END IF;
  SELECT school_id INTO school FROM public.classes WHERE id=cls;
  IF school IS NOT NULL THEN
    INSERT INTO public.outbox_events(school_id,event_type,aggregate_type,aggregate_id,event_key,payload)
      VALUES(school,kind,TG_TABLE_NAME,(row_data->>'id')::uuid,kind||':'||gen_random_uuid(),jsonb_build_object('student_id',row_data->>'student_id','class_id',cls));
  END IF;
  RETURN coalesce(NEW,OLD);
END $$;
CREATE TRIGGER learning_attendance_outbox AFTER INSERT OR UPDATE OR DELETE ON public.attendance_records FOR EACH ROW EXECUTE FUNCTION public.emit_learning_change();
CREATE TRIGGER learning_enrollment_outbox AFTER INSERT OR UPDATE OR DELETE ON public.enrollments FOR EACH ROW EXECUTE FUNCTION public.emit_learning_change();

REVOKE ALL ON FUNCTION public.begin_school_exam(uuid,uuid),public.submit_school_homework(uuid,uuid,jsonb,text) FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.begin_school_exam(uuid,uuid),public.submit_school_homework(uuid,uuid,jsonb,text) TO service_role;
COMMIT;
