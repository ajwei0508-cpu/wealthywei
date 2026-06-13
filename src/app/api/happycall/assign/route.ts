import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role || "director";
    if (role !== "staff") {
      return NextResponse.json({ error: "직원 계정만 환자를 담당자로 배정받을 수 있습니다." }, { status: 400 });
    }

    const userEmail = (session.user as any).parent_email?.toLowerCase();
    const staffPhone = (session.user as any).phone;
    const staffName = (session.user as any).realName || session.user.name;

    const body = await req.json();
    const { patient_chart_no, patient_name } = body;

    if (!patient_chart_no || !patient_name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Insert assignment (if fails due to uniqueness, it means already assigned)
    const { error } = await supabase.from("patient_assignments").insert([
      {
        clinic_email: userEmail,
        patient_chart_no,
        patient_name,
        staff_phone: staffPhone,
        assigned_by: staffName,
        created_at: new Date().toISOString()
      }
    ]);

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: "이미 다른 직원이 배정받은 환자입니다." }, { status: 400 });
      }
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
