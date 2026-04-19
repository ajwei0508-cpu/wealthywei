import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { model } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, clinic, degree, specialist, type, currentValue } = await req.json();
    // type: "vision" | "mission" | "general"

    const context = `
원장 이름: ${name || "미입력"}
병원명: ${clinic || "미입력"}
학위: ${degree || "미입력"}
전문의: ${specialist || "미입력"}
    `.trim();

    let prompt = "";

    if (currentValue) {
      prompt = `당신은 대한민국 최고 한의원 경영 컨설턴트입니다.
아래 원장님의 기초 정보와 현재 작성 중인 내용을 바탕으로, 이를 더 전문적이고 체계적으로 정리한 초안 3가지를 제안해주세요.
특히 문장의 논리적 구조를 다듬고, 한의원 경영철학이 돋보이도록 세련된 결론으로 마무리하세요.

[원장 정보]
${context}

[작성 중인 내용]
"${currentValue}"

JSON으로만 응답: {"drafts": ["초안1", "초안2", "초안3"]}
응답은 반드시 1. 2. 3. 형식이 아닌 순수 JSON 배열만 포함해야 합니다.`;
    } else {
      prompt = type === "vision"
        ? `당신은 대한민국 최고 한의원 경영 컨설턴트입니다.
아래 원장님 정보를 바탕으로 병원 비전(Vision) 문장 3가지를 작성해주세요.
각 비전은 서로 다른 방향성(① 환자 중심, ② 성장·수익 중심, ③ 전문 특화 중심)을 가져야 합니다.
JSON으로만 응답: {"drafts": ["비전1", "비전2", "비전3"]}

원장 정보:
${context}`
        : `당신은 대한민국 최고 한의원 경영 컨설턴트입니다.
아래 원장님 정보를 바탕으로 병원 미션(Mission) 문장 3가지를 작성해주세요.
각 미션은 서로 다른 접근(① 가치 제공형, ② 사회적 역할형, ③ 기술·혁신형)으로 작성하세요.
JSON으로만 응답: {"drafts": ["미션1", "미션2", "미션3"]}

원장 정보:
${context}`;
    }

    const result = await model.generateContent(prompt);
    const text = await result.response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI 응답 파싱 실패");

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ drafts: parsed.drafts || [] });
  } catch (err: any) {
    console.error("🔥 AI Draft error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
