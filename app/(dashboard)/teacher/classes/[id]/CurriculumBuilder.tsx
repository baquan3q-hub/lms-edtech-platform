"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, GripVertical, PlusCircle, Trash2, Edit2, PlayCircle, FileText, CheckSquare, MoreVertical, LayoutList, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClassSection, updateClassSection, deleteClassSection, deleteLesson, createLesson } from "@/lib/actions/teacher";
import { Input } from "@/components/ui/input";

// Define the shape of our data
interface Lesson {
    id: string;
    title: string;
    lesson_type: string;
    section_id: string | null;
    order: number;
    video_url?: string;
    attachments?: any[];
}

interface Section {
    id: string;
    title: string;
    order: number;
    lessons: Lesson[];
}

export default function CurriculumBuilder({
    classId,
    initialSections,
    unassignedLessons
}: {
    classId: string;
    initialSections: Section[];
    unassignedLessons: Lesson[];
}) {
    const [sections, setSections] = useState<Section[]>(initialSections);
    const [orphans, setOrphans] = useState<Lesson[]>(unassignedLessons);

    const [isAddingSection, setIsAddingSection] = useState(false);
    const [newSectionTitle, setNewSectionTitle] = useState("");

    const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
    const [editSectionTitle, setEditSectionTitle] = useState("");

    // --- Section Actions ---
    const handleAddSection = async () => {
        if (!newSectionTitle.trim()) return;

        const loading = toast.loading("Đang tạo chương mới...");
        const result = await createClassSection({
            class_id: classId,
            title: newSectionTitle,
            order: sections.length
        });

        if (result.success && result.data) {
            setSections([...sections, { ...result.data, lessons: [] }]);
            setNewSectionTitle("");
            setIsAddingSection(false);
            toast.success("Tạo chương thành công", { id: loading });
        } else {
            toast.error(result.error || "Lỗi tạo chương", { id: loading });
        }
    };

    const handleSaveSectionEdit = async (sectionId: string) => {
        if (!editSectionTitle.trim()) return;

        const loading = toast.loading("Đang cập nhật...");
        const result = await updateClassSection(sectionId, classId, { title: editSectionTitle });

        if (result.success) {
            setSections(sections.map(s => s.id === sectionId ? { ...s, title: editSectionTitle } : s));
            setEditingSectionId(null);
            toast.success("Đã lưu", { id: loading });
        } else {
            toast.error(result.error || "Lỗi", { id: loading });
        }
    };

    const handleDeleteSection = async (sectionId: string) => {
        if (!confirm("Bạn có chắc muốn xóa chương này? Toàn bộ bài học bên trong sẽ bị xóa theo.")) return;

        const loading = toast.loading("Đang xóa...");
        const result = await deleteClassSection(sectionId, classId);

        if (result.success) {
            setSections(sections.filter(s => s.id !== sectionId));
            toast.success("Đã xóa chương", { id: loading });
        } else {
            toast.error(result.error || "Lỗi xóa", { id: loading });
        }
    };

    // --- Lesson Actions ---
    const handleAddQuickLesson = async (sectionId: string, type: 'video' | 'document' | 'quiz') => {
        const title = prompt(`Nhập tên ${type === 'video' ? 'Bài giảng Video' : type === 'document' ? 'Tài liệu đọc' : 'Bài trắc nghiệm'} mới:`);
        if (!title) return;

        const loading = toast.loading("Đang tạo bài học...");

        // Find current section max order
        const section = sections.find(s => s.id === sectionId);
        const order = section ? section.lessons.length : 0;

        const result = await createLesson({
            class_id: classId,
            title,
            section_id: sectionId,
            lesson_type: type,
            order
        });

        if (result.success) {
            toast.success("Tạo thành công", { id: loading });
            window.location.reload(); // Simple reload for now to fetch new ID and data. Refactor to optimistic UI later.
        } else {
            toast.error(result.error || "Lỗi tạo bài", { id: loading });
        }
    };

    const handleDeleteLesson = async (lessonId: string) => {
        if (!confirm("Xóa bài học này?")) return;

        const loading = toast.loading("Đang xóa...");
        const result = await deleteLesson(lessonId, classId);

        if (result.success) {
            // Update local state by removing it from wherever it is
            setSections(sections.map(s => ({
                ...s,
                lessons: s.lessons.filter(l => l.id !== lessonId)
            })));
            setOrphans(orphans.filter(l => l.id !== lessonId));

            toast.success("Đã xóa", { id: loading });
        } else {
            toast.error(result.error || "Lỗi", { id: loading });
        }
    };

    const renderLesson = (lesson: Lesson, index: number) => {
        const icons = {
            video: <PlayCircle className="w-4 h-4 text-rose-500" />,
            document: <FileText className="w-4 h-4 text-emerald-500" />,
            quiz: <CheckSquare className="w-4 h-4 text-indigo-500" />
        };

        return (
            <div key={lesson.id} className="flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50 border-b border-slate-100 last:border-0 group/lesson transition-colors ml-6">
                <div className="flex items-center gap-3">
                    <GripVertical className="w-4 h-4 text-slate-300 cursor-grab hover:text-slate-500 shrink-0" />
                    <span className="text-sm font-medium text-slate-800 flex items-center gap-2">
                        {icons[lesson.lesson_type as keyof typeof icons] || <FileText className="w-4 h-4 text-slate-400" />}
                        {index + 1}. {lesson.title}
                    </span>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover/lesson:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50" onClick={() => window.location.href = `/teacher/lessons/${lesson.id}`}>
                        <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteLesson(lesson.id)}>
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-4">
            {/* Header controls */}
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-900 flex items-center">
                    <LayoutList className="w-5 h-5 mr-2 text-indigo-500" />
                    Cấu trúc Giảng trình
                </h3>
                <Button onClick={() => setIsAddingSection(true)} variant="outline" className="border-dashed border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                    <FolderPlus className="w-4 h-4 mr-2" /> Thêm Chương / Thư mục
                </Button>
            </div>

            {/* Add Section Form */}
            {isAddingSection && (
                <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex items-center gap-3 animate-in fade-in zoom-in duration-200">
                    <Input
                        placeholder="Tên chương mới, vd: Phần 1: Giới thiệu..."
                        value={newSectionTitle}
                        onChange={(e) => setNewSectionTitle(e.target.value)}
                        className="bg-white"
                        autoFocus
                    />
                    <Button onClick={handleAddSection} className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0">Lưu</Button>
                    <Button onClick={() => { setIsAddingSection(false); setNewSectionTitle(""); }} variant="ghost" className="text-slate-500 shrink-0">Hủy</Button>
                </div>
            )}

            {/* Sections List */}
            <div className="space-y-3">
                {sections.map((section, sIndex) => (
                    <div key={section.id} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        {/* Section Header */}
                        <div className="flex items-center justify-between p-3 border-b border-slate-200 bg-slate-100/50 group/section">
                            <div className="flex items-center gap-2 flex-1">
                                <GripVertical className="w-4 h-4 text-slate-400 cursor-grab hover:text-slate-600 shrink-0" />
                                <ChevronDown className="w-5 h-5 text-slate-500 shrink-0" />

                                {editingSectionId === section.id ? (
                                    <div className="flex items-center gap-2 flex-1 max-w-sm ml-1">
                                        <Input
                                            value={editSectionTitle}
                                            onChange={(e) => setEditSectionTitle(e.target.value)}
                                            className="h-8 text-sm font-bold"
                                            autoFocus
                                        />
                                        <Button size="sm" onClick={() => handleSaveSectionEdit(section.id)} className="h-8 bg-indigo-600">Lưu</Button>
                                        <Button size="sm" variant="ghost" onClick={() => setEditingSectionId(null)} className="h-8">Hủy</Button>
                                    </div>
                                ) : (
                                    <h4 className="font-bold text-slate-900 text-sm ml-1">
                                        Chương {sIndex + 1}: {section.title}
                                    </h4>
                                )}
                            </div>

                            {/* Section Controls */}
                            {editingSectionId !== section.id && (
                                <div className="flex items-center gap-1 opacity-0 group-hover/section:opacity-100 transition-opacity mr-2">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50" onClick={() => {
                                        setEditSectionTitle(section.title);
                                        setEditingSectionId(section.id);
                                    }}>
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteSection(section.id)}>
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Lessons in Section */}
                        <div className="bg-white">
                            {section.lessons.map((lesson, lIndex) => renderLesson(lesson, lIndex))}

                            {/* Add Lesson inline triggers */}
                            <div className="px-10 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center gap-4">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Thêm mới:</span>
                                <button onClick={() => handleAddQuickLesson(section.id, 'video')} className="text-sm font-medium text-slate-600 hover:text-rose-600 flex items-center gap-1.5 transition-colors">
                                    <PlayCircle className="w-4 h-4" /> Video
                                </button>
                                <button onClick={() => handleAddQuickLesson(section.id, 'document')} className="text-sm font-medium text-slate-600 hover:text-emerald-600 flex items-center gap-1.5 transition-colors">
                                    <FileText className="w-4 h-4" /> Tài liệu đọc
                                </button>
                                <button onClick={() => handleAddQuickLesson(section.id, 'quiz')} className="text-sm font-medium text-slate-600 hover:text-indigo-600 flex items-center gap-1.5 transition-colors">
                                    <CheckSquare className="w-4 h-4" /> Trắc nghiệm
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {sections.length === 0 && !isAddingSection && (
                    <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                        <FolderPlus className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <h4 className="font-bold text-slate-700">Chưa có Chương học nào</h4>
                        <p className="text-sm text-slate-500 mb-4 max-w-sm mx-auto">Hãy tạo các Chương (Phần) để tổ chức bài giảng một cách khoa học và dễ theo dõi hơn.</p>
                        <Button onClick={() => setIsAddingSection(true)} className="bg-indigo-600 hover:bg-indigo-700">Tạo Chương đầu tiên</Button>
                    </div>
                )}
            </div>

            {/* Unassigned Lessons (Học liệu tự do) */}
            {orphans.length > 0 && (
                <div className="mt-8 border-t border-slate-200 pt-6">
                    <h4 className="font-bold text-slate-900 mb-3 text-sm flex items-center text-amber-600">
                        Bài giảng chưa phân loại ({orphans.length})
                    </h4>
                    <div className="bg-white border text-slate-400 border-slate-200 rounded-xl overflow-hidden">
                        {orphans.map((lesson, index) => renderLesson(lesson, index))}
                    </div>
                </div>
            )}
        </div>
    );
}
