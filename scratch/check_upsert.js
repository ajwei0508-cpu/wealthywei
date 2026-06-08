const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) env[key.trim()] = value.join('=').trim().replace(/^["']|["']$/g, '');
});
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
supabase.from('user_permissions').upsert({
  user_email: 'test@test.com',
  real_name: 'test',
  clinic_name: 'test',
  age: 40
}, { onConflict: 'user_email' }).then(console.log).catch(console.error);
