import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Tạo Supabase client cho Server Components / Server Actions / Route Handlers
export async function createClient() {
    const cookieStore = await cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch {
                        // Bỏ qua lỗi khi gọi từ Server Component (read-only)
                        // Chỉ có thể set cookies từ Server Action hoặc Route Handler
                    }
                },
            },
        }
    );
}
