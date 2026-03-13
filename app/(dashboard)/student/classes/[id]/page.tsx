import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft, BookOpen, PlayCircle, FileText, Video, ChevronDown, CheckSquare,
    Monitor, FolderPlus, Folder, CheckCircle2, Circle, Music, ClipboardList,
    MessageSquare, Calendar, Bell, BarChart3, Clock, MapPin, Users, Trophy, Home,
    ExternalLink, Download, Link as LinkIcon, Medal, Target, Star, TrendingUp,
    PlusCircle, MinusCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchStudentExams } from "@/lib/actions/exam";
import { fetchStudentHomework } from "@/lib/actions/homework";
import { getStudentPointHistory } from "@/lib/actions/point";

export const dynamic = "force-dynamic";

export default async function StudentClassDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const adminSupabase = createAdminClient();

    // === DATA FETCHING (song song) ===
    const [classRes, itemsRes, progressRes, schedulesRes, examsRes, homeworkRes, announcementsRes, pointsRes] = await Promise.all([
        // 1. Thông tin lớp
        adminSupabase
            .from('classes')
            .select('*, course:courses(name, description, mode), teacher:users!classes_teacher_id_fkey(full_name, email)')
            .eq('id', id)
            .single(),
        // 2. Course Items + content data
        adminSupabase
            .from("course_items")
            .select("*, content:item_contents(*)")
            .eq("class_id", id)
            .order("order_index", { ascending: true }),
        // 3. Student progress
        adminSupabase
            .from("student_progress")
            .select("item_id, status, score, completed_at")
            .eq("student_id", user.id),
        // 4. Lịch học
        adminSupabase
            .from("class_schedules")
            .select("*, room:rooms(name)")
            .eq("class_id", id)
            .order("day_of_week")
            .order("start_time"),
        // 5. Bài kiểm tra (từ bảng exams)
        fetchStudentExams(id),
        // 6. Bài tập về nhà
        fetchStudentHomework(id),
        // 7. Thông báo lớp học
        adminSupabase
            .from("announcements")
            .select("id, title, content, resource_id, resource_type, file_url, video_url, link_url, quiz_data, created_at")
            .eq("class_id", id)
            .order("created_at", { ascending: false })
            .limit(20),
        // 8. Điểm tích lũy
        getStudentPointHistory(user.id, id),
    ]);

    const classInfo = classRes.data as any;
    const items = itemsRes.data || [];
    const schedules = schedulesRes.data || [];
    const exams = examsRes.data || [];
    const homeworkList = homeworkRes.data || [];
    const announcements = announcementsRes.data || [];
    const pointHistory = pointsRes.data || [];
    const totalAccumulatedPoints = pointHistory.reduce((acc: number, p: any) => acc + p.points, 0);

    // Progress set
    const completedSet = new Set(
        (progressRes.data || []).filter((p: any) => p.status === 'completed').map((p: any) => p.item_id)
    );

    // Thống kê
    const totalLessons = items.filter((i: any) => i.type !== 'folder').length;
    const videoCount = items.filter((i: any) => i.type === 'video').length;
    const quizCount = items.filter((i: any) => i.type === 'quiz').length;
    const completedCount = items.filter((i: any) => i.type !== 'folder' && completedSet.has(i.id)).length;
    const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

    // TÍNH TOÁN KẾT QUẢ HỌC TẬP & XẾP HẠNG
    let currentStudentScore = 0;
    let currentStudentMaxScore = 0;
    let completedExamsCount = 0;
    let completedHomeworkCount = 0;
    let totalAttempts = 0;

    const myFinishedAssignments: any[] = [];

    // Tổng hợp điểm từ Bài kiểm tra
    exams.forEach((exam: any) => {
        if (exam.submission) {
            completedExamsCount++;
            currentStudentScore += exam.submission.score || 0;
            currentStudentMaxScore += exam.submission.total_points || exam.total_points || 0;
            totalAttempts++; // exam chỉ nộp 1 lần (hoặc tính là 1 lượt thành công)
            myFinishedAssignments.push({ type: 'Kiểm tra', title: exam.title, score: exam.submission.score, total: exam.submission.total_points || exam.total_points, date: exam.submission.submitted_at || exam.submission.created_at });
        }
    });

    // Tổng hợp điểm từ Bài tập
    homeworkList.forEach((hw: any) => {
        if (hw.submission && hw.submission.status === 'graded') {
            completedHomeworkCount++;
            currentStudentScore += hw.submission.score || 0;
            currentStudentMaxScore += hw.total_points || 0;
            totalAttempts += hw.submission.attempts || 1;
            myFinishedAssignments.push({ type: 'Bài tập', title: hw.title, score: hw.submission.score, total: hw.total_points, date: hw.submission.updated_at || hw.submission.created_at });
        }
    });

    const gpaPercent = currentStudentMaxScore > 0 ? Math.round((currentStudentScore / currentStudentMaxScore) * 100) : 0;
    const gpa10 = currentStudentMaxScore > 0 ? Number(((currentStudentScore / currentStudentMaxScore) * 10).toFixed(1)) : 0;
    
    // Sắp xếp lịch sử bài làm gần nhất
    myFinishedAssignments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Tính toán thứ hạng (Rank)
    const examIds = exams.map((e: any) => e.id);
    const hwIds = homeworkList.map((h: any) => h.id);

    const [allExamSubsRes, allHwSubsRes] = await Promise.all([
        examIds.length > 0 ? adminSupabase.from("exam_submissions").select("student_id, score").in("exam_id", examIds) : Promise.resolve({ data: [] }),
        hwIds.length > 0 ? adminSupabase.from("homework_submissions").select("student_id, score").in("homework_id", hwIds).eq("status", "graded") : Promise.resolve({ data: [] })
    ]);

    const studentScoresMap: Record<string, number> = {};
    const allExSubs = allExamSubsRes?.data || [];
    const allHwSubs = allHwSubsRes?.data || [];
    
    [...allExSubs, ...allHwSubs].forEach((sub: any) => {
        if (!studentScoresMap[sub.student_id]) studentScoresMap[sub.student_id] = 0;
        studentScoresMap[sub.student_id] += Number(sub.score) || 0;
    });

    const sortedStudentIds = Object.keys(studentScoresMap).sort((a, b) => studentScoresMap[b] - studentScoresMap[a]);
    // Hạng của người dùng hiện tại (nội suy 1 nếu không có ai)
    const myRank = sortedStudentIds.includes(user.id) ? sortedStudentIds.indexOf(user.id) + 1 : (currentStudentScore > 0 ? 1 : null);
    const totalRankedStudents = sortedStudentIds.length;

    // Next lesson
    const flatLessons = items.filter((i: any) => i.type !== 'folder').sort((a: any, b: any) => a.order_index - b.order_index);
    const nextLesson = flatLessons.find((i: any) => !completedSet.has(i.id));

    // Build tree
    const buildTree = (flatItems: any[], parentId: string | null = null): any[] => {
        return flatItems
            .filter(item => item.parent_id === parentId)
            .sort((a, b) => a.order_index - b.order_index)
            .map(item => ({ ...item, children: buildTree(flatItems, item.id) }));
    };
    const tree = buildTree(items);

    // Icons & labels
    const typeIcons: Record<string, any> = {
        video: Video, document: FileText, quiz: CheckSquare,
        audio: Music, assignment: ClipboardList, discussion: MessageSquare, zoom: Monitor
    };
    const typeColors: Record<string, string> = {
        video: "text-rose-500", document: "text-emerald-500", quiz: "text-indigo-500",
        audio: "text-amber-500", assignment: "text-orange-500", discussion: "text-blue-500", zoom: "text-sky-500"
    };
    const typeLabels: Record<string, string> = {
        video: "Video", document: "Tài liệu", quiz: "Trắc nghiệm",
        audio: "Audio", assignment: "Bài tập", discussion: "Thảo luận", zoom: "Zoom/Meet"
    };
    const dayNames = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

    // Render course tree node — enhanced nested display
    const renderNode = (node: any, level: number = 0) => {
        const isFolder = node.type === 'folder';
        if (isFolder) {
            const childLessons = (node.children || []).filter((n: any) => n.type !== 'folder');
            const totalChildren = (node.children || []).length;
            return (
                <details key={node.id} open className="group">
                    <summary
                        className={`flex items-center gap-3 px-5 py-3.5 cursor-pointer transition-colors select-none list-none
                            ${level === 0
                                ? 'bg-gradient-to-r from-amber-50 to-slate-50 border-b-2 border-amber-100 hover:from-amber-100'
                                : 'bg-slate-50/60 border-b border-slate-100 hover:bg-slate-100'
                            }`}
                        style={{ paddingLeft: `${(level * 24) + 20}px` }}
                    >
                        <ChevronDown className="w-4 h-4 text-amber-500 group-open:rotate-0 -rotate-90 transition-transform shrink-0" />
                        <Folder className={`w-5 h-5 shrink-0 ${level === 0 ? 'text-amber-500' : 'text-amber-400'}`} />
                        <div className="flex-1 min-w-0">
                            <span className={`font-bold text-sm block truncate ${level === 0 ? 'text-slate-900' : 'text-slate-700'}`}>{node.title}</span>
                            <span className="text-[10px] text-slate-400">{totalChildren} mục · {childLessons.length} bài</span>
                        </div>
                    </summary>
                    <div className={`${level === 0 ? 'border-l-2 border-amber-200 ml-8' : 'border-l-2 border-slate-200 ml-8'}`}>
                        {node.children && node.children.map((child: any) => renderNode(child, level + 1))}
                    </div>
                </details>
            );
        }

        const isCompleted = completedSet.has(node.id);
        const isNext = nextLesson?.id === node.id;
        const Icon = typeIcons[node.type] || FileText;
        const bgColor = isNext ? 'bg-indigo-50/60 border-l-4 border-l-indigo-500' : isCompleted ? 'bg-emerald-50/30' : 'hover:bg-slate-50';
        const typeBgColors: Record<string, string> = {
            video: 'bg-rose-50', document: 'bg-emerald-50', quiz: 'bg-indigo-50',
            audio: 'bg-amber-50', assignment: 'bg-orange-50', discussion: 'bg-blue-50', zoom: 'bg-sky-50'
        };

        return (
            <Link key={node.id} href={`/student/classes/${id}/learn/${node.id}`} className="block">
                <div className={`flex items-center gap-3 py-3 px-5 transition-colors border-b border-slate-50 last:border-0 group cursor-pointer ${bgColor}`} style={{ paddingLeft: `${(level * 24) + 20}px` }}>
                    {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    ) : isNext ? (
                        <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center shrink-0">
                            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        </div>
                    ) : (
                        <Circle className="w-5 h-5 shrink-0 text-slate-300" />
                    )}
                    <div className={`w-7 h-7 rounded-lg ${typeBgColors[node.type] || 'bg-slate-50'} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-3.5 h-3.5 ${typeColors[node.type] || 'text-slate-400'}`} />
                    </div>
                    <span className={`text-sm font-medium flex-1 truncate ${isCompleted ? 'text-slate-400 line-through' :
                        isNext ? 'text-indigo-700 font-semibold' :
                            'text-slate-700 group-hover:text-indigo-600'
                        }`}>
                        {node.title}
                    </span>
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${typeBgColors[node.type] || 'bg-slate-50'} ${typeColors[node.type] || 'text-slate-400'}`}>
                        {typeLabels[node.type] || node.type}
                    </span>
                    {isCompleted && (
                        <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[10px] px-1.5 py-0" variant="outline">✓</Badge>
                    )}
                    {isNext && (
                        <Badge className="bg-indigo-100 text-indigo-600 border-indigo-200 text-[10px] px-2 py-0.5 animate-pulse" variant="outline">Tiếp theo</Badge>
                    )}
                </div>
            </Link>
        );
    };

    if (!classInfo) {
        return (
            <div className="p-8 text-center text-red-500 bg-red-50 rounded-2xl border border-red-200">
                <p className="font-medium text-lg">Không tìm thấy lớp học.</p>
                <Link href="/student/classes" className="text-blue-600 underline mt-4 inline-block">Quay lại</Link>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto pb-12">
            <Link href="/student/classes" className="flex items-center text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors w-fit mb-6">
                <ArrowLeft className="w-4 h-4 mr-1" /> Quay lại danh sách lớp
            </Link>

            {/* === COURSE HEADER === */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm mb-6">
                <div className="bg-gradient-to-r from-slate-800 to-indigo-900 p-6 md:p-8 text-white relative">
                    <div className="absolute top-6 right-6">
                        <Link href={nextLesson ? `/student/classes/${id}/learn/${nextLesson.id}` : `/student/classes/${id}/learn`}>
                            <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 shadow-xl border border-emerald-400 text-white font-bold h-12 px-8 rounded-full transform hover:scale-105 transition-transform">
                                <PlayCircle className="w-5 h-5 mr-2" /> {completedCount > 0 ? 'TIẾP TỤC HỌC' : 'VÀO HỌC NGAY'}
                            </Button>
                        </Link>
                    </div>

                    <Badge className="bg-white/15 text-white hover:bg-white/25 border-none mb-3 text-xs">Khóa học đang diễn ra</Badge>
                    <h1 className="text-2xl md:text-3xl font-extrabold mb-1 pr-48">{classInfo.course?.name || "Khóa học"}</h1>
                    <p className="text-slate-300 text-sm font-medium">
                        Lớp: {classInfo.name || "—"}
                        {classInfo.teacher?.full_name && <span className="ml-2 text-slate-400">• GV: {classInfo.teacher.full_name}</span>}
                    </p>
                    {classInfo.course?.description && <p className="text-slate-400 text-sm mt-2 max-w-lg">{classInfo.course.description}</p>}

                    {/* Progress bar */}
                    <div className="mt-4 max-w-md">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs text-slate-300">Tiến độ</span>
                            <span className="text-xs font-bold text-white">{progressPercent}%</span>
                        </div>
                        <div className="w-full bg-white/20 rounded-full h-2.5 overflow-hidden">
                            <div className="bg-gradient-to-r from-emerald-400 to-emerald-300 h-2.5 rounded-full transition-all duration-700" style={{ width: `${progressPercent}%` }} />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">{completedCount}/{totalLessons} bài hoàn thành</p>
                    </div>
                </div>

                {/* Stats bar */}
                <div className="flex items-center gap-6 px-6 py-3 bg-slate-50 border-t border-slate-200 text-sm text-slate-600 font-medium flex-wrap">
                    <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4 text-indigo-500" /> {totalLessons} bài</span>
                    <span className="flex items-center gap-1.5"><Video className="w-4 h-4 text-rose-500" /> {videoCount} video</span>
                    <span className="flex items-center gap-1.5"><CheckSquare className="w-4 h-4 text-indigo-500" /> {quizCount} quiz</span>
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> {completedCount} done</span>
                </div>
            </div>

            {/* === TABS === */}
            <Tabs defaultValue="roadmap" className="w-full">
                <TabsList className="w-full justify-start bg-white border border-slate-200 rounded-xl p-1 h-auto flex-wrap gap-1 mb-6">
                    <TabsTrigger value="roadmap" className="rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white font-semibold px-4 py-2 text-sm">
                        <BookOpen className="w-4 h-4 mr-2" /> Lộ trình
                    </TabsTrigger>
                    <TabsTrigger value="schedule" className="rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white font-semibold px-4 py-2 text-sm">
                        <Calendar className="w-4 h-4 mr-2" /> Lịch học
                    </TabsTrigger>
                    <TabsTrigger value="assignments" className="rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white font-semibold px-4 py-2 text-sm">
                        <ClipboardList className="w-4 h-4 mr-2" /> Kiểm tra
                    </TabsTrigger>
                    <TabsTrigger value="homework" className="rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white font-semibold px-4 py-2 text-sm">
                        <Home className="w-4 h-4 mr-2" /> Bài tập
                    </TabsTrigger>
                    <TabsTrigger value="performance" className="rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white font-semibold px-4 py-2 text-sm">
                        <BarChart3 className="w-4 h-4 mr-2" /> Kết quả học tập
                    </TabsTrigger>
                    <TabsTrigger value="announcements" className="rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white font-semibold px-4 py-2 text-sm">
                        <Bell className="w-4 h-4 mr-2" /> Thông báo
                    </TabsTrigger>
                </TabsList>

                {/* ===== TAB: LỘ TRÌNH ===== */}
                <TabsContent value="roadmap">
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-white">
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-indigo-500" /> Lộ trình Học tập
                            </h2>
                            <span className="text-sm font-semibold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full">
                                {completedCount}/{totalLessons} hoàn thành
                            </span>
                        </div>

                        {tree.length > 0 ? (
                            <div className="flex flex-col">{tree.map(node => renderNode(node, 0))}</div>
                        ) : (
                            <div className="text-center py-16 px-6 bg-slate-50/50">
                                <FolderPlus className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                                <h3 className="text-lg font-bold text-slate-700 mb-1">Chưa có bài giảng nào</h3>
                                <p className="text-slate-500 text-sm">Giáo viên chưa cập nhật nội dung cho lớp này.</p>
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* ===== TAB: LỊCH HỌC ===== */}
                <TabsContent value="schedule">
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-200 bg-white">
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-emerald-500" /> Lịch học hàng tuần
                            </h2>
                            <p className="text-sm text-slate-500 mt-1">Lịch học cố định của lớp bạn</p>
                        </div>

                        {schedules.length > 0 ? (
                            <div className="divide-y divide-slate-100">
                                {schedules.map((s: any) => (
                                    <div key={s.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                                        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex flex-col items-center justify-center shrink-0 border border-emerald-100">
                                            <span className="text-[10px] font-bold uppercase">{s.day_of_week === 0 ? "C.Nhật" : "Thứ"}</span>
                                            <span className="text-sm font-black leading-none">{s.day_of_week === 0 ? "CN" : s.day_of_week + 1}</span>
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-slate-800">{dayNames[s.day_of_week] || `Ngày ${s.day_of_week}`}</p>
                                            <p className="text-sm text-slate-500 flex items-center gap-2 mt-0.5">
                                                <Clock className="w-3.5 h-3.5" />
                                                {s.start_time?.slice(0, 5)} — {s.end_time?.slice(0, 5)}
                                                {s.room && (
                                                    <span className="flex items-center gap-1 ml-2">
                                                        <MapPin className="w-3.5 h-3.5" />
                                                        {(s.room as any)?.name || "Chưa rõ"}
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                        <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[10px]" variant="outline">
                                            Hàng tuần
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 px-6">
                                <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                <p className="text-slate-500 font-medium">Chưa có lịch học.</p>
                                <p className="text-sm text-slate-400 mt-1">Giáo viên sẽ cập nhật lịch học sớm nhất.</p>
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* ===== TAB: BÀI TẬP & KIỂM TRA ===== */}
                <TabsContent value="assignments">
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-200 bg-white">
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <ClipboardList className="w-5 h-5 text-indigo-500" /> Bài tập & Kiểm tra
                            </h2>
                            <p className="text-sm text-slate-500 mt-1">{exams.length} bài kiểm tra đã giao</p>
                        </div>

                        {exams.length > 0 ? (
                            <div className="divide-y divide-slate-100">
                                {exams.map((exam: any) => {
                                    const isDone = !!exam.submission;
                                    const score = exam.submission?.score;
                                    const total = exam.submission?.total_points || exam.total_points;
                                    const percent = total > 0 && score !== undefined ? Math.round((score / total) * 100) : null;

                                    return (
                                        <Link key={exam.id} href={`/student/classes/${id}/exams/${exam.id}`} className="block">
                                            <div className="flex items-center gap-4 px-5 py-4 hover:bg-indigo-50/50 transition-colors cursor-pointer">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isDone ? 'bg-emerald-50 text-emerald-500' : 'bg-indigo-50 text-indigo-500'}`}>
                                                    {isDone ? <Trophy className="w-5 h-5" /> : <ClipboardList className="w-5 h-5" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`font-semibold text-sm ${isDone ? 'text-slate-500' : 'text-slate-800'}`}>
                                                        {exam.title}
                                                    </p>
                                                    <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                                                        <span className="font-medium text-indigo-500">Trắc nghiệm</span>
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3" /> {exam.duration_minutes} phút
                                                        </span>
                                                        <span>{exam.total_points} điểm</span>
                                                    </div>
                                                </div>
                                                {isDone ? (
                                                    <div className="text-right">
                                                        <p className={`text-sm font-bold ${percent !== null && percent >= 50 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                            {score}/{total}
                                                        </p>
                                                        <Badge className={`text-[10px] ${percent !== null && percent >= 50 ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`} variant="outline">
                                                            {percent !== null && percent >= 50 ? 'Đạt' : 'Chưa đạt'}
                                                        </Badge>
                                                    </div>
                                                ) : (
                                                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 h-8 rounded-lg text-xs">
                                                        Làm bài
                                                    </Button>
                                                )}
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-12 px-6">
                                <ClipboardList className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                <p className="text-slate-500 font-medium">Chưa có bài kiểm tra nào.</p>
                                <p className="text-sm text-slate-400 mt-1">Giáo viên sẽ giao bài kiểm tra sớm nhất.</p>
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* ===== TAB: BÀI TẬP VỀ NHÀ ===== */}
                <TabsContent value="homework">
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-200 bg-white">
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Home className="w-5 h-5 text-emerald-500" /> Bài tập về nhà
                            </h2>
                            <p className="text-sm text-slate-500 mt-1">{homeworkList.length} bài tập đã giao</p>
                        </div>

                        {homeworkList.length > 0 ? (
                            <div className="divide-y divide-slate-100">
                                {homeworkList.map((hw: any) => {
                                    const sub = hw.submission;
                                    const isSubmitted = sub?.status === 'submitted';
                                    const isGraded = sub?.status === 'graded';
                                    const isDue = hw.due_date && new Date(hw.due_date) < new Date();

                                    return (
                                        <Link key={hw.id} href={`/student/classes/${id}/homework/${hw.id}`} className="block">
                                            <div className="flex items-center gap-4 px-5 py-4 hover:bg-emerald-50/50 transition-colors cursor-pointer">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isGraded ? 'bg-emerald-50 text-emerald-500' :
                                                    isSubmitted ? 'bg-amber-50 text-amber-500' :
                                                        'bg-slate-100 text-slate-400'
                                                    }`}>
                                                    {isGraded ? <Trophy className="w-5 h-5" /> :
                                                        isSubmitted ? <Clock className="w-5 h-5" /> :
                                                            <Home className="w-5 h-5" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`font-semibold text-sm ${isGraded ? 'text-slate-500' : 'text-slate-800'}`}>
                                                        {hw.title}
                                                    </p>
                                                    <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                                                        <span>{hw.total_points} điểm</span>
                                                        <span>{(hw.questions as any[] || []).length} câu</span>
                                                        {sub?.attempts > 1 && (
                                                            <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[10px]" variant="outline">{sub.attempts} lần nộp</Badge>
                                                        )}
                                                        {hw.due_date && (
                                                            <span className={`flex items-center gap-1 ${isDue && !isSubmitted && !isGraded ? 'text-red-500 font-semibold' : ''}`}>
                                                                <Clock className="w-3 h-3" />
                                                                Hạn: {new Date(hw.due_date).toLocaleDateString('vi-VN')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {isGraded ? (
                                                    <div className="text-right">
                                                        <p className="text-sm font-bold text-emerald-600">{sub.score}/{hw.total_points}</p>
                                                        <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[10px]" variant="outline">Đã chấm</Badge>
                                                    </div>
                                                ) : isSubmitted ? (
                                                    <Badge className="bg-amber-50 text-amber-600 border-amber-200 text-[10px]" variant="outline">Đã nộp</Badge>
                                                ) : (
                                                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 h-8 rounded-lg text-xs">
                                                        Làm bài
                                                    </Button>
                                                )}
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-12 px-6">
                                <Home className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                <p className="text-slate-500 font-medium">Chưa có bài tập nào.</p>
                                <p className="text-sm text-slate-400 mt-1">Giáo viên sẽ giao bài tập sớm nhất.</p>
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* ===== TAB: KẾT QUẢ HỌC TẬP (PERFORMANCE) ===== */}
                <TabsContent value="performance">
                    <div className="space-y-6">
                        {/* 5 Cards Overview */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="bg-white border border-indigo-100 rounded-xl p-5 shadow-sm shadow-indigo-100/50 flex flex-col items-center justify-center text-center">
                                <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center mb-3">
                                    <Target className="w-6 h-6" />
                                </div>
                                <p className="text-sm font-semibold text-slate-500 mb-1">ĐTB (Hệ 10)</p>
                                <p className="text-3xl font-extrabold text-indigo-700">{gpa10.toFixed(1)}</p>
                            </div>

                            <div className="bg-white border border-emerald-100 rounded-xl p-5 shadow-sm shadow-emerald-100/50 flex flex-col items-center justify-center text-center">
                                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mb-3">
                                    <Medal className="w-6 h-6" />
                                </div>
                                <p className="text-sm font-semibold text-slate-500 mb-1">Thứ hạng</p>
                                <p className="text-3xl font-extrabold text-emerald-600">
                                    {myRank !== null ? `${myRank}/${Math.max(totalRankedStudents, myRank)}` : '--'}
                                </p>
                            </div>

                            <div className="bg-white border border-amber-100 rounded-xl p-5 shadow-sm shadow-amber-100/50 flex flex-col items-center justify-center text-center">
                                <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mb-3">
                                    <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <p className="text-sm font-semibold text-slate-500 mb-1">Bài đã nộp</p>
                                <p className="text-3xl font-extrabold text-amber-600">{completedExamsCount + completedHomeworkCount}</p>
                            </div>

                            <div className="bg-white border border-blue-100 rounded-xl p-5 shadow-sm shadow-blue-100/50 flex flex-col items-center justify-center text-center">
                                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mb-3">
                                    <TrendingUp className="w-6 h-6" />
                                </div>
                                <p className="text-sm font-semibold text-slate-500 mb-1">Lượt làm</p>
                                <p className="text-3xl font-extrabold text-blue-600">{totalAttempts}</p>
                            </div>

                            {/* Card Điểm Tích Lũy */}
                            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5 shadow-sm flex flex-col items-center justify-center text-center">
                                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-3">
                                    <Trophy className="w-6 h-6" />
                                </div>
                                <p className="text-sm font-semibold text-amber-700 mb-1">Điểm Tích Lũy</p>
                                <p className={`text-3xl font-extrabold ${totalAccumulatedPoints > 0 ? 'text-emerald-600' : totalAccumulatedPoints < 0 ? 'text-red-500' : 'text-slate-500'}`}>
                                    {totalAccumulatedPoints > 0 ? `+${totalAccumulatedPoints}` : totalAccumulatedPoints}
                                </p>
                            </div>
                        </div>

                        {/* List danh sách các bài làm */}
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-200 bg-white">
                                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-indigo-500" /> Lịch sử Điểm số
                                </h2>
                                <p className="text-sm text-slate-500 mt-1">Chi tiết điểm các bài tập và bài kiểm tra gần nhất</p>
                            </div>
                            
                            {myFinishedAssignments.length > 0 ? (
                                <div className="divide-y divide-slate-100">
                                    {myFinishedAssignments.map((item, idx) => {
                                        const percent = item.total > 0 ? item.score / item.total : 0;
                                        const isPass = percent >= 0.5;
                                        return (
                                            <div key={idx} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isPass ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>
                                                    {isPass ? <Star className="w-5 h-5" /> : <TrendingUp className="w-5 h-5 rotate-180" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-slate-800 text-sm truncate">{item.title}</p>
                                                    <p className="text-xs text-slate-500 font-medium mt-0.5">{item.type} • {item.date ? new Date(item.date).toLocaleDateString('vi-VN') : ''}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`text-lg font-black ${isPass ? 'text-emerald-600' : 'text-red-500'}`}>
                                                        {item.score}/{item.total}
                                                    </p>
                                                    <Badge className={`text-[10px] uppercase tracking-wider ${isPass ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`} variant="outline">
                                                        {isPass ? 'Đạt' : 'Chưa đạt'}
                                                    </Badge>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-12 px-6">
                                    <BarChart3 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                    <p className="text-slate-500 font-medium">Bạn chưa hoàn thành bài tập hay kiểm tra nào.</p>
                                    <p className="text-sm text-slate-400 mt-1">Hãy tích cực học tập để theo dõi điểm số tại đây.</p>
                                </div>
                            )}
                        </div>

                        {/* Lịch sử Điểm tích lũy */}
                        <div className="bg-gradient-to-br from-amber-50/50 to-orange-50/30 border border-amber-200 rounded-xl shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50">
                                <h2 className="text-lg font-bold text-amber-900 flex items-center gap-2">
                                    <Trophy className="w-5 h-5 text-amber-600" /> Điểm Tích Lũy — Thái độ & Đạo đức
                                </h2>
                                <p className="text-sm text-amber-600 mt-1">Giáo viên đánh giá dựa trên chuyên cần, phát biểu, thái độ học tập</p>
                            </div>

                            {pointHistory.length > 0 ? (
                                <div className="divide-y divide-amber-100/50">
                                    {pointHistory.slice(0, 10).map((item: any) => {
                                        const isPositive = item.points > 0;
                                        return (
                                            <div key={item.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/50 transition-colors">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isPositive ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'}`}>
                                                    {isPositive ? <PlusCircle className="w-4 h-4" /> : <MinusCircle className="w-4 h-4" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-slate-800 truncate">{item.reason}</p>
                                                    <span className="text-[11px] text-slate-400">
                                                        GV: {item.teacher?.full_name || 'Giáo viên'} • {new Date(item.created_at).toLocaleDateString('vi-VN')}
                                                    </span>
                                                </div>
                                                <span className={`font-black text-base shrink-0 ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                                                    {isPositive ? `+${item.points}` : item.points}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-10 px-6">
                                    <Trophy className="w-10 h-10 text-amber-200 mx-auto mb-2" />
                                    <p className="text-sm text-amber-700 font-medium">Chưa có điểm tích lũy trong lớp này.</p>
                                    <p className="text-xs text-amber-500 mt-1">Giáo viên sẽ cộng/trừ điểm dựa trên thái độ học tập.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </TabsContent>

                {/* ===== TAB: THÔNG BÁO ===== */}
                <TabsContent value="announcements">
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-200 bg-white">
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Bell className="w-5 h-5 text-amber-500" /> Thông báo lớp học
                            </h2>
                            <p className="text-sm text-slate-500 mt-1">Cập nhật từ giáo viên và nhà trường</p>
                        </div>

                        <div className="p-5 space-y-4">
                            {announcements.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/30 p-6 text-center">
                                    <Bell className="w-10 h-10 text-amber-300 mx-auto mb-2" />
                                    <p className="text-sm font-semibold text-amber-600">Chưa có thông báo nào</p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Giáo viên sẽ gửi thông báo và tài liệu tại đây.
                                    </p>
                                </div>
                            ) : (
                                announcements.map((ann: any) => (
                                    <div key={ann.id} className="border border-amber-100 bg-amber-50/50 rounded-xl p-4">
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                                                <Bell className="w-4 h-4 text-amber-600" />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-slate-900 text-sm">{ann.title}</h4>
                                                <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap">{ann.content}</p>
                                                {/* === Nút truy cập tài liệu đính kèm === */}
                                                <div className="flex flex-wrap gap-2 mt-3">
                                                    {ann.file_url && (
                                                        <a
                                                            href={ann.file_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-xs font-semibold hover:bg-blue-100 hover:border-blue-300 transition-colors"
                                                        >
                                                            <Download className="w-3.5 h-3.5" />
                                                            Tải tài liệu
                                                        </a>
                                                    )}
                                                    {ann.video_url && (
                                                        <a
                                                            href={ann.video_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-xs font-semibold hover:bg-rose-100 hover:border-rose-300 transition-colors"
                                                        >
                                                            <Video className="w-3.5 h-3.5" />
                                                            Xem video
                                                        </a>
                                                    )}
                                                    {ann.link_url && (
                                                        <a
                                                            href={ann.link_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 text-violet-600 border border-violet-200 rounded-lg text-xs font-semibold hover:bg-violet-100 hover:border-violet-300 transition-colors"
                                                        >
                                                            <LinkIcon className="w-3.5 h-3.5" />
                                                            Mở link
                                                        </a>
                                                    )}
                                                    {ann.resource_type && !ann.file_url && !ann.video_url && !ann.link_url && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md font-medium">
                                                            <FileText className="w-3 h-3" />
                                                            Loại: {ann.resource_type}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-slate-400 mt-2">
                                                    {new Date(ann.created_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Teacher contact card */}
                    <div className="mt-4 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl p-5 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 rounded-full bg-white/10 blur-2xl" />
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg">
                                {classInfo.teacher?.full_name?.charAt(0) || "G"}
                            </div>
                            <div>
                                <p className="font-bold">{classInfo.teacher?.full_name || "Giáo viên"}</p>
                                <p className="text-sm text-indigo-200">{classInfo.teacher?.email || ""}</p>
                            </div>
                        </div>
                        <Button className="w-full mt-4 bg-white text-indigo-600 hover:bg-slate-50 font-bold relative z-10">
                            Liên hệ Giáo viên
                        </Button>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
