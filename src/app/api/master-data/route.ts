import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

// 서버 전용 서비스 롤 클라이언트 - RLS 완전 우회
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MASTER_EMAIL = process.env.MASTER_EMAIL || "wei0508@naver.com";

export async function GET(req: NextRequest) {
  // 1. 서버사이드 세션 확인 - 마스터 이메일만 허용
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || session.user.email !== MASTER_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const userEmail = searchParams.get("email"); // 특정 사용자 조회 시 필터

  try {
    let query = supabaseAdmin
      .from("clinic_metrics")
      .select("*")
      .order("created_at", { ascending: false });

    if (userEmail) {
      query = query.eq("user_id", userEmail.toLowerCase());
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error("Master data fetch error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
