import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  if (!q) {
    return NextResponse.json({ error: "Missing query parameter 'q'" }, { status: 400 });
  }

  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
  if (!YOUTUBE_API_KEY) {
    console.error("🔥 YOUTUBE_API_KEY가 환경 변수에 설정되지 않았습니다.");
    return NextResponse.json({ error: "YouTube API Key is missing from environment" }, { status: 500 });
  }

  try {
    const youtubeUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=3&q=${encodeURIComponent(q)}&type=video&order=viewCount&key=${YOUTUBE_API_KEY}`;
    
    const res = await fetch(youtubeUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });
    
    if (!res.ok) {
       const errorBody = await res.json();
       console.error("YouTube API failure:", errorBody);
        const isQuotaExceeded = errorBody.error?.errors?.some((e: any) => e.reason === "quotaExceeded");
        const isKeyRestricted = errorBody.error?.errors?.some((e: any) => e.reason === "keyInvalid" || e.reason === "forbidden");
        
        return NextResponse.json({ 
          error: isQuotaExceeded ? "YouTube_Quota_Exceeded" : (isKeyRestricted ? "YouTube_Key_Restricted" : "YouTube API Request Failed"), 
          details: errorBody 
        }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("YouTube API Exception:", error);
    return NextResponse.json({ error: "Internal Server Error fetching YouTube data" }, { status: 500 });
  }
}
