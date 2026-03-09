"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { createSystemNotification } from "./notifications";

const resend = new Resend(process.env.RESEND_API_KEY || "re_mock_key_123");

/**
 * Gửi Báo cáo Điểm số / Chuyên cần (Email + In-App)
 */
export async function sendGradeReport(classId: string, studentId: string | "all", type: "weekly" | "monthly" | "assignment", periodLabel: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return { success: false, error: "Unauthorized" };

        const adminSupabase = createAdminClient();

        // Lấy thông tin lớp
        const { data: classData } = await adminSupabase
            .from("classes")
            .select("name, teacher_id")
            .eq("id", classId)
            .single();

        if (!classData || classData.teacher_id !== user.id) {
            return { success: false, error: "Bạn không có quyền gửi thông báo cho lớp này" };
        }

        // Lấy danh sách học sinh cần gửi
        let studentIds: string[] = [];
        if (studentId === "all") {
            const { data: enrollments } = await adminSupabase
                .from("enrollments")
                .select("student_id")
                .eq("class_id", classId)
                .eq("status", "active");
            studentIds = (enrollments || []).map((e: any) => e.student_id);
        } else {
            studentIds = [studentId];
        }

        let successCount = 0;
        let failCount = 0;

        for (const sId of studentIds) {
            // 1. Tìm Phụ huynh của học sinh này
            const { data: parentLink } = await adminSupabase
                .from("parent_students")
                .select("parent_id, users!parent_id(email, full_name)")
                .eq("student_id", sId)
                .single();

            if (!parentLink || !parentLink.parent_id) {
                failCount++;
                continue; // Không có phụ huynh
            }

            // 2. Lấy thống kê của học sinh này trong lớp
            const { data: stat } = await adminSupabase
                .from("student_class_stats")
                .select("*")
                .eq("student_id", sId)
                .eq("class_id", classId)
                .single();

            const summary_data = stat ? {
                attendance_rate: stat.attendance_rate,
                avg_score: stat.avg_score,
                present: stat.present_count,
                absent: stat.absent_count
            } : {};

            // 3. Tạo record in-app notification
            const { error: insertError } = await adminSupabase
                .from("grade_notifications")
                .insert({
                    student_id: sId,
                    parent_id: parentLink.parent_id,
                    class_id: classId,
                    type,
                    period_label: periodLabel,
                    summary_data
                });

            if (insertError) {
                console.error("Lỗi tạo grade_notification:", insertError);
                failCount++;
                continue;
            }

            // Đồng thời tạo 1 cái vảo bảng `notifications` chung để hiện ở chuông thông báo
            await createSystemNotification(
                parentLink.parent_id,
                `Báo cáo học tập mới - Lớp ${classData.name}`,
                `Bạn vừa nhận được báo cáo ${type === 'weekly' ? 'Tuần' : type === 'monthly' ? 'Tháng' : 'Bài tập'} (${periodLabel}). Xem ngay!`,
                "grade_report",
                `/parent/children/${sId}/progress`
            );

            // 4. Gửi Email (via Resend)
            const parentInfo = Array.isArray(parentLink.users) ? parentLink.users[0] : parentLink.users;
            const parentEmail = parentInfo?.email;

            if (parentEmail && process.env.RESEND_API_KEY) {
                try {
                    await resend.emails.send({
                        from: 'LMS Platform <onboarding@resend.dev>', // Mock domain from Resend
                        to: [parentEmail],
                        subject: `[${classData.name}] Báo cáo học tập - ${periodLabel}`,
                        html: `
                            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
                                <h2 style="color: #4f46e5;">Báo cáo Học tập</h2>
                                <p>Kính gửi Phụ huynh ${parentInfo?.full_name || ""},</p>
                                <p>Hệ thống xin gửi báo cáo học tập <strong>${type === 'weekly' ? 'Tuần' : type === 'monthly' ? 'Tháng' : 'Bài kiểm tra'}</strong> cho kỳ: <strong>${periodLabel}</strong></p>
                                
                                <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                    <h3 style="margin-top: 0; color: #1e293b;">Tóm tắt kết quả:</h3>
                                    <ul style="list-style-type: none; padding-left: 0;">
                                        <li style="padding: 5px 0; border-bottom: 1px solid #e2e8f0;">Tỉ lệ chuyên cần: <strong style="color: #059669;">${summary_data.attendance_rate || 0}%</strong></li>
                                        <li style="padding: 5px 0; border-bottom: 1px solid #e2e8f0;">Điểm trung bình: <strong style="color: #4f46e5;">${summary_data.avg_score || 0}</strong></li>
                                        <li style="padding: 5px 0;">Số buổi có mặt: ${summary_data.present || 0} | Vắng: ${summary_data.absent || 0}</li>
                                    </ul>
                                </div>
                                <p>Vui lòng đăng nhập vào ứng dụng LMS để xem chi tiết biểu đồ và nhận xét cụ thể từ giáo viên.</p>
                                <br/>
                                <p>Trân trọng,<br/>Giáo viên phụ trách lớp ${classData.name}</p>
                            </div>
                        `
                    });
                } catch (emailError) {
                    console.error("Lỗi gửi email Resend:", emailError);
                }
            } else {
                console.log("Mock sending email to:", parentEmail, "Summary:", summary_data);
            }

            successCount++;
        }

        return { success: true, message: `Đã gửi ${successCount} báo cáo. ${failCount > 0 ? `Không gửi được cho ${failCount} HS (chưa có phụ huynh).` : ''}` };
    } catch (error: any) {
        console.error("Lỗi sendGradeReport:", error);
        return { success: false, error: error.message };
    }
}
