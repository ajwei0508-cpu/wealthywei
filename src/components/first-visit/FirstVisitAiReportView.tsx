"use client";

import React, { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
} from "recharts";
import {
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  FileText,
  TrendingUp,
  Users,
  Activity,
} from "lucide-react";
import {
  FirstVisitAnalytics,
  FirstVisitAiReportData,
  MissingDataReport,
} from "@/types/firstVisit";

interface Props {
  clinicName: string;
  directorName: string;
  analytics: FirstVisitAnalytics;
  missingReport: MissingDataReport;
  aiReport: FirstVisitAiReportData | null;
  isGenerating: boolean;
  onGenerateReport: () => void;
}

export default function FirstVisitAiReportView({
  clinicName,
  directorName,
  analytics,
  missingReport,
  aiReport,
  isGenerating,
  onGenerateReport,
}: Props) {
  const [trendMode, setTrendMode] = useState<"monthly" | "daily">(
    analytics.monthlySummary.length <= 1 && analytics.dailySummary.length > 1
      ? "daily"
      : "monthly"
  );

  if (analytics.totalPatients === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-[28px] p-14 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center mx-auto text-amber-300">
          <Sparkles size={30} />
        </div>
        <h3 className="text-xl font-black text-white">
          아직 분석할 초진·재초진 환자 리스트가 없습니다
        </h3>
        <p className="text-sm text-white/55 max-w-lg mx-auto leading-relaxed">
          상단 업로드 영역에 사용 중이신 차트 프로그램(한차트·오케이차트·한의사랑·동의보감·엑셀 시트 등)의{" "}
          <strong className="text-amber-300">일일 환자 리스트</strong>를 업로드하시면, 3대 시각 차트와 원장님 맞춤형 AI 심층 리포트가 자동 생성됩니다.
        </p>
      </div>
    );
  }

  const trendChartData =
    trendMode === "monthly"
      ? analytics.monthlySummary.map((m) => ({
          name: m.month,
          total_patients: m.totalPatients,
          secondRate: m.secondVisitRate,
          thirdRate: m.thirdVisitRate,
        }))
      : analytics.dailySummary.map((d) => ({
          name: d.label,
          total_patients: d.totalPatients,
          secondRate: d.secondVisitRate,
          thirdRate: d.thirdVisitRate,
        }));

  const isOutdated =
    aiReport && aiReport.analyzedRowCount !== analytics.totalPatients;

  return (
    <div className="space-y-8">
      {/* 상단 액션 헤더 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-950/90 via-[#07291c] to-emerald-950/80 border border-emerald-500/25 rounded-3xl p-6 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/30">
              AI EXECUTIVE CLINICAL REPORT
            </span>
            {aiReport?.generatedAt && (
              <span className="text-xs text-white/45">
                최근 생성: {new Date(aiReport.generatedAt).toLocaleString("ko-KR")}
              </span>
            )}
            {isOutdated && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                신규 데이터 반영 필요
              </span>
            )}
          </div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <FileText size={20} className="text-amber-400" />
            {clinicName} ({directorName} 원장님) 초진·재내원 AI 심층 분석서
          </h2>
          <p className="text-xs text-white/60">
            분석 기간: <strong className="text-emerald-300">{analytics.periodLabel}</strong> · 총{" "}
            <strong className="text-white">{analytics.totalPatients}명</strong> (2차 재내원율{" "}
            <strong className="text-amber-300">{analytics.overallSecondVisitRate}%</strong> / 3차 재내원율{" "}
            <strong className="text-emerald-300">{analytics.overallThirdVisitRate}%</strong>)
          </p>
        </div>

        <button
          type="button"
          onClick={onGenerateReport}
          disabled={isGenerating}
          className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-[#031C13] font-black text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-60 active:scale-95"
        >
          <RefreshCw size={16} className={isGenerating ? "animate-spin" : ""} />
          <span>{isGenerating ? "AI가 정밀 분석 중입니다..." : aiReport ? "AI 분석 리포트 최신화" : "AI 심층 분석 생성하기"}</span>
        </button>
      </div>

      {/* 핵심 KPI 요약 4단 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between text-white/50 text-xs font-bold mb-1">
            <span>누적 초진·재초진 환자</span>
            <Users size={15} className="text-blue-400" />
          </div>
          <p className="text-2xl font-black text-white">{analytics.totalPatients}명</p>
          <p className="text-[11px] text-white/45 mt-1">
            초진 {analytics.firstVisitCount}명 · 재초진 {analytics.reFirstVisitCount}명
            {analytics.untypedVisitCount > 0 ? ` · 미분류 ${analytics.untypedVisitCount}명` : ""}
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between text-white/50 text-xs font-bold mb-1">
            <span>2차 재내원율 (초기 안착)</span>
            <TrendingUp size={15} className="text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-300">{analytics.overallSecondVisitRate}%</p>
          <p className="text-[11px] text-white/45 mt-1">
            총 {analytics.overallSecondVisitCount}명 2회차 내원 완료
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between text-white/50 text-xs font-bold mb-1">
            <span>3차 재내원율 (치료 지속)</span>
            <CheckCircle2 size={15} className="text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-300">{analytics.overallThirdVisitRate}%</p>
          <p className="text-[11px] text-white/45 mt-1">
            총 {analytics.overallThirdVisitCount}명 3회차 내원 완료
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between text-white/50 text-xs font-bold mb-1">
            <span>내원경로 기재율</span>
            <Activity size={15} className="text-rose-400" />
          </div>
          <p className="text-2xl font-black text-white">
            {(100 - analytics.missingRoutePct).toFixed(1)}%
          </p>
          <p className="text-[11px] text-white/45 mt-1">
            기입 {analytics.recordedRouteCount}명 · 공란 {analytics.missingRouteCount}명
          </p>
        </div>
      </div>

      {/* === 3번 구글 문서(Doc) 백서 스타일 본문 + 3대 시각 차트 === */}
      <div className="bg-[#FAFBFD] text-slate-800 rounded-[32px] shadow-2xl border border-slate-200/80 overflow-hidden">
        {/* 문서 상단: 3대 핵심 차트 영역 (Google Doc 1:1 구성) */}
        <div className="p-6 md:p-10 space-y-8 bg-[#F2F5F8] border-b border-slate-200">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* 차트 1: 월별(또는 일별) 초진/재초진 환자 수 추이 */}
            <div className="bg-[#F4F6F9] rounded-2xl p-6 border border-slate-200/90 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[15px] font-extrabold text-slate-800">
                  {trendMode === "monthly"
                    ? `월별 초진/재초진 환자 수 추이 (${analytics.periodLabel})`
                    : `일자별 초진/재초진 환자 수 추이 (${analytics.periodLabel})`}
                </h3>
                <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setTrendMode("monthly")}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                      trendMode === "monthly"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    월별
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrendMode("daily")}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                      trendMode === "daily"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    일별
                  </button>
                </div>
              </div>
              <div className="h-[290px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendChartData} margin={{ top: 18, right: 16, left: -8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="0" vertical={false} stroke="#CBD5E1" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#475569", fontSize: 11, fontWeight: 600 }}
                      axisLine={{ stroke: "#334155" }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: "#475569", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0F172A",
                        border: "none",
                        borderRadius: "12px",
                        color: "#F8FAFC",
                        fontSize: "12px",
                      }}
                      formatter={(val: any, _name: any, item: any) => [
                        `${val}명 (2차 ${item?.payload?.secondRate ?? 0}% · 3차 ${item?.payload?.thirdRate ?? 0}%)`,
                        "환자 수",
                      ]}
                    />
                    <Bar dataKey="total_patients" fill="#4675A6" radius={[4, 4, 0, 0]} maxBarSize={68}>
                      <LabelList
                        dataKey="total_patients"
                        position="top"
                        style={{ fill: "#334155", fontSize: 11, fontWeight: 700 }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 차트 2: 연령대별 환자 수 분포 및 재내원율 */}
            <div className="bg-[#F4F6F9] rounded-2xl p-6 border border-slate-200/90 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[15px] font-extrabold text-slate-800">
                  연령대별 환자 수 분포 및 재내원율
                </h3>
                {analytics.unknownAgeCount > 0 && (
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                    연령 공란 {analytics.unknownAgeCount}명 제외
                  </span>
                )}
              </div>
              <div className="h-[290px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analytics.ageDistribution}
                    margin={{ top: 18, right: 16, left: -8, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="0" vertical={false} stroke="#CBD5E1" />
                    <XAxis
                      dataKey="ageGroup"
                      tick={{ fill: "#475569", fontSize: 11, fontWeight: 600 }}
                      axisLine={{ stroke: "#334155" }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: "#475569", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0F172A",
                        border: "none",
                        borderRadius: "12px",
                        color: "#F8FAFC",
                        fontSize: "12px",
                      }}
                      formatter={(val: any, _name: any, item: any) => [
                        `${val}명 (비중 ${item?.payload?.sharePct ?? 0}% | 2차 재내원 ${item?.payload?.secondVisitRate ?? 0}% · 3차 ${item?.payload?.thirdVisitRate ?? 0}%)`,
                        "환자 수",
                      ]}
                    />
                    <Bar dataKey="total" fill="#DE5656" radius={[4, 4, 0, 0]} maxBarSize={54}>
                      <LabelList
                        dataKey="total"
                        position="top"
                        style={{ fill: "#334155", fontSize: 11, fontWeight: 700 }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* 차트 3: 주요 증상 및 진료 부위별 환자 수 (가로 막대형) */}
          <div className="bg-[#F4F6F9] rounded-2xl p-6 border border-slate-200/90 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-extrabold text-slate-800">
                주요 증상 및 진료 부위별 환자 수
              </h3>
              {analytics.missingSymptomCount > 0 && (
                <span className="text-[11px] font-bold text-slate-600 bg-slate-200 px-2.5 py-0.5 rounded-full">
                  진료내역 공란 {analytics.missingSymptomCount}명
                </span>
              )}
            </div>
            <div className="h-[290px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics.symptomDistribution}
                  layout="vertical"
                  margin={{ top: 8, right: 36, left: 28, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="0" horizontal={false} stroke="#CBD5E1" />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fill: "#475569", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="category"
                    width={120}
                    tick={{ fill: "#334155", fontSize: 12, fontWeight: 700 }}
                    axisLine={{ stroke: "#334155" }}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0F172A",
                      border: "none",
                      borderRadius: "12px",
                      color: "#F8FAFC",
                      fontSize: "12px",
                    }}
                    formatter={(val: any, _name: any, item: any) => [
                      `${val}명 (전체 대비 ${item?.payload?.sharePct ?? 0}%)`,
                      "환자 수",
                    ]}
                  />
                  <Bar dataKey="count" fill="#559E4C" radius={[0, 4, 4, 0]} barSize={28}>
                    <LabelList
                      dataKey="count"
                      position="right"
                      style={{ fill: "#334155", fontSize: 11, fontWeight: 700 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 문서 하단: AI 텍스트 분석 리포트 & 요약 테이블 */}
        <div className="p-8 md:p-12 space-y-8 bg-white">
          {aiReport ? (
            <>
              {/* 도입부 요약 */}
              <p className="text-[15.5px] leading-relaxed text-slate-700 font-medium border-b border-slate-200 pb-6">
                {aiReport.introParagraph}
              </p>

              {/* Key Takeaways (핵심 분석 결과) */}
              <div className="space-y-7">
                <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span className="w-1.5 h-6 rounded-full bg-emerald-600 inline-block" />
                  Key Takeaways (핵심 분석 결과)
                </h3>

                <div className="space-y-7">
                  {aiReport.keyTakeaways.map((sec, sIdx) => (
                    <div key={sIdx} className="space-y-3">
                      <h4 className="text-[16.5px] font-extrabold text-slate-900">
                        {sec.title}
                      </h4>
                      <ul className="space-y-2.5 pl-5 list-disc marker:text-emerald-600">
                        {sec.bullets.map((b, bIdx) => (
                          <li key={bIdx} className="text-[14.5px] leading-relaxed text-slate-700">
                            <strong className="font-extrabold text-slate-900">{b.label}</strong>:{" "}
                            {b.content}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-extrabold text-emerald-950">
                  차트 시각화가 준비되었습니다! 상단 [AI 심층 분석 생성하기] 버튼을 누르시면 원장님 맞춤 Key Takeaways 해설이 작성됩니다.
                </p>
                <p className="text-xs text-emerald-800/80">
                  월별 추이, 연령별 재내원 격차, 내원경로 효율성, 주소증 분포 및 공란 항목 보완 가이드를 한 번에 브리핑해 드립니다.
                </p>
              </div>
              <button
                type="button"
                onClick={onGenerateReport}
                disabled={isGenerating}
                className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black shrink-0 cursor-pointer transition"
              >
                {isGenerating ? "분석 생성 중..." : "지금 AI 해설 생성"}
              </button>
            </div>
          )}

          {/* 원장님 공란(미기재) 항목 안내 박스 (요구사항 4번 연동) */}
          {missingReport.directorMessages.length > 0 && (
            <div className="rounded-2xl bg-amber-50/90 border border-amber-200 p-6 space-y-2.5">
              <div className="flex items-center gap-2 text-amber-900 font-extrabold text-sm">
                <AlertCircle size={18} className="text-amber-600 shrink-0" />
                <span>원장님 확인 안내 — 2번 표준 시트 내 공란(미포함·미기재) 항목 브리핑</span>
              </div>
              <ul className="space-y-1.5 pl-6 list-disc text-[13.5px] text-amber-950/85 leading-relaxed">
                {missingReport.directorMessages.map((msg, idx) => (
                  <li key={idx}>{msg}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 분석 요약 데이터 표 (3번 Google Doc 동일 양식) */}
          <div className="space-y-4 pt-2 border-t border-slate-200">
            <h3 className="text-lg font-black text-slate-900">분석 요약 데이터</h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4 font-extrabold whitespace-nowrap">구분</th>
                    {analytics.monthlySummary.map((m) => (
                      <th key={m.month} className="py-3.5 px-4 font-extrabold text-center whitespace-nowrap">
                        {m.month}
                      </th>
                    ))}
                    <th className="py-3.5 px-4 font-black text-center bg-emerald-50 text-emerald-900 whitespace-nowrap">
                      합계/평균
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">환자 수 (명)</td>
                    {analytics.monthlySummary.map((m) => (
                      <td key={m.month} className="py-3 px-4 text-center font-semibold">
                        {m.totalPatients}
                      </td>
                    ))}
                    <td className="py-3 px-4 text-center font-black bg-emerald-50/50 text-emerald-950">
                      {analytics.totalPatients}명
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">2차 재내원율 (%)</td>
                    {analytics.monthlySummary.map((m) => (
                      <td key={m.month} className="py-3 px-4 text-center font-semibold">
                        {m.secondVisitRate}%
                      </td>
                    ))}
                    <td className="py-3 px-4 text-center font-black bg-emerald-50/50 text-emerald-950">
                      {analytics.overallSecondVisitRate}%
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">3차 재내원율 (%)</td>
                    {analytics.monthlySummary.map((m) => (
                      <td key={m.month} className="py-3 px-4 text-center font-semibold">
                        {m.thirdVisitRate}%
                      </td>
                    ))}
                    <td className="py-3 px-4 text-center font-black bg-emerald-50/50 text-emerald-950">
                      {analytics.overallThirdVisitRate}%
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">다음 진료 예약률 (%)</td>
                    {analytics.monthlySummary.map((m) => (
                      <td key={m.month} className="py-3 px-4 text-center font-semibold text-slate-600">
                        {m.reservationRecordedCount > 0 ? `${m.reservationYesRate}%` : "공란"}
                      </td>
                    ))}
                    <td className="py-3 px-4 text-center font-black bg-emerald-50/50 text-emerald-950">
                      {analytics.overallReservationYesRate}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-xs italic text-slate-500 leading-relaxed pt-1">
              *{aiReport?.footnote ||
                "참고 및 전제 조건: 최근 월/일 데이터의 재내원율 감소는 진료 기록 및 후속 내원 진행 중 영향이 반영되었을 수 있습니다. 일자가 공란으로 입력된 행은 동일 날짜 연속 방문 데이터로 전진 채움(Forward-fill)하여 분석을 수행하였으며, 원장님 차트에 없는 시트 항목은 공란으로 유지됩니다."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
