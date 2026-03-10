"use client";

import { useState, useRef, useEffect } from "react";
import {
    Folder, Video, FileText, CheckSquare, Music, ClipboardList, MessageSquare, VideoIcon,
    MoreVertical, Edit2, Trash2, Plus, ChevronDown, ChevronRight, GripVertical,
    Eye, Check, X
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { createCourseItem, deleteCourseItem, updateCourseItemTitle } from "@/lib/actions/courseBuilder";

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
    folder: "text-slate-500",
    video: "text-rose-500",
    document: "text-emerald-500",
    quiz: "text-indigo-500",
    audio: "text-amber-500",
    assignment: "text-orange-500",
    discussion: "text-blue-500",
    zoom: "text-sky-500"
};

const typeLabels: Record<string, string> = {
    folder: "Thư mục",
    video: "Video",
    document: "Tài liệu",
    quiz: "Trắc nghiệm",
    audio: "Audio",
    assignment: "Bài tập",
    discussion: "Thảo luận",
    zoom: "Zoom/Meet"
};

export default function CourseBuilderClient({ classId, initialItems }: { classId: string, initialItems: any[] }) {
    const [items, setItems] = useState<any[]>(initialItems);
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState("");
    const editInputRef = useRef<HTMLInputElement>(null);

    // Auto-focus input when editing
    useEffect(() => {
        if (editingId && editInputRef.current) {
            editInputRef.current.focus();
            editInputRef.current.select();
        }
    }, [editingId]);

    // Xây dựng cây từ danh sách phẳng
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

    const toggleFolder = (id: string) => {
        setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleCreateItem = async (parentId: string | null = null, type: string) => {
        setIsLoading(true);
        const siblings = items.filter(i => i.parent_id === parentId);
        const nextOrder = siblings.length > 0 ? Math.max(...siblings.map(s => s.order_index)) + 1 : 0;

        const title = type === 'folder' ? 'Thư mục mới' : `Bài học mới (${typeLabels[type]})`;

        const { data, error } = await createCourseItem({
            classId,
            parentId,
            title,
            type: type as any,
            orderIndex: nextOrder
        });

        if (error || !data) {
            toast.error("Lỗi tạo mục mới");
        } else {
            setItems([...items, data]);
            if (parentId) {
                setExpandedFolders(prev => ({ ...prev, [parentId]: true }));
            }
            toast.success("Đã thêm mục mới");
            // Auto enter rename mode for the new item
            setEditingId(data.id);
            setEditingTitle(data.title);
        }
        setIsLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Bạn có chắc muốn xóa mục này và tất cả nội dung bên trong?")) return;
        setIsLoading(true);

        const { error } = await deleteCourseItem(id);
        if (error) {
            toast.error("Lỗi khi xóa");
        } else {
            const idsToDelete = new Set([id]);
            const collectChildren = (parentId: string) => {
                const children = items.filter(i => i.parent_id === parentId);
                children.forEach(c => {
                    idsToDelete.add(c.id);
                    collectChildren(c.id);
                });
            };
            collectChildren(id);
            setItems(items.filter(i => !idsToDelete.has(i.id)));
            toast.success("Đã xóa thành công");
        }
        setIsLoading(false);
    };

    // Rename handlers
    const startRename = (id: string, currentTitle: string) => {
        setEditingId(id);
        setEditingTitle(currentTitle);
    };

    const cancelRename = () => {
        setEditingId(null);
        setEditingTitle("");
    };

    const confirmRename = async () => {
        if (!editingId || !editingTitle.trim()) {
            cancelRename();
            return;
        }

        const oldItem = items.find(i => i.id === editingId);
        if (oldItem && oldItem.title === editingTitle.trim()) {
            cancelRename();
            return;
        }

        setIsLoading(true);
        const { error } = await updateCourseItemTitle(editingId, editingTitle.trim());

        if (error) {
            toast.error("Lỗi khi đổi tên");
        } else {
            setItems(items.map(i => i.id === editingId ? { ...i, title: editingTitle.trim() } : i));
            toast.success("Đã đổi tên thành công");
        }

        cancelRename();
        setIsLoading(false);
    };

    const handleRenameKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            confirmRename();
        } else if (e.key === "Escape") {
            cancelRename();
        }
    };

    // Hàm render đệ quy
    const renderNode = (node: any, level: number = 0) => {
        const isFolder = node.type === 'folder';
        const isExpanded = expandedFolders[node.id];
        const Icon = typeIcons[node.type] || FileText;
        const isEditing = editingId === node.id;

        return (
            <div key={node.id} className="mb-2">
                <div
                    className={`flex items-center gap-3 p-3 rounded-lg border hover:border-indigo-300 hover:shadow-sm transition-all group ${isFolder ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-100'
                        }`}
                    style={{ marginLeft: `${level * 24}px` }}
                >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        {/* Drag Handle Dummy */}
                        <GripVertical className="w-4 h-4 text-slate-300 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />

                        {isFolder ? (
                            <button onClick={() => toggleFolder(node.id)} className="p-1 hover:bg-slate-200 rounded text-slate-500">
                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                        ) : (
                            <div className="w-6" />
                        )}

                        <div className={`p-1.5 rounded-md flex items-center justify-center ${isFolder ? 'bg-slate-200' : 'bg-slate-100'}`}>
                            <Icon className={`w-4 h-4 ${typeColors[node.type]}`} />
                        </div>

                        {/* Title or Rename Input */}
                        {isEditing ? (
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <input
                                    ref={editInputRef}
                                    type="text"
                                    value={editingTitle}
                                    onChange={(e) => setEditingTitle(e.target.value)}
                                    onKeyDown={handleRenameKeyDown}
                                    onBlur={confirmRename}
                                    className="flex-1 min-w-0 text-sm font-medium text-slate-700 bg-white border border-indigo-300 rounded-md px-2 py-1 outline-none ring-2 ring-indigo-100 focus:ring-indigo-200"
                                    disabled={isLoading}
                                />
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); confirmRename(); }}
                                    className="p-1 rounded hover:bg-emerald-100 text-emerald-600 shrink-0"
                                    title="Lưu"
                                >
                                    <Check className="w-4 h-4" />
                                </button>
                                <button
                                    onMouseDown={(e) => { e.preventDefault(); cancelRename(); }}
                                    className="p-1 rounded hover:bg-red-100 text-red-500 shrink-0"
                                    title="Hủy"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <>
                                <span
                                    className={`text-sm font-medium text-slate-700 truncate cursor-pointer hover:text-indigo-600 ${isFolder ? 'font-bold' : ''}`}
                                    onDoubleClick={() => startRename(node.id, node.title)}
                                    title="Nhấn đúp để đổi tên"
                                >
                                    {node.title}
                                </span>

                                {!isFolder && (
                                    <Badge variant="outline" className={`ml-2 text-[10px] uppercase font-bold tracking-wider ${typeColors[node.type]} border-${typeColors[node.type].replace('text-', '')}/30 bg-${typeColors[node.type].replace('text-', '')}/5`}>
                                        {typeLabels[node.type]}
                                    </Badge>
                                )}
                            </>
                        )}
                    </div>

                    {/* Actions */}
                    {!isEditing && (
                        <div className="flex items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                            {isFolder && (
                                <div className="relative group/add">
                                    <Button variant="ghost" size="sm" className="h-8 px-2 text-indigo-600 hover:bg-indigo-50">
                                        <Plus className="w-4 h-4 mr-1" /> Thêm Bài
                                    </Button>
                                    {/* Simple Dropdown for Types */}
                                    <div className="absolute right-0 top-full mt-1 hidden group-hover/add:block bg-white border border-slate-200 rounded-lg shadow-lg w-48 z-50 py-1 max-h-64 overflow-y-auto">
                                        {Object.keys(typeLabels).filter(k => k !== 'folder').map(type => (
                                            <button
                                                key={type}
                                                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                                onClick={() => handleCreateItem(node.id, type)}
                                                disabled={isLoading}
                                            >
                                                {(() => { const TI = typeIcons[type]; return <TI className={`w-4 h-4 ${typeColors[type]}`} /> })()}
                                                {typeLabels[type]}
                                            </button>
                                        ))}
                                        <div className="h-px bg-slate-100 my-1"></div>
                                        <button
                                            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                                            onClick={() => handleCreateItem(node.id, 'folder')}
                                            disabled={isLoading}
                                        >
                                            <Folder className="w-4 h-4 text-slate-500" /> Thư mục con
                                        </button>
                                    </div>
                                </div>
                            )}

                            {!isFolder && (
                                <Link href={`/teacher/classes/${classId}/content/${node.id}/edit`}>
                                    <Button variant="ghost" size="sm" className="h-8 px-2 text-blue-600 hover:bg-blue-50">
                                        Sửa Nội Dung
                                    </Button>
                                </Link>
                            )}

                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                onClick={() => startRename(node.id, node.title)}
                                title="Đổi tên"
                            >
                                <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-400 hover:text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(node.id)} disabled={isLoading}>
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    )}
                </div>

                {isFolder && isExpanded && node.children && (
                    <div className="mt-2 relative">
                        {/* Connecting Line */}
                        <div className="absolute left-[36px] top-0 bottom-4 w-px bg-slate-200" style={{ left: `${(level * 24) + 36}px` }}></div>
                        {node.children.map((child: any) => renderNode(child, level + 1))}
                        {node.children.length === 0 && (
                            <div className="text-xs text-slate-400 italic py-2" style={{ paddingLeft: `${((level + 1) * 24) + 48}px` }}>
                                Thư mục trống. Hãy thêm nội dung vào đây.
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-lg">Cấu trúc Giảng đồ</h3>
                <div className="flex items-center gap-2">
                    <Link href={`/student/classes/${classId}/learn`} target="_blank">
                        <Button variant="outline" className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 shadow-sm">
                            <Eye className="w-4 h-4 mr-2" /> Xem thử giao diện Học sinh
                        </Button>
                    </Link>
                    <Button
                        onClick={() => handleCreateItem(null, 'folder')}
                        disabled={isLoading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                    >
                        <Folder className="w-4 h-4 mr-2" /> Thêm Group (Chương)
                    </Button>
                </div>
            </div>

            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 min-h-[400px]">
                {tree.length > 0 ? (
                    <div>
                        {tree.map(node => renderNode(node, 0))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Folder className="w-16 h-16 text-slate-200 mb-4" />
                        <h4 className="text-lg font-bold text-slate-700 mb-1">Chưa có nội dung nào</h4>
                        <p className="text-sm text-slate-500 max-w-sm mb-6">
                            Bắt đầu xây dựng lộ trình học tập bằng cách tạo các Thư Mục (Chương) và thêm Bài Học vào bên trong.
                        </p>
                        <Button
                            onClick={() => handleCreateItem(null, 'folder')}
                            disabled={isLoading}
                            variant="outline"
                            className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                        >
                            <Plus className="w-4 h-4 mr-2" /> Tạo Thư mục đầu tiên
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
