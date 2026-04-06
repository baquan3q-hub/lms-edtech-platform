const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data: scheds } = await supabase
        .from('class_schedules')
        .select('*')
        .limit(1);
    
    console.log(JSON.stringify(scheds[0]));
}

main().catch(console.error);
