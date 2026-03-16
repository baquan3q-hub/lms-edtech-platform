"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
    Folder, FolderOpen, Video, FileText, CheckSquare, Music, ClipboardList, MessageSquare, VideoIcon,
    ChevronDown, ChevronRight, CheckCircle2, Circle, X, ArrowLeft, Menu, BookOpen
} from "lucide-react";

const typeIcons: Record<string, any> = {
    folder: Folder, video: Video, document: FileText, quiz: CheckSquare,
    audio: Music, assignment: ClipboardList, discussion: MessageSquare, zoom: VideoIcon
};
const typeColors: Record<string, string> = {
    folder: "text-amber-500", video: "text-rose-500", document: "text-emerald-500",
    quiz: "text-indigo-500", audio: "text-amber-500", assignment: "text-orange-500",
    discussion: "text-blue-500", zoom: "text-sky-500"
};
const typeBg: Record<string, string> = {
    video: "bg-rose-50", document: "bg-emerald-50", quiz: "bg-indigo-50",
    audio: "bg-amber-50", assignment: "bg-orange-50", discussion: "bg-blue-50", zoom: "bg-sky-50"
};
const typeLabels: Record<string, string> = {
    video: "Video", document: "Tài liệu", quiz: "Quiz", audio: "Audio",
    assignment: "Bài tập", discussion: "Thảo luận", zoom: "Trực tuyến"
};

export default function CourseTreeClient({ items, classId, progressData = {}, className, courseName }: { items: any[], classId: string, progressData?: Record<string, any>, className?: string, courseName?: string }) {
    const params = useParams();
    const currentItemId = params.itemId as string;

    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const saved = localStorage.getItem("lessonSidebarCollapsed");
        if (saved) setIsCollapsed(saved === "true");
    }, []);

    const toggleCollapse = () => {
        const next = !isCollapsed;
        setIsCollapsed(next);
        localStorage.setItem("lessonSidebarCollapsed", String(next));
    };

    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>(() => {
        const s: Record<string, boolean> = {};
        items.filter(i => i.type === 'folder').forEach(i => s[i.id] = true);
        return s;
    });

    // Build tree — auto-detect roots: items whose parent_id is NOT in the items list
    const itemIdSet = new Set(items.map((i: any) => i.id));

    const buildTree = (flat: any[], parentId: string | null): any[] =>
        flat.filter(i => i.parent_id === parentId).sort((a, b) => a.order_index - b.order_index)
            .map(i => ({ ...i, children: buildTree(flat, i.id) }));

    // Find root parent_ids (those not present as any item's id)
    const rootParentIds = [...new Set(items.map((i: any) => i.parent_id))].filter(pid => pid === null || !itemIdSet.has(pid));
    
    // Build tree from each root parent_id and merge
    const tree = rootParentIds.flatMap(pid => buildTree(items, pid));

    const toggleFolder = (id: string, e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        setExpandedFolders(p => ({ ...p, [id]: !p[id] }));
    };

    const countCompleted = (node: any): { total: number; done: number } => {
        if (node.type !== 'folder') return { total: 1, done: progressData[node.id]?.status === 'completed' ? 1 : 0 };
        let total = 0, done = 0;
        (node.children || []).forEach((c: any) => { const r = countCompleted(c); total += r.total; done += r.done; });
        return { total, done };
    };

    const leafItems = items.filter(i => i.type !== 'folder').sort((a, b) => a.order_index - b.order_index);
    const totalItems = leafItems.length;
    const completedItems = leafItems.filter(i => progressData[i.id]?.status === 'completed').length;
    const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    const nextUpItemId = leafItems.find(i => progressData[i.id]?.status !== 'completed')?.id;

    /* ==================== RENDER NODES ==================== */
    const renderNode = (node: any, level: number = 0) => {
        const isFolder = node.type === 'folder';
        const isExpanded = expandedFolders[node.id];
        const isActive = currentItemId === node.id;
        const isCompleted = progressData[node.id]?.status === 'completed';
        const isNextUp = node.id === nextUpItemId;

        if (isFolder) {
            const { total, done } = countCompleted(node);
            const childCount = (node.children || []).length;
            const allDone = done === total && total > 0;
            return (
                <div key={node.id} className={`${level === 0 ? 'mb-2' : 'mb-1'}`}>
                    {/* Folder Header */}
                    <button
                        onClick={(e) => toggleFolder(node.id, e)}
                        className={`w-full flex items-center gap-3 py-2.5 px-3 transition-all text-left rounded-xl
                            ${level === 0
                                ? 'bg-indigo-50/70 hover:bg-indigo-50 border border-indigo-100/80'
                                : 'bg-slate-100/80 hover:bg-slate-100 border border-slate-200/60'
                            }`}
                        style={{ paddingLeft: `${level * 16 + 12}px` }}
                    >
                        {/* Chevron */}
                        <span className={`shrink-0 transition-transform ${isExpanded ? 'text-indigo-500' : 'text-slate-400'}`}>
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </span>

                        {/* Folder icon */}
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${level === 0
                            ? (isExpanded ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500')
                            : (isExpanded ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-500')
                        }`}>
                            {isExpanded ? <FolderOpen className="w-4 h-4" /> : <Folder className="w-4 h-4" />}
                        </div>

                        {/* Title + count */}
                        <div className="flex-1 min-w-0">
                            <span className={`font-bold block truncate ${level === 0 ? 'text-[13px] text-indigo-800' : 'text-sm text-slate-700'}`}>{node.title}</span>
                            <span className="text-[10px] text-slate-400 font-medium">
                                {childCount} mục · <span className={allDone ? "text-emerald-600 font-bold" : ""}>{done}/{total} bài</span>
                            </span>
                        </div>

                        {/* Mini progress circle */}
                        {total > 0 && (
                            <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 text-[9px] font-bold
                                ${allDone ? 'border-emerald-400 text-emerald-600 bg-emerald-50' : 'border-slate-200 text-slate-400 bg-white'}`}>
                                {Math.round((done / total) * 100)}%
                            </div>
                        )}
                    </button>

                    {/* Children */}
                    {isExpanded && node.children?.length > 0 && (
                        <div className="ml-5 mt-1 border-l-2 border-indigo-100 pl-0">
                            {node.children.map((c: any) => renderNode(c, level + 1))}
                        </div>
                    )}
                </div>
            );
        }

        // ===== LEAF ITEM =====
        const Icon = typeIcons[node.type] || FileText;
        return (
            <div key={node.id} className="relative">
                {/* Timeline dot */}
                <div className="absolute left-[-9px] top-1/2 -translate-y-1/2 z-10">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center
                        ${isCompleted ? 'border-emerald-500 bg-emerald-500' :
                          isActive ? 'border-indigo-500 bg-indigo-500 shadow-[0_0_0_3px_rgba(99,102,241,0.25)]' :
                          isNextUp ? 'border-emerald-500 bg-white shadow-[0_0_0_3px_rgba(16,185,129,0.2)] animate-pulse' :
                          'border-slate-300 bg-white'}`}>
                        {isCompleted && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                        {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                </div>

                <Link href={`/student/classes/${classId}/learn/${node.id}`}>
                    <div className={`flex items-center gap-2.5 py-2 px-3 ml-2 rounded-lg transition-all cursor-pointer
                        ${isActive ? 'bg-indigo-50 ring-1 ring-indigo-200' :
                          isNextUp ? 'bg-amber-50/60 hover:bg-amber-50' : 'hover:bg-slate-50'}`}
                    >
                        {/* Type icon */}
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0
                            ${isActive ? 'bg-indigo-100' : typeBg[node.type] || 'bg-slate-100'}`}>
                            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600' : typeColors[node.type] || 'text-slate-400'}`} />
                        </div>

                        {/* Title */}
                        <span className={`text-sm flex-1 truncate
                            ${isActive ? 'text-indigo-700 font-bold' :
                              isNextUp ? 'text-amber-800 font-semibold' :
                              isCompleted ? 'text-slate-400 line-through decoration-1' : 'text-slate-600'}`}>
                            {node.title}
                        </span>

                        {/* Tag */}
                        {isNextUp && !isActive ? (
                            <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 shrink-0 animate-pulse">
                                Tiếp theo
                            </span>
                        ) : (
                            <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0
                                ${isActive ? 'bg-indigo-100 text-indigo-600' : `${typeBg[node.type] || 'bg-slate-100'} ${typeColors[node.type] || 'text-slate-400'}`}`}>
                                {typeLabels[node.type] || node.type}
                            </span>
                        )}
                    </div>
                </Link>
            </div>
        );
    };

    /* ==================== MAIN RENDER ==================== */
    const collapsed = isMounted ? isCollapsed : false;

    // Khi collapsed: chỉ hiện nút mở
    if (collapsed) {
        return (
            <div className="w-12 shrink-0 h-full bg-white border-r border-slate-200 flex flex-col items-center pt-4">
                <button
                    onClick={toggleCollapse}
                    className="p-2.5 bg-white border border-slate-200 shadow-lg rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                    title="Hiển thị danh sách bài học"
                >
                    <Menu className="w-5 h-5" />
                </button>
            </div>
        );
    }

    // Khi expanded: hiện sidebar đầy đủ
    return (
        <div className="w-80 shrink-0 h-full bg-slate-50 border-r border-slate-200 flex flex-col">
            {/* ===== HEADER ===== */}
            <div className="p-4 border-b border-slate-100 bg-slate-50 shrink-0">
                <div className="flex items-center justify-between mb-3">
                    <Link
                        href={`/student/classes/${classId}`}
                        className="flex items-center text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" /> Thoát Bài học
                    </Link>
                    <button
                        onClick={toggleCollapse}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-lg transition-colors"
                        title="Thu gọn"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <h2 className="font-bold text-slate-900 line-clamp-2 leading-tight text-base">{className}</h2>
                <p className="text-xs text-slate-500 mt-1 line-clamp-1">Khóa: {courseName}</p>

                {/* Progress Bar */}
                <div className="mt-3 bg-white p-3 shadow-sm border border-slate-100 rounded-xl">
                    <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                        <span className="text-slate-700">Tiến độ học tập</span>
                        <span className={progressPercent === 100 ? "text-emerald-600" : "text-indigo-600"}>{progressPercent}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ease-out ${progressPercent === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${progressPercent}%` }} />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5 font-medium">{completedItems}/{totalItems} bài học hoàn thành</p>
                </div>
            </div>

            {/* ===== SCROLLABLE TREE ===== */}
            <div className="flex-1 overflow-y-auto bg-slate-50" style={{ minHeight: 0 }}>
                {items.length === 0 ? (
                    <div className="text-center p-8 text-slate-400 text-sm">
                        <Folder className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                        <p className="font-medium">Chưa có nội dung</p>
                        <p className="text-xs mt-1">Giáo viên chưa đăng tải bài học nào.</p>
                    </div>
                ) : (
                    <div className="p-3">
                        {/* Section title */}
                        <div className="flex items-center gap-2 px-3 py-2 mb-2">
                            <BookOpen className="w-4 h-4 text-indigo-500" />
                            <span className="text-sm font-bold text-slate-700">Lộ trình Học tập</span>
                        </div>

                        {/* Tree */}
                        <div>
                            {tree.map(node => renderNode(node, 0))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
