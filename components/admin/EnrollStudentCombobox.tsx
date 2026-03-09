"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

import { enrollStudent } from "@/lib/actions/academic";

interface Student {
    id: string;
    full_name: string;
    email: string;
}

export default function EnrollStudentCombobox({
    classId,
    students,
    enrolledIds,
}: {
    classId: string;
    students: Student[];
    enrolledIds: string[];
}) {
    const [open, setOpen] = useState(false);
    const [selectedId, setSelectedId] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Lọc học sinh chưa được xếp lớp
    const availableStudents = students.filter(
        (s) => !enrolledIds.includes(s.id)
    );

    const selectedStudent = students.find((s) => s.id === selectedId);

    async function handleEnroll() {
        if (!selectedId) {
            toast.error("Vui lòng chọn học sinh trước.");
            return;
        }

        setIsLoading(true);
        try {
            const result = await enrollStudent(classId, selectedId);
            if (result.error) {
                toast.error("Thêm học sinh thất bại", { description: result.error });
            } else {
                toast.success("Đã thêm học sinh vào lớp!");
                setSelectedId("");
            }
        } catch {
            toast.error("Đã xảy ra lỗi không mong muốn.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="flex gap-3">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="flex-1 justify-between bg-gray-50 border-gray-200 text-gray-900 hover:bg-gray-100 hover:text-gray-900"
                    >
                        {selectedStudent
                            ? `${selectedStudent.full_name} (${selectedStudent.email})`
                            : "Tìm và chọn học sinh..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0 bg-white border-gray-200 shadow-lg">
                    <Command className="bg-transparent">
                        <CommandInput
                            placeholder="Tìm theo tên hoặc email..."
                            className="text-gray-900"
                        />
                        <CommandList>
                            <CommandEmpty className="py-3 text-center text-sm text-gray-500">
                                Không tìm thấy học sinh.
                            </CommandEmpty>
                            <CommandGroup>
                                {availableStudents.map((student) => (
                                    <CommandItem
                                        key={student.id}
                                        value={`${student.full_name} ${student.email}`}
                                        onSelect={() => {
                                            setSelectedId(
                                                selectedId === student.id ? "" : student.id
                                            );
                                            setOpen(false);
                                        }}
                                        className="text-gray-900 hover:bg-gray-100 data-[selected=true]:bg-gray-100"
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                selectedId === student.id ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        <div>
                                            <p className="text-sm">{student.full_name}</p>
                                            <p className="text-xs text-gray-400">{student.email}</p>
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            <Button
                onClick={handleEnroll}
                disabled={!selectedId || isLoading}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shrink-0"
            >
                {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Thêm
                    </>
                )}
            </Button>
        </div>
    );
}
