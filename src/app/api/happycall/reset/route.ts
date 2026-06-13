import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user_email = session.user.email;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Delete call logs
    const { error: cError } = await supabase
      .from("call_logs")
      .delete()
      .eq("user_email", user_email);
    if (cError) throw cError;

    // 2. Delete visit history
    const { error: vError } = await supabase
      .from("visit_history")
      .delete()
      .eq("user_email", user_email);
    if (vError) throw vError;

    // 3. Delete patients
    const { error: pError } = await supabase
      .from("patients")
      .delete()
      .eq("user_email", user_email);
    if (pError) throw pError;

    return NextResponse.json({ message: "성공적으로 모든 데이터가 초기화되었습니다." });

  } catch (error) {
    console.error("HappyCall Data Reset Error:", error);
    return NextResponse.json({ error: "데이터 초기화 중 서버 오류가 발생했습니다." }, { status: 500 });
  }
}
