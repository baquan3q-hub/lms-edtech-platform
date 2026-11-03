import { Metadata } from "next";
import { getSchoolsWithApiQuotas } from "@/lib/actions/schools";
import { requireSuperAdmin } from "@/lib/auth/super-admin";
import SchoolsClient from "./SchoolsClient";

export const metadata: Metadata = {
    title: "Quản Lý Trường Học & API Gateway | EduSchool Super Admin",
    description: "Cổng quản trị Super Admin dành cho quản lý cơ sở trường học và phân phối hạn ngạch API/AI.",
};

export default async function AdminSchoolsPage() {
    await requireSuperAdmin();
    const schools = await getSchoolsWithApiQuotas();

    return <SchoolsClient initialSchools={schools} />;
}
