import HomeworkEditorClient from "../HomeworkEditorClient";

export default async function CreateHomeworkPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: classId } = await params;
    return <HomeworkEditorClient classId={classId} />;
}
