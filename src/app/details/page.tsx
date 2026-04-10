"use client";

import React, { useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useData } from "@/context/DataContext";
import Card from "@/components/Card";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Calendar,
  ChevronDown,
  Trash2,
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  UserPlus,
  BarChart3,
  Wallet,
  Users,
  Car,
  Briefcase,
  AlertCircle,
  Receipt,
  CreditCard,
  Trophy,
  AlertTriangle,
  Check
} from "lucide-react";
import { YoutubeVideoLink } from "@/components/YoutubeVideoLink";
import { useVideoHistory } from "@/context/VideoHistoryContext";
import { History, Play, CheckCircle2 } from "lucide-react";

import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { AnimatedNumber, AnimatedPercent } from "@/components/AnimatedNumber";
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
  const { 
    data, 
    compareData, 
    monthlyData, 
    selectedMonth, 
    compareMonth, 
    setSelectedMonth, 
    setCompareMonth,
    deleteMonthlyData
  } = useData();
  const { watchHistory, convertToWatchUrl, removeFromHistory } = useVideoHistory();

  const handleRemoveHistory = (id: string, title: string) => {
    removeFromHistory(id, title);
    toast.success("기록이 삭제되었습니다.");
  };

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

  const metrics = useMemo(() => [
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
  ], []);

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
    
    // 3대 핵심 지표 중 최악 지표 찾기
    const targetKeys = ["basicRevenue", "nonBenefit", "newPatientCount"];
    const targetResults = results.filter(r => targetKeys.includes(r.key));
    const sortedTarget = [...targetResults].sort((a, b) => parseFloat(a.delta!.percent) - parseFloat(b.delta!.percent));
    const worstTargetThree = sortedTarget.length > 0 && parseFloat(sortedTarget[0].delta!.percent) < 0 ? sortedTarget[0] : null;

    return {
      best: sortedByDelta[0],
      worst: sortedByDelta[sortedByDelta.length - 1],
      worstTargetThree
    };
  }, [data, compareData, compareMonth, metrics]);

  const [aiAnalysis, setAiAnalysis] = React.useState<any>(null);
  const [loadingAnalysis, setLoadingAnalysis] = React.useState(false);

  // 맞춤 전문 키워드 맵 (사용자 요청 반영)
  const expertKeywords = useMemo(() => ({
    basicRevenue: ["친절한 고객 응대 말투", "리더의 조직 관리 대화법", "성공 사업가 마인드셋"],
    newPatientCount: ["고객 유입 마케팅 공식", "입소문 마케팅 비결", "브랜딩 차별화 전략"],
    nonBenefit: ["1등 상담 화법", "클로징 성공 기술", "고객 심리 공략"]
  }), []);

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

  // Fetch AI Recommendations Batch
  useEffect(() => {
    if (!compareMonth) return;

    const fetchAnalysis = async () => {
      setLoadingAnalysis(true);
      try {
        const targetMetrics = metrics
          .map(m => {
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
            compareMonth: compareMonth,
            expertKeywords: expertKeywords
          })
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.details || errorData.error || `서버 에러 (${res.status})`);
        }
        
        const result = await res.json();
        setAiAnalysis(result);
      } catch (error: any) {
        console.error("🔥 AI 분석 데이터 로드 실패:", error);
        toast.error(`AI 분석 실패: ${error.message}`, { id: "ai-error" });
        
        setAiAnalysis({
          strategicReport: {
            risks: ["현재 인공지능 분석 서버(Gemini)에 인증할 수 없습니다.", "배포 환경의 API 설정을 확인해주세요."],
            improvements: ["네트워크 상태를 확인해 주세요.", "데이터를 다시 불러와 주시기 바랍니다."],
            solutions: ["임시 분석 결과를 아래 솔루션 탭에서 확인하실 수 있습니다."]
          },
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
              keywords: ["병원 비급여 상담", "피부과 실장 상담 기법"],
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
    <DashboardLayout>
      <main className="min-h-screen pb-20">
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-zinc-100">
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
            <div className="relative group">
              <button className="flex items-center gap-1.5 bg-zinc-100 hover:bg-zinc-200 px-3 py-2 rounded-xl text-xs font-bold text-zinc-700 transition-colors border border-zinc-200">
                <Calendar size={14} className="text-zinc-400" />
                <span className="text-[10px] text-zinc-400 mr-0.5 font-bold">A</span>
                {compareMonth || "선택"}
                <ChevronDown size={14} className="text-zinc-300" />
              </button>
              <div className="absolute top-full right-0 mt-2 bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[60] min-w-[160px]">
                {availableMonths.map(m => (
                  <div key={m} className="flex items-center gap-1 group/item">
                    <button 
                      onClick={() => setCompareMonth(m)} 
                      className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors ${m === compareMonth ? "bg-zinc-100/50 text-zinc-900" : "hover:bg-zinc-50/50 text-zinc-600"}`}
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

            <ArrowRight size={14} className="text-zinc-300" />

            <div className="relative group">
              <button className="flex items-center gap-1.5 bg-primary/5 hover:bg-primary/10 px-3 py-2 rounded-xl text-xs font-bold text-primary transition-colors border border-primary/20">
                <Calendar size={14} className="text-primary/60" />
                <span className="text-[10px] text-primary/40 mr-0.5 font-bold">B</span>
                {selectedMonth}
                <ChevronDown size={14} className="text-primary/30" />
              </button>
              <div className="absolute top-full right-0 mt-2 bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[60] min-w-[160px]">
                {availableMonths.map(m => (
                  <div key={m} className="flex items-center gap-1 group/item">
                    <button 
                      onClick={() => setSelectedMonth(m)} 
                      className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors ${m === selectedMonth ? "bg-primary text-white" : "hover:bg-zinc-50/50 text-zinc-600"}`}
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
      </header>

      <div className="max-w-7xl mx-auto p-6 md:p-12 space-y-12">
        {/* AI Consulting Summary Card - 고도화 버전 */}
        <section className="animate-in fade-in slide-in-from-top-4 duration-700">
          <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border-none p-8 md:p-12 shadow-2xl relative overflow-hidden group rounded-[40px]">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 blur-[120px] -mr-48 -mt-48 rounded-full group-hover:bg-primary/20 transition-colors duration-1000"></div>
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-500/10 blur-[100px] -ml-36 -mb-36 rounded-full"></div>

            <div className="relative z-10 space-y-10">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-primary/20 border border-primary/30 rounded-full">
                    <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#9ec5ff]">AI Strategic Insights</span>
                  </div>
                  <h3 className="font-black text-3xl md:text-4xl tracking-tight leading-tight">
                    {formatMonth(selectedMonth)} <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">맞춤 전략 경영 리포트</span>
                  </h3>
                </div>
                <div className="p-6 bg-white/10 backdrop-blur-xl rounded-[32px] border border-white/20 shadow-2xl">
                  <BarChart3 size={44} className="text-primary" />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
                <div className="lg:col-span-3 space-y-6">
                  {loadingAnalysis ? (
                    <div className="space-y-4 pt-2">
                      <div className="h-5 bg-white/10 rounded-full w-full animate-pulse"></div>
                      <div className="h-5 bg-white/10 rounded-full w-5/6 animate-pulse"></div>
                      <div className="h-5 bg-white/10 rounded-full w-4/6 animate-pulse"></div>
                    </div>
                  ) : aiAnalysis?.strategicReport ? (
                    <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-3 p-6 bg-white/5 backdrop-blur-sm border border-white/5 rounded-[32px] hover:bg-white/10 transition-colors">
                        <h4 className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                          <AlertTriangle size={16} /> 위험요소 분석
                        </h4>
                        <ul className="space-y-2">
                          {aiAnalysis.strategicReport.risks.map((item: string, idx: number) => (
                            <li key={idx} className="text-slate-200 text-sm md:text-base leading-relaxed flex items-start gap-2">
                              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full mt-2 shrink-0"></span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="space-y-3 p-6 bg-white/5 backdrop-blur-sm border border-white/5 rounded-[32px] hover:bg-white/10 transition-colors">
                        <h4 className="flex items-center gap-2 text-primary font-bold text-sm">
                          <TrendingUp size={16} /> 실질 개선 항목
                        </h4>
                        <ul className="space-y-2">
                          {aiAnalysis.strategicReport.improvements.map((item: string, idx: number) => (
                            <li key={idx} className="text-slate-200 text-sm md:text-base leading-relaxed flex items-start gap-2">
                              <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 shrink-0"></span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="space-y-3 p-6 bg-white/5 backdrop-blur-sm border border-white/5 rounded-[32px] hover:bg-white/10 transition-colors">
                        <h4 className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                          <Check size={16} /> 실무 경영 해결책
                        </h4>
                        <ul className="space-y-2">
                          {aiAnalysis.strategicReport.solutions.map((item: string, idx: number) => (
                            <li key={idx} className="text-slate-200 text-sm md:text-base leading-relaxed flex items-start gap-2">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 shrink-0"></span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-400 text-lg italic animate-pulse">데이터를 정밀하게 분석하고 있습니다...</p>
                  )}
                </div>

                <div className="lg:col-span-2 space-y-6">
                  <h4 className="text-sm font-bold text-primary/80 flex items-center gap-2">
                    <Play size={16} fill="currentColor" /> 핵심 액션 가이드 (추천 영상)
                  </h4>
                  <div className="grid grid-cols-1 gap-4">
                    {(() => {
                      // 가장 하락한 단 하나의 지표에 대해서만 유튜브 추천 노출
                      const worstKey = insights?.worstTargetThree?.key;
                      if (!worstKey) return <p className="text-zinc-500 text-xs italic">현재 특별히 관리가 필요한 하락 지표가 없습니다.</p>;

                      const metric = metrics.find(m => m.key === worstKey);
                      if (!metric) return null;

                      // AI가 추천한 키워드가 있으면 우선 사용, 없으면 설정된 키워드 사용
                      const aiResult = aiAnalysis?.results?.[worstKey];
                      const keywords = (aiResult?.keywords && aiResult.keywords.length > 0) 
                        ? aiResult.keywords 
                        : expertKeywords[worstKey as keyof typeof expertKeywords];
                      
                      const searchKeyword = keywords[0]; // 단 하나의 핵심 키워드만 사용

                      return (
                        <div className="bg-white/5 border border-white/10 p-5 rounded-3xl hover:bg-white/10 transition-all group/yt">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[11px] font-bold text-zinc-400">{metric.label} 솔루션</span>
                          </div>
                          <YoutubeVideoLink 
                            keyword={searchKeyword} 
                            mLabel={metric.label} 
                            isUp={false} 
                            activeSolution={{ 
                              title: aiResult?.title || `${metric.label} 경영 솔루션`,
                              desc: aiResult?.desc || "전문가가 제안하는 최적의 대응 방안을 영상으로 확인하세요."
                            }}
                          />
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* Intelligent Summary Cards (Best/Worst) */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {insights ? (
            <React.Fragment>
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
            </React.Fragment>
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

            return (
              <Card
                key={index}
                className="glass-card flex flex-col h-auto overflow-hidden group relative hover:bg-white/60"
              >
                <div className="flex justify-between items-start pt-7 px-7">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-2xl ${m.bg} ${m.color} transition-transform group-hover:scale-110 shadow-sm`}>
                      <m.icon size={20} />
                    </div>
                    <p className="text-zinc-500 text-sm font-bold tracking-tight">[{formatMonth(selectedMonth)}] {m.label}</p>
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
                          {formatMonth(compareMonth)} <AnimatedNumber value={valA} />{m.unit}
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

                    {/* 지표 카드 내부 유튜브 링크는 제거 (메인 리포트 카드로 통합 완료) */}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

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
                  <RechartsTooltip cursor={{ fill: "rgba(0,0,0,0.02)" }} formatter={(value: any) => formatNumber(value || 0) + "원"} />
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

        {/* Watch History Section */}
        <section className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <Card className="glass-card p-10 mt-12 mb-20 shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-3xl -mr-32 -mt-32 rounded-full"></div>
            <div className="flex items-center gap-4 mb-10 relative z-10">
              <div className="p-4 bg-primary/10 text-primary rounded-2xl shadow-inner">
                <History size={28} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight underline decoration-primary/20 decoration-8 underline-offset-[-2px]">시청 교육 영상 기록</h3>
                <p className="text-sm text-zinc-500 font-medium mt-1">원장님께서 시청하신 병원 경영 솔루션 영상들입니다.</p>
              </div>
            </div>

            {watchHistory.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
                {watchHistory.slice(0, 8).map((video, idx) => (
                  <div key={idx} className="relative group">
                    <button
                      onClick={() => window.open(convertToWatchUrl(video), "_blank")}
                      className="w-full text-left space-y-4 p-6 rounded-[32px] border border-zinc-100 hover:border-primary/40 hover:bg-primary/[0.02] transition-all hover:shadow-xl hover:-translate-y-1 duration-300 bg-white"
                    >
                      <div className="flex items-start justify-between">
                        <div className="p-3 bg-zinc-100 text-zinc-500 rounded-2xl group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                          <Play size={18} fill="currentColor" />
                        </div>
                        <span className="text-[10px] font-black text-primary bg-primary/5 border border-primary/10 px-2.5 py-0.5 rounded-full">
                          {video.indicator}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 group-hover:text-primary transition-colors line-clamp-2 leading-snug text-sm">
                          {video.title}
                        </h4>
                        {video.date && (
                          <div className="flex items-center justify-between mt-4">
                            <p className="text-[10px] text-zinc-400 font-bold flex items-center gap-1">
                              <CheckCircle2 size={10} className="text-emerald-500" /> 시청 완료
                            </p>
                            <span className="text-[9px] text-zinc-300 font-medium">{new Date(video.date).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("이 시청 기록을 삭제할까요?")) {
                          handleRemoveHistory(video.id || "", video.title);
                        }
                      }}
                      className="absolute -top-2 -right-2 p-2 bg-white text-zinc-300 hover:text-rose-500 rounded-full shadow-lg border border-zinc-100 opacity-0 group-hover:opacity-100 transition-all z-20"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-24 text-center bg-zinc-50/50 rounded-[48px] border-2 border-dashed border-zinc-200 relative z-10">
                <div className="max-w-xs mx-auto space-y-4">
                  <div className="mx-auto w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-300">
                    <History size={32} />
                  </div>
                  <p className="text-zinc-400 font-bold">아직 시청하신 영상 기록이 없습니다.</p>
                </div>
              </div>
            )}
          </Card>
        </section>
        </div>
      </main>
    </DashboardLayout>
  );
}
