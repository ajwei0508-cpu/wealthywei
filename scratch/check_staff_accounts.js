const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) {
    env[key.trim()] = value.join('=').trim().replace(/^["']|["']$/g, '');
  }
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkStaff() {
  const { data, error } = await supabase.from('staff_accounts').select('*');
  if (error) {
    console.error('Error fetching staff:', error);
  } else {
    console.log('Staff Accounts count:', data.length);
    data.forEach(s => {
      console.log(`Phone: ${s.phone}, Password: ${s.password}, Name: ${s.name}, Clinic: ${s.clinic_name}`);
    });
  }
}

checkStaff();
