import { createAdminClient } from "@/lib/supabase/admin";
import { fetchSystemBehaviorAnalytics } from "@/lib/actions/behavior-analysis";
import BehaviorTrackerClient from "@/components/shared/BehaviorTrackerClient";
import { ShieldCheck, Activity } from "lucide-react";

export const revalidate = 0;

export default async function AdminBehaviorPage() {
    const data = await fetchSystemBehaviorAnalytics();
    
    // Sort and filter only students with some risks
    const studentsWithRisks = (data.top_risk_students || []).filter(
        (s: any) => s.risk_level === 'high_risk' || s.risk_level === 'warning'
    );

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in zoom-in-95 duration-500">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3 tracking-tight">
                        <Activity className="w-8 h-8 text-violet-600" />
                        Hành vi học tập học viên
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">Theo dõi rủi ro và các hoạt động bất thường (như đoán mò, rời khỏi phòng thi) trong các bài kiểm tra.</p>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_2px_20px_rgb(0,0,0,0.02)] p-6">
                <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Danh sách Cảnh báo</h2>
                        <p className="text-sm text-slate-500">Toàn bộ hồ sơ vi phạm từ tất cả các lớp</p>
                    </div>
                </div>

                <BehaviorTrackerClient students={studentsWithRisks} />
            </div>
        </div>
    );
}
