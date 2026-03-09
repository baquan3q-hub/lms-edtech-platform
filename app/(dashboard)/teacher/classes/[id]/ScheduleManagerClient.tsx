"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Clock, MapPin, Plus, Trash2, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAvailableRooms, upsertClassSchedule, deleteClassSchedule } from "@/lib/actions/schedule";

const DAYS_OF_WEEK = [
    { value: 1, label: "Thứ Hai" },
    { value: 2, label: "Thứ Ba" },
    { value: 3, label: "Thứ Tư" },
    { value: 4, label: "Thứ Năm" },
    { value: 5, label: "Thứ Sáu" },
    { value: 6, label: "Thứ Bảy" },
    { value: 0, label: "Chủ Nhật" },
];

export default function ScheduleManagerClient({
    classId,
    initialSchedules,
    allRooms,
    readOnly = false
}: {
    classId: string,
    initialSchedules: any[],
    allRooms: any[],
    readOnly?: boolean
}) {
    const router = useRouter();
    const [schedules, setSchedules] = useState(initialSchedules);
    const [isEditing, setIsEditing] = useState(false);

    // Form State
    const [editId, setEditId] = useState<string | null>(null);
    const [dayOfWeek, setDayOfWeek] = useState<number>(1);
    const [startTime, setStartTime] = useState<string>("08:00");
    const [endTime, setEndTime] = useState<string>("10:00");
    const [roomId, setRoomId] = useState<string>("");
    const [note, setNote] = useState<string>("");

    // Room Availability State
    const [availableRooms, setAvailableRooms] = useState<any[]>([]);
    const [isChecking, setIsChecking] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    // Hàm gọi lấy phòng trống mỗi khi thời gian thay đổi
    useEffect(() => {
        if (!isEditing) return;

        const checkRooms = async () => {
            setIsChecking(true);
            setErrorMsg("");
            try {
                // Đảm bảo start < end (validate đơn giản)
                if (startTime >= endTime) {
                    setErrorMsg("Giờ kết thúc phải sau giờ bắt đầu.");
                    setAvailableRooms([]);
                    setRoomId("");
                    setIsChecking(false);
                    return;
                }

                const { data, error } = await getAvailableRooms(dayOfWeek, startTime, endTime, editId || undefined);
                if (error) {
                    setErrorMsg(error);
                } else if (data) {
                    setAvailableRooms(data);
                    // Nếu phòng đang chọn không còn trong danh sách available, reset nó
                    if (roomId && !data.find(r => r.id === roomId)) {
                        setRoomId("");
                    }
                }
            } catch (e: any) {
                setErrorMsg(e.message);
            } finally {
                setIsChecking(false);
            }
        };

        const timerId = setTimeout(() => {
            checkRooms();
        }, 300); // debounce 300ms

        return () => clearTimeout(timerId);
    }, [dayOfWeek, startTime, endTime, isEditing, editId]); // Include roomId carefully to avoid loops, it's checked inside

    const handleAddNew = () => {
        if (readOnly) return;
        setEditId(null);
        setDayOfWeek(1);
        setStartTime("08:00");
        setEndTime("10:00");
        setRoomId("");
        setNote("");
        setIsEditing(true);
        setErrorMsg("");
    };

    const handleEdit = (schedule: any) => {
        if (readOnly) return;
        setEditId(schedule.id);
        setDayOfWeek(schedule.day_of_week);
        setStartTime(schedule.start_time.substring(0, 5));
        setEndTime(schedule.end_time.substring(0, 5));
        setRoomId(schedule.room_id || "");
        setNote(schedule.note || "");
        setIsEditing(true);
        setErrorMsg("");
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditId(null);
        setErrorMsg("");
    };

    const handleSave = async () => {
        if (!roomId) {
            setErrorMsg("Vui lòng chọn phòng học.");
            return;
        }

        setIsSaving(true);
        setErrorMsg("");

        try {
            const result = await upsertClassSchedule({
                id: editId || undefined,
                class_id: classId,
                room_id: roomId,
                day_of_week: dayOfWeek,
                start_time: startTime,
                end_time: endTime,
                note: note // Add note
            });

            if (result.error) {
                setErrorMsg(result.error);
                setIsSaving(false);
                return;
            }

            // Sync lại list local
            if (editId) {
                setSchedules(prev => prev.map(s => s.id === result.data.id ? result.data : s));
            } else {
                setSchedules(prev => [...prev, result.data].sort((a, b) => a.day_of_week - b.day_of_week));
            }

            setIsEditing(false);
            router.refresh(); // Để Server Components khác cập nhật
        } catch (e: any) {
            setErrorMsg(e.message || "Đã xảy ra lỗi");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (scheduleId: string) => {
        if (!confirm("Bạn có chắc chắn muốn xóa lịch học này không?")) return;

        try {
            const res = await deleteClassSchedule(scheduleId, classId);
            if (res.error) {
                alert("Lỗi: " + res.error);
                return;
            }
            setSchedules(prev => prev.filter(s => s.id !== scheduleId));
            router.refresh();
        } catch (e: any) {
            alert("Lỗi: " + e.message);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h3 className="text-xl font-bold text-slate-900 border-l-4 border-emerald-500 pl-3">
                        Lịch dạy & Phòng học
                    </h3>
                    <p className="text-slate-500 mt-1 pl-4 text-sm">
                        {readOnly ? "Lịch dạy của lớp và phòng học tương ứng." : "Quản lý các ca dạy của lớp. Hệ thống sẽ tự động lọc các phòng còn trống để tránh trùng lịch."}
                    </p>
                </div>
                {!isEditing && !readOnly && (
                    <Button onClick={handleAddNew} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md font-semibold h-10 px-4 rounded-xl">
                        <Plus className="w-4 h-4 mr-2" /> Xếp lịch mới
                    </Button>
                )}
            </div>

            {/* List Schedules */}
            {!isEditing && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    {schedules.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                            {schedules.map((schedule) => {
                                const dayObj = DAYS_OF_WEEK.find(d => d.value === schedule.day_of_week);
                                const dayName = dayObj ? dayObj.label : `Thứ ${schedule.day_of_week + 1}`;

                                return (
                                    <div key={schedule.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-start gap-4 mb-4 sm:mb-0">
                                            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                                <Calendar className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 text-xl flex items-center gap-2">
                                                    {dayName}
                                                </h4>
                                                <div className="flex flex-wrap items-center gap-4 mt-1.5">
                                                    <span className="flex items-center text-slate-700 text-base font-semibold">
                                                        <Clock className="w-5 h-5 mr-1.5 text-emerald-500" />
                                                        {schedule.start_time.substring(0, 5)} - {schedule.end_time.substring(0, 5)}
                                                    </span>
                                                    <span className="flex items-center text-slate-700 text-base font-semibold">
                                                        <MapPin className="w-5 h-5 mr-1.5 text-rose-500" />
                                                        Phòng: {(schedule.room as any)?.name || "Chưa có"}
                                                    </span>
                                                </div>
                                                {schedule.note && (
                                                    <div className="mt-3 text-sm text-slate-600 bg-amber-50 px-4 py-2.5 rounded-xl border border-amber-200">
                                                        <strong className="text-amber-700">📝 Nội dung / Lưu ý:</strong> <span className="ml-1">{schedule.note}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {!readOnly && (
                                            <div className="flex items-center gap-2 mt-4 sm:mt-0">
                                                <Button variant="outline" size="sm" onClick={() => handleEdit(schedule)} className="border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50">
                                                    Sửa
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => handleDelete(schedule.id)} className="border-slate-200 text-red-600 hover:border-red-200 hover:bg-red-50">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center p-12">
                            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Calendar className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-1">Chưa xếp lịch dạy</h3>
                            <p className="text-slate-500 max-w-sm mx-auto">Lớp học này chưa có ca dạy nào được xếp phòng. Bấm nút "Xếp lịch mới" để bắt đầu.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Editing Form */}
            {isEditing && (
                <div className="bg-white rounded-2xl shadow-md border border-indigo-100 p-6 animate-in fade-in slide-in-from-top-4 duration-300">
                    <h4 className="text-lg font-bold text-indigo-900 mb-4 flex items-center">
                        <Calendar className="w-5 h-5 mr-2" />
                        {editId ? "Cập nhật ca học" : "Thêm ca học mới"}
                    </h4>

                    {errorMsg && (
                        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium flex items-center">
                            <AlertCircle className="w-4 h-4 mr-2" /> {errorMsg}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        {/* Day Selection */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Ngày dạy</label>
                            <select
                                value={dayOfWeek}
                                onChange={(e) => setDayOfWeek(Number(e.target.value))}
                                className="w-full h-11 px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                            >
                                {DAYS_OF_WEEK.map(day => (
                                    <option key={day.value} value={day.value}>{day.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Start Time */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Giờ bắt đầu</label>
                            <input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-full h-11 px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                            />
                        </div>

                        {/* End Time */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Giờ kết thúc</label>
                            <input
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="w-full h-11 px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                            />
                        </div>
                    </div>

                    {/* Room Selection Area (Dynamic) */}
                    <div className="border border-slate-200 rounded-xl p-5 bg-slate-50 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <label className="text-sm font-bold text-slate-800 flex items-center">
                                <MapPin className="w-4 h-4 mr-1.5 text-indigo-500" /> Chọn Phòng Học
                            </label>
                            {isChecking && (
                                <span className="text-xs font-semibold text-indigo-500 flex items-center bg-indigo-100 px-2 py-1 rounded-full animate-pulse">
                                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Đang kiểm tra phòng trống...
                                </span>
                            )}
                        </div>

                        {!isChecking && availableRooms.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                {availableRooms.map(room => (
                                    <div
                                        key={room.id}
                                        onClick={() => setRoomId(room.id)}
                                        className={`cursor-pointer p-3 rounded-xl border transition-all ${roomId === room.id
                                            ? "bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm"
                                            : "bg-white border-slate-200 hover:border-indigo-300"
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`font-bold text-sm ${roomId === room.id ? "text-indigo-900" : "text-slate-700"}`}>
                                                {room.name}
                                            </span>
                                            {roomId === room.id && <CheckCircle className="w-4 h-4 text-indigo-500" />}
                                        </div>
                                        <p className="text-xs text-slate-500">Sức chứa: {room.capacity}</p>
                                    </div>
                                ))}
                            </div>
                        ) : !isChecking && startTime < endTime ? (
                            <div className="text-center p-4 bg-amber-50 rounded-lg text-amber-700 border border-amber-200 text-sm">
                                <AlertCircle className="w-5 h-5 mx-auto mb-1 text-amber-500" />
                                <p>Rất tiếc! Không có phòng nào trống trong khoảng thời gian này.</p>
                                <p className="text-xs mt-1">Vui lòng điều chỉnh lại giờ học hoặc chọn ca khác.</p>
                            </div>
                        ) : null}
                    </div>

                    {/* Note input */}
                    <div className="space-y-2 mb-6">
                        <label className="text-sm font-bold text-slate-700">Nội dung bài học / Lưu ý cho học sinh</label>
                        <textarea
                            value={note}
                            placeholder="VD: Hôm nay học Chương 3 - Phương trình bậc 2. Mang theo vở bài tập...&#10;Nội dung này sẽ hiển thị cho học sinh."
                            onChange={(e) => setNote(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm resize-y"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <Button variant="outline" onClick={handleCancel} disabled={isSaving} className="border-slate-300">
                            Hủy bỏ
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving || !roomId || isChecking} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            {isSaving ? "Đang lưu..." : "Lưu Lịch & Đặt phòng"}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
