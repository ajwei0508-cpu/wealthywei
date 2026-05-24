import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    // We use email as the identifier for both directors and staff (staff email is formatted as staff_PHONE@bareun.app)
    const staffPhone = session.user.email; 

    const { data, error } = await supabase
      .from("video_progress")
      .select("*")
      .eq("staff_phone", staffPhone);

    if (error && error.code !== 'PGRST205') throw error; // Ignore missing table if not created yet

    return NextResponse.json({ data: data || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    // email is the unique identifier (director email or staff_PHONE@bareun.app)
    const staffPhone = session.user.email; 

    const body = await req.json();
    const { videoId, category } = body;

    // Check if it already exists
    const { data: existing, error: findError } = await supabase
      .from("video_progress")
      .select("id")
      .eq("staff_phone", staffPhone)
      .eq("video_id", videoId)
      .single();

    if (existing) {
      return NextResponse.json({ success: true, data: existing });
    }

    // Insert
    const { data, error } = await supabase
      .from("video_progress")
      .insert([
        {
          staff_phone: staffPhone,
          video_id: videoId,
          category: category || 'general',
          completed_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
