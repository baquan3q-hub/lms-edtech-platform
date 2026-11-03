import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Định nghĩa route permissions theo role
const ROLE_ROUTES: Record<string, string> = {
    admin: "/admin",
    teacher: "/teacher",
    student: "/student",
    parent: "/parent",
};

// Các route công khai — không cần đăng nhập
const PUBLIC_ROUTES = ["/login", "/forgot-password"];

// Các route bắt đầu bằng prefix này sẽ bị bỏ qua (API, static files)
const IGNORED_PREFIXES = ["/api", "/_next", "/favicon.ico", "/manifest.webmanifest"];

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Bỏ qua các route không cần kiểm tra
    if (IGNORED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
        return NextResponse.next();
    }

    // Refresh session và lấy thông tin user
    const { user, supabaseResponse } = await updateSession(request);

    // --- LOGIC 1: User chưa đăng nhập ---
    if (!user) {
        // Cho phép truy cập các trang công khai
        if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
            return supabaseResponse;
        }

        // Cho phép truy cập trang chủ (sẽ render Landing Page)
        if (pathname === "/") {
            return supabaseResponse;
        }

        // Redirect về /login nếu truy cập trang cần xác thực
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("redirectTo", pathname);
        return NextResponse.redirect(url);
    }

    // --- LOGIC 2: User đã đăng nhập ---

    // BẢO MẬT: user_metadata do client tự ghi được qua supabase.auth.updateUser(),
    // nên không được dùng để cấp quyền. Ở đây chỉ dùng để chọn hướng điều hướng
    // cho trải nghiệm (tránh thêm 1 query DB vào mọi request). Quyền truy cập
    // thực sự luôn được chốt lại ở layout/server action bằng vai trò trong
    // bảng public.users — xem lib/auth/actor-context.ts và lib/auth/authorize.ts.
    const routingHintRole = user.user_metadata?.role || "student";

    // Nếu user đã login mà vào trang login/register → đưa về dashboard tương ứng
    if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
        const dashboardPath = ROLE_ROUTES[routingHintRole] || "/student";
        const url = request.nextUrl.clone();
        url.pathname = dashboardPath;
        url.search = "";
        return NextResponse.redirect(url);
    }

    // Việc chặn truy cập dashboard sai vai trò được xử lý tại layout của từng
    // khu vực (app/(dashboard)/{admin,teacher,student,parent}/layout.tsx) vì
    // chỉ ở đó mới đọc được vai trò thật từ bảng public.users.
    //
    // Middleware KHÔNG tự điều hướng chéo giữa các dashboard: nếu dựa vào
    // routingHintRole (lấy từ user_metadata) thì một metadata bị sửa lệch so
    // với vai trò thật sẽ tạo vòng lặp redirect vô hạn giữa middleware và layout.
    return supabaseResponse;
}

export const config = {
    matcher: [
        /*
         * Match tất cả request paths ngoại trừ:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - Các file có extension (ảnh, fonts, v.v.)
         */
        "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webmanifest)$).*)",
    ],
};
