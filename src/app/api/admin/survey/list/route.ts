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
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userEmail = session.user.email.toLowerCase();
  const masterEmail = (process.env.NEXT_PUBLIC_MASTER_EMAIL || process.env.MASTER_EMAIL || "wei0508@naver.com").toLowerCase();

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
