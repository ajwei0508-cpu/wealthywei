"use client";

import React from "react";
import { motion } from "framer-motion";
import { useCardExpense } from "@/context/CardExpenseContext";
import { 
  Building2, 
  CreditCard, 
  Download, 
  CheckCircle2, 
  TrendingUp, 
  Sparkles, 
  FileSpreadsheet,
  ArrowRight,
  Layers
} from "lucide-react";

export default function CardCompanySummary() {
  const { 
    cardCompanyStats, 
    filter, 
    setSelectedCardCompany, 
    exportMultiSheetExcel, 
    exportSingleCardExcel,
    totalSpend
  } = useCardExpense();

  return (
    <div className="w-full mb-8 space-y-5">
      {/* Section Header with Multi-Sheet Export CTA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-stone-950 border border-amber-500/20 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-md">
            <Building2 size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                CARD ISSUER HUB
              </span>
              <h3 className="text-base font-bold text-white tracking-tight">
                카드사별 취합 & 실적 현황
              </h3>
            </div>
            <p className="text-xs text-white/50 mt-0.5">
              소지하신 각 카드사별 사용 금액, 결제 건수, 주력 소비 업종을 한눈에 비교 취합합니다.
            </p>
          </div>
        </div>

        {/* Multi-sheet Excel Export Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={exportMultiSheetExcel}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-black bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 shadow-lg shadow-amber-500/20 transition-all cursor-pointer whitespace-nowrap"
          title="카드사별로 시트가 자동 분리된 엑셀 보고서를 다운로드합니다"
        >
          <FileSpreadsheet size={15} />
          <span>카드사별 시트 분리 엑셀 다운로드</span>
        </motion.button>
      </div>

      {/* Card Company Quick Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedCardCompany("all")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 border ${
            filter.selectedCardCompany === "all"
              ? "bg-amber-400 text-black border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.35)]"
              : "bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border-white/5"
          }`}
        >
          <Layers size={13} />
          <span>모든 카드사 통합 ({cardCompanyStats.length}곳)</span>
        </button>

        {cardCompanyStats.map((comp) => {
          const isSelected = filter.selectedCardCompany === comp.companyName;
          return (
            <button
              key={comp.companyName}
              onClick={() => setSelectedCardCompany(isSelected ? "all" : comp.companyName)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 border ${
                isSelected
                  ? "bg-amber-400/20 text-amber-300 border-amber-400/60 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                  : "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border-white/5"
              }`}
            >
              <span 
                className="w-2.5 h-2.5 rounded-full shadow-sm"
                style={{ backgroundColor: comp.accentColor }} 
              />
              <span>{comp.companyName}</span>
              <span className="font-mono text-[11px] opacity-60">
                ₩{(comp.amount / 10000).toFixed(0)}만
              </span>
            </button>
          );
        })}
      </div>

      {/* Card Company Detailed Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cardCompanyStats.map((comp, idx) => {
          const isSelected = filter.selectedCardCompany === comp.companyName;
          const isTargetMet = comp.amount >= comp.monthlyTarget;
          const targetPercent = Math.min(100, Math.round((comp.amount / comp.monthlyTarget) * 100));

          return (
            <motion.div
              key={comp.companyName}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              className={`relative overflow-hidden rounded-3xl p-5 border transition-all duration-300 flex flex-col justify-between ${
                isSelected
                  ? "border-amber-400/80 bg-gradient-to-br from-neutral-900 via-stone-900 to-black ring-2 ring-amber-400/30 shadow-[0_10px_30px_rgba(245,158,11,0.2)]"
                  : "border-white/10 hover:border-white/20 bg-neutral-900/70 backdrop-blur-md hover:bg-neutral-900/90 shadow-xl"
              }`}
            >
              {/* Subtle Brand Glow */}
              <div 
                className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none"
                style={{ backgroundColor: comp.accentColor }}
              />

              <div>
                {/* Header: Company Name & Share Badge */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-3 h-3 rounded-full shadow-[0_0_8px_currentColor]"
                      style={{ backgroundColor: comp.accentColor, color: comp.accentColor }}
                    />
                    <h4 className="text-base font-black text-white tracking-tight">
                      {comp.companyName}
                    </h4>
                  </div>

                  <span className="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
                    점유율 {comp.percent}%
                  </span>
                </div>

                {/* Amount and Count */}
                <div className="mb-4">
                  <div className="text-2xl font-black text-white font-mono tracking-tight">
                    ₩{comp.amount.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/50 mt-1">
                    <span>총 {comp.count}건 결제</span>
                    <span>•</span>
                    <span>건당 평균 ₩{comp.avgAmount.toLocaleString()}</span>
                  </div>
                </div>

                {/* Metrics Pill Box */}
                <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-2 mb-4">
                  {/* Top Category */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/40">주력 지출 업종</span>
                    <span 
                      className="font-bold flex items-center gap-1.5"
                      style={{ color: comp.topCategoryColor }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: comp.topCategoryColor }}></span>
                      {comp.topCategoryName}
                    </span>
                  </div>

                  {/* Monthly Benefit Target Progress */}
                  <div className="space-y-1 pt-1 border-t border-white/5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-white/40">혜택 실적 (목표 ₩{comp.monthlyTarget.toLocaleString()})</span>
                      <span className={`font-mono font-bold ${isTargetMet ? "text-emerald-400" : "text-amber-400"}`}>
                        {isTargetMet ? "실적 충족 완료 ✓" : `${targetPercent}%`}
                      </span>
                    </div>

                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isTargetMet 
                            ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.7)]" 
                            : "bg-gradient-to-r from-amber-500 to-yellow-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                        }`}
                        style={{ width: `${targetPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons for this Card Company */}
              <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                <button
                  onClick={() => setSelectedCardCompany(isSelected ? "all" : comp.companyName)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    isSelected
                      ? "bg-amber-400 text-black shadow-md"
                      : "bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/5"
                  }`}
                >
                  {isSelected ? (
                    <>
                      <CheckCircle2 size={13} />
                      <span>필터 해제</span>
                    </>
                  ) : (
                    <>
                      <span>내역 모아보기</span>
                      <ArrowRight size={13} />
                    </>
                  )}
                </button>

                <button
                  onClick={() => exportSingleCardExcel(comp.companyName)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-amber-300 border border-white/5 transition-all"
                  title={`${comp.companyName} 내역만 엑셀 다운로드`}
                >
                  <Download size={14} />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
