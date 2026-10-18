import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MASTER_EMAIL = (process.env.NEXT_PUBLIC_MASTER_EMAIL || "wei0508@naver.com").toLowerCase();

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized - No session" }, { status: 401 });
  }

  const userEmail = session.user.email.toLowerCase();

  // Master check
  if (userEmail !== MASTER_EMAIL) {
    return NextResponse.json({ error: "Unauthorized - Not Master Admin" }, { status: 403 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("survey_workbook")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ data: data || [] });
  } catch (err: any) {
    console.error("🔥 Admin Survey GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userEmail = session.user.email.toLowerCase();
  if (userEmail !== MASTER_EMAIL) {
    return NextResponse.json({ error: "Forbidden - Master Only" }, { status: 403 });
  }

  try {
    const { targetUserId, data: updatedData } = await req.json();
    if (!targetUserId || !updatedData) {
      return NextResponse.json({ error: "Missing targetUserId or data" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("survey_workbook")
      .update({
        data: updatedData,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", targetUserId.toLowerCase());

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("🔥 Admin Survey POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
