-- Additive migration. Inspect the live schema and duplicate submissions before applying.
begin;
create table if not exists public.learning_sessions (
 id uuid primary key default gen_random_uuid(), student_id uuid not null references public.users(id),
 started_at timestamptz not null default now(), last_seen_at timestamptz not null default now(),
 ended_at timestamptz, end_reason text check(end_reason in ('logout','timeout')),
 state text not null default 'online' check(state in ('online','idle','offline'))
);
create index if not exists learning_sessions_student_time on public.learning_sessions(student_id, started_at desc);
create table if not exists public.learning_session_samples (
 event_id uuid primary key, session_id uuid not null references public.learning_sessions(id),
 student_id uuid not null references public.users(id), observed_from timestamptz not null, observed_to timestamptz not null,
 page_path text not null, active boolean not null, video boolean not null default false,
 check(observed_to >= observed_from and observed_to - observed_from <= interval '35 seconds')
);
create index if not exists learning_samples_student_time on public.learning_session_samples(student_id, observed_to desc);
alter table public.student_activity_logs add column if not exists event_id uuid;
alter table public.student_activity_logs add column if not exists session_id uuid references public.learning_sessions(id);
alter table public.student_activity_logs add column if not exists attempt_id uuid;
alter table public.student_activity_logs add column if not exists occurred_at timestamptz;
alter table public.student_activity_logs add column if not exists received_at timestamptz not null default now();
create unique index if not exists activity_event_unique on public.student_activity_logs(event_id);
create index if not exists activity_attempt_lookup on public.student_activity_logs(student_id, class_id, attempt_id, occurred_at);

create table if not exists public.exam_attempts (
 id uuid primary key default gen_random_uuid(), exam_id uuid not null references public.exams(id), student_id uuid not null references public.users(id),
 started_at timestamptz not null default now(), expires_at timestamptz not null, submitted_at timestamptz,
 snapshot jsonb not null, draft_answers jsonb not null default '[]', draft_version integer not null default 0,
 unique(exam_id, student_id)
);
alter table public.exam_submissions add column if not exists attempt_id uuid references public.exam_attempts(id);
alter table public.exam_submissions add column if not exists objective_score numeric;
alter table public.exam_submissions add column if not exists rubric_grades jsonb;
alter table public.exam_submissions add column if not exists ai_rubric_draft jsonb;
alter table public.exam_submissions add column if not exists graded_by uuid references public.users(id);
alter table public.exam_submissions add column if not exists graded_at timestamptz;
create unique index if not exists one_exam_submission_per_student on public.exam_submissions(exam_id, student_id);
create table if not exists public.grade_audit (
 id uuid primary key default gen_random_uuid(), submission_id uuid not null references public.exam_submissions(id),
 actor_id uuid not null references public.users(id), previous_score numeric, new_score numeric not null,
 reason text not null, rubric_grades jsonb, created_at timestamptz not null default now()
);
create table if not exists public.video_progress (
 student_id uuid not null references public.users(id), item_id uuid not null references public.course_items(id),
 intervals jsonb not null default '[]', position_seconds numeric not null default 0, duration_seconds numeric not null,
 coverage numeric not null default 0 check(coverage between 0 and 1), updated_at timestamptz not null default now(),
 primary key(student_id,item_id)
);
alter table public.student_progress add column if not exists completion_source text;
alter table public.student_behavior_scores add column if not exists data_status text not null default 'legacy';
alter table public.student_behavior_scores add column if not exists analysis_status text not null default 'legacy';
alter table public.student_behavior_scores add column if not exists attempt_id uuid;
alter table public.quiz_individual_analysis add column if not exists source_hash text;
alter table public.quiz_individual_analysis add column if not exists prompt_version text;
alter table public.quiz_individual_analysis add column if not exists model_name text;
alter table public.quiz_class_analysis add column if not exists source_hash text;

create table if not exists public.school_terms (
 id uuid primary key default gen_random_uuid(), school_year text not null, name text not null,
 starts_on date not null, ends_on date not null, check(ends_on >= starts_on), unique(school_year,name)
);
create table if not exists public.homerooms (
 id uuid primary key default gen_random_uuid(), term_id uuid not null references public.school_terms(id),
 name text not null, grade_level integer not null check(grade_level between 6 and 12), unique(term_id,name)
);
alter table public.classes add column if not exists term_id uuid references public.school_terms(id);
alter table public.classes add column if not exists homeroom_id uuid references public.homerooms(id);
alter table public.classes add column if not exists subject text;
alter table public.classes add column if not exists pilot_enabled boolean not null default false;
create table if not exists public.class_teacher_assignments (
 id uuid primary key default gen_random_uuid(), class_id uuid not null references public.classes(id),
 teacher_id uuid not null references public.users(id), active boolean not null default true, unique(class_id,teacher_id)
);
alter table public.course_items add column if not exists study_due_at timestamptz;
alter table public.course_items add column if not exists school_session_id uuid;
alter table public.homework add column if not exists school_session_id uuid;
alter table public.exams add column if not exists school_session_id uuid;

create table if not exists public.learning_ai_jobs (
 id uuid primary key default gen_random_uuid(), requested_by uuid not null references public.users(id),
 exam_id uuid not null references public.exams(id), submission_id uuid references public.exam_submissions(id),
 kind text not null check(kind in ('individual','class')), source_hash text not null,
 status text not null default 'queued' check(status in ('queued','running','ready','failed')),
 attempts integer not null default 0, available_at timestamptz not null default now(), locked_at timestamptz,
 error_code text, created_at timestamptz not null default now(), finished_at timestamptz,
 unique(kind, source_hash)
);

-- New storage is only accessed through authorized server APIs; no direct browser writes.
do $$ declare t text; begin
 foreach t in array array['learning_sessions','learning_session_samples','exam_attempts','grade_audit','video_progress','school_terms','homerooms','class_teacher_assignments','learning_ai_jobs'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
revoke insert, update, delete on public.student_activity_logs from anon, authenticated;

create or replace function public.learning_heartbeat(p_student uuid, p_session uuid, p_event uuid, p_page text, p_active boolean, p_video boolean)
returns void language plpgsql security definer set search_path = public as $$
declare s learning_sessions; begin
 select * into s from learning_sessions where id=p_session and student_id=p_student for update;
 if not found or s.ended_at is not null then raise exception 'SESSION_CLOSED'; end if;
 if exists(select 1 from learning_session_samples where event_id=p_event) then return; end if;
 if s.last_seen_at < now()-interval '90 seconds' then raise exception 'SESSION_EXPIRED'; end if;
 insert into learning_session_samples(event_id,session_id,student_id,observed_from,observed_to,page_path,active,video)
 values(p_event,p_session,p_student,greatest(s.last_seen_at, now()-interval '30 seconds'),now(),p_page,p_active,p_video);
 update learning_sessions set last_seen_at=now(), state=case when p_active or p_video then 'online' else 'idle' end where id=p_session;
end $$;

create or replace function public.submit_learning_exam(p_student uuid, p_attempt uuid, p_answers jsonb)
returns public.exam_submissions language plpgsql security definer set search_path = public as $$
declare a exam_attempts; s exam_submissions; q jsonb; ans jsonb; correct text; pts numeric:=0; essay boolean:=false; idx integer:=0; chosen jsonb;
begin
 select * into a from exam_attempts where id=p_attempt and student_id=p_student for update;
 if not found then raise exception 'ATTEMPT_NOT_FOUND'; end if;
 select * into s from exam_submissions where attempt_id=a.id;
 if found then return s; end if;
 chosen := case when now()>a.expires_at then a.draft_answers else p_answers end;
 for q in select value from jsonb_array_elements(a.snapshot->'questions') loop
  ans:=chosen->idx;
  if q->>'type'='ESSAY' then essay:=true;
  else
   select value->>'id' into correct from jsonb_array_elements(q->'options') where value->>'isCorrect'='true' limit 1;
   if correct is not null and ans->>'selectedOptionId'=correct then pts:=pts+coalesce((q->>'points')::numeric,1); end if;
  end if; idx:=idx+1;
 end loop;
 insert into exam_submissions(exam_id,student_id,attempt_id,answers,score,objective_score,total_points,started_at,submitted_at,time_taken_seconds,grading_status)
 values(a.exam_id,p_student,a.id,chosen,case when essay then null else pts end,pts,(a.snapshot->>'total_points')::numeric,a.started_at,now(),
 greatest(0,extract(epoch from least(now(),a.expires_at)-a.started_at)::integer),case when essay then 'pending' else 'graded' end) returning * into s;
 update exam_attempts set submitted_at=now(), draft_answers=chosen where id=a.id;
 return s;
end $$;

create or replace function public.approve_learning_grade(p_submission uuid,p_actor uuid,p_score numeric,p_reason text,p_rubric jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare s exam_submissions; begin
 select * into s from exam_submissions where id=p_submission for update;
 if not found or p_score < 0 or p_score > s.total_points or length(trim(p_reason))=0 then raise exception 'INVALID_GRADE'; end if;
 insert into grade_audit(submission_id,actor_id,previous_score,new_score,reason,rubric_grades) values(s.id,p_actor,s.score,p_score,p_reason,p_rubric);
 update exam_submissions set score=p_score, rubric_grades=p_rubric, grading_status='graded',graded_at=now(),graded_by=p_actor where id=s.id;
end $$;
revoke all on function public.learning_heartbeat(uuid,uuid,uuid,text,boolean,boolean) from public,anon,authenticated;
revoke all on function public.submit_learning_exam(uuid,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.approve_learning_grade(uuid,uuid,numeric,text,jsonb) from public,anon,authenticated;
grant execute on function public.learning_heartbeat(uuid,uuid,uuid,text,boolean,boolean) to service_role;
grant execute on function public.submit_learning_exam(uuid,uuid,jsonb) to service_role;
grant execute on function public.approve_learning_grade(uuid,uuid,numeric,text,jsonb) to service_role;
commit;
