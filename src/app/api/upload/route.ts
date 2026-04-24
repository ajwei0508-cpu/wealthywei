import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const path = formData.get("path") as string | null;

    if (!file || !path) {
      return NextResponse.json({ error: "Missing file or path" }, { status: 400 });
    }

    // Replace special characters in filename to avoid issues
    const safeFilename = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const fullPath = `${session.user.email}/${path}/${Date.now()}_${safeFilename}`;

    const { data, error } = await supabaseAdmin.storage
      .from("survey-materials")
      .upload(fullPath, file, {
        upsert: true,
      });

    if (error) {
      throw error;
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("survey-materials")
      .getPublicUrl(data.path);

    return NextResponse.json({ url: publicUrlData.publicUrl });
  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
