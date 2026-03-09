import { ArrowLeft, BookOpen, Calendar, Users, MapPin, Bell, FileText, MessageSquare, Video, PlusCircle, Clock, ChevronDown, Monitor, Building2, Folder, CheckSquare, Music, ClipboardList, VideoIcon, Eye, EyeOff, ExternalLink, BarChart3, CheckCircle2, Circle, Trophy, Activity, Pencil, Trash2, Home } from "lucide-react";
import Link from "next/link";
import { fetchClassDetails, fetchClassStudents, fetchStudentProgressForClass } from "./actions";
import { fetchCourseItems } from "@/lib/actions/courseBuilder";
import { fetchClassExams } from "@/lib/actions/exam";
import { fetchClassHomework } from "@/lib/actions/homework";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AttendanceClient from "./AttendanceClient";
import ScheduleManagerClient from "./ScheduleManagerClient";
import { getRooms, getClassSchedules } from "@/lib/actions/schedule";

export default async function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    // Fetch tất cả dữ liệu song song
    const [
        { data: classInfo, error: classError },
        { data: students, error: studentsError },
        { data: courseItems },
        { data: roomsData },
        { data: schedulesData },
        { data: studentProgress },
        { data: classExams },
        { data: classHomework }
    ] = await Promise.all([
        fetchClassDetails(id),
        fetchClassStudents(id),
        fetchCourseItems(id),
        getRooms(),
        getClassSchedules(id),
        fetchStudentProgressForClass(id),
        fetchClassExams(id),
        fetchClassHomework(id)
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

                <div className="bg-gradient-to-r from-slate-900 to-indigo-900 p-6 rounded-2xl shadow-lg text-white flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-2xl md:text-3xl font-extrabold">
                                {classInfo.name ? `${classInfo.name}` : ""} — {classInfo.course?.name || "Lớp học"}
                            </h2>
                            <Badge className="bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border-none text-xs py-0.5">
                                {classInfo.status === 'active' ? 'Đang hoạt động' : 'Kết thúc'}
                            </Badge>
                        </div>
                        <p className="text-slate-300 font-medium text-sm">{classInfo.course?.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 bg-white/10 p-4 rounded-xl border border-white/10 text-sm text-slate-200 shrink-0">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-indigo-300" />
                            <span className="font-medium">{classInfo.schedule ? (typeof classInfo.schedule === 'string' ? classInfo.schedule : JSON.stringify(classInfo.schedule)) : "Chưa có lịch"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {classInfo.course?.mode === "online" ? (
                                <Monitor className="w-4 h-4 text-emerald-300" />
                            ) : (
                                <Building2 className="w-4 h-4 text-blue-300" />
                            )}
                            <span className="font-medium">{classInfo.course?.mode === "online" ? "Online" : "Offline"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-300" />
                            <span className="font-medium">Sĩ số: {students?.length || 0} / {classInfo.max_students}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-emerald-300" />
                            <span className="font-medium">Bài giảng: {lessonCount} ({publishedCount} đã xuất bản)</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* TABS SECTION */}
            <Tabs defaultValue="overview" className="w-full">
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
                    <TabsTrigger value="exams" className="rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white font-semibold px-4 py-2 text-sm">
                        <ClipboardList className="w-4 h-4 mr-2" /> Kiểm tra
                    </TabsTrigger>
                    <TabsTrigger value="homework" className="rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white font-semibold px-4 py-2 text-sm">
                        <Home className="w-4 h-4 mr-2" /> Bài tập
                    </TabsTrigger>
                    <TabsTrigger value="announcements" className="rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white font-semibold px-4 py-2 text-sm">
                        <Bell className="w-4 h-4 mr-2" /> Thông báo
                    </TabsTrigger>
                    <TabsTrigger value="progress" className="rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white font-semibold px-4 py-2 text-sm">
                        <BarChart3 className="w-4 h-4 mr-2" /> Tiến độ
                    </TabsTrigger>
                    <TabsTrigger value="feedback" className="rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white font-semibold px-4 py-2 text-sm">
                        <MessageSquare className="w-4 h-4 mr-2" /> Feedback
                    </TabsTrigger>
                </TabsList>

                {/* ===== TAB: TỔNG QUAN ===== */}
                <TabsContent value="overview" className="mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                            <h4 className="font-bold text-slate-900 mb-4 flex items-center">
                                <Users className="w-5 h-5 mr-2 text-blue-500" /> Học viên
                            </h4>
                            <p className="text-4xl font-black text-slate-900">{students?.length || 0}</p>
                            <p className="text-sm text-slate-500 mt-1">/ {classInfo.max_students} suất</p>
                            <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
                                <div
                                    className="bg-blue-500 h-2 rounded-full transition-all"
                                    style={{ width: `${Math.min(((students?.length || 0) / (classInfo.max_students || 1)) * 100, 100)}%` }}
                                />
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                            <h4 className="font-bold text-slate-900 mb-4 flex items-center">
                                <FileText className="w-5 h-5 mr-2 text-indigo-500" /> Bài giảng
                            </h4>
                            <p className="text-4xl font-black text-slate-900">{lessonCount}</p>
                            <p className="text-sm text-slate-500 mt-1">{publishedCount} đã xuất bản</p>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                            <h4 className="font-bold text-slate-900 mb-4 flex items-center">
                                <Calendar className="w-5 h-5 mr-2 text-emerald-500" /> Lịch dạy
                            </h4>
                            <p className="text-base text-slate-700 font-semibold whitespace-pre-wrap leading-relaxed">
                                {classInfo.schedule
                                    ? (typeof classInfo.schedule === 'string' ? classInfo.schedule : JSON.stringify(classInfo.schedule, null, 2))
                                    : "Chưa sắp xếp lịch dạy"}
                            </p>
                        </div>
                    </div>
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
                                    Quản lý Học viên Chuyên sâu <ExternalLink className="w-4 h-4 ml-2" />
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
                    {studentsError ? (
                        <div className="text-red-500 p-4 bg-red-50 rounded-xl">Lỗi tải danh sách học sinh: {studentsError}</div>
                    ) : (
                        <AttendanceClient
                            classId={id}
                            className={classInfo?.name || "Lớp học"}
                            students={students || []}
                        />
                    )}
                </TabsContent>

                {/* ===== TAB: XẾP LỊCH & PHÒNG ===== */}
                <TabsContent value="schedule" className="mt-6 space-y-6">
                    <div>
                        <h4 className="font-semibold text-slate-800 mb-4 whitespace-nowrap">Lịch khai báo với hệ thống (Phòng máy/Ca dạy)</h4>
                        <ScheduleManagerClient
                            classId={id}
                            initialSchedules={schedulesData || []}
                            allRooms={roomsData || []}
                            readOnly={true}
                        />
                    </div>
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

                {/* ===== TAB: THÔNG BÁO ===== */}
                <TabsContent value="announcements" className="mt-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center">
                                <Bell className="w-5 h-5 mr-2 text-amber-500" /> Thông báo chung đến nhóm
                            </h3>
                            <Button className="bg-amber-500 hover:bg-amber-600 text-white shadow-sm">
                                <PlusCircle className="w-4 h-4 mr-2" /> Tạo thông báo mới
                            </Button>
                        </div>

                        <div className="space-y-4">
                            {/* Placeholder thông báo mẫu */}
                            <div className="border border-amber-100 bg-amber-50/50 rounded-xl p-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                                        <Bell className="w-4 h-4 text-amber-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-900 text-sm">Chào mừng các bạn đến với lớp học!</h4>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Đây là kênh thông báo chung của lớp. Giáo viên sẽ gửi các thông báo quan trọng tại đây.
                                        </p>
                                        <p className="text-[11px] text-slate-400 mt-2">Hôm nay</p>
                                    </div>
                                </div>
                            </div>

                            <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl">
                                <p className="text-sm text-slate-400">Tính năng Thông báo sẽ được cập nhật đầy đủ trong phiên bản tiếp theo.</p>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {/* ===== TAB: FEEDBACK ===== */}
                <TabsContent value="feedback" className="mt-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center">
                                <MessageSquare className="w-5 h-5 mr-2 text-violet-500" /> Kết quả & Phản hồi Học viên
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Kết quả bài học */}
                            <div className="border border-slate-200 rounded-xl p-5">
                                <h4 className="font-bold text-slate-800 mb-4 flex items-center text-sm">
                                    <FileText className="w-4 h-4 mr-2 text-indigo-500" /> Kết quả Bài tập gần đây
                                </h4>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800">Tổng nội dung đã tạo</p>
                                            <p className="text-xs text-slate-500">Tất cả bài giảng</p>
                                        </div>
                                        <span className="text-2xl font-black text-indigo-600">{lessonCount}</span>
                                    </div>
                                    <div className="text-center py-4 border border-dashed border-slate-200 rounded-lg">
                                        <p className="text-sm text-slate-400">Dữ liệu chi tiết kết quả bài tập sẽ hiển thị khi có bài nộp.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Feedback sinh viên */}
                            <div className="border border-slate-200 rounded-xl p-5">
                                <h4 className="font-bold text-slate-800 mb-4 flex items-center text-sm">
                                    <MessageSquare className="w-4 h-4 mr-2 text-violet-500" /> Phản hồi từ Học viên
                                </h4>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 bg-violet-50 rounded-lg">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800">Đánh giá trung bình</p>
                                            <p className="text-xs text-slate-500">Dựa trên phản hồi học viên</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="text-2xl font-black text-violet-600">—</span>
                                        </div>
                                    </div>
                                    <div className="text-center py-4 border border-dashed border-slate-200 rounded-lg">
                                        <p className="text-sm text-slate-400">Chưa có phản hồi nào từ học viên.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
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

                        {studentProgress && studentProgress.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-200 bg-slate-50/50">
                                            <th className="text-left py-3 px-5 font-bold text-slate-700">#</th>
                                            <th className="text-left py-3 px-5 font-bold text-slate-700">Học viên</th>
                                            <th className="text-left py-3 px-5 font-bold text-slate-700">Tiến độ</th>
                                            <th className="text-center py-3 px-5 font-bold text-slate-700">Hoàn thành</th>
                                            <th className="text-center py-3 px-5 font-bold text-slate-700">Điểm TB Quiz</th>
                                            <th className="text-center py-3 px-5 font-bold text-slate-700">Lần truy cập</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {studentProgress.map((sp: any, idx: number) => (
                                            <tr key={sp.studentId} className="border-b border-slate-50 hover:bg-indigo-50/30 transition-colors">
                                                <td className="py-3.5 px-5 text-slate-400 font-medium">{idx + 1}</td>
                                                <td className="py-3.5 px-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs">
                                                            {sp.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-slate-800">{sp.name}</p>
                                                            <p className="text-[11px] text-slate-400">{sp.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden min-w-[80px]">
                                                            <div
                                                                className={`h-2.5 rounded-full transition-all ${sp.progressPercent >= 80 ? 'bg-emerald-500' :
                                                                    sp.progressPercent >= 40 ? 'bg-indigo-500' :
                                                                        sp.progressPercent > 0 ? 'bg-amber-500' : 'bg-slate-200'
                                                                    }`}
                                                                style={{ width: `${sp.progressPercent}%` }}
                                                            />
                                                        </div>
                                                        <span className={`text-xs font-bold min-w-[36px] text-right ${sp.progressPercent >= 80 ? 'text-emerald-600' :
                                                            sp.progressPercent >= 40 ? 'text-indigo-600' :
                                                                sp.progressPercent > 0 ? 'text-amber-600' : 'text-slate-400'
                                                            }`}>
                                                            {sp.progressPercent}%
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-5 text-center">
                                                    <span className="text-sm font-semibold text-slate-700">
                                                        {sp.completedItems}/{sp.totalItems}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-5 text-center">
                                                    {sp.avgQuizScore !== null ? (
                                                        <span className={`text-sm font-bold ${sp.avgQuizScore >= 8 ? 'text-emerald-600' :
                                                            sp.avgQuizScore >= 5 ? 'text-indigo-600' : 'text-red-500'
                                                            }`}>
                                                            {sp.avgQuizScore}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-slate-400">Chưa làm</span>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-5 text-center">
                                                    {sp.lastActive ? (
                                                        <span className="text-xs text-slate-500">
                                                            {new Date(sp.lastActive).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-slate-400">Chưa truy cập</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {/* Summary Stats */}
                                <div className="grid grid-cols-3 gap-4 p-5 bg-slate-50/50 border-t border-slate-100">
                                    <div className="text-center">
                                        <p className="text-2xl font-black text-emerald-600">
                                            {studentProgress.filter((s: any) => s.progressPercent === 100).length}
                                        </p>
                                        <p className="text-xs text-slate-500 font-medium">Hoàn thành 100%</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-black text-indigo-600">
                                            {studentProgress.filter((s: any) => s.progressPercent > 0 && s.progressPercent < 100).length}
                                        </p>
                                        <p className="text-xs text-slate-500 font-medium">Đang học</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-black text-red-500">
                                            {studentProgress.filter((s: any) => s.progressPercent === 0).length}
                                        </p>
                                        <p className="text-xs text-slate-500 font-medium">Chưa bắt đầu</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-12 text-center">
                                <Activity className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                <p className="text-slate-500 font-medium">Chưa có dữ liệu tiến độ.</p>
                                <p className="text-sm text-slate-400 mt-1">Khi học viên bắt đầu học, tiến độ sẽ hiển thị ở đây.</p>
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* ===== TAB: KIỂM TRA ===== */}
                <TabsContent value="exams" className="mt-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 flex items-center">
                                    <ClipboardList className="w-5 h-5 mr-2 text-indigo-500" /> Bài kiểm tra
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    Tạo và quản lý bài kiểm tra trắc nghiệm cho lớp
                                </p>
                            </div>
                            <Link href={`/teacher/classes/${id}/exams/create`}>
                                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                                    <PlusCircle className="w-4 h-4 mr-2" /> Tạo bài kiểm tra
                                </Button>
                            </Link>
                        </div>

                        {classExams && classExams.length > 0 ? (
                            <div className="divide-y divide-slate-100">
                                {classExams.map((exam: any) => (
                                    <div key={exam.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${exam.is_published ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-100 text-slate-400'}`}>
                                            <ClipboardList className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-slate-800">{exam.title}</p>
                                            <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {exam.duration_minutes} phút</span>
                                                <span>{exam.total_points} điểm</span>
                                                <span>{((exam.questions as any[]) || []).length} câu</span>
                                            </div>
                                        </div>
                                        {exam.is_published ? (
                                            <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[10px]" variant="outline">Đã giao</Badge>
                                        ) : (
                                            <Badge className="bg-slate-100 text-slate-500 border-slate-200 text-[10px]" variant="outline">Nháp</Badge>
                                        )}
                                        <div className="flex items-center gap-1">
                                            <Link href={`/teacher/classes/${id}/exams/${exam.id}/analytics`}>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-indigo-500 hover:text-indigo-600">
                                                    <BarChart3 className="w-4 h-4" />
                                                </Button>
                                            </Link>
                                            <Link href={`/teacher/classes/${id}/exams/${exam.id}/edit`}>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600">
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-12 text-center">
                                <ClipboardList className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                <p className="text-slate-500 font-medium">Chưa có bài kiểm tra nào.</p>
                                <p className="text-sm text-slate-400 mt-1 mb-4">
                                    Tạo bài kiểm tra trắc nghiệm để giao cho học viên.
                                </p>
                                <Link href={`/teacher/classes/${id}/exams/create`}>
                                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                        <PlusCircle className="w-4 h-4 mr-2" /> Tạo bài kiểm tra
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* ===== TAB: BÀI TẬP VỀ NHÀ ===== */}
                <TabsContent value="homework" className="mt-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 flex items-center">
                                    <Home className="w-5 h-5 mr-2 text-emerald-500" /> Bài tập về nhà
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    Giao bài tập với 4 dạng: trắc nghiệm, tự luận, video, đính kèm
                                </p>
                            </div>
                            <Link href={`/teacher/classes/${id}/homework/create`}>
                                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                                    <PlusCircle className="w-4 h-4 mr-2" /> Tạo bài tập
                                </Button>
                            </Link>
                        </div>

                        {classHomework && classHomework.length > 0 ? (
                            <div className="divide-y divide-slate-100">
                                {classHomework.map((hw: any) => (
                                    <div key={hw.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${hw.is_published ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-100 text-slate-400'}`}>
                                            <Home className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-slate-800">{hw.title}</p>
                                            <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                                                <span>{hw.total_points} điểm</span>
                                                <span>{(hw.questions as any[] || []).length} câu</span>
                                                {hw.due_date && (
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        Hạn: {new Date(hw.due_date).toLocaleDateString('vi-VN')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {hw.is_published ? (
                                            <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[10px]" variant="outline">Đã giao</Badge>
                                        ) : (
                                            <Badge className="bg-slate-100 text-slate-500 border-slate-200 text-[10px]" variant="outline">Nháp</Badge>
                                        )}
                                        <div className="flex items-center gap-1">
                                            <Link href={`/teacher/classes/${id}/homework/${hw.id}/submissions`}>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-indigo-500 hover:text-indigo-600" title="Xem bài nộp">
                                                    <BarChart3 className="w-4 h-4" />
                                                </Button>
                                            </Link>
                                            <Link href={`/teacher/classes/${id}/homework/${hw.id}/edit`}>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600" title="Sửa">
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-12 text-center">
                                <Home className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                <p className="text-slate-500 font-medium">Chưa có bài tập nào.</p>
                                <p className="text-sm text-slate-400 mt-1 mb-4">
                                    Tạo bài tập về nhà để giao cho học viên.
                                </p>
                                <Link href={`/teacher/classes/${id}/homework/create`}>
                                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                        <PlusCircle className="w-4 h-4 mr-2" /> Tạo bài tập
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
