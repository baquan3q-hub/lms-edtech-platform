import { fetchMyProfile } from "@/lib/actions/profile";
import ProfileForm from "@/components/shared/ProfileForm";
import { UserCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ParentProfilePage() {
    const { data, error } = await fetchMyProfile();

    if (error || !data) {
        return (
            <div className="p-8 text-center text-amber-600">
                <p>Không thể tải thông tin cá nhân. Vui lòng thử lại sau.</p>
                <p className="text-sm mt-2">{error}</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                    <UserCircle className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Hồ sơ Phụ huynh</h1>
                    <p className="text-slate-500">Cập nhật thông tin liên lạc để nhận báo cáo nhanh nhất</p>
                </div>
            </div>

            <ProfileForm role="parent" initialData={data} />
        </div>
    );
}
