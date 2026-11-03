BEGIN;
CREATE OR REPLACE FUNCTION public.can_read_school_user(p_target uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
  SELECT p_target=auth.uid()
    OR (public.is_platform_admin() AND public.school_actor_active(auth.uid(),NULL,ARRAY[]::text[]))
    OR EXISTS(SELECT 1 FROM public.school_memberships mine JOIN public.school_memberships theirs ON theirs.school_id=mine.school_id
      WHERE mine.user_id=auth.uid() AND mine.role='admin' AND mine.status='active' AND theirs.user_id=p_target
        AND public.school_actor_active(auth.uid(),mine.school_id,ARRAY['admin']))
    OR EXISTS(SELECT 1 FROM public.enrollments e WHERE e.student_id=p_target AND e.status='active' AND public.can_teach_school_class(auth.uid(),e.class_id))
    OR EXISTS(SELECT 1 FROM public.parent_students p WHERE p.parent_id=auth.uid() AND p.student_id=p_target AND p.verification_status='verified'
      AND public.school_actor_active(auth.uid(),p.school_id,ARRAY['parent'])
      AND (p.valid_from IS NULL OR p.valid_from<=(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
      AND (p.valid_to IS NULL OR p.valid_to>=(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date));
$$;
CREATE OR REPLACE FUNCTION public.can_read_school_class(p_class uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
  SELECT public.can_teach_school_class(auth.uid(),p_class)
    OR EXISTS(SELECT 1 FROM public.enrollments e JOIN public.classes c ON c.id=e.class_id
      WHERE e.class_id=p_class AND e.student_id=auth.uid() AND e.status='active'
        AND public.school_actor_active(auth.uid(),c.school_id,ARRAY['student']))
    OR EXISTS(SELECT 1 FROM public.parent_students p JOIN public.enrollments e ON e.student_id=p.student_id JOIN public.classes c ON c.id=e.class_id
      WHERE p.parent_id=auth.uid() AND p.verification_status='verified' AND p.school_id=c.school_id AND e.class_id=p_class AND e.status='active'
        AND public.school_actor_active(auth.uid(),c.school_id,ARRAY['parent'])
        AND (p.valid_from IS NULL OR p.valid_from<=(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
        AND (p.valid_to IS NULL OR p.valid_to>=(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date));
$$;

DO $$ DECLARE policy record; table_name text; BEGIN
  FOREACH table_name IN ARRAY ARRAY['users','profiles','classes','courses','enrollments','parent_students','student_identifiers','guardian_identifiers'] LOOP
    FOR policy IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=table_name LOOP
      EXECUTE format('DROP POLICY %I ON public.%I',policy.policyname,table_name);
    END LOOP;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',table_name);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon,authenticated',table_name);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated',table_name);
    EXECUTE format('GRANT ALL ON public.%I TO service_role',table_name);
  END LOOP;
END $$;
CREATE POLICY users_scoped_read ON public.users FOR SELECT TO authenticated USING(public.can_read_school_user(id));
CREATE POLICY profiles_scoped_read ON public.profiles FOR SELECT TO authenticated USING(public.can_read_school_user(user_id));
CREATE POLICY classes_scoped_read ON public.classes FOR SELECT TO authenticated USING(public.can_read_school_class(id));
CREATE POLICY courses_scoped_read ON public.courses FOR SELECT TO authenticated USING(public.school_actor_active(auth.uid(),school_id,ARRAY['admin','teacher','student','parent']));
CREATE POLICY enrollments_scoped_read ON public.enrollments FOR SELECT TO authenticated USING(public.can_read_school_class(class_id) AND public.can_read_school_user(student_id));
CREATE POLICY guardians_scoped_read ON public.parent_students FOR SELECT TO authenticated USING(
  (parent_id=auth.uid() AND verification_status='verified' AND public.school_actor_active(auth.uid(),school_id,ARRAY['parent']))
  OR public.school_actor_active(auth.uid(),school_id,ARRAY['admin'])
);
CREATE POLICY student_codes_scoped_read ON public.student_identifiers FOR SELECT TO authenticated USING(public.can_read_school_user(user_id));
CREATE POLICY guardian_codes_scoped_read ON public.guardian_identifiers FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.school_actor_active(auth.uid(),school_id,ARRAY['admin']));

-- Policies invoke these as their definer, while HTTP callers cannot probe arbitrary actors.
REVOKE ALL ON FUNCTION public.school_actor_active(uuid,uuid,text[]),public.can_teach_school_class(uuid,uuid) FROM public,anon,authenticated;
-- school_actor_active is used directly in policies, so wrap its actor argument.
CREATE OR REPLACE FUNCTION public.my_school_access(p_school uuid,p_roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
  SELECT public.school_actor_active(auth.uid(),p_school,p_roles);
$$;
DROP POLICY courses_scoped_read ON public.courses;
CREATE POLICY courses_scoped_read ON public.courses FOR SELECT TO authenticated USING(public.my_school_access(school_id,ARRAY['admin','teacher','student','parent']));
DROP POLICY guardians_scoped_read ON public.parent_students;
CREATE POLICY guardians_scoped_read ON public.parent_students FOR SELECT TO authenticated USING(
  (parent_id=auth.uid() AND verification_status='verified' AND public.my_school_access(school_id,ARRAY['parent'])) OR public.my_school_access(school_id,ARRAY['admin'])
);
DROP POLICY guardian_codes_scoped_read ON public.guardian_identifiers;
CREATE POLICY guardian_codes_scoped_read ON public.guardian_identifiers FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.my_school_access(school_id,ARRAY['admin']));
GRANT EXECUTE ON FUNCTION public.school_actor_active(uuid,uuid,text[]),public.can_teach_school_class(uuid,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.is_teacher_of_class(target_class_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
  SELECT public.can_teach_school_class(auth.uid(),target_class_id);
$$;
CREATE OR REPLACE FUNCTION public.is_student_in_class(target_class_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
  SELECT EXISTS(SELECT 1 FROM public.enrollments e JOIN public.classes c ON c.id=e.class_id
    WHERE e.class_id=target_class_id AND e.student_id=auth.uid() AND e.status='active'
      AND public.school_actor_active(auth.uid(),c.school_id,ARRAY['student']));
$$;
CREATE OR REPLACE FUNCTION public.user_has_school_role(p_user_id uuid,p_school_id uuid,p_role text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
  SELECT p_user_id=auth.uid() AND public.school_actor_active(auth.uid(),p_school_id,ARRAY[p_role,'admin']);
$$;
-- PostgreSQL grants EXECUTE to PUBLIC by default. Close legacy definer RPCs too.
DO $$ DECLARE routine record; BEGIN
  FOR routine IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prosecdef LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM public,anon,authenticated',routine.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',routine.signature);
  END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION public.get_user_role(),public.is_platform_admin(),public.is_school_member(uuid),
  public.can_read_school_user(uuid),public.can_read_school_class(uuid),public.my_school_access(uuid,text[]),
  public.is_teacher_of_class(uuid),public.is_student_in_class(uuid),public.user_has_school_role(uuid,uuid,text)
  TO authenticated;
COMMIT;
