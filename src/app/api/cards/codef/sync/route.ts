import { NextRequest, NextResponse } from "next/server";
import { fetchCardApprovalsFromCodef, CODEF_CARD_ORGANIZATIONS } from "@/lib/codefClient";
import { appendServerTransactions, getServerCardSettings, saveServerCardSettings } from "@/lib/cardStorage";

// POST /api/cards/codef/sync
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cardCompanyName = body.cardCompanyName || "현대카드";
    const savedSettings = getServerCardSettings();

    const clientId = body.clientId || savedSettings.codefClientId || process.env.CODEF_CLIENT_ID;
    const clientSecret = body.clientSecret || savedSettings.codefClientSecret || process.env.CODEF_CLIENT_SECRET;
    const connectedId = body.connectedId;

    if (body.clientId || body.clientSecret) {
      saveServerCardSettings({
        ...savedSettings,
        codefClientId: body.clientId || savedSettings.codefClientId,
        codefClientSecret: body.clientSecret || savedSettings.codefClientSecret,
        lastSyncTime: Date.now()
      });
    }

    const result = await fetchCardApprovalsFromCodef({
      clientId,
      clientSecret,
      connectedId,
      cardCompanyName,
      startDate: body.startDate,
      endDate: body.endDate
    });

    if (result.success && result.transactions.length > 0) {
      const { added, totalCount } = appendServerTransactions(result.transactions);
      return NextResponse.json({
        success: true,
        message: result.message,
        addedCount: added.length,
        totalCount,
        transactions: added
      });
    }

    return NextResponse.json(result, { status: 400 });
  } catch (error: any) {
    console.error("CODEF Sync route error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "카드사 스크래핑 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// GET /api/cards/codef/sync
export async function GET() {
  try {
    const settings = getServerCardSettings();
    return NextResponse.json({
      success: true,
      connectedCards: settings.connectedCards || [],
      lastSyncTime: settings.lastSyncTime || null,
      hasCodefCredentials: Boolean(settings.codefClientId && settings.codefClientSecret)
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
