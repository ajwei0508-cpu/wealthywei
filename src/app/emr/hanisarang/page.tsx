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

export default function HanisarangPage() {
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
  const router = useRouter();

  // State for Period Comparison
  const [viewMode, setViewMode] = useState<"single" | "period">("single");
  const [startMonth, setStartMonth] = useState<string>("");
  const [endMonth, setEndMonth] = useState<string>("");

  const availableMonths = React.useMemo(() => {
    return Object.keys(monthlyData).sort();
  }, [monthlyData]);

  const filteredMonthsForPeriod = React.useMemo(() => {
    if (!startMonth || !endMonth) return [];
    return availableMonths.filter(m => m >= startMonth && m <= endMonth);
  }, [availableMonths, startMonth, endMonth]);

  // Current & Previous Data for Comparison
  const currentEntry = monthlyData[selectedMonth] || { hanisarangData: null };
  const prevEntry = monthlyData[compareMonth] || { hanisarangData: null };
  
  const data = currentEntry.hanisarangData || {
    totalPatients: 1250,
    newPatients: 85,
    totalRevenue: 75400000,
    insuranceClaim: 28400000,
    copay: 10200000,
    nonCovered: 36800000,
    receivables: 1850000,
    discountTotal: 650000,
    roundOffTotal: 15400,
    totalReceived: 45200000,
    totalRefund: 350000,
    cashPayment: 12500000,
    cardPayment: 32700000,
    transferPayment: 0,
    generalCopay: 4500000,
  };

  const pData = prevEntry.hanisarangData || {
    totalPatients: 0, totalRevenue: 0, insuranceClaim: 0, copay: 0, nonCovered: 0,
  };

  const isMock = !currentEntry.hanisarangData;

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
      if (data.totalRevenue > 0) {
        setLoadingInsight(true);
        try {
          const res = await generateClinicInsight(currentEntry);
          setInsight(res);
        } catch (e) {
          setInsight("현재 데이터를 기반으로 원장님의 병원을 위한 경영 진단을 준비 중입니다.");
        } finally {
          setLoadingInsight(false);
        }
      }
    }
    getInsight();
  }, [data.totalRevenue, currentEntry]);

  const formatMonth = (m: string) => {
    if (!m) return "선택 안됨";
    const [year, month] = m.split("-");
    return `${year.slice(2)}년 ${month}월`;
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#050A15] text-white font-sans selection:bg-emerald-500/30">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
        {/* Page Header */}
        <div className="mb-12">
          <button 
            onClick={() => router.push("/")} 
            className="text-slate-500 hover:text-emerald-400 flex items-center gap-2 text-sm mb-6 transition-all group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> EMR 선택으로 돌아가기
          </button>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold tracking-wider uppercase">
                  EMR Intelligence
                </span>
                <div className="h-1 w-1 rounded-full bg-slate-700" />
                <span className="text-slate-400 text-xs font-medium uppercase tracking-widest flex items-center gap-1">
                  <ShieldCheck size={12} className="text-emerald-500" /> Powered by HanuiSarang
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight mb-2">
                한의사랑 <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-200 to-emerald-500 animate-gradient">경영 실적 분석</span>
              </h1>
              <p className="text-slate-400 text-lg max-w-2xl font-light">
                한의사랑의 통계 데이터를 기반으로 내원 패턴과 매출 구조를 입체적으로 분석합니다.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => setViewMode("single")}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${viewMode === "single" ? "bg-emerald-500 text-[#050A15] shadow-lg shadow-emerald-500/20" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}
              >
                단일 월 비교
              </button>
              <button 
                onClick={() => setViewMode("period")}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${viewMode === "period" ? "bg-emerald-500 text-[#050A15] shadow-lg shadow-emerald-500/20" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}
              >
                기간 범위 분석
              </button>
            </div>
          </div>
        </div>

        {/* Control Bar (A vs B Selectors & Upload) */}
        <div className="mb-10 p-4 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {viewMode === "single" ? (
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-500 ml-1 uppercase tracking-widest">기준 A</span>
                  <select 
                    value={compareMonth} 
                    onChange={(e) => setCompareMonth(e.target.value)}
                    className="bg-[#111624] border-none rounded-xl text-xs font-bold px-4 py-2.5 text-white cursor-pointer focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">비교 대상 선택</option>
                    {availableMonths.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}
                  </select>
                </div>
                <div className="mt-4 flex items-center justify-center p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                  <ArrowRight size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-emerald-500 ml-1 uppercase tracking-widest">대상 B</span>
                  <select 
                    value={selectedMonth} 
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-emerald-500 text-[#050A15] border-none rounded-xl text-xs font-bold px-4 py-2.5 cursor-pointer focus:ring-2 focus:ring-emerald-400"
                  >
                    {availableMonths.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-500 ml-1 uppercase tracking-widest">시작 월</span>
                  <select value={startMonth} onChange={(e) => setStartMonth(e.target.value)} className="bg-[#111624] border-none rounded-xl text-xs font-bold px-4 py-2.5 text-white">
                    <option value="">시작월 선택</option>
                    {availableMonths.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}
                  </select>
                </div>
                <span className="text-slate-700 mt-4 font-black">~</span>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-500 ml-1 uppercase tracking-widest">종료 월</span>
                  <select value={endMonth} onChange={(e) => setEndMonth(e.target.value)} className="bg-[#111624] border-none rounded-xl text-xs font-bold px-4 py-2.5 text-white">
                    <option value="">종료월 선택</option>
                    {availableMonths.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls, .csv, text/csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" multiple className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-2xl text-xs font-black transition-all border border-white/5 active:scale-95"
            >
              <Upload size={16} /> 신규 데이터 업로드
            </button>
            <button
              onClick={() => { if(confirm("현재 보고 계신 월의 데이터를 초기화할까요?")) deleteMonthlyData(selectedMonth); }}
              className="group p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-500 transition-all hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400"
              title="데이터 초기화"
            >
              <Trash2 size={18} className="group-hover:rotate-12 transition-transform" />
            </button>
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

        {/* Premium 5 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
          {/* Card 1: Total Revenue */}
          <div className="bg-[#111624] rounded-[2rem] p-6 shadow-xl border-t-4 border-emerald-500 group hover:scale-[1.02] transition-all border-x border-b border-white/5">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500 group-hover:bg-emerald-500 group-hover:text-[#050A15] transition-all">
                <DollarSign size={20} />
              </div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-full">{selectedMonth}</span>
            </div>
            <p className="text-slate-400 text-[11px] font-bold mb-1 uppercase tracking-tight">총 진료비 매출액</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-white tracking-tighter">{formatNumber(data.totalRevenue)}</span>
              <span className="text-xs font-bold text-slate-500">원</span>
            </div>
            {compareMonth && (
              <p className={`text-[10px] font-bold mt-2 flex items-center gap-1 ${data.totalRevenue >= pData.totalRevenue ? "text-emerald-400" : "text-rose-400"}`}>
                {data.totalRevenue >= pData.totalRevenue ? "▲" : "▼"} {formatNumber(Math.abs(data.totalRevenue - pData.totalRevenue))}
                <span className="text-slate-500 ml-1 font-medium">vs {formatMonth(compareMonth)}</span>
              </p>
            )}
          </div>

          <div className="bg-[#111624] rounded-[2rem] p-6 shadow-xl border-t-4 border-blue-500 group hover:scale-[1.02] transition-all border-x border-b border-white/5">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all">
                <ShieldCheck size={20} />
              </div>
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-full">NHIS</span>
            </div>
            <p className="text-slate-400 text-[11px] font-bold mb-1 uppercase tracking-tight">보험 수익 (본인+청구)</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-white tracking-tighter">{formatNumber(data.insuranceClaim + data.copay)}</span>
              <span className="text-xs font-bold text-slate-500">원</span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium mt-2">
              본부금 {formatNumber(data.copay)} + 청구액 {formatNumber(data.insuranceClaim)}
            </p>
          </div>

          <div className="bg-[#111624] rounded-[2rem] p-6 shadow-xl border-t-4 border-indigo-400 group hover:scale-[1.02] transition-all border-x border-b border-white/5">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-indigo-400/10 rounded-xl text-indigo-400 group-hover:bg-indigo-400 group-hover:text-white transition-all">
                <Users size={20} />
              </div>
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-full">GENERAL</span>
            </div>
            <p className="text-slate-400 text-[11px] font-bold mb-1 uppercase tracking-tight">일반 본인부담금</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-white tracking-tighter">{formatNumber(data.generalCopay)}</span>
              <span className="text-xs font-bold text-slate-500">원</span>
            </div>
          </div>

          <div className="bg-[#111624] rounded-[2rem] p-6 shadow-xl border-t-4 border-amber-500 group hover:scale-[1.02] transition-all border-x border-b border-white/5">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-all">
                <Plus size={20} />
              </div>
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-full">NON-COVERED</span>
            </div>
            <p className="text-slate-400 text-[11px] font-bold mb-1 uppercase tracking-tight">비급여 진료 수익</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-white tracking-tighter">{formatNumber(data.nonCovered)}</span>
              <span className="text-xs font-bold text-slate-500">원</span>
            </div>
            {compareMonth && (
              <p className={`text-[10px] font-bold mt-2 flex items-center gap-1 ${data.nonCovered >= pData.nonCovered ? "text-emerald-400" : "text-rose-400"}`}>
                {data.nonCovered >= pData.nonCovered ? "▲" : "▼"} {formatNumber(Math.abs(data.nonCovered - pData.nonCovered))}
              </p>
            )}
          </div>

          <div className="bg-[#111624] rounded-[2rem] p-6 shadow-xl border-t-4 border-rose-500 group hover:scale-[1.02] transition-all border-x border-b border-white/5">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-rose-500/10 rounded-xl text-rose-500 group-hover:bg-rose-500 group-hover:text-white transition-all">
                <ArrowUpRight size={20} />
              </div>
              <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-full">EFFICIENCY</span>
            </div>
            <p className="text-slate-400 text-[11px] font-bold mb-1 uppercase tracking-tight">당월 수납 효율</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-white tracking-tighter">
                {((data.totalReceived / (data.totalRevenue || 1)) * 100).toFixed(1)}
              </span>
              <span className="text-xs font-bold text-slate-500">%</span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium mt-2">
              매출 대비 실수납 비중
            </p>
          </div>
        </div>

        {/* Patient Metrics Summary Bar */}
        <div className="mb-12">
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-4 border border-white/10">
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-0.5">총 내원 환자</p>
                <p className="text-2xl font-black text-emerald-400 leading-none">{formatNumber(data.totalPatients)}<span className="text-xs font-bold ml-1 text-slate-500">명</span></p>
              </div>
            </div>
            <div className="w-px h-10 bg-white/10 hidden md:block"></div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-0.5">신규 환자 수</p>
                <p className="text-2xl font-black text-blue-400 leading-none">{formatNumber(data.newPatients)}<span className="text-xs font-bold ml-1 text-slate-500">명</span></p>
              </div>
            </div>
            <div className="w-px h-10 bg-white/10 hidden md:block"></div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-0.5">매출 환자당</p>
                <p className="text-2xl font-black text-rose-400 leading-none">{formatNumber(Math.round(data.totalRevenue / (data.totalPatients || 1)))}<span className="text-xs font-bold ml-1 text-slate-500">원</span></p>
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
                <div className="h-10 w-10 rounded-xl bg-emerald-400/20 flex items-center justify-center text-emerald-400">
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
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-200"
                    style={{ width: `${Math.min(100, (data.totalReceived / (data.totalRevenue || 1)) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-[10px] text-slate-500">매출액 대비 수납율</span>
                  <span className="text-[10px] text-emerald-400 font-bold">{((data.totalReceived / (data.totalRevenue || 1)) * 100).toFixed(1)}%</span>
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

              <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-start gap-3">
                <Lightbulb size={20} className="text-emerald-500 shrink-0 mt-1" />
                <p className="text-xs text-slate-400 leading-relaxed">
                  한의사랑 데이터 기준 <span className="text-emerald-400 font-bold">{formatNumber(data.receivables + data.discountTotal)}원</span>의 미회수 금액건이 확인되었습니다. 미수 증감 추이를 점검해 보시기 바랍니다.
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
              {/* Circular Visual Placeholder */}
              <div className="absolute inset-x-0 bottom-0 text-center text-slate-700 text-[120px] font-black -z-10 select-none opacity-10 leading-none">
                HS
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
                      className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.5)]" 
                      style={{ width: `${(data.cashPayment / (data.totalReceived || 1)) * 100}%` }}
                    />
                  </div>
                  <div className="w-16 text-sm font-bold text-white shrink-0">{((data.cashPayment / (data.totalReceived || 1)) * 100).toFixed(0)}%</div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-24 text-right text-xs font-bold text-slate-500 uppercase tracking-tighter shrink-0">Transfer</div>
                  <div className="h-3 grow bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-slate-600 rounded-full" 
                      style={{ width: `${(data.transferPayment / (data.totalReceived || 1)) * 100 || 2}%` }}
                    />
                  </div>
                  <div className="w-16 text-sm font-bold text-white shrink-0">{((data.transferPayment / (data.totalReceived || 1)) * 100).toFixed(0)}%</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
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
          <div className="lg:col-span-2 relative group overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#061430] to-[#050A15] border border-emerald-500/20 shadow-2xl">
            <div className="absolute top-0 right-0 p-12 opacity-[0.05] group-hover:scale-110 transition-transform duration-1000">
              <Lightbulb size={240} />
            </div>
            
            <div className="relative z-10 p-8 h-full flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-[#050A15] shadow-lg shadow-emerald-500/20">
                    <TrendingUp size={28} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">AI 경영 분석 인사이트</h2>
                    <p className="text-emerald-500/80 text-xs font-bold uppercase tracking-widest">Powered by Gemini Pro</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-tighter">Live Analysis</span>
                </div>
              </div>

              <div className="flex-grow bg-black/40 backdrop-blur-sm border border-white/5 rounded-3xl p-8 min-h-[300px]">
                {loadingInsight ? (
                  <div className="h-full flex flex-col items-center justify-center gap-4 py-12">
                    <div className="w-12 h-12 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                    <p className="text-emerald-500 text-sm font-medium animate-pulse">HanuiSarang data analyzing...</p>
                  </div>
                ) : (
                  <div className="prose prose-invert prose-emerald max-w-none">
                    <p className="text-slate-300 leading-relaxed text-lg font-light whitespace-pre-wrap">
                      {insight || "한의사랑 데이터를 업로드하시면 실시간 AI 경영 분석 리포트가 생성됩니다."}
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
                  <YoutubeVideoLink keyword={data.totalRevenue > 50000000 ? "한의원 고수익 경영" : "한의원 매출 올리기"} />
                  <YoutubeVideoLink keyword="한의사랑 활용팁" />
                  <YoutubeVideoLink keyword="한의원 세무와 매출 관리" />
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
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-900/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-900/10 rounded-full blur-[120px]" />
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
