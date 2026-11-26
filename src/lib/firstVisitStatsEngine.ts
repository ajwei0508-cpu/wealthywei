"use client";

import { getSemiAnnualCensusDates } from "./censusUtils";
import { classifySymptomCategories } from "./firstVisitEngine";
import type { FirstVisitRow, FirstVisitTrack } from "@/types/firstVisit";

export { getSemiAnnualCensusDates };

export interface DemographicData {
  regionCode: string;
  regionName: string;
  totalPopulation: number;
  malePopulation: number;
  femalePopulation: number;
  femaleRatio: number; // %
  seniorPopulation: number;
  seniorRatio: number; // %
  source: "SGIS_LIVE" | "GPS_REGIONAL_PRESET" | "MANUAL";
  censusBaseDate: string;
  nextUpdateDate: string;
  updateInterval: string;
  lastUpdatedIso: string;
}

export interface ClinicPatientMetrics {
  totalVisits: number;
  firstVisits: number;
  reFirstVisits: number;
  revisits: number;
  seniorVisits: number;
  under65Visits: number;
  maleVisits: number;
  femaleVisits: number;
  acquisitionChannels: {
    organicWalkIn: number;
    referral: number;
    digitalSearch: number;
    socialAd: number;
    other: number;
  };
  nonReimbursableVisits: number;
  reimbursableOnlyVisits: number;
  referralPatients: number;
}

export type RiskLevel = "HEALTHY" | "WARNING" | "CRITICAL" | "EMPTY";

export type GrowthTier = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" | "MASTER";

export interface ModalVsComparison {
  leftLabel: string;
  leftValue: string;
  leftSub: string;
  leftPct?: number;
  rightLabel: string;
  rightValue: string;
  rightSub: string;
  rightPct?: number;
  rightTone?: "danger" | "safe";
  highlightBadge?: string;
}

export interface IndicatorModalDetail {
  exactCounts: string;           // 실제 분자/분모 집계 내역
  benchmarkReason: string;       // 1. 왜 이 기준점인가? (고정 설명 안내문)
  riskTitle?: string;            // 2. 상황 맞춤 리스크/강점 섹션 제목
  riskLossBadge?: string;        // 2. 크게 표시할 핵심 마이너스 매출 또는 체감 위험 수치
  riskLossSub?: string;          // 2. 큰 수치 옆 보조 표기 (예: "(연 -360만 원)")
  riskLossTone?: "loss" | "cause" | "warn" | "safe"; // 2. 시각 강조 톤
  vsComparison?: ModalVsComparison; // 2. 직관적 좌·우 VS 비교 카드 (예약 O vs X, 권장 vs 현재)
  riskWarning: string;           // 2. 한 문장 핵심 리스크 / 강점 요약
  actionTitle?: string;          // 3. 상황 맞춤 실전 멘트 제목
  actionInstruction: string;     // 최우선 미션 모달 연동용 실행 지시 (지표 팝업 3번에서는 실전 멘트만 표시)
  avoidScript?: string;          // 3. 절대 피해야 할 금지 멘트 (❌)
  scriptExample: string;         // 3. 현재 상황 맞춤 현장 실전 스크립트 (⭕)
  revenueImpactManwon: number;   // 상단 목표 도달 기대효과 집계용 (팝업 하단 산출식은 미표시)
  formulaNote?: string;          // 상단 기대효과 모달 산출식 연동용
}

export interface BodyPartRetentionItem {
  id: string;
  label: string;                 // 예: "허리·골반"
  shortName: string;             // 카드 표기용 단축명 (예: "허리")
  patients: number;              // 해당 부위 초진·재초진 인원
  sharePct: number;              // 전체 환자 대비 비중 (%)
  secondCount: number;           // 2회 내원 인원
  thirdCount: number;            // 3회 완주 인원 (삼진)
  secondRate: number;            // 2차 재내원율 (%)
  thirdRate: number;             // 삼진율 (3회 내원율, %)
  targetRate: number;            // 권장 기준점 (70%)
  neededFor70: number;           // 70% 도달에 필요한 추가 3회 완주 인원
  isConsultOnly?: boolean;       // 보약·다이어트 등 1회 처방/택배 비중 군 여부
  status: RiskLevel;             // HEALTHY (>=70%) | WARNING (50~69.9% 또는 표본1명) | CRITICAL (<50%)
  dropoutReason: string;         // 해당 질환의 주요 3회 미만 이탈 원인
  prescriptionGuide: string;     // 원장님 맞춤 개선 지시
  scriptExample: string;         // 진료실 1문장 실전 티업 멘트
}

export const DEFAULT_INSURANCE_AVG_FEE_MANWON = 3.8; // 비급여 제외 · 보험(본부금+공단청구) 1회 평균 기본값
export const MIN_BODYPART_SAMPLE = 5; // 부위별 삼진율 통계 판정 최소 표본수
export const MIN_CLINIC_OPEN_YEAR = 1950; // 개원 연도 유효 하한선

export type ClinicYearStage = "YEAR_1" | "YEAR_2_3" | "YEAR_4_PLUS";

export interface ClinicStageBenchmark {
  stage: ClinicYearStage;
  stageLabel: string;
  shortStageLabel: string;
  reFirstMin: number;
  reFirstMax: number;
  reFirstCriticalLow: number | null; // 1년차는 구환 축적기이므로 하한 미달 시 WARNING 완화
  pureFirstMin: number;
  pureFirstMax: number;
  targetChartMid: number;
  referralSoftened: boolean;         // 1~2년차는 소개율 70% 미달 시 CRITICAL 대신 WARNING 완화
}

export function computeClinicYearsActive(
  openYear?: number | null,
  referenceYear: number = new Date().getFullYear()
): number | null {
  if (
    typeof openYear !== "number" ||
    !Number.isInteger(openYear) ||
    openYear < MIN_CLINIC_OPEN_YEAR ||
    openYear > referenceYear
  ) {
    return null;
  }
  return Math.max(1, referenceYear - openYear + 1);
}

export function getClinicStageBenchmark(
  clinicYearsActive: number | null
): ClinicStageBenchmark | null {
  if (clinicYearsActive === null || clinicYearsActive < 1) return null;
  if (clinicYearsActive === 1) {
    return {
      stage: "YEAR_1",
      stageLabel: "1년 차 (개원 초기 · 신규 유입 집중기)",
      shortStageLabel: "초기 정착기",
      reFirstMin: 10,
      reFirstMax: 35,
      reFirstCriticalLow: null,
      pureFirstMin: 65,
      pureFirstMax: 90,
      targetChartMid: 23,
      referralSoftened: true,
    };
  }
  if (clinicYearsActive <= 3) {
    return {
      stage: "YEAR_2_3",
      stageLabel: "2~3년 차 (성장기 · 구환 축적 전환기)",
      shortStageLabel: "성장기",
      reFirstMin: 30,
      reFirstMax: 50,
      reFirstCriticalLow: 18,
      pureFirstMin: 50,
      pureFirstMax: 70,
      targetChartMid: 40,
      referralSoftened: clinicYearsActive <= 2,
    };
  }
  return {
    stage: "YEAR_4_PLUS",
    stageLabel: "4년 차 이상 (안정·성숙기 · 구환+신규 균형기)",
    shortStageLabel: "안정기",
    reFirstMin: 45,
    reFirstMax: 70,
    reFirstCriticalLow: 30,
    pureFirstMin: 30,
    pureFirstMax: 55,
    targetChartMid: 58,
    referralSoftened: false,
  };
}

export type ChunaType = "complex" | "simple";
export type ChunaTargetPct = 10 | 30 | 50;
export type Herbal40TargetPct = 5 | 8 | 10;

export interface InsuranceSimulationSettings {
  chunaType: ChunaType;                 // "complex" (복잡추나) | "simple" (단순추나)
  chunaTargetPct: ChunaTargetPct;       // 추나 유효 대상자 중 목표 비율 (10 | 30 | 50)
  includeChunaInTotal: boolean;         // 상단 목표 도달 기대효과 합산 포함 여부
  herbal40TargetPct: Herbal40TargetPct; // 전체 초진 중 급여 첩약 40일분 목표 비율 (5 | 8 | 10)
  includeHerbal40InTotal: boolean;      // 상단 목표 도달 기대효과 합산 포함 여부
}

export const DEFAULT_INSURANCE_SIM_SETTINGS: InsuranceSimulationSettings = {
  chunaType: "complex",
  chunaTargetPct: 50,
  includeChunaInTotal: true,
  herbal40TargetPct: 10,
  includeHerbal40InTotal: true,
};

export const CHUNA_FEES = {
  complex: {
    label: "복잡추나",
    firstWon: 107080,
    revisitWon: 91860,
    total3VisitsManwon: 29.08, // 107,080 + 91,860 × 2 = 290,800원
  },
  simple: {
    label: "단순추나",
    firstWon: 88960,
    revisitWon: 46730,
    total3VisitsManwon: 18.24, // 88,960 + 46,730 × 2 = 182,420원
  },
} as const;

export const HERBAL_40DAY_FEE_MANWON = 60; // 급여 첩약 40일분 (2개 질환 × 각 20일 = 10일 × 4회 × 15만원)

export interface InsuranceSimulationSummary {
  settings: InsuranceSimulationSettings;
  chunaEligibleCount: number;
  chunaExcludedSenior: number;
  chunaExcludedAuto: number;
  chunaExcludedNonMsk: number;
  isFallbackEligibilityUsed: boolean;
  currentChunaCount: number;
  targetChunaCount: number;
  additionalChunaCount: number;
  chunaLabel: string;
  chunaFirstWon: number;
  chunaRevisitWon: number;
  chuna3VisitTotalManwon: number;
  baseline3VisitManwon: number;
  perPatientNetGainManwon: number;
  chunaGainManwon: number;
  herbal40TargetCount: number;
  herbal40GainManwon: number;
  herbal40CannibalWarning: boolean;
}

export interface FeeBasisSummary {
  insuranceAvgFeeManwon: number; // 적용된 보험 1회 평균 객단가 (본부금+공단청구, 만원)
  isCustomInput: boolean;        // 원장님 직접 입력 여부 (false면 기본 3.8만원)
  under65FeeManwon: number;      // 하위 호환용
  senior65FeeManwon: number;     // 하위 호환용
  avgVisitFeeManwon: number;     // 적용된 보험 1회 평균 객단가 (만원)
  under65Count: number;
  senior65Count: number;
  knownAgeCount: number;
  isDefaultRatioUsed: boolean;
}

export interface DualTrackIndicator {
  id: string;
  track: FirstVisitTrack;
  order: number;
  title: string;                 // 짧은 지표명 (예: "2차 재내원율")
  subMetric?: string;            // 초간단 보조 수치 (예: "3차 48%")
  currentValue: number;          // 차트용 수치 (0~100 정규화 가능)
  valueDisplay: string;          // 메인 숫자 (예: "68.0%")
  targetValue: number;           // 차트용 기준치
  targetDisplay: string;         // 기준점 표기 (예: "목표 65%↑")
  gapDisplay: string;            // 부족/달성 배지 (예: "달성 +3.0%p" / "2명 부족")
  status: RiskLevel;
  conclusion: string;            // 핵심 1줄 결론 (글자 최소화!)
  isGenderCard?: boolean;        // 보험(원장) 성별 입력란 노출 카드 여부
  requiresOpenYear?: boolean;    // 개원 연도 미입력으로 계산불가 상태인 연차 연동 지표 여부
  modal: IndicatorModalDetail;   // ⓘ 아이콘 클릭 시 상세 안내
}

export interface TrackSummary {
  track: FirstVisitTrack;
  label: string;                 // "보험 (원장)" | "비급여 (실장)"
  score: number;                 // 0 ~ 100점
  tier: GrowthTier;
  tierLabel: string;             // 예: "GOLD · 지역강자"
  nextTierGapText: string;       // 예: "예약 +3명 시 PLATINUM 승급"
  focusMission: string;          // 이번 주 딱 1가지 핵심 미션 (1줄!)
  focusMissionReason: string;    // ⓘ 클릭 시 미션 선정 이유 및 가이드
  potentialMonthlyGainManwon: number; // 목표 도달 시 월 잠재 추가매출 합계(만원)
  potentialBreakdown: { label: string; gainManwon: number; detail: string; formula?: string }[];
  healthyCount: number;
  warningCount: number;
  criticalCount: number;
  indicators: DualTrackIndicator[];
}

export interface DualTrackEvaluation {
  evaluatedAt: string;
  clinicOpenYear: number | null;
  clinicYearsActive: number | null;
  clinicStageLabel: string | null;
  districtType: string;          // 상권 유형 (예: "고령 밀착형 상권")
  districtTip: string;           // 상권 1줄 특성
  mpi: number;                   // 인구 1,000명당 신환 침투율
  mpiTargetRange: string;        // 예: "1.8 ~ 3.2명"
  recordedMale: number;
  recordedFemale: number;
  unrecordedGender: number;
  effectiveMale: number;
  effectiveFemale: number;
  feeBasis: FeeBasisSummary;     // 보험 1회 평균 객단가 산출 기준 (본부금+공단청구)
  insuranceSimulation: InsuranceSimulationSummary; // 추나(3회 기준) & 급여 첩약(40일분) 시뮬레이션
  bodyPartRetention: BodyPartRetentionItem[]; // 진료부위별 삼진율 정밀 분석
  unclassifiedBodyPartCount: number;          // 부위 미기입 인원
  insurance: TrackSummary;       // 보험 (원장) — 내원경로까지
  nonCovered: TrackSummary;      // 비급여 (실장) — 내원경로 이후
}

const initialCensus = getSemiAnnualCensusDates();

export const DEFAULT_DEMOGRAPHIC: DemographicData = {
  regionCode: "1168064000",
  regionName: "서울특별시 강남구 역삼1동",
  totalPopulation: 34263,
  malePopulation: 16758,
  femalePopulation: 17505,
  femaleRatio: 51.1,
  seniorPopulation: 4288,
  seniorRatio: 12.5,
  source: "SGIS_LIVE",
  censusBaseDate: "2026년 10월 자료",
  nextUpdateDate: initialCensus.nextUpdateDate,
  updateInterval: initialCensus.updateInterval,
  lastUpdatedIso: initialCensus.lastUpdatedIso,
};

export const DEFAULT_CLINIC_METRICS: ClinicPatientMetrics = {
  totalVisits: 850,
  firstVisits: 110,
  reFirstVisits: 45,
  revisits: 695,
  seniorVisits: 140,
  under65Visits: 710,
  maleVisits: 340,
  femaleVisits: 510,
  acquisitionChannels: {
    organicWalkIn: 45,
    referral: 48,
    digitalSearch: 42,
    socialAd: 15,
    other: 5,
  },
  nonReimbursableVisits: 220,
  reimbursableOnlyVisits: 630,
  referralPatients: 48,
};

function clean(v: unknown): string {
  return v === null || v === undefined ? "" : String(v).trim();
}

function extractPositiveCount(v: unknown): number {
  const s = clean(v);
  if (!s) return 0;
  const compact = s.replace(/\s+/g, "").toUpperCase();
  if (/^(무|없음|X|N|NO|0|0건|미결제|거절|보류)$/.test(compact)) return 0;
  if (/^(유|예|O|Y|YES|완료|결제|연복|연장)$/.test(compact)) return 1;
  // 예: "다이어트2 보약1" -> 숫자 합산 3, 일반 텍스트(예: "홍길동 다이어트 결제") -> 1
  const nums = [...s.matchAll(/\d+/g)].map((m) => Number(m[0])).filter((n) => n > 0 && n < 100);
  if (nums.length > 0 && s.length <= 20 && !/\d{4}/.test(s)) {
    return nums.reduce((a, b) => a + b, 0);
  }
  return 1;
}

function isAffirmative(v: unknown): boolean {
  return extractPositiveCount(v) > 0;
}

function daysBetweenISO(iso1?: string, iso2?: string): number | null {
  if (!iso1 || !iso2) return null;
  const d1 = new Date(iso1);
  const d2 = new Date(iso2);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;
  const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0 || diff > 60) return null;
  return diff;
}

function scoreToTier(score: number): { tier: GrowthTier; label: string; nextTier: string; nextCut: number } {
  if (score >= 92) return { tier: "MASTER", label: "MASTER · 상위 1%", nextTier: "최고 등급 달성", nextCut: 100 };
  if (score >= 80) return { tier: "PLATINUM", label: "PLATINUM · 상권 1위", nextTier: "MASTER", nextCut: 92 };
  if (score >= 65) return { tier: "GOLD", label: "GOLD · 지역강자", nextTier: "PLATINUM", nextCut: 80 };
  if (score >= 48) return { tier: "SILVER", label: "SILVER · 안정궤도", nextTier: "GOLD", nextCut: 65 };
  return { tier: "BRONZE", label: "BRONZE · 기반구축", nextTier: "SILVER", nextCut: 48 };
}

/**
 * 상권 자동 분류 (전국 3,905개 읍·면·동 실제 인구 연동)
 */
function classifyDistrict(demo: DemographicData) {
  const sr = demo.seniorRatio || 16;
  if (sr >= 22) {
    return {
      type: "고령 밀착형 상권",
      tip: `65세↑ 고령 비율(${sr}%)이 높아 급여 신뢰 후 약침·관절보약 연계가 유리합니다.`,
      mpiMin: 2.0,
      mpiMax: 3.5,
      nonCovTarget: 32,
      herbalTarget: 18,
    };
  }
  if (sr <= 13) {
    return {
      type: "젊은 가족·오피스 상권",
      tip: `청장년 비중(${(100 - sr).toFixed(1)}%)이 높아 빠른 예약관리와 추나·다이어트·패키지 집중이 핵심입니다.`,
      mpiMin: 1.4,
      mpiMax: 2.6,
      nonCovTarget: 42,
      herbalTarget: 22,
    };
  }
  return {
    type: "균형 주거형 상권",
    tip: `전 연령이 고르게 거주(고령 ${sr}%)하여 가족 소개 및 재초진 주치의 전략이 가장 강력합니다.`,
    mpiMin: 1.6,
    mpiMax: 3.0,
    nonCovTarget: 35,
    herbalTarget: 20,
  };
}

interface ClinicalBodyPartDef {
  id: string;
  label: string;
  shortName: string;
  isConsultOnly?: boolean;
  match: (detail: string, insType: string) => boolean;
  dropoutReason: string;
  prescriptionGuide: string;
  scriptExample: string;
}

const CLINICAL_BODY_PARTS: ClinicalBodyPartDef[] = [
  {
    id: "waist",
    label: "허리·골반",
    shortName: "허리",
    match: (d) =>
      /허리|요통|요추|요각통|요염좌|추간판|디스크|협착|골반|엉치|고관절|좌골|옆구리|천장관절|요부|섬요/.test(
        d
      ),
    dropoutReason:
      "1~2회 침·약침 후 급성 통증이 절반 줄면 다 나은 줄 알고 조기 중단했다가 착석·물건 들기 후 재발하기 쉽습니다.",
    prescriptionGuide:
      "초진 첫날 '겉근육 통증 완화 후 3회차 심부 코어(장요근·다열근)·골반 안정화까지 마쳐야 재발하지 않는다'고 선언하세요.",
    scriptExample:
      "\"허리는 통증이 절반 줄었을 때 멈추면 가장 쉽게 재발합니다. 3회차 골반·속근육 안정화까지는 꼭 채우셔야 합니다.\"",
  },
  {
    id: "neck",
    label: "목·경추·담",
    shortName: "목·담",
    match: (d) => {
      const stripped = d.replace(/발목|손목|목적|목록|목요일|목소리|목구멍/g, "");
      return /경추|경항|항강|뒷목|목통증|목디스크|목결림|목뻐근|목담|거북목|일자목|낙침|승모근|날개뼈|견갑|견배|등\s*(?:통증|결림|담|아픔|뻐근)|흉추|배통|담결림|담걸림|근막통|늑간|갈비|^등[\s,/]|(?<![항품과세주발손])목/.test(
        stripped
      );
    },
    dropoutReason:
      "'단순 담결림·잠을 잘못 잤다'고 가볍게 여겨 1회 치료 후 고개가 돌아가면 바로 내원을 중단하는 대표적 단발 이탈 부위입니다.",
    prescriptionGuide:
      "급성 낙침·담결림도 실제로는 경추 심부근 누적 피로임을 설명하고, 가동범위 정상화를 위한 3회 단기 집중 예약을 고정하세요.",
    scriptExample:
      "\"갑자기 온 담결림도 경추 속근육 피로가 쌓여 터진 겁니다. 3회차까지 완전히 풀어두지 않으면 2주 내 다시 굳습니다.\"",
  },
  {
    id: "shoulder",
    label: "어깨·견관절",
    shortName: "어깨",
    match: (d) =>
      /어깨|어꺠|오십견|회전근개|유착성|충돌증후군|견관절|견비통|삼각근|쇄골|석회성/.test(d),
    dropoutReason:
      "야간통·거상 제한 등 만성 힘줄 염증이 많아 1~2회 치료로 즉각 완치되지 않으면 조기 실망 이탈이 발생하기 쉽습니다.",
    prescriptionGuide:
      "어깨 질환은 첫 3회가 '야간통 염증 불씨를 잡는 도입기'임을 명확히 고지하고 3회차에 거상 각도 재평가를 예고하세요.",
    scriptExample:
      "\"어깨 힘줄 염증은 처음 3회 집중 약침으로 밤에 쑤시는 불씨부터 잡는 구간입니다. 3회차에 팔 각도를 다시 체크하겠습니다.\"",
  },
  {
    id: "knee",
    label: "무릎·하지",
    shortName: "무릎",
    match: (d) =>
      /무릎|슬관절|슬통|오금|슬와|퇴행성관절|반월상|십자인대|다리|하체|하지|허벅지|대퇴|종아리|정강이|쥐남/.test(
        d
      ),
    dropoutReason:
      "보행·계단 이용 시 체중 부하가 매일 반복되어 시술 직후 편했다가 귀가 후 다시 시큰거리면 효과를 의심해 중단하기 쉽습니다.",
    prescriptionGuide:
      "보행 하중을 이기려면 최소 3회 연속으로 관절강 주변 부종과 대퇴근 긴장을 함께 잡아야 통증 주기가 끊김을 안내하세요.",
    scriptExample:
      "\"무릎은 걸을 때마다 체중이 실리는 관절이라, 최소 3회 연속으로 부종을 빼줘야 계단 내려갈 때 시큰거림이 잡힙니다.\"",
  },
  {
    id: "ankle",
    label: "발목·족부",
    shortName: "발목",
    match: (d) => {
      if (
        /발목|족관절|발바닥|족저|아킬레스|발등|족배|발가락|뒤꿈치|종골|발통증|발저림|발시림|접질|삐끗|삐었|(?<![재출다모유폭])발(?![생열진한목등바닥가락])/.test(
          d
        )
      ) {
        return true;
      }
      if (/염좌/.test(d) && !/요추|경추|목|허리|손목|손가락|완관절|주관절|무릎|어깨/.test(d)) {
        return true;
      }
      return false;
    },
    dropoutReason:
      "부기와 급성 통증만 조금 가라앉으면 걸을 만하다고 판단해 1~2회 만에 자가 종료(만성 발목 불안정증 유발 1위)합니다.",
    prescriptionGuide:
      "통증 소실과 인대 조직 회복은 다르다는 점을 강조하고, 습관성 염좌 예방을 위한 '초기 3회 인대 고정 치료'를 못 박으세요.",
    scriptExample:
      "\"발목은 덜 아파도 늘어난 인대가 아물기까지 초기 3회 치료가 핵심입니다. 지금 멈추면 평생 습관성으로 삐끗합니다.\"",
  },
  {
    id: "wrist_elbow",
    label: "손목·팔꿈치",
    shortName: "손목·팔",
    match: (d) =>
      /손목|완관절|손가락|손바닥|손등|손저림|손떨림|손마디|수근관|터널|건초염|방아쇠|팔꿈치|주관절|엘보|상과염|아래팔|윗팔|전완|상완|팔통증|팔저림|(?<![양재])팔(?![월십])|(?<![파훼결손])손(?![실상해님])/.test(
        d
      ),
    dropoutReason:
      "스마트폰·PC·가사 등 일상 사용을 쉬지 못해 1~2회 치료 후 재자극이 오면 회복이 더디다고 느껴 이탈하기 쉽습니다.",
    prescriptionGuide:
      "매일 쓰는 건초·힘줄 부위 특성을 설명하고, 사용량을 이기는 첫 주 매일 약침·테이핑 집중 치료 후 둘째 주부터 주 3회 지속 주기를 안내하세요.",
    scriptExample:
      "\"손목·팔꿈치는 매일 쓰시는 부위라 1회 치료만으론 사용량을 못 이깁니다. 첫 주는 매일 오셔서 염증부터 꺾고, 둘째 주부터 주 3회로 지속할게요.\"",
  },
  {
    id: "neuro_head",
    label: "두통·턱·신경",
    shortName: "두통·턱",
    match: (d) =>
      /두통|편두통|어지럼|현훈|이석증|메니에르|이명|난청|턱|악관절|구안와사|구안괘사|안면|벨마비|삼차신경|대상포진|틱|불면|자율신경|화병|불안|우울|놀람/.test(
        d
      ),
    dropoutReason:
      "진통제처럼 1회 만에 증상이 완전히 소실되길 기대하거나 침 치료의 자율신경·상부경추 기전 설명이 부족할 때 이탈합니다.",
    prescriptionGuide:
      "상부 경추 긴장과 자율신경 안정화 과정을 쉽게 설명하고, 증상 빈도·수면의 질 변화를 3회차에 점검하겠다고 약속하세요.",
    scriptExample:
      "\"두통·어지럼은 뒷목 신경 긴장과 자율신경 흥분을 같이 낮춰야 합니다. 3회차까지 강도와 빈도가 줄어드는 걸 체크하겠습니다.\"",
  },
  {
    id: "internal_ent",
    label: "소화·비염·내과",
    shortName: "내과·비염",
    match: (d, ins) => {
      // 비급여 단독 보약(산후보약, 소아보약 등)은 아래 보약·다이어트(첩약군)으로 분리하여 침치료 삼진율 왜곡 방지
      if (ins === "비급여" && /보약|녹용|공진단|경옥고|다이어트/.test(d)) return false;
      return /소화|담적|체함|체기|식도염|역류성|위염|속쓰림|속안좋음|설사|변비|복통|복부|팽만|장염|과민성|비염|콧물|코막힘|축농증|기침|가래|천식|감기|인후|호흡|기관지|소변|절박뇨|야뇨|전립선|생리|월경|다낭성|난임|자궁|산후|갱년기|수족냉증|다한증|피부|아토피|습진|건선|여드름|탈모|두드러기|가려움|열감|피로|기력|무기력/.test(
        d
      );
    },
    dropoutReason:
      "급성 체기·코막힘이 1회 침·보험한약으로 호전되면 한의원 내과 진료를 1회성 응급처치로만 인식하고 재방문을 생략합니다.",
    prescriptionGuide:
      "급성 증상 완화 후 위장 운동성·점막 면역 회복을 위해 첫 주 매일 집중 치료 후 둘째 주부터 주 3회 지속 리듬으로 2·3차 경과 진료를 연결하세요.",
    scriptExample:
      "\"오늘 급한 증상은 내렸지만 위장·점막 기능이 아직 안정되지 않았습니다. 첫 주는 매일 경과를 보며 회복시키고, 둘째 주부터 주 3회로 지속할게요.\"",
  },
  {
    id: "herbal_diet",
    label: "보약·다이어트",
    shortName: "보약·비만",
    isConsultOnly: true,
    match: (d) =>
      /다이어트|비만|보약|녹용|공진단|경옥고|청심원|한약\s*(?:상담|처방)|^한약$|성장|소아보약/.test(d),
    dropoutReason:
      "1회 진맥·처방 후 택배 수령 비중이 높아 별도 내원 점검 예약이 없으면 시트상 2·3회 내원일이 공란으로 남기 쉽습니다.",
    prescriptionGuide:
      "한약·다이어트 환자도 복용 7일차·14일차 인바디/맥진 중간점검 내원일을 미리 잡아두면 삼진율과 연복률이 함께 상승합니다.",
    scriptExample:
      "\"한약 복용 시작 1주일째 되는 다음 주 목요일에 체수분·적응도 중간점검 예약을 미리 잡아드리겠습니다.\"",
  },
];

const TRAFFIC_FALLBACK_DEF: ClinicalBodyPartDef = {
  id: "traffic",
  label: "교통사고(자보)",
  shortName: "자보",
  match: (d, ins) => /교통사고|자보|후유증|편타/.test(d) || ins === "자보",
  dropoutReason:
    "사고 직후 통증이 경미하다고 방치하거나 초기 집중 치료 골든타임 안내 부족 시 조기 종결됩니다.",
  prescriptionGuide:
    "편타성 손상은 사고 3~7일 뒤 어혈 통증이 본격화됨을 고지하고 첫 주 매일 연속 내원 후 둘째 주부터 주 3회 지속 스케줄을 즉시 확정하세요.",
  scriptExample:
    "\"교통사고 긴장은 며칠 뒤부터 어혈 통증이 더 올라옵니다. 후유증이 남지 않게 첫 주는 매일 내원하시고, 둘째 주부터는 주 3회로 지속할게요.\"",
};

function classifyClinicalBodyParts(detail: string, insType: string): ClinicalBodyPartDef[] {
  const d = clean(detail);
  const ins = clean(insType);
  if (!d && ins !== "자보") return [];

  const matched = CLINICAL_BODY_PARTS.filter((def) => d && def.match(d, ins));
  if (matched.length > 0) return matched;
  if (TRAFFIC_FALLBACK_DEF.match(d, ins)) return [TRAFFIC_FALLBACK_DEF];
  return [];
}

/**
 * [핵심 엔진] 보험(원장) & 비급여(실장) 2대 트랙 정밀 평가 + 동기부여 시뮬레이터
 */
export function evaluateDualTrackStats(
  rows: FirstVisitRow[],
  demographic: DemographicData,
  genderOverride?: { male?: number | null; female?: number | null },
  customInsuranceFeeManwon?: number | null,
  simSettingsOverride?: Partial<InsuranceSimulationSettings>,
  openYear?: number | null
): DualTrackEvaluation {
  const district = classifyDistrict(demographic);
  const currentCalendarYear = new Date().getFullYear();
  const clinicYearsActive = computeClinicYearsActive(openYear, currentCalendarYear);
  const clinicOpenYear = clinicYearsActive !== null ? (openYear as number) : null;
  const clinicStage = getClinicStageBenchmark(clinicYearsActive);
  const totalPatients = rows.length;
  const safeTotal = Math.max(1, totalPatients);

  // --- 기본 집계 ---
  let pureFirst = 0;
  let reFirst = 0;
  let secondCount = 0;
  let thirdCount = 0;

  let resvYes = 0;
  let resvNo = 0;
  let resvYes2nd = 0;
  let resvNo2nd = 0;

  const intervals: number[] = [];

  let senior65 = 0;
  let knownAge = 0;
  let pureFirstKnownAge = 0;
  let pureFirstSenior65 = 0;
  let reFirstKnownAge = 0;
  let reFirstSenior65 = 0;

  let recordedMale = 0;
  let recordedFemale = 0;

  let routeRecorded = 0;
  let routeReferral = 0;
  let routeOrganicWalk = 0;
  let routeDigital = 0;

  // 순수초진(생애 첫 방문) 전용 내원경로 분리 집계 (재초진 분모 왜곡 원천 차단)
  let pureFirstRouteRecorded = 0;
  let pureFirstReferral = 0;
  let pureFirstWalkIn = 0;
  let pureFirstDigital = 0;

  // 진료부위별 삼진율(3회 내원율) 집계
  const bodyPartStatsMap = new Map<
    string,
    { def: ClinicalBodyPartDef; patients: number; second: number; third: number }
  >();
  let unclassifiedBodyPartCount = 0;

  // --- 비급여(실장) 집계 ---
  let nonCovPatientCount = 0;
  let immediatePayPatients = 0;
  let delayedPayPatients = 0;
  let herbalPatients = 0;
  let herbalFollowupYes = 0;
  let packagePatients = 0;
  let packageRenewYes = 0;

  for (const r of rows) {
    const vt = clean(r.visitType);
    if (vt.includes("재초진")) reFirst++;
    else pureFirst++;

    const has2 = Boolean(clean(r.secondVisitDate));
    const has3 = Boolean(clean(r.thirdVisitDate));
    if (has2) secondCount++;
    if (has3) thirdCount++;

    const diff = daysBetweenISO(r.firstVisitISO || r.visitDateISO, r.secondVisitISO);
    if (diff !== null) intervals.push(diff);

    const rv = clean(r.nextReservation);
    if (rv === "유") {
      resvYes++;
      if (has2) resvYes2nd++;
    } else if (rv === "무") {
      resvNo++;
      if (has2) resvNo2nd++;
    }

    const isReFirstRow = vt.includes("재초진");
    const ageNum = parseInt(clean(r.age).replace(/[^0-9]/g, ""), 10);
    if (!isNaN(ageNum) && ageNum > 0) {
      knownAge++;
      if (ageNum >= 65) senior65++;
      if (isReFirstRow) {
        reFirstKnownAge++;
        if (ageNum >= 65) reFirstSenior65++;
      } else {
        pureFirstKnownAge++;
        if (ageNum >= 65) pureFirstSenior65++;
      }
    }

    const g = clean(r.gender);
    if (/^(남|남자|남성|M)$/i.test(g)) recordedMale++;
    else if (/^(여|여자|여성|F)$/i.test(g)) recordedFemale++;

    const rt = clean(r.visitRoute).toLowerCase().replace(/\s+/g, "");
    if (rt) {
      routeRecorded++;
      const isRef = /소개|지인|가족|추천/.test(rt);
      const isWalk = /간판|지나가|근처|동네|인근|거주|도보/.test(rt);
      if (isRef) routeReferral++;
      else if (isWalk) routeOrganicWalk++;
      else routeDigital++;

      if (!isReFirstRow) {
        pureFirstRouteRecorded++;
        if (isRef) pureFirstReferral++;
        else if (isWalk) pureFirstWalkIn++;
        else pureFirstDigital++;
      }
    }

    // 입력 질환별 자동 분류 및 2·3회 내원 추적 (고정 질환 틀 없이 실제 입력된 질환명 그대로 집계)
    const detail = clean(r.treatmentDetail);
    const enteredDiseases = classifySymptomCategories(detail);
    if (enteredDiseases.length > 0) {
      const insStr = clean(r.insuranceType);
      for (const diseaseLabel of enteredDiseases) {
        const normKey = diseaseLabel.replace(/\s+/g, "").toLowerCase();
        if (!bodyPartStatsMap.has(normKey)) {
          const matchedHint = CLINICAL_BODY_PARTS.find((d) => d.match(diseaseLabel, insStr));
          const isConsultOnly =
            Boolean(matchedHint?.isConsultOnly) ||
            (/보약|다이어트|공진단|경옥고/.test(diseaseLabel) &&
              !/통증|염좌|디스크|협착|허리|목|어깨|무릎|발목|손목/.test(diseaseLabel));
          const dynamicDef: ClinicalBodyPartDef = {
            id: normKey,
            label: diseaseLabel,
            shortName: diseaseLabel.length > 6 ? `${diseaseLabel.slice(0, 6)}..` : diseaseLabel,
            isConsultOnly,
            match: () => true,
            dropoutReason:
              matchedHint?.dropoutReason ||
              `'${diseaseLabel}' 증상 환자가 1~2회차 초기 호전 후 자가 종결(조기 이탈)하여 재발로 이어지는 패턴입니다.`,
            prescriptionGuide:
              matchedHint?.prescriptionGuide ||
              `초진 당일 '${diseaseLabel}'의 회복 단계(1회 급성완화 → 2회 원인교정 → 3회 안정화)를 명확히 안내하고 2~4일 내 다음 예약을 확정하세요.`,
            scriptExample:
              matchedHint?.scriptExample ||
              `"${diseaseLabel} 증상은 겉통증이 줄어들 때 멈추면 금방 재발합니다. 최소 3회차까지 연속으로 잡아드려야 안전하게 마무리됩니다."`,
          };
          bodyPartStatsMap.set(normKey, { def: dynamicDef, patients: 0, second: 0, third: 0 });
        }
        const st = bodyPartStatsMap.get(normKey)!;
        st.patients++;
        if (has2) st.second++;
        if (has3) st.third++;
      }
    } else {
      unclassifiedBodyPartCount++;
    }

    // 비급여(실장) 판별
    const hasNonCovItem =
      clean(r.insuranceType) === "비급여" ||
      Boolean(clean(r.nonCoveredList)) ||
      extractPositiveCount(r.nonCoveredCount) > 0 ||
      isAffirmative(r.immediatePaymentCount) ||
      Boolean(clean(r.herbalMonthlySummary)) ||
      extractPositiveCount(r.packageCount) > 0 ||
      isAffirmative(r.delayedPaymentWithinMonth) ||
      /약침|봉침|추나|한약|첩약|비급여|공진단|경옥고|다이어트/.test(detail);

    if (hasNonCovItem) nonCovPatientCount++;
    if (isAffirmative(r.immediatePaymentCount)) immediatePayPatients++;
    if (isAffirmative(r.delayedPaymentWithinMonth)) delayedPayPatients++;

    const isHerbal =
      Boolean(clean(r.herbalMonthlySummary)) ||
      isAffirmative(r.herbalFollowupPayment) ||
      /한약|첩약|보약|녹용|다이어트한약/.test(detail) ||
      /한약|보약|녹용|다이어트/.test(clean(r.nonCoveredList));
    if (isHerbal) herbalPatients++;
    if (isAffirmative(r.herbalFollowupPayment)) herbalFollowupYes++;

    const isPkg =
      extractPositiveCount(r.packageCount) > 0 ||
      isAffirmative(r.packageRenewal) ||
      /패키지/.test(clean(r.nonCoveredList));
    if (isPkg) packagePatients++;
    if (isAffirmative(r.packageRenewal)) packageRenewYes++;
  }

  const unrecordedGender = Math.max(0, totalPatients - recordedMale - recordedFemale);
  const effectiveMale =
    genderOverride?.male !== undefined && genderOverride?.male !== null
      ? Math.max(0, genderOverride.male)
      : recordedMale;
  const effectiveFemale =
    genderOverride?.female !== undefined && genderOverride?.female !== null
      ? Math.max(0, genderOverride.female)
      : recordedFemale;

  const pct = (n: number, d: number) => (d > 0 ? Number(((n / d) * 100).toFixed(1)) : 0);
  const neededCount = (cur: number, den: number, targetPct: number) =>
    Math.max(0, Math.ceil((den * targetPct) / 100 - cur));

  // =========================================================================
  // TRACK 1: 보험 (원장) — 내원경로까지 9대 핵심 지표 (3x3 밸런스 그리드)
  // [매출 증대 공식: 오직 통제 가능한 2차(80%)·3차(70%) 부족 인원 × 입력한 보험 1회 객단가(본부금+공단청구)]
  // =========================================================================
  const todayISO = new Date().toISOString().slice(0, 10);
  const recentUnder7DaysCount = rows.filter((r) => {
    const d = daysBetweenISO(r.firstVisitISO || r.visitDateISO, todayISO);
    return d !== null && d < 7 && !clean(r.thirdVisitDate);
  }).length;

  const under65Count = Math.max(0, knownAge - senior65);
  const under65Rate = knownAge > 0 ? pct(under65Count, knownAge) : 0;
  const seniorRate = knownAge > 0 ? pct(senior65, knownAge) : 0;
  const pureFirstSeniorRate = pureFirstKnownAge > 0 ? pct(pureFirstSenior65, pureFirstKnownAge) : 0;
  const reFirstSeniorRate = reFirstKnownAge > 0 ? pct(reFirstSenior65, reFirstKnownAge) : 0;
  const regSenior = demographic.seniorRatio || 22.2;
  const gdi = regSenior > 0 && knownAge > 0 ? Number((seniorRate / regSenior).toFixed(2)) : 0;
  // 어느 상권이든 경영 건강도 절대선 고정: 65세↑ 20% 이하 정상 / 20.1~30% 주의 / 30% 초과 미달
  const ageHealthyCap = 20;
  const ageWarningCap = 30;
  const age65Status: RiskLevel =
    knownAge === 0
      ? "EMPTY"
      : seniorRate <= ageHealthyCap
      ? "HEALTHY"
      : seniorRate <= ageWarningCap
      ? "WARNING"
      : "CRITICAL";
  const targetUnder65 = 80;
  const needUnder65 = knownAge > 0 ? neededCount(under65Count, knownAge, targetUnder65) : 0;

  // 보험 1회 평균 객단가 (비급여 제외 · 본부금 + 공단청구 / 원장님 직접 입력 우선, 미입력 시 기본 3.8만원)
  const isCustomFee =
    typeof customInsuranceFeeManwon === "number" &&
    !isNaN(customInsuranceFeeManwon) &&
    customInsuranceFeeManwon > 0;
  const avgVisitFeeManwon = isCustomFee
    ? Number(customInsuranceFeeManwon.toFixed(2))
    : DEFAULT_INSURANCE_AVG_FEE_MANWON;
  const avgFeeStr = Number(avgVisitFeeManwon.toFixed(2)).toString();

  const feeBasis: FeeBasisSummary = {
    insuranceAvgFeeManwon: avgVisitFeeManwon,
    isCustomInput: isCustomFee,
    under65FeeManwon: avgVisitFeeManwon,
    senior65FeeManwon: avgVisitFeeManwon,
    avgVisitFeeManwon,
    under65Count,
    senior65Count: senior65,
    knownAgeCount: knownAge,
    isDefaultRatioUsed: !isCustomFee,
  };

  const rate2nd = pct(secondCount, safeTotal);
  const target2nd = 80;
  const need2nd = totalPatients === 0 ? 0 : neededCount(secondCount, totalPatients, target2nd);
  // 2차 재내원: 2회차 방문 진료비 1회분 (3차 방문비와 날짜·결제가 별개이므로 중복 0%)
  const gain2ndManwon = totalPatients === 0 ? 0 : Math.round(need2nd * 1 * avgVisitFeeManwon);

  const rate3rd = pct(thirdCount, safeTotal);
  const target3rd = 70;
  const need3rd = totalPatients === 0 ? 0 : neededCount(thirdCount, totalPatients, target3rd);
  // 3차 정착률: 3회차 방문 진료비 1회분 (2차와 합산 시 실제 늘어나는 총 내원횟수와 수학적으로 정확히 일치)
  const gain3rdManwon = totalPatients === 0 ? 0 : Math.round(need3rd * 1 * avgVisitFeeManwon);

  // 진료부위별 삼진율(3회 내원율) 정밀 산출 (최소 표본수 N>=5 가드 적용)
  const bodyPartRetention: BodyPartRetentionItem[] = Array.from(bodyPartStatsMap.values())
    .filter((st) => st.patients > 0)
    .map((st) => {
      const sRate = pct(st.second, st.patients);
      const tRate = pct(st.third, st.patients);
      const need70 = neededCount(st.third, st.patients, 70);
      const isLowSample = st.patients < MIN_BODYPART_SAMPLE;
      const status: RiskLevel =
        isLowSample || st.def.isConsultOnly
          ? "EMPTY"
          : tRate >= 70
          ? "HEALTHY"
          : tRate >= 50
          ? "WARNING"
          : "CRITICAL";

      return {
        id: st.def.id,
        label: st.def.label,
        shortName: st.def.shortName,
        patients: st.patients,
        sharePct: pct(st.patients, safeTotal),
        secondCount: st.second,
        thirdCount: st.third,
        secondRate: sRate,
        thirdRate: tRate,
        targetRate: 70,
        neededFor70: need70,
        isConsultOnly: st.def.isConsultOnly,
        status,
        dropoutReason: st.def.dropoutReason,
        prescriptionGuide: st.def.prescriptionGuide,
        scriptExample: st.def.scriptExample,
      };
    })
    .sort((a, b) => b.patients - a.patients || b.thirdRate - a.thirdRate);

  // 대표 강점/보완 부위 선정 (최소 5명 이상 누적된 부위만 정식 판정하여 소표본 왜곡 원천 차단)
  const clinicalBodyParts = bodyPartRetention.filter((p) => !p.isConsultOnly);
  const qualifiedParts = clinicalBodyParts.filter((p) => p.patients >= MIN_BODYPART_SAMPLE);
  const qualifiedSortedBest = [...qualifiedParts].sort(
    (a, b) => b.thirdRate - a.thirdRate || b.patients - a.patients
  );

  const bestBodyPart = qualifiedSortedBest[0] || null;
  const weakestBodyPart =
    qualifiedParts.length > 0
      ? [...qualifiedParts].sort((a, b) => a.thirdRate - b.thirdRate || b.patients - a.patients)[0]
      : null;
  const healthyBodyPartCount = qualifiedParts.filter((p) => p.thirdRate >= 70).length;

  const bodyPartCardStatus: RiskLevel =
    totalPatients === 0 || !weakestBodyPart
      ? "EMPTY"
      : weakestBodyPart.thirdRate >= 70
      ? "HEALTHY"
      : weakestBodyPart.thirdRate >= 50
      ? "WARNING"
      : "CRITICAL";

  // 방문 간격(골든타임): 첫 주 매일 내원 → 둘째 주부터 주 3회 지속 프로토콜 기준 (휴진일 감안 중간값 2일 이내 합격)
  const GOLDEN_INTERVAL_TARGET_DAYS = 2.0;
  const sortedIntervals = [...intervals].sort((a, b) => a - b);
  const medianInterval =
    sortedIntervals.length > 0
      ? sortedIntervals.length % 2 === 1
        ? sortedIntervals[Math.floor(sortedIntervals.length / 2)]
        : Number(
            (
              (sortedIntervals[sortedIntervals.length / 2 - 1] +
                sortedIntervals[sortedIntervals.length / 2]) /
              2
            ).toFixed(1)
          )
      : 0;
  const avgInterval =
    intervals.length > 0
      ? Number((intervals.reduce((a, b) => a + b, 0) / intervals.length).toFixed(1))
      : 0;
  const intervalStatus: RiskLevel =
    intervals.length === 0
      ? "EMPTY"
      : medianInterval <= GOLDEN_INTERVAL_TARGET_DAYS
      ? "HEALTHY"
      : medianInterval <= 4.0
      ? "WARNING"
      : "CRITICAL";

  const resvDenom = resvYes + resvNo > 0 ? resvYes + resvNo : safeTotal;
  const resvRate = pct(resvYes, resvDenom);
  const targetResv = 85;
  const needResv = totalPatients === 0 ? 0 : neededCount(resvYes, resvDenom, targetResv);
  const resvLiftYes = pct(resvYes2nd, resvYes);
  const resvLiftNo = pct(resvNo2nd, resvNo);

  const pureFirstRate = totalPatients > 0 ? pct(pureFirst, safeTotal) : 0;
  const reFirstRate = totalPatients > 0 ? pct(reFirst, safeTotal) : 0;
  const needReFirst =
    totalPatients === 0 || !clinicStage
      ? 0
      : neededCount(reFirst, totalPatients, clinicStage.reFirstMin);
  const reFirstOverPct =
    clinicStage && reFirstRate > clinicStage.reFirstMax
      ? Number((reFirstRate - clinicStage.reFirstMax).toFixed(1))
      : 0;
  // 재초진·65세 비율은 시점 예측 불가 / 대체 가정 오류 방지를 위해 확정 기대매출 합산에서 제외 (0원)
  const gainReFirstManwon = 0;
  const gainAge65Manwon = 0;

  let reFirstStatus: RiskLevel = "EMPTY";
  let reFirstGapDisplay = "연차 미입력";
  let reFirstConclusion = "개원 연도를 입력해야 연차별 비율이 계산됩니다";
  if (clinicStage) {
    if (totalPatients === 0) {
      reFirstStatus = "EMPTY";
      reFirstGapDisplay = "데이터 대기";
      reFirstConclusion = "초진/재초진 구분을 확인하세요";
    } else if (reFirstRate >= clinicStage.reFirstMin && reFirstRate <= clinicStage.reFirstMax) {
      reFirstStatus = "HEALTHY";
      reFirstGapDisplay = `균형 달성 (초진 ${pureFirstRate}%)`;
      reFirstConclusion =
        clinicStage.stage === "YEAR_1"
          ? "1년차 초기 신규·구환 균형 양호"
          : clinicStage.stage === "YEAR_2_3"
          ? "성장기 초진·재초진 황금 균형"
          : "안정기 구환 복귀·신규 유입 균형 우수";
    } else if (reFirstRate < clinicStage.reFirstMin) {
      const isCriticalLow =
        clinicStage.reFirstCriticalLow !== null && reFirstRate < clinicStage.reFirstCriticalLow;
      reFirstStatus = isCriticalLow ? "CRITICAL" : "WARNING";
      reFirstGapDisplay =
        clinicStage.stage === "YEAR_1"
          ? `재초진 ${needReFirst}명 보강`
          : `재초진 ${needReFirst}명 부족`;
      reFirstConclusion =
        clinicStage.stage === "YEAR_1"
          ? "초기 구환 축적 중 · 3회 정착 집중"
          : clinicStage.stage === "YEAR_2_3"
          ? isCriticalLow
            ? "구환 이탈 주의 · 계절·안부 리콜 시급"
            : `구환 리콜 필요 (+${needReFirst}명)`
          : isCriticalLow
          ? "구환 이탈 점검 시급 · 진료·리콜 재정비"
          : `구환 이탈 점검 (+${needReFirst}명 목표)`;
    } else {
      // 상한선 초과: 신규 유입 고갈(고인 물) 양방향 경고
      reFirstStatus = "WARNING";
      reFirstGapDisplay = `상한 +${reFirstOverPct}%p 초과 (초진 ${pureFirstRate}%)`;
      reFirstConclusion =
        clinicStage.stage === "YEAR_1"
          ? "신규 홍보 부족 주의 · 초진 유입 확대"
          : clinicStage.stage === "YEAR_2_3"
          ? "신규 유입 보강 주의 · 외부 홍보 점검"
          : "신규 유입 고갈 주의! 초진 30%↑ 방어";
    }
  }

  const genderSum = effectiveMale + effectiveFemale;
  const femaleRate = genderSum > 0 ? pct(effectiveFemale, genderSum) : 0;
  const genderStatus: RiskLevel =
    genderSum === 0
      ? "EMPTY"
      : femaleRate >= 52 && femaleRate <= 70
      ? "HEALTHY"
      : femaleRate >= 45 && femaleRate <= 78
      ? "WARNING"
      : "CRITICAL";

  // 정답 방식 ①: 순수초진(생애 첫 방문자) 분리형 [소개 70% : 외부 신규창출(광고·간판·검색·블로그) 30%]
  const pureRouteDenom = pureFirstRouteRecorded > 0 ? pureFirstRouteRecorded : Math.max(1, pureFirst);
  const referralRate = pureFirst > 0 ? pct(pureFirstReferral, pureRouteDenom) : 0;
  const externalSeedCount = pureFirstWalkIn + pureFirstDigital;
  const externalSeedRate = pureFirstRouteRecorded > 0 ? pct(externalSeedCount, pureFirstRouteRecorded) : 0;
  const targetReferral = 70;
  const needReferral = pureFirst > 0 ? neededCount(pureFirstReferral, pureRouteDenom, targetReferral) : 0;
  const monthSet = new Set<string>();
  for (const r of rows) {
    const mIso = clean(r.visitDateISO || r.firstVisitISO);
    if (mIso.length >= 7) monthSet.add(mIso.slice(0, 7));
  }
  const activeMonthSpan = Math.max(1, monthSet.size);
  const monthlyPureFirst = pureFirst / activeMonthSpan;

  const mpi =
    demographic.totalPopulation > 0
      ? Number(((monthlyPureFirst / demographic.totalPopulation) * 1000).toFixed(2))
      : 0;

  let referralStatus: RiskLevel = "EMPTY";
  let referralGapDisplay = "연차 미입력";
  let referralConclusion = "개원 연도를 입력해야 연차별 소개율이 판정됩니다";

  if (clinicStage && clinicYearsActive !== null) {
    if (totalPatients === 0) {
      referralStatus = "EMPTY";
      referralGapDisplay = "데이터 대기";
      referralConclusion = "접수 시 내원경로 단축키 필수 체크";
    } else if (pureFirstRouteRecorded === 0) {
      referralStatus = "WARNING";
      referralGapDisplay = "경로 체크 필요";
      referralConclusion = "접수 시 내원경로 단축키 필수 체크";
    } else if (referralRate > 85 && mpi < district.mpiMin) {
      referralStatus = "WARNING";
      referralGapDisplay = "외부 신규창출 보강";
      referralConclusion = "광고·검색 투자로 30% 신규환자 창출";
    } else if (referralRate >= targetReferral) {
      referralStatus = "HEALTHY";
      referralGapDisplay = clinicStage.referralSoftened
        ? `7:3 조기 달성 (+${(referralRate - targetReferral).toFixed(1)}%p)`
        : `7:3 달성 (+${(referralRate - targetReferral).toFixed(1)}%p)`;
      referralConclusion = clinicStage.referralSoftened
        ? "개원 초기부터 소개 70%↑ 최상위 진료력"
        : "소개 70% : 신규창출 30% 황금구조";
    } else if (clinicStage.referralSoftened) {
      // 1~2년차: 목표는 70% 고정이되 초기 단골 축적기이므로 미달 대신 주의로 완화
      referralStatus = "WARNING";
      referralGapDisplay = `소개 ${needReferral}명 부족 (${clinicYearsActive}년차 완화)`;
      referralConclusion = "초기 단골 축적 중 (목표 70%)";
    } else if (referralRate >= 40) {
      referralStatus = "WARNING";
      referralGapDisplay = `소개 ${needReferral}명 부족`;
      referralConclusion = `만족·소개 축적 중 (+${needReferral}명 목표)`;
    } else {
      referralStatus = "CRITICAL";
      referralGapDisplay = `소개 ${needReferral}명 부족`;
      referralConclusion = "소개율 40% 미만 · 진료 만족·신뢰 점검 시급";
    }
  }

  // --- 실시간 마이너스 매출(직접 누수) & 교차 원인 진단 헬퍼 ---
  const formatCashLossMain = (manwon: number): string => {
    if (manwon <= 0) return "누수 0원";
    if (activeMonthSpan <= 1) return `-월 ${manwon.toLocaleString()}만 원`;
    return `누적 -${manwon.toLocaleString()}만 원`;
  };
  const formatCashLossSub = (manwon: number, safeLabel: string): string => {
    if (manwon <= 0) return `(${safeLabel})`;
    if (activeMonthSpan <= 1) return `(연 -${(manwon * 12).toLocaleString()}만 원)`;
    const monthlyAvg = Math.round(manwon / activeMonthSpan);
    return `(월평균 -${monthlyAvg.toLocaleString()}만 원)`;
  };
  const totalRetentionLossManwon = gain2ndManwon + gain3rdManwon;
  const drop2to3Count = Math.max(0, secondCount - thirdCount);
  const resvLiftGap =
    resvYes > 0 && resvNo > 0 ? Number(Math.max(0, resvLiftYes - resvLiftNo).toFixed(1)) : 0;
  const estSeniorBedShare = Math.min(85, Math.round(seniorRate * 2));
  const maleRate = genderSum > 0 ? Number((100 - femaleRate).toFixed(1)) : 0;

  // [지표 1] 2차 재내원율 — 큰 마이너스 금액 + 1문장 리스크 + 상황별 실전 멘트
  const secondModal: IndicatorModalDetail = (() => {
    const benchmarkReason =
      "초진 10명 중 타지역 방문·단순 1회성 경증(약 2명, 20%)을 제외한 유효 치료 대상군 8명(80%↑)은 반드시 2회차 반응 확인으로 연결되어야 3차 정착률 70% 달성이 수학적으로 성립합니다 (Musculoskeletal Science & Practice 외래 미재방문 연구 근거).";
    const exactCounts = `전체 신환 ${totalPatients}명 중 2회 내원 ${secondCount}명 (${rate2nd}%)`;
    const formulaNote =
      need2nd > 0
        ? `${need2nd}명 부족 × 1회(2회차 방문비) × 보험 객단가 ${avgFeeStr}만 원`
        : "목표 달성 완료";

    if (totalPatients === 0) {
      return {
        exactCounts,
        benchmarkReason,
        riskTitle: "2. 기준 미달 시 경영 리스크",
        riskLossBadge: "데이터 대기",
        riskLossTone: "warn",
        riskWarning: "환자 시트를 업로드하면 1회 이탈로 발생하는 실시간 마이너스 매출을 자동 산출합니다.",
        actionTitle: "3. 실전 멘트",
        actionInstruction: "초진 시트를 업로드한 뒤 '첫 주 매일 내원 → 둘째 주부터 주 3회 지속' 기준에 맞춰 초진 당일 2회차 예약 확정 현황을 점검하세요.",
        scriptExample:
          "\"오늘 첫 침·약침으로 급성 긴장을 풀었습니다. 효과를 이어가려면 첫 주는 매일 내원하시고 둘째 주부터 주 3회로 지속할게요. 내일 바로 오셔서 2단계 치료 이어가겠습니다.\"",
        revenueImpactManwon: gain2ndManwon,
        formulaNote,
      };
    }

    if (rate2nd >= target2nd) {
      return {
        exactCounts,
        benchmarkReason,
        riskTitle: "2. 현재 강점 및 손실 방어 현황",
        riskLossBadge: "누수 0원",
        riskLossSub: "(목표 80% 방어 완료)",
        riskLossTone: "safe",
        riskWarning: `현재 2차 재내원율 ${rate2nd}%로 목표(80%)를 넘어 초진 1회 이탈 손실을 완벽히 방어하고 있습니다.`,
        actionTitle: "3. 실전 멘트 — 강점 유지 · 3차 연결",
        actionInstruction:
          rate3rd < target3rd
            ? `2차 안착(${rate2nd}%)은 매우 우수하므로 이제 2회차 환자가 3회 완주(현재 ${rate3rd}%)로 이어지도록 안정화 설명을 강화하세요.`
            : `2차(${rate2nd}%)와 3차(${rate3rd}%) 모두 최상위 수준이므로 근골격 환자의 추나·급여첩약 연계로 객단가를 확장하세요.`,
        scriptExample:
          "\"지난번 치료 반응이 아주 좋습니다. 오늘 2단계 교정까지 잘 잡혔으니, 다음 3회차에 재발 방지 마무리까지 확실히 잡아드리겠습니다.\"",
        revenueImpactManwon: gain2ndManwon,
        formulaNote,
      };
    }

    const isDeskResvCause = resvNo > 0 && resvRate < targetResv;
    const isIntervalCause = intervals.length > 0 && medianInterval > GOLDEN_INTERVAL_TARGET_DAYS;
    const isNoShowCause = resvYes > 0 && resvRate >= targetResv;

    if (isDeskResvCause) {
      return {
        exactCounts,
        benchmarkReason,
        riskTitle: "2. 기준 미달 시 경영 리스크 (실시간 누수 매출)",
        riskLossBadge: formatCashLossMain(gain2ndManwon),
        riskLossSub: formatCashLossSub(gain2ndManwon, "방어 완료"),
        riskLossTone: "loss",
        riskWarning: `목표 대비 ${need2nd}명이 1회 후 이탈했으며, 특히 미예약자 ${resvNo}명의 2차율이 ${resvLiftNo}%에 그쳐 데스크 예약 누락이 핵심 원인입니다.`,
        actionTitle: "3. 실전 멘트 — 데스크 예약 누락 차단",
        actionInstruction: `예약 확정률(${resvRate}%)을 높이기 위해 원장님이 '첫 주 매일 내원 · 둘째 주부터 주 3회' 주기를 지정하고 데스크는 내일 시간대 양자택일로 즉시 예약표를 잡으세요.`,
        scriptExample:
          "\"초기 집중 회복을 위해 첫 주는 매일 내원하시고 둘째 주부터는 주 3회로 지속할게요. 데스크에서 내일 오전 11시와 오후 3시 중 편한 시간으로 바로 예약하고 가세요.\"",
        revenueImpactManwon: gain2ndManwon,
        formulaNote,
      };
    }

    if (isIntervalCause) {
      return {
        exactCounts,
        benchmarkReason,
        riskTitle: "2. 기준 미달 시 경영 리스크 (실시간 누수 매출)",
        riskLossBadge: formatCashLossMain(gain2ndManwon),
        riskLossSub: formatCashLossSub(gain2ndManwon, "방어 완료"),
        riskLossTone: "loss",
        riskWarning: `목표 대비 ${need2nd}명이 1회 후 이탈했으며, 초진→2차 간격이 중간값 ${medianInterval}일로 벌어져 초기 집중 치료 동기가 식은 상태입니다.`,
        actionTitle: "3. 실전 멘트 — 첫 주 매일 내원(2일 이내) 정착",
        actionInstruction: `초진→2차 간격(현재 ${medianInterval}일)을 '첫 주 매일 내원 → 둘째 주부터 주 3회'(중간값 2일 이내)로 당겨 부족한 ${need2nd}명의 이탈을 차단하세요.`,
        scriptExample:
          "\"첫 치료 효과가 빠지기 전에 연속 자극이 들어가야 회복이 빠릅니다. 첫 주는 매일 내원하시고 둘째 주부터는 주 3회로 지속할게요. 내일 바로 오셔서 2단계 치료 이어가겠습니다.\"",
        revenueImpactManwon: gain2ndManwon,
        formulaNote,
      };
    }

    return {
      exactCounts,
      benchmarkReason,
      riskTitle: "2. 기준 미달 시 경영 리스크 (실시간 누수 매출)",
      riskLossBadge: formatCashLossMain(gain2ndManwon),
      riskLossSub: formatCashLossSub(gain2ndManwon, "방어 완료"),
      riskLossTone: "loss",
      riskWarning: isNoShowCause
        ? `예약 확정률(${resvRate}%)은 양호하나 목표 대비 ${need2nd}명이 실제 내원하지 않아 예약 후 노쇼·취소가 핵심 손실 원인입니다.`
        : `현재 2차 재내원율 ${rate2nd}%로 목표 대비 ${need2nd}명이 1회 시술 후 이탈하며 '밑 빠진 독' 누수가 발생하고 있습니다.`,
      actionTitle: isNoShowCause
        ? "3. 실전 멘트 — 예약 후 노쇼 방어"
        : "3. 실전 멘트 — 진료실 첫 주 매일 내원 선언",
      actionInstruction: isNoShowCause
        ? `예약 확정률(${resvRate}%) 대비 실제 내원이 낮으므로 초진 마지막 30초 '첫 주 매일 · 둘째 주 주 3회' 의학적 명분 고지와 예약 전날 알림톡 리마인드를 가동하세요.`
        : `초진 마지막 30초에 원장님이 '첫 주는 매일, 둘째 주부터는 주 3회' 치료 주기를 선언하고 내일(1~2일 내) 2차 내원일을 확정해 부족한 ${need2nd}명을 안착시키세요.`,
      scriptExample:
        "\"오늘 첫 침·약침으로 급성 긴장을 풀었습니다. 첫 주는 매일 오셔서 집중 치료하고 둘째 주부터는 주 3회로 지속해야 재발을 막을 수 있습니다. 내일 바로 뵙겠습니다.\"",
      revenueImpactManwon: gain2ndManwon,
      formulaNote,
    };
  })();

  // [지표 2] 3차 정착률 — 큰 마이너스 금액 + 1문장 리스크 + 상황별(취약질환 연동) 실전 멘트
  const thirdModal: IndicatorModalDetail = (() => {
    const benchmarkReason =
      "① 외래 재활·근골격 연구(Musculoskeletal Science & Practice)상 타지역·물리적 제약 및 단발성 자가호전 등 구조적 비대상군이 약 25~30%(10명 중 3명)이며, ② 보건복지부 한방의료이용실태조사상 내원객의 74% 이상인 근골격·만성질환군은 침 진통 반감기(24~72시간, Vickers et al. IPD 메타분석)와 치료동맹 형성(Horvath & Symonds)을 위해 나머지 7명(70%↑) 전원이 최소 3회 치료를 완주해야 합니다.";
    const exactCounts =
      recentUnder7DaysCount > 0
        ? `전체 신환 ${totalPatients}명 중 3회 완주 ${thirdCount}명 (${rate3rd}%) · ※ 최근 7일 이내 내원 진행중 ${recentUnder7DaysCount}명 포함`
        : `전체 신환 ${totalPatients}명 중 3회 이상 완주 ${thirdCount}명 (${rate3rd}%)`;
    const formulaNote =
      need3rd > 0
        ? `${need3rd}명 부족 × 1회(3회차 방문비, 2차와 중복 0%) × 보험 객단가 ${avgFeeStr}만 원`
        : "목표 달성 완료";

    if (totalPatients === 0) {
      return {
        exactCounts,
        benchmarkReason,
        riskTitle: "2. 기준 미달 시 경영 리스크",
        riskLossBadge: "데이터 대기",
        riskLossTone: "warn",
        riskWarning: "환자 시트를 업로드하면 3회 전 조기 중단으로 발생하는 실시간 마이너스 매출을 자동 산출합니다.",
        actionTitle: "3. 실전 멘트",
        actionInstruction: "초진 시트 업로드 후 2→3회차 이탈 구간과 취약 질환을 확인하세요.",
        scriptExample:
          "\"통증이 절반 줄었을 때 멈추면 금방 재발합니다. 최소 3회차까지는 속근육을 잡아드려야 안전하게 마무리됩니다.\"",
        revenueImpactManwon: gain3rdManwon,
        formulaNote,
      };
    }

    if (rate3rd >= target3rd) {
      return {
        exactCounts,
        benchmarkReason,
        riskTitle: "2. 현재 강점 및 손실 방어 현황",
        riskLossBadge: "누수 0원",
        riskLossSub: "(3회 완주 70% 방어 완료)",
        riskLossTone: "safe",
        riskWarning: `현재 3차 정착률 ${rate3rd}%로 10명 중 7명 이상이 3회 완주해 소개와 재초진이 쌓이는 최상위 구조입니다.`,
        actionTitle: "3. 실전 멘트 — 강점 유지 · 소개 확장",
        actionInstruction:
          "3회차 마무리 진료 시 호전 경과를 함께 확인하며 지인 소개 안내 및 추나·첩약 연계로 확장하세요.",
        scriptExample:
          "\"3회 집중 치료를 잘 따라와 주셔서 속근육까지 안정됐습니다. 앞으로 무리하실 때나 가족분들 불편하실 때도 언제든 편하게 찾아주세요.\"",
        revenueImpactManwon: gain3rdManwon,
        formulaNote,
      };
    }

    const hasWeakPart = Boolean(weakestBodyPart && weakestBodyPart.thirdRate < 70);
    const isSecondBlocked = rate2nd < 70;

    if (isSecondBlocked) {
      return {
        exactCounts,
        benchmarkReason,
        riskTitle: "2. 기준 미달 시 경영 리스크 (실시간 누수 매출)",
        riskLossBadge: formatCashLossMain(gain3rdManwon),
        riskLossSub: formatCashLossSub(gain3rdManwon, "방어 완료"),
        riskLossTone: "loss",
        riskWarning: `2차 재내원율(${rate2nd}%) 단계부터 누수가 시작돼 목표 대비 ${need3rd}명이 3회 완주에 도달하지 못하고 있습니다.`,
        actionTitle: "3. 실전 멘트 — 초진 3회 로드맵 선언",
        actionInstruction: `현재 2차 재내원율(${rate2nd}%) 교정이 1순위이므로 초진 첫날 3회 로드맵 고지와 2차 예약 확정을 먼저 고정하세요.`,
        scriptExample:
          "\"오늘 1회차는 급한 통증을 끄는 단계고, 2회차 교정과 3회차 안정화까지 세 번은 보셔야 재발 없이 끝납니다. 먼저 3일 뒤 2회차 예약부터 잡아드릴게요.\"",
        revenueImpactManwon: gain3rdManwon,
        formulaNote,
      };
    }

    return {
      exactCounts,
      benchmarkReason,
      riskTitle: "2. 기준 미달 시 경영 리스크 (실시간 누수 매출)",
      riskLossBadge: formatCashLossMain(gain3rdManwon),
      riskLossSub: formatCashLossSub(gain3rdManwon, "방어 완료"),
      riskLossTone: "loss",
      riskWarning: `2회차까지 온 ${secondCount}명 중 ${drop2to3Count}명이 통증 호전 후 조기 중단${
        hasWeakPart && weakestBodyPart
          ? `(특히 '${weakestBodyPart.label}' 삼진율 ${weakestBodyPart.thirdRate}%)`
          : ""
      }하며 3회차 매출이 새고 있습니다.`,
      actionTitle:
        hasWeakPart && weakestBodyPart
          ? `3. 실전 멘트 — 2회차 조기 중단 방어 (${weakestBodyPart.label})`
          : "3. 실전 멘트 — 2회차 조기 중단 방어",
      actionInstruction: `2회차 진료 시작 시 '지금 덜 아플 때가 재발을 막는 골든타임'임을 먼저 못 박아 부족한 ${need3rd}명을 3회 완주시키세요.`,
      scriptExample:
        hasWeakPart && weakestBodyPart
          ? weakestBodyPart.scriptExample
          : "\"통증이 절반 줄었을 때 멈추면 2주 안에 금방 재발합니다. 다음 3회차에 속근육·인대까지 안정화시켜야 안전하게 졸업하실 수 있습니다.\"",
      revenueImpactManwon: gain3rdManwon,
      formulaNote,
    };
  })();

  // [지표 3] 재내원 골든타임 — 첫 주 매일 내원 → 둘째 주부터 주 3회 지속 프로토콜 (초심플 VS 직관형)
  const intervalModal: IndicatorModalDetail = (() => {
    const benchmarkReason =
      "첫 주는 매일 치료해 염증을 빠르게 꺾고, 둘째 주부터 주 3회로 유지해야 회복과 재방문이 안정됩니다. 휴진일을 감안해 초진→2차 간격 중간값 2일 이내가 골든타임입니다.";
    const exactCounts =
      intervals.length > 0
        ? `2회 내원자 ${intervals.length}명의 1→2회 방문 간격 중간값 ${medianInterval}일 (평균 ${avgInterval}일)`
        : "아직 1회·2회 날짜가 모두 기입된 환자가 없습니다.";

    if (intervals.length === 0) {
      return {
        exactCounts,
        benchmarkReason,
        riskTitle: "2. 2회 방문일 집계 대기",
        riskLossBadge: "간격 데이터 대기",
        riskLossTone: "warn",
        riskWarning: "1회·2회 방문 날짜가 쌓이면 내원 간격 지연으로 인한 이탈 위험을 바로 진단합니다.",
        actionTitle: "3. 진료실·데스크 바로 쓰는 한 줄 멘트",
        actionInstruction: "초진 환자에게 '첫 주는 매일, 둘째 주부터 주 3회'를 안내하고 내일 2차 예약을 먼저 잡으세요.",
        avoidScript: "\"며칠 쉬다가 3~4일 뒤에 시간 될 때 오세요.\"",
        scriptExample:
          "\"첫 주는 매일 오셔야 빨리 잡히고, 둘째 주부터는 주 3회로 이어갑니다. 내일 오전 11시와 오후 3시 중 언제가 편하세요?\"",
        revenueImpactManwon: 0,
      };
    }

    if (medianInterval <= GOLDEN_INTERVAL_TARGET_DAYS) {
      return {
        exactCounts,
        benchmarkReason,
        riskTitle: "2. 현재 강점 및 이탈 방어 현황",
        riskLossBadge: "첫주 매일 내원 합격",
        riskLossSub: `(중간값 ${medianInterval}일 · 지연 손실 0원)`,
        riskLossTone: "safe",
        vsComparison: {
          leftLabel: "권장 기준 (첫주 매일)",
          leftValue: "2일 이내",
          leftSub: "첫 주 매일 → 2주차 주 3회",
          leftPct: 100,
          rightLabel: "우리 병원 현재",
          rightValue: `${medianInterval}일`,
          rightSub: "초기 집중 골든타임 안착",
          rightPct: 100,
          rightTone: "safe",
          highlightBadge: "골든타임 통과",
        },
        riskWarning: `초진 후 ${medianInterval}일 만에 바로 재방문하고 있어 초기 집중 리듬이 완벽합니다. 둘째 주부터 주 3회로 자연스럽게 이어가세요.`,
        actionTitle: "3. 진료실·데스크 바로 쓰는 한 줄 멘트",
        actionInstruction: `현재 리듬(${medianInterval}일)을 첫 주 내내 유지한 뒤, 둘째 주부터 주 3회로 이어가 3차 정착률을 70% 이상으로 고정하세요.`,
        scriptExample:
          "\"연이어 잘 오셔서 회복 속도가 아주 빠릅니다. 이번 첫 주는 매일 치료로 확실히 잡고, 둘째 주부터 주 3회로 편하게 이어갈게요.\"",
        revenueImpactManwon: 0,
      };
    }

    const delayDays = (medianInterval - GOLDEN_INTERVAL_TARGET_DAYS).toFixed(1);
    const isSevereDelay = medianInterval > 4.0;
    const currentBarPct = Math.max(
      14,
      Math.min(82, Math.round((GOLDEN_INTERVAL_TARGET_DAYS / Math.max(1, medianInterval)) * 100))
    );
    return {
      exactCounts,
      benchmarkReason,
      riskTitle: "2. 내원 간격이 벌어지면 환자가 이렇게 식습니다",
      riskLossBadge: `목표보다 +${delayDays}일 지연 내원`,
      riskLossSub:
        totalRetentionLossManwon > 0
          ? `(현재 ${medianInterval}일 · 2·3차 손실 -${totalRetentionLossManwon.toLocaleString()}만 원 연관)`
          : `(중간값 ${medianInterval}일 · 이탈위험 2.4배)`,
      riskLossTone: "loss",
      vsComparison: {
        leftLabel: "권장 기준 (첫주 매일)",
        leftValue: "2일 이내",
        leftSub: "첫 주 매일 → 둘째 주 주 3회",
        leftPct: 100,
        rightLabel: "우리 병원 현재",
        rightValue: `${medianInterval}일 뒤`,
        rightSub: isSevereDelay
          ? "효과가 다 빠져 처음부터 다시 시작"
          : `기준보다 +${delayDays}일 벌어져 이탈 위험↑`,
        rightPct: currentBarPct,
        rightTone: "danger",
        highlightBadge: `+${delayDays}일 지연`,
      },
      riskWarning: `초진 후 ${medianInterval}일 뒤에야 다시 오고 있습니다. 간격이 벌어지면 통증이 다시 올라와 치료 의지가 식고 그대로 이탈합니다.`,
      actionTitle: "3. 진료실·데스크 바로 쓰는 한 줄 멘트",
      actionInstruction: `현재 간격(${medianInterval}일)을 '첫 주 매일 · 둘째 주 주 3회'(2일 이내)로 당기기 위해 수납 시 내일 두 시간대를 먼저 제시하세요.`,
      avoidScript: isSevereDelay
        ? "\"며칠 지켜보시다가 다음 주에 한 번 더 오세요.\""
        : "\"3~4일 뒤에 시간 되실 때 한 번 더 들르세요.\"",
      scriptExample:
        "\"첫 주는 매일 오셔야 염증이 빨리 잡히고, 둘째 주부터는 주 3회로 지속할게요. 내일 오전 11시와 오후 3시 중 언제가 편하세요?\"",
      revenueImpactManwon: 0,
    };
  })();

  // [지표 4] 다음 예약 확정률 — 직관적 예약 O/X 비교 + 증발 인원 경고 + ❌/⭕ 초심플 멘트
  const reservationModal: IndicatorModalDetail = (() => {
    const benchmarkReason =
      "환자는 병원을 나서는 순간 바쁜 일상에 치여 재방문을 미룹니다. 수납할 때 다음 예약 시간만 바로 잡아도 재방문율이 평균 2~3배 뛰어오릅니다.";
    const exactCounts = `예약 O ${resvYes}명 (재방문 ${resvLiftYes}%) vs 예약 X ${resvNo}명 (재방문 ${resvLiftNo}%)`;

    const resvNoLost = Math.max(0, resvNo - resvNo2nd);
    const hasBothGroups = resvYes > 0 && resvNo > 0;
    const liftRatio =
      hasBothGroups && resvLiftNo > 0
        ? Number((resvLiftYes / resvLiftNo).toFixed(1))
        : 0;
    const yesOutOf10 = Math.round(resvLiftYes / 10);
    const noLostOutOf10 = Math.max(0, 10 - Math.round(resvLiftNo / 10));

    const buildResvComparison = (isSafe: boolean): ModalVsComparison | undefined => {
      if (!hasBothGroups) return undefined;
      return {
        leftLabel: "예약 잡고 귀가",
        leftValue: `${resvLiftYes}%`,
        leftSub: `${resvYes}명 중 ${resvYes2nd}명 재방문 (10명 중 ${yesOutOf10}명)`,
        leftPct: Math.min(100, Math.max(6, resvLiftYes)),
        rightLabel: "예약 없이 귀가",
        rightValue: `${resvLiftNo}%`,
        rightSub:
          resvNoLost > 0
            ? `${resvNo}명 중 ${resvNoLost}명 사라짐 (10명 중 ${noLostOutOf10}명 이탈)`
            : `${resvNo}명 중 ${resvNo2nd}명 재방문`,
        rightPct: Math.min(100, Math.max(6, resvLiftNo)),
        rightTone: isSafe && resvLiftNo >= 70 ? "safe" : "danger",
        highlightBadge:
          liftRatio >= 1.2
            ? `재방문 ${liftRatio}배 추락`
            : resvLiftNo === 0 && resvLiftYes > 0
            ? "미예약 전원 증발"
            : resvLiftGap > 0
            ? `-${resvLiftGap.toFixed(1)}%p 추락`
            : undefined,
      };
    };

    if (totalPatients === 0) {
      return {
        exactCounts,
        benchmarkReason,
        riskTitle: "2. 예약 데이터 집계 대기",
        riskLossBadge: "예약 유/무 대기",
        riskLossTone: "warn",
        riskWarning: "시트에 예약 유/무가 쌓이면 예약 없이 귀가한 환자가 얼마나 사라지는지 바로 보여줍니다.",
        actionTitle: "3. 데스크 바로 쓰는 한 줄 멘트",
        actionInstruction: "수납 시 예약 유/무를 빠짐없이 기록하고, 내일 오전/오후 둘 중 하나를 고르게 하세요.",
        avoidScript: "\"다음에 시간 되실 때 예약하고 오세요~\" / \"예약 잡아드릴까요?\"",
        scriptExample:
          "\"원장님께서 첫 주는 매일 오셔야 빨리 낫는다고 하셨어요. 내일 오전 11시와 오후 3시 중 언제가 편하세요?\"",
        revenueImpactManwon: 0,
      };
    }

    if (resvRate >= targetResv) {
      const isNoShowIssue = rate2nd < target2nd;
      return {
        exactCounts,
        benchmarkReason,
        riskTitle: isNoShowIssue ? "2. 예약은 잘 잡았는데 노쇼가 많습니다" : "2. 예약이 환자 이탈을 막아주고 있습니다",
        riskLossBadge: isNoShowIssue ? `예약 후 미방문 주의 (2차율 ${rate2nd}%)` : `예약 확정률 ${resvRate}% 합격`,
        riskLossSub: isNoShowIssue ? `(예약률 ${resvRate}% · 전날 알림톡 필수)` : `(목표 ${targetResv}% 방어 완료)`,
        riskLossTone: isNoShowIssue ? "warn" : "safe",
        vsComparison: buildResvComparison(!isNoShowIssue),
        riskWarning: isNoShowIssue
          ? `예약은 ${resvRate}%로 잘 잡았지만 실제 2차 내원이 ${rate2nd}%에 그쳤습니다. 예약 전날 리마인드 톡으로 노쇼만 막아도 바로 회복됩니다.`
          : `환자 10명 중 ${Math.round(resvRate / 10)}명이 다음 시간을 확정하고 귀가해 이탈 손실을 탄탄하게 막고 있습니다.`,
        actionTitle: isNoShowIssue
          ? "3. 노쇼 막는 바로 쓰는 한 줄 멘트"
          : "3. 2회→3회 연속 예약 한 줄 멘트",
        actionInstruction: isNoShowIssue
          ? "예약 전날 확인 알림톡 발송과 진료실에서의 '첫 주 매일 · 둘째 주 주 3회' 이유 설명을 보강하세요."
          : "초진 수납 예약 루틴을 2회차 수납 시에도 그대로 이어가 첫 주 매일 내원과 둘째 주 주 3회까지 안착시키세요.",
        avoidScript: isNoShowIssue
          ? "\"예약해 드렸으니 잊지 말고 오세요~\" (확인 안내 없이 종료)"
          : "\"다음 예약은 어떻게 하실래요?\"",
        scriptExample: isNoShowIssue
          ? "\"내일 오후 3시 예약 전에 확인 톡 보내드릴게요. 혹시 시간 바뀌시면 미리 톡 주시면 바로 맞춰드릴게요.\""
          : "\"오늘 2회차 잘 받으셨어요. 첫 주 매일 일정에 맞춰 내일 오전 11시와 오후 3시 중 편한 시간으로 바로 잡아드릴까요?\"",
        revenueImpactManwon: 0,
      };
    }

    const headlineBadge =
      resvNo > 0 && resvNoLost > 0
        ? `미예약 ${resvNo}명 중 ${resvNoLost}명 증발`
        : `미예약 ${resvNo}명 이탈 위험`;

    const headlineSub =
      liftRatio >= 1.2
        ? `(재방문율 ${liftRatio}배 추락${
            totalRetentionLossManwon > 0
              ? ` · 2·3차 손실 -${totalRetentionLossManwon.toLocaleString()}만 원 연관`
              : ""
          })`
        : resvNo > 0 && resvLiftNo === 0 && resvLiftYes > 0
        ? `(미예약자 재방문 0%${
            totalRetentionLossManwon > 0
              ? ` · 2·3차 손실 -${totalRetentionLossManwon.toLocaleString()}만 원 연관`
              : ""
          })`
        : `(예약 확정률 ${resvRate}% / 목표 ${targetResv}%)`;

    const simpleWarning =
      hasBothGroups && liftRatio >= 1.2
        ? `예약을 잡느냐 안 잡느냐만으로 재방문이 ${liftRatio}배 차이 납니다. 예약 없이 보낸 ${resvNo}명 중 ${resvNoLost}명이 그대로 사라졌습니다.`
        : resvNo > 0 && resvNoLost > 0
        ? `예약 없이 귀가한 ${resvNo}명 중 ${resvNoLost}명이 다시 안 왔습니다. 수납할 때 시간만 먼저 잡아도 대부분 돌아옵니다.`
        : `예약을 안 잡고 귀가하면 일상에 치여 재방문을 잊습니다. 데스크에서 내일 시간부터 바로 잡아야 합니다.`;

    return {
      exactCounts,
      benchmarkReason,
      riskTitle: "2. 예약 안 잡으면 환자가 이렇게 사라집니다",
      riskLossBadge: headlineBadge,
      riskLossSub: headlineSub,
      riskLossTone: "loss",
      vsComparison: buildResvComparison(false),
      riskWarning: simpleWarning,
      actionTitle: "3. 데스크 바로 쓰는 한 줄 멘트",
      actionInstruction: `미예약 ${resvNo}명 이탈을 막기 위해 '예약하실래요?' 질문을 금지하고, 내일 오전/오후 둘 중 하나를 고르게 하세요.`,
      avoidScript: "\"다음에 시간 되실 때 예약하고 오세요~\" / \"예약 잡아드릴까요?\"",
      scriptExample:
        "\"원장님께서 첫 주는 매일 오셔야 빨리 낫는다고 하셨어요. 내일 오전 11시와 오후 3시 중 언제가 편하세요?\"",
      revenueImpactManwon: 0,
    };
  })();

  // [지표 5] 초진 · 재초진 비율 — 체감 위험 수치 크게 + 1문장 + 실전 멘트
  const reFirstModal: IndicatorModalDetail = (() => {
    const benchmarkReason = !clinicStage
      ? "개원 연차에 따라 건강한 초진:재초진 황금 비율이 완전히 다릅니다. 상단에서 개원 연도(예: 2020)를 입력하면 연차가 자동 계산되어 [1년 차 재초진 10~35% / 2~3년 차 30~50% / 4년 차↑ 45~70%] 양방향 기준이 즉시 적용됩니다."
      : `연차별 경영 건강도 기준 — [1년 차] 재초진 10~35%(초진 65~90%) · [2~3년 차] 재초진 30~50%(초진 50~70%) · [4년 차 이상] 재초진 45~70%(초진 30~55%). 현재 ${clinicYearsActive}년 차 기준 정상 구간은 재초진 ${clinicStage.reFirstMin}~${clinicStage.reFirstMax}% (초진 ${clinicStage.pureFirstMin}~${clinicStage.pureFirstMax}%)입니다.`;
    const exactCounts = !clinicStage
      ? `개원 연도 미입력으로 계산 불가 (현재 데이터: 전체 ${totalPatients}명 = 순수초진 ${pureFirst}명 + 재초진 ${reFirst}명)`
      : `${clinicOpenYear}년 개원 (${clinicYearsActive}년 차 · ${clinicStage.stageLabel}) | 전체 ${totalPatients}명 중 재초진 ${reFirst}명(${reFirstRate}%) : 순수초진 ${pureFirst}명(${pureFirstRate}%)`;

    if (!clinicStage || clinicYearsActive === null) {
      return {
        exactCounts,
        benchmarkReason,
        riskTitle: "2. 개원 연도 미입력 — 리스크 진단 불가",
        riskLossBadge: "연차 미입력 · 계산불가",
        riskLossTone: "warn",
        riskWarning: `개원 연도가 미입력 상태라 현재 비율(재초진 ${reFirstRate}% : 초진 ${pureFirstRate}%)의 정상·위험 여부를 판정할 수 없습니다.`,
        actionTitle: "3. 실전 멘트",
        actionInstruction: "상단 개원 연도 입력란에 한의원 개원 연도 4자리를 입력해 연차별 맞춤 진단을 활성화하세요.",
        scriptExample: "\"개원 연도를 입력하시면 연차별 맞춤 현장 멘트가 자동 제공됩니다.\"",
        revenueImpactManwon: gainReFirstManwon,
      };
    }

    if (totalPatients === 0) {
      return {
        exactCounts,
        benchmarkReason,
        riskTitle: "2. 데이터 연동 대기",
        riskLossBadge: `${clinicYearsActive}년차 기준 대기`,
        riskLossTone: "warn",
        riskWarning: `환자 시트가 업로드되면 ${clinicYearsActive}년 차 기준 구환 이탈 및 신규 고갈 여부를 자동 진단합니다.`,
        actionTitle: "3. 실전 멘트",
        actionInstruction: "초진·재초진 구분이 포함된 시트를 업로드하세요.",
        scriptExample:
          "\"[OO한의원] 일교차가 큰 환절기입니다. 지난번 치료받으셨던 허리/어깨 컨디션은 어떠신지 안부 인사드립니다.\"",
        revenueImpactManwon: gainReFirstManwon,
      };
    }

    if (reFirstStatus === "HEALTHY") {
      return {
        exactCounts,
        benchmarkReason,
        riskTitle: "2. 현재 강점 및 환자 순환 현황",
        riskLossBadge: `${clinicYearsActive}년차 황금 균형`,
        riskLossSub: `(재초진 ${reFirstRate}% · 초진 ${pureFirstRate}%)`,
        riskLossTone: "safe",
        riskWarning: `${clinicYearsActive}년 차 기준 재초진 ${reFirstRate}%·초진 ${pureFirstRate}%로 구환 유지와 신규 유입이 황금 균형을 이루고 있습니다.`,
        actionTitle: "3. 실전 멘트 — 구환 단골 환대",
        actionInstruction: `${clinicYearsActive}년 차 균형 구간을 유지하도록 월 1회 구환 안부와 신규 플레이스·블로그 노출을 병행하세요.`,
        scriptExample:
          "\"다시 찾아주셔서 감사합니다. 지난번 치료 기록을 바탕으로 오늘 더 빠르게 회복하실 수 있게 봐드리겠습니다.\"",
        revenueImpactManwon: gainReFirstManwon,
      };
    }

    if (reFirstOverPct > 0) {
      return {
        exactCounts,
        benchmarkReason,
        riskTitle: "2. 상한 초과 리스크 (신규 유입 고갈)",
        riskLossBadge: `신규 초진 ${pureFirstRate}% 고갈 경고`,
        riskLossSub: `(권장 ${clinicStage.pureFirstMin}%↑ 미달)`,
        riskLossTone: "warn",
        riskWarning: `재초진이 ${clinicYearsActive}년 차 상한(${clinicStage.reFirstMax}%)을 넘어 신규 초진이 ${pureFirstRate}%로 마르는 '고인 물 현상'이 진행 중입니다.`,
        actionTitle: "3. 실전 멘트 — 단골 지인 소개 유도",
        actionInstruction: `구환 리콜보다 네이버 플레이스·블로그·지역 타깃 홍보를 즉시 가동해 신규 초진 비중을 ${clinicStage.pureFirstMin}% 이상으로 회복하세요.`,
        scriptExample:
          "\"오래 믿고 찾아주시는 단골분들 덕분에 버티고 있습니다. 주변 가족·지인분들도 통증 생기실 때 편하게 소개해 주시면 정성껏 봐드리겠습니다.\"",
        revenueImpactManwon: gainReFirstManwon,
      };
    }

    if (clinicStage.stage === "YEAR_1") {
      return {
        exactCounts,
        benchmarkReason,
        riskTitle: "2. 개원 1년 차 구환 축적 진단",
        riskLossBadge: "1년차 구환 축적 중",
        riskLossSub: `(현재 재초진 ${reFirstRate}%)`,
        riskLossTone: "warn",
        riskWarning: `개원 1년 차는 구환 풀이 작아 재초진 ${reFirstRate}%가 자연스럽지만, 지금 초진의 3회 완주를 높여야 2년 차 구환 자산이 쌓입니다.`,
        actionTitle: "3. 실전 멘트 — 카톡 채널 단골 씨앗 심기",
        actionInstruction: `현재 초진의 3차 정착률(${rate3rd}%)을 70% 이상으로 끌어올리고 카톡 채널 친구 추가로 향후 안부 접점을 확보하세요.`,
        scriptExample:
          "\"저희 한의원 카카오톡 채널 추가해 두시면 예약 변경도 편하고 계절별 건강 관리 팁도 보내드리고 있습니다.\"",
        revenueImpactManwon: gainReFirstManwon,
      };
    }

    return {
      exactCounts,
      benchmarkReason,
      riskTitle: "2. 기준 미달 시 경영 리스크 (구환 자산 유실)",
      riskLossBadge: `구환 복귀 ${needReFirst}명 부족`,
      riskLossSub: `(광고비 의존 심화)`,
      riskLossTone: reFirstStatus === "CRITICAL" ? "loss" : "warn",
      riskWarning: `${clinicYearsActive}년 차 권장 하한(${clinicStage.reFirstMin}%)보다 재초진이 ${needReFirst}명 부족해 매달 신규 광고비에 의존해야 하는 고비용 구조입니다.`,
      actionTitle: "3. 실전 멘트 — 휴면 구환 안부 리콜",
      actionInstruction: `최근 6개월~1년 내 내원이 끊긴 기존 환자에게 환절기 안부 문자·알림톡을 월 1회 발송해 구환 ${needReFirst}명을 복귀시키세요.`,
      scriptExample:
        "\"[OO한의원] 일교차가 커진 환절기입니다. 지난번 치료받으셨던 허리·어깨 컨디션은 괜찮으신지 안부 인사드립니다.\"",
      revenueImpactManwon: gainReFirstManwon,
    };
  })();

  // [지표 6] 65세 연령 비율 — 베드 점유율 위험 수치 크게 + 1문장 + 실전 멘트
  const age65Modal: IndicatorModalDetail = (() => {
    const benchmarkReason = `어느 상권이든 경영 건강도 절대 기준은 '65세 미만 80%↑ : 65세 이상 20%↓'입니다. 노인 인구가 많은 상권(${demographic.regionName} 고령 ${regSenior}%)일수록 자연 방치 시 노인 편중이 빨라지므로, 반경 3~5km 청장년 유입으로 20% 이하를 지켜내는 것이 핵심입니다.`;
    const exactCounts = `연령 확인 ${knownAge}명 중 [65세 미만 ${under65Count}명(${under65Rate}%) : 65세 이상 ${senior65}명(${seniorRate}%)] | 세부: 순수초진 고령비율 ${pureFirstSeniorRate}% (${pureFirstSenior65}/${pureFirstKnownAge}명) · 재초진 고령비율 ${reFirstSeniorRate}% (${reFirstSenior65}/${reFirstKnownAge}명) | 참고: 동네 실제 65세↑ 인구비율 ${regSenior}% (GDI ${gdi || "-"}배)`;

    if (knownAge === 0) {
      return {
        exactCounts,
        benchmarkReason,
        riskTitle: "2. 연령 데이터 미기입",
        riskLossBadge: "나이 입력 대기",
        riskLossTone: "warn",
        riskWarning: "EMR 연령(나이) 데이터가 입력되면 치료베드 고령 편중 위험을 자동 계산합니다.",
        actionTitle: "3. 실전 멘트",
        actionInstruction: "EMR 엑셀 업로드 시 나이(연령) 컬럼이 포함되도록 업로드하세요.",
        scriptExample:
          "\"어머님 치료 오실 때 직장 다니는 자녀분들 목·어깨 추나나 피로회복 보약도 저녁 진료 시간에 편하게 예약해 주세요.\"",
        revenueImpactManwon: gainAge65Manwon,
      };
    }

    if (seniorRate <= ageHealthyCap) {
      return {
        exactCounts,
        benchmarkReason,
        riskTitle: "2. 현재 강점 및 베드 활력 현황",
        riskLossBadge: `고령 ${seniorRate}% 방어 완료`,
        riskLossSub: `(65세↓ ${under65Rate}% 황금비율)`,
        riskLossTone: "safe",
        riskWarning: `65세 이상 비중이 ${seniorRate}%로 20% 이하 황금선을 지켜 젊은 고단가 신환 활력이 유지되고 있습니다.`,
        actionTitle: "3. 실전 멘트 — 2050 추나·객단가 확장",
        actionInstruction: `청장년 비중(${under65Rate}%)이 매우 우수하므로 추나·약침·첩약 맞춤 안내로 객단가를 극대화하세요.`,
        scriptExample:
          "\"직장·육아로 뭉친 목·어깨는 침과 함께 추나 교정을 병행하시면 통증 회복과 자세 교정이 훨씬 빠릅니다.\"",
        revenueImpactManwon: gainAge65Manwon,
      };
    }

    const isCriticalSenior = seniorRate > ageWarningCap;
    const isPureFirstSeniorHigh = pureFirstKnownAge > 0 && pureFirstSeniorRate > ageHealthyCap;
    return {
      exactCounts,
      benchmarkReason,
      riskTitle: isCriticalSenior
        ? "2. 기준 미달 시 경영 리스크 (노인 베드 편중)"
        : "2. 주의 구간 진단 (청장년 유입 보강)",
      riskLossBadge: isCriticalSenior
        ? `치료베드 약 ${estSeniorBedShare}% 고령 편중 위험`
        : `65세↑ ${seniorRate}% 주의`,
      riskLossSub: isCriticalSenior
        ? `(초진 65세↑ ${seniorRate}%)`
        : `(목표 20% 대비 +${(seniorRate - 20).toFixed(1)}%p)`,
      riskLossTone: isCriticalSenior ? "loss" : "warn",
      riskWarning: `초진 65세 이상이 ${seniorRate}%로 기준(20%↓)을 넘어 실제 치료베드의 약 ${estSeniorBedShare}%가 고령 환자로 편중될 위험이 큽니다.`,
      actionTitle: isPureFirstSeniorHigh
        ? "3. 실전 멘트 — 2050 직장인·자녀 유입"
        : "3. 실전 멘트 — 구환 자녀 세대 가족 소개",
      actionInstruction: isPureFirstSeniorHigh
        ? `순수초진 고령률(${pureFirstSeniorRate}%)이 높으므로 플레이스·블로그를 2050 직장인 추나·야간진료 중심으로 전환해 청장년 ${needUnder65}명을 보강하세요.`
        : `재초진 고령률(${reFirstSeniorRate}%)이 높으므로 어르신 단골의 자녀·며느리 세대 소개와 야간 직장인 유입으로 청장년 ${needUnder65}명을 보강하세요.`,
      scriptExample: isPureFirstSeniorHigh
        ? "\"어머님 치료 오실 때 직장 다니는 자녀분들 목·어깨 추나나 야간 진료도 편하게 예약해 드리고 있으니 꼭 말씀해 주세요.\""
        : "\"어머님 컨디션이 많이 좋아지셨네요! 혹시 따님이나 아드님도 회사 일로 목·허리 뻐근하시면 저녁 진료 시간에 추나 한 번 받아보시라고 전해 주세요.\"",
      revenueImpactManwon: gainAge65Manwon,
    };
  })();

  // [지표 7] 성별 분포 균형 — 부족 성별 수치 크게 + 1문장 + 방향별 실전 멘트
  const genderModal: IndicatorModalDetail = (() => {
    const benchmarkReason =
      "보건복지부 한방의료이용실태조사 및 가계 의료 의사결정 연구상, 여성 환자 비율이 54~66% 구간일 때 배우자·자녀·부모님으로 이어지는 가족 연쇄 소개율이 극대화됩니다.";
    const exactCounts = `성별 집계: 남성 ${effectiveMale}명(${maleRate}%) · 여성 ${effectiveFemale}명(${femaleRate}%) · 시트 미기입 ${unrecordedGender}명 | 동네 여성 인구비율 ${demographic.femaleRatio}%`;

    if (genderSum === 0) {
      return {
        exactCounts,
        benchmarkReason,
        riskTitle: "2. 성별 데이터 미입력",
        riskLossBadge: "성별 입력 대기",
        riskLossTone: "warn",
        riskWarning: "시트 또는 카드 하단 성별 입력란에 남/여 인원을 입력하면 성별 편중 위험을 즉시 진단합니다.",
        actionTitle: "3. 실전 멘트",
        actionInstruction: "카드 하단 남/여 입력란에 인원을 입력하거나 성별 컬럼이 포함된 시트를 업로드하세요.",
        scriptExample:
          "\"환자분 체질에 맞춘 순환·통증 케어도 함께 도와드리고 있으니 불편하신 점 편하게 말씀해 주세요.\"",
        revenueImpactManwon: 0,
      };
    }

    if (genderStatus === "HEALTHY") {
      return {
        exactCounts,
        benchmarkReason,
        riskTitle: "2. 현재 강점 및 가족 확장성 현황",
        riskLossBadge: "성별 황금 균형",
        riskLossSub: `(여 ${femaleRate}% · 남 ${maleRate}%)`,
        riskLossTone: "safe",
        riskWarning: `여성 ${femaleRate}%·남성 ${maleRate}%로 가족 연쇄 소개와 비급여 확장성이 가장 높은 황금 균형 구간입니다.`,
        actionTitle: "3. 실전 멘트 — 가족 동반 소개 확장",
        actionInstruction: "현재 성별 균형이 이상적이므로 배우자와 부모님까지 이어지는 가족 주치의 소개를 강화하세요.",
        scriptExample:
          "\"요즘 배우자분이나 부모님도 같은 생활 습관 때문에 허리·어깨가 같이 뭉치는 경우가 많습니다. 함께 오시면 체질에 맞춰 꼼꼼히 봐드리겠습니다.\"",
        revenueImpactManwon: 0,
      };
    }

    if (femaleRate < 52) {
      return {
        exactCounts,
        benchmarkReason,
        riskTitle: "2. 기준 미달 시 경영 리스크 (여성·가족 확장성 저하)",
        riskLossBadge: `여성 ${femaleRate}% 부족`,
        riskLossSub: "(권장 52%↑ 미달)",
        riskLossTone: femaleRate < 45 ? "loss" : "warn",
        riskWarning: `여성 비율이 ${femaleRate}%로 낮아 단발성 통증에 그치기 쉬우며 가족 소개와 보약·여성 비급여 확장성이 떨어집니다.`,
        actionTitle: "3. 실전 멘트 — 여성·가족 친화 케어",
        actionInstruction: `여성 비율(${femaleRate}%)을 54% 이상으로 높이기 위해 파우더룸·프라이빗 베드와 여성 특화 진료 안내를 강화하세요.`,
        scriptExample:
          "\"통증 치료뿐 아니라 여성분들 순환·수족냉증·피로 회복 케어도 프라이빗하게 봐드리고 있으니 불편하신 부분 편하게 말씀해 주세요.\"",
        revenueImpactManwon: 0,
      };
    }

    return {
      exactCounts,
      benchmarkReason,
      riskTitle: "2. 편중 주의 리스크 (남성 직장인 수요 누락)",
      riskLossBadge: `남성 ${maleRate}% 부족`,
      riskLossSub: "(권장 30%↑ 미달)",
      riskLossTone: femaleRate > 78 ? "loss" : "warn",
      riskWarning: `여성이 ${femaleRate}%로 편중돼 30~50대 남성 직장인 통증·추나·교통사고 수요(${maleRate}%)를 놓치고 있습니다.`,
      actionTitle: "3. 실전 멘트 — 남성 직장인·남편 소개",
      actionInstruction: `남성 비중(${maleRate}%) 보강을 위해 직장인 디스크·추나·야간진료 키워드와 여성 단골의 남편 소개를 유도하세요.`,
      scriptExample:
        "\"남편분도 장시간 운전이나 컴퓨터 업무로 목·허리 많이 뻐근하실 텐데, 퇴근 후 야간 진료 시간에 추나 교정 한 번 받아보시면 훨씬 가벼워지실 겁니다.\"",
      revenueImpactManwon: 0,
    };
  })();

  // [지표 8] 순수초진 소개율 (7:3) — 핵심 수치 크게 + 1문장 + 실전 멘트
  const referralModal: IndicatorModalDetail = (() => {
    const benchmarkReason =
      "소개율은 진료의 질을 증명하는 핵심 지표이므로 전 연차 공통 목표는 '소개 70% : 외부 신규창출 30%'로 고정합니다. 단, 개원 1~2년 차는 소개해 줄 누적 단골 풀이 아직 쌓이는 시기이므로 70% 미만이어도 '미달' 대신 '주의(초기 단골 축적 중)'로 완화해 안내하며, 3년 차 이상부터 엄격하게 판정합니다.";
    const exactCounts = !clinicStage
      ? `개원 연도 미입력으로 연차별 판정 불가 (경로 확인 순수초진 ${pureFirstRouteRecorded}명 중 소개 ${pureFirstReferral}명)`
      : `${clinicOpenYear}년 개원 (${clinicYearsActive}년 차${clinicStage.referralSoftened ? " · 초기 완화 판정" : " · 3년차↑ 엄격 판정"}) | 순수초진(경로확인) ${pureFirstRouteRecorded}명 중 [지인·가족 소개 ${pureFirstReferral}명(${referralRate}%) : 외부 신규창출 ${externalSeedCount}명(${externalSeedRate}% — 간판·도보 ${pureFirstWalkIn}명 + 광고·검색·블로그 ${pureFirstDigital}명)] ※ 재초진 ${reFirst}명 별도 분리 | MPI ${mpi}‰ (권장 ${district.mpiMin}~${district.mpiMax}‰)`;

    if (!clinicStage || clinicYearsActive === null) {
      return {
        exactCounts,
        benchmarkReason,
        riskTitle: "2. 개원 연도 미입력 — 소개율 판정 불가",
        riskLossBadge: "연차 미입력 · 계산불가",
        riskLossTone: "warn",
        riskWarning: "개원 연도를 입력해야 1~2년 차 완화 기준과 3년 차 이상 엄격 기준을 정확히 판정할 수 있습니다.",
        actionTitle: "3. 실전 멘트",
        actionInstruction: "상단 개원 연도 입력란에 한의원 개원 연도 4자리를 입력해 연차별 소개율 판정을 활성화하세요.",
        scriptExample: "\"개원 연도를 입력하시면 연차별 맞춤 현장 멘트가 자동 제공됩니다.\"",
        revenueImpactManwon: 0,
      };
    }

    if (totalPatients === 0 || pureFirstRouteRecorded === 0) {
      return {
        exactCounts,
        benchmarkReason,
        riskTitle: "2. 내원경로 데이터 누락 리스크",
        riskLossBadge: "내원경로 미기입",
        riskLossTone: "warn",
        riskWarning: "접수 시 내원경로가 체크되지 않아 소개 성장인지 광고비 의존인지 판별할 수 없는 상태입니다.",
        actionTitle: "3. 실전 멘트 — 접수 내원경로 확인",
        actionInstruction: "초진 접수 시 '지인소개 / 네이버검색·블로그 / 간판·도보' 중 1가지를 누락 없이 기록하세요.",
        scriptExample:
          "\"저희 한의원은 어떻게 알고 찾아주셨나요? 혹시 지인분 소개시면 성함 알려주시면 감사 인사 꼭 전해드리겠습니다.\"",
        revenueImpactManwon: 0,
      };
    }

    if (referralRate > 85 && mpi < district.mpiMin) {
      return {
        exactCounts,
        benchmarkReason,
        riskTitle: "2. 외부 신규 씨앗 고갈 리스크",
        riskLossBadge: `외부 신규 ${externalSeedRate}% 고갈 경고`,
        riskLossSub: `(MPI ${mpi}‰ / 권장 ${district.mpiMin}‰↑)`,
        riskLossTone: "warn",
        riskWarning: `소개는 ${referralRate}%로 높지만 신환 수(MPI ${mpi}‰)와 외부 신규(${externalSeedRate}%)가 부족해 환자층이 서서히 고립될 위험이 있습니다.`,
        actionTitle: "3. 실전 멘트 — 외부 신규 리뷰·검색 씨앗 확보",
        actionInstruction: `신환 총수(MPI ${mpi}‰ → ${district.mpiMin}‰↑) 확대를 위해 플레이스·블로그·지역 광고로 외부 신규 20~30%를 창출하세요.`,
        scriptExample:
          "\"치료에 만족해 주셔서 감사합니다! 네이버 영수증 리뷰에 한 줄 남겨주시면 처음 찾으시는 동네 분들께 큰 도움이 됩니다.\"",
        revenueImpactManwon: 0,
      };
    }

    if (referralRate >= targetReferral) {
      return {
        exactCounts,
        benchmarkReason,
        riskTitle: "2. 현재 강점 및 마케팅 효율 현황",
        riskLossBadge: `소개 ${referralRate}% 황금구조`,
        riskLossSub: `(외부 신규 ${externalSeedRate}%)`,
        riskLossTone: "safe",
        riskWarning: `순수초진의 ${referralRate}%가 지인·가족 소개로 유입돼 광고비 부담을 최소화한 최상위 신뢰 구조입니다.`,
        actionTitle: "3. 실전 멘트 — VIP 소개자 감사 루프",
        actionInstruction: "소개해 준 기존 환자에게 원장님이 직접 감사 인사를 전하는 '소개 감사 루프'를 꾸준히 유지하세요.",
        scriptExample:
          "\"OOO님 소개로 오셨군요! 믿고 추천해 주신 만큼 3회 치료 원칙으로 확실히 호전시켜 드리고, OOO님께도 감사 인사 꼭 전하겠습니다.\"",
        revenueImpactManwon: 0,
      };
    }

    if (clinicStage.referralSoftened) {
      return {
        exactCounts,
        benchmarkReason,
        riskTitle: `2. 개원 ${clinicYearsActive}년 차 초기 단골 축적 진단`,
        riskLossBadge: `소개 ${needReferral}명 부족`,
        riskLossSub: `(${clinicYearsActive}년차 완화 · 소개 ${referralRate}%)`,
        riskLossTone: "warn",
        riskWarning: `소개율 ${referralRate}%로 목표(70%)까지 ${needReferral}명 부족하지만, 개원 ${clinicYearsActive}년 차 단골 축적기이므로 주의 단계로 관리합니다.`,
        actionTitle: `3. 실전 멘트 — ${clinicYearsActive}년 차 소개 씨앗 심기`,
        actionInstruction: `지금 내원한 초진의 3차 정착률(${rate3rd}%)을 70% 이상으로 높여 호전 확인 시점에 가족·지인 소개를 자연스럽게 안내하세요.`,
        scriptExample:
          "\"통증이 많이 잡히셔서 다행입니다! 주변에 비슷한 증상으로 고생하시는 가족이나 지인분 계시면 언제든 편하게 소개해 주세요.\"",
        revenueImpactManwon: 0,
      };
    }

    const isCriticalRef = referralRate < 40;
    return {
      exactCounts,
      benchmarkReason,
      riskTitle: isCriticalRef
        ? "2. 기준 미달 시 경영 리스크 (마케팅비 과다 의존)"
        : "2. 주의 구간 진단 (소개 복리 가속 필요)",
      riskLossBadge: `소개 ${needReferral}명 부족`,
      riskLossSub: `(소개 ${referralRate}% · 외부 의존 ${externalSeedRate}%)`,
      riskLossTone: isCriticalRef ? "loss" : "warn",
      riskWarning: `개원 ${clinicYearsActive}년 차에 소개가 ${needReferral}명 부족해 외부 유입(${externalSeedRate}%)으로 신환을 충당하는 고비용 구조입니다.`,
      actionTitle: isCriticalRef
        ? "3. 실전 멘트 — 만족 확인 및 가족 소개 점검"
        : `3. 실전 멘트 — 소개 +${needReferral}명 감사 루프`,
      actionInstruction: isCriticalRef
        ? `3년 차 이상에서 소개율 ${referralRate}%는 경고 신호이므로 초진 설명·3회차 호전도(${rate3rd}%)·데스크 응대 병목을 점검하세요.`
        : `3회차 호전 환자에게 만족도를 확인하고 소개자에게 감사 인사를 전해 소개 환자 ${needReferral}명을 늘리세요.`,
      scriptExample:
        "\"오늘 통증이 절반 이상 줄으셔서 다행입니다. 치료받으시면서 불편한 점은 없으셨나요? 가족분들 중에도 어깨·허리 불편하신 분 계시면 편하게 들르시라고 전해 주세요.\"",
      revenueImpactManwon: 0,
    };
  })();

  const insIndicators: DualTrackIndicator[] = [
    {
      id: "ins_second_visit",
      track: "insurance",
      order: 1,
      title: "2차 재내원율",
      subMetric: `${secondCount}/${totalPatients}명`,
      currentValue: rate2nd,
      valueDisplay: totalPatients === 0 ? "-" : `${rate2nd}%`,
      targetValue: target2nd,
      targetDisplay: `목표 ${target2nd}%↑`,
      gapDisplay:
        totalPatients === 0
          ? "데이터 대기"
          : need2nd === 0
          ? `달성 +${(rate2nd - target2nd).toFixed(1)}%p`
          : `${need2nd}명 부족`,
      status:
        totalPatients === 0
          ? "EMPTY"
          : rate2nd >= target2nd
          ? "HEALTHY"
          : rate2nd >= 65
          ? "WARNING"
          : "CRITICAL",
      conclusion:
        totalPatients === 0
          ? "환자 시트를 업로드하세요"
          : need2nd === 0
          ? "초진 80%↑ 안착 달성"
          : `초진 ${need2nd}명 더 2회차 예약 고정`,
      modal: secondModal,
    },
    {
      id: "ins_third_visit",
      track: "insurance",
      order: 2,
      title: "3차 정착률",
      subMetric: `${thirdCount}/${totalPatients}명`,
      currentValue: rate3rd,
      valueDisplay: totalPatients === 0 ? "-" : `${rate3rd}%`,
      targetValue: target3rd,
      targetDisplay: `목표 ${target3rd}%↑`,
      gapDisplay:
        totalPatients === 0
          ? "데이터 대기"
          : need3rd === 0
          ? `달성 +${(rate3rd - target3rd).toFixed(1)}%p`
          : `${need3rd}명 부족`,
      status:
        totalPatients === 0
          ? "EMPTY"
          : rate3rd >= target3rd
          ? "HEALTHY"
          : rate3rd >= 50
          ? "WARNING"
          : "CRITICAL",
      conclusion:
        totalPatients === 0
          ? "환자 시트를 업로드하세요"
          : need3rd === 0
          ? "10명 중 7명↑ 3회 완주 달성"
          : `유효환자 3회 완주 유도 (+${need3rd}명)`,
      modal: thirdModal,
    },
    {
      id: "ins_golden_interval",
      track: "insurance",
      order: 4,
      title: "재내원 골든타임",
      subMetric: intervals.length > 0 ? `${intervals.length}명 중간값` : "2회일 필요",
      currentValue:
        intervals.length > 0
          ? Math.max(
              10,
              Math.min(100, Math.round((GOLDEN_INTERVAL_TARGET_DAYS / Math.max(1, medianInterval)) * 75))
            )
          : 0,
      valueDisplay: intervals.length > 0 ? `${medianInterval}일` : "-",
      targetValue: 75,
      targetDisplay: "첫주 매일 (2일 이내)",
      gapDisplay:
        intervals.length === 0
          ? "재내원 집계전"
          : medianInterval <= GOLDEN_INTERVAL_TARGET_DAYS
          ? "골든타임 합격"
          : `+${(medianInterval - GOLDEN_INTERVAL_TARGET_DAYS).toFixed(1)}일 지연`,
      status: intervalStatus,
      conclusion:
        intervals.length === 0
          ? "2회 방문일 누적 시 자동 산출"
          : medianInterval <= GOLDEN_INTERVAL_TARGET_DAYS
          ? "첫주 매일 · 2주차 주3회 이상적"
          : "첫주 매일 내원(내일 예약) 유도",
      modal: intervalModal,
    },
    {
      id: "ins_reservation",
      track: "insurance",
      order: 5,
      title: "다음 예약 확정률",
      subMetric: `예약 ${resvYes}명`,
      currentValue: resvRate,
      valueDisplay: totalPatients === 0 ? "-" : `${resvRate}%`,
      targetValue: targetResv,
      targetDisplay: `목표 ${targetResv}%↑`,
      gapDisplay:
        totalPatients === 0
          ? "데이터 대기"
          : needResv === 0
          ? "목표 달성"
          : `${needResv}명 미예약`,
      status:
        totalPatients === 0
          ? "EMPTY"
          : resvRate >= targetResv
          ? "HEALTHY"
          : resvRate >= 65
          ? "WARNING"
          : "CRITICAL",
      conclusion:
        totalPatients === 0
          ? "예약 유/무를 체크하세요"
          : needResv === 0
          ? "데스크 예약 클로징 우수"
          : `퇴실 전 양자택일 예약 (+${needResv}명)`,
      modal: reservationModal,
    },
    {
      id: "ins_refirst",
      track: "insurance",
      order: 6,
      title: "초진 · 재초진 비율",
      subMetric:
        !clinicStage || clinicYearsActive === null
          ? "개원연도 미입력"
          : totalPatients === 0
          ? `${clinicYearsActive}년차`
          : `${clinicYearsActive}년차 · 초진 ${pureFirstRate}%`,
      currentValue: !clinicStage ? 0 : reFirstRate,
      valueDisplay: !clinicStage ? "계산불가" : totalPatients === 0 ? "-" : `재초진 ${reFirstRate}%`,
      targetValue: !clinicStage ? 0 : clinicStage.targetChartMid,
      targetDisplay: !clinicStage
        ? "개원연도 입력 필수"
        : `목표 재초진 ${clinicStage.reFirstMin}~${clinicStage.reFirstMax}%`,
      gapDisplay: reFirstGapDisplay,
      status: reFirstStatus,
      conclusion: reFirstConclusion,
      requiresOpenYear: !clinicStage,
      modal: reFirstModal,
    },
    {
      id: "ins_age_65_ratio",
      track: "insurance",
      order: 7,
      title: "65세 연령 비율",
      subMetric: knownAge > 0 ? `65세↑ ${seniorRate}%` : "나이 미기입",
      currentValue: under65Rate,
      valueDisplay: knownAge === 0 ? "나이 미기입" : `65세↓ ${under65Rate}%`,
      targetValue: targetUnder65,
      targetDisplay: "목표 65세↓ 80%↑ (고령 20%↓)",
      gapDisplay:
        knownAge === 0
          ? "나이 입력 필요"
          : seniorRate <= ageHealthyCap
          ? `황금비율 (고령 ${seniorRate}%)`
          : `동네고령 ${regSenior}% · GDI ${gdi}배`,
      status: age65Status,
      conclusion:
        knownAge === 0
          ? "차트 연령(나이) 항목을 포함하세요"
          : seniorRate <= ageHealthyCap
          ? "65세↓ 80% 이상 황금 연령대 유지"
          : seniorRate <= ageWarningCap
          ? `2050 청장년 초진 +${needUnder65}명 보강 권장`
          : "고령 30% 초과 위험 · 젊은 신환 유입 시급",
      modal: age65Modal,
    },
    {
      id: "ins_gender",
      track: "insurance",
      order: 8,
      title: "성별 분포 균형",
      subMetric: genderSum > 0 ? `남${effectiveMale}·여${effectiveFemale}` : "성별 미입력",
      currentValue: femaleRate,
      valueDisplay: genderSum > 0 ? `여 ${femaleRate}%` : "성별 미입력",
      targetValue: 58,
      targetDisplay: "목표 여 54~66%",
      gapDisplay:
        genderSum === 0
          ? "하단 입력 가능"
          : genderStatus === "HEALTHY"
          ? `동네여성 ${demographic.femaleRatio}%`
          : femaleRate < 52
          ? "여성 유입 보강"
          : "남성 유입 보강",
      status: genderSum === 0 ? "WARNING" : genderStatus,
      conclusion:
        genderSum === 0
          ? "하단 성별란에 남/여 인원 입력"
          : femaleRate < 52
          ? "여성·가족 친화 프로그램 보강"
          : femaleRate > 72
          ? "남성 직장인 통증·추나 유입 보강"
          : "동네 인구 대비 성별 균형 양호",
      isGenderCard: true,
      modal: genderModal,
    },
    {
      id: "ins_route_referral",
      track: "insurance",
      order: 9,
      title: "순수초진 소개율 (7:3)",
      subMetric:
        !clinicStage || clinicYearsActive === null
          ? "개원연도 미입력"
          : pureFirstRouteRecorded > 0
          ? `${clinicYearsActive}년차 · 신규창출 ${externalSeedRate}%`
          : `${clinicYearsActive}년차 · MPI ${mpi}‰`,
      currentValue: !clinicStage ? 0 : referralRate,
      valueDisplay: !clinicStage
        ? "계산불가"
        : totalPatients === 0
        ? "-"
        : pureFirstRouteRecorded === 0
        ? "경로 미기입"
        : `소개 ${referralRate}%`,
      targetValue: !clinicStage ? 0 : targetReferral,
      targetDisplay: !clinicStage ? "개원연도 입력 필수" : "목표 소개 70% · 신규 30%",
      gapDisplay: referralGapDisplay,
      status: referralStatus,
      conclusion: referralConclusion,
      requiresOpenYear: !clinicStage,
      modal: referralModal,
    },
  ];

  // =========================================================================
  // TRACK 2: 비급여 (실장) — 내원경로 이후 패키지·한약·비급여 6대 핵심 지표 (중복합산 제거)
  // =========================================================================
  const nonCovRate = pct(nonCovPatientCount, safeTotal);
  const targetNonCov = district.nonCovTarget;
  const needNonCov = totalPatients === 0 ? 0 : neededCount(nonCovPatientCount, totalPatients, targetNonCov);

  const immBase = nonCovPatientCount > 0 ? nonCovPatientCount : safeTotal;
  const immRate = nonCovPatientCount > 0 ? pct(immediatePayPatients, nonCovPatientCount) : pct(immediatePayPatients, safeTotal);
  const targetImm = nonCovPatientCount > 0 ? 45 : 20;
  const needImm = totalPatients === 0 ? 0 : neededCount(immediatePayPatients, immBase, targetImm);

  const herbalRate = pct(herbalPatients, safeTotal);
  const targetHerbal = district.herbalTarget;
  const needHerbal = totalPatients === 0 ? 0 : neededCount(herbalPatients, totalPatients, targetHerbal);
  const gainHerbalManwon = needHerbal * 35; // 한약 1제 평균 35만원 기준

  // 한약 전환 목표 인원을 제외한 순수 약침·추나·소액비급여 전환 부족 인원만 별도 산출 (중복 방지)
  const residualNonCovNeed = Math.max(0, needNonCov - needHerbal);
  const gainNonCovManwon = residualNonCovNeed * 10; // 약침·추나 비급여 평균 10만원 기준

  const followupRate = herbalPatients > 0 ? pct(herbalFollowupYes, herbalPatients) : 0;
  const targetFollowup = 35;
  const needFollowup =
    totalPatients === 0 ? 0 : herbalPatients > 0 ? neededCount(herbalFollowupYes, herbalPatients, targetFollowup) : 0;
  const gainFollowupManwon = needFollowup * 32;

  const pkgRate = pct(packagePatients, safeTotal);
  const pkgRenewRate = packagePatients > 0 ? pct(packageRenewYes, packagePatients) : 0;
  const targetPkgRenew = 30;
  const needPkgRenew =
    totalPatients === 0
      ? 0
      : packagePatients > 0
      ? neededCount(packageRenewYes, packagePatients, targetPkgRenew)
      : neededCount(packagePatients, totalPatients, 15);
  const gainPkgManwon = needPkgRenew * 20;

  const pendingPool = Math.max(1, totalPatients - immediatePayPatients);
  const delayedRate = pct(delayedPayPatients, pendingPool);
  const targetDelayed = 15;
  const needDelayed = totalPatients === 0 ? 0 : neededCount(delayedPayPatients, pendingPool, targetDelayed);
  const gainDelayedManwon = needDelayed * 25;

  const ncIndicators: DualTrackIndicator[] = [
    {
      id: "nc_conversion",
      track: "non_covered",
      order: 1,
      title: "비급여 전환율",
      subMetric: `${nonCovPatientCount}/${totalPatients}명`,
      currentValue: nonCovRate,
      valueDisplay: totalPatients === 0 ? "-" : `${nonCovRate}%`,
      targetValue: targetNonCov,
      targetDisplay: `목표 ${targetNonCov}%↑`,
      gapDisplay:
        totalPatients === 0
          ? "데이터 대기"
          : needNonCov === 0
          ? `달성 +${(nonCovRate - targetNonCov).toFixed(1)}%p`
          : `${needNonCov}명 부족`,
      status:
        totalPatients === 0
          ? "EMPTY"
          : nonCovRate >= targetNonCov
          ? "HEALTHY"
          : nonCovRate >= 20
          ? "WARNING"
          : "CRITICAL",
      conclusion:
        totalPatients === 0
          ? "비급여 내역을 시트에 기입하세요"
          : needNonCov === 0
          ? "상권 맞춤 비급여 수익구조 우수"
          : `급여 통증환자 약침·한약 +${needNonCov}명 연계`,
      modal: {
        exactCounts: `전체 신환 ${totalPatients}명 중 비급여(약침·추나·한약·패키지) 포함 ${nonCovPatientCount}명 (${nonCovRate}%)`,
        benchmarkReason: `${district.type} 기준 고정비 상승을 방어하고 적정 순이익률을 확보하기 위한 권장 비급여 전환 기준점은 ${targetNonCov}% 이상입니다.`,
        riskWarning:
          "비급여 비중이 20% 미만이면 건보 청구액에만 의존하는 박리다매 구조가 되어 원장님과 직원 모두 번아웃에 빠집니다.",
        actionInstruction:
          "단순 침 치료 환자에게 증상별 '약침 1회 체험' 또는 '맞춤 치료계획표'를 실장님이 브릿지 상담으로 연결하세요.",
        scriptExample:
          "\"오늘 침 치료에 염증을 빠르게 잡는 약침이 함께 들어가면 회복 기간이 절반으로 줄어듭니다.\"",
        revenueImpactManwon: gainNonCovManwon,
        formulaNote:
          residualNonCovNeed > 0
            ? `한약 목표 제외 일반 비급여(약침·추나) ${residualNonCovNeed}명 × 10만 원 (중복 제외)`
            : "목표 충족 또는 한약 전환 목표에 포함",
      },
    },
    {
      id: "nc_immediate_pay",
      track: "non_covered",
      order: 2,
      title: "당일 즉시 결제율",
      subMetric: `즉시 ${immediatePayPatients}건`,
      currentValue: immRate,
      valueDisplay: totalPatients === 0 ? "-" : `${immRate}%`,
      targetValue: targetImm,
      targetDisplay: `목표 ${targetImm}%↑`,
      gapDisplay:
        immediatePayPatients === 0
          ? "기입/성사 필요"
          : needImm === 0
          ? "클로징 우수"
          : `${needImm}건 부족`,
      status:
        totalPatients === 0
          ? "EMPTY"
          : immRate >= targetImm
          ? "HEALTHY"
          : immRate >= 25
          ? "WARNING"
          : "CRITICAL",
      conclusion:
        immediatePayPatients === 0
          ? "당일 결제 혜택·분할 제안 가동"
          : needImm === 0
          ? "상담실 당일 클로징 파워 탁월"
          : `초진 당일 시작 혜택 안내 (+${needImm}건)`,
      modal: {
        exactCounts: `비급여 관여 ${nonCovPatientCount}명 중 상담 당일 즉시결제 ${immediatePayPatients}명 (${immRate}%)`,
        benchmarkReason:
          "환자의 치료 결심 에너지는 초진 당일 통증이 가장 심할 때 최고조입니다. 문을 나서는 순간 결제 확률은 1/4로 급락합니다.",
        riskWarning:
          "'집에 가서 상의해 볼게요' 비율이 높을수록 상담 시간만 소모되고 실제 매출 전환은 누수됩니다.",
        actionInstruction:
          "원장님 진료실 티업(처방 필요성 고지) 직후 상담실로 연결하고, 당일 시작 시 1회 케어 추가 등 명확한 당일 결정 명분을 제시하세요.",
        scriptExample:
          "\"오늘 바로 원장님 처방대로 시작하시면 진맥 후 탕전 일정이 내일 바로 배정되어 금요일부터 복용하실 수 있어요.\"",
        revenueImpactManwon: 0,
        formulaNote: "※ 한약·패키지·비급여 전환액과 중복 합산 방지를 위해 별도 합산 제외",
      },
    },
    {
      id: "nc_herbal",
      track: "non_covered",
      order: 3,
      title: "한약 처방 전환율",
      subMetric: `한약 ${herbalPatients}명`,
      currentValue: herbalRate,
      valueDisplay: totalPatients === 0 ? "-" : `${herbalRate}%`,
      targetValue: targetHerbal,
      targetDisplay: `목표 ${targetHerbal}%↑`,
      gapDisplay:
        totalPatients === 0
          ? "데이터 대기"
          : needHerbal === 0
          ? `달성 +${(herbalRate - targetHerbal).toFixed(1)}%p`
          : `${needHerbal}명 부족`,
      status:
        totalPatients === 0
          ? "EMPTY"
          : herbalRate >= targetHerbal
          ? "HEALTHY"
          : herbalRate >= 10
          ? "WARNING"
          : "CRITICAL",
      conclusion:
        herbalPatients === 0
          ? "3회차 통증·피로 환자 한약 티업"
          : needHerbal === 0
          ? "한약 주력 매출 엔진 순항 중"
          : `만성·재발 환자 한약 상담 +${needHerbal}명`,
      modal: {
        exactCounts: `전체 신환 ${totalPatients}명 중 한약 처방 기록 ${herbalPatients}명 (${herbalRate}%)`,
        benchmarkReason:
          "동네 한의원 객단가(ATV)와 영업이익률을 지탱하는 핵심 기둥은 침 환자의 자연스러운 탕약(통증·보약·다이어트) 전환입니다.",
        riskWarning:
          "한약 전환율이 10% 미만이면 계절 비수기마다 매출 변동폭이 커져 경영 안정성이 흔들립니다.",
        actionInstruction:
          "초진 첫날 무리한 권유보다, 2~3회차에 침 치료 호전을 확인한 환자에게 '속근육·기혈 회복용 15일/1제 한약'을 제안하세요.",
        scriptExample:
          "\"침으로 겉의 급한 불은 껐는데, 진액이 부족해 자꾸 재발하는 상태라 2주간 회복 한약을 같이 드시면 훨씬 덜 아픕니다.\"",
        revenueImpactManwon: gainHerbalManwon,
        formulaNote: needHerbal > 0 ? `${needHerbal}명 부족 × 한약 1제 표준 35만 원` : "목표 달성 완료",
      },
    },
    {
      id: "nc_herbal_followup",
      track: "non_covered",
      order: 4,
      title: "1제 후 연복률",
      subMetric: herbalPatients > 0 ? `${herbalFollowupYes}/${herbalPatients}명` : "한약 모수 대기",
      currentValue: followupRate,
      valueDisplay: herbalPatients === 0 ? "-" : `${followupRate}%`,
      targetValue: targetFollowup,
      targetDisplay: `목표 ${targetFollowup}%↑`,
      gapDisplay:
        herbalPatients === 0
          ? "한약 처방 후 집계"
          : needFollowup === 0
          ? "연복 목표 달성"
          : `${needFollowup}명 더 연복`,
      status:
        herbalPatients === 0
          ? "EMPTY"
          : followupRate >= targetFollowup
          ? "HEALTHY"
          : followupRate >= 20
          ? "WARNING"
          : "CRITICAL",
      conclusion:
        herbalPatients === 0
          ? "한약 건수·연복 유무를 기록하세요"
          : needFollowup === 0
          ? "복약 관리 및 연복 설계 우수"
          : "복용 10일차 중간점검 콜 필수",
      modal: {
        exactCounts: `한약 처방 ${herbalPatients}명 중 1제 후 추가결제(연복) ${herbalFollowupYes}명 (${followupRate}%)`,
        benchmarkReason:
          "신규 한약 환자 1명 유치 비용보다 기존 복용 환자의 2제 연복 전환이 5배 이상 쉽고 치료 완성도도 비약적으로 높아집니다.",
        riskWarning:
          "약을 다 먹은 뒤에 연락하면 이미 복약을 중단해 연복 타이밍을 놓칩니다.",
        actionInstruction:
          "한약 발송 후 '3일차 적응 콜' → '10일차 호전 체크 및 2제 연복 예약 안내' 해피콜 스케줄을 실장님 루틴으로 고정하세요.",
        scriptExample:
          "\"약이 4일 치 남으셨을 텐데 끊기지 않고 2제째 이어가셔야 체질 개선이 완성됩니다. 이번 주 금요일 내원 잡아드릴까요?\"",
        revenueImpactManwon: gainFollowupManwon,
        formulaNote: needFollowup > 0 ? `${needFollowup}명 연복 부족 × 2제 표준 32만 원` : "연복 달성 또는 모수 대기",
      },
    },
    {
      id: "nc_package_renewal",
      track: "non_covered",
      order: 5,
      title: "패키지 · 연장률",
      subMetric: `패키지 ${packagePatients}명 (${pkgRate}%)`,
      currentValue: packagePatients > 0 ? pkgRenewRate : pkgRate,
      valueDisplay: packagePatients > 0 ? `연장 ${pkgRenewRate}%` : `등록 ${pkgRate}%`,
      targetValue: packagePatients > 0 ? targetPkgRenew : 20,
      targetDisplay: packagePatients > 0 ? `연장 ${targetPkgRenew}%↑` : "등록 20%↑",
      gapDisplay:
        packagePatients === 0
          ? "패키지 제안 필요"
          : needPkgRenew === 0
          ? "목표 달성"
          : `연장 ${needPkgRenew}명 부족`,
      status:
        totalPatients === 0
          ? "EMPTY"
          : packagePatients > 0
          ? pkgRenewRate >= targetPkgRenew
            ? "HEALTHY"
            : pkgRenewRate >= 15
            ? "WARNING"
            : "CRITICAL"
          : pkgRate >= 20
          ? "HEALTHY"
          : "WARNING",
      conclusion:
        packagePatients === 0
          ? "약침·추나 5·10회권 구성 제안"
          : needPkgRenew === 0
          ? "패키지 재결제 선순환 정착"
          : "잔여 2회 시점 중간 재평가 실시",
      modal: {
        exactCounts: `패키지 등록 ${packagePatients}명(전체의 ${pkgRate}%) · 종료 후 연장 결제 ${packageRenewYes}명(${pkgRenewRate}%)`,
        benchmarkReason:
          "약침·다이어트·통증 패키지는 환자의 치료 이탈을 막고 현금 흐름을 안정화하며, 종료 직전 재연장(30%↑)이 순이익을 극대화합니다.",
        riskWarning:
          "마지막 회차가 다 끝난 날 연장을 권유하면 환자는 '일단 쉬어볼게요'라고 거절할 확률이 높습니다.",
        actionInstruction:
          "패키지 종료 D-2회차(예: 10회 중 8회차)에 원장님 중간 경과 진단을 배정하고 유지·강화 연장 혜택을 안내하세요.",
        scriptExample:
          "\"오늘이 8회차시네요! 처음보다 70% 좋아지셨는데 남은 30% 마무리를 위해 연장권 우대 혜택을 적용해 드릴 수 있어요.\"",
        revenueImpactManwon: gainPkgManwon,
        formulaNote: needPkgRenew > 0 ? `${needPkgRenew}건 × 패키지 표준 20만 원` : "목표 달성 완료",
      },
    },
    {
      id: "nc_delayed_recovery",
      track: "non_covered",
      order: 6,
      title: "30일 보류 회수율",
      subMetric: `회수 ${delayedPayPatients}건`,
      currentValue: delayedRate,
      valueDisplay: totalPatients === 0 ? "-" : `${delayedRate}%`,
      targetValue: targetDelayed,
      targetDisplay: `목표 ${targetDelayed}%↑`,
      gapDisplay:
        delayedPayPatients === 0
          ? "해피콜 회수 대기"
          : needDelayed === 0
          ? "회수율 우수"
          : `${needDelayed}건 회수 가능`,
      status:
        totalPatients === 0
          ? "EMPTY"
          : delayedRate >= targetDelayed
          ? "HEALTHY"
          : delayedRate >= 6
          ? "WARNING"
          : "WARNING",
      conclusion:
        delayedPayPatients === 0
          ? "당일 미결제자 3·7일 해피콜 가동"
          : needDelayed === 0
          ? "보류 환자 밀착 회수 시스템 우수"
          : `미결제 보류자 ${needDelayed}명 안부콜 진행`,
      modal: {
        exactCounts: `당일 미결제(보류) 풀 ${pendingPool}명 중 1달 이내 재결제 회수 ${delayedPayPatients}건 (${delayedRate}%)`,
        benchmarkReason:
          "초진 당일 결제를 망설인 보류 환자의 15~20%는 2주 내 증상 악화 또는 가족 상의 후 단 한 번의 정중한 안부 연락으로 결제 전환됩니다.",
        riskWarning:
          "보류 환자 명단을 따로 관리하지 않으면 다 잡은 고단가 매출이 그대로 증발합니다.",
        actionInstruction:
          "비급여 상담 후 미결제 귀가 환자를 실장님 '관심 노트에 별도 표기'하고 3일 후 통증 안부 연락을 드리세요.",
        scriptExample:
          "\"지난번 상담드렸던 OOO님, 치료 후 통증은 좀 어떠신지 원장님께서 궁금해하셔서 안부 연락드렸습니다.\"",
        revenueImpactManwon: gainDelayedManwon,
        formulaNote: needDelayed > 0 ? `미결제 회수 목표 ${needDelayed}건 × 평균 25만 원` : "목표 달성 완료",
      },
    },
  ];

  // --- 트랙별 종합 요약 산출 함수 ---
  const severityRank = (st: RiskLevel) => (st === "CRITICAL" ? 3 : st === "WARNING" ? 2 : st === "EMPTY" ? 1 : 0);

  const buildTrackSummary = (
    track: FirstVisitTrack,
    label: string,
    list: DualTrackIndicator[]
  ): TrackSummary => {
    const active = list.filter((i) => i.status !== "EMPTY");
    const healthyCount = list.filter((i) => i.status === "HEALTHY").length;
    const warningCount = list.filter((i) => i.status === "WARNING").length;
    const criticalCount = list.filter((i) => i.status === "CRITICAL").length;

    const baseDenom = Math.max(1, active.length * 100);
    const earned = active.reduce((acc, cur) => {
      if (cur.status === "HEALTHY") return acc + 92;
      if (cur.status === "WARNING") return acc + 62;
      return acc + 30;
    }, 0);
    const score = active.length === 0 ? 0 : Math.min(100, Math.round((earned / baseDenom) * 100));
    const tierInfo = scoreToTier(score);

    // 시급도(CRITICAL 우선) → 기대 매출 임팩트 → 핵심 순서(order) 기준으로 1개 미션 자동 선정
    const priorityTarget =
      [...list]
        .filter((i) => i.status !== "HEALTHY" && i.status !== "EMPTY")
        .sort(
          (a, b) =>
            severityRank(b.status) - severityRank(a.status) ||
            b.modal.revenueImpactManwon - a.modal.revenueImpactManwon ||
            a.order - b.order
        )[0] || list[0];

    const potentialBreakdown = list
      .filter((i) => i.modal.revenueImpactManwon > 0)
      .map((i) => ({
        label: i.title,
        gainManwon: i.modal.revenueImpactManwon,
        detail: `${i.valueDisplay} → ${i.targetDisplay} (${i.gapDisplay})`,
        formula: i.modal.formulaNote,
      }));

    const potentialMonthlyGainManwon = potentialBreakdown.reduce((s, x) => s + x.gainManwon, 0);

    return {
      track,
      label,
      score,
      tier: tierInfo.tier,
      tierLabel: tierInfo.label,
      nextTierGapText:
        tierInfo.nextCut === 100
          ? "최상위 마스터 유지 중"
          : `+${Math.max(1, tierInfo.nextCut - score)}점 달성 시 ${tierInfo.nextTier}`,
      focusMission: priorityTarget ? `${priorityTarget.title}: ${priorityTarget.conclusion}` : "현재 기준점 우수 유지",
      focusMissionReason: priorityTarget
        ? `${priorityTarget.modal.actionInstruction}${
            priorityTarget.modal.revenueImpactManwon > 0
              ? ` (직접 기대효과: 월 +${priorityTarget.modal.revenueImpactManwon}만 원)`
              : ""
          }`
        : "모든 지표가 권장 기준점 내에 있습니다.",
      potentialMonthlyGainManwon,
      potentialBreakdown,
      healthyCount,
      warningCount,
      criticalCount,
      indicators: list,
    };
  };

  // --- 추나(3회 내원 = 초진1 + 재진2) & 급여 첩약(40일분 = 60만원) 시뮬레이션 계산 ---
  const simSettings: InsuranceSimulationSettings = {
    ...DEFAULT_INSURANCE_SIM_SETTINGS,
    ...(simSettingsOverride || {}),
  };

  let chunaExcludedSenior = 0;
  let chunaExcludedAuto = 0;
  let chunaExcludedNonMsk = 0;
  let currentChunaCount = 0;

  const NON_MSK_ONLY_RE = /보약|다이어트|비염|소화|체기|피부|여드름|감기|기침|소아|난임|갱년기|불면|공진단|경옥고|한약/;
  const MSK_RE = /허리|요통|디스크|협착|목통|목결림|경추|어깨|오십견|회전근개|무릎|관절|발목|손목|팔꿈치|골반|척추|추나|통증|염좌|담결림|낙침|근육|좌골|손저림/;

  for (const r of rows) {
    const ins = clean(r.insuranceType);
    const det = clean(r.treatmentDetail);
    const ageNum = parseInt(clean(r.age).replace(/[^0-9]/g, ""), 10);
    const isAuto = /자보|자동차|교통사고/.test(ins) || /자보|교통사고|TA/i.test(det);
    const isSenior = !isNaN(ageNum) && ageNum >= 65;
    const isNonMskOnly =
      (NON_MSK_ONLY_RE.test(det) || (Boolean(clean(r.herbalMonthlySummary)) && !det)) &&
      !MSK_RE.test(det);

    if (isAuto) {
      chunaExcludedAuto++;
    } else if (isSenior) {
      chunaExcludedSenior++;
    } else if (isNonMskOnly) {
      chunaExcludedNonMsk++;
    } else {
      const chVal = clean(r.chunaType);
      if (chVal === "단순" || chVal === "복잡" || /추나/.test(det)) currentChunaCount++;
    }
  }

  const rawExcludedTotal = chunaExcludedAuto + chunaExcludedSenior + chunaExcludedNonMsk;
  const isFallbackEligibilityUsed = totalPatients > 0 && knownAge === 0 && rawExcludedTotal === 0;
  const chunaEligibleCount =
    totalPatients === 0
      ? 0
      : isFallbackEligibilityUsed
      ? Math.round(totalPatients * 0.65)
      : Math.max(0, totalPatients - rawExcludedTotal);

  const chunaFeeSpec = CHUNA_FEES[simSettings.chunaType];
  const targetChunaCount =
    chunaEligibleCount === 0
      ? 0
      : Math.ceil((chunaEligibleCount * simSettings.chunaTargetPct) / 100);
  const additionalChunaCount = Math.max(0, targetChunaCount - currentChunaCount);
  const baseline3VisitManwon = Number((avgVisitFeeManwon * 3).toFixed(2));
  const perPatientNetGainManwon = Math.max(
    0,
    Number((chunaFeeSpec.total3VisitsManwon - baseline3VisitManwon).toFixed(2))
  );
  const chunaGainManwon =
    totalPatients === 0 ? 0 : Math.round(additionalChunaCount * perPatientNetGainManwon);

  const herbal40TargetCount =
    totalPatients === 0
      ? 0
      : Math.ceil((totalPatients * simSettings.herbal40TargetPct) / 100);
  const herbal40GainManwon = herbal40TargetCount * HERBAL_40DAY_FEE_MANWON;

  const insuranceSimulation: InsuranceSimulationSummary = {
    settings: simSettings,
    chunaEligibleCount,
    chunaExcludedSenior,
    chunaExcludedAuto,
    chunaExcludedNonMsk,
    isFallbackEligibilityUsed,
    currentChunaCount,
    targetChunaCount,
    additionalChunaCount,
    chunaLabel: chunaFeeSpec.label,
    chunaFirstWon: chunaFeeSpec.firstWon,
    chunaRevisitWon: chunaFeeSpec.revisitWon,
    chuna3VisitTotalManwon: chunaFeeSpec.total3VisitsManwon,
    baseline3VisitManwon,
    perPatientNetGainManwon,
    chunaGainManwon,
    herbal40TargetCount,
    herbal40GainManwon,
    herbal40CannibalWarning: simSettings.herbal40TargetPct >= 10,
  };

  const insuranceSummary = buildTrackSummary("insurance", "보험 (원장)", insIndicators);
  if (totalPatients > 0) {
    if (simSettings.includeChunaInTotal && chunaGainManwon > 0) {
      insuranceSummary.potentialBreakdown.push({
        label: `${chunaFeeSpec.label} 3회 정착 (${simSettings.chunaTargetPct}%)`,
        gainManwon: chunaGainManwon,
        detail: `유효 ${chunaEligibleCount}명 중 ${simSettings.chunaTargetPct}% (목표 ${targetChunaCount}명 · 추가 +${additionalChunaCount}명)`,
        formula: `추가 ${additionalChunaCount}명 × 3회 순증 ${perPatientNetGainManwon}만 원 (${chunaFeeSpec.label} 3회 ${chunaFeeSpec.total3VisitsManwon}만 - 기존 3회 ${baseline3VisitManwon}만)`,
      });
    }
    if (simSettings.includeHerbal40InTotal && herbal40GainManwon > 0) {
      insuranceSummary.potentialBreakdown.push({
        label: `급여 첩약 40일분 (${simSettings.herbal40TargetPct}%)`,
        gainManwon: herbal40GainManwon,
        detail: `전체 ${totalPatients}명 중 ${simSettings.herbal40TargetPct}% (${herbal40TargetCount}명 · 1.5~2개월 누적)`,
        formula: `${herbal40TargetCount}명 × 40일분(2개 질환 각 20일) ${HERBAL_40DAY_FEE_MANWON}만 원`,
      });
    }
    insuranceSummary.potentialMonthlyGainManwon = insuranceSummary.potentialBreakdown.reduce(
      (s, x) => s + x.gainManwon,
      0
    );
  }

  return {
    evaluatedAt: new Date().toISOString(),
    clinicOpenYear,
    clinicYearsActive,
    clinicStageLabel: clinicStage ? clinicStage.stageLabel : null,
    districtType: district.type,
    districtTip: district.tip,
    mpi,
    mpiTargetRange: `${district.mpiMin} ~ ${district.mpiMax}명`,
    recordedMale,
    recordedFemale,
    unrecordedGender,
    effectiveMale,
    effectiveFemale,
    feeBasis,
    insuranceSimulation,
    bodyPartRetention,
    unclassifiedBodyPartCount,
    insurance: insuranceSummary,
    nonCovered: buildTrackSummary("non_covered", "비급여 (실장)", ncIndicators),
  };
}

/**
 * 하위 호환 유지를 위한 기존 헬퍼
 */
export function computeMetricsFromRows(rows: Partial<FirstVisitRow>[]): ClinicPatientMetrics {
  if (!rows || rows.length === 0) return DEFAULT_CLINIC_METRICS;
  let firstVisits = 0;
  let reFirstVisits = 0;
  let revisits = 0;
  let seniorVisits = 0;
  let under65Visits = 0;
  let maleVisits = 0;
  let femaleVisits = 0;
  let nonReimbursableVisits = 0;
  let referralPatients = 0;
  const channels = { organicWalkIn: 0, referral: 0, digitalSearch: 0, socialAd: 0, other: 0 };

  for (const r of rows) {
    if (clean(r.visitType).includes("재초진")) reFirstVisits++;
    else firstVisits++;
    if (clean(r.secondVisitDate)) revisits++;
    if (clean(r.thirdVisitDate)) revisits++;

    const ageNum = parseInt(clean(r.age).replace(/[^0-9]/g, ""), 10);
    if (!isNaN(ageNum) && ageNum > 0) {
      if (ageNum >= 65) seniorVisits++;
      else under65Visits++;
    }
    const g = clean(r.gender);
    if (/남|M/i.test(g)) maleVisits++;
    else if (/여|F/i.test(g)) femaleVisits++;

    const rt = clean(r.visitRoute).toLowerCase().replace(/\s+/g, "");
    if (/소개|지인|가족|추천/.test(rt)) {
      channels.referral++;
      referralPatients++;
    } else if (/네이버|플레이스|블로그|검색|지도|홈페이지|구글/.test(rt)) {
      channels.digitalSearch++;
    } else if (/인스타|스레드|유튜브|맘카페|당근|sns|광고/.test(rt)) {
      channels.socialAd++;
    } else if (/간판|지나가|근처|동네|인근|거주|도보/.test(rt)) {
      channels.organicWalkIn++;
    } else if (rt) {
      channels.other++;
    }

    if (
      clean(r.insuranceType) === "비급여" ||
      Boolean(clean(r.nonCoveredList)) ||
      extractPositiveCount(r.nonCoveredCount) > 0 ||
      Boolean(clean(r.herbalMonthlySummary)) ||
      extractPositiveCount(r.packageCount) > 0
    ) {
      nonReimbursableVisits++;
    }
  }

  const totalVisits = Math.max(1, firstVisits + reFirstVisits + revisits);
  return {
    totalVisits,
    firstVisits,
    reFirstVisits,
    revisits,
    seniorVisits,
    under65Visits: under65Visits || Math.max(0, rows.length - seniorVisits),
    maleVisits,
    femaleVisits,
    acquisitionChannels: channels,
    nonReimbursableVisits,
    reimbursableOnlyVisits: Math.max(0, totalVisits - nonReimbursableVisits),
    referralPatients,
  };
}
