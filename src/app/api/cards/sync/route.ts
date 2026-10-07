import { NextRequest, NextResponse } from "next/server";
import { parseAnyPastedCardData, classifyMerchant, getCardCompany } from "@/utils/cardParser";
import { 
  getServerTransactions, 
  appendServerTransactions, 
  saveServerTransactions, 
  deleteServerTransactions 
} from "@/lib/cardStorage";
import { Transaction } from "@/types/cardExpense";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// OPTIONS /api/cards/sync - Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

// GET /api/cards/sync - Returns all persistent transactions from server
export async function GET() {
  try {
    const transactions = getServerTransactions();
    return NextResponse.json({
      success: true,
      count: transactions.length,
      transactions,
      lastUpdated: Date.now()
    }, { headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load transactions" },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST /api/cards/sync - Real-time Webhook Receiver from Mobile/API/Browser
export async function POST(req: NextRequest) {
  try {
    const rawText = await req.text();
    let body: any = {};

    try {
      body = JSON.parse(rawText);
    } catch {
      body = { text: rawText };
    }

    if (typeof body === "string") {
      body = { text: body };
    }

    let parsedTxs: Transaction[] = [];

    // 1. Text payload (e.g. from mobile notification webhook, or pasted table rows from card website)
    if (body.text || body.message || body.sms) {
      const textToParse = String(body.text || body.message || body.sms);
      parsedTxs = parseAnyPastedCardData(textToParse, [], body.cardName || "개인카드");
    } 
    // 2. Structured JSON payload (array of transactions)
    else if (Array.isArray(body.transactions)) {
      parsedTxs = body.transactions.map((tx: any) => ({
        id: "tx_api_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
        date: tx.date || new Date().toISOString().split("T")[0],
        time: tx.time,
        merchant: tx.merchant || "가맹점 미상",
        amount: Number(tx.amount) || 0,
        category: tx.category || classifyMerchant(tx.merchant || ""),
        cardName: tx.cardName ? getCardCompany(tx.cardName) : (body.cardName || "개인카드"),
        installment: tx.installment || "일시불",
        status: tx.status || "승인",
        sourceType: "auto_api",
        createdAt: Date.now()
      }));
    }
    // 3. Single transaction payload
    else if (body.merchant && body.amount) {
      parsedTxs = [{
        id: "tx_api_" + Date.now(),
        date: body.date || new Date().toISOString().split("T")[0],
        time: body.time,
        merchant: body.merchant,
        amount: Number(body.amount) || 0,
        category: body.category || classifyMerchant(body.merchant),
        cardName: body.cardName ? getCardCompany(body.cardName) : "개인카드",
        installment: body.installment || "일시불",
        status: body.status || "승인",
        sourceType: "auto_api",
        createdAt: Date.now()
      }];
    }

    if (parsedTxs.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: "유효한 카드 결제 내역을 감지하지 못했습니다. 날짜와 결제 금액이 포함된 텍스트나 명세서를 전송해주세요." 
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Append to server storage
    const { added, totalCount } = appendServerTransactions(parsedTxs);

    return NextResponse.json({
      success: true,
      type: "auto_sync_persisted",
      count: added.length,
      totalCount,
      transactions: added,
      message: `${added.length}건의 카드 결제 내역이 서버에 영구 저장 및 취합되었습니다.`
    }, { headers: corsHeaders });
  } catch (error: any) {
    console.error("Card sync API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "서버 처리 중 오류가 발생했습니다." },
      { status: 500, headers: corsHeaders }
    );
  }
}

// DELETE /api/cards/sync - Delete transaction(s)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const clearAll = searchParams.get("clearAll") === "true";

    if (clearAll) {
      saveServerTransactions([]);
      return NextResponse.json({ success: true, message: "모든 내역이 초기화되었습니다." }, { headers: corsHeaders });
    }

    if (id) {
      deleteServerTransactions([id]);
      return NextResponse.json({ success: true, message: "해당 내역이 삭제되었습니다." }, { headers: corsHeaders });
    }

    const body = await req.json().catch(() => ({}));
    if (Array.isArray(body.ids)) {
      deleteServerTransactions(body.ids);
      return NextResponse.json({ success: true, message: `${body.ids.length}건이 삭제되었습니다.` }, { headers: corsHeaders });
    }

    return NextResponse.json({ success: false, error: "삭제할 id가 필요합니다." }, { status: 400, headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders });
  }
}
