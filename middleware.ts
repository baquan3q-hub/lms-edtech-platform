import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createAdminClient } from "@/lib/supabase/admin";

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
const IGNORED_PREFIXES = ["/api", "/_next", "/favicon.ico"];

export async function middleware(request: NextRequest) {
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

        // Cho phép truy cập trang chủ (sẽ redirect trong page.tsx)
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

    // Sử dụng Admin Client để query role (bypass RLS hoàn toàn)
    let role = "student";
    try {
        const adminSupabase = createAdminClient();
        const { data: userData } = await adminSupabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single();

        if (userData?.role) {
            role = userData.role;
        }
    } catch (err) {
        console.error("[Middleware] Error fetching role:", err);
    }

    // Nếu user đã login mà vào trang login/register → redirect về dashboard
    if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
        const dashboardPath = ROLE_ROUTES[role] || "/student";
        const url = request.nextUrl.clone();
        url.pathname = dashboardPath;
        return NextResponse.redirect(url);
    }

    // Kiểm tra phân quyền route theo role
    const isDashboardRoute = Object.values(ROLE_ROUTES).some((route) =>
        pathname.startsWith(route)
    );

    if (isDashboardRoute) {
        const allowedPrefix = ROLE_ROUTES[role];

        // Nếu user cố truy cập route không thuộc role mình → redirect về dashboard đúng
        if (allowedPrefix && !pathname.startsWith(allowedPrefix)) {
            const url = request.nextUrl.clone();
            url.pathname = allowedPrefix;
            return NextResponse.redirect(url);
        }
    }

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
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
