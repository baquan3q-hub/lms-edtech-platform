"use client";
import { useEffect, useState } from "react";
import { fetchLearningTracking, fetchLearningTimeline } from "@/lib/actions/learning-tracking";
type Result = Awaited<ReturnType<typeof fetchLearningTracking>>;
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
const time = (s?: string | null) => s ? new Date(s).toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "—";
export default function LearningTrackingDashboard() {
    const [date, setDate] = useState(today), [search, setSearch] = useState(""), [classId, setClassId] = useState(""), [page, setPage] = useState(0);
    const [data, setData] = useState<Result>(), [error, setError] = useState(""), [busy, setBusy] = useState(false);
    const [timeline, setTimeline] = useState<Awaited<ReturnType<typeof fetchLearningTimeline>>>([]);
    const [selected, setSelected] = useState("");
    useEffect(() => {
        let cancelled = false;
        const load = () => { setBusy(true); void fetchLearningTracking({ date, search, classId: classId || undefined, page }).then(r => { if (!cancelled) { setData(r); setError(""); } }).catch(() => { if (!cancelled) setError("Không thể tải dữ liệu hoạt động. Vui lòng thử lại."); }).finally(() => { if (!cancelled) setBusy(false); }); };
        const debounce = setTimeout(load, 250), interval = setInterval(load, 30000);
        return () => { cancelled = true; clearTimeout(debounce); clearInterval(interval); };
    }, [date, search, classId, page]);
    return <main className="p-6 space-y-5">
        <h1 className="text-2xl font-bold">Hoạt động học tại nhà</h1>
        <p className="text-sm text-slate-600">Thời gian dưới đây là hoạt động hệ thống ghi nhận; không thay thế đánh giá mức độ hiểu bài. Giờ Việt Nam.</p>
        <div className="flex flex-wrap gap-3">
            <input aria-label="Ngày theo dõi" type="date" value={date} onChange={e => { setDate(e.target.value); setPage(0); }} className="border rounded p-2" />
            <input aria-label="Tìm học sinh" placeholder="Tìm học sinh" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="border rounded p-2" />
            <select aria-label="Lớp" value={classId} onChange={e => { setClassId(e.target.value); setPage(0); }} className="border rounded p-2"><option value="">Tất cả lớp được phân công</option>{data?.classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        </div>
        {error && <p role="alert" className="text-red-700">{error}</p>}
        <div className="overflow-x-auto"><table className="w-full text-sm border-collapse"><thead><tr>{["Học sinh", "Trạng thái", "Vào lần đầu", "Ghi nhận cuối", "Mở trang", "Tương tác", "Phát video", "Timeline"].map(h => <th className="text-left p-3 border-b" key={h}>{h}</th>)}</tr></thead>
            <tbody>{data?.students.map(s => { const a = s.activity; const online = a?.last_seen_at && Date.now() - Date.parse(a.last_seen_at) <= 90000 && !a.end_reason; return <tr key={s.id}>
                <td className="p-3">{s.full_name}</td><td>{!a?.samples ? "Chưa đủ dữ liệu" : online ? a.state === "idle" ? "Không tương tác" : "Đang kết nối" : a.end_reason === "logout" ? "Đã đăng xuất" : "Mất kết nối (suy đoán)"}</td>
                <td>{time(a?.started_at)}</td><td>{time(a?.last_seen_at)}</td>{[a?.open_seconds, a?.active_seconds, a?.video_seconds].map((v, i) => <td key={i}>{v == null ? "—" : `${Math.round(v / 60)} phút`}</td>)}
                <td><button className="text-indigo-700 underline" onClick={async () => { try { setTimeline(await fetchLearningTimeline(s.id, date)); setSelected(s.full_name); } catch { setError("Không tải được timeline."); } }}>Xem</button></td>
            </tr>; })}</tbody></table></div>
        {!busy && !data?.students.length && !error && <p>Không có học sinh phù hợp.</p>}
        <div className="flex gap-3"><button disabled={busy || page === 0} onClick={() => setPage(p => p - 1)}>Trang trước</button><span>Trang {page + 1} · {data?.count || 0} học sinh</span><button disabled={busy || (page + 1) * 20 >= (data?.count || 0)} onClick={() => setPage(p => p + 1)}>Trang sau</button></div>
        {selected && <section className="border rounded-xl p-4"><h2 className="font-semibold">{selected} · 50 khoảng hoạt động gần nhất</h2><ul>{timeline.map((t, i) => <li key={i} className="py-1 text-sm">{time(t.observed_from)}–{time(t.observed_to)} · {t.page_path} · {t.video ? "Phát video" : t.active ? "Có tương tác" : "Không tương tác"}</li>)}</ul></section>}
    </main>;
}
