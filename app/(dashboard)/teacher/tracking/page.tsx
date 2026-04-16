"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Activity, Search, AlertCircle } from "lucide-react";
import StudentDailyActivityWidget from "@/components/shared/StudentDailyActivityWidget";

export default function TeacherTrackingPage() {
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const fetchStudents = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Lấy tất cả student thuộc các lớp mà giáo viên này dạy
            // Đơn giản hóa: fetch toàn bộ học sinh (hoặc join qua class_members -> classes)
            // Trong thực tế cần query chính xác qua liên kết classes.
            // Đoạn này lấy đại khái 50 học sinh mới nhất để demo (theo RLS thì teacher chỉ xem học sinh của mình)
            const { data } = await supabase
                .from('users')
                .select('id, full_name, email, avatar_url')
                .eq('role', 'student')
                .limit(50);
                
            setStudents(data || []);
            setLoading(false);
        };
        fetchStudents();
    }, []);

    const filtered = students.filter(s => 
        (s.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.email || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                        <Activity className="w-8 h-8 text-indigo-600" />
                        Theo dõi hoạt động Học sinh
                    </h1>
                    <p className="text-slate-500 mt-2 text-lg">
                        Giám sát thời gian hoạt động trực tuyến của học sinh trong ngày hôm nay.
                    </p>
                </div>
                
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Tìm kiếm học sinh..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow text-slate-700"
                    />
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {[1,2,3,4,5,6].map(i => <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-2xl"></div>)}
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
                    <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-700">Không tìm thấy học sinh</h3>
                    <p className="text-slate-500 mt-2">Vui lòng thử tìm kiếm với từ khóa khác.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filtered.map(student => (
                        <StudentDailyActivityWidget 
                            key={student.id} 
                            studentId={student.id} 
                            studentName={student.full_name || student.email} 
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
