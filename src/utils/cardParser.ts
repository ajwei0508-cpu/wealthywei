import { ExpenseCategory, CardBrandInfo, Transaction, CategoryRule } from "@/types/cardExpense";
import * as XLSX from "xlsx";

export const DEFAULT_CATEGORIES: ExpenseCategory[] = [
  {
    id: "dining",
    name: "식비 / 미식 / 카페",
    icon: "Utensils",
    color: "#F59E0B", // Amber Gold
    bgColor: "rgba(245, 158, 11, 0.12)",
    borderColor: "rgba(245, 158, 11, 0.3)",
    gradient: "from-amber-500/20 to-orange-500/10",
    defaultKeywords: [
      "스타벅스", "투썸", "이디야", "메가커피", "컴포즈", "커피", "카페", "배달의민족", "배민", 
      "쿠팡이츠", "요기요", "식당", "고기", "스시", "초밥", "삼겹살", "한우", "파리바게뜨", "뚜레쥬르", 
      "맥도날드", "버거킹", "서브웨이", "치킨", "피자", "중화요리", "포차", "이자카야", "레스토랑", 
      "푸드", "미식", "다이닝", "베이커리", "김밥", "분식", "마라탕", "국밥", "설렁탕", "면옥"
    ]
  },
  {
    id: "shopping",
    name: "쇼핑 / 패션 / 라이프",
    icon: "ShoppingBag",
    color: "#EC4899", // Rose Pink
    bgColor: "rgba(236, 72, 153, 0.12)",
    borderColor: "rgba(236, 72, 153, 0.3)",
    gradient: "from-pink-500/20 to-rose-500/10",
    defaultKeywords: [
      "쿠팡", "네이버페이", "11번가", "G마켓", "옥션", "마켓컬리", "올리브영", "다이소", 
      "신세계", "롯데백화점", "현대백화점", "더현대", "무신사", "29CM", "지그재그", "에이블리", 
      "이마트", "홈플러스", "트레이더스", "코스트코", "면세점", "나이키", "아디다스", "자라", "유니클로",
      "명품", "샤넬", "루이비통", "구찌", "에르메스", "크림", "KREAM", "아울렛", "편의점", "GS25", "CU", "세븐일레븐"
    ]
  },
  {
    id: "transport",
    name: "교통 / 주유 / 차량",
    icon: "Car",
    color: "#3B82F6", // Blue
    bgColor: "rgba(59, 130, 246, 0.12)",
    borderColor: "rgba(59, 130, 246, 0.3)",
    gradient: "from-blue-500/20 to-cyan-500/10",
    defaultKeywords: [
      "카카오T", "카카오택시", "택시", "티머니", "지하철", "코레일", "SRT", "KTX", "고속버스", 
      "GS칼텍스", "SK에너지", "현대오일뱅크", "에쓰오일", "S-OIL", "주유소", "충전소", "하이패스", 
      "쏘카", "그린카", "티맵", "주차장", "발렛", "한국도로공사", "모빌리티", "대리운전"
    ]
  },
  {
    id: "living",
    name: "주거 / 통신 / 관리비",
    icon: "Home",
    color: "#10B981", // Emerald Green
    bgColor: "rgba(16, 185, 129, 0.12)",
    borderColor: "rgba(16, 185, 129, 0.3)",
    gradient: "from-emerald-500/20 to-teal-500/10",
    defaultKeywords: [
      "아파트관리비", "관리비", "한국전력", "한전", "도시가스", "수도요금", "KT", "SKT", "LGU+", 
      "통신", "SK텔레콤", "LG유플러스", "인터넷", "청소", "세탁소", "크린토피아", "인테리어", "생활요금"
    ]
  },
  {
    id: "subscription",
    name: "정기구독 / 디지털 / IT",
    icon: "Repeat",
    color: "#8B5CF6", // Violet
    bgColor: "rgba(139, 92, 246, 0.12)",
    borderColor: "rgba(139, 92, 246, 0.3)",
    gradient: "from-purple-500/20 to-indigo-500/10",
    defaultKeywords: [
      "넷플릭스", "NETFLIX", "유튜브", "YOUTUBE", "애플", "APPLE", "쿠팡와우", "티빙", "웨이브", 
      "디즈니", "왓챠", "멜론", "지니", "스포티파이", "SPOTIFY", "챗GPT", "OPENAI", "구글", "GOOGLE", 
      "노션", "NOTION", "ADOBE", "어도비", "클라우드", "AWS", "MICROSOFT", "마이크로소프트", "정기결제"
    ]
  },
  {
    id: "culture",
    name: "문화 / 여가 / 여행",
    icon: "Compass",
    color: "#06B6D4", // Cyan
    bgColor: "rgba(6, 182, 212, 0.12)",
    borderColor: "rgba(6, 182, 212, 0.3)",
    gradient: "from-cyan-500/20 to-blue-500/10",
    defaultKeywords: [
      "CGV", "롯데시네마", "메가박스", "영화", "야놀자", "여기어때", "에어비앤비", "호텔", "리조트", 
      "인터파크", "티켓", "대한항공", "아시아나", "제주항공", "진에어", "항공", "골프", "CC", "스크린골프", 
      "피트니스", "헬스", "PT", "필라테스", "테니스", "수영", "전시", "공연", "콘서트"
    ]
  },
  {
    id: "medical",
    name: "의료 / 건강 / 뷰티",
    icon: "Activity",
    color: "#14B8A6", // Teal
    bgColor: "rgba(20, 184, 166, 0.12)",
    borderColor: "rgba(20, 184, 166, 0.3)",
    gradient: "from-teal-500/20 to-emerald-500/10",
    defaultKeywords: [
      "병원", "의원", "한의원", "치과", "안과", "이비인후과", "피부과", "성형외과", "정형외과", 
      "내과", "약국", "건강검진", "의료원", "헤어샵", "미용실", "바버샵", "네일", "스파", "마사지"
    ]
  },
  {
    id: "education",
    name: "교육 / 도서 / 자기계발",
    icon: "BookOpen",
    color: "#6366F1", // Indigo
    bgColor: "rgba(99, 102, 241, 0.12)",
    borderColor: "rgba(99, 102, 241, 0.3)",
    gradient: "from-indigo-500/20 to-blue-500/10",
    defaultKeywords: [
      "교보문고", "예스24", "알라딘", "영풍문고", "서점", "도서", "학원", "강의", "패스트캠퍼스", 
      "인프런", "클래스101", "탈잉", "스터디", "독서실", "어학원", "자격증", "시험", "연수"
    ]
  },
  {
    id: "finance",
    name: "금융 / 보험 / 세금",
    icon: "Landmark",
    color: "#EAB308", // Yellow Gold
    bgColor: "rgba(234, 179, 8, 0.12)",
    borderColor: "rgba(234, 179, 8, 0.3)",
    gradient: "from-yellow-500/20 to-amber-500/10",
    defaultKeywords: [
      "보험", "삼성생명", "한화생명", "교보생명", "현대해상", "DB손해보험", "KB손해보험", "메리츠", 
      "국세청", "지방세", "위택스", "인터넷지로", "연회비", "이자", "수수료", "적금", "투자", "증권"
    ]
  },
  {
    id: "etc",
    name: "기타 / 일반 지출",
    icon: "MoreHorizontal",
    color: "#94A3B8", // Slate
    bgColor: "rgba(148, 163, 184, 0.12)",
    borderColor: "rgba(148, 163, 184, 0.3)",
    gradient: "from-slate-500/20 to-gray-500/10",
    defaultKeywords: []
  }
];

export const DEFAULT_CARDS: CardBrandInfo[] = [
  {
    id: "card_hyundai_black",
    name: "현대카드 the Black Edition",
    brand: "hyundai",
    cardNumberLast4: "8801",
    cardType: "credit",
    themeColor: "#111111",
    gradient: "from-neutral-900 via-stone-900 to-black",
    textColor: "#D4AF37", // Champagne Gold text
    monthlyTarget: 1500000
  },
  {
    id: "card_shinhan_ace",
    name: "신한카드 The ACE BLUE",
    brand: "shinhan",
    cardNumberLast4: "4920",
    cardType: "credit",
    themeColor: "#0A2540",
    gradient: "from-slate-900 via-blue-950 to-indigo-950",
    textColor: "#60A5FA",
    monthlyTarget: 1000000
  },
  {
    id: "card_samsung_id",
    name: "삼성카드 iD ON Platinum",
    brand: "samsung",
    cardNumberLast4: "3742",
    cardType: "credit",
    themeColor: "#1E293B",
    gradient: "from-neutral-900 via-slate-800 to-zinc-900",
    textColor: "#38BDF8",
    monthlyTarget: 800000
  },
  {
    id: "card_kb_gold",
    name: "KB국민 탄탄대로 Gold",
    brand: "kb",
    cardNumberLast4: "9105",
    cardType: "credit",
    themeColor: "#451A03",
    gradient: "from-amber-950 via-yellow-950 to-stone-950",
    textColor: "#FCD34D",
    monthlyTarget: 500000
  },
  {
    id: "card_kakao_toss",
    name: "카카오뱅크 프렌즈 체크",
    brand: "kakao",
    cardNumberLast4: "1258",
    cardType: "debit",
    themeColor: "#F59E0B",
    gradient: "from-yellow-900 via-amber-900 to-stone-900",
    textColor: "#FDE047",
    monthlyTarget: 300000
  }
];

// Auto-classify merchant name
export function classifyMerchant(merchantName: string, customRules: CategoryRule[] = []): string {
  if (!merchantName) return "etc";
  const cleanName = merchantName.trim().toLowerCase();

  // 1. Check custom user rules first
  for (const rule of customRules) {
    if (cleanName.includes(rule.keyword.toLowerCase())) {
      return rule.categoryId;
    }
  }

  // 2. Check built-in categories keywords
  for (const cat of DEFAULT_CATEGORIES) {
    for (const kw of cat.defaultKeywords) {
      if (cleanName.includes(kw.toLowerCase())) {
        return cat.id;
      }
    }
  }

  return "etc";
}

export const KNOWN_CARD_COMPANIES = [
  { id: "hyundai", name: "현대카드", brand: "hyundai", color: "#171717", accentColor: "#F59E0B", gradient: "from-neutral-900 to-black" },
  { id: "shinhan", name: "신한카드", brand: "shinhan", color: "#0A2540", accentColor: "#60A5FA", gradient: "from-slate-900 to-blue-950" },
  { id: "samsung", name: "삼성카드", brand: "samsung", color: "#0F172A", accentColor: "#38BDF8", gradient: "from-neutral-900 to-slate-900" },
  { id: "kb", name: "KB국민카드", brand: "kb", color: "#451A03", accentColor: "#FCD34D", gradient: "from-stone-900 to-amber-950" },
  { id: "lotte", name: "롯데카드", brand: "lotte", color: "#450A0A", accentColor: "#F87171", gradient: "from-neutral-900 to-rose-950" },
  { id: "woori", name: "우리카드", brand: "woori", color: "#082F49", accentColor: "#38BDF8", gradient: "from-neutral-900 to-sky-950" },
  { id: "hana", name: "하나카드", brand: "hana", color: "#022C22", accentColor: "#2DD4BF", gradient: "from-neutral-900 to-emerald-950" },
  { id: "nh", name: "NH농협카드", brand: "nh", color: "#052E16", accentColor: "#4ADE80", gradient: "from-neutral-900 to-green-950" },
  { id: "kakao", name: "카카오뱅크", brand: "kakao", color: "#451A03", accentColor: "#FACC15", gradient: "from-amber-950 to-stone-900" },
  { id: "toss", name: "토스뱅크", brand: "toss", color: "#172554", accentColor: "#60A5FA", gradient: "from-blue-950 to-neutral-900" },
  { id: "bc", name: "BC카드", brand: "bc", color: "#3B0764", accentColor: "#E879F9", gradient: "from-purple-950 to-neutral-900" },
  { id: "etc", name: "기타 개인카드", brand: "other", color: "#1E293B", accentColor: "#94A3B8", gradient: "from-neutral-900 to-slate-900" }
];

// Normalize any card name to standard card company name
export function getCardCompany(cardName: string): string {
  if (!cardName) return "기타 개인카드";
  const str = cardName.trim().toLowerCase();
  if (str.includes("현대")) return "현대카드";
  if (str.includes("신한")) return "신한카드";
  if (str.includes("삼성")) return "삼성카드";
  if (str.includes("국민") || str.includes("kb")) return "KB국민카드";
  if (str.includes("롯데")) return "롯데카드";
  if (str.includes("우리")) return "우리카드";
  if (str.includes("하나")) return "하나카드";
  if (str.includes("농협") || str.includes("nh")) return "NH농협카드";
  if (str.includes("카카오")) return "카카오뱅크";
  if (str.includes("토스")) return "토스뱅크";
  if (str.includes("비씨") || str.includes("bc")) return "BC카드";
  return cardName;
}

// Extract card brand from text
export function detectCardBrand(rawText: string): string {
  const text = rawText.toLowerCase();
  if (text.includes("현대카드") || text.includes("현대")) return "현대카드";
  if (text.includes("신한카드") || text.includes("신한")) return "신한카드";
  if (text.includes("삼성카드") || text.includes("삼성")) return "삼성카드";
  if (text.includes("국민카드") || text.includes("kb")) return "KB국민카드";
  if (text.includes("롯데카드") || text.includes("롯데")) return "롯데카드";
  if (text.includes("우리카드") || text.includes("우리")) return "우리카드";
  if (text.includes("하나카드") || text.includes("하나")) return "하나카드";
  if (text.includes("농협카드") || text.includes("nh") || text.includes("농협")) return "NH농협카드";
  if (text.includes("카카오뱅크") || text.includes("카카오")) return "카카오뱅크";
  if (text.includes("토스뱅크") || text.includes("토스")) return "토스뱅크";
  if (text.includes("비씨카드") || text.includes("bc")) return "BC카드";
  return "개인카드";
}

// Clean string amount into number
export function cleanAmount(amountStr: any): number {
  if (typeof amountStr === "number") return Math.abs(amountStr);
  if (!amountStr) return 0;
  const cleaned = String(amountStr).replace(/[^0-9.-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.abs(num);
}

// Clean date string to YYYY-MM-DD
export function normalizeDate(dateVal: any, timeVal?: any): { date: string; time?: string } {
  const now = new Date();
  const currentYear = now.getFullYear();

  if (dateVal instanceof Date) {
    const y = dateVal.getFullYear();
    const m = String(dateVal.getMonth() + 1).padStart(2, "0");
    const d = String(dateVal.getDate()).padStart(2, "0");
    const hh = String(dateVal.getHours()).padStart(2, "0");
    const mm = String(dateVal.getMinutes()).padStart(2, "0");
    return { date: `${y}-${m}-${d}`, time: `${hh}:${mm}` };
  }

  let str = String(dateVal || "").trim();
  
  // Format: 2026-10-06 or 2026.10.06 or 2026/10/06
  const fullDateMatch = str.match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  if (fullDateMatch) {
    const y = fullDateMatch[1];
    const m = fullDateMatch[2].padStart(2, "0");
    const d = fullDateMatch[3].padStart(2, "0");
    return { date: `${y}-${m}-${d}`, time: timeVal ? String(timeVal) : undefined };
  }

  // Format: MM/DD or MM.DD or MM-DD (common in SMS notifications)
  const shortDateMatch = str.match(/(\d{1,2})[-./](\d{1,2})/);
  if (shortDateMatch) {
    const m = shortDateMatch[1].padStart(2, "0");
    const d = shortDateMatch[2].padStart(2, "0");
    return { date: `${currentYear}-${m}-${d}`, time: timeVal ? String(timeVal) : undefined };
  }

  // Fallback to today
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return { date: `${currentYear}-${m}-${d}` };
}

// Parse SMS / Notification Text
export function parseSmsText(rawText: string, customRules: CategoryRule[] = []): Transaction[] {
  if (!rawText || !rawText.trim()) return [];

  // Split into individual messages (either by [Web발신] or multiple newlines)
  const rawBlocks = rawText
    .split(/(?=\[Web발신\]|\[KB\]|\[신한카드\]|\[현대카드\]|\[삼성카드\]|\[롯데카드\]|\[우리카드\]|\[하나카드\]|\[카카오뱅크\]|\[토스\]|\n{2,})/)
    .map(b => b.trim())
    .filter(b => b.length > 5);

  const transactions: Transaction[] = [];

  for (const block of rawBlocks) {
    try {
      // 1. Amount matching: e.g. "35,000원", "35000원", "KRW 35,000"
      const amountMatch = block.match(/([\d,]+)\s*원/) || block.match(/KRW\s*([\d,]+)/i);
      const amount = amountMatch ? cleanAmount(amountMatch[1]) : 0;
      if (amount <= 0) continue;

      // 2. Card Name detection
      const cardName = detectCardBrand(block);

      // 3. Card Number Mask (e.g. 4*2*, 1234, **34)
      const cardNumMatch = block.match(/\b(\d{1,4}[*xX\d]{1,4})\b/) || block.match(/\((\d{4}|\d\*\d\*)\)/);
      const cardLast4 = cardNumMatch ? cardNumMatch[1].replace(/[()]/g, "") : undefined;

      // 4. Date & Time matching: e.g. "10/06 14:20", "2026-10-06 14:20", "10.06 14:20"
      const dateTimeMatch = block.match(/(\d{4}[-./]\d{1,2}[-./]\d{1,2}|\d{1,2}[-./]\d{1,2})\s*(\d{1,2}:\d{2})?/);
      let date = "";
      let time: string | undefined = undefined;

      if (dateTimeMatch) {
        const norm = normalizeDate(dateTimeMatch[1], dateTimeMatch[2]);
        date = norm.date;
        time = norm.time;
      } else {
        const norm = normalizeDate(new Date());
        date = norm.date;
      }

      // 5. Merchant extraction:
      // Typically after date/time or after amount or at the end of the line
      let merchant = "기타 가맹점";
      const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
      
      // Look for line that contains merchant or extract from pattern
      for (const line of lines) {
        // Remove known boilerplate words
        const cleanedLine = line
          .replace(/\[.*?\]/g, "")
          .replace(/Web발신/g, "")
          .replace(/승인/g, "")
          .replace(/일시불/g, "")
          .replace(/\d+개월/g, "")
          .replace(/누적[\d,]+원/g, "")
          .replace(/잔여[\d,]+원/g, "")
          .replace(/[\d,]+원/g, "")
          .replace(/\d{1,2}[-./]\d{1,2}(\s*\d{1,2}:\d{2})?/g, "")
          .replace(/(현대|신한|삼성|국민|롯데|우리|하나|농협|카카오|토스)카드/g, "")
          .replace(/체크/g, "")
          .replace(/[\(\)\*\:]/g, " ")
          .trim();

        if (cleanedLine.length >= 2 && !/^\d+$/.test(cleanedLine)) {
          merchant = cleanedLine.split(/\s{2,}/)[0] || cleanedLine;
          break;
        }
      }

      // 6. Installment detection
      let installment = "일시불";
      if (block.includes("할부")) {
        const instMatch = block.match(/(\d+)개월\s*할부/);
        installment = instMatch ? `${instMatch[1]}개월` : "할부";
      }

      // 7. Auto categorize
      const category = classifyMerchant(merchant, customRules);

      transactions.push({
        id: "tx_sms_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        date,
        time,
        merchant,
        amount,
        category,
        cardName,
        cardLast4,
        installment,
        status: block.includes("취소") ? "취소" : "승인",
        sourceType: "sms",
        createdAt: Date.now()
      });
    } catch (e) {
      console.warn("SMS block parsing error:", e);
    }
  }

  return transactions;
}

// Parse Web Table / Tabular Pasted Text from any Korean Card Company website
export function parseAnyPastedCardData(
  rawText: string, 
  customRules: CategoryRule[] = [],
  fallbackCardName = "개인카드"
): Transaction[] {
  if (!rawText || !rawText.trim()) return [];

  // 1. If it looks like SMS format with [Web발신] or card tags, try parseSmsText first
  if (rawText.includes("[Web발신]") || rawText.includes("승인\n") || rawText.includes("[KB]") || rawText.includes("[신한]")) {
    const smsResults = parseSmsText(rawText, customRules);
    if (smsResults.length > 0) return smsResults;
  }

  // 2. Line-by-line Table parsing (copied directly from browser web table)
  const lines = rawText.split("\n").map(l => l.trim()).filter(Boolean);
  const transactions: Transaction[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip obvious header lines
    if (line.includes("이용일자") || line.includes("승인일자") || line.includes("가맹점명") || line.includes("이용금액")) {
      continue;
    }

    // Must have a date pattern: YYYY.MM.DD or YYYY-MM-DD or MM/DD
    const dateMatch = line.match(/(\d{4}[-./]\d{1,2}[-./]\d{1,2}|\d{1,2}[-./]\d{1,2})/);
    if (!dateMatch) continue;

    // Must have an amount pattern: e.g. 15,000 or 15,000원 or 15000
    // Find all number-like patterns with commas or trailing '원'
    const amounts = line.match(/(?:₩|KRW)?\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,9})\s*원?/g);
    if (!amounts || amounts.length === 0) continue;

    // Take the most plausible amount (often the first or largest matching the payment amount)
    let bestAmount = 0;
    for (const amtStr of amounts) {
      const val = cleanAmount(amtStr);
      // Skip numbers that look like dates or card numbers or phone numbers
      if (val >= 100 && val !== 2026 && val !== 2025 && val < 100000000) {
        bestAmount = val;
        break;
      }
    }
    if (bestAmount <= 0) continue;

    // Normalize date & time
    const timeMatch = line.match(/(\d{1,2}:\d{2}(?::\d{2})?)/);
    const normDate = normalizeDate(dateMatch[1], timeMatch ? timeMatch[1] : undefined);

    // Extract card name from line or fallback
    const detectedCard = detectCardBrand(line);
    const cardName = detectedCard !== "개인카드" ? detectedCard : fallbackCardName;

    // Extract installment
    let installment = "일시불";
    const instMatch = line.match(/(\d+)개월/);
    if (instMatch) {
      installment = `${instMatch[1]}개월`;
    }

    // Extract status
    const status = line.includes("취소") ? "취소" : "승인";

    // Extract Merchant: strip date, time, amount, installment, status, card names
    let cleanLine = line
      .replace(dateMatch[0], " ")
      .replace(amounts[0], " ")
      .replace(/일시불/g, " ")
      .replace(/\d+개월/g, " ")
      .replace(/(정상|승인|취소|완료|매입|체크|신용)/g, " ")
      .replace(/(현대카드|신한카드|삼성카드|KB국민카드|국민카드|롯데카드|우리카드|하나카드|NH농협카드|BC카드|카카오뱅크|토스)/g, " ")
      .replace(/[0-9]{4}[-*xX]+[0-9]{4}/g, " ") // masked card numbers
      .replace(/[\t|,|₩]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (timeMatch) {
      cleanLine = cleanLine.replace(timeMatch[0], " ").trim();
    }

    // Merchant name is the remaining substantive text
    let merchant = cleanLine;
    const tokens = cleanLine.split(/\s+/).filter(t => t.length > 1 && !/^\d+$/.test(t));
    if (tokens.length > 0) {
      merchant = tokens[0] + (tokens[1] && tokens[1].length < 10 ? ` ${tokens[1]}` : "");
    }
    if (!merchant || merchant.length < 2) {
      merchant = "카드 사용처";
    }

    transactions.push({
      id: `tx_web_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 5)}`,
      date: normDate.date,
      time: normDate.time,
      merchant,
      amount: bestAmount,
      category: classifyMerchant(merchant, customRules),
      cardName,
      installment,
      status,
      sourceType: "auto_api",
      createdAt: Date.now() - i * 1000
    });
  }

  return transactions;
}

// Parse Excel / CSV using SheetJS (XLSX)
export function parseExcelOrCsv(
  fileBuffer: ArrayBuffer | Uint8Array, 
  customRules: CategoryRule[] = [],
  overrideCardName?: string
): Transaction[] {
  const workbook = XLSX.read(fileBuffer, { type: "array", cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const worksheet = workbook.Sheets[firstSheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: "" });
  if (!rows || rows.length === 0) return [];

  // Find header row by matching typical card column keywords
  let headerRowIndex = -1;
  let dateCol = -1;
  let timeCol = -1;
  let merchantCol = -1;
  let amountCol = -1;
  let cardCol = -1;
  let categoryCol = -1;
  let installmentCol = -1;
  let statusCol = -1;

  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = rows[i].map(c => String(c).trim().toLowerCase());
    const hasDate = row.some(c => c.includes("일자") || c.includes("날짜") || c.includes("이용일") || c.includes("승인일"));
    const hasMerchant = row.some(c => c.includes("가맹점") || c.includes("이용처") || c.includes("사용처") || c.includes("상호"));
    const hasAmount = row.some(c => c.includes("금액") || c.includes("이용금액") || c.includes("승인금액") || c.includes("결제금액"));

    if ((hasDate && hasMerchant) || (hasMerchant && hasAmount) || (hasDate && hasAmount)) {
      headerRowIndex = i;
      
      row.forEach((colName, idx) => {
        if (dateCol === -1 && (colName.includes("일자") || colName.includes("날짜") || colName.includes("이용일") || colName.includes("승인일"))) {
          dateCol = idx;
        }
        if (timeCol === -1 && (colName.includes("시간") || colName.includes("승인시간"))) {
          timeCol = idx;
        }
        if (merchantCol === -1 && (colName.includes("가맹점") || colName.includes("이용처") || colName.includes("사용처") || colName.includes("상호"))) {
          merchantCol = idx;
        }
        if (amountCol === -1 && (colName.includes("금액") || colName.includes("승인금액") || colName.includes("결제금액") || colName.includes("이용금액"))) {
          amountCol = idx;
        }
        if (cardCol === -1 && (colName.includes("카드") || colName.includes("카드명") || colName.includes("카드번호"))) {
          cardCol = idx;
        }
        if (categoryCol === -1 && (colName.includes("분류") || colName.includes("업종") || colName.includes("카테고리"))) {
          categoryCol = idx;
        }
        if (installmentCol === -1 && (colName.includes("할부") || colName.includes("개월"))) {
          installmentCol = idx;
        }
        if (statusCol === -1 && (colName.includes("상태") || colName.includes("구분") || colName.includes("승인구분"))) {
          statusCol = idx;
        }
      });
      break;
    }
  }

  // Fallback defaults if header row wasn't cleanly identified
  if (headerRowIndex === -1) {
    headerRowIndex = 0;
    dateCol = 0;
    merchantCol = 1;
    amountCol = 2;
  }

  const transactions: Transaction[] = [];

  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    const rawMerchant = merchantCol !== -1 ? String(row[merchantCol] || "").trim() : "";
    const rawAmount = amountCol !== -1 ? row[amountCol] : 0;
    const amount = cleanAmount(rawAmount);

    if (!rawMerchant && amount === 0) continue; // Skip empty rows

    const rawDate = dateCol !== -1 ? row[dateCol] : "";
    const rawTime = timeCol !== -1 ? row[timeCol] : "";
    const norm = normalizeDate(rawDate, rawTime);

    const rawCard = cardCol !== -1 ? String(row[cardCol] || "").trim() : "";
    const detectedCard = rawCard ? detectCardBrand(rawCard) : "개인카드";
    const finalCardName = overrideCardName || rawCard || detectedCard;

    const rawInstallment = installmentCol !== -1 ? String(row[installmentCol] || "").trim() : "일시불";
    const rawStatus = statusCol !== -1 ? String(row[statusCol] || "").trim() : "승인";

    // Auto classify
    let category = "etc";
    if (categoryCol !== -1 && row[categoryCol]) {
      const fileCat = String(row[categoryCol]);
      category = classifyMerchant(fileCat + " " + rawMerchant, customRules);
    } else {
      category = classifyMerchant(rawMerchant, customRules);
    }

    transactions.push({
      id: "tx_file_" + Date.now() + "_" + r + "_" + Math.random().toString(36).substring(2, 6),
      date: norm.date,
      time: norm.time,
      merchant: rawMerchant || "가맹점 미상",
      amount,
      category,
      cardName: finalCardName,
      installment: rawInstallment || "일시불",
      status: rawStatus.includes("취소") ? "취소" : "승인",
      sourceType: "excel",
      createdAt: Date.now()
    });
  }

  return transactions;
}

// Export clean transactions to Excel (.xlsx)
export function exportTransactionsToExcel(transactions: Transaction[], filename: string = "개인카드_지출내역_취합분류.xlsx") {
  const categoryMap = new Map(DEFAULT_CATEGORIES.map(c => [c.id, c.name]));

  const rows = transactions.map(t => ({
    "이용일자": t.date,
    "이용시간": t.time || "-",
    "카드사/카드명": t.cardName,
    "카드번호(뒷자리)": t.cardLast4 || "-",
    "가맹점명": t.merchant,
    "지출분류(카테고리)": categoryMap.get(t.category) || t.category,
    "결제금액(원)": t.amount,
    "할부구분": t.installment || "일시불",
    "승인상태": t.status || "승인",
    "메모": t.memo || ""
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  worksheet["!cols"] = [
    { wch: 12 }, { wch: 10 }, { wch: 18 }, { wch: 14 }, { wch: 22 }, { wch: 20 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 25 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "전체카드통합내역");
  XLSX.writeFile(workbook, filename);
}

// Multi-Sheet Export: Sheet 1 = 카드사별 통합요약, Sheet 2~N = 각 카드사별 개별 상세 내역
export function exportTransactionsByCardToExcel(transactions: Transaction[], filename: string = "카드사별_통합취합보고서.xlsx") {
  const categoryMap = new Map(DEFAULT_CATEGORIES.map(c => [c.id, c.name]));
  const workbook = XLSX.utils.book_new();

  // Group by Card Company
  const companyMap = new Map<string, Transaction[]>();
  transactions.forEach(t => {
    const comp = getCardCompany(t.cardName);
    if (!companyMap.has(comp)) {
      companyMap.set(comp, []);
    }
    companyMap.get(comp)!.push(t);
  });

  const totalAllSpend = transactions.reduce((sum, t) => sum + (t.status === "취소" ? -t.amount : t.amount), 0);

  // 1. Summary Sheet: 카드사별_통합요약
  const summaryRows = Array.from(companyMap.entries()).map(([comp, txs]) => {
    const compSpend = txs.reduce((sum, t) => sum + (t.status === "취소" ? -t.amount : t.amount), 0);
    const count = txs.length;
    const avg = count > 0 ? Math.round(compSpend / count) : 0;
    const share = totalAllSpend > 0 ? ((compSpend / totalAllSpend) * 100).toFixed(1) + "%" : "0%";

    // Top Category
    const catMap = new Map<string, number>();
    txs.forEach(t => catMap.set(t.category, (catMap.get(t.category) || 0) + (t.status === "취소" ? -t.amount : t.amount)));
    let topCatName = "-";
    let topAmt = -1;
    catMap.forEach((amt, cid) => {
      if (amt > topAmt) {
        topAmt = amt;
        topCatName = categoryMap.get(cid) || cid;
      }
    });

    return {
      "카드사명": comp,
      "총 이용금액(원)": compSpend,
      "결제건수": count,
      "점유율(%)": share,
      "건당 평균 결제액(원)": avg,
      "최다 지출 카테고리": topCatName
    };
  }).sort((a, b) => b["총 이용금액(원)"] - a["총 이용금액(원)"]);

  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  summarySheet["!cols"] = [
    { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 20 }, { wch: 22 }
  ];
  XLSX.utils.book_append_sheet(workbook, summarySheet, "카드사별_통합요약");

  // 2. Individual Sheets per Card Company
  companyMap.forEach((txs, comp) => {
    const cleanSheetName = comp.replace(/[:\\/?*\[\]]/g, "").substring(0, 30);
    const rows = txs.map(t => ({
      "이용일자": t.date,
      "이용시간": t.time || "-",
      "카드명": t.cardName,
      "가맹점명": t.merchant,
      "지출카테고리": categoryMap.get(t.category) || t.category,
      "결제금액(원)": t.amount,
      "할부": t.installment || "일시불",
      "상태": t.status || "승인",
      "메모": t.memo || ""
    }));

    const sheet = XLSX.utils.json_to_sheet(rows);
    sheet["!cols"] = [
      { wch: 12 }, { wch: 10 }, { wch: 22 }, { wch: 24 }, { wch: 18 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 25 }
    ];
    XLSX.utils.book_append_sheet(workbook, sheet, cleanSheetName);
  });

  XLSX.writeFile(workbook, filename);
}

// Export single card company statements
export function exportSingleCardToExcel(cardCompanyName: string, transactions: Transaction[]) {
  const categoryMap = new Map(DEFAULT_CATEGORIES.map(c => [c.id, c.name]));
  const compTxs = transactions.filter(t => getCardCompany(t.cardName) === cardCompanyName || t.cardName.includes(cardCompanyName));

  const rows = compTxs.map(t => ({
    "이용일자": t.date,
    "이용시간": t.time || "-",
    "카드명": t.cardName,
    "가맹점명": t.merchant,
    "카테고리": categoryMap.get(t.category) || t.category,
    "결제금액(원)": t.amount,
    "할부": t.installment || "일시불",
    "상태": t.status || "승인",
    "메모": t.memo || ""
  }));

  const sheet = XLSX.utils.json_to_sheet(rows);
  sheet["!cols"] = [
    { wch: 12 }, { wch: 10 }, { wch: 22 }, { wch: 24 }, { wch: 18 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 25 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, cardCompanyName.substring(0, 30));
  XLSX.writeFile(workbook, `${cardCompanyName}_지출명세서.xlsx`);
}

// Generate Premium Sample Dataset
export function generateSampleTransactions(): Transaction[] {
  const sampleItems: Array<{
    date: string;
    time: string;
    merchant: string;
    amount: number;
    category: string;
    cardName: string;
    cardLast4: string;
    installment: string;
    memo?: string;
  }> = [
    // 2026년 10월 최신 내역
    { date: "2026-10-06", time: "19:45", merchant: "정식당 (청담 파인다이닝)", amount: 380000, category: "dining", cardName: "현대카드 the Black Edition", cardLast4: "8801", installment: "일시불", memo: "고객 VIP 미팅 만찬" },
    { date: "2026-10-06", time: "14:15", merchant: "스타벅스 리저브 청담", amount: 16500, category: "dining", cardName: "현대카드 the Black Edition", cardLast4: "8801", installment: "일시불" },
    { date: "2026-10-05", time: "21:30", merchant: "쿠팡 로켓프레시", amount: 68400, category: "shopping", cardName: "삼성카드 iD ON Platinum", cardLast4: "3742", installment: "일시불", memo: "식재료 및 유기농 과일" },
    { date: "2026-10-05", time: "17:10", merchant: "GS칼텍스 삼일주유소", amount: 115000, category: "transport", cardName: "신한카드 The ACE BLUE", cardLast4: "4920", installment: "일시불", memo: "고급유 주유" },
    { date: "2026-10-05", time: "11:20", merchant: "올리브영 명동본점", amount: 48900, category: "shopping", cardName: "카카오뱅크 프렌즈 체크", cardLast4: "1258", installment: "일시불" },
    { date: "2026-10-04", time: "15:00", merchant: "신세계백화점 강남점", amount: 540000, category: "shopping", cardName: "현대카드 the Black Edition", cardLast4: "8801", installment: "3개월", memo: "가을 시즌 자켓 구매" },
    { date: "2026-10-04", time: "12:40", merchant: "스시코우지 (오마카세)", amount: 250000, category: "dining", cardName: "신한카드 The ACE BLUE", cardLast4: "4920", installment: "일시불", memo: "주말 점심" },
    { date: "2026-10-03", time: "18:20", merchant: "카카오T 블루 택시", amount: 24500, category: "transport", cardName: "삼성카드 iD ON Platinum", cardLast4: "3742", installment: "일시불" },
    { date: "2026-10-03", time: "10:15", merchant: "배달의민족 (브런치카페)", amount: 34000, category: "dining", cardName: "삼성카드 iD ON Platinum", cardLast4: "3742", installment: "일시불" },
    { date: "2026-10-02", time: "20:00", merchant: "CGV 용산아이파크몰 IMAX", amount: 42000, category: "culture", cardName: "KB국민 탄탄대로 Gold", cardLast4: "9105", installment: "일시불", memo: "주말 영화 2인" },
    { date: "2026-10-02", time: "13:30", merchant: "교보문고 광화문점", amount: 56000, category: "education", cardName: "KB국민 탄탄대로 Gold", cardLast4: "9105", installment: "일시불", memo: "비즈니스 & 디자인 서적" },
    { date: "2026-10-01", time: "09:00", merchant: "아파트 관리비 자동이체", amount: 345000, category: "living", cardName: "신한카드 The ACE BLUE", cardLast4: "4920", installment: "일시불" },
    { date: "2026-10-01", time: "08:30", merchant: "넷플릭스 프리미엄 정기결제", amount: 17000, category: "subscription", cardName: "신한카드 The ACE BLUE", cardLast4: "4920", installment: "일시불" },
    { date: "2026-10-01", time: "08:30", merchant: "ChatGPT Plus (OpenAI)", amount: 29800, category: "subscription", cardName: "현대카드 the Black Edition", cardLast4: "8801", installment: "일시불" },
    { date: "2026-10-01", time: "08:30", merchant: "유튜브 프리미엄", amount: 14900, category: "subscription", cardName: "카카오뱅크 프렌즈 체크", cardLast4: "1258", installment: "일시불" },
    { date: "2026-10-01", time: "08:30", merchant: "쿠팡 와우 멤버십", amount: 7890, category: "subscription", cardName: "삼성카드 iD ON Platinum", cardLast4: "3742", installment: "일시불" },

    // 2026년 9월 내역
    { date: "2026-09-28", time: "19:15", merchant: "조선팰리스 콘스탄스 뷔페", amount: 370000, category: "dining", cardName: "현대카드 the Black Edition", cardLast4: "8801", installment: "일시불", memo: "가족 기념일 식사" },
    { date: "2026-09-26", time: "14:50", merchant: "현대백화점 판교점", amount: 430000, category: "shopping", cardName: "현대카드 the Black Edition", cardLast4: "8801", installment: "일시불" },
    { date: "2026-09-24", time: "18:00", merchant: "바른피부과의원", amount: 220000, category: "medical", cardName: "신한카드 The ACE BLUE", cardLast4: "4920", installment: "일시불", memo: "스킨케어 관리" },
    { date: "2026-09-22", time: "12:10", merchant: "남포면옥 본점", amount: 32000, category: "dining", cardName: "KB국민 탄탄대로 Gold", cardLast4: "9105", installment: "일시불" },
    { date: "2026-09-20", time: "16:40", merchant: "SK에너지 강남주유소", amount: 110000, category: "transport", cardName: "신한카드 The ACE BLUE", cardLast4: "4920", installment: "일시불" },
    { date: "2026-09-18", time: "11:00", merchant: "네이버페이 온라인쇼핑", amount: 94000, category: "shopping", cardName: "삼성카드 iD ON Platinum", cardLast4: "3742", installment: "일시불" },
    { date: "2026-09-15", time: "20:30", merchant: "배달의민족 (야식)", amount: 38500, category: "dining", cardName: "삼성카드 iD ON Platinum", cardLast4: "3742", installment: "일시불" },
    { date: "2026-09-12", time: "09:30", merchant: "안양베네스트 골프클럽", amount: 360000, category: "culture", cardName: "현대카드 the Black Edition", cardLast4: "8801", installment: "일시불", memo: "주말 라운딩 그린피" },
    { date: "2026-09-10", time: "15:20", merchant: "스타벅스 테헤란로점", amount: 14200, category: "dining", cardName: "카카오뱅크 프렌즈 체크", cardLast4: "1258", installment: "일시불" },
    { date: "2026-09-08", time: "18:40", merchant: "이마트 역삼점", amount: 154000, category: "shopping", cardName: "신한카드 The ACE BLUE", cardLast4: "4920", installment: "일시불" },
    { date: "2026-09-05", time: "13:00", merchant: "고속도로 통행료 하이패스", amount: 16500, category: "transport", cardName: "신한카드 The ACE BLUE", cardLast4: "4920", installment: "일시불" },
    { date: "2026-09-01", time: "09:00", merchant: "아파트 관리비 자동이체", amount: 320000, category: "living", cardName: "신한카드 The ACE BLUE", cardLast4: "4920", installment: "일시불" },
    { date: "2026-09-01", time: "08:30", merchant: "넷플릭스 정기결제", amount: 17000, category: "subscription", cardName: "신한카드 The ACE BLUE", cardLast4: "4920", installment: "일시불" },

    // 2026년 8월 내역
    { date: "2026-08-25", time: "19:00", merchant: "신라호텔 아리아", amount: 390000, category: "dining", cardName: "현대카드 the Black Edition", cardLast4: "8801", installment: "일시불" },
    { date: "2026-08-20", time: "16:00", merchant: "대한항공 항공권", amount: 820000, category: "culture", cardName: "현대카드 the Black Edition", cardLast4: "8801", installment: "3개월", memo: "제주도 가족 여행" },
    { date: "2026-08-18", time: "12:30", merchant: "제주 신화월드 리조트", amount: 480000, category: "culture", cardName: "신한카드 The ACE BLUE", cardLast4: "4920", installment: "일시불" },
    { date: "2026-08-15", time: "11:00", merchant: "스타벅스 제주중문점", amount: 22000, category: "dining", cardName: "카카오뱅크 프렌즈 체크", cardLast4: "1258", installment: "일시불" },
    { date: "2026-08-10", time: "18:20", merchant: "무신사 스토어", amount: 135000, category: "shopping", cardName: "삼성카드 iD ON Platinum", cardLast4: "3742", installment: "일시불" },
    { date: "2026-08-01", time: "09:00", merchant: "아파트 관리비", amount: 365000, category: "living", cardName: "신한카드 The ACE BLUE", cardLast4: "4920", installment: "일시불" }
  ];

  return sampleItems.map((item, idx) => ({
    id: "tx_sample_" + idx + "_" + Date.now(),
    ...item,
    status: "승인",
    sourceType: "sample",
    createdAt: Date.now() - idx * 1000
  }));
}
