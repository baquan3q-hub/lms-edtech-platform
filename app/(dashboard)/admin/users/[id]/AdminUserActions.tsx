"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { deleteUser } from "@/lib/actions/admin";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";

export default function AdminUserActions({ userProfile }: { userProfile: any }) {
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // States cho Edit
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({
        full_name: userProfile.full_name || "",
        phone: userProfile.phone || "",
        role: userProfile.role || "student"
    });

    const router = useRouter();

    const handleDelete = async () => {
        setIsDeleting(true);
        toast("Đang xóa tài khoản khỏi hệ thống...", { icon: <Loader2 className="animate-spin" /> });

        try {
            const result = await deleteUser(userProfile.id);

            if (result.success) {
                toast.success("Đã xóa tài khoản vĩnh viễn.");
                router.push("/admin/users");
                router.refresh(); // Refresh bảng users
            } else {
                toast.error(result.error || "Gặp lỗi khi xóa.");
            }
        } catch (error) {
            toast.error("Mất kết nối với máy chủ.");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEdit = async () => {
        setIsEditing(true);
        toast("Đang cập nhật thông tin...", { icon: <Loader2 className="animate-spin" /> });

        try {
            const { updateUser } = await import("@/lib/actions/admin");
            const result = await updateUser(userProfile.id, editData);

            if (result.success) {
                toast.success("Thông tin người dùng đã được cập nhật.");
                setIsEditDialogOpen(false);
                router.refresh();
            } else {
                toast.error(result.error || "Gặp lỗi khi cập nhật.");
            }
        } catch (error) {
            toast.error("Mất kết nối với máy chủ.");
        } finally {
            setIsEditing(false);
        }
    };

    return (
        <div className="flex gap-3">
            <Button
                variant="outline"
                className="text-slate-700 bg-white border-slate-200"
                onClick={() => setIsEditDialogOpen(true)}
            >
                <Edit className="w-4 h-4 mr-2" /> Chỉnh sửa
            </Button>

            <Button
                variant="destructive"
                className="bg-red-600 hover:bg-red-700 shadow-sm"
                onClick={() => setIsDeleteDialogOpen(true)}
            >
                <Trash2 className="w-4 h-4 mr-2" /> Xóa tài khoản
            </Button>

            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center text-red-600 gap-2">
                            <AlertTriangle className="w-5 h-5" />
                            Xác nhận xóa người dùng
                        </DialogTitle>
                        <DialogDescription className="pt-3 text-slate-600">
                            Bạn có chắc chắn muốn xóa tài khoản <strong>{userProfile.full_name} ({userProfile.email})</strong>?
                            Hành động này sẽ:
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li>Xóa vĩnh viễn khỏi danh sách đăng nhập (Supabase Auth).</li>
                                <li>Xóa bỏ toàn bộ Profile trong cơ sở dữ liệu.</li>
                                <li>Có thể ảnh hưởng đến dữ liệu Lớp học / Bài tập mang ID người này.</li>
                            </ul>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4">
                        <Button
                            variant="outline"
                            onClick={() => setIsDeleteDialogOpen(false)}
                            disabled={isDeleting}
                        >
                            Hủy bỏ
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                            Vẫn xóa tài khoản này
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog Edit User */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Edit className="w-5 h-5 text-indigo-500" />
                            Cập nhật thông tin Người dùng
                        </DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="full_name">Họ và tên</Label>
                            <Input
                                id="full_name"
                                value={editData.full_name}
                                onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Số điện thoại</Label>
                            <Input
                                id="phone"
                                value={editData.phone}
                                onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Vai trò hệ thống</Label>
                            <Select
                                value={editData.role}
                                onValueChange={(val) => setEditData({ ...editData, role: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn vai trò" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="student">Học sinh</SelectItem>
                                    <SelectItem value="teacher">Giáo viên</SelectItem>
                                    <SelectItem value="parent">Phụ huynh</SelectItem>
                                    <SelectItem value="admin">Quản trị viên</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-slate-500 mt-1">Lưu ý: Thay đổi vai trò có thể ảnh hưởng đến quyền truy cập hiện tại của người dùng.</p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsEditDialogOpen(false)}
                            disabled={isEditing}
                        >
                            Hủy
                        </Button>
                        <Button
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            onClick={handleEdit}
                            disabled={isEditing}
                        >
                            {isEditing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            Lưu thay đổi
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
