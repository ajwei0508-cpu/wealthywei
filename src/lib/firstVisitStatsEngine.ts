"use client";

import { getSemiAnnualCensusDates } from "./censusUtils";
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

export interface IndicatorModalDetail {
  exactCounts: string;           // 실제 분자/분모 집계 내역
  benchmarkReason: string;       // 왜 이 기준점인가 (이론 + 동네 인구 근거)
  riskWarning: string;           // 미달 시 경영 위험 상황
  actionInstruction: string;     // 구체적 행동 지시
  scriptExample: string;         // 현장 1문장 실전 스크립트
  revenueImpactManwon: number;   // 목표 도달 시 월 예상 추가 매출(만원) — 중복제외 순수분
  formulaNote?: string;          // 1회 진료비(5만/2만) 기반 정확한 산출 공식 설명
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

export interface FeeBasisSummary {
  under65FeeManwon: number;      // 65세 미만 1회 진료비 (5만원)
  senior65FeeManwon: number;     // 65세 이상 1회 진료비 (2만원)
  avgVisitFeeManwon: number;     // 실측 연령 가중평균 1회 진료비 (만원)
  under65Count: number;
  senior65Count: number;
  knownAgeCount: number;
  isDefaultRatioUsed: boolean;   // 나이 미기입으로 기본 80:20(4.4만원) 적용 여부
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
  districtType: string;          // 상권 유형 (예: "고령 밀착형 상권")
  districtTip: string;           // 상권 1줄 특성
  mpi: number;                   // 인구 1,000명당 신환 침투율
  mpiTargetRange: string;        // 예: "1.8 ~ 3.2명"
  recordedMale: number;
  recordedFemale: number;
  unrecordedGender: number;
  effectiveMale: number;
  effectiveFemale: number;
  feeBasis: FeeBasisSummary;     // 1회 진료비 산출 기준 (65세↓ 5만 · 65세↑ 2만)
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
      return /경추|경항|항강|뒷목|목통증|목디스크|목결림|목뻐근|목담|거북목|일자목|낙침|승모근|날개뼈|견갑|견배|등통증|등결림|등담|흉추|배통|담결림|담걸림|근막통|늑간|갈비|^등[\s,/]|(?<![항품과세주발손])목/.test(
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
      /무릎|슬관절|슬통|퇴행성관절|반월상|십자인대|다리|하체|하지|허벅지|대퇴|종아리|정강이|쥐남/.test(
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
      "매일 쓰는 건초·힘줄 부위 특성을 설명하고, 사용량을 이기는 초기 3회 약침·테이핑 집중 주기를 이틀 간격으로 잡으세요.",
    scriptExample:
      "\"손목·팔꿈치는 매일 쓰시는 부위라 1회 치료만으론 사용량을 못 이깁니다. 처음 3회는 간격을 좁혀 염증부터 꺾어야 합니다.\"",
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
    match: (d) =>
      /소화|담적|체함|체기|식도염|역류성|위염|속쓰림|속안좋음|설사|변비|복통|장염|과민성|비염|콧물|코막힘|축농증|기침|가래|천식|감기|인후|호흡|기관지|소변|절박뇨|야뇨|전립선|생리|월경|다낭성|난임|자궁|산후|갱년기|수족냉증|다한증|피부|아토피|습진|건선|여드름|탈모|두드러기|가려움|열감|피로|기력|무기력/.test(
        d
      ),
    dropoutReason:
      "급성 체기·코막힘이 1회 침·보험한약으로 호전되면 한의원 내과 진료를 1회성 응급처치로만 인식하고 재방문을 생략합니다.",
    prescriptionGuide:
      "급성 증상 완화 후 위장 운동성·점막 면역 회복을 위해 3일치 보험/과립제 처방과 함께 3일 뒤 2·3차 경과 진료를 연결하세요.",
    scriptExample:
      "\"오늘 급한 체기는 내렸지만 위장 운동이 아직 멈춰 있습니다. 3일치 약 드신 뒤 금요일에 맥과 복진 상태를 꼭 다시 봐야 합니다.\"",
  },
  {
    id: "herbal_diet",
    label: "보약·다이어트",
    shortName: "보약·비만",
    isConsultOnly: true,
    match: (d) => /다이어트|비만|보약|녹용|공진단|경옥고|청심원|한약상담|성장|소아보약/.test(d),
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
    "편타성 손상은 사고 3~7일 뒤 어혈 통증이 본격화됨을 고지하고 첫 주 최소 3회 연속 내원 스케줄을 즉시 확정하세요.",
  scriptExample:
    "\"교통사고 긴장은 사흘 뒤부터 통증이 더 올라옵니다. 후유증이 남지 않게 이번 주 3회 연속 치료 일정을 먼저 잡겠습니다.\"",
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
  genderOverride?: { male?: number | null; female?: number | null }
): DualTrackEvaluation {
  const district = classifyDistrict(demographic);
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

    // 진료부위별 분류 및 2·3회 내원 추적
    const detail = clean(r.treatmentDetail);
    const matchedParts = classifyClinicalBodyParts(detail, clean(r.insuranceType));
    if (matchedParts.length > 0) {
      for (const def of matchedParts) {
        if (!bodyPartStatsMap.has(def.id)) {
          bodyPartStatsMap.set(def.id, { def, patients: 0, second: 0, third: 0 });
        }
        const st = bodyPartStatsMap.get(def.id)!;
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
  // [1회 진료비 기준: 65세 미만(이하) 5만 원 · 65세 이상 2만 원 가중단가 적용 / 중복합산 배제]
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
  const ageWarningCap = Math.max(30, Number((regSenior * 1.25).toFixed(1)));
  const age65Status: RiskLevel =
    knownAge === 0
      ? "EMPTY"
      : seniorRate <= 20
      ? "HEALTHY"
      : seniorRate <= ageWarningCap
      ? "WARNING"
      : "CRITICAL";
  const needUnder65 = knownAge > 0 ? neededCount(under65Count, knownAge, 80) : 0;

  // 1회 진료비 정밀 산출 (65세 미만 5만 원 · 65세 이상 2만 원)
  const UNDER65_FEE_MANWON = 5;
  const SENIOR65_FEE_MANWON = 2;
  const avgVisitFeeManwon =
    knownAge > 0
      ? Number(((under65Count * UNDER65_FEE_MANWON + senior65 * SENIOR65_FEE_MANWON) / knownAge).toFixed(2))
      : 4.4; // 나이 미기입 시 권장 80:20 기본 가중단가 (0.8*5 + 0.2*2 = 4.4만원)
  const avgFeeStr = Number(avgVisitFeeManwon.toFixed(2)).toString();

  const feeBasis: FeeBasisSummary = {
    under65FeeManwon: UNDER65_FEE_MANWON,
    senior65FeeManwon: SENIOR65_FEE_MANWON,
    avgVisitFeeManwon,
    under65Count,
    senior65Count: senior65,
    knownAgeCount: knownAge,
    isDefaultRatioUsed: knownAge === 0,
  };

  const rate2nd = pct(secondCount, safeTotal);
  const target2nd = 80;
  const need2nd = totalPatients === 0 ? 0 : neededCount(secondCount, totalPatients, target2nd);
  // 중복 합산 방지: 2차 재내원율은 순수 '2회차 1회분'만 산출
  const gain2ndManwon = totalPatients === 0 ? 0 : Math.round(need2nd * 1 * avgVisitFeeManwon);

  const rate3rd = pct(thirdCount, safeTotal);
  const target3rd = 70;
  const need3rd = totalPatients === 0 ? 0 : neededCount(thirdCount, totalPatients, target3rd);
  // 중복 합산 방지: 3차 정착률은 순수 '3회차 1회분'만 산출 (2회차분과 중복 0%)
  const gain3rdManwon = totalPatients === 0 ? 0 : Math.round(need3rd * 1 * avgVisitFeeManwon);

  // 진료부위별 삼진율(3회 내원율) 정밀 산출
  const bodyPartRetention: BodyPartRetentionItem[] = Array.from(bodyPartStatsMap.values())
    .filter((st) => st.patients > 0)
    .map((st) => {
      const sRate = pct(st.second, st.patients);
      const tRate = pct(st.third, st.patients);
      const need70 = neededCount(st.third, st.patients, 70);
      const status: RiskLevel =
        tRate >= 70
          ? "HEALTHY"
          : st.patients < 2 || st.def.isConsultOnly
          ? "WARNING"
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
    .sort((a, b) => b.thirdRate - a.thirdRate || b.patients - a.patients);

  // 대표 강점/보완 부위 선정 (모수 1명 왜곡 및 순수 보약택배군 왜곡 방지)
  const clinicalBodyParts = bodyPartRetention.filter((p) => !p.isConsultOnly);
  const poolStep1 = clinicalBodyParts.filter((p) => p.patients >= 2);
  const qualifiedParts =
    poolStep1.length > 0
      ? poolStep1
      : clinicalBodyParts.length > 0
      ? clinicalBodyParts
      : bodyPartRetention;

  const bestBodyPart = qualifiedParts[0] || null;
  const weakestBodyPart =
    qualifiedParts.length > 0
      ? [...qualifiedParts].sort((a, b) => a.thirdRate - b.thirdRate || b.patients - a.patients)[0]
      : null;
  const healthyBodyPartCount = qualifiedParts.filter((p) => p.thirdRate >= 70).length;

  const bodyPartCardStatus: RiskLevel =
    totalPatients === 0
      ? "EMPTY"
      : !weakestBodyPart
      ? "WARNING"
      : weakestBodyPart.thirdRate >= 70
      ? "HEALTHY"
      : weakestBodyPart.patients < 2 || weakestBodyPart.thirdRate >= 50
      ? "WARNING"
      : "CRITICAL";

  const avgInterval =
    intervals.length > 0
      ? Number((intervals.reduce((a, b) => a + b, 0) / intervals.length).toFixed(1))
      : 0;
  const intervalStatus: RiskLevel =
    intervals.length === 0
      ? "EMPTY"
      : avgInterval <= 4.5
      ? "HEALTHY"
      : avgInterval <= 7.0
      ? "WARNING"
      : "CRITICAL";

  const resvDenom = resvYes + resvNo > 0 ? resvYes + resvNo : safeTotal;
  const resvRate = pct(resvYes, resvDenom);
  const targetResv = 85;
  const needResv = totalPatients === 0 ? 0 : neededCount(resvYes, resvDenom, targetResv);
  const resvLiftYes = pct(resvYes2nd, resvYes);
  const resvLiftNo = pct(resvNo2nd, resvNo);

  const reFirstRate = pct(reFirst, safeTotal);
  const targetReFirst = 30;
  const needReFirst = totalPatients === 0 ? 0 : neededCount(reFirst, totalPatients, targetReFirst);
  // 재초진 부족 인원 복귀 시 기대 진료비: 목표 정착 기준 평균 2.5회(초진1 + 2차0.8 + 3차0.7) × 가중 1회 진료비
  const gainReFirstManwon =
    totalPatients === 0 ? 0 : Math.round(needReFirst * 2.5 * avgVisitFeeManwon);

  // 65세 이상 고령 비율 초과 시 단가 차이(5만 - 2만 = 3만 원) 기반 기대효과
  const excessSenior65 = knownAge > 0 ? Math.max(0, senior65 - Math.floor(knownAge * 0.2)) : 0;
  const actualAvgVisits =
    totalPatients > 0
      ? Number((1 + secondCount / totalPatients + thirdCount / totalPatients).toFixed(1))
      : 2.5;
  const gainAge65Manwon =
    excessSenior65 > 0
      ? Math.round(excessSenior65 * actualAvgVisits * (UNDER65_FEE_MANWON - SENIOR65_FEE_MANWON))
      : 0;

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
  const mpi =
    demographic.totalPopulation > 0
      ? Number(((pureFirst / demographic.totalPopulation) * 1000).toFixed(2))
      : 0;

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
      modal: {
        exactCounts: `전체 신환 ${totalPatients}명 중 2회 내원 ${secondCount}명 (${rate2nd}%)`,
        benchmarkReason:
          "초진 10명 중 타지역 방문·단순 1회성 경증(약 2명, 20%)을 제외한 유효 치료 대상군 8명(80%↑)은 반드시 2회차 반응 확인으로 연결되어야 3차 정착률 70% 달성이 수학적으로 성립합니다 (Musculoskeletal Science & Practice 외래 미재방문 연구 근거).",
        riskWarning:
          "65% 미만 시 초기 치료 대상군마저 1회 시술로 이탈하는 '밑 빠진 독(Leaky Bucket)' 구조가 고착화됩니다.",
        actionInstruction:
          "초진 진료 마지막 30초에 원장님이 직접 '3회 집중 치료 원칙'을 선언하고 2~4일 내 2차 내원일을 확정하세요.",
        scriptExample:
          "\"오늘 첫 침·약침으로 급성 긴장을 풀었습니다. 3일 뒤 목요일에 오셔서 반응 확인 및 2단계 교정이 꼭 들어가야 합니다.\"",
        revenueImpactManwon: gain2ndManwon,
        formulaNote:
          need2nd > 0
            ? `${need2nd}명 부족 × 1회(2차 내원) × 평균 ${avgFeeStr}만 원 (65세↓ 5만·65세↑ 2만 원 가중단가)`
            : "목표 달성 완료",
      },
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
      modal: {
        exactCounts:
          recentUnder7DaysCount > 0
            ? `전체 신환 ${totalPatients}명 중 3회 완주 ${thirdCount}명 (${rate3rd}%) · ※ 최근 7일 이내 내원 진행중 ${recentUnder7DaysCount}명 포함`
            : `전체 신환 ${totalPatients}명 중 3회 이상 완주 ${thirdCount}명 (${rate3rd}%)`,
        benchmarkReason:
          "① 외래 재활·근골격 연구(Musculoskeletal Science & Practice)상 타지역·물리적 제약 및 단발성 자가호전 등 구조적 비대상군이 약 25~30%(10명 중 3명)이며, ② 보건복지부 한방의료이용실태조사상 내원객의 74% 이상인 근골격·만성질환군은 침 진통 반감기(24~72시간, Vickers et al. IPD 메타분석)와 치료동맹 형성(Horvath & Symonds)을 위해 나머지 7명(70%↑) 전원이 최소 3회 치료를 완주해야 합니다.",
        riskWarning:
          "2회차 후 통증이 절반 줄었다고 조기 중단(Self-Discharge)하면 속근육·인대 미회복으로 재발 후 타 병원으로 이탈하며 평판 손실이 발생합니다.",
        actionInstruction:
          "초진 첫날 '1회 급성완화 → 2회 원인교정 → 3회 조직안정화' 3회 치료 원칙을 고지하여 유효 환자 10명 중 7명을 3회차까지 완주시키세요.",
        scriptExample:
          "\"통증이 절반 줄었을 때 멈추면 금방 재발합니다. 최소 3회차까지는 속근육을 잡아드려야 안전하게 마무리됩니다.\"",
        revenueImpactManwon: gain3rdManwon,
        formulaNote:
          need3rd > 0
            ? `${need3rd}명 부족 × 1회(3차 내원, 2차분과 중복제외) × 평균 ${avgFeeStr}만 원 (65세↓ 5만·65세↑ 2만 원 가중단가)`
            : "목표 달성 완료",
      },
    },
    {
      id: "ins_bodypart_3rd",
      track: "insurance",
      order: 3,
      title: "진료부위별 삼진율",
      subMetric:
        bestBodyPart && totalPatients > 0
          ? `강점 ${bestBodyPart.shortName} ${bestBodyPart.thirdRate}%`
          : "부위 진단",
      currentValue: weakestBodyPart ? weakestBodyPart.thirdRate : 0,
      valueDisplay:
        totalPatients === 0
          ? "-"
          : !weakestBodyPart
          ? "부위 미기입"
          : weakestBodyPart.thirdRate >= 70
          ? `최저 ${weakestBodyPart.thirdRate}%`
          : `${weakestBodyPart.shortName} ${weakestBodyPart.thirdRate}%`,
      targetValue: 70,
      targetDisplay: "부위별 70%↑",
      gapDisplay:
        totalPatients === 0
          ? "데이터 대기"
          : !weakestBodyPart
          ? "진료내역 기입"
          : weakestBodyPart.thirdRate >= 70
          ? "전 부위 70%↑"
          : `통과 ${healthyBodyPartCount}/${qualifiedParts.length}부위`,
      status: bodyPartCardStatus,
      conclusion:
        totalPatients === 0
          ? "환자 시트를 업로드하세요"
          : !weakestBodyPart
          ? "진료내역에 통증 부위를 기입하세요"
          : weakestBodyPart.thirdRate >= 70
          ? `전 부위 우수 (최고 ${bestBodyPart?.shortName} ${bestBodyPart?.thirdRate}%)`
          : bestBodyPart && bestBodyPart.id !== weakestBodyPart.id
          ? `잘됨 ${bestBodyPart.shortName}(${bestBodyPart.thirdRate}%) · 보완 ${weakestBodyPart.shortName}(${weakestBodyPart.thirdRate}%)`
          : `${weakestBodyPart.label} 3회 티업 강화 (+${weakestBodyPart.neededFor70}명)`,
      modal: {
        exactCounts:
          bodyPartRetention.length > 0
            ? `${bodyPartRetention
                .map((p) => `${p.label} ${p.thirdRate}%(${p.thirdCount}/${p.patients}명)`)
                .join(" · ")}${
                unclassifiedBodyPartCount > 0 ? ` | 부위 미기입 ${unclassifiedBodyPartCount}명` : ""
              }`
            : "진료내역에서 통증·질환 부위가 확인된 환자가 아직 없습니다.",
        benchmarkReason:
          "전체 평균 3차 정착률만 보면 강점 질환이 취약 질환의 조기 이탈을 가리는 '평균의 착시(Simpson's Paradox)'가 발생합니다. 부위별 삼진율(목표 70%↑)을 분리해야 우리 한의원이 어떤 질환에서 신뢰가 높고 어떤 질환에서 1~2회 만에 놓치는지 정확히 타깃 교정할 수 있습니다.",
        riskWarning:
          weakestBodyPart && weakestBodyPart.thirdRate < 70
            ? `현재 '${weakestBodyPart.label}' 환자의 삼진율이 ${weakestBodyPart.thirdRate}%로 가장 낮습니다. ${weakestBodyPart.dropoutReason}`
            : "특정 부위(예: 발목 염좌, 단순 담결림, 손목·팔꿈치)에서 1회 치료 후 자가 종결이 누적되면 전체 정착률이 70% 아래로 무너집니다.",
        actionInstruction:
          weakestBodyPart && weakestBodyPart.thirdRate < 70
            ? `[최우선 보완: ${weakestBodyPart.label}] ${weakestBodyPart.prescriptionGuide}`
            : "하단 부위별 보드에서 각 질환 옆 ⓘ 아이콘을 눌러 질환별 맞춤 3회 티업 멘트를 진료실 표준으로 유지하세요.",
        scriptExample:
          weakestBodyPart?.scriptExample ||
          "\"통증이 줄어드는 것과 손상된 속근육·인대가 아무는 것은 다릅니다. 재발 방지를 위해 3회차까지는 꼭 체크하겠습니다.\"",
        revenueImpactManwon: 0,
        formulaNote: "※ 부위별 개선 기대금액은 '2차·3차 정착률' 항목에 통합 산출됨 (중복 합산 제외)",
      },
    },
    {
      id: "ins_golden_interval",
      track: "insurance",
      order: 4,
      title: "재내원 골든타임",
      subMetric: intervals.length > 0 ? `${intervals.length}명 측정` : "2회일 필요",
      currentValue: intervals.length > 0 ? Math.max(10, Math.min(100, Math.round((4.5 / Math.max(1, avgInterval)) * 75))) : 0,
      valueDisplay: intervals.length > 0 ? `${avgInterval}일` : "-",
      targetValue: 75,
      targetDisplay: "목표 4.5일 이내",
      gapDisplay:
        intervals.length === 0
          ? "재내원 집계전"
          : avgInterval <= 4.5
          ? "골든타임 합격"
          : `+${(avgInterval - 4.5).toFixed(1)}일 지연`,
      status: intervalStatus,
      conclusion:
        intervals.length === 0
          ? "2회 방문일 누적 시 자동 산출"
          : avgInterval <= 4.5
          ? "초기 집중 치료 주기 이상적"
          : "초진 후 3일 이내 2차 예약 당기기",
      modal: {
        exactCounts:
          intervals.length > 0
            ? `2회 내원자 ${intervals.length}명의 1→2회 평균 방문 간격 ${avgInterval}일`
            : "아직 1회·2회 날짜가 모두 기입된 환자가 없습니다.",
        benchmarkReason:
          "초진 후 72~96시간(3~4.5일) 이내가 침·약침 자극 반응이 유지되고 치료 동기가 살아있는 골든타임입니다.",
        riskWarning:
          "첫 방문 후 일주일 이상 간격이 벌어지면 환자의 치료 의지가 식어 노쇼 및 영구 이탈 확률이 2.4배 높아집니다.",
        actionInstruction:
          "초진 환자에게 '일주일 뒤에 오세요' 대신 무조건 2~4일 내 다음 내원 날짜를 먼저 제시하세요.",
        scriptExample:
          "\"초기 염증기에는 간격이 벌어지면 다시 원점으로 돌아갑니다. 이틀 뒤 수요일이나 목요일 중 언제가 괜찮으세요?\"",
        revenueImpactManwon: 0,
        formulaNote: "※ 내원 주기 단축 효과는 '2차·3차 정착률' 기대효과에 통합 반영 (중복 합산 제외)",
      },
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
      modal: {
        exactCounts: `예약 '유' ${resvYes}명 (2차 내원율 ${resvLiftYes}%) vs 예약 '무' ${resvNo}명 (2차 내원율 ${resvLiftNo}%)`,
        benchmarkReason:
          "행동경제학 디폴트 효과(Default Effect)에 따라, 수납 시 다음 예약 시간을 확정하는 것만으로 2차 내원율이 평균 2~3배 상승합니다.",
        riskWarning:
          "데스크에서 '시간 되실 때 오세요'라고 보내면 환자는 일상 복귀 후 재방문을 미루다 이탈합니다.",
        actionInstruction:
          "데스크 수납 표준 멘트를 '예약하시겠어요?(Yes/No)'에서 '목요일 오전/오후 중 언제가 편하세요?(양자택일)'로 즉시 변경하세요.",
        scriptExample:
          "\"원장님께서 금요일쯤 경과 체크 말씀하셨는데, 오전 11시와 오후 3시 중 어느 시간이 편하실까요?\"",
        revenueImpactManwon: 0,
        formulaNote: "※ 예약 확정에 따른 추가 내원 효과는 '2차·3차 정착률'에 통합 반영 (중복 합산 제외)",
      },
    },
    {
      id: "ins_refirst",
      track: "insurance",
      order: 6,
      title: "재초진 복귀율",
      subMetric: `재초진 ${reFirst}명`,
      currentValue: reFirstRate,
      valueDisplay: totalPatients === 0 ? "-" : `${reFirstRate}%`,
      targetValue: targetReFirst,
      targetDisplay: `목표 ${targetReFirst}%↑`,
      gapDisplay:
        totalPatients === 0
          ? "데이터 대기"
          : needReFirst === 0
          ? `달성 +${(reFirstRate - targetReFirst).toFixed(1)}%p`
          : `${needReFirst}명 부족`,
      status:
        totalPatients === 0
          ? "EMPTY"
          : reFirstRate >= targetReFirst
          ? "HEALTHY"
          : reFirstRate >= 18
          ? "WARNING"
          : "CRITICAL",
      conclusion:
        totalPatients === 0
          ? "초진/재초진 구분을 확인하세요"
          : needReFirst === 0
          ? "구환 재방문 브랜드 자산 우수"
          : "기존 환자 계절·안부 리콜 가동",
      modal: {
        exactCounts: `전체 신환 ${totalPatients}명 중 순수초진 ${pureFirst}명 · 재초진 ${reFirst}명 (${reFirstRate}%)`,
        benchmarkReason:
          "과거 치료에 만족했던 구환이 새로운 증상이나 환절기에 다시 찾는 비율(30%↑)은 마케팅 비용 0원의 순수 브랜드 자산입니다.",
        riskWarning:
          "재초진 비중이 18% 미만이면 과거 환자들이 우리 한의원을 잊었거나 타 한의원으로 이동하고 있다는 신호입니다.",
        actionInstruction:
          "최근 6개월~1년 내 내원 중단 구환에게 환절기 건강 관리 문자나 카카오톡 채널 소식을 월 1회 발송하세요.",
        scriptExample:
          "\"[OO한의원] 일교차가 큰 환절기입니다. 지난번 치료받으셨던 허리/어깨 컨디션은 어떠신지 안부 인사드립니다.\"",
        revenueImpactManwon: gainReFirstManwon,
        formulaNote:
          needReFirst > 0
            ? `${needReFirst}명 부족 × 평균 2.5회(초진1+재진1.5) × 평균 ${avgFeeStr}만 원 (65세↓ 5만·65세↑ 2만 원 가중단가)`
            : "목표 달성 완료",
      },
    },
    {
      id: "ins_age_65_ratio",
      track: "insurance",
      order: 7,
      title: "65세 연령 비율",
      subMetric: knownAge > 0 ? `65세↑ ${seniorRate}%` : "나이 미기입",
      currentValue: under65Rate,
      valueDisplay: knownAge === 0 ? "나이 미기입" : `65세↓ ${under65Rate}%`,
      targetValue: 80,
      targetDisplay: "목표 65세↓ 80%↑ (고령 20%↓)",
      gapDisplay:
        knownAge === 0
          ? "나이 입력 필요"
          : seniorRate <= 20
          ? `황금비율 (고령 ${seniorRate}%)`
          : `동네고령 ${regSenior}% · GDI ${gdi}배`,
      status: age65Status,
      conclusion:
        knownAge === 0
          ? "차트 연령(나이) 항목을 포함하세요"
          : seniorRate <= 20
          ? "65세↓ 80% 이상 황금 연령대 유지"
          : seniorRate <= ageWarningCap
          ? `2050 청장년 초진 +${needUnder65}명 보강 권장`
          : "고령 편중 위험 · 젊은 신환 유입 시급",
      modal: {
        exactCounts: `연령 확인 ${knownAge}명 중 [65세 미만 ${under65Count}명(${under65Rate}%, 1회 5만원) : 65세 이상 ${senior65}명(${seniorRate}%, 1회 2만원)] | 세부: 순수초진 고령비율 ${pureFirstSeniorRate}% (${pureFirstSenior65}/${pureFirstKnownAge}명) · 재초진 고령비율 ${reFirstSeniorRate}% (${reFirstSenior65}/${reFirstKnownAge}명) | 동네 실제 65세↑ 인구비율 ${regSenior}% (GDI ${gdi || "-"}배)`,
        benchmarkReason:
          `1회 평균 진료비가 65세 미만(5만 원)과 65세 이상(2만 원, 노인정액구간)에서 2.5배 차이나고 고령층의 베드 점유 승수가 3배에 달하므로, 초진·재초진 인원 기준 '65세 미만 80% : 65세 이상 20% 이하(가중 1회 단가 4.4만 원)'가 한의원 활력과 수익성을 지키는 황금 기준점입니다. (단, ${demographic.regionName} 고령화율 ${regSenior}% 특성상 최대 상한 마지노선은 ${ageWarningCap}%로 보정)`,
        riskWarning:
          "초진 인원 중 65세 이상이 30%를 넘으면 방문 빈도 승수 효과로 실제 대기실·치료베드 점유율은 65~70%가 고령층으로 채워지며, 경제학 구축 효과(Crowding-Out)로 인해 고부가가치 20~50대 환자가 이탈합니다.",
        actionInstruction:
          "순수초진의 65세 이상 비중이 20%를 초과한다면 야간/점심 직장인 추나·약침, 교통사고, 소아·여성·다이어트 키워드 노출을 보강해 20~50대 신환 비율을 80% 선으로 맞추세요.",
        scriptExample:
          "\"어머님 치료 오실 때 직장 다니는 자녀분들 목·어깨 추나나 피로회복 보약도 저녁 진료 시간에 편하게 예약해 주세요.\"",
        revenueImpactManwon: gainAge65Manwon,
        formulaNote:
          excessSenior65 > 0
            ? `고령 20% 초과분 ${excessSenior65}명 × 단가차액 3만 원(65세↓ 5만 - 65세↑ 2만) × 평균 ${actualAvgVisits}회 내원`
            : "65세↓ 80% : 65세↑ 20% 황금비율 기준 충족",
      },
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
      modal: {
        exactCounts: `성별 집계: 남성 ${effectiveMale}명(${genderSum > 0 ? (100 - femaleRate).toFixed(1) : 0}%) · 여성 ${effectiveFemale}명(${femaleRate}%) · 시트 미기입 ${unrecordedGender}명 | 동네 여성 인구비율 ${demographic.femaleRatio}%`,
        benchmarkReason:
          "보건복지부 한방의료이용실태조사 및 가계 의료 의사결정 연구상, 여성 환자 비율이 54~66% 구간일 때 배우자·자녀·부모님으로 이어지는 가족 연쇄 소개율이 극대화됩니다.",
        riskWarning:
          "여성 비율이 48% 미만이면 단발성 통증 치료에 그쳐 가족 보약·소아·다이어트 등 고단가 비급여 확장성이 크게 떨어집니다.",
        actionInstruction:
          "시트 또는 카드 내 성별 입력란으로 남녀 비율을 관리하고, 파우더룸·프라이빗 베드·여성 특화 상담 등 여성 친화 접점을 점검하세요.",
        scriptExample:
          "\"환자분 체질에 맞춘 순환·수족냉증 케어도 함께 도와드리고 있으니 불편하신 점 편하게 말씀해 주세요.\"",
        revenueImpactManwon: 0,
        formulaNote: "※ 성별 균형은 소개·비급여 확장의 기반 지표로 직접 진료비 합산에서는 제외",
      },
    },
    {
      id: "ins_route_referral",
      track: "insurance",
      order: 9,
      title: "순수초진 소개율 (7:3)",
      subMetric: pureFirstRouteRecorded > 0 ? `신규창출 ${externalSeedRate}%` : `MPI ${mpi}‰`,
      currentValue: referralRate,
      valueDisplay: pureFirstRouteRecorded === 0 ? "경로 미기입" : `소개 ${referralRate}%`,
      targetValue: targetReferral,
      targetDisplay: "목표 소개 70% · 신규 30%",
      gapDisplay:
        pureFirstRouteRecorded === 0
          ? "경로 체크 필요"
          : referralRate > 85 && mpi < district.mpiMin
          ? "외부 신규창출 보강"
          : needReferral === 0
          ? `7:3 달성 (+${(referralRate - targetReferral).toFixed(1)}%p)`
          : `소개 ${needReferral}명 부족`,
      status:
        pureFirstRouteRecorded === 0
          ? "WARNING"
          : referralRate > 85 && mpi < district.mpiMin
          ? "WARNING"
          : referralRate >= targetReferral
          ? "HEALTHY"
          : referralRate >= 40
          ? "WARNING"
          : "CRITICAL",
      conclusion:
        pureFirstRouteRecorded === 0
          ? "접수 시 내원경로 단축키 필수 체크"
          : referralRate > 85 && mpi < district.mpiMin
          ? "광고·검색 투자로 30% 신규환자 창출"
          : needReferral === 0
          ? "소개 70% : 신규창출 30% 황금구조"
          : `만족·소개 축적 중 (+${needReferral}명 목표)`,
      modal: {
        exactCounts: `순수초진(경로확인) ${pureFirstRouteRecorded}명 중 [지인·가족 소개 ${pureFirstReferral}명(${referralRate}%) : 외부 신규창출 ${externalSeedCount}명(${externalSeedRate}% — 간판·도보 ${pureFirstWalkIn}명 + 광고·검색·블로그 ${pureFirstDigital}명)] ※ 재초진 ${reFirst}명은 분모 왜곡 방지를 위해 별도 분리 | 동네 인구 대비 침투율 MPI ${mpi}‰ (권장 ${district.mpiMin}~${district.mpiMax}‰)`,
        benchmarkReason:
          "Bass 확산 모델(누적 단골 복리 이론)에 따라, 개원 초기·광고 확장기(1~3년)에는 외부 유입 투자로 일시적으로 30~50% 구간이 나타나지만, 3차 정착(70%)과 재초진 단골 자산(Stock)이 5~10년 축적되면 생애 첫 방문자(순수초진)의 70%가 소개로 유입되고 나머지 30%는 광고·블로그·플레이스·간판 투자로 신규 씨앗 환자를 창출하는 '7:3 황금 균형점'에 수렴합니다.",
        riskWarning:
          "40% 미만이면 진료 만족도가 구전으로 이어지지 않는 상태이며, 반대로 신환 총수(MPI)가 낮은데 소개만 85%를 넘으면 외부 신규 씨앗(30% 광고·검색 창출) 투자가 멈춰 환자층이 고립·노후화됩니다.",
        actionInstruction:
          "소개 환자에게는 원장님 직접 감사 인사로 만족도 복리를 가속하고, 동시에 전체 순수초진의 20~30%는 블로그·플레이스·홈페이지·간판을 통해 새로운 씨앗 환자가 꾸준히 유입되도록 마케팅을 유지하세요.",
        scriptExample:
          "\"OOO님 소개로 오셨군요! 믿고 찾아주신 만큼 3회 치료 원칙으로 확실히 호전시켜 드리겠습니다.\"",
        revenueImpactManwon: 0,
        formulaNote: "※ 내원경로 비중(7:3) 지표로 기존 정착·재초진 기대효과와 중복 합산하지 않음",
      },
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

  return {
    evaluatedAt: new Date().toISOString(),
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
    bodyPartRetention,
    unclassifiedBodyPartCount,
    insurance: buildTrackSummary("insurance", "보험 (원장)", insIndicators),
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
