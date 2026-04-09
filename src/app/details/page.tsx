"use client";

import React, { useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useData } from "@/context/DataContext";
import Card from "@/components/Card";
import { 
  ArrowLeft, 
  Users, 
  UserPlus, 
  Car, 
  CreditCard, 
  Wallet, 
  Receipt, 
  AlertCircle,
  BarChart3,
  TrendingDown,
  ShieldCheck,
  TrendingUp,
  Briefcase,
  ArrowRight,
  Trophy,
  AlertTriangle,
  Calendar, 
  ChevronDown,
  Play,
  X,
  Award,
  CheckCircle2,
  Tv,
  Star,
  Check,
  FileSearch
} from "lucide-react";
import { useVideoHistory } from "@/context/VideoHistoryContext";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { AnimatedNumber, AnimatedPercent } from "@/components/AnimatedNumber";
import { YoutubeVideoLink } from "@/components/YoutubeVideoLink";
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

export default function DetailsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { data, compareData, monthlyData, selectedMonth, compareMonth, setSelectedMonth, setCompareMonth } = useData();

  const availableMonths = useMemo(() => {
    return Object.keys(monthlyData).sort().reverse();
  }, [monthlyData]);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("ko-KR").format(num);
  };

  const formatMonth = (m: string) => {
    if (!m) return "데이터 없음";
    const [year, month] = m.split("-");
    const yearSuffix = year ? `${year.slice(2)}.` : "";
    return `${yearSuffix}${month}월`;
  };

  const getDelta = (current: number, reference: number) => {
    if (!reference || reference === 0) return null;
    const diff = current - reference;
    return {
      percent: ((diff / reference) * 100).toFixed(1),
      isUp: diff >= 0,
      diff
    };
  };

  const metrics = [
    { key: "basicRevenue", label: "보험 매출", unit: "원", icon: ShieldCheck, color: "text-indigo-700", bg: "bg-indigo-50" },
    { key: "nonBenefit", label: "비급여", unit: "원", icon: TrendingUp, color: "text-cyan-600", bg: "bg-cyan-50" },
    { key: "newPatientCount", label: "신규환자수", unit: "명", icon: UserPlus, color: "text-indigo-600", bg: "bg-indigo-50" },
    { key: "totalTreatmentFee", label: "총진료비", unit: "원", icon: BarChart3, color: "text-purple-600", bg: "bg-purple-50" },
    { key: "arpu", label: "1인당 평균 객단가", unit: "원", icon: Wallet, color: "text-rose-600", bg: "bg-rose-50" },
    { key: "patientCount", label: "내원환자수", unit: "명", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { key: "patientPay", label: "본인부담금", unit: "원", icon: Wallet, color: "text-amber-600", bg: "bg-amber-50" },
    { key: "insuranceClaim", label: "보험청구액", unit: "원", icon: ShieldCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
    { key: "autoInsuranceClaim", label: "자보청구액", unit: "원", icon: Car, color: "text-blue-700", bg: "bg-blue-50" },
    { key: "autoInsuranceCount", label: "자보환자수", unit: "명", icon: Users, color: "text-orange-600", bg: "bg-orange-50" },
    { key: "industrialAccidentClaim", label: "산재청구액", unit: "원", icon: Briefcase, color: "text-red-600", bg: "bg-red-50" },
    { key: "accountsReceivable", label: "미수금", unit: "원", icon: AlertCircle, color: "text-rose-600", bg: "bg-rose-50" },
    { key: "cashCollection", label: "현금수납", unit: "원", icon: Receipt, color: "text-zinc-600", bg: "bg-zinc-100" },
    { key: "cardCollection", label: "카드수납", unit: "원", icon: CreditCard, color: "text-blue-500", bg: "bg-blue-50" },
  ];

  // Analysis Insights Logic (Best/Worst)
  const insights = useMemo(() => {
    if (!compareMonth) return null;
    
    const results = metrics.map(m => {
      let valB = 0;
      let valA = 0;

      if (m.key === "basicRevenue") {
        valB = (data.patientPay || 0) + (data.insuranceClaim || 0) + (data.autoInsuranceClaim || 0);
        valA = (compareData.patientPay || 0) + (compareData.insuranceClaim || 0) + (compareData.autoInsuranceClaim || 0);
      } else if (m.key === "arpu") {
        valB = (data.totalRevenue || 0) / Math.max(data.patientCount || 1, 1);
        valA = (compareData.totalRevenue || 0) / Math.max(compareData.patientCount || 1, 1);
      } else {
        valB = (data as any)[m.key] || 0;
        valA = (compareData as any)[m.key] || 0;
      }
      
      const delta = getDelta(valB, valA);
      return { ...m, valB, valA, delta };
    }).filter(r => r.delta !== null);

    if (results.length < 2) return null;

    const sortedByDelta = [...results].sort((a, b) => parseFloat(b.delta!.percent) - parseFloat(a.delta!.percent));
    
    return {
      best: sortedByDelta[0],
      worst: sortedByDelta[sortedByDelta.length - 1],
    };
  }, [data, compareData, compareMonth, metrics]);

  const { watchHistory, addHistory, isWatched, toggleFavorite, isFavorite, convertToWatchUrl } = useVideoHistory();
  const [aiAnalysis, setAiAnalysis] = React.useState<any>(null);
  const [loadingAnalysis, setLoadingAnalysis] = React.useState(false);

  const trendChartData = useMemo(() => {
    return Object.keys(monthlyData)
      .sort()
      .slice(-6)
      .map(month => ({
        name: month.split("-")[1] + "월",
        "총매출": monthlyData[month].totalRevenue || 0,
        rawMonth: month
      }));
  }, [monthlyData]);

  // Calculate Representative Worst Metric among the Top 3 (보험, 비급여, 신규환자)
  const representativeMetric = useMemo(() => {
    if (!compareMonth) return null;
    
    const keyTargets = ["basicRevenue", "newPatientCount", "nonBenefit"];
    const results = metrics
      .filter(m => keyTargets.includes(m.key))
      .map(m => {
        let valB = 0;
        let valA = 0;
        if (m.key === "basicRevenue") {
          valB = (data.patientPay || 0) + (data.insuranceClaim || 0) + (data.autoInsuranceClaim || 0);
          valA = (compareData.patientPay || 0) + (compareData.insuranceClaim || 0) + (compareData.autoInsuranceClaim || 0);
        } else {
          valB = (data as any)[m.key] || 0;
          valA = (compareData as any)[m.key] || 0;
        }
        const delta = getDelta(valB, valA);
        return { ...m, delta };
      })
      .filter(r => r.delta !== null);

    if (results.length === 0) return null;
    
    // Sort by growth rate (percent), ASC (lowest first)
    return results.sort((a, b) => parseFloat(a.delta!.percent) - parseFloat(b.delta!.percent))[0];
  }, [data, compareData, compareMonth, metrics]);

  // Fetch AI Recommendations Batch
  useEffect(() => {
    if (!compareMonth) return;

    const fetchAnalysis = async () => {
      setLoadingAnalysis(true);
      try {
        const targetMetrics = metrics
          .filter(m => ["basicRevenue", "newPatientCount", "nonBenefit"].includes(m.key))
          .map(m => {
            let valB = 0;
            let valA = 0;
            if (m.key === "basicRevenue") {
              valB = (data.patientPay || 0) + (data.insuranceClaim || 0) + (data.autoInsuranceClaim || 0);
              valA = (compareData.patientPay || 0) + (compareData.insuranceClaim || 0) + (compareData.autoInsuranceClaim || 0);
            } else {
              valB = (data as any)[m.key] || 0;
              valA = (compareData as any)[m.key] || 0;
            }
            const delta = getDelta(valB, valA);
            return { 
              id: m.key, 
              label: m.label, 
              isUp: delta ? delta.isUp : true,
              valA,
              valB,
              percent: delta?.percent || "0"
            };
          });

        const res = await fetch("/api/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            metrics: targetMetrics,
            userInfo: {
              name: session?.user?.name,
              email: session?.user?.email
            },
            targetMonth: selectedMonth,
            compareMonth: compareMonth
          })
        });
        const result = await res.json();
        if (result.error) { throw new Error(result.error); }
        setAiAnalysis(result);
      } catch (error) {
        console.error("AI Analysis Fetch Fail:", error);
        setAiAnalysis({
          summary: "현재 인공지능 분석 서버(Gemini)에 인증할 수 없어 임시 분석 결과를 제공합니다. 배포 환경의 API 설정을 확인해주세요.",
          results: {
            "basicRevenue": {
               title: "매출 누수 방지 기초 프로세스",
               keywords: ["병원 매출 올리는 법", "초진 환자 객단가", "상담 동의율 전략"],
               desc: "AI 서버에 연결할 수 없어 임시 가이드라인을 제공합니다. 보험 매출 또는 기초 매출 하락 시 가장 먼저 점검해야 할 대응 전략을 유튜브 영상으로 확인하세요."
            },
            "newPatientCount": {
               title: "신규 환자 유입 채널 점검",
               keywords: ["동네 의원 마케팅", "네이버 플레이스 상위노출"],
               desc: "임시 가이드라인입니다. 신규 환자가 줄어든다면 최우선적으로 원내 마케팅 채널과 플레이스 리뷰를 점검해야 합니다."
            },
            "nonBenefit": {
               title: "비급여 상담 역량 강화",
               keywords: ["치과 비급여 상담", "피부과 실장 상담 기법"],
               desc: "임시 가이드라인입니다. 비급여 항목의 매출 하락은 상담 프로세스나 데스크의 고객 응대 스크립트 점검으로 개선할 수 있습니다."
            }
          }
        });
      } finally {
        setLoadingAnalysis(false);
      }
    };

    fetchAnalysis();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, compareMonth]);

  return (
    <main className="min-h-screen bg-[#F2F4F6] pb-20">
      {/* Sticky Header with Selectors */}
      <header className="sticky top-0 z-50 bg-white/60 backdrop-blur-xl border-b border-white/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-600"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="hidden sm:block">
              <h2 className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">상세 분석 리포트</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">{formatMonth(compareMonth)}</span>
                <span className="text-zinc-300 px-1 font-medium">vs</span>
                <span className="text-sm font-bold text-primary">{formatMonth(selectedMonth)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Base Month A Selector */}
            <div className="relative group">
              <button className="flex items-center gap-1.5 bg-zinc-100 hover:bg-zinc-200 px-3 py-2 rounded-xl text-xs font-bold text-zinc-700 transition-colors border border-zinc-200">
                <Calendar size={14} className="text-zinc-400" />
                <span className="text-[10px] text-zinc-400 mr-0.5 font-bold">A</span>
                {compareMonth || "선택"}
                <ChevronDown size={14} className="text-zinc-300" />
              </button>
              <div className="absolute top-full right-0 mt-2 bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[60] min-w-[140px]">
                {availableMonths.map(m => (
                  <button key={m} onClick={() => setCompareMonth(m)} className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors ${m === compareMonth ? "bg-zinc-100/50 text-zinc-900" : "hover:bg-zinc-50/50 text-zinc-600"}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <ArrowRight size={14} className="text-zinc-300" />

            {/* Target Month B Selector */}
            <div className="relative group">
              <button className="flex items-center gap-1.5 bg-primary/5 hover:bg-primary/10 px-3 py-2 rounded-xl text-xs font-bold text-primary transition-colors border border-primary/20">
                <Calendar size={14} className="text-primary/60" />
                <span className="text-[10px] text-primary/40 mr-0.5 font-bold">B</span>
                {selectedMonth}
                <ChevronDown size={14} className="text-primary/30" />
              </button>
              <div className="absolute top-full right-0 mt-2 bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[60] min-w-[140px]">
                {availableMonths.map(m => (
                  <button key={m} onClick={() => setSelectedMonth(m)} className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors ${m === selectedMonth ? "bg-primary text-white" : "hover:bg-zinc-50/50 text-zinc-600"}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 md:p-12 space-y-12">
        {/* AI Consulting Summary Card */}
        <section className="animate-in fade-in slide-in-from-top-4 duration-700">
          <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border-none p-8 md:p-10 shadow-2xl relative overflow-hidden group rounded-[32px]">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] -mr-32 -mt-32 rounded-full group-hover:bg-primary/30 transition-colors duration-1000"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 blur-[80px] -ml-24 -mb-24 rounded-full"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-8">
              <div className="p-5 bg-white/10 backdrop-blur-md rounded-3xl border border-white/10 shadow-inner">
                <BarChart3 size={40} className="text-primary" />
              </div>
              <div className="space-y-4 flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/20 border border-primary/30 rounded-full">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary-light">AI 실시간 경영 경영진단</span>
                </div>
                <h3 className="font-extrabold text-2xl md:text-3xl tracking-tight leading-tight">
                  원장님, {formatMonth(selectedMonth)}를 위한 <br className="hidden sm:block" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">맞춤 전략 리포트</span>가 생성되었습니다.
                </h3>
                
                {loadingAnalysis ? (
                  <div className="space-y-3 pt-2">
                    <div className="h-4 bg-white/10 rounded-full w-full animate-pulse"></div>
                    <div className="h-4 bg-white/10 rounded-full w-2/3 animate-pulse"></div>
                  </div>
                ) : aiAnalysis?.summary ? (
                  <div className="space-y-6">
                    <p className="text-slate-300 text-base md:text-lg leading-relaxed font-medium max-w-3xl">
                      {aiAnalysis.summary}
                    </p>
                    
                    {/* Representative One Solution Section (Lightweight) */}
                    {representativeMetric && aiAnalysis?.results?.[representativeMetric.key] && (
                      <div className="flex flex-col gap-6 p-6 md:p-8 bg-white/5 border border-white/10 rounded-[32px] backdrop-blur-sm animate-in fade-in zoom-in duration-500">
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                             <div className={`p-2 rounded-xl scale-75 ${representativeMetric.bg} ${representativeMetric.color} shadow-sm`}>
                               <representativeMetric.icon size={16} />
                             </div>
                             <span className="text-sm font-bold text-white/90">위기 진단: {representativeMetric.label} 지표 하락</span>
                          </div>
                          
                          <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl">
                            <p className="text-sm text-rose-200 font-bold leading-relaxed">
                              "매출 분석 결과 [{representativeMetric.label}] 지표가 전월 대비 {Math.abs(parseFloat(representativeMetric.delta?.percent || "0"))}% 하락하며 병원 성장의 병목 현상이 발생하고 있습니다. {aiAnalysis.results[representativeMetric.key].title} 전략을 통한 즉각적인 개선이 필요합니다."
                            </p>
                          </div>

                          <div className="flex flex-col sm:flex-row items-center gap-4">
                            <div className="flex-1">
                              <p className="text-sm text-slate-400 font-medium leading-relaxed">
                                {aiAnalysis.results[representativeMetric.key].desc}
                              </p>
                            </div>
                            
                            <a 
                              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(aiAnalysis.results[representativeMetric.key].keywords?.[0] || representativeMetric.label + " 경영 개선")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white px-6 py-4 rounded-2xl font-extrabold transition-all shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]"
                            >
                              <Play size={18} fill="currentColor" />
                              유튜브에서 솔루션 찾기
                              <ArrowRight size={18} />
                            </a>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm italic">지표 분석 정보를 불러오는 중입니다...</p>
                )}
              </div>
            </div>
          </Card>
        </section>

        {/* Intelligent Summary Cards (Best/Worst) */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {insights ? (
            <>
            <Card className="glass-card p-8 flex flex-col gap-6 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-2 h-full bg-rose-500/80"></div>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                     <Trophy size={24} />
                  </div>
                  <h3 className="font-bold text-zinc-900 text-lg">최고 상승 지표</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold text-slate-900 tracking-tighter">{insights.best.label}</span>
                    <span className="text-xl font-bold text-rose-500">
                      ▲<AnimatedPercent value={insights.best.delta?.percent || null} />%
                    </span>
                  </div>
                  <p className="text-zinc-500 leading-relaxed font-medium">
                    지난달 대비 효율이 가장 좋았던 핵심 지표입니다.
                  </p>
                </div>
              </Card>

              <Card className="glass-card p-8 flex flex-col gap-6 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-2 h-full bg-blue-500/80"></div>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                    <AlertTriangle size={24} />
                  </div>
                  <h3 className="font-bold text-zinc-900 text-lg">집중 개선 지표</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold text-slate-900 tracking-tighter">{insights.worst.label}</span>
                    <span className="text-xl font-bold text-blue-500">
                      ▼<AnimatedPercent value={Math.abs(parseFloat(insights.worst.delta?.percent || "0")).toString()} />%
                    </span>
                  </div>
                  <p className="text-zinc-500 leading-relaxed font-medium">
                    현재 가장 큰 하락세를 보이며 관리가 시급합니다.
                  </p>
                </div>
              </Card>
            </>
          ) : (
            <div className="col-span-full py-12 text-center text-zinc-400 font-bold">비교 데이터를 분석하고 있습니다...</div>
          )}
        </section>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {metrics.map((m, index) => {
            let valB = 0;
            let valA = 0;

            if (m.key === "basicRevenue") {
              valB = (data.patientPay || 0) + (data.insuranceClaim || 0) + (data.autoInsuranceClaim || 0);
              valA = (compareData.patientPay || 0) + (compareData.insuranceClaim || 0) + (compareData.autoInsuranceClaim || 0);
            } else if (m.key === "arpu") {
              valB = (data.totalRevenue || 0) / Math.max(data.patientCount || 1, 1);
              valA = (compareData.totalRevenue || 0) / Math.max(compareData.patientCount || 1, 1);
            } else {
              valB = (data as any)[m.key] || 0;
              valA = (compareData as any)[m.key] || 0;
            }

            const delta = getDelta(valB, valA);
            const activeSolution = aiAnalysis?.results?.[m.key];

            return (
              <Card 
                key={index} 
                className="glass-card flex flex-col h-auto overflow-hidden group relative hover:bg-white/60"
              >
                {activeSolution && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(activeSolution.keywords?.[0] || "");
                    }}
                    className={`absolute top-5 right-5 z-20 p-2.5 rounded-2xl transition-all duration-300 ${isFavorite(activeSolution.keywords?.[0] || "") ? "text-amber-400 bg-amber-50/50 shadow-inner" : "text-zinc-200 hover:text-amber-300 hover:bg-white/50"}`}
                  >
                    <Star size={20} fill={isFavorite(activeSolution.keywords?.[0] || "") ? "currentColor" : "none"} />
                  </button>
                )}
                
                <div className="flex justify-between items-start pt-7 px-7">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-2xl ${m.bg} ${m.color} transition-transform group-hover:scale-110 shadow-sm`}>
                      <m.icon size={20} />
                    </div>
                    <p className="text-zinc-500 text-sm font-bold tracking-tight">{m.label}</p>
                  </div>
                </div>
                
                <div className="space-y-6 px-7 pb-7 mt-5">
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                        <AnimatedNumber value={valB} />
                      </span>
                      <span className="text-xs font-bold text-zinc-400">{m.unit}</span>
                    </div>
                  </div>

                  <div className="pt-5 border-t border-zinc-100/50 space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-zinc-400">
                          전월 <AnimatedNumber value={valA} />{m.unit}
                        </span>
                      </div>
                      <AnimatePresence mode="wait">
                        {delta && (
                          <motion.div 
                            key={`${selectedMonth}-${compareMonth}-${m.key}`}
                            initial={{ opacity: 0, x: 5 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`flex items-center gap-0.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${delta.isUp ? "bg-rose-50/80 text-rose-600" : "bg-blue-50/80 text-blue-600"}`}
                          >
                            {delta.isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            <AnimatedPercent value={delta.percent} />%
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Watch History List */}
        {watchHistory.length > 0 && (
          <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-900 text-white rounded-[20px] shadow-xl">
                  <Tv size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">나의 경영 학습 기록</h3>
                  <p className="text-sm text-zinc-500 font-medium">원장님이 주목하셨던 핵심 경영 컨텐츠입니다.</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {watchHistory.map((session, idx) => (
                <Card 
                  key={idx} 
                  className="glass-card p-5 flex items-center gap-5 group cursor-pointer relative" 
                  onClick={() => window.open(convertToWatchUrl(session), "_blank")}
                >
                  <div className="relative w-32 h-24 rounded-2xl overflow-hidden bg-slate-900 flex-shrink-0 shadow-lg">
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20 group-hover:text-white/40 transition-colors">
                      <FileSearch size={32} />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play size={24} className="text-white fill-white" />
                    </div>
                  </div>
                  <div className="flex-1 overflow-hidden pr-6">
                    <span className="inline-block px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-md mb-2">
                       {session.indicator}
                    </span>
                    <h4 className="text-[14px] font-bold text-slate-900 line-clamp-1 group-hover:text-primary transition-colors">{session.title}</h4>
                    <p className="text-[10px] text-zinc-400 mt-2 font-medium">{new Date(session.date!).toLocaleDateString()} 학습</p>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Comparison Chart */}
        {trendChartData.length > 0 && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Card className="glass-card h-96 p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">전체 매출 성장 추이</h3>
                  <p className="text-sm text-zinc-500 font-medium mt-1">최근 6개월간의 매출 변화를 분석한 트렌드 그래프입니다.</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height="80%">
                <BarChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: "#94a3b8", fontWeight: 600 }} />
                  <YAxis hide />
                  <RechartsTooltip cursor={{ fill: "rgba(0,0,0,0.02)" }} formatter={(value: any) => new Intl.NumberFormat('ko-KR').format(value || 0) + "원"} />
                  <Bar dataKey="총매출" radius={[8, 8, 0, 0]} barSize={40}>
                    {trendChartData.map((entry) => (
                      <Cell key={entry.rawMonth} fill={entry.rawMonth === selectedMonth ? "#3182f6" : (entry.rawMonth === compareMonth ? "#94a3b8" : "#edf2f7")} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </section>
        )}
      </div>
    </main>
  );
}
