export interface FirstVisitRow {
  id: string;
  chartNo?: string; // 내부 재내원 매칭 보조키 (시트 외부 메타데이터)
  phone?: string;   // 내부 동명이인 구분 보조키

  // === 2번 구글 시트 19개 표준 컬럼 ===
  visitDate: string;                // 1. 일자 (표시용 예: "5월 1일" 또는 "2026-05-01")
  visitDateISO: string;             // 정렬·월별 통계용 표준 일자 ("YYYY-MM-DD" 또는 "")
  patientName: string;              // 2. 환자 이름
  age: string;                      // 3. 나이 (없으면 공란 "")
  visitType: string;                // 4. 초진/재초진 ("초진" | "재초진" | "")
  insuranceType: string;            // 5. 환자구분 (건보 / 자보 / 비급여 | "")
  treatmentDetail: string;          // 6. 환자 진료 내역 (약침 / 추나 / 한약 /비급여 유무)
  nextReservation: string;          // 7. 다음 진료 예약 안내 ("유" | "무" | "")
  firstVisitDate: string;           // 8. [초진일] 1회
  firstVisitISO: string;
  secondVisitDate: string;          // 9. [재내원일] 2회
  secondVisitISO: string;
  thirdVisitDate: string;           // 10. [재내원일] 3회
  thirdVisitISO: string;
  visitRoute: string;               // 11. 내원경로
  nonCoveredList: string;           // 12. 비급여 목록 (각 한의원별로 목록을 기입해주세요)
  nonCoveredCount: string;          // 13. 기입한 비급여 목록별 판매 건수
  immediatePaymentCount: string;    // 14. 상담후 즉시 결제 건수
  herbalMonthlySummary: string;     // 15. 한약 월총 건수 (건수별로 처방 목적 기입) 예 : 다이어트2 보약 1
  packageCount: string;             // 16. 패키지 건수
  herbalFollowupPayment: string;    // 17. 1제 복용후 추가결제 (연복유무)
  packageRenewal: string;           // 18. 패키지 복용후 종료후 연장(권했을때 결제유무)
  delayedPaymentWithinMonth: string;// 19. 상담후 1달이내 결제 건수 (예 : 홍길동 다이어트 3제 결제)

  sourceFile?: string;
  updatedAt?: string;
}

export type SheetColumnKey =
  | "visitDate"
  | "patientName"
  | "age"
  | "visitType"
  | "insuranceType"
  | "treatmentDetail"
  | "nextReservation"
  | "firstVisitDate"
  | "secondVisitDate"
  | "thirdVisitDate"
  | "visitRoute"
  | "nonCoveredList"
  | "nonCoveredCount"
  | "immediatePaymentCount"
  | "herbalMonthlySummary"
  | "packageCount"
  | "herbalFollowupPayment"
  | "packageRenewal"
  | "delayedPaymentWithinMonth";

export interface SheetColumnMeta {
  key: SheetColumnKey;
  index: number;
  groupHeader?: string; // "초진일" | "재내원일"
  label: string;
  shortLabel: string;
  widthClass: string;
  placeholder?: string;
  options?: string[];
  directorGuideWhenMissing: string;
  category: "core" | "revisit" | "marketing" | "non_covered";
}

export const SHEET_COLUMNS: SheetColumnMeta[] = [
  {
    key: "visitDate",
    index: 0,
    label: "일자",
    shortLabel: "일자",
    widthClass: "min-w-[96px]",
    placeholder: "예: 5월 1일",
    directorGuideWhenMissing: "내원 일자가 누락된 행이 있습니다. 파일명 또는 진료일 기준으로 확인이 필요합니다.",
    category: "core",
  },
  {
    key: "patientName",
    index: 1,
    label: "환자 이름",
    shortLabel: "환자 이름",
    widthClass: "min-w-[100px]",
    placeholder: "성명",
    directorGuideWhenMissing: "환자 성명이 비어 있는 행이 있습니다.",
    category: "core",
  },
  {
    key: "age",
    index: 2,
    label: "나이",
    shortLabel: "나이",
    widthClass: "min-w-[68px]",
    placeholder: "공란",
    directorGuideWhenMissing: "차트 파일에 나이(연령/생년월일) 정보가 없어 공란 처리되었습니다. 연령대별 재내원율 분석을 위해 차트 출력 항목에 연령을 포함해 주세요.",
    category: "core",
  },
  {
    key: "visitType",
    index: 3,
    label: "초진/재초진",
    shortLabel: "초진/재초진",
    widthClass: "min-w-[96px]",
    options: ["", "초진", "재초진"],
    directorGuideWhenMissing: "초진/재초진 구분값이 없는 환자가 있어 공란으로 두었습니다. 신환/90일 재초진 여부를 확인해 주세요.",
    category: "core",
  },
  {
    key: "insuranceType",
    index: 4,
    label: "환자구분 (건보 / 자보 / 비급여)",
    shortLabel: "환자구분",
    widthClass: "min-w-[120px]",
    options: ["", "건보", "자보", "비급여"],
    directorGuideWhenMissing: "보험/급여 구분(건보·자보·비급여)이 없는 항목은 공란 처리되었습니다.",
    category: "core",
  },
  {
    key: "treatmentDetail",
    index: 5,
    label: "환자 진료 내역 (약침 / 추나 / 한약 /비급여 유무)",
    shortLabel: "환자 진료 내역",
    widthClass: "min-w-[240px]",
    placeholder: "예: 허리 치료 (약침 / 추나)",
    directorGuideWhenMissing: "주소증·진료 내역(약침/추나/한약 등)이 차트 리스트에 없어 공란인 환자가 있습니다. 주요 진료 부위 분석에 활용됩니다.",
    category: "core",
  },
  {
    key: "nextReservation",
    index: 6,
    label: "다음 진료 예약 안내",
    shortLabel: "다음 예약 안내",
    widthClass: "min-w-[110px]",
    options: ["", "유", "무"],
    directorGuideWhenMissing: "차트에서 다음 진료 예약 유무가 확인되지 않아 공란으로 두었습니다. 접수실 퇴실 시 예약 안내(유/무) 체크를 권장드립니다.",
    category: "revisit",
  },
  {
    key: "firstVisitDate",
    index: 7,
    groupHeader: "초진일",
    label: "1회",
    shortLabel: "1회 (초진일)",
    widthClass: "min-w-[96px]",
    placeholder: "초진일",
    directorGuideWhenMissing: "1회(초진일) 기록이 비어 있는 환자가 있습니다.",
    category: "revisit",
  },
  {
    key: "secondVisitDate",
    index: 8,
    groupHeader: "재내원일",
    label: "2회",
    shortLabel: "2회 (재내원)",
    widthClass: "min-w-[96px]",
    placeholder: "미방문/공란",
    directorGuideWhenMissing: "이후 일일 환자 리스트를 계속 업로드하시면 기존 초진 환자의 2회 재내원일이 자동으로 채워집니다.",
    category: "revisit",
  },
  {
    key: "thirdVisitDate",
    index: 9,
    groupHeader: "재내원일",
    label: "3회",
    shortLabel: "3회 (재내원)",
    widthClass: "min-w-[96px]",
    placeholder: "미방문/공란",
    directorGuideWhenMissing: "이후 일일 환자 리스트를 계속 업로드하시면 기존 초진 환자의 3회 재내원일이 자동으로 채워집니다.",
    category: "revisit",
  },
  {
    key: "visitRoute",
    index: 10,
    label: "내원경로",
    shortLabel: "내원경로",
    widthClass: "min-w-[120px]",
    placeholder: "소개 / 인터넷 / 간판...",
    directorGuideWhenMissing: "내원경로(소개·네이버검색·간판 등)가 비어 있어 공란 처리되었습니다. 접수 단계에서 내원경로 기입을 표준화하면 마케팅 효율 분석이 정교해집니다.",
    category: "marketing",
  },
  {
    key: "nonCoveredList",
    index: 11,
    label: "비급여 목록 (각 한의원별로 목록을 기입해주세요)",
    shortLabel: "비급여 목록",
    widthClass: "min-w-[170px]",
    placeholder: "예: 녹용, 공진단, 다이어트",
    directorGuideWhenMissing: "비급여 품목 내역이 차트에서 감지되지 않아 공란 처리되었습니다. 원내 비급여 처방 시 기입해 주세요.",
    category: "non_covered",
  },
  {
    key: "nonCoveredCount",
    index: 12,
    label: "기입한 비급여 목록별 판매 건수",
    shortLabel: "비급여 판매건수",
    widthClass: "min-w-[150px]",
    placeholder: "공란",
    directorGuideWhenMissing: "비급여 목록별 판매 건수는 일반 일일차트에 포함되지 않아 공란 처리되었습니다. 시트에서 직접 기입하실 수 있습니다.",
    category: "non_covered",
  },
  {
    key: "immediatePaymentCount",
    index: 13,
    label: "상담후 즉시 결제 건수",
    shortLabel: "상담후 즉시결제",
    widthClass: "min-w-[140px]",
    placeholder: "공란",
    directorGuideWhenMissing: "상담 후 당일 즉시 결제 여부는 일일차트에 없어 공란으로 비워두었습니다.",
    category: "non_covered",
  },
  {
    key: "herbalMonthlySummary",
    index: 14,
    label: "한약 월총 건수 (건수별로 처방 목적 기입) 예 : 다이어트2 보약 1",
    shortLabel: "한약 월총 건수·목적",
    widthClass: "min-w-[210px]",
    placeholder: "예: 다이어트2 보약1",
    directorGuideWhenMissing: "한약 월총 건수 및 처방 목적(예: 다이어트2 보약1)은 원장님/실장님 수기 관리 항목으로 공란 처리되었습니다.",
    category: "non_covered",
  },
  {
    key: "packageCount",
    index: 15,
    label: "패키지 건수",
    shortLabel: "패키지 건수",
    widthClass: "min-w-[115px]",
    placeholder: "공란",
    directorGuideWhenMissing: "패키지 결제 건수 정보가 차트 파일에 없어 공란으로 두었습니다.",
    category: "non_covered",
  },
  {
    key: "herbalFollowupPayment",
    index: 16,
    label: "1제 복용후 추가결제 (연복유무)",
    shortLabel: "1제후 추가결제(연복)",
    widthClass: "min-w-[165px]",
    placeholder: "공란",
    directorGuideWhenMissing: "1제 복용 후 연복(추가결제) 유무는 추후 추적 항목이므로 공란 처리되었습니다.",
    category: "non_covered",
  },
  {
    key: "packageRenewal",
    index: 17,
    label: "패키지 복용후 종료후 연장(권했을때 결제유무)",
    shortLabel: "패키지 종료후 연장",
    widthClass: "min-w-[190px]",
    placeholder: "공란",
    directorGuideWhenMissing: "패키지 종료 후 연장 권유 및 결제 유무는 추후 상담 항목이므로 공란 처리되었습니다.",
    category: "non_covered",
  },
  {
    key: "delayedPaymentWithinMonth",
    index: 18,
    label: "상담후 1달이내 결제 건수 (예 : 홍길동 다이어트 3제 결제)",
    shortLabel: "1달이내 결제건수",
    widthClass: "min-w-[220px]",
    placeholder: "예: 홍길동 다이어트 3제 결제",
    directorGuideWhenMissing: "상담 후 1달 이내 지연 결제 내역은 차트에 없어 공란으로 비워두었습니다.",
    category: "non_covered",
  },
];

export interface UploadHistoryLog {
  id: string;
  fileName: string;
  uploadedAt: string;
  emrDetected: string;
  newPatientsAdded: number;
  revisitsUpdated: number;
  pureRevisitsSkipped: number;
  unmappedColumns: SheetColumnKey[];
}

export interface ColumnMissingStat {
  key: SheetColumnKey;
  label: string;
  shortLabel: string;
  missingCount: number;
  totalCount: number;
  missingPct: number;
  isCompletelyBlank: boolean;
  guide: string;
  category: SheetColumnMeta["category"];
}

export interface MissingDataReport {
  totalRows: number;
  completelyBlankColumns: ColumnMissingStat[];
  partialBlankColumns: ColumnMissingStat[];
  directorHeadline: string;
  directorMessages: string[];
}

export interface MonthlySummaryItem {
  month: string; // "2026-05"
  totalPatients: number;
  firstVisitOnly: number;
  reFirstVisitOnly: number;
  secondVisitCount: number;
  thirdVisitCount: number;
  secondVisitRate: number;
  thirdVisitRate: number;
  reservationYesCount: number;
  reservationRecordedCount: number;
  reservationYesRate: number;
}

export interface AgeGroupStat {
  ageGroup: string; // "10대 이하" | "20대" | ... | "80대 이상"
  total: number;
  sharePct: number;
  secondVisitCount: number;
  thirdVisitCount: number;
  secondVisitRate: number;
  thirdVisitRate: number;
}

export interface RouteGroupStat {
  route: string;
  count: number;
  shareOfRecordedPct: number;
  secondVisitRate: number;
  thirdVisitRate: number;
}

export interface SymptomGroupStat {
  category: string;
  count: number;
  sharePct: number;
}

export interface FirstVisitAnalytics {
  totalPatients: number;
  firstVisitCount: number;
  reFirstVisitCount: number;
  untypedVisitCount: number;
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  overallSecondVisitCount: number;
  overallThirdVisitCount: number;
  overallSecondVisitRate: number;
  overallThirdVisitRate: number;
  overallReservationYesRate: number;
  monthlySummary: MonthlySummaryItem[];
  dailySummary: {
    date: string;
    label: string;
    totalPatients: number;
    secondVisitRate: number;
    thirdVisitRate: number;
  }[];
  ageDistribution: AgeGroupStat[];
  unknownAgeCount: number;
  senior60PlusCount: number;
  senior60PlusPct: number;
  senior60PlusSecondRate: number;
  senior60PlusThirdRate: number;
  routeDistribution: RouteGroupStat[];
  recordedRouteCount: number;
  missingRouteCount: number;
  missingRoutePct: number;
  symptomDistribution: SymptomGroupStat[];
  missingSymptomCount: number;
  insuranceBreakdown: { label: string; count: number; pct: number }[];
  nonCoveredRecordedRows: number;
}

export interface KeyTakeawaySection {
  title: string;
  bullets: {
    label: string;
    content: string;
  }[];
}

export interface FirstVisitAiReportData {
  generatedAt: string;
  analyzedRowCount: number;
  introParagraph: string;
  keyTakeaways: KeyTakeawaySection[];
  missingFieldsNotice: string[];
  footnote: string;
  aiModelUsed?: string;
}

export interface FirstVisitWorkspace {
  ownerEmail: string;
  clinicName: string;
  directorName: string;
  rows: FirstVisitRow[];
  uploadLogs: UploadHistoryLog[];
  lastDetectedEmr?: string;
  aiReport?: FirstVisitAiReportData | null;
  updatedAt: string;
}

export interface MasterMemberSummary {
  ownerEmail: string;
  clinicName: string;
  directorName: string;
  rowCount: number;
  secondVisitRate: number;
  thirdVisitRate: number;
  hasAiReport: boolean;
  updatedAt: string;
}
