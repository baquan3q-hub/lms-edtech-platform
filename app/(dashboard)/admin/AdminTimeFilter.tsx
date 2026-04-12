"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarDays } from "lucide-react";

export function AdminTimeFilter() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const range = searchParams.get("range") || "all";

    const onRangeChange = (value: string) => {
        const params = new URLSearchParams(searchParams);
        if (value === "all") {
            params.delete("range");
        } else {
            params.set("range", value);
        }
        router.push(`${pathname}?${params.toString()}`);
    };

    return (
        <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-500 hidden sm:inline-block">Thời gian:</span>
            <Select value={range} onValueChange={onRangeChange}>
                <SelectTrigger className="w-[180px] bg-white border-gray-200 rounded-full h-10 shadow-sm hover:border-gray-300 transition-colors focus:ring-0 focus:ring-offset-0">
                    <div className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-blue-500" />
                        <SelectValue placeholder="Chọn thời gian" />
                    </div>
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-gray-100 shadow-xl">
                    <SelectItem value="today" className="rounded-xl cursor-pointer focus:bg-blue-50">Hôm nay</SelectItem>
                    <SelectItem value="week" className="rounded-xl cursor-pointer focus:bg-blue-50">7 ngày qua</SelectItem>
                    <SelectItem value="month" className="rounded-xl cursor-pointer focus:bg-blue-50">30 ngày qua</SelectItem>
                    <SelectItem value="quarter" className="rounded-xl cursor-pointer focus:bg-blue-50">Quý này</SelectItem>
                    <SelectItem value="year" className="rounded-xl cursor-pointer focus:bg-blue-50">Năm nay</SelectItem>
                    <SelectItem value="all" className="rounded-xl cursor-pointer focus:bg-blue-50">Tất cả thời gian</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}
