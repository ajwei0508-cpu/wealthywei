import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fetchAll(table: string, email: string, selectFields: string) {
  let allData: any[] = [];
  let from = 0;
  const step = 1000;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(selectFields)
      .eq("user_email", email)
      .range(from, from + step - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allData = [...allData, ...data];
    if (data.length < step) break;
    from += step;
  }
  return allData;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role || "director";
    
    const userEmail = role === "staff" 
      ? (session.user as any).parent_email?.toLowerCase() 
      : session.user.email.toLowerCase();
    
    const body = await req.json();
    const { patientsData } = body;

    if (!patientsData || !Array.isArray(patientsData)) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }

    // 1. Fetch ALL existing patients to map chart_no -> id (Pagination needed for >1000 rows)
    const existingPatientsData = await fetchAll("patients", userEmail, "id, chart_no");
      
    const patientMap = new Map();
    existingPatientsData?.forEach(p => patientMap.set(p.chart_no, p.id));

    // 2. Prepare deduplicated patients and visits lists
    const uniquePatientsMap = new Map();
    const allVisitsToProcess = [];

    for (const p of patientsData) {
      if (!p.chart_no || !p.name) continue;
      
      const chartNoStr = String(p.chart_no);
      uniquePatientsMap.set(chartNoStr, {
        user_email: userEmail,
        chart_no: chartNoStr,
        name: p.name,
        phone: p.phone || ""
      });

      if (p.last_visit_date) {
        allVisitsToProcess.push({
          chart_no: chartNoStr,
          visit_date: p.last_visit_date
        });
      }
    }

    const patientsToInsert = [];
    const patientsToUpdate = [];

    for (const p of uniquePatientsMap.values()) {
      if (patientMap.has(p.chart_no)) {
        patientsToUpdate.push({ id: patientMap.get(p.chart_no), ...p });
      } else {
        patientsToInsert.push(p);
      }
    }

    // 3. Bulk Insert & Update Patients
    if (patientsToInsert.length > 0) {
      for (let i = 0; i < patientsToInsert.length; i += 1000) {
        const chunk = patientsToInsert.slice(i, i + 1000);
        const { data: newPatients, error } = await supabase
          .from("patients")
          .insert(chunk)
          .select("id, chart_no");
          
        if (error) throw error;
        newPatients?.forEach(p => patientMap.set(p.chart_no, p.id));
      }
    }

    if (patientsToUpdate.length > 0) {
      for (let i = 0; i < patientsToUpdate.length; i += 1000) {
        const chunk = patientsToUpdate.slice(i, i + 1000);
        const { error } = await supabase.from("patients").upsert(chunk);
        if (error) throw error;
      }
    }

    // 4. Process Visits (Bulk Insert)
    const existingVisitsData = await fetchAll("visit_history", userEmail, "patient_id, visit_date");
      
    const existingVisitSet = new Set(existingVisitsData?.map(v => `${v.patient_id}_${v.visit_date}`));
    const uniqueVisitsSet = new Set();
    const visitsToInsert = [];

    for (const v of allVisitsToProcess) {
      const pId = patientMap.get(v.chart_no);
      if (!pId) continue;
      
      const key = `${pId}_${v.visit_date}`;
      if (!existingVisitSet.has(key) && !uniqueVisitsSet.has(key)) {
        uniqueVisitsSet.add(key);
        visitsToInsert.push({
          patient_id: pId,
          user_email: userEmail,
          visit_date: v.visit_date
        });
      }
    }

    if (visitsToInsert.length > 0) {
      for (let i = 0; i < visitsToInsert.length; i += 1000) {
        const chunk = visitsToInsert.slice(i, i + 1000);
        const { error } = await supabase.from("visit_history").insert(chunk);
        if (error) throw error;
      }
    }

    return NextResponse.json({ success: true, count: uniquePatientsMap.size });
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

    const userEmail = role === "staff" 
      ? (session.user as any).parent_email?.toLowerCase() 
      : session.user.email.toLowerCase();

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
