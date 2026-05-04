import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
    try {
        const { analysisIds, deadline } = await req.json();
        if (!analysisIds || !Array.isArray(analysisIds) || analysisIds.length === 0) {
            return NextResponse.json({ error: "Thiếu analysisIds" }, { status: 400 });
        }

        const adminSupabase = createAdminClient();
        let sent = 0;
        let failed = 0;

        for (const analysisId of analysisIds) {
            try {
                // Lấy thông tin analysis
                const { data: analysis, error: aErr } = await adminSupabase
                    .from("quiz_individual_analysis")
                    .select("*, student:users!student_id(id, full_name)")
                    .eq("id", analysisId)
                    .single();

                if (aErr || !analysis) {
                    failed++;
                    continue;
                }

                // Cập nhật trạng thái → sent
                await adminSupabase
                    .from("quiz_individual_analysis")
                    .update({
                        status: "sent",
                        sent_at: new Date().toISOString()
                    })
                    .eq("id", analysisId);

                // Tạo improvement_progress records
                const tasks = analysis.teacher_edited_tasks || analysis.improvement_tasks || [];
                for (let idx = 0; idx < tasks.length; idx++) {
                    await adminSupabase
                        .from("improvement_progress")
                        .upsert({
                            analysis_id: analysisId,
                            student_id: analysis.student_id,
                            task_index: idx,
                            status: "pending"
                        }, { onConflict: "analysis_id,task_index" });
                }

                // Lấy thông tin exam
                const { data: exam } = await adminSupabase
                    .from("exams")
                    .select("title, class_id")
                    .eq("id", analysis.exam_id)
                    .single();

                // Tạo link cho học sinh
                const classId = exam?.class_id || '';
                const studentFeedbackUrl = `/student/classes/${classId}/exams/${analysis.exam_id}/feedback`;

                // Tạo notification cho học sinh
                await adminSupabase
                    .from("notifications")
                    .insert({
                        user_id: analysis.student_id,
                        title: "📝 Nhận xét bài kiểm tra mới",
                        message: `Giáo viên đã gửi nhận xét và ${tasks.length} bài tập cải thiện cho bài "${exam?.title || 'kiểm tra'}". Xem nhận xét và làm bài ngay!`,
                        type: "quiz_feedback",
                        link: studentFeedbackUrl,
                        is_read: false
                    });

                // Tạo notification cho phụ huynh (nếu có)
                const { data: parentLinks } = await adminSupabase
                    .from("parent_students")
                    .select("parent_id")
                    .eq("student_id", analysis.student_id);

                if (parentLinks && parentLinks.length > 0) {
                    const studentObj = Array.isArray(analysis.student) ? analysis.student[0] : analysis.student;
                    for (const link of parentLinks) {
                        await adminSupabase
                            .from("notifications")
                            .insert({
                                user_id: link.parent_id,
                                title: `📊 Kết quả bài kiểm tra của ${studentObj?.full_name || 'con bạn'}`,
                                message: `Giáo viên đã gửi nhận xét bài kiểm tra "${exam?.title || ''}" kèm ${tasks.length} bài tập cải thiện.`,
                                type: "child_quiz_feedback",
                                link: `/parent/progress`,
                                is_read: false
                            });
                    }
                }

                sent++;
            } catch (e: any) {
                console.error("Error sending feedback for analysis:", analysisId, e.message);
                failed++;
            }
        }

        return NextResponse.json({ data: { sent, failed }, error: null });
    } catch (error: any) {
        console.error("Error in send-feedback:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
