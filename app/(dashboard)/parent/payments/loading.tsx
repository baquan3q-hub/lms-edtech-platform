export default function ParentPaymentsLoading() {
    return (
        <div className="space-y-6 animate-pulse max-w-6xl mx-auto px-4 sm:px-0">
            <div className="h-8 w-44 bg-slate-200 rounded-lg" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
                        <div className="h-4 w-20 bg-slate-100 rounded" />
                        <div className="h-8 w-24 bg-slate-200 rounded" />
                    </div>
                ))}
            </div>
            <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 py-3 border-b border-slate-50 last:border-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 shrink-0" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 w-2/3 bg-slate-100 rounded" />
                            <div className="h-3 w-1/3 bg-slate-50 rounded" />
                        </div>
                        <div className="h-8 w-24 bg-slate-100 rounded-lg" />
                    </div>
                ))}
            </div>
        </div>
    );
}
