import { model } from "./gemini";
import { DataMetrics } from "@/context/DataContext";

/**
 * 전담 한의원 경영 진단 AI 서비스
 */
/**
 * 전담 한의원 경영 진단 AI 서비스 (스트리밍 지원)
 */
export async function generateClinicInsightStream(data: DataMetrics, onChunk: (text: string) => void): Promise<void> {
  const isOkchart = !!data.okchartData;
  const isHanchart = !!data.hanchartData && data.hanchartData.length > 0;
  const metrics = isOkchart ? data.okchartData : null;
  const hanchartMetrics = isHanchart ? data.hanchartData : null;
  
  const totalRev = data.generatedRevenue.total || (isHanchart ? hanchartMetrics?.reduce((acc, curr) => acc + (curr.totalRevenue || 0), 0) : 0) || 0;
  const nonCoveredRev = data.generatedRevenue.nonCovered || (isHanchart ? hanchartMetrics?.reduce((acc, curr) => acc + (curr.nonTaxable || 0) + (curr.taxable || 0), 0) : 0) || 0;
  
  const prompt = `
    당신은 대한민국 최고의 한의원 경영 컨설턴트입니다. 
    제공된 한의원의 이번 달 경영 데이터를 분석하여 '원장님'에게 직접 말하는 듯한 전문적이고 실천적인 경영 진단을 작성해주세요.

    [데이터 정보]
    - EMR 모델: ${isOkchart ? "오케이차트 (OkChart)" : isHanchart ? "한차트 (HanChart)" : "일반 데이터"}
    - 총 매출: ${totalRev.toLocaleString()}원
    - 보험 매출: ${(data.generatedRevenue.insurance + data.generatedRevenue.copay).toLocaleString()}원
    - 비급여 매출: ${nonCoveredRev.toLocaleString()}원
    - 자동차보험: ${data.generatedRevenue.auto.toLocaleString()}원
    - 내원 환자수: ${data.patientMetrics.total}명
    - 신규 환자수: ${data.patientMetrics.new}명
    ${isHanchart ? `- 비급여 비중: ${totalRev > 0 ? ((nonCoveredRev / totalRev) * 100).toFixed(1) : 0}%` : ""}
    ${metrics ? `
    - 미수금: ${metrics.receivables.toLocaleString()}원
    - 할인액: ${metrics.discountTotal.toLocaleString()}원
    - 실제 수납액: ${metrics.totalReceived.toLocaleString()}원
    - 카드 결제 비중: ${metrics.totalReceived > 0 ? ((metrics.cardPayment / metrics.totalReceived) * 100).toFixed(1) : 0}%
    ` : ""}

    [응답 JSON 형식]
    반드시 아래 구조의 순수 JSON 데이터만 출력해주세요 (마크다운 포맷 제외):
    {
      "summary": "핵심 요약 헤드라인 (한 줄)",
      "detailedAnalysis": "현재 경영 상태에 대한 전문적인 분석 (마크다운 포함 가능)",
      "actionPlan": [
        { "task": "즉각적인 개선 과제 1", "effect": "기대 효과" },
        { "task": "즉각적인 개선 과제 2", "effect": "기대 효과" }
      ],
      "recommendedVideoKeyword": "상담/클로징, 마케팅/브랜딩, 서비스/마인드 중 적합한 키워드 1개 (예: 1등 상담 화법)"
    }
  `;

  try {
    const result = await model.generateContentStream(prompt);
    let fullText = "";
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      fullText += chunkText;
      onChunk(fullText);
    }
  } catch (error) {
    console.error("AI Insight Streaming Failed:", error);
    onChunk(JSON.stringify({
      summary: "분석 중 오류 발생",
      detailedAnalysis: "현재 데이터를 분석하는 중 오류가 발생했습니다.",
      actionPlan: [],
      recommendedVideoKeyword: ""
    }));
  }
}

export async function generateClinicInsight(data: DataMetrics): Promise<string> {
  let fullText = "";
  await generateClinicInsightStream(data, (text) => { fullText = text; });
  return fullText;
}

/**
 * 다중 월 데이터를 분석하여 거시적 전략 브리핑 생성 (JSON 기반 시각화 대응)
 */
export async function generateStrategicBriefing(history: { month: string, metrics: DataMetrics }[], emrType?: string): Promise<string> {
  const sortedHistory = [...history].sort((a, b) => a.month.localeCompare(b.month));
  
  const dataSummary = sortedHistory.map(h => {
    const isHanchart = !!h.metrics.hanchartData && h.metrics.hanchartData.length > 0;
    const hanchartMetrics = isHanchart ? h.metrics.hanchartData : null;
    const totalRev = h.metrics.generatedRevenue.total || (isHanchart ? hanchartMetrics?.reduce((acc, curr) => acc + (curr.totalRevenue || 0), 0) : 0) || 0;
    const nonCoveredRev = h.metrics.generatedRevenue.nonCovered || (isHanchart ? hanchartMetrics?.reduce((acc, curr) => acc + (curr.nonTaxable || 0) + (curr.taxable || 0), 0) : 0) || 0;
    
    return `
      - ${h.month}: 매출 ${totalRev.toLocaleString()}원, 환자 ${h.metrics.patientMetrics.total}명 (신환 ${h.metrics.patientMetrics.new}명), 비급여 ${nonCoveredRev.toLocaleString()}원
    `;
  }).join("\n");

    const prompt = `
    당신은 세계 최고의 병원 경영 컨설팅 그룹의 수석 파트너이자 한의원 경영 데이터 분석 전문가입니다. 
    제공된 한의원의 ${history.length}개월간의 경영 데이터를 분석하여 병원장님께 드리는 'EMR 맞춤형 심층 경영 전략 리포트'를 작성해주세요.

    [분석 대상 데이터]
    - EMR 종류: ${emrType === 'hanchart' ? '한차트 (초진/재진 분석 특화)' : emrType === 'okchart' ? '오케이차트 (수납/미수금 분석 특화)' : emrType === 'hanisarang' ? '한의사랑' : emrType === 'donguibogam' ? '동의보감' : '통합 데이터'}
    - 분석 기간: ${sortedHistory[0].month} ~ ${sortedHistory[sortedHistory.length - 1].month}
    - 월별 데이터 요약:
    ${dataSummary}

    [작성 시 주의사항]
    1. 매출 추이(성장/정체/감소)를 데이터 근거를 들어 정확히 짚어주세요.
    2. 해당 EMR의 특성에 맞는 지표(예: 한차트라면 초진 비율, 오케이차트라면 수납 및 누수 지표)를 반드시 언급해주세요.
    3. 전략 실행 로드맵은 당장 다음 주부터 실행 가능한 구체적인 액션 아이템이어야 합니다.
    4. 추천 교육 키워드는 아래 목록에서 가장 시급한 문제를 해결할 수 있는 것으로 엄선하세요.

    [응답 JSON 형식]
    반드시 아래 구조의 순수 JSON 데이터만 출력해주세요 (마크다운 포맷 제외, 텍스트 설명 제외):
    {
      "summary": {
        "headline": "병원장님을 위한 촌철살인 경영 헤드라인",
        "statusPill": "성장 가속 | 안정화 단계 | 리스크 관리 | 공격적 확장",
        "healthScores": {
          "profitability": 0-100,
          "stability": 0-100,
          "growth": 0-100,
          "patientFlow": 0-100,
          "efficiency": 0-100
        }
      },
      "executiveInsights": [
        { "title": "핵심 통찰 제목", "content": "데이터 기반의 날카로운 분석", "impact": "매우 높음 | 높음" }
      ],
      "actionPlan": [
        { "phase": "1단계: 준비", "task": "구체적인 실천 과제", "expectedEffect": "매출/환자 증가 기대치" },
        { "phase": "2단계: 실행", "task": "구체적인 실천 과제", "expectedEffect": "매출/환자 증가 기대치" },
        { "phase": "3단계: 고도화", "task": "구체적인 실천 과제", "expectedEffect": "매출/환자 증가 기대치" }
      ],
      "recommendedVideoKeyword": "목록 중 1개 (예: 1등 상담 화법)",
      "detailedAnalysis": "전체적인 경영 흐름, 강점, 약점, 기회 요인을 담은 A4 1장 분량의 심층 리포트 (마크다운 활용)"
    }

    [선택 가능한 키워드 목록]
    - 상담/클로징: 1등 상담 화법, 클로징 성공 기술, 고객 심리 공략
    - 마케팅/브랜딩: 고객 유입 마케팅 공식, 입소문 마케팅 비결, 브랜딩 차별화 전략
    - 서비스/마인드: 친절한 고객 응대 말투, 리더의 조직 관리 대화법, 성공 사업가 마인드셋
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Strategic Briefing Failed:", error);
    return JSON.stringify({
      summary: { headline: "분석 중 오류 발생", statusPill: "Error", healthScores: { profitability: 0, stability: 0, growth: 0, patientFlow: 0, efficiency: 0 } },
      executiveInsights: [],
      actionPlan: [],
      detailedAnalysis: "데이터 추세 분석 중 오류가 발생했습니다."
    });
  }
}
