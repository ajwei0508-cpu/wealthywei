import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user_email = session.user.email;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Fetch Patients
    const { data: patients, error: pError } = await supabase
      .from("patients")
      .select("id, chart_no, name, phone")
      .eq("user_email", user_email);

    if (pError) throw pError;
    if (!patients || patients.length === 0) {
      return NextResponse.json({ targets: [] });
    }

    // 2. Fetch all visit history for this user
    // In production with huge data, this should be an RPC function. For now, JS processing is fine.
    const { data: visits, error: vError } = await supabase
      .from("visit_history")
      .select("patient_id, visit_date")
      .eq("user_email", user_email);
      
    if (vError) throw vError;

    // 3. Fetch call logs
    const { data: callLogs, error: cError } = await supabase
      .from("call_logs")
      .select("patient_id, call_date, call_type, status")
      .eq("user_email", user_email);

    if (cError) throw cError;

    // Calculate max visit dates
    const maxVisitMap = new Map<string, Date>();
    (visits || []).forEach(v => {
      const vDate = new Date(v.visit_date);
      const existingMax = maxVisitMap.get(v.patient_id);
      if (!existingMax || vDate > existingMax) {
        maxVisitMap.set(v.patient_id, vDate);
      }
    });

    // Get optional 'date' parameter for testing purposes (e.g. ?date=2026-06-08)
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    
    let today = new Date();
    if (dateParam && !isNaN(new Date(dateParam).getTime())) {
      today = new Date(dateParam);
    }
    // Reset time to midnight for accurate day difference calculation
    today.setHours(0, 0, 0, 0);

    const targets: any[] = [];

    patients.forEach(patient => {
      const maxDate = maxVisitMap.get(patient.id);
      if (!maxDate) return;

      // Reset maxDate time to midnight
      const maxDateMidnight = new Date(maxDate);
      maxDateMidnight.setHours(0, 0, 0, 0);

      // Calculate days passed since last visit
      const diffTime = Math.abs(today.getTime() - maxDateMidnight.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      // Identify the required call stage
      let requiredStage = null;
      if (diffDays === 4) requiredStage = "4일차";
      else if (diffDays === 7) requiredStage = "7일차";
      else if (diffDays >= 8) requiredStage = "8일이상";

      if (!requiredStage) return; // Not a target today

      // Filter call logs for this patient
      const patientLogs = (callLogs || []).filter(log => log.patient_id === patient.id);
      
      // Has a log been made for this stage *after* or *on* the max visit date?
      const hasLogForStage = patientLogs.some(log => {
        const logDate = new Date(log.call_date);
        return log.call_type === requiredStage && logDate >= maxDateMidnight;
      });

      if (!hasLogForStage) {
        targets.push({
          ...patient,
          last_visit: maxDate.toISOString().split('T')[0],
          days_passed: diffDays,
          target_stage: requiredStage
        });
      }
    });

    return NextResponse.json({ targets });

  } catch (error) {
    console.error("Targets API Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
