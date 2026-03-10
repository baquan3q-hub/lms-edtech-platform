"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Bot, Loader2, AlertTriangle } from "lucide-react";

interface AIUsageIndicatorProps {
    status: "ready" | "recovering" | "overloaded";
    countdown?: number;
}

export default function AIUsageIndicator({ status, countdown = 0 }: AIUsageIndicatorProps) {
    if (status === "ready") {
        return (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1.5 py-1">
                <Bot className="w-3.5 h-3.5" />
                <span>Sẵn sàng</span>
            </Badge>
        );
    }

    if (status === "recovering") {
        return (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1.5 py-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang hồi phục ({countdown}s)</span>
            </Badge>
        );
    }

    return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1.5 py-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Quá tải</span>
        </Badge>
    );
}
