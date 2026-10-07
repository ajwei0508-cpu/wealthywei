"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { CardExpenseProvider, useCardExpense } from "@/context/CardExpenseContext";
import LuxuryCardVisual from "@/components/cards/LuxuryCardVisual";
import ExpenseStatsHero from "@/components/cards/ExpenseStatsHero";
import ExpenseCharts from "@/components/cards/ExpenseCharts";
import AiExpenseAdvisor from "@/components/cards/AiExpenseAdvisor";
import TransactionTable from "@/components/cards/TransactionTable";
import ExcelUploadModal from "@/components/cards/ExcelUploadModal";
import SmsPasteModal from "@/components/cards/SmsPasteModal";
import ManualEntryModal from "@/components/cards/ManualEntryModal";
import CardCompanySummary from "@/components/cards/CardCompanySummary";
import AutoSyncModal from "@/components/cards/AutoSyncModal";
import RuleSettingsModal from "@/components/cards/RuleSettingsModal";
import CardConnectBanner from "@/components/cards/CardConnectBanner";
import { 
  CreditCard, 
  ArrowLeft, 
  Sparkles, 
  Crown, 
  FileSpreadsheet, 
  MessageSquare, 
  PlusCircle, 
  Download,
  RotateCcw,
  ShieldCheck,
  Zap,
  Building2
} from "lucide-react";

function CardAppContent() {
  const { loadSampleData, clearAllTransactions, exportExcel, transactions } = useCardExpense();

  // Modals state
  const [isExcelOpen, setIsExcelOpen] = useState(false);
  const [isSmsOpen, setIsSmsOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isRuleOpen, setIsRuleOpen] = useState(false);
  const [isAutoSyncOpen, setIsAutoSyncOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#060a08] text-white selection:bg-amber-400 selection:text-black">
      {/* Dynamic Ambient Background Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-amber-600/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -right-40 w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[150px]" />
        <div className="absolute -bottom-40 left-1/3 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[160px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation & Brand Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 mb-8 border-b border-white/10">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all shadow-md group"
              title="홈으로 돌아가기"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black tracking-widest text-amber-400 uppercase bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20 flex items-center gap-1">
                  <Crown size={11} />
                  VVIP PRIVATE LEDGER
                </span>
                <span className="text-[11px] text-white/40 font-mono">Ver 2.5 High-End</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1 flex items-center gap-2">
                <span>개인카드 통합 사용 분석 & 지출 분류 시스템</span>
              </h1>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setIsAutoSyncOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-black bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
              title="카드사별 자동 내역 연동 및 실시간 웹훅 설정"
            >
              <Zap size={14} />
              <span>실시간 자동 수집 설정</span>
            </button>

            <button
              onClick={loadSampleData}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-amber-300 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/20 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="현대, 신한, 삼성카드 등 프리미엄 샘플 데이터 세트를 불러옵니다"
            >
              <Sparkles size={14} className="text-amber-400" />
              샘플 데이터 불러오기
            </button>

            <button
              onClick={() => {
                if (window.confirm("정말로 모든 결제 내역을 초기화하시겠습니까?")) {
                  clearAllTransactions();
                }
              }}
              className="px-3 py-2 rounded-xl text-xs font-medium text-white/40 hover:text-rose-400 hover:bg-white/5 transition-all flex items-center gap-1.5 cursor-pointer"
              title="데이터 초기화"
            >
              <RotateCcw size={13} />
              전체 비우기
            </button>
          </div>
        </header>

        {/* 0. Real Personal Card Connection Onboarding Banner */}
        <CardConnectBanner
          onOpenExcel={() => setIsExcelOpen(true)}
          onOpenAutoSync={() => setIsAutoSyncOpen(true)}
        />

        {/* 1. Metallic Luxury Card Wallet */}
        <LuxuryCardVisual />

        {/* 2. Card Issuer Aggregator Hub */}
        <CardCompanySummary />

        {/* 3. Month Selector & KPI Metrics */}
        <ExpenseStatsHero />

        {/* 4. Art (아트) Persona: Consumer Psychology & Strategy Report */}
        <AiExpenseAdvisor />

        {/* 5. Interactive Charts (Donut + Daily Trend + Top Merchants) */}
        <ExpenseCharts />

        {/* 6. Master Transaction Table & Inline Categorizer */}
        <TransactionTable
          onOpenExcelModal={() => setIsExcelOpen(true)}
          onOpenSmsModal={() => setIsSmsOpen(true)}
          onOpenManualModal={() => setIsManualOpen(true)}
          onOpenRuleModal={() => setIsRuleOpen(true)}
        />

        {/* Footer info */}
        <footer className="mt-16 pt-8 border-t border-white/10 text-center text-xs text-white/40 space-y-2">
          <p className="flex items-center justify-center gap-2 font-medium">
            <ShieldCheck size={14} className="text-emerald-400" />
            모든 금융 데이터는 브라우저 로컬 저장소(LocalStorage)에 안전하게 암호 보관되며 외부 서버로 전송되지 않습니다.
          </p>
          <p className="text-[11px] text-white/20">
            Designed & Engineered by Art (아트) | World-Class High-End Architecture
          </p>
        </footer>
      </div>

      {/* Modals */}
      <AutoSyncModal
        isOpen={isAutoSyncOpen}
        onClose={() => setIsAutoSyncOpen(false)}
        onOpenExcel={() => setIsExcelOpen(true)}
      />

      <ExcelUploadModal
        isOpen={isExcelOpen}
        onClose={() => setIsExcelOpen(false)}
      />

      <SmsPasteModal
        isOpen={isSmsOpen}
        onClose={() => setIsSmsOpen(false)}
      />

      <ManualEntryModal
        isOpen={isManualOpen}
        onClose={() => setIsManualOpen(false)}
      />

      <RuleSettingsModal
        isOpen={isRuleOpen}
        onClose={() => setIsRuleOpen(false)}
      />
    </div>
  );
}

export default function CardsPage() {
  return (
    <CardExpenseProvider>
      <CardAppContent />
    </CardExpenseProvider>
  );
}
