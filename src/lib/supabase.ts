import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wltlsezxaaxdhadppyvs.supabase.co').trim();
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsdGxzZXp4YWF4ZGhhZHBweXZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1Njc1NDYsImV4cCI6MjA5MTE0MzU0Nn0.Ptiy4kjGGzcGaIe6ko4m8TQuwaqpTqV8mBPebzfNjOA').trim();

// Logging for identification (first 10 chars)
if (typeof window !== 'undefined') {
  console.log('🔹 Supabase Key Prefix:', supabaseAnonKey.substring(0, 10) + '...');
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('🔥 Supabase Error: URL or Anon Key is missing! Check environment variables.');
}

// Simple validation for JWT format (JWS must have 3 parts)
if (supabaseAnonKey && supabaseAnonKey.split('.').length !== 3) {
  console.error('🔥 Supabase Error: Invalid JWT format for Anon Key. It should have 3 parts separated by dots.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
