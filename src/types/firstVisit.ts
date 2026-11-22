export type FirstVisitTrack = "insurance" | "non_covered";

export interface FirstVisitRow {
  id: string;
  chartNo?: string; // 내부 재내원 매칭 보조키 (시트 외부 메타데이터)
  phone?: string;   // 내부 동명이인 구분 보조키

  // === 바른 초진 표준 컬럼 (보험·원장 12열 + 비급여·실장 8열) ===
  visitDate: string;                // 1. 일자 (표시용 예: "5월 1일" 또는 "2026-05-01")
  visitDateISO: string;             // 정렬·월별 통계용 표준 일자 ("YYYY-MM-DD" 또는 "")
  patientName: string;              // 2. 환자 이름
  gender?: string;                  // 3. 성별 ("남" | "여" | "") — 보험(원장) 지표용
  age: string;                      // 4. 나이 (없으면 공란 "")
  visitType: string;                // 5. 초진/재초진 ("초진" | "재초진" | "")
  insuranceType: string;            // 6. 환자구분 (건보 / 자보 / 비급여 | "")
  treatmentDetail: string;          // 7. 환자 진료 내역 (약침 / 추나 / 한약 /비급여 유무)
  nextReservation: string;          // 8. 다음 진료 예약 안내 ("유" | "무" | "")
  firstVisitDate: string;           // 9. [초진일] 1회
  firstVisitISO: string;
  secondVisitDate: string;          // 10. [재내원일] 2회
  secondVisitISO: string;
  thirdVisitDate: string;           // 11. [재내원일] 3회
  thirdVisitISO: string;
  visitRoute: string;               // 12. 내원경로 (보험·원장 마감 기준점)

  // --- 내원경로 이후: 비급여(실장) 중점 관리 컬럼 ---
  nonCoveredList: string;           // 13. 비급여 목록 (각 한의원별로 목록을 기입해주세요)
  nonCoveredCount: string;          // 14. 기입한 비급여 목록별 판매 건수
  immediatePaymentCount: string;    // 15. 상담후 즉시 결제 건수
  herbalMonthlySummary: string;     // 16. 한약 월총 건수 (건수별로 처방 목적 기입) 예 : 다이어트2 보약 1
  packageCount: string;             // 17. 패키지 건수
  herbalFollowupPayment: string;    // 18. 1제 복용후 추가결제 (연복유무)
  packageRenewal: string;           // 19. 패키지 복용후 종료후 연장(권했을때 결제유무)
  delayedPaymentWithinMonth: string;// 20. 상담후 1달이내 결제 건수 (예 : 홍길동 다이어트 3제 결제)

  sourceFile?: string;
  updatedAt?: string;
}

export type SheetColumnKey =
  | "visitDate"
  | "patientName"
  | "gender"
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
  track: FirstVisitTrack;
}

export const SHEET_COLUMNS: SheetColumnMeta[] = [
  {
    key: "visitDate",
    index: 0,
    label: "일자",
    shortLabel: "일자",
    widthClass: "min-w-[92px]",
    placeholder: "예: 5월 1일",
    directorGuideWhenMissing: "내원 일자가 누락된 행이 있습니다.",
    category: "core",
    track: "insurance",
  },
  {
    key: "patientName",
    index: 1,
    label: "환자 이름",
    shortLabel: "환자 이름",
    widthClass: "min-w-[96px]",
    placeholder: "성명",
    directorGuideWhenMissing: "환자 성명이 비어 있는 행이 있습니다.",
    category: "core",
    track: "insurance",
  },
  {
    key: "gender",
    index: 2,
    label: "성별",
    shortLabel: "성별",
    widthClass: "min-w-[70px]",
    options: ["", "남", "여"],
    directorGuideWhenMissing: "차트 파일에 성별 정보가 없는 행입니다. 성별 선택 시 동네 성별 분포 대비 정밀 비교가 적용됩니다.",
    category: "core",
    track: "insurance",
  },
  {
    key: "age",
    index: 3,
    label: "나이",
    shortLabel: "나이",
    widthClass: "min-w-[66px]",
    placeholder: "공란",
    directorGuideWhenMissing: "차트 파일에 나이(연령/생년월일) 정보가 없어 공란 처리되었습니다.",
    category: "core",
    track: "insurance",
  },
  {
    key: "visitType",
    index: 4,
    label: "초진/재초진",
    shortLabel: "초진/재초진",
    widthClass: "min-w-[94px]",
    options: ["", "초진", "재초진"],
    directorGuideWhenMissing: "초진/재초진 구분값이 없는 환자가 있어 공란으로 두었습니다.",
    category: "core",
    track: "insurance",
  },
  {
    key: "insuranceType",
    index: 5,
    label: "환자구분",
    shortLabel: "환자구분",
    widthClass: "min-w-[96px]",
    options: ["", "건보", "자보", "비급여"],
    directorGuideWhenMissing: "보험/급여 구분(건보·자보·비급여)이 없는 항목은 공란 처리되었습니다.",
    category: "core",
    track: "insurance",
  },
  {
    key: "treatmentDetail",
    index: 6,
    label: "환자 진료 내역",
    shortLabel: "진료 내역",
    widthClass: "min-w-[210px]",
    placeholder: "예: 허리 (약침 / 추나)",
    directorGuideWhenMissing: "주소증·진료 내역이 비어 있는 환자가 있습니다.",
    category: "core",
    track: "insurance",
  },
  {
    key: "nextReservation",
    index: 7,
    label: "예약 안내",
    shortLabel: "예약 안내",
    widthClass: "min-w-[90px]",
    options: ["", "유", "무"],
    directorGuideWhenMissing: "퇴실 시 다음 진료 예약 안내(유/무) 체크를 권장드립니다.",
    category: "revisit",
    track: "insurance",
  },
  {
    key: "firstVisitDate",
    index: 8,
    groupHeader: "초진일",
    label: "1회",
    shortLabel: "1회(초진)",
    widthClass: "min-w-[92px]",
    placeholder: "초진일",
    directorGuideWhenMissing: "1회(초진일) 기록이 비어 있는 환자가 있습니다.",
    category: "revisit",
    track: "insurance",
  },
  {
    key: "secondVisitDate",
    index: 9,
    groupHeader: "재내원일",
    label: "2회",
    shortLabel: "2회(재내원)",
    widthClass: "min-w-[92px]",
    placeholder: "-",
    directorGuideWhenMissing: "이후 일일 환자 리스트 업로드 시 2회 재내원일이 자동 반영됩니다.",
    category: "revisit",
    track: "insurance",
  },
  {
    key: "thirdVisitDate",
    index: 10,
    groupHeader: "재내원일",
    label: "3회",
    shortLabel: "3회(재내원)",
    widthClass: "min-w-[92px]",
    placeholder: "-",
    directorGuideWhenMissing: "이후 일일 환자 리스트 업로드 시 3회 재내원일이 자동 반영됩니다.",
    category: "revisit",
    track: "insurance",
  },
  {
    key: "visitRoute",
    index: 11,
    label: "내원경로",
    shortLabel: "내원경로",
    widthClass: "min-w-[115px]",
    placeholder: "소개 / 플레이스...",
    directorGuideWhenMissing: "접수 단계에서 내원경로를 체크하면 유입 효율 분석이 정확해집니다.",
    category: "marketing",
    track: "insurance",
  },
  // === 내원경로 이후: 비급여(실장) 중점 컬럼 ===
  {
    key: "nonCoveredList",
    index: 12,
    label: "비급여 목록",
    shortLabel: "비급여 목록",
    widthClass: "min-w-[150px]",
    placeholder: "녹용, 공진단, 약침",
    directorGuideWhenMissing: "원내 비급여 처방 품목을 기입해 주세요.",
    category: "non_covered",
    track: "non_covered",
  },
  {
    key: "nonCoveredCount",
    index: 13,
    label: "비급여 판매건수",
    shortLabel: "비급여 판매건수",
    widthClass: "min-w-[125px]",
    placeholder: "예: 1",
    directorGuideWhenMissing: "비급여 품목 판매 건수를 기입하실 수 있습니다.",
    category: "non_covered",
    track: "non_covered",
  },
  {
    key: "immediatePaymentCount",
    index: 14,
    label: "상담후 즉시결제",
    shortLabel: "상담후 즉시결제",
    widthClass: "min-w-[125px]",
    placeholder: "예: 1 / 유",
    directorGuideWhenMissing: "상담 당일 즉시 결제 건수 또는 유무를 체크해 주세요.",
    category: "non_covered",
    track: "non_covered",
  },
  {
    key: "herbalMonthlySummary",
    index: 15,
    label: "한약 건수·목적",
    shortLabel: "한약 건수·목적",
    widthClass: "min-w-[170px]",
    placeholder: "예: 다이어트2 보약1",
    directorGuideWhenMissing: "한약 처방 건수 및 목적(보약·다이어트·통증 등)을 기입해 주세요.",
    category: "non_covered",
    track: "non_covered",
  },
  {
    key: "packageCount",
    index: 16,
    label: "패키지 건수",
    shortLabel: "패키지 건수",
    widthClass: "min-w-[110px]",
    placeholder: "예: 1",
    directorGuideWhenMissing: "약침·추나·다이어트 등 패키지 등록 건수를 기입해 주세요.",
    category: "non_covered",
    track: "non_covered",
  },
  {
    key: "herbalFollowupPayment",
    index: 17,
    label: "1제후 연복유무",
    shortLabel: "1제후 연복",
    widthClass: "min-w-[125px]",
    options: ["", "유", "무"],
    directorGuideWhenMissing: "1제 복용 종료 시점 추가 결제(연복) 유무를 체크해 주세요.",
    category: "non_covered",
    track: "non_covered",
  },
  {
    key: "packageRenewal",
    index: 18,
    label: "패키지 종료연장",
    shortLabel: "패키지 연장",
    widthClass: "min-w-[130px]",
    options: ["", "유", "무"],
    directorGuideWhenMissing: "패키지 종료 시 연장 결제 유무를 체크해 주세요.",
    category: "non_covered",
    track: "non_covered",
  },
  {
    key: "delayedPaymentWithinMonth",
    index: 19,
    label: "1달이내 지연결제",
    shortLabel: "1달이내 결제",
    widthClass: "min-w-[165px]",
    placeholder: "예: 보약 1제 결제",
    directorGuideWhenMissing: "당일 보류 후 30일 이내 해피콜 회수 결제 내역을 기입해 주세요.",
    category: "non_covered",
    track: "non_covered",
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
  secondVisitCount: number;
  thirdVisitCount: number;
  secondVisitRate: number;
  thirdVisitRate: number;
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
  maleCount?: number;
  femaleCount?: number;
  unknownGenderCount?: number;
  avgVisitIntervalDays?: number;
  routeDistribution: RouteGroupStat[];
  recordedRouteCount: number;
  missingRouteCount: number;
  missingRoutePct: number;
  symptomDistribution: SymptomGroupStat[];
  missingSymptomCount: number;
  insuranceBreakdown: { label: string; count: number; pct: number }[];
  nonCoveredRecordedRows: number;
  herbalRecordedRows?: number;
  packageRecordedRows?: number;
  immediatePayRecordedRows?: number;
  delayedPayRecordedRows?: number;
  herbalFollowupRecordedRows?: number;
  packageRenewalRecordedRows?: number;
}

export interface KeyTakeawaySection {
  title: string;
  oneLiner?: string; // 초심플 1줄 핵심 결론
  track?: FirstVisitTrack;
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
  insuranceTakeaways?: KeyTakeawaySection[];
  nonCoveredTakeaways?: KeyTakeawaySection[];
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
