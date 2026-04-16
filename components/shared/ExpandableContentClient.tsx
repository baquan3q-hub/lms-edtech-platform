"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface ExpandableContentClientProps {
    title: React.ReactNode;
    content: string;
    timestamp?: React.ReactNode;
    icon?: React.ReactNode;
    isUnread?: boolean;
    className?: string; // Optional custom styling for the container
    headerAction?: React.ReactNode; // e.g. Badge
    detailUrl?: string; // Add a Link button if needed
}

export default function ExpandableContentClient({
    title,
    content,
    timestamp,
    icon,
    isUnread = false,
    className = "",
    headerAction,
    detailUrl
}: ExpandableContentClientProps) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div 
            onClick={() => setExpanded(!expanded)}
            className={`p-4 hover:bg-slate-50 rounded-2xl transition-all cursor-pointer flex gap-4 ${isUnread ? 'bg-indigo-50/30' : ''} ${className}`}
        >
            {icon && (
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isUnread ? 'bg-blue-50 text-blue-500' : 'bg-slate-100 text-slate-400'}`}>
                    {icon}
                </div>
            )}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                        {typeof title === "string" ? (
                            <h4 className={`text-sm ${isUnread ? 'font-bold text-slate-900' : 'font-medium text-slate-600'} ${expanded ? '' : 'line-clamp-1'}`}>
                                {title}
                            </h4>
                        ) : title}
                    </div>
                    {headerAction && <div className="shrink-0">{headerAction}</div>}
                </div>
                
                <p className={`text-xs text-slate-600 mt-1 whitespace-pre-wrap transition-all duration-300 ${expanded ? '' : 'line-clamp-2'}`}>
                    {content}
                </p>
                <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] text-slate-400 font-medium">
                            {timestamp}
                        </span>
                        {detailUrl && (
                            <Link href={detailUrl} onClick={(e) => e.stopPropagation()}>
                                <span className="text-[10px] text-blue-500 hover:text-blue-700 font-medium hover:underline flex items-center gap-0.5">
                                    Chi tiết <ExternalLink className="w-3 h-3" />
                                </span>
                            </Link>
                        )}
                    </div>
                    {content && content.length > 80 && (
                        <button className="text-[10px] text-indigo-500 hover:text-indigo-700 font-semibold flex items-center gap-0.5">
                            {expanded ? (
                                <>Thu gọn <ChevronUp className="w-3 h-3" /></>
                            ) : (
                                <>Xem thêm <ChevronDown className="w-3 h-3" /></>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
