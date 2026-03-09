"use client";

import { useState, useRef } from "react";
import { updateCourseItemTitle, updateItemContent } from "@/lib/actions/courseBuilder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
    Save, Link as LinkIcon, FileText, Video, Mic, Youtube,
    Plus, Trash2, GripVertical, CheckCircle2, XCircle, Upload, Loader2
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// =============================================
// Quiz Question Type
// =============================================
type QuizQuestion = {
    id: string;
    question: string;
    options: { id: string; text: string; isCorrect: boolean }[];
    points: number;
};

function generateId() {
    return Math.random().toString(36).substring(2, 10);
}

function createEmptyQuestion(): QuizQuestion {
    return {
        id: generateId(),
        question: "",
        options: [
            { id: generateId(), text: "", isCorrect: true },
            { id: generateId(), text: "", isCorrect: false },
            { id: generateId(), text: "", isCorrect: false },
            { id: generateId(), text: "", isCorrect: false },
        ],
        points: 1,
    };
}

export default function EditContentClient({ classId, item, initialContent }: { classId: string, item: any, initialContent: any }) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    // Core item state
    const [title, setTitle] = useState(item.title || "");
    const [isPublished, setIsPublished] = useState(item.is_published || false);

    // Content state
    const [content, setContent] = useState(initialContent?.content || "");
    const [videoUrl, setVideoUrl] = useState(initialContent?.video_url || "");
    const [fileUrl, setFileUrl] = useState(initialContent?.file_url || "");
    const [zoomLink, setZoomLink] = useState(initialContent?.zoom_link || "");
    const [deadline, setDeadline] = useState(initialContent?.deadline ? new Date(initialContent.deadline).toISOString().slice(0, 16) : "");
    const [maxAttempts, setMaxAttempts] = useState(initialContent?.max_attempts || "");
    const [minScore, setMinScore] = useState(initialContent?.min_score || "");
    const [scoreMethod, setScoreMethod] = useState(initialContent?.score_method || "highest");

    // Video upload state
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Quiz questions state
    const [questions, setQuestions] = useState<QuizQuestion[]>(() => {
        try {
            const parsed = initialContent?.quiz_data || initialContent?.questions;
            if (Array.isArray(parsed)) return parsed;
            if (typeof parsed === 'string') return JSON.parse(parsed);
            return [];
        } catch { return []; }
    });

    // =============================================
    // Video Upload Handler
    // =============================================
    const handleVideoUpload = async (file: File) => {
        if (!file) return;

        console.log('Bắt đầu upload video:', file.name, file.size, file.type);

        const maxSize = 500 * 1024 * 1024; // 500MB
        if (file.size > maxSize) {
            toast.error(`File quá lớn (${(file.size / 1024 / 1024).toFixed(1)}MB — tối đa 500MB)`);
            return;
        }

        const allowedTypes = ['video/mp4', 'video/webm', 'video/mov', 'video/quicktime', 'video/avi', 'video/x-msvideo'];
        if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp4|webm|mov|avi)$/i)) {
            toast.error("Chỉ hỗ trợ file video (MP4, WebM, MOV, AVI)");
            return;
        }

        setUploading(true);
        setUploadProgress(0);

        // Simulate progress while uploading
        const progressInterval = setInterval(() => {
            setUploadProgress(prev => {
                if (prev >= 90) { clearInterval(progressInterval); return 90; }
                return prev + Math.random() * 15;
            });
        }, 300);

        try {
            const supabase = createClient();
            const ext = file.name.split('.').pop();
            const fileName = `${classId}/${item.id}_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

            console.log('Uploading to lesson-videos:', fileName);

            // Upload to Supabase Storage
            const { data, error } = await supabase.storage
                .from('lesson-videos')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: true,
                });

            clearInterval(progressInterval);

            if (error) {
                console.error('Upload error details:', error);
                throw error;
            }

            console.log('Upload success:', data);

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('lesson-videos')
                .getPublicUrl(fileName);

            console.log('Public URL:', urlData.publicUrl);

            setVideoUrl(urlData.publicUrl);
            setUploadProgress(100);

            // AUTO-SAVE: Lưu video_url vào DB ngay lập tức sau khi upload thành công
            console.log('🔄 Auto-saving video_url to DB...');
            const saveRes = await updateItemContent(item.id, { video_url: urlData.publicUrl }, classId);
            if (saveRes.error) {
                console.error('❌ Auto-save failed:', saveRes.error);
                toast.error('Upload thành công nhưng lưu vào CSDL thất bại: ' + saveRes.error);
            } else {
                console.log('✅ Auto-saved video_url to DB');
                toast.success("Upload video thành công và đã lưu vào bài giảng!");
            }
        } catch (err: any) {
            clearInterval(progressInterval);
            console.error("Upload video error:", err);
            toast.error("Lỗi upload video: " + (err.message || "Vui lòng kiểm tra bucket 'lesson-videos' đã được tạo chưa"));
        } finally {
            setUploading(false);
        }
    };

    // =============================================
    // Document / Audio Upload Handler
    // =============================================
    const handleFileUpload = async (file: File) => {
        if (!file) return;

        console.log('Bắt đầu upload file:', file.name, file.size, file.type);

        const maxSize = 100 * 1024 * 1024; // 100MB
        if (file.size > maxSize) {
            toast.error(`File quá lớn (${(file.size / 1024 / 1024).toFixed(1)}MB — tối đa 100MB)`);
            return;
        }

        setUploading(true);
        setUploadProgress(0);

        // Simulate progress
        const progressInterval = setInterval(() => {
            setUploadProgress(prev => {
                if (prev >= 90) { clearInterval(progressInterval); return 90; }
                return prev + Math.random() * 20;
            });
        }, 200);

        try {
            const supabase = createClient();
            const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '-');
            const fileName = `${classId}/${item.id}_${Date.now()}_${safeName}`;

            console.log('Uploading to lesson-files:', fileName);

            // Upload to Supabase Storage
            const { data, error } = await supabase.storage
                .from('lesson-files')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: true,
                });

            clearInterval(progressInterval);

            if (error) {
                console.error('Upload file error details:', error);
                throw error;
            }

            console.log('Upload file success:', data);

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('lesson-files')
                .getPublicUrl(fileName);

            console.log('Public URL:', urlData.publicUrl);

            setFileUrl(urlData.publicUrl);
            setUploadProgress(100);

            // AUTO-SAVE: Lưu file_url vào DB ngay lập tức sau khi upload thành công
            console.log('🔄 Auto-saving file_url to DB...');
            const saveRes = await updateItemContent(item.id, { file_url: urlData.publicUrl }, classId);
            if (saveRes.error) {
                console.error('❌ Auto-save failed:', saveRes.error);
                toast.error('Upload thành công nhưng lưu vào CSDL thất bại: ' + saveRes.error);
            } else {
                console.log('✅ Auto-saved file_url to DB');
                toast.success(`Upload ${file.name} thành công và đã lưu vào bài giảng!`);
            }
        } catch (err: any) {
            clearInterval(progressInterval);
            console.error("Upload file error:", err);
            toast.error("Lỗi upload: " + (err.message || "Vui lòng kiểm tra bucket 'lesson-files' đã được tạo chưa"));
        } finally {
            setUploading(false);
        }
    };

    // =============================================
    // Quiz Question Handlers
    // =============================================
    const addQuestion = () => {
        setQuestions([...questions, createEmptyQuestion()]);
    };

    const removeQuestion = (qId: string) => {
        if (questions.length <= 1) {
            toast.error("Phải có ít nhất 1 câu hỏi");
            return;
        }
        setQuestions(questions.filter(q => q.id !== qId));
    };

    const updateQuestion = (qId: string, field: string, value: any) => {
        setQuestions(questions.map(q =>
            q.id === qId ? { ...q, [field]: value } : q
        ));
    };

    const updateOption = (qId: string, optionId: string, field: string, value: any) => {
        setQuestions(questions.map(q =>
            q.id === qId ? {
                ...q,
                options: q.options.map(o =>
                    o.id === optionId ? { ...o, [field]: value } : o
                )
            } : q
        ));
    };

    const setCorrectOption = (qId: string, optionId: string) => {
        setQuestions(questions.map(q =>
            q.id === qId ? {
                ...q,
                options: q.options.map(o => ({
                    ...o,
                    isCorrect: o.id === optionId
                }))
            } : q
        ));
    };

    const addOption = (qId: string) => {
        setQuestions(questions.map(q =>
            q.id === qId ? {
                ...q,
                options: [...q.options, { id: generateId(), text: "", isCorrect: false }]
            } : q
        ));
    };

    const removeOption = (qId: string, optionId: string) => {
        setQuestions(questions.map(q => {
            if (q.id !== qId) return q;
            if (q.options.length <= 2) {
                toast.error("Phải có ít nhất 2 đáp án");
                return q;
            }
            const newOptions = q.options.filter(o => o.id !== optionId);
            // If removed the correct one, set first as correct
            if (!newOptions.some(o => o.isCorrect)) {
                newOptions[0].isCorrect = true;
            }
            return { ...q, options: newOptions };
        }));
    };

    // =============================================
    // Save Handler
    // =============================================
    const handleSave = async () => {
        setIsLoading(true);
        try {
            // Validate quiz questions
            if (item.type === 'quiz' && questions.length > 0) {
                for (let i = 0; i < questions.length; i++) {
                    const q = questions[i];
                    if (!q.question.trim()) {
                        toast.error(`Câu ${i + 1}: Chưa nhập nội dung câu hỏi`);
                        setIsLoading(false);
                        return;
                    }
                    const hasCorrect = q.options.some(o => o.isCorrect);
                    if (!hasCorrect) {
                        toast.error(`Câu ${i + 1}: Chưa chọn đáp án đúng`);
                        setIsLoading(false);
                        return;
                    }
                    const filledOptions = q.options.filter(o => o.text.trim());
                    if (filledOptions.length < 2) {
                        toast.error(`Câu ${i + 1}: Cần ít nhất 2 đáp án`);
                        setIsLoading(false);
                        return;
                    }
                }
            }

            // Update Metadata
            const titleRes = await updateCourseItemTitle(item.id, title, isPublished, classId);
            if (titleRes.error) throw new Error(titleRes.error);

            // Build content payload
            const contentUpdates: any = { content };
            if (item.type === 'video') contentUpdates.video_url = videoUrl;
            if (['document', 'audio', 'assignment'].includes(item.type)) contentUpdates.file_url = fileUrl;
            if (item.type === 'zoom') contentUpdates.zoom_link = zoomLink;
            if (['assignment', 'quiz'].includes(item.type) && deadline) contentUpdates.deadline = new Date(deadline).toISOString();

            if (item.type === 'quiz') {
                contentUpdates.max_attempts = maxAttempts ? parseInt(maxAttempts) : null;
                contentUpdates.min_score = minScore ? parseFloat(minScore) : null;
                contentUpdates.score_method = scoreMethod;
                contentUpdates.quiz_data = questions;
            }

            console.log('💾 Saving content to DB:', { itemId: item.id, type: item.type, ...contentUpdates });

            const contentRes = await updateItemContent(item.id, contentUpdates, classId);
            if (contentRes.error) throw new Error(contentRes.error);

            console.log('✅ Content saved successfully');

            toast.success("Lưu thay đổi thành công!");
            router.refresh();
            setTimeout(() => {
                router.push(`/teacher/classes/${classId}/content`);
            }, 500);

        } catch (e: any) {
            console.error(e);
            toast.error("Lỗi khi lưu: " + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0);

    return (
        <div className="space-y-8">
            {/* Thông tin chung */}
            <div className="grid gap-6 bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                <div className="space-y-3">
                    <Label htmlFor="title" className="text-base font-bold text-slate-700">Tên Bài Giảng / Học Liệu</Label>
                    <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="h-12 text-lg focus-visible:ring-indigo-500"
                        placeholder="VD: Bài 1: Giới thiệu chung..."
                    />
                </div>

                <div className="flex items-center justify-between border border-slate-200 p-4 rounded-xl bg-slate-50">
                    <div>
                        <Label className="text-base font-bold text-slate-700">Hiển thị cho học viên (Publish)</Label>
                        <p className="text-sm text-slate-500">Bật lên để học viên có thể nhìn thấy nội dung này</p>
                    </div>
                    <Switch
                        checked={isPublished}
                        onCheckedChange={setIsPublished}
                        className="data-[state=checked]:bg-emerald-500"
                    />
                </div>
            </div>

            {/* Nội dung chi tiết theo Type */}
            <div className="space-y-6">
                <h3 className="text-lg font-bold text-slate-800 border-b pb-2">Nội dung chi tiết</h3>

                {/* MÔ TẢ CHUNG */}
                <div className="space-y-3">
                    <Label className="text-sm font-semibold text-slate-700">Mô tả / Hướng dẫn (Text/HTML)</Label>
                    <Textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Nhập nội dung lý thuyết, hướng dẫn hoặc ghi chú thêm ở đây..."
                        className="min-h-[120px] focus-visible:ring-indigo-500"
                    />
                </div>

                {/* ============= VIDEO SECTION ============= */}
                {item.type === 'video' && (
                    <div className="space-y-4 p-5 bg-rose-50 border border-rose-100 rounded-xl">
                        <Label className="text-sm font-bold text-rose-800 flex items-center gap-2">
                            <Video className="w-5 h-5 text-rose-600" /> Video bài giảng
                        </Label>

                        {/* Upload Section */}
                        <div className="space-y-3">
                            <p className="text-xs text-rose-600 font-semibold uppercase tracking-wider">Tải video lên</p>
                            <div
                                onClick={() => !uploading && videoInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${uploading ? "border-rose-300 bg-rose-100" : "border-rose-200 hover:border-rose-400 hover:bg-rose-100/50"
                                    }`}
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
                                        <p className="text-sm font-medium text-rose-700">
                                            Kéo thả hoặc <span className="underline text-rose-600">chọn file video</span>
                                        </p>
                                        <p className="text-xs text-rose-400 mt-1">MP4, WebM, MOV, AVI — tối đa 500MB</p>
                                    </>
                                )}
                                <input
                                    ref={videoInputRef}
                                    type="file"
                                    accept="video/mp4,video/webm,video/mov,video/quicktime,video/avi,.mp4,.webm,.mov,.avi"
                                    className="hidden"
                                    onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) handleVideoUpload(f);
                                    }}
                                    disabled={uploading}
                                />
                            </div>
                        </div>

                        {/* OR divider */}
                        <div className="flex items-center gap-3">
                            <div className="h-px flex-1 bg-rose-200"></div>
                            <span className="text-xs font-bold text-rose-400 uppercase">Hoặc</span>
                            <div className="h-px flex-1 bg-rose-200"></div>
                        </div>

                        {/* URL input */}
                        <div className="space-y-2">
                            <p className="text-xs text-rose-600 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                                <Youtube className="w-4 h-4" /> Nhập link video (YouTube/Vimeo)
                            </p>
                            <Input
                                value={videoUrl}
                                onChange={(e) => setVideoUrl(e.target.value)}
                                placeholder="https://www.youtube.com/watch?v=..."
                                className="bg-white border-rose-200"
                            />
                        </div>

                        {/* Preview */}
                        {videoUrl && (
                            <div className="mt-2 space-y-2">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold text-rose-700">Xem trước:</p>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setVideoUrl("")}
                                        className="text-red-400 hover:text-red-600 h-7 text-xs"
                                    >
                                        <Trash2 className="w-3 h-3 mr-1" /> Xóa video
                                    </Button>
                                </div>
                                {videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be') ? (
                                    <div className="aspect-video rounded-lg overflow-hidden bg-black">
                                        <iframe
                                            className="w-full h-full"
                                            src={`https://www.youtube.com/embed/${videoUrl.match(/(?:v=|youtu\.be\/)([\\w-]+)/)?.[1] || ''}`}
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        />
                                    </div>
                                ) : videoUrl.includes('vimeo.com') ? (
                                    <div className="aspect-video rounded-lg overflow-hidden bg-black">
                                        <iframe
                                            className="w-full h-full"
                                            src={`https://player.vimeo.com/video/${videoUrl.match(/vimeo\.com\/(\d+)/)?.[1] || ''}`}
                                            allow="autoplay; fullscreen; picture-in-picture"
                                            allowFullScreen
                                        />
                                    </div>
                                ) : videoUrl.startsWith('http') ? (
                                    <video src={videoUrl} controls className="w-full rounded-lg max-h-[400px] bg-black" />
                                ) : null}
                            </div>
                        )}
                    </div>
                )}

                {/* DOCUMENT & AUDIO */}
                {['document', 'audio', 'assignment'].includes(item.type) && (
                    <div className="space-y-4 p-5 bg-emerald-50 border border-emerald-100 rounded-xl">
                        <Label className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                            <LinkIcon className="w-5 h-5 text-emerald-600" /> File Đính kèm
                        </Label>

                        {/* Upload Section */}
                        <div className="space-y-3">
                            <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">Tải file lên</p>
                            <div
                                onClick={() => !uploading && fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${uploading ? "border-emerald-300 bg-emerald-100" : "border-emerald-200 hover:border-emerald-400 hover:bg-emerald-100/50"
                                    }`}
                            >
                                {uploading ? (
                                    <div className="space-y-2">
                                        <Loader2 className="w-8 h-8 text-emerald-500 mx-auto animate-spin" />
                                        <p className="text-sm font-medium text-emerald-700">Đang tải lên... {Math.round(uploadProgress)}%</p>
                                        <div className="w-full bg-emerald-200 rounded-full h-2 max-w-xs mx-auto">
                                            <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }}></div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                                        <p className="text-sm font-medium text-emerald-700">
                                            Kéo thả hoặc <span className="underline text-emerald-600">chọn file</span>
                                        </p>
                                        <p className="text-xs text-emerald-500 mt-1">Hỗ trợ PDF, DOCX, PPT, MP3... (Tối đa 100MB)</p>
                                    </>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) handleFileUpload(f);
                                    }}
                                    disabled={uploading}
                                />
                            </div>
                        </div>

                        {/* File preview */}
                        {fileUrl && (
                            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-emerald-200">
                                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                                    <FileText className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-800 truncate">File đã upload</p>
                                    <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate block">
                                        {fileUrl.split('/').pop()?.slice(0, 50)}...
                                    </a>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setFileUrl("")}
                                    className="text-red-400 hover:text-red-600 h-8 w-8 p-0 shrink-0"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        )}

                        {/* OR divider */}
                        <div className="flex items-center gap-3">
                            <div className="h-px flex-1 bg-emerald-200"></div>
                            <span className="text-xs font-bold text-emerald-400 uppercase">Hoặc</span>
                            <div className="h-px flex-1 bg-emerald-200"></div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">Nhập Link bên ngoài (Google Drive, OneDrive...)</Label>
                            <Input
                                value={fileUrl}
                                onChange={(e) => setFileUrl(e.target.value)}
                                placeholder="https://drive.google.com/file/d/..."
                                className="bg-white border-emerald-200"
                            />
                        </div>
                    </div>
                )}

                {/* ZOOM / MEET */}
                {item.type === 'zoom' && (
                    <div className="space-y-3 p-5 bg-sky-50 border border-sky-100 rounded-xl">
                        <Label className="text-sm font-bold text-sky-800 flex items-center gap-2">
                            <Video className="w-5 h-5 text-sky-600" /> Link Tham gia Zoom / Google Meet
                        </Label>
                        <Input
                            value={zoomLink}
                            onChange={(e) => setZoomLink(e.target.value)}
                            placeholder="https://zoom.us/j/..."
                            className="bg-white border-sky-200"
                        />
                    </div>
                )}

                {/* DEADLINE */}
                {['assignment', 'quiz'].includes(item.type) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3 p-5 bg-orange-50 border border-orange-100 rounded-xl">
                            <Label className="text-sm font-bold text-orange-800 flex items-center gap-2">Hạn chót (Deadline)</Label>
                            <Input
                                type="datetime-local"
                                value={deadline}
                                onChange={(e) => setDeadline(e.target.value)}
                                className="bg-white border-orange-200"
                            />
                        </div>
                    </div>
                )}

                {/* ============= QUIZ SECTION ============= */}
                {item.type === 'quiz' && (
                    <div className="space-y-6">
                        {/* Quiz Config */}
                        <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-xl space-y-4">
                            <h4 className="font-bold text-indigo-800 border-b border-indigo-200 pb-2">Cấu hình Bài Trắc Nghiệm</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-sm text-indigo-700 font-medium">Số lần làm tối đa</Label>
                                    <Input
                                        type="number" min="1"
                                        value={maxAttempts}
                                        onChange={(e) => setMaxAttempts(e.target.value)}
                                        placeholder="Không giới hạn"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm text-indigo-700 font-medium">Điểm qua (Min Score)</Label>
                                    <Input
                                        type="number" step="0.5"
                                        value={minScore}
                                        onChange={(e) => setMinScore(e.target.value)}
                                        placeholder="VD: 5.0"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm text-indigo-700 font-medium">Tính điểm</Label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        value={scoreMethod}
                                        onChange={(e) => setScoreMethod(e.target.value)}
                                    >
                                        <option value="highest">Lấy điểm cao nhất</option>
                                        <option value="latest">Lấy điểm lần cuối</option>
                                        <option value="average">Lấy điểm trung bình</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Quiz Questions Builder */}
                        <div className="p-5 bg-violet-50 border border-violet-100 rounded-xl space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-bold text-violet-800">Danh sách Câu hỏi</h4>
                                    <p className="text-xs text-violet-500 mt-0.5">
                                        {questions.length} câu hỏi · Tổng điểm: {totalPoints}
                                    </p>
                                </div>
                                <Button
                                    onClick={addQuestion}
                                    size="sm"
                                    className="bg-violet-600 hover:bg-violet-700 text-white"
                                >
                                    <Plus className="w-4 h-4 mr-1" /> Thêm câu hỏi
                                </Button>
                            </div>

                            {questions.length === 0 && (
                                <div className="text-center py-10 bg-white rounded-xl border border-violet-200">
                                    <FileText className="w-12 h-12 text-violet-200 mx-auto mb-3" />
                                    <p className="text-violet-600 font-medium">Chưa có câu hỏi nào</p>
                                    <p className="text-xs text-violet-400 mt-1 mb-4">Bấm &quot;Thêm câu hỏi&quot; để bắt đầu</p>
                                    <Button onClick={addQuestion} variant="outline" className="text-violet-600 border-violet-200 hover:bg-violet-50">
                                        <Plus className="w-4 h-4 mr-1" /> Tạo câu hỏi đầu tiên
                                    </Button>
                                </div>
                            )}

                            <div className="space-y-4">
                                {questions.map((q, qIndex) => (
                                    <div key={q.id} className="bg-white rounded-xl border border-violet-200 shadow-sm overflow-hidden">
                                        {/* Question header */}
                                        <div className="flex items-center gap-3 px-4 py-3 bg-violet-100/50 border-b border-violet-200">
                                            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-violet-600 text-white text-xs font-bold shrink-0">
                                                {qIndex + 1}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <Input
                                                    value={q.question}
                                                    onChange={(e) => updateQuestion(q.id, 'question', e.target.value)}
                                                    placeholder="Nhập nội dung câu hỏi..."
                                                    className="border-0 bg-transparent p-0 h-auto text-sm font-semibold text-violet-900 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-violet-300"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <div className="flex items-center gap-1">
                                                    <Input
                                                        type="number"
                                                        min="0.5"
                                                        step="0.5"
                                                        value={q.points}
                                                        onChange={(e) => updateQuestion(q.id, 'points', parseFloat(e.target.value) || 1)}
                                                        className="w-16 h-7 text-xs text-center border-violet-200"
                                                    />
                                                    <span className="text-xs text-violet-500 font-medium">điểm</span>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                                                    onClick={() => removeQuestion(q.id)}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Options */}
                                        <div className="p-4 space-y-2">
                                            <p className="text-[11px] text-violet-400 font-semibold uppercase tracking-wider mb-2">
                                                Đáp án (click ○ để chọn đáp án đúng)
                                            </p>
                                            {q.options.map((opt, optIndex) => (
                                                <div
                                                    key={opt.id}
                                                    className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${opt.isCorrect
                                                        ? "bg-emerald-50 border-emerald-300 ring-1 ring-emerald-200"
                                                        : "bg-white border-slate-200 hover:border-violet-200"
                                                        }`}
                                                >
                                                    <button
                                                        onClick={() => setCorrectOption(q.id, opt.id)}
                                                        className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all ${opt.isCorrect
                                                            ? "bg-emerald-500 text-white"
                                                            : "border-2 border-slate-300 text-slate-300 hover:border-violet-400 hover:text-violet-400"
                                                            }`}
                                                        title={opt.isCorrect ? "Đáp án đúng" : "Chọn làm đáp án đúng"}
                                                    >
                                                        {opt.isCorrect ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-[10px] font-bold">{String.fromCharCode(65 + optIndex)}</span>}
                                                    </button>
                                                    <Input
                                                        value={opt.text}
                                                        onChange={(e) => updateOption(q.id, opt.id, 'text', e.target.value)}
                                                        placeholder={`Đáp án ${String.fromCharCode(65 + optIndex)}...`}
                                                        className={`border-0 p-0 h-auto text-sm focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent ${opt.isCorrect ? "font-semibold text-emerald-800" : "text-slate-700"
                                                            }`}
                                                    />
                                                    {opt.isCorrect && (
                                                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded shrink-0">
                                                            ĐÚNG
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={() => removeOption(q.id, opt.id)}
                                                        className="shrink-0 p-1 text-slate-300 hover:text-rose-500 transition-colors"
                                                        title="Xóa đáp án"
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}

                                            <button
                                                onClick={() => addOption(q.id)}
                                                className="w-full text-left py-2 px-3 text-sm text-violet-500 hover:text-violet-700 hover:bg-violet-50 rounded-lg transition-colors flex items-center gap-1.5"
                                            >
                                                <Plus className="w-3.5 h-3.5" /> Thêm đáp án
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="pt-6 border-t flex justify-end gap-4">
                <Button variant="outline" onClick={() => router.push(`/teacher/classes/${classId}/content`)}>Hủy</Button>
                <Button onClick={handleSave} disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[140px]">
                    {isLoading ? "Đang lưu..." : <><Save className="w-4 h-4 mr-2" /> Lưu thay đổi</>}
                </Button>
            </div>
        </div>
    );
}
