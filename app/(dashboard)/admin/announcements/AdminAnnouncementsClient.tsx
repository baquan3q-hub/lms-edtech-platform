"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
    createAdminAnnouncement,
    fetchAdminAnnouncements,
    deleteAdminAnnouncement,
    fetchCoursesAndClasses,
    getAnnouncementReadDetails,
} from "@/lib/actions/admin-announcements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
    Send, Loader2, Bell, Trash2, LinkIcon, Upload, FileText,
    Video, X, ExternalLink, Pin, Users, Globe, BookOpen,
    GraduationCap, ChevronDown, Eye, EyeOff, CheckCircle2,
    BarChart3, Download
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface AttachmentInfo {
    url: string;
    name: string;
    size: number;
    type: string;
}

type ScopeType = "system" | "course" | "class";

const SCOPE_LABELS: Record<ScopeType, { label: string; icon: any; color: string; desc: string }> = {
    system: { label: "Toàn hệ thống", icon: Globe, color: "bg-rose-500", desc: "Gửi đến tất cả người dùng" },
    course: { label: "Khóa học", icon: GraduationCap, color: "bg-purple-500", desc: "Gửi đến tất cả lớp trong khóa" },
    class: { label: "Lớp cụ thể", icon: BookOpen, color: "bg-blue-500", desc: "Gửi đến 1 lớp" },
};

export default function AdminAnnouncementsClient() {
    // Data
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [courses, setCourses] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [scopeFilter, setScopeFilter] = useState("all");

    // Composer
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [scope, setScope] = useState<ScopeType>("system");
    const [selectedCourseId, setSelectedCourseId] = useState("");
    const [selectedClassId, setSelectedClassId] = useState("");
    const [isPinned, setIsPinned] = useState(false);
    const [videoUrl, setVideoUrl] = useState("");
    const [linkUrl, setLinkUrl] = useState("");
    const [showLink, setShowLink] = useState(false);
    const [showVideo, setShowVideo] = useState(false);
    const [showFile, setShowFile] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [sending, setSending] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Stats modal
    const [statsModalOpen, setStatsModalOpen] = useState(false);
    const [statsData, setStatsData] = useState<any[]>([]);
    const [statsLoading, setStatsLoading] = useState(false);
    const [statsTitle, setStatsTitle] = useState("");

    useEffect(() => {
        loadData();
    }, [scopeFilter]);

    const loadData = async () => {
        setLoading(true);
        const [annResult, refResult] = await Promise.all([
            fetchAdminAnnouncements({ scope: scopeFilter }),
            fetchCoursesAndClasses(),
        ]);

        if (annResult.data) setAnnouncements(annResult.data);
        setCourses(refResult.courses);
        setClasses(refResult.classes);
        setLoading(false);
    };

    const filteredClasses = selectedCourseId
        ? classes.filter((c: any) => c.course_id === selectedCourseId)
        : classes;

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    const getFileIcon = (type: string) => {
        if (type?.includes("pdf")) return "📄";
        if (type?.includes("word") || type?.includes("document")) return "📝";
        if (type?.includes("image")) return "🖼️";
        if (type?.includes("video")) return "🎥";
        return "📎";
    };

    // Upload files to Supabase Storage
    const uploadAllFiles = async (): Promise<AttachmentInfo[]> => {
        if (files.length === 0) return [];
        const supabase = createClient();
        const results: AttachmentInfo[] = [];

        for (const file of files) {
            const ext = file.name.split(".").pop();
            const fileName = `admin/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
            try {
                const { error } = await supabase.storage
                    .from("lesson-files")
                    .upload(`announcements/${fileName}`, file, { cacheControl: "3600", upsert: false });
                if (error) throw error;

                const { data: urlData } = supabase.storage
                    .from("lesson-files")
                    .getPublicUrl(`announcements/${fileName}`);

                results.push({ url: urlData.publicUrl, name: file.name, size: file.size, type: file.type });
            } catch (err: any) {
                toast.error(`Lỗi upload "${file.name}": ${err.message}`);
            }
        }
        return results;
    };

    const handleSend = async () => {
        if (!title.trim()) { toast.error("Vui lòng nhập tiêu đề"); return; }
        if (scope === "course" && !selectedCourseId) { toast.error("Vui lòng chọn khóa học"); return; }
        if (scope === "class" && !selectedClassId) { toast.error("Vui lòng chọn lớp"); return; }

        setSending(true);

        let attachments: AttachmentInfo[] = [];
        if (files.length > 0) {
            attachments = await uploadAllFiles();
        }

        const res = await createAdminAnnouncement({
            title: title.trim(),
            content: content.trim() || undefined,
            scope,
            courseId: selectedCourseId || undefined,
            classId: selectedClassId || undefined,
            attachments: attachments.length > 0 ? attachments : undefined,
            video_url: videoUrl || undefined,
            link_url: linkUrl || undefined,
            is_pinned: isPinned,
        });

        if (res.error) {
            toast.error("Lỗi: " + res.error);
        } else {
            toast.success("Đã gửi thông báo thành công!");
            // Reset form
            setTitle(""); setContent(""); setScope("system");
            setSelectedCourseId(""); setSelectedClassId("");
            setIsPinned(false); setVideoUrl(""); setLinkUrl("");
            setShowLink(false); setShowVideo(false); setShowFile(false);
            setFiles([]);
            loadData();
        }
        setSending(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Bạn có chắc muốn xóa thông báo này?")) return;
        setDeleting(id);
        const res = await deleteAdminAnnouncement(id);
        if (res.error) {
            toast.error("Lỗi: " + res.error);
        } else {
            setAnnouncements((prev) => prev.filter((a) => a.id !== id));
            toast.success("Đã xóa thông báo");
        }
        setDeleting(null);
    };

    const openStats = async (ann: any) => {
        setStatsModalOpen(true);
        setStatsTitle(ann.title);
        setStatsLoading(true);
        const res = await getAnnouncementReadDetails(ann.id);
        setStatsData(res.data || []);
        setStatsLoading(false);
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-200">
                            <Bell className="w-5 h-5 text-white" />
                        </div>
                        Quản lý Thông báo
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Gửi thông báo toàn hệ thống, theo khóa học hoặc lớp cụ thể</p>
                </div>
            </div>

            {/* === COMPOSER === */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-5 py-3 border-b border-amber-100">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Send className="w-4 h-4 text-amber-500" />
                        Soạn thông báo mới
                    </h3>
                </div>

                <div className="p-5 space-y-4">
                    {/* Scope Selector */}
                    <div>
                        <label className="text-sm font-semibold text-slate-700 mb-2 block">Phạm vi gửi *</label>
                        <div className="grid grid-cols-3 gap-3">
                            {(Object.entries(SCOPE_LABELS) as [ScopeType, any][]).map(([key, meta]) => {
                                const Icon = meta.icon;
                                return (
                                    <button
                                        key={key}
                                        onClick={() => { setScope(key); setSelectedCourseId(""); setSelectedClassId(""); }}
                                        className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                                            scope === key
                                                ? "border-amber-400 bg-amber-50 shadow-sm"
                                                : "border-slate-200 hover:border-slate-300 bg-white"
                                        }`}
                                    >
                                        <div className={`w-9 h-9 rounded-lg ${meta.color} flex items-center justify-center shrink-0`}>
                                            <Icon className="w-4 h-4 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">{meta.label}</p>
                                            <p className="text-[10px] text-slate-400">{meta.desc}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Course / Class Selectors */}
                    {scope === "course" && (
                        <div>
                            <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Chọn khóa học *</label>
                            <div className="relative">
                                <select
                                    className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 pr-8 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
                                    value={selectedCourseId}
                                    onChange={(e) => setSelectedCourseId(e.target.value)}
                                >
                                    <option value="">— Chọn khóa học —</option>
                                    {courses.map((c: any) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </div>
                    )}

                    {scope === "class" && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Khóa học (lọc)</label>
                                <div className="relative">
                                    <select
                                        className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 pr-8 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
                                        value={selectedCourseId}
                                        onChange={(e) => { setSelectedCourseId(e.target.value); setSelectedClassId(""); }}
                                    >
                                        <option value="">— Tất cả khóa —</option>
                                        {courses.map((c: any) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Chọn lớp *</label>
                                <div className="relative">
                                    <select
                                        className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 pr-8 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
                                        value={selectedClassId}
                                        onChange={(e) => setSelectedClassId(e.target.value)}
                                    >
                                        <option value="">— Chọn lớp —</option>
                                        {filteredClasses.map((c: any) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name} {c.course ? `(${(c.course as any).name})` : ""}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Title */}
                    <div>
                        <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Tiêu đề *</label>
                        <Input
                            placeholder="VD: Thông báo lịch nghỉ lễ 30/4..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    {/* Content */}
                    <div>
                        <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Nội dung</label>
                        <Textarea
                            placeholder="Nhập nội dung thông báo chi tiết..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            rows={4}
                        />
                    </div>

                    {/* Pin toggle */}
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <Switch checked={isPinned} onCheckedChange={setIsPinned} id="pin-toggle" />
                        <label htmlFor="pin-toggle" className="text-xs font-medium text-slate-600 flex items-center gap-1 cursor-pointer">
                            <Pin className="w-3.5 h-3.5" /> Ghim thông báo
                        </label>
                    </div>

                    {/* Attachments toolbar */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-slate-500">Đính kèm:</span>
                        <Button variant="outline" size="sm" onClick={() => setShowLink(!showLink)}
                            className={`text-xs h-8 ${showLink ? 'bg-violet-50 text-violet-600 border-violet-300' : ''}`}>
                            <LinkIcon className="w-3.5 h-3.5 mr-1" /> Link
                        </Button>
                        <Button variant="outline" size="sm"
                            onClick={() => { setShowFile(!showFile); if (!showFile) fileInputRef.current?.click(); }}
                            className={`text-xs h-8 ${showFile ? 'bg-blue-50 text-blue-600 border-blue-300' : ''}`}>
                            <FileText className="w-3.5 h-3.5 mr-1" /> File / Ảnh
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setShowVideo(!showVideo)}
                            className={`text-xs h-8 ${showVideo ? 'bg-rose-50 text-rose-600 border-rose-300' : ''}`}>
                            <Video className="w-3.5 h-3.5 mr-1" /> Video
                        </Button>
                    </div>

                    {/* Link Input */}
                    {showLink && (
                        <div className="flex items-center gap-2 p-3 bg-violet-50 rounded-xl border border-violet-200">
                            <LinkIcon className="w-4 h-4 text-violet-500 shrink-0" />
                            <Input placeholder="Dán URL (https://...)" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className="flex-1 h-8 text-sm" />
                            <Button variant="ghost" size="sm" onClick={() => { setShowLink(false); setLinkUrl(""); }} className="h-8 w-8 p-0 text-slate-400">
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    )}

                    {/* File Upload */}
                    {showFile && (
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 space-y-3">
                            {files.length > 0 && (
                                <div className="space-y-2">
                                    {files.map((file, idx) => (
                                        <div key={idx} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-blue-100">
                                            <span className="text-base shrink-0">{getFileIcon(file.type)}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                                                <p className="text-[10px] text-slate-400">{formatFileSize(file.size)}</p>
                                            </div>
                                            <Button variant="ghost" size="sm" onClick={() => setFiles(prev => prev.filter((_, i) => i !== idx))}
                                                className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50">
                                                <X className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}
                                    className="text-xs bg-white border-blue-200 text-blue-600 hover:bg-blue-100">
                                    <Upload className="w-3.5 h-3.5 mr-1" />
                                    {files.length > 0 ? "Thêm file" : "Chọn file"}
                                </Button>
                                <span className="text-[10px] text-blue-400">PDF, DOCX, Ảnh, Video • Tối đa 50MB/file</span>
                                <Button variant="ghost" size="sm" onClick={() => { setShowFile(false); setFiles([]); }}
                                    className="h-8 w-8 p-0 text-slate-400 ml-auto">
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                            <input ref={fileInputRef} type="file" className="hidden" multiple
                                accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.mp4,.webm"
                                onChange={(e) => { if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]); e.target.value = ""; }}
                            />
                        </div>
                    )}

                    {/* Video URL */}
                    {showVideo && (
                        <div className="flex items-center gap-2 p-3 bg-rose-50 rounded-xl border border-rose-200">
                            <Video className="w-4 h-4 text-rose-500 shrink-0" />
                            <Input placeholder="Dán link video (YouTube, Google Drive...)" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className="flex-1 h-8 text-sm" />
                            <Button variant="ghost" size="sm" onClick={() => { setShowVideo(false); setVideoUrl(""); }} className="h-8 w-8 p-0 text-slate-400">
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    )}

                    {/* Send Button */}
                    <div className="flex justify-between items-center pt-2">
                        <div className="text-[10px] text-slate-400">
                            {files.length > 0 && `📎 ${files.length} file • ${formatFileSize(files.reduce((s, f) => s + f.size, 0))}`}
                        </div>
                        <Button onClick={handleSend} disabled={sending || !title.trim()}
                            className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-6">
                            {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                            Gửi thông báo
                        </Button>
                    </div>
                </div>
            </div>

            {/* === FILTER TABS === */}
            <div className="flex gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
                {[
                    { key: "all", label: "Tất cả", icon: Bell },
                    { key: "system", label: "Toàn hệ thống", icon: Globe },
                    { key: "course", label: "Theo khóa", icon: GraduationCap },
                    { key: "class", label: "Theo lớp", icon: BookOpen },
                ].map((f) => {
                    const Icon = f.icon;
                    return (
                        <button
                            key={f.key}
                            onClick={() => setScopeFilter(f.key)}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                scopeFilter === f.key
                                    ? "bg-slate-900 text-white shadow-sm"
                                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            {f.label}
                        </button>
                    );
                })}
            </div>

            {/* === ANNOUNCEMENT LIST === */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-7 h-7 text-amber-500 animate-spin" />
                </div>
            ) : announcements.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <Bell className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-slate-700 mb-1">Chưa có thông báo nào</h3>
                    <p className="text-sm text-slate-400">Soạn thông báo đầu tiên ở phía trên.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <Bell className="w-4 h-4 text-amber-500" />
                        Thông báo đã gửi ({announcements.length})
                    </h3>

                    {announcements.map((ann: any) => {
                        const scopeMeta = SCOPE_LABELS[ann.scope as ScopeType] || SCOPE_LABELS.system;
                        const ScopeIcon = scopeMeta.icon;

                        return (
                            <div key={ann.id} className={`border rounded-xl p-4 bg-white group transition-all hover:shadow-sm ${
                                ann.is_pinned ? "border-amber-300 ring-1 ring-amber-200 bg-amber-50/30" : "border-slate-200"
                            }`}>
                                <div className="flex items-start gap-3">
                                    <div className={`w-9 h-9 rounded-lg ${scopeMeta.color} flex items-center justify-center shrink-0`}>
                                        <ScopeIcon className="w-4 h-4 text-white" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <h4 className="font-bold text-slate-900 text-sm">{ann.title}</h4>
                                            {ann.is_pinned && (
                                                <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[9px]" variant="outline">
                                                    <Pin className="w-2.5 h-2.5 mr-0.5" /> Ghim
                                                </Badge>
                                            )}
                                            <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[9px]" variant="outline">
                                                {scopeMeta.label}
                                            </Badge>
                                            {ann.course && (
                                                <Badge className="bg-purple-50 text-purple-600 border-purple-200 text-[9px]" variant="outline">
                                                    📚 {(ann.course as any).name}
                                                </Badge>
                                            )}
                                            {ann.class && (
                                                <Badge className="bg-blue-50 text-blue-600 border-blue-200 text-[9px]" variant="outline">
                                                    🏫 {(ann.class as any).name}
                                                </Badge>
                                            )}
                                        </div>

                                        {ann.content && (
                                            <p className="text-xs text-slate-600 mt-1 line-clamp-2 whitespace-pre-wrap">{ann.content}</p>
                                        )}

                                        {/* Attachment badges */}
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {ann.attachments?.length > 0 && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-md text-[10px] font-semibold">
                                                    📎 {ann.attachments.length} file
                                                </span>
                                            )}
                                            {ann.video_url && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-md text-[10px] font-semibold">
                                                    🎥 Video
                                                </span>
                                            )}
                                            {ann.link_url && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-50 text-violet-600 border border-violet-200 rounded-md text-[10px] font-semibold">
                                                    🔗 Link
                                                </span>
                                            )}
                                        </div>

                                        {/* Stats + time */}
                                        <div className="flex items-center gap-3 mt-2">
                                            <button
                                                onClick={() => openStats(ann)}
                                                className="inline-flex items-center gap-1 text-[10px] text-emerald-600 hover:text-emerald-700 font-semibold"
                                            >
                                                <Eye className="w-3 h-3" />
                                                {ann.stats.total_read} đã đọc • {ann.stats.total_confirmed} xác nhận
                                            </button>
                                            <span className="text-[10px] text-slate-400">
                                                {new Date(ann.created_at).toLocaleDateString("vi-VN", {
                                                    day: "2-digit", month: "2-digit", year: "numeric",
                                                    hour: "2-digit", minute: "2-digit",
                                                })}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Delete button */}
                                    <Button variant="ghost" size="sm" disabled={deleting === ann.id}
                                        onClick={() => handleDelete(ann.id)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50">
                                        {deleting === ann.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* === STATS MODAL === */}
            <Dialog open={statsModalOpen} onOpenChange={setStatsModalOpen}>
                <DialogContent className="sm:max-w-lg max-h-[70vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-emerald-600" />
                            Thống kê xem thông báo
                        </DialogTitle>
                        <p className="text-xs text-slate-500 truncate mt-1">{statsTitle}</p>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto min-h-0 max-h-[450px] space-y-2 py-2">
                        {statsLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                            </div>
                        ) : statsData.length === 0 ? (
                            <div className="text-center py-12">
                                <EyeOff className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                                <p className="text-sm text-slate-500">Chưa có ai xem thông báo này</p>
                            </div>
                        ) : (
                            <>
                                {/* Summary */}
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
                                        <p className="text-2xl font-black text-blue-600">{statsData.length}</p>
                                        <p className="text-[10px] text-blue-400 font-semibold">Đã đọc</p>
                                    </div>
                                    <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
                                        <p className="text-2xl font-black text-emerald-600">
                                            {statsData.filter((r) => r.confirmed_at).length}
                                        </p>
                                        <p className="text-[10px] text-emerald-400 font-semibold">Đã xác nhận</p>
                                    </div>
                                </div>

                                {/* Detail table */}
                                {statsData.map((read: any) => {
                                    const userInfo = Array.isArray(read.user) ? read.user[0] : read.user;
                                    return (
                                        <div key={read.user_id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                {userInfo?.full_name?.charAt(0) || "?"}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-slate-800 truncate">{userInfo?.full_name || "—"}</p>
                                                <p className="text-[10px] text-slate-400">{userInfo?.email} • {userInfo?.role}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                {read.confirmed_at ? (
                                                    <Badge className="bg-emerald-100 text-emerald-700 border-none text-[9px]">
                                                        <CheckCircle2 className="w-3 h-3 mr-0.5" /> Xác nhận
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-blue-100 text-blue-700 border-none text-[9px]">
                                                        <Eye className="w-3 h-3 mr-0.5" /> Đã đọc
                                                    </Badge>
                                                )}
                                                <p className="text-[9px] text-slate-400 mt-0.5">
                                                    {new Date(read.read_at).toLocaleString("vi-VN")}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
