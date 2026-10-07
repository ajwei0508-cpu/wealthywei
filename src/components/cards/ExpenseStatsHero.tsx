"use client";

import React from "react";
import { motion } from "framer-motion";
import { useCardExpense } from "@/context/CardExpenseContext";
import { 
  TrendingUp, 
  Receipt, 
  Calendar, 
  Sparkles, 
  Crown, 
  Flame,
  ArrowUpRight,
  PieChart as PieIcon
} from "lucide-react";

export default function ExpenseStatsHero() {
  const { 
    totalSpend, 
    totalCount, 
    dailyAverage, 
    categoryStats, 
    filteredTransactions,
    availableMonths,
    filter,
    setSelectedMonth
  } = useCardExpense();

  const topCategory = categoryStats.length > 0 ? categoryStats[0] : null;
  const highestTx = filteredTransactions.length > 0
    ? [...filteredTransactions].sort((a, b) => b.amount - a.amount)[0]
    : null;

  return (
    <div className="w-full mb-8 space-y-6">
      {/* Month Filter Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-neutral-900/60 backdrop-blur-md border border-white/10 shadow-lg">
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          <span className="text-xs text-white/40 font-semibold px-2 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar size={13} className="text-amber-400" />
            분석 기간
          </span>
          {availableMonths.map((m) => {
            const isSelected = filter.selectedMonth === m;
            const [y, mon] = m.split("-");
            return (
              <motion.button
                key={m}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedMonth(m)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  isSelected
                    ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                    : "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/5"
                }`}
              >
                {y}년 {parseInt(mon, 10)}월
              </motion.button>
            );
          })}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedMonth("all")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filter.selectedMonth === "all"
                ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                : "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/5"
            }`}
          >
            전체 기간 통합
          </motion.button>
        </div>

        <div className="flex items-center gap-2 text-xs text-amber-400/90 bg-amber-400/10 px-3.5 py-1.5 rounded-full border border-amber-400/20">
          <Sparkles size={13} className="animate-spin text-amber-300" style={{ animationDuration: "6s" }} />
          <span>지능형 소비 분류 엔진 가동 중</span>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Spend */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-br from-neutral-900 via-neutral-900/90 to-stone-950 border border-amber-500/30 shadow-[0_10px_30px_rgba(0,0,0,0.5)] group"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all duration-500" />
          
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-amber-400/80 tracking-wider uppercase flex items-center gap-1.5">
              <Crown size={14} className="text-amber-400" />
              총 승인 지출액
            </span>
            <span className="text-[11px] text-white/40 font-mono bg-white/5 px-2.5 py-0.5 rounded-full border border-white/5">
              {totalCount}건
            </span>
          </div>

          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl lg:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 font-mono tracking-tight">
              ₩{totalSpend.toLocaleString()}
            </span>
          </div>

          <p className="text-[11px] text-white/50 mt-3 flex items-center gap-1">
            <ArrowUpRight size={12} className="text-amber-400" />
            선택 기간 동안 집계된 실제 카드 지출 합계
          </p>
        </motion.div>

        {/* Daily Average */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-br from-neutral-900 via-neutral-900/90 to-stone-950 border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] group hover:border-white/20 transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-white/60 tracking-wider uppercase flex items-center gap-1.5">
              <Calendar size={14} className="text-blue-400" />
              일평균 지출액
            </span>
            <span className="text-[11px] text-blue-400/80 font-mono bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
              Daily Avg
            </span>
          </div>

          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl font-black text-white font-mono tracking-tight">
              ₩{dailyAverage.toLocaleString()}
            </span>
          </div>

          <p className="text-[11px] text-white/40 mt-3">
            결제가 발생한 일자 기준 1일 평균 소비
          </p>
        </motion.div>

        {/* Top Expense Category */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-br from-neutral-900 via-neutral-900/90 to-stone-950 border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] group hover:border-white/20 transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-white/60 tracking-wider uppercase flex items-center gap-1.5">
              <PieIcon size={14} className="text-rose-400" />
              최대 지출 항목
            </span>
            {topCategory && (
              <span className="text-[11px] font-bold text-rose-400 font-mono bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                {topCategory.percent}%
              </span>
            )}
          </div>

          {topCategory ? (
            <div>
              <div className="text-lg font-bold text-white truncate">
                {topCategory.category.name}
              </div>
              <div className="text-2xl font-black text-rose-300 font-mono tracking-tight mt-0.5">
                ₩{topCategory.amount.toLocaleString()}
              </div>
              <p className="text-[11px] text-white/40 mt-2">
                총 {topCategory.count}건 결제 진행됨
              </p>
            </div>
          ) : (
            <div className="text-sm text-white/30 py-4">지출 내역 없음</div>
          )}
        </motion.div>

        {/* Highest Single Transaction */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-br from-neutral-900 via-neutral-900/90 to-stone-950 border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] group hover:border-white/20 transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-white/60 tracking-wider uppercase flex items-center gap-1.5">
              <Flame size={14} className="text-orange-400" />
              최고 단일 결제
            </span>
            <span className="text-[11px] text-orange-400/80 font-mono bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
              Peak Spend
            </span>
          </div>

          {highestTx ? (
            <div>
              <div className="text-sm font-bold text-white truncate">
                {highestTx.merchant}
              </div>
              <div className="text-2xl font-black text-amber-300 font-mono tracking-tight mt-0.5">
                ₩{highestTx.amount.toLocaleString()}
              </div>
              <div className="flex items-center justify-between text-[11px] text-white/40 mt-2">
                <span>{highestTx.date}</span>
                <span className="text-white/60 font-medium">{highestTx.cardName.split(" ")[0]}</span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-white/30 py-4">결제 내역 없음</div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
