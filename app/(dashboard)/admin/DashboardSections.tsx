import type { ComponentType } from "react";
import { unstable_rethrow } from "next/navigation";
import { Users, BookOpen, School, MousePointer2 } from "lucide-react";
import { AccessError } from "@/lib/auth/authorize";
import {
    fetchAdminSchoolStats,
    fetchDailyActiveUsers,
    fetchDailyStudentPresenceAndAttendance,
    fetchHomeworkCompletionByGradeAndClass,
    fetchGradeOverviewByGradeAndClass,
} from "./analytics-actions";
import DailyStudentPresenceWidget from "@/components/admin/DailyStudentPresenceWidget";
import HomeworkCompletionByGradeWidget from "@/components/admin/HomeworkCompletionByGradeWidget";
import GradeOverviewByGradeWidget from "@/components/admin/GradeOverviewByGradeWidget";

// Mỗi section là một async server component, page bọc từng cái trong Suspense riêng
// để phần nào xong thì hiện phần đó, lỗi ở một section không làm hỏng cả trang.

const GENERIC_ERROR = "Không tải được dữ liệu. Vui lòng tải lại trang.";

type Settled<T> = { ok: true; data: T } | { ok: false; message: string };

/** Chạy loader; lỗi của Next (redirect, dynamic bailout) được ném lại, lỗi khác thành thông báo an toàn. */
async function settle<T>(load: () => Promise<T>): Promise<Settled<T>> {
    try {
        return { ok: true, data: await load() };
    } catch (error) {
        unstable_rethrow(error);
        if (error instanceof AccessError) return { ok: false, message: error.message };
        console.error("[admin-dashboard]", error);
        return { ok: false, message: GENERIC_ERROR };
    }
}

type StatCardProps = {
    title: string;
    value: number | string;
    icon: ComponentType<{ className?: string; strokeWidth?: number }>;
    color: string;
    bg: string;
    border: string;
};

function StatCard({ title, value, icon: Icon, color, bg, border }: StatCardProps) {
    return (
        <div className={`bg-white rounded-3xl border ${border} p-5 flex flex-col justify-between shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:-translate-y-1 transition-transform duration-300`}>
            <div className="flex items-center justify-between mb-3">
                <div className={`w-11 h-11 rounded-2xl ${bg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${color}`} strokeWidth={2} />
                </div>
            </div>
            <div>
                <p className="text-3xl font-black text-gray-900 tracking-tight">{value}</p>
                <p className="text-gray-500 text-xs mt-1 font-semibold">{title}</p>
            </div>
        </div>
    );
}

export function SchoolStatCards({ values }: { values?: { totalUsers: number | string; totalCourses: number | string; activeClasses: number | string } }) {
    const v = values ?? { totalUsers: "…", totalCourses: "…", activeClasses: "…" };
    return (
        <>
            <StatCard title="Tổng người dùng" value={v.totalUsers} icon={Users} color="text-blue-600" bg="bg-blue-50" border="border-blue-100" />
            <StatCard title="Khối & Chương trình" value={v.totalCourses} icon={BookOpen} color="text-emerald-600" bg="bg-emerald-50" border="border-emerald-100" />
            <StatCard title="Lớp học đang mở" value={v.activeClasses} icon={School} color="text-amber-600" bg="bg-amber-50" border="border-amber-100" />
        </>
    );
}

export async function SchoolStats() {
    const result = await settle(fetchAdminSchoolStats);
    return <SchoolStatCards values={result.ok ? result.data : { totalUsers: "—", totalCourses: "—", activeClasses: "—" }} />;
}

export function ActiveUsersCard({ value }: { value: number | string }) {
    return <StatCard title="Đăng nhập hôm nay" value={value} icon={MousePointer2} color="text-sky-600" bg="bg-sky-50" border="border-sky-100" />;
}

export async function ActiveUsersToday() {
    const result = await settle(fetchDailyActiveUsers);
    return <ActiveUsersCard value={result.ok ? result.data : "—"} />;
}

export function SectionSkeleton({ height = "h-80" }: { height?: string }) {
    return (
        <div aria-busy="true" className={`bg-white rounded-3xl border border-slate-100 p-6 shadow-sm ${height} animate-pulse`}>
            <div className="h-5 w-56 rounded-lg bg-slate-100" />
            <div className="mt-3 h-3 w-80 max-w-full rounded bg-slate-100" />
            <div className="mt-8 h-[calc(100%-5rem)] rounded-2xl bg-slate-50" />
        </div>
    );
}

function SectionError({ message }: { message: string }) {
    return (
        <div role="alert" className="bg-white rounded-3xl border border-rose-100 p-6 text-sm font-medium text-rose-600 shadow-sm">
            {message}
        </div>
    );
}

export async function PresenceSection() {
    const result = await settle(() => fetchDailyStudentPresenceAndAttendance());
    if (!result.ok) return <SectionError message={result.message} />;
    return <DailyStudentPresenceWidget initialData={result.data} />;
}

export async function HomeworkSection() {
    const result = await settle(fetchHomeworkCompletionByGradeAndClass);
    if (!result.ok) return <SectionError message={result.message} />;
    return <HomeworkCompletionByGradeWidget initialData={result.data} />;
}

export async function GradeOverviewSection() {
    const result = await settle(fetchGradeOverviewByGradeAndClass);
    if (!result.ok) return <SectionError message={result.message} />;
    return <GradeOverviewByGradeWidget initialData={result.data} />;
}
