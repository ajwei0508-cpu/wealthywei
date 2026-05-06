"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  ArrowLeft,
  ArrowRight,
  TrendingUp, 
  Users, 
  CreditCard, 
  Plus, 
  Trash2,
  FileText,
  ShieldCheck,
  AlertCircle,
  DollarSign,
  Upload,
  Zap,
  Activity,
  BrainCircuit,
  Sparkles,
  Award,
  Wallet,
  ArrowDownCircle,
  MinusCircle,
  Calendar
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useData } from "@/context/DataContext";
import DashboardLayout from "@/components/DashboardLayout";
import { parseExcelFile } from "@/lib/excelParser";
import toast from "react-hot-toast";
import { generateClinicInsightStream } from "@/lib/aiService";
import { useRouter } from "next/navigation";
import { YoutubeVideoLink } from "@/components/YoutubeVideoLink";

const formatNumber = (num: number) => {
  return new Intl.NumberFormat("ko-KR").format(num || 0);
};

export default function HanisarangPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { 
    monthlyData, 
    selectedMonth, 
    compareMonth, 
    setSelectedMonth, 
    setCompareMonth, 
    setMonthlyData,
    deleteMonthlyData
  } = useData();

  const [insight, setInsight] = useState<string>("");
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [isManageMode, setIsManageMode] = useState(false);

  const availableMonths = useMemo(() => Object.keys(monthlyData).sort(), [monthlyData]);
  const currentEntry = monthlyData[selectedMonth] || { hanisarangData: null };
  
  const displayData = !currentEntry.hanisarangData ? {
    totalRevenue: 75200000, insuranceClaim: 28400000, copay: 12500000, nonCovered: 34300000,
    receivables: 2100000, discountTotal: 650000, roundOffTotal: 45000,
    totalReceived: 48500000, totalRefund: 120000,
    cashPayment: 12400000, cardPayment: 35200000, transferPayment: 900000,
    totalPatients: 1450, newPatients: 92
  } : currentEntry.hanisarangData;

  const prevMonthIndex = availableMonths.indexOf(selectedMonth) - 1;
  const prevMonthKey = prevMonthIndex >= 0 ? availableMonths[prevMonthIndex] : "";
  const prevEntry = monthlyData[compareMonth || prevMonthKey] || { hanisarangData: null };
  const pData = prevEntry.hanisarangData || { totalRevenue: 0, totalPatients: 0, nonCovered: 0 };

  const revenuePerPatient = displayData.totalPatients > 0 ? displayData.totalRevenue / displayData.totalPatients : 0;
  const pRevenuePerPatient = pData.totalPatients > 0 ? pData.totalRevenue / pData.totalPatients : 0;
  const nonCoveredRatio = displayData.totalRevenue > 0 ? (displayData.nonCovered / displayData.totalRevenue) * 100 : 0;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    toast.loading("한의사랑 파일 분석 중...", { id: "excel-parse" });
    try {
      for (let i = 0; i < files.length; i++) {
        const resList = await parseExcelFile(files[i], selectedMonth, "hanisarang");
        for (const res of resList) await setMonthlyData(res.targetMonth, res.extractedData);
      }
      toast.success("분석 완료", { id: "excel-parse" });
    } catch (err: any) {
      toast.error(err.message, { id: "excel-parse" });
    }
  };

  useEffect(() => {
    async function getInsight() {
      if (displayData.totalRevenue > 0) {
        const cacheKey = `insight_hanisarang_${selectedMonth}_${displayData.totalRevenue}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) { setInsight(cached); setLoadingInsight(false); return; }

        setLoadingInsight(true);
        setInsight("");
        try {
          await generateClinicInsightStream(currentEntry as any, (text) => setInsight(text));
        } catch (e) {
          setInsight("현재 데이터를 기반으로 한의사랑 경영 진단을 준비 중입니다.");
        } finally {
          setLoadingInsight(false);
        }
      }
    }
    getInsight();
  }, [displayData.totalRevenue, currentEntry, selectedMonth]);

  const [displayYear, setDisplayYear] = useState<string>(() => selectedMonth.split("-")[0]);
  const uniqueYears = Array.from(new Set(availableMonths.map(m => m.split("-")[0]))).sort((a, b) => b.localeCompare(a));
  const filteredMonths = availableMonths.filter(m => m.startsWith(displayYear));

  const handleMonthClick = (m: string) => {
    setSelectedMonth(m);
    const idx = availableMonths.indexOf(m);
    if (idx > 0) setCompareMonth(availableMonths[idx - 1]);
  };

  const formatMonth = (m: string) => {
    if (!m) return "선택 안됨";
    const [year, month] = m.split("-");
    return `${year.slice(2)}년 ${month}월`;
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#051109] text-white font-sans selection:bg-emerald-500/30">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
          
          {/* Header */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-8">
              <button onClick={() => router.push("/")} className="text-emerald-800 hover:text-emerald-400 flex items-center gap-2 text-sm transition-all group">
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> EMR 선택
              </button>
              <div className="flex items-center gap-3">
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls, .csv" multiple className="hidden" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-[#051109] px-6 py-3 rounded-2xl text-xs font-black transition-all shadow-lg active:scale-95 group"
                >
                  <Upload size={18} /> 한의사랑 데이터 업로드
                </button>
                <button
                  onClick={() => { if(confirm("초기화할까요?")) deleteMonthlyData(selectedMonth); }}
                  className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-emerald-800 hover:text-rose-400"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold uppercase">Clinical Intelligence</span>
                  <span className="text-emerald-800 text-xs uppercase tracking-widest flex items-center gap-1">
                    <ShieldCheck size={12} className="text-emerald-500" /> Powered by Hanisarang
                  </span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight leading-tight">
                  한의사랑 <span className="text-emerald-800">경영 리포트</span>
                </h1>
              </div>
            </div>

            {/* Year Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                {uniqueYears.map(year => (
                  <button
                    key={year}
                    onClick={() => setDisplayYear(year)}
                    className={`px-5 py-2 rounded-xl text-xs font-bold transition-all border shrink-0 ${displayYear === year ? "bg-white/10 border-emerald-500/50 text-emerald-400" : "bg-white/5 border-white/5 text-emerald-900"}`}
                  >
                    {year}년
                  </button>
                ))}
              </div>
            </div>

            {/* Month Nav */}
            <div className="mb-10 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-1.5 pb-4">
                {filteredMonths.map((m) => (
                  <button
                    key={m}
                    onClick={() => handleMonthClick(m)}
                    className={`flex-1 min-w-[70px] py-3 rounded-xl border transition-all flex flex-col items-center ${selectedMonth === m ? "bg-emerald-500 text-[#051109] shadow-lg" : "bg-white/5 border-white/10 text-emerald-900 hover:border-emerald-500/30"}`}
                  >
                    <span className="text-[8px] font-black uppercase opacity-60">{m.split("-")[0].slice(2)}년</span>
                    <span className="text-sm font-black">{m.split("-")[1]}월</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Hero Card */}
            <div className="relative group overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#0A2213] to-[#051109] border border-emerald-500/30 shadow-2xl p-10 mb-8">
              <div className="absolute top-0 right-0 p-12 opacity-[0.03]"><DollarSign size={300} /></div>
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                <div>
                  <p className="text-emerald-500/80 text-xs font-black uppercase tracking-widest mb-3">Target Month Performance</p>
                  <h2 className="text-white text-xl font-medium mb-1"><span className="text-emerald-400 font-black">{formatMonth(selectedMonth)}</span> 총 진료비 발생액</h2>
                </div>
                <div className="text-center md:text-right">
                  <div className="inline-flex items-baseline gap-2 bg-black/40 px-8 py-6 rounded-3xl border border-white/10">
                    <RollingNumber value={displayData.totalRevenue} />
                    <span className="text-2xl font-black text-emerald-900">원</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Comparison Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-[#0A2213] rounded-[2rem] p-6 border border-white/5 shadow-xl">
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500"><TrendingUp size={22} /></div>
                  <p className={`text-sm font-black ${displayData.totalRevenue >= pData.totalRevenue ? "text-emerald-400" : "text-rose-400"}`}>
                    {pData.totalRevenue > 0 ? ((displayData.totalRevenue - pData.totalRevenue) / pData.totalRevenue * 100).toFixed(1) : 0}%
                  </p>
                </div>
                <h3 className="text-emerald-800 text-xs font-bold mb-2 uppercase tracking-tighter">전월 대비 매출 성장</h3>
                <div className="flex justify-between items-end">
                  <span className="text-[10px] text-emerald-900 font-bold uppercase">{formatMonth(compareMonth)}</span>
                  <span className="text-sm font-bold text-emerald-700">{formatNumber(pData.totalRevenue)}</span>
                </div>
              </div>

              <div className="bg-[#0A2213] rounded-[2rem] p-6 border border-white/5 shadow-xl">
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500"><Users size={22} /></div>
                  <p className={`text-sm font-black ${revenuePerPatient >= pRevenuePerPatient ? "text-emerald-400" : "text-rose-400"}`}>
                    {pRevenuePerPatient > 0 ? ((revenuePerPatient - pRevenuePerPatient) / pRevenuePerPatient * 100).toFixed(1) : 0}%
                  </p>
                </div>
                <h3 className="text-emerald-800 text-xs font-bold mb-2 uppercase tracking-tighter">환자당 평균 단가</h3>
                <div className="flex items-baseline gap-2"><span className="text-3xl font-black text-white">{formatNumber(Math.round(revenuePerPatient))}</span><span className="text-xs text-emerald-900">원/명</span></div>
              </div>

              <div className="bg-[#0A2213] rounded-[2rem] p-6 border border-white/5 shadow-xl">
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500"><Zap size={22} /></div>
                  <p className="text-sm font-black text-emerald-400">{nonCoveredRatio.toFixed(1)}%</p>
                </div>
                <h3 className="text-emerald-800 text-xs font-bold mb-2 uppercase tracking-tighter">비급여 매출 비율</h3>
                <div className="h-2 w-full bg-emerald-950 rounded-full overflow-hidden mt-4">
                  <div className="h-full bg-emerald-500" style={{ width: `${nonCoveredRatio}%` }} />
                </div>
              </div>
            </div>

            {/* Premium Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              <div className="bg-[#0A2213] rounded-[2rem] p-6 border border-white/5">
                <ShieldCheck className="text-emerald-500 mb-4" size={24} />
                <p className="text-emerald-800 text-[11px] font-bold uppercase mb-1">보험 (공단+본인)</p>
                <p className="text-2xl font-black text-white">{formatNumber(displayData.insuranceClaim + displayData.copay)}원</p>
              </div>
              <div className="bg-[#0A2213] rounded-[2rem] p-6 border border-white/5">
                <Zap className="text-emerald-400 mb-4" size={24} />
                <p className="text-emerald-800 text-[11px] font-bold uppercase mb-1">비급여 진료비</p>
                <p className="text-2xl font-black text-white">{formatNumber(displayData.nonCovered)}원</p>
              </div>
              <div className="bg-[#0A2213] rounded-[2rem] p-6 border border-white/5">
                <Users className="text-emerald-300 mb-4" size={24} />
                <p className="text-emerald-800 text-[11px] font-bold uppercase mb-1">총 내원 환자수</p>
                <p className="text-2xl font-black text-white">{formatNumber(displayData.totalPatients)}명</p>
              </div>
              <div className="bg-[#0A2213] rounded-[2rem] p-6 border border-white/5">
                <CreditCard className="text-emerald-200 mb-4" size={24} />
                <p className="text-emerald-800 text-[11px] font-bold uppercase mb-1">실수납 합계</p>
                <p className="text-2xl font-black text-white">{formatNumber(displayData.totalReceived)}원</p>
              </div>
            </div>

            {/* Cashflow & AI Insight */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
              <div className="lg:col-span-2 space-y-8">
                {/* Adjustment & Cashflow Analysis */}
                <div className="bg-[#0A2213] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
                  <h2 className="text-xl font-bold mb-8 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500"><Wallet size={20} /></div>
                    미수 및 조정액 분석
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-6 bg-white/[0.02] rounded-3xl border border-white/5">
                      <p className="text-emerald-800 text-[10px] font-black uppercase mb-2">미수금 현황</p>
                      <p className="text-xl font-black text-white">{formatNumber(displayData.receivables)}원</p>
                    </div>
                    <div className="p-6 bg-white/[0.02] rounded-3xl border border-white/5">
                      <p className="text-emerald-800 text-[10px] font-black uppercase mb-2">할인 총액</p>
                      <p className="text-xl font-black text-white">{formatNumber(displayData.discountTotal)}원</p>
                    </div>
                    <div className="p-6 bg-white/[0.02] rounded-3xl border border-white/5">
                      <p className="text-emerald-800 text-[10px] font-black uppercase mb-2">환불 총액</p>
                      <p className="text-xl font-black text-rose-400">{formatNumber(displayData.totalRefund)}원</p>
                    </div>
                  </div>
                </div>

                {/* Payment Method Analysis */}
                <div className="bg-[#0A2213] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
                   <h2 className="text-xl font-bold mb-8 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500"><CreditCard size={20} /></div>
                    결제 수단별 수납 비중
                  </h2>
                  <div className="space-y-6">
                     {(() => {
                       const total = displayData.cashPayment + displayData.cardPayment + displayData.transferPayment;
                       const cardPct = total > 0 ? (displayData.cardPayment / total) * 100 : 0;
                       const cashPct = total > 0 ? (displayData.cashPayment / total) * 100 : 0;
                       const transPct = total > 0 ? (displayData.transferPayment / total) * 100 : 0;

                       return (
                         <>
                           <div className="space-y-2">
                             <div className="flex justify-between text-xs font-bold uppercase text-emerald-800"><span>카드 결제</span><span>{cardPct.toFixed(1)}%</span></div>
                             <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{ width: `${cardPct}%` }} /></div>
                           </div>
                           <div className="space-y-2">
                             <div className="flex justify-between text-xs font-bold uppercase text-emerald-800"><span>현금 결제</span><span>{cashPct.toFixed(1)}%</span></div>
                             <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${cashPct}%` }} /></div>
                           </div>
                         </>
                       );
                     })()}
                  </div>
                </div>
              </div>

              <div>
                <div className="bg-gradient-to-br from-[#0A2213] to-[#051109] border border-emerald-500/20 rounded-[2rem] p-8 shadow-2xl h-full flex flex-col">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="h-12 w-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-[#051109]"><BrainCircuit size={24} /></div>
                    <h3 className="text-xl font-bold">한의사랑 AI 진단</h3>
                  </div>
                  <div className="flex-grow bg-black/40 rounded-2xl p-6 mb-6">
                    {loadingInsight ? (
                      <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" /></div>
                    ) : (
                      <div className="prose prose-invert prose-emerald max-w-none"><p className="text-zinc-300 leading-relaxed text-sm whitespace-pre-wrap">{insight || "한의사랑 데이터를 분석하여 경영 전략을 제안합니다."}</p></div>
                    )}
                  </div>
                  <YoutubeVideoLink keyword={displayData.receivables > 5000000 ? "병원 미수금 관리 노하우" : "한의원 경영 안정화 전략"} />
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>
    </DashboardLayout>
  );
}

function RollingNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  useEffect(() => {
    let start = displayValue;
    const end = value;
    const duration = 1500;
    const startTime = performance.now();
    const update = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.floor(start + (end - start) * ease);
      setDisplayValue(current);
      if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }, [value]);

  return (
    <span className="text-5xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-white to-emerald-400 animate-gradient">
      {new Intl.NumberFormat("ko-KR").format(displayValue)}
    </span>
  );
}
