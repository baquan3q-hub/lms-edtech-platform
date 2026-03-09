"use client";

import { useState } from "react";
import Link from "next/link";
import {
    GraduationCap,
    Mail,
    Lock,
    Eye,
    EyeOff,
    Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

import { loginAction } from "./actions";

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        try {
            const result = await loginAction(formData);
            if (result?.error) {
                toast.error("Đăng nhập thất bại", {
                    description: result.error,
                });
            }
        } catch {
            // redirect() từ server action throw NEXT_REDIRECT — bình thường
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
            {/* Decorative background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200/30 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-200/30 rounded-full blur-3xl" />
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* Logo & branding */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25 mb-4">
                        <GraduationCap className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                        E-Learning Platform
                    </h1>
                    <p className="text-gray-500 mt-1 text-sm">
                        Nền tảng học trực tuyến thông minh
                    </p>
                </div>

                {/* Login card */}
                <Card className="border-gray-200 bg-white shadow-xl shadow-gray-200/50">
                    <CardHeader className="space-y-1 pb-4">
                        <CardTitle className="text-xl text-gray-900 text-center">
                            Đăng nhập
                        </CardTitle>
                        <CardDescription className="text-center text-gray-500">
                            Nhập thông tin tài khoản được cấp để tiếp tục
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form action={handleSubmit} className="space-y-4">
                            {/* Email */}
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-gray-700 text-sm font-medium">
                                    Email
                                </Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder="you@example.com"
                                        required
                                        disabled={isLoading}
                                        className="pl-10 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500/20"
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password" className="text-gray-700 text-sm font-medium">
                                        Mật khẩu
                                    </Label>
                                    <Link
                                        href="/forgot-password"
                                        className="text-xs text-blue-600 hover:text-blue-500 transition-colors"
                                    >
                                        Quên mật khẩu?
                                    </Link>
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        required
                                        disabled={isLoading}
                                        className="pl-10 pr-10 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500/20"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-4 h-4" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Submit */}
                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium shadow-lg shadow-blue-500/25 transition-all duration-200 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Đang xử lý...
                                    </>
                                ) : (
                                    "Đăng nhập"
                                )}
                            </Button>
                        </form>

                        {/* Thông tin closed system */}
                        <p className="text-center text-xs text-gray-400 mt-6">
                            Tài khoản được cấp bởi Quản trị viên.
                            <br />
                            Liên hệ Admin nếu bạn chưa có tài khoản.
                        </p>
                    </CardContent>
                </Card>

                <p className="text-center text-xs text-gray-400 mt-6">
                    © 2026 E-Learning Platform. All rights reserved.
                </p>
            </div>
        </div>
    );
}
