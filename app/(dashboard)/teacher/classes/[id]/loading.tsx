export default function TeacherClassDetailLoading() {
    return (
        <div className="space-y-6 animate-pulse max-w-7xl mx-auto">
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-100" />
                <div className="space-y-2 flex-1">
                    <div className="h-7 w-1/3 bg-slate-200 rounded" />
                    <div className="h-4 w-1/4 bg-slate-100 rounded" />
                </div>
            </div>
            <div className="flex gap-2 overflow-x-auto">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-10 w-28 bg-slate-100 rounded-xl shrink-0" />
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-8 space-y-4">
                    <div className="h-5 w-2/3 bg-slate-100 rounded" />
                    <div className="h-5 w-1/2 bg-slate-100 rounded" />
                    <div className="h-5 w-3/4 bg-slate-100 rounded" />
                    <div className="h-5 w-1/3 bg-slate-100 rounded" />
                </div>
                <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-4">
                    <div className="h-5 w-1/2 bg-slate-100 rounded" />
                    <div className="h-24 w-full bg-slate-50 rounded-xl" />
                </div>
            </div>
        </div>
    );
}
