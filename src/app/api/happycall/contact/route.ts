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

    const body = await req.json();
    const { patient_id, chart_no, action } = body;

    if (!patient_id || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const role = (session.user as any).role || "director";
    const userEmail = role === "staff" 
      ? (session.user as any).parent_email?.toLowerCase() 
      : session.user.email.toLowerCase();
    
    const staffPhone = role === "staff" ? (session.user as any).phone : "DIRECTOR";

    // 1. Log the access for auditing
    try {
      await supabase.from("patient_access_logs").insert([
        {
          clinic_email: userEmail,
          staff_phone: staffPhone,
          patient_chart_no: chart_no || patient_id, 
          action: action,
          ip_address: req.headers.get("x-forwarded-for") || "unknown",
          created_at: new Date().toISOString()
        }
      ]);
    } catch (e) {
      // Ignore if table doesn't exist yet
    }

    // 2. Fetch real patient data
    const { data: patient, error } = await supabase
      .from("patients")
      .select("*")
      .eq("id", patient_id)
      .single();

    if (error || !patient) throw new Error("환자를 찾을 수 없습니다.");

    return NextResponse.json({ name: patient.name, phone: patient.phone });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
