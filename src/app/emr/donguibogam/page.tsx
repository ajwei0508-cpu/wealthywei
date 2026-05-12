"use client";

import React, { useState, useEffect } from "react";
import { 
  ArrowLeft,
  ArrowRight,
  TrendingUp, 
  Users, 
  CreditCard, 
  ArrowUpRight, 
  Plus, 
  Clock, 
  Calendar,
  ChevronRight,
  Info,
  Lightbulb,
  Trash2,
  FileText,
  ShieldCheck,
  AlertCircle,
  DollarSign,
  ArrowDownCircle,
  MinusCircle,
  Play,
  Upload,
  Rocket,
  Zap,
  AlertTriangle,
  Activity,
  ShieldAlert,
  BrainCircuit,
  Sparkles,
  Award
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useData } from "@/context/DataContext";
import DashboardLayout from "@/components/DashboardLayout";
import { parseExcelFile } from "@/lib/excelParser";
import toast from "react-hot-toast";
import { generateClinicInsightStream } from "@/lib/aiService";
import { useRouter } from "next/navigation";
import { YoutubeVideoLink } from "@/components/YoutubeVideoLink";
import AnalysisTimer from "@/components/AnalysisTimer";
import { DailyMissionCard } from "@/components/DailyMissionCard";
import { NoDataAlert } from "@/components/NoDataAlert";

const formatNumber = (num: number) => {
  return new Intl.NumberFormat("ko-KR").format(num || 0);
};

const EMPTY_DONGUIBOGAM_DATA = { 
  patientMetrics: { total: 0, new: 0, auto: 0, dailyAvg: 0 },
  generatedRevenue: { total: 0, copay: 0, insurance: 0, totalCovered: 0, auto: 0, worker: 0, nonCovered: 0, patientTotal: 0 },
  leakage: { receivables: 0, discountTotal: 0, roundOffTotal: 0 },
  cashFlow: { totalReceived: 0, totalRefund: 0 },
  paymentMethods: { cash: 0, card: 0, other: 0 },
  donguibogamData: null 
};

export default function DonguibogamPage() {
  const { 
    monthlyData, 
    selectedMonth, 
    compareMonth,
    setSelectedMonth, 
    setCompareMonth,
    setMonthlyData, 
    clearData,
    deleteMonthlyData 
  } = useData();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [insight, setInsight] = useState<string>("");
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [isManageMode, setIsManageMode] = useState(false);
  const [selectedMonthsForDelete, setSelectedMonthsForDelete] = useState<string[]>([]);
  const router = useRouter();

  const availableMonths = React.useMemo(() => {
    return Object.keys(monthlyData).filter(m => {
      const entry = monthlyData[m];
      return entry && entry.donguibogamData;
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

  // Current & Previous Data for Comparison
  const currentEntry = monthlyData[selectedMonth] || EMPTY_DONGUIBOGAM_DATA;
  const prevMonthIndex = availableMonths.indexOf(selectedMonth) - 1;
  const prevMonthKey = prevMonthIndex >= 0 ? availableMonths[prevMonthIndex] : "";
  const prevEntry = monthlyData[compareMonth || prevMonthKey] || { donguibogamData: null };
  
  const data = currentEntry.donguibogamData || {
    totalRevenue: 0, insuranceClaim: 0, copay: 0, fullCopay: 0, nonCovered: 0,
    discount: 0, receivables: 0, totalReceived: 0, cashTotal: 0, cardTotal: 0,
    newPatients: 0, recurringPatients: 0, referralPatients: 0, totalPatients: 0,
    treatments: {}, hasFinancialData: false, hasTreatmentData: false
  };

  // Mock data for demonstration when no real data is present
  const displayData = !currentEntry.donguibogamData ? {
    totalRevenue: 0, insuranceClaim: 0, copay: 0, fullCopay: 0, nonCovered: 0,
    discount: 0, receivables: 0, totalReceived: 0, cashTotal: 0, cardTotal: 0,
    newPatients: 0, recurringPatients: 0, referralPatients: 0, totalPatients: 0,
    treatments: {}, hasFinancialData: false, hasTreatmentData: false
  } : data;

  const pData = prevEntry.donguibogamData || {
    totalRevenue: 0, insuranceClaim: 0, copay: 0, fullCopay: 0, nonCovered: 0,
    totalReceived: 0, newPatients: 0, recurringPatients: 0, referralPatients: 0
  };

  const isMock = !currentEntry.donguibogamData;

  // Derived Metrics
  const insuranceRevenue = displayData.insuranceClaim + displayData.copay + displayData.fullCopay;
  const pInsuranceRevenue = pData.insuranceClaim + pData.copay + pData.fullCopay;
  
  const revenuePerPatient = displayData.totalPatients > 0 ? displayData.totalRevenue / displayData.totalPatients : 0;
  const pRevenuePerPatient = pData.totalPatients > 0 ? pData.totalRevenue / pData.totalPatients : 0;
  
  const nonCoveredRatio = (insuranceRevenue + displayData.nonCovered) > 0 ? (displayData.nonCovered / (insuranceRevenue + displayData.nonCovered)) * 100 : 0;
  const pNonCoveredRatio = (pInsuranceRevenue + pData.nonCovered) > 0 ? (pData.nonCovered / (pInsuranceRevenue + pData.nonCovered)) * 100 : 0;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    toast.loading("동의보감 파일 분석 중...", { id: "excel-parse" });
    try {
      let financialCount = 0;
      let treatmentCount = 0;
      
      for (let i = 0; i < files.length; i++) {
        const resList = await parseExcelFile(files[i], selectedMonth, "donguibogam");
        for (const res of resList) {
          if (res.extractedData.donguibogamData?.hasFinancialData) financialCount++;
          if (res.extractedData.donguibogamData?.hasTreatmentData) treatmentCount++;
          await setMonthlyData(res.targetMonth, res.extractedData);
        }
      }

      if (financialCount > 0 && treatmentCount > 0) {
        toast.success("매출 및 진료 데이터 분석 완료!", { id: "excel-parse" });
      } else if (financialCount > 0) {
        toast.success("매출 통계 분석 완료! (환자수 파일도 업로드해 주세요)", { id: "excel-parse", duration: 5000 });
      } else if (treatmentCount > 0) {
        toast.success("진료 통계 분석 완료! (매출 파일도 업로드해 주세요)", { id: "excel-parse", duration: 5000 });
      } else {
        toast.success("데이터 분석 완료", { id: "excel-parse" });
      }
    } catch (err: any) {
      toast.error(err.message, { id: "excel-parse" });
    }
  };

  useEffect(() => {
    async function getInsight() {
      if (displayData.totalRevenue > 0) {
        const cacheKey = `insight_dongui_${selectedMonth}_${displayData.totalRevenue}`;
        const cached = localStorage.getItem(cacheKey);
        
        if (cached) {
          setInsight(cached);
          setLoadingInsight(false);
          return;
        }

        setLoadingInsight(true);
        setInsight("");
        try {
          await generateClinicInsightStream(currentEntry as any, (text) => {
            setInsight(text);
          });
        } catch (e) {
          setInsight("현재 데이터를 기반으로 원장님의 병원을 위한 경영 진단을 준비 중입니다.");
        } finally {
          setLoadingInsight(false);
        }
      }
    }
    getInsight();
  }, [displayData.totalRevenue, currentEntry, selectedMonth]);

  useEffect(() => {
    if (insight && !loadingInsight && displayData.totalRevenue > 0) {
      const cacheKey = `insight_dongui_${selectedMonth}_${displayData.totalRevenue}`;
      localStorage.setItem(cacheKey, insight);
    }
  }, [insight, loadingInsight, selectedMonth, displayData.totalRevenue]);

  const formatMonth = (m: string) => {
    if (!m) return "선택 안됨";
    const [year, month] = m.split("-");
    return `${year.slice(2)}년 ${month}월`;
  };

  const [displayYear, setDisplayYear] = useState<string>(() => {
    return selectedMonth.split("-")[0];
  });

  const uniqueYears = Array.from(new Set(availableMonths.map(m => m.split("-")[0]))).sort((a, b) => b.localeCompare(a));
  const filteredMonths = availableMonths.filter(m => m.startsWith(displayYear));

  const handleMonthClick = (m: string) => {
    setSelectedMonth(m);
    const idx = availableMonths.indexOf(m);
    if (idx > 0) {
      setCompareMonth(availableMonths[idx - 1]);
    }
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

  // Treatment Sorting Logic: Top 10 First
  const sortedTreatments = Object.entries(displayData.treatments)
    .sort((a, b) => (b[1] as number) - (a[1] as number));
  
  const top10 = sortedTreatments.slice(0, 10);
  const others = sortedTreatments.slice(10);

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#0A0E1A] text-white font-sans selection:bg-amber-500/30">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
        
        {/* Page Header */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <button 
              onClick={() => router.push("/")} 
              className="text-slate-500 hover:text-amber-400 flex items-center gap-2 text-sm transition-all group"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> EMR 선택
            </button>
            <div className="flex items-center gap-3">
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls, .csv" multiple className="hidden" />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-[#0A0E1A] px-6 py-3 rounded-2xl text-xs font-black transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] active:scale-95 group"
              >
                <Upload size={18} className="group-hover:bounce-y transition-transform" /> 
                <span className="tracking-tight">동의보감 데이터 업로드</span>
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
                <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold tracking-wider uppercase">
                  Traditional Excellence
                </span>
                <span className="text-slate-400 text-xs font-medium uppercase tracking-widest flex items-center gap-1">
                  <Award size={12} className="text-amber-500" /> Powered by Donguibogam
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight leading-tight">
                동의보감 <span className="text-slate-400">경영 리포트</span>
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

          {/* No Data Alert */}
          {isMock && (
            <NoDataAlert onUploadClick={() => fileInputRef.current?.click()} />
          )}

          {/* Data Integrity Status */}
          {!isMock && (
            <div className="flex flex-wrap gap-4 mb-8">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${displayData.hasFinancialData ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-rose-500/10 border-rose-500/30 text-rose-400"}`}>
                <div className={`w-2 h-2 rounded-full animate-pulse ${displayData.hasFinancialData ? "bg-emerald-500" : "bg-rose-500"}`} />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  매출 통계 {displayData.hasFinancialData ? "연동됨" : "미등록"}
                </span>
              </div>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${displayData.hasTreatmentData ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-rose-500/10 border-rose-500/30 text-rose-400"}`}>
                <div className={`w-2 h-2 rounded-full animate-pulse ${displayData.hasTreatmentData ? "bg-emerald-500" : "bg-rose-500"}`} />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  진료 통계 {displayData.hasTreatmentData ? "연동됨" : "미등록"}
                </span>
              </div>
              {!displayData.hasFinancialData || !displayData.hasTreatmentData ? (
                <p className="text-slate-500 text-[10px] font-medium flex items-center gap-2 animate-pulse">
                  <AlertTriangle size={14} className="text-amber-500" />
                  동의보감은 두 종류의 파일을 모두 업로드해야 정확한 분석이 가능합니다.
                </p>
              ) : (
                <p className="text-emerald-500/60 text-[10px] font-medium flex items-center gap-2">
                  <ShieldCheck size={14} />
                  데이터 정합성이 확인되었습니다.
                </p>
              )}
            </div>
          )}

          {/* Year Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {uniqueYears.map(year => (
                <button
                  key={year}
                  onClick={() => setDisplayYear(year)}
                  className={`px-5 py-2 rounded-xl text-xs font-bold transition-all border shrink-0 ${
                    displayYear === year 
                    ? "bg-white/10 border-amber-500/50 text-amber-400 shadow-lg shadow-amber-500/5" 
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
                    ? "bg-amber-500 border-amber-600 text-[#0A0E1A] shadow-lg shadow-amber-500/20" 
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
              {filteredMonths.length === 0 && (
                <div className="text-slate-600 text-sm font-medium py-4 px-2 italic">
                  {displayYear}년 데이터가 없습니다.
                </div>
              )}
            </div>
          </div>

          {/* Hero Row: Total Revenue */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-6 px-4">
              <div className="h-6 w-1.5 bg-amber-500 rounded-full" />
              <h3 className="text-sm font-black text-white/40 uppercase tracking-[0.3em]">Financial Statistics</h3>
            </div>
            <div className="relative group overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#1F1D1A] to-[#0D1117] border border-amber-500/30 shadow-2xl p-10">
              <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity duration-1000">
                <DollarSign size={300} />
              </div>
              
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                <div>
                  <p className="text-amber-500/80 text-xs font-black uppercase tracking-[0.2em] mb-3">Target Month Performance</p>
                  <h2 className="text-white text-xl font-medium mb-1">
                    <span className="text-amber-400 font-black">{formatMonth(selectedMonth)}</span> 총 진료비 매출액
                  </h2>
                  <p className="text-slate-500 text-sm">동의보감 시스템에서 집계된 전체 발생 매출입니다.</p>
                </div>
                
                <div className="text-center md:text-right">
                  <div className="inline-flex items-baseline gap-2 bg-black/40 backdrop-blur-xl px-8 py-6 rounded-3xl border border-white/10 shadow-2xl">
                    <RollingNumber value={displayData.totalRevenue} color="amber" />
                    <span className="text-2xl font-black text-slate-500">원</span>
                  </div>
                  {compareMonth && (
                    <div className={`mt-4 flex items-center justify-center md:justify-end gap-2 font-bold ${displayData.totalRevenue >= pData.totalRevenue ? "text-emerald-400" : "text-rose-400"}`}>
                      <span className="text-lg">
                        {displayData.totalRevenue >= pData.totalRevenue ? "▲" : "▼"} 
                        {formatNumber(Math.abs(displayData.totalRevenue - pData.totalRevenue))}원
                      </span>
                      <span className="text-slate-600 text-xs font-medium">vs {formatMonth(compareMonth)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Monthly Trend Mini Chart */}
          <div className="mb-12 bg-white/5 border border-white/10 rounded-[2.5rem] p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-bold text-white mb-1">매출 및 내원 환자 추세</h3>
                <p className="text-slate-500 text-xs">최근 업로드된 12개월간의 경영 흐름 분석</p>
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
                  const mData = monthlyData[m]?.donguibogamData;
                  const rev = mData?.totalRevenue || 0;
                  const maxRev = Math.max(...finalTrendMonths.map(mm => monthlyData[mm]?.donguibogamData?.totalRevenue || 1));
                  const height = Math.max(8, (rev / maxRev) * 100);
                  
                  return (
                    <div 
                      key={m} 
                      onClick={() => handleMonthClick(m)}
                      className="group relative flex-1 flex flex-col items-center gap-2 cursor-pointer"
                    >
                      <div className="w-full bg-white/5 rounded-t-lg relative overflow-hidden h-40 flex items-end">
                        <div 
                          className={`w-full transition-all duration-700 ease-out ${selectedMonth === m ? "bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.6)]" : "bg-white/10 group-hover:bg-white/20"}`}
                          style={{ height: `${height}%` }}
                        />
                      </div>
                      <span className={`text-[9px] font-black transition-colors whitespace-nowrap ${selectedMonth === m ? "text-amber-500" : "text-slate-600"}`}>
                        {m.split("-")[1]}월
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Comparison Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-[#111624] rounded-[2rem] p-6 border border-white/5 hover:border-amber-500/30 transition-all group shadow-xl">
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500 group-hover:bg-amber-500 group-hover:text-[#0A0E1A] transition-all">
                  <TrendingUp size={22} />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Monthly Growth</p>
                  <p className={`text-sm font-black ${displayData.totalRevenue >= pData.totalRevenue ? "text-emerald-400" : "text-rose-400"}`}>
                    {pData.totalRevenue > 0 ? ((displayData.totalRevenue - pData.totalRevenue) / pData.totalRevenue * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>
              <h3 className="text-slate-400 text-xs font-bold mb-2 uppercase">전월 대비 매출 비교</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] text-slate-600 font-bold uppercase">{formatMonth(compareMonth || prevMonthKey)}</span>
                  <span className="text-sm font-bold text-zinc-400">{formatNumber(pData.totalRevenue)}</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-[10px] text-amber-500 font-bold uppercase">{formatMonth(selectedMonth)}</span>
                  <span className="text-xl font-black text-white">{formatNumber(displayData.totalRevenue)}</span>
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
            </div>

            <div className="bg-[#111624] rounded-[2rem] p-6 border border-white/5 hover:border-emerald-500/30 transition-all group shadow-xl">
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                  <Plus size={22} />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Revenue Mix</p>
                  <p className="text-sm font-black text-emerald-400">
                    {nonCoveredRatio.toFixed(1)}%
                  </p>
                </div>
              </div>
              <h3 className="text-slate-400 text-xs font-bold mb-2 uppercase">건강보험 대비 비급여 비율</h3>
              <div className="relative h-4 w-full bg-slate-800 rounded-lg overflow-hidden flex mt-4">
                <div className="h-full bg-blue-500" style={{ width: `${100 - nonCoveredRatio}%` }} />
                <div className="h-full bg-amber-500" style={{ width: `${nonCoveredRatio}%` }} />
              </div>
            </div>
          </div>

          {/* Premium Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <div className="bg-[#111624] rounded-[2rem] p-6 shadow-xl border border-white/5 group hover:scale-[1.02] transition-all relative overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all">
                  <ShieldCheck size={20} />
                </div>
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/10 px-2 py-0.5 rounded-full mb-1 inline-block">Insurance</span>
              </div>
              <p className="text-slate-400 text-[11px] font-bold mb-1 uppercase tracking-tight">보험 수익 (본인+청구)</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-white tracking-tighter">{formatNumber(insuranceRevenue)}</span>
                <span className="text-xs font-bold text-slate-500">원</span>
              </div>
            </div>

            <div className="bg-[#111624] rounded-[2rem] p-6 shadow-xl border border-white/5 group hover:scale-[1.02] transition-all relative overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-rose-500/10 rounded-xl text-rose-500 group-hover:bg-rose-500 group-hover:text-white transition-all">
                  <AlertCircle size={20} />
                </div>
                <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest bg-rose-500/10 px-2 py-0.5 rounded-full mb-1 inline-block">Full-Pay</span>
              </div>
              <p className="text-slate-400 text-[11px] font-bold mb-1 uppercase tracking-tight">전액 본인부담금</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-white tracking-tighter">{formatNumber(displayData.fullCopay)}</span>
                <span className="text-xs font-bold text-slate-500">원</span>
              </div>
            </div>

            <div className="bg-[#111624] rounded-[2rem] p-6 shadow-xl border border-white/5 group hover:scale-[1.02] transition-all relative overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-all">
                  <Plus size={20} />
                </div>
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded-full mb-1 inline-block">General</span>
              </div>
              <p className="text-slate-400 text-[11px] font-bold mb-1 uppercase tracking-tight">비급여 진료 수익</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-white tracking-tighter">{formatNumber(displayData.nonCovered)}</span>
                <span className="text-xs font-bold text-slate-500">원</span>
              </div>
            </div>

            <div className="bg-[#111624] rounded-[2rem] p-6 shadow-xl border border-white/5 group hover:scale-[1.02] transition-all relative overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                  <CreditCard size={20} />
                </div>
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-full mb-1 inline-block">Received</span>
              </div>
              <p className="text-slate-400 text-[11px] font-bold mb-1 uppercase tracking-tight">실수납 합계액</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-white tracking-tighter">{formatNumber(displayData.totalReceived)}</span>
                <span className="text-xs font-bold text-slate-500">원</span>
              </div>
            </div>
          </div>

          {/* Patient Metrics Summary Bar */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-6 px-4">
              <div className="h-6 w-1.5 bg-blue-500 rounded-full" />
              <h3 className="text-sm font-black text-white/40 uppercase tracking-[0.3em]">Patient Flow Statistics</h3>
            </div>
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-4 border border-white/10">
              <div className="flex flex-col items-end">
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-0.5">총 내원 환자</p>
                <p className="text-2xl font-black text-amber-500 leading-none">{formatNumber(displayData.totalPatients)}<span className="text-xs font-bold ml-1 text-slate-500">명</span></p>
              </div>
              <div className="w-px h-10 bg-white/10 hidden md:block"></div>
              <div className="flex flex-col items-end">
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-0.5">신규 환자 수</p>
                <p className="text-2xl font-black text-blue-400 leading-none">{formatNumber(displayData.newPatients)}<span className="text-xs font-bold ml-1 text-slate-500">명</span></p>
              </div>
              <div className="w-px h-10 bg-white/10 hidden md:block"></div>
              <div className="flex flex-col items-end">
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-0.5">재진 환자 수</p>
                <p className="text-2xl font-black text-emerald-400 leading-none">{formatNumber(displayData.recurringPatients)}<span className="text-xs font-bold ml-1 text-slate-500">명</span></p>
              </div>
            </div>
          </section>

          {/* Treatment Breakdown List */}
          <div className="mb-12">
            <div className="space-y-8">
              <div className="bg-[#111624] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
                <div className="flex items-center justify-between mb-8 relative z-10">
                  <h2 className="text-2xl font-bold flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                      <Activity size={20} />
                    </div>
                    차트별 상세 처방 분석 (Top 10 우선)
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                  <div className="space-y-3">
                    <p className="text-amber-500/40 text-[10px] font-black uppercase tracking-widest mb-2 border-b border-amber-500/10 pb-2">가장 빈번한 처방 항목</p>
                    {top10.map(([name, count], idx) => (
                      <div key={name} className="flex items-center justify-between group/item p-2 hover:bg-white/5 rounded-lg transition-all">
                         <div className="flex items-center gap-3">
                           <span className="w-5 text-[10px] font-black text-amber-700">0{idx + 1}</span>
                           <span className="text-sm font-medium text-amber-100/80">{name}</span>
                         </div>
                         <span className="text-sm font-black text-amber-400 min-w-[30px] text-right">{count as any}건</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <p className="text-amber-100/20 text-[10px] font-black uppercase tracking-widest mb-2 border-b border-white/5 pb-2 ml-4">기타 모든 행위 통계</p>
                    <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-amber-900 scrollbar-track-transparent">
                       {others.map(([name, count]) => (
                         <div key={name} className="flex flex-col p-3 bg-white/[0.02] rounded-xl border border-white/5 hover:border-amber-900 transition-colors">
                            <span className="text-amber-100/40 text-[10px] font-medium mb-1 truncate">{name}</span>
                            <span className="text-lg font-black text-white">{count as any}<span className="text-[10px] ml-1 text-amber-900">건</span></span>
                         </div>
                       ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Mission & Management Quotes */}
          <section className="mb-12">
            <DailyMissionCard data={currentEntry as any || { patientMetrics: { new: 0, auto: 0, total: 0, dailyAvg: 0 }, generatedRevenue: { total: 0, nonCovered: 0 }, leakage: { receivables: 0 } }} userName="원장" emrType="donguibogam" />
          </section>

        {/* Bottom CTA to AI Deep Analysis */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 mb-20 px-4"
        >
          <button 
            onClick={() => router.push("/ai-intelligence?emr=donguibogam")}
            className="w-full relative group overflow-hidden rounded-[3rem] p-1 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 shadow-2xl shadow-amber-500/20 active:scale-[0.98] transition-all"
          >
            <div className="relative bg-[#0A0E1A] rounded-[2.9rem] p-10 flex flex-col md:flex-row items-center justify-between gap-8 overflow-hidden">
              <div className="absolute top-0 right-0 p-20 opacity-[0.03] group-hover:scale-110 group-hover:rotate-12 transition-all duration-700">
                <BrainCircuit size={300} />
              </div>
              <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px]" />

              <div className="relative z-10 flex items-center gap-8 text-left">
                <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-[#0A0E1A] shadow-xl shadow-amber-500/30 group-hover:rotate-6 transition-transform">
                  <Sparkles size={40} />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-white tracking-tight mb-2">동의보감 AI 경영 심층 분석 리포트</h2>
                  <p className="text-slate-400 font-light max-w-md">
                    동의보감의 누적 데이터를 통합 분석하여 원장님께 가장 최적화된 맞춤형 경영 전략과 미래 예측을 제안합니다.
                  </p>
                </div>
              </div>

              <div className="relative z-10 flex items-center gap-4">
                <div className="flex flex-col items-end mr-4 hidden md:block">
                  <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Upgrade Strategy</span>
                  <span className="text-sm font-bold text-slate-500">Go to Intelligence Center</span>
                </div>
                <div className="h-16 w-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white group-hover:bg-amber-500 group-hover:border-amber-500 group-hover:text-[#0A0E1A] transition-all duration-300">
                  <ArrowUpRight size={28} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </div>
              </div>
            </div>
          </button>
        </motion.section>
        </div>

        {/* Footer Info */}
        <div className="text-center p-12 mt-12 border-t border-white/5">
           <p className="text-slate-600 text-xs font-medium tracking-widest uppercase mb-4">Clinic Performance Management System • WealthyWei Platform</p>
        </div>

        </main>
      </div>
    </DashboardLayout>
  );
}

// --- Rolling Number Component ---
function RollingNumber({ value, color = "gold" }: { value: number, color?: "gold" | "amber" }) {
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

  const gradientClass = color === "gold" 
    ? "from-gold-400 via-white to-gold-400" 
    : "from-amber-400 via-white to-amber-400";

  return (
    <span className={`text-5xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r ${gradientClass} animate-gradient`}>
      {new Intl.NumberFormat("ko-KR").format(displayValue)}
    </span>
  );
}
