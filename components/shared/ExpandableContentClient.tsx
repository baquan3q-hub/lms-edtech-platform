"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, FileText, Video, Link2, CheckCircle, CheckCircle2, Loader2 } from "lucide-react";
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
    attachments?: Array<{ url: string; name: string; type?: string }>;
    fileUrl?: string;
    videoUrl?: string;
    linkUrl?: string;
    isConfirmed?: boolean;
    confirming?: boolean;
    onConfirm?: () => void;
}

export default function ExpandableContentClient({
    title,
    content,
    timestamp,
    icon,
    isUnread = false,
    className = "",
    headerAction,
    detailUrl,
    attachments,
    fileUrl,
    videoUrl,
    linkUrl,
    isConfirmed,
    confirming,
    onConfirm
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

                {/* Phần mở rộng: Attachments & Confirm Button */}
                {expanded && (
                    <div className="mt-4 pt-3 border-t border-slate-100/60 flex flex-col gap-3" onClick={e => e.stopPropagation()}>
                        {/* New array-based attachments */}
                        {attachments && attachments.length > 0 && (
                            <div className="grid gap-2">
                                {attachments.map((file, idx) => (
                                    <a key={idx} href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors">
                                        <FileText className="w-4 h-4 text-blue-500" />
                                        <span className="text-xs font-medium text-slate-700 truncate">{file.name}</span>
                                    </a>
                                ))}
                            </div>
                        )}

                        {/* Legacy attachments */}
                        {(fileUrl || videoUrl || linkUrl) && (
                            <div className="flex flex-wrap gap-2">
                                {fileUrl && (
                                    <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-100 transition-colors shadow-sm">
                                        <FileText className="w-4 h-4" /> Xem tài liệu
                                    </a>
                                )}
                                {videoUrl && (
                                    <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-1.5 hover:bg-rose-100 transition-colors shadow-sm">
                                        <Video className="w-4 h-4" /> Xem video
                                    </a>
                                )}
                                {linkUrl && (
                                    <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 hover:bg-emerald-100 transition-colors shadow-sm">
                                        <Link2 className="w-4 h-4" /> Mở liên kết
                                    </a>
                                )}
                            </div>
                        )}

                        {/* Confirm button */}
                        {onConfirm && (
                            <div className="mt-1">
                                {isConfirmed ? (
                                    <div className="flex items-center justify-center gap-1.5 py-2 bg-emerald-50 rounded-lg border border-emerald-100">
                                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                                        <span className="text-xs font-semibold text-emerald-600">Đã xác nhận xem</span>
                                    </div>
                                ) : (
                                    <Button
                                        size="sm"
                                        onClick={(e) => { e.stopPropagation(); onConfirm(); }}
                                        disabled={confirming}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                                    >
                                        {confirming ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                            <CheckCircle2 className="w-4 h-4 mr-2" />
                                        )}
                                        Xác nhận đã xem thông báo này
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                )}

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
