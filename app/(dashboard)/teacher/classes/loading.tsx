export default function TeacherClassesLoading() {
    return (
        <div className="space-y-6 animate-pulse max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <div className="h-8 w-48 bg-slate-200 rounded-lg" />
                <div className="h-10 w-32 bg-slate-100 rounded-xl" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-3xl border border-slate-100 p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100" />
                            <div className="flex-1 space-y-2">
                                <div className="h-5 w-3/4 bg-slate-100 rounded" />
                                <div className="h-3 w-1/2 bg-slate-50 rounded" />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <div className="h-6 w-16 bg-slate-50 rounded-full" />
                            <div className="h-6 w-20 bg-slate-50 rounded-full" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
