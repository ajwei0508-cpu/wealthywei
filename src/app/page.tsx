"use client";

import React, { useRef, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Card from "@/components/Card";
import KakaoLogin from "@/components/KakaoLogin";
import { 
  TrendingUp, 
  Users, 
  ShieldCheck, 
  FileSpreadsheet, 
  Plus, 
  ArrowRight, 
  CheckCircle2, 
  FileSearch, 
  Info, 
  ChevronDown,
  TrendingDown,
  Calendar,
  Wallet
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
    setMonthlyData 
  } = useData();

  // 1. Month List for Selector
  const availableMonths = useMemo(() => {
    return Object.keys(monthlyData).sort().reverse();
  }, [monthlyData]);

  // 2. Comparison Logic (Current B vs Reference A)
  const getComparison = (key: keyof DataMetrics) => {
    const prevValue = compareData[key];
    const currentValue = data[key];

    if (prevValue === undefined || prevValue === 0) return null;

    const diff = currentValue - prevValue;
    const percent = (diff / prevValue) * 100;

    return {
      percent: Math.abs(percent).toFixed(1),
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
        revenue: monthlyData[month].totalRevenue,
        rawMonth: month
      }));
  }, [monthlyData]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const defaultMonth = selectedMonth || new Date().toISOString().slice(0, 7);
    toast.loading("엑셀 데이터를 분석 중입니다...", { id: "excel-parse" });

    try {
      const { targetMonth, extractedData, mappingResults } = await parseExcelFile(file, defaultMonth);
      setMonthlyData(targetMonth, extractedData);
      setMappingResults(mappingResults);
      setFailedHeaders([]);
      
      if (mappingResults.length > 0) {
        toast.success(`${targetMonth} 매출 데이터를 분석 및 저장했습니다.`, { id: "excel-parse" });
      } else {
        toast.success(`${targetMonth} 데이터(총매출 중심)를 추출했습니다.`, { id: "excel-parse" });
      }
    } catch (error: any) {
      toast.error(error.message || "파일 처리 중 오류 발생", { id: "excel-parse" });
    }
  };

  const formatNumber = (num: number) => new Intl.NumberFormat("ko-KR").format(num);

  const ComparisonBadge = ({ metric }: { metric: keyof DataMetrics }) => {
    const comp = getComparison(metric);
    if (!comp) return null;
    return (
      <div className={`flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-full ${comp.isUp ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600"}`}>
        {comp.isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
        {comp.percent}%
      </div>
    );
  };

  const totalRevComp = getComparison("totalRevenue");

  const formatMonth = (m: string) => {
    if (!m) return "데이터 없음";
    const [year, month] = m.split("-");
    return `${year?.slice(2)}.${month}월`;
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
    <main className="min-h-screen p-6 md:p-12 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-4 w-full max-w-lg">
          <div>
            <h2 className="text-zinc-500 text-sm font-medium mb-1">바른컨설팅 분석 모드</h2>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">안녕하세요, 원장님.</h1>
          <div className="flex flex-col md:flex-row items-center gap-3">
            <KakaoLogin />
            {session?.user?.email === "wei0508@naver.com" && (
              <button 
                onClick={() => router.push("/master")}
                className="w-full md:w-auto bg-slate-900 text-white px-5 py-2.5 rounded-full font-bold text-sm shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
              >
                <ShieldCheck size={18} className="text-amber-400" />
                마스터 관리망
              </button>
            )}
          </div>
          </div>
          
          <div className="flex items-center gap-2 pt-2">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-zinc-400 ml-1">기준월 A</span>
              <div className="relative group">
                <button className="flex items-center gap-1.5 bg-zinc-100 px-3 py-2 rounded-xl text-sm font-bold text-zinc-900 border border-zinc-200">
                  <Calendar size={14} className="text-zinc-500" />
                  {compareMonth || "선택"}
                  <ChevronDown size={14} className="text-zinc-400" />
                </button>
                <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-xl border border-zinc-100 p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-[140px]">
                  {availableMonths.map(m => (
                    <button key={m} onClick={() => setCompareMonth(m)} className="w-full text-left px-3 py-2 rounded-xl text-sm font-medium hover:bg-zinc-50">
                      {m}
                    </button>
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
                  {selectedMonth}
                  <ChevronDown size={14} className="text-primary/40" />
                </button>
                <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-xl border border-zinc-100 p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-[140px]">
                  {availableMonths.map(m => (
                    <button key={m} onClick={() => setSelectedMonth(m)} className="w-full text-left px-3 py-2 rounded-xl text-sm font-medium hover:bg-zinc-50">
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 w-full md:w-auto">
          <div className="flex items-center gap-3 w-full">
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="flex-1 md:flex-none bg-white text-slate-900 border border-zinc-200 px-5 py-2.5 rounded-full font-semibold text-sm flex items-center justify-center gap-2 toss-shadow hover:bg-zinc-50 transition-colors">
              <FileSpreadsheet size={18} className="text-emerald-600" />
              매출 엑셀 분석
            </button>
            <button className="flex-1 md:flex-none bg-primary text-white px-5 py-2.5 rounded-full font-semibold text-sm flex items-center justify-center gap-2 toss-shadow hover:opacity-90">
              <Plus size={18} />
              새 컨설팅
            </button>
          </div>
        </div>
      </div>

      {compareMonth && selectedMonth && compareMonth !== selectedMonth && totalRevComp && (
        <div className="p-4 rounded-3xl flex items-center justify-center gap-3 border bg-rose-50/50 border-rose-100 animate-in fade-in zoom-in duration-500">
          <TrendingUp size={20} className="text-rose-600" />
          <p className="font-bold text-zinc-900 text-sm">
            현재 <span className="text-primary">[{selectedMonth}]</span>의 매출은 <span className="text-zinc-500">[{compareMonth}]</span> 대비{" "}
            <span className={totalRevComp.isUp ? "text-rose-600" : "text-blue-600"}>
              {totalRevComp.percent}% {totalRevComp.isUp ? "상승" : "하락"}
            </span>한 상태입니다.
          </p>
        </div>
      )}

      <div onClick={() => router.push("/details")} className="cursor-pointer group">
        <Card className="grid grid-cols-1 md:grid-cols-4 gap-8 md:divide-x md:divide-zinc-100 bg-white px-6 py-8 toss-shadow transition-all hover:translate-y-[-2px]">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-500 font-bold text-xs">
                <TrendingUp size={16} className="text-primary" /> 총매출
              </div>
              <ComparisonBadge metric="totalRevenue" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-slate-900">{formatNumber(data.totalRevenue)}</span>
              <span className="text-lg font-bold text-zinc-400">원</span>
            </div>
          </div>

          <div className="md:pl-8 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-500 font-bold text-xs">
                <ShieldCheck size={16} className="text-indigo-600" /> 보험 매출
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-slate-900">
                {formatNumber((data.patientPay || 0) + (data.insuranceClaim || 0) + (data.autoInsuranceClaim || 0))}
              </span>
              <span className="text-lg font-bold text-zinc-400">원</span>
            </div>
          </div>

          <div className="md:pl-8 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-500 font-bold text-xs">
                <Wallet size={16} className="text-emerald-600" /> 비급여 매출
              </div>
              <ComparisonBadge metric="nonBenefit" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-slate-900">{formatNumber(data.nonBenefit)}</span>
              <span className="text-lg font-bold text-zinc-400">원</span>
            </div>
          </div>

          <div className="md:pl-8 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-500 font-bold text-xs">
                <TrendingUp size={16} className="text-primary" /> 목표 달성률
              </div>
            </div>
            <div className="flex flex-col gap-1 mt-1">
              <div className="flex justify-between items-end">
                <span className="text-3xl font-bold text-slate-900">{Math.min(100, Math.round(((data.totalRevenue || 0) / (targetRevenue || 1)) * 100))}%</span>
                <span className="text-[10px] text-zinc-400">목표 {formatNumber(targetRevenue || 0)}</span>
              </div>
              <div className="w-full bg-zinc-100 rounded-full h-1.5 mt-2 overflow-hidden">
                <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.round(((data.totalRevenue || 0) / (targetRevenue || 1)) * 100))}%` }}></div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
        <Card className="h-80 bg-white p-6">
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

        <Card className="bg-slate-900 text-white border-none p-8 flex flex-col justify-center">
          <h1 className="text-blue-400 font-bold text-xs uppercase tracking-widest mb-2">Clinical Insights</h1>
          <h3 className="text-2xl font-bold mb-4 leading-tight">데이터 기반의<br />성장 전략을 제안합니다.</h3>
          <p className="text-slate-400 text-sm mb-8">
            현재 분석된 데이터를 바탕으로 원장님의 병원에 <br />
            가장 필요한 컨설팅 항목 3가지를 도출했습니다.
          </p>
          <button className="w-full bg-blue-600 py-4 rounded-2xl font-bold text-sm hover:bg-blue-500 transition-all">
            정밀 컨설팅 보고서 받기
          </button>
        </Card>
      </div>
    </main>
  );
}
