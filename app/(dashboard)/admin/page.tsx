import { Suspense } from "react";
import { LayoutDashboard } from "lucide-react";
import { AdminTimeFilter } from "./AdminTimeFilter";
import { AdminAiInsights } from "./AdminAiInsights";
import {
    SchoolStats,
    SchoolStatCards,
    ActiveUsersToday,
    ActiveUsersCard,
    PresenceSection,
    HomeworkSection,
    GradeOverviewSection,
    SectionSkeleton,
} from "./DashboardSections";

export const revalidate = 0; // Luôn lấy số liệu mới

interface PageProps {
    searchParams: Promise<{
        range?: string;
    }>;
}

// Header hiện ngay; mỗi khối số liệu tải độc lập trong Suspense riêng và chỉ đọc dữ liệu
// của trường đang đăng nhập (xem analytics-actions.ts).
export default async function AdminDashboardPage({ searchParams }: PageProps) {
    const resolvedSearchParams = await searchParams;
    const range = typeof resolvedSearchParams?.range === "string" ? resolvedSearchParams.range : "all";

    return (
        <div className="space-y-8 pb-14 max-w-7xl mx-auto animate-in fade-in zoom-in-95 duration-500">
            {/* 1. Header Bảng điều khiển */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-100">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                        <LayoutDashboard className="w-3.5 h-3.5" />
                        <span>Hệ Thống Vận Hành Trường Học & LMS</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
                        Tổng Quan Vận Hành Hằng Ngày
                    </h1>
                    <p className="text-gray-500 text-xs sm:text-sm font-medium max-w-2xl">
                        Giám sát chuyên cần, mốc giờ điểm danh, thời gian truy cập LMS và trực quan hóa tiến độ học vụ toàn trường.
                    </p>
                </div>
                {/* Bộ lọc thời gian */}
                <div className="self-start sm:self-auto">
                    <AdminTimeFilter />
                </div>
            </div>

            {/* 2. Top Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <Suspense fallback={<SchoolStatCards />}>
                    <SchoolStats />
                </Suspense>
                <Suspense fallback={<ActiveUsersCard value="…" />}>
                    <ActiveUsersToday />
                </Suspense>
            </div>

            {/* 3. Hoạt Động & Điểm Danh Học Sinh Kèm Mốc Giờ Truy Cập LMS */}
            <Suspense fallback={<SectionSkeleton height="h-96" />}>
                <PresenceSection />
            </Suspense>

            {/* 4. Tiến Độ Bài Tập Theo Khối & Lớp */}
            <Suspense fallback={<SectionSkeleton />}>
                <HomeworkSection />
            </Suspense>

            {/* 5. Phổ Điểm Theo Khối & Lớp */}
            <Suspense fallback={<SectionSkeleton />}>
                <GradeOverviewSection />
            </Suspense>

            {/* 6. Tổng hợp & đánh giá: số liệu chỉ tải khi bấm nút */}
            <AdminAiInsights range={range} />
        </div>
    );
}
