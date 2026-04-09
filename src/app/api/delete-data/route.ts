import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MASTER_EMAIL = "wei0508@naver.com";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { userId, month } = await req.json();

    if (!userId || !month) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Security: Only master or the owner can delete
    const isMaster = session.user.email.toLowerCase() === MASTER_EMAIL.toLowerCase();
    const isOwner = userId.toLowerCase() === session.user.email.toLowerCase();

    if (!isMaster && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from("clinic_metrics")
      .delete()
      .eq("user_id", userId.toLowerCase())
      .eq("month", month);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Delete data error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
