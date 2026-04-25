import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const MASTER_EMAIL = process.env.MASTER_EMAIL || "wei0508@naver.com";

async function checkMaster() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || session.user.email.toLowerCase() !== MASTER_EMAIL.toLowerCase()) {
    return null;
  }
  return session;
}

// GET — 모든 사용자의 워크북 목록
export async function GET() {
  const session = await checkMaster();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { data, error } = await supabaseAdmin
      .from("survey_workbook")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
