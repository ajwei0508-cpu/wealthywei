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
  if (!session?.user?.email || session.user.email.toLowerCase() !== MASTER_EMAIL.toLowerCase()) return null;
  return session;
}

// GET — 특정 사용자 워크북 조회
export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
  if (!await checkMaster()) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const userId = decodeURIComponent(params.userId);
  try {
    const { data, error } = await supabaseAdmin.from("survey_workbook").select("*").eq("user_id", userId).single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT — 마스터가 특정 사용자 워크북 수정
export async function PUT(req: NextRequest, { params }: { params: { userId: string } }) {
  if (!await checkMaster()) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const userId = decodeURIComponent(params.userId);
  try {
    const body = await req.json();
    const { error } = await supabaseAdmin.from("survey_workbook").upsert({
      user_id: userId,
      data: body.data,
      submitted: body.submitted ?? true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — 특정 사용자 워크북 삭제
export async function DELETE(req: NextRequest, { params }: { params: { userId: string } }) {
  if (!await checkMaster()) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const userId = decodeURIComponent(params.userId);
  try {
    const { error } = await supabaseAdmin.from("survey_workbook").delete().eq("user_id", userId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
