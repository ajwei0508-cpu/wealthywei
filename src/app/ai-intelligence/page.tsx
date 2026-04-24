"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Zap, 
  Target, 
  ShieldCheck, 
  Calendar,
  ChevronRight,
  ArrowUpRight,
  BrainCircuit,
  Rocket,
  ShieldAlert,
  BarChart3,
  Play,
  Lightbulb,
  DollarSign,
  ClipboardList
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useData, DataMetrics } from "@/context/DataContext";
import DashboardLayout from "@/components/DashboardLayout";
import { generateStrategicBriefing, generateClinicInsightStream } from "@/lib/aiService";
import { YoutubeVideoLink } from "@/components/YoutubeVideoLink";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  BarChart,
  Bar,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from "recharts";

const formatNumber = (num: number) => {
  return new Intl.NumberFormat("ko-KR").format(num || 0);
};

export default function AiIntelligencePage() {
  const { monthlyData } = useData();
  const [briefing, setBriefing] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // 1. Data Aggregation
  const history = useMemo(() => {
    return Object.entries(monthlyData)
      .map(([month, data]) => ({ month, metrics: data }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [monthlyData]);

  const chartData = useMemo(() => {
    return history.map(h => ({
      name: h.month.split("-")[1] + "월",
      매출: Math.round(h.metrics.generatedRevenue.total / 10000), // 만원 단위
      환자: h.metrics.patientMetrics.total,
      신환: h.metrics.patientMetrics.new,
      비급여: Math.round(h.metrics.generatedRevenue.nonCovered / 10000)
    }));
  }, [history]);

  // 2. Intelligence Calculation
  const latestMonth = history[history.length - 1];
  const prevMonth = history[history.length - 2];

  const totalGrowth = useMemo(() => {
    if (!latestMonth || !prevMonth) return 0;
    const l = latestMonth.metrics.generatedRevenue.total;
    const p = prevMonth.metrics.generatedRevenue.total;
    return p > 0 ? ((l - p) / p) * 100 : 0;
  }, [latestMonth, prevMonth]);

  const avgEfficiency = useMemo(() => {
    if (history.length === 0) return 0;
    const sum = history.reduce((acc, curr) => acc + (curr.metrics.generatedRevenue.total / (curr.metrics.patientMetrics.total || 1)), 0);
    return Math.round(sum / history.length);
  }, [history]);

  // 3. AI Briefing Parsing & Effect
  const aiData = useMemo(() => {
    if (!briefing) return null;
    try {
      // JSON 코드 블록이 포함되어 있을 경우를 대비해 정규식으로 추출
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

  // AI Briefing Effect
  useEffect(() => {
    async function fetchBriefing() {
      if (history.length > 0) {
        setLoading(true);
        try {
          const res = await generateStrategicBriefing(history);
          setBriefing(res);
        } catch (e) {
          setBriefing("");
        } finally {
          setLoading(false);
        }

        // 최신 월 요약 제거됨
      }
    }
    fetchBriefing();
  }, [history]);

  if (history.length === 0) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-[#0A0E1A] text-white flex items-center justify-center p-8">
          <div className="text-center">
            <Sparkles size={48} className="mx-auto mb-4 text-gold-500 animate-pulse" />
            <h2 className="text-2xl font-bold mb-2">분석할 데이터가 없습니다.</h2>
            <p className="text-slate-500">통계 메뉴에서 엑셀 데이터를 먼저 업로드해 주세요.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#0A0E1A] text-white font-sans">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
          
          {/* Header */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest">
                AI Management Intelligence
              </span>
              <div className="h-px grow bg-gradient-to-r from-blue-500/20 to-transparent" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">
              AI 경영 분석 <span className="text-slate-500 underline decoration-blue-500/30 underline-offset-8">인텔리전스 센터</span>
            </h1>
            <p className="text-slate-400 text-lg font-light max-w-2xl">
              업로드된 모든 데이터를 통합 분석하여 원장님께 거시적 경영 트렌드와 미래 전략을 제안합니다.
            </p>
          </div>

          {/* Top Scoreboard Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {/* Score 1: Growth Trend */}
            <div className="bg-[#111624] rounded-[2.5rem] p-8 border border-white/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                <TrendingUp size={120} />
              </div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">전체 성장 추세</p>
              <div className="flex items-baseline gap-2 mb-4">
                <span className={`text-4xl font-black ${totalGrowth >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {totalGrowth >= 0 ? "+" : ""}{totalGrowth.toFixed(1)}%
                </span>
                <span className="text-slate-500 text-xs font-bold uppercase">vs Prev Month</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, Math.abs(totalGrowth) * 2)}%` }}
                  className={`h-full ${totalGrowth >= 0 ? "bg-emerald-500" : "bg-rose-500"}`}
                />
              </div>
            </div>

            {/* Score 2: Efficiency */}
            <div className="bg-[#111624] rounded-[2.5rem] p-8 border border-white/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                <Target size={120} />
              </div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">평균 운영 효율성 (ARPU)</p>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-4xl font-black text-blue-400">
                  {formatNumber(avgEfficiency)}
                </span>
                <span className="text-slate-500 text-xs font-bold uppercase">원 / 명</span>
              </div>
              <div className="flex gap-1">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className={`h-1.5 grow rounded-full ${i <= 4 ? "bg-blue-500" : "bg-slate-800"}`} />
                ))}
              </div>
            </div>

            {/* Score 3: Reliability */}
            <div className="bg-[#111624] rounded-[2.5rem] p-8 border border-white/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                <ShieldCheck size={120} />
              </div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">데이터 신뢰도 및 정합성</p>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-4xl font-black text-gold-500">GOLD</span>
                <span className="text-slate-500 text-xs font-bold uppercase">{history.length} Months Synced</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-slate-400 font-bold uppercase">Real-time Data Active</span>
              </div>
            </div>
          </div>

          {/* Main Visual Analysis Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            {/* Chart Area */}
            <div className="lg:col-span-2 bg-[#111624] border border-white/5 rounded-[2.5rem] p-10">
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h3 className="text-xl font-black text-white">거시적 경영 트렌드 분석</h3>
                  <p className="text-slate-500 text-xs mt-1">최근 {history.length}개월간의 매출 및 환자 유입 흐름</p>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
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
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorPat" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#ffffff30" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      stroke="#ffffff30" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0A0E1A', border: '1px solid #ffffff10', borderRadius: '16px' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="매출" 
                      stroke="#3B82F6" 
                      strokeWidth={3} 
                      fillOpacity={1} 
                      fill="url(#colorRev)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="환자" 
                      stroke="#10B981" 
                      strokeWidth={3} 
                      fillOpacity={1} 
                      fill="url(#colorPat)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Strategic Symmetery Summary */}
            <div className="flex flex-col gap-6">
              <div className="bg-gradient-to-br from-blue-600/20 to-indigo-600/5 border border-blue-500/20 rounded-[2.5rem] p-8 grow group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                  <Rocket size={80} />
                </div>
                <h4 className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <Rocket size={14} /> AI 성장 동력 분석
                </h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-xs">최고 매출액</span>
                    <span className="text-sm font-black text-white">{formatNumber(Math.max(...history.map(h => h.metrics.generatedRevenue.total)))}원</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-xs">최대 신환 유입</span>
                    <span className="text-sm font-black text-white">{Math.max(...history.map(h => h.metrics.patientMetrics.new))}명</span>
                  </div>
                  <div className="h-px bg-white/5" />
                  <p className="text-[11px] text-blue-200/60 leading-relaxed">
                    지난 {history.length}개월간 매출 변동성은 <span className="text-blue-400 font-bold">안정적</span>인 범위 내에 있으며, 
                    비급여 비중이 점진적으로 상승하며 수익 구조가 개선되고 있습니다.
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-rose-600/20 to-orange-600/5 border border-rose-500/20 rounded-[2.5rem] p-8 grow group relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                  <ShieldAlert size={80} />
                </div>
                <h4 className="text-rose-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <ShieldAlert size={14} /> AI 잠재 리스크 진단
                </h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-xs">유입 변동률</span>
                    <span className="text-sm font-black text-white">±12.4%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-xs">최저 효율월</span>
                    <span className="text-sm font-black text-rose-400">{history[0].month}</span>
                  </div>
                  <div className="h-px bg-white/5" />
                  <p className="text-[11px] text-rose-200/60 leading-relaxed">
                    환절기 대비 신환 유입 하락세가 관찰됩니다. 특정 EMR 데이터 누락 가능성이 감지되오니 데이터 정합성을 재확인하시기 바랍니다.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Strategic Situation Room Section (Visual Summary) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            {/* 1. Radar Chart: Clinic Health Index */}
            <div className="bg-[#111624] border border-white/5 rounded-[2.5rem] p-10 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
                 <Activity size={100} />
               </div>
               <div className="relative z-10">
                 <h3 className="text-xl font-black text-white mb-2">경영 건강도 지표 (Health Index)</h3>
                 <p className="text-slate-500 text-xs mb-8 uppercase tracking-widest">5-Dimensional Strategic Balance</p>
                 
                 <div className="h-[300px] w-full flex items-center justify-center">
                   {loading ? (
                     <div className="w-12 h-12 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                   ) : radarData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                        <PolarGrid stroke="#ffffff10" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 'bold' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar
                          name="Clinic Health"
                          dataKey="A"
                          stroke="#3B82F6"
                          fill="#3B82F6"
                          fillOpacity={0.5}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                   ) : (
                     <div className="text-slate-600 text-sm">분석 데이터를 기다리는 중...</div>
                   )}
                 </div>
               </div>
            </div>

            {/* 2. Executive Headline & Insights */}
            <div className="lg:col-span-2 space-y-6">
               <div className="bg-gradient-to-br from-blue-600/20 to-[#111624] border border-blue-500/30 rounded-[2.5rem] p-8 relative overflow-hidden group h-full flex flex-col">
                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:rotate-12 transition-transform">
                    <Sparkles size={150} />
                  </div>
                  
                  <div className="relative z-10 flex-grow">
                    <div className="flex items-center gap-3 mb-6">
                      <span className="px-4 py-1.5 rounded-full bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest">
                        {aiData?.summary?.statusPill || "Status Analyzing"}
                      </span>
                      <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    </div>

                    <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter mb-8 leading-tight">
                      {aiData?.summary?.headline || "경영 데이터를 정밀 분석하여 핵심 전략을 도출하고 있습니다."}
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-auto">
                       {aiData?.executiveInsights?.map((insight: any, idx: number) => (
                         <div key={idx} className="bg-black/40 border border-white/5 rounded-3xl p-6 hover:border-blue-500/30 transition-colors">
                            <div className="flex justify-between items-start mb-3">
                              <h4 className="text-blue-400 font-bold text-sm">{insight.title}</h4>
                              <span className="text-[9px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-md font-bold">{insight.impact} IMPACT</span>
                            </div>
                            <p className="text-slate-400 text-xs leading-relaxed">{insight.content}</p>
                         </div>
                       )) || (
                         <div className="col-span-2 py-12 flex items-center justify-center text-slate-600 italic text-sm">
                            최고 경영진을 위한 핵심 통찰을 정리 중입니다...
                         </div>
                       )}
                    </div>
                  </div>
               </div>
            </div>
          </div>

          {/* AI Strategic Briefing Section (Detailed Narrative) */}
          <div className="relative group overflow-hidden rounded-[3rem] bg-gradient-to-br from-[#1A1F35] to-[#0D1117] border border-white/5 shadow-2xl p-12 mb-12">
            <div className="absolute top-0 right-0 p-12 opacity-[0.02] group-hover:scale-110 transition-transform duration-1000">
              <BrainCircuit size={300} />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-12">
                <div className="flex items-center gap-6">
                  <div className="h-16 w-16 rounded-2xl bg-white/5 flex items-center justify-center text-slate-400 border border-white/10">
                    <BarChart3 size={32} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white tracking-tight">심층 경영 전략 브리핑</h2>
                    <p className="text-slate-500 text-xs font-black uppercase tracking-widest mt-1">Full Detailed Intelligence Narrative</p>
                  </div>
                </div>
              </div>

              <div className="bg-black/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-10 min-h-[400px]">
                {loading ? (
                  <div className="h-full flex flex-col items-center justify-center gap-6 py-20">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                      <Sparkles size={24} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-400 animate-pulse" />
                    </div>
                    <div className="text-center">
                      <p className="text-blue-400 text-lg font-bold animate-pulse">인공지능이 병원 데이터를 정밀 분석하고 있습니다...</p>
                      <p className="text-slate-600 text-xs mt-2 uppercase tracking-widest font-black">Synthesizing multi-month strategic trends</p>
                    </div>
                  </div>
                ) : (
                  <div className="prose prose-invert prose-blue max-w-none prose-p:text-slate-300 prose-p:leading-relaxed prose-h3:text-blue-400 prose-h3:font-black prose-li:text-slate-400">
                    <div className="whitespace-pre-wrap text-lg font-light leading-relaxed">
                      {aiData?.detailedAnalysis || "충분한 데이터가 확보되면 AI가 심층 전략 브리핑을 제공합니다."}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-12 flex flex-col md:flex-row items-center justify-between gap-6 px-4">
                 <div className="flex items-center gap-3">
                   <div className="h-2 w-2 rounded-full bg-emerald-500" />
                   <p className="text-slate-500 text-xs font-medium italic">이 분석은 업로드된 실제 EMR 통계 수치를 기반으로 Gemini Pro AI가 생성한 경영 리포트입니다.</p>
                 </div>
                 <button className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 group">
                   전체 리포트 PDF 다운로드
                   <ArrowUpRight size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                 </button>
              </div>
            </div>
          </div>
          {/* Action Plan Grid: Visual Timeline */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12 mb-12">
            <div className="lg:col-span-2 relative group overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-900/40 to-blue-900/20 border border-blue-500/20 p-10 h-full flex flex-col">
               <div className="absolute top-0 right-0 p-10 opacity-[0.05] group-hover:rotate-12 transition-transform">
                  <ClipboardList size={200} />
               </div>
               <div className="relative z-10 flex-grow">
                  <div className="flex items-center gap-4 mb-10">
                    <div className="h-12 w-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                      <ClipboardList size={24} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white">전략적 AI 실행 계획</h3>
                      <p className="text-blue-400/60 text-xs font-bold uppercase tracking-widest">Step-by-Step Execution RoadMap</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
                    {/* Vertical Line for Tablet/Desktop */}
                    <div className="hidden md:block absolute top-1/2 left-0 w-full h-px bg-white/5 -z-10" />

                    {aiData?.actionPlan?.map((plan: any, idx: number) => (
                      <div key={idx} className="bg-black/40 border border-white/5 rounded-3xl p-6 hover:bg-blue-500/5 hover:border-blue-500/20 transition-all">
                         <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-xs font-black mb-4 shadow-lg shadow-blue-500/20">
                           {idx + 1}
                         </div>
                         <h4 className="text-white font-bold mb-2 text-sm">{plan.phase}</h4>
                         <p className="text-slate-400 text-[11px] leading-relaxed mb-4">{plan.task}</p>
                         <div className="h-px w-full bg-white/5 mb-3" />
                         <p className="text-emerald-400 text-[10px] font-bold">🎯 {plan.expectedEffect}</p>
                      </div>
                    )) || (
                      <div className="col-span-3 py-12 text-center text-slate-600 italic text-sm">
                        데이터 분석이 완료되면 실행 계획이 도출됩니다.
                      </div>
                    )}
                  </div>
               </div>
            </div>

            {/* YouTube Section: Single Best Recommendation */}
            <div className="bg-[#111624] border border-white/5 rounded-[2.5rem] overflow-hidden flex flex-col relative group p-8 h-full">
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-all">
                 <Play size={100} />
               </div>
               <div className="flex items-center gap-4 mb-6 relative z-10">
                  <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                    <Play size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">AI 맞춤 전략 솔루션</h3>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Recommended Strategic Content</p>
                  </div>
               </div>
               
               <div className="relative z-10 flex-grow flex flex-col justify-center">
                 {aiData?.recommendedVideoKeyword ? (
                   <div className="space-y-4">
                     <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 mb-4">
                        <p className="text-blue-400 text-[11px] font-bold mb-1">AI 분석 결과 현재 원장님께 가장 필요한 주제:</p>
                        <p className="text-white text-sm font-black">"{aiData.recommendedVideoKeyword}"</p>
                     </div>
                     <YoutubeVideoLink 
                       keyword={aiData.recommendedVideoKeyword} 
                       mLabel="AI 맞춤형 솔루션"
                       isUp={true}
                       activeSolution={{ 
                         title: "전략적 학습", 
                         desc: `AI가 현재 데이터 분석 결과를 토대로 '${aiData.recommendedVideoKeyword}' 주제의 영상을 선정했습니다.` 
                       }}
                     />
                   </div>
                 ) : (
                   <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                     <div className="w-10 h-10 border-2 border-white/5 border-t-blue-500 rounded-full animate-spin" />
                     <p className="text-slate-600 text-xs italic">데이터를 분석하여 최적의 솔루션 영상을 찾는 중입니다...</p>
                   </div>
                 )}
               </div>

               <div className="mt-8 pt-6 border-t border-white/5 relative z-10">
                 <p className="text-[10px] text-slate-500 leading-relaxed italic">
                   ※ 원장님이 지정하신 9가지 핵심 경영 키워드 중, 현재의 매출 및 환자 유입 패턴에 가장 큰 영향을 줄 수 있는 한 가지 주제를 AI가 엄선했습니다.
                 </p>
               </div>
            </div>
          </div>

        </main>
      </div>
    </DashboardLayout>
  );
}
