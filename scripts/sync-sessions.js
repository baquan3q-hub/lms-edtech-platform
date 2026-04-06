/**
 * Script chạy 1 lần: Generate class_sessions cho TẤT CẢ lớp đang thiếu.
 * Quét class_schedules → nếu lớp chưa có sessions → generate + reindex.
 */
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

const env = fs.readFileSync(".env.local", "utf8");
const getVal = (key) => env.split("\n").find((l) => l.startsWith(key))?.split("=")[1]?.trim();
const supabase = createClient(getVal("NEXT_PUBLIC_SUPABASE_URL"), getVal("SUPABASE_SERVICE_ROLE_KEY"));

function formatDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function main() {
    console.log("=== SYNC SESSIONS START ===");

    // 1. Lấy tất cả class_schedules có start_date + end_date
    const { data: schedules, error: schErr } = await supabase
        .from("class_schedules")
        .select("*, classes(name, status)")
        .not("start_date", "is", null)
        .not("end_date", "is", null);

    if (schErr) { console.error("Lỗi lấy schedules:", schErr); return; }
    console.log(`Tìm thấy ${schedules.length} lịch học có khoảng ngày.`);

    // Group by class_id
    const classMap = new Map();
    for (const sch of schedules) {
        if (!classMap.has(sch.class_id)) classMap.set(sch.class_id, []);
        classMap.get(sch.class_id).push(sch);
    }

    let totalGenerated = 0;

    for (const [classId, classSchedules] of classMap) {
        const className = classSchedules[0]?.classes?.name || classId;
        const classStatus = classSchedules[0]?.classes?.status;
        
        if (classStatus !== "active") {
            console.log(`  [SKIP] ${className} - không active`);
            continue;
        }

        // Lấy sessions đã tồn tại
        const { data: existing } = await supabase
            .from("class_sessions")
            .select("session_date")
            .eq("class_id", classId);

        const existingDates = new Set((existing || []).map((s) => s.session_date));
        const sessionsToInsert = [];

        // Generate cho mỗi schedule
        for (const sch of classSchedules) {
            const current = new Date(sch.start_date + "T12:00:00");
            const end = new Date(sch.end_date + "T12:00:00");

            while (current <= end) {
                if (current.getDay() === sch.day_of_week) {
                    const dateStr = formatDate(current);
                    if (!existingDates.has(dateStr)) {
                        existingDates.add(dateStr); // prevent duplicates within this run
                        sessionsToInsert.push({
                            class_id: classId,
                            session_date: dateStr,
                            start_time: sch.start_time,
                            end_time: sch.end_time,
                            status: "scheduled",
                            teaching_status: "pending",
                            session_number: 0, // will be reindexed
                        });
                    }
                }
                current.setDate(current.getDate() + 1);
            }
        }

        if (sessionsToInsert.length > 0) {
            const { error: insErr } = await supabase.from("class_sessions").insert(sessionsToInsert);
            if (insErr) {
                console.error(`  [ERROR] ${className}:`, insErr.message);
                continue;
            }
            console.log(`  [NEW] ${className}: +${sessionsToInsert.length} buổi`);
            totalGenerated += sessionsToInsert.length;
        } else {
            console.log(`  [OK] ${className}: đã đủ sessions (${existing?.length || 0} buổi)`);
        }

        // Reindex class
        const { data: allSess } = await supabase
            .from("class_sessions")
            .select("id, session_date, start_time")
            .eq("class_id", classId);

        if (allSess && allSess.length > 0) {
            allSess.sort((a, b) => {
                if (a.session_date !== b.session_date) return new Date(a.session_date) - new Date(b.session_date);
                return (a.start_time || "").localeCompare(b.start_time || "");
            });
            const updates = allSess.map((s, i) =>
                supabase.from("class_sessions").update({ session_number: i + 1 }).eq("id", s.id)
            );
            await Promise.all(updates);
            console.log(`  [REINDEX] ${className}: ${allSess.length} buổi đánh số lại`);
        }
    }

    console.log(`\n=== DONE: Tạo mới ${totalGenerated} buổi ===`);
}

main().catch(console.error);
