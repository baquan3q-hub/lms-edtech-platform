"use client";

import { useState, useRef, useEffect } from "react";
import { createAnnouncement, deleteAnnouncement, fetchClassAnnouncements } from "@/lib/actions/announcement";
import { fetchTeacherQuizResources } from "@/lib/actions/resourceBank";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
    Send, Loader2, Bell, Trash2, LinkIcon, Upload, FileText,
    Video, ListChecks, Plus, X, ExternalLink, Download, BookOpen
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface AnnouncementComposerProps {
    classId: string;
    initialAnnouncements: any[];
}

export default function AnnouncementComposer({ classId, initialAnnouncements }: AnnouncementComposerProps) {
    const [announcements, setAnnouncements] = useState<any[]>(initialAnnouncements || []);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [fileUrl, setFileUrl] = useState("");
    const [videoUrl, setVideoUrl] = useState("");
    const [linkUrl, setLinkUrl] = useState("");
    const [sending, setSending] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Attachment toggles
    const [showLink, setShowLink] = useState(false);
    const [showFile, setShowFile] = useState(false);
    const [showVideo, setShowVideo] = useState(false);

    // Quiz bank dialog
    const [showQuizBank, setShowQuizBank] = useState(false);
    const [quizResources, setQuizResources] = useState<any[]>([]);
    const [loadingQuiz, setLoadingQuiz] = useState(false);
    const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
    const [selectedQuizData, setSelectedQuizData] = useState<any>(null);

    // Upload handler
    const handleFileUpload = async (file: File) => {
        const maxSize = 100 * 1024 * 1024;
        if (file.size > maxSize) {
            toast.error(`File quá lớn (${(file.size / 1024 / 1024).toFixed(1)}MB). Tối đa 100MB.`);
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
            const fileName = `announcements/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
            const { error } = await supabase.storage.from("lesson-files").upload(fileName, file, { cacheControl: "3600", upsert: true });
            clearInterval(progressInterval);
            if (error) throw error;
            const { data: urlData } = supabase.storage.from("lesson-files").getPublicUrl(fileName);
            setUploadProgress(100);
            setFileUrl(urlData.publicUrl);
            toast.success("Upload thành công!");
        } catch (err: any) {
            clearInterval(progressInterval);
            toast.error("Lỗi upload: " + (err.message || "Không thể tải lên"));
        } finally {
            setUploading(false);
        }
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
        setSelectedQuizId(resource.id);
        setSelectedQuizData(resource.content);
        setShowQuizBank(false);
        toast.success(`Đã đính kèm bộ đề "${resource.title}"`);
    };

    // Send announcement
    const handleSend = async () => {
        if (!title.trim()) { toast.error("Vui lòng nhập tiêu đề thông báo"); return; }

        setSending(true);
        const res = await createAnnouncement(classId, {
            title: title.trim(),
            content: content.trim() || undefined,
            file_url: fileUrl || undefined,
            video_url: videoUrl || undefined,
            link_url: linkUrl || undefined,
            quiz_data: selectedQuizData || undefined,
        });

        if (res.error) {
            toast.error("Lỗi: " + res.error);
        } else {
            toast.success("Đã gửi thông báo thành công!");
            // Reset form
            setTitle("");
            setContent("");
            setFileUrl("");
            setVideoUrl("");
            setLinkUrl("");
            setSelectedQuizId(null);
            setSelectedQuizData(null);
            setShowLink(false);
            setShowFile(false);
            setShowVideo(false);
            // Add to list
            if (res.data) {
                setAnnouncements(prev => [res.data, ...prev]);
            }
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
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
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
                            onClick={() => setShowFile(!showFile)}
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

                    {/* File upload */}
                    {showFile && (
                        <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 space-y-2">
                            {fileUrl ? (
                                <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                                    <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate flex-1">
                                        {fileUrl.split("/").pop()?.slice(0, 40)}...
                                    </a>
                                    <Button variant="ghost" size="sm" onClick={() => setFileUrl("")} className="h-7 w-7 p-0 text-red-400">
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </div>
                            ) : uploading ? (
                                <div className="flex items-center gap-3">
                                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                                    <div className="flex-1">
                                        <p className="text-xs font-medium text-blue-700">Đang tải lên... {Math.round(uploadProgress)}%</p>
                                        <div className="w-full bg-blue-200 rounded-full h-1.5 mt-1">
                                            <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline" size="sm"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="text-xs bg-white border-blue-200 text-blue-600"
                                    >
                                        <Upload className="w-3.5 h-3.5 mr-1" /> Chọn file
                                    </Button>
                                    <span className="text-xs text-blue-500">hoặc dán link:</span>
                                    <Input
                                        placeholder="https://drive.google.com/..."
                                        value={fileUrl}
                                        onChange={(e) => setFileUrl(e.target.value)}
                                        className="flex-1 h-8 text-xs"
                                    />
                                    <Button variant="ghost" size="sm" onClick={() => { setShowFile(false); setFileUrl(""); }} className="h-8 w-8 p-0 text-slate-400">
                                        <X className="w-4 h-4" />
                                    </Button>
                                    <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
                                </div>
                            )}
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
                            <Button variant="ghost" size="sm" onClick={() => { setSelectedQuizId(null); setSelectedQuizData(null); }} className="h-7 w-7 p-0 text-red-400">
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    )}

                    {/* Send button */}
                    <div className="flex justify-end pt-2">
                        <Button
                            onClick={handleSend}
                            disabled={sending || !title.trim()}
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
                        <div key={ann.id} className="border border-amber-100 bg-amber-50/50 rounded-xl p-4 group">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                                    <Bell className="w-4 h-4 text-amber-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-slate-900 text-sm">{ann.title}</h4>
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
