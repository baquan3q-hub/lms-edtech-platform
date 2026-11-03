import { Metadata } from "next";
import { listPlatformAccounts } from "@/lib/actions/super-admin-accounts";
import { createAdminClient } from "@/lib/supabase/admin";
import AccountsClient from "./AccountsClient";

export const metadata: Metadata = {
    title: "Quản trị Tài khoản & Mật khẩu | Super Admin",
    description: "Quản trị người dùng toàn bộ hệ thống và can thiệp mật khẩu.",
};

export default async function SuperAdminAccountsPage() {
    const db = createAdminClient();

    const [accounts, { data: schools }] = await Promise.all([
        listPlatformAccounts(),
        db.from("schools").select("id, name, code").order("name", { ascending: true }),
    ]);

    return (
        <AccountsClient
            initialAccounts={accounts}
            schools={schools || []}
        />
    );
}
