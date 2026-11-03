export default function ParentChildrenLoading() {
    return (
        <div className="space-y-6 animate-pulse max-w-6xl mx-auto px-4 sm:px-0">
            <div className="h-8 w-52 bg-slate-200 rounded-lg" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-3xl border border-slate-100 p-6 space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-slate-100" />
                            <div className="flex-1 space-y-2">
                                <div className="h-5 w-2/3 bg-slate-100 rounded" />
                                <div className="h-3 w-1/3 bg-slate-50 rounded" />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            {Array.from({ length: 3 }).map((_, j) => (
                                <div key={j} className="h-16 bg-slate-50 rounded-xl" />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
