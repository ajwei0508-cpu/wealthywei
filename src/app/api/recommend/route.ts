import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ 
  model: "gemini-1.5-flash",
  generationConfig: { responseMimeType: "application/json" }
});

export async function POST(req: Request) {
  try {
    const { metrics } = await req.json();

    if (!metrics || !Array.isArray(metrics)) {
      return NextResponse.json({ error: "Invalid metrics array" }, { status: 400 });
    }

    const prompt = `
      당신은 대한민국 병의원 경영 전문 컨설턴트입니다. 
      다음 지표들의 상태를 종합적으로 분석하여 원장님께 가장 중요한 경영 솔루션을 제안해 주세요.
      
      [분석 대상 지표들]
      ${metrics.map(m => `- ${m.label}: ${m.isUp ? "상승" : "하락"}`).join("\n")}
      
      [지침]
      1. 모든 지표를 종합하여 "종합 경영 제언(summary)"을 정중하게 작성하세요.
      2. 각 지표별로 유튜브에서 검색할 실무 키워드 3개를 제안해 주세요.
      3. 전문적이고 통찰력 있는 분석 코멘트를 각 지표별로 포함하세요.
      4. 특수 기호(# 등)를 절대 사용하지 마세요.
      5. JSON 형식으로만 응답해야 하며, 그 외 텍스트는 포함하지 마세요.

      응답 JSON 구조 예시:
      {
        "summary": "전체 지표를 아우르는 전문적인 통합 제언 (2~3문장)",
        "results": {
          "지표ID(예: basicRevenue)": {
            "title": "솔루션 제목",
            "keywords": ["키워드1", "키워드2", "키워드3"],
            "desc": "구체적인 코멘트"
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
