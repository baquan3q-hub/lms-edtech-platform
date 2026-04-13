"use client";

import { useState } from "react";
import { submitUserFeedback } from "@/lib/actions/feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MessageSquareMore, Send, Loader2, Lightbulb, User, ShieldAlert, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

export default function ParentFeedbackClient({ childrenList, enrollments }: { childrenList: any[], enrollments: any[] }) {
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [type, setType] = useState("suggestion"); // suggestion, complaint, bug, praise
    const [target, setTarget] = useState("system"); // system, or a specific classId
    const [submitting, setSubmitting] = useState(false);

    // Group enrollments by class
    const classList = enrollments.reduce((acc: any[], { class: c }) => {
        if (!c || !c.teacher) return acc;
        if (!acc.find(item => item.id === c.id)) {
            acc.push(c);
        }
        return acc;
    }, []);

    const handleSubmit = async () => {
        if (!title.trim() || !content.trim()) {
            toast.error("Vui lòng nhập đầy đủ tiêu đề và nội dung.");
            return;
        }

        let targetTeacherId = undefined;
        let classId = undefined;

        if (target !== "system") {
            const selectedClass = classList.find(c => c.id === target);
            if (selectedClass) {
                targetTeacherId = selectedClass.teacher?.id;
                classId = selectedClass.id;
            }
        }

        setSubmitting(true);
        const res = await submitUserFeedback({
            type,
            title: title.trim(),
            content: content.trim(),
            targetTeacherId,
            classId
        });

        if (res.error) {
            toast.error("Gửi thất bại: " + res.error);
        } else {
            toast.success("Đã gửi ý kiến thành công! Cảm ơn bạn.");
            setTitle("");
            setContent("");
            router.push("/parent");
        }
        setSubmitting(false);
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
                <Link href="/parent">
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-500 hover:text-slate-700">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </Link>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                    <MessageSquareMore className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900">Gửi Ý kiến & Phản hồi</h1>
                    <p className="text-sm text-slate-500">Giúp nhà trường và giáo viên nâng cao chất lượng</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
                {/* Loại phản hồi */}
                <div>
                    <label className="text-sm font-bold text-slate-700 block mb-2">Loại phản hồi *</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <button onClick={() => setType("suggestion")} className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${type === "suggestion" ? "border-amber-500 bg-amber-50" : "border-slate-100 hover:border-slate-300"}`}>
                            <Lightbulb className={`w-5 h-5 ${type === "suggestion" ? "text-amber-500" : "text-slate-400"}`} />
                            <span className={`text-xs font-bold ${type === "suggestion" ? "text-amber-700" : "text-slate-600"}`}>Đề xuất</span>
                        </button>
                        <button onClick={() => setType("complaint")} className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${type === "complaint" ? "border-orange-500 bg-orange-50" : "border-slate-100 hover:border-slate-300"}`}>
                            <ShieldAlert className={`w-5 h-5 ${type === "complaint" ? "text-orange-500" : "text-slate-400"}`} />
                            <span className={`text-xs font-bold ${type === "complaint" ? "text-orange-700" : "text-slate-600"}`}>Khiếu nại</span>
                        </button>
                        <button onClick={() => setType("praise")} className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${type === "praise" ? "border-pink-500 bg-pink-50" : "border-slate-100 hover:border-slate-300"}`}>
                            <span className="text-xl">❤️</span>
                            <span className={`text-xs font-bold ${type === "praise" ? "text-pink-700" : "text-slate-600"}`}>Khen ngợi</span>
                        </button>
                        <button onClick={() => setType("bug")} className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${type === "bug" ? "border-red-500 bg-red-50" : "border-slate-100 hover:border-slate-300"}`}>
                            <span className="text-xl">🐛</span>
                            <span className={`text-xs font-bold ${type === "bug" ? "text-red-700" : "text-slate-600"}`}>Báo lỗi</span>
                        </button>
                    </div>
                </div>

                {/* Gửi đến */}
                <div>
                    <label className="text-sm font-bold text-slate-700 block mb-2">Gửi đến *</label>
                    <select 
                        value={target}
                        onChange={(e) => setTarget(e.target.value)}
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white transition-colors focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm font-medium"
                    >
                        <option value="system">🏢 Hệ thống / Ban Giám Hiệu</option>
                        {classList.map((c, idx) => (
                            <option key={c.id || idx} value={c.id}>
                                👩‍🏫 Giáo viên: {c.teacher?.full_name || "N/A"} (Lớp {c.name})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Tiêu đề */}
                <div>
                    <label className="text-sm font-bold text-slate-700 block mb-2">Tiêu đề *</label>
                    <Input 
                        placeholder="Nhập tóm tắt vấn đề..." 
                        value={title} 
                        onChange={(e) => setTitle(e.target.value)} 
                        className="h-11 rounded-xl bg-slate-50 focus-visible:ring-indigo-500"
                    />
                </div>

                {/* Nội dung */}
                <div>
                    <label className="text-sm font-bold text-slate-700 block mb-2">Nội dung chi tiết *</label>
                    <Textarea 
                        placeholder="Mô tả chi tiết ý kiến hoặc góp ý của bạn..." 
                        value={content} 
                        onChange={(e) => setContent(e.target.value)} 
                        rows={5}
                        className="rounded-xl bg-slate-50 focus-visible:ring-indigo-500 resize-none"
                    />
                </div>

                {/* Submit */}
                <div className="pt-4 flex justify-end">
                    <Button onClick={handleSubmit} disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 h-12 rounded-xl text-base font-bold w-full sm:w-auto">
                        {submitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Send className="w-5 h-5 mr-2" />}
                        Gửi Phản Hồi
                    </Button>
                </div>
            </div>
        </div>
    );
}
