"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";
import { confirmAnnouncementRead } from "@/lib/actions/admin-announcements";
import { toast } from "sonner";

export default function AnnouncementConfirmation({ announcementId, initialConfirmed = false }: { announcementId: string, initialConfirmed?: boolean }) {
    const [confirmed, setConfirmed] = useState(initialConfirmed);
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        setLoading(true);
        try {
            const res = await confirmAnnouncementRead(announcementId);
            if (res.success) {
                setConfirmed(true);
                toast.success("Cảm ơn! Bạn đã xác nhận đã đọc thông báo này.");
            } else {
                toast.error("Lỗi: " + res.error);
            }
        } catch (err) {
            toast.error("Lỗi không mong muốn xảy ra");
        } finally {
            setLoading(false);
        }
    };

    if (confirmed) {
        return (
            <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 font-bold animate-in fade-in zoom-in duration-300">
                <CheckCircle2 className="w-5 h-5" />
                <span>Bạn đã xác nhận thông báo này</span>
            </div>
        );
    }

    return (
        <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl shadow-sm space-y-3">
            <h3 className="font-bold text-slate-800 text-sm">Yêu cầu xác nhận</h3>
            <p className="text-xs text-slate-500">Hãy nhấn nút bên dưới để nhà trường biết rằng bạn đã nắm được thông tin này.</p>
            <Button 
                onClick={handleConfirm} 
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold h-12 rounded-xl shadow-lg shadow-amber-200 transition-all hover:-translate-y-0.5"
            >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                Xác nhận đã đọc
            </Button>
        </div>
    );
}
