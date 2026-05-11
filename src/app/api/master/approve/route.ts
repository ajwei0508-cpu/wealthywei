import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MASTER_EMAIL = process.env.NEXT_PUBLIC_MASTER_EMAIL || "wei0508@naver.com";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || session.user.email.toLowerCase() !== MASTER_EMAIL.toLowerCase()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { email, status, categories } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Update or Insert permissions
    const { data, error } = await supabaseAdmin
      .from("user_permissions")
      .upsert({
        user_email: email.toLowerCase(),
        approval_status: status,
        approved_categories: categories || [],
        approved_category: categories && categories.length > 0 ? categories[0] : null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_email' });

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("Approval error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
