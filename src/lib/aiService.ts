import type { DataMetrics } from "@/context/DataContext";
import {
  buildFallbackClinicInsight,
  buildFallbackStrategicBriefing,
  isCorruptedAiCache,
} from "@/lib/aiFallback";

/**
 * 전담 한의원 경영 진단 AI 서비스 (클라이언트 안전 래퍼)
 *
 * 보안 및 비용 원칙:
 * - 브라우저에서 Gemini SDK를 직접 호출하지 않고 서버 전용 API(/api/ai/*)만 경유합니다.
 * - 이를 통해 API 키의 클라이언트 번들 노출을 100% 차단하고 서버 캐시 및 무중단 Fallback을 보장합니다.
 */
export async function generateClinicInsightStream(
  data: DataMetrics,
  onChunk: (text: string) => void
): Promise<void> {
  if (!data) {
    onChunk(
      JSON.stringify({
        summary: "데이터 없음",
        detailedAnalysis: "분석할 데이터가 없습니다. 먼저 엑셀 파일을 업로드해 주세요.",
        actionPlan: [],
        recommendedVideoKeyword: "",
      })
    );
    return;
  }

  try {
    const res = await fetch("/api/ai/insight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json?.insight && !isCorruptedAiCache(json.insight)) {
        onChunk(json.insight);
        return;
      }
    }
  } catch (error) {
    console.warn("AI Insight request failed, using statistical fallback:", error);
  }

  onChunk(buildFallbackClinicInsight(data));
}

export async function generateClinicInsight(data: DataMetrics): Promise<string> {
  let fullText = "";
  await generateClinicInsightStream(data, (text) => {
    fullText = text;
  });
  return fullText;
}

/**
 * 다중 월 데이터를 분석하여 거시적 전략 브리핑 생성 (서버 캐시 + 100% 무중단 Fallback 대응)
 */
export async function generateStrategicBriefing(
  history: { month: string; metrics: DataMetrics }[],
  emrType?: string
): Promise<string> {
  if (!history || history.length === 0) {
    return buildFallbackStrategicBriefing([], emrType);
  }

  try {
    const res = await fetch("/api/ai/briefing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ history, emrType }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json?.briefing && !isCorruptedAiCache(json.briefing)) {
        return json.briefing;
      }
    }
  } catch (error) {
    console.warn("Strategic Briefing request failed, using statistical fallback:", error);
  }

  return buildFallbackStrategicBriefing(history, emrType);
}
