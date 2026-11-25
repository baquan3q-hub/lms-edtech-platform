import { randomBytes } from "node:crypto";

export function pilotAccounts() {
  const password = () => randomBytes(18).toString("base64url") + "aA7!";
  const accounts = [{ email: `admin-${randomBytes(3).toString("hex")}@lms-pilot.test`, role: "admin", full_name: "Quản trị LMS", password: password() }];
  const subjects = [["TOAN", "Toán"], ["VAN", "Ngữ văn"], ["ENG", "Tiếng Anh"]];
  for (let i = 1; i <= 15; i++) {
    const [subject_code, subjectName] = subjects[Math.floor((i - 1) / 5)];
    accounts.push({ email: `gv${String(i).padStart(2,"0")}@lms-pilot.test`, role: "teacher", full_name: `Giáo viên ${subjectName} ${(i - 1) % 5 + 1}`, subject_code, teacher_ordinal: (i - 1) % 5 + 1, password: password() });
  }
  for (let i = 1; i <= 200; i++) {
    const student_code = `HS${String(i).padStart(4,"0")}`;
    accounts.push({ email: `${student_code.toLowerCase()}@lms-pilot.test`, role: "student", full_name: `Học sinh ${String(i).padStart(3,"0")}`, student_code, homeroom_code: `12A${Math.floor((i - 1) / 50) + 1}`, password: password() });
  }
  return accounts;
}

export function pilotSeedSql(accounts) {
  const required = { admin: 1, teacher: 15, student: 200 };
  for (const [role, count] of Object.entries(required)) {
    if (accounts.filter(a => a.role === role).length !== count) throw new Error(`Unexpected ${role} count`);
  }
  if (accounts.length !== 216 || new Set(accounts.map(a => a.email)).size !== 216) throw new Error("Invalid account manifest");
  const publicAccounts = accounts.map(({ password, authId, ...account }) => account);
  const json = JSON.stringify(publicAccounts);
  if (json.includes("$pilot$")) throw new Error("Invalid SQL delimiter in manifest");
  return `BEGIN;
SET LOCAL statement_timeout='120s';
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM public.schools) OR EXISTS(SELECT 1 FROM public.users) THEN
    RAISE EXCEPTION 'PILOT_REQUIRES_EMPTY_APPLICATION';
  END IF;
END $$;
CREATE TEMP TABLE _pilot_accounts ON COMMIT DROP AS
SELECT * FROM jsonb_to_recordset($pilot$${json}$pilot$::jsonb)
AS x(email text,role text,full_name text,subject_code text,teacher_ordinal integer,student_code text,homeroom_code text);
DO $$ BEGIN
  IF (SELECT count(*) FROM auth.users a JOIN _pilot_accounts p ON lower(a.email)=p.email)<>216 THEN
    RAISE EXCEPTION 'AUTH_ACCOUNTS_NOT_READY';
  END IF;
END $$;
INSERT INTO public.users(id,email,role,full_name)
SELECT a.id,p.email,p.role,p.full_name FROM _pilot_accounts p JOIN auth.users a ON lower(a.email)=p.email;
CREATE TEMP TABLE _pilot_scope ON COMMIT DROP AS SELECT gen_random_uuid() AS school_id,gen_random_uuid() AS year_id,gen_random_uuid() AS term_id,gen_random_uuid() AS grade_id;
INSERT INTO public.schools(id,code,name,status,ai_enabled)
SELECT school_id,'LMS-THPT','Trường THPT LMS (dữ liệu mẫu)','active',false FROM _pilot_scope;
INSERT INTO public.school_memberships(school_id,user_id,role,status)
SELECT s.school_id,u.id,u.role,'active' FROM public.users u CROSS JOIN _pilot_scope s;
INSERT INTO public.academic_years(id,school_id,code,name,start_date,end_date,is_current,status)
SELECT year_id,school_id,'2026-2027','Năm học 2026–2027','2026-09-01','2027-05-31',true,'active' FROM _pilot_scope;
INSERT INTO public.terms(id,school_id,academic_year_id,code,name,semester_order,start_date,end_date,is_active)
SELECT term_id,school_id,year_id,'HK1','Học kỳ 1',1,'2026-09-01','2027-01-15',true FROM _pilot_scope;
INSERT INTO public.terms(school_id,academic_year_id,code,name,semester_order,start_date,end_date,is_active)
SELECT school_id,year_id,'HK2','Học kỳ 2',2,'2027-01-16','2027-05-31',false FROM _pilot_scope;
INSERT INTO public.grade_levels(id,school_id,level,code,name,is_active)
SELECT grade_id,school_id,12,'K12','Khối 12',true FROM _pilot_scope;
INSERT INTO public.subjects(school_id,code,name,department,is_active)
SELECT school_id,x.code,x.name,x.department,true FROM _pilot_scope
CROSS JOIN (VALUES('TOAN','Toán học','Toán'),('VAN','Ngữ văn','Ngữ văn'),('ENG','Tiếng Anh','Ngoại ngữ')) x(code,name,department);
INSERT INTO public.homerooms(school_id,academic_year_id,grade_level_id,code,name,room,status)
SELECT school_id,year_id,grade_id,'12A'||i,'Lớp 12A'||i,'P.'||(100+i),'active' FROM _pilot_scope CROSS JOIN generate_series(1,4) i;
INSERT INTO public.courses(school_id,name,description,mode,teacher_id)
SELECT s.school_id,sub.name||' 12','Chương trình dùng chung cho khối 12','offline',u.id
FROM _pilot_scope s JOIN public.subjects sub ON sub.school_id=s.school_id
JOIN _pilot_accounts a ON a.subject_code=sub.code AND a.teacher_ordinal=1
JOIN public.users u ON u.email=a.email;
INSERT INTO public.classes(course_id,teacher_id,room,max_students,status,name,school_id,term_id,subject_id,homeroom_id)
SELECT course.id,u.id,h.room,50,'active',sub.name||' - '||h.code,s.school_id,s.term_id,sub.id,h.id
FROM _pilot_scope s JOIN public.homerooms h ON h.school_id=s.school_id
JOIN public.subjects sub ON sub.school_id=s.school_id
JOIN public.courses course ON course.school_id=s.school_id AND course.name=sub.name||' 12'
JOIN _pilot_accounts a ON a.subject_code=sub.code AND a.teacher_ordinal=right(h.code,1)::int
JOIN public.users u ON u.email=a.email;
INSERT INTO public.class_teacher_assignments(school_id,class_id,teacher_id,role,valid_from,status)
SELECT c.school_id,c.id,c.teacher_id,'primary_teacher','2026-09-01','active' FROM public.classes c;
INSERT INTO public.class_teacher_assignments(school_id,class_id,teacher_id,role,valid_from,status)
SELECT c.school_id,c.id,u.id,'co_teacher','2026-09-01','active'
FROM public.classes c JOIN public.subjects sub ON sub.id=c.subject_id
JOIN public.homerooms h ON h.id=c.homeroom_id AND h.code='12A1'
JOIN _pilot_accounts a ON a.subject_code=sub.code AND a.teacher_ordinal=5 JOIN public.users u ON u.email=a.email;
INSERT INTO public.homeroom_teacher_assignments(school_id,homeroom_id,teacher_id,academic_year_id,role,start_date,status)
SELECT s.school_id,h.id,u.id,s.year_id,'head_teacher','2026-09-01','active'
FROM _pilot_scope s JOIN public.homerooms h ON h.school_id=s.school_id
JOIN _pilot_accounts a ON a.subject_code='TOAN' AND a.teacher_ordinal=right(h.code,1)::int
JOIN public.users u ON u.email=a.email;
INSERT INTO public.student_identifiers(school_id,user_id,student_code,status)
SELECT s.school_id,u.id,a.student_code,'active' FROM _pilot_scope s CROSS JOIN _pilot_accounts a JOIN public.users u ON u.email=a.email WHERE a.role='student';
INSERT INTO public.homeroom_enrollments(school_id,homeroom_id,student_id,academic_year_id,start_date,status)
SELECT s.school_id,h.id,u.id,s.year_id,'2026-09-01','active' FROM _pilot_scope s
JOIN _pilot_accounts a ON a.role='student' JOIN public.users u ON u.email=a.email
JOIN public.homerooms h ON h.school_id=s.school_id AND h.code=a.homeroom_code;
INSERT INTO public.enrollments(student_id,class_id,status)
SELECT e.student_id,c.id,'active' FROM public.homeroom_enrollments e JOIN public.classes c ON c.homeroom_id=e.homeroom_id;
INSERT INTO public.rooms(name,capacity,school_id)
SELECT room,50,school_id FROM public.homerooms;
INSERT INTO public.class_schedules(class_id,room_id,day_of_week,start_time,end_time,start_date,end_date,note)
SELECT c.id,r.id,d.day,
  CASE sub.code WHEN 'TOAN' THEN '07:00'::time WHEN 'VAN' THEN '08:30'::time ELSE '10:00'::time END,
  CASE sub.code WHEN 'TOAN' THEN '07:45'::time WHEN 'VAN' THEN '09:15'::time ELSE '10:45'::time END,
  '2026-09-01','2027-01-15','Lịch học mẫu'
FROM public.classes c JOIN public.subjects sub ON sub.id=c.subject_id
JOIN public.rooms r ON r.school_id=c.school_id AND r.name=c.room
CROSS JOIN LATERAL unnest(CASE sub.code WHEN 'TOAN' THEN ARRAY[1,3] WHEN 'VAN' THEN ARRAY[2,4] ELSE ARRAY[3,5] END) d(day);
-- Initial projection is derived from the empty learning history, not invented grades.
INSERT INTO public.learning_metric_projections(school_id,student_id,class_id,metrics,rules_version)
SELECT c.school_id,e.student_id,c.id,jsonb_build_object(
  'homework_assigned',0,'homework_submitted',0,'homework_completion_rate',NULL,
  'homework_on_time_rate',NULL,'published_score_average',NULL,'published_score_count',0,
  'unexcused_absences',0,'support_signals','[]'::jsonb,'data_status','insufficient_data','data_quality','valid'),
  'pilot-v1' FROM public.enrollments e JOIN public.classes c ON c.id=e.class_id;
ANALYZE public.users; ANALYZE public.school_memberships; ANALYZE public.enrollments;
NOTIFY pgrst,'reload schema';
COMMIT;`;
}
