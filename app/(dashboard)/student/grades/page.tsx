import { createClient } from "@/lib/supabase/server";
import { fetchStudentGrades, fetchStudentEnrolledClasses } from "@/lib/actions/student";
import AcademicHistoryClient from "@/components/student/AcademicHistoryClient";
import ClassLeaderboardClient from "@/components/student/ClassLeaderboardClient";

export default async function StudentGradesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const [
        { data: grades },
        { data: enrollments }
    ] = await Promise.all([
        fetchStudentGrades(),
        fetchStudentEnrolledClasses(),
    ]);

    // Group enrolledClasses to format { class_id, name, course_name }
    const enrolledClasses = (enrollments || []).map((en: any) => {
        const classInfo = Array.isArray(en.class) ? en.class[0] : en.class;
        const courseInfo = Array.isArray(classInfo?.course) ? classInfo?.course[0] : classInfo?.course;
        return {
            class_id: en.class_id,
            name: classInfo?.name || "Lớp học chưa rõ",
            course_name: courseInfo?.name || ""
        };
    });

    return (
        <div className="space-y-8 max-w-6xl mx-auto p-2 sm:p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Kết quả học tập</h1>
                <p className="text-slate-500 mt-2 text-sm sm:text-base font-medium max-w-2xl">
                    Theo dõi điểm số, bảng xếp hạng thi đua trong lớp và lịch sử học tập qua từng ngày một cách chi tiết.
                </p>
            </div>

            {/* Feature 1 & 2: Class Leaderboards (Attendance & Scores) */}
            <ClassLeaderboardClient 
                enrolledClasses={enrolledClasses} 
                currentUserId={user.id} 
            />

            {/* Feature 3: Daily Academic History */}
            <div className="mt-8 pt-4">
                <AcademicHistoryClient grades={grades || []} />
            </div>
        </div>
    );
}
