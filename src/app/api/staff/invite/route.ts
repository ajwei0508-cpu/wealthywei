import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // removed confusing I,1,O,0
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parentEmail = session.user.email.toLowerCase();

    // Fetch active invite codes
    const { data, error } = await supabase
      .from("invite_codes")
      .select("*")
      .eq("parent_email", parentEmail)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      if (error.code === '42P01') return NextResponse.json({ data: [] });
      throw error;
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parentEmail = session.user.email.toLowerCase();
    const body = await req.json();
    const hours = parseInt(body.hours) || 24;

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + hours);

    const code = generateCode();

    const { data, error } = await supabase
      .from("invite_codes")
      .insert([
        {
          code,
          parent_email: parentEmail,
          expires_at: expiresAt.toISOString()
        }
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parentEmail = session.user.email.toLowerCase();
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');

    if (!code) return NextResponse.json({ error: "Code required" }, { status: 400 });

    const { error } = await supabase
      .from("invite_codes")
      .delete()
      .eq("code", code)
      .eq("parent_email", parentEmail);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
