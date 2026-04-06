"use client";

import React, { useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useData } from "@/components/DataProvider";
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
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from "framer-motion";

function AnimatedNumber({ value }: { value: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => {
    return new Intl.NumberFormat("ko-KR").format(Math.round(latest));
  });

  useEffect(() => {
    const animation = animate(count, value, { duration: 0.8, ease: "easeOut" });
    return animation.stop;
  }, [value, count]);

  return <motion.span>{rounded}</motion.span>;
}

function AnimatedPercent({ value }: { value: string | null }) {
  if (value === null) return null;
  const numValue = parseFloat(value);
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => latest.toFixed(1));

  useEffect(() => {
    const animation = animate(count, numValue, { duration: 0.8, ease: "easeOut" });
    return animation.stop;
  }, [numValue, count]);

  return <motion.span>{rounded}</motion.span>;
}

function YoutubeVideoLink({ keyword, mLabel, isUp, activeSolution }: { keyword: string, mLabel: string, isUp: boolean, activeSolution: any }) {
  const [video, setVideo] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const { addHistory, isWatched } = useVideoHistory();

  useEffect(() => {
    async function fetchVideo() {
      try {
        setLoading(true);
        const res = await fetch(`/api/youtube?q=${encodeURIComponent(keyword)}`);
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          setVideo(data.items[0]);
        }
      } catch (err) {
        console.error("Failed to fetch youtube", err);
      } finally {
        setLoading(false);
      }
    }
    fetchVideo();
  }, [keyword]);

  if (loading) {
    return <div className="animate-pulse h-16 bg-white/50 border border-zinc-100 rounded-xl w-full"></div>;
  }

  if (!video || !video.id?.videoId) {
    return (
      <a 
        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(keyword)}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => {
          addHistory({
            title: activeSolution.title || `${keyword} 검색`,
            keyword: keyword,
            desc: activeSolution.desc,
            indicator: mLabel
          });
          toast.success("나의 경영 학습 기록에 저장되었습니다.");
        }}
        className={`text-[10px] font-bold px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-sm active:scale-95 hover:-translate-y-[1px] w-fit ${isUp ? "bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-emerald-200" : "bg-primary text-white hover:bg-slate-800 hover:shadow-slate-200"}`}
      >
        <Play size={10} className="fill-white/80" />
        [{keyword}]
        {isWatched(keyword) && <Check size={10} className="text-white/80 ml-1" />}
      </a>
    );
  }

  const videoId = video.id.videoId;
  return (
    <a 
      href={`https://www.youtube.com/watch?v=${videoId}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        addHistory({
          title: video.snippet.title,
          keyword: keyword,
          desc: activeSolution.desc,
          indicator: mLabel,
          id: videoId
        });
        toast.success("나의 경영 학습 기록에 저장되었습니다.");
      }}
      className={`relative overflow-hidden group flex items-center gap-3 p-2 rounded-xl border transition-all hover:-translate-y-[1px] shadow-sm ${isUp ? "bg-white border-emerald-100 hover:border-emerald-300 hover:shadow-emerald-100" : "bg-white border-zinc-200 hover:border-primary/40 hover:shadow-slate-200"}`}
    >
      <div className="relative w-24 h-16 bg-slate-900 rounded-lg overflow-hidden flex-shrink-0">
        <img src={video.snippet.thumbnails?.default?.url || video.snippet.thumbnails?.medium?.url} alt="thumbnail" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
          <Play size={20} className="text-white fill-white shadow-sm" />
        </div>
      </div>
      <div className="flex-1 overflow-hidden pr-2 flex flex-col justify-center">
        <p className={`text-[10px] font-bold mb-1 truncate flex items-center gap-1 ${isUp ? "text-emerald-600" : "text-primary"}`}>
          <Tv size={10} /> AI 추천 영상: [{keyword}]
          {isWatched(keyword) && <Check size={10} className="ml-1" />}
        </p>
        <h4 className="text-[11px] sm:text-xs font-bold text-slate-800 line-clamp-2 group-hover:text-primary transition-colors leading-snug" dangerouslySetInnerHTML={{ __html: video.snippet.title }}></h4>
      </div>
    </a>
  );
}

// Video management moved to VideoHistoryContext logic

// AI Suggestion logic integrated into the component

export default function DetailsPage() {
  const router = useRouter();
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
    { key: "arpu", label: "1인당 평균 객단가", unit: "원", icon: Wallet, color: "text-rose-600", bg: "bg-rose-50" },
    { key: "basicRevenue", label: "보험 매출", unit: "원", icon: ShieldCheck, color: "text-indigo-700", bg: "bg-indigo-50" },
    { key: "patientCount", label: "내원환자수", unit: "명", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { key: "newPatientCount", label: "신규환자수", unit: "명", icon: UserPlus, color: "text-indigo-600", bg: "bg-indigo-50" },
    { key: "autoInsuranceCount", label: "자보환자수", unit: "명", icon: Users, color: "text-orange-600", bg: "bg-orange-50" },
    { key: "industrialAccidentClaim", label: "산재청구액", unit: "원", icon: Briefcase, color: "text-red-600", bg: "bg-red-50" },
    { key: "autoInsuranceClaim", label: "자보청구액", unit: "원", icon: Car, color: "text-blue-700", bg: "bg-blue-50" },
    { key: "totalTreatmentFee", label: "총진료비", unit: "원", icon: BarChart3, color: "text-purple-600", bg: "bg-purple-50" },
    { key: "patientPay", label: "본인부담금", unit: "원", icon: Wallet, color: "text-amber-600", bg: "bg-amber-50" },
    { key: "insuranceClaim", label: "보험청구액", unit: "원", icon: ShieldCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
    { key: "nonBenefit", label: "비급여", unit: "원", icon: TrendingUp, color: "text-cyan-600", bg: "bg-cyan-50" },
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
  const [aiSuggestions, setAiSuggestions] = React.useState<Record<string, any>>({});
  const [loadingSuggestions, setLoadingSuggestions] = React.useState<Record<string, boolean>>({});
  const [youtubeResults, setYoutubeResults] = React.useState<Record<string, any[]>>({});
  const [youtubeLoading, setYoutubeLoading] = React.useState<Record<string, boolean>>({});

  const fetchAISuggestion = async (indicator: string, label: string, isUp: boolean) => {
    const key = `${indicator}-${isUp ? "up" : "down"}`;
    if (aiSuggestions[key] || loadingSuggestions[key]) return;

    setLoadingSuggestions(prev => ({ ...prev, [key]: true }));
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ indicator, label, isUp })
      });
      const data = await res.json();
      setAiSuggestions(prev => ({ ...prev, [key]: data }));
    } catch (error) {
      console.error("AI Suggestion Fetch Fail:", error);
    } finally {
      setLoadingSuggestions(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleWatchVideo = (keyword: string, suggestion: any, indicator: string) => {
    const cleanKeyword = keyword.replace(/#/g, "").trim();
    // Immediate save to localStorage history as a search query session
    addHistory({
      title: suggestion.title,
      keyword: cleanKeyword,
      desc: suggestion.desc,
      indicator
    });
    toast.success("나의 경영 학습 기록에 저장되었습니다.");

    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanKeyword)}`;
    window.open(url, "_blank");
  };

  // Fetch AI Recommendations for the target metrics once data changes
  useEffect(() => {
    if (!compareMonth) return;

    metrics.forEach(m => {
      if (!["basicRevenue", "newPatientCount", "nonBenefit"].includes(m.key)) return;

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
      if (delta) {
        fetchAISuggestion(m.key, m.label, delta.isUp);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, compareMonth, data, compareData]);

  return (
    <main className="min-h-screen bg-[#F2F4F6] pb-20">
      {/* Sticky Header with Selectors */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200 shadow-sm">
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
              <div className="absolute top-full right-0 mt-2 bg-white rounded-2xl shadow-xl border border-zinc-100 p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[60] min-w-[140px]">
                {availableMonths.map(m => (
                  <button key={m} onClick={() => setCompareMonth(m)} className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors ${m === compareMonth ? "bg-zinc-100 text-zinc-900" : "hover:bg-zinc-50 text-zinc-600"}`}>
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
              <div className="absolute top-full right-0 mt-2 bg-white rounded-2xl shadow-xl border border-zinc-100 p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[60] min-w-[140px]">
                {availableMonths.map(m => (
                  <button key={m} onClick={() => setSelectedMonth(m)} className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors ${m === selectedMonth ? "bg-primary text-white" : "hover:bg-zinc-50 text-zinc-600"}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 md:p-12 space-y-12">
        {/* Page Title */}
        <div className="space-y-1">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
            경영 정밀 리포트
          </h1>
          <p className="text-zinc-500 font-medium">
            {compareMonth 
              ? `${formatMonth(compareMonth)}와 ${formatMonth(selectedMonth)}를 비교 분석한 결과입니다.`
              : `${formatMonth(selectedMonth)}의 상세 분석 결과입니다. (비교 데이터 없음)`}
          </p>
        </div>

        {/* Intelligent Summary */}
        <section className="animate-in fade-in slide-in-from-top-4 duration-500">
          {insights ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-white border-none toss-shadow p-6 flex flex-col gap-4 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500 transition-all group-hover:w-2"></div>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                     <Trophy size={20} />
                  </div>
                  <h3 className="font-bold text-zinc-900">최고 상승 지표</h3>
                </div>
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-rose-600">{insights.best.label}</span>
                    <span className="text-base font-bold text-rose-500">
                      ▲<AnimatedPercent value={insights.best.delta?.percent || null} />%
                    </span>
                  </div>
                  <p className="text-sm text-zinc-500 leading-relaxed font-medium">
                    {insights.best.label} 지표가 지난달 대비 가장 큰 폭으로 상승했습니다.
                  </p>
                </div>
              </Card>

              <Card className="bg-white border-none toss-shadow p-6 flex flex-col gap-4 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500 transition-all group-hover:w-2"></div>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                    <AlertTriangle size={20} />
                  </div>
                  <h3 className="font-bold text-zinc-900">최하 하락 지표</h3>
                </div>
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-blue-600">{insights.worst.label}</span>
                    <span className="text-base font-bold text-blue-500">
                      ▼<AnimatedPercent value={Math.abs(parseFloat(insights.worst.delta?.percent || "0")).toString()} />%
                    </span>
                  </div>
                  <p className="text-sm text-zinc-500 leading-relaxed font-medium">
                    {insights.worst.label} 지표가 현재 가장 큰 하락세를 보이고 있습니다.
                  </p>
                </div>
              </Card>
            </div>
          ) : (
            <Card className="p-12 text-center bg-white border-none toss-shadow space-y-2">
              <h4 className="font-bold text-zinc-900 text-lg">데이터 분석 중...</h4>
              <p className="text-zinc-500 text-sm">
                비교 대상월(A)의 데이터를 추가로 등록해 보세요.
              </p>
            </Card>
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

            // Deduplication & Trigger Check
            const delta = getDelta(valB, valA);
            const statusKey = delta?.isUp ? "up" : "down";
            const suggestionKey = `${m.key}-${statusKey}`;
            const activeSolution = aiSuggestions[suggestionKey];
            const isLoading = loadingSuggestions[suggestionKey];

            return (
              <Card 
                key={index} 
                className="flex flex-col h-auto bg-white border border-zinc-100 overflow-hidden toss-shadow group relative"
              >
                {/* Favorite Star at corner */}
                {activeSolution && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(activeSolution.keyword || activeSolution.keywords?.[0]);
                    }}
                    className={`absolute top-4 right-4 z-20 p-2.5 rounded-2xl transition-all duration-300 ${isFavorite(activeSolution.keyword || activeSolution.keywords?.[0]) ? "text-amber-400 bg-amber-50 shadow-[0_0_15px_-3px_rgba(251,191,36,0.3)] scale-110" : "text-zinc-200 hover:text-amber-300 hover:bg-zinc-50"}`}
                  >
                    <Star size={20} fill={isFavorite(activeSolution.keyword || activeSolution.keywords?.[0]) ? "currentColor" : "none"} />
                  </button>
                )}
                
                <div className="flex justify-between items-start pt-6 px-6">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2.5 rounded-2xl ${m.bg} ${m.color} transition-transform group-hover:scale-110 shadow-sm shadow-black/5`}>
                      <m.icon size={18} />
                    </div>
                    <p className="text-zinc-500 text-sm font-bold tracking-tight">{m.label}</p>
                  </div>
                </div>
                
                <div className="space-y-5 px-6 pb-6 mt-4">
                  <div className="space-y-0.5">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                        <AnimatedNumber value={valB} />
                      </span>
                      <span className="text-xs font-bold text-zinc-400">{m.unit}</span>
                      <span className="text-[10px] text-primary font-bold ml-1 px-1.5 py-0.5 bg-primary/5 rounded whitespace-nowrap">
                        ({formatMonth(selectedMonth)})
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-zinc-100 space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-zinc-400">
                          <AnimatedNumber value={valA} />{m.unit}
                        </span>
                        <span className="text-[9px] text-zinc-300 font-medium">({formatMonth(compareMonth)})</span>
                      </div>
                      <AnimatePresence mode="wait">
                        {delta && (
                          <motion.div 
                            key={`${selectedMonth}-${compareMonth}-${m.key}`}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className={`flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${delta.isUp ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600"}`}
                          >
                            {delta.isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            <AnimatedPercent value={delta.percent} />%
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    
                    {/* Warning Message for ARPU */}
                    {m.key === "arpu" && delta && !delta.isUp && (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-500 bg-rose-50 p-2 rounded-xl border border-rose-100 mt-1">
                        <AlertCircle size={12} />
                        환자당 수익성이 낮아지고 있습니다.
                      </div>
                    )}

                    {/* YouTube Solution / AI Praise Section */}
                    {delta && ["basicRevenue", "newPatientCount", "nonBenefit"].includes(m.key) && (
                      <div className={`mt-4 p-4 rounded-2xl border transition-all ${delta.isUp ? "bg-emerald-50/50 border-emerald-100" : "bg-primary/5 border-primary/10"}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className={`flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-tight ${delta.isUp ? "text-emerald-700" : "text-primary"}`}>
                            {delta.isUp ? <Award size={14} /> : <Play size={14} />}
                            {delta.isUp ? "AI SUCCESS TIP" : "AI SOLUTION"}
                          </div>
                        </div>

                        {isLoading ? (
                          <div className="space-y-2 animate-pulse">
                            <div className="h-3 bg-zinc-200 rounded w-3/4"></div>
                            <div className="h-2 bg-zinc-100 rounded w-1/2"></div>
                          </div>
                        ) : activeSolution ? (
                          <>
                            <div className="mb-3 p-3 bg-white/70 rounded-xl border border-white/50">
                              <p className="text-xs font-bold text-slate-900 leading-relaxed">
                                {delta.isUp ? (
                                  <>원장님, 현재 <span className="text-emerald-600 font-extrabold">[{m.label}]</span> 성과가 훌륭합니다! 전문가들의 노하우를 바탕으로 기세를 더욱 올려보세요.</>
                                ) : (
                                  <>원장님, 현재 <span className="text-primary font-extrabold">[{m.label}]</span> 관리가 시급합니다. 전문가들의 실전 노하우를 확인해보세요.</>
                                )}
                              </p>
                            </div>
                            
                            <p className="text-[10px] text-zinc-500 font-medium line-clamp-2 leading-relaxed mb-4">
                              {activeSolution.desc}
                            </p>

                            <div className="flex flex-col gap-2.5">
                              {(activeSolution.keywords || [activeSolution.keyword].filter(Boolean)).map((kw: string, idx: number) => {
                                const cleanKw = kw.replace(/#/g, "").trim();
                                return (
                                  <YoutubeVideoLink 
                                    key={idx}
                                    keyword={cleanKw}
                                    mLabel={m.label}
                                    isUp={delta.isUp}
                                    activeSolution={activeSolution}
                                  />
                                );
                              })}
                            </div>
                          </>
                        ) : (
                          <p className="text-[10px] text-zinc-400 italic">AI가 지표에 맞는 최적의 검색어를 생성합니다.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Watch History List */}
        {watchHistory.length > 0 && (
          <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-slate-900 text-white rounded-2xl shadow-lg ring-4 ring-slate-900/5">
                  <Tv size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">나의 경영 학습 기록</h3>
                  <p className="text-xs text-zinc-400 font-medium mt-0.5">최근 클릭했던 핵심 키워드와 분석 내용이 기록됩니다.</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {watchHistory.map((session, idx) => (
                <Card 
                  key={idx} 
                  className="bg-white p-4 border-zinc-100 toss-shadow flex items-center gap-4 group cursor-pointer relative" 
                  onClick={() => window.open(convertToWatchUrl(session), "_blank")}
                >
                  <div className="relative w-28 h-20 rounded-2xl overflow-hidden bg-slate-900 flex-shrink-0 shadow-sm flex items-center justify-center">
                    <div className="text-white flex flex-col items-center gap-1 group-hover:scale-110 transition-transform">
                      <FileSearch size={24} />
                      <span className="text-[8px] font-bold opacity-50 uppercase">Analysis</span>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play size={20} className="text-white fill-white" />
                    </div>
                  </div>
                  <div className="overflow-hidden pr-6">
                    <p className="text-[10px] font-bold text-primary mb-0.5 flex items-center gap-1">
                      {session.indicator}
                    </p>
                    <h4 className="text-[13px] font-bold text-slate-900 line-clamp-1 group-hover:text-primary transition-colors leading-tight">{session.title}</h4>
                    <p className="text-[9px] text-zinc-400 mt-1 font-medium truncate">키워드: {session.keyword?.replace("#", "")}</p>
                    <p className="text-[9px] text-zinc-400 mt-0.5 font-medium">{new Date(session.date!).toLocaleDateString()} 시청</p>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(session.keyword || "");
                    }}
                    className={`absolute top-2 right-2 p-1.5 rounded-full transition-all ${isFavorite(session.keyword || "") ? "text-amber-400" : "text-zinc-200 hover:text-amber-300"}`}
                  >
                    <Star size={16} fill={isFavorite(session.keyword || "") ? "currentColor" : "none"} />
                  </button>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <Card className="bg-slate-900 text-white border-none p-8 shadow-2xl relative overflow-hidden group">
          <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
            <div className="p-4 bg-white/10 rounded-3xl backdrop-blur-sm">
              <BarChart3 size={32} className="text-blue-300" />
            </div>
            <div className="text-center md:text-left">
              <h3 className="font-bold text-xl leading-tight mb-2">성과 정밀 통합 분석</h3>
              <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">
                분석 결과, {formatMonth(selectedMonth)}의 총 매출은 {data.totalRevenue > (compareData.totalRevenue || 0) ? "상승" : "하락"} 추세에 있습니다.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* YouTube Modal Removed for Direct Link approach */}
    </main>
  );
}
