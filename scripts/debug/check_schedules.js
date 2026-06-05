require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: schedules, error } = await supabase
        .from("class_schedules")
        .select("*, class:classes(name)")
        .limit(10);

    fs.writeFileSync("output_schedules.json", JSON.stringify(schedules, null, 2));
}

run();
