"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Settings2 } from "lucide-react";
import { fetchUserProfile } from "@/lib/actions/profile";
import ProfileForm from "@/components/shared/ProfileForm";

export default function ViewProfileDialog({ userId, role }: { userId: string, role: string }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open && !data) {
            loadProfile();
        }
    }, [open]);

    const loadProfile = async () => {
        setLoading(true);
        const res = await fetchUserProfile(userId);
        if (res.error) {
            setError(res.error);
        } else {
            setData(res.data);
        }
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Xem / Sửa Profile">
                    <Settings2 className="w-4 h-4 text-slate-500" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Quản lý Profile ({role})</DialogTitle>
                </DialogHeader>

                {loading && (
                    <div className="flex justify-center p-8">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                    </div>
                )}

                {error && (
                    <div className="text-center p-4 text-red-500">{error}</div>
                )}

                {!loading && data && (
                    <div className="mt-4">
                        <ProfileForm
                            role={role as any}
                            initialData={data}
                            onSuccess={() => setOpen(false)}
                        />
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
