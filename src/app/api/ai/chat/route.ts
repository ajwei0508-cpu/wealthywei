import { NextRequest, NextResponse } from "next/server";
import { model } from "@/lib/gemini";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

// 간단한 인메모리 Rate Limiter (무한 루프 방지용)
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1분
const MAX_REQUESTS_PER_MINUTE = 5; // 1분에 5회까지만 허용

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  // --- Rate Limiting 로직 ---
  const userEmail = session.user.email;
  const now = Date.now();
  const userRate = rateLimitMap.get(userEmail);

  if (userRate) {
    if (now - userRate.timestamp < RATE_LIMIT_WINDOW) {
      if (userRate.count >= MAX_REQUESTS_PER_MINUTE) {
        console.warn(`[RateLimit] ${userEmail} exceeded AI request limit.`);
        return new Response(
          JSON.stringify({ error: "비정상적인 과도한 요청이 감지되었습니다. 1분 후 다시 시도해주세요." }),
          { status: 429 }
        );
      }
      userRate.count += 1;
    } else {
      // 1분이 지나면 리셋
      rateLimitMap.set(userEmail, { count: 1, timestamp: now });
    }
  } else {
    rateLimitMap.set(userEmail, { count: 1, timestamp: now });
  }
  // -----------------------

  try {
    const { query, data, emrType } = await req.json();

    const userName = session.user.name || "원장님";

    // Prepare data summary
    const months = Object.keys(data || {}).sort();
    const latestMonth = months.length > 0 ? months[months.length - 1] : null;
    const latestData = latestMonth ? data[latestMonth] : null;
    let dataContext = "업로드된 데이터가 없습니다. 먼저 엑셀 데이터를 업로드해 주세요.";

    if (latestData) {
      dataContext = `
      최근 월(${latestMonth}) 데이터 요약:
      - 환자 수: ${latestData.patientMetrics?.total || 0}명 (신환: ${latestData.patientMetrics?.new || 0}명)
      - 총 매출: ${(latestData.generatedRevenue?.total || 0).toLocaleString()}원
      - 비급여 매출: ${(latestData.generatedRevenue?.nonCovered || 0).toLocaleString()}원
      - 보험 매출: ${((latestData.generatedRevenue?.insurance || 0) + (latestData.generatedRevenue?.copay || 0)).toLocaleString()}원
      - 자동차보험 매출: ${(latestData.generatedRevenue?.auto || 0).toLocaleString()}원
      `;
    }

    const prompt = `
      당신은 대한민국 최고의 한의원 전문 경영 컨설턴트(AI 비서)입니다.
      ${userName} 원장님의 질문에 대해 핵심만 명확하게 답변해 주세요.

      [분석 지침]
      1. 원장님이 입력한 질문(Query)의 의도를 정확히 파악하여 답변합니다.
      2. 질문이 데이터(매출, 환자수 등) 조회를 요구한다면 아래의 [현재 병원 데이터]를 기반으로 답변하세요.
      3. 질문이 마케팅, 경영 개선, 문제 해결 등 '액션 플랜'을 요구한다면 즉시 실행 가능한 To-Do 리스트 형태로 제안하세요.
      4. 말투는 예의 바르고 전문적인 비서 톤을 유지하세요 (예: "~입니다.", "~을 제안해 드립니다.").
      5. 마크다운(Markdown) 포맷을 적극 활용하여 가독성 있게 작성하세요. (볼드체, 리스트 기호 등)

      [현재 병원 데이터]
      EMR 타입: ${emrType || "지정되지 않음"}
      ${dataContext}

      [원장님 질문]
      ${query}
    `;

    const result = await model.generateContentStream(prompt);

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            controller.enqueue(new TextEncoder().encode(chunkText));
          }
          controller.close();
        } catch (error) {
          console.error("Stream Error:", error);
          let errMsg = "\n\n[오류] 답변을 생성하는 중 문제가 발생했습니다.";
          if (String(error).includes("429")) {
            errMsg = "\n\n[오류] Google Gemini API 한도가 초과되었습니다. 결제 정보를 확인해 주세요.";
          }
          controller.enqueue(new TextEncoder().encode(errMsg));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err: any) {
    console.error("Chat API error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
