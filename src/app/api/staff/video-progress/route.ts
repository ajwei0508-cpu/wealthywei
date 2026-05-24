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
    // For staff, their phone is saved in the email session field by next-auth or we check role
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
    const staffPhone = session.user.email; 

    const body = await req.json();
    const { video_id, watched, quiz_passed } = body;

    // UPSERT
    const { data, error } = await supabase
      .from("video_progress")
      .upsert(
        {
          staff_phone: staffPhone,
          video_id,
          watched,
          quiz_passed,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'staff_phone,video_id' }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
