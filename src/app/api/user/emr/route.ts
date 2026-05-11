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
    const { emrId } = await req.json();

    if (!emrId) {
      return NextResponse.json({ error: "EMR ID is required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("user_permissions")
      .update({ selected_emr: emrId })
      .eq("user_email", session.user.email.toLowerCase());

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("EMR selection error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
