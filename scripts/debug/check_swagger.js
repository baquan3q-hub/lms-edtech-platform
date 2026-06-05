require('dotenv').config({path: '.env.local'});
const fetch = require('node-fetch');

async function check() {
    const res = await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/?apikey=' + process.env.SUPABASE_SERVICE_ROLE_KEY);
    const data = await res.json();
    const rpcs = Object.keys(data.paths).filter(p => p.startsWith('/rpc/'));
    console.log("RPCs available:", rpcs);
}
check();
