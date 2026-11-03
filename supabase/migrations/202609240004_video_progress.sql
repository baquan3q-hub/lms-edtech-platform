begin;
create or replace function public.save_learning_video(p_student uuid,p_item uuid,p_position numeric,p_duration numeric,p_intervals jsonb)
returns numeric language plpgsql security definer set search_path=public as $$
declare previous jsonb; combined jsonb; covered numeric; begin
 perform pg_advisory_xact_lock(hashtext(p_student::text||p_item::text));
 select intervals into previous from video_progress where student_id=p_student and item_id=p_item;
 with ranges as (select range_agg(numrange((r->>0)::numeric,(r->>1)::numeric,'[)')) rs from jsonb_array_elements(coalesce(previous,'[]')||p_intervals) r)
 select coalesce(jsonb_agg(jsonb_build_array(lower(r),upper(r))),'[]'),coalesce(sum(upper(r)-lower(r)),0) into combined,covered from ranges,unnest(rs) r;
 covered:=least(1,covered/p_duration);
 insert into video_progress(student_id,item_id,intervals,position_seconds,duration_seconds,coverage) values(p_student,p_item,combined,p_position,p_duration,covered)
 on conflict(student_id,item_id) do update set intervals=excluded.intervals,position_seconds=excluded.position_seconds,duration_seconds=excluded.duration_seconds,coverage=excluded.coverage,updated_at=now();
 insert into student_progress(student_id,item_id,status,last_accessed,completed_at,completion_source)
 values(p_student,p_item,case when covered>=0.9 then 'completed' else 'in_progress' end,now(),case when covered>=0.9 then now() else null end,case when covered>=0.9 then 'video_coverage' else null end)
 on conflict(student_id,item_id) do update set status=case when covered>=0.9 then 'completed' else student_progress.status end,last_accessed=now(),completed_at=case when covered>=0.9 then coalesce(student_progress.completed_at,now()) else student_progress.completed_at end,completion_source=case when covered>=0.9 then 'video_coverage' else student_progress.completion_source end;
 return covered;
end $$;
revoke all on function public.save_learning_video(uuid,uuid,numeric,numeric,jsonb) from public,anon,authenticated;
grant execute on function public.save_learning_video(uuid,uuid,numeric,numeric,jsonb) to service_role;
commit;
