export default function StudentClassesLoading() {
    return (
        <div className="space-y-6 animate-pulse max-w-6xl mx-auto px-4 sm:px-0">
            <div className="h-8 w-48 bg-slate-200 rounded-lg" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-3xl border border-slate-100 p-6 space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100" />
                        <div className="h-5 w-3/4 bg-slate-100 rounded" />
                        <div className="h-4 w-1/2 bg-slate-100 rounded" />
                    </div>
                ))}
            </div>
        </div>
    );
}
