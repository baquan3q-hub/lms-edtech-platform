"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { completeAccountActivationAction } from "@/lib/actions/activation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { ShieldCheck, Lock, KeyRound, AlertCircle, CheckCircle2 } from "lucide-react";

function ActivateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("user") || "";

  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token.trim()) {
      setError("Vui lòng nhập mã kích hoạt.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Mật khẩu mới phải có tối thiểu 6 ký tự.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Xác nhận mật khẩu không khớp.");
      return;
    }

    if (newPassword === "abc123") {
      setError("Vui lòng không dùng mật khẩu mặc định (abc123).");
      return;
    }

    setLoading(true);

    try {
      const res = await completeAccountActivationAction(userId, token, newPassword);
      if (!res.ok) {
        setError(res.error || "Kích hoạt thất bại. Vui lòng thử lại.");
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || "Lỗi kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-xl border-slate-200 dark:border-slate-800">
      <CardHeader className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Kích hoạt tài khoản K12
        </CardTitle>
        <CardDescription className="text-slate-500 dark:text-slate-400">
          Nhập mã kích hoạt một lần do nhà trường cấp và thiết lập mật khẩu bảo mật mới.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-2 animate-bounce" />
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
              Kích hoạt thành công!
            </h3>
            <p className="text-sm text-slate-500">
              Đang chuyển hướng về trang đăng nhập...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Mã kích hoạt (Activation Code)
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="VD: ACT-7K9M-2PXQ"
                  className="pl-9 font-mono uppercase"
                  value={token}
                  onChange={(e) => setToken(e.target.value.toUpperCase())}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Mật khẩu mới
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  type="password"
                  placeholder="Tối thiểu 6 ký tự"
                  className="pl-9"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Xác nhận mật khẩu mới
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  type="password"
                  placeholder="Nhập lại mật khẩu mới"
                  className="pl-9"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full mt-2 font-medium" disabled={loading}>
              {loading ? "Đang xác thực..." : "Kích hoạt & Đổi mật khẩu"}
            </Button>
          </form>
        )}
      </CardContent>

      <CardFooter className="flex justify-center border-t border-slate-100 dark:border-slate-800/50 pt-4">
        <p className="text-xs text-slate-400">
          Trường THCS Nguyễn Du • Hệ thống LMS K12 an toàn
        </p>
      </CardFooter>
    </Card>
  );
}

export default function ActivatePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-900">
      <Suspense fallback={<div className="text-sm text-slate-500">Đang tải...</div>}>
        <ActivateForm />
      </Suspense>
    </div>
  );
}
