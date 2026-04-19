import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MASTER_EMAIL = process.env.MASTER_EMAIL || process.env.NEXT_PUBLIC_MASTER_EMAIL || "wei0508@naver.com";

export async function GET() {
  const session = await getServerSession(authOptions);
  
  // Detailed logging
  console.log("🔍 Admin Survey List Request:", {
    hasSession: !!session,
    userEmail: session?.user?.email,
    masterEmail: MASTER_EMAIL,
    match: session?.user?.email?.toLowerCase() === MASTER_EMAIL.toLowerCase()
  });

  if (!session?.user?.email || session.user.email.toLowerCase() !== MASTER_EMAIL.toLowerCase()) {
    return NextResponse.json({ error: "Unauthorized - Master only" }, { status: 403 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("survey_workbook")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error("🔥 Admin Survey GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
