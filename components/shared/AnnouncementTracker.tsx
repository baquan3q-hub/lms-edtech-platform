"use client";

import { useEffect, useRef } from "react";
import { recordAnnouncementRead } from "@/lib/actions/admin-announcements";

export default function AnnouncementTracker({ announcementId }: { announcementId: string }) {
    const tracked = useRef(false);

    useEffect(() => {
        if (!tracked.current && announcementId) {
            recordAnnouncementRead(announcementId);
            tracked.current = true;
        }
    }, [announcementId]);

    return null; // Component ẩn, chỉ thực hiện logic tracking
}
