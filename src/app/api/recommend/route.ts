import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function POST(req: Request) {
  try {
    const { indicator, label, isUp } = await req.json();

    const prompt = `
      당신은 대한민국 병의원 경영 전문 컨설턴트입니다. 
      현재 병의원의 [${label}] 지표가 전월 대비 [${isUp ? "상승" : "하락"}]한 상태입니다.
      
      이 상황을 개선하거나(하락 시) 성과를 극대화하기(상승 시) 위해 원장님이 유튜브에서 검색해볼 만한 [최적의 검색 키워드]를 제안해 주세요.
      
      [지침]
      1. 특정 업종(한의원, 치과 등)에 국한된 단어는 제외하고, 병의원 경영 전반에 적용되는 실무 키워드를 사용하세요.
      2. 'desc' 필드는 "우리 병원의 상담 프로세스를 점검해볼 때입니다"와 같이 원장님께 깊은 신뢰를 주는 전문적이고 통찰력 있는 '진짜 분석 텍스트'를 작성해 주세요. 단순한 나열보다는 수치 변화에 따른 경영자의 액션 플랜을 제안하세요.
      3. **유튜브 검색 키워드('keywords' 배열)에는 절대로 '#' 기호나 특수기호를 포함하지 마세요.** 특수기호 없이 오직 자연어 키워드로만 띄어쓰기를 포함해 작성해야 결과가 더 정확합니다.
      4. 다음 카테고리별 예시를 참고하여, 상황에 가장 적합한 키워드 3개를 골라 'keywords' 배열로 출력하세요:
         - [비급여] 관련 지표: 1등 상담 화법, 클로징 성공 기술, 고객 심리 공략
         - [신규환자수] 관련 지표: 고객 유입 마케팅 공식, 입소문 마케팅 비결, 브랜딩 차별화 전략
         - [보험 매출/보험진료] 관련 지표: 친절한 고객 응대 말투, 리더의 조직 관리 대화법, 성공 사업가 마인드셋
      5. 상담 기법, 마케팅 전략, 고객 응대, 조직 관리 등 실무적인 테마를 지표와 연계하여 키워드를 도출하세요.

      지표 종류: ${indicator}
      지표 명칭: ${label}
      상태: ${isUp ? "상승(긍정적)" : "하락(경고)"}

      다음 JSON 형식으로만 응답해 주세요:
      {
        "title": "추천 솔루션 제목 (예: 정밀 화법 분석을 통한 매출 회복 전략)",
        "keywords": ["상담 화법", "고객 심리 공략", "클로징 성공 기술"],
        "desc": "지표의 의미와 원인 분석, 그리고 구체적인 개선 방향을 포함한 격조 높은 분석 코멘트 (2~3문장 내외)"
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
    console.error("Gemini Suggestion Error:", error);
    return NextResponse.json(
      { error: "Failed to generate suggestion" },
      { status: 500 }
    );
  }
}
