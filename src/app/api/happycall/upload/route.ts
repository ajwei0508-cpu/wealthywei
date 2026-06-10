import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
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

    const { visits } = await request.json();
    if (!visits || !Array.isArray(visits)) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }

    // 1. Get existing patients for this user
    const { data: existingPatients, error: patientError } = await supabase
      .from("patients")
      .select("id, chart_no, name")
      .eq("user_email", user_email);

    if (patientError) {
      console.error("Error fetching patients:", patientError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    const patientMap = new Map(existingPatients?.map((p) => [p.chart_no, p.id]) || []);
    
    // 2. Identify new patients and insert them
    const newPatientsToInsert: any[] = [];
    const uniqueChartNos = new Set();

    for (const v of visits) {
      if (!v.chart_no) continue;
      
      if (!patientMap.has(v.chart_no) && !uniqueChartNos.has(v.chart_no)) {
        uniqueChartNos.add(v.chart_no);
        newPatientsToInsert.push({
          user_email,
          chart_no: v.chart_no,
          name: v.name || "Unknown",
          phone: v.phone || "",
        });
      }
    }

    if (newPatientsToInsert.length > 0) {
      const { data: insertedPatients, error: insertError } = await supabase
        .from("patients")
        .insert(newPatientsToInsert)
        .select("id, chart_no");
        
      if (insertError) {
        console.error("Error inserting patients:", insertError);
        return NextResponse.json({ error: "Failed to insert new patients" }, { status: 500 });
      }
      
      // Update our map with newly created patient IDs
      insertedPatients?.forEach(p => patientMap.set(p.chart_no, p.id));
    }

    // 3. Insert Visit History (Ignore duplicates based on patient_id + visit_date)
    // First, fetch existing visits for these patients to avoid duplicates
    // To optimize, we'll just fetch all visit_dates for this user and build a Set
    const { data: existingVisits, error: visitFetchError } = await supabase
      .from("visit_history")
      .select("patient_id, visit_date")
      .eq("user_email", user_email);

    if (visitFetchError) {
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    const visitSet = new Set(existingVisits?.map(v => `${v.patient_id}_${v.visit_date}`));
    const newVisitsToInsert: any[] = [];

    for (const v of visits) {
      if (!v.chart_no || !v.visit_date) continue;
      
      const patientId = patientMap.get(v.chart_no);
      if (!patientId) continue; // Should not happen

      const visitKey = `${patientId}_${v.visit_date}`;
      if (!visitSet.has(visitKey)) {
        visitSet.add(visitKey); // Prevent duplicate inserts from the same payload
        newVisitsToInsert.push({
          patient_id: patientId,
          user_email,
          visit_date: v.visit_date,
          emr_source: v.emr_source || "unknown",
        });
      }
    }

    if (newVisitsToInsert.length > 0) {
      // Chunk inserts if there are too many, but Supabase can handle a few thousand easily
      const { error: visitInsertError } = await supabase
        .from("visit_history")
        .insert(newVisitsToInsert);
        
      if (visitInsertError) {
        console.error("Error inserting visits:", visitInsertError);
        return NextResponse.json({ error: "Failed to insert visit history" }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Processed. Inserted ${newPatientsToInsert.length} new patients and ${newVisitsToInsert.length} new visits.` 
    });

  } catch (error) {
    console.error("Upload API Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
