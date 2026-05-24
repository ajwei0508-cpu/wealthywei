import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const masterEmail = process.env.NEXT_PUBLIC_MASTER_EMAIL || "wei0508@naver.com";
    if (session?.user?.email?.toLowerCase() !== masterEmail.toLowerCase()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: staffData, error: staffError } = await supabase
      .from("staff_accounts")
      .select("*")
      .order("created_at", { ascending: false });

    if (staffError && staffError.code !== '42P01') throw staffError;

    const { data: inviteData, error: inviteError } = await supabase
      .from("invite_codes")
      .select("*")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (inviteError && inviteError.code !== '42P01') throw inviteError;

    return NextResponse.json({ 
      staff: staffData || [], 
      invites: inviteData || [] 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // Master generates invite code on behalf of a clinic
  try {
    const session = await getServerSession(authOptions);
    const masterEmail = process.env.NEXT_PUBLIC_MASTER_EMAIL || "wei0508@naver.com";
    if (session?.user?.email?.toLowerCase() !== masterEmail.toLowerCase()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { targetEmail, hours } = body;
    if (!targetEmail) return NextResponse.json({ error: "Target email required" }, { status: 400 });

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (hours || 24));

    const code = generateCode();

    const { data, error } = await supabase
      .from("invite_codes")
      .insert([
        {
          code,
          parent_email: targetEmail.toLowerCase(),
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
  // Master deletes a staff account
  try {
    const session = await getServerSession(authOptions);
    const masterEmail = process.env.NEXT_PUBLIC_MASTER_EMAIL || "wei0508@naver.com";
    if (session?.user?.email?.toLowerCase() !== masterEmail.toLowerCase()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const { error } = await supabase
      .from("staff_accounts")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
