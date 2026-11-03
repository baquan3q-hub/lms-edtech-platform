begin;
create or replace function public.learning_activity_summary(p_students uuid[],p_from timestamptz,p_until timestamptz)
returns jsonb language sql stable security definer set search_path=public as $$
with clipped as (
 select student_id,active,video,tstzrange(greatest(observed_from,p_from),least(observed_to,p_until),'[)') r
 from learning_session_samples where student_id=any(p_students) and observed_to>p_from and observed_from<p_until
), ranges as (
 select student_id,count(*) samples,range_agg(r) opened,range_agg(r) filter(where active) interacted,range_agg(r) filter(where video) watched from clipped group by student_id
), totals as (
 select student_id,samples,
 coalesce((select sum(extract(epoch from upper(r)-lower(r))) from unnest(opened) r),0) open_seconds,
 coalesce((select sum(extract(epoch from upper(r)-lower(r))) from unnest(interacted) r),0) active_seconds,
 coalesce((select sum(extract(epoch from upper(r)-lower(r))) from unnest(watched) r),0) video_seconds from ranges
), latest as (
 select distinct on(student_id) student_id,state,last_seen_at,ended_at,end_reason from learning_sessions
 where student_id=any(p_students) and started_at<p_until and last_seen_at>=p_from order by student_id,last_seen_at desc
), first_visit as (
 select student_id,min(greatest(started_at,p_from)) started_at from learning_sessions where student_id=any(p_students) and started_at<p_until and last_seen_at>=p_from group by student_id
)
select coalesce(jsonb_agg(to_jsonb(t)||to_jsonb(l)||jsonb_build_object('started_at',f.started_at)), '[]') from totals t join latest l using(student_id) join first_visit f using(student_id);
$$;
revoke all on function public.learning_activity_summary(uuid[],timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.learning_activity_summary(uuid[],timestamptz,timestamptz) to service_role;
commit;
