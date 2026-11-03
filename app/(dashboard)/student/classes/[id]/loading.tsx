export default function StudentClassDetailLoading() {
    return (
        <div className="space-y-6 animate-pulse max-w-6xl mx-auto px-4 sm:px-0">
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-100" />
                <div className="space-y-2 flex-1">
                    <div className="h-6 w-1/3 bg-slate-200 rounded" />
                    <div className="h-4 w-1/4 bg-slate-100 rounded" />
                </div>
            </div>
            <div className="flex gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-10 w-24 bg-slate-100 rounded-xl" />
                ))}
            </div>
            <div className="bg-white rounded-3xl border border-slate-100 p-8 space-y-4">
                <div className="h-5 w-2/3 bg-slate-100 rounded" />
                <div className="h-5 w-1/2 bg-slate-100 rounded" />
                <div className="h-5 w-3/4 bg-slate-100 rounded" />
            </div>
        </div>
    );
}
