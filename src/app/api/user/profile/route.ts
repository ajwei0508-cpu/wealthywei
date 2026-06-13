import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { realName, clinicName, age, phone } = await req.json();

    if (!realName || !clinicName || !age || !phone) {
      return NextResponse.json({ error: "모든 필수 항목을 입력해주세요." }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("user_permissions")
      .upsert({
        user_email: session.user.email.toLowerCase(),
        real_name: realName,
        clinic_name: clinicName,
        age: parseInt(age, 10),
        phone: phone,
      }, { onConflict: "user_email" });

    if (error) {
      // If error is about missing columns, provide a clear message
      if (error.code === '42703') {
        console.error("DB Column missing:", error);
        return NextResponse.json({ error: "데이터베이스 설정이 필요합니다. 관리자에게 문의하세요 (user_permissions 테이블에 real_name, clinic_name, age 컬럼 추가 필요)." }, { status: 500 });
      }
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Profile update error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
