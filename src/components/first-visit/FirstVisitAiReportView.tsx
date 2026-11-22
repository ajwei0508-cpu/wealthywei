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
  Info,
  X,
} from "lucide-react";
import {
  FirstVisitAnalytics,
  FirstVisitAiReportData,
  MissingDataReport,
  FirstVisitRow,
  FirstVisitTrack,
  KeyTakeawaySection,
} from "@/types/firstVisit";
import FirstVisitAnalyticsView from "./FirstVisitAnalyticsView";

interface Props {
  clinicName: string;
  directorName: string;
  analytics: FirstVisitAnalytics;
  missingReport: MissingDataReport;
  aiReport: FirstVisitAiReportData | null;
  isGenerating: boolean;
  onGenerateReport: () => void;
  rows?: FirstVisitRow[];
  activeTrack?: FirstVisitTrack;
  onTrackChange?: (track: FirstVisitTrack) => void;
}

export default function FirstVisitAiReportView({
  clinicName,
  directorName,
  analytics,
  aiReport,
  isGenerating,
  onGenerateReport,
  rows = [],
  activeTrack: controlledTrack,
  onTrackChange,
}: Props) {
  const [internalTrack, setInternalTrack] = useState<FirstVisitTrack>("insurance");
  const activeTrack = controlledTrack ?? internalTrack;
  const handleTrackChange = (t: FirstVisitTrack) => {
    setInternalTrack(t);
    onTrackChange?.(t);
  };
  const [selectedTakeaway, setSelectedTakeaway] = useState<KeyTakeawaySection | null>(null);

  // 선택된 트랙(보험·원장 vs 비급여·실장)에 맞는 AI 핵심 결론만 필터링
  const activeTakeaways: KeyTakeawaySection[] = (() => {
    if (!aiReport) return [];
    if (activeTrack === "insurance" && aiReport.insuranceTakeaways?.length) {
      return aiReport.insuranceTakeaways;
    }
    if (activeTrack === "non_covered" && aiReport.nonCoveredTakeaways?.length) {
      return aiReport.nonCoveredTakeaways;
    }
    // 구버전 리포트 호환: 인덱스 기준 분배
    if (activeTrack === "insurance") {
      return aiReport.keyTakeaways.slice(0, 2);
    }
    return aiReport.keyTakeaways.slice(2);
  })();

  return (
    <div className="space-y-5">
      {/* 1. 메인 2트랙 [보험(원장) · 비급여(실장)] 통계 기준점 & 동기부여 보드 */}
      <FirstVisitAnalyticsView
        existingFirstVisitRows={rows}
        embedded={true}
        activeTrack={activeTrack}
        onTrackChange={handleTrackChange}
      />

      {/* 2. 심플 AI 핵심 결론 바 (글자 최소화 + ⓘ 아이콘 클릭 시 상세 컨설팅 모달) */}
      <div className="bg-white text-[#111111] rounded-[28px] p-5 md:p-7 border border-[#E5E5E5] space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#B8924A]" />
            <h3 className="text-base font-black text-[#111111]">
              {clinicName} · {activeTrack === "insurance" ? "보험(원장)" : "비급여(실장)"} AI 핵심 결론
            </h3>
            {aiReport?.introParagraph && (
              <span className="hidden lg:inline-block text-xs text-[#666666] font-medium ml-2 truncate max-w-md">
                — {aiReport.introParagraph}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onGenerateReport}
            disabled={isGenerating || rows.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#111111] hover:bg-[#262626] text-[#D4AF37] text-xs font-extrabold transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={isGenerating ? "animate-spin" : ""} />
            <span>{isGenerating ? "AI 분석 중..." : aiReport ? "AI 결론 갱신" : "AI 결론 생성"}</span>
          </button>
        </div>

        {/* AI 1줄 결론 카드 목록 */}
        {activeTakeaways.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {activeTakeaways.map((sec, idx) => {
              const summaryLine =
                sec.oneLiner ||
                sec.bullets?.[0]?.content?.slice(0, 42) + "..." ||
                "우측 아이콘을 눌러 상세 전략을 확인하세요.";
              return (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E5E5E5] flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <span className="text-[11px] font-extrabold text-[#0F5132] block truncate">
                      {sec.title}
                    </span>
                    <p className="text-sm font-black text-[#111111] mt-1 truncate">
                      {summaryLine}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedTakeaway(sec)}
                    className="w-8 h-8 rounded-full bg-white border border-[#D4D4D4] hover:bg-[#111111] hover:border-[#111111] text-[#555555] hover:text-[#D4AF37] flex items-center justify-center shrink-0 transition cursor-pointer"
                    title="AI 상세 분석 및 실행 지시 보기"
                  >
                    <Info size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-dashed border-[#D4D4D4] flex items-center justify-between gap-3 text-xs text-[#666666]">
            <span>우측 [AI 결론 생성] 버튼을 누르면 핵심 지시 요약이 생성됩니다.</span>
          </div>
        )}

        {/* 보험(원장) 선택 시에만 연령·주소증 핵심 분포 차트 간결 노출 */}
        {activeTrack === "insurance" && analytics.totalPatients > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2 border-t border-[#F0F0F0]">
            <div className="bg-[#FAFAFA] rounded-2xl p-4 border border-[#EAEAEA]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-extrabold text-[#111111]">연령대별 환자 분포</span>
                <span className="text-[11px] text-[#737373]">60대↑ {analytics.senior60PlusPct}%</span>
              </div>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.ageDistribution} margin={{ top: 14, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAEAEA" />
                    <XAxis dataKey="ageGroup" tick={{ fill: "#333333", fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fill: "#888888", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#111111", border: "none", borderRadius: "10px", color: "#fff", fontSize: "11px" }}
                      formatter={(val: any, _n: any, item: any) => [
                        `${val}명 (2차 ${item?.payload?.secondVisitRate ?? 0}%)`,
                        "인원",
                      ]}
                    />
                    <Bar dataKey="total" fill="#0F5132" radius={[4, 4, 0, 0]} maxBarSize={36}>
                      <LabelList dataKey="total" position="top" style={{ fill: "#111111", fontSize: 10, fontWeight: 800 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-[#FAFAFA] rounded-2xl p-4 border border-[#EAEAEA]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-extrabold text-[#111111]">주요 증상군 인원 · 삼진율</span>
                <span className="text-[11px] text-[#737373]">삼진 목표 70%↑</span>
              </div>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analytics.symptomDistribution}
                    layout="vertical"
                    margin={{ top: 4, right: 64, left: 16, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#EAEAEA" />
                    <XAxis type="number" allowDecimals={false} hide />
                    <YAxis
                      type="category"
                      dataKey="category"
                      width={95}
                      tick={{ fill: "#111111", fontSize: 11, fontWeight: 700 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#111111", border: "none", borderRadius: "10px", color: "#fff", fontSize: "11px" }}
                      formatter={(val: any, _n: any, item: any) => [
                        `${val}명 (2차 ${item?.payload?.secondVisitRate ?? 0}% · 삼진 ${item?.payload?.thirdVisitRate ?? 0}%)`,
                        "집계",
                      ]}
                    />
                    <Bar dataKey="count" fill="#C5A059" radius={[0, 4, 4, 0]} barSize={18}>
                      <LabelList
                        dataKey="count"
                        position="right"
                        formatter={(val: any) => `${val}명`}
                        style={{ fill: "#111111", fontSize: 10, fontWeight: 800 }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI 상세 해설 모달 (ⓘ 클릭 시) */}
      {selectedTakeaway && (
        <div
          className="fixed inset-0 z-[120] bg-black/55 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={() => setSelectedTakeaway(null)}
        >
          <div
            className="bg-white text-[#111111] w-full max-w-lg rounded-3xl border border-[#E5E5E5] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#111111] text-white px-6 py-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold tracking-widest uppercase text-[#D4AF37] block">
                  AI PRESCRIPTIVE GUIDE
                </span>
                <h3 className="text-base font-black mt-0.5">{selectedTakeaway.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTakeaway(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-3.5 text-xs leading-relaxed max-h-[75vh] overflow-y-auto">
              {selectedTakeaway.oneLiner && (
                <div className="p-3 rounded-xl bg-[#F4F8F5] border border-[#C6DFCE] text-[#0F5132] font-extrabold text-sm">
                  핵심 결론: {selectedTakeaway.oneLiner}
                </div>
              )}
              <div className="space-y-3">
                {selectedTakeaway.bullets.map((b, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-[#FAFAFA] border border-[#EAEAEA]">
                    <strong className="font-extrabold text-[#111111] block mb-1">{b.label}</strong>
                    <p className="text-[#404040]">{b.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
