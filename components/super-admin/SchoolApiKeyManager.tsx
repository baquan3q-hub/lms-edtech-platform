"use client";

import { useState } from "react";
import { Check, Copy, KeyRound, Loader2, RefreshCw, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { rotateSchoolApiKeyAction, revokeSchoolApiKeyAction } from "@/lib/actions/schools";
import type { SchoolApiKeyInfo } from "@/lib/modules/school-api-keys/service";

interface Props {
    schoolId: string;
    schoolCode: string;
    initialInfo: SchoolApiKeyInfo | null;
    /** Báo cho component cha khi key thay đổi (để cập nhật danh sách). */
    onChange?: (info: SchoolApiKeyInfo | null) => void;
}

function formatDate(value: string | null) {
    return value ? new Date(value).toLocaleString("vi-VN") : "Chưa dùng";
}

/**
 * Quản lý API key tích hợp của một trường. Server chỉ lưu bản băm, nên key gốc
 * chỉ hiện đúng một lần ngay sau khi tạo; đóng lại là không xem lại được.
 */
export function SchoolApiKeyManager({ schoolId, schoolCode, initialInfo, onChange }: Props) {
    const [info, setInfo] = useState(initialInfo);
    const [freshKey, setFreshKey] = useState<string | null>(null);
    const [busy, setBusy] = useState<"rotate" | "revoke" | null>(null);
    const [copied, setCopied] = useState(false);

    async function rotate() {
        const warning = info
            ? `Tạo key mới cho ${schoolCode}? Key hiện tại (${info.prefix}…) sẽ ngừng hoạt động ngay.`
            : `Tạo API key cho ${schoolCode}?`;
        if (!window.confirm(warning)) return;
        setBusy("rotate");
        const res = await rotateSchoolApiKeyAction(schoolId);
        setBusy(null);
        if (!res.success || !res.key || !res.info) {
            toast.error(res.error || "Không tạo được API key mới.");
            return;
        }
        setFreshKey(res.key);
        setInfo(res.info);
        onChange?.(res.info);
        toast.success("Đã tạo API key mới. Sao chép ngay, key chỉ hiện một lần.");
    }

    async function revoke() {
        if (!window.confirm(`Thu hồi API key của ${schoolCode}? Hệ thống tích hợp của trường sẽ không gọi được API cho tới khi có key mới.`)) return;
        setBusy("revoke");
        const res = await revokeSchoolApiKeyAction(schoolId);
        setBusy(null);
        if (!res.success) {
            toast.error(res.error || "Không thu hồi được API key.");
            return;
        }
        setFreshKey(null);
        setInfo(null);
        onChange?.(null);
        toast.success("Đã thu hồi API key.");
    }

    async function copy(text: string) {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <div className="space-y-3">
            {freshKey ? (
                <div className="space-y-1.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                    <p className="text-[11px] font-semibold text-emerald-800">
                        Key mới. Hãy sao chép và lưu ở nơi an toàn: đóng hộp thoại này là không xem lại được.
                    </p>
                    <div className="flex items-center gap-2">
                        <Input readOnly value={freshKey} className="select-all bg-white font-mono text-xs" />
                        <Button size="sm" variant="outline" onClick={() => copy(freshKey)} className="shrink-0 gap-1 text-xs">
                            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                            {copied ? "Đã chép" : "Sao chép"}
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                    <KeyRound className="h-4 w-4 shrink-0 text-amber-500" />
                    {info ? (
                        <span className="font-mono text-slate-700">
                            {info.prefix}… <span className="font-sans text-slate-500">· tạo {formatDate(info.createdAt)} · lần dùng cuối: {formatDate(info.lastUsedAt)}</span>
                        </span>
                    ) : (
                        <span className="text-slate-500">Trường chưa có API key.</span>
                    )}
                </div>
            )}

            <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={rotate} disabled={busy !== null} className="gap-1 bg-blue-600 text-xs text-white">
                    {busy === "rotate" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    {info ? "Tạo key mới (thu hồi key cũ)" : "Tạo API key"}
                </Button>
                {info && (
                    <Button size="sm" variant="outline" onClick={revoke} disabled={busy !== null} className="gap-1 text-xs text-red-600">
                        {busy === "revoke" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldOff className="h-3.5 w-3.5" />}
                        Thu hồi
                    </Button>
                )}
            </div>
        </div>
    );
}
