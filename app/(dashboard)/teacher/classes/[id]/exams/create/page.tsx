import ExamEditorClient from "../ExamEditorClient";

export default async function CreateExamPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: classId } = await params;
    return <ExamEditorClient classId={classId} />;
}
