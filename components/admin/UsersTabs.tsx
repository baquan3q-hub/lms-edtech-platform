"use client";

import { Search, Users as UsersIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, Eye, Edit, Trash } from "lucide-react";
import ViewProfileDialog from "./ViewProfileDialog";
import Link from "next/link";

const roleBadgeConfig: Record<string, { label: string; className: string }> = {
    admin: { label: "Admin", className: "bg-red-50 text-red-600 border-red-200" },
    teacher: { label: "Giáo viên", className: "bg-emerald-50 text-emerald-600 border-emerald-200" },
    student: { label: "Học sinh", className: "bg-blue-50 text-blue-600 border-blue-200" },
    parent: { label: "Phụ huynh", className: "bg-amber-50 text-amber-600 border-amber-200" },
};

function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export type UserObject = {
    id: string;
    full_name: string;
    email: string;
    role: string;
    phone: string | null;
    created_at: string;
};

type LinkData = {
    id: string;
    parent_id: string;
    student_id: string;
    relationship: string;
};

interface UsersTabsProps {
    users: UserObject[] | null;
    error: string | null;
    linkData: LinkData[];
}

export default function UsersTabs({ users, error, linkData }: UsersTabsProps) {
    if (error) {
        return (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm p-8 text-center">
                <p className="text-red-500">Lỗi tải dữ liệu: {error}</p>
            </div>
        );
    }

    if (!users || users.length === 0) {
        return (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm p-12 text-center">
                <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Chưa có người dùng nào</p>
                <p className="text-sm text-gray-400 mt-1">Bấm &quot;Thêm người dùng&quot; để tạo tài khoản đầu tiên.</p>
            </div>
        );
    }

    // Phân loại
    const admins = users.filter((u) => u.role === "admin");
    const teachers = users.filter((u) => u.role === "teacher");
    const students = users.filter((u) => u.role === "student");
    const parents = users.filter((u) => u.role === "parent");

    // Helper: count linked parents for a student
    const getLinkedParents = (studentId: string) => {
        const parentLinks = linkData.filter(l => l.student_id === studentId);
        return parentLinks.map(l => ({
            ...l,
            parentUser: users.find(u => u.id === l.parent_id),
        }));
    };

    // Helper: count linked students for a parent
    const getLinkedStudents = (parentId: string) => {
        const studentLinks = linkData.filter(l => l.parent_id === parentId);
        return studentLinks.map(l => ({
            ...l,
            studentUser: users.find(u => u.id === l.student_id),
        }));
    };

    // Base table (for admin, teacher, all)
    const renderBaseTable = (data: UserObject[]) => {
        if (data.length === 0) {
            return (
                <div className="p-8 text-center text-gray-500 text-sm bg-gray-50/50">
                    Chưa có dữ liệu trong mục này.
                </div>
            );
        }

        return (
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <Table className="min-w-[800px]">
                    <TableHeader>
                        <TableRow className="border-gray-100 hover:bg-transparent bg-gray-50/50">
                            <TableHead className="text-gray-500 font-medium whitespace-nowrap">Họ và tên</TableHead>
                            <TableHead className="text-gray-500 font-medium whitespace-nowrap">Email</TableHead>
                            <TableHead className="text-gray-500 font-medium whitespace-nowrap">Vai trò</TableHead>
                            <TableHead className="text-gray-500 font-medium whitespace-nowrap">Số điện thoại</TableHead>
                            <TableHead className="text-gray-500 font-medium text-right whitespace-nowrap">Ngày tạo</TableHead>
                            <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((user) => {
                            const badge = roleBadgeConfig[user.role] || roleBadgeConfig.student;
                            return (
                                <TableRow key={user.id} className="border-gray-100 hover:bg-gray-50 transition-colors">
                                    <TableCell className="font-medium text-gray-900">{user.full_name}</TableCell>
                                    <TableCell className="text-gray-600">{user.email}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={badge.className}>{badge.label}</Badge>
                                    </TableCell>
                                    <TableCell className="text-gray-500">{user.phone || "—"}</TableCell>
                                    <TableCell className="text-gray-500 text-right">{formatDate(user.created_at)}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0 min-h-[44px] min-w-[44px]">
                                                    <MoreVertical className="h-4 w-4 text-gray-500" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48">
                                                <DropdownMenuLabel>Tùy chọn</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/admin/users/${user.id}`} className="min-h-[44px]">
                                                        <Eye className="w-4 h-4 mr-2" /> Xem chi tiết
                                                    </Link>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        );
    };

    // Students table with parent info
    const renderStudentsTable = () => {
        if (students.length === 0) {
            return <div className="p-8 text-center text-gray-500 text-sm bg-gray-50/50">Chưa có học sinh nào.</div>;
        }
        return (
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <Table className="min-w-[800px]">
                    <TableHeader>
                        <TableRow className="border-gray-100 hover:bg-transparent bg-gray-50/50">
                            <TableHead className="text-gray-500 font-medium whitespace-nowrap">Họ và tên</TableHead>
                            <TableHead className="text-gray-500 font-medium whitespace-nowrap">Email</TableHead>
                            <TableHead className="text-gray-500 font-medium whitespace-nowrap">Số điện thoại</TableHead>
                            <TableHead className="text-gray-500 font-medium whitespace-nowrap">Phụ huynh liên kết</TableHead>
                            <TableHead className="text-gray-500 font-medium text-right whitespace-nowrap">Ngày tạo</TableHead>
                            <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {students.map((user) => {
                            const linked = getLinkedParents(user.id);
                            return (
                                <TableRow key={user.id} className="border-gray-100 hover:bg-gray-50 transition-colors">
                                    <TableCell className="font-medium text-gray-900">{user.full_name}</TableCell>
                                    <TableCell className="text-gray-600 text-sm">{user.email}</TableCell>
                                    <TableCell className="text-gray-500 text-sm">{user.phone || "—"}</TableCell>
                                    <TableCell>
                                        {linked.length === 0 ? (
                                            <span className="text-xs text-slate-400 italic">Chưa có PH</span>
                                        ) : (
                                            <div className="flex flex-wrap gap-1">
                                                {linked.map(l => (
                                                    <Badge key={l.id} variant="outline"
                                                        className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-medium">
                                                        <UsersIcon className="w-2.5 h-2.5 mr-1" />
                                                        {l.parentUser?.full_name || "?"} ({l.relationship})
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-gray-500 text-right text-sm">{formatDate(user.created_at)}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0 min-h-[44px] min-w-[44px]">
                                                    <MoreVertical className="h-4 w-4 text-gray-500" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48">
                                                <DropdownMenuLabel>Tùy chọn</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/admin/users/${user.id}`} className="cursor-pointer flex items-center min-h-[44px]">
                                                        <Eye className="w-4 h-4 mr-2" /> Xem chi tiết
                                                    </Link>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        );
    };

    // Parents table with children info
    const renderParentsTable = () => {
        if (parents.length === 0) {
            return <div className="p-8 text-center text-gray-500 text-sm bg-gray-50/50">Chưa có phụ huynh nào.</div>;
        }
        return (
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <Table className="min-w-[800px]">
                    <TableHeader>
                        <TableRow className="border-gray-100 hover:bg-transparent bg-gray-50/50">
                            <TableHead className="text-gray-500 font-medium whitespace-nowrap">Họ và tên</TableHead>
                            <TableHead className="text-gray-500 font-medium whitespace-nowrap">Email</TableHead>
                            <TableHead className="text-gray-500 font-medium whitespace-nowrap">Số điện thoại</TableHead>
                            <TableHead className="text-gray-500 font-medium whitespace-nowrap">Con em liên kết</TableHead>
                            <TableHead className="text-gray-500 font-medium text-right whitespace-nowrap">Ngày tạo</TableHead>
                            <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {parents.map((user) => {
                            const linked = getLinkedStudents(user.id);
                            return (
                                <TableRow key={user.id} className="border-gray-100 hover:bg-gray-50 transition-colors">
                                    <TableCell className="font-medium text-gray-900">{user.full_name}</TableCell>
                                    <TableCell className="text-gray-600 text-sm">{user.email}</TableCell>
                                    <TableCell className="text-gray-500 text-sm">{user.phone || "—"}</TableCell>
                                    <TableCell>
                                        {linked.length === 0 ? (
                                            <span className="text-xs text-slate-400 italic">Chưa liên kết</span>
                                        ) : (
                                            <div className="flex flex-wrap gap-1">
                                                {linked.map(l => (
                                                    <Badge key={l.id} variant="outline"
                                                        className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-medium">
                                                        <UsersIcon className="w-2.5 h-2.5 mr-1" />
                                                        {l.studentUser?.full_name || "?"} ({l.relationship})
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-gray-500 text-right text-sm">{formatDate(user.created_at)}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0 min-h-[44px] min-w-[44px]">
                                                    <MoreVertical className="h-4 w-4 text-gray-500" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48">
                                                <DropdownMenuLabel>Tùy chọn</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/admin/users/${user.id}`} className="cursor-pointer flex items-center min-h-[44px]">
                                                        <Eye className="w-4 h-4 mr-2" /> Xem chi tiết
                                                    </Link>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        );
    };

    return (
        <Tabs defaultValue="all" className="w-full">
            <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
                <TabsList className="mb-4 bg-white border border-gray-200 shadow-sm rounded-xl p-1 min-w-max">
                    <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 min-h-[44px]">
                        Tất cả ({users.length})
                    </TabsTrigger>
                    <TabsTrigger value="teachers" className="rounded-lg data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 min-h-[44px]">
                        Giáo viên ({teachers.length})
                    </TabsTrigger>
                    <TabsTrigger value="admins" className="rounded-lg data-[state=active]:bg-red-50 data-[state=active]:text-red-700 min-h-[44px]">
                        Quản trị viên ({admins.length})
                    </TabsTrigger>
                    <TabsTrigger value="students" className="rounded-lg data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 min-h-[44px]">
                        Học sinh ({students.length})
                    </TabsTrigger>
                    <TabsTrigger value="parents" className="rounded-lg data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700 min-h-[44px]">
                        Phụ huynh ({parents.length})
                    </TabsTrigger>
                </TabsList>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                <TabsContent value="all" className="m-0 border-none outline-none">
                    {renderBaseTable(users)}
                </TabsContent>
                <TabsContent value="teachers" className="m-0 border-none outline-none">
                    {renderBaseTable(teachers)}
                </TabsContent>
                <TabsContent value="admins" className="m-0 border-none outline-none">
                    {renderBaseTable(admins)}
                </TabsContent>
                <TabsContent value="students" className="m-0 border-none outline-none">
                    {renderStudentsTable()}
                </TabsContent>
                <TabsContent value="parents" className="m-0 border-none outline-none">
                    {renderParentsTable()}
                </TabsContent>
            </div>
        </Tabs>
    );
}
