import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import Papa from "papaparse";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Google Drive API 설정
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

export async function GET(req: Request) {
  try {
    // 1. Cron Auth Check (Vercel Cron에서 호출될 때만 인증)
    const authHeader = req.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // 2. 3개월(90일) 이전 데이터 조회
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90);
    const cutoffDateStr = threeMonthsAgo.toISOString();

    const { data: logs, error: fetchError } = await supabase
      .from("user_activities")
      .select("*")
      .lt("created_at", cutoffDateStr);

    if (fetchError) {
      throw new Error(`Failed to fetch old logs: ${fetchError.message}`);
    }

    if (!logs || logs.length === 0) {
      return NextResponse.json({ message: "No old logs to backup." });
    }

    // 3. CSV로 변환
    const csvContent = Papa.unparse(logs);
    const fileName = `user_activities_backup_${new Date().toISOString().split("T")[0]}.csv`;

    // 4. 구글 드라이브 업로드 (환경 변수가 설정된 경우에만)
    if (GOOGLE_SERVICE_ACCOUNT_EMAIL && GOOGLE_PRIVATE_KEY && GOOGLE_DRIVE_FOLDER_ID) {
      const auth = new google.auth.JWT(
        GOOGLE_SERVICE_ACCOUNT_EMAIL,
        undefined,
        GOOGLE_PRIVATE_KEY,
        ["https://www.googleapis.com/auth/drive.file"]
      );

      const drive = google.drive({ version: "v3", auth });

      const fileMetadata = {
        name: fileName,
        parents: [GOOGLE_DRIVE_FOLDER_ID],
      };

      const media = {
        mimeType: "text/csv",
        body: csvContent,
      };

      await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: "id",
      });

      console.log(`Successfully uploaded ${fileName} to Google Drive`);
    } else {
      console.warn("Google Drive credentials missing. Skipping upload, but keeping CSV generation active.");
    }

    // 5. 백업 완료된 데이터 Supabase에서 삭제
    const logIds = logs.map((l) => l.id);
    const { error: deleteError } = await supabase
      .from("user_activities")
      .delete()
      .in("id", logIds);

    if (deleteError) {
      throw new Error(`Failed to delete backed up logs: ${deleteError.message}`);
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully backed up and deleted ${logs.length} logs.` 
    });

  } catch (error: any) {
    console.error("Backup Cron Job Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
