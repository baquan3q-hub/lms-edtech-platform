"use client";

import UserAvatarMenu from "@/components/shared/UserAvatarMenu";

export default function ParentAvatarSection({ fullName, email, compact = false }: { fullName: string; email: string, compact?: boolean }) {
    return (
        <UserAvatarMenu
            fullName={fullName}
            email={email}
            profileHref="/parent/profile"
            avatarGradient="from-amber-400 to-orange-500"
            variant="light"
            compact={compact}
        />
    );
}
