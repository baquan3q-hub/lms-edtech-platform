"use client";

import { useState, useRef } from "react";
import { updateSessionContent } from "@/lib/actions/schedule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { 
    Calendar, BookOpen, FileText, Upload, X, Loader2, Save, ExternalLink, Download, Clock 
} from "lucide-react";

interface AttachmentInfo {
    url: string;
    name: string;
    size: number;
    type: string;
}

export default function SessionContentManagerClient({
    classId,
    sessions,
    readOnly = false
}: {
    classId: string;
    sessions: any[];
    readOnly?: boolean;
}) {
    // Sort by date + time to ensure chronological order (Buổi 1, 2, 3...)
    const sortedInitial = [...(sessions || [])].sort((a, b) => {
        if (a.session_date !== b.session_date) {
            return new Date(a.session_date).getTime() - new Date(b.session_date).getTime();
        }
        return (a.start_time || "").localeCompare(b.start_time || "");
    });

    const [localSessions, setLocalSessions] = useState<any[]>(sortedInitial);
    const [selectedSession, setSelectedSession] = useState<any | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    
    // Tìm index của buổi học gần nhất CHƯA HỌC (hôm nay hoặc tương lai)
    const getNearestIndex = () => {
        const today = new Date();
        today.setHours(0,0,0,0);
        // Tìm buổi đầu tiên có ngày >= hôm nay
        const idx = sortedInitial.findIndex(s => {
            const d = new Date(s.session_date);
            d.setHours(0,0,0,0);
            return d >= today;
        });
        return idx === -1 ? Math.max(0, sortedInitial.length - 2) : idx; 
    };

    // Pagination / Compact view
    const [visibleCount, setVisibleCount] = useState(2);
    const [startIndex, setStartIndex] = useState(getNearestIndex());

    // Form state
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [existingAttachments, setExistingAttachments] = useState<AttachmentInfo[]>([]);
    
    // Upload state
    const [isSaving, setIsSaving] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    const handleEdit = (session: any) => {
        if (readOnly) return;
        setSelectedSession(session);
        setTitle(session.lesson_title || "");
        setContent(session.lesson_content || "");
        setExistingAttachments(session.attachments || []);
        setFiles([]);
        setIsDialogOpen(true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            const valid = newFiles.every(f => f.size <= 50 * 1024 * 1024);
            if (!valid) {
                toast.error("Một số file vượt quá dung lượng 50MB.");
            }
            setFiles(prev => [...prev, ...newFiles.filter(f => f.size <= 50 * 1024 * 1024)]);
        }
    };

    const removeNewFile = (index: number) => setFiles(prev => prev.filter((_, i) => i !== index));
    const removeExistingFile = (index: number) => setExistingAttachments(prev => prev.filter((_, i) => i !== index));

    const handleSave = async () => {
        if (!selectedSession) return;
        setIsSaving(true);
        setUploadProgress(0);

        try {
            let uploadedNewAttachments: AttachmentInfo[] = [];

            if (files.length > 0) {
                const supabase = createClient();
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const ext = file.name.split(".").pop();
                    const fileName = `${classId}/${selectedSession.id}_${Date.now()}_${i}.${ext}`;

                    const { error } = await supabase.storage
                        .from("lesson-files")
                        .upload(`sessions/${fileName}`, file, { cacheControl: "3600", upsert: false });

                    if (error) throw error;

                    const { data: urlData } = supabase.storage
                        .from("lesson-files")
                        .getPublicUrl(`sessions/${fileName}`);

                    uploadedNewAttachments.push({
                        url: urlData.publicUrl,
                        name: file.name,
                        size: file.size,
                        type: file.type,
                    });
                    setUploadProgress((i + 1) / files.length * 100);
                }
            }

            const finalAttachments = [...existingAttachments, ...uploadedNewAttachments];
            const res = await updateSessionContent(selectedSession.id, {
                lesson_title: title.trim() || null,
                lesson_content: content.trim() || null,
                attachments: finalAttachments
            });

            if (res.error) throw new Error(res.error);

            setLocalSessions(prev => prev.map(s => s.id === selectedSession.id ? {
                ...s,
                lesson_title: title.trim() || null,
                lesson_content: content.trim() || null,
                attachments: finalAttachments
            } : s));

            toast.success("Đã cập nhật giáo án buổi học!");
            setIsDialogOpen(false);
        } catch (error: any) {
            toast.error(`Lỗi: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-4">
            {localSessions && localSessions.length > 0 ? (
                <div className="grid gap-3">
                    {localSessions.slice(startIndex, startIndex + visibleCount).map((session) => {
                        const sessDate = new Date(session.session_date);
                        sessDate.setHours(0, 0, 0, 0);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const isPast = sessDate < today;
                        
                        return (
                            <div key={session.id} className={`bg-white border text-left flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-xl transition-all gap-4 ${isPast ? 'opacity-50 grayscale-[0.4] bg-slate-50/50 border-slate-200 shadow-none' : 'shadow-sm border-indigo-100 hover:border-indigo-300 hover:shadow-md'}`}>
                                <div className="flex items-start gap-4 flex-1">
                                    <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0 border ${isPast ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-indigo-50 text-indigo-600 border-indigo-200 shadow-sm'}`}>
                                        <span className="text-[9px] font-bold uppercase text-slate-400">Tháng {new Date(session.session_date).getMonth() + 1}</span>
                                        <span className="text-xl font-black leading-none my-0.5">{new Date(session.session_date).getDate()}</span>
                                        <span className="text-[10px] font-bold text-indigo-500">{new Date(session.session_date).toLocaleDateString('vi-VN', { weekday: 'short' })}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                            <h4 className={`font-bold text-base ${isPast ? 'text-slate-500' : 'text-slate-900'}`}>Buổi {session.session_number}</h4>
                                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 border-slate-200 ${isPast ? 'bg-slate-50 text-slate-400' : 'bg-slate-50 text-slate-600'}`}>
                                                <Clock className="w-3 h-3 mr-1" />
                                                {session.start_time.substring(0, 5)} - {session.end_time.substring(0, 5)}
                                            </Badge>
                                            {session.lesson_title && (
                                                <Badge className={`${isPast ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'} px-1.5 py-0 h-5 text-[10px]`}>Đã lên giáo án</Badge>
                                            )}
                                            {isPast && (
                                                <Badge variant="secondary" className="px-1.5 py-0 h-5 text-[10px] bg-slate-200 text-slate-400 border-none">Đã qua</Badge>
                                            )}
                                        </div>
                                        
                                        {session.lesson_title ? (
                                            <div className={`text-sm p-3 rounded-lg border mt-2 ${isPast ? 'bg-slate-100/50 border-slate-200' : 'bg-slate-50/50 border-slate-100'}`}>
                                                <p className={`font-bold ${isPast ? 'text-slate-500' : 'text-indigo-800'}`}>{session.lesson_title}</p>
                                                {session.lesson_content && (
                                                    <p className={`${isPast ? 'text-slate-400' : 'text-slate-600'} text-xs mt-1.5 line-clamp-3 whitespace-pre-wrap`}>{session.lesson_content}</p>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-slate-400 italic mt-1">Chưa nhập nội dung bài học</p>
                                        )}

                                        {session.attachments && session.attachments.length > 0 && (
                                            <div className={`flex flex-wrap gap-2 mt-3 ${isPast ? 'opacity-60 grayscale' : ''}`}>
                                                {session.attachments.map((file: any, i: number) => (
                                                    <a 
                                                        key={i} 
                                                        href={file.url} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50/50 border border-indigo-100 text-indigo-700 rounded-lg text-xs hover:bg-indigo-100 hover:text-indigo-800 transition-colors font-medium shadow-sm"
                                                    >
                                                        <FileText className="w-3.5 h-3.5" />
                                                        <span className="max-w-[150px] truncate">{file.name}</span>
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                {!readOnly && (
                                    <Button 
                                        variant={session.lesson_title ? "outline" : "default"} 
                                        onClick={() => handleEdit(session)}
                                        className={`shrink-0 w-full md:w-auto ${!session.lesson_title ? 'bg-indigo-600 hover:bg-indigo-700' : isPast ? 'border-slate-300 text-slate-400' : 'border-indigo-200 text-indigo-700 hover:bg-indigo-50'}`}
                                    >
                                        <BookOpen className="w-4 h-4 mr-2" />
                                        {session.lesson_title ? "Chỉnh sửa" : "Soạn giáo án"}
                                    </Button>
                                )}
                            </div>
                        );
                    })}
                    
                    {startIndex + visibleCount < localSessions.length && (
                        <div className="flex justify-center pt-2 gap-2">
                            <Button variant="outline" size="sm" className="text-indigo-600 border-indigo-200" onClick={() => {
                                setVisibleCount(prev => prev + 5);
                            }}>
                                Xem thêm buổi sau
                            </Button>
                        </div>
                    )}

                    {startIndex > 0 && visibleCount === 2 && (
                        <div className="flex justify-center pt-1">
                            <Button variant="ghost" size="sm" className="text-slate-400 text-xs" onClick={() => setStartIndex(0)}>
                                Xem các buổi cũ hơn
                            </Button>
                        </div>
                    )}

                    {visibleCount > 2 && (
                        <div className="flex justify-center pt-2">
                            <Button variant="ghost" className="text-slate-500" onClick={() => {
                                setVisibleCount(2);
                                setStartIndex(getNearestIndex());
                            }}>
                                Thu gọn về buổi gần nhất
                            </Button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="p-8 text-center border rounded-xl bg-slate-50">
                    <p className="text-slate-500 text-sm">Lớp chưa phát sinh buổi học cụ thể nào.</p>
                </div>
            )}

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Cập nhật nội dung buổi học</DialogTitle>
                        <DialogDescription>
                            Chủ đề, tài liệu đính kèm và dặn dò sẽ được gửi đến cho học sinh xem được.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div>
                            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Tên bài học / Chủ đề</label>
                            <Input 
                                placeholder="VD: Unit 1 - Greetings" 
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Nội dung / Dặn dò</label>
                            <Textarea 
                                placeholder="Ghi chú nội dung chính hoặc bài tập về nhà..." 
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                rows={4}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-semibold text-slate-700 block mb-1.5 flex justify-between items-center">
                                <span>Tài liệu đính kèm</span>
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-8 text-xs"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload className="w-3 h-3 mr-1.5" /> Thêm File
                                </Button>
                            </label>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                multiple 
                                className="hidden" 
                                onChange={handleFileChange} 
                            />
                            
                            <div className="space-y-2 mt-2">
                                {existingAttachments.map((f, i) => (
                                    <div key={`ext-${i}`} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                                        <div className="flex items-center gap-2 overflow-hidden text-sm">
                                            <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                                            <span className="truncate text-slate-700">{f.name}</span>
                                            <span className="text-[10px] text-slate-400 shrink-0">({formatFileSize(f.size)})</span>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <a href={f.url} target="_blank" rel="noopener noreferrer">
                                                <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0">
                                                    <Download className="w-3.5 h-3.5 text-slate-500" />
                                                </Button>
                                            </a>
                                            <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => removeExistingFile(i)}>
                                                <X className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}

                                {files.map((f, i) => (
                                    <div key={`new-${i}`} className="flex items-center justify-between p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                                        <div className="flex items-center gap-2 overflow-hidden text-sm">
                                            <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                                            <span className="truncate text-blue-800 font-medium">{f.name}</span>
                                            <span className="text-[10px] text-blue-400 shrink-0">({formatFileSize(f.size)}) - Chưa lưu</span>
                                        </div>
                                        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50 hover:text-red-600 shrink-0" onClick={() => removeNewFile(i)}>
                                            <X className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                ))}
                                
                                {existingAttachments.length === 0 && files.length === 0 && (
                                    <div className="text-center p-4 border border-dashed border-slate-200 rounded-lg text-sm text-slate-400">
                                        Chưa có tài liệu đính kèm
                                    </div>
                                )}
                            </div>
                        </div>

                        {isSaving && files.length > 0 && (
                            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                <div className="flex items-center gap-2 mb-1">
                                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                                    <span className="text-xs font-semibold text-blue-700">Đang tải file lên... {Math.round(uploadProgress)}%</span>
                                </div>
                                <div className="w-full bg-blue-200 rounded-full h-1.5">
                                    <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${uploadProgress}%` }}></div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t mt-2">
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>Hủy</Button>
                        <Button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700">
                            {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang cập nhật...</> : <><Save className="w-4 h-4 mr-2" /> Lưu giáo án</>}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
