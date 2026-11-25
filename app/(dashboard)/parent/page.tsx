import { getCurrentUser } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchParentDashboardData } from "@/lib/actions/parentStudent";
import { redirect } from "next/navigation";
import ParentDashboardClient from "./ParentDashboardClient";

export const dynamic = "force-dynamic";

export default async function ParentDashboardPage() {
    const user = await getCurrentUser();
    if (!user) redirect("/login");

    const adminSupabase = createAdminClient();

    // Lấy danh sách con em đã liên kết (theo thứ tự liên kết để con đầu tiên ổn định)
    const { data: links } = await adminSupabase
        .from("parent_students")
        .select("id, student_id, relationship, is_primary")
        .eq("parent_id", user.id)
        .order("created_at", { ascending: true });

    const studentIds = (links || []).map(l => l.student_id);
    const firstStudentId = studentIds[0] ?? null;

    // Lấy thông tin các con và dữ liệu dashboard của con đầu tiên cùng lúc.
    // fetchParentDashboardData tự kiểm quyền (canParentViewStudent) như khi gọi từ client.
    const [studentsRes, firstDashboard] = await Promise.all([
        studentIds.length > 0
            ? adminSupabase
                .from("users")
                .select("id, full_name, email, avatar_url")
                .in("id", studentIds)
            : Promise.resolve({ data: [] as any[] }),
        firstStudentId ? fetchParentDashboardData(firstStudentId) : Promise.resolve(null),
    ]);
    const students: any[] = studentsRes.data || [];

    // Enrich with relationship, giữ thứ tự liên kết
    const linkIndex = new Map((links || []).map((l, i) => [l.student_id, i]));
    const linkByStudent = new Map((links || []).map(l => [l.student_id, l]));
    const enrichedStudents = students
        .map(s => {
            const link = linkByStudent.get(s.id);
            return {
                ...s,
                linkId: link?.id,
                relationship: link?.relationship || "Phụ huynh",
            };
        })
        .sort((a, b) => (linkIndex.get(a.id) ?? 0) - (linkIndex.get(b.id) ?? 0));

    // Chỉ truyền initialData khi đúng là dữ liệu của con được chọn mặc định
    const initialData = firstDashboard?.data && enrichedStudents[0]?.id === firstStudentId
        ? { studentId: firstStudentId as string, data: firstDashboard.data }
        : null;

    return <ParentDashboardClient students={enrichedStudents} initialData={initialData} />;
}
