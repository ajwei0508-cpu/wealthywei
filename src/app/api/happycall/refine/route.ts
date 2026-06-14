import { model } from "@/lib/gemini";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { script, context } = await req.json();

    if (!script) {
      return NextResponse.json({ error: "Missing script to refine" }, { status: 400 });
    }

    let prompt = `
      당신은 한의원 해피콜을 담당하는 친절하고 따뜻하며 전문적인 실장입니다.
      아래 제공된 해피콜 멘트를 환자가 들었을 때(혹은 문자로 받았을 때) 훨씬 더 다정하고, 자연스러우며, 예약 및 내원을 유도하는 따뜻한 톤앤매너로 다듬어 주세요.
      
      [제약 사항]
      1. 원래 멘트의 핵심 정보(환자명, 한의원 상호, 안부 묻는 내용, 내원 권유 등)를 최대한 자연스럽게 유지하세요.
      2. 이모티콘(예: ^^, !, 🧡, 🏥 등)을 자연스럽게 섞어서 문자가 덜 딱딱하게 느껴지게 하세요.
      3. 오직 다듬어진 해피콜 멘트 텍스트만 출력하세요. 앞뒤 부연설명이나 인사말("여기에 수정된 멘트가 있습니다" 등)은 절대 포함하지 마세요.
      
      [현재 멘트]
      ${script}
    `;

    if (context && context.trim()) {
      prompt += `
      
      [환자 특이사항/상황]
      ${context}
      
      위의 환자 특이사항/상황을 해피콜 멘트 중간이나 끝에 매우 자연스러운 공감의 언어로 녹여내어 리라이팅 해 주세요.
      `;
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const refinedScript = response.text().trim();

    return NextResponse.json({ refinedScript });
  } catch (error: any) {
    console.error("Happycall refine API error:", error);
    return NextResponse.json(
      { error: "멘트 다듬기에 실패했습니다.", details: error.message },
      { status: 500 }
    );
  }
}
