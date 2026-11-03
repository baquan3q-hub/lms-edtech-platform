begin;
create or replace function public.ingest_learning_events(p_student uuid,p_events jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare recent integer; begin
 perform pg_advisory_xact_lock(hashtext(p_student::text));
 select count(*) into recent from student_activity_logs where student_id=p_student and received_at>now()-interval '1 minute';
 if recent+jsonb_array_length(p_events)>240 then raise exception 'RATE_LIMIT'; end if;
 insert into student_activity_logs(student_id,event_id,session_id,attempt_id,occurred_at,activity_type,context_type,context_id,class_id,metadata)
 select p_student,(e->>'event_id')::uuid,(e->>'session_id')::uuid,(e->>'attempt_id')::uuid,(e->>'occurred_at')::timestamptz,
 e->>'activity_type',e->>'context_type',e->>'context_id',(e->>'class_id')::uuid,e->'metadata' from jsonb_array_elements(p_events) e
 on conflict(event_id) do nothing;
end $$;
revoke all on function public.ingest_learning_events(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.ingest_learning_events(uuid,jsonb) to service_role;
commit;
