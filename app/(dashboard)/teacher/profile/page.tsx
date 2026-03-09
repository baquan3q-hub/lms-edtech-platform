import { fetchMyProfile } from "@/lib/actions/profile";
import ProfileForm from "@/components/shared/ProfileForm";
import { UserCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TeacherProfilePage() {
    const { data, error } = await fetchMyProfile();

    if (error || !data) {
        return (
            <div className="p-8 text-center text-rose-500">
                <p>Không thể tải thông tin cá nhân. Vui lòng thử lại sau.</p>
                <p className="text-sm mt-2">{error}</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <UserCircle className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Hồ sơ Giáo viên</h1>
                    <p className="text-slate-500">Quản lý số liệu cá nhân và chuyên môn của bạn</p>
                </div>
            </div>

            <ProfileForm role="teacher" initialData={data} />
        </div>
    );
}
