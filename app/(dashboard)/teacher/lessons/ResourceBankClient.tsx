"use client";

import { useState, useRef, useEffect } from "react";
import { createResource, deleteResource, updateResource, shareResourceToClass, fetchTeacherClassesForShare } from "@/lib/actions/resourceBank";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
    ListChecks, FileText, Video, LinkIcon, File, PenLine,
    Plus, Trash2, Search, Upload, Loader2, CheckCircle2,
    ExternalLink, Eye, Sparkles, Pencil, Share2, Send, Users
} from "lucide-react";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import AIGenerateModal from "@/components/teacher/AIGenerateModal";

// === Config cho 6 loại tài nguyên ===
const RESOURCE_TYPES = [
    { key: "quiz", label: "Trắc nghiệm", icon: ListChecks, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200", ring: "ring-indigo-500" },
    { key: "essay", label: "Tự luận", icon: PenLine, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", ring: "ring-emerald-500" },
    { key: "document", label: "Tài liệu", icon: FileText, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", ring: "ring-blue-500" },
    { key: "video", label: "Video", icon: Video, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200", ring: "ring-rose-500" },
    { key: "file", label: "File", icon: File, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", ring: "ring-amber-500" },
    { key: "link", label: "Link", icon: LinkIcon, color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200", ring: "ring-violet-500" },
] as const;

type ResourceType = typeof RESOURCE_TYPES[number]["key"];

const genId = () => Math.random().toString(36).slice(2, 10);

// === QUIZ Builder helpers ===
interface QuizQuestion {
    id: string;
    question: string;
    options: { id: string; text: string; isCorrect: boolean }[];
    points: number;
}

function emptyQuizQuestion(): QuizQuestion {
    return {
        id: genId(),
        question: "",
        options: [
            { id: genId(), text: "", isCorrect: true },
            { id: genId(), text: "", isCorrect: false },
            { id: genId(), text: "", isCorrect: false },
            { id: genId(), text: "", isCorrect: false },
        ],
        points: 1,
    };
}

export default function ResourceBankClient({ initialResources }: { initialResources: any[] }) {
    const [resources, setResources] = useState<any[]>(initialResources || []);
    const [activeTab, setActiveTab] = useState<ResourceType>("quiz");
    const [search, setSearch] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    // Edit state
    const [editResource, setEditResource] = useState<any | null>(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    // Share state
    const [shareResource, setShareResource] = useState<any | null>(null);
    const [shareDialogOpen, setShareDialogOpen] = useState(false);

    const activeConfig = RESOURCE_TYPES.find(t => t.key === activeTab)!;
    const filtered = resources
        .filter(r => r.type === activeTab)
        .filter(r => !search || r.title.toLowerCase().includes(search.toLowerCase()));

    const handleDelete = async (id: string) => {
        if (!confirm("Bạn có chắc muốn xóa tài nguyên này?")) return;
        setDeleting(id);
        const res = await deleteResource(id);
        if (res.error) {
            toast.error("Lỗi xóa: " + res.error);
        } else {
            setResources(prev => prev.filter(r => r.id !== id));
            toast.success("Đã xóa tài nguyên");
        }
        setDeleting(null);
    };

    const handleCreated = (newResource: any) => {
        setResources(prev => [newResource, ...prev]);
        setDialogOpen(false);
    };

    const handleUpdated = (updated: any) => {
        setResources(prev => prev.map(r => r.id === updated.id ? { ...r, ...updated } : r));
        setEditDialogOpen(false);
        setEditResource(null);
    };

    const openEdit = (r: any) => {
        setEditResource(r);
        setEditDialogOpen(true);
    };

    const openShare = (r: any) => {
        setShareResource(r);
        setShareDialogOpen(true);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Tabs */}
            <div className="flex flex-wrap gap-2">
                {RESOURCE_TYPES.map(t => {
                    const Icon = t.icon;
                    const isActive = activeTab === t.key;
                    const count = resources.filter(r => r.type === t.key).length;
                    return (
                        <button
                            key={t.key}
                            onClick={() => { setActiveTab(t.key); setSearch(""); }}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all ${isActive
                                ? `${t.bg} ${t.color} ${t.border} ring-2 ${t.ring} ring-offset-1 shadow-sm`
                                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300"
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            {t.label}
                            {count > 0 && (
                                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${isActive ? `${t.bg} ${t.color}` : "bg-slate-100 text-slate-500"}`}>
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Search + Add button */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                        placeholder={`Tìm kiếm ${activeConfig.label.toLowerCase()}...`}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className={`${activeConfig.bg} ${activeConfig.color} border ${activeConfig.border} hover:opacity-90 font-bold shadow-sm`}>
                            <Plus className="w-4 h-4 mr-2" /> Thêm {activeConfig.label}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
                        <CreateResourceForm
                            type={activeTab}
                            config={activeConfig}
                            onCreated={handleCreated}
                            onClose={() => setDialogOpen(false)}
                        />
                    </DialogContent>
                </Dialog>
            </div>

            {/* Resource list */}
            {filtered.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
                    <activeConfig.icon className={`w-12 h-12 mx-auto mb-4 ${activeConfig.color} opacity-30`} />
                    <h3 className="text-lg font-bold text-slate-700 mb-1">
                        Chưa có {activeConfig.label.toLowerCase()} nào
                    </h3>
                    <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
                        Tạo {activeConfig.label.toLowerCase()} mới để lưu vào ngân hàng tài liệu và tái sử dụng khi giao bài.
                    </p>
                    <Button onClick={() => setDialogOpen(true)} className={`${activeConfig.bg} ${activeConfig.color} border ${activeConfig.border} font-bold`}>
                        <Plus className="w-4 h-4 mr-2" /> Thêm {activeConfig.label} đầu tiên
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map(r => {
                        const cfg = RESOURCE_TYPES.find(t => t.key === r.type) || RESOURCE_TYPES[0];
                        const Icon = cfg.icon;
                        const questionsCount = r.content?.questions?.length || 0;
                        return (
                            <div key={r.id} className={`bg-white rounded-2xl border ${cfg.border} shadow-sm hover:shadow-md transition-all group overflow-hidden`}>
                                <div className={`px-5 py-3 ${cfg.bg} border-b ${cfg.border} flex items-center justify-between`}>
                                    <Badge className={`${cfg.bg} ${cfg.color} border-none font-semibold text-xs`}>
                                        <Icon className="w-3 h-3 mr-1" />
                                        {cfg.label}
                                    </Badge>
                                    <span className="text-[11px] text-slate-400 font-medium">
                                        {new Date(r.created_at).toLocaleDateString("vi-VN")}
                                    </span>
                                </div>
                                <div className="p-5">
                                    <h3 className="font-bold text-slate-800 line-clamp-2 mb-2">{r.title}</h3>
                                    {r.description && (
                                        <p className="text-sm text-slate-500 line-clamp-2 mb-3">{r.description}</p>
                                    )}
                                    {/* Meta info */}
                                    <div className="flex flex-wrap gap-2 text-xs text-slate-400 mb-4">
                                        {r.type === "quiz" && questionsCount > 0 && (
                                            <span className="flex items-center gap-1 bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md font-medium">
                                                <ListChecks className="w-3 h-3" /> {questionsCount} câu hỏi
                                            </span>
                                        )}
                                        {r.file_url && (
                                            <a href={r.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-1 rounded-md font-medium hover:underline">
                                                <ExternalLink className="w-3 h-3" /> Xem file
                                            </a>
                                        )}
                                        {r.video_url && (
                                            <a href={r.video_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 bg-rose-50 text-rose-600 px-2 py-1 rounded-md font-medium hover:underline">
                                                <Eye className="w-3 h-3" /> Xem video
                                            </a>
                                        )}
                                        {r.link_url && (
                                            <a href={r.link_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 bg-violet-50 text-violet-600 px-2 py-1 rounded-md font-medium hover:underline">
                                                <ExternalLink className="w-3 h-3" /> Mở link
                                            </a>
                                        )}
                                    </div>
                                    <div className="flex gap-2 pt-3 border-t border-slate-100">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openEdit(r)}
                                            className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 text-xs h-8"
                                        >
                                            <Pencil className="w-3 h-3 mr-1" /> Sửa
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openShare(r)}
                                            className="text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 text-xs h-8"
                                        >
                                            <Share2 className="w-3 h-3 mr-1" /> Chia sẻ
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            disabled={deleting === r.id}
                                            onClick={() => handleDelete(r.id)}
                                            className="text-red-400 hover:text-red-600 hover:bg-red-50 text-xs h-8"
                                        >
                                            {deleting === r.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Trash2 className="w-3 h-3 mr-1" />}
                                            Xóa
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Edit dialog */}
            <Dialog open={editDialogOpen} onOpenChange={(v) => { setEditDialogOpen(v); if (!v) setEditResource(null); }}>
                <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
                    {editResource && (
                        <EditResourceForm
                            resource={editResource}
                            config={RESOURCE_TYPES.find(t => t.key === editResource.type) || RESOURCE_TYPES[0]}
                            onUpdated={handleUpdated}
                            onClose={() => { setEditDialogOpen(false); setEditResource(null); }}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Share dialog */}
            <Dialog open={shareDialogOpen} onOpenChange={(v) => { setShareDialogOpen(v); if (!v) setShareResource(null); }}>
                <DialogContent className="sm:max-w-[500px]">
                    {shareResource && (
                        <ShareResourceDialog
                            resource={shareResource}
                            onClose={() => { setShareDialogOpen(false); setShareResource(null); }}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ============================================================
// CREATE RESOURCE FORM — dynamic per type
// ============================================================
function CreateResourceForm({
    type, config, onCreated, onClose
}: {
    type: ResourceType;
    config: typeof RESOURCE_TYPES[number];
    onCreated: (r: any) => void;
    onClose: () => void;
}) {
    const Icon = config.icon;
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [saving, setSaving] = useState(false);

    // Quiz state
    const [questions, setQuestions] = useState<QuizQuestion[]>([emptyQuizQuestion()]);
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);

    // AI generated questions handler
    const handleAIGenerated = (generatedQuestions: any[]) => {
        if (!generatedQuestions.length) return;
        const N = generatedQuestions.length;
        const basePoints = Math.floor(10 / N);
        let remainder = 10 % N;

        const formatted: QuizQuestion[] = generatedQuestions.map((gq) => {
            const pts = basePoints + (remainder > 0 ? 1 : 0);
            if (remainder > 0) remainder--;
            return {
                id: genId(),
                question: gq.question,
                points: pts || 1,
                options: (gq.options || []).map((optLabel: string, oIdx: number) => ({
                    id: genId(),
                    text: optLabel,
                    isCorrect: oIdx === gq.correctIndex,
                })),
            };
        });

        // If only 1 empty question exists, replace; otherwise append
        setQuestions(prev => {
            if (prev.length === 1 && !prev[0].question.trim() && prev[0].options.every(o => !o.text.trim())) {
                return formatted;
            }
            return [...prev, ...formatted];
        });
    };

    // Essay state
    const [essayPrompt, setEssayPrompt] = useState("");
    const [essayInstructions, setEssayInstructions] = useState("");

    // File/Document/Video upload state
    const [fileUrl, setFileUrl] = useState("");
    const [videoUrl, setVideoUrl] = useState("");
    const [linkUrl, setLinkUrl] = useState("");
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // === Upload handler ===
    const handleFileUpload = async (file: globalThis.File, bucket: string) => {
        const maxSize = bucket === "lesson-videos" ? 500 * 1024 * 1024 : 100 * 1024 * 1024;
        if (file.size > maxSize) {
            toast.error(`File quá lớn (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
            return;
        }
        setUploading(true);
        setUploadProgress(0);
        const progressInterval = setInterval(() => {
            setUploadProgress(prev => {
                if (prev >= 90) { clearInterval(progressInterval); return 90; }
                return prev + Math.random() * 15;
            });
        }, 300);

        try {
            const supabase = createClient();
            const ext = file.name.split(".").pop();
            const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "-");
            const fileName = `resource_bank/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
            const { error } = await supabase.storage.from(bucket).upload(fileName, file, { cacheControl: "3600", upsert: true });
            clearInterval(progressInterval);
            if (error) throw error;
            const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
            setUploadProgress(100);

            if (type === "video") setVideoUrl(urlData.publicUrl);
            else setFileUrl(urlData.publicUrl);

            toast.success("Upload thành công!");
        } catch (err: any) {
            clearInterval(progressInterval);
            toast.error("Lỗi upload: " + (err.message || "Không thể tải lên"));
        } finally {
            setUploading(false);
        }
    };

    // === Quiz helpers ===
    const addQuestion = () => setQuestions(prev => [...prev, emptyQuizQuestion()]);
    const removeQuestion = (idx: number) => {
        if (questions.length <= 1) { toast.error("Cần ít nhất 1 câu hỏi"); return; }
        setQuestions(prev => prev.filter((_, i) => i !== idx));
    };
    const updateQ = (idx: number, field: string, val: any) => {
        setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: val } : q));
    };
    const updateOpt = (qIdx: number, oIdx: number, field: string, val: any) => {
        setQuestions(prev => prev.map((q, i) => {
            if (i !== qIdx) return q;
            return { ...q, options: q.options.map((o, j) => j === oIdx ? { ...o, [field]: val } : o) };
        }));
    };
    const setCorrect = (qIdx: number, oIdx: number) => {
        setQuestions(prev => prev.map((q, i) => {
            if (i !== qIdx) return q;
            return { ...q, options: q.options.map((o, j) => ({ ...o, isCorrect: j === oIdx })) };
        }));
    };
    const addOpt = (qIdx: number) => {
        setQuestions(prev => prev.map((q, i) => {
            if (i !== qIdx) return q;
            return { ...q, options: [...q.options, { id: genId(), text: "", isCorrect: false }] };
        }));
    };

    // === Save ===
    const handleSave = async () => {
        if (!title.trim()) { toast.error("Vui lòng nhập tiêu đề"); return; }

        // Validate quiz
        if (type === "quiz") {
            for (let i = 0; i < questions.length; i++) {
                if (!questions[i].question.trim()) { toast.error(`Câu ${i + 1}: Chưa nhập nội dung`); return; }
                if (!questions[i].options.some(o => o.isCorrect && o.text.trim())) { toast.error(`Câu ${i + 1}: Chưa có đáp án đúng`); return; }
            }
        }

        setSaving(true);
        const payload: any = { type, title, description };

        if (type === "quiz") payload.content = { questions };
        if (type === "essay") payload.content = { prompt: essayPrompt, instructions: essayInstructions };
        if (type === "document" || type === "file") payload.file_url = fileUrl;
        if (type === "video") { payload.video_url = videoUrl; payload.file_url = fileUrl; }
        if (type === "link") payload.link_url = linkUrl;

        const res = await createResource(payload);
        if (res.error) {
            toast.error("Lỗi: " + res.error);
        } else {
            toast.success("Đã thêm tài nguyên thành công!");
            onCreated(res.data);
        }
        setSaving(false);
    };

    return (
        <>
            <DialogHeader>
                <DialogTitle className="text-xl flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${config.color}`} />
                    Thêm {config.label} mới
                </DialogTitle>
                <DialogDescription>
                    Tạo {config.label.toLowerCase()} và lưu vào Ngân hàng Tài liệu số để tái sử dụng.
                </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
                {/* Common fields */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Tiêu đề *</label>
                    <Input placeholder={`VD: ${type === "quiz" ? "Bộ 10 câu trắc nghiệm Toán lớp 9" : type === "essay" ? "Đề tự luận Văn học" : "Tài liệu ôn tập"}`} value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Mô tả (tùy chọn)</label>
                    <Textarea placeholder="Ghi chú ngắn..." value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
                </div>

                {/* === QUIZ BUILDER === */}
                {type === "quiz" && (
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <label className="text-sm font-bold text-indigo-700">Danh sách câu hỏi ({questions.length})</label>
                            <div className="flex gap-2">
                                <Button variant="secondary" size="sm" onClick={() => setIsAIModalOpen(true)} className="text-xs h-7 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200">
                                    <Sparkles className="w-3 h-3 mr-1" /> Sinh bằng AI
                                </Button>
                                <Button variant="outline" size="sm" onClick={addQuestion} className="text-xs h-7">
                                    <Plus className="w-3 h-3 mr-1" /> Thêm câu
                                </Button>
                            </div>
                        </div>
                        {questions.map((q, qIdx) => (
                            <div key={q.id} className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-indigo-600">Câu {qIdx + 1}</span>
                                    <div className="flex items-center gap-2">
                                        <Input type="number" min={0} value={q.points} onChange={(e) => updateQ(qIdx, "points", parseInt(e.target.value) || 0)} className="w-16 h-7 text-xs text-center" />
                                        <span className="text-xs text-slate-400">điểm</span>
                                        <Button variant="ghost" size="sm" onClick={() => removeQuestion(qIdx)} className="h-7 w-7 p-0 text-red-400 hover:text-red-600">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>
                                <Textarea placeholder="Nhập câu hỏi..." value={q.question} onChange={(e) => updateQ(qIdx, "question", e.target.value)} rows={2} className="text-sm" />
                                <div className="space-y-1.5">
                                    {q.options.map((opt, oIdx) => (
                                        <div key={opt.id} className="flex items-center gap-2">
                                            <button type="button" onClick={() => setCorrect(qIdx, oIdx)}
                                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${opt.isCorrect ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 hover:border-emerald-400"}`}>
                                                {opt.isCorrect && <CheckCircle2 className="w-3.5 h-3.5" />}
                                            </button>
                                            <Input placeholder={`Đáp án ${String.fromCharCode(65 + oIdx)}`} value={opt.text} onChange={(e) => updateOpt(qIdx, oIdx, "text", e.target.value)} className="flex-1 h-8 text-sm" />
                                        </div>
                                    ))}
                                    <Button variant="ghost" size="sm" onClick={() => addOpt(qIdx)} className="text-xs h-6 text-indigo-500">
                                        <Plus className="w-3 h-3 mr-1" /> Thêm đáp án
                                    </Button>
                                </div>
                            </div>
                        ))}
                        <AIGenerateModal
                            open={isAIModalOpen}
                            onOpenChange={setIsAIModalOpen}
                            onQuestionsGenerated={handleAIGenerated}
                        />
                    </div>
                )}

                {/* === ESSAY === */}
                {type === "essay" && (
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-emerald-700">Đề bài *</label>
                            <Textarea placeholder="Nhập đề bài tự luận..." value={essayPrompt} onChange={(e) => setEssayPrompt(e.target.value)} rows={4} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-emerald-700">Hướng dẫn cho học sinh</label>
                            <Textarea placeholder="Yêu cầu về độ dài, nội dung..." value={essayInstructions} onChange={(e) => setEssayInstructions(e.target.value)} rows={2} />
                        </div>
                    </div>
                )}

                {/* === DOCUMENT / FILE === */}
                {(type === "document" || type === "file") && (
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                        <label className="text-sm font-bold text-blue-700">
                            {type === "document" ? "Upload tài liệu (PDF, DOCX, PPT...)" : "Upload file"}
                        </label>
                        <div
                            onClick={() => !uploading && fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${uploading ? "border-blue-300 bg-blue-50" : "border-blue-200 hover:border-blue-400 hover:bg-blue-50/50"}`}
                        >
                            {uploading ? (
                                <div className="space-y-2">
                                    <Loader2 className="w-8 h-8 text-blue-500 mx-auto animate-spin" />
                                    <p className="text-sm font-medium text-blue-700">Đang tải lên... {Math.round(uploadProgress)}%</p>
                                    <div className="w-full bg-blue-200 rounded-full h-2 max-w-xs mx-auto">
                                        <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }}></div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <Upload className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                                    <p className="text-sm font-medium text-blue-700">
                                        Kéo thả hoặc <span className="underline text-blue-600">chọn file</span>
                                    </p>
                                    <p className="text-xs text-blue-400 mt-1">Tối đa 100MB</p>
                                </>
                            )}
                            <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, "lesson-files"); }} disabled={uploading} />
                        </div>
                        {fileUrl && (
                            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                                <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate flex-1">{fileUrl.split("/").pop()?.slice(0, 40)}...</a>
                                <Button variant="ghost" size="sm" onClick={() => setFileUrl("")} className="h-7 w-7 p-0 text-red-400"><Trash2 className="w-3 h-3" /></Button>
                            </div>
                        )}
                        <div className="flex items-center gap-3">
                            <div className="h-px flex-1 bg-slate-200"></div>
                            <span className="text-xs font-bold text-slate-400">HOẶC</span>
                            <div className="h-px flex-1 bg-slate-200"></div>
                        </div>
                        <Input placeholder="Dán link file (Google Drive, OneDrive...)" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} />
                    </div>
                )}

                {/* === VIDEO === */}
                {type === "video" && (
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                        <label className="text-sm font-bold text-rose-700">Upload hoặc dán link Video</label>
                        <div
                            onClick={() => !uploading && fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${uploading ? "border-rose-300 bg-rose-50" : "border-rose-200 hover:border-rose-400 hover:bg-rose-50/50"}`}
                        >
                            {uploading ? (
                                <div className="space-y-2">
                                    <Loader2 className="w-8 h-8 text-rose-500 mx-auto animate-spin" />
                                    <p className="text-sm font-medium text-rose-700">Đang tải lên... {Math.round(uploadProgress)}%</p>
                                    <div className="w-full bg-rose-200 rounded-full h-2 max-w-xs mx-auto">
                                        <div className="bg-rose-500 h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }}></div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <Upload className="w-8 h-8 text-rose-400 mx-auto mb-2" />
                                    <p className="text-sm font-medium text-rose-700">Kéo thả hoặc <span className="underline text-rose-600">chọn file video</span></p>
                                    <p className="text-xs text-rose-400 mt-1">MP4, WebM, MOV — tối đa 500MB</p>
                                </>
                            )}
                            <input ref={fileInputRef} type="file" accept="video/mp4,video/webm,video/mov,video/quicktime,.mp4,.webm,.mov" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, "lesson-videos"); }} disabled={uploading} />
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="h-px flex-1 bg-slate-200"></div>
                            <span className="text-xs font-bold text-slate-400">HOẶC</span>
                            <div className="h-px flex-1 bg-slate-200"></div>
                        </div>
                        <Input placeholder="Dán link YouTube, Vimeo, Google Drive..." value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
                        {videoUrl && (videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be")) && (
                            <div className="aspect-video rounded-lg overflow-hidden bg-black max-w-md">
                                <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${videoUrl.match(/(?:v=|youtu\.be\/)([\w-]+)/)?.[1] || ""}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                            </div>
                        )}
                    </div>
                )}

                {/* === LINK === */}
                {type === "link" && (
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                        <label className="text-sm font-bold text-violet-700">Đường dẫn URL *</label>
                        <Input placeholder="https://docs.google.com/... hoặc bất kỳ URL nào" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
                        {linkUrl && (
                            <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-violet-600 hover:underline break-all p-3 bg-violet-50 rounded-lg border border-violet-200">
                                <ExternalLink className="w-4 h-4 shrink-0" />
                                {linkUrl}
                            </a>
                        )}
                    </div>
                )}
            </div>

            <DialogFooter>
                <Button variant="outline" onClick={onClose} disabled={saving}>Hủy</Button>
                <Button onClick={handleSave} disabled={saving} className={`${config.bg} ${config.color} border ${config.border} font-bold hover:opacity-90`}>
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Lưu {config.label}
                </Button>
            </DialogFooter>
        </>
    );
}

// ============================================================
// EDIT RESOURCE FORM — inline edit
// ============================================================
function EditResourceForm({
    resource, config, onUpdated, onClose
}: {
    resource: any;
    config: typeof RESOURCE_TYPES[number];
    onUpdated: (r: any) => void;
    onClose: () => void;
}) {
    const Icon = config.icon;
    const [title, setTitle] = useState(resource.title || "");
    const [description, setDescription] = useState(resource.description || "");
    const [saving, setSaving] = useState(false);

    // Type-specific state
    const [essayPrompt, setEssayPrompt] = useState(resource.content?.prompt || "");
    const [essayInstructions, setEssayInstructions] = useState(resource.content?.instructions || "");
    const [linkUrl, setLinkUrl] = useState(resource.link_url || "");
    const [videoUrl, setVideoUrl] = useState(resource.video_url || "");

    const handleSave = async () => {
        if (!title.trim()) { toast.error("Vui lòng nhập tiêu đề"); return; }
        setSaving(true);

        const updates: any = { title, description };
        if (resource.type === "essay") updates.content = { prompt: essayPrompt, instructions: essayInstructions };
        if (resource.type === "link") updates.link_url = linkUrl;
        if (resource.type === "video") updates.video_url = videoUrl;

        const res = await updateResource(resource.id, updates);
        if (res.error) {
            toast.error("Lỗi: " + res.error);
        } else {
            toast.success("Đã cập nhật tài nguyên!");
            onUpdated({ id: resource.id, ...updates });
        }
        setSaving(false);
    };

    return (
        <>
            <DialogHeader>
                <DialogTitle className="text-xl flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${config.color}`} />
                    Chỉnh sửa {config.label}
                </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Tiêu đề *</label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Mô tả</label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
                </div>

                {resource.type === "essay" && (
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-emerald-700">Đề bài</label>
                            <Textarea value={essayPrompt} onChange={(e) => setEssayPrompt(e.target.value)} rows={4} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-emerald-700">Hướng dẫn</label>
                            <Textarea value={essayInstructions} onChange={(e) => setEssayInstructions(e.target.value)} rows={2} />
                        </div>
                    </div>
                )}

                {resource.type === "link" && (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                        <label className="text-sm font-bold text-violet-700">URL</label>
                        <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
                    </div>
                )}

                {resource.type === "video" && (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                        <label className="text-sm font-bold text-rose-700">Link video</label>
                        <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
                    </div>
                )}
            </div>

            <DialogFooter>
                <Button variant="outline" onClick={onClose} disabled={saving}>Hủy</Button>
                <Button onClick={handleSave} disabled={saving} className={`${config.bg} ${config.color} border ${config.border} font-bold hover:opacity-90`}>
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Lưu thay đổi
                </Button>
            </DialogFooter>
        </>
    );
}

// ============================================================
// SHARE RESOURCE DIALOG — chia sẻ tài nguyên đến lớp
// ============================================================
function ShareResourceDialog({
    resource, onClose
}: {
    resource: any;
    onClose: () => void;
}) {
    const [classes, setClasses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedClassId, setSelectedClassId] = useState("");
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);

    const cfg = RESOURCE_TYPES.find(t => t.key === resource.type) || RESOURCE_TYPES[0];
    const Icon = cfg.icon;

    useEffect(() => {
        fetchTeacherClassesForShare().then(res => {
            if (res.data) setClasses(res.data);
            setLoading(false);
        });
    }, []);

    const handleShare = async () => {
        if (!selectedClassId) { toast.error("Vui lòng chọn lớp"); return; }

        setSending(true);
        const className = classes.find(c => c.id === selectedClassId)?.name || "";
        const res = await shareResourceToClass({
            resource_id: resource.id,
            resource_type: resource.type,
            class_id: selectedClassId,
            title: `📢 ${resource.title}`,
            content: message || `Giáo viên đã chia sẻ ${cfg.label.toLowerCase()}: "${resource.title}"${resource.file_url ? `\n📎 File: ${resource.file_url}` : ""}${resource.video_url ? `\n🎬 Video: ${resource.video_url}` : ""}${resource.link_url ? `\n🔗 Link: ${resource.link_url}` : ""}`,
        });

        if (res.error) {
            toast.error("Lỗi: " + res.error);
        } else {
            toast.success(`Đã chia sẻ đến lớp "${className}" thành công!`);
            onClose();
        }
        setSending(false);
    };

    return (
        <>
            <DialogHeader>
                <DialogTitle className="text-xl flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-emerald-600" />
                    Chia sẻ đến Lớp học
                </DialogTitle>
                <DialogDescription>
                    Chia sẻ tài nguyên này như một thông báo trong lớp. Học sinh và phụ huynh sẽ thấy.
                </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
                {/* Resource preview card */}
                <div className={`p-4 rounded-xl border ${cfg.border} ${cfg.bg}`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg ${cfg.bg} border ${cfg.border} flex items-center justify-center`}>
                            <Icon className={`w-5 h-5 ${cfg.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`font-bold text-sm ${cfg.color}`}>{cfg.label}</p>
                            <p className="text-sm font-medium text-slate-800 truncate">{resource.title}</p>
                        </div>
                    </div>
                </div>

                {/* Class selection */}
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400" /> Chọn lớp học *
                    </label>
                    {loading ? (
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                            <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
                        </div>
                    ) : classes.length === 0 ? (
                        <p className="text-sm text-slate-400">Bạn chưa có lớp nào.</p>
                    ) : (
                        <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Chọn lớp để chia sẻ..." />
                            </SelectTrigger>
                            <SelectContent>
                                {classes.map(c => (
                                    <SelectItem key={c.id} value={c.id}>
                                        {c.name} {c.course?.name ? `— ${c.course.name}` : ""}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>

                {/* Custom message */}
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Nội dung thông báo (tùy chọn)</label>
                    <Textarea
                        placeholder="Viết nội dung thông báo kèm theo tài nguyên... (để trống sẽ dùng mô tả mặc định)"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={3}
                    />
                </div>
            </div>

            <DialogFooter>
                <Button variant="outline" onClick={onClose} disabled={sending}>Hủy</Button>
                <Button
                    onClick={handleShare}
                    disabled={sending || !selectedClassId}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                    {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                    Gửi thông báo
                </Button>
            </DialogFooter>
        </>
    );
}
