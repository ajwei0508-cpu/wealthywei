"use client";

import React, { useState, useEffect } from "react";
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
  Play,
  Upload,
  Activity,
  Award
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

export default function DonguibogamPage() {
  const { 
    monthlyData, 
    selectedMonth, 
    compareMonth,
    setSelectedMonth, 
    setCompareMonth,
    setMonthlyData, 
    deleteMonthlyData 
  } = useData();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [insight, setInsight] = useState<string>("");
  const [loadingInsight, setLoadingInsight] = useState(false);
  const router = useRouter();

  const availableMonths = React.useMemo(() => {
    return Object.keys(monthlyData).sort();
  }, [monthlyData]);

  const currentEntry = monthlyData[selectedMonth] || { donguibogamData: null };
  const prevEntry = monthlyData[compareMonth] || { donguibogamData: null };
  
  const data = currentEntry.donguibogamData || {
    totalRevenue: 0,
    insuranceClaim: 0,
    copay: 0,
    fullCopay: 0,
    nonCovered: 0,
    discount: 0,
    receivables: 0,
    totalReceived: 0,
    cashTotal: 0,
    cardTotal: 0,
    newPatients: 0,
    recurringPatients: 0,
    referralPatients: 0,
    totalPatients: 0,
    treatments: {
      "방문": 0, "경혈": 0, "척추": 0, "부항": 0, "침전": 0,
      "오행": 0, "사암": 0, "화침": 0, "의보한약": 0, "관절": 0
    },
    hasFinancialData: false,
    hasTreatmentData: false
  };

  // Mock data for demonstration when no real data is present
  const displayData = !currentEntry.donguibogamData ? {
    totalRevenue: 68400000,
    insuranceClaim: 24500000,
    copay: 8200000,
    fullCopay: 3500000,
    nonCovered: 32200000,
    discount: 450000,
    receivables: 1200000,
    totalReceived: 42500000,
    cashTotal: 15400000,
    cardTotal: 27100000,
    newPatients: 78,
    recurringPatients: 1150,
    referralPatients: 15,
    totalPatients: 1228,
    treatments: {
      "의보한약": 125, "경혈": 450, "척추": 85, "습식부항": 320, "침전": 510,
      "오행": 45, "사암": 32, "화침": 15, "방문": 120, "관절": 65,
      "건식부항": 150, "도침": 42
    },
    hasFinancialData: false,
    hasTreatmentData: false
  } : data;

  const pData = prevEntry.donguibogamData || {
    totalRevenue: 0, insuranceClaim: 0, copay: 0, fullCopay: 0, nonCovered: 0,
    totalReceived: 0, newPatients: 0, recurringPatients: 0, referralPatients: 0
  };

  const getDiff = (curr: number, prev: number) => {
    if (!prev || prev === 0) return null;
    const diff = ((curr - prev) / prev) * 100;
    return {
      percent: Math.abs(diff).toFixed(1),
      isUp: diff >= 0,
      curr: curr,
      prev: prev
    };
  };

  const isMock = !currentEntry.donguibogamData;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    toast.loading("동의보감 파일 분석 중...", { id: "excel-parse" });
    try {
      for (let i = 0; i < files.length; i++) {
        const resList = await parseExcelFile(files[i], selectedMonth, "donguibogam");
        for (const res of resList) await setMonthlyData(res.targetMonth, res.extractedData);
      }
      toast.success("데이터가 성공적으로 업데이트되었습니다.", { id: "excel-parse" });
    } catch (err: any) {
      toast.error(err.message, { id: "excel-parse" });
    }
  };

  useEffect(() => {
    async function getInsight() {
      if (displayData.totalRevenue > 0) {
        setLoadingInsight(true);
        try {
          const res = await generateClinicInsight(currentEntry);
          setInsight(res);
        } catch (e) {
          setInsight("동의보감 데이터를 분석하여 원장님께 최적의 경영 전략을 제안해 드립니다.");
        } finally {
          setLoadingInsight(false);
        }
      }
    }
    getInsight();
  }, [displayData.totalRevenue, currentEntry]);

  const formatMonth = (m: string) => {
    if (!m) return "선택 안됨";
    const [year, month] = m.split("-");
    return `${year.slice(2)}년 ${month}월`;
  };

  // Treatment Sorting Logic: Top 10 First
  const sortedTreatments = Object.entries(displayData.treatments)
    .sort((a, b) => b[1] - a[1]);
  
  const top10 = sortedTreatments.slice(0, 10);
  const others = sortedTreatments.slice(10);

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#0A0805] text-amber-50 font-sans selection:bg-amber-500/30">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
        
        {/* Page Header */}
        <div className="mb-12">
          <button 
            onClick={() => router.push("/")} 
            className="text-amber-700 hover:text-amber-400 flex items-center gap-2 text-sm mb-6 transition-all group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> EMR 선택으로 돌아가기
          </button>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold tracking-wider uppercase">
                  Traditional Excellence
                </span>
                <div className="h-1 w-1 rounded-full bg-amber-900" />
                <span className="text-amber-700/60 text-xs font-medium uppercase tracking-widest flex items-center gap-1">
                  <Award size={12} className="text-amber-500" /> Powered by 동의보감 EMR
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight mb-2">
                동의보감 <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-amber-200 to-amber-600">스마트 경영 지표</span>
              </h1>
              <p className="text-amber-100/40 text-lg max-w-2xl font-light">
                재무 데이터와 진료 통계를 통합하여 병원의 자생력을 분석하고 성장을 위한 처방을 제안합니다.
              </p>
            </div>
          </div>
        </div>

        {/* Missing Data Warning Banner */}
        {!isMock && (!data.hasFinancialData || !data.hasTreatmentData) && (
          <div className="mb-8 p-6 bg-amber-500/10 border border-amber-500/20 rounded-3xl flex flex-col md:flex-row items-center gap-6 animate-in fade-in slide-in-from-top-4 duration-1000">
            <div className="h-14 w-14 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-500 shrink-0 shadow-lg shadow-amber-500/5">
              <AlertCircle size={32} />
            </div>
            <div className="flex-grow text-center md:text-left">
              <h4 className="text-amber-400 font-bold mb-1">통합 분석을 위한 파일이 더 필요합니다</h4>
              <p className="text-amber-200/60 text-sm leading-relaxed">
                {!data.hasFinancialData ? "현재 [매출/재무] 데이터가 비어 있습니다. 본인부담금 및 수납 분석을 위해 재무 통계 파일을 업로드해주세요." : ""}
                {!data.hasTreatmentData ? "현재 [지표/진료] 데이터가 비어 있습니다. 초진/재진 및 상세 처방 분석을 위해 진료 통계 파일을 업로드해주세요." : ""}
              </p>
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 bg-amber-500 text-black text-xs font-black rounded-2xl shadow-xl shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all shrink-0"
            >
              부족한 파일 추가 업로드
            </button>
          </div>
        )}

        {/* Control Bar */}
        <div className="mb-10 p-4 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 flex flex-wrap items-center justify-between gap-6 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-amber-900 ml-1 uppercase tracking-widest">분석 기준월</span>
                <select 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-amber-600 text-white border-none rounded-xl text-xs font-bold px-4 py-2.5 cursor-pointer focus:ring-2 focus:ring-amber-400 appearance-none min-w-[140px]"
                >
                  {availableMonths.length > 0 ? availableMonths.map(m => <option key={m} value={m}>{formatMonth(m)}</option>) : <option value={selectedMonth}>{formatMonth(selectedMonth)}</option>}
                </select>
              </div>
              <div className="mt-4 flex items-center justify-center p-2 rounded-lg bg-amber-500/10 text-amber-500">
                <ArrowRight size={14} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-amber-900 ml-1 uppercase tracking-widest">비교 대상월</span>
                <select 
                  value={compareMonth} 
                  onChange={(e) => setCompareMonth(e.target.value)}
                  className="bg-[#1A140F] border-none rounded-xl text-xs font-bold px-4 py-2.5 text-amber-200 cursor-pointer focus:ring-2 focus:ring-amber-500 appearance-none min-w-[140px]"
                >
                  <option value="">비교 안함</option>
                  {availableMonths.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls, .csv" multiple className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 px-6 py-3 rounded-2xl text-xs font-black transition-all border border-amber-500/20 active:scale-95"
            >
              <Upload size={18} /> 동의보감 파일 업로드
            </button>
            <button
              onClick={() => { if(confirm("해당 월의 동의보감 데이터를 모두 초기화할까요?")) deleteMonthlyData(selectedMonth); }}
              className="p-3 rounded-2xl bg-white/5 border border-white/10 text-amber-900 transition-all hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400"
              title="데이터 초기화"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>

        {isMock && (
          <div className="mb-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Activity size={20} />
            </div>
            <p className="text-amber-200/80 text-sm font-medium italic">
              * 현재 보시는 화면은 <span className="text-amber-400 font-bold underline underline-offset-4 decoration-amber-500/30">가상 데이터</span>입니다. 파일을 업로드하면 원장님의 실제 통계로 자동 변환됩니다.
            </p>
          </div>
        )}

        {/* Premium 5 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
          {/* Card 1: Total Revenue */}
          <div className="bg-[#1A140F] rounded-[2rem] p-6 shadow-xl border-t-4 border-amber-500 group hover:scale-[1.02] transition-all border-x border-b border-white/5 relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 text-amber-500/5 transform -rotate-12 group-hover:scale-110 transition-transform">
               <DollarSign size={100} />
            </div>
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500 group-hover:bg-amber-500 group-hover:text-black transition-all shadow-inner">
                <DollarSign size={20} />
              </div>
              <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-full">TOTAL</span>
            </div>
            <p className="text-amber-100/40 text-[11px] font-bold mb-1 uppercase tracking-tight">총 진료비 매출액</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-white tracking-tighter">{formatNumber(displayData.totalRevenue)}</span>
              <span className="text-xs font-bold text-amber-700">원</span>
            </div>
            {getDiff(displayData.totalRevenue, pData.totalRevenue) && (
              <div className={`flex flex-col gap-1 mt-3 ${getDiff(displayData.totalRevenue, pData.totalRevenue)?.isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                <div className="flex items-center gap-1 text-[11px] font-black">
                  {getDiff(displayData.totalRevenue, pData.totalRevenue)?.isUp ? <TrendingUp size={12} /> : <Activity size={12} />}
                  {getDiff(displayData.totalRevenue, pData.totalRevenue)?.percent}% {getDiff(displayData.totalRevenue, pData.totalRevenue)?.isUp ? '상승' : '하락'}
                </div>
                <div className="text-[10px] text-amber-100/30 font-medium">
                  {formatMonth(compareMonth)}: {formatNumber(pData.totalRevenue)} → {formatMonth(selectedMonth)}: {formatNumber(displayData.totalRevenue)}
                </div>
              </div>
            )}
          </div>

          <div className="bg-[#1A140F] rounded-[2rem] p-6 shadow-xl border-t-4 border-emerald-500 group hover:scale-[1.02] transition-all border-x border-b border-white/5">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500 group-hover:bg-emerald-500 group-hover:text-black transition-all shadow-inner">
                <ShieldCheck size={20} />
              </div>
              <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-full">INSURANCE</span>
            </div>
            <p className="text-amber-100/40 text-[11px] font-bold mb-1 uppercase tracking-tight">보험 청구 수익</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-white tracking-tighter">{formatNumber(displayData.insuranceClaim)}</span>
              <span className="text-xs font-bold text-amber-700">원</span>
            </div>
            {getDiff(displayData.insuranceClaim, pData.insuranceClaim) && (
              <div className={`flex flex-col gap-1 mt-2 ${getDiff(displayData.insuranceClaim, pData.insuranceClaim)?.isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                <div className="flex items-center gap-1 text-[10px] font-bold">
                  {getDiff(displayData.insuranceClaim, pData.insuranceClaim)?.isUp ? <TrendingUp size={10} /> : <Activity size={10} />}
                  {getDiff(displayData.insuranceClaim, pData.insuranceClaim)?.percent}% {getDiff(displayData.insuranceClaim, pData.insuranceClaim)?.isUp ? '증가' : '감소'}
                </div>
                <div className="text-[9px] text-amber-100/20">
                  {formatMonth(compareMonth)}: {formatNumber(pData.insuranceClaim)} → {formatMonth(selectedMonth)}: {formatNumber(displayData.insuranceClaim)}
                </div>
              </div>
            )}
            <p className="text-[10px] text-emerald-500 font-medium mt-2">
              본부금 {formatNumber(displayData.copay)} 별도
            </p>
          </div>

          <div className="bg-[#1A140F] rounded-[2rem] p-6 shadow-xl border-t-4 border-rose-500 group hover:scale-[1.02] transition-all border-x border-b border-white/5">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-rose-500/10 rounded-xl text-rose-500 group-hover:bg-rose-500 group-hover:text-white transition-all shadow-inner">
                <AlertCircle size={20} />
              </div>
              <span className="text-[10px] font-black text-rose-800 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-full">FULL-PAY</span>
            </div>
            <p className="text-amber-100/40 text-[11px] font-bold mb-1 uppercase tracking-tight">전액 본인부담금</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-white tracking-tighter">{formatNumber(displayData.fullCopay)}</span>
              <span className="text-xs font-bold text-amber-700">원</span>
            </div>
            {getDiff(displayData.fullCopay, pData.fullCopay) && (
              <div className={`flex flex-col gap-1 mt-2 ${getDiff(displayData.fullCopay, pData.fullCopay)?.isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                <div className="flex items-center gap-1 text-[10px] font-bold">
                  {getDiff(displayData.fullCopay, pData.fullCopay)?.isUp ? <TrendingUp size={10} /> : <Activity size={10} />}
                  {getDiff(displayData.fullCopay, pData.fullCopay)?.percent}% 변동
                </div>
                <div className="text-[9px] text-amber-100/20">
                  {formatMonth(compareMonth)}: {formatNumber(pData.fullCopay)} → {formatMonth(selectedMonth)}: {formatNumber(displayData.fullCopay)}
                </div>
              </div>
            )}
          </div>

          <div className="bg-[#1A140F] rounded-[2rem] p-6 shadow-xl border-t-4 border-stone-400 group hover:scale-[1.02] transition-all border-x border-b border-white/5">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-stone-500/10 rounded-xl text-stone-400 group-hover:bg-stone-400 group-hover:text-black transition-all">
                <Plus size={20} />
              </div>
              <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-full">PRIVATE</span>
            </div>
            <p className="text-amber-100/40 text-[11px] font-bold mb-1 uppercase tracking-tight">비보험(비급여) 수익</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-white tracking-tighter">{formatNumber(displayData.nonCovered)}</span>
              <span className="text-xs font-bold text-amber-700">원</span>
            </div>
            {getDiff(displayData.nonCovered, pData.nonCovered) && (
              <div className={`flex flex-col gap-1 mt-3 ${getDiff(displayData.nonCovered, pData.nonCovered)?.isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                <div className="flex items-center gap-1 text-[10px] font-bold">
                  {getDiff(displayData.nonCovered, pData.nonCovered)?.isUp ? <TrendingUp size={10} /> : <Activity size={10} />}
                  {getDiff(displayData.nonCovered, pData.nonCovered)?.percent}% {getDiff(displayData.nonCovered, pData.nonCovered)?.isUp ? '상승' : '하락'}
                </div>
                <div className="text-[9px] text-amber-100/20">
                  {formatMonth(compareMonth)}: {formatNumber(pData.nonCovered)} → {formatMonth(selectedMonth)}: {formatNumber(displayData.nonCovered)}
                </div>
              </div>
            )}
          </div>

          <div className="bg-[#1A140F] rounded-[2rem] p-6 shadow-xl border-t-4 border-amber-300 group hover:scale-[1.02] transition-all border-x border-b border-white/5">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-amber-300/10 rounded-xl text-amber-300 group-hover:bg-amber-300 group-hover:text-black transition-all">
                <TrendingUp size={20} />
              </div>
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-full">COLLECTION</span>
            </div>
            <p className="text-amber-100/40 text-[11px] font-bold mb-1 uppercase tracking-tight">실수납 합계액</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-white tracking-tighter">{formatNumber(displayData.totalReceived)}</span>
              <span className="text-xs font-bold text-amber-700">원</span>
            </div>
            {getDiff(displayData.totalReceived, pData.totalReceived) && (
              <div className={`flex flex-col gap-1 mt-3 ${getDiff(displayData.totalReceived, pData.totalReceived)?.isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                <div className="flex items-center gap-1 text-[10px] font-bold">
                  {getDiff(displayData.totalReceived, pData.totalReceived)?.isUp ? <TrendingUp size={10} /> : <Activity size={10} />}
                  {getDiff(displayData.totalReceived, pData.totalReceived)?.percent}% 지표변동
                </div>
                <div className="text-[9px] text-amber-100/20">
                  {formatMonth(compareMonth)}: {formatNumber(pData.totalReceived)} → {formatMonth(selectedMonth)}: {formatNumber(displayData.totalReceived)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Left: Patient and Treatment Breakdown */}
          <div className="lg:col-span-2 space-y-8">
            {/* Treatment Breakdown List */}
            <div className="bg-[#1A140F] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
               <div className="flex items-center justify-between mb-8 relative z-10">
                 <h2 className="text-2xl font-bold flex items-center gap-3">
                   <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                     <Activity size={20} />
                   </div>
                   차트별 상세 처방 분석 (Top 10 우선)
                 </h2>
                 <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-amber-400">
                   총 {sortedTreatments.length}개 항목 분석됨
                 </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                  {/* Top 10 Columns */}
                  <div className="space-y-3">
                    <p className="text-amber-500/40 text-[10px] font-black uppercase tracking-widest mb-2 border-b border-amber-500/10 pb-2">가장 빈번한 처방 항목</p>
                    {top10.map(([name, count], idx) => (
                      <div key={name} className="flex items-center justify-between group/item p-2 hover:bg-white/5 rounded-lg transition-all">
                         <div className="flex items-center gap-3">
                           <span className="w-5 text-[10px] font-black text-amber-700">0{idx + 1}</span>
                           <span className="text-sm font-medium text-amber-100/80">{name}</span>
                         </div>
                         <div className="flex items-center gap-2">
                           <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden hidden sm:block">
                             <div 
                                className="h-full bg-gradient-to-r from-amber-600 to-amber-400" 
                                style={{ width: `${Math.min(100, (count / (top10[0][1] || 1)) * 100)}%` }}
                             />
                           </div>
                           <span className="text-sm font-black text-amber-400 min-w-[30px] text-right">{count}건</span>
                         </div>
                      </div>
                    ))}
                  </div>

                  {/* Other Treatments Grid */}
                  <div className="space-y-4">
                    <p className="text-amber-100/20 text-[10px] font-black uppercase tracking-widest mb-2 border-b border-white/5 pb-2 ml-4">기타 모든 행위 통계</p>
                    <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-amber-900 scrollbar-track-transparent">
                       {others.map(([name, count]) => (
                         <div key={name} className="flex flex-col p-3 bg-white/[0.02] rounded-xl border border-white/5 hover:border-amber-900 transition-colors">
                            <span className="text-amber-100/40 text-[10px] font-medium mb-1 truncate">{name}</span>
                            <span className="text-lg font-black text-white">{count}<span className="text-[10px] ml-1 text-amber-900">건</span></span>
                         </div>
                       ))}
                       {others.length === 0 && (
                         <div className="col-span-2 flex flex-col items-center justify-center p-12 text-amber-100/10 gap-3 border-2 border-dashed border-white/5 rounded-3xl">
                            <Plus size={32} />
                            <p className="text-xs font-bold uppercase tracking-widest">항목이 더 없습니다</p>
                         </div>
                       )}
                    </div>
                  </div>
               </div>
            </div>

            {/* Inflow Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="bg-[#1A140F] p-6 rounded-[2rem] border border-white/5 flex items-center justify-between">
                  <div>
                  <p className="text-amber-100/40 text-[10px] font-bold uppercase tracking-widest mb-1">초진 환자</p>
                  <p className="text-3xl font-black text-amber-400">{formatNumber(displayData.newPatients)}<span className="text-xs ml-1 opacity-40">명</span></p>
                  {getDiff(displayData.newPatients, pData.newPatients) && (
                    <div className={`text-[9px] font-bold mt-1 ${getDiff(displayData.newPatients, pData.newPatients)?.isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {getDiff(displayData.newPatients, pData.newPatients)?.percent}% {getDiff(displayData.newPatients, pData.newPatients)?.isUp ? '↑' : '↓'} ({formatMonth(compareMonth)}: {getDiff(displayData.newPatients, pData.newPatients)?.prev}명 → {formatMonth(selectedMonth)}: {getDiff(displayData.newPatients, pData.newPatients)?.curr}명)
                    </div>
                  )}
                </div>
                  <div className="p-3 bg-amber-400/10 rounded-2xl text-amber-400">
                    <Users size={24} />
                  </div>
               </div>
               <div className="bg-[#1A140F] p-6 rounded-[2rem] border border-white/5 flex items-center justify-between">
                  <div>
                  <p className="text-amber-100/40 text-[10px] font-bold uppercase tracking-widest mb-1">재진 환자</p>
                  <p className="text-3xl font-black text-emerald-400">{formatNumber(displayData.recurringPatients)}<span className="text-xs ml-1 opacity-40">명</span></p>
                  {getDiff(displayData.recurringPatients, pData.recurringPatients) && (
                    <div className={`text-[9px] font-bold mt-1 ${getDiff(displayData.recurringPatients, pData.recurringPatients)?.isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {getDiff(displayData.recurringPatients, pData.recurringPatients)?.percent}% {getDiff(displayData.recurringPatients, pData.recurringPatients)?.isUp ? '↑' : '↓'} ({formatMonth(compareMonth)}: {getDiff(displayData.recurringPatients, pData.recurringPatients)?.prev}명 → {formatMonth(selectedMonth)}: {getDiff(displayData.recurringPatients, pData.recurringPatients)?.curr}명)
                    </div>
                  )}
                </div>
                  <div className="p-3 bg-emerald-400/10 rounded-2xl text-emerald-400">
                    <TrendingUp size={24} />
                  </div>
               </div>
               <div className="bg-[#1A140F] p-6 rounded-[2rem] border border-white/5 flex items-center justify-between">
                  <div>
                    <p className="text-amber-100/40 text-[10px] font-bold uppercase tracking-widest mb-1">협진 환자</p>
                    <p className="text-3xl font-black text-blue-400">{formatNumber(displayData.referralPatients)}<span className="text-xs ml-1 opacity-40">명</span></p>
                  </div>
                  <div className="p-3 bg-blue-400/10 rounded-2xl text-blue-400">
                    <ShieldCheck size={24} />
                  </div>
               </div>
            </div>
          </div>

          {/* Right: AI Insight & Payment Methods */}
          <div className="space-y-8">
            {/* AI Insight */}
            <div className="bg-gradient-to-br from-amber-700/20 to-[#1A140F] border border-amber-500/20 rounded-[2.5rem] p-8 shadow-2xl flex flex-col h-full min-h-[500px]">
               <div className="flex items-center gap-4 mb-8">
                  <div className="h-12 w-12 rounded-2xl bg-amber-500 flex items-center justify-center text-black">
                    <Activity size={24} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">동의보감 AI 진단</h3>
                    <p className="text-amber-500/60 text-[10px] font-black uppercase tracking-widest">Medical Analytics</p>
                  </div>
               </div>
               <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-500/20 to-transparent mb-8" />
               <div className="flex-grow">
                 {loadingInsight ? (
                   <div className="flex flex-col items-center justify-center h-48 gap-4">
                     <div className="w-10 h-10 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                     <p className="text-amber-500/60 text-xs font-bold animate-pulse uppercase tracking-widest">분석 침 놓는 중...</p>
                   </div>
                 ) : (
                   <div className="prose prose-invert prose-amber max-w-none">
                     <p className="text-amber-100/60 leading-relaxed font-light whitespace-pre-wrap">
                       {insight || "동의보감의 재무 데이터와 진료 통계를 통합 분석하여 원장님의 병원을 위한 비급여 성장 동력을 찾아드립니다. 데이터를 업로드해주세요."}
                     </p>
                   </div>
                 )}
               </div>
               <div className="mt-8 pt-8 border-t border-white/5">
                  <YoutubeVideoLink keyword={displayData.totalRevenue > 60000000 ? "한의원 고부가가치 시술 마케팅" : "동의보감 차트 분석법"} />
               </div>
            </div>

            {/* Payment Methods Breakdown */}
            <div className="bg-[#1A140F] border border-white/5 rounded-[2.5rem] p-8">
               <h3 className="text-lg font-bold text-white mb-6">수납 수단별 비중</h3>
               <div className="space-y-6">
                 <div>
                   <div className="flex justify-between text-xs font-bold mb-2">
                     <span className="text-amber-100/40">카드 수납</span>
                     <span className="text-white">{formatNumber(displayData.cardTotal)}원</span>
                   </div>
                   <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                     <div 
                        className="h-full bg-amber-500" 
                        style={{ width: `${(displayData.cardTotal / (displayData.totalReceived || 1)) * 100}%` }}
                     />
                   </div>
                 </div>
                 <div>
                   <div className="flex justify-between text-xs font-bold mb-2">
                     <span className="text-amber-100/40">현금 및 영수증</span>
                     <span className="text-white">{formatNumber(displayData.cashTotal)}원</span>
                   </div>
                   <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                     <div 
                        className="h-full bg-emerald-500" 
                        style={{ width: `${(displayData.cashTotal / (displayData.totalReceived || 1)) * 100}%` }}
                     />
                   </div>
                 </div>
               </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-12 border-t border-white/5 opacity-40">
           <p className="text-[10px] font-black uppercase tracking-widest">Medical Management Virtual Center • v3.8 High-Performance EMR Integration</p>
        </div>

        </main>
      </div>
    </DashboardLayout>
  );
}
