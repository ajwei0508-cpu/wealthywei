export type ExpenseCategoryType =
  | "dining"         // 식비 / 미식 / 카페
  | "shopping"       // 쇼핑 / 패션 / 라이프
  | "transport"      // 교통 / 주유 / 차량
  | "living"         // 주거 / 통신 / 공과금
  | "subscription"   // 정기구독 / 디지털
  | "culture"        // 문화 / 여가 / 여행
  | "medical"        // 의료 / 건강 / 뷰티
  | "education"      // 교육 / 자기계발
  | "finance"        // 금융 / 보험 / 세금
  | "etc";           // 기타 / 미분류

export interface ExpenseCategory {
  id: ExpenseCategoryType | string;
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  gradient: string;
  defaultKeywords: string[];
}

export interface CardBrandInfo {
  id: string;
  name: string;
  brand: "hyundai" | "shinhan" | "samsung" | "kb" | "lotte" | "woori" | "hana" | "kakao" | "toss" | "bc" | "other";
  cardNumberLast4?: string;
  cardType: "credit" | "debit";
  themeColor: string;
  gradient: string;
  textColor: string;
  monthlyTarget: number; // 전월 실적 목표 (예: 500,000원)
}

export interface Transaction {
  id: string;
  date: string;          // YYYY-MM-DD or YYYY-MM-DD HH:mm
  time?: string;         // HH:mm
  merchant: string;      // 가맹점명
  amount: number;        // 결제 금액 (원)
  category: ExpenseCategoryType | string; // 카테고리 ID
  cardName: string;      // 카드명 (현대카드, 신한카드 등)
  cardLast4?: string;    // 카드 뒷자리 4자리
  installment?: string;  // 일시불, 2개월 등
  status?: "승인" | "취소";
  memo?: string;         // 개인 메모
  sourceType?: "excel" | "sms" | "manual" | "sample" | "auto_api";
  createdAt: number;
}

export interface CategoryRule {
  id: string;
  keyword: string;       // 매칭 키워드 (예: '스타벅스', '배민')
  categoryId: string;    // 매핑 카테고리
  priority?: number;
}

export interface MonthlyBudget {
  month: string;         // YYYY-MM
  totalBudget: number;   // 총 예산
  categoryBudgets: Record<string, number>;
}

export interface ExpenseFilter {
  selectedMonth: string; // YYYY-MM or 'all'
  selectedCard: string;  // 카드명 or 'all'
  selectedCardCompany: string; // 카드사명 or 'all' (e.g. '현대카드', '신한카드', 'all')
  selectedCategory: string; // 카테고리 or 'all'
  searchQuery: string;
  sortBy: "date-desc" | "date-asc" | "amount-desc" | "amount-asc";
}

export interface CardCompanyStat {
  companyName: string;
  brand: string;
  color: string;
  accentColor: string;
  gradient: string;
  amount: number;
  count: number;
  percent: number;
  avgAmount: number;
  topCategoryName: string;
  topCategoryColor: string;
  monthlyTarget: number;
}

