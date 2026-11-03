export default function AdminSubpageLoading() {
    return (
        <div className="space-y-6 animate-pulse max-w-7xl mx-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="space-y-2">
                    <div className="h-8 w-56 bg-slate-200 rounded-lg" />
                    <div className="h-4 w-80 bg-slate-100 rounded" />
                </div>
                <div className="h-10 w-36 bg-slate-100 rounded-xl" />
            </div>
            <div className="bg-white rounded-3xl border border-slate-100 p-6">
                <div className="space-y-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4 py-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-slate-100 rounded" style={{ width: `${60 + Math.random() * 30}%` }} />
                                <div className="h-3 bg-slate-50 rounded" style={{ width: `${30 + Math.random() * 20}%` }} />
                            </div>
                            <div className="h-8 w-20 bg-slate-50 rounded-lg shrink-0" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
