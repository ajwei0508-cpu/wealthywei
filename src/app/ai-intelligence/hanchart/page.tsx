"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Sparkles, 
  TrendingUp, 
  Activity, 
  Zap, 
  Target, 
  ShieldCheck, 
  Calendar,
  ArrowUpRight,
  BrainCircuit,
  Rocket,
  ShieldAlert,
  BarChart3,
  Play,
  Lightbulb,
  DollarSign,
  ClipboardList,
  ChevronLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useData } from "@/context/DataContext";
import DashboardLayout from "@/components/DashboardLayout";
import { generateStrategicBriefing } from "@/lib/aiService";
import { useRouter } from "next/navigation";
import { YoutubeVideoLink } from "@/components/YoutubeVideoLink";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from "recharts";

const formatNumber = (num: number) => {
  return new Intl.NumberFormat("ko-KR").format(num || 0);
};

export default function HanchartAiIntelligencePage() {
  const { monthlyData, selectedMonth } = useData();
  const [briefing, setBriefing] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // 1. 12-Month Filtering Logic
  const history = useMemo(() => {
    // Get last 12 months from selectedMonth
    const [year, month] = selectedMonth.split("-").map(Number);
    const targetMonths = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(year, month - 1 - i, 1);
      targetMonths.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    
    return targetMonths
      .reverse()
      .map(m => ({ 
        month: m, 
        metrics: monthlyData[m] || null 
      }))
      .filter(h => h.metrics !== null); // Only include months that actually have data
  }, [monthlyData, selectedMonth]);

  const chartData = useMemo(() => {
    return history.map(h => ({
      name: h.month.split("-")[1] + "월",
      매출: Math.round((h.metrics?.generatedRevenue?.total || 0) / 10000), 
      환자: h.metrics?.patientMetrics?.total || 0,
      신환: h.metrics?.patientMetrics?.new || 0,
      비급여: Math.round((h.metrics?.generatedRevenue?.nonCovered || 0) / 10000)
    }));
  }, [history]);

  // 2. Intelligence Calculation
  const latestMonth = history[history.length - 1];
  const prevMonth = history[history.length - 2];

  const totalGrowth = useMemo(() => {
    if (!latestMonth || !prevMonth || !latestMonth.metrics || !prevMonth.metrics) return 0;
    const l = latestMonth.metrics.generatedRevenue.total;
    const p = prevMonth.metrics.generatedRevenue.total;
    return p > 0 ? ((l - p) / p) * 100 : 0;
  }, [latestMonth, prevMonth]);

  const avgEfficiency = useMemo(() => {
    if (history.length === 0) return 0;
    const validMonths = history.filter(h => h.metrics);
    if (validMonths.length === 0) return 0;
    const sum = validMonths.reduce((acc, curr) => 
      acc + ((curr.metrics?.generatedRevenue?.total || 0) / (curr.metrics?.patientMetrics?.total || 1)), 0);
    return Math.round(sum / validMonths.length);
  }, [history]);

  // 3. AI Briefing
  const aiData = useMemo(() => {
    if (!briefing) return null;
    try {
      const jsonMatch = briefing.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : briefing;
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error("JSON Parsing Error:", e);
      return null;
    }
  }, [briefing]);

  const radarData = useMemo(() => {
    if (!aiData?.summary?.healthScores) return [];
    const scores = aiData.summary.healthScores;
    return [
      { subject: '수익성', A: scores.profitability, fullMark: 100 },
      { subject: '안정성', A: scores.stability, fullMark: 100 },
      { subject: '성장성', A: scores.growth, fullMark: 100 },
      { subject: '유입력', A: scores.patientFlow, fullMark: 100 },
      { subject: '효율성', A: scores.efficiency, fullMark: 100 },
    ];
  }, [aiData]);

  useEffect(() => {
    async function fetchBriefing() {
      const validHistory = history.filter(h => h.metrics) as { month: string, metrics: any }[];
      if (validHistory.length > 0) {
        const historyKey = validHistory.map(h => `${h.month}_${h.metrics.generatedRevenue.total}`).join("|");
        const cacheKey = `hanchart_strategic_briefing_${historyKey}`;
        const cached = localStorage.getItem(cacheKey);

        if (cached) {
          setBriefing(cached);
          return;
        }

        setLoading(true);
        try {
          // Pass only the last 12 months for specialized analysis
          const res = await generateStrategicBriefing(validHistory);
          setBriefing(res);
          if (res && !res.includes("Error")) {
            localStorage.setItem(cacheKey, res);
          }
        } catch (e) {
          setBriefing("");
        } finally {
          setLoading(false);
        }
      }
    }
    fetchBriefing();
  }, [history]);

  if (history.length === 0) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-[#0A0E1A] text-white flex flex-col items-center justify-center p-8">
          <div className="text-center max-w-md">
            <Sparkles size={48} className="mx-auto mb-6 text-amber-500 animate-pulse" />
            <h2 className="text-2xl font-black mb-4">분석할 한차트 데이터가 없습니다.</h2>
            <p className="text-slate-500 mb-8 font-light">최근 12개월간의 경영 흐름을 분석하기 위해 한차트 엑셀 파일을 먼저 업로드해 주세요.</p>
            <button 
              onClick={() => router.push("/emr/hanchart")}
              className="px-8 py-4 bg-amber-500 text-[#0A0E1A] rounded-2xl font-black text-sm hover:bg-amber-600 transition-all"
            >
              데이터 업로드하러 가기
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#0A192F] text-white font-sans">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
          
          {/* Header */}
          <div className="mb-12">
            <div className="flex items-center gap-4 mb-6">
              <button 
                onClick={() => router.push("/emr/hanchart")}
                className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-widest">
                  Hanchart Intelligence Center
                </span>
                <div className="h-px w-24 bg-gradient-to-r from-amber-500/20 to-transparent" />
              </div>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-4 leading-tight">
              한차트 AI 경영 분석 <span className="text-[#D4AF37] underline decoration-amber-500/30 underline-offset-8">인텔리전스 센터</span>
            </h1>
            <p className="text-slate-400 text-lg font-light max-w-3xl leading-relaxed">
              최근 12개월간의 한차트 EMR 데이터를 심층 분석하여 <span className="text-white font-medium">{formatMonth(selectedMonth)}</span> 기준 거시적 경영 트렌드와 미래 성장을 위한 핵심 솔루션을 제공합니다.
            </p>
          </div>

          {/* Top Scoreboard Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-[#111B33] rounded-[2.5rem] p-8 border border-white/5 relative overflow-hidden group shadow-2xl">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                <TrendingUp size={120} />
              </div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">12개월 성장 모멘텀</p>
              <div className="flex items-baseline gap-2 mb-4">
                <span className={`text-4xl font-black ${totalGrowth >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {totalGrowth >= 0 ? "+" : ""}{totalGrowth.toFixed(1)}%
                </span>
                <span className="text-slate-500 text-xs font-bold uppercase">전월 대비</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, Math.abs(totalGrowth) * 2)}%` }}
                  className={`h-full ${totalGrowth >= 0 ? "bg-emerald-500" : "bg-rose-500"}`}
                />
              </div>
            </div>

            <div className="bg-[#111B33] rounded-[2.5rem] p-8 border border-white/5 relative overflow-hidden group shadow-2xl">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                <Target size={120} />
              </div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">연간 평균 객단가 (ARPU)</p>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-4xl font-black text-amber-500">
                  {formatNumber(avgEfficiency)}
                </span>
                <span className="text-slate-500 text-xs font-bold uppercase">원 / 명</span>
              </div>
              <div className="flex gap-1">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className={`h-1.5 grow rounded-full ${i <= 4 ? "bg-amber-500" : "bg-slate-800"}`} />
                ))}
              </div>
            </div>

            <div className="bg-[#111B33] rounded-[2.5rem] p-8 border border-white/5 relative overflow-hidden group shadow-2xl">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                <ShieldCheck size={120} />
              </div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">분석 정합성 및 데이터 기간</p>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-4xl font-black text-white">PREMIUM</span>
                <span className="text-slate-500 text-xs font-bold uppercase">{history.length} / 12 Months</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-slate-400 font-bold uppercase">Hanchart Connect Active</span>
              </div>
            </div>
          </div>

          {/* Main Visual Analysis Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            <div className="lg:col-span-2 bg-[#111B33] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
                <div>
                  <h3 className="text-xl font-black text-white">12개월 거시적 경영 트렌드</h3>
                  <p className="text-slate-500 text-xs mt-1">한차트 데이터를 기반으로 한 매출 및 환자 흐름 분석</p>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-[10px] font-bold text-slate-400">매출액(만원)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-bold text-slate-400">환자수</span>
                  </div>
                </div>
              </div>

              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorPat" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis dataKey="name" stroke="#ffffff30" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#ffffff30" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0A0E1A', border: '1px solid #ffffff10', borderRadius: '16px' }} />
                    <Area type="monotone" dataKey="매출" stroke="#D4AF37" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                    <Area type="monotone" dataKey="환자" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorPat)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="bg-gradient-to-br from-amber-600/20 to-[#111B33] border border-amber-500/20 rounded-[2.5rem] p-8 grow group relative overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                  <Rocket size={80} />
                </div>
                <h4 className="text-amber-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <Rocket size={14} /> 한차트 AI 성장 엔진
                </h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-xs">최고 매출 기록</span>
                    <span className="text-sm font-black text-white">{formatNumber(Math.max(...history.map(h => h.metrics?.generatedRevenue?.total || 0)))}원</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-xs">최대 신환 유입</span>
                    <span className="text-sm font-black text-white">{Math.max(...history.map(h => h.metrics?.patientMetrics?.new || 0))}명</span>
                  </div>
                  <div className="h-px bg-white/5" />
                  <p className="text-[11px] text-amber-200/60 leading-relaxed italic">
                    "최근 1년 데이터를 종합해볼 때, 한차트 비급여 항목의 집중도가 수익 안정성에 크게 기여하고 있습니다."
                  </p>
                </div>
              </div>

              <div className="bg-[#111B33] border border-white/5 rounded-[2.5rem] p-8 grow group relative overflow-hidden shadow-xl">
                 <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                  <ShieldAlert size={80} />
                </div>
                <h4 className="text-rose-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <ShieldAlert size={14} /> 운영 최적화 진단
                </h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-xs">매출 변동성</span>
                    <span className="text-sm font-black text-white">±{((Math.max(...chartData.map(d => d.매출)) - Math.min(...chartData.map(d => d.매출))) / (Math.min(...chartData.map(d => d.매출)) || 1) * 10).toFixed(1)}%</span>
                  </div>
                  <div className="h-px bg-white/5" />
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    환자 유입의 계절적 변동에 대비하여 선제적인 마케팅 캠페인 강화가 필요한 시점입니다.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* AI Strategic Situation Room Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            <div className="bg-[#111B33] border border-white/5 rounded-[2.5rem] p-10 relative overflow-hidden group shadow-2xl">
               <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
                 <Activity size={100} />
               </div>
               <div className="relative z-10">
                 <h3 className="text-xl font-black text-white mb-2">경영 건강도 지표</h3>
                 <p className="text-slate-500 text-xs mb-8 uppercase tracking-widest">Yearly Strategic Balance</p>
                 
                 <div className="h-[300px] w-full flex items-center justify-center">
                   {loading ? (
                     <div className="w-12 h-12 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                   ) : radarData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                        <PolarGrid stroke="#ffffff10" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 'bold' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name="Clinic Health" dataKey="A" stroke="#D4AF37" fill="#D4AF37" fillOpacity={0.5} />
                      </RadarChart>
                    </ResponsiveContainer>
                   ) : (
                     <div className="text-slate-600 text-sm">분석 데이터를 기다리는 중...</div>
                   )}
                 </div>
               </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
               <div className="bg-gradient-to-br from-amber-600/20 to-[#111B33] border border-amber-500/30 rounded-[2.5rem] p-10 relative overflow-hidden group h-full flex flex-col shadow-2xl">
                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:rotate-12 transition-transform">
                    <Sparkles size={150} />
                  </div>
                  
                  <div className="relative z-10 flex-grow">
                    <div className="flex items-center gap-3 mb-6">
                      <span className="px-4 py-1.5 rounded-full bg-amber-500 text-[#0A0E1A] text-[10px] font-black uppercase tracking-widest">
                        {aiData?.summary?.statusPill || "Analyzing History"}
                      </span>
                      <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    </div>

                    <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter mb-8 leading-tight">
                      {aiData?.summary?.headline || "한차트 1개년 경영 트렌드를 정밀 분석 중입니다."}
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-auto">
                       {aiData?.executiveInsights?.map((insight: any, idx: number) => (
                         <div key={idx} className="bg-black/40 border border-white/5 rounded-3xl p-6 hover:border-amber-500/30 transition-colors group/card">
                            <div className="flex justify-between items-start mb-3">
                              <h4 className="text-amber-400 font-bold text-sm group-hover/card:text-white transition-colors">{insight.title}</h4>
                              <span className="text-[9px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-md font-bold">{insight.impact} IMPACT</span>
                            </div>
                            <p className="text-slate-400 text-xs leading-relaxed">{insight.content}</p>
                         </div>
                       )) || (
                         <div className="col-span-2 py-12 flex items-center justify-center text-slate-600 italic text-sm">
                            최근 12개월의 핵심 경영 통찰을 도출하고 있습니다...
                         </div>
                       )}
                    </div>
                  </div>
               </div>
            </div>
          </div>

          {/* AI Strategic Briefing Section */}
          <div className="relative group overflow-hidden rounded-[3rem] bg-gradient-to-br from-[#12243D] to-[#0A192F] border border-white/5 shadow-2xl p-12 mb-12">
            <div className="absolute top-0 right-0 p-12 opacity-[0.02] group-hover:scale-110 transition-transform duration-1000">
              <BrainCircuit size={300} />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-12">
                <div className="flex items-center gap-6">
                  <div className="h-16 w-16 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] border border-amber-500/20 shadow-lg shadow-amber-500/5">
                    <BarChart3 size={32} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white tracking-tight">1개년 심층 경영 전략 리포트</h2>
                    <p className="text-slate-500 text-xs font-black uppercase tracking-widest mt-1">Hanchart Advanced Intelligence Narrative</p>
                  </div>
                </div>
              </div>

              <div className="bg-black/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-10 min-h-[400px]">
                {loading ? (
                  <div className="h-full flex flex-col items-center justify-center gap-6 py-20">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                      <Sparkles size={24} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-amber-400 animate-pulse" />
                    </div>
                    <div className="text-center">
                      <p className="text-amber-400 text-lg font-bold animate-pulse">12개월 통합 데이터를 분석 중입니다...</p>
                      <p className="text-slate-600 text-xs mt-2 uppercase tracking-widest font-black">Synthesizing macro economic trends</p>
                    </div>
                  </div>
                ) : (
                  <div className="prose prose-invert prose-amber max-w-none prose-p:text-slate-300 prose-p:leading-relaxed prose-h3:text-amber-400 prose-h3:font-black">
                    <div className="whitespace-pre-wrap text-lg font-light leading-relaxed">
                      {aiData?.detailedAnalysis || "한차트 데이터가 확보되면 AI가 심층 경영 리포트를 생성합니다."}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Plan Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            <div className="lg:col-span-2 relative group overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#111B33] to-[#0A192F] border border-white/5 p-10 h-full flex flex-col shadow-2xl">
               <div className="absolute top-0 right-0 p-10 opacity-[0.05] group-hover:rotate-12 transition-transform">
                  <ClipboardList size={200} />
               </div>
               <div className="relative z-10 flex-grow">
                  <div className="flex items-center gap-4 mb-10">
                    <div className="h-12 w-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                      <ClipboardList size={24} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white">전략적 경영 로드맵</h3>
                      <p className="text-amber-400/60 text-xs font-bold uppercase tracking-widest">12-Month Execution RoadMap</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
                    {aiData?.actionPlan?.map((plan: any, idx: number) => (
                      <div key={idx} className="bg-black/40 border border-white/5 rounded-3xl p-6 hover:bg-amber-500/5 hover:border-amber-500/20 transition-all">
                         <div className="h-10 w-10 rounded-full bg-amber-500 flex items-center justify-center text-xs font-black mb-4 shadow-lg shadow-amber-500/20 text-[#0A0E1A]">
                           {idx + 1}
                         </div>
                         <h4 className="text-white font-bold mb-2 text-sm">{plan.phase}</h4>
                         <p className="text-slate-400 text-[11px] leading-relaxed mb-4">{plan.task}</p>
                         <div className="h-px w-full bg-white/5 mb-3" />
                         <p className="text-emerald-400 text-[10px] font-bold">🎯 {plan.expectedEffect}</p>
                      </div>
                    )) || (
                      <div className="col-span-3 py-12 text-center text-slate-600 italic text-sm font-light">
                        한차트 시계열 분석 후 경영 로드맵이 자동 생성됩니다.
                      </div>
                    )}
                  </div>
               </div>
            </div>

            <div className="bg-[#111B33] border border-white/5 rounded-[2.5rem] overflow-hidden flex flex-col relative group p-8 h-full shadow-2xl">
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-all">
                 <Play size={100} />
               </div>
               <div className="flex items-center gap-4 mb-6 relative z-10">
                  <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                    <Play size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">AI 맞춤 전략 솔루션</h3>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Recommended Content</p>
                  </div>
               </div>
               
               <div className="relative z-10 flex-grow flex flex-col justify-center">
                 {aiData?.recommendedVideoKeyword ? (
                   <div className="space-y-4">
                     <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 mb-4">
                        <p className="text-amber-400 text-[11px] font-bold mb-1">한차트 분석 기반 맞춤형 키워드:</p>
                        <p className="text-white text-sm font-black">"{aiData.recommendedVideoKeyword}"</p>
                     </div>
                     <YoutubeVideoLink 
                       keyword={aiData.recommendedVideoKeyword} 
                       mLabel="AI 경영 솔루션"
                       isUp={true}
                     />
                   </div>
                 ) : (
                   <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                     <div className="w-10 h-10 border-2 border-white/5 border-t-amber-500 rounded-full animate-spin" />
                     <p className="text-slate-600 text-xs italic">최적의 솔루션을 선별하고 있습니다...</p>
                   </div>
                 )}
               </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="text-center p-12 mt-12 border-t border-white/5">
             <p className="text-slate-600 text-xs font-medium tracking-widest uppercase mb-4">Clinic Macro Analysis Engine • Hanchart Specialized Intelligence</p>
          </div>

        </main>
      </div>
    </DashboardLayout>
  );
}

function formatMonth(m: string) {
  if (!m) return "";
  const [y, mm] = m.split("-");
  return `${y}년 ${mm}월`;
}
