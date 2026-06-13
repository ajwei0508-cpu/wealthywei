import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@supabase/supabase-js";

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

    // 1. Fetch patients
    const { data: patients, error: errPatients } = await supabase
      .from("patients")
      .select("*")
      .eq("user_email", userEmail);

    if (errPatients) throw errPatients;

    // 2. Fetch visit history
    const { data: visits, error: errVisits } = await supabase
      .from("visit_history")
      .select("*")
      .eq("user_email", userEmail);

    if (errVisits) throw errVisits;

    // 3. Fetch call logs
    const { data: callLogs, error: errCallLogs } = await supabase
      .from("call_logs")
      .select("*")
      .eq("user_email", userEmail)
      .order("call_date", { ascending: false });

    if (errCallLogs) throw errCallLogs;

    // 4. Calculate latest visit for each patient
    const latestVisits: Record<string, string> = {};
    visits?.forEach(v => {
      const pId = v.patient_id;
      if (!latestVisits[pId] || new Date(v.visit_date) > new Date(latestVisits[pId])) {
        latestVisits[pId] = v.visit_date;
      }
    });

    // 5. Calculate targets
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
      
      // If staff, hide patients assigned to OTHER staff
      if (role === "staff" && assignedTo && assignedTo !== staffPhone) {
        continue;
      }

      const lastVisit = latestVisits[p.id];
      if (!lastVisit) continue;

      const lastVisitDate = new Date(lastVisit);
      lastVisitDate.setHours(0, 0, 0, 0);
      
      const diffTime = today.getTime() - lastVisitDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 4) continue;

      let targetStage: '4일차' | '7일차' | '8일 이상' = '8일 이상';
      if (diffDays >= 4 && diffDays <= 6) {
        targetStage = '4일차';
      } else if (diffDays === 7) {
        targetStage = '7일차';
      } else {
        targetStage = '8일 이상';
      }

      const patientHistory = callLogsByPatient[p.id] || [];
      const latestCall = patientHistory[0] || null;

      // Mask sensitive data for the list view
      const isUnassigned = !assignedTo;
      
      targets.push({
        ...p,
        name: maskName(p.name),
        phone: maskPhone(p.phone),
        original_name_masked: true, // flag to indicate this is masked data
        assigned_to: assignedTo,
        is_mine: assignedTo === staffPhone,
        is_unassigned: isUnassigned,
        last_visit_date: lastVisit,
        days_passed: diffDays,
        target_stage: targetStage,
        latest_call: latestCall,
        history: patientHistory
      });
    }

    targets.sort((a, b) => b.days_passed - a.days_passed);

    return NextResponse.json({ targets });
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
