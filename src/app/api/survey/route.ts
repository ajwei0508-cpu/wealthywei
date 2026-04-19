import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.email.toLowerCase();

  try {
    const { data, error } = await supabaseAdmin
      .from("survey_workbook")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows found

    return NextResponse.json({ data: data || null });
  } catch (err: any) {
    console.error("🔥 Survey GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.email.toLowerCase();

  try {
    // 이미 제출된 경우 마스터만 수정 가능
    const { data: existing } = await supabaseAdmin
      .from("survey_workbook")
      .select("submitted")
      .eq("user_id", userId)
      .single();

    const masterEmail = (process.env.MASTER_EMAIL || "").toLowerCase();
    if (existing?.submitted && userId !== masterEmail) {
      return NextResponse.json({ error: "이미 제출된 워크북은 수정할 수 없습니다." }, { status: 403 });
    }

    const body = await req.json();

    const { data: existingRow } = await supabaseAdmin
      .from("survey_workbook")
      .select("user_id")
      .eq("user_id", userId)
      .single();

    const payload = {
      data: body,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (existingRow) {
      const { error: updateError } = await supabaseAdmin
        .from("survey_workbook")
        .update(payload)
        .eq("user_id", userId);
      error = updateError;
    } else {
      const { error: insertError } = await supabaseAdmin
        .from("survey_workbook")
        .insert({ user_id: userId, ...payload });
      error = insertError;
    }

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("🔥 Survey POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
