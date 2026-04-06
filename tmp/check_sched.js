const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data: classes } = await supabase
        .from('classes')
        .select('*')
        .eq('name', 'K01.02');
    
    if (!classes || classes.length === 0) {
        console.log("No class");
        return;
    }
    const cls = classes[0];
    console.log("Class:", cls);

    const { data: scheds } = await supabase
        .from('class_schedules')
        .select('*')
        .eq('class_id', cls.id);
    
    console.log("Class Schedules:", scheds);
}

main().catch(console.error);
