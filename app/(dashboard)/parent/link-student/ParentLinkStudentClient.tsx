"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    UserPlus, Link2, Trash2, Loader2, KeyRound, CheckCircle2,
    AlertCircle, Users, GraduationCap
} from "lucide-react";
import { toast } from "sonner";
import {
    fetchMyLinkedStudents, lookupInviteCode, confirmLinkByCode, unlinkMyStudent
} from "@/lib/actions/parentStudent";
import { useRouter } from "next/navigation";

const RELATIONSHIPS = ["Bố", "Mẹ", "Ông", "Bà", "Người giám hộ"];

export default function ParentLinkStudentClient() {
    const router = useRouter();

    // Linked students
    const [linkedStudents, setLinkedStudents] = useState<any[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(true);

    // Code input flow
    const [code, setCode] = useState("");
    const [lookupResult, setLookupResult] = useState<any>(null);
    const [lookupError, setLookupError] = useState<string | null>(null);
    const [lookingUp, setLookingUp] = useState(false);
    const [relationship, setRelationship] = useState("Bố");
    const [confirming, setConfirming] = useState(false);
    const [linkSuccess, setLinkSuccess] = useState(false);

    useEffect(() => {
        loadLinkedStudents();
    }, []);

    const loadLinkedStudents = async () => {
        setLoadingStudents(true);
        const res = await fetchMyLinkedStudents();
        setLinkedStudents(res.data || []);
        setLoadingStudents(false);
    };

    // Tra cứu mã
    const handleLookup = async () => {
        if (code.trim().length < 6) {
            toast.error("Vui lòng nhập đủ 6 ký tự mã liên kết.");
            return;
        }
        setLookingUp(true);
        setLookupError(null);
        setLookupResult(null);
        setLinkSuccess(false);

        const res = await lookupInviteCode(code);
        if (res.error) {
            setLookupError(res.error);
        } else {
            setLookupResult(res.data);
        }
        setLookingUp(false);
    };

    // Xác nhận liên kết
    const handleConfirm = async () => {
        setConfirming(true);
        const res = await confirmLinkByCode(code, relationship);
        if (res.error) {
            toast.error(res.error);
        } else {
            setLinkSuccess(true);
            toast.success(`Đã liên kết với ${res.studentName}!`);
            setCode("");
            setLookupResult(null);
            loadLinkedStudents();
            router.refresh();
        }
        setConfirming(false);
    };

    // Xóa liên kết
    const handleUnlink = async (linkId: string, studentName: string) => {
        if (!confirm(`Bạn có chắc muốn xóa liên kết với ${studentName}?`)) return;
        const res = await unlinkMyStudent(linkId);
        if (res.error) {
            toast.error(res.error);
        } else {
            toast.success("Đã xóa liên kết.");
            setLinkedStudents(prev => prev.filter(s => s.id !== linkId));
            router.refresh();
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8 pb-12">
            {/* Header */}
            <div className="text-center">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-amber-200">
                    <Link2 className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-extrabold text-slate-900">Liên kết con em</h1>
                <p className="text-sm text-slate-500 mt-1">Nhập mã liên kết từ nhà trường để theo dõi kết quả học tập của con.</p>
            </div>

            {/* Section 1: Con em đã liên kết */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-emerald-50/50">
                    <h2 className="font-bold text-emerald-800 flex items-center gap-2">
                        <Users className="w-5 h-5" /> Con em đã liên kết
                    </h2>
                </div>
                <div className="p-5">
                    {loadingStudents ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                        </div>
                    ) : linkedStudents.length === 0 ? (
                        <div className="text-center py-8">
                            <GraduationCap className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                            <p className="text-slate-400 text-sm">Chưa liên kết với học sinh nào.</p>
                            <p className="text-slate-300 text-xs mt-1">Nhập mã liên kết ở bên dưới để bắt đầu.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {linkedStudents.map(link => (
                                <div key={link.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-emerald-200 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold shadow-sm">
                                            {link.student?.full_name?.charAt(0) || "?"}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-800">{link.student?.full_name || "Không rõ"}</p>
                                            <p className="text-xs text-slate-400">{link.student?.email}</p>
                                            {link.student?.classes && link.student.classes.length > 0 && (
                                                <div className="flex gap-1 mt-1">
                                                    {link.student.classes.map((c: string) => (
                                                        <Badge key={c} variant="outline" className="text-[10px] bg-blue-50 text-blue-600 border-blue-200">{c}</Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                                            {link.relationship || "Phụ huynh"}
                                        </Badge>
                                        <Button size="sm" variant="ghost" className="text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                                            onClick={() => handleUnlink(link.id, link.student?.full_name || "")}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Section 2: Thêm con em mới */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-amber-50/50">
                    <h2 className="font-bold text-amber-800 flex items-center gap-2">
                        <UserPlus className="w-5 h-5" /> Thêm con em mới
                    </h2>
                </div>
                <div className="p-5 space-y-5">
                    {/* Input mã */}
                    <div>
                        <label className="text-sm font-semibold text-slate-700 mb-2 block">Nhập mã liên kết (6 ký tự)</label>
                        <div className="flex gap-3">
                            <Input
                                value={code}
                                onChange={e => setCode(e.target.value.toUpperCase().slice(0, 6))}
                                placeholder="VD: AB1234"
                                className="text-center text-xl font-mono tracking-[0.4em] h-14 max-w-[240px] uppercase"
                                maxLength={6}
                                onKeyDown={e => e.key === "Enter" && handleLookup()}
                            />
                            <Button onClick={handleLookup} disabled={lookingUp || code.length < 6}
                                className="bg-amber-500 hover:bg-amber-600 text-white h-14 px-6">
                                {lookingUp ? <Loader2 className="w-5 h-5 animate-spin" /> : <KeyRound className="w-5 h-5 mr-2" />}
                                {!lookingUp && "Tra cứu"}
                            </Button>
                        </div>
                    </div>

                    {/* Lỗi */}
                    {lookupError && (
                        <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl">
                            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-rose-700">{lookupError}</p>
                        </div>
                    )}

                    {/* Thành công tìm thấy */}
                    {lookupResult && !linkSuccess && (
                        <div className="p-5 bg-indigo-50 border border-indigo-200 rounded-xl space-y-4">
                            <p className="text-sm font-medium text-indigo-900">Bạn có muốn liên kết với học sinh này?</p>
                            <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-indigo-100">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                                    {lookupResult.full_name?.charAt(0) || "?"}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900 text-lg">{lookupResult.full_name}</p>
                                    {lookupResult.classes && lookupResult.classes.length > 0 && (
                                        <p className="text-sm text-slate-500">
                                            Lớp: {lookupResult.classes.join(", ")}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Chọn mối quan hệ */}
                            <div>
                                <label className="text-xs font-semibold text-indigo-700 mb-2 block">Mối quan hệ</label>
                                <div className="flex gap-2 flex-wrap">
                                    {RELATIONSHIPS.map(r => (
                                        <button key={r}
                                            onClick={() => setRelationship(r)}
                                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${relationship === r
                                                ? "bg-indigo-600 text-white shadow-sm"
                                                : "bg-white text-slate-600 border border-slate-200 hover:border-indigo-300"
                                                }`}>
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <Button onClick={handleConfirm} disabled={confirming}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-12 text-base font-semibold">
                                {confirming ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                                Xác nhận liên kết
                            </Button>
                        </div>
                    )}

                    {/* Link Success */}
                    {linkSuccess && (
                        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                            <p className="text-sm font-medium text-emerald-700">Liên kết thành công! Con em đã được thêm vào danh sách.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
