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
  revenueImpactManwon: number;   // 목표 도달 시 월 예상 추가 매출(만원)
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
  potentialBreakdown: { label: string; gainManwon: number; detail: string }[];
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

  let recordedMale = 0;
  let recordedFemale = 0;

  let routeRecorded = 0;
  let routeReferral = 0;
  let routeOrganicWalk = 0;
  let routeDigital = 0;

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

    const ageNum = parseInt(clean(r.age).replace(/[^0-9]/g, ""), 10);
    if (!isNaN(ageNum) && ageNum > 0) {
      knownAge++;
      if (ageNum >= 65) senior65++;
    }

    const g = clean(r.gender);
    if (/^(남|남자|남성|M)$/i.test(g)) recordedMale++;
    else if (/^(여|여자|여성|F)$/i.test(g)) recordedFemale++;

    const rt = clean(r.visitRoute).toLowerCase().replace(/\s+/g, "");
    if (rt) {
      routeRecorded++;
      if (/소개|지인|가족|추천/.test(rt)) routeReferral++;
      else if (/간판|지나가|근처|동네|인근|거주|도보/.test(rt)) routeOrganicWalk++;
      else routeDigital++;
    }

    // 비급여(실장) 판별
    const detail = clean(r.treatmentDetail);
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
  // TRACK 1: 보험 (원장) — 내원경로까지 7대 핵심 지표
  // (10명 중 타지역·1회성 경증 2~3명 제외, 유효 치료군 8명 2차 내원[80%↑] → 7명 3차 완주[70%↑] 기준)
  // =========================================================================
  const todayISO = new Date().toISOString().slice(0, 10);
  const recentUnder7DaysCount = rows.filter((r) => {
    const d = daysBetweenISO(r.firstVisitISO || r.visitDateISO, todayISO);
    return d !== null && d < 7 && !clean(r.thirdVisitDate);
  }).length;

  const rate2nd = pct(secondCount, safeTotal);
  const target2nd = 80;
  const need2nd = neededCount(secondCount, totalPatients, target2nd);
  const gain2ndManwon = Math.round(need2nd * 2.5 * 3.5); // 정착 1명당 평균 후속 2.5회 * 3.5만원

  const rate3rd = pct(thirdCount, safeTotal);
  const target3rd = 70;
  const need3rd = neededCount(thirdCount, totalPatients, target3rd);
  const gain3rdManwon = Math.round(need3rd * 3.0 * 3.8);

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
  const needResv = neededCount(resvYes, resvDenom, targetResv);
  const resvLiftYes = pct(resvYes2nd, resvYes);
  const resvLiftNo = pct(resvNo2nd, resvNo);
  const gainResvManwon = Math.round(needResv * 0.5 * 7); // 예약 확정 시 절반 이상 추가 내원

  const reFirstRate = pct(reFirst, safeTotal);
  const targetReFirst = 30;
  const needReFirst = neededCount(reFirst, totalPatients, targetReFirst);

  const seniorRate = knownAge > 0 ? pct(senior65, knownAge) : 0;
  const regSenior = demographic.seniorRatio || 16;
  const gdi = regSenior > 0 && knownAge > 0 ? Number((seniorRate / regSenior).toFixed(2)) : 0;
  const gdiStatus: RiskLevel =
    knownAge === 0
      ? "EMPTY"
      : gdi >= 0.8 && gdi <= 1.35
      ? "HEALTHY"
      : gdi >= 0.6 && gdi <= 1.65
      ? "WARNING"
      : "CRITICAL";

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

  const organicShare = routeRecorded > 0 ? pct(routeReferral + routeOrganicWalk, routeRecorded) : 0;
  const referralRate = pct(routeReferral, routeRecorded || safeTotal);
  const targetReferral = 25;
  const needReferral = neededCount(routeReferral, routeRecorded || totalPatients, targetReferral);
  const mpi =
    demographic.totalPopulation > 0
      ? Number(((pureFirst / demographic.totalPopulation) * 1000).toFixed(2))
      : 0;
  const gainReferralManwon = Math.round(needReferral * 12); // 소개 신환 1명 평균 기대가치 12만원

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
      },
    },
    {
      id: "ins_golden_interval",
      track: "insurance",
      order: 3,
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
        revenueImpactManwon: avgInterval > 4.5 ? 60 : 0,
      },
    },
    {
      id: "ins_reservation",
      track: "insurance",
      order: 4,
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
        revenueImpactManwon: gainResvManwon,
      },
    },
    {
      id: "ins_refirst",
      track: "insurance",
      order: 5,
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
        revenueImpactManwon: needReFirst * 9,
      },
    },
    {
      id: "ins_gender_age",
      track: "insurance",
      order: 6,
      title: "성별 · 고령 균형",
      subMetric: `동네고령 ${regSenior}%`,
      currentValue: genderSum > 0 ? femaleRate : seniorRate,
      valueDisplay:
        genderSum > 0 ? `여 ${femaleRate}%` : knownAge > 0 ? `65세↑ ${seniorRate}%` : "성별 미입력",
      targetValue: 58,
      targetDisplay: `여 54~66% · GDI 1.0`,
      gapDisplay:
        genderSum === 0
          ? "성별 입력 필요"
          : gdi > 0
          ? `고령지수 ${gdi}배`
          : `남${effectiveMale}·여${effectiveFemale}`,
      status: genderSum === 0 ? "WARNING" : genderStatus === "CRITICAL" || gdiStatus === "CRITICAL" ? "CRITICAL" : genderStatus === "WARNING" || gdiStatus === "WARNING" ? "WARNING" : "HEALTHY",
      conclusion:
        genderSum === 0
          ? "하단 성별란에 남/여 인원 입력"
          : gdi > 1.5
          ? "고령 편중 · 3040 직장인 유입 보강"
          : femaleRate < 50
          ? "여성·가족 친화 진료프로그램 보강"
          : "동네 인구 대비 성별·연령 균형 양호",
      isGenderCard: true,
      modal: {
        exactCounts: `성별: 남성 ${effectiveMale}명 · 여성 ${effectiveFemale}명 (미기입 ${unrecordedGender}명) / 65세↑ 고령: ${senior65}명 (${seniorRate}%, 동네 ${regSenior}% 대비 GDI ${gdi || "-"}배)`,
        benchmarkReason:
          `${demographic.regionName} 실제 인구(여성 ${demographic.femaleRatio}%, 65세↑ ${regSenior}%) 대비 한의원 적정 여성 비율은 54~66%(가계 의료 결정권자), 고령화 왜곡지수(GDI)는 0.8~1.3배입니다.`,
        riskWarning:
          "GDI가 1.6배를 넘으면 노인 급여 침 위주로 고착되어 객단가가 하락하고, 여성 비율이 50% 미만이면 가족 연쇄 소개 및 비급여 확장성이 크게 떨어집니다.",
        actionInstruction:
          "차트나 시트에 성별을 기입(또는 카드에서 즉시 입력)하여 동네 인구 구조와 우리 한의원 환자층의 괴리를 상시 점검하세요.",
        scriptExample:
          "\"어머님 치료 오실 때 따님이나 아드님 거북목·보약 상담도 편하게 같이 말씀해 주세요.\"",
        revenueImpactManwon: genderStatus !== "HEALTHY" || gdiStatus !== "HEALTHY" ? 80 : 0,
      },
    },
    {
      id: "ins_route_referral",
      track: "insurance",
      order: 7,
      title: "소개 · 자생 유입률",
      subMetric: `MPI ${mpi}‰`,
      currentValue: referralRate,
      valueDisplay: routeRecorded === 0 ? "경로 미기입" : `소개 ${referralRate}%`,
      targetValue: targetReferral,
      targetDisplay: `소개 ${targetReferral}%↑ (자생 55%↑)`,
      gapDisplay:
        routeRecorded === 0
          ? "경로 체크 필요"
          : needReferral === 0
          ? `자생력 ${organicShare}%`
          : `소개 ${needReferral}명 부족`,
      status:
        routeRecorded === 0
          ? "WARNING"
          : referralRate >= targetReferral && organicShare >= 50
          ? "HEALTHY"
          : referralRate >= 15
          ? "WARNING"
          : "CRITICAL",
      conclusion:
        routeRecorded === 0
          ? "접수 시 내원경로 단축키 필수 체크"
          : needReferral === 0
          ? "입소문·자생 유입 포트폴리오 탄탄"
          : `소개 감사인사 강화 (+${needReferral}명 목표)`,
      modal: {
        exactCounts: `경로 기록 ${routeRecorded}명 중 소개 ${routeReferral}명(${referralRate}%), 간판·인근 ${routeOrganicWalk}명, 온라인·검색 ${routeDigital}명 | 동네 인구(${demographic.totalPopulation.toLocaleString()}명) 대비 월 침투율 MPI ${mpi}‰ (권장 ${district.mpiMin}~${district.mpiMax}‰)`,
        benchmarkReason:
          "Markowitz 포트폴리오 이론 및 NPS 연구상, 소개 환자(25%↑)와 오가닉 유입(55%↑)이 뒷받침되어야 네이버·광고 알고리즘 변동에도 매출이 흔들리지 않습니다.",
        riskWarning:
          "소개율 15% 미만 또는 유료 광고 편중 시 마케팅 비용이 순이익을 잠식하며 초진 이탈률이 급증합니다.",
        actionInstruction:
          "접수 시 내원경로 기록률을 90% 이상으로 올리고, 소개로 오신 환자와 소개해 주신 기존 환자 모두에게 원장님이 직접 감사 인사를 전하세요.",
        scriptExample:
          "\"OOO님 소개로 오셨군요! 믿고 소개해 주신 만큼 제가 더 세심하게 진료해 드리겠습니다.\"",
        revenueImpactManwon: gainReferralManwon,
      },
    },
  ];

  // =========================================================================
  // TRACK 2: 비급여 (실장) — 내원경로 이후 패키지·한약·비급여 6대 핵심 지표
  // =========================================================================
  const nonCovRate = pct(nonCovPatientCount, safeTotal);
  const targetNonCov = district.nonCovTarget;
  const needNonCov = neededCount(nonCovPatientCount, totalPatients, targetNonCov);
  const gainNonCovManwon = needNonCov * 18; // 비급여 전환 1건당 평균 18만원 가정

  const immBase = nonCovPatientCount > 0 ? nonCovPatientCount : safeTotal;
  const immRate = nonCovPatientCount > 0 ? pct(immediatePayPatients, nonCovPatientCount) : pct(immediatePayPatients, safeTotal);
  const targetImm = nonCovPatientCount > 0 ? 45 : 20;
  const needImm = neededCount(immediatePayPatients, immBase, targetImm);
  const gainImmManwon = needImm * 22;

  const herbalRate = pct(herbalPatients, safeTotal);
  const targetHerbal = district.herbalTarget;
  const needHerbal = neededCount(herbalPatients, totalPatients, targetHerbal);
  const gainHerbalManwon = needHerbal * 35; // 한약 1제 평균 35만원 가정

  const followupRate = herbalPatients > 0 ? pct(herbalFollowupYes, herbalPatients) : 0;
  const targetFollowup = 35;
  const needFollowup = herbalPatients > 0 ? neededCount(herbalFollowupYes, herbalPatients, targetFollowup) : 1;
  const gainFollowupManwon = needFollowup * 32;

  const pkgRate = pct(packagePatients, safeTotal);
  const pkgRenewRate = packagePatients > 0 ? pct(packageRenewYes, packagePatients) : 0;
  const targetPkgRenew = 30;
  const needPkgRenew = packagePatients > 0 ? neededCount(packageRenewYes, packagePatients, targetPkgRenew) : neededCount(packagePatients, totalPatients, 15);
  const gainPkgManwon = needPkgRenew * 20;

  const pendingPool = Math.max(1, totalPatients - immediatePayPatients);
  const delayedRate = pct(delayedPayPatients, pendingPool);
  const targetDelayed = 15;
  const needDelayed = neededCount(delayedPayPatients, pendingPool, targetDelayed);
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
        revenueImpactManwon: gainImmManwon,
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
      },
    },
  ];

  // --- 트랙별 종합 요약 산출 함수 ---
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

    // 가장 잠재 매출 임팩트가 크거나 시급한 1개 미션 자동 선정
    const priorityTarget =
      [...list]
        .filter((i) => i.status !== "HEALTHY")
        .sort((a, b) => b.modal.revenueImpactManwon - a.modal.revenueImpactManwon)[0] || list[0];

    const potentialBreakdown = list
      .filter((i) => i.modal.revenueImpactManwon > 0)
      .map((i) => ({
        label: i.title,
        gainManwon: i.modal.revenueImpactManwon,
        detail: `${i.valueDisplay} → ${i.targetDisplay} (${i.gapDisplay})`,
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
        ? `${priorityTarget.modal.actionInstruction} (예상 효과: 월 +${priorityTarget.modal.revenueImpactManwon}만 원)`
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
