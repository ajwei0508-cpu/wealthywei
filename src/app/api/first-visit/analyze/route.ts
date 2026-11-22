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
import { model, deepConsultingModel } from "@/lib/gemini";
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

    // 성별·비급여(실장) 세부 집계
    let maleCnt = 0;
    let femaleCnt = 0;
    let immCnt = 0;
    let herbalCnt = 0;
    let followupCnt = 0;
    let pkgCnt = 0;
    let renewCnt = 0;
    let delayCnt = 0;

    for (const r of rows) {
      const g = (r.gender || "").trim();
      if (g === "남") maleCnt++;
      else if (g === "여") femaleCnt++;

      if ((r.immediatePaymentCount || "").trim() && !/^(무|0|N|X)$/i.test((r.immediatePaymentCount || "").trim())) immCnt++;
      if ((r.herbalMonthlySummary || "").trim() || /한약|첩약|보약/.test(r.treatmentDetail || "")) herbalCnt++;
      if ((r.herbalFollowupPayment || "").trim() === "유") followupCnt++;
      if ((r.packageCount || "").trim() && !/^(0|무)$/i.test((r.packageCount || "").trim())) pkgCnt++;
      if ((r.packageRenewal || "").trim() === "유") renewCnt++;
      if ((r.delayedPaymentWithinMonth || "").trim() && !/^(0|무)$/i.test((r.delayedPaymentWithinMonth || "").trim())) delayCnt++;
    }

    const prompt = `
당신은 대한민국 상위 1% 동네 한의원 경영·임상 데이터 수석 컨설턴트입니다.
'${existing.clinicName || auth.clinicName}'(${existing.directorName || auth.directorName} 원장님)의 실제 초진 데이터를 아래 2대 영역으로 분리해 분석하세요:
1) [보험(원장) 파트]: 초진/재초진, 성별·연령, 예약 확정, 2·3차 재내원율, 주소증, 내원경로까지의 진료·유입 지표
2) [비급여(실장) 파트]: 내원경로 이후 비급여 전환, 당일 즉시결제, 한약 처방, 1제 후 연복, 패키지 등록·연장, 30일 보류 회수 지표

[절대 준수 원칙]
- 제공된 집계 숫자를 오차 없이 정확히 인용하세요.
- 화면에는 오직 핵심 결론만 짧게 노출되므로, 각 항목의 "title"(18자 이내)과 "oneLiner"(핵심 결론 지시 28자 이내)는 극도로 간결하고 명확하게 작성하세요.
- 상세 근거와 현장 대화 스크립트는 아이콘 클릭 모달에서 보여줄 "bullets"에 담으세요.

[실측 집계 데이터]
- 기간: ${analytics.periodLabel} / 총 ${analytics.totalPatients}명 (초진 ${analytics.firstVisitCount}명, 재초진 ${analytics.reFirstVisitCount}명)
- 성별: 남성 ${maleCnt}명, 여성 ${femaleCnt}명 (미기입 ${Math.max(0, analytics.totalPatients - maleCnt - femaleCnt)}명)
- 재내원: 2차 ${analytics.overallSecondVisitRate}% (${analytics.overallSecondVisitCount}명, 권장목표 80%↑), 3차 ${analytics.overallThirdVisitRate}% (${analytics.overallThirdVisitCount}명, 권장목표 70%↑ — 10명 중 타지역·1회성 3명 제외 7명 완주 기준), 다음예약 '유' ${analytics.overallReservationYesRate}% (권장목표 85%↑)
- 연령별 분포(권장목표: 65세 미만 80%↑ : 65세 이상 20%↓ 황금비율 / 1회 진료비 기준: 65세 미만 5만원, 65세 이상 2만원): ${JSON.stringify(analytics.ageDistribution)}
- 내원경로 분포(기록 ${analytics.recordedRouteCount}명 / 미기재 ${analytics.missingRouteCount}명, 권장목표: 순수초진 중 소개 70% : 광고·간판·검색·블로그 외부 신규창출 30%): ${JSON.stringify(analytics.routeDistribution)}
- 진료부위(증상군)별 인원 및 삼진율(권장목표: 부위별 3차 내원율 70%↑, 강점 질환 vs 조기이탈 취약 질환 구분 필수): ${JSON.stringify(analytics.symptomDistribution)}
- 비급여(실장) 기록: 비급여관여 ${analytics.nonCoveredRecordedRows}명, 당일즉시결제 ${immCnt}건, 한약 ${herbalCnt}명(연복 ${followupCnt}명), 패키지 ${pkgCnt}명(연장 ${renewCnt}명), 30일내 지연회수 ${delayCnt}건

[순수 JSON 스키마로만 응답]
{
  "introParagraph": "핵심 경영 한 줄 총평 (45자 이내)",
  "insuranceTakeaways": [
    {
      "title": "초진 안착 · 예약 진단",
      "oneLiner": "28자 이내 핵심 지시 결론",
      "track": "insurance",
      "bullets": [
        { "label": "현황 진단", "content": "수치 기반 재내원·예약 분석" },
        { "label": "원장님 실행 지시", "content": "구체적 진료실 액션 및 1문장 멘트" }
      ]
    },
    {
      "title": "연령 · 성별 · 내원경로 진단",
      "oneLiner": "28자 이내 핵심 지시 결론",
      "track": "insurance",
      "bullets": [
        { "label": "환자층 & 유입 분석", "content": "연령·성별 및 내원경로 효율 진단" },
        { "label": "데스크 실행 지시", "content": "접수·소개 유도 액션" }
      ]
    }
  ],
  "nonCoveredTakeaways": [
    {
      "title": "비급여 · 당일결제 전환 진단",
      "oneLiner": "28자 이내 핵심 지시 결론",
      "track": "non_covered",
      "bullets": [
        { "label": "전환율 분석", "content": "주소증 대비 비급여·즉시결제 누수 진단" },
        { "label": "실장님 클로징 지시", "content": "당일 결제 및 30일 보류 회수 스크립트" }
      ]
    },
    {
      "title": "한약 연복 · 패키지 연장 진단",
      "oneLiner": "28자 이내 핵심 지시 결론",
      "track": "non_covered",
      "bullets": [
        { "label": "LTV(재결제) 분석", "content": "한약·패키지 및 연복·연장 현황" },
        { "label": "실장님 해피콜 지시", "content": "복용 10일차 연복 및 D-2회차 연장 안내법" }
      ]
    }
  ],
  "footnote": "실측 시트 데이터 기반 자동 생성 리포트"
}
`;

    let aiReport: FirstVisitAiReportData = fallback;

    try {
      let rawText = "";
      try {
        const resArgon = await deepConsultingModel.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" },
        });
        rawText = resArgon.response.text();
      } catch {
        const resFlash = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" },
        });
        rawText = resFlash.response.text();
      }

      const parsed = JSON.parse(rawText);
      const insList = Array.isArray(parsed.insuranceTakeaways) ? parsed.insuranceTakeaways : [];
      const ncList = Array.isArray(parsed.nonCoveredTakeaways) ? parsed.nonCoveredTakeaways : [];
      const combined = [...insList, ...ncList];

      if (combined.length > 0) {
        aiReport = {
          generatedAt: new Date().toISOString(),
          analyzedRowCount: analytics.totalPatients,
          introParagraph: parsed.introParagraph || fallback.introParagraph,
          keyTakeaways: combined,
          insuranceTakeaways: insList,
          nonCoveredTakeaways: ncList,
          missingFieldsNotice: missingReport.directorMessages,
          footnote: parsed.footnote || fallback.footnote,
          aiModelUsed: "gemini-4-argon / 3.8-flash",
        };
      }
    } catch (aiErr) {
      console.warn("FirstVisit AI Report used deterministic fallback:", aiErr);
    }

    const isFilteredSubset = Boolean(body.isFilteredSubset);

    // 월별 필터 부분 분석인 경우 기존 전체 rows는 절대 덮어쓰지 않고 보존
    const updatedWorkspace = {
      ...existing,
      rows: isFilteredSubset ? existing.rows : rows,
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
