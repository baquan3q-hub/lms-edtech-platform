require('dotenv').config({path: '.env.local'});
const fetch = require('node-fetch');

async function check() {
    const res = await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/', {
        headers: {
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
        }
    });
    const data = await res.json();
    console.log("Tables available:");
    Object.keys(data.definitions).forEach(d => console.log(d));
}
check();
