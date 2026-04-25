import { model } from "@/lib/gemini";
import { NextResponse } from "next/server";

// 서버 측 키(GEMINI_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY)를 우선하고, 클라이언트 측 키(NEXT_PUBLIC_GEMINI_API_KEY)를 차선으로 사용합니다.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

export async function POST(req: Request) {
  let rawResponseText = "";
  try {
    // 1. API 키 유효성 검사
    if (!GEMINI_API_KEY) {
      console.error("🔥 AI 분석 API 에러: GEMINI_API_KEY가 설정되지 않았습니다.");
      return NextResponse.json(
        { error: "API 키가 환경변수에 설정되지 않았습니다. .env.local 파일을 확인해주세요." },
        { status: 500 }
      );
    }

    const { metrics, userInfo, targetMonth, compareMonth, expertKeywords } = await req.json();

    if (!metrics || !Array.isArray(metrics)) {
      return NextResponse.json({ error: "Invalid metrics array" }, { status: 400 });
    }

    const userName = userInfo?.name || "원장님";
    
    // 원장님이 설정한 전문가 키워드 가이드 구성
    let expertKeywordsGuidance = "";
    if (expertKeywords) {
      expertKeywordsGuidance = `
      [유튜브 키워드 제약 조건]
      반드시 아래 제공된 지표별 키워드 리스트 중 '하나'만 선택하여 "keywords" 필드에 넣으세요. 새로운 키워드를 생성하지 마세요.
      ${Object.entries(expertKeywords).map(([key, words]: [string, any]) => `- ${key}: [${words.join(", ")}]`).join("\n")}
      `;
    }

    const prompt = `
      당신은 대한민국 최고 수준의 병의원 경영 전문 AI 컨설턴트입니다. 
      아래 제공되는 '${userName}'의 병원 실데이터를 바탕으로 전략 리포트와 유튜브 추천 키워드를 제안해 주세요.
      
      [분석 정보]
      - 분석 대상 기간: ${compareMonth} 대비 ${targetMonth}의 성과
      
      [세부 지표 변화]
      ${metrics.map((m: any) => `- ${m.label}: ${m.percent}% 변화`).join("\n")}
      
      ${expertKeywordsGuidance}

      [컨설팅 가이드라인]
      1. strategicReport를 작성하세요 (risks, improvements, solutions 항목 포함).
      2. 하락폭이 크거나 관리가 필요한 핵심 지표를 하나 골라 솔루션을 제안하세요.
      3. 중요: "keywords"는 반드시 위에 제공된 리스트에 있는 단어 중 하나여야 하며, '치과'라는 단어는 절대 포함하지 마세요.
      4. 오직 JSON 형식으로만 응답하세요.

      응답 JSON 구조:
      {
        "strategicReport": {
          "risks": ["..."],
          "improvements": ["..."],
          "solutions": ["..."]
        },
        "results": {
          "지표ID": {
            "title": "솔루션 제목",
            "keywords": ["리스트에서 선택된 단일 키워드"],
            "desc": "분석 코멘트"
          }
        }
      }
    `;

    // 2. 중앙화된 Gemini 모델 호출 (src/lib/gemini.ts의 singleton 사용)
    const result = await model.generateContent(prompt);
    const response = await result.response;
    rawResponseText = response.text();
    
    console.log("=== Raw Gemini Response ===");
    console.log(rawResponseText);

    let data;
    const jsonMatch = rawResponseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      data = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("No JSON object found in response");
    }

    return NextResponse.json(data);
  } catch (error) {
    // 3. 에러 로깅 강화
    console.error("🔥 AI 분석 API 에러 상세:", error);
    
    return NextResponse.json(
      { 
        error: "분석 제안 생성에 실패했습니다.", 
        details: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
        fallback: true
      },
      { status: 500 }
    );
  }
}
