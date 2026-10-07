import { Transaction } from "@/types/cardExpense";
import { classifyMerchant } from "@/utils/cardParser";

// CODEF Organization Codes for Korean Credit Card Companies
export const CODEF_CARD_ORGANIZATIONS: Record<string, { code: string; name: string }> = {
  "현대카드": { code: "0302", name: "현대카드" },
  "신한카드": { code: "0301", name: "신한카드" },
  "삼성카드": { code: "0303", name: "삼성카드" },
  "KB국민카드": { code: "0304", name: "KB국민카드" },
  "롯데카드": { code: "0306", name: "롯데카드" },
  "우리카드": { code: "0309", name: "우리카드" },
  "하나카드": { code: "0308", name: "하나카드" },
  "NH농협카드": { code: "0307", name: "NH농협카드" },
  "BC카드": { code: "0305", name: "BC카드" }
};

export interface CodefSyncParams {
  clientId?: string;
  clientSecret?: string;
  connectedId?: string;
  cardCompanyName: string;
  startDate?: string; // YYYYMMDD
  endDate?: string;   // YYYYMMDD
}

// 1. Fetch OAuth Access Token from CODEF
export async function getCodefAccessToken(clientId: string, clientSecret: string): Promise<string | null> {
  try {
    const authHeader = "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const res = await fetch("https://oauth.codef.io/oauth/token", {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials&scope=read"
    });

    if (!res.ok) {
      console.warn("CODEF Token fetch failed with status:", res.status);
      return null;
    }

    const data = await res.json();
    return data.access_token || null;
  } catch (e) {
    console.error("CODEF getCodefAccessToken error:", e);
    return null;
  }
}

// 2. Query Card Approval List from CODEF API (Strict Production Mode)
export async function fetchCardApprovalsFromCodef(params: CodefSyncParams): Promise<{
  success: boolean;
  transactions: Transaction[];
  message: string;
}> {
  const { clientId, clientSecret, connectedId, cardCompanyName, startDate, endDate } = params;
  const org = CODEF_CARD_ORGANIZATIONS[cardCompanyName] || { code: "0302", name: cardCompanyName };

  const today = new Date();
  const defEnd = today.toISOString().split("T")[0].replace(/-/g, "");
  const oneMonthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
  const defStart = oneMonthAgo.toISOString().split("T")[0].replace(/-/g, "");

  const start = startDate || defStart;
  const end = endDate || defEnd;

  // Real CODEF credentials required
  if (!clientId || !clientSecret) {
    return {
      success: false,
      transactions: [],
      message: "CODEF 금융 API 키(Client ID & Secret)가 등록되지 않았습니다. 실제 전산 조회를 위해 codef.io 키를 등록하시거나, [실시간 브라우저 자동 연결]을 이용해 주세요."
    };
  }

  if (!connectedId) {
    return {
      success: false,
      transactions: [],
      message: `[${org.name}] 계정이 CODEF에 등록되지 않았습니다. 계정 등록(connectedId 발급) 후 조회할 수 있습니다.`
    };
  }

  const accessToken = await getCodefAccessToken(clientId, clientSecret);
  if (!accessToken) {
    return {
      success: false,
      transactions: [],
      message: "CODEF 인증 토큰 발급에 실패했습니다. Client ID 및 Secret을 확인해주세요."
    };
  }

  try {
    const res = await fetch("https://api.codef.io/v1/kr/card/p/account/approval-list", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        organization: org.code,
        connectedId: connectedId,
        startDate: start,
        endDate: end,
        orderBy: "0",
        inquiryType: "1"
      })
    });

    const resData = await res.json();

    if (resData.result?.code === "CF-00000" && Array.isArray(resData.data)) {
      const transactions: Transaction[] = resData.data.map((item: any) => {
        const rawDate = String(item.resUsedDate || "");
        const formattedDate = rawDate.length === 8 
          ? `${rawDate.substring(0, 4)}-${rawDate.substring(4, 6)}-${rawDate.substring(6, 8)}`
          : today.toISOString().split("T")[0];

        const rawTime = String(item.resUsedTime || "");
        const formattedTime = rawTime.length >= 4 
          ? `${rawTime.substring(0, 2)}:${rawTime.substring(2, 4)}` 
          : undefined;

        const merchant = item.resMemberStoreName || "가맹점 미상";
        const amount = Number(item.resUsedAmount || 0);

        return {
          id: "tx_codef_" + (item.resApprovalNo || Date.now()) + "_" + Math.random().toString(36).substring(2, 5),
          date: formattedDate,
          time: formattedTime,
          cardName: org.name,
          cardLast4: item.resCardNo ? String(item.resCardNo).slice(-4) : undefined,
          merchant,
          amount,
          category: classifyMerchant(merchant),
          installment: item.resInstallmentMonth ? `${item.resInstallmentMonth}개월` : "일시불",
          status: item.resCancelYN === "Y" ? "취소" : "승인",
          sourceType: "auto_api",
          createdAt: Date.now()
        };
      });

      return {
        success: true,
        transactions,
        message: `${org.name}에서 실제 승인 내역 ${transactions.length}건이 성공적으로 자동 스크래핑되었습니다.`
      };
    } else {
      return {
        success: false,
        transactions: [],
        message: resData.result?.message || "CODEF 승인 내역 조회에 실패했습니다."
      };
    }
  } catch (e: any) {
    return {
      success: false,
      transactions: [],
      message: e.message || "CODEF API 통신 오류가 발생했습니다."
    };
  }
}
