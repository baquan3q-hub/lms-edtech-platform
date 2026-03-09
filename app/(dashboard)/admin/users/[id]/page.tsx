import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, BookOpen, GraduationCap, MapPin, Mail, Phone, Calendar as CalendarIcon, ShieldAlert, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchUserDetails } from "@/lib/actions/admin";
import { Badge } from "@/components/ui/badge";
import AdminUserActions from "./AdminUserActions"; // Client component cho Sửa/Xóa

const roleBadgeConfig: Record<string, { label: string; className: string; icon: any }> = {
    admin: { label: "Quản trị viên", className: "bg-red-50 text-red-600 border-red-200", icon: ShieldAlert },
    teacher: { label: "Giáo viên", className: "bg-emerald-50 text-emerald-600 border-emerald-200", icon: BookOpen },
    student: { label: "Học sinh", className: "bg-blue-50 text-blue-600 border-blue-200", icon: GraduationCap },
    parent: { label: "Phụ huynh", className: "bg-amber-50 text-amber-600 border-amber-200", icon: null },
};

function formatDate(dateStr: string) {
    if (!dateStr) return "Không rõ";
    return new Date(dateStr).toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default async function AdminUserDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Lấy thông tin chi tiết
    const { data: profileData, error } = await fetchUserDetails(id);

    if (error || !profileData || !profileData.user) {
        return (
            <div className="p-8 text-center text-red-500 bg-red-50 rounded-2xl border border-red-200">
                <p className="font-medium text-lg">Hồ sơ người dùng không tồn tại hoặc đã bị xóa.</p>
                <Link href="/admin/users" className="text-blue-600 underline mt-4 inline-block">Quay lại danh sách</Link>
            </div>
        );
    }

    const { user: profile, classes, enrollments, parents, profile: extendedProfile } = profileData as any;
    const roleConfig = roleBadgeConfig[profile.role] || roleBadgeConfig.student;
    const RoleIcon = roleConfig.icon;

    const profileFields = [
        { label: "Ngày sinh", value: extendedProfile?.date_of_birth ? new Date(extendedProfile.date_of_birth).toLocaleDateString("vi-VN") : null },
        { label: "Giới tính", value: extendedProfile?.gender },
        { label: "Số điện thoại (Profile)", value: extendedProfile?.phone_number },
        { label: "Địa chỉ", value: extendedProfile?.address },
        { label: "Tiểu sử", value: extendedProfile?.bio },
        // Student
        ...(profile.role === "student" ? [
            { label: "Lớp/Khối", value: extendedProfile?.grade_level },
            { label: "Trường", value: extendedProfile?.school_name },
        ] : []),
        // Teacher
        ...(profile.role === "teacher" ? [
            { label: "Chuyên môn", value: extendedProfile?.subject_specialty },
            { label: "Kinh nghiệm", value: extendedProfile?.years_of_experience ? `${extendedProfile.years_of_experience} năm` : null },
        ] : []),
        // Parent
        ...(profile.role === "parent" ? [
            { label: "Nghề nghiệp", value: extendedProfile?.occupation },
        ] : []),
    ].filter(f => f.value);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Nav */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <Link
                    href="/admin/users"
                    className="flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors w-fit"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" /> Quay lại danh sách người dùng
                </Link>

                <AdminUserActions userProfile={profile} />
            </div>

            {/* Profile Card */}
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex flex-col md:flex-row md:items-start gap-8">
                    {/* Avatar Placeholder */}
                    <div className="w-24 h-24 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-3xl font-bold text-slate-400">
                            {profile.full_name?.charAt(0).toUpperCase()}
                        </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">
                                {profile.full_name}
                            </h2>
                            <Badge variant="outline" className={`${roleConfig.className} font-medium`}>
                                {RoleIcon && <RoleIcon className="w-3 h-3 mr-1" />}
                                {roleConfig.label}
                            </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 text-sm">
                            <div className="flex items-center gap-3 text-slate-600">
                                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center"><Mail className="w-4 h-4 text-slate-400" /></div>
                                <div><p className="text-xs text-slate-400 font-medium">Email</p><p className="font-medium">{profile.email}</p></div>
                            </div>
                            <div className="flex items-center gap-3 text-slate-600">
                                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center"><Phone className="w-4 h-4 text-slate-400" /></div>
                                <div><p className="text-xs text-slate-400 font-medium">Số điện thoại</p><p className="font-medium">{profile.phone || "Trống"}</p></div>
                            </div>
                            <div className="flex items-center gap-3 text-slate-600">
                                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center"><CalendarIcon className="w-4 h-4 text-slate-400" /></div>
                                <div><p className="text-xs text-slate-400 font-medium">Ngày tham gia</p><p className="font-medium">{formatDate(profile.created_at)}</p></div>
                            </div>
                            <div className="flex items-center gap-3 text-slate-600">
                                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center"><MapPin className="w-4 h-4 text-slate-400" /></div>
                                <div><p className="text-xs text-slate-400 font-medium">Vai trò hệ thống</p><p className="font-medium capitalize">{profile.role}</p></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Extended Profile Info */}
            {profileFields.length > 0 && (
                <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-900 border-l-4 border-indigo-500 pl-3 mb-5 flex items-center gap-2">
                        Thông tin cá nhân mở rộng
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {profileFields.map((f, idx) => (
                            <div key={idx} className="p-4 bg-slate-50 rounded-xl">
                                <p className="text-xs text-slate-400 font-medium mb-1">{f.label}</p>
                                <p className="text-sm font-semibold text-slate-800">{f.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Role Specific Views */}
            {profile.role === "teacher" && classes && (
                <div className="mt-8">
                    <h3 className="text-lg font-bold text-slate-900 border-l-4 border-emerald-500 pl-3 mb-4">
                        Lớp học đang phụ trách ({classes.length})
                    </h3>
                    {classes.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            Giáo viên này chưa được phân công lớp học nào.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {classes.map((cls: any) => (
                                <div key={cls.id} className="p-4 rounded-xl border border-slate-200 bg-white hover:border-emerald-200 hover:shadow-sm transition-all">
                                    <p className="font-bold text-slate-900">{cls.name || "Chưa đặt tên"}</p>
                                    <p className="text-sm text-slate-500 mb-2">{cls.course?.name}</p>
                                    <div className="flex gap-2 text-xs">
                                        <Badge variant="outline" className="bg-slate-50">Phòng: {cls.room}</Badge>
                                        <Badge variant="outline" className="bg-slate-50 text-slate-600">{cls.status}</Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {profile.role === "student" && enrollments && (
                <div className="mt-8">
                    <h3 className="text-lg font-bold text-slate-900 border-l-4 border-blue-500 pl-3 mb-4">
                        Khóa học đang theo học ({enrollments.length})
                    </h3>
                    {enrollments.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            Học sinh này chưa ghi danh vào lớp học nào.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {enrollments.map((env: any, idx: number) => (
                                <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-200 hover:shadow-sm transition-all flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-slate-900">{env.class?.course?.name}</p>
                                        <p className="text-sm text-slate-500">{env.class?.name} • GV: {env.class?.teacher?.full_name}</p>
                                    </div>
                                    {env.status === 'active' ? (
                                        <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-none">Đang học</Badge>
                                    ) : (
                                        <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-200 border-none">Đã dừng</Badge>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Phụ huynh đã liên kết (chỉ hiện cho student) */}
            {profile.role === "student" && (
                <div className="mt-8">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-slate-900 border-l-4 border-amber-500 pl-3 flex items-center gap-2">
                            <Users className="w-5 h-5 text-amber-500" /> Phụ huynh đã liên kết ({parents?.length || 0})
                        </h3>
                        <Link href="/admin/students/link-parent"
                            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
                            Quản lý liên kết →
                        </Link>
                    </div>
                    {!parents || parents.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            Học sinh này chưa có phụ huynh nào được liên kết.
                            <Link href="/admin/students/link-parent" className="text-indigo-600 hover:underline ml-1">
                                Liên kết ngay
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {parents.map((item: any) => (
                                <div key={item.id} className="p-4 rounded-xl border border-slate-200 bg-white hover:border-amber-200 hover:shadow-sm transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                            {item.parent?.full_name?.charAt(0) || "?"}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-slate-900 truncate">{item.parent?.full_name || "Không rõ"}</p>
                                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] shrink-0">
                                                    {item.relationship || "Phụ huynh"}
                                                </Badge>
                                            </div>
                                            <div className="flex flex-col gap-0.5 mt-1">
                                                <p className="text-xs text-slate-500 flex items-center gap-1">
                                                    <Mail className="w-3 h-3" /> {item.parent?.email || "—"}
                                                </p>
                                                <p className="text-xs text-slate-500 flex items-center gap-1">
                                                    <Phone className="w-3 h-3" /> {item.parent?.phone || "—"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
