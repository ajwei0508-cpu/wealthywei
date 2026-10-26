import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { genAI, model } from "@/lib/gemini";

async function generateWithFallback(prompt: string): Promise<string> {
  const candidateModels = ["gemini-2.5-flash", "gemini-3.8-flash", "gemini-1.5-flash"];
  let lastErr: any = null;
  for (const modelName of candidateModels) {
    try {
      const m = modelName === "gemini-2.5-flash"
        ? model
        : genAI.getGenerativeModel({ model: modelName }, { apiVersion: "v1beta" });
      const result = await m.generateContent(prompt);
      return await result.response.text();
    } catch (e: any) {
      lastErr = e;
      console.warn(`⚠️ [AI Draft] Model ${modelName} failed, trying fallback:`, e?.message);
    }
  }
  throw lastErr || new Error("AI 모델 호출 실패");
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, clinic, degree, specialist, type, questionLabel, currentValue, mode } = await req.json();

    const context = `
원장 이름: ${name || "미입력"}
병원명: ${clinic || "미입력"}
학위/전문과목: ${degree || specialist || "미입력"}
문항 항목: ${questionLabel || type || "경영 진단 항목"}
    `.trim();

    let prompt = "";

    if (mode === "master_diagnosis" || currentValue) {
      prompt = `당신은 대한민국 상위 1% 한의원 경영 컨설팅 대표 마스터입니다.
원장님이 설문지에 작성한 '현재 병원의 날것(Raw) 리얼 현황'을 분석하여:
1) 현재 방식에서 발견되는 핵심 문제점 및 병목 구간(diagnosis)을 날카롭게 1~2문장으로 진단하고,
2) 이를 해결하기 위해 바른컨설팅 표준에 맞춰 다듬어진 최고급 컨설팅 솔루션/문장 초안 3가지(drafts)를 제시해주세요.
   - 초안 1: [시스템·표준화 중심 솔루션]
   - 초안 2: [환자 신뢰·전환율 극대화 솔루션]
   - 초안 3: [매출·프리미엄 브랜딩 특화 솔루션]

[병원 기본 정보]
${context}

[원장님이 작성한 리얼 현황 (원본)]
"${currentValue || "(미작성 상태 - 해당 항목의 표준 도입 솔루션 제안 필요)"}"

반드시 아래 순수 JSON 형식으로만 응답하세요 (마크다운 코드블록 없이 JSON만 출력):
{
  "diagnosis": "현재 현황에 대한 핵심 문제점 및 개선 포인트 진단 요약",
  "drafts": [
    "[시스템 표준화] 다듬어진 전문 문장/매뉴얼 초안 1",
    "[전환율 극대화] 다듬어진 전문 문장/매뉴얼 초안 2",
    "[프리미엄 브랜딩] 다듬어진 전문 문장/매뉴얼 초안 3"
  ]
}`;
    } else {
      prompt = type === "vision"
        ? `당신은 대한민국 최고 한의원 경영 컨설턴트입니다.
아래 원장님 정보를 바탕으로 병원 비전(Vision) 문장 3가지를 작성해주세요.
각 비전은 서로 다른 방향성(① 환자 중심, ② 성장·수익 중심, ③ 전문 특화 중심)을 가져야 합니다.
JSON으로만 응답: {"diagnosis": "비전 수립 가이드", "drafts": ["비전1", "비전2", "비전3"]}

원장 정보:
${context}`
        : `당신은 대한민국 최고 한의원 경영 컨설턴트입니다.
아래 원장님 정보를 바탕으로 '${questionLabel || "병원 경영 미션"}'에 대한 모범 초안 3가지를 작성해주세요.
각 초안은 서로 다른 접근(① 시스템 중심형, ② 환자 감동형, ③ 전문성 특화형)으로 작성하세요.
JSON으로만 응답: {"diagnosis": "맞춤 초안 생성 완료", "drafts": ["초안1", "초안2", "초안3"]}

원장 정보:
${context}`;
    }

    const text = await generateWithFallback(prompt);

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI 응답 파싱 실패");

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json({
      diagnosis: parsed.diagnosis || "",
      drafts: parsed.drafts || [],
    });
  } catch (err: any) {
    console.error("🔥 AI Draft error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
