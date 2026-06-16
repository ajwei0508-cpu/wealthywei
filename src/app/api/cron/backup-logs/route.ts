import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Papa from "papaparse";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // 4. Supabase Storage 백업 폴더가 없으면 생성
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.find(b => b.name === 'backups')) {
      await supabase.storage.createBucket('backups', { public: false });
    }

    // 5. Supabase Storage에 CSV 파일 업로드
    const { error: uploadError } = await supabase
      .storage
      .from('backups')
      .upload(fileName, csvContent, {
        contentType: 'text/csv',
        upsert: true
      });

    if (uploadError) {
      console.error("Supabase Storage Upload Error:", uploadError.message);
      // 업로드 실패 시 원본 데이터 삭제하지 않고 에러 반환
      throw new Error(`Failed to upload to Supabase Storage: ${uploadError.message}`);
    }

    console.log(`Successfully uploaded ${fileName} to Supabase Storage`);

    // 6. 백업 완료된 데이터 원본 테이블에서 삭제
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
      message: `Successfully backed up and deleted ${logs.length} logs to Supabase Storage.` 
    });

  } catch (error: any) {
    console.error("Backup Cron Job Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
