import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { traceFetchOption } from "./trace";

// Tạo Supabase client cho middleware (cần xử lý cookies đặc biệt)
export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
            ...traceFetchOption(),
        }
    );

    // Refresh session — quan trọng: không được bỏ dòng này.
    // getClaims() làm mới cookie qua getSession() rồi xác thực chữ ký JWT. Với khoá ký
    // bất đối xứng, việc xác thực chạy tại chỗ (JWKS được cache), nên proxy không còn
    // tốn một lượt gọi Supabase Auth mỗi lần điều hướng; với khoá HS256 nó tự quay về
    // getUser(). Proxy chỉ dùng kết quả để định tuyến: quyền thật vẫn do getUser() và
    // bảng membership kiểm ở layout/server action (lib/auth/actor-context.ts).
    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims;
    const user = claims?.sub
        ? { id: claims.sub, user_metadata: (claims.user_metadata ?? {}) as { role?: string; [key: string]: unknown } }
        : null;

    return { supabase, user, supabaseResponse };
}
