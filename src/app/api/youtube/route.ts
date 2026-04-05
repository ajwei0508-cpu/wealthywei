import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  if (!q) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
  if (!YOUTUBE_API_KEY) {
    // Return mock data if API key is not yet set
    return NextResponse.json({
      items: [
        {
          id: { videoId: "mock1" },
          snippet: { 
            title: "YouTube API Key 설정 필요", 
            description: "루트 디렉토리의 .env.local 파일에 YOUTUBE_API_KEY 환경 변수를 등록해야 실제 검색 결과가 표시됩니다.", 
            thumbnails: { default: { url: "https://via.placeholder.com/120x90/f8fafc/94a3b8?text=Key+Needed" } } 
          }
        }
      ]
    });
  }

  try {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=3&q=${encodeURIComponent(q)}&type=video&key=${YOUTUBE_API_KEY}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch youtube data" }, { status: 500 });
  }
}
