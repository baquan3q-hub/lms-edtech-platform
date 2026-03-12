"use client";

import { useState, useRef, useCallback } from "react";
import { createAnnouncement, deleteAnnouncement, fetchClassAnnouncements } from "@/lib/actions/announcement";
import { fetchTeacherQuizResources } from "@/lib/actions/resourceBank";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
    Send, Loader2, Bell, Trash2, LinkIcon, Upload, FileText,
    Video, ListChecks, X, ExternalLink, Download, BookOpen,
    Pin, Users, GripVertical, File as FileIcon
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface AttachmentInfo {
    url: string;
    name: string;
    size: number;
    type: string;
}

interface AnnouncementComposerProps {
    classId: string;
    initialAnnouncements: any[];
}

export default function AnnouncementComposer({ classId, initialAnnouncements }: AnnouncementComposerProps) {
    const [announcements, setAnnouncements] = useState<any[]>(initialAnnouncements || []);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [videoUrl, setVideoUrl] = useState("");
    const [linkUrl, setLinkUrl] = useState("");
    const [sending, setSending] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);

    // Multi-file upload state
    const [files, setFiles] = useState<File[]>([]);
    const [uploadedAttachments, setUploadedAttachments] = useState<AttachmentInfo[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Attachment toggles
    const [showLink, setShowLink] = useState(false);
    const [showFile, setShowFile] = useState(false);
    const [showVideo, setShowVideo] = useState(false);

    // New: pinned & target roles
    const [isPinned, setIsPinned] = useState(false);
    const [targetStudents, setTargetStudents] = useState(true);
    const [targetParents, setTargetParents] = useState(true);

    // Quiz bank dialog
    const [showQuizBank, setShowQuizBank] = useState(false);
    const [quizResources, setQuizResources] = useState<any[]>([]);
    const [loadingQuiz, setLoadingQuiz] = useState(false);
    const [selectedQuizData, setSelectedQuizData] = useState<any>(null);

    // Drag state
    const [isDragOver, setIsDragOver] = useState(false);

    // Allowed types
    const ALLOWED_TYPES = [
        'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/webm',
    ];
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB mỗi file
    const MAX_TOTAL_SIZE = 200 * 1024 * 1024; // 200MB tổng

    const getFileIcon = (type: string) => {
        if (type?.includes("pdf")) return "📄";
        if (type?.includes("word") || type?.includes("document")) return "📝";
        if (type?.includes("presentation") || type?.includes("powerpoint")) return "📊";
        if (type?.includes("image")) return "🖼️";
        if (type?.includes("video")) return "🎥";
        return "📎";
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    // Xử lý thêm file (từ input hoặc drag & drop)
    const handleAddFiles = useCallback((newFiles: FileList | File[]) => {
        const fileArray = Array.from(newFiles);
        const validFiles: File[] = [];
        const currentTotalSize = files.reduce((sum, f) => sum + f.size, 0);
        let addedSize = 0;

        for (const file of fileArray) {
            if (file.size > MAX_FILE_SIZE) {
                toast.error(`"${file.name}" quá lớn (${formatFileSize(file.size)}). Tối đa 50MB/file.`);
                continue;
            }
            if (currentTotalSize + addedSize + file.size > MAX_TOTAL_SIZE) {
                toast.error(`Tổng dung lượng vượt quá 200MB.`);
                break;
            }
            // Kiểm tra trùng tên
            if (files.some(f => f.name === file.name)) {
                toast.error(`File "${file.name}" đã được thêm.`);
                continue;
            }
            validFiles.push(file);
            addedSize += file.size;
        }

        if (validFiles.length > 0) {
            setFiles(prev => [...prev, ...validFiles]);
            if (!showFile) setShowFile(true);
        }
    }, [files, showFile]);

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    // Drag & drop handlers
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };
    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files.length > 0) {
            handleAddFiles(e.dataTransfer.files);
        }
    };

    // Upload tuần tự lên Supabase Storage (tránh rate limit)
    const uploadAllFiles = async (): Promise<AttachmentInfo[]> => {
        if (files.length === 0) return [];

        setUploading(true);
        setUploadProgress(0);
        const results: AttachmentInfo[] = [];
        const supabase = createClient();

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const ext = file.name.split(".").pop();
            const fileName = `${classId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

            try {
                const { error } = await supabase.storage
                    .from("lesson-files")
                    .upload(`announcements/${fileName}`, file, { cacheControl: "3600", upsert: false });

                if (error) throw error;

                const { data: urlData } = supabase.storage
                    .from("lesson-files")
                    .getPublicUrl(`announcements/${fileName}`);

                results.push({
                    url: urlData.publicUrl,
                    name: file.name,
                    size: file.size,
                    type: file.type,
                });
            } catch (err: any) {
                toast.error(`Lỗi upload "${file.name}": ${err.message}`);
            }

            setUploadProgress(Math.round(((i + 1) / files.length) * 100));
        }

        setUploading(false);
        return results;
    };

    // Open quiz bank
    const openQuizBank = async () => {
        setShowQuizBank(true);
        setLoadingQuiz(true);
        const res = await fetchTeacherQuizResources();
        setQuizResources(res.data || []);
        setLoadingQuiz(false);
    };

    const selectQuiz = (resource: any) => {
        setSelectedQuizData(resource.content);
        setShowQuizBank(false);
        toast.success(`Đã đính kèm bộ đề "${resource.title}"`);
    };

    // Send announcement
    const handleSend = async () => {
        if (!title.trim()) { toast.error("Vui lòng nhập tiêu đề thông báo"); return; }

        setSending(true);

        // Upload files trước
        let attachments: AttachmentInfo[] = [];
        if (files.length > 0) {
            attachments = await uploadAllFiles();
        }

        // Xây dựng target_roles
        const targetRoles: string[] = [];
        if (targetStudents) targetRoles.push("student");
        if (targetParents) targetRoles.push("parent");

        const res = await createAnnouncement(classId, {
            title: title.trim(),
            content: content.trim() || undefined,
            video_url: videoUrl || undefined,
            link_url: linkUrl || undefined,
            quiz_data: selectedQuizData || undefined,
            attachments: attachments.length > 0 ? attachments : undefined,
            target_roles: targetRoles,
            is_pinned: isPinned,
        });

        if (res.error) {
            toast.error("Lỗi: " + res.error);
        } else {
            toast.success("Đã gửi thông báo thành công!");
            // Reset form
            setTitle(""); setContent(""); setVideoUrl(""); setLinkUrl("");
            setSelectedQuizData(null);
            setShowLink(false); setShowFile(false); setShowVideo(false);
            setFiles([]); setUploadedAttachments([]);
            setIsPinned(false); setTargetStudents(true); setTargetParents(true);
            if (res.data) setAnnouncements(prev => [res.data, ...prev]);
        }
        setSending(false);
    };

    // Delete
    const handleDelete = async (id: string) => {
        if (!confirm("Bạn có chắc muốn xóa thông báo này?")) return;
        setDeleting(id);
        const res = await deleteAnnouncement(id);
        if (res.error) {
            toast.error("Lỗi: " + res.error);
        } else {
            setAnnouncements(prev => prev.filter(a => a.id !== id));
            toast.success("Đã xóa thông báo");
        }
        setDeleting(null);
    };

    return (
        <div className="space-y-6">
            {/* === COMPOSER === */}
            <div
                className={`bg-white border rounded-2xl shadow-sm overflow-hidden transition-all ${isDragOver ? "border-amber-400 ring-2 ring-amber-200 bg-amber-50/30" : "border-slate-200"}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-5 py-3 border-b border-amber-100">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Bell className="w-4 h-4 text-amber-500" />
                        Soạn thông báo mới
                    </h3>
                </div>

                <div className="p-5 space-y-4">
                    {/* Title */}
                    <div>
                        <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Tiêu đề *</label>
                        <Input
                            placeholder="VD: Thông báo lịch kiểm tra giữa kỳ..."
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
                            rows={3}
                        />
                    </div>

                    {/* Settings: Pin + Target Roles */}
                    <div className="flex flex-wrap items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-2">
                            <Switch checked={isPinned} onCheckedChange={setIsPinned} id="pin-toggle" />
                            <label htmlFor="pin-toggle" className="text-xs font-medium text-slate-600 flex items-center gap-1 cursor-pointer">
                                <Pin className="w-3.5 h-3.5" /> Ghim thông báo
                            </label>
                        </div>
                        <div className="w-px h-6 bg-slate-200" />
                        <div className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-slate-400 mr-1" />
                            <span className="text-xs font-medium text-slate-500">Gửi đến:</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="target-students"
                                checked={targetStudents}
                                onCheckedChange={(v) => setTargetStudents(!!v)}
                            />
                            <label htmlFor="target-students" className="text-xs text-slate-600 cursor-pointer">Học sinh</label>
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="target-parents"
                                checked={targetParents}
                                onCheckedChange={(v) => setTargetParents(!!v)}
                            />
                            <label htmlFor="target-parents" className="text-xs text-slate-600 cursor-pointer">Phụ huynh</label>
                        </div>
                    </div>

                    {/* Attachment toolbar */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-slate-500">Đính kèm:</span>
                        <Button
                            variant="outline" size="sm"
                            onClick={() => setShowLink(!showLink)}
                            className={`text-xs h-8 ${showLink ? 'bg-violet-50 text-violet-600 border-violet-300' : ''}`}
                        >
                            <LinkIcon className="w-3.5 h-3.5 mr-1" /> Link
                        </Button>
                        <Button
                            variant="outline" size="sm"
                            onClick={() => { setShowFile(!showFile); if (!showFile) fileInputRef.current?.click(); }}
                            className={`text-xs h-8 ${showFile ? 'bg-blue-50 text-blue-600 border-blue-300' : ''}`}
                        >
                            <FileText className="w-3.5 h-3.5 mr-1" /> File / Tài liệu
                        </Button>
                        <Button
                            variant="outline" size="sm"
                            onClick={() => setShowVideo(!showVideo)}
                            className={`text-xs h-8 ${showVideo ? 'bg-rose-50 text-rose-600 border-rose-300' : ''}`}
                        >
                            <Video className="w-3.5 h-3.5 mr-1" /> Video
                        </Button>
                        <Button
                            variant="outline" size="sm"
                            onClick={openQuizBank}
                            className={`text-xs h-8 ${selectedQuizData ? 'bg-indigo-50 text-indigo-600 border-indigo-300' : ''}`}
                        >
                            <ListChecks className="w-3.5 h-3.5 mr-1" /> Bộ trắc nghiệm
                        </Button>
                    </div>

                    {/* Link input */}
                    {showLink && (
                        <div className="flex items-center gap-2 p-3 bg-violet-50 rounded-xl border border-violet-200">
                            <LinkIcon className="w-4 h-4 text-violet-500 shrink-0" />
                            <Input
                                placeholder="Dán URL (https://...)"
                                value={linkUrl}
                                onChange={(e) => setLinkUrl(e.target.value)}
                                className="flex-1 h-8 text-sm"
                            />
                            <Button variant="ghost" size="sm" onClick={() => { setShowLink(false); setLinkUrl(""); }} className="h-8 w-8 p-0 text-slate-400">
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    )}

                    {/* Multi-file upload zone */}
                    {showFile && (
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 space-y-3">
                            {/* File list */}
                            {files.length > 0 && (
                                <div className="space-y-2">
                                    {files.map((file, idx) => (
                                        <div key={idx} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-blue-100">
                                            <span className="text-base shrink-0">{getFileIcon(file.type)}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                                                <p className="text-[10px] text-slate-400">{formatFileSize(file.size)}</p>
                                            </div>
                                            <Button
                                                variant="ghost" size="sm"
                                                onClick={() => removeFile(idx)}
                                                className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Upload progress */}
                            {uploading && (
                                <div className="flex items-center gap-3">
                                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin shrink-0" />
                                    <div className="flex-1">
                                        <p className="text-xs font-medium text-blue-700">Đang tải lên... {uploadProgress}%</p>
                                        <div className="w-full bg-blue-200 rounded-full h-1.5 mt-1">
                                            <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Add more files */}
                            {!uploading && (
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline" size="sm"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="text-xs bg-white border-blue-200 text-blue-600 hover:bg-blue-100"
                                    >
                                        <Upload className="w-3.5 h-3.5 mr-1" />
                                        {files.length > 0 ? "Thêm file" : "Chọn file"}
                                    </Button>
                                    <span className="text-[10px] text-blue-400">
                                        Kéo thả hoặc click • PDF, DOCX, PPTX, Ảnh, Video • Tối đa 50MB/file
                                    </span>
                                    <Button variant="ghost" size="sm" onClick={() => { setShowFile(false); setFiles([]); }} className="h-8 w-8 p-0 text-slate-400 ml-auto">
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            )}

                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                multiple
                                accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.mp4,.webm"
                                onChange={(e) => {
                                    if (e.target.files) handleAddFiles(e.target.files);
                                    e.target.value = "";
                                }}
                            />
                        </div>
                    )}

                    {/* Video URL */}
                    {showVideo && (
                        <div className="flex items-center gap-2 p-3 bg-rose-50 rounded-xl border border-rose-200">
                            <Video className="w-4 h-4 text-rose-500 shrink-0" />
                            <Input
                                placeholder="Dán link video (YouTube, Google Drive...)"
                                value={videoUrl}
                                onChange={(e) => setVideoUrl(e.target.value)}
                                className="flex-1 h-8 text-sm"
                            />
                            <Button variant="ghost" size="sm" onClick={() => { setShowVideo(false); setVideoUrl(""); }} className="h-8 w-8 p-0 text-slate-400">
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    )}

                    {/* Selected quiz preview */}
                    {selectedQuizData && (
                        <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-xl border border-indigo-200">
                            <ListChecks className="w-4 h-4 text-indigo-500 shrink-0" />
                            <span className="text-sm text-indigo-700 font-medium flex-1">
                                Đã đính kèm bộ trắc nghiệm ({selectedQuizData.questions?.length || 0} câu hỏi)
                            </span>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedQuizData(null)} className="h-7 w-7 p-0 text-red-400">
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    )}

                    {/* Drag overlay */}
                    {isDragOver && (
                        <div className="flex items-center justify-center p-8 border-2 border-dashed border-amber-400 rounded-xl bg-amber-50/50">
                            <div className="text-center">
                                <Upload className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                                <p className="text-sm font-semibold text-amber-700">Thả file vào đây</p>
                            </div>
                        </div>
                    )}

                    {/* Send button */}
                    <div className="flex justify-between items-center pt-2">
                        <div className="text-[10px] text-slate-400">
                            {files.length > 0 && `📎 ${files.length} file • ${formatFileSize(files.reduce((s, f) => s + f.size, 0))}`}
                        </div>
                        <Button
                            onClick={handleSend}
                            disabled={sending || uploading || !title.trim()}
                            className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-6"
                        >
                            {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                            Gửi thông báo
                        </Button>
                    </div>
                </div>
            </div>

            {/* Quiz bank dialog */}
            <Dialog open={showQuizBank} onOpenChange={setShowQuizBank}>
                <DialogContent className="sm:max-w-[500px] max-h-[70vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-indigo-600" />
                            Chọn bộ trắc nghiệm
                        </DialogTitle>
                        <DialogDescription>
                            Chọn bộ trắc nghiệm từ ngân hàng tài liệu để đính kèm vào thông báo.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto space-y-2 min-h-0 max-h-[400px] py-2">
                        {loadingQuiz ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                            </div>
                        ) : quizResources.length === 0 ? (
                            <div className="text-center py-12">
                                <ListChecks className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                                <p className="text-sm text-slate-500">Chưa có bộ đề trắc nghiệm nào</p>
                            </div>
                        ) : (
                            quizResources.map(r => (
                                <button
                                    key={r.id}
                                    onClick={() => selectQuiz(r)}
                                    className="w-full text-left p-4 rounded-xl border-2 border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50 transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <ListChecks className="w-5 h-5 text-indigo-500 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-sm text-slate-800 truncate">{r.title}</p>
                                            {r.description && <p className="text-xs text-slate-500 truncate">{r.description}</p>}
                                        </div>
                                        <Badge className="bg-indigo-50 text-indigo-600 border-indigo-200 text-[10px]" variant="outline">
                                            {r.content?.questions?.length || 0} câu
                                        </Badge>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* === ANNOUNCEMENT LIST === */}
            <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-500" />
                    Thông báo đã gửi ({announcements.length})
                </h3>

                {announcements.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/30 p-6 text-center">
                        <Bell className="w-10 h-10 text-amber-300 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-amber-600">Chưa có thông báo nào</p>
                        <p className="text-xs text-slate-500 mt-1">Soạn thông báo đầu tiên cho lớp ở phía trên.</p>
                    </div>
                ) : (
                    announcements.map((ann: any) => (
                        <div key={ann.id} className={`border rounded-xl p-4 group transition-all ${ann.is_pinned ? "border-amber-300 bg-amber-50/50 ring-1 ring-amber-200" : "border-amber-100 bg-amber-50/50"}`}>
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                                    {ann.is_pinned ? <Pin className="w-4 h-4 text-amber-600" /> : <Bell className="w-4 h-4 text-amber-600" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-semibold text-slate-900 text-sm">{ann.title}</h4>
                                        {ann.is_pinned && (
                                            <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[9px]" variant="outline">
                                                <Pin className="w-2.5 h-2.5 mr-0.5" /> Ghim
                                            </Badge>
                                        )}
                                    </div>
                                    {ann.content && (
                                        <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap">{ann.content}</p>
                                    )}
                                    {/* Attachments */}
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {ann.file_url && (
                                            <a href={ann.file_url} target="_blank" rel="noopener noreferrer"
                                               className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded-md text-[10px] font-semibold hover:bg-blue-100 transition-colors">
                                                <Download className="w-3 h-3" /> Tài liệu
                                            </a>
                                        )}
                                        {/* Multi-file attachments */}
                                        {ann.attachments && ann.attachments.length > 0 && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded-md text-[10px] font-semibold">
                                                📎 {ann.attachments.length} file
                                            </span>
                                        )}
                                        {ann.video_url && (
                                            <a href={ann.video_url} target="_blank" rel="noopener noreferrer"
                                               className="inline-flex items-center gap-1 px-2 py-1 bg-rose-50 text-rose-600 border border-rose-200 rounded-md text-[10px] font-semibold hover:bg-rose-100 transition-colors">
                                                <Video className="w-3 h-3" /> Video
                                            </a>
                                        )}
                                        {ann.link_url && (
                                            <a href={ann.link_url} target="_blank" rel="noopener noreferrer"
                                               className="inline-flex items-center gap-1 px-2 py-1 bg-violet-50 text-violet-600 border border-violet-200 rounded-md text-[10px] font-semibold hover:bg-violet-100 transition-colors">
                                                <ExternalLink className="w-3 h-3" /> Link
                                            </a>
                                        )}
                                        {ann.quiz_data && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-md text-[10px] font-semibold">
                                                <ListChecks className="w-3 h-3" /> Quiz ({ann.quiz_data?.questions?.length || 0} câu)
                                            </span>
                                        )}
                                        {ann.target_roles && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 text-slate-500 border border-slate-200 rounded-md text-[10px]">
                                                <Users className="w-3 h-3" /> {ann.target_roles?.join(", ")}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-2">
                                        {new Date(ann.created_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                    </p>
                                </div>
                                {/* Delete button */}
                                <Button
                                    variant="ghost" size="sm"
                                    disabled={deleting === ann.id}
                                    onClick={() => handleDelete(ann.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                                >
                                    {deleting === ann.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
