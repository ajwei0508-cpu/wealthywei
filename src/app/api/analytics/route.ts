import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Create a server-side Supabase client using the service role key to bypass RLS for logging
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { user_email, user_role, action_type, path, metadata } = body;

    // Validate essential fields
    if (!action_type || !path) {
      return NextResponse.json(
        { error: 'action_type and path are required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('user_activities')
      .insert([
        {
          user_email: user_email || 'anonymous',
          user_role: user_role || 'guest',
          action_type,
          path,
          metadata: metadata || {},
          created_at: new Date().toISOString(),
        },
      ]);

    if (error) {
      console.error('Failed to log activity to Supabase:', error);
      return NextResponse.json(
        { error: 'Failed to log activity' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
