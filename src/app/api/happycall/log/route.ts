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
    const created_by = session.user.name || user_email;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();
    const { patient_id, call_type, status, memo } = body;

    if (!patient_id || !call_type || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { error } = await supabase
      .from("call_logs")
      .insert({
        patient_id,
        user_email,
        call_type,
        status,
        memo: memo || "",
        created_by
      });

    if (error) {
      console.error("Error inserting call log:", error);
      return NextResponse.json({ error: "Failed to save call log" }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Log API Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
