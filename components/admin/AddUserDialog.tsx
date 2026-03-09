"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus, Loader2, Eye, EyeOff, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { createUser } from "@/app/(dashboard)/admin/users/actions";

const userSchema = z.object({
    fullName: z.string().min(1, "Họ tên là bắt buộc."),
    email: z.string().email("Email không hợp lệ."),
    password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự."),
    role: z.string().min(1, "Vui lòng chọn vai trò."),
    phone: z.string().optional(),
});

interface UserFormData { fullName: string; email: string; password: string; role: string; phone?: string; }

export default function AddUserDialog() {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [sendEmail, setSendEmail] = useState(false);
    const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<UserFormData>({ resolver: zodResolver(userSchema) as never });

    async function onSubmit(data: UserFormData) {
        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.set("fullName", data.fullName);
            formData.set("email", data.email);
            formData.set("password", data.password);
            formData.set("role", data.role);
            if (data.phone) formData.set("phone", data.phone);
            formData.set("sendEmail", sendEmail ? "true" : "false");

            const result = await createUser(formData);
            if (result.error) {
                toast.error("Tạo tài khoản thất bại", { description: result.error });
            } else {
                toast.success("Tạo tài khoản thành công!", {
                    description: sendEmail
                        ? "Email thông báo sẽ được gửi cho người dùng."
                        : "Hãy thông báo thông tin đăng nhập cho người dùng.",
                });
                reset();
                setSendEmail(false);
                setOpen(false);
            }
        } catch {
            toast.error("Đã xảy ra lỗi.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-500 text-white shadow-sm">
                    <UserPlus className="w-4 h-4 mr-2" />Thêm người dùng
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-gray-200 text-gray-900 sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle className="text-gray-900">Cấp tài khoản mới</DialogTitle>
                    <DialogDescription className="text-gray-500">Điền thông tin để tạo tài khoản cho người dùng. Mật khẩu sẽ được admin cung cấp.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
                    <div className="space-y-2">
                        <Label className="text-gray-700 text-sm">Họ và tên <span className="text-red-500">*</span></Label>
                        <Input {...register("fullName")} placeholder="Nguyễn Văn A" disabled={isLoading} className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-500" />
                        {errors.fullName && <p className="text-xs text-red-500">{errors.fullName.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label className="text-gray-700 text-sm">Email <span className="text-red-500">*</span></Label>
                        <Input {...register("email")} type="email" placeholder="email@example.com" disabled={isLoading} className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-500" />
                        {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label className="text-gray-700 text-sm">Mật khẩu <span className="text-red-500">*</span></Label>
                        <div className="relative">
                            <Input {...register("password")} type={showPassword ? "text" : "password"} placeholder="Tối thiểu 6 ký tự" disabled={isLoading} className="pr-10 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-500" />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-gray-700 text-sm">Vai trò <span className="text-red-500">*</span></Label>
                            <Select onValueChange={(val) => setValue("role", val)} disabled={isLoading}>
                                <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-900 focus:ring-blue-500"><SelectValue placeholder="Chọn" /></SelectTrigger>
                                <SelectContent className="bg-white border-gray-200">
                                    <SelectItem value="admin" className="text-gray-900 focus:bg-gray-100">Admin</SelectItem>
                                    <SelectItem value="teacher" className="text-gray-900 focus:bg-gray-100">Giáo viên</SelectItem>
                                    <SelectItem value="student" className="text-gray-900 focus:bg-gray-100">Học sinh</SelectItem>
                                    <SelectItem value="parent" className="text-gray-900 focus:bg-gray-100">Phụ huynh</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.role && <p className="text-xs text-red-500">{errors.role.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-700 text-sm">Số điện thoại</Label>
                            <Input {...register("phone")} placeholder="0901..." disabled={isLoading} className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-500" />
                        </div>
                    </div>

                    {/* Checkbox gửi email thông báo */}
                    <div className="flex items-center space-x-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <Checkbox
                            id="sendEmail"
                            checked={sendEmail}
                            onCheckedChange={(checked: boolean | "indeterminate") => setSendEmail(checked === true)}
                            disabled={isLoading}
                            className="border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                        />
                        <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <Label htmlFor="sendEmail" className="text-sm text-gray-600 font-normal cursor-pointer">
                                Gửi email thông báo tài khoản cho người dùng
                            </Label>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isLoading} className="text-gray-500 hover:text-gray-700 hover:bg-gray-100">Hủy</Button>
                        <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-500 text-white">
                            {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang tạo...</>) : "Cấp tài khoản"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
