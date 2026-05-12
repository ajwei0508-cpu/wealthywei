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
  DollarSign,
  ClipboardList,
  Users,
  Search,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useData } from "@/context/DataContext";
import DashboardLayout from "@/components/DashboardLayout";
import { generateStrategicBriefing } from "@/lib/aiService";
import { YoutubeVideoLink } from "@/components/YoutubeVideoLink";
import { useSearchParams } from "next/navigation";
import AnalysisTimer from "@/components/AnalysisTimer";

const formatNumber = (num: number) => {
  return new Intl.NumberFormat("ko-KR").format(num || 0);
};

export default function AiIntelligencePage() {
  const { monthlyData } = useData();
  const searchParams = useSearchParams();
  const emrType = searchParams.get("emr"); // 'hanchart' or 'okchart'
  
  const availableMonths = useMemo(() => {
    return Object.keys(monthlyData).sort();
  }, [monthlyData]);

  const [startMonth, setStartMonth] = useState<string>("");
  const [endMonth, setEndMonth] = useState<string>("");
  const [briefing, setBriefing] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [shouldAnalyze, setShouldAnalyze] = useState(false);

  // Set initial range when data loads
  useEffect(() => {
    if (availableMonths.length > 0) {
      if (!startMonth) setStartMonth(availableMonths[0]);
      if (!endMonth) setEndMonth(availableMonths[availableMonths.length - 1]);
    }
  }, [availableMonths]);

  // 1. Data Aggregation (Filtered by Range & EMR Specificity)
  const history = useMemo(() => {
    const sorted = Object.entries(monthlyData)
      .filter(([month, data]) => {
        // EMR Availability Check
        if (emrType === "hanchart") {
          if (!data.hanchartData || data.hanchartData.length === 0) return false;
        } else if (emrType === "okchart") {
          if (!data.okchartData) return false;
        } else if (emrType === "hanisarang") {
          if (!data.hanisarangData) return false;
        } else if (emrType === "donguibogam") {
          if (!data.donguibogamData) return false;
        }
        
        // Range Filter
        if (startMonth && month < startMonth) return false;
        if (endMonth && month > endMonth) return false;
        
        return true;
      })
      .map(([month, data]) => {
        // Construct EMR-specific metrics to prevent data mixing
        let specificMetrics = { ...data };
        
        if (emrType === "hanchart" && data.hanchartData) {
          const totalRev = data.hanchartData.reduce((acc, curr) => acc + (curr.totalRevenue || 0), 0);
          const nonCovered = data.hanchartData.reduce((acc, curr) => acc + (curr.nonTaxable || 0) + (curr.taxable || 0), 0);
          const totalPat = data.hanchartData.reduce((acc, curr) => acc + parseInt(curr.type.match(/\(\s*(\d+)\s*\)/)?.[1] || "0"), 0);
          const newPat = data.hanchartData.reduce((acc, curr) => acc + (curr.type.startsWith("초진") ? parseInt(curr.type.match(/\(\s*(\d+)\s*\)/)?.[1] || "0") : 0), 0);
          
          specificMetrics.generatedRevenue = {
            ...data.generatedRevenue,
            total: totalRev,
            nonCovered: nonCovered
          };
          specificMetrics.patientMetrics = {
            ...data.patientMetrics,
            total: totalPat,
            new: newPat
          };
        } else if (emrType === "okchart" && data.okchartData) {
          specificMetrics.generatedRevenue = {
            ...data.generatedRevenue,
            total: data.okchartData.totalRevenue || 0,
            nonCovered: data.okchartData.nonCovered || 0
          };
          specificMetrics.patientMetrics = {
            ...data.patientMetrics,
            total: data.okchartData.totalPatients || 0,
            new: data.okchartData.newPatients || 0
          };
        } else if (emrType === "hanisarang" && data.hanisarangData) {
          specificMetrics.generatedRevenue = {
            ...data.generatedRevenue,
            total: data.hanisarangData.totalRevenue || 0,
            nonCovered: data.hanisarangData.nonCovered || 0
          };
          specificMetrics.patientMetrics = {
            ...data.patientMetrics,
            total: data.hanisarangData.totalPatients || 0,
            new: data.hanisarangData.newPatients || 0
          };
        } else if (emrType === "donguibogam" && data.donguibogamData) {
          specificMetrics.generatedRevenue = {
            ...data.generatedRevenue,
            total: data.donguibogamData.totalRevenue || 0,
            nonCovered: data.donguibogamData.nonCovered || 0
          };
          specificMetrics.patientMetrics = {
            ...data.patientMetrics,
            total: (data.donguibogamData.newPatients || 0) + (data.donguibogamData.recurringPatients || 0),
            new: data.donguibogamData.newPatients || 0
          };
        }

        return { month, metrics: specificMetrics };
      })
      .sort((a, b) => a.month.localeCompare(b.month));
    
    return sorted;
  }, [monthlyData, emrType, startMonth, endMonth]);

  const avgEfficiency = useMemo(() => {
    if (history.length === 0) return 0;
    const totalRev = history.reduce((acc, curr) => acc + curr.metrics.generatedRevenue.total, 0);
    const totalPat = history.reduce((acc, curr) => acc + curr.metrics.patientMetrics.total, 0);
    return totalPat > 0 ? Math.round(totalRev / totalPat) : 0;
  }, [history]);

  // AI Briefing Effect (Manual Trigger)
  useEffect(() => {
    async function fetchBriefing() {
      if (history.length === 0 || !shouldAnalyze) return;
      
      const historyKey = history.map(h => `${h.month}_${h.metrics.generatedRevenue.total}`).join("|");
      const cacheKey = `strategic_briefing_${emrType || 'all'}_${historyKey}`;
      
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setBriefing(cached);
        setLoading(false);
        setShouldAnalyze(false);
        return;
      }

      setLoading(true);
      try {
        const res = await generateStrategicBriefing(history, emrType || undefined);
        setBriefing(res);
        if (res && !res.includes("Error")) {
          localStorage.setItem(cacheKey, res);
        }
      } catch (err) {
        console.error("Briefing error:", err);
        setBriefing("데이터를 분석하는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
        setShouldAnalyze(false);
      }
    }

    fetchBriefing();
  }, [history, shouldAnalyze, emrType]);

  const aiData = useMemo(() => {
    if (!briefing) return null;
    try {
      // 1. ```json ... ``` 형태의 마크다운 블록 제거 시도
      let cleanBriefing = briefing.replace(/```json/g, "").replace(/```/g, "").trim();
      
      // 2. 가장 바깥쪽 { } 추출
      const jsonMatch = cleanBriefing.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : cleanBriefing;
      
      return JSON.parse(jsonStr);
    } catch (e) {
      console.warn("AI JSON Parse Error, falling back to raw text:", e);
      return { detailedAnalysis: briefing, actionPlan: [], recommendedVideoKeyword: "" };
    }
  }, [briefing]);

  if (availableMonths.length === 0) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-[#05080F] text-white flex items-center justify-center p-8">
          <div className="text-center space-y-6">
            <div className="relative inline-block">
               <BrainCircuit size={80} className="text-blue-500/20" />
               <Sparkles size={40} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-400 animate-pulse" />
            </div>
            <h2 className="text-3xl font-black">분석할 데이터가 부족합니다.</h2>
            <p className="text-slate-500 max-w-sm mx-auto">한차트나 오케이차트 메뉴에서 월별 매출 통계 엑셀 파일을 먼저 업로드해 주세요.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#05080F] text-white font-sans selection:bg-blue-500/30 overflow-x-hidden">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 pt-28">
          
          {/* Header & Controls */}
          <section className="flex flex-col lg:flex-row items-start justify-between gap-12 mb-20 relative">
            <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none" />
            
            <div className="relative z-10 space-y-6 max-w-3xl">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3"
              >
                <span className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                  <BrainCircuit size={14} className="animate-pulse" /> 
                  AI Management Intelligence
                </span>
              </motion.div>
              
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-6xl md:text-8xl font-black tracking-tight leading-[0.9] text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-slate-500"
              >
                {emrType === 'hanchart' ? '한차트' : emrType === 'okchart' ? '오케이차트' : '통합'} <br/>
                <span className="text-blue-500">인텔리전스</span> 센터
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-slate-400 text-xl font-light leading-relaxed max-w-xl"
              >
                분석을 원하는 기간을 설정하면 AI가 해당 기간의 경영 트렌드와 수익 구조를 정밀 진단합니다.
              </motion.p>
            </div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="relative z-10 w-full lg:w-[400px]"
            >
              <div className="bg-white/[0.03] backdrop-blur-3xl p-8 rounded-[3rem] border border-white/10 shadow-2xl space-y-8">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Start Month</label>
                    <select 
                      value={startMonth} 
                      onChange={(e) => setStartMonth(e.target.value)}
                      className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold text-white focus:border-blue-500/50 transition-all outline-none hover:bg-white/5 cursor-pointer appearance-none"
                    >
                      {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">End Month</label>
                    <select 
                      value={endMonth} 
                      onChange={(e) => setEndMonth(e.target.value)}
                      className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold text-white focus:border-blue-500/50 transition-all outline-none hover:bg-white/5 cursor-pointer appearance-none"
                    >
                      {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                
                <button 
                  onClick={() => {
                    const historyKey = history.map(h => `${h.month}_${h.metrics.generatedRevenue.total}`).join("|");
                    localStorage.removeItem(`strategic_briefing_${emrType || 'all'}_${historyKey}`);
                    setShouldAnalyze(true);
                  }}
                  disabled={loading || history.length === 0}
                  className="w-full group py-6 bg-white text-[#05080F] font-black text-sm rounded-[2rem] transition-all hover:bg-blue-400 hover:scale-[1.02] active:scale-95 disabled:opacity-30 relative overflow-hidden shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                >
                  <div className="relative z-10 flex items-center justify-center gap-3">
                    {loading ? (
                      <RefreshCw size={20} className="animate-spin" />
                    ) : (
                      <Search size={20} className="group-hover:scale-110 transition-transform" />
                    )}
                    {loading ? "분석 중..." : "AI 경영 분석 실행"}
                  </div>
                </button>
              </div>
            </motion.div>
          </section>


          {/* Strategic Analysis Content */}
          <section className="relative">
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-white/[0.02] border border-white/5 rounded-[4rem] p-20 flex flex-col items-center justify-center space-y-8 min-h-[600px]"
                >
                  <div className="relative">
                    <div className="w-24 h-24 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin" />
                    <BrainCircuit size={32} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-400 animate-pulse" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-2xl font-black text-white">AI 전략 데이터 큐레이션</h3>
                    <p className="text-slate-500 font-medium italic">수만 건의 경영 지표를 바탕으로 최적의 전략을 도출하고 있습니다...</p>
                  </div>
                  <AnalysisTimer isLoading={loading} estimatedSeconds={40} />
                </motion.div>
              ) : briefing ? (
                <motion.div 
                  key="content"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-12"
                >
                  {/* Detailed Analysis Card */}
                  <div className="bg-gradient-to-br from-white/[0.05] to-transparent border border-white/10 rounded-[4rem] p-12 lg:p-20 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-20 opacity-[0.02] group-hover:scale-110 transition-transform duration-[3s]">
                      <BrainCircuit size={400} />
                    </div>
                    
                    <div className="relative z-10">
                      <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-16 border-b border-white/5 pb-12">
                        <div className="flex items-center gap-6">
                           <div className="h-20 w-20 rounded-3xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                             <BarChart3 size={40} />
                           </div>
                           <div>
                             <h2 className="text-3xl font-black text-white tracking-tight">심층 경영 전략 브리핑</h2>
                             <p className="text-blue-500/60 text-sm font-black uppercase tracking-[0.3em] mt-1">Full Executive Intelligence</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-4">
                           <div className="text-right hidden md:block">
                             <p className="text-[10px] font-black text-slate-500 uppercase">Analysis Precision</p>
                             <p className="text-sm font-bold text-emerald-400">HIGH FIDELITY</p>
                           </div>
                           <div className="h-12 w-[1px] bg-white/10 hidden md:block" />
                           <ShieldCheck size={32} className="text-blue-500/50" />
                        </div>
                      </div>

                      <div className="prose prose-invert prose-blue max-w-none prose-p:text-slate-300 prose-p:text-lg prose-p:leading-relaxed prose-h3:text-blue-400 prose-h3:text-2xl prose-h3:font-black prose-li:text-slate-400">
                        <div className="whitespace-pre-wrap font-light tracking-wide">
                          {aiData?.detailedAnalysis || briefing}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Plan & Video Recommendation */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Action Plan */}
                    <div className="lg:col-span-2 bg-[#111624]/60 border border-white/5 rounded-[3rem] p-12">
                       <div className="flex items-center gap-4 mb-12">
                          <div className="p-3 bg-white/5 rounded-2xl text-blue-400"><ClipboardList size={24} /></div>
                          <h3 className="text-2xl font-black text-white">AI 전략 실행 로드맵</h3>
                       </div>
                       
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {aiData?.actionPlan?.map((plan: any, idx: number) => (
                            <div key={idx} className="bg-black/40 border border-white/5 rounded-[2rem] p-8 hover:border-blue-500/30 transition-all">
                               <div className="text-4xl font-black text-blue-500/20 mb-4">0{idx + 1}</div>
                               <h4 className="text-white font-bold mb-3">{plan.phase}</h4>
                               <p className="text-slate-500 text-xs leading-relaxed mb-6">{plan.task}</p>
                               <div className="pt-4 border-t border-white/5 text-emerald-400 text-[10px] font-black">🎯 {plan.expectedEffect}</div>
                            </div>
                          )) || <div className="col-span-3 text-slate-600 italic">추가 데이터 로딩 중...</div>}
                       </div>
                    </div>

                    {/* Recommendation Card */}
                    <div className="bg-gradient-to-br from-red-600/20 to-transparent border border-red-500/20 rounded-[3rem] p-10 flex flex-col justify-between">
                       <div>
                         <div className="flex items-center gap-3 mb-8">
                            <div className="p-2 bg-red-500/20 rounded-xl text-red-500"><Play size={20} /></div>
                            <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Recommended Insight</span>
                         </div>
                         <h3 className="text-2xl font-black text-white mb-4 leading-tight">AI가 제안하는 <br/>최적의 솔루션 교육</h3>
                         <p className="text-slate-400 text-sm font-light">분석된 약점 보완을 위해 가장 필요한 전문 강의를 매칭해 드립니다.</p>
                       </div>
                       
                       <div className="mt-8">
                         {aiData?.recommendedVideoKeyword ? (
                           <YoutubeVideoLink keyword={aiData.recommendedVideoKeyword} className="w-full bg-white text-[#05080F] font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white transition-all shadow-xl" />
                         ) : (
                           <div className="text-slate-600 text-xs italic">리포트 분석 완료 후 키워드가 생성됩니다.</div>
                         )}
                       </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white/[0.02] border border-white/5 rounded-[4rem] p-20 text-center space-y-6"
                >
                  <div className="mx-auto w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center text-slate-500">
                    <Target size={40} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-slate-400">데이터 정밀 분석 준비 완료</h3>
                    <p className="text-slate-600 text-sm">상단에서 기간을 설정한 후 'AI 경영 분석 실행' 버튼을 눌러주세요.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </main>
      </div>
    </DashboardLayout>
  );
}
