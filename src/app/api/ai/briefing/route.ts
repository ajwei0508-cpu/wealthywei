import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { genAI, getServerGeminiApiKey, isBillingOrAuthError, model } from "@/lib/gemini";
import {
  buildFallbackStrategicBriefing,
  getNormalizedDonguibogamTotal,
  isCorruptedAiCache,
} from "@/lib/aiFallback";
import type { DataMetrics } from "@/context/DataContext";

// 서버 인메모리 캐시 (동일 데이터 기간 분석 시 중복 Gemini 과금 0원)
const briefingServerCache = new Map<string, { data: string; expiry: number }>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6시간

// 사용자별 분당 호출 제한 (비정상 루프 및 과금 폭주 원천 차단)
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();
const RATE_WINDOW_MS = 60 * 1000;
const MAX_REQ_PER_MIN = 8;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let history: { month: string; metrics: DataMetrics }[] = [];
  let emrType: string | undefined;

  try {
    const body = await req.json();
    history = Array.isArray(body?.history) ? body.history : [];
    emrType = body?.emrType || undefined;

    if (history.length === 0) {
      return NextResponse.json({
        briefing: buildFallbackStrategicBriefing([], emrType),
        cached: false,
        fallback: true,
      });
    }

    const sortedHistory = [...history].sort((a, b) => a.month.localeCompare(b.month));

    const dataSummaryLines = sortedHistory.map((h) => {
      const m = h.metrics;
      const isHanchart = !!m?.hanchartData && m.hanchartData.length > 0;
      const hanchartMetrics = isHanchart ? m.hanchartData : null;
      const donguiTotal = m?.donguibogamData
        ? getNormalizedDonguibogamTotal(m.donguibogamData)
        : 0;
      const totalRev =
        donguiTotal ||
        Number(m?.generatedRevenue?.total) ||
        (isHanchart
          ? hanchartMetrics?.reduce((acc, curr) => acc + (Number(curr.totalRevenue) || 0), 0)
          : 0) ||
        0;
      const nonCoveredRev =
        Number(m?.donguibogamData?.nonCovered) ||
        Number(m?.generatedRevenue?.nonCovered) ||
        (isHanchart
          ? hanchartMetrics?.reduce(
              (acc, curr) => acc + (Number(curr.nonTaxable) || 0) + (Number(curr.taxable) || 0),
              0
            )
          : 0) ||
        0;
      const totalPatients =
        (m?.donguibogamData
          ? (Number(m.donguibogamData.newPatients) || 0) +
            (Number(m.donguibogamData.recurringPatients) || 0) +
            (Number(m.donguibogamData.referralPatients) || 0)
          : 0) ||
        Number(m?.patientMetrics?.total) ||
        0;
      const newPatients =
        Number(m?.donguibogamData?.newPatients) || Number(m?.patientMetrics?.new) || 0;

      return {
        month: h.month,
        totalRev,
        nonCoveredRev,
        totalPatients,
        newPatients,
        line: `- ${h.month}: 총 매출 ${totalRev.toLocaleString()}원 (급여 ${Math.max(0, totalRev - nonCoveredRev).toLocaleString()}원 + 비급여 ${nonCoveredRev.toLocaleString()}원), 환자 ${totalPatients}명 (신환 ${newPatients}명)`,
      };
    });

    // 1. 서버 캐시 조회 (비용 0원 즉시 반환)
    const signature = dataSummaryLines
      .map((d) => `${d.month}:${d.totalRev}:${d.nonCoveredRev}:${d.totalPatients}`)
      .join("|");
    const cacheKey = `${session.user.email.toLowerCase()}__${emrType || "all"}__${signature}`;
    const now = Date.now();
    const cachedEntry = briefingServerCache.get(cacheKey);
    if (cachedEntry && cachedEntry.expiry > now && !isCorruptedAiCache(cachedEntry.data)) {
      return NextResponse.json({ briefing: cachedEntry.data, cached: true, fallback: false });
    }

    // 2. 사용자별 Rate Limit 체크
    const userEmail = session.user.email.toLowerCase();
    const userRate = rateLimitMap.get(userEmail);
    if (userRate && now - userRate.timestamp < RATE_WINDOW_MS) {
      if (userRate.count >= MAX_REQ_PER_MIN) {
        const fallbackJson = buildFallbackStrategicBriefing(sortedHistory, emrType);
        return NextResponse.json({ briefing: fallbackJson, cached: false, fallback: true });
      }
      userRate.count += 1;
    } else {
      rateLimitMap.set(userEmail, { count: 1, timestamp: now });
    }

    // 3. API 키 미설정 시 즉시 정량 통계 Fallback 반환
    if (!getServerGeminiApiKey()) {
      const fallbackJson = buildFallbackStrategicBriefing(sortedHistory, emrType);
      return NextResponse.json({ briefing: fallbackJson, cached: false, fallback: true });
    }

    const prompt = `
당신은 세계 최고의 병원 경영 컨설팅 그룹의 수석 파트너이자 한의원 경영 데이터 분석 전문가입니다.
제공된 한의원의 ${sortedHistory.length}개월간의 경영 데이터를 분석하여 병원장님께 드리는 'EMR 맞춤형 심층 경영 전략 리포트'를 작성해주세요.

[분석 대상 데이터]
- EMR 종류: ${
      emrType === "hanchart"
        ? "한차트 (초진/재진 분석 특화)"
        : emrType === "okchart"
        ? "오케이차트 (수납/미수금 분석 특화)"
        : emrType === "hanisarang"
        ? "한의사랑"
        : emrType === "donguibogam"
        ? "동의보감 (급여+비급여 통합 정밀 분석)"
        : "통합 데이터"
    }
- 분석 기간: ${sortedHistory[0].month} ~ ${sortedHistory[sortedHistory.length - 1].month}
- 월별 데이터 요약:
${dataSummaryLines.map((d) => d.line).join("\n")}

[작성 시 주의사항]
1. 매출 추이(성장/정체/감소)와 급여·비급여 포트폴리오 구조를 데이터 근거를 들어 정확히 짚어주세요.
2. 해당 EMR의 특성에 맞는 지표(예: 한차트 초진 비율, 오케이차트 수납/누수, 동의보감 급여·비급여 밸런스 및 재진율)를 반드시 언급해주세요.
3. 전략 실행 로드맵은 당장 다음 주부터 실행 가능한 구체적인 액션 아이템이어야 합니다.
4. 추천 교육 키워드는 아래 목록에서 가장 시급한 문제를 해결할 수 있는 것으로 엄선하세요.

[응답 JSON 형식]
반드시 아래 구조의 순수 JSON 데이터만 출력해주세요 (마크다운 코드블록 제외):
{
  "summary": {
    "headline": "병원장님을 위한 촌철살인 경영 헤드라인",
    "statusPill": "성장 가속 | 안정화 단계 | 리스크 관리 | 공격적 확장",
    "healthScores": {
      "profitability": 0-100,
      "stability": 0-100,
      "growth": 0-100,
      "patientFlow": 0-100,
      "efficiency": 0-100
    }
  },
  "executiveInsights": [
    { "title": "핵심 통찰 제목", "content": "데이터 기반의 날카로운 분석", "impact": "매우 높음 | 높음" }
  ],
  "actionPlan": [
    { "phase": "1단계: 준비", "task": "구체적인 실천 과제", "expectedEffect": "매출/환자 증가 기대치" },
    { "phase": "2단계: 실행", "task": "구체적인 실천 과제", "expectedEffect": "매출/환자 증가 기대치" },
    { "phase": "3단계: 고도화", "task": "구체적인 실천 과제", "expectedEffect": "매출/환자 증가 기대치" }
  ],
  "recommendedVideoKeyword": "목록 중 1개 (예: 1등 상담 화법)",
  "detailedAnalysis": "전체적인 경영 흐름, 강점, 약점, 기회 요인을 담은 A4 1장 분량의 심층 리포트 (마크다운 활용)"
}

[선택 가능한 키워드 목록]
- 상담/클로징: 1등 상담 화법, 클로징 성공 기술, 고객 심리 공략
- 마케팅/브랜딩: 고객 유입 마케팅 공식, 입소문 마케팅 비결, 브랜딩 차별화 전략
- 서비스/마인드: 친절한 고객 응대 말투, 리더의 조직 관리 대화법, 성공 사업가 마인드셋
`.trim();

    let rawText = "";
    try {
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      });
      rawText = result.response.text();
    } catch (primaryErr: unknown) {
      // 결제/인증 에러(402/401/403)는 백업 모델을 호출해도 동일 키에서 실패하므로 재시도 없이 즉시 Fallback 전환
      if (!isBillingOrAuthError(primaryErr)) {
        try {
          const liteModel = genAI.getGenerativeModel(
            { model: "gemini-2.5-flash-lite" },
            { apiVersion: "v1beta" }
          );
          const backupRes = await liteModel.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" },
          });
          rawText = backupRes.response.text();
        } catch (backupErr) {
          console.warn("⚠️ [AI Briefing] Backup model also failed, engaging deterministic fallback:", backupErr);
        }
      } else {
        console.warn("⚠️ [AI Briefing] Billing/Auth error detected (no retry):", primaryErr);
      }
    }

    if (rawText && !isCorruptedAiCache(rawText)) {
      const cleanJsonMatch = rawText.replace(/```json/gi, "").replace(/```/g, "").trim().match(/\{[\s\S]*\}/);
      if (cleanJsonMatch) {
        const parsed = JSON.parse(cleanJsonMatch[0]);
        if (parsed?.detailedAnalysis) {
          const normalizedStr = JSON.stringify(parsed);
          briefingServerCache.set(cacheKey, { data: normalizedStr, expiry: now + CACHE_TTL_MS });
          return NextResponse.json({ briefing: normalizedStr, cached: false, fallback: false });
        }
      }
    }

    // 4. 어떠한 사유로든 AI 응답이 비정상이면 무중단 정량 통계 브리핑 반환
    const fallbackJson = buildFallbackStrategicBriefing(sortedHistory, emrType);
    return NextResponse.json({ briefing: fallbackJson, cached: false, fallback: true });
  } catch (error) {
    console.error("🔥 [AI Briefing API] Unexpected Error, serving deterministic fallback:", error);
    const fallbackJson = buildFallbackStrategicBriefing(history, emrType);
    return NextResponse.json({ briefing: fallbackJson, cached: false, fallback: true });
  }
}
