import { NextRequest, NextResponse } from "next/server";
import { launchCardScraperBrowser, CARD_PORTAL_URLS } from "@/lib/cardBrowserScraper";

// POST /api/cards/browser/scrape
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cardCompanyName = body.cardCompanyName || "통합 (내카드한눈에)";

    const result = await launchCardScraperBrowser(cardCompanyName);

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error: any) {
    console.error("Browser Scraper API error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "브라우저 자동화 실행 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// GET /api/cards/browser/scrape - returns supported card portals
export async function GET() {
  return NextResponse.json({
    success: true,
    portals: Object.entries(CARD_PORTAL_URLS).map(([key, val]) => ({
      key,
      name: val.name,
      guide: val.guide
    }))
  });
}
