import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    if (!userEmail) {
      return NextResponse.json({ error: "No associated clinic email found" }, { status: 400 });
    }

    // Fetch visit_history
    let allVisits: any[] = [];
    let from = 0;
    const step = 1000;
    while (true) {
      const { data, error } = await supabase
        .from("visit_history")
        .select("visit_date, patient_id")
        .eq("user_email", userEmail)
        .range(from, from + step - 1);
        
      if (error) throw error;
      if (!data || data.length === 0) break;
      allVisits = [...allVisits, ...data];
      if (data.length < step) break;
      from += step;
    }

    // Group by visit_date
    const countsByDate: Record<string, Set<string>> = {};
    allVisits.forEach(v => {
      if (!v.visit_date) return;
      if (!countsByDate[v.visit_date]) {
        countsByDate[v.visit_date] = new Set();
      }
      countsByDate[v.visit_date].add(v.patient_id);
    });

    const history = Object.keys(countsByDate).map(date => ({
      date,
      count: countsByDate[date].size
    }));

    // Sort by date DESC
    history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({ history });
  } catch (error: any) {
    console.error("GET happycall history error:", error);
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

    const body = await req.json();
    const { date } = body;

    if (!date) {
      return NextResponse.json({ error: "Missing date" }, { status: 400 });
    }

    // Delete visit history for that date
    const { error } = await supabase
      .from("visit_history")
      .delete()
      .eq("user_email", userEmail)
      .eq("visit_date", date);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE happycall history error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
