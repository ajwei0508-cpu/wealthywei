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

async function checkData() {
  const { data, error } = await supabase
    .from('clinic_metrics')
    .select('*');
    
  if (error) {
    console.error('Error fetching data:', error);
    return;
  }
  
  console.log('Clinic Metrics Data length:', data.length);
  data.forEach(row => {
    console.log(`User: ${row.user_id}, Month: ${row.month}`);
    console.log('Metrics generatedRevenue:', row.metrics?.generatedRevenue);
    console.log('Metrics patientMetrics:', row.metrics?.patientMetrics);
    console.log('Metrics okchartData:', row.metrics?.okchartData);
    console.log('---');
  });
}

checkData();
