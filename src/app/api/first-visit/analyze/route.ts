import { NextRequest, NextResponse } from "next/server";
import {
  verifyFirstVisitAccess,
  readWorkspaceFromStorage,
  saveWorkspaceToStorage,
} from "@/lib/firstVisitServerAuth";
import {
  computeFirstVisitAnalytics,
  computeMissingDataReport,
  buildFallbackAiReport,
} from "@/lib/firstVisitEngine";
import { model } from "@/lib/gemini";
import { FirstVisitAiReportData, FirstVisitRow } from "@/types/firstVisit";

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const viewAs = searchParams.get("viewAs");

  const auth = await verifyFirstVisitAccess(viewAs);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const existing = await readWorkspaceFromStorage(
      auth.targetEmail,
      auth.clinicName,
      auth.directorName
    );

    const rows: FirstVisitRow[] = Array.isArray(body.rows) ? body.rows : existing.rows;

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: "분석할 초진 환자 데이터가 없습니다. 먼저 일일 환자 리스트를 업로드해 주세요." },
        { status: 400 }
      );
    }

    const analytics = computeFirstVisitAnalytics(rows);
    const missingReport = computeMissingDataReport(rows);
    const fallback = buildFallbackAiReport(analytics, missingReport);

    const prompt = `
당신은 대한민국 상위 1% 한의원 경영·임상 데이터 수석 컨설턴트입니다.
제공된 '${existing.clinicName || auth.clinicName}'(${existing.directorName || auth.directorName} 원장님)의 실제 초진/재초진 환자 정밀 집계 데이터를 바탕으로, 원장님께 브리핑하는 '초진·재내원 심층 분석 리포트'를 작성해주세요.

[절대 준수 원칙]
1. 아래 [정밀 집계 데이터]에 명시된 숫자(환자 수, 비율 %, 건수)를 단 1의 오차도 없이 정확히 인용하세요. 임의로 숫자를 지어내지 마세요.
2. 리포트의 문체와 구성은 전문 컨설팅 보고서 톤("~보였습니다.", "~견인하고 있습니다.", "~요구됩니다.")으로 작성하세요.
3. 2번 표준 시트에서 공란(미기재)으로 남아있는 항목들에 대해서는 원장님께 왜 공란인지 안내하고, 접수실/상담실에서 어떤 데이터를 보완하면 좋은지 실질적인 가이드를 포함하세요.

[정밀 집계 데이터]
- 분석 기간: ${analytics.periodLabel}
- 총 분석 환자 수: ${analytics.totalPatients}명 (초진: ${analytics.firstVisitCount}명, 재초진: ${analytics.reFirstVisitCount}명, 구분미기재: ${analytics.untypedVisitCount}명)
- 전체 평균 2차 재내원율: ${analytics.overallSecondVisitRate}% (${analytics.overallSecondVisitCount}명)
- 전체 평균 3차 재내원율: ${analytics.overallThirdVisitRate}% (${analytics.overallThirdVisitCount}명)
- 다음 진료 예약 안내('유') 비율: ${analytics.overallReservationYesRate}%
- 월별 추이: ${JSON.stringify(analytics.monthlySummary)}
- 일자별 요약(최근 15일): ${JSON.stringify(analytics.dailySummary.slice(-15))}
- 연령대별 분포 및 재내원율: ${JSON.stringify(analytics.ageDistribution)} (연령 미기재: ${analytics.unknownAgeCount}명, 60대 이상 고령층 합계: ${analytics.senior60PlusCount}명 / 전체의 ${analytics.senior60PlusPct}% / 2차 재내원율 ${analytics.senior60PlusSecondRate}% / 3차 재내원율 ${analytics.senior60PlusThirdRate}%)
- 내원경로 분포(기록된 ${analytics.recordedRouteCount}명 기준): ${JSON.stringify(analytics.routeDistribution)} / 내원경로 미기재(공란): ${analytics.missingRouteCount}명 (전체의 ${analytics.missingRoutePct}%)
- 주요 증상 및 진료 부위 분포: ${JSON.stringify(analytics.symptomDistribution)} (진료내역 공란: ${analytics.missingSymptomCount}명)
- 환자구분(보험유형) 분포: ${JSON.stringify(analytics.insuranceBreakdown)}
- 비급여/한약/패키지 기록 행 수: ${analytics.nonCoveredRecordedRows}건
- 공란(미기재) 항목 현황 요약: ${JSON.stringify(missingReport.directorMessages)}

[응답 JSON 스키마 - 반드시 순수 JSON만 반환]
{
  "introParagraph": "분석 기간, 총 환자 건수, 월별/일별 추이·연령대별 재내원 특성·내원 경로·주요 진료 부위 다각적 분석임을 밝히는 도입 요약문 (1~2문장)",
  "keyTakeaways": [
    {
      "title": "1. 신규/재초진 환자 유입 추이 및 연령대별 치료 순응도(재내원율) 진단 (핵심 결론 한 줄 요약 제목)",
      "bullets": [
        { "label": "신규/재초진 유입 경향", "content": "구체적 수치 기반 분석 및 차트 참조 안내" },
        { "label": "연령별 차별화된 재내원율", "content": "고령층 등 주력 연령대 비중 및 2·3차 재내원율 수치 분석" },
        { "label": "취약 연령층 이탈 방어 전략", "content": "상대적으로 재내원율이 낮은 연령군 수치와 맞춤 예약·초진 상담 개선책" }
      ]
    },
    {
      "title": "2. 내원 경로별 유입 효율성 및 접수 데이터(공란 항목) 관리 진단 (핵심 결론 제목)",
      "bullets": [
        { "label": "핵심 유입 채널 분석", "content": "소개 등 1순위 경로 비중과 2·3차 재내원율 리텐션 분석" },
        { "label": "온라인/기타 유입 잠재력", "content": "인터넷/검색, 간판 등 보조 경로의 치료 지속성 및 확장 조언" },
        { "label": "공란(미기재) 데이터 관리 안내", "content": "내원 경로 미기재율(${analytics.missingRoutePct}%) 및 차트 내 공란 항목에 대한 접수 프로세스 표준화 제언" }
      ]
    },
    {
      "title": "3. 주요 진료 부위(주소증) 집중도 및 한약·비급여 확장 전략 (핵심 결론 제목)",
      "bullets": [
        { "label": "주력 질환군 분포", "content": "상위 1~3위 증상/부위 비중(%)과 환자 수 분석" },
        { "label": "한약·약침·추나·패키지 연계성", "content": "통증 치료 환자의 비급여/보약/다이어트 상담 확장 및 시트 내 비급여 결제 지표 활용 안내" }
      ]
    }
  ],
  "footnote": "참고 및 전제 조건 안내 문구 (최근 진료 진행 중 재내원율 영향, 일자 공란 전진 채움 기준, 차트 미포함 항목 공란 처리 원칙 명시)"
}
`;

    let aiReport: FirstVisitAiReportData = fallback;

    try {
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      });
      const parsed = JSON.parse(result.response.text());
      if (parsed && Array.isArray(parsed.keyTakeaways) && parsed.keyTakeaways.length > 0) {
        aiReport = {
          generatedAt: new Date().toISOString(),
          analyzedRowCount: analytics.totalPatients,
          introParagraph: parsed.introParagraph || fallback.introParagraph,
          keyTakeaways: parsed.keyTakeaways,
          missingFieldsNotice: missingReport.directorMessages,
          footnote: parsed.footnote || fallback.footnote,
          aiModelUsed: "gemini-2.5-flash",
        };
      }
    } catch (aiErr) {
      console.warn("FirstVisit AI Report used deterministic fallback:", aiErr);
    }

    const updatedWorkspace = {
      ...existing,
      rows,
      aiReport,
      updatedAt: new Date().toISOString(),
    };
    await saveWorkspaceToStorage(updatedWorkspace);

    return NextResponse.json({
      success: true,
      aiReport,
      analytics,
      missingReport,
    });
  } catch (err: any) {
    console.error("FirstVisit Analyze Error:", err);
    return NextResponse.json(
      { error: err?.message || "AI 분석 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
