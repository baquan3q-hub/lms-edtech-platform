import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  if (error) console.error(error);

  if (users) {
    console.log(`Total Auth Users: ${users.length}`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const activeToday = users.filter(u => u.last_sign_in_at && new Date(u.last_sign_in_at) >= today);
    console.log(`Active Today: ${activeToday.length}`);
  }
}
check();
