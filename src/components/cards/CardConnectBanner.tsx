"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  Zap, 
  FileSpreadsheet, 
  Smartphone, 
  AlertCircle, 
  Trash2, 
  Sparkles, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import { useCardExpense } from "@/context/CardExpenseContext";

interface CardConnectBannerProps {
  onOpenExcel: () => void;
  onOpenAutoSync: () => void;
}

export default function CardConnectBanner({
  onOpenExcel,
  onOpenAutoSync
}: CardConnectBannerProps) {
  const { transactions, clearAllTransactions } = useCardExpense();

  // Check if current transactions look like sample data
  const hasSampleData = transactions.some(t => 
    t.merchant.includes("스타벅스 리저브") || 
    t.merchant.includes("시그니엘") ||
    t.merchant.includes("제휴 주유소")
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-neutral-900/80 to-black/90 p-6 backdrop-blur-xl shadow-2xl"
    >
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left: Explanation */}
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
              <AlertCircle size={13} />
              개인 카드 연동 가이드
            </span>
            <span className="text-xs text-white/50">
              {hasSampleData ? "현재 시연용 샘플 데이터 표시 중" : `현재 등록된 내역: ${transactions.length}건`}
            </span>
          </div>

          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
            나의 실제 개인 카드 사용 내역을 화면에 띄우는 방법
          </h2>

          <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
            금융보안법상 고객님의 승인(엑셀 업로드 또는 스마트폰 연동) 없이는 어떤 앱도 실제 카드 전산에 무단 접근할 수 없습니다. 
            아래 <strong className="text-amber-300">2가지 방법 중 하나</strong>를 선택하시면 대표님의 실제 카드 사용 내역이 1초 만에 대시보드에 반영됩니다.
          </p>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Method 1: Desktop Browser Auto-Connect (Real & 100% Working) */}
          <button
            onClick={onOpenAutoSync}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-black font-black text-xs sm:text-sm shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer group hover:scale-[1.02]"
          >
            <Zap size={16} className="text-neutral-900 fill-current group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <div className="text-[10px] text-neutral-800 font-bold leading-none">모든 카드사 실제 전산 직결</div>
              <div>실시간 브라우저 자동 연결</div>
            </div>
            <ArrowRight size={14} className="ml-1 opacity-70 group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* Method 2: Excel Import (Backup) */}
          <button
            onClick={onOpenExcel}
            className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer hover:border-amber-400/50"
          >
            <FileSpreadsheet size={16} className="text-amber-400" />
            <div className="text-left">
              <div className="text-[10px] text-white/50 leading-none">명세서 파일 보유 시</div>
              <div>엑셀 파일로 등록</div>
            </div>
          </button>

          {/* Reset / Clear Button */}
          {transactions.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm("시연용 샘플 데이터를 모두 비우고 빈 원장에서 대표님의 실제 내역 등록을 시작하시겠습니까?")) {
                  clearAllTransactions();
                }
              }}
              className="px-3.5 py-3 rounded-2xl bg-white/5 hover:bg-rose-500/20 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 text-white/50 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              title="샘플 데이터를 비우고 내 진짜 내역만 올리기"
            >
              <Trash2 size={14} />
              <span className="sm:hidden lg:inline">샘플 비우기</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick 3-Card Steps Helper */}
      <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-white/60">
        <div className="flex items-start gap-2 bg-black/30 p-2.5 rounded-xl border border-white/5">
          <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-300 font-black text-[11px] flex items-center justify-center shrink-0">1</span>
          <span>사용 중인 카드사 웹/앱에서 <strong>[이용내역 엑셀 다운로드]</strong> 받기</span>
        </div>
        <div className="flex items-start gap-2 bg-black/30 p-2.5 rounded-xl border border-white/5">
          <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-300 font-black text-[11px] flex items-center justify-center shrink-0">2</span>
          <span>위 <strong>[내 카드사 엑셀 파일 등록하기]</strong>를 누르고 파일 끌어다 놓기</span>
        </div>
        <div className="flex items-start gap-2 bg-black/30 p-2.5 rounded-xl border border-white/5">
          <span className="w-5 h-5 rounded-full bg-emerald-400/20 text-emerald-300 font-black text-[11px] flex items-center justify-center shrink-0">3</span>
          <span>대표님의 <strong>진짜 실제 거래 내역 수천 건</strong>이 1초 만에 대시보드에 완벽 반영!</span>
        </div>
      </div>
    </motion.div>
  );
}
