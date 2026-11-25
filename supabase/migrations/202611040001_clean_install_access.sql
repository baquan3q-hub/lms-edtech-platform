BEGIN;
-- Explicit grants are needed after recreating public. RLS remains the row guard.
GRANT USAGE ON SCHEMA public TO authenticated,service_role;
GRANT SELECT ON public.schools,public.school_memberships,public.academic_years,
  public.terms,public.grade_levels,public.subjects,public.homerooms,
  public.homeroom_enrollments,public.class_teacher_assignments TO authenticated;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notifications FROM anon,authenticated;
GRANT SELECT ON public.notifications TO authenticated;
GRANT UPDATE(is_read) ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
DROP POLICY IF EXISTS notification_owner_read ON public.notifications;
CREATE POLICY notification_owner_read ON public.notifications FOR SELECT TO authenticated
  USING(user_id=(SELECT auth.uid()));
DROP POLICY IF EXISTS notification_owner_mark_read ON public.notifications;
CREATE POLICY notification_owner_mark_read ON public.notifications FOR UPDATE TO authenticated
  USING(user_id=(SELECT auth.uid())) WITH CHECK(user_id=(SELECT auth.uid()));

-- Close mutable search paths left by legacy utility/trigger functions.
DO $$ DECLARE routine record; BEGIN
  FOR routine IN SELECT p.oid::regprocedure AS signature
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prokind='f'
      AND NOT EXISTS(SELECT 1 FROM unnest(coalesce(p.proconfig,ARRAY[]::text[])) setting WHERE setting LIKE 'search_path=%')
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path=public,pg_temp',routine.signature);
  END LOOP;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
