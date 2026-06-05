const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env.local'});
const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
    const targetRoles = ["student", "parent", "teacher", "admin"];
    const { data: users } = await adminSupabase
        .from("users")
        .select("id, role")
        .in("role", targetRoles);
    
    console.log("Users fetched:", users?.length);
    
    const notifications = [];
    users?.forEach((u) => {
        const rolePath = u.role === "student" ? "student" : u.role === "teacher" ? "teacher" : "parent";
        notifications.push({
            user_id: u.id,
            title: "\ud83d\udce2 Test title",
            message: "Test message",
            type: "announcement",
            link: `/${rolePath}/announcements`,
            metadata: { announcementId: "test-id", scope: "system" },
            is_read: false,
        });
    });
    
    const uniqueNotifs = Array.from(
        new Map(notifications.map((n) => [n.user_id, n])).values()
    );
    
    console.log("Unique notifs:", uniqueNotifs.length);
    
    if (uniqueNotifs.length > 0) {
        const { error, data } = await adminSupabase.from("notifications").insert(uniqueNotifs);
        if (error) {
            console.error("Insert error:", error);
        } else {
            console.log("Insert success!");
        }
    }
}
test();
