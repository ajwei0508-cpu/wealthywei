"use client";

import React, { useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Card from "@/components/Card";
import DashboardLayout from "@/components/DashboardLayout";
import { 
  TrendingUp,
  TrendingDown,
  Users,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  FileSearch,
  Calendar,
  Wallet,
  ShieldAlert,
  ArrowLeft,
  UserPlus,
  UserCheck,
  FileSpreadsheet,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { useData, DataMetrics } from "@/context/DataContext";
import { parseExcelFile } from "@/lib/excelParser";
import toast from "react-hot-toast";
import Papa from "papaparse";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  Cell,
  Legend
} from "recharts";

export default function HanChartDashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { 
    data, 
    compareData, 
    monthlyData, 
    selectedMonth, 
    compareMonth,
    setSelectedMonth,
    setCompareMonth,
    setMonthlyData
  } = useData();

  const formatNumber = (num: number) => new Intl.NumberFormat("ko-KR").format(num);

  const formatMonth = (m: string) => {
    if (!m) return "데이터 없음";
    const [year, month] = m.split("-");
    return `${year?.slice(2)}.${month}월`;
  };

  const availableMonths = useMemo(() => {
    return Object.keys(monthlyData).sort().reverse();
  }, [monthlyData]);

  // Comparison logic for HanChart
  const getComp = (category: keyof DataMetrics, field: string) => {
    // @ts-ignore
    const prev = compareData[category]?.[field] || 0;
    // @ts-ignore
    const curr = data[category]?.[field] || 0;
    
    if (prev === 0) return null;
    const diff = curr - prev;
    const percent = ((diff / prev) * 100).toFixed(1);
    return { percent, isUp: diff >= 0, diff };
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    toast.loading("데이터를 분석 중입니다...", { id: "hanchart-upload" });
    const defaultMonth = selectedMonth || new Date().toISOString().slice(0, 7);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.name.endsWith(".csv")) {
          Papa.parse(file, {
            header: false,
            complete: async (results) => {
              const extracted = await parseExcelFile(file, defaultMonth, "hanchart");
              if (extracted.length > 0) {
                await setMonthlyData(extracted[0].targetMonth, extracted[0].extractedData);
              }
            }
          });
        } else {
          const results = await parseExcelFile(file, defaultMonth, "hanchart");
          for (const res of results) {
            await setMonthlyData(res.targetMonth, res.extractedData);
          }
        }
      }
      toast.success("한차트 데이터가 성공적으로 업데이트되었습니다.", { id: "hanchart-upload" });
    } catch (error: any) {
      toast.error("업로드 실패: " + error.message, { id: "hanchart-upload" });
    }
  };

  // Chart Data for MoM Comparison
  const comparisonChartData = useMemo(() => {
    if (!compareData || !data) return [];
    return [
      { 
        name: "급여본부", 
        [compareMonth]: compareData.generatedRevenue.copay,
        [selectedMonth]: data.generatedRevenue.copay 
      },
      { 
        name: "공단청구", 
        [compareMonth]: compareData.generatedRevenue.insurance,
        [selectedMonth]: data.generatedRevenue.insurance 
      },
      { 
        name: "비급여", 
        [compareMonth]: compareData.generatedRevenue.nonCovered,
        [selectedMonth]: data.generatedRevenue.nonCovered 
      },
      { 
        name: "자보/산재", 
        [compareMonth]: compareData.generatedRevenue.auto + compareData.generatedRevenue.worker,
        [selectedMonth]: data.generatedRevenue.auto + data.generatedRevenue.worker 
      }
    ];
  }, [data, compareData, selectedMonth, compareMonth]);

  if (status === "loading") return <div className="min-h-screen bg-slate-50 flex items-center justify-center animate-pulse">Loding...</div>;
  if (!session) {
    router.push("/");
    return null;
  }

  return (
    <DashboardLayout>
      <main className="p-6 md:p-12 max-w-7xl mx-auto space-y-8 pb-20">
        {/* Header with EXCLUSIVE Branding & Upload */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push("/")}
              className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-400"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">HANCHART EXCLUSIVE</span>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Premium Analysis</span>
              </div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">한차트 전용 경영 전략 Dashboard</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
             {/* Upload Trigger */}
             <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls, .csv" multiple className="hidden" />
             <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 bg-slate-100 hover:bg-zinc-200 px-5 py-3 rounded-2xl text-sm font-bold text-slate-700 transition-all active:scale-95 toss-shadow"
             >
                <FileSpreadsheet size={18} className="text-emerald-500" />
                새 데이터 업로드
             </button>

             <div className="h-10 w-[1px] bg-zinc-100 mx-2 hidden md:block" />

             {/* Comparison Selectors */}
             <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-zinc-100 shadow-sm">
                <div className="relative group">
                   <button className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-500 hover:bg-zinc-50 flex items-center gap-1">
                      {formatMonth(compareMonth)} (비교) <ChevronDown size={12} />
                   </button>
                   <div className="absolute top-full right-0 mt-2 bg-white rounded-2x border border-zinc-100 shadow-xl p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-[120px]">
                      {availableMonths.map(m => (
                        <button key={m} onClick={() => setCompareMonth(m)} className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium hover:bg-zinc-50">{formatMonth(m)}</button>
                      ))}
                   </div>
                </div>
                <ChevronRight size={14} className="text-zinc-300" />
                <div className="relative group">
                   <button className="px-4 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-lg shadow-slate-900/10 flex items-center gap-1">
                      {formatMonth(selectedMonth)} (기준) <ChevronDown size={12} />
                   </button>
                   <div className="absolute top-full right-0 mt-2 bg-white rounded-2xl border border-zinc-100 shadow-xl p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-[120px]">
                      {availableMonths.map(m => (
                        <button key={m} onClick={() => setSelectedMonth(m)} className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium hover:bg-zinc-50">{formatMonth(m)}</button>
                      ))}
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* 1층: 환자 유입 지표 MoM */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: "총 내원객 (초진+재진)", field: "total", icon: <Users size={24} />, color: "blue", cat: "patientMetrics" },
            { label: "초진 환자", field: "new", icon: <UserPlus size={24} />, color: "indigo", cat: "patientMetrics" },
            { label: "재진 환자", field: "returning", icon: <UserCheck size={24} />, color: "emerald", cat: "patientMetrics" }
          ].map((item) => {
            const comp = getComp(item.cat as any, item.field);
            // @ts-ignore
            const val = data[item.cat][item.field];
            return (
              <Card key={item.field} className="bg-white p-7 border-zinc-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 bg-${item.color}-50 rounded-2xl text-${item.color}-600`}>{item.icon}</div>
                  {comp && (
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${comp.isUp ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600"} flex items-center gap-0.5`}>
                      {comp.isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {comp.percent}%
                    </span>
                  )}
                </div>
                <p className="text-zinc-400 text-xs font-bold mb-1">{item.label}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900">{formatNumber(val)}</span>
                  <span className="text-lg font-bold text-zinc-400">명</span>
                </div>
              </Card>
            )
          })}
        </div>

        {/* 2층: 프리미엄 매출 비교 섹션 (Monthly Comparison Menu) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-2">
              <Card className="bg-white p-8 border-zinc-100 shadow-sm h-full">
                 <div className="flex items-center justify-between mb-8">
                    <div>
                       <h3 className="text-lg font-bold text-slate-900">본부금 및 보험 매출 구조 비교</h3>
                       <p className="text-xs text-zinc-400 font-medium">선택된 두 달의 매출 항목별 정밀 비교 분석</p>
                    </div>
                    <div className="flex items-center gap-4">
                       <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-zinc-200 rounded-full"></div>
                          <span className="text-[10px] font-bold text-zinc-400">{formatMonth(compareMonth)}</span>
                       </div>
                       <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-slate-900 rounded-full"></div>
                          <span className="text-[10px] font-bold text-zinc-500">{formatMonth(selectedMonth)}</span>
                       </div>
                    </div>
                 </div>
                 
                 <div className="h-80 w-full mt-6">
                    <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={comparisonChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: "#64748b" }} />
                          <YAxis hide />
                          <RechartsTooltip cursor={{ fill: '#f8fafc' }} />
                          <Bar dataKey={compareMonth} fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={32} />
                          <Bar dataKey={selectedMonth} fill="#0f172a" radius={[4, 4, 0, 0]} barSize={32} />
                       </BarChart>
                    </ResponsiveContainer>
                 </div>
              </Card>
           </div>

           <div className="space-y-6">
              <Card className="bg-slate-900 text-white p-8 border-none shadow-xl shadow-slate-900/20 relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                 <p className="text-slate-400 text-xs font-bold mb-1 uppercase tracking-widest">Growth Summary</p>
                 <h4 className="text-white text-lg font-bold mb-6 flex items-center gap-2">
                   전월 대비 성장률 <TrendingUp size={18} className="text-emerald-400" />
                 </h4>
                 
                 <div className="space-y-6">
                    {[
                      { label: "총매출액", cat: "generatedRevenue", field: "total" },
                      { label: "객단가 (ARPU)", cat: "arpu", field: "total" },
                      { label: "재진 비중", cat: "patientMetrics", field: "returning" }
                    ].map(item => {
                      const comp = getComp(item.cat as any, item.field);
                      return (
                        <div key={item.label} className="flex items-center justify-between group">
                          <span className="text-zinc-500 text-xs font-bold group-hover:text-slate-200 transition-colors uppercase tracking-tight">{item.label}</span>
                          <div className={`flex items-center gap-1 font-black ${comp?.isUp ? "text-emerald-400" : "text-rose-400"}`}>
                             {comp?.isUp ? "+" : ""}{comp?.percent || 0}%
                             {comp?.isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                          </div>
                        </div>
                      )
                    })}
                 </div>

                 <div className="mt-10 p-5 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                      * 현재 매출 구조에서 가장 큰 변화는 <span className="text-blue-400 font-bold">비급여 항목의 MoM 성장</span>입니다. 보험 매출이 안정적인 가운데 비급여 비중이 {getComp("generatedRevenue", "nonCovered")?.percent || 0}% 증가한 점이 고무적입니다.
                    </p>
                 </div>
              </Card>

              <Card className="bg-blue-600 text-white p-7 shadow-lg shadow-blue-500/20">
                 <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-white/20 rounded-xl text-white"><CheckCircle2 size={18} /></div>
                    <h4 className="font-bold text-blue-50">HanChart 전략 리포트</h4>
                 </div>
                 <p className="text-xs text-blue-100 leading-relaxed font-bold">
                    재진 환자의 객단가가 전월 대비 {getComp("generatedRevenue", "total")?.percent || 0}% 상승했습니다. 이는 루틴한 처방 외에 비급여 상담이 원활히 이루어지고 있다는 지표입니다.
                 </p>
              </Card>
           </div>
        </div>

        {/* 3층: 누수 트래커 & 정밀 분석 표 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-5 bg-blue-600 rounded-full"></div>
                  <h3 className="text-lg font-bold text-slate-900">한차트 2026 표준 데이터 분석 리포트</h3>
                </div>
                <span className="text-[10px] text-zinc-400 font-medium">단위: 원</span>
              </div>
              
              <Card className="p-0 overflow-hidden border-zinc-100 shadow-sm">
                 <table className="w-full text-sm">
                   <thead className="bg-slate-50 border-b border-zinc-100">
                     <tr className="text-[11px] text-zinc-500 font-bold">
                       <th className="px-6 py-4 text-left">항목 카테고리</th>
                       <th className="px-6 py-4 text-left">한차트 엑셀 항목명</th>
                       <th className="px-6 py-4 text-right">수치 (추출값)</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-zinc-50">
                     <tr className="hover:bg-blue-50/30 transition-colors">
                       <td className="px-6 py-4 font-bold text-slate-900">매출 합계</td>
                       <td className="px-6 py-4 text-blue-600 font-bold">총매출액 (A)</td>
                       <td className="px-6 py-4 text-right font-black text-blue-600">{formatNumber(data.generatedRevenue.total)}</td>
                     </tr>
                     <tr>
                       <td className="px-6 py-4"></td>
                       <td className="px-6 py-4 text-slate-500">ㄴ 급여본부금</td>
                       <td className="px-6 py-4 text-right font-medium">{formatNumber(data.generatedRevenue.copay)}</td>
                     </tr>
                     <tr>
                       <td className="px-6 py-4"></td>
                       <td className="px-6 py-4 text-slate-500">ㄴ 급여청구액 (보험)</td>
                       <td className="px-6 py-4 text-right font-medium">{formatNumber(data.generatedRevenue.insurance)}</td>
                     </tr>
                     <tr>
                        <td className="px-6 py-4"></td>
                        <td className="px-6 py-4 text-slate-500 font-bold text-indigo-600">ㄴ 본부금합 (=본부금+비급여)</td>
                        <td className="px-6 py-4 text-right font-black text-indigo-600">{formatNumber(data.generatedRevenue.patientTotal)}</td>
                     </tr>
                     <tr>
                       <td className="px-6 py-4"></td>
                       <td className="px-6 py-4 text-zinc-500">ㄴ 비과세비급여</td>
                       <td className="px-6 py-4 text-right font-medium">{formatNumber(data.emrSpecific["비과세비급여"] || 0)}</td>
                     </tr>
                     <tr>
                       <td className="px-6 py-4"></td>
                       <td className="px-6 py-4 text-zinc-500">ㄴ 과세비급여</td>
                       <td className="px-6 py-4 text-right font-medium">{formatNumber(data.emrSpecific["과세비급여"] || 0)}</td>
                     </tr>
                     <tr className="bg-rose-50/20">
                       <td className="px-6 py-4 font-bold text-rose-900">손실 분석</td>
                       <td className="px-6 py-4 text-rose-600 font-bold">누수 할인액 (괄호)</td>
                       <td className="px-6 py-4 text-right font-black text-rose-600">-{formatNumber(data.leakage.discountTotal)}</td>
                     </tr>
                     <tr className="bg-emerald-50/20">
                       <td className="px-6 py-4 font-bold text-emerald-900">현금 흐름</td>
                       <td className="px-6 py-4 text-emerald-600 font-bold">총 수납액 (입금)</td>
                       <td className="px-6 py-4 text-right font-black text-emerald-600">{formatNumber(data.cashFlow.totalReceived)}</td>
                     </tr>
                   </tbody>
                 </table>
              </Card>
           </div>

           <div className="space-y-6">
              <Card className="bg-rose-600 text-white p-8 border-none shadow-xl shadow-rose-600/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-4">
                    <ShieldAlert size={20} className="text-rose-200" />
                    <h4 className="font-bold text-rose-100 text-sm uppercase tracking-tighter">Leakage Tracker</h4>
                  </div>
                  <p className="text-rose-100 text-[10px] font-bold mb-1 opacity-80 italic">한차트 괄호 텍스트 데이터 기반</p>
                  <p className="text-white text-xs font-medium mb-2">실질 할인 발생액</p>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-5xl font-black text-white">{formatNumber(data.leakage.discountTotal)}</span>
                    <span className="text-base font-bold text-rose-200">원</span>
                  </div>
                  <div className="p-4 bg-black/10 rounded-2xl border border-white/10 backdrop-blur-sm">
                    <p className="text-[11px] text-rose-50 leading-relaxed font-medium">
                      * 이 수치는 원장님께서 환자에게 직접적으로 적용한 <strong>할인/누수액</strong>입니다. 비급여 비중이 높은 한차트의 특성상 이 금액이 총진료비의 15%를 초과할 경우 진료 프로토콜 점검이 필요합니다.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-7 border-zinc-100 shadow-sm bg-zinc-50/50">
                 <button 
                  onClick={() => router.push("/details")}
                  className="w-full bg-white border border-zinc-200 py-3 rounded-xl text-xs font-black text-zinc-900 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                 >
                   심층 AI 분석 리포트 확인 <ArrowRight size={12} className="inline ml-1" />
                 </button>
              </Card>
           </div>
        </div>
      </main>
    </DashboardLayout>
  );
}
