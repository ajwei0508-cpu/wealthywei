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
  Upload
} from "lucide-react";
import { useData } from "@/context/DataContext";
import DashboardLayout from "@/components/DashboardLayout";
import { parseExcelFile } from "@/lib/excelParser";
import toast from "react-hot-toast";
import { generateClinicInsight } from "@/lib/aiService";
import { useRouter } from "next/navigation";
import { YoutubeVideoLink } from "@/components/YoutubeVideoLink";

const formatNumber = (num: number) => {
  return new Intl.NumberFormat("ko-KR").format(num || 0);
};

export default function OkchartPage() {
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

  // State for Period Comparison
  const [viewMode, setViewMode] = useState<"single" | "period">("single");
  const [startMonth, setStartMonth] = useState<string>("");
  const [endMonth, setEndMonth] = useState<string>("");
  const router = useRouter();

  const availableMonths = React.useMemo(() => {
    return Object.keys(monthlyData).sort();
  }, [monthlyData]);

  const filteredMonthsForPeriod = React.useMemo(() => {
    if (!startMonth || !endMonth) return [];
    return availableMonths.filter(m => m >= startMonth && m <= endMonth);
  }, [availableMonths, startMonth, endMonth]);

  // Current & Previous Data for Comparison
  const currentData = monthlyData[selectedMonth] || { okchartData: null };
  const prevMonthIndex = availableMonths.indexOf(selectedMonth) - 1;
  const prevMonthKey = prevMonthIndex >= 0 ? availableMonths[prevMonthIndex] : "";
  const prevDataEntry = monthlyData[compareMonth || prevMonthKey] || { okchartData: null };
  
  const data = currentData.okchartData || {
    totalPatients: 0, newPatients: 0, autoPatients: 0, avgDailyPatients: 0,
    totalRevenue: 0, insuranceClaim: 0, copay: 0, autoClaim: 0, workerClaim: 0,
    nonCovered: 0, patientTotal: 0, receivables: 0, discountTotal: 0,
    roundOffTotal: 0, totalReceived: 0, totalRefund: 0, cashPayment: 0,
    cardPayment: 0, giftPayment: 0,
  };

  const pData = prevDataEntry.okchartData || {
    totalPatients: 0, newPatients: 0, totalRevenue: 0, insuranceClaim: 0, copay: 0, nonCovered: 0, autoClaim: 0,
  };

  const isMock = !currentData.okchartData;

  // Derived Metrics
  const insuranceRevenue = data.insuranceClaim + data.copay;
  const pInsuranceRevenue = pData.insuranceClaim + pData.copay;
  
  const revenuePerPatient = data.totalPatients > 0 ? data.totalRevenue / data.totalPatients : 0;
  const pRevenuePerPatient = pData.totalPatients > 0 ? pData.totalRevenue / pData.totalPatients : 0;
  
  const nonCoveredRatio = insuranceRevenue > 0 ? (data.nonCovered / insuranceRevenue) * 100 : 0;
  const pNonCoveredRatio = pInsuranceRevenue > 0 ? (pData.nonCovered / pInsuranceRevenue) * 100 : 0;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    toast.loading("오케이차트 파일 분석 중...", { id: "excel-parse" });
    try {
      for (let i = 0; i < files.length; i++) {
        const resList = await parseExcelFile(files[i], selectedMonth, "okchart");
        for (const res of resList) await setMonthlyData(res.targetMonth, res.extractedData);
      }
      toast.success("분석 완료", { id: "excel-parse" });
    } catch (err: any) {
      toast.error(err.message, { id: "excel-parse" });
    }
  };

  useEffect(() => {
    async function getInsight() {
      if (data.totalRevenue > 0) {
        setLoadingInsight(true);
        try {
          const res = await generateClinicInsight(currentData);
          setInsight(res);
        } catch (e) {
          setInsight("현재 데이터를 기반으로 원장님의 병원을 위한 경영 진단을 준비 중입니다.");
        } finally {
          setLoadingInsight(false);
        }
      }
    }
    getInsight();
  }, [data.totalRevenue, currentData]);

  const formatMonth = (m: string) => {
    if (!m) return "선택 안됨";
    const [year, month] = m.split("-");
    return `${year.slice(2)}년 ${month}월`;
  };

  const [displayYear, setDisplayYear] = useState<string>(() => {
    return selectedMonth.split("-")[0];
  });

  const uniqueYears = Array.from(new Set(availableMonths.map(m => m.split("-")[0]))).sort((a, b) => b.localeCompare(a));

  // 월 클릭 시 자동 전월 비교
  const handleMonthClick = (m: string) => {
    setSelectedMonth(m);
    const idx = availableMonths.indexOf(m);
    if (idx > 0) {
      setCompareMonth(availableMonths[idx - 1]);
    }
  };

  // Quick Comparison Logic
  const setMoM = () => {
    const idx = availableMonths.indexOf(selectedMonth);
    if (idx > 0) setCompareMonth(availableMonths[idx - 1]);
    else toast.error("이전 달 데이터가 없습니다.");
  };

  const setYoY = () => {
    const [y, m] = selectedMonth.split("-");
    const lastYear = `${parseInt(y) - 1}-${m}`;
    if (availableMonths.includes(lastYear)) {
      setCompareMonth(lastYear);
      setDisplayYear((parseInt(y) - 1).toString()); // 해당 연도 탭으로 이동
      toast.success(`${parseInt(y)-1}년 ${m}월과 비교합니다.`);
    } else {
      toast.error("작년 동월 데이터가 없습니다.");
    }
  };

  const filteredMonths = availableMonths.filter(m => m.startsWith(displayYear));

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#0A0E1A] text-white font-sans selection:bg-gold-500/30">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
        
        {/* Page Header */}
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
                  EMR Intelligence
                </span>
                <span className="text-slate-400 text-xs font-medium uppercase tracking-widest flex items-center gap-1">
                  <ShieldCheck size={12} className="text-emerald-500" /> Powered by OKChart
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight leading-tight">
                오케이차트 <span className="text-slate-400">경영 리포트</span>
              </h1>
            </div>

            {/* Quick Toggle Buttons */}
            <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10">
              <button 
                onClick={setYoY}
                className="px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-tighter hover:bg-white/5 transition-all text-slate-400 hover:text-white"
              >
                작년 대비 (YoY)
              </button>
            </div>
          </div>

          {/* Year Tabs */}
          <div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar">
            {uniqueYears.map(year => (
              <button
                key={year}
                onClick={() => setDisplayYear(year)}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all border ${
                  displayYear === year 
                  ? "bg-white/10 border-gold-500/50 text-gold-400 shadow-lg shadow-gold-500/5" 
                  : "bg-white/5 border-white/5 text-slate-500 hover:border-white/20"
                }`}
              >
                {year}년
              </button>
            ))}
          </div>

          {/* Filtered Horizontal Month Navigation */}
          <div className="mb-10 relative">
            <div className="flex items-center gap-1.5 pb-4">
              {filteredMonths.map((m) => (
                <button
                  key={m}
                  onClick={() => handleMonthClick(m)}
                  className={`flex-1 min-w-0 py-3 rounded-xl border transition-all flex flex-col items-center justify-center ${
                    selectedMonth === m 
                    ? "bg-[#FBBF24] border-[#F59E0B] text-[#0A0E1A] shadow-lg shadow-amber-500/20" 
                    : compareMonth === m
                    ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                    : "bg-white/5 border-white/10 text-slate-500 hover:border-white/20"
                  }`}
                >
                  <span className={`text-[8px] font-black uppercase ${selectedMonth === m ? "text-[#0A0E1A]/60" : "text-slate-600"}`}>
                    {m.split("-")[0].slice(2)}년
                  </span>
                  <span className="text-sm font-black tracking-tighter">
                    {m.split("-")[1]}월
                  </span>
                </button>
              ))}
              {availableMonths.length === 0 && (
                <div className="text-slate-600 text-sm font-medium py-4 px-2 italic">
                  업로드된 데이터가 없습니다. 엑셀 파일을 업로드해주세요.
                </div>
              )}
            </div>
          </div>

          {/* New Animated Hero Row: Total Revenue */}
          <div className="relative group overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#1A1F35] to-[#0D1117] border border-gold-500/30 shadow-2xl p-10 mb-8">
            <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity duration-1000">
              <DollarSign size={300} />
            </div>
            
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div>
                <p className="text-gold-500/80 text-xs font-black uppercase tracking-[0.2em] mb-3">Target Month Performance</p>
                <h2 className="text-white text-xl font-medium mb-1">
                  <span className="text-gold-400 font-black">{formatMonth(selectedMonth)}</span> 총 진료비 매출액
                </h2>
                <p className="text-slate-500 text-sm">오케이차트 시스템에서 집계된 전체 발생 매출입니다.</p>
              </div>
              
              <div className="text-center md:text-right">
                <div className="inline-flex items-baseline gap-2 bg-black/40 backdrop-blur-xl px-8 py-6 rounded-3xl border border-white/10 shadow-2xl">
                  <RollingNumber value={data.totalRevenue} />
                  <span className="text-2xl font-black text-slate-500">원</span>
                </div>
                {compareMonth && (
                  <div className={`mt-4 flex items-center justify-center md:justify-end gap-2 font-bold ${data.totalRevenue >= pData.totalRevenue ? "text-emerald-400" : "text-rose-400"}`}>
                    <div className={`px-2 py-0.5 rounded-md text-[10px] uppercase ${data.totalRevenue >= pData.totalRevenue ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
                      {data.totalRevenue >= pData.totalRevenue ? "Growth" : "Decline"}
                    </div>
                    <span className="text-lg">
                      {data.totalRevenue >= pData.totalRevenue ? "▲" : "▼"} 
                      {formatNumber(Math.abs(data.totalRevenue - pData.totalRevenue))}원
                    </span>
                    <span className="text-slate-600 text-xs font-medium">vs {formatMonth(compareMonth)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Monthly Trend Mini Chart */}
          <div className="mb-12 bg-white/5 border border-white/10 rounded-[2.5rem] p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-bold text-white mb-1">매출 및 내원 환자 추세</h3>
                <p className="text-slate-500 text-xs">최근 업로드된 12개월간의 경영 흐름 분석</p>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm bg-gold-500" />
                  <span className="text-[10px] font-bold text-slate-400">매출액</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400">환자수</span>
                </div>
              </div>
            </div>
            
            <div className="h-48 flex items-end justify-between gap-1 px-2">
              {(() => {
                const currentIndex = availableMonths.indexOf(selectedMonth);
                const trendMonths = availableMonths.slice(Math.max(0, currentIndex - 11), currentIndex + 1);
                
                // 시간순으로 정렬 (Oldest -> Newest)
                const finalTrendMonths = trendMonths.length < 12 && availableMonths.length > trendMonths.length
                  ? availableMonths.slice(0, 12)
                  : [...trendMonths];

                return finalTrendMonths.map((m) => {
                  const mData = monthlyData[m]?.okchartData;
                  const rev = mData?.totalRevenue || 0;
                  const maxRev = Math.max(...finalTrendMonths.map(mm => monthlyData[mm]?.okchartData?.totalRevenue || 1));
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
                        <div 
                          className="absolute w-full h-1 bg-blue-500/40 bottom-0 mb-1"
                          style={{ bottom: `${Math.min(95, (mData?.totalPatients || 0) / 10)}%` }}
                        />
                      </div>
                      <span className={`text-[9px] font-black transition-colors whitespace-nowrap ${selectedMonth === m ? "text-[#FBBF24]" : "text-slate-600"}`}>
                        {m.split("-")[1]}월
                      </span>
                      
                      <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 bg-slate-800 border border-white/10 p-3 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none min-w-[120px] shadow-2xl">
                        <p className="text-[10px] font-black text-slate-500 mb-1 uppercase">{formatMonth(m)}</p>
                        <p className="text-sm font-black text-white">{formatNumber(rev)}원</p>
                        <p className="text-[10px] font-bold text-blue-400 mt-1">{formatNumber(mData?.totalPatients || 0)}명 내원</p>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Second Row: Comparison Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {/* 1. Total Revenue Comparison Card */}
            <div className="bg-[#111624] rounded-[2rem] p-6 border border-white/5 hover:border-gold-500/30 transition-all group shadow-xl">
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-gold-500/10 rounded-2xl text-gold-500 group-hover:bg-gold-500 group-hover:text-[#0A0E1A] transition-all">
                  <TrendingUp size={22} />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Monthly Growth</p>
                  <p className={`text-sm font-black ${data.totalRevenue >= pData.totalRevenue ? "text-emerald-400" : "text-rose-400"}`}>
                    {pData.totalRevenue > 0 ? ((data.totalRevenue - pData.totalRevenue) / pData.totalRevenue * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>
              <h3 className="text-slate-400 text-xs font-bold mb-2 uppercase">전월 대비 매출 비교</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] text-slate-600 font-bold uppercase">{formatMonth(compareMonth || prevMonthKey)}</span>
                  <span className="text-sm font-bold text-slate-400">{formatNumber(pData.totalRevenue)}</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-[10px] text-gold-500 font-bold uppercase">{formatMonth(selectedMonth)}</span>
                  <span className="text-xl font-black text-white">{formatNumber(data.totalRevenue)}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mt-2">
                  <div 
                    className="h-full bg-gold-500" 
                    style={{ width: `${Math.min(100, (data.totalRevenue / (pData.totalRevenue || 1)) * 50)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 2. Revenue Per Patient (객단가) */}
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
                지난달 대비 환자 1인당 매출이 <span className="text-blue-400 font-bold">{formatNumber(Math.abs(Math.round(revenuePerPatient - pRevenuePerPatient)))}원</span> {revenuePerPatient >= pRevenuePerPatient ? "증가" : "감소"}했습니다.
              </div>
            </div>

            {/* 3. Non-covered Ratio Comparison */}
            <div className="bg-[#111624] rounded-[2rem] p-6 border border-white/5 hover:border-amber-500/30 transition-all group shadow-xl">
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-all">
                  <Plus size={22} />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Revenue Mix</p>
                  <p className="text-sm font-black text-amber-400">
                    {nonCoveredRatio.toFixed(1)}%
                  </p>
                </div>
              </div>
              <h3 className="text-slate-400 text-xs font-bold mb-2 uppercase">건강보험 대비 비급여 비율</h3>
              <div className="space-y-4">
                <div className="relative h-4 w-full bg-slate-800 rounded-lg overflow-hidden flex">
                  <div 
                    className="h-full bg-blue-500 shadow-[inset_-2px_0_4px_rgba(0,0,0,0.3)]" 
                    style={{ width: `${100 - nonCoveredRatio}%` }}
                    title="건강보험"
                  />
                  <div 
                    className="h-full bg-amber-500 shadow-[inset_2px_0_4px_rgba(0,0,0,0.3)]" 
                    style={{ width: `${nonCoveredRatio}%` }}
                    title="비급여"
                  />
                </div>
                <div className="flex justify-between text-[10px] font-bold">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-slate-400">건강보험 {formatNumber(insuranceRevenue)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-slate-400">비급여 {formatNumber(data.nonCovered)}</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 italic mt-2 text-center">
                  * 지난달 대비 비급여 비중이 <span className={nonCoveredRatio >= pNonCoveredRatio ? "text-emerald-400" : "text-rose-400"}>{(nonCoveredRatio - pNonCoveredRatio).toFixed(1)}%p</span> 변화했습니다.
                </p>
              </div>
            </div>
          </div>
        </div>


        {isMock && (
          <div className="mb-8 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Info size={20} />
            </div>
            <p className="text-emerald-200/80 text-sm font-medium italic">
              * 현재 보시는 화면은 가이드용 <span className="text-emerald-400 font-bold underline underline-offset-4 decoration-emerald-500/30">샘플 데이터</span>입니다. 엑셀 업로드 시 원장님 한의원의 실제 통계로 자동 업데이트됩니다.
            </p>
          </div>
        )}

        {/* Premium Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Card 2: Insurance Total */}
          <div className="bg-[#111624] rounded-[2rem] p-6 shadow-xl border border-white/5 group hover:scale-[1.02] transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-125 transition-transform">
              <ShieldCheck size={80} />
            </div>
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all">
                <ShieldCheck size={20} />
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/10 px-2 py-0.5 rounded-full mb-1 inline-block">Insurance</span>
                {compareMonth && (
                  <p className={`text-[10px] font-black ${insuranceRevenue >= pInsuranceRevenue ? "text-emerald-400" : "text-rose-400"}`}>
                    {pInsuranceRevenue > 0 ? ((insuranceRevenue - pInsuranceRevenue) / pInsuranceRevenue * 100).toFixed(1) : 0}%
                  </p>
                )}
              </div>
            </div>
            <p className="text-slate-400 text-[11px] font-bold mb-1 uppercase tracking-tight">보험 수익 (본인+청구)</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-white tracking-tighter">{formatNumber(insuranceRevenue)}</span>
              <span className="text-xs font-bold text-slate-500">원</span>
            </div>
            <div className="mt-4 pt-4 border-t border-white/5 flex justify-between">
              <div className="text-[10px] text-slate-500">
                <span className="block font-bold">본부금</span>
                {formatNumber(data.copay)}
              </div>
              <div className="text-[10px] text-slate-500 text-right">
                <span className="block font-bold">청구액</span>
                {formatNumber(data.insuranceClaim)}
              </div>
            </div>
          </div>

          {/* Card 3: Non-Covered */}
          <div className="bg-[#111624] rounded-[2rem] p-6 shadow-xl border border-white/5 group hover:scale-[1.02] transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-125 transition-transform">
              <Plus size={80} />
            </div>
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-all">
                <Plus size={20} />
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded-full mb-1 inline-block">General</span>
                {compareMonth && (
                  <p className={`text-[10px] font-black ${data.nonCovered >= pData.nonCovered ? "text-emerald-400" : "text-rose-400"}`}>
                    {pData.nonCovered > 0 ? ((data.nonCovered - pData.nonCovered) / pData.nonCovered * 100).toFixed(1) : 0}%
                  </p>
                )}
              </div>
            </div>
            <p className="text-slate-400 text-[11px] font-bold mb-1 uppercase tracking-tight">비급여 진료 수익</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-white tracking-tighter">{formatNumber(data.nonCovered)}</span>
              <span className="text-xs font-bold text-slate-500">원</span>
            </div>
            <div className="mt-6 space-y-2">
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500" style={{ width: `${nonCoveredRatio}%` }} />
              </div>
              <p className="text-[10px] text-slate-500 font-bold">전체 매출의 {nonCoveredRatio.toFixed(1)}% 차지</p>
            </div>
          </div>

          {/* Card 4: Auto Insurance */}
          <div className="bg-[#111624] rounded-[2rem] p-6 shadow-xl border border-white/5 group hover:scale-[1.02] transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-125 transition-transform">
              <TrendingUp size={80} />
            </div>
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-rose-500/10 rounded-xl text-rose-500 group-hover:bg-rose-500 group-hover:text-white transition-all">
                <TrendingUp size={20} />
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest bg-rose-500/10 px-2 py-0.5 rounded-full mb-1 inline-block">Auto</span>
                {compareMonth && (
                  <p className={`text-[10px] font-black ${data.autoClaim >= pData.autoClaim ? "text-emerald-400" : "text-rose-400"}`}>
                    {pData.autoClaim > 0 ? ((data.autoClaim - pData.autoClaim) / pData.autoClaim * 100).toFixed(1) : 0}%
                  </p>
                )}
              </div>
            </div>
            <p className="text-slate-400 text-[11px] font-bold mb-1 uppercase tracking-tight">자보 진료 수익</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-white tracking-tighter">{formatNumber(data.autoClaim)}</span>
              <span className="text-xs font-bold text-slate-500">원</span>
            </div>
            <div className="mt-4 pt-4 border-t border-white/5 flex justify-between">
              <span className="text-[10px] text-slate-500">자보 내원환자</span>
              <span className="text-[10px] text-rose-400 font-black">{formatNumber(data.autoPatients)}명</span>
            </div>
          </div>

          {/* Card 5: Worker Compensation */}
          <div className="bg-[#111624] rounded-[2rem] p-6 shadow-xl border border-white/5 group hover:scale-[1.02] transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-125 transition-transform">
              <ShieldCheck size={80} />
            </div>
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                <ShieldCheck size={20} />
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded-full mb-1 inline-block">Worker</span>
                {compareMonth && (
                  <p className={`text-[10px] font-black ${data.workerClaim >= pData.workerClaim ? "text-emerald-400" : "text-rose-400"}`}>
                    {pData.workerClaim > 0 ? ((data.workerClaim - pData.workerClaim) / pData.workerClaim * 100).toFixed(1) : 0}%
                  </p>
                )}
              </div>
            </div>
            <p className="text-slate-400 text-[11px] font-bold mb-1 uppercase tracking-tight">산재 진료 수익</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-white tracking-tighter">{formatNumber(data.workerClaim)}</span>
              <span className="text-xs font-bold text-slate-500">원</span>
            </div>
            <div className="mt-4 pt-4 border-t border-white/5">
               <p className="text-[10px] text-slate-500">정밀 파싱 모드 활성화됨</p>
            </div>
          </div>
        </div>

        {/* Patient Metrics Summary Bar */}
        <div className="mb-12">
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-4 border border-white/10">
            <div className="flex flex-col items-end">
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-0.5">총 내원 환자</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-black text-gold-500 leading-none">{formatNumber(data.totalPatients)}<span className="text-xs font-bold ml-1 text-slate-500">명</span></p>
                {compareMonth && (
                  <span className={`text-[10px] font-bold ${data.totalPatients >= pData.totalPatients ? "text-emerald-400" : "text-rose-400"}`}>
                    {data.totalPatients >= pData.totalPatients ? "▲" : "▼"} {formatNumber(Math.abs(data.totalPatients - pData.totalPatients))}
                  </span>
                )}
              </div>
            </div>
            <div className="w-px h-10 bg-white/10 hidden md:block"></div>
            <div className="flex flex-col items-end">
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-0.5">신규 환자 수</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-black text-blue-400 leading-none">{formatNumber(data.newPatients)}<span className="text-xs font-bold ml-1 text-slate-500">명</span></p>
                {compareMonth && (
                  <span className={`text-[10px] font-bold ${data.newPatients >= pData.newPatients ? "text-emerald-400" : "text-rose-400"}`}>
                    {data.newPatients >= pData.newPatients ? "▲" : "▼"} {formatNumber(Math.abs(data.newPatients - pData.newPatients))}
                  </span>
                )}
              </div>
            </div>
            <div className="w-px h-10 bg-white/10 hidden md:block"></div>
            <div className="flex flex-col items-end">
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-0.5">자보 환자 수</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-black text-rose-400 leading-none">{formatNumber(data.autoPatients)}<span className="text-xs font-bold ml-1 text-slate-500">명</span></p>
                {compareMonth && (
                  <span className={`text-[10px] font-bold ${data.autoPatients >= pData.autoPatients ? "text-emerald-400" : "text-rose-400"}`}>
                    {data.autoPatients >= pData.autoPatients ? "▲" : "▼"} {formatNumber(Math.abs(data.autoPatients - pData.autoPatients))}
                  </span>
                )}
              </div>
            </div>
            <div className="w-px h-10 bg-white/10 hidden md:block"></div>
            <div className="flex flex-col items-end">
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-0.5">일평균 환자</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-black text-emerald-400 leading-none">{data.avgDailyPatients.toFixed(1)}<span className="text-xs font-bold ml-1 text-slate-500">명</span></p>
                {compareMonth && (
                  <span className={`text-[10px] font-bold ${data.avgDailyPatients >= pData.avgDailyPatients ? "text-emerald-400" : "text-rose-400"}`}>
                    {data.avgDailyPatients >= pData.avgDailyPatients ? "▲" : "▼"} {(Math.abs(data.avgDailyPatients - pData.avgDailyPatients)).toFixed(1)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Analysis Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Adjustment & Cashflow Analysis */}
          <div className="bg-[#111624] border border-white/5 rounded-[2.5rem] p-8 shadow-inner shadow-black/40 border-t-white/10 transition-all hover:bg-[#131a2c]">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gold-400/20 flex items-center justify-center text-gold-400">
                  <DollarSign size={20} />
                </div>
                수납 및 경영 누수 분석
              </h2>
            </div>
            
            <div className="space-y-6">
              {/* Actual Received */}
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 group hover:bg-white/10 transition-all duration-300">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-400 font-medium">실제 수납총액</span>
                  <span className="text-xl font-black text-white">{formatNumber(data.totalReceived)}원</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-gold-500 to-gold-200"
                    style={{ width: `${(data.totalReceived / (data.patientTotal || 1)) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-[10px] text-slate-500">예정 수납액 대비 수납율</span>
                  <span className="text-[10px] text-gold-400 font-bold">{((data.totalReceived / (data.patientTotal || 1)) * 100).toFixed(1)}%</span>
                </div>
              </div>

              {/* Adjustments Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-amber-500/30 transition-colors">
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-1 flex items-center gap-1">
                    <AlertCircle size={10} className="text-amber-500" /> 미수금
                  </p>
                  <p className="text-lg font-black text-amber-500">{formatNumber(data.receivables)}원</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-red-500/30 transition-colors">
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-1 flex items-center gap-1">
                    <MinusCircle size={10} className="text-red-500" /> 할인총액
                  </p>
                  <p className="text-lg font-black text-red-500">{formatNumber(data.discountTotal)}원</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-slate-500/30 transition-colors">
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-1 flex items-center gap-1">
                    <ArrowDownCircle size={10} className="text-slate-400" /> 절사총액
                  </p>
                  <p className="text-lg font-black text-slate-300">{formatNumber(data.roundOffTotal)}원</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-indigo-500/30 transition-colors">
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-1 flex items-center gap-1">
                    <ArrowDownCircle size={10} className="text-indigo-400" /> 환불총액
                  </p>
                  <p className="text-lg font-black text-indigo-400">{formatNumber(data.totalRefund)}원</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gold-500/5 border border-gold-500/10 flex items-start gap-3">
                <Lightbulb size={20} className="text-gold-500 shrink-0 mt-1" />
                <p className="text-xs text-slate-400 leading-relaxed">
                  결산 데이터상 <span className="text-gold-400 font-bold">{formatNumber(data.receivables + data.discountTotal)}원</span>의 경영 누수(미수+할인)가 발생했습니다. 차트 내 수납 상태가 '미수'인 환자 리스트를 확인해 주세요.
                </p>
              </div>
            </div>
          </div>

          {/* Payment Method Analysis */}
          <div className="bg-[#111624] border border-white/5 rounded-[2.5rem] p-8 shadow-inner shadow-black/40 border-t-white/10 transition-all hover:bg-[#131a2c]">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-400/20 flex items-center justify-center text-indigo-400">
                  <CreditCard size={20} />
                </div>
                수납 수단별 비중 (실수납)
              </h2>
            </div>

            <div className="flex items-center justify-center p-8 mb-4 relative min-h-[220px]">
              <div className="absolute inset-x-0 bottom-0 text-center text-slate-700 text-[120px] font-black -z-10 select-none opacity-10 leading-none">
                OK
              </div>
              
              <div className="flex flex-col gap-6 w-full">
                <div className="flex items-center gap-4">
                  <div className="w-24 text-right text-xs font-bold text-slate-500 uppercase tracking-tighter shrink-0">Card Payment</div>
                  <div className="h-3 grow bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
                      style={{ width: `${(data.cardPayment / (data.totalReceived || 1)) * 100}%` }}
                    />
                  </div>
                  <div className="w-16 text-sm font-bold text-white shrink-0">{((data.cardPayment / (data.totalReceived || 1)) * 100).toFixed(0)}%</div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-24 text-right text-xs font-bold text-slate-500 uppercase tracking-tighter shrink-0">Cash Payment</div>
                  <div className="h-3 grow bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gold-500 rounded-full shadow-[0_0_10px_rgba(234,179,8,0.5)]" 
                      style={{ width: `${(data.cashPayment / (data.totalReceived || 1)) * 100}%` }}
                    />
                  </div>
                  <div className="w-16 text-sm font-bold text-white shrink-0">{((data.cashPayment / (data.totalReceived || 1)) * 100).toFixed(0)}%</div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-24 text-right text-xs font-bold text-slate-500 uppercase tracking-tighter shrink-0">Other/Gift</div>
                  <div className="h-3 grow bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-slate-600 rounded-full" 
                      style={{ width: `${(data.giftPayment / (data.totalReceived || 1)) * 100 || 5}%` }}
                    />
                  </div>
                  <div className="w-16 text-sm font-bold text-white shrink-0">{(data.giftPayment > 0 ? (data.giftPayment / (data.totalReceived || 1)) * 100 : 0).toFixed(0)}%</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-gold-500" />
                  <span className="text-xs text-slate-400">현금</span>
                </div>
                <span className="text-sm font-bold">{formatNumber(data.cashPayment)}원</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-indigo-500" />
                  <span className="text-xs text-slate-400">카드</span>
                </div>
                <span className="text-sm font-bold">{formatNumber(data.cardPayment)}원</span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Insight & YouTube Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Clinic AI Strategy */}
          <div className="lg:col-span-2 relative group overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#1A1F35] to-[#0D1117] border border-gold-500/20 shadow-2xl">
            <div className="absolute top-0 right-0 p-12 opacity-[0.05] group-hover:scale-110 transition-transform duration-1000">
              <Lightbulb size={240} />
            </div>
            
            <div className="relative z-10 p-8 h-full flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-[#0A0E1A] shadow-lg shadow-gold-500/20">
                    <TrendingUp size={28} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">AI 경영 분석 인사이트</h2>
                    <p className="text-gold-500/80 text-xs font-bold uppercase tracking-widest">Powered by Gemini Pro</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gold-500/10 border border-gold-500/20">
                  <div className="h-2 w-2 rounded-full bg-gold-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-gold-500 uppercase tracking-tighter">Live Analysis</span>
                </div>
              </div>

              <div className="flex-grow bg-black/40 backdrop-blur-sm border border-white/5 rounded-3xl p-8 min-h-[300px]">
                {loadingInsight ? (
                  <div className="h-full flex flex-col items-center justify-center gap-4 py-12">
                    <div className="w-12 h-12 border-2 border-gold-500/20 border-t-gold-500 rounded-full animate-spin" />
                    <p className="text-gold-500 text-sm font-medium animate-pulse">Clinic data intelligence analyzing...</p>
                  </div>
                ) : (
                  <div className="prose prose-invert prose-gold max-w-none">
                    <p className="text-slate-300 leading-relaxed text-lg font-light whitespace-pre-wrap">
                      {insight || "데이터를 업로드하시면 실시간 AI 경영 분석 리포트가 생성됩니다."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* YouTube Recommendations */}
          <div className="bg-[#111624] border border-white/10 rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl relative group">
             <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:opacity-10 transition-all">
               <Play size={120} />
             </div>
             
             <div className="p-8 pb-4">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-12 w-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 shadow-inner">
                    <Play size={26} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">원장님을 위한 추천 영상</h2>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Management Strategy</p>
                  </div>
                </div>
                <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-6" />
             </div>

             <div className="px-8 pb-8 flex-grow">
               <div className="space-y-4">
                 <YoutubeVideoLink keyword={currentData.generatedRevenue?.nonCovered > (currentData.generatedRevenue?.total * 0.4) ? "비급여 상담 스페셜리스트" : "한의원 재진 환자 관리"} />
                 <YoutubeVideoLink keyword="한의원 경영 분석" />
                 <YoutubeVideoLink keyword="오케이차트 활용 한의원 경영" />
               </div>
             </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center p-12 mt-12 border-t border-white/5">
           <p className="text-slate-600 text-xs font-medium tracking-widest uppercase mb-4">Clinic Performance Management System • WealthyWei Platform</p>
           <div className="flex justify-center gap-8 text-slate-700">
             <span className="flex items-center gap-2"><ShieldCheck size={14} /> Data Privacy Encryption</span>
             <span className="flex items-center gap-2"><AlertCircle size={14} /> Real-time Sync</span>
           </div>
        </div>

      {/* Background Decor */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-[-1] overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gold-900/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-900/10 rounded-full blur-[120px]" />
        <div className="absolute top-[30%] right-[10%] w-[20%] h-[20%] bg-amber-900/5 rounded-full blur-[100px] animate-pulse" />
      </div>

      <style jsx global>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          background-size: 200% auto;
          animation: gradient 4s linear infinite;
        }
      `}</style>
        </main>
      </div>
    </DashboardLayout>
  );
}

// --- Rolling Number Component ---
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
      
      // Easing function (outExpo)
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      const current = Math.floor(start + (end - start) * ease);
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    };

    requestAnimationFrame(update);
  }, [value]);

  return (
    <span className="text-5xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-gold-400 via-white to-gold-400 animate-gradient drop-shadow-[0_0_15px_rgba(251,191,36,0.3)]">
      {new Intl.NumberFormat("ko-KR").format(displayValue)}
    </span>
  );
}
