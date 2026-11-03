"use server";
import { requireSchoolActor, requireClassAccess, requireStudentAccess } from "@/lib/auth/authorize";
import { getTeachingClasses } from "@/lib/modules/analytics/service";
import { z } from "zod";
export async function fetchLearningTracking(input: { date: string; page?: number; search?: string; classId?: string }) {
    const args = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), page: z.number().int().min(0).default(0), search: z.string().max(100).default(""), classId: z.uuid().optional() }).parse(input);
    const actor = await requireSchoolActor(["admin", "teacher"]);
    const classes = await getTeachingClasses();
    if (args.classId) await requireClassAccess(args.classId, "teach");
    const classIds = args.classId ? [args.classId] : (classes || []).map(c => c.id);
    if (!classIds.length) return { students: [], classes, count: 0 };
    const { data: enrollments, error } = await actor.db.from("enrollments").select("student_id").in("class_id", classIds).eq("status", "active");
    if (error) throw new Error("Không tải được học sinh.");
    const ids = [...new Set((enrollments || []).map(e => e.student_id))];
    if (!ids.length) return { students: [], classes: classes || [], count: 0 };
    let query = actor.db.from("users").select("id,full_name", { count: "exact" }).in("id", ids).order("full_name").order("id");
    if (args.search) query = query.ilike("full_name", `%${args.search.replace(/[%_]/g, "")}%`);
    const { data: students, count, error: studentError } = await query.range(args.page * 20, args.page * 20 + 19);
    if (studentError) throw new Error("Không tải được học sinh.");
    const from = new Date(`${args.date}T00:00:00+07:00`), until = new Date(from.getTime() + 86400000);
    const { data: summaries, error: summaryError } = await actor.db.rpc("learning_activity_summary_scoped", { p_actor:actor.id,p_school:actor.schoolId,p_classes:classIds,p_students: (students || []).map(s => s.id), p_from: from.toISOString(), p_until: until.toISOString() });
    if (summaryError) throw new Error("Chưa đọc được dữ liệu tracking. Kiểm tra migration và kết nối.");
    type Summary = { student_id: string; open_seconds: number; active_seconds: number; video_seconds: number; last_seen_at: string | null; started_at: string | null; ended_at: string | null; end_reason: string | null; state: string; samples: number };
    return { students: (students || []).map(s => ({ ...s, activity: (summaries as Summary[] || []).find(a => a.student_id === s.id) || null })), classes: classes || [], count: count || 0 };
}
export async function fetchLearningTimeline(studentId: string, date: string) {
    z.uuid().parse(studentId);
    const actor = await requireStudentAccess(studentId, true);
    const classes = await getTeachingClasses();
    if (!classes.length) return [];
    const {data:enrollments,error:enrollmentError}=await actor.db.from("enrollments").select("class_id").eq("student_id",studentId).eq("status","active").in("class_id",classes.map(c=>c.id));
    if(enrollmentError)throw new Error("Không kiểm tra được phạm vi lớp.");
    if(!enrollments?.length)return [];
    const pathFilter=enrollments.flatMap(e=>[`page_path.eq./student/classes/${e.class_id}`,`page_path.like./student/classes/${e.class_id}/%`]).join(",");
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(date);
    const from = new Date(`${date}T00:00:00+07:00`), until = new Date(from.getTime() + 86400000);
    const { data, error } = await actor.db.from("learning_session_samples").select("observed_from,observed_to,page_path,active,video").eq("student_id", studentId).or(pathFilter).gte("observed_to", from.toISOString()).lt("observed_to", until.toISOString()).order("observed_to", { ascending: false }).limit(50);
    if (error) throw new Error("Không tải được timeline.");
    return data || [];
}
