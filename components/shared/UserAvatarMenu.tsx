"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, UserCircle, ChevronDown, MessageSquarePlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import FeedbackModal from "@/components/shared/FeedbackModal";

interface UserAvatarMenuProps {
    fullName: string;
    email: string;
    profileHref: string;
    /** Gradient classes for avatar background, e.g. "from-indigo-500 to-purple-600" */
    avatarGradient?: string;
    /** "dark" for dark sidebars (white text), "light" for light sidebars */
    variant?: "dark" | "light";
    /** If true, hide text and chevron, only show the avatar centered */
    compact?: boolean;
    /** User role — nếu là student/parent thì hiện nút "Gửi phản hồi" */
    role?: string;
    /** User ID for feedback targeting */
    userId?: string;
}

export default function UserAvatarMenu({
    fullName,
    email,
    profileHref,
    avatarGradient = "from-indigo-500 to-purple-600",
    variant = "dark",
    compact = false,
    role,
    userId,
}: UserAvatarMenuProps) {
    const router = useRouter();
    const supabase = createClient();
    const [feedbackOpen, setFeedbackOpen] = useState(false);
    const initials = fullName
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "?";

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
    };

    const isDark = variant === "dark";
    const showFeedback = role === "student" || role === "parent";

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        suppressHydrationWarning
                        className={`flex items-center w-full px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer group ${compact ? "justify-center gap-0" : "gap-3"
                            } ${isDark
                                ? "hover:bg-slate-800/60"
                                : "hover:bg-slate-100"
                            }`}
                    >
                        <div
                            className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-md ${compact ? "mx-auto" : ""}`}
                        >
                            {initials}
                        </div>
                        {!compact && (
                            <>
                                <div className="flex-1 min-w-0 text-left">
                                    <p
                                        className={`text-sm font-semibold truncate ${isDark ? "text-slate-200" : "text-slate-800"
                                            }`}
                                    >
                                        {fullName}
                                    </p>
                                    <p
                                        className={`text-[10px] truncate ${isDark ? "text-slate-500" : "text-slate-400"
                                            }`}
                                    >
                                        {email}
                                    </p>
                                </div>
                                <ChevronDown
                                    className={`w-4 h-4 shrink-0 transition-transform group-data-[state=open]:rotate-180 ${isDark ? "text-slate-500" : "text-slate-400"
                                        }`}
                                />
                            </>
                        )}
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="top" sideOffset={8} className="w-56">
                    <DropdownMenuLabel className="font-normal">
                        <p className="text-sm font-semibold text-slate-800">{fullName}</p>
                        <p className="text-xs text-slate-400 truncate">{email}</p>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => router.push(profileHref)}
                    >
                        <UserCircle className="w-4 h-4 mr-2" />
                        Thông tin cá nhân
                    </DropdownMenuItem>
                    {showFeedback && (
                        <DropdownMenuItem
                            className="cursor-pointer text-indigo-600 focus:text-indigo-600 focus:bg-indigo-50"
                            onClick={() => setFeedbackOpen(true)}
                        >
                            <MessageSquarePlus className="w-4 h-4 mr-2" />
                            📝 Gửi phản hồi
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                        onClick={handleLogout}
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Đăng xuất
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Feedback Modal */}
            {showFeedback && (
                <FeedbackModal open={feedbackOpen} onOpenChange={setFeedbackOpen} userId={userId} />
            )}
        </>
    );
}
