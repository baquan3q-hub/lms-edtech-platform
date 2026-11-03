import { Metadata } from "next";
import { getSchoolsWithApiQuotas } from "@/lib/actions/schools";
import SchoolsClient from "@/app/(dashboard)/admin/schools/SchoolsClient";

export const metadata: Metadata = {
    title: "Cơ sở trường học | Super Admin",
    description: "Quản trị cơ sở trường học và phân bổ hạn ngạch API.",
};

export default async function SuperAdminSchoolsListPage() {
    const schools = await getSchoolsWithApiQuotas();

    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs">
            <SchoolsClient initialSchools={schools} />
        </div>
    );
}
