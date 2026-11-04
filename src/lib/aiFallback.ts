import type { DataMetrics } from "@/context/DataContext";

/**
 * 동의보감 EMR 엑셀의 '총진료비' 컬럼이 급여 합계(청구금액 + 본인부담금 + 전액본인부담금)만 담고 있고
 * '비보험'(비급여) 금액이 제외된 경우, 실제 총 발생 매출(급여 + 비급여)을 멱등(Idempotent)하게 산출합니다.
 */
export function getNormalizedDonguibogamTotal(d?: {
  totalRevenue?: number;
  insuranceClaim?: number;
  copay?: number;
  fullCopay?: number;
  nonCovered?: number;
} | null): number {
  if (!d) return 0;
  const rawTotal = Number(d.totalRevenue) || 0;
  const coveredSum =
    (Number(d.insuranceClaim) || 0) +
    (Number(d.copay) || 0) +
    (Number(d.fullCopay) || 0);
  const nonCovered = Number(d.nonCovered) || 0;

  if (coveredSum > 0 && Math.abs(rawTotal - coveredSum) <= 100) {
    return coveredSum + nonCovered;
  }
  return rawTotal;
}

/**
 * 브라우저 localStorage 또는 응답 문자열이 과거 API 오류로 오염된 데이터인지 판별합니다.
 */
export function isCorruptedAiCache(raw: string | null | undefined): boolean {
  if (!raw || typeof raw !== "string") return true;
  const trimmed = raw.trim();
  if (trimmed.length < 20) return true;
  const errorPatterns = [
    "데이터 추세 분석 중 오류가 발생했습니다",
    "현재 데이터를 분석하는 중 오류가 발생했습니다",
    "데이터를 분석하는 중 오류가 발생했습니다",
    "API 한도 초과",
    "결제 한도가 초과",
    "API 설정 확인",
    "\"statusPill\":\"Error\"",
    "\"statusPill\": \"Error\"",
    "prepayment credits are depleted",
  ];
  return errorPatterns.some((pat) => trimmed.includes(pat));
}

function clampScore(v: number): number {
  return Math.max(35, Math.min(98, Math.round(v)));
}

/**
 * 다중 월 데이터 기반 정량 통계 경영 전략 브리핑 생성기 (100% 무중단 Fallback 엔진)
 */
export function buildFallbackStrategicBriefing(
  history: { month: string; metrics: DataMetrics }[],
  emrType?: string
): string {
  const sorted = [...(history || [])].sort((a, b) => a.month.localeCompare(b.month));
  if (sorted.length === 0) {
    return JSON.stringify({
      summary: {
        headline: "분석할 월별 데이터가 없습니다. 먼저 매출 통계를 업로드해 주세요.",
        statusPill: "안정화 단계",
        healthScores: { profitability: 50, stability: 50, growth: 50, patientFlow: 50, efficiency: 50 },
      },
      executiveInsights: [],
      actionPlan: [],
      recommendedVideoKeyword: "1등 상담 화법",
      detailedAnalysis: "업로드된 경영 데이터가 확인되지 않습니다.",
      isFallback: true,
    });
  }

  const emrLabel =
    emrType === "hanchart"
      ? "한차트"
      : emrType === "okchart"
      ? "오케이차트"
      : emrType === "hanisarang"
      ? "한의사랑"
      : emrType === "donguibogam"
      ? "동의보감"
      : "통합 EMR";

  const rows = sorted.map((h) => {
    const m = h.metrics;
    const isHanchart = !!m?.hanchartData && m.hanchartData.length > 0;
    const hcTotal = isHanchart
      ? m.hanchartData!.reduce((acc, c) => acc + (Number(c.totalRevenue) || 0), 0)
      : 0;
    const hcNonCov = isHanchart
      ? m.hanchartData!.reduce((acc, c) => acc + (Number(c.nonTaxable) || 0) + (Number(c.taxable) || 0), 0)
      : 0;

    const donguiTotal = m?.donguibogamData ? getNormalizedDonguibogamTotal(m.donguibogamData) : 0;
    const totalRev = donguiTotal || Number(m?.generatedRevenue?.total) || hcTotal || 0;
    const nonCov =
      Number(m?.donguibogamData?.nonCovered) ||
      Number(m?.generatedRevenue?.nonCovered) ||
      hcNonCov ||
      0;
    const coveredRev = Math.max(0, totalRev - nonCov);
    const totalPatients =
      (m?.donguibogamData
        ? (Number(m.donguibogamData.newPatients) || 0) +
          (Number(m.donguibogamData.recurringPatients) || 0) +
          (Number(m.donguibogamData.referralPatients) || 0)
        : 0) ||
      Number(m?.patientMetrics?.total) ||
      0;
    const newPatients =
      Number(m?.donguibogamData?.newPatients) || Number(m?.patientMetrics?.new) || 0;
    const arpu = totalPatients > 0 ? Math.round(totalRev / totalPatients) : 0;

    return {
      month: h.month,
      totalRev,
      nonCov,
      coveredRev,
      totalPatients,
      newPatients,
      arpu,
    };
  });

  const first = rows[0];
  const last = rows[rows.length - 1];
  const prev = rows.length >= 2 ? rows[rows.length - 2] : first;

  const sumRev = rows.reduce((s, r) => s + r.totalRev, 0);
  const sumNonCov = rows.reduce((s, r) => s + r.nonCov, 0);
  const sumPatients = rows.reduce((s, r) => s + r.totalPatients, 0);
  const sumNewPatients = rows.reduce((s, r) => s + r.newPatients, 0);

  const avgRev = Math.round(sumRev / rows.length);
  const nonCovRatio = sumRev > 0 ? (sumNonCov / sumRev) * 100 : 0;
  const newPatientRatio = sumPatients > 0 ? (sumNewPatients / sumPatients) * 100 : 0;
  const avgArpu = sumPatients > 0 ? Math.round(sumRev / sumPatients) : 0;

  const periodGrowthPct =
    first.totalRev > 0 ? ((last.totalRev - first.totalRev) / first.totalRev) * 100 : 0;
  const momGrowthPct =
    prev.totalRev > 0 ? ((last.totalRev - prev.totalRev) / prev.totalRev) * 100 : 0;

  const peakRow = [...rows].sort((a, b) => b.totalRev - a.totalRev)[0];
  const troughRow = [...rows].sort((a, b) => a.totalRev - b.totalRev)[0];

  const statusPill =
    periodGrowthPct >= 10
      ? "성장 가속"
      : periodGrowthPct <= -8
      ? "리스크 관리"
      : nonCovRatio >= 40
      ? "공격적 확장"
      : "안정화 단계";

  const healthScores = {
    profitability: clampScore(55 + nonCovRatio * 0.7),
    stability: clampScore(82 - Math.min(30, Math.abs(momGrowthPct) * 0.8)),
    growth: clampScore(68 + periodGrowthPct * 0.9),
    patientFlow: clampScore(55 + newPatientRatio * 1.8),
    efficiency: clampScore(50 + Math.min(45, avgArpu / 2500)),
  };

  let recommendedVideoKeyword = "1등 상담 화법";
  if (nonCovRatio < 28) {
    recommendedVideoKeyword = "클로징 성공 기술";
  } else if (newPatientRatio < 12) {
    recommendedVideoKeyword = "고객 유입 마케팅 공식";
  } else if (momGrowthPct < -5) {
    recommendedVideoKeyword = "입소문 마케팅 비결";
  }

  const headline =
    periodGrowthPct >= 5
      ? `${first.month} 대비 ${periodGrowthPct.toFixed(1)}% 성장세 달성, 비급여 비중(${nonCovRatio.toFixed(1)}%) 고도화로 수익성 극대화 시점`
      : periodGrowthPct <= -5
      ? `최근 매출 변동폭(${periodGrowthPct.toFixed(1)}%) 방어를 위한 재진 정착률 및 초진 상담 전환 집중 점검 필요`
      : `월평균 ${(avgRev / 10000).toFixed(0)}만 원 안정권 유지 중, 객단가(${avgArpu.toLocaleString()}원) 상승을 통한 2차 도약 구간`;

  const detailedAnalysis = [
    `### 1. ${emrLabel} 기간 종합 성과 브리핑 (${first.month} ~ ${last.month}, 총 ${rows.length}개월)`,
    `- **누적 총 발생 매출**: **${sumRev.toLocaleString()}원** (월평균 **${avgRev.toLocaleString()}원**)`,
    `- **최근 월(${last.month}) 실적**: 총 매출 **${last.totalRev.toLocaleString()}원** (직전 월 대비 **${momGrowthPct >= 0 ? "+" : ""}${momGrowthPct.toFixed(1)}%**, 시작 월 대비 **${periodGrowthPct >= 0 ? "+" : ""}${periodGrowthPct.toFixed(1)}%**)`,
    `- **최고 실적 월**: **${peakRow.month}** (${peakRow.totalRev.toLocaleString()}원) / **최저 실적 월**: **${troughRow.month}** (${troughRow.totalRev.toLocaleString()}원)`,
    ``,
    `### 2. 급여·비급여 수익 포트폴리오 및 객단가 진단`,
    `- **비급여 누적 매출**: **${sumNonCov.toLocaleString()}원**으로 전체 매출 대비 **${nonCovRatio.toFixed(1)}%** 비중을 차지하고 있습니다.`,
    `- **환자 1인당 평균 객단가(ARPU)**: **${avgArpu.toLocaleString()}원** (최근 월 ${last.month} 기준 **${last.arpu.toLocaleString()}원**)`,
    nonCovRatio >= 35
      ? `- 비급여 매출 구조가 탄탄하게 뒷받침되고 있어 건강보험 청구 변동에도 수익 방어력이 우수한 편입니다. 고단가 한약·약침 프로그램의 재등록 주기를 체계화하면 추가 마진율을 확보할 수 있습니다.`
      : `- 급여 진료 의존도가 **${(100 - nonCovRatio).toFixed(1)}%**로 다소 높은 구조입니다. 내원 환자수가 유지되더라도 비급여 전환율이 뒷받침되지 않으면 원장님의 진료 피로도 대비 순이익률이 정체될 수 있으므로 초진 상담 프로토콜 개선이 필요합니다.`,
    ``,
    `### 3. 환자 유입 및 재진 정착 흐름 분석`,
    `- **기간 누적 내원 환자**: 총 **${sumPatients.toLocaleString()}명** (월평균 **${Math.round(sumPatients / rows.length).toLocaleString()}명**)`,
    `- **신규 환자(초진) 유입**: 총 **${sumNewPatients.toLocaleString()}명** (전체 내원 대비 신환 비중 **${newPatientRatio.toFixed(1)}%**)`,
    newPatientRatio >= 14
      ? `- 신규 환자 유입 비율(${newPatientRatio.toFixed(1)}%)이 양호합니다. 현재 가장 중요한 레버리지는 유입된 초진 환자가 2~3회차 내원 시 치료 종결 없이 **집중 치료 프로그램으로 안착하도록 해피콜 및 예약 리마인드율을 높이는 것**입니다.`
      : `- 기존 재진 환자층의 충성도는 안정적이나 신규 유입 비중(${newPatientRatio.toFixed(1)}%) 보강이 필요합니다. 네이버 플레이스 리뷰 관리 및 기존 만족 환자 지인 소개 리워드 동선을 점검해 신환 모수를 확대해야 합니다.`,
    ``,
    `### 4. 원장님 맞춤 핵심 경영 제언`,
    `1. **단기 수익 레버리지**: 최고 매출을 기록했던 **${peakRow.month}**의 주요 처방 구성과 초진 비급여 동의 패턴을 기준점(Benchmark)으로 삼아 이번 달 목표치를 설정하십시오.`,
    `2. **상담 및 데스크 표준화**: 진료실 티칭 멘트와 상담/수납 데스크의 안내 스크립트를 일치시켜 비급여 제안 저항감을 낮추고 예약 부도율(No-Show)을 최소화하시기 바랍니다.`,
  ].join("\n");

  const payload = {
    summary: {
      headline,
      statusPill,
      healthScores,
    },
    executiveInsights: [
      {
        title: "기간 매출 추세 및 변동성",
        content: `${first.month} 대비 최근 월(${last.month}) 매출이 ${periodGrowthPct >= 0 ? "+" : ""}${periodGrowthPct.toFixed(1)}% 흐름을 보이며 월평균 ${avgRev.toLocaleString()}원을 기록했습니다.`,
        impact: "매우 높음",
      },
      {
        title: "수익 구조(비급여 비중) 진단",
        content: `전체 발생 매출 중 비급여 비중은 ${nonCovRatio.toFixed(1)}%, 평균 객단가는 ${avgArpu.toLocaleString()}원으로 집계되었습니다.`,
        impact: "매우 높음",
      },
      {
        title: "환자 유입·정착 밸런스",
        content: `월평균 ${Math.round(sumPatients / rows.length).toLocaleString()}명 내원 중 신환 비중은 ${newPatientRatio.toFixed(1)}%로 초진 이후 재진 정착 관리가 핵심 지표입니다.`,
        impact: "높음",
      },
    ],
    actionPlan: [
      {
        phase: "1단계: 준비",
        task: `초진 환자 예진표 및 원장실 티칭-데스크 클로징 2단계 상담 동선 표준화 점검 (현재 비급여 비중 ${nonCovRatio.toFixed(1)}%)`,
        expectedEffect: "초진 비급여 전환율 +10~15% 개선",
      },
      {
        phase: "2단계: 실행",
        task: `초진 내원 후 48시간 이내 해피콜 밀착 케어 및 차기 예약 확정 프로세스 가동 (월 신환 평균 ${Math.round(sumNewPatients / rows.length)}명 집중 관리)`,
        expectedEffect: "2~3회차 재진 정착률 상승 및 이탈 방어",
      },
      {
        phase: "3단계: 고도화",
        task: `최고 성과 월(${peakRow.month}) 기준 주력 비급여 패키지 리마인드 및 지인 소개 바이럴 캠페인 정례화`,
        expectedEffect: `월 매출 ${(Math.round((avgRev * 1.15) / 10000)).toLocaleString()}만 원권 안착 목표`,
      },
    ],
    recommendedVideoKeyword,
    detailedAnalysis,
    isFallback: true,
  };

  return JSON.stringify(payload);
}

/**
 * 단일 월 경영 진단 Fallback 생성기
 */
export function buildFallbackClinicInsight(data: DataMetrics): string {
  const donguiTotal = data?.donguibogamData
    ? getNormalizedDonguibogamTotal(data.donguibogamData)
    : 0;
  const totalRev = donguiTotal || Number(data?.generatedRevenue?.total) || 0;
  const nonCoveredRev =
    Number(data?.donguibogamData?.nonCovered) ||
    Number(data?.generatedRevenue?.nonCovered) ||
    0;
  const totalPatients =
    Number(data?.donguibogamData?.totalPatients) ||
    Number(data?.patientMetrics?.total) ||
    0;
  const newPatients =
    Number(data?.donguibogamData?.newPatients) ||
    Number(data?.patientMetrics?.new) ||
    0;
  const nonCovPct = totalRev > 0 ? ((nonCoveredRev / totalRev) * 100).toFixed(1) : "0.0";
  const arpu = totalPatients > 0 ? Math.round(totalRev / totalPatients) : 0;

  return JSON.stringify({
    summary: `총 매출 ${totalRev.toLocaleString()}원 · 비급여 비중 ${nonCovPct}% · 평균 객단가 ${arpu.toLocaleString()}원`,
    detailedAnalysis: `이번 달 총 발생 매출은 **${totalRev.toLocaleString()}원**(비급여 **${nonCoveredRev.toLocaleString()}원**, 비중 **${nonCovPct}%**), 내원 환자수는 **${totalPatients.toLocaleString()}명**(신환 **${newPatients.toLocaleString()}명**)입니다. 환자 1인당 평균 객단가는 **${arpu.toLocaleString()}원**으로, 초진 환자의 초기 치료 계획 동의율과 해피콜 정착 관리를 병행하시면 안정적인 매출 상승이 가능합니다.`,
    actionPlan: [
      { task: "초진 환자 초기 치료 플랜 상담 스크립트 점검", effect: "비급여 전환율 및 객단가 상승" },
      { task: "미내원·치료 중단 예정 환자 리마인드 해피콜 실행", effect: "재진 내원 유지율 강화" },
    ],
    recommendedVideoKeyword: Number(nonCovPct) < 30 ? "클로징 성공 기술" : "1등 상담 화법",
    isFallback: true,
  });
}
