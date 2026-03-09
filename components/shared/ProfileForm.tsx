"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { updateMyProfile } from "@/lib/actions/profile";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// ==========================================
// THIẾT LẬP ZOD SCHEMA CHO TƯƠNG TỪNG ROLE
// ==========================================

const baseSchema = z.object({
    full_name: z.string().min(2, "Họ và tên tối thiểu 2 ký tự"),
    phone: z.string().optional().nullable(),
    date_of_birth: z.string().optional().nullable(),
    gender: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    bio: z.string().optional().nullable(),
});

const studentSchema = baseSchema.extend({
    grade_level: z.string().optional().nullable(),
    school_name: z.string().optional().nullable(),
});

const teacherSchema = baseSchema.extend({
    subject_specialty: z.string().optional().nullable(),
    years_of_experience: z.coerce.number().min(0).optional().nullable(),
});

const parentSchema = baseSchema.extend({
    occupation: z.string().optional().nullable(),
});

export type ProfileFormProps = {
    role: "student" | "teacher" | "parent" | "admin";
    initialData: {
        user: { full_name: string; phone?: string | null; email: string };
        profile: any;
    };
    onSuccess?: () => void;
};

export default function ProfileForm({ role, initialData, onSuccess }: ProfileFormProps) {
    const [isSaving, setIsSaving] = useState(false);

    // Xác định schema dựa trên role
    let schemaType = baseSchema;
    if (role === "student") schemaType = studentSchema as any;
    if (role === "teacher") schemaType = teacherSchema as any;
    if (role === "parent") schemaType = parentSchema as any;

    const form = useForm<any>({
        resolver: zodResolver(schemaType),
        defaultValues: {
            full_name: initialData.user.full_name || "",
            phone: initialData.user.phone || "",
            date_of_birth: initialData.profile?.date_of_birth || "",
            gender: initialData.profile?.gender || "",
            address: initialData.profile?.address || "",
            bio: initialData.profile?.bio || "",
            // Student
            grade_level: initialData.profile?.grade_level || "",
            school_name: initialData.profile?.school_name || "",
            // Teacher
            subject_specialty: initialData.profile?.subject_specialty || "",
            years_of_experience: initialData.profile?.years_of_experience || "",
            // Parent
            occupation: initialData.profile?.occupation || "",
        },
    });

    async function onSubmit(values: any) {
        setIsSaving(true);
        try {
            const { full_name, phone, ...profileData } = values;

            // Xử lý logic cập nhật data thông qua Server Action
            const result = await updateMyProfile(
                { full_name, phone: phone || null },
                profileData
            );

            if (result.error) {
                toast.error("Cập nhật thất bại", { description: result.error });
            } else {
                toast.success("Cập nhật thông tin thành công!");
                if (onSuccess) onSuccess();
            }
        } catch (error: any) {
            toast.error("Lỗi hệ thống", { description: error.message });
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                {/* THÔNG TIN CHUNG (Ai cũng có) */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <h3 className="font-semibold text-slate-900 border-b border-slate-100 pb-2 mb-4">
                        Thông tin cơ bản
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="full_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Họ và tên <span className="text-red-500">*</span></FormLabel>
                                    <FormControl>
                                        <Input placeholder="Nguyễn Văn A" {...field} value={field.value || ""} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="space-y-2">
                            <FormLabel className="text-slate-500">Email (Không thể đổi)</FormLabel>
                            <Input disabled value={initialData.user.email} className="bg-slate-50 text-slate-500" />
                        </div>

                        <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Số điện thoại</FormLabel>
                                    <FormControl>
                                        <Input placeholder="09xxxxxxx" {...field} value={field.value || ""} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="date_of_birth"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Ngày sinh</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} value={field.value || ""} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="gender"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Giới tính</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Chọn giới tính" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Nam">Nam</SelectItem>
                                            <SelectItem value="Nữ">Nữ</SelectItem>
                                            <SelectItem value="Khác">Khác</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem className="md:col-span-2">
                                    <FormLabel>Địa chỉ</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Số nhà, đường, quận/huyện, tỉnh/thành..." {...field} value={field.value || ""} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                {/* THÔNG TIN RIÊNG CHO ROLE */}
                {(role === "student" || role === "teacher" || role === "parent") && (
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                        <h3 className="font-semibold text-slate-900 border-b border-slate-100 pb-2 mb-4">
                            Thông tin bổ sung
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                            {/* STUDENT */}
                            {role === "student" && (
                                <>
                                    <FormField
                                        control={form.control}
                                        name="grade_level"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Lớp/Khối</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="VD: Khối 10" {...field} value={field.value || ""} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="school_name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Trường đang học</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="THPT..." {...field} value={field.value || ""} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </>
                            )}

                            {/* TEACHER */}
                            {role === "teacher" && (
                                <>
                                    <FormField
                                        control={form.control}
                                        name="subject_specialty"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Chuyên môn</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="VD: Toán học, Tiếng Anh..." {...field} value={field.value || ""} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="years_of_experience"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Số năm kinh nghiệm</FormLabel>
                                                <FormControl>
                                                    <Input type="number" min="0" placeholder="VD: 5" {...field} value={field.value || ""} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </>
                            )}

                            {/* PARENT */}
                            {role === "parent" && (
                                <>
                                    <FormField
                                        control={form.control}
                                        name="occupation"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Nghề nghiệp</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Kinh doanh, Kỹ sư..." {...field} value={field.value || ""} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* TIỂU SỬ */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <FormField
                        control={form.control}
                        name="bio"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Tiểu sử / Ghi chú thêm</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="Giới thiệu ngắn gọn về bản thân..."
                                        className="resize-none min-h-[100px]"
                                        {...field}
                                        value={field.value || ""}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="flex justify-end">
                    <Button type="submit" disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 min-w-[150px]">
                        {isSaving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                        Lưu thông tin
                    </Button>
                </div>
            </form>
        </Form>
    );
}
