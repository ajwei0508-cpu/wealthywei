import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: 'next_auth' } }
);

const MASTER_EMAIL = process.env.NEXT_PUBLIC_MASTER_EMAIL || "wei0508@naver.com";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || session.user.email.toLowerCase() !== MASTER_EMAIL.toLowerCase()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    // 1. next_auth.users 테이블에서 모든 사용자 정보 가져오기
    const { data: users, error: uError } = await supabaseAdmin
      .from("users")
      .select("id, name, email, image")
      .order("name", { ascending: true });

    if (uError) throw uError;

    // 2. public.user_permissions 테이블에서 권한 정보 가져오기
    // Note: We use a separate client for public schema (default)
    const supabasePublic = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: permissions, error: pError } = await supabasePublic
      .from("user_permissions")
      .select("*");

    // permissions table might not exist yet if user hasn't run SQL
    const permsMap = new Map();
    if (!pError && permissions) {
      permissions.forEach(p => permsMap.set(p.user_email.toLowerCase(), p));
    }

    // 3. Merge data
    const mergedData = users.map(u => ({
      ...u,
      permissions: permsMap.get(u.email?.toLowerCase()) || { 
        approval_status: 'pending', 
        approved_category: null,
        approved_categories: []
      }
    }));

    return NextResponse.json({ data: mergedData, permissionsError: pError?.message });
  } catch (err: any) {
    console.error("User list fetch error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
