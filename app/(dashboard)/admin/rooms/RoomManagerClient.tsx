"use client";

import { useState } from "react";
import { Plus, Edit2, Trash2, MapPin, CalendarClock, Users, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { createRoom, updateRoom, deleteRoom } from "@/lib/actions/schedule";

export default function RoomManagerClient({ initialRooms }: { initialRooms: any[] }) {
    const router = useRouter();
    const [rooms, setRooms] = useState(initialRooms);
    const [isEditing, setIsEditing] = useState(false);

    const [editId, setEditId] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [capacity, setCapacity] = useState<number>(30);
    const [isSaving, setIsSaving] = useState(false);

    const handleAddNew = () => {
        setEditId(null);
        setName("");
        setCapacity(30);
        setIsEditing(true);
    };

    const handleEdit = (room: any) => {
        setEditId(room.id);
        setName(room.name);
        setCapacity(room.capacity);
        setIsEditing(true);
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditId(null);
    };

    const handleSave = async () => {
        if (!name.trim()) return alert("Vui lòng nhập tên phòng");
        setIsSaving(true);
        try {
            if (editId) {
                const { data, error } = await updateRoom(editId, { name, capacity });
                if (error) throw new Error(error);
                setRooms(prev => prev.map(r => r.id === data.id ? data : r));
            } else {
                const { data, error } = await createRoom({ name, capacity });
                if (error) throw new Error(error);
                setRooms(prev => [...prev, data]);
            }
            setIsEditing(false);
            router.refresh();
        } catch (error: any) {
            alert("Lỗi: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (roomId: string) => {
        if (!confirm("Bạn có chắc chắn muốn xóa phòng học này?")) return;
        try {
            const { error } = await deleteRoom(roomId);
            if (error) throw new Error(error);
            setRooms(prev => prev.filter(r => r.id !== roomId));
            router.refresh();
        } catch (error: any) {
            alert("Lỗi: " + error.message);
        }
    };

    return (
        <div className="space-y-6">
            {!isEditing && (
                <div className="flex justify-end mb-4">
                    <Button onClick={handleAddNew} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                        <Plus className="w-4 h-4 mr-2" /> Thêm Phòng Mới
                    </Button>
                </div>
            )}

            {isEditing && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6 animate-in fade-in slide-in-from-top-4 duration-300 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4">{editId ? "Sửa Phòng Học" : "Thêm Phòng Mới"}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Tên phòng *</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full h-10 px-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="VD: Phòng 101, Lab Khu A"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Sức chứa (Học sinh)</label>
                            <input
                                type="number"
                                value={capacity}
                                onChange={e => setCapacity(Number(e.target.value))}
                                className="w-full h-10 px-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={handleCancel} disabled={isSaving}>Hủy</Button>
                        <Button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            {isSaving ? "Đang lưu..." : "Lưu lại"}
                        </Button>
                    </div>
                </div>
            )}

            {!isEditing && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {rooms.length > 0 ? (
                        rooms.map(room => (
                            <div key={room.id} className="bg-white border text-slate-800 border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between">
                                <div>
                                    <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                                        <MapPin className="w-5 h-5 text-indigo-500" />
                                        {room.name}
                                    </h3>
                                    <div className="flex items-center justify-between text-sm text-slate-500 mb-3 border-b border-slate-100 pb-3">
                                        <span className="flex items-center gap-1"><Users className="w-4 h-4" /> Sức chứa: <span className="font-semibold text-slate-700">{room.capacity}</span> người</span>
                                        <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-xs font-medium"><CalendarClock className="w-3.5 h-3.5" /> {(room.class_schedules || []).length} lịch học</span>
                                    </div>

                                    <div className="space-y-2 mt-2">
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Các lớp đang sử dụng</p>
                                        {(room.class_schedules || []).length > 0 ? (
                                            <div className="max-h-32 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                                                {(room.class_schedules || []).map((schedule: any) => {
                                                    const days = ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
                                                    const dayStr = days[schedule.day_of_week];
                                                    const startStr = schedule.start_time.substring(0, 5);
                                                    const endStr = schedule.end_time.substring(0, 5);

                                                    return (
                                                        <div key={schedule.id} className="bg-slate-50 rounded p-2 text-xs border border-slate-100">
                                                            <div className="bg-white border text-slate-800 border-slate-200">
                                                                <div className="font-semibold text-indigo-700 mb-0.5 flex items-center gap-1.5 line-clamp-1">
                                                                    <BookOpen className="w-3 h-3" />
                                                                    {schedule.class?.name || "Lớp ẩn"}
                                                                </div>
                                                                <div className="text-slate-600 flex justify-between items-center mb-0.5">
                                                                    <span>{dayStr}, {startStr} - {endStr}</span>
                                                                </div>
                                                                <div className="text-slate-500 text-[11px] truncate mt-1 pt-1 border-t border-slate-200/60 flex items-center gap-1">
                                                                    <Users className="w-3 h-3 shrink-0" />
                                                                    GV: <span className="font-medium text-slate-700">{schedule.class?.teacher?.full_name || "—"}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="text-xs text-slate-400 italic py-2 bg-slate-50 rounded border border-dashed border-slate-200 text-center">
                                                Phòng hiện đang trống
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 shrink-0">
                                    <Button variant="outline" size="sm" onClick={() => handleEdit(room)} className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-indigo-600">
                                        <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Sửa
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => handleDelete(room.id)} className="border-slate-200 text-red-600 hover:bg-red-50">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full text-center p-8 bg-slate-50 rounded-xl text-slate-500 border border-dashed border-slate-200">
                            Chưa có phòng học nào được tạo.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
