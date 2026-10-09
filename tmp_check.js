const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const lines = fs.readFileSync('.env','utf8').split(/\r?\n/).filter(Boolean).filter(line => !line.startsWith('#'));
const env = {};
for (const line of lines) {
  const idx = line.indexOf('=');
  if (idx === -1) continue;
  const key = line.slice(0, idx).trim();
  const value = line.slice(idx + 1).trim();
  env[key] = value;
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY);
(async () => {
  const tables = ['camera','orders','order_detail','payment','customer','admin_user'];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    console.log('\nTABLE', table);
    if (error) { console.log('ERROR', error.message); continue; }
    console.log('ROW_KEYS', data && data[0] ? Object.keys(data[0]) : []);
    console.log('SAMPLE', data && data[0] ? JSON.stringify(data[0], null, 2) : null);
  }
})().catch((e) => { console.error(e); process.exit(1); });
