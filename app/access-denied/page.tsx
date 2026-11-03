import { SignOutButton } from "./sign-out-button";

export default function AccessDeniedPage() {
  return <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-5 px-6">
    <p className="text-sm font-medium text-slate-500">EduSchool LMS</p>
    <h1 className="text-2xl font-semibold text-slate-950">Tài khoản chưa có quyền truy cập</h1>
    <p className="text-slate-600">Tài khoản có thể đang tạm dừng hoặc chưa được phân vào trường. Vui lòng liên hệ quản trị viên nhà trường để kiểm tra.</p>
    <SignOutButton />
  </main>;
}
