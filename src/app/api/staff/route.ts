import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parentEmail = session.user.email.toLowerCase();

    // Fetch staff accounts linked to this director
    const { data, error } = await supabase
      .from("staff_accounts")
      .select("id, phone, name, clinic_name, created_at")
      .eq("parent_email", parentEmail)
      .order("created_at", { ascending: false });

    if (error) {
      if (error.code === '42P01') return NextResponse.json({ data: [], progress: [] });
      throw error;
    }
    
    // Now get progress
    let progressData: any[] = [];
    if (data && data.length > 0) {
      const staffEmails = data.map((s: any) => `staff_${s.phone}@bareun.app`);
      const { data: pData, error: pError } = await supabase
        .from("video_progress")
        .select("*")
        .in("staff_phone", staffEmails);
        
      if (!pError) {
        progressData = pData || [];
      }
    }

    return NextResponse.json({ data, progress: progressData });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone, password, name, clinic_name, invite_code } = body;

    if (!phone || !password || !name || !clinic_name || !invite_code) {
      return NextResponse.json({ error: "모든 항목을 입력해주세요." }, { status: 400 });
    }

    // Check invite code
    const { data: inviteData, error: inviteError } = await supabase
      .from("invite_codes")
      .select("*")
      .eq("code", invite_code)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (inviteError || !inviteData) {
      return NextResponse.json({ error: "유효하지 않거나 만료된 초대 코드입니다." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("staff_accounts")
      .insert([
        {
          parent_email: inviteData.parent_email,
          phone: phone.replace(/-/g, ""),
          password: password,
          name: name,
          clinic_name: clinic_name
        }
      ])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: "이미 가입된 휴대폰 번호입니다." }, { status: 400 });
      }
      throw error;
    }

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
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const { error } = await supabase
      .from("staff_accounts")
      .delete()
      .eq("id", id)
      .eq("parent_email", parentEmail);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
