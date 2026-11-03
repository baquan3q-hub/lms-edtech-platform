"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireActorContext } from "@/lib/auth/actor-context";
import { revalidatePath } from "next/cache";
import { requireManagedUser } from "@/lib/auth/authorize";
import { recordAuditEvent } from "@/lib/audit/audit-logger";
import { z } from "zod";

// Vai trò được phép gán qua giao diện quản trị.
// 'super_admin' bị loại trừ có chủ đích: quyền chủ sở hữu nền tảng chỉ được
// cấp qua email allowlist phía server, không cấp được từ form quản trị.
const ASSIGNABLE_ROLES = ["admin", "teacher", "student", "parent"];

export async function fetchUserDetails(userId: string) {
    try {
        const managed=await requireManagedUser(userId);
        const schoolIds=managed.role==="super_admin"?managed.memberships.map(m=>m.school_id):[managed.schoolId];
        const supabase = createAdminClient();

        // 1. Fetch Basic Profile
        const { data: user, error: userError } = await supabase
            .from("users")
            .select("*")
            .eq("id", userId)
            .single();

        if (userError) throw userError;

        // 1b. Fetch extended profile data
        const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", userId)
            .single();

        let additionalData: any = { profile: profileData || null };

        // 2. Fetch Role-specific Data
        if (user.role === "teacher") {
            // Danh sách lớp GV dạy
            const { data: classes } = await supabase
                .from("classes")
                .select(`
                    *,
                    course:courses(name, description)
                `)
                .eq("teacher_id", userId)
                .in("school_id",schoolIds)
                .order("created_at", { ascending: false });
            additionalData = { ...additionalData, classes };

        } else if (user.role === "student") {
            // Danh sách lớp HS đăng ký học
            const { data: enrollments } = await supabase
                .from("enrollments")
                .select(`
                    status, enrolled_at,
                    class:classes!inner(
                        id, name, room, schedule, status, school_id,
                        course:courses(name),
                        teacher:users!classes_teacher_id_fkey(full_name)
                    )
                `)
                .eq("student_id", userId)
                .in("class.school_id",schoolIds)
                .order("enrolled_at", { ascending: false });

            // Phụ huynh đã liên kết
            const { data: parentLinks } = await supabase
                .from("parent_students")
                .select("id, parent_id, relationship, is_primary, created_at")
                .in("school_id",schoolIds)
                .eq("student_id", userId);

            let parents: any[] = [];
            if (parentLinks && parentLinks.length > 0) {
                const parentIds = parentLinks.map(l => l.parent_id);
                const { data: parentUsers } = await supabase
                    .from("users")
                    .select("id, full_name, email, phone, avatar_url")
                    .in("id", parentIds);

                parents = (parentLinks || []).map(link => ({
                    ...link,
                    parent: (parentUsers || []).find(p => p.id === link.parent_id),
                }));
            }

            additionalData = { ...additionalData, enrollments, parents };
        }

        return { data: { user, ...additionalData }, error: null };
    } catch (error: any) {
        console.error("Lỗi fetch user chi tiết:", error);
        return { data: null, error: error.message };
    }
}

export async function deleteUser(userId: string) {
    try {
        const actor=await requireManagedUser(userId);
        if(actor.id===userId)return {success:false,error:"Không thể tự tạm dừng tài khoản của chính mình."};
        const targets=actor.memberships.filter(m=>actor.role==="super_admin"||m.school_id===actor.schoolId);
        if(!targets.length)return {success:false,error:"Không tìm thấy thành viên trường."};
        const {error}=await actor.db.from("school_memberships").update({status:"suspended"}).in("id",targets.map(m=>m.id));
        if(error)throw error;
        for(const schoolId of new Set(targets.map(m=>m.school_id)))await recordAuditEvent({schoolId,actorId:actor.id,action:"membership.suspended",entityType:"user",entityId:userId,reason:"Quản trị trường tạm dừng quyền truy cập; bảo toàn dữ liệu học vụ"});
        revalidatePath("/admin/users");
        return {success:true,error:null};
    } catch { return {success:false,error:"Không thể tạm dừng tài khoản hoặc tài khoản nằm ngoài phạm vi trường."}; }
}

export async function updateUser(userId: string, data: { full_name?: string; phone?: string; role?: string }) {
    try {
        const checked=z.object({full_name:z.string().trim().min(1).max(200).optional(),phone:z.string().max(30).optional(),role:z.enum(["admin","teacher","student","parent"]).optional()}).strict().parse(data);
        const actor=await requireManagedUser(userId,checked.full_name!==undefined||checked.phone!==undefined);
        if(checked.role) {
            if(actor.id===userId)throw new Error("Không thể tự thay đổi vai trò.");
            const memberships=actor.memberships.filter(m=>m.school_id===actor.schoolId);
            if(memberships.length!==1)throw new Error("Cần chọn chính xác vai trò và trường cần điều chỉnh.");
            const {error}=await actor.db.from("school_memberships").update({role:checked.role}).eq("id",memberships[0].id);
            if(error)throw error;
        }
        if(checked.full_name!==undefined||checked.phone!==undefined) {
            const {error}=await actor.db.from("users").update({full_name:checked.full_name,phone:checked.phone}).eq("id",userId);
            if(error)throw error;
        }
        if(actor.schoolId)await recordAuditEvent({schoolId:actor.schoolId,actorId:actor.id,action:"user.updated",entityType:"user",entityId:userId,afterState:checked});
        revalidatePath("/admin/users");revalidatePath(`/admin/users/${userId}`);
        return {success:true,error:null};
    } catch { return {success:false,error:"Không thể cập nhật tài khoản. Kiểm tra phạm vi trường và vai trò được phép gán."}; }
}
