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
  Calendar
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useData } from "@/context/DataContext";
import DashboardLayout from "@/components/DashboardLayout";
import { parseExcelFile } from "@/lib/excelParser";
import toast from "react-hot-toast";
import { generateClinicInsightStream } from "@/lib/aiService";
import { YoutubeVideoLink } from "@/components/YoutubeVideoLink";

const formatNumber = (num: number) => {
  return new Intl.NumberFormat("ko-KR").format(num || 0);
};

const mockHanchartData = [
  { rank: 1, type: "초진(64)", nonTaxable: 4460100, taxable: 1360000, coveredCopay: 707690, coveredClaim: 1862610, autoClaim: 1388750, totalCopay: 6527790, supportFund: 6000, totalRevenue: 9779150, ratio: 14.2 },
  { rank: 2, type: "재진(937)", nonTaxable: 19670600, taxable: 1788000, coveredCopay: 7931130, coveredClaim: 21176800, autoClaim: 8792730, totalCopay: 29014730, supportFund: 5500, totalRevenue: 58984260, ratio: 85.8 },
];

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
    return Object.keys(monthlyData).sort();
  }, [monthlyData]);

  const currentEntry = monthlyData[selectedMonth] || null;
  const isSampleData = !currentEntry || !currentEntry.hanchartData || currentEntry.hanchartData.length === 0;
  const displayData = isSampleData ? mockHanchartData : currentEntry.hanchartData;

  const prevMonthIndex = availableMonths.indexOf(selectedMonth) - 1;
  const prevMonthKey = prevMonthIndex >= 0 ? availableMonths[prevMonthIndex] : "";
  const prevEntry = monthlyData[compareMonth || prevMonthKey] || { hanchartData: [] };
  const prevDisplayData = (!prevEntry.hanchartData || prevEntry.hanchartData.length === 0) ? [] : prevEntry.hanchartData;

  // Calculation Logic
  const getSummary = (dataArr: any[]) => {
    return dataArr.reduce((acc, curr) => {
      const patientCount = parseInt(curr.type.match(/\(\s*(\d+)\s*\)/)?.[1] || "0");
      const isNewPatient = curr.type.startsWith("초진");
      
      return {
        total: acc.total + curr.totalRevenue,
        nhis: acc.nhis + (curr.coveredCopay + curr.coveredClaim),
        nonCovered: acc.nonCovered + (curr.nonTaxable + curr.taxable),
        auto: acc.auto + curr.autoClaim,
        breakdown: {
          copay: acc.breakdown.copay + curr.coveredCopay,
          claim: acc.breakdown.claim + curr.coveredClaim,
          nonTax: acc.breakdown.nonTax + curr.nonTaxable,
          tax: acc.breakdown.tax + curr.taxable,
        },
        count: {
          total: acc.count.total + patientCount,
          new: acc.count.new + (isNewPatient ? patientCount : 0),
        }
      };
    }, { 
      total: 0, nhis: 0, nonCovered: 0, auto: 0, 
      breakdown: { copay: 0, claim: 0, nonTax: 0, tax: 0 },
      count: { total: 0, new: 0 } 
    });
  };

  const summary = useMemo(() => getSummary(displayData), [displayData]);
  const pSummary = useMemo(() => getSummary(prevDisplayData), [prevDisplayData]);

  const revenuePerPatient = summary.count.total > 0 ? summary.total / summary.count.total : 0;
  const pRevenuePerPatient = pSummary.count.total > 0 ? pSummary.total / pSummary.count.total : 0;
  const nonCoveredRatio = summary.total > 0 ? (summary.nonCovered / summary.total) * 100 : 0;

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
      <div className="min-h-screen bg-[#0A192F] text-white font-sans">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
          
          {/* Header */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-8">
              <button onClick={() => router.push("/")} className="text-zinc-400 hover:text-[#D4AF37] flex items-center gap-2 text-sm transition-all group">
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> EMR 선택
              </button>
              <div className="flex items-center gap-3">
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls, .csv" multiple className="hidden" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 bg-[#D4AF37] hover:bg-[#B8962F] text-[#0A192F] px-6 py-3 rounded-2xl text-xs font-black transition-all shadow-lg active:scale-95 group"
                >
                  <Upload size={18} /> 신규 데이터 업로드
                </button>
                <button
                  onClick={() => { if(confirm("초기화할까요?")) deleteMonthlyData(selectedMonth); }}
                  className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-zinc-500 hover:text-rose-400"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-3 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] text-xs font-bold uppercase">Hanchart Premium</span>
                  <span className="text-zinc-500 text-xs uppercase tracking-widest flex items-center gap-1">
                    <ShieldCheck size={12} className="text-emerald-500" /> Clinic Intelligence
                  </span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight leading-tight">
                  한차트 <span className="text-zinc-400">경영 리포트</span>
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
                    className={`px-5 py-2 rounded-xl text-xs font-bold transition-all border shrink-0 ${displayYear === year ? "bg-white/10 border-[#D4AF37]/50 text-[#D4AF37]" : "bg-white/5 border-white/5 text-zinc-500"}`}
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
                    className={`flex-1 min-w-[70px] py-3 rounded-xl border transition-all flex flex-col items-center ${selectedMonth === m ? "bg-[#D4AF37] text-[#0A192F] shadow-lg" : "bg-white/5 border-white/10 text-zinc-500"}`}
                  >
                    <span className="text-[8px] font-black uppercase opacity-60">{m.split("-")[0].slice(2)}년</span>
                    <span className="text-sm font-black">{m.split("-")[1]}월</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Hero Card */}
            <div className="relative group overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#12243D] to-[#0A192F] border border-[#D4AF37]/30 shadow-2xl p-10 mb-8">
              <div className="absolute top-0 right-0 p-12 opacity-[0.03]"><DollarSign size={300} /></div>
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                <div>
                  <p className="text-[#D4AF37] text-xs font-black uppercase tracking-widest mb-3">Target Month Performance</p>
                  <h2 className="text-white text-xl font-medium mb-1"><span className="text-[#D4AF37] font-black">{formatMonth(selectedMonth)}</span> 총 매출 현황</h2>
                </div>
                <div className="text-center md:text-right">
                  <div className="inline-flex items-baseline gap-2 bg-black/40 px-8 py-6 rounded-3xl border border-white/10">
                    <RollingNumber value={summary.total} />
                    <span className="text-2xl font-black text-zinc-500">원</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Comparison Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-white/5 rounded-[2rem] p-6 border border-white/5 shadow-xl">
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-[#D4AF37]/10 rounded-2xl text-[#D4AF37]"><TrendingUp size={22} /></div>
                  <p className={`text-sm font-black ${summary.total >= pSummary.total ? "text-emerald-400" : "text-rose-400"}`}>
                    {pSummary.total > 0 ? ((summary.total - pSummary.total) / pSummary.total * 100).toFixed(1) : 0}%
                  </p>
                </div>
                <h3 className="text-zinc-400 text-xs font-bold mb-2 uppercase tracking-tighter">전월 대비 성장률</h3>
                <div className="flex justify-between items-end">
                  <span className="text-[10px] text-zinc-600 font-bold uppercase">{formatMonth(compareMonth)}</span>
                  <span className="text-sm font-bold text-zinc-400">{formatNumber(pSummary.total)}</span>
                </div>
              </div>

              <div className="bg-white/5 rounded-[2rem] p-6 border border-white/5 shadow-xl">
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500"><Users size={22} /></div>
                  <p className={`text-sm font-black ${revenuePerPatient >= pRevenuePerPatient ? "text-emerald-400" : "text-rose-400"}`}>
                    {pRevenuePerPatient > 0 ? ((revenuePerPatient - pRevenuePerPatient) / pRevenuePerPatient * 100).toFixed(1) : 0}%
                  </p>
                </div>
                <h3 className="text-zinc-400 text-xs font-bold mb-2 uppercase tracking-tighter">평균 객단가 (Efficiency)</h3>
                <div className="flex items-baseline gap-2"><span className="text-3xl font-black text-white">{formatNumber(Math.round(revenuePerPatient))}</span><span className="text-xs text-zinc-500">원/명</span></div>
              </div>

              <div className="bg-white/5 rounded-[2rem] p-6 border border-white/5 shadow-xl">
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500"><Zap size={22} /></div>
                  <p className="text-sm font-black text-emerald-400">{nonCoveredRatio.toFixed(1)}%</p>
                </div>
                <h3 className="text-zinc-400 text-xs font-bold mb-2 uppercase tracking-tighter">비급여 매출 비중</h3>
                <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden mt-4">
                  <div className="h-full bg-[#D4AF37]" style={{ width: `${nonCoveredRatio}%` }} />
                </div>
              </div>
            </div>

            {/* Premium Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              <div className="bg-white/5 rounded-[2rem] p-6 shadow-xl border border-white/5">
                <ShieldCheck className="text-blue-500 mb-4" size={24} />
                <p className="text-zinc-500 text-[11px] font-bold uppercase mb-1">보험 수익 (급여)</p>
                <p className="text-2xl font-black text-white">{formatNumber(summary.nhis)}원</p>
              </div>
              <div className="bg-white/5 rounded-[2rem] p-6 shadow-xl border border-white/5">
                <Zap className="text-amber-500 mb-4" size={24} />
                <p className="text-zinc-500 text-[11px] font-bold uppercase mb-1">비급여 수익</p>
                <p className="text-2xl font-black text-white">{formatNumber(summary.nonCovered)}원</p>
              </div>
              <div className="bg-white/5 rounded-[2rem] p-6 shadow-xl border border-white/5">
                <Activity className="text-rose-500 mb-4" size={24} />
                <p className="text-zinc-500 text-[11px] font-bold uppercase mb-1">자보 진료 수익</p>
                <p className="text-2xl font-black text-white">{formatNumber(summary.auto)}원</p>
              </div>
              <div className="bg-white/5 rounded-[2rem] p-6 shadow-xl border border-white/5">
                <Users className="text-zinc-400 mb-4" size={24} />
                <p className="text-zinc-500 text-[11px] font-bold uppercase mb-1">총 내원 환자수</p>
                <p className="text-2xl font-black text-white">{formatNumber(summary.count.total)}명</p>
              </div>
            </div>

            {/* Breakdown Table & AI Insight */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="bg-white/5 rounded-[2rem] border border-white/5 p-8 overflow-hidden shadow-2xl">
                  <h2 className="text-xl font-bold mb-8 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]"><FileText size={20} /></div>
                    매출 세부 분석표
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-zinc-500 uppercase tracking-widest text-[10px] font-black">
                          <th className="px-4 py-4">구분 항목</th>
                          <th className="px-4 py-4 text-right">비급여</th>
                          <th className="px-4 py-4 text-right">보험본인부담</th>
                          <th className="px-4 py-4 text-right">보험청구액</th>
                          <th className="px-4 py-4 text-right">자보청구</th>
                          <th className="px-4 py-4 text-right text-[#D4AF37]">총 매출액</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {displayData.map((row, idx) => (
                          <tr key={idx} className="hover:bg-white/5 transition-colors group">
                            <td className="px-4 py-5 font-black text-zinc-100">{row.type}</td>
                            <td className="px-4 py-5 text-right text-zinc-400">{formatNumber(row.nonTaxable + row.taxable)}</td>
                            <td className="px-4 py-5 text-right text-zinc-400">{formatNumber(row.coveredCopay)}</td>
                            <td className="px-4 py-5 text-right text-zinc-400">{formatNumber(row.coveredClaim)}</td>
                            <td className="px-4 py-5 text-right text-zinc-400">{formatNumber(row.autoClaim)}</td>
                            <td className="px-4 py-5 text-right font-black text-white">{formatNumber(row.totalRevenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div>
                <div className="bg-gradient-to-br from-[#12243D] to-[#0A192F] border border-[#D4AF37]/20 rounded-[2rem] p-8 shadow-2xl h-full flex flex-col">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="h-12 w-12 rounded-2xl bg-[#D4AF37] flex items-center justify-center text-[#0A192F]"><BrainCircuit size={24} /></div>
                    <h3 className="text-xl font-bold">한차트 AI 진단</h3>
                  </div>
                  <div className="flex-grow bg-black/40 rounded-2xl p-6 mb-6">
                    {loadingInsight ? (
                      <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin" /></div>
                    ) : (
                      <div className="prose prose-invert prose-amber max-w-none"><p className="text-zinc-300 leading-relaxed text-sm whitespace-pre-wrap">{insight || "한차트 데이터를 분석하여 경영 전략을 제안합니다."}</p></div>
                    )}
                  </div>
                  <YoutubeVideoLink keyword={summary.nonCovered / summary.total < 0.3 ? "병원 비급여 매출 올리는 법" : "한의원 마케팅 신환 유입"} />
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
    <span className="text-5xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-white to-[#D4AF37] animate-gradient">
      {new Intl.NumberFormat("ko-KR").format(displayValue)}
    </span>
  );
}
