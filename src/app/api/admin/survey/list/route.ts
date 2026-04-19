import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const session = await getServerSession(authOptions);
  
  // 진단용 로그 (서버 터미널/Vercel 로그에서 확인 가능)
  console.log("🔍 [Admin API Audit] Session Info:", {
    hasSession: !!session,
    userEmail: session?.user?.email,
    masterEmailEnv: process.env.NEXT_PUBLIC_MASTER_EMAIL || process.env.MASTER_EMAIL,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    serviceKeyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 5)
  });

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized - No session found" }, { status: 401 });
  }

  const userEmail = session.user.email.toLowerCase();
  const masterEmail = (process.env.NEXT_PUBLIC_MASTER_EMAIL || process.env.MASTER_EMAIL || "wei0508@naver.com").toLowerCase();

  console.log("🔍 [Admin API Audit] Email Match:", { userEmail, masterEmail, isMatch: userEmail === masterEmail });

  if (userEmail !== masterEmail) {
    return NextResponse.json({ error: "Forbidden - Master only" }, { status: 403 });
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
