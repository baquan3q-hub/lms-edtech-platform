"use client";

import { useState, useEffect } from "react";
import { fetchTeacherQuizResources } from "@/lib/actions/resourceBank";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
    ListChecks, Search, Loader2, CheckCircle2, Plus, BookOpen
} from "lucide-react";

interface QuizQuestion {
    id: string;
    question: string;
    options: { id: string; text: string; isCorrect: boolean }[];
    points: number;
}

interface ImportFromBankModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onImport: (questions: QuizQuestion[]) => void;
}

export default function ImportFromBankModal({
    open, onOpenChange, onImport
}: ImportFromBankModalProps) {
    const [resources, setResources] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (open) {
            setLoading(true);
            setSelectedIds(new Set());
            fetchTeacherQuizResources().then(res => {
                setResources(res.data || []);
                setLoading(false);
            });
        }
    }, [open]);

    const filtered = resources.filter(r =>
        !search || r.title.toLowerCase().includes(search.toLowerCase())
    );

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleImport = () => {
        if (selectedIds.size === 0) {
            toast.error("Vui lòng chọn ít nhất 1 bộ đề");
            return;
        }

        const allQuestions: QuizQuestion[] = [];
        const genId = () => Math.random().toString(36).slice(2, 10);

        selectedIds.forEach(resourceId => {
            const resource = resources.find(r => r.id === resourceId);
            if (resource?.content?.questions) {
                resource.content.questions.forEach((q: any) => {
                    allQuestions.push({
                        id: genId(),
                        question: q.question || "",
                        options: (q.options || []).map((o: any) => ({
                            id: genId(),
                            text: o.text || "",
                            isCorrect: !!o.isCorrect,
                        })),
                        points: q.points || 1,
                    });
                });
            }
        });

        if (allQuestions.length === 0) {
            toast.error("Các bộ đề đã chọn không có câu hỏi nào");
            return;
        }

        onImport(allQuestions);
        toast.success(`Đã thêm ${allQuestions.length} câu hỏi từ ${selectedIds.size} bộ đề`);
        onOpenChange(false);
    };

    const totalSelectedQuestions = Array.from(selectedIds).reduce((sum, id) => {
        const r = resources.find(res => res.id === id);
        return sum + (r?.content?.questions?.length || 0);
    }, 0);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-xl flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-indigo-600" />
                        Nhập từ Ngân hàng đề
                    </DialogTitle>
                    <DialogDescription>
                        Chọn các bộ đề trắc nghiệm đã lưu trong ngân hàng tài liệu để thêm vào bài.
                    </DialogDescription>
                </DialogHeader>

                {/* Search */}
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                        placeholder="Tìm bộ đề..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto space-y-2 min-h-0 max-h-[400px] py-2">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                            <span className="ml-2 text-sm text-slate-500">Đang tải...</span>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-12">
                            <ListChecks className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                            <p className="text-sm text-slate-500 font-medium">
                                {search ? "Không tìm thấy bộ đề phù hợp" : "Chưa có bộ đề trắc nghiệm nào trong ngân hàng"}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                                Hãy tạo bộ đề tại mục Tài nguyên số → Trắc nghiệm
                            </p>
                        </div>
                    ) : (
                        filtered.map(r => {
                            const isSelected = selectedIds.has(r.id);
                            const qCount = r.content?.questions?.length || 0;
                            return (
                                <button
                                    key={r.id}
                                    onClick={() => toggleSelect(r.id)}
                                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                                        isSelected
                                            ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200"
                                            : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/30"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                            isSelected
                                                ? "bg-indigo-500 border-indigo-500 text-white"
                                                : "border-slate-300"
                                        }`}>
                                            {isSelected && <CheckCircle2 className="w-4 h-4" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-sm text-slate-800 truncate">{r.title}</p>
                                            {r.description && (
                                                <p className="text-xs text-slate-500 truncate mt-0.5">{r.description}</p>
                                            )}
                                        </div>
                                        <Badge className="bg-indigo-50 text-indigo-600 border-indigo-200 text-[10px] shrink-0" variant="outline">
                                            <ListChecks className="w-3 h-3 mr-1" />
                                            {qCount} câu
                                        </Badge>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <DialogFooter className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <div className="text-sm text-slate-500">
                        {selectedIds.size > 0 && (
                            <span className="font-semibold text-indigo-600">
                                Đã chọn {selectedIds.size} bộ đề ({totalSelectedQuestions} câu hỏi)
                            </span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
                        <Button
                            onClick={handleImport}
                            disabled={selectedIds.size === 0}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Thêm {totalSelectedQuestions > 0 ? `${totalSelectedQuestions} câu` : "vào bài"}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
