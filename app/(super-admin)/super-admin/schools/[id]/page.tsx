import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSchoolDeepDiveData } from "@/lib/actions/super-admin";
import SchoolDetailClient from "./SchoolDetailClient";

export async function generateMetadata(
    props: { params: Promise<{ id: string }> }
): Promise<Metadata> {
    const { id } = await props.params;
    const data = await getSchoolDeepDiveData(id);
    if (!data) return { title: "Không tìm thấy trường học" };

    return {
        title: `Dữ Liệu Trường [${data.school.code}] ${data.school.name} | Super Admin Deep Dive`,
        description: `Bảng dữ liệu chi tiết cơ sở ${data.school.name} cho Super Admin.`,
    };
}

export default async function SchoolDeepDivePage(props: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await props.params;
    const data = await getSchoolDeepDiveData(id);

    if (!data) {
        notFound();
    }

    return <SchoolDetailClient data={data} />;
}
