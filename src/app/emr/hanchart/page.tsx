"use client";

import React, { useRef, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Card from "@/components/Card";
import DashboardLayout from "@/components/DashboardLayout";
import { 
  FileSpreadsheet,
  Calendar,
  Trash2,
  ChevronDown,
  ArrowRight,
  TrendingUp,
  ArrowLeft,
  ShieldCheck,
  Zap,
  DollarSign,
  Activity
} from "lucide-react";
import { parseExcelFile } from "@/lib/excelParser";
import { useData } from "@/context/DataContext";
import toast from "react-hot-toast";
import { YoutubeVideoLink } from "@/components/YoutubeVideoLink";

const mockHanchartData = [
  { rank: 1, type: "초진(64)", nonTaxable: 4460100, taxable: 1360000, coveredCopay: 707690, coveredClaim: 1862610, autoClaim: 1388750, totalCopay: 6527790, supportFund: 6000, totalRevenue: 9779150, ratio: 14.2 },
  { rank: 2, type: "재진(937)", nonTaxable: 19670600, taxable: 1788000, coveredCopay: 7931130, coveredClaim: 21176800, autoClaim: 8792730, totalCopay: 29014730, supportFund: 5500, totalRevenue: 58984260, ratio: 85.8 },
];

export default function HanchartPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
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

  // State for Period Comparison
  const [viewMode, setViewMode] = useState<"single" | "period">("single");
  const [startMonth, setStartMonth] = useState<string>("");
  const [endMonth, setEndMonth] = useState<string>("");

  const availableMonths = useMemo(() => {
    return Object.keys(monthlyData).sort();
  }, [monthlyData]);

  const filteredMonthsForPeriod = useMemo(() => {
    if (!startMonth || !endMonth) return [];
    return availableMonths.filter(m => m >= startMonth && m <= endMonth);
  }, [availableMonths, startMonth, endMonth]);

  const currentData = monthlyData[selectedMonth] || null;
  const isSampleData = !currentData || !currentData.hanchartData || currentData.hanchartData.length === 0;
  const displayData = isSampleData ? mockHanchartData : currentData.hanchartData;

  // 4 Summary Cards Calculation
  const summary = useMemo(() => {
    return displayData!.reduce((acc, curr) => {
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
  }, [displayData]);

  const formatNumber = (num: number) => new Intl.NumberFormat("ko-KR").format(num);

  const formatMonth = (m: string) => {
    if (!m) return "선택 안됨";
    const [year, month] = m.split("-");
    return `${year.slice(2)}년 ${month}월`;
  };

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

  if (status === "loading") return <div className="min-h-screen bg-[#0a192f] flex items-center justify-center text-white">Loading...</div>;

  return (
    <DashboardLayout>
      <main className="min-h-screen bg-[#f8fafc] pb-24">
        {/* Navy Header Section */}
        <div className="bg-[#0a192f] text-white p-8 md:p-12 space-y-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4AF37]/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                <div className="space-y-4">
                    <button onClick={() => router.push("/")} className="text-zinc-400 hover:text-[#D4AF37] flex items-center gap-2 text-sm transition-all group">
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> EMR 선택으로 돌아가기
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#D4AF37]/20 rounded-lg text-[#D4AF37]">
                            <TrendingUp size={24} />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase italic">
                            Hanchart <span className="text-[#D4AF37]">Premium</span> Clinic Dashboard
                        </h1>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button 
                        onClick={() => setViewMode("single")}
                        className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all ${viewMode === "single" ? "bg-[#D4AF37] text-white shadow-lg shadow-[#D4AF37]/20" : "bg-white/10 text-zinc-400 hover:bg-white/20"}`}
                    >
                        단일 월 비교
                    </button>
                    <button 
                        onClick={() => setViewMode("period")}
                        className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all ${viewMode === "period" ? "bg-[#D4AF37] text-white shadow-lg shadow-[#D4AF37]/20" : "bg-white/10 text-zinc-400 hover:bg-white/20"}`}
                    >
                        기간 범위 분석
                    </button>
                </div>
            </div>

            {/* Premium 4 Cards */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
                <div className="bg-white rounded-3xl p-6 shadow-xl border-t-4 border-[#D4AF37] group hover:scale-[1.02] transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-zinc-100 rounded-xl text-zinc-500 group-hover:bg-[#0a192f] group-hover:text-[#D4AF37] transition-all">
                            <DollarSign size={20} />
                        </div>
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest bg-zinc-50 px-2 py-0.5 rounded-full">{selectedMonth}</span>
                    </div>
                    <p className="text-zinc-500 text-[11px] font-bold mb-1 uppercase">총 매출 현황</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-[#0a192f] tracking-tighter">{formatNumber(summary.total)}</span>
                        <span className="text-xs font-bold text-zinc-400">원</span>
                    </div>
                </div>

                <div className="bg-white rounded-3xl p-6 shadow-xl border-t-4 border-blue-500 group hover:scale-[1.02] transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-blue-50 rounded-xl text-blue-500 group-hover:bg-[#0a192f] group-hover:text-blue-400 transition-all">
                            <ShieldCheck size={20} />
                        </div>
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-full">NHIS</span>
                    </div>
                    <p className="text-zinc-500 text-[11px] font-bold mb-1 uppercase">보험 진료 수익 (급여)</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-[#0a192f] tracking-tighter">{formatNumber(summary.nhis)}</span>
                        <span className="text-xs font-bold text-zinc-400">원</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 font-medium mt-2">
                        본부금 {formatNumber(summary.breakdown.copay)} + 청구액 {formatNumber(summary.breakdown.claim)}
                    </p>
                </div>

                <div className="bg-white rounded-3xl p-6 shadow-xl border-t-4 border-amber-500 group hover:scale-[1.02] transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-amber-50 rounded-xl text-amber-500 group-hover:bg-[#0a192f] group-hover:text-amber-400 transition-all">
                            <Zap size={20} />
                        </div>
                        <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest bg-amber-50 px-2 py-0.5 rounded-full">NON-COVERED</span>
                    </div>
                    <p className="text-zinc-500 text-[11px] font-bold mb-1 uppercase">비급여 진료 수익</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-[#0a192f] tracking-tighter">{formatNumber(summary.nonCovered)}</span>
                        <span className="text-xs font-bold text-zinc-400">원</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 font-medium mt-2">
                        비과세 {formatNumber(summary.breakdown.nonTax)} + 과세 {formatNumber(summary.breakdown.tax)}
                    </p>
                </div>

                <div className="bg-white rounded-3xl p-6 shadow-xl border-t-4 border-rose-500 group hover:scale-[1.02] transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-rose-50 rounded-xl text-rose-500 group-hover:bg-[#0a192f] group-hover:text-rose-400 transition-all">
                            <Activity size={20} />
                        </div>
                        <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest bg-rose-50 px-2 py-0.5 rounded-full">AUTO-CLAIM</span>
                    </div>
                    <p className="text-zinc-500 text-[11px] font-bold mb-1 uppercase">자보 진료 수익</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-[#0a192f] tracking-tighter">{formatNumber(summary.auto)}</span>
                        <span className="text-xs font-bold text-zinc-400">원</span>
                    </div>
                </div>
            </div>

            {/* Patient Metrics Summary Bar */}
            <div className="max-w-7xl mx-auto pt-6">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 flex items-center justify-center gap-12 border border-white/5">
                <div className="flex items-center gap-3">
                  <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider text-right">총 내원 환자</span>
                  <span className="text-2xl font-black text-[#D4AF37]">{formatNumber(summary.count.total)}<span className="text-sm font-bold ml-1 text-white/60">명</span></span>
                </div>
                <div className="w-px h-8 bg-white/10"></div>
                <div className="flex items-center gap-3">
                  <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider text-right">신규(초진) 환자</span>
                  <span className="text-2xl font-black text-blue-400">{formatNumber(summary.count.new)}<span className="text-sm font-bold ml-1 text-white/60">명</span></span>
                </div>
                <div className="w-px h-8 bg-white/10"></div>
                <div className="flex items-center gap-3">
                  <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider text-right">기존(재진) 환자</span>
                  <span className="text-2xl font-black text-emerald-400">{formatNumber(summary.count.total - summary.count.new)}<span className="text-sm font-bold ml-1 text-white/60">명</span></span>
                </div>
              </div>
            </div>
        </div>

        {/* Content Section */}
        <div className="max-w-7xl mx-auto p-6 md:p-12 -mt-8 relative z-20">
            {/* Control Bar */}
            <Card className="bg-white/80 backdrop-blur-md p-4 rounded-3xl shadow-sm border border-zinc-200 mb-8 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    {viewMode === "single" ? (
                      <div className="flex items-center gap-3">
                          <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-zinc-400 ml-1">기준 A</span>
                              <select 
                                  value={compareMonth} 
                                  onChange={(e) => setCompareMonth(e.target.value)}
                                  className="bg-zinc-100 border-none rounded-xl text-sm font-bold px-3 py-2 cursor-pointer focus:ring-2 focus:ring-[#D4AF37]"
                              >
                                  <option value="">비교 대상 선택</option>
                                  {availableMonths.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}
                              </select>
                          </div>
                          <ArrowRight size={16} className="text-zinc-300 mt-4" />
                          <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-[#D4AF37] ml-1">대상 B</span>
                              <select 
                                  value={selectedMonth} 
                                  onChange={(e) => setSelectedMonth(e.target.value)}
                                  className="bg-[#D4AF37]/10 text-[#0a192f] border-none rounded-xl text-sm font-bold px-3 py-2 cursor-pointer focus:ring-2 focus:ring-[#D4AF37]"
                              >
                                  {availableMonths.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}
                              </select>
                          </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                          <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-zinc-400 ml-1">시작 월</span>
                              <select value={startMonth} onChange={(e) => setStartMonth(e.target.value)} className="bg-zinc-100 border-none rounded-xl text-sm font-bold px-3 py-2">
                                  <option value="">시작월 선택</option>
                                  {availableMonths.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}
                              </select>
                          </div>
                          <span className="text-zinc-300 mt-4">~</span>
                          <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-zinc-400 ml-1">종료 월</span>
                              <select value={endMonth} onChange={(e) => setEndMonth(e.target.value)} className="bg-zinc-100 border-none rounded-xl text-sm font-bold px-3 py-2">
                                  <option value="">종료월 선택</option>
                                  {availableMonths.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}
                              </select>
                          </div>
                      </div>
                    )}
                </div>

                <div className="flex items-center gap-3 ml-auto">
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls, .csv" multiple className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-[#0a192f] text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-[#D4AF37] transition-all shadow-lg shadow-[#0a192f]/10">
                        <FileSpreadsheet size={16} /> 신규 데이터 업로드
                    </button>
                    <button onClick={() => { if(confirm("정말 초기화할까요?")) deleteMonthlyData(selectedMonth); }} className="p-3 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                        <Trash2 size={20} />
                    </button>
                </div>
            </Card>

            {/* Comparison Table Section */}
            <Card className="bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-zinc-100">
                <div className="p-8 border-b border-zinc-100 bg-zinc-50/50 flex justify-between items-center">
                    <h2 className="text-xl font-black text-[#0a192f]">
                        {viewMode === "single" ? "세부 매출 항목 분석" : "월별 매출 추이 비교 (Side-by-Side)"}
                    </h2>
                    {isSampleData && <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-black rounded-lg uppercase">Demo Mode</span>}
                </div>
                
                <div className="overflow-x-auto p-4 md:p-8">
                  <table className="w-full text-sm text-center border-collapse">
                      <thead>
                          <tr className="border-b-2 border-zinc-200">
                              <th className="px-6 py-4 text-left font-black text-zinc-400 uppercase tracking-widest text-[11px] whitespace-nowrap">분류 항목 / 기간</th>
                              {viewMode === "single" ? (
                                <>
                                  <th className="px-6 py-4 font-black text-[#0a192f] bg-zinc-50/50">{formatMonth(compareMonth)}</th>
                                  <th className="px-6 py-4 font-black text-[#D4AF37] bg-[#D4AF37]/5 underline decoration-2 underline-offset-8">{formatMonth(selectedMonth)}</th>
                                  <th className="px-6 py-4 font-black text-rose-500">증감액 (B-A)</th>
                                </>
                              ) : (
                                filteredMonthsForPeriod.map(m => (
                                  <th key={m} className="px-6 py-4 font-black text-[#0a192f]">{formatMonth(m)}</th>
                                ))
                              )}
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                          {/* We follow the types used in the data */}
                          {["초진", "재진", "전화상담", "기타", "비급여진료"].map((cat) => {
                              const getCatTotal = (month: string) => {
                                  const mData = monthlyData[month];
                                  if (!mData || !mData.hanchartData) return 0;
                                  // Simplified logic for demo / expansion
                                  const row = mData.hanchartData.find(d => d.type.includes(cat));
                                  if (cat === "비급여진료") return (mData.generatedRevenue?.nonCovered || 0);
                                  return row ? row.totalRevenue : 0;
                              };

                              const valA = getCatTotal(compareMonth);
                              const valB = getCatTotal(selectedMonth);

                              return (
                                  <tr key={cat} className="group hover:bg-zinc-50/30 transition-all">
                                      <td className="px-6 py-5 text-left font-bold text-[#0a192f]">
                                        <div className="flex flex-col">
                                          <span>{cat}</span>
                                          {cat !== "비급여진료" && displayData?.find(d => d.type.includes(cat))?.type.match(/\((\d+)\)/) && (
                                            <span className="text-[10px] text-zinc-400 font-medium">
                                              대상 환자: {displayData.find(d => d.type.includes(cat))?.type.match(/\((\d+)\)/)?.[1]}명
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      {viewMode === "single" ? (
                                        <>
                                          <td className="px-6 py-5 text-zinc-400 font-medium">{formatNumber(valA)}</td>
                                          <td className="px-6 py-5 text-[#0a192f] font-black bg-[#D4AF37]/5">{formatNumber(valB)}</td>
                                          <td className={`px-6 py-5 font-bold ${valB - valA >= 0 ? "text-rose-500" : "text-blue-500"}`}>
                                              {valB - valA >= 0 ? "+" : ""}{formatNumber(valB - valA)}
                                          </td>
                                        </>
                                      ) : (
                                        filteredMonthsForPeriod.map(m => (
                                          <td key={m} className="px-6 py-5 font-bold text-zinc-600">{formatNumber(getCatTotal(m))}</td>
                                        ))
                                      )}
                                  </tr>
                              );
                          })}
                      </tbody>
                      <tfoot className="bg-[#0a192f] text-white">
                          <tr className="font-black">
                              <td className="px-6 py-6 text-left text-zinc-400 text-xs">TOTAL REVENUE (총 매출)</td>
                              {viewMode === "single" ? (
                                <>
                                  <td className="px-6 py-6">{formatNumber(monthlyData[compareMonth]?.generatedRevenue?.total || 0)}</td>
                                  <td className="px-6 py-6 text-[#D4AF37] text-lg font-black">{formatNumber(monthlyData[selectedMonth]?.generatedRevenue?.total || 0)}</td>
                                  <td className="px-6 py-6 text-rose-400">
                                    {formatNumber((monthlyData[selectedMonth]?.generatedRevenue?.total || 0) - (monthlyData[compareMonth]?.generatedRevenue?.total || 0))}
                                  </td>
                                </>
                              ) : (
                                filteredMonthsForPeriod.map(m => (
                                  <td key={m} className="px-6 py-6">{formatNumber(monthlyData[m]?.generatedRevenue?.total || 0)}</td>
                                ))
                              )}
                          </tr>
                      </tfoot>
                  </table>
                </div>
            </Card>

            {/* AI Clinical Insights Section (Period Focused) */}
            <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 bg-[#0a192f] p-12 rounded-[3.5rem] relative overflow-hidden border border-white/10 shadow-3xl">
                    <div className="absolute bottom-0 right-0 w-80 h-80 bg-[#D4AF37]/10 rounded-full -mb-32 -mr-32 blur-3xl"></div>
                    <div className="relative z-10 space-y-8">
                        <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 rounded-full text-[#D4AF37] text-[11px] font-black uppercase tracking-widest">
                           AI Clinical & Strategic Insight
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black text-white leading-tight">
                            {summary.nonCovered / summary.total < 0.3 ? (
                              <>비급여 매출 비중이 <span className="text-[#D4AF37]">30% 미만</span>입니다.<br />객단가 향상 전략이 시급합니다.</>
                            ) : summary.count.new / summary.count.total < 0.1 ? (
                              <>신규 환자 유입 비율이 <span className="text-blue-400">낮은 상태</span>입니다.<br />지역 마케팅 강화가 필요합니다.</>
                            ) : (
                              <>전반적인 지표가 <span className="text-emerald-400">이상적</span>입니다.<br />현재의 체계적인 관리를 유지하세요.</>
                            )}
                        </h2>
                        <p className="text-zinc-400 text-lg leading-relaxed max-w-2xl font-medium">
                            {summary.nonCovered / summary.total < 0.3 ? 
                              "현재 건강보험(급여) 의존도가 높습니다. 비급여 항목의 ARPP를 높이기 위해 특화 진료 프로세스를 점검하고, 환자 상담 스크립트를 고도화할 필요가 있습니다." :
                              summary.count.new / summary.count.total < 0.1 ?
                              "재진 환자의 충성도는 높으나, 새로운 성장 동력이 될 신환 유입이 정체되어 있습니다. SNS 광고 및 플레이스 최적화를 통한 유입 경로 다변화를 추천합니다." :
                              "수익 구조와 환자 유입 균형이 매우 좋습니다. 현재 시스템을 매뉴얼화하여 병원 규모를 확장하거나 부원장 채용 등 운영 효율화를 고민해볼 시기입니다."}
                        </p>
                        <div className="flex flex-wrap gap-4 pt-4">
                            <button className="px-8 py-4 bg-[#D4AF37] text-[#0a192f] font-black rounded-2xl hover:scale-105 transition-all shadow-xl shadow-[#D4AF37]/20">
                                정밀 병원 진단 보고서 출력
                            </button>
                        </div>
                    </div>
                </Card>

                {/* Youtube Recommendation Card */}
                <Card className="bg-white p-10 rounded-[3.5rem] border border-zinc-200 shadow-2xl flex flex-col justify-between overflow-hidden relative group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full -mr-16 -mt-16 group-hover:bg-rose-100 transition-colors"></div>
                  <div className="space-y-6 relative z-10">
                    <div className="flex items-center gap-2 text-zinc-400 font-bold text-xs uppercase tracking-widest">
                      <TrendingUp size={18} className="text-[#D4AF37]" /> Recommended Training
                    </div>
                    <h3 className="text-2xl font-black text-[#0a192f] leading-tight">
                      원장님을 위한<br />맞춤 경영 솔루션
                    </h3>
                  </div>
                  
                  <div className="mt-8 space-y-6 relative z-10">
                    <YoutubeVideoLink 
                      keyword={summary.nonCovered / summary.total < 0.3 ? "병원 비급여 매출 올리는 법" : "한의원 마케팅 신환 유입"} 
                      mLabel="솔루션" 
                      isUp={true} 
                      activeSolution={{
                        title: "데이터 기반 경영 최적화",
                        desc: "현재 원장님의 대시보드 지표를 분석하여 가장 필요한 교육 영상을 선별했습니다."
                      }}
                    />
                    <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                      <p className="text-xs text-zinc-500 font-bold leading-relaxed italic">
                        "데이터는 거짓말을 하지 않습니다. 지표에 맞는 정확한 학습이 병원 성장의 열쇠입니다."
                      </p>
                    </div>
                  </div>
                </Card>
            </div>
        </div>
      </main>
    </DashboardLayout>
  );
}
