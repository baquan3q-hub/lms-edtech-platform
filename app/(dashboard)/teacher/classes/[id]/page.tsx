import { ArrowLeft, BookOpen, Calendar, Users, MapPin, Bell, FileText, MessageSquare, Video, PlusCircle, Clock, ChevronDown, Monitor, Building2, Folder, CheckSquare, Music, ClipboardList, VideoIcon, Eye, EyeOff, ExternalLink, BarChart3, CheckCircle2, Circle, Trophy, Activity, Pencil, Trash2, Home, ShieldAlert, AlertCircle, Zap, ChevronRight, History } from "lucide-react";
import Link from "next/link";
import { fetchClassDetails, fetchClassStudents, fetchStudentProgressForClass } from "./actions";
import { fetchClassBehaviorScores } from "@/lib/actions/behavior-analysis";
import { fetchCourseItems } from "@/lib/actions/courseBuilder";
import { fetchClassExams, fetchPendingExamGradingStats } from "@/lib/actions/exam";
import { fetchClassHomework, fetchPendingHomeworkGradingStats } from "@/lib/actions/homework";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AttendanceClient from "./AttendanceClient";
import ScheduleManagerClient from "./ScheduleManagerClient";
import TeacherLeaveClient from "./TeacherLeaveClient";
import { getRooms, getClassSchedules, getGeneratedSessions } from "@/lib/actions/schedule";
import DeleteExamButton from "@/components/teacher/DeleteExamButton";
import DeleteHomeworkButton from "@/components/teacher/DeleteHomeworkButton";
import AnnouncementComposer from "@/components/teacher/AnnouncementComposer";
import { fetchClassAnnouncements } from "@/lib/actions/announcement";
import StudentBehaviorPanel from "@/components/teacher/StudentBehaviorPanel";
import { fetchClassScoreReport } from "@/lib/actions/class-students";
import ClassOverviewAnalyticsClient from "@/components/teacher/ClassOverviewAnalyticsClient";

export default async function ClassDetailPage({ 
    params,
    searchParams 
}: { 
    params: Promise<{ id: string }>,
    searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    
    // Resolve search params
    const resolvedSearchParams = searchParams ? await searchParams : {};
    const defaultTab = (resolvedSearchParams.tab as string) || "overview";

    // Giữ lại các data bắt buộc cho Header và Overview
    const [
        { data: classInfo, error: classError },
        { data: students },
        { data: courseItems }
    ] = await Promise.all([
        fetchClassDetails(id),
        fetchClassStudents(id),
        fetchCourseItems(id)
    ]);

    const items = courseItems || [];
    const lessonCount = items.filter((i: any) => i.type !== 'folder').length;
    const publishedCount = items.filter((i: any) => i.type !== 'folder' && i.is_published).length;

    // Build tree for display
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

    if (classError || !classInfo) {
        return (
            <div className="p-8 text-center text-red-500 bg-red-50 rounded-2xl border border-red-200">
                <p className="font-medium text-lg">Không thể tải thông tin lớp học.</p>
                <p className="text-sm mt-2">{classError || "Lớp không tồn tại"}</p>
                <Link href="/teacher/classes" className="text-blue-600 underline mt-4 inline-block">Quay lại danh sách</Link>
            </div>
        );
    }

    // Type icons mapping
    const typeIcons: Record<string, any> = {
        folder: Folder, video: Video, document: FileText, quiz: CheckSquare,
        audio: Music, assignment: ClipboardList, discussion: MessageSquare, zoom: VideoIcon
    };
    const typeLabels: Record<string, string> = {
        video: "Video", document: "Tài liệu", quiz: "Trắc nghiệm",
        audio: "Audio", assignment: "Bài tập", discussion: "Thảo luận", zoom: "Zoom/Meet"
    };
    const typeColors: Record<string, string> = {
        video: "text-rose-500", document: "text-emerald-500", quiz: "text-indigo-500",
        audio: "text-amber-500", assignment: "text-orange-500", discussion: "text-blue-500", zoom: "text-sky-500"
    };

    function renderCourseNode(node: any, level: number, classId: string): React.ReactNode {
        const isFolder = node.type === 'folder';
        const Icon = typeIcons[node.type] || FileText;

        if (isFolder) {
            return (
                <details key={node.id} open className="group">
                    <summary className="flex items-center gap-3 px-5 py-3.5 bg-slate-50/80 hover:bg-slate-100 cursor-pointer transition-colors select-none list-none border-b border-slate-100" style={{ paddingLeft: `${(level * 20) + 20}px` }}>
                        <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-0 -rotate-90 transition-transform" />
                        <Folder className="w-4 h-4 text-indigo-400" />
                        <span className="font-bold text-slate-800 text-sm">{node.title}</span>
                        {node.children && (
                            <span className="text-xs text-slate-400 ml-1">
                                ({node.children.filter((c: any) => c.type !== 'folder').length} bài)
                            </span>
                        )}
                    </summary>
                    <div>
                        {node.children && node.children.map((child: any) => renderCourseNode(child, level + 1, classId))}
                    </div>
                </details>
            );
        }

        return (
            <div key={node.id} className="flex items-center gap-3 px-5 py-3 hover:bg-indigo-50/50 transition-colors border-b border-slate-50 last:border-0" style={{ paddingLeft: `${(level * 20) + 44}px` }}>
                <Icon className={`w-4 h-4 shrink-0 ${typeColors[node.type] || 'text-slate-400'}`} />
                <span className="text-sm font-medium text-slate-700 flex-1 truncate">{node.title}</span>
                <span className="text-xs text-slate-400 font-medium">{typeLabels[node.type] || node.type}</span>
                {node.is_published ? (
                    <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[10px] px-1.5 py-0" variant="outline">
                        <Eye className="w-3 h-3 mr-0.5" /> Hiện
                    </Badge>
                ) : (
                    <Badge className="bg-slate-50 text-slate-400 border-slate-200 text-[10px] px-1.5 py-0" variant="outline">
                        <EyeOff className="w-3 h-3 mr-0.5" /> Ẩn
                    </Badge>
                )}

                {node.type === 'discussion' && (
                    <Link href={`/teacher/classes/${classId}/discussions/${node.id}`}>
                        <Button variant="outline" size="sm" className="h-7 text-xs border-indigo-200 text-indigo-600 hover:bg-indigo-50 px-2 ml-2">
                            <MessageSquare className="w-3 h-3 mr-1" /> Tham gia
                        </Button>
                    </Link>
                )}

                <Link href={`/teacher/classes/${classId}/content/${node.id}/edit`}>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-indigo-600 hover:bg-indigo-50 px-2">
                        <ExternalLink className="w-3 h-3 mr-1" /> Sửa
                    </Button>
                </Link>
            </div>
        );
    }


    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header & Back Navigation */}
            <div className="flex flex-col gap-4">
                <Link
                    href="/teacher/classes"
                    className="flex items-center text-sm font-medium text-slate-500 hover:text-emerald-600 transition-colors w-fit"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Quay lại danh sách lớp
                </Link>

                <div className="flex flex-col gap-2">
                    {/* Tên lớp nhỏ ở trên */}
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-1 h-3 bg-indigo-500 rounded-full"></span>
                            {classInfo.name ? `${classInfo.name} — ` : ""}{classInfo.course?.name || "Lớp học"}
                        </h2>
                        {classInfo.status === 'active' && (
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                <span className="relative flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                </span>
                                ONLINE
                            </div>
                        )}
                    </div>

                    {/* Thanh Bar tối giản */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-2 sm:p-3 shadow-sm flex flex-wrap items-center gap-4 sm:gap-10">
                        <div className="flex items-center gap-2 px-3 border-r border-slate-100 sm:pr-10">
                            <Users className="w-4 h-4 text-slate-400" />
                            <div className="flex flex-col">
                                <span className="text-[9px] font-bold text-slate-400 leading-none uppercase mb-1">Sĩ số</span>
                                <span className="text-sm font-bold text-slate-700">{students?.length || 0}/{classInfo.max_students}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 px-3 border-r border-slate-100 sm:pr-10">
                            {classInfo.course?.mode === "online" ? (
                                <Monitor className="w-4 h-4 text-slate-400" />
                            ) : (
                                <Building2 className="w-4 h-4 text-slate-400" />
                            )}
                            <div className="flex flex-col">
                                <span className="text-[9px] font-bold text-slate-400 leading-none uppercase mb-1">Hình thức</span>
                                <span className="text-sm font-bold text-slate-700 uppercase">{classInfo.course?.mode === "online" ? "Online" : "Offline"}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 ml-auto pr-2">
                            <Link href={`/teacher/classes/${id}?tab=progress`}>
                                <Button size="sm" variant="ghost" className="h-9 px-4 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50 font-bold text-xs transition-all">
                                    <BarChart3 className="w-4 h-4 mr-2" />
                                    Tiến độ
                                </Button>
                            </Link>
                            <Link href={`/teacher/classes/${id}?tab=behavior`}>
                                <Button size="sm" variant="ghost" className="h-9 px-4 rounded-xl text-slate-600 hover:text-red-600 hover:bg-red-50 font-bold text-xs transition-all">
                                    <ShieldAlert className="w-4 h-4 mr-2" />
                                    Hành vi
                                </Button>
                            </Link>
                            <Link href={`/teacher/classes/${id}/points`}>
                                <Button size="sm" variant="ghost" className="h-9 px-4 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 font-bold text-xs transition-all">
                                    <Trophy className="w-4 h-4 mr-2" />
                                    Điểm tích lũy
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* TABS SECTION */}
            <Tabs key={defaultTab} defaultValue={defaultTab} className="w-full">
                <TabsList className="w-full justify-start bg-white border border-slate-200 rounded-xl p-1 h-auto flex-wrap gap-1">
                    <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white font-semibold px-4 py-2 text-sm">
                        <BookOpen className="w-4 h-4 mr-2" /> Tổng quan
                    </TabsTrigger>

                    <TabsTrigger value="students" className="rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white font-semibold px-4 py-2 text-sm">
                        <Users className="w-4 h-4 mr-2" /> Quản lý danh sách học sinh
                    </TabsTrigger>
                    <TabsTrigger value="attendance" className="rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white font-semibold px-4 py-2 text-sm">
                        <Calendar className="w-4 h-4 mr-2" /> Điểm danh
                    </TabsTrigger>
                    <TabsTrigger value="schedule" className="rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white font-semibold px-4 py-2 text-sm">
                        <Calendar className="w-4 h-4 mr-2" /> Lịch dạy
                    </TabsTrigger>
                    <TabsTrigger value="lessons" className="rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white font-semibold px-4 py-2 text-sm">
                        <FileText className="w-4 h-4 mr-2" /> Quản lý bài học
                    </TabsTrigger>
                    <TabsTrigger value="exams_homework" className="rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white font-semibold px-4 py-2 text-sm">
                        <ClipboardList className="w-4 h-4 mr-2" /> Kiểm tra & Bài tập
                    </TabsTrigger>
                    <TabsTrigger value="announcements_feedback" className="rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white font-semibold px-4 py-2 text-sm">
                        <MessageSquare className="w-4 h-4 mr-2" /> TB & Feedback
                    </TabsTrigger>
                </TabsList>

                {/* ===== TAB: TỔNG QUAN ===== */}
                <TabsContent value="overview" className="mt-6">
                    <Suspense fallback={<div className="p-12 text-center text-slate-500 text-sm mt-6"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>Đang tải phân tích lớp học...</div>}>
                        <OverviewAnalyticsTabData classId={id} className={classInfo.name} />
                    </Suspense>
                </TabsContent>



                {/* ===== TAB: HỌC VIÊN ===== */}
                <TabsContent value="students" className="mt-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center">
                                <Users className="w-5 h-5 mr-2 text-blue-500" /> Danh sách học sinh và phụ huynh
                            </h3>
                            <Link href={`/teacher/classes/${id}/students`}>
                                <Button className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
                                    Quản lý Điểm số <ExternalLink className="w-4 h-4 ml-2" />
                                </Button>
                            </Link>
                        </div>
                        {students && students.length > 0 ? (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                                            <TableHead className="w-16 text-center">STT</TableHead>
                                            <TableHead>Học sinh</TableHead>
                                            <TableHead>Liên hệ học sinh</TableHead>
                                            <TableHead>Phụ huynh giám hộ</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {students.map((student: any, index: number) => (
                                            <TableRow key={student.student_id} className="hover:bg-slate-50/50">
                                                <TableCell className="text-center font-medium text-slate-500">
                                                    {index + 1}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-semibold text-slate-900">{student.name || "Chưa cập nhật"}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm">
                                                        <div className="text-slate-600">{student.email || "—"}</div>
                                                        <div className="text-slate-500">{student.phone || "—"}</div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {student.parents && student.parents.length > 0 ? (
                                                        <div className="space-y-2">
                                                            {student.parents.map((p: any, i: number) => (
                                                                <div key={i} className="text-sm bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex flex-col gap-0.5 max-w-sm">
                                                                    <div className="font-medium text-slate-800 flex items-center justify-between">
                                                                        <span>{p.full_name || "Chưa cập nhật"}</span>
                                                                        <Badge variant="outline" className="text-[10px] font-semibold py-0">{p.relationship || "Tự do"}</Badge>
                                                                    </div>
                                                                    {p.phone && <div className="text-slate-500 text-xs">SĐT: {p.phone}</div>}
                                                                    {p.email && <div className="text-slate-500 text-xs truncate">Email: {p.email}</div>}
                                                                    {(!p.phone && !p.email) && <div className="text-slate-400 text-xs italic">Không có thông tin liên hệ</div>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-slate-400 italic">Chưa liên kết phụ huynh</span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className="p-12 flex flex-col items-center text-center justify-center">
                                <Users className="w-12 h-12 text-slate-200 mb-3" />
                                <h4 className="text-base font-medium text-slate-700">Lớp chưa có học sinh</h4>
                                <p className="text-sm text-slate-500 mt-1 max-w-sm">Danh sách học sinh sẽ được quản trị viên thêm vào lớp sau.</p>
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* ===== TAB: ĐIỂM DANH ===== */}
                <TabsContent value="attendance" className="mt-6">
                    <div className="mb-4">
                        <h3 className="text-xl font-bold text-slate-900 border-l-4 border-emerald-500 pl-3">
                            Điểm danh lớp học
                        </h3>
                        <p className="text-slate-500 mt-1 pl-4 text-sm">
                            Đánh dấu tình trạng chuyên cần của học viên. Chọn ngày và lưu điểm danh.
                        </p>
                    </div>
                    <AttendanceClient
                        classId={id}
                        className={classInfo?.name || "Lớp học"}
                        students={students || []}
                    />
                </TabsContent>

                {/* ===== TAB: XẾP LỊCH & PHÒNG ===== */}
                <TabsContent value="schedule" className="mt-6 space-y-6">
                    <Suspense fallback={<div className="p-12 text-center text-slate-500">Đang tải lịch dạy...</div>}>
                        <ScheduleTabData classId={id} classInfo={classInfo} />
                    </Suspense>
                </TabsContent>

                {/* ===== TAB: BÀI HỌC (E-Learning Curriculum) ===== */}
                <TabsContent value="lessons" className="mt-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 flex items-center">
                                    <BookOpen className="w-5 h-5 mr-2 text-indigo-500" /> Nội dung Bài giảng
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">{lessonCount} bài học • {publishedCount} đã xuất bản cho học sinh</p>
                            </div>
                            <Link href={`/teacher/classes/${id}/content`}>
                                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 h-10 rounded-xl shadow-sm">
                                    <PlusCircle className="w-4 h-4 mr-2" /> Mở Lesson Builder
                                </Button>
                            </Link>
                        </div>

                        {tree.length > 0 ? (
                            <div className="divide-y divide-slate-50">
                                {tree.map((node: any) => renderCourseNode(node, 0, id))}
                            </div>
                        ) : (
                            <div className="p-12 text-center">
                                <BookOpen className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                <p className="text-slate-500 font-medium">Chưa có bài giảng nào.</p>
                                <p className="text-sm text-slate-400 mt-1">Nhấn "Mở Lesson Builder" để bắt đầu soạn nội dung.</p>
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* ===== TAB: THÔNG BÁO & FEEDBACK ===== */}
                <TabsContent value="announcements_feedback" className="mt-6 space-y-6">
                    <Suspense fallback={<div className="p-12 text-center text-slate-500">Đang tải thông báo...</div>}>
                        <AnnouncementsTabData classId={id} classInfo={classInfo} />
                    </Suspense>
                </TabsContent>

                {/* ===== TAB: TIẾN ĐỘ HỌC VIÊN ===== */}
                <TabsContent value="progress" className="mt-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 flex items-center">
                                    <BarChart3 className="w-5 h-5 mr-2 text-indigo-500" /> Tiến độ Học viên
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    Theo dõi tiến độ hoàn thành bài học và điểm trắc nghiệm của từng học viên
                                </p>
                            </div>
                        </div>
                        <Suspense fallback={<div className="p-12 text-center text-slate-500">Đang tải tiến độ học tập...</div>}>
                            <ProgressTabData classId={id} />
                        </Suspense>
                    </div>
                </TabsContent>

                {/* ===== TAB: KIỂM TRA & BÀI TẬP ===== */}
                <TabsContent value="exams_homework" className="mt-6 space-y-6">
                    <Suspense fallback={<div className="p-12 text-center text-slate-500">Đang tải bài tập và kiểm tra...</div>}>
                        <ExamsHomeworkTabData classId={id} />
                    </Suspense>
                </TabsContent>

                {/* ===== TAB: HÀNH VI HỌC SINH ===== */}
                <TabsContent value="behavior" className="mt-6">
                    <div className="mb-4">
                        <h3 className="text-xl font-bold text-slate-900 border-l-4 border-red-500 pl-3">
                            Theo dõi hành vi học sinh
                        </h3>
                        <p className="text-slate-500 mt-1 pl-4 text-sm">
                            AI phân tích hành vi và phát hiện dấu hiệu “Gaming the System”. Dữ liệu cập nhật khi học sinh hoàn thành bài.
                        </p>
                    </div>
                    <Suspense fallback={<div className="p-12 text-center text-slate-500">Đang tải biểu đồ hành vi...</div>}>
                        <BehaviorTabData classId={id} />
                    </Suspense>
                </TabsContent>
            </Tabs>
        </div>
    );
}

// ==========================================
// THÀNH PHẦN WRAPPER SUSPENSE (SERVER COMPONENTS)
// ==========================================

async function ScheduleTabData({ classId, classInfo }: { classId: string; classInfo: any }) {
    const [{ data: roomsData }, { data: schedulesData }, { data: sessionsData }] = await Promise.all([
        getRooms(),
        getClassSchedules(classId),
        getGeneratedSessions(classId)
    ]);
    return (
        <>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h4 className="font-semibold text-slate-800 mb-4 whitespace-nowrap">Lịch dạy hiện tại (Do Admin sắp xếp)</h4>
                <ScheduleManagerClient
                    classId={classId}
                    initialSchedules={schedulesData || []}
                    allRooms={roomsData || []}
                    readOnly={true}
                />
            </div>
            <TeacherLeaveClient
                classId={classId}
                className={classInfo?.name || "Lớp học"}
                sessions={sessionsData || []}
            />
        </>
    );
}

async function AnnouncementsTabData({ classId, classInfo }: { classId: string; classInfo: any }) {
    const announcementsResult = await fetchClassAnnouncements(classId);
    const classAnnouncements = (announcementsResult as any)?.data || [];
    return (
        <>
            <div className="w-full">
                <AnnouncementComposer classId={classId} initialAnnouncements={classAnnouncements} />
            </div>

            <div className="space-y-4 mt-8">
                <h4 className="font-bold text-slate-800 border-l-4 border-slate-400 pl-3">Lịch sử Thông báo</h4>
                {classAnnouncements.length > 0 ? (
                    classAnnouncements.map((ann: any) => (
                        <div key={ann.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                                <h5 className="font-bold text-slate-900 text-lg leading-tight">{ann.title}</h5>
                                <span className="text-[10px] sm:text-xs font-semibold text-slate-400 bg-slate-50 px-3 py-1 rounded-full whitespace-nowrap ml-4 border border-slate-100">
                                    {new Date(ann.created_at).toLocaleDateString("vi-VN", { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <p className="text-slate-600 text-sm whitespace-pre-wrap leading-relaxed">{ann.content}</p>
                            <div className="flex gap-2 mt-4 pt-4 border-t border-slate-50">
                                <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100">Phụ huynh</Badge>
                                <Badge variant="secondary" className="bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100">Học sinh</Badge>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="p-10 text-center bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                        <Bell className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">Chưa có thông báo nào được gửi đi.</p>
                    </div>
                )}
            </div>
            
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-8">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-purple-500" /> Ý kiến Phản hồi
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">Học sinh và phụ huynh gửi thắc mắc, phản ánh.</p>
                    </div>
                    <Link href={`/teacher/classes/${classId}/feedback`}>
                        <Button variant="outline" className="text-purple-600 border-purple-200 hover:bg-purple-50">
                            Chi tiết <ExternalLink className="w-4 h-4 ml-2" />
                        </Button>
                    </Link>
                </div>
                <div className="p-8 text-center bg-slate-50">
                    <MessageSquare className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">Bạn hiện không có phản hồi nào mới.</p>
                </div>
            </div>
        </>
    );
}

async function ProgressTabData({ classId }: { classId: string }) {
    const { data: studentProgress } = await fetchStudentProgressForClass(classId);
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {studentProgress && studentProgress.length > 0 ? (
                studentProgress.map((p: any) => {
                    const percent = p.progressPercent || 0;
                    return (
                        <div key={p.studentId} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
                            <Avatar className="w-14 h-14 mb-3 border-2 border-indigo-100">
                                <AvatarFallback className="bg-indigo-50 text-indigo-600 font-bold">{p.name?.charAt(0) || "?"}</AvatarFallback>
                            </Avatar>
                            <h4 className="font-bold text-slate-900">{p.name || "N/A"}</h4>
                            <div className="w-full bg-slate-100 rounded-full h-2 mt-4 overflow-hidden mb-1">
                                <div
                                    className={`h-2 rounded-full transition-all ${percent >= 80 ? 'bg-emerald-500' : percent >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                    style={{ width: `${percent}%` }}
                                />
                            </div>
                            <span className="text-xs font-bold text-slate-500 mb-3">{percent}% Hoàn thành</span>
                            <Link href={`/teacher/classes/${classId}/students?studentId=${p.studentId}`} className="w-full mt-auto">
                                <Button variant="outline" size="sm" className="w-full">Xem chi tiết</Button>
                            </Link>
                        </div>
                    );
                })
            ) : (
                <div className="col-span-full p-12 text-center text-slate-500">Chưa có dữ liệu tiến độ.</div>
            )}
        </div>
    );
}

async function ExamsHomeworkTabData({ classId }: { classId: string }) {
    const [{ data: classExams }, { data: classHomework }, { data: examPending }, { data: hwPending }] = await Promise.all([
        fetchClassExams(classId),
        fetchClassHomework(classId),
        fetchPendingExamGradingStats(classId),
        fetchPendingHomeworkGradingStats(classId),
    ]);

    const examPendingMap: Record<string, number> = (examPending || {}) as Record<string, number>;
    const hwPendingMap: Record<string, number> = (hwPending || {}) as Record<string, number>;

    // Phân loại homework: bình thường vs cải thiện
    const regularHomework = (classHomework || []).filter((hw: any) => !hw.title.startsWith('[Cải thiện]'));
    const improvementHomework = (classHomework || []).filter((hw: any) => hw.title.startsWith('[Cải thiện]'));

    // Phân Active vs History:
    // Active = còn submission pending HOẶC chưa ai nộp
    // History = tất cả submission đã graded (hoặc không có pending)
    const activeExams = (classExams || []).filter((e: any) => (examPendingMap[e.id] || 0) > 0 || !e.is_published);
    const historyExams = (classExams || []).filter((e: any) => (examPendingMap[e.id] || 0) === 0 && e.is_published);

    const activeHw = regularHomework.filter((hw: any) => (hwPendingMap[hw.id] || 0) > 0);
    const historyHw = regularHomework.filter((hw: any) => (hwPendingMap[hw.id] || 0) === 0);

    const activeImprov = improvementHomework.filter((hw: any) => (hwPendingMap[hw.id] || 0) > 0);
    const historyImprov = improvementHomework.filter((hw: any) => (hwPendingMap[hw.id] || 0) === 0);

    const totalPending = (Object.values(examPendingMap) as number[]).reduce((a, b) => a + b, 0) + (Object.values(hwPendingMap) as number[]).reduce((a, b) => a + b, 0);

    // Helper render function for a single exam row
    const renderExamRow = (exam: any) => {
        const pending = examPendingMap[exam.id] || 0;
        return (
            <div key={exam.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-slate-800 text-base">{exam.title}</h4>
                        {pending > 0 && (
                            <Badge className="bg-red-500 text-white border-0 text-[10px] px-2 py-0.5 animate-pulse">
                                <AlertCircle className="w-3 h-3 mr-1" /> {pending} bài cần chấm
                            </Badge>
                        )}
                    </div>
                    <div className="flex gap-4 mt-2 text-xs font-medium text-slate-500">
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Dài: {exam.duration_minutes || exam.duration}p</span>
                        <span>Tổng: {exam.total_points} điểm</span>
                        <span>{((exam.questions as any[]) || []).length} câu hỏi</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Link href={`/teacher/classes/${classId}/exams/${exam.id}/analytics`}>
                        <Button size="sm" variant="outline" className="border-emerald-200 text-emerald-600 hover:bg-emerald-50"><BarChart3 className="w-4 h-4 mr-1.5" /> Thống kê</Button>
                    </Link>
                    <Link href={`/teacher/classes/${classId}/exams/${exam.id}/edit`}>
                        <Button variant="outline" size="sm"><Pencil className="w-4 h-4 text-slate-500"/></Button>
                    </Link>
                    <DeleteExamButton examId={exam.id} classId={classId} />
                </div>
            </div>
        );
    };

    // Helper render function for a single homework row
    const renderHwRow = (hw: any) => {
        const pending = hwPendingMap[hw.id] || 0;
        return (
            <div key={hw.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-slate-800">{hw.title.replace('[Cải thiện] ', '')}</h4>
                        {pending > 0 && (
                            <Badge className="bg-red-500 text-white border-0 text-[10px] px-2 py-0.5 animate-pulse">
                                <AlertCircle className="w-3 h-3 mr-1" /> {pending} bài cần chấm
                            </Badge>
                        )}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                        <span>{hw.total_points || 0} điểm</span> • <span>Hạn: {hw.due_date ? new Date(hw.due_date).toLocaleDateString('vi-VN') : 'Không có'}</span>
                    </div>
                </div>
                <div className="flex gap-2 items-center shrink-0">
                    <Link href={`/teacher/classes/${classId}/homework/${hw.id}/submissions`}>
                        <Button size="sm" variant={pending > 0 ? "default" : "outline"} className={pending > 0 ? "bg-red-600 hover:bg-red-700 text-white" : ""}>
                            {pending > 0 ? "Chấm ngay" : "Chấm điểm"}
                        </Button>
                    </Link>
                    <Link href={`/teacher/classes/${classId}/homework/${hw.id}/edit`}>
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0" title="Sửa bài tập">
                            <Pencil className="w-4 h-4 text-slate-500" />
                        </Button>
                    </Link>
                    <DeleteHomeworkButton homeworkId={hw.id} classId={classId} />
                </div>
            </div>
        );
    };

    return (
        <>
            {/* TỔNG KẾT NHANH */}
            {totalPending > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-red-800">Bạn có <span className="text-red-600">{totalPending}</span> bài nộp đang chờ chấm điểm thủ công</p>
                        <p className="text-xs text-red-600/70 mt-0.5">Bao gồm các bài có câu tự luận, video hoặc file đính kèm cần giáo viên xem xét.</p>
                    </div>
                </div>
            )}

            {/* === SECTION 1: BÀI KIỂM TRA === */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center">
                            <FileText className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">Bài kiểm tra</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Đề thi trắc nghiệm, tự luận, tổng hợp</p>
                        </div>
                    </div>
                    <Link href={`/teacher/classes/${classId}/exams/create`}>
                        <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl">
                            <PlusCircle className="w-4 h-4 mr-2" /> Tạo đề thi
                        </Button>
                    </Link>
                </div>
                {(classExams || []).length > 0 ? (
                    <>
                        {activeExams.length > 0 && (
                            <div className="divide-y divide-slate-100">
                                {activeExams.map(renderExamRow)}
                            </div>
                        )}
                        {historyExams.length > 0 && (
                            <details className="group">
                                <summary className="px-6 py-3 bg-slate-50 text-xs font-bold text-slate-500 cursor-pointer hover:bg-slate-100 flex items-center gap-2 select-none border-t border-slate-100">
                                    <History className="w-3.5 h-3.5" /> Đã hoàn thành ({historyExams.length})
                                    <ChevronRight className="w-3.5 h-3.5 ml-auto transition-transform group-open:rotate-90" />
                                </summary>
                                <div className="divide-y divide-slate-100 bg-slate-50/50">
                                    {historyExams.map(renderExamRow)}
                                </div>
                            </details>
                        )}
                    </>
                ) : (
                    <div className="p-8 text-center text-slate-500">
                        <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                        Lớp chưa có Bài kiểm tra nào.
                    </div>
                )}
            </div>

            {/* === SECTION 2: BÀI TẬP VỀ NHÀ === */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <Home className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">Bài tập về nhà</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Bài tập trắc nghiệm, tự luận, nộp file</p>
                        </div>
                    </div>
                    <Link href={`/teacher/classes/${classId}/homework/create`}>
                        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl">
                            <PlusCircle className="w-4 h-4 mr-2" /> Tạo bài tập
                        </Button>
                    </Link>
                </div>
                {regularHomework.length > 0 ? (
                    <>
                        {activeHw.length > 0 && (
                            <div className="divide-y divide-slate-100">
                                {activeHw.map(renderHwRow)}
                            </div>
                        )}
                        {historyHw.length > 0 && (
                            <details className="group">
                                <summary className="px-6 py-3 bg-slate-50 text-xs font-bold text-slate-500 cursor-pointer hover:bg-slate-100 flex items-center gap-2 select-none border-t border-slate-100">
                                    <History className="w-3.5 h-3.5" /> Đã hoàn thành ({historyHw.length})
                                    <ChevronRight className="w-3.5 h-3.5 ml-auto transition-transform group-open:rotate-90" />
                                </summary>
                                <div className="divide-y divide-slate-100 bg-slate-50/50">
                                    {historyHw.map(renderHwRow)}
                                </div>
                            </details>
                        )}
                    </>
                ) : (
                    <div className="p-8 text-center text-slate-500">
                        <Home className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                        Chưa có bài tập về nhà nào.
                    </div>
                )}
            </div>

            {/* === SECTION 3: BÀI TẬP CẢI THIỆN === */}
            {improvementHomework.length > 0 && (
                <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-amber-100 flex items-center justify-between bg-amber-50/30">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center">
                                <Zap className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">Bài tập cải thiện</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Bài tập bổ trợ cho học sinh cần cải thiện điểm số</p>
                            </div>
                        </div>
                    </div>
                    {activeImprov.length > 0 && (
                        <div className="divide-y divide-amber-100">
                            {activeImprov.map(renderHwRow)}
                        </div>
                    )}
                    {historyImprov.length > 0 && (
                        <details className="group">
                            <summary className="px-6 py-3 bg-amber-50/50 text-xs font-bold text-slate-500 cursor-pointer hover:bg-amber-50 flex items-center gap-2 select-none border-t border-amber-100">
                                <History className="w-3.5 h-3.5" /> Đã hoàn thành ({historyImprov.length})
                                <ChevronRight className="w-3.5 h-3.5 ml-auto transition-transform group-open:rotate-90" />
                            </summary>
                            <div className="divide-y divide-amber-100 bg-amber-50/20">
                                {historyImprov.map(renderHwRow)}
                            </div>
                        </details>
                    )}
                </div>
            )}
        </>
    );
}

async function BehaviorTabData({ classId }: { classId: string }) {
    const behaviorResult = await fetchClassBehaviorScores(classId);
    const behaviorData = (behaviorResult as any)?.data || [];
    return <StudentBehaviorPanel data={behaviorData} />;
}

async function OverviewAnalyticsTabData({ classId, className }: { classId: string; className: string }) {
    const reportData = await fetchClassScoreReport(classId);
    return <ClassOverviewAnalyticsClient classId={classId} className={className} reportData={reportData?.data} />;
}
