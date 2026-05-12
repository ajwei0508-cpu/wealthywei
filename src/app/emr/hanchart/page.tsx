"use client";

import React, { useRef, useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft,
  ArrowRight,
  TrendingUp, 
  Users, 
  CreditCard, 
  ArrowUpRight, 
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
  Calendar,
  Info,
  ChevronRight,
  Play,
  Activity as ActivityIcon,
  Rocket,
  ShieldAlert,
  AlertTriangle,
  Lightbulb,
  MinusCircle,
  ArrowDownCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useData } from "@/context/DataContext";
import DashboardLayout from "@/components/DashboardLayout";
import { parseExcelFile } from "@/lib/excelParser";
import toast from "react-hot-toast";
import { generateClinicInsightStream } from "@/lib/aiService";
import { YoutubeVideoLink } from "@/components/YoutubeVideoLink";
import AnalysisTimer from "@/components/AnalysisTimer";
import { DailyMissionCard } from "@/components/DailyMissionCard";
import { NoDataAlert } from "@/components/NoDataAlert";

const formatNumber = (num: number) => {
  return new Intl.NumberFormat("ko-KR").format(num || 0);
};

const mockHanchartData: any[] = [];

export default function HanchartPage() {
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
  const [selectedMonthsForDelete, setSelectedMonthsForDelete] = useState<string[]>([]);

  const availableMonths = useMemo(() => {
    return Object.keys(monthlyData).filter(m => {
      const entry = monthlyData[m];
      return entry && entry.hanchartData && entry.hanchartData.length > 0;
    }).sort();
  }, [monthlyData]);

  useEffect(() => {
    if (availableMonths.length > 0 && !availableMonths.includes(selectedMonth)) {
      setSelectedMonth(availableMonths[availableMonths.length - 1]);
      if (availableMonths.length > 1) {
        setCompareMonth(availableMonths[availableMonths.length - 2]);
      } else {
        setCompareMonth("");
      }
    }
  }, [availableMonths, selectedMonth, setSelectedMonth, setCompareMonth]);

  const currentEntry = monthlyData[selectedMonth] || null;
  const isSampleData = !currentEntry || !currentEntry.hanchartData || currentEntry.hanchartData.length === 0;
  const isMock = isSampleData;
  const displayData = isMock ? mockHanchartData : currentEntry.hanchartData;

  const prevMonthIndex = availableMonths.indexOf(selectedMonth) - 1;
  const prevMonthKey = prevMonthIndex >= 0 ? availableMonths[prevMonthIndex] : "";
  const prevEntry = monthlyData[compareMonth || prevMonthKey] || { hanchartData: [] };
  const prevDisplayData = (!prevEntry.hanchartData || prevEntry.hanchartData.length === 0) ? [] : prevEntry.hanchartData;

  // Calculation Logic
  const getSummary = (dataArr: any[]) => {
    const emptyResult = { 
      total: 0, nhis: 0, nonCovered: 0, auto: 0, 
      breakdown: { copay: 0, claim: 0, nonTax: 0, tax: 0 },
      count: { total: 0, new: 0 } 
    };

    if (!dataArr || dataArr.length === 0) return emptyResult;
    
    return dataArr.reduce((acc, curr) => {
      if (!curr) return acc;
      const patientCount = parseInt(curr.type?.match(/\(\s*(\d+)\s*\)/)?.[1] || "0");
      const isNewPatient = curr.type?.startsWith("초진") || false;
      
      return {
        total: acc.total + (Number(curr.totalRevenue) || 0),
        nhis: acc.nhis + ((Number(curr.coveredCopay) || 0) + (Number(curr.coveredClaim) || 0)),
        nonCovered: acc.nonCovered + ((Number(curr.nonTaxable) || 0) + (Number(curr.taxable) || 0)),
        auto: acc.auto + (Number(curr.autoClaim) || 0),
        breakdown: {
          copay: acc.breakdown.copay + (Number(curr.coveredCopay) || 0),
          claim: acc.breakdown.claim + (Number(curr.coveredClaim) || 0),
          nonTax: acc.breakdown.nonTax + (Number(curr.nonTaxable) || 0),
          tax: acc.breakdown.tax + (Number(curr.taxable) || 0),
        },
        count: {
          total: acc.count.total + patientCount,
          new: acc.count.new + (isNewPatient ? patientCount : 0),
        }
      };
    }, emptyResult);
  };

  const summary = useMemo(() => getSummary(displayData), [displayData]);
  const pSummary = useMemo(() => getSummary(prevDisplayData), [prevDisplayData]);

  const revenuePerPatient = summary.count.total > 0 ? summary.total / summary.count.total : 0;
  const pRevenuePerPatient = pSummary.count.total > 0 ? pSummary.total / pSummary.count.total : 0;
  const nonCoveredRatio = summary.total > 0 ? (summary.nonCovered / summary.total) * 100 : 0;
  const pNonCoveredRatio = pSummary.total > 0 ? (pSummary.nonCovered / pSummary.total) * 100 : 0;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    toast.loading("한차트 파일 분석 중...", { id: "excel-parse" });
    try {
      for (let i = 0; i < files.length; i++) {
        const resList = await parseExcelFile(files[i], selectedMonth, "hanchart");
        for (const res of resList) await setMonthlyData(res.targetMonth, res.extractedData);
      }
      toast.success("분석 완료", { id: "excel-parse" });
    } catch (err: any) {
      toast.error(err.message, { id: "excel-parse" });
    }
  };

  useEffect(() => {
    async function getInsight() {
      if (summary.total > 0) {
        const cacheKey = `insight_hanchart_${selectedMonth}_${summary.total}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) { setInsight(cached); setLoadingInsight(false); return; }

        setLoadingInsight(true);
        setInsight("");
        try {
          await generateClinicInsightStream(currentEntry as any, (text) => setInsight(text));
        } catch (e) {
          setInsight("현재 데이터를 기반으로 한차트 경영 진단을 준비 중입니다.");
        } finally {
          setLoadingInsight(false);
        }
      }
    }
    getInsight();
  }, [summary.total, currentEntry, selectedMonth]);

  useEffect(() => {
    if (insight && !loadingInsight && summary.total > 0) {
      const cacheKey = `insight_hanchart_${selectedMonth}_${summary.total}`;
      localStorage.setItem(cacheKey, insight);
    }
  }, [insight, loadingInsight, selectedMonth, summary.total]);

  const [displayYear, setDisplayYear] = useState<string>(() => selectedMonth.split("-")[0]);
  const uniqueYears = Array.from(new Set(availableMonths.map(m => m.split("-")[0]))).sort((a, b) => b.localeCompare(a));
  const filteredMonths = availableMonths.filter(m => m.startsWith(displayYear));

  const handleMonthClick = (m: string) => {
    setSelectedMonth(m);
    const idx = availableMonths.indexOf(m);
    if (idx > 0) setCompareMonth(availableMonths[idx - 1]);
  };

  const setYoY = () => {
    const [y, m] = selectedMonth.split("-");
    const lastYear = `${parseInt(y) - 1}-${m}`;
    if (availableMonths.includes(lastYear)) {
      setCompareMonth(lastYear);
      setDisplayYear((parseInt(y) - 1).toString());
      toast.success(`${parseInt(y)-1}년 ${m}월과 비교합니다.`);
    } else {
      toast.error("작년 동월 데이터가 없습니다.");
    }
  };

  const formatMonth = (m: string) => {
    if (!m) return "선택 안됨";
    const [year, month] = m.split("-");
    return `${year.slice(2)}년 ${month}월`;
  };

  const toggleMonthSelection = (m: string) => {
    setSelectedMonthsForDelete(prev => 
      prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
    );
  };

  const toggleSelectAll = () => {
    if (selectedMonthsForDelete.length === availableMonths.length) {
      setSelectedMonthsForDelete([]);
    } else {
      setSelectedMonthsForDelete(availableMonths);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedMonthsForDelete.length === 0) return;
    if (!confirm(`${selectedMonthsForDelete.length}개의 데이터를 삭제하시겠습니까?`)) return;
    toast.loading("데이터 삭제 중...", { id: "bulk-delete" });
    try {
      for (const m of selectedMonthsForDelete) await deleteMonthlyData(m);
      setSelectedMonthsForDelete([]);
      setIsManageMode(false);
      toast.success("삭제되었습니다.", { id: "bulk-delete" });
    } catch (e) {
      toast.error("삭제 중 오류가 발생했습니다.", { id: "bulk-delete" });
    }
  };


  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#0A0E1A] text-white font-sans selection:bg-gold-500/30">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
          
          {/* Header Section */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-8">
              <button 
                onClick={() => router.push("/")} 
                className="text-slate-500 hover:text-gold-400 flex items-center gap-2 text-sm transition-all group"
              >
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> EMR 선택
              </button>
              <div className="flex items-center gap-3">
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls, .csv" multiple className="hidden" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 bg-[#FBBF24] hover:bg-[#F59E0B] text-[#0A0E1A] px-6 py-3 rounded-2xl text-xs font-black transition-all shadow-[0_0_20px_rgba(251,191,36,0.3)] active:scale-95 group"
                >
                  <Upload size={18} className="group-hover:bounce-y transition-transform" /> 
                  <span className="tracking-tight">신규 데이터 업로드</span>
                </button>
                <button
                  onClick={() => { if(confirm("현재 보고 계신 월의 데이터를 초기화할까요?")) deleteMonthlyData(selectedMonth); }}
                  className="group p-2.5 rounded-2xl bg-white/5 border border-white/10 text-slate-500 transition-all hover:bg-red-500/10 hover:text-red-400"
                  title="데이터 초기화"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-3 py-1 rounded-full bg-gold-500/10 border border-gold-500/20 text-gold-500 text-xs font-bold tracking-wider uppercase">
                    Hanchart Intelligence
                  </span>
                  <span className="text-slate-400 text-xs font-medium uppercase tracking-widest flex items-center gap-1">
                    <ShieldCheck size={12} className="text-emerald-500" /> Premium Analysis
                  </span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight leading-tight">
                  한차트 <span className="text-slate-400">경영 리포트</span>
                </h1>
              </div>

              <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10">
                <button 
                  onClick={setYoY}
                  className="px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-tighter hover:bg-white/5 transition-all text-slate-400 hover:text-white"
                >
                  작년 대비 (YoY)
                </button>
              </div>
            </div>

            {/* Year Tabs & Management */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                {uniqueYears.map(year => (
                  <button
                    key={year}
                    onClick={() => setDisplayYear(year)}
                    className={`px-5 py-2 rounded-xl text-xs font-bold transition-all border shrink-0 ${
                      displayYear === year 
                      ? "bg-white/10 border-gold-500/50 text-gold-400 shadow-lg shadow-gold-500/5" 
                      : "bg-white/5 border-white/5 text-slate-500 hover:border-white/20"
                    }`}
                  >
                    {year}년
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                {!isManageMode ? (
                  <button 
                    onClick={() => setIsManageMode(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all hover:text-white group"
                  >
                    <Trash2 size={14} className="group-hover:text-red-400 transition-colors" /> 데이터 관리
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={toggleSelectAll}
                      className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-[10px] font-black uppercase hover:bg-white/10 transition-all"
                    >
                      {selectedMonthsForDelete.length === availableMonths.length ? "전체 해제" : "전체 선택"}
                    </button>
                    <button 
                      onClick={handleDeleteSelected}
                      disabled={selectedMonthsForDelete.length === 0}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500 text-white text-[10px] font-black uppercase hover:bg-rose-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={14} /> {selectedMonthsForDelete.length}개 삭제
                    </button>
                    <button 
                      onClick={() => { setIsManageMode(false); setSelectedMonthsForDelete([]); }}
                      className="px-4 py-2 rounded-xl bg-white/10 text-white text-[10px] font-black uppercase hover:bg-white/20 transition-all"
                    >
                      닫기
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Month Navigation */}
            <div className="mb-10 relative">
              <div className="flex items-center gap-1.5 pb-4 overflow-x-auto no-scrollbar">
                {filteredMonths.map((m) => (
                  <button
                    key={m}
                    onClick={() => isManageMode ? toggleMonthSelection(m) : handleMonthClick(m)}
                    className={`flex-1 min-w-[70px] py-3 rounded-xl border transition-all flex flex-col items-center justify-center relative ${
                      isManageMode && selectedMonthsForDelete.includes(m)
                      ? "bg-rose-500/20 border-rose-500/50 text-rose-400 scale-95 shadow-[0_0_15px_rgba(244,63,94,0.2)]"
                      : selectedMonth === m && !isManageMode
                      ? "bg-[#FBBF24] border-[#F59E0B] text-[#0A0E1A] shadow-lg shadow-amber-500/20" 
                      : compareMonth === m && !isManageMode
                      ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                      : "bg-white/5 border-white/10 text-slate-500 hover:border-white/20"
                    }`}
                  >
                    {isManageMode && (
                      <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${selectedMonthsForDelete.includes(m) ? "bg-rose-500 border-rose-500" : "bg-[#0A0E1A] border-white/20"}`}>
                         {selectedMonthsForDelete.includes(m) && <Plus size={10} className="text-white rotate-45" />}
                      </div>
                    )}
                    <span className={`text-[8px] font-black uppercase ${selectedMonth === m && !isManageMode ? "text-[#0A0E1A]/60" : "text-slate-600"}`}>
                      {m.split("-")[0].slice(2)}년
                    </span>
                    <span className="text-sm font-black tracking-tighter">
                      {m.split("-")[1]}월
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* No Data Alert */}
            {isMock && (
              <NoDataAlert onUploadClick={() => fileInputRef.current?.click()} />
            )}

            {/* Hero Card: Total Revenue */}
            <div className="relative group overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#1A1F35] to-[#0D1117] border border-gold-500/30 shadow-2xl p-10 mb-8">
              <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity duration-1000">
                <DollarSign size={300} />
              </div>
              
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                <div>
                  <p className="text-gold-500/80 text-xs font-black uppercase tracking-[0.2em] mb-3">Target Month Performance</p>
                  <h2 className="text-white text-xl font-medium mb-1">
                    <span className="text-gold-400 font-black">{formatMonth(selectedMonth)}</span> 총 매출 현황
                  </h2>
                  <p className="text-slate-500 text-sm">한차트 데이터를 기반으로 집계된 발생 매출입니다.</p>
                </div>
                
                <div className="text-center md:text-right">
                  <div className="inline-flex items-baseline gap-2 bg-black/40 backdrop-blur-xl px-8 py-6 rounded-3xl border border-white/10 shadow-2xl">
                    <RollingNumber value={summary.total} />
                    <span className="text-2xl font-black text-slate-500">원</span>
                  </div>
                  {compareMonth && (
                    <div className={`mt-4 flex items-center justify-center md:justify-end gap-2 font-bold ${summary.total >= pSummary.total ? "text-emerald-400" : "text-rose-400"}`}>
                      <div className={`px-2 py-0.5 rounded-md text-[10px] uppercase ${summary.total >= pSummary.total ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
                        {summary.total >= pSummary.total ? "Growth" : "Decline"}
                      </div>
                      <span className="text-lg">
                        {summary.total >= pSummary.total ? "▲" : "▼"} 
                        {formatNumber(Math.abs(summary.total - pSummary.total))}원
                      </span>
                      <span className="text-slate-600 text-xs font-medium">vs {formatMonth(compareMonth)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 12-Month Trend Chart */}
            <div className="mb-12 bg-white/5 border border-white/10 rounded-[2.5rem] p-8 shadow-xl">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">매출 및 내원 환자 추세</h3>
                  <p className="text-slate-500 text-xs">한차트 시스템 데이터 흐름 분석</p>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm bg-gold-500" />
                    <span className="text-[10px] font-bold text-slate-400">매출액</span>
                  </div>
                </div>
              </div>
              
              <div className="h-48 flex items-end justify-between gap-1 px-2">
                {(() => {
                  const currentIndex = availableMonths.indexOf(selectedMonth);
                  const trendMonths = availableMonths.slice(Math.max(0, currentIndex - 11), currentIndex + 1);
                  const finalTrendMonths = trendMonths.length < 12 && availableMonths.length > trendMonths.length
                    ? availableMonths.slice(0, 12)
                    : [...trendMonths];

                  return finalTrendMonths.map((m) => {
                    const mData = getSummary(monthlyData[m]?.hanchartData || []);
                    const rev = mData.total;
                    const maxRev = Math.max(...finalTrendMonths.map(mm => getSummary(monthlyData[mm]?.hanchartData || []).total || 1));
                    const height = Math.max(8, (rev / maxRev) * 100);
                    
                    return (
                      <div 
                        key={m} 
                        onClick={() => handleMonthClick(m)}
                        className="group relative flex-1 flex flex-col items-center gap-2 cursor-pointer"
                      >
                        <div className="w-full bg-white/5 rounded-t-lg relative overflow-hidden h-40 flex items-end">
                          <div 
                            className={`w-full transition-all duration-700 ease-out ${selectedMonth === m ? "bg-[#FBBF24] shadow-[0_0_20px_rgba(251,191,36,0.6)]" : "bg-white/10 group-hover:bg-white/20"}`}
                            style={{ height: `${height}%` }}
                          />
                        </div>
                        <span className={`text-[9px] font-black transition-colors whitespace-nowrap ${selectedMonth === m ? "text-[#FBBF24]" : "text-slate-600"}`}>
                          {m.split("-")[1]}월
                        </span>
                        
                        <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 bg-slate-800 border border-white/10 p-3 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none min-w-[120px] shadow-2xl">
                          <p className="text-[10px] font-black text-slate-500 mb-1 uppercase">{formatMonth(m)}</p>
                          <p className="text-sm font-black text-white">{formatNumber(rev)}원</p>
                          <p className="text-[10px] font-bold text-blue-400 mt-1">{formatNumber(mData.count.total)}명 내원</p>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Comparison Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-[#111624] rounded-[2rem] p-6 border border-white/5 hover:border-gold-500/30 transition-all group shadow-xl">
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-gold-500/10 rounded-2xl text-gold-500 group-hover:bg-gold-500 group-hover:text-[#0A0E1A] transition-all">
                    <TrendingUp size={22} />
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Monthly Growth</p>
                    <p className={`text-sm font-black ${summary.total >= pSummary.total ? "text-emerald-400" : "text-rose-400"}`}>
                      {pSummary.total > 0 ? ((summary.total - pSummary.total) / pSummary.total * 100).toFixed(1) : 0}%
                    </p>
                  </div>
                </div>
                <h3 className="text-slate-400 text-xs font-bold mb-2 uppercase">전월 대비 매출 비교</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] text-slate-600 font-bold uppercase">{formatMonth(compareMonth || prevMonthKey)}</span>
                    <span className="text-sm font-bold text-slate-400">{formatNumber(pSummary.total)}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] text-gold-500 font-bold uppercase">{formatMonth(selectedMonth)}</span>
                    <span className="text-xl font-black text-white">{formatNumber(summary.total)}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mt-2">
                    <div 
                      className="h-full bg-gold-500" 
                      style={{ width: `${Math.min(100, (summary.total / (pSummary.total || 1)) * 50)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-[#111624] rounded-[2rem] p-6 border border-white/5 hover:border-blue-500/30 transition-all group shadow-xl">
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all">
                    <Users size={22} />
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Efficiency</p>
                    <p className={`text-sm font-black ${revenuePerPatient >= pRevenuePerPatient ? "text-emerald-400" : "text-rose-400"}`}>
                      {pRevenuePerPatient > 0 ? ((revenuePerPatient - pRevenuePerPatient) / pRevenuePerPatient * 100).toFixed(1) : 0}%
                    </p>
                  </div>
                </div>
                <h3 className="text-slate-400 text-xs font-bold mb-2 uppercase">평균 객단가 분석</h3>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-3xl font-black text-white tracking-tighter">{formatNumber(Math.round(revenuePerPatient))}</span>
                  <span className="text-sm font-bold text-slate-500">원 / 명</span>
                </div>
                <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 text-[11px] text-blue-200/60 leading-relaxed">
                  지난달 대비 객단가가 <span className="text-blue-400 font-bold">{formatNumber(Math.abs(Math.round(revenuePerPatient - pRevenuePerPatient)))}원</span> {revenuePerPatient >= pRevenuePerPatient ? "증가" : "감소"}했습니다.
                </div>
              </div>

              <div className="bg-[#111624] rounded-[2rem] p-6 border border-white/5 hover:border-amber-500/30 transition-all group shadow-xl">
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-all">
                    <Zap size={22} />
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Revenue Mix</p>
                    <p className="text-sm font-black text-amber-400">{nonCoveredRatio.toFixed(1)}%</p>
                  </div>
                </div>
                <h3 className="text-slate-400 text-xs font-bold mb-2 uppercase tracking-tighter">비급여 매출 비중</h3>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden mt-4">
                  <div className="h-full bg-amber-500" style={{ width: `${nonCoveredRatio}%` }} />
                </div>
                <p className="text-[10px] text-slate-500 italic mt-4 text-center">
                  * 전월 비급여 비중(<span className="text-slate-400">{pNonCoveredRatio.toFixed(1)}%</span>) 대비 변화 추이 확인
                </p>
              </div>
            </div>

            {/* Premium Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {/* Insurance */}
              <div className="bg-[#111624] rounded-[2rem] p-6 shadow-xl border border-white/5 group hover:scale-[1.02] transition-all relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-125 transition-transform"><ShieldCheck size={80} /></div>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all"><ShieldCheck size={20} /></div>
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/10 px-2 py-0.5 rounded-full">Insurance</span>
                </div>
                <p className="text-slate-400 text-[11px] font-bold mb-1 uppercase tracking-tight">보험 수익 (급여 총합)</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-white tracking-tighter">{formatNumber(summary.nhis)}</span>
                  <span className="text-xs font-bold text-slate-500">원</span>
                </div>
                <div className="mt-4 pt-4 border-t border-white/5 flex justify-between">
                  <div className="text-[10px] text-slate-500"><span className="block font-bold">본인부담</span>{formatNumber(summary.breakdown.copay)}</div>
                  <div className="text-[10px] text-slate-500 text-right"><span className="block font-bold">공단청구</span>{formatNumber(summary.breakdown.claim)}</div>
                </div>
              </div>

              {/* Non-Covered */}
              <div className="bg-[#111624] rounded-[2rem] p-6 shadow-xl border border-white/5 group hover:scale-[1.02] transition-all relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-125 transition-transform"><Zap size={80} /></div>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-all"><Zap size={20} /></div>
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded-full">Non-Tax</span>
                </div>
                <p className="text-slate-400 text-[11px] font-bold mb-1 uppercase tracking-tight">비급여 진료 수익</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-white tracking-tighter">{formatNumber(summary.nonCovered)}</span>
                  <span className="text-xs font-bold text-slate-500">원</span>
                </div>
                <div className="mt-6 space-y-2">
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500" style={{ width: `${nonCoveredRatio}%` }} />
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold">전체 매출의 {nonCoveredRatio.toFixed(1)}%</p>
                </div>
              </div>

              {/* Auto Insurance */}
              <div className="bg-[#111624] rounded-[2rem] p-6 shadow-xl border border-white/5 group hover:scale-[1.02] transition-all relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-125 transition-transform"><ActivityIcon size={80} /></div>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-rose-500/10 rounded-xl text-rose-500 group-hover:bg-rose-500 group-hover:text-white transition-all"><ActivityIcon size={20} /></div>
                  <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest bg-rose-500/10 px-2 py-0.5 rounded-full">Auto</span>
                </div>
                <p className="text-slate-400 text-[11px] font-bold mb-1 uppercase tracking-tight">자보 진료 수익</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-white tracking-tighter">{formatNumber(summary.auto)}</span>
                  <span className="text-xs font-bold text-slate-500">원</span>
                </div>
                <div className="mt-4 pt-4 border-t border-white/5">
                   <p className="text-[10px] text-slate-500">교통사고 환자 청구액 포함</p>
                </div>
              </div>

              {/* Total Patients */}
              <div className="bg-[#111624] rounded-[2rem] p-6 shadow-xl border border-white/5 group hover:scale-[1.02] transition-all relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-125 transition-transform"><Users size={80} /></div>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-all"><Users size={20} /></div>
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded-full">Volume</span>
                </div>
                <p className="text-slate-400 text-[11px] font-bold mb-1 uppercase tracking-tight">총 내원 환자수</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-white tracking-tighter">{formatNumber(summary.count.total)}</span>
                  <span className="text-xs font-bold text-slate-500">명</span>
                </div>
                <div className="mt-4 pt-4 border-t border-white/5 flex justify-between">
                  <span className="text-[10px] text-slate-500">신규 환자 비율</span>
                  <span className="text-[10px] text-indigo-400 font-black">
                    {summary.count.total > 0 ? ((summary.count.new / summary.count.total) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* Patient Metrics Summary Bar */}
            <div className="mb-12">
              <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-4 border border-white/10 shadow-2xl">
                <div className="flex flex-col items-center">
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">총 내원 환자</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-black text-gold-500">{formatNumber(summary.count.total)}<span className="text-xs font-bold ml-1 text-slate-500">명</span></p>
                    {compareMonth && (
                      <span className={`text-[10px] font-bold ${summary.count.total >= pSummary.count.total ? "text-emerald-400" : "text-rose-400"}`}>
                        {summary.count.total >= pSummary.count.total ? "▲" : "▼"} {Math.abs(summary.count.total - pSummary.count.total)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-px h-10 bg-white/10 hidden md:block" />
                <div className="flex flex-col items-center">
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">신규 환자 수</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-black text-blue-400">{formatNumber(summary.count.new)}<span className="text-xs font-bold ml-1 text-slate-500">명</span></p>
                    {compareMonth && (
                      <span className={`text-[10px] font-bold ${summary.count.new >= pSummary.count.new ? "text-emerald-400" : "text-rose-400"}`}>
                        {summary.count.new >= pSummary.count.new ? "▲" : "▼"} {Math.abs(summary.count.new - pSummary.count.new)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sample Data Notice */}
            {isSampleData && (
              <div className="mb-8 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-700">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <Info size={20} />
                </div>
                <p className="text-emerald-200/80 text-sm font-medium italic">
                  * 현재 보시는 화면은 가이드용 <span className="text-emerald-400 font-bold underline underline-offset-4 decoration-emerald-500/30">샘플 데이터</span>입니다. 한차트 엑셀 업로드 시 실제 통계로 자동 업데이트됩니다.
                </p>
              </div>
            )}


            {/* Daily Mission & Management Quotes */}
            <section className="mb-12">
              <DailyMissionCard data={currentEntry as any || { patientMetrics: { new: 0, auto: 0, total: 0, dailyAvg: 0 }, generatedRevenue: { total: 0, nonCovered: 0 }, leakage: { receivables: 0 } }} userName="원장" emrType="hanchart" />
            </section>


            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-12 mb-20 px-4"
            >
              <button 
                onClick={() => router.push("/ai-intelligence?emr=hanchart")}
                className="w-full relative group overflow-hidden rounded-[3rem] p-1 bg-gradient-to-r from-gold-400 via-amber-500 to-yellow-600 shadow-2xl shadow-gold-500/20 active:scale-[0.98] transition-all"
              >
                <div className="relative bg-[#0A0E1A] rounded-[2.9rem] p-10 flex flex-col md:flex-row items-center justify-between gap-8 overflow-hidden">
                  <div className="absolute top-0 right-0 p-20 opacity-[0.03] group-hover:scale-110 group-hover:rotate-12 transition-all duration-700">
                    <BrainCircuit size={300} />
                  </div>
                  <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-gold-500/10 rounded-full blur-[80px]" />

                  <div className="relative z-10 flex items-center gap-8 text-left">
                    <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-gold-400 to-amber-600 flex items-center justify-center text-[#0A0E1A] shadow-xl shadow-gold-500/30 group-hover:rotate-6 transition-transform">
                      <Sparkles size={40} />
                    </div>
                    <div>
                      <h2 className="text-3xl font-black text-white tracking-tight mb-2">한차트 AI 경영 심층 분석 리포트</h2>
                      <p className="text-slate-400 font-light max-w-md">
                        한차트의 누적 데이터를 통합 분석하여 원장님께 가장 최적화된 맞춤형 경영 전략과 미래 예측을 제안합니다.
                      </p>
                    </div>
                  </div>

                  <div className="relative z-10 flex items-center gap-4">
                    <div className="flex flex-col items-end mr-4 hidden md:block">
                      <span className="text-[10px] font-black text-gold-500 uppercase tracking-widest">Upgrade Strategy</span>
                      <span className="text-sm font-bold text-slate-500">Go to Intelligence Center</span>
                    </div>
                    <div className="h-16 w-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white group-hover:bg-gold-500 group-hover:border-gold-500 group-hover:text-[#0A0E1A] transition-all duration-300">
                      <ArrowUpRight size={28} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </button>
            </motion.section>
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
    <span className="text-5xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-gold-400 via-white to-gold-400 animate-gradient">
      {new Intl.NumberFormat("ko-KR").format(displayValue)}
    </span>
  );
}
