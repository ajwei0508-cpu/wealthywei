
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

      let patientData;
      
      // 1. Check if patient exists
      const { data: existingPatient } = await supabase
        .from("patients")
        .select("id")
        .eq("user_email", userEmail)
        .eq("chart_no", String(p.chart_no))
        .maybeSingle();
        
      if (existingPatient) {
        // Update patient
        const { data, error } = await supabase
          .from("patients")
          .update({ name: p.name, phone: p.phone || "" })
          .eq("id", existingPatient.id)
          .select()
          .single();
        if (error) {
          console.error("Patient update error:", error);
          continue;
        }
        patientData = data;
      } else {
        // Insert patient
        const { data, error } = await supabase
          .from("patients")
          .insert([{ user_email: userEmail, chart_no: String(p.chart_no), name: p.name, phone: p.phone || "" }])
          .select()
          .single();
        if (error) {
          console.error("Patient insert error:", error);
          continue;
        }
        patientData = data;
      }

      insertedPatientsCount++;

      // Insert Visit History if present
      if (p.last_visit_date) {
        let visitDate = p.last_visit_date;
        
        const { data: existingVisit } = await supabase
          .from("visit_history")
          .select("id")
          .eq("patient_id", patientData.id)
          .eq("visit_date", visitDate)
          .maybeSingle();
          
        if (!existingVisit) {
          const { error: visitError } = await supabase
            .from("visit_history")
            .insert([{
              patient_id: patientData.id,
              user_email: userEmail,
              visit_date: visitDate
            }]);
            
          if (visitError) {
            console.error("Visit insert error:", visitError);
          }
        }
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
