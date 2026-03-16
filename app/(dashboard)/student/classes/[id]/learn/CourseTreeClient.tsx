"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
    Folder, FolderOpen, Video, FileText, CheckSquare, Music, ClipboardList, MessageSquare, VideoIcon,
    ChevronDown, ChevronRight, CheckCircle2, Circle, X, ArrowLeft, Menu
} from "lucide-react";

const typeIcons: Record<string, any> = {
    folder: Folder,
    video: Video,
    document: FileText,
    quiz: CheckSquare,
    audio: Music,
    assignment: ClipboardList,
    discussion: MessageSquare,
    zoom: VideoIcon
};

const typeColors: Record<string, string> = {
    folder: "text-amber-500",
    video: "text-rose-500",
    document: "text-emerald-500",
    quiz: "text-indigo-500",
    audio: "text-amber-500",
    assignment: "text-orange-500",
    discussion: "text-blue-500",
    zoom: "text-sky-500"
};

const typeBg: Record<string, string> = {
    video: "bg-rose-50",
    document: "bg-emerald-50",
    quiz: "bg-indigo-50",
    audio: "bg-amber-50",
    assignment: "bg-orange-50",
    discussion: "bg-blue-50",
    zoom: "bg-sky-50"
};

const typeLabels: Record<string, string> = {
    video: "Video",
    document: "Tài liệu",
    quiz: "Quiz",
    audio: "Audio",
    assignment: "Bài tập",
    discussion: "Thảo luận",
    zoom: "Trực tuyến"
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
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem("lessonSidebarCollapsed", String(newState));
    };

    // Mặc định mở hết các folder
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>(() => {
        const initialState: Record<string, boolean> = {};
        items.filter(i => i.type === 'folder').forEach(i => initialState[i.id] = true);
        return initialState;
    });

    // Build tree
    const buildTree = (flatItems: any[], parentId: string | null = null): any[] => {
        return flatItems
            .filter(item => item.parent_id === parentId)
            .sort((a, b) => a.order_index - b.order_index)
            .map(item => ({
                ...item,
                children: buildTree(flatItems, item.id)
            }));
    };

    const tree = buildTree(items);

    const toggleFolder = (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // Count completed children
    const countCompleted = (node: any): { total: number; done: number } => {
        if (node.type !== 'folder') {
            return {
                total: 1,
                done: progressData[node.id]?.status === 'completed' ? 1 : 0
            };
        }
        let total = 0, done = 0;
        (node.children || []).forEach((child: any) => {
            const c = countCompleted(child);
            total += c.total;
            done += c.done;
        });
        return { total, done };
    };

    // Calculate total progress
    const flatLeafItems = items.filter(i => i.type !== 'folder').sort((a, b) => a.order_index - b.order_index);
    const totalItems = flatLeafItems.length;
    const completedItems = flatLeafItems.filter(i => progressData[i.id]?.status === 'completed').length;
    const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    // Find the next item to learn (first uncompleted leaf item)
    const nextUpItem = flatLeafItems.find(i => progressData[i.id]?.status !== 'completed');
    const nextUpItemId = nextUpItem?.id;

    // Render recursive nodes
    const renderNode = (node: any, level: number = 0) => {
        const isFolder = node.type === 'folder';
        const isExpanded = expandedFolders[node.id];
        const isActive = currentItemId === node.id;
        const isCompleted = progressData[node.id]?.status === 'completed';
        const isNextUp = node.id === nextUpItemId;
        const FolderIcon = isExpanded ? FolderOpen : Folder;

        if (isFolder) {
            const { total, done } = countCompleted(node);
            const childCount = (node.children || []).length;

            return (
                <div key={node.id} className="mb-1">
                    {/* Folder Header */}
                    <button
                        onClick={(e) => toggleFolder(node.id, e)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all text-left group
                            ${level === 0
                                ? 'bg-gradient-to-r from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-150 border border-slate-200 shadow-sm'
                                : 'hover:bg-slate-100/80'
                            }`}
                        style={{ paddingLeft: `${(level * 16) + 12}px` }}
                    >
                        {/* Chevron */}
                        <span className="text-slate-400 shrink-0 transition-transform">
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </span>

                        {/* Folder icon */}
                        <FolderIcon className={`w-5 h-5 shrink-0 ${isExpanded ? 'text-amber-500' : 'text-slate-400'}`} />

                        {/* Title + count */}
                        <div className="flex-1 min-w-0">
                            <span className={`text-sm font-bold block truncate ${level === 0 ? 'text-slate-800' : 'text-slate-700'}`}>
                                {node.title}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                                {childCount} mục · {done}/{total} xong
                            </span>
                        </div>

                        {/* Progress indicator */}
                        {total > 0 && (
                            <div className="w-8 h-8 rounded-full border-2 border-slate-200 flex items-center justify-center shrink-0" title={`${done}/${total} hoàn thành`}>
                                <span className={`text-[10px] font-bold ${done === total && total > 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                                    {total > 0 ? Math.round((done / total) * 100) : 0}%
                                </span>
                            </div>
                        )}
                    </button>

                    {/* Children */}
                    {isExpanded && node.children && node.children.length > 0 && (
                        <div className={`mt-1 ${level === 0 ? 'ml-3 pl-3 border-l-2 border-slate-200' : 'ml-4 pl-2 border-l-2 border-slate-100'}`}>
                            {node.children.map((child: any) => renderNode(child, level + 1))}
                        </div>
                    )}
                </div>
            );
        }

        // Leaf item (video, document, quiz, etc.)
        const Icon = typeIcons[node.type] || FileText;

        return (
            <div key={node.id} className="mb-0.5 relative group">
                <Link href={`/student/classes/${classId}/learn/${node.id}`}>
                    <div
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all cursor-pointer
                            ${isActive
                                ? 'bg-indigo-50 ring-1 ring-indigo-200 shadow-sm'
                                : isNextUp ? 'bg-emerald-50/50 hover:bg-emerald-50' : 'hover:bg-slate-50'
                            }
                        `}
                        style={{ paddingLeft: `${(level * 16) + 12}px` }}
                    >
                        {/* Completion status */}
                        <div className="w-5 flex justify-center shrink-0">
                            {isCompleted ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            ) : isActive ? (
                                <div className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse" />
                            ) : isNextUp ? (
                                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                            ) : (
                                <Circle className="w-4 h-4 text-slate-300 group-hover:text-slate-400 transition-colors" />
                            )}
                        </div>

                        {/* Type icon */}
                        <div className={`w-7 h-7 rounded-lg ${isActive ? 'bg-indigo-100' : isNextUp ? 'bg-emerald-100/70' : typeBg[node.type] || 'bg-slate-50'} flex items-center justify-center shrink-0 transition-colors`}>
                            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600' : isNextUp ? 'text-emerald-600' : typeColors[node.type] || 'text-slate-400'}`} />
                        </div>

                        {/* Title */}
                        <span className={`text-sm flex-1 truncate ${isActive ? 'text-indigo-700 font-semibold' :
                                isNextUp ? 'text-emerald-700 font-semibold' :
                                    isCompleted ? 'text-slate-500' :
                                        'text-slate-600'
                            }`}>
                            {node.title}
                        </span>

                        {/* Tags (Type or Up Next) */}
                        {isNextUp && !isActive ? (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 flex items-center gap-0.5 shrink-0 shadow-sm animate-pulse">
                                Tiếp theo
                            </span>
                        ) : (
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${isActive ? 'bg-indigo-100 text-indigo-600' :
                                    `${typeBg[node.type] || 'bg-slate-50'} ${typeColors[node.type] || 'text-slate-400'}`
                                }`}>
                                {typeLabels[node.type] || node.type}
                            </span>
                        )}
                    </div>
                </Link>
            </div>
        );
    };

    const collapsed = isMounted ? isCollapsed : false;

    return (
        <>
            {/* The Sidebar Itself */}
            <div className={`relative border-r border-slate-200 bg-white flex flex-col shrink-0 transition-all duration-300 ${collapsed ? 'w-0 border-r-0' : 'w-80'}`}>
                <div className={`w-80 flex flex-col h-full bg-white transition-opacity duration-300 ${collapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    <div className="p-4 border-b border-slate-100 bg-slate-50 relative pb-5">
                        <button
                            onClick={toggleCollapse}
                            className="absolute right-3 top-3 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-lg transition-colors z-10"
                            title="Thu gọn danh sách"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <Link
                            href={`/student/classes/${classId}`}
                            className="flex items-center text-sm font-medium text-slate-500 hover:text-indigo-600 mb-3 transition-colors w-fit"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1" /> Thoát Bài học
                        </Link>

                        <div className="pr-8">
                            <h2 className="font-bold text-slate-900 line-clamp-2 leading-tight">{className}</h2>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-1">Khóa: {courseName}</p>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-4 bg-white p-3 shadow-sm border border-slate-100 rounded-xl">
                            <div className="flex justify-between items-center text-xs font-bold mb-2">
                                <span className="text-slate-700">Tiến độ học tập</span>
                                <span className="text-emerald-600">{progressPercent}%</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out" style={{ width: `${progressPercent}%` }}></div>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2 font-medium">{completedItems}/{totalItems} bài học hoàn thành</p>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                        {items.length === 0 ? (
                            <div className="text-center p-6 text-slate-500 text-sm">
                                <Folder className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                                <p className="font-medium">Chưa có nội dung</p>
                                <p className="text-xs text-slate-400 mt-1">Giáo viên chưa đăng tải bài học nào.</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {tree.map(node => renderNode(node, 0))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Floating button when collapsed - Place Outside Wrapper to avoid hidden overflow! */}
            {isMounted && collapsed && (
                <button
                    onClick={toggleCollapse}
                    className="absolute top-4 left-4 z-[60] bg-white border border-slate-200 shadow-md p-2 flex items-center justify-center rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-50 transition-all duration-300"
                    title="Hiển thị danh sách bài học"
                >
                    <Menu className="w-5 h-5" />
                </button>
            )}
        </>
    );
}
