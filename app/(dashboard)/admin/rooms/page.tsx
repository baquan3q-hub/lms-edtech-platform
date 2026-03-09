import { getRoomsWithSchedules } from "@/lib/actions/schedule";
import { Plus, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import RoomManagerClient from "./RoomManagerClient";

export default async function AdminRoomsPage() {
    const { data: rooms } = await getRoomsWithSchedules();

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Quản lý Phòng Học</h1>
                    <p className="text-gray-500 text-sm mt-1">Quản lý sức chứa và danh sách các phòng học trên hệ thống.</p>
                </div>
            </div>

            <div className="bg-white border text-slate-800 border-slate-200 rounded-xl shadow-sm p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                        <LayoutGrid className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-bold">Danh sách phòng học hiện tại</h2>
                </div>

                <RoomManagerClient initialRooms={rooms || []} />
            </div>
        </div>
    );
}
