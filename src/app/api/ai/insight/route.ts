import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { getServerGeminiApiKey, model } from "@/lib/gemini";
import {
  buildFallbackClinicInsight,
  getNormalizedDonguibogamTotal,
  isCorruptedAiCache,
} from "@/lib/aiFallback";
import type { DataMetrics } from "@/context/DataContext";

const insightServerCache = new Map<string, { data: string; expiry: number }>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const rateLimitMap = new Map<string, { count: number; timestamp: number }>();
const RATE_WINDOW_MS = 60 * 1000;
const MAX_REQ_PER_MIN = 10;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let data: DataMetrics | null = null;
  try {
    const body = await req.json();
    data = body?.data || null;
    if (!data) {
      return NextResponse.json({
        insight: JSON.stringify({
          summary: "데이터 없음",
          detailedAnalysis: "분석할 데이터가 없습니다. 먼저 엑셀 파일을 업로드해 주세요.",
          actionPlan: [],
          recommendedVideoKeyword: "",
        }),
        fallback: true,
      });
    }

    const isOkchart = !!data.okchartData;
    const isHanchart = !!data.hanchartData && data.hanchartData.length > 0;
    const metrics = isOkchart ? data.okchartData : null;
    const hanchartMetrics = isHanchart ? data.hanchartData : null;
    const donguiTotal = data.donguibogamData
      ? getNormalizedDonguibogamTotal(data.donguibogamData)
      : 0;

    const totalRev =
      donguiTotal ||
      Number(data.generatedRevenue?.total) ||
      (isHanchart
        ? hanchartMetrics?.reduce((acc, curr) => acc + (Number(curr.totalRevenue) || 0), 0)
        : 0) ||
      0;
    const nonCoveredRev =
      Number(data.donguibogamData?.nonCovered) ||
      Number(data.generatedRevenue?.nonCovered) ||
      (isHanchart
        ? hanchartMetrics?.reduce(
            (acc, curr) => acc + (Number(curr.nonTaxable) || 0) + (Number(curr.taxable) || 0),
            0
          )
        : 0) ||
      0;
    const insuranceRev = Math.max(0, totalRev - nonCoveredRev);
    const autoRev = Number(data.generatedRevenue?.auto) || 0;
    const totalPatients =
      Number(data.donguibogamData?.totalPatients) || Number(data.patientMetrics?.total) || 0;
    const newPatients =
      Number(data.donguibogamData?.newPatients) || Number(data.patientMetrics?.new) || 0;

    const cacheKey = `${session.user.email.toLowerCase()}__${totalRev}__${nonCoveredRev}__${totalPatients}`;
    const now = Date.now();
    const cached = insightServerCache.get(cacheKey);
    if (cached && cached.expiry > now && !isCorruptedAiCache(cached.data)) {
      return NextResponse.json({ insight: cached.data, cached: true, fallback: false });
    }

    const userEmail = session.user.email.toLowerCase();
    const userRate = rateLimitMap.get(userEmail);
    if (userRate && now - userRate.timestamp < RATE_WINDOW_MS) {
      if (userRate.count >= MAX_REQ_PER_MIN) {
        return NextResponse.json({
          insight: buildFallbackClinicInsight(data),
          cached: false,
          fallback: true,
        });
      }
      userRate.count += 1;
    } else {
      rateLimitMap.set(userEmail, { count: 1, timestamp: now });
    }

    if (!getServerGeminiApiKey()) {
      return NextResponse.json({
        insight: buildFallbackClinicInsight(data),
        cached: false,
        fallback: true,
      });
    }

    const prompt = `
당신은 대한민국 최고의 한의원 경영 컨설턴트입니다.
제공된 한의원의 이번 달 경영 데이터를 분석하여 '원장님'에게 직접 말하는 듯한 전문적이고 실천적인 경영 진단을 작성해주세요.

[데이터 정보]
- EMR 모델: ${isOkchart ? "오케이차트 (OkChart)" : isHanchart ? "한차트 (HanChart)" : data.donguibogamData ? "동의보감" : "일반 데이터"}
- 총 매출: ${totalRev.toLocaleString()}원
- 보험 매출: ${insuranceRev.toLocaleString()}원
- 비급여 매출: ${nonCoveredRev.toLocaleString()}원
- 자동차보험: ${autoRev.toLocaleString()}원
- 내원 환자수: ${totalPatients}명
- 신규 환자수: ${newPatients}명
- 비급여 비중: ${totalRev > 0 ? ((nonCoveredRev / totalRev) * 100).toFixed(1) : 0}%
${
  metrics
    ? `- 미수금: ${metrics.receivables.toLocaleString()}원
- 할인액: ${metrics.discountTotal.toLocaleString()}원
- 실제 수납액: ${metrics.totalReceived.toLocaleString()}원`
    : ""
}

[응답 JSON 형식]
반드시 아래 구조의 순수 JSON 데이터만 출력해주세요:
{
  "summary": "핵심 요약 헤드라인 (한 줄)",
  "detailedAnalysis": "현재 경영 상태에 대한 전문적인 분석 (마크다운 포함 가능)",
  "actionPlan": [
    { "task": "즉각적인 개선 과제 1", "effect": "기대 효과" },
    { "task": "즉각적인 개선 과제 2", "effect": "기대 효과" }
  ],
  "recommendedVideoKeyword": "상담/클로징, 마케팅/브랜딩, 서비스/마인드 중 적합한 키워드 1개 (예: 1등 상담 화법)"
}
`.trim();

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    });
    const text = result.response.text();
    if (text && !isCorruptedAiCache(text)) {
      insightServerCache.set(cacheKey, { data: text, expiry: now + CACHE_TTL_MS });
      return NextResponse.json({ insight: text, cached: false, fallback: false });
    }

    return NextResponse.json({
      insight: buildFallbackClinicInsight(data),
      cached: false,
      fallback: true,
    });
  } catch (error) {
    console.warn("⚠️ [AI Insight API] Falling back to deterministic insight:", error);
    return NextResponse.json({
      insight: data ? buildFallbackClinicInsight(data) : "{}",
      cached: false,
      fallback: true,
    });
  }
}
