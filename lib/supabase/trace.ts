// Đặt LMS_TRACE_DB=1 khi chạy server để in mỗi lượt gọi Supabase (REST/RPC/Auth, status, thời gian).
// Chỉ in đường dẫn, không in query string vì có thể chứa id/email. Dùng để đếm số lượt gọi mỗi trang:
//   LMS_TRACE_DB=1 npm run dev   → mở một trang → đếm các dòng "[db]" trong log.
const tracedFetch: typeof fetch = async (input, init) => {
    const started = performance.now();
    const response = await fetch(input, init);
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    console.info(`[db] ${init?.method ?? "GET"} ${url.pathname} ${response.status} ${Math.round(performance.now() - started)}ms`);
    return response;
};

/** Spread into Supabase client options; empty unless LMS_TRACE_DB=1. */
export function traceFetchOption(): { global?: { fetch: typeof fetch } } {
    return process.env.LMS_TRACE_DB === "1" ? { global: { fetch: tracedFetch } } : {};
}
