import { Metadata } from "next";
import { getPlatformAuditLogs } from "@/lib/actions/super-admin-accounts";
import { createAdminClient } from "@/lib/supabase/admin";
import ActivitiesClient from "./ActivitiesClient";

export const metadata: Metadata = {
    title: "Lịch sử hoạt động & Kiểm toán | Super Admin",
    description: "Nhật ký kiểm toán và theo dõi hoạt động toàn hệ thống LMS.",
};

export default async function SuperAdminActivitiesPage() {
    const db = createAdminClient();

    const [logs, { data: schools }] = await Promise.all([
        getPlatformAuditLogs({ limit: 100 }),
        db.from("schools").select("id, name, code").order("name", { ascending: true }),
    ]);

    return (
        <ActivitiesClient
            initialLogs={logs}
            schools={schools || []}
        />
    );
}
