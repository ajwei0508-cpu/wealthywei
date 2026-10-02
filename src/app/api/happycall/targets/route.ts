
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@supabase/supabase-js";
import { evaluateHappyCallStage } from "@/lib/holidayUtils";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper for masking
function maskName(name: string) {
  if (!name) return "";
  if (name.length <= 1) return name;
  if (name.length === 2) return name.charAt(0) + "*";
  return name.charAt(0) + "*".repeat(name.length - 2) + name.slice(-1);
}

function maskPhone(phone: string) {
  if (!phone) return "";
  const clean = phone.replace(/[^0-9]/g, '');
  if (clean.length === 11) {
    return `${clean.slice(0, 3)}-****-${clean.slice(-4)}`;
  } else if (clean.length === 10) {
    return `${clean.slice(0, 3)}-***-${clean.slice(-4)}`;
  }
  return phone; // fallback
}

export async function GET(req: NextRequest) {

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }


    const role = (session.user as any).role || "director";
    const userEmail = role === "staff" 
      ? (session.user as any).parent_email?.toLowerCase() 
      : session.user.email.toLowerCase();
    
    const staffPhone = role === "staff" ? (session.user as any).phone : null;

    if (!userEmail) {
      return NextResponse.json({ error: "No associated clinic email found" }, { status: 400 });
    }

    // Fetch assignments safely
    let assignments: any[] = [];
    try {
      const { data } = await supabase.from("patient_assignments").select("*").eq("clinic_email", userEmail);
      if (data) assignments = data;
    } catch (e) {
      // Table might not exist yet
    }

    const assignmentMap: Record<string, string> = {};
    assignments.forEach((a: any) => {
      assignmentMap[a.patient_chart_no] = a.staff_phone;
    });

    async function fetchAll(table: string, email: string, orderBy?: {column: string, opts: any}) {
      let allData: any[] = [];
      let from = 0;
      const step = 1000;
      while (true) {
        let q = supabase.from(table).select("*").eq("user_email", email).range(from, from + step - 1);
        if (orderBy) q = q.order(orderBy.column, orderBy.opts);
        const { data, error } = await q;
        if (error) throw error;
        if (!data || data.length === 0) break;
        allData = [...allData, ...data];
        if (data.length < step) break;
        from += step;
      }
      return allData;
    }

    // 1. Fetch patients
    const patients = await fetchAll("patients", userEmail);

    // 2. Fetch visit history
    const visits = await fetchAll("visit_history", userEmail);

    // 3. Fetch call logs
    const callLogs = await fetchAll("call_logs", userEmail, { column: "call_date", opts: { ascending: false } });

    // 4. Calculate latest visit for each patient
    const latestVisits: Record<string, string> = {};
    visits?.forEach(v => {
      const pId = v.patient_id;
      if (!latestVisits[pId] || new Date(v.visit_date) > new Date(latestVisits[pId])) {
        latestVisits[pId] = v.visit_date;
      }
    });

    // 5. Calculate targets with Holiday & Business Days Engine
    const { searchParams } = new URL(req.url);
    const mode = (searchParams.get("mode") as "business" | "calendar") || "business";
    const closedDaysParam = searchParams.get("closed_days"); // e.g. "0" (Sunday) or "0,6"
    const closedDaysOfWeek = closedDaysParam 
      ? closedDaysParam.split(",").map(Number).filter(n => !isNaN(n))
      : [0]; // default: Sunday (일요일 휴진)

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targets = [];
    const callLogsByPatient: Record<string, any[]> = {};
    callLogs?.forEach(log => {
      if (!callLogsByPatient[log.patient_id]) {
        callLogsByPatient[log.patient_id] = [];
      }
      callLogsByPatient[log.patient_id].push(log);
    });

    for (const p of (patients || [])) {
      const assignedTo = assignmentMap[p.chart_no];

      const lastVisit = latestVisits[p.id];
      if (!lastVisit) continue;

      // Smart Evaluation with Holiday / Long-weekend / Business Days lookback
      const evalResult = evaluateHappyCallStage(lastVisit, today, mode, closedDaysOfWeek);

      if (evalResult.targetStage === "대기") continue;

      const patientHistory = callLogsByPatient[p.id] || [];
      const latestCall = patientHistory[0] || null;

      const isUnassigned = !assignedTo;
      
      targets.push({
        ...p,
        name: p.name,
        phone: p.phone,
        original_name_masked: false,
        assigned_to: assignedTo,
        is_mine: assignedTo === staffPhone,
        is_unassigned: isUnassigned,
        last_visit_date: lastVisit,
        days_passed: evalResult.daysPassed,
        calendar_days: evalResult.calendarDays,
        business_days: evalResult.businessDays,
        target_stage: evalResult.targetStage,
        is_carryover: evalResult.isCarryover,
        carryover_reason: evalResult.carryoverReason,
        badge_label: evalResult.badgeLabel,
        latest_call: latestCall,
        history: patientHistory
      });
    }

    // Sort: Carryover patients first within their stage, then by days passed
    targets.sort((a, b) => {
      if (a.is_carryover && !b.is_carryover) return -1;
      if (!a.is_carryover && b.is_carryover) return 1;
      return b.days_passed - a.days_passed;
    });

    return NextResponse.json({ 
      targets,
      mode,
      closed_days: closedDaysOfWeek,
      total_count: targets.length,
      carryover_count: targets.filter(t => t.is_carryover).length
    });
  } catch (error: any) {
    console.error("GET happycall targets error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { patient_id, call_type, status, memo } = body;

    if (!patient_id || !call_type || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const role = (session.user as any).role || "director";
    const userEmail = role === "staff" 
      ? (session.user as any).parent_email?.toLowerCase() 
      : session.user.email.toLowerCase();

    if (!userEmail) {
      return NextResponse.json({ error: "No associated clinic email found" }, { status: 400 });
    }

    const createdBy = (session.user as any).realName || session.user.name || "담당 직원";

    // Insert call log
    const { data, error } = await supabase
      .from("call_logs")
      .insert([
        {
          patient_id,
          user_email: userEmail,
          call_type,
          status,
          memo: memo || "",
          created_by: createdBy,
          call_date: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, callLog: data });
  } catch (error: any) {
    console.error("POST happycall log error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });

  }
}
