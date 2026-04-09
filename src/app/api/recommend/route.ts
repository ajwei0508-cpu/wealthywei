import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ 
  model: "gemini-1.5-flash",
  generationConfig: { responseMimeType: "application/json" }
});

export async function POST(req: Request) {
  try {
    const { metrics, userInfo, targetMonth, compareMonth } = await req.json();

    if (!metrics || !Array.isArray(metrics)) {
      return NextResponse.json({ error: "Invalid metrics array" }, { status: 400 });
    }

    const userName = userInfo?.name || "원천";
    
    const prompt = `
      당신은 대한민국 최고 수준의 병의원 경영 전문 AI 컨설턴트입니다. 
      아래 제공되는 '${userName} 원장님'의 병원 실데이터를 바탕으로 가장 중요한 경영 솔루션을 제안해 주세요.
      
      [분석 정보]
      - 분석 대상 기간: ${compareMonth} 대비 ${targetMonth}의 성과
      - 대상 병원/원장: ${userName} 원장님
      
      [세부 지표 변화]
      ${metrics.map((m: any) => `- ${m.label}: ${new Intl.NumberFormat("ko-KR").format(m.valA)}원 -> ${new Intl.NumberFormat("ko-KR").format(m.valB)}원 (${m.isUp ? "+" : ""}${m.percent}%)`).join("\n")}
      
      [컨설팅 가이드라인]
      1. 모든 수치적 변화를 종합하여 "종합 경영 제언(summary)"을 정중하고 카리스마 있는 말투로 작성하세요. (예: "~원장님, 이번 달 비급여 매출이 ~% 하락한 점이 가장 큰 병목입니다. 따라서...")
      2. 분석된 지표 중 하락폭이 가장 크거나 성장이 부진한 핵심 지표를 골라 원장님께서 유튜브에서 직접 공부할 수 있도록 "실무/경영/마케팅" 중심의 고관여 검색 키워드 3개를 도출해 주세요. 유튜브 키워드는 구체적이어야 합니다. (예: "치과 비급여 상담 스크립트", "한의원 자보 재진율 상승", "병원 데스크 친절 교육")
      3. 전문적이고 통찰력 있는 분석 코멘트를 각 지표 단위로 덧붙여 주세요. 
      4. 특수 기호(#, * 등)를 절대 사용하지 마세요. (Markdown 문법 사용 금지)
      5. JSON 형식으로만 응답해야 하며, 그 외 텍스트는 포함하지 마세요.

      응답 JSON 구조 예시:
      {
        "summary": "전체 수치를 아우르는 전문적인 통합 제언 (2~3문장)",
        "results": {
          "지표ID(예: basicRevenue)": {
            "title": "솔루션 제목 (예: 보험 매출 누수 방지 전략)",
            "keywords": ["초진 환자 객단가 높이는 법", "진료실 상담 기법", "우리 병원 리뷰 관리"],
            "desc": "구체적이고 논리적인 원인 분석 코멘트"
          }
        }
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean up potential markdown code blocks
    const cleanedText = text.replace(/```json|```/g, "").trim();
    const data = JSON.parse(cleanedText);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Gemini Batch Suggestion Error:", error);
    return NextResponse.json(
      { error: "Failed to generate suggestions" },
      { status: 500 }
    );
  }
}
