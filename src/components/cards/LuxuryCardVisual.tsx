"use client";

import React from "react";
import { motion } from "framer-motion";
import { useCardExpense } from "@/context/CardExpenseContext";
import { CreditCard, CheckCircle2, ChevronRight, Sparkles } from "lucide-react";

export default function LuxuryCardVisual() {
  const { cards, cardStats, filter, setSelectedCard } = useCardExpense();

  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.8)] animate-pulse" />
          <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
            보유 카드 및 실적 현황
            <span className="text-xs font-normal text-white/40">카드 클릭 시 해당 카드 내역만 필터링됩니다</span>
          </h3>
        </div>

        {filter.selectedCard !== "all" && (
          <button
            onClick={() => setSelectedCard("all")}
            className="text-xs font-medium text-amber-400 hover:text-amber-300 bg-amber-400/10 hover:bg-amber-400/20 px-3 py-1.5 rounded-lg border border-amber-400/20 transition-all flex items-center gap-1.5"
          >
            <CheckCircle2 size={13} />
            전체 카드 보기
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, idx) => {
          const stats = cardStats.find(s => s.card.name === card.name);
          const spent = stats ? stats.amount : 0;
          const target = card.monthlyTarget || 500000;
          const percent = Math.min(100, Math.round((spent / target) * 100));
          const isSelected = filter.selectedCard === card.name;
          const isTargetMet = spent >= target;

          return (
            <motion.div
              key={card.id}
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedCard(isSelected ? "all" : card.name)}
              className={`relative overflow-hidden rounded-2xl cursor-pointer p-5 transition-all duration-300 border ${
                isSelected
                  ? "border-amber-400/80 shadow-[0_0_25px_rgba(245,158,11,0.35)] ring-2 ring-amber-400/40"
                  : "border-white/10 hover:border-white/25 shadow-xl bg-gradient-to-br from-neutral-900/90 via-black/80 to-neutral-950/90"
              }`}
              style={{
                background: isSelected 
                  ? "linear-gradient(135deg, rgba(26,26,26,0.95) 0%, rgba(10,10,10,0.95) 100%)"
                  : undefined
              }}
            >
              {/* Metallic Card Glow Accents */}
              <div 
                className="absolute -right-8 -top-8 w-32 h-32 rounded-full blur-2xl opacity-20 pointer-events-none"
                style={{ backgroundColor: card.themeColor }}
              />

              {/* Card Header: Brand & Chip */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-6 rounded-md bg-gradient-to-tr from-amber-200 via-amber-400 to-yellow-600 shadow-inner flex items-center justify-center p-1 border border-amber-300/40">
                    <div className="w-full h-full border border-amber-800/40 rounded-sm grid grid-cols-2 gap-0.5">
                      <div className="bg-amber-700/20"></div>
                      <div className="bg-amber-700/20"></div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono tracking-widest text-white/50 uppercase">
                    {card.cardType === "credit" ? "CREDIT" : "DEBIT"}
                  </span>
                </div>

                {isSelected ? (
                  <span className="text-[11px] font-bold text-amber-400 bg-amber-400/20 px-2 py-0.5 rounded-full border border-amber-400/30 flex items-center gap-1">
                    <Sparkles size={10} />
                    선택됨
                  </span>
                ) : (
                  <span className="text-[11px] font-mono text-white/30 tracking-wider">
                    •••• {card.cardNumberLast4 || "8801"}
                  </span>
                )}
              </div>

              {/* Card Name */}
              <div className="mb-4">
                <h4 className="text-sm font-bold text-white/90 truncate tracking-tight">
                  {card.name}
                </h4>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-lg font-black text-white font-mono tracking-tight">
                    ₩{spent.toLocaleString()}
                  </span>
                  <span className="text-[11px] text-white/40">지출</span>
                </div>
              </div>

              {/* Target Spending Progress */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-white/40">
                    실적 목표 (₩{target.toLocaleString()})
                  </span>
                  <span className={`font-bold font-mono ${isTargetMet ? "text-emerald-400" : "text-amber-400"}`}>
                    {isTargetMet ? "실적 달성 ✓" : `${percent}%`}
                  </span>
                </div>
                
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 0.8, delay: idx * 0.1 }}
                    className={`h-full rounded-full ${
                      isTargetMet
                        ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                        : "bg-gradient-to-r from-amber-500 to-yellow-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]"
                    }`}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
