import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MASTER_EMAIL = (process.env.NEXT_PUBLIC_MASTER_EMAIL || "wei0508@naver.com").toLowerCase();

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const loggedInEmail = session.user.email.toLowerCase();
  const isMaster = loggedInEmail === MASTER_EMAIL;

  const { searchParams } = new URL(req.url);
  const requestedUserId = searchParams.get("userId")?.toLowerCase();
  const targetUserId = isMaster && requestedUserId ? requestedUserId : loggedInEmail;

  try {
    const { data, error } = await supabaseAdmin
      .from("survey_workbook")
      .select("*")
      .eq("user_id", targetUserId)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    // 마스터인 경우 전체 작성자 목록 요약도 함께 반환하여 /survey 화면에서도 모든 회원의 설문을 전환 열람 가능하게 지원
    let memberList: { user_id: string; name: string; clinic: string; submitted: boolean; updated_at: string }[] = [];
    if (isMaster) {
      const { data: allRows } = await supabaseAdmin
        .from("survey_workbook")
        .select("user_id, data, submitted, updated_at")
        .order("updated_at", { ascending: false });

      if (allRows) {
        const seen = new Set<string>();
        for (const r of allRows) {
          const uid = String(r.user_id || "").toLowerCase().trim();
          if (!uid || uid === MASTER_EMAIL || seen.has(uid)) continue;
          seen.add(uid);
          const dName = r.data?.ch1?.name || uid.split("@")[0];
          const cName = r.data?.ch1?.clinic || "한의원 미입력";
          const isSub = Boolean(r.submitted || r.data?.submitted);
          memberList.push({
            user_id: uid,
            userId: uid,
            name: dName,
            directorName: dName,
            clinic: cName,
            clinicName: cName,
            submitted: isSub,
            updated_at: r.updated_at,
          } as any);
        }
      }
    }

    return NextResponse.json({ data: data || null, memberList });
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
  const loggedInEmail = session.user.email.toLowerCase();
  const isMaster = loggedInEmail === MASTER_EMAIL;

  const { searchParams } = new URL(req.url);
  const requestedUserId = searchParams.get("userId")?.toLowerCase();
  const targetUserId = isMaster && requestedUserId ? requestedUserId : loggedInEmail;

  try {
    const body = await req.json();

    const { data: existingRow } = await supabaseAdmin
      .from("survey_workbook")
      .select("user_id")
      .eq("user_id", targetUserId)
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
        .eq("user_id", targetUserId);
      error = updateError;
    } else {
      const { error: insertError } = await supabaseAdmin
        .from("survey_workbook")
        .insert({ user_id: targetUserId, ...payload });
      error = insertError;
    }

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("🔥 Survey POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
