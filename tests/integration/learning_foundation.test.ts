import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDatabase } from "../helpers/database";

describe("PostgreSQL learning foundation", () => {
  let db: PGlite;
  beforeAll(async () => { db = await createTestDatabase(); }, 60000);
  afterAll(async () => { if (db) await db.close(); });
  const school = "00000000-0000-0000-0001-000000000000";
  const otherSchool = "00000000-0000-0000-0002-000000000000";
  const teacher = "10000000-0000-4000-8000-000000000001";
  const admin = "10000000-0000-4000-8000-000000000002";
  const student = "10000000-0000-4000-8000-000000000003";
  const outsider = "10000000-0000-4000-8000-000000000004";
  const course = "20000000-0000-4000-8000-000000000001";
  const cls = "30000000-0000-4000-8000-000000000001";
  const exam = "40000000-0000-4000-8000-000000000001";
  const sub = "50000000-0000-4000-8000-000000000001";
  beforeEach(async () => {
    await db.exec("TRUNCATE public.users, public.outbox_events CASCADE");
    await db.query(`INSERT INTO public.users(id,email,full_name,role) VALUES
      ($1,'teacher@example.test','Teacher','teacher'),($2,'admin@example.test','Admin','admin'),
      ($3,'student@example.test','Student','student'),($4,'outsider@example.test','Other school admin','admin')`, [teacher,admin,student,outsider]);
    await db.query(`INSERT INTO public.school_memberships(school_id,user_id,role) VALUES
      ($1,$2,'teacher'),($1,$3,'admin'),($1,$4,'student'),($5,$6,'admin')`, [school,teacher,admin,student,otherSchool,outsider]);
    await db.query("INSERT INTO public.courses(id,name,school_id) VALUES($1,'Toán 12',$2)",[course,school]);
    await db.query("INSERT INTO public.classes(id,course_id,teacher_id,school_id,name,max_students) VALUES($1,$2,$3,$4,'12A Toán',1)",[cls,course,teacher,school]);
    await db.query("INSERT INTO public.exams(id,class_id,school_id,title,total_points,duration_minutes,is_published,publication_status,questions) VALUES($1,$2,$3,'Kiểm tra',10,30,true,'published','[]')",[exam,cls,school]);
    await db.query("INSERT INTO public.exam_submissions(id,exam_id,student_id,total_points,score,grading_status,answers) VALUES($1,$2,$3,10,6,'draft','[]')",[sub,exam,student]);
  });
  async function save(actor: string, score: number, publish = true, reason: string | null = null) {
    return db.query("SELECT public.set_school_grade($1,'exam',$2,$3,$4,$5) AS status",[actor,sub,score,publish,reason]);
  }
  it("rebuilds the canonical migration chain and installs restricted worker permissions", async () => {
    const result = await db.query<{ core: boolean; facts: boolean }>(`SELECT
      has_table_privilege('lms_analytics_worker','public.exam_submissions','SELECT') AS core,
      has_table_privilege('lms_analytics_worker','public.learning_metric_facts','SELECT') AS facts`);
    expect(result.rows[0]).toEqual({ core: false, facts: true });
  });
  it("blocks another school's admin, suspended membership, and expired teacher assignment", async () => {
    await expect(save(outsider,8)).rejects.toThrow("FORBIDDEN");
    await db.query("UPDATE public.school_memberships SET status='suspended' WHERE user_id=$1",[admin]);
    await expect(save(admin,8)).rejects.toThrow("FORBIDDEN");
    await db.query("INSERT INTO public.class_teacher_assignments(school_id,class_id,teacher_id,valid_from,valid_to,status) VALUES($1,$2,$3,CURRENT_DATE-10,CURRENT_DATE-1,'active')",[school,cls,teacher]);
    await expect(save(teacher,8)).rejects.toThrow("FORBIDDEN");
  });
  it("blocks an account waiting for activation even with an active membership", async () => {
    await db.query("INSERT INTO public.account_activations(school_id,user_id,activation_token_hash) VALUES($1,$2,'test-hash')",[school,teacher]);
    await expect(save(teacher,8)).rejects.toThrow("FORBIDDEN");
  });
  it("publishes atomically; replaying the same grade does not create another event", async () => {
    await save(teacher,8);
    await save(teacher,8);
    const result = await db.query<{ status: string; events: number; audit: number }>(`SELECT
      (SELECT grading_status FROM public.exam_submissions WHERE id=$1) AS status,
      (SELECT count(*)::int FROM public.outbox_events WHERE event_type='exam.grade_published') AS events,
      (SELECT count(*)::int FROM public.audit_events WHERE action='exam.grade_saved') AS audit`,[sub]);
    expect(result.rows[0]).toEqual({ status: "published", events: 1, audit: 1 });
  });
  it("requires a reason to adjust published scores and preserves publication on subsequent saves", async () => {
    await save(teacher,8);
    await expect(save(teacher,9)).rejects.toThrow("REASON_REQUIRED");
    await save(teacher,9,false,"Phúc khảo bước giải");
    const result = await db.query<{ score: number; grading_status: string }>("SELECT score::float,grading_status FROM public.exam_submissions WHERE id=$1",[sub]);
    expect(result.rows[0]).toEqual({ score:9, grading_status:"published" });
  });
  it("rejects locked grades and invalid scores", async () => {
    await expect(save(teacher,11)).rejects.toThrow("INVALID_SCORE");
    await db.query("UPDATE public.exam_submissions SET grading_status='locked' WHERE id=$1",[sub]);
    await expect(save(teacher,8)).rejects.toThrow("GRADE_LOCKED");
  });
  it("rolls back the score and audit if outbox persistence fails", async () => {
    await db.exec(`CREATE FUNCTION public.reject_test_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'OUTBOX_UNAVAILABLE'; END $$;
      CREATE TRIGGER reject_test_event BEFORE INSERT ON public.outbox_events FOR EACH ROW EXECUTE FUNCTION public.reject_test_event()`);
    try {
      await expect(save(teacher,8)).rejects.toThrow("OUTBOX_UNAVAILABLE");
      const result = await db.query<{ score: number; audit: number }>("SELECT score::float,(SELECT count(*)::int FROM public.audit_events) AS audit FROM public.exam_submissions WHERE id=$1",[sub]);
      expect(result.rows[0]).toEqual({score:6,audit:0});
    } finally { await db.exec("DROP TRIGGER reject_test_event ON public.outbox_events; DROP FUNCTION public.reject_test_event()"); }
  });
  it("makes enrollment retries idempotent and enforces class capacity", async () => {
    const args=[admin,school,cls,student];
    const first=await db.query("SELECT enroll_school_student($1,$2,$3,$4) AS id",args);
    const replay=await db.query("SELECT enroll_school_student($1,$2,$3,$4) AS id",args);
    expect(replay.rows).toEqual(first.rows);
    const second="10000000-0000-4000-8000-000000000005";
    await db.query("INSERT INTO users(id,email,full_name,role) VALUES($1,'second@example.test','Second student','student')",[second]);
    await db.query("INSERT INTO school_memberships(school_id,user_id,role) VALUES($1,$2,'student')",[school,second]);
    await expect(db.query("SELECT enroll_school_student($1,$2,$3,$4)",[admin,school,cls,second])).rejects.toThrow("CLASS_FULL");
  });
  it("does not expose raw exams, scores, or privileged RPCs to browser roles", async () => {
    await expect(db.transaction(async tx => {
      await tx.exec("SET LOCAL ROLE authenticated");
      await tx.query("SELECT * FROM public.exams");
    })).rejects.toThrow("permission denied");
    await expect(db.transaction(async tx=>{
      await tx.exec("SET LOCAL ROLE anon");
      await tx.query("SELECT update_all_students_stats($1)",[cls]);
    })).rejects.toThrow("permission denied");
    await expect(db.transaction(async tx => {
      await tx.exec("SET LOCAL ROLE authenticated");
      await tx.query("SELECT set_school_grade($1,'exam',$2,10,true,'forged')",[teacher,sub]);
    })).rejects.toThrow("permission denied");
  });
  it("builds the student task feed from unpublished work state without exposing scores or answers",async()=>{
    await db.query("SELECT enroll_school_student($1,$2,$3,$4)",[admin,school,cls,student]);
    const result=await db.query<{data:{tasks:unknown[];feedback:unknown[];pendingCount:number}}>("SELECT get_student_today($1,$2) AS data",[student,school]);
    expect(result.rows[0].data.pendingCount).toBe(0);
    expect(result.rows[0].data.feedback).toEqual([]);
    expect(JSON.stringify(result.rows)).not.toMatch(/isCorrect|snapshot|objective_score/);
    await save(teacher,6);
    const published=await db.query<{data:{feedback:unknown[]}}>("SELECT get_student_today($1,$2) AS data",[student,school]);
    expect(published.rows[0].data.feedback).toHaveLength(1);
    await expect(db.query("SELECT get_student_today($1,$2)",[student,otherSchool])).rejects.toThrow("FORBIDDEN");
  });
  it("rolls back cyclic content moves", async () => {
    const a="60000000-0000-4000-8000-000000000001", b="60000000-0000-4000-8000-000000000002";
    await db.query("INSERT INTO course_items(id,class_id,title,type,parent_id) VALUES($1,$3,'A','folder',NULL),($2,$3,'B','folder',$1)",[a,b,cls]);
    await expect(db.query("SELECT reorder_school_content($1,$2,$3)",[teacher,cls,JSON.stringify([{id:a,parent_id:b,order_index:0}])])).rejects.toThrow("CONTENT_CYCLE");
    const result=await db.query<{parent_id:string|null}>("SELECT parent_id FROM course_items WHERE id=$1",[a]);
    expect(result.rows[0].parent_id).toBeNull();
  });
  it("does not trust forged metadata or allow a school admin to read other schools' users",async()=>{
    const result=await db.transaction(async tx=>{
      await tx.exec("SET LOCAL ROLE authenticated");
      await tx.query("SELECT set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)",[outsider,JSON.stringify({user_metadata:{role:"super_admin"}})]);
      return tx.query<{id:string}>("SELECT id FROM public.users ORDER BY id");
    });
    expect(result.rows.map(r=>r.id)).toEqual([outsider]);
  });
  it("resumes a single immutable exam attempt and deduplicates submissions",async()=>{
    await db.query("SELECT enroll_school_student($1,$2,$3,$4)",[admin,school,cls,student]);
    const questions=[{id:"q1",question:"2 + 2",points:10,options:[{id:"a",text:"4",isCorrect:true},{id:"b",text:"5",isCorrect:false}]}];
    await db.query("UPDATE exams SET questions=$1 WHERE id=$2",[JSON.stringify(questions),exam]);
    const first=await db.query<{id:string;snapshot:{questions:typeof questions}}>("SELECT (begin_school_exam($1,$2)).*",[student,exam]);
    const again=await db.query<{id:string}>("SELECT (begin_school_exam($1,$2)).*",[student,exam]);
    expect(again.rows[0].id).toBe(first.rows[0].id);
    await db.query("UPDATE exams SET questions='[]' WHERE id=$1",[exam]);
    expect(first.rows[0].snapshot.questions).toEqual(questions);
    const answers=JSON.stringify([{selectedOptionId:"a"}]);
    const saved=await db.query<{id:string;score:string}>("SELECT (submit_learning_exam($1,$2,$3)).*",[student,first.rows[0].id,answers]);
    const replay=await db.query<{id:string;score:string}>("SELECT (submit_learning_exam($1,$2,$3)).*",[student,first.rows[0].id,JSON.stringify([{selectedOptionId:"b"}])]);
    expect(replay.rows[0].id).toBe(saved.rows[0].id);expect(Number(replay.rows[0].score)).toBe(10);
  });
  it("scopes telemetry by authorized class and merges overlapping tabs",async()=>{
    await db.query("SELECT enroll_school_student($1,$2,$3,$4)",[admin,school,cls,student]);
    const session="90000000-0000-4000-8000-000000000001";
    await db.query("INSERT INTO learning_sessions(id,student_id) VALUES($1,$2)",[session,student]);
    const path=`/student/classes/${cls}/learn`;
    await db.query(`INSERT INTO learning_session_samples(event_id,session_id,student_id,observed_from,observed_to,page_path,active,video)
      VALUES(gen_random_uuid(),$1,$2,'2026-11-03T00:00:00Z','2026-11-03T00:00:30Z',$3,true,false),
      (gen_random_uuid(),$1,$2,'2026-11-03T00:00:15Z','2026-11-03T00:00:30Z',$3,true,false),
      (gen_random_uuid(),$1,$2,'2026-11-03T00:01:00Z','2026-11-03T00:01:30Z','/student/classes/30000000-0000-4000-8000-000000000099/learn',true,true)`,[session,student,path]);
    async function summary(actor:string) {
      const result=await db.query<{data:{open_seconds:number;active_seconds:number;video_seconds:number}[]}>(
        "SELECT learning_activity_summary_scoped($1,$2,$3,$4,'2026-11-03T00:00:00Z','2026-11-04T00:00:00Z') data",
        [actor,school,[cls],[student]]);
      return result.rows[0].data;
    }
    expect(await summary(teacher)).toMatchObject([{open_seconds:30,active_seconds:30,video_seconds:0}]);
    expect(await summary(outsider)).toEqual([]);
  });
  it("replays homework requests safely, rejects changed payloads, and keeps draft scores out of analytics",async()=>{
    await db.query("SELECT enroll_school_student($1,$2,$3,$4)",[admin,school,cls,student]);
    const hw="70000000-0000-4000-8000-000000000001";
    const questions=[{id:"q1",question:"2 + 2",type:"multiple_choice",points:10,options:[{id:"a",text:"4",isCorrect:true},{id:"b",text:"5",isCorrect:false}]}];
    await db.query("INSERT INTO homework(id,class_id,school_id,title,questions,total_points,is_published,publication_status,max_attempts) VALUES($1,$2,$3,'Bài tập',$4,10,true,'published',2)",[hw,cls,school,JSON.stringify(questions)]);
    const answer=JSON.stringify([{question_id:"q1",selected_option_id:"a"}]);
    const requestKey="80000000-0000-4000-8000-000000000001";
    const first=await db.query<{id:string;attempts:number}>("SELECT (submit_school_homework($1,$2,$3,$4)).*",[student,hw,answer,requestKey]);
    const second=await db.query<{id:string;attempts:number}>("SELECT (submit_school_homework($1,$2,$3,$4)).*",[student,hw,answer,requestKey]);
    expect(second.rows[0].id).toBe(first.rows[0].id);expect(second.rows[0].attempts).toBe(1);
    await expect(db.query("SELECT submit_school_homework($1,$2,$3,$4)",[student,hw,'[]',requestKey])).rejects.toThrow("IDEMPOTENCY_CONFLICT");
    const before=await db.query<{published_scores:null}>("SELECT published_scores FROM learning_metric_facts WHERE student_id=$1",[student]);
    expect(before.rows[0].published_scores).toBeNull();
    await db.query("UPDATE homework SET total_points=100 WHERE id=$1",[hw]);
    await expect(db.query("SELECT set_school_grade($1,'homework',$2,50,true,NULL)",[teacher,first.rows[0].id])).rejects.toThrow("INVALID_SCORE");
    await db.query("SELECT set_school_grade($1,'homework',$2,8,true,NULL)",[teacher,first.rows[0].id]);
    const after=await db.query<{published_scores:number[]}>("SELECT published_scores FROM learning_metric_facts WHERE student_id=$1",[student]);
    expect(after.rows[0].published_scores.map(Number)).toEqual([8]);
  });
});
