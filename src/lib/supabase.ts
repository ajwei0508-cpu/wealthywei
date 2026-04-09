import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wltlsezxaaxdhadppyvs.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsdGxzZXp4YWF4ZGhhZHBweXZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1Njc1NDYsImV4cCI6MjA5MTE0MzU0Nn0.Ptiy4kjGGzcGaIe6ko4m8TQuwaqpTqV8mBPebzfNjOA';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Check your .env.local file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
