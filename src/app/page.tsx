"use client";

import React, { useRef, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Card from "@/components/Card";
import KakaoLogin from "@/components/KakaoLogin";
import DashboardLayout from "@/components/DashboardLayout";
import { 
  TrendingUp,
  TrendingDown,
  Users,
  ShieldCheck,
  FileSpreadsheet,
  ArrowRight,
  CheckCircle2,
  FileSearch,
  Calendar,
  Wallet,
  Trash2,
  ChevronDown
} from "lucide-react";
import * as XLSX from "xlsx";
import { parseExcelFile, MappingResult } from "@/lib/excelParser";
import { useData, DataMetrics } from "@/context/DataContext";
import toast from "react-hot-toast";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";

// MappingResult is now imported from excelParser

export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mappingResults, setMappingResults] = useState<MappingResult[]>([]);
  const [failedHeaders, setFailedHeaders] = useState<string[]>([]);
  const { 
    data, 
    compareData, 
    monthlyData, 
    selectedMonth, 
    compareMonth, 
    targetRevenue,
    setSelectedMonth, 
    setCompareMonth, 
    setMonthlyData,
    deleteMonthlyData
  } = useData();

  // 1. Month List for Selector
  const availableMonths = useMemo(() => {
    return Object.keys(monthlyData).sort().reverse();
  }, [monthlyData]);

  // 2. Comparison Logic (Updated for Nested Structure)
  const getNestedComparison = (
    category: keyof DataMetrics, 
    field: string
  ) => {
    // @ts-ignore - Dynamic access for generic comparison
    const prevValue = compareData[category]?.[field] || 0;
    // @ts-ignore
    const currentValue = data[category]?.[field] || 0;

    if (prevValue === 0) return null;

    const diff = currentValue - prevValue;
    const percent = Math.min(999, (diff / prevValue) * 100);

    return {
      percent: Math.abs(percent).toFixed(percent >= 100 ? 0 : 1),
      isUp: diff >= 0,
      diff
    };
  };

  // 3. Chart Data Preparation (Last 6 months)
  const chartData = useMemo(() => {
    return Object.keys(monthlyData)
      .sort()
      .slice(-6)
      .map(month => ({
        name: month.split("-")[1] + "월",
        revenue: monthlyData[month].generatedRevenue?.total || 0,
        rawMonth: month
      }));
  }, [monthlyData]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const count = files.length;
    toast.loading(`${count}개의 파일을 분석 중입니다...`, { id: "excel-parse" });

    let successCount = 0;
    let hasMissingPatientData = false;
    const defaultMonth = selectedMonth || new Date().toISOString().slice(0, 7);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const results = await parseExcelFile(file, defaultMonth);
        
        for (const res of results) {
          const { targetMonth, extractedData, mappingResults } = res;
          await setMonthlyData(targetMonth, extractedData);
          if (mappingResults.length > 0) successCount++;
          
          // [추가] 비표준 양식 감지 시 경고 알림
          if (mappingResults.some(m => m.original === "Heuristic Search")) {
            toast("⚠️ 비표준 양식이 감지되어 지능형 분석으로 데이터를 추출했습니다. 숫자가 정확한지 꼭 확인해 주세요.", {
              duration: 8000,
              icon: '🔍',
              style: {
                borderRadius: '16px',
                background: '#fff7ed',
                color: '#9a3412',
                border: '1px solid #ffedd5',
                fontSize: '12px',
                maxWidth: '450px'
              },
            });
          }

          // 환자 수 데이터가 없는 경우 체크
          if (!extractedData.patientMetrics?.total || extractedData.patientMetrics.total === 0) {
            hasMissingPatientData = true;
          }
        }
      }
      
      if (count > 1 || (successCount > count)) {
        toast.success(`데이터 분석 및 저장이 완료되었습니다 (${successCount}개 항목).`, { id: "excel-parse" });
      } else {
        toast.success(`데이터 분석 및 저장이 완료되었습니다.`, { id: "excel-parse" });
      }

      // [추가] 객단가 분석을 위한 가이드 메시지
      if (hasMissingPatientData) {
        setTimeout(() => {
          toast("💡 가이드: 업로드하신 양식에는 환자 수 데이터가 부족합니다. 객단가 분석을 위해 '월말결산(Type D)' 양식을 권장합니다.", {
            duration: 6000,
            icon: '📊',
            style: {
              borderRadius: '16px',
              background: '#334155',
              color: '#fff',
              fontSize: '12px',
              maxWidth: '400px'
            },
          });
        }, 1500);
      }
      
      setMappingResults([]); // Clear previous results display or handle appropriately
      setFailedHeaders([]);
    } catch (error: any) {
      toast.error(error.message || "파일 처리 중 오류 발생", { id: "excel-parse" });
    }
    
    // Reset file input value so same files can be uploaded again if needed
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatNumber = (num: number) => new Intl.NumberFormat("ko-KR").format(num);

  const ComparisonBadge = ({ category, field, isWarning }: { category: keyof DataMetrics, field: string, isWarning?: boolean }) => {
    const comp = getNestedComparison(category, field);
    if (!comp) return null;
    
    let colorClass = comp.isUp ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600";
    if (isWarning) {
      colorClass = comp.isUp ? "bg-rose-100 text-rose-700 border border-rose-200" : "bg-emerald-50 text-emerald-600";
    }

    return (
      <div className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${colorClass}`}>
        {comp.isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
        {comp.percent}%
      </div>
    );
  };

  const totalRevComp = getNestedComparison("generatedRevenue", "total");

  const formatMonth = (m: string) => {
    if (!m) return "데이터 없음";
    const [year, month] = m.split("-");
    const displayYear = year?.length === 4 ? year.slice(2) : year;
    return `${displayYear}.${month}월`;
  };

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-zinc-200 rounded-full" />
          <div className="h-4 bg-zinc-200 rounded-md w-24" />
        </div>
      </main>
    );
  }

  if (status === "unauthenticated" || !session) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white p-12 rounded-[2rem] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-slate-100/50 text-center space-y-10 animate-in fade-in zoom-in duration-700">
          <div className="space-y-4">
            <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-500 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-500/20 mb-6">
              <TrendingUp size={32} strokeWidth={2.5} />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              바른 컨설팅
            </h1>
            <p className="text-[15px] leading-relaxed text-slate-500 font-medium">
              최고의 메디컬 매니지먼트 서비스,<br />
              <strong className="text-slate-700">바른 컨설팅 분석기</strong>를 이용하시려면<br />
              로그인이 필요합니다.
            </p>
          </div>
          <div className="pt-2 flex justify-center">
            <KakaoLogin />
          </div>
        </div>
      </main>
    );
  }

  return (
    <DashboardLayout>
      <main className="p-6 md:p-12 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-4 w-full max-w-lg">
            <div>
              <h2 className="text-zinc-500 text-sm font-medium mb-1">바른컨설팅 분석 모드</h2>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">안녕하세요, {session?.user?.name || "원장님"}.</h1>
            <div className="flex flex-col md:flex-row items-center gap-3 mt-4">
            </div>
            </div>
          
          <div className="flex items-center gap-2 pt-2">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-zinc-400 ml-1">기준월 A</span>
              <div className="relative group">
                <button className="flex items-center gap-1.5 bg-zinc-100 px-3 py-2 rounded-xl text-sm font-bold text-zinc-900 border border-zinc-200">
                  <Calendar size={14} className="text-zinc-500" />
                  {formatMonth(compareMonth)}
                  <ChevronDown size={14} className="text-zinc-400" />
                </button>
                <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-xl border border-zinc-100 p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-[160px]">
                  {availableMonths.map(m => (
                    <div key={m} className="flex items-center gap-1 group/item">
                      <button 
                        onClick={() => setCompareMonth(m)} 
                        className="flex-1 text-left px-3 py-2 rounded-xl text-sm font-medium hover:bg-zinc-50 transition-colors"
                      >
                        {formatMonth(m)}
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`${m} 데이터를 영구적으로 삭제하시겠습니까?`)) {
                            deleteMonthlyData(m);
                          }
                        }}
                        className="p-2 text-zinc-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover/item:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 text-zinc-300"><ArrowRight size={16} /></div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-primary ml-1">비교 대상월 B</span>
              <div className="relative group">
                <button className="flex items-center gap-1.5 bg-primary/5 px-3 py-2 rounded-xl text-sm font-bold text-primary border border-primary/20">
                  <Calendar size={14} className="text-primary" />
                  {formatMonth(selectedMonth)}
                  <ChevronDown size={14} className="text-primary/40" />
                </button>
                <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-xl border border-zinc-100 p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-[160px]">
                  {availableMonths.map(m => (
                    <div key={m} className="flex items-center gap-1 group/item">
                      <button 
                        onClick={() => setSelectedMonth(m)} 
                        className="flex-1 text-left px-3 py-2 rounded-xl text-sm font-medium hover:bg-zinc-50 transition-colors"
                      >
                        {formatMonth(m)}
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`${m} 데이터를 영구적으로 삭제하시겠습니까?`)) {
                            deleteMonthlyData(m);
                          }
                        }}
                        className="p-2 text-zinc-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover/item:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 w-full md:w-auto">
          <div className="flex items-center gap-3 w-full">
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" multiple className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="w-full md:w-auto bg-white text-slate-900 border border-zinc-200 px-8 py-3 rounded-full font-bold text-sm flex items-center justify-center gap-2 toss-shadow hover:bg-zinc-50 transition-all active:scale-95">
              <FileSpreadsheet size={18} className="text-emerald-600" />
              월별매출업로드
            </button>
          </div>
        </div>
      </div>

      {compareMonth && selectedMonth && compareMonth !== selectedMonth && totalRevComp && (
        <div className="p-4 rounded-3xl flex items-center justify-center gap-3 border bg-rose-50/50 border-rose-100 animate-in fade-in zoom-in duration-500">
          <TrendingUp size={20} className="text-rose-600" />
          <p className="font-bold text-zinc-900 text-sm">
            현재 <span className="text-primary">[{formatMonth(selectedMonth)}]</span>의 발생 매출은 <span className="text-zinc-500">[{formatMonth(compareMonth)}]</span> 대비{" "}
            <span className={totalRevComp.isUp ? "text-rose-600" : "text-blue-600"}>
              {totalRevComp.percent}% {totalRevComp.isUp ? "상승" : "하락"}
            </span>한 상태입니다.
          </p>
        </div>
      )}

      <div onClick={() => router.push("/details")} className="cursor-pointer group">
        {/* 1층: 종합 지표 (Executive Totals) */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="bg-white p-5 toss-shadow border-zinc-100">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Users size={16} /></div>
              <ComparisonBadge category="patientMetrics" field="total" />
            </div>
            <p className="text-zinc-500 text-[11px] font-bold mb-1">총 내원환자</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-slate-900">{formatNumber(data.patientMetrics?.total || 0)}</span>
              <span className="text-xs font-bold text-zinc-400">명</span>
            </div>
          </Card>

          <Card className="bg-slate-900 text-white p-5 toss-shadow border-none">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-white/10 rounded-lg text-white"><TrendingUp size={16} /></div>
              <ComparisonBadge category="generatedRevenue" field="total" />
            </div>
            <p className="text-slate-400 text-[11px] font-bold mb-1">총 발생 매출</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-white">{formatNumber(data.generatedRevenue?.total || 0)}</span>
              <span className="text-xs font-bold text-slate-400">원</span>
            </div>
          </Card>

          <Card className="bg-rose-50/50 p-5 toss-shadow border-rose-100">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-rose-100 rounded-lg text-rose-600"><FileSearch size={16} /></div>
              <ComparisonBadge category="leakage" field="discountTotal" isWarning />
            </div>
            <p className="text-rose-600 text-[11px] font-bold mb-1">매출 누수 합계</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-rose-700">{formatNumber((data.leakage?.discountTotal || 0) + (data.leakage?.receivables || 0))}</span>
              <span className="text-xs font-bold text-rose-400">원</span>
            </div>
          </Card>

          <Card className="bg-white p-5 toss-shadow border-zinc-100">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><Wallet size={16} /></div>
              <ComparisonBadge category="cashFlow" field="totalReceived" />
            </div>
            <p className="text-zinc-500 text-[11px] font-bold mb-1">실제 수납액</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-slate-900">{formatNumber(data.cashFlow?.totalReceived || 0)}</span>
              <span className="text-xs font-bold text-zinc-400">원</span>
            </div>
          </Card>

          <Card className="bg-white p-5 toss-shadow border-zinc-100">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-zinc-100 rounded-lg text-zinc-600"><CheckCircle2 size={16} /></div>
              <div className="text-[10px] font-black text-blue-500">GOAL</div>
            </div>
            <p className="text-zinc-400 text-[11px] font-bold mb-1">목표 달성률</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-slate-900">{Math.min(100, Math.round(((data.generatedRevenue?.total || 0) / (targetRevenue || 1)) * 100))}%</span>
            </div>
            <div className="w-full bg-zinc-100 h-1 mt-3 overflow-hidden rounded-full font-medium">
              <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.round(((data.generatedRevenue?.total || 0) / (targetRevenue || 1)) * 100))}%` }}></div>
            </div>
          </Card>
        </div>

        {/* 2층: 건강보험 및 청구 상세 (Insurance Breakdown) */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-6">
          <Card className="bg-indigo-50/30 p-5 border-indigo-100/50">
             <div className="flex items-center justify-between mb-2">
                 <span className="text-indigo-600 text-[10px] font-bold px-2 py-0.5 bg-indigo-50 rounded-md">합계</span>
             </div>
             <p className="text-zinc-500 text-[11px] font-bold mb-1">건강보험 매출 (계)</p>
             <div className="text-xl font-bold text-slate-900">{formatNumber((data.generatedRevenue?.copay || 0) + (data.generatedRevenue?.insurance || 0))}</div>
             <div className="mt-2 h-1 w-full bg-indigo-100 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full" style={{ width: `${data.generatedRevenue?.total ? Math.round(((data.generatedRevenue.copay + data.generatedRevenue.insurance) / data.generatedRevenue.total) * 100) : 0}%` }}></div>
             </div>
          </Card>

          <Card className="bg-white p-5 border-zinc-100 shadow-sm">
             <p className="text-zinc-400 text-[10px] font-bold mb-1">본인부담금</p>
             <div className="text-xl font-bold text-slate-800">{formatNumber(data.generatedRevenue?.copay || 0)}</div>
             <div className="text-[10px] text-zinc-400 mt-2 font-medium">환자 현장 수납</div>
          </Card>

          <Card className="bg-white p-5 border-zinc-100 shadow-sm">
             <p className="text-zinc-400 text-[10px] font-bold mb-1">보험청구액</p>
             <div className="text-xl font-bold text-slate-800">{formatNumber(data.generatedRevenue?.insurance || 0)}</div>
             <div className="text-[10px] text-zinc-400 mt-2 font-medium">공단 청구분</div>
          </Card>

          <Card className="bg-white p-5 border-zinc-100 shadow-sm">
             <p className="text-zinc-400 text-[10px] font-bold mb-1">자보청구액</p>
             <div className="text-xl font-bold text-slate-800">{formatNumber(data.generatedRevenue?.auto || 0)}</div>
             <div className="text-[10px] text-zinc-400 mt-2 font-medium">자동차보험</div>
          </Card>

          <Card className="bg-white p-5 border-zinc-100 shadow-sm">
             <p className="text-zinc-400 text-[10px] font-bold mb-1">산재청구액</p>
             <div className="text-xl font-bold text-slate-800">{formatNumber(data.generatedRevenue?.worker || 0)}</div>
             <div className="text-[10px] text-zinc-400 mt-2 font-medium">산업재해</div>
          </Card>
        </div>

        {/* 3층: 효율 지표 및 비급여 (Efficiency & Others) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <Card className="bg-amber-50/20 p-6 border-amber-100/50 flex items-center justify-between">
             <div className="space-y-1">
                <p className="text-amber-700 text-[11px] font-bold">1인당 평균 객단가 (ARPP)</p>
                <div className="text-2xl font-black text-amber-900">
                  {data.patientMetrics?.total > 0 
                    ? formatNumber(Math.round(data.generatedRevenue.total / data.patientMetrics.total))
                    : 0} <span className="text-sm font-bold">원</span>
                </div>
             </div>
             <div className="p-4 bg-amber-100/50 rounded-2xl text-amber-600"><TrendingUp size={24} /></div>
          </Card>

          <Card className="bg-white p-6 border-zinc-100 shadow-sm flex items-center justify-between">
             <div className="space-y-1">
                <p className="text-zinc-500 text-[11px] font-bold">신규 환자 비중</p>
                <div className="text-2xl font-bold text-slate-900">
                  {formatNumber(data.patientMetrics?.new || 0)} <span className="text-sm text-zinc-400 italic">/ {data.patientMetrics?.total || 0} 명</span>
                </div>
             </div>
             <div className="text-xl font-black text-blue-500">
                {data.patientMetrics?.total ? Math.round((data.patientMetrics.new / data.patientMetrics.total) * 100) : 0}%
             </div>
          </Card>

          <Card className="bg-white p-6 border-zinc-100 shadow-sm flex items-center justify-between">
             <div className="space-y-1">
                <p className="text-zinc-500 text-[11px] font-bold">비급여 매출액</p>
                <div className="text-2xl font-bold text-slate-900">{formatNumber(data.generatedRevenue?.nonCovered || 0)} <span className="text-sm font-normal text-zinc-400">원</span></div>
             </div>
             <div className="text-xs font-bold px-2 py-1 bg-zinc-100 text-zinc-500 rounded-md">
                비중 {data.generatedRevenue?.total ? Math.round((data.generatedRevenue.nonCovered / data.generatedRevenue.total) * 100) : 0}%
             </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-12">
        <Card className="h-80 bg-white p-6 shadow-sm border-zinc-100">
          <h3 className="font-bold text-lg mb-6">매출 성장 추이</h3>
          <ResponsiveContainer width="100%" height="80%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
              <YAxis hide />
              <RechartsTooltip cursor={{ fill: "#f8fafc" }} />
              <Bar dataKey="revenue" radius={[6, 6, 0, 0]} barSize={24} fill="#3182f6">
                {chartData.map((entry) => (
                  <Cell key={entry.rawMonth} fill={entry.rawMonth === selectedMonth ? "#3182f6" : "#e2e8f0"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="h-80 bg-white p-6 shadow-sm border-zinc-100">
          <h3 className="font-bold text-lg mb-4">결제 수단 현황</h3>
          <div className="space-y-4 mt-6">
            {[
              { label: "카드 수납", value: data.paymentMethods?.card || 0, color: "bg-blue-500" },
              { label: "현금 수납", value: data.paymentMethods?.cash || 0, color: "bg-emerald-500" },
              { label: "기타 (이체 등)", value: data.paymentMethods?.other || 0, color: "bg-zinc-400" },
            ].map((item) => {
              const totalPay = (data.paymentMethods?.card || 0) + (data.paymentMethods?.cash || 0) + (data.paymentMethods?.other || 0);
              const percent = totalPay ? Math.round((item.value / totalPay) * 100) : 0;
              return (
                <div key={item.label} className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-zinc-500">{item.label}</span>
                    <span className="text-slate-900">{formatNumber(item.value)}원 ({percent}%)</span>
                  </div>
                  <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                    <div className={`${item.color} h-full rounded-full`} style={{ width: `${percent}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="bg-slate-900 text-white border-none p-8 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          <h1 className="text-blue-400 font-bold text-xs uppercase tracking-widest mb-2 relative">Clinical Insights</h1>
          <h3 className="text-2xl font-bold mb-4 leading-tight relative">지표 분석 결과<br />매출 누수가 감지되었습니다.</h3>
          <p className="text-slate-400 text-sm mb-8 relative">
            {(data.leakage?.discountTotal || 0) > 0 ? (
              <>이번 달 할인액이 {formatNumber(data.leakage.discountTotal)}원 발생했습니다. <br />비급여 항목의 구성비 조정을 제안합니다.</>
            ) : (
              <>현재 데이터 기반으로 원장님의 병원에 <br />가장 필요한 컨설팅 항목을 도출했습니다.</>
            )}
          </p>
          <button className="w-full bg-blue-600 py-4 rounded-2xl font-bold text-sm hover:bg-blue-500 transition-all relative z-10">
            정밀 누수 차단 보고서 받기
          </button>
        </Card>
      </div>
    </main>
    </DashboardLayout>
  );
}
