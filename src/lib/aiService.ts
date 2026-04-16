import { model } from "./gemini";
import { DataMetrics } from "@/context/DataContext";

/**
 * 전담 한의원 경영 진단 AI 서비스
 */
export async function generateClinicInsight(data: DataMetrics): Promise<string> {
  const isOkchart = !!data.okchartData;
  const metrics = isOkchart ? data.okchartData : null;
  
  const prompt = `
    당신은 대한민국 최고의 한의원 경영 컨설턴트입니다. 
    제공된 한의원의 월간 경영 데이터를 분석하여 '원장님'에게 직접 말하는 듯한 전문적이고 실천적인 경영 진단을 작성해주세요.

    [데이터 정보]
    - 모델: ${isOkchart ? "오케이차트 (OkChart)" : "일반 데이터"}
    - 총 매출: ${data.generatedRevenue.total.toLocaleString()}원
    - 보험 매출: ${data.generatedRevenue.insurance.toLocaleString() + data.generatedRevenue.copay.toLocaleString()}원
    - 비급여 매출: ${data.generatedRevenue.nonCovered.toLocaleString()}원
    - 자동차보험: ${data.generatedRevenue.auto.toLocaleString()}원
    - 내원 환자수: ${data.patientMetrics.total}명
    - 신규 환자수: ${data.patientMetrics.new}명
    ${metrics ? `
    - 미수금: ${metrics.receivables.toLocaleString()}원
    - 할인액: ${metrics.discountTotal.toLocaleString()}원
    - 실제 수납액: ${metrics.totalReceived.toLocaleString()}원
    - 카드 결제 비중: ${((metrics.cardPayment / metrics.totalReceived) * 100).toFixed(1)}%
    ` : ""}

    [작성 가이드라인]
    1. 현재 경영 상태에 대한 총평 (긍정적인 점 포함)
    2. 강점과 약점 (매출 구조, 환자 유입 등 분석)
    3. 구체적인 경영 개선 제안 (비급여 비중, 신환 유입 등)
    4. 다음 달을 위한 한 줄 전략

    문체는 정중하면서도 통찰력 있게 작성해주시고, 수치에 기반한 분석을 포함해주세요.
    마크다운 형식을 사용하여 가독성 있게 응답해주세요.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("AI Insight Generation Failed:", error);
    return "현재 데이터를 분석하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주시거나, 데이터를 확인해주세요.";
  }
}
