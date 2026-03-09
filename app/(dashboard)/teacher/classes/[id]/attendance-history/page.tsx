import { fetchClassDetails, fetchClassStudents } from "../actions";
import AttendanceHistoryClient from "./AttendanceHistoryClient";

export default async function AttendanceHistoryPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const [{ data: classInfo }, { data: students }] = await Promise.all([
        fetchClassDetails(id),
        fetchClassStudents(id),
    ]);

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <AttendanceHistoryClient
                classId={id}
                className={classInfo?.name || "Lớp học"}
                students={(students || []).map((s: any) => ({
                    student_id: s.student_id,
                    name: s.name,
                    email: s.email,
                }))}
            />
        </div>
    );
}
