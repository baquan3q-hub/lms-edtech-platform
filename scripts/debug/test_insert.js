const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env.local'});
const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
c.from('users').select('*').limit(1).then(r => console.log(JSON.stringify(r)));
