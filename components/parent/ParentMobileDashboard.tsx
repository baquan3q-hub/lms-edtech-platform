"use client";

import { Bell, Calendar, GraduationCap, ChevronRight, TrendingUp, Clock } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function ParentMobileDashboard({ 
    dashboardData, 
    activeChildren,
    stats 
}: { 
    dashboardData: any, 
    activeChildren: any[],
    stats: { avgScore: number | null, attendanceRate: number | null }
}) {
    const selectedChild = activeChildren[0]; 
    const recentAnnouncements = dashboardData?.announcements?.slice(0, 3) || [];
    const upcomingSchedule = dashboardData?.recentNotifications?.filter((n:any) => n.title.includes("Lịch học"))?.slice(0, 3) || [];

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-500">
            {/* 1. HERO: TÌNH HÌNH CON CÁI */}
            <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                            <GraduationCap className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs text-blue-100 font-medium">Tình hình học tập của</p>
                            <h2 className="text-xl font-black">{selectedChild?.full_name || "Con yêu"}</h2>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl border border-white/10">
                            <p className="text-[10px] text-blue-100 uppercase font-bold tracking-wider">Điểm trung bình</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black">{stats.avgScore || "—"}</span>
                                {stats.avgScore && <TrendingUp className="w-3 h-3 text-emerald-300" />}
                            </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl border border-white/10">
                            <p className="text-[10px] text-blue-100 uppercase font-bold tracking-wider">Chuyên cần</p>
                            <span className="text-2xl font-black">{stats.attendanceRate ? `${stats.attendanceRate}%` : "—"}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. THÔNG BÁO QUAN TRỌNG */}
            <div className="space-y-4 px-1">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                        <Bell className="w-6 h-6 text-orange-500 fill-orange-500/10" />
                        Thông báo mới
                    </h3>
                    <Link href="/parent/notifications">
                        <Button variant="ghost" className="text-blue-600 font-bold text-xs h-8 px-2">Xem tất cả</Button>
                    </Link>
                </div>

                <div className="space-y-3">
                    {recentAnnouncements.length > 0 ? (
                        recentAnnouncements.map((ann: any) => (
                            <Link href={`/parent/announcements/${ann.id}`} key={ann.id} className="block">
                                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 active:scale-95 transition-transform">
                                    <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                                        <Bell className="w-5 h-5 text-orange-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-bold text-slate-900 truncate">{ann.title}</h4>
                                        <p className="text-[11px] text-slate-500 truncate mt-0.5">{ann.content}</p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-300" />
                                </div>
                            </Link>
                        ))
                    ) : (
                        <div className="p-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            <p className="text-xs text-slate-400">Không có thông báo mới</p>
                        </div>
                    )}
                </div>
            </div>

            {/* 3. LỊCH HỌC SẮP TỚI */}
            <div className="space-y-4 px-1">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                        <Calendar className="w-6 h-6 text-blue-500 fill-blue-500/10" />
                        Lịch học của con
                    </h3>
                    <Link href="/parent/schedule">
                         <Button variant="ghost" className="text-blue-600 font-bold text-xs h-8 px-2">Tất cả lịch</Button>
                    </Link>
                </div>

                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                    {upcomingSchedule.length > 0 ? (
                        upcomingSchedule.map((item: any, idx: number) => (
                            <div key={idx} className={`p-4 flex items-center gap-4 ${idx !== upcomingSchedule.length - 1 ? 'border-bottom border-slate-50' : ''}`}>
                                <div className="w-12 text-center">
                                    <p className="text-[10px] font-black text-slate-400 uppercase">Thứ 3</p>
                                    <p className="text-lg font-black text-slate-700">18</p>
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Clock className="w-3 h-3 text-slate-400" />
                                        <span className="text-[11px] font-medium text-slate-500">08:00 - 09:30</span>
                                    </div>
                                </div>
                                <Badge className="bg-blue-50 text-blue-600 border-none">Online</Badge>
                            </div>
                        ))
                    ) : (
                        <div className="p-8 text-center bg-white">
                            <Calendar className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                            <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Chưa có lịch hẹ</p>
                            <Button variant="link" className="mt-2 text-blue-600 text-xs font-bold">Cập nhật ngay</Button>
                        </div>
                    )}
                </div>
            </div>

            {/* 4. CHỨC NĂNG NHANH */}
            <div className="grid grid-cols-2 gap-4 px-1 pb-10">
                <Button className="h-14 rounded-2xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-none font-bold text-sm shadow-none">
                    <GraduationCap className="mr-2 w-4 h-4" /> Bảng điểm
                </Button>
                <Button className="h-14 rounded-2xl bg-blue-50 text-indigo-700 hover:bg-blue-100 border-none font-bold text-sm shadow-none">
                    <Calendar className="mr-2 w-4 h-4" /> Đơn nghỉ học
                </Button>
            </div>
        </div>
    );
}
