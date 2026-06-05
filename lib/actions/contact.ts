"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const contactSchema = z.object({
    schoolName: z.string().min(2, "Tên trường/tổ chức phải có ít nhất 2 ký tự"),
    contactName: z.string().min(2, "Họ tên người đại diện phải có ít nhất 2 ký tự"),
    email: z.string().email("Email công tác không hợp lệ"),
    phone: z.string().min(8, "Số điện thoại phải có ít nhất 8 chữ số"),
    schoolSize: z.string().min(1, "Vui lòng chọn quy mô học sinh"),
    message: z.string().optional(),
});

export type ContactInput = z.infer<typeof contactSchema>;

/**
 * Server Action xử lý gửi yêu cầu báo giá/tư vấn từ Landing Page.
 * Bảng contact_requests được ghi thông qua Admin Client do người dùng công cộng (chưa đăng nhập) thực hiện.
 */
export async function submitContactRequest(input: ContactInput) {
    try {
        // 1. Validate dữ liệu
        const validated = contactSchema.parse(input);

        // 2. Kết nối Supabase Admin Client để ghi đè RLS (vì người dùng chưa đăng nhập)
        const supabase = createAdminClient();

        // 3. Thực hiện insert dữ liệu
        const { error } = await supabase.from("contact_requests").insert([
            {
                school_name: validated.schoolName,
                contact_name: validated.contactName,
                email: validated.email,
                phone: validated.phone,
                school_size: validated.schoolSize,
                message: validated.message || null,
                status: "pending",
            },
        ]);

        if (error) {
            console.error("[SubmitContactRequest DB Error]:", error);
            return { 
                success: false, 
                error: "Không thể lưu thông tin đăng ký. Vui lòng liên hệ trực tiếp qua hotline." 
            };
        }

        return { success: true };
    } catch (err: any) {
        if (err instanceof z.ZodError) {
            return { success: false, error: err.issues[0].message };
        }
        console.error("[SubmitContactRequest Server Error]:", err);
        return { 
            success: false, 
            error: "Đã xảy ra lỗi máy chủ. Vui lòng thử lại sau giây lát." 
        };
    }
}
