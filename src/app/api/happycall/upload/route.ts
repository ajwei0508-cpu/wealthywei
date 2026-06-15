
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
    if (role === "staff") {
      return NextResponse.json({ error: "원장님 계정만 엑셀 업로드가 가능합니다." }, { status: 403 });
    }

    const userEmail = session.user.email.toLowerCase();
    const body = await req.json();
    const { patientsData } = body;

    if (!patientsData || !Array.isArray(patientsData)) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }

    // Process in batches
    let insertedPatientsCount = 0;
    
    for (const p of patientsData) {
      if (!p.chart_no || !p.name) continue;

      // Upsert Patient
      const { data: patientData, error: patientError } = await supabase
        .from("patients")
        .upsert([{
          user_email: userEmail,
          chart_no: String(p.chart_no),
          name: p.name,
          phone: p.phone || ""
        }], { onConflict: 'user_email, chart_no' })
        .select()
        .single();

      if (patientError) {
        console.error("Patient upsert error:", patientError);
        continue;
      }

      insertedPatientsCount++;

      // Insert Visit History if present
      if (p.last_visit_date) {
        let visitDate = p.last_visit_date;
        // Basic normalization if it's MM/DD/YYYY or similar
        // We'll trust the client side parser mostly.
        
        await supabase
          .from("visit_history")
          .upsert([{
            patient_id: patientData.id,
            user_email: userEmail,
            visit_date: visitDate,
            doctor_name: p.doctor_name || "원장",
            treatment_type: p.treatment_type || "진료"
          }], { onConflict: 'patient_id, visit_date' });
      }
    }

    return NextResponse.json({ success: true, count: insertedPatientsCount });
  } catch (error: any) {
    console.error("Upload Happycall Data error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role || "director";
    if (role === "staff") {
      return NextResponse.json({ error: "원장님 계정만 데이터 삭제가 가능합니다." }, { status: 403 });
    }

    const userEmail = session.user.email.toLowerCase();

    // Patients will cascade delete visit_history if foreign key is set up correctly.
    // Otherwise we delete visit_history first.
    await supabase.from("visit_history").delete().eq("user_email", userEmail);
    await supabase.from("call_logs").delete().eq("user_email", userEmail);
    await supabase.from("patient_assignments").delete().eq("clinic_email", userEmail);
    const { error } = await supabase.from("patients").delete().eq("user_email", userEmail);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });

  }
}
