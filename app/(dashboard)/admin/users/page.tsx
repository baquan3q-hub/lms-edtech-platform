import { Users } from "lucide-react";
import { fetchUsers } from "./actions";
import AddUserDialog from "@/components/admin/AddUserDialog";
import ImportUsersDialog from "@/components/admin/ImportUsersDialog";
import UsersTabs from "@/components/admin/UsersTabs";
import { createAdminClient } from "@/lib/supabase/admin";
import ExportUsersExcelButton from "@/components/admin/ExportUsersExcelButton";

export const dynamic = "force-dynamic";

const roleBadgeConfig: Record<string, { label: string; className: string }> = {
    admin: { label: "Admin", className: "bg-red-50 text-red-600 border-red-200" },
    teacher: { label: "Giáo viên", className: "bg-emerald-50 text-emerald-600 border-emerald-200" },
    student: { label: "Học sinh", className: "bg-blue-50 text-blue-600 border-blue-200" },
    parent: { label: "Phụ huynh", className: "bg-amber-50 text-amber-600 border-amber-200" },
};

export default async function UsersPage() {
    const { data: users, error } = await fetchUsers();

    // Fetch parent-student links
    const adminSupabase = createAdminClient();
    const { data: links } = await adminSupabase
        .from("parent_students")
        .select("id, parent_id, student_id, relationship");

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50">
                        <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Quản lý Người dùng</h2>
                        <p className="text-sm text-gray-500">Danh sách toàn bộ tài khoản trong hệ thống</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <ExportUsersExcelButton users={users || []} links={links || []} />
                    <ImportUsersDialog />
                    <AddUserDialog />
                </div>
            </div>

            {users && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(roleBadgeConfig).map(([role, config]) => {
                        const count = users.filter((u: { role: string }) => u.role === role).length;
                        return (
                            <div key={role} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                                <p className="text-xs text-gray-500 mb-1">{config.label}</p>
                                <p className="text-2xl font-bold text-gray-900">{count}</p>
                            </div>
                        );
                    })}
                </div>
            )}

            <UsersTabs users={users} error={error} linkData={links || []} />
        </div>
    );
}

