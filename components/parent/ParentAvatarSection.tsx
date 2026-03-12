"use client";

import UserAvatarMenu from "@/components/shared/UserAvatarMenu";

export default function ParentAvatarSection({ fullName, email, compact = false, userId }: { fullName: string; email: string, compact?: boolean, userId?: string }) {
    return (
        <UserAvatarMenu
            fullName={fullName}
            email={email}
            profileHref="/parent/profile"
            avatarGradient="from-amber-400 to-orange-500"
            variant="light"
            compact={compact}
            role="parent"
            userId={userId}
        />
    );
}
