"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Search, UserPlus, Link2, Key, Copy, Check, Trash2, Users,
    Loader2, X, Filter
} from "lucide-react";
import { toast } from "sonner";
import {
    fetchLinkedParents, searchParents, linkParentToStudent,
    unlinkParent, generateInviteCode
} from "@/lib/actions/parentStudent";
import { useRouter } from "next/navigation";

type Student = {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
    invite_code: string | null;
    invite_code_expires_at: string | null;
    classes: string[];
    parentCount: number;
};

type ClassInfo = {
    id: string;
    name: string;
    course_id: string;
    course: { name: string } | null;
};

type CourseInfo = {
    id: string;
    name: string;
};

const RELATIONSHIPS = ["Bố", "Mẹ", "Ông", "Bà", "Người giám hộ"];

export default function AdminLinkParentClient({
    students, classes, courses
}: {
    students: Student[];
    classes: ClassInfo[];
    courses: CourseInfo[];
}) {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    // Filter states
    const [filterCourse, setFilterCourse] = useState("");
    const [filterClass, setFilterClass] = useState("");

    // Dialog states
    const [linkedParents, setLinkedParents] = useState<any[]>([]);
    const [loadingParents, setLoadingParents] = useState(false);

    // Add parent states
    const [showAddParent, setShowAddParent] = useState(false);
    const [parentSearchQuery, setParentSearchQuery] = useState("");
    const [parentSearchResults, setParentSearchResults] = useState<any[]>([]);
    const [searchingParent, setSearchingParent] = useState(false);
    const [selectedRelationship, setSelectedRelationship] = useState("Bố");
    const [linking, setLinking] = useState(false);

    // Invite code
    const [generatingCode, setGeneratingCode] = useState(false);
    const [copiedCode, setCopiedCode] = useState(false);

    // Lọc classes theo course đã chọn
    const filteredClasses = filterCourse
        ? classes.filter(c => c.course_id === filterCourse)
        : classes;

    // Lọc students theo search + course/class filters
    const filteredStudents = students.filter(s => {
        // Search filter
        const matchesSearch = !searchTerm ||
            s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.email?.toLowerCase().includes(searchTerm.toLowerCase());

        // Class filter: student must have matching class name
        let matchesClass = true;
        if (filterClass) {
            const classObj = classes.find(c => c.id === filterClass);
            matchesClass = classObj ? s.classes.includes(classObj.name) : false;
        } else if (filterCourse) {
            // Course filter: student needs at least one class from this course
            const courseClassNames = classes
                .filter(c => c.course_id === filterCourse)
                .map(c => c.name);
            matchesClass = s.classes.some(cn => courseClassNames.includes(cn));
        }

        return matchesSearch && matchesClass;
    });

    // Mở dialog chi tiết học sinh
    const openStudentDetail = async (student: Student) => {
        setSelectedStudent(student);
        setDialogOpen(true);
        setShowAddParent(false);
        setLoadingParents(true);

        const res = await fetchLinkedParents(student.id);
        setLinkedParents(res.data || []);
        setLoadingParents(false);
    };

    // Tìm phụ huynh
    const handleSearchParent = async () => {
        if (!parentSearchQuery.trim()) return;
        setSearchingParent(true);
        const res = await searchParents(parentSearchQuery);
        setParentSearchResults(res.data || []);
        setSearchingParent(false);
    };

    // Liên kết
    const handleLink = async (parentId: string) => {
        if (!selectedStudent) return;
        setLinking(true);
        const res = await linkParentToStudent(parentId, selectedStudent.id, selectedRelationship);
        if (res.error) {
            toast.error(res.error);
        } else {
            toast.success("Liên kết thành công!");
            // Refresh
            const updated = await fetchLinkedParents(selectedStudent.id);
            setLinkedParents(updated.data || []);
            setShowAddParent(false);
            setParentSearchResults([]);
            setParentSearchQuery("");
            router.refresh();
        }
        setLinking(false);
    };

    // Xóa liên kết
    const handleUnlink = async (linkId: string) => {
        if (!confirm("Bạn có chắc muốn xóa liên kết này?")) return;
        const res = await unlinkParent(linkId);
        if (res.error) {
            toast.error(res.error);
        } else {
            toast.success("Đã xóa liên kết.");
            setLinkedParents(prev => prev.filter(p => p.id !== linkId));
            router.refresh();
        }
    };

    // Tạo mã
    const handleGenerateCode = async () => {
        if (!selectedStudent) return;
        setGeneratingCode(true);
        const res = await generateInviteCode(selectedStudent.id);
        if (res.error) {
            toast.error(res.error);
        } else {
            toast.success(`Mã liên kết: ${res.code}`);
            setSelectedStudent({
                ...selectedStudent,
                invite_code: res.code,
                invite_code_expires_at: res.expiresAt,
            });
            router.refresh();
        }
        setGeneratingCode(false);
    };

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(true);
        toast.success("Đã copy mã!");
        setTimeout(() => setCopiedCode(false), 2000);
    };

    return (
        <>
            {/* Search + Filters */}
            <div className="flex flex-wrap gap-3 items-end">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Tìm học sinh theo tên hoặc email..."
                        className="pl-10"
                    />
                </div>

                {/* Course Filter */}
                <div className="min-w-[180px]">
                    <label className="text-[10px] font-semibold text-slate-500 mb-1 block flex items-center gap-1">
                        <Filter className="w-3 h-3" /> Khóa học
                    </label>
                    <select
                        value={filterCourse}
                        onChange={e => { setFilterCourse(e.target.value); setFilterClass(""); }}
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white text-slate-700 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                    >
                        <option value="">Tất cả khóa học</option>
                        {courses.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                {/* Class Filter */}
                <div className="min-w-[180px]">
                    <label className="text-[10px] font-semibold text-slate-500 mb-1 block flex items-center gap-1">
                        <Filter className="w-3 h-3" /> Lớp học
                    </label>
                    <select
                        value={filterClass}
                        onChange={e => setFilterClass(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white text-slate-700 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                    >
                        <option value="">Tất cả lớp học</option>
                        {filteredClasses.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.name} {c.course ? `(${c.course.name})` : ""}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Clear filters */}
                {(filterCourse || filterClass) && (
                    <Button variant="ghost" size="sm" onClick={() => { setFilterCourse(""); setFilterClass(""); }}
                        className="text-slate-500 hover:text-slate-700 h-9">
                        <X className="w-3.5 h-3.5 mr-1" /> Xóa bộ lọc
                    </Button>
                )}
            </div>

            {/* Result count */}
            <p className="text-xs text-slate-400">
                Hiển thị {filteredStudents.length} / {students.length} học sinh
                {filterCourse || filterClass ? " (đã lọc)" : ""}
            </p>

            {/* Student Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="text-left px-5 py-3 font-semibold text-slate-600">Học sinh</th>
                            <th className="text-left px-5 py-3 font-semibold text-slate-600">Lớp học</th>
                            <th className="text-center px-5 py-3 font-semibold text-slate-600">Phụ huynh</th>
                            <th className="text-center px-5 py-3 font-semibold text-slate-600">Mã liên kết</th>
                            <th className="text-center px-5 py-3 font-semibold text-slate-600">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredStudents.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="text-center py-12 text-slate-400">
                                    Không tìm thấy học sinh nào.
                                </td>
                            </tr>
                        ) : filteredStudents.map(student => (
                            <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                <td className="px-5 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                            {student.full_name?.charAt(0) || "?"}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-800">{student.full_name}</p>
                                            <p className="text-xs text-slate-400">{student.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-5 py-3">
                                    {student.classes.length > 0 ? (
                                        <div className="flex flex-wrap gap-1">
                                            {student.classes.map(c => (
                                                <Badge key={c} variant="outline" className="text-[10px] bg-blue-50 text-blue-600 border-blue-200">{c}</Badge>
                                            ))}
                                        </div>
                                    ) : <span className="text-slate-300 text-xs">Chưa có lớp</span>}
                                </td>
                                <td className="px-5 py-3 text-center">
                                    <Badge variant={student.parentCount > 0 ? "default" : "outline"}
                                        className={student.parentCount > 0 ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "text-slate-400"}>
                                        <Users className="w-3 h-3 mr-1" />{student.parentCount}
                                    </Badge>
                                </td>
                                <td className="px-5 py-3 text-center">
                                    {student.invite_code ? (
                                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-mono">
                                            <Key className="w-3 h-3 mr-1" />{student.invite_code}
                                        </Badge>
                                    ) : <span className="text-slate-300 text-xs">—</span>}
                                </td>
                                <td className="px-5 py-3 text-center">
                                    <Button size="sm" variant="outline" onClick={() => openStudentDetail(student)}
                                        className="text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                                        <Link2 className="w-3.5 h-3.5 mr-1" /> Quản lý
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Dialog */}
            {dialogOpen && selectedStudent && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDialogOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-lg font-bold">
                                    {selectedStudent.full_name?.charAt(0) || "?"}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-slate-900">{selectedStudent.full_name}</h3>
                                    <p className="text-sm text-slate-500">{selectedStudent.email}</p>
                                </div>
                            </div>
                            <button onClick={() => setDialogOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Mã liên kết */}
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                <h4 className="font-bold text-amber-800 text-sm mb-2 flex items-center gap-2">
                                    <Key className="w-4 h-4" /> Mã liên kết cho Phụ huynh
                                </h4>
                                {selectedStudent.invite_code ? (
                                    <div className="flex items-center gap-3">
                                        <code className="text-2xl font-bold text-amber-900 tracking-wider bg-white px-4 py-2 rounded-lg border border-amber-200">
                                            {selectedStudent.invite_code}
                                        </code>
                                        <Button size="sm" variant="outline" onClick={() => copyCode(selectedStudent.invite_code!)}
                                            className="border-amber-300 text-amber-700 hover:bg-amber-100">
                                            {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        </Button>
                                        <Button size="sm" onClick={handleGenerateCode} disabled={generatingCode}
                                            className="bg-amber-500 hover:bg-amber-600 text-white">
                                            {generatingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : "Tạo mới"}
                                        </Button>
                                    </div>
                                ) : (
                                    <Button onClick={handleGenerateCode} disabled={generatingCode}
                                        className="bg-amber-500 hover:bg-amber-600 text-white">
                                        {generatingCode ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Key className="w-4 h-4 mr-2" />}
                                        Tạo mã liên kết (hiệu lực 7 ngày)
                                    </Button>
                                )}
                                {selectedStudent.invite_code_expires_at && (
                                    <p className="text-xs text-amber-600 mt-2">
                                        Hết hạn: {new Date(selectedStudent.invite_code_expires_at).toLocaleDateString("vi-VN")}
                                    </p>
                                )}
                            </div>

                            {/* Danh sách PH đã liên kết */}
                            <div>
                                <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                                    <Users className="w-4 h-4 text-emerald-500" /> Phụ huynh đã liên kết ({linkedParents.length})
                                </h4>
                                {loadingParents ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                                    </div>
                                ) : linkedParents.length === 0 ? (
                                    <p className="text-sm text-slate-400 py-4 text-center bg-slate-50 rounded-lg">Chưa có phụ huynh nào được liên kết.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {linkedParents.map(lp => (
                                            <div key={lp.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:border-indigo-200 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">
                                                        {lp.parent?.full_name?.charAt(0) || "?"}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-800 text-sm">{lp.parent?.full_name || "Không rõ"}</p>
                                                        <p className="text-xs text-slate-400">{lp.parent?.email}</p>
                                                    </div>
                                                    <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-600">{lp.relationship || "Phụ huynh"}</Badge>
                                                </div>
                                                <Button size="sm" variant="ghost" className="text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                                                    onClick={() => handleUnlink(lp.id)}>
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Thêm phụ huynh */}
                            {!showAddParent ? (
                                <Button variant="outline" onClick={() => setShowAddParent(true)}
                                    className="w-full border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50">
                                    <UserPlus className="w-4 h-4 mr-2" /> Thêm phụ huynh thủ công
                                </Button>
                            ) : (
                                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl space-y-4">
                                    <h4 className="font-bold text-indigo-800 text-sm">Tìm kiếm phụ huynh</h4>
                                    <div className="flex gap-2">
                                        <Input
                                            value={parentSearchQuery}
                                            onChange={e => setParentSearchQuery(e.target.value)}
                                            placeholder="Nhập tên, email hoặc SĐT phụ huynh..."
                                            className="bg-white"
                                            onKeyDown={e => e.key === "Enter" && handleSearchParent()}
                                        />
                                        <Button onClick={handleSearchParent} disabled={searchingParent}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0">
                                            {searchingParent ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                        </Button>
                                    </div>

                                    {/* Chọn mối quan hệ */}
                                    <div>
                                        <label className="text-xs text-indigo-700 font-semibold mb-1 block">Mối quan hệ</label>
                                        <div className="flex gap-2 flex-wrap">
                                            {RELATIONSHIPS.map(r => (
                                                <button key={r}
                                                    onClick={() => setSelectedRelationship(r)}
                                                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selectedRelationship === r
                                                        ? "bg-indigo-600 text-white shadow-sm"
                                                        : "bg-white text-slate-600 border border-slate-200 hover:border-indigo-300"
                                                        }`}>
                                                    {r}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Search results */}
                                    {parentSearchResults.length > 0 && (
                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                            {parentSearchResults.map(p => (
                                                <div key={p.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold">
                                                            {p.full_name?.charAt(0) || "?"}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-sm text-slate-800">{p.full_name}</p>
                                                            <p className="text-xs text-slate-400">{p.email} {p.phone ? `· ${p.phone}` : ""}</p>
                                                        </div>
                                                    </div>
                                                    <Button size="sm" onClick={() => handleLink(p.id)} disabled={linking}
                                                        className="bg-emerald-500 hover:bg-emerald-600 text-white">
                                                        {linking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5 mr-1" />}
                                                        Liên kết
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <Button variant="ghost" size="sm" onClick={() => { setShowAddParent(false); setParentSearchResults([]); }}
                                        className="text-slate-500">
                                        Đóng
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
