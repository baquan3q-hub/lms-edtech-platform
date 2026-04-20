import { fetchAdminBehaviorDashboard } from "@/lib/actions/behavior-analysis";
import AdminBehaviorDashboard from "./AdminBehaviorDashboard";

export const revalidate = 0;

export default async function AdminBehaviorPage() {
    const { data, error } = await fetchAdminBehaviorDashboard();

    return (
        <div className="max-w-7xl mx-auto pb-12">
            <AdminBehaviorDashboard data={data} />
        </div>
    );
}
