"use client";

import React, { useMemo, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useData, DataMetrics, initialDataMetrics } from "@/context/DataContext";
import Card from "@/components/Card";
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

interface FlatMetrics {
  basicRevenue: number;
  nonBenefit: number;
  newPatientCount: number;
  totalTreatmentFee: number;
  arpu: number;
  patientCount: number;
  patientPay: number;
  insuranceClaim: number;
  autoInsuranceClaim: number;
  autoInsuranceCount: number;
  industrialAccidentClaim: number;
  accountsReceivable: number;
  cashCollection: number;
  cardCollection: number;
  totalRevenue: number;
}

const getFlatMetrics = (dm: DataMetrics | null | undefined): FlatMetrics => {
  const fallback: FlatMetrics = {
    basicRevenue: 0,
    nonBenefit: 0,
    newPatientCount: 0,
    totalTreatmentFee: 0,
    arpu: 0,
    patientCount: 0,
    patientPay: 0,
    insuranceClaim: 0,
    autoInsuranceClaim: 0,
    autoInsuranceCount: 0,
    industrialAccidentClaim: 0,
    accountsReceivable: 0,
    cashCollection: 0,
    cardCollection: 0,
    totalRevenue: 0
  };
  if (!dm) return fallback;
  const rev = dm.generatedRevenue || {};
  const pat = dm.patientMetrics || {};
  const leak = dm.leakage || {};
  const pm = dm.paymentMethods || {};
  
  const totalRevenue = rev.total || 0;
  const patientCount = pat.total || 0;

  return {
    basicRevenue: (rev.copay || 0) + (rev.insurance || 0) + (rev.auto || 0),
    nonBenefit: rev.nonCovered || 0,
    newPatientCount: pat.new || 0,
    totalTreatmentFee: totalRevenue,
    arpu: totalRevenue / Math.max(patientCount || 1, 1),
    patientCount: patientCount,
    patientPay: rev.copay || 0,
    insuranceClaim: rev.insurance || 0,
    autoInsuranceClaim: rev.auto || 0,
    autoInsuranceCount: pat.auto || 0,
    industrialAccidentClaim: rev.worker || 0,
    accountsReceivable: leak.receivables || 0,
    cashCollection: pm.cash || 0,
    cardCollection: pm.card || 0,
    totalRevenue: totalRevenue
  };
};

export default function MasterUserDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const decodedEmail = params?.email ? decodeURIComponent(params.email as string) : "";
  const [monthlyData, setMonthlyData] = React.useState<Record<string, DataMetrics>>({});
  const [selectedMonth, setSelectedMonth] = React.useState<string>("");
  const [compareMonth, setCompareMonth] = React.useState<string>("");
  const [multiCompareMonths, setMultiCompareMonths] = React.useState<string[]>([]);
  const [dataLoaded, setDataLoaded] = React.useState(false);
  const [aiAnalysis, setAiAnalysis] = React.useState<any>(null);
  const [loadingAnalysis, setLoadingAnalysis] = React.useState(false);
  const { watchHistory, convertToWatchUrl, removeFromHistory } = useVideoHistory();

  const handleRemoveHistory = (id: string, title: string) => {
    removeFromHistory(id, title);
    toast.success("기록이 삭제되었습니다.");
  };

  useEffect(() => {
    if (status === "unauthenticated" || (status === "authenticated" && session?.user?.email !== "wei0508@naver.com")) {
      router.push("/");
    }
  }, [session, status, router]);

  const fetchUserData = async () => {
    try {
      // 서버사이드 API를 통해 service_role로 특정 사용자 데이터 조회 (RLS 우회)
      const res = await fetch(`/api/master-data?email=${encodeURIComponent(decodedEmail)}`);
      if (!res.ok) throw new Error("API 오류");
      const { data: dbData } = await res.json();

      if (dbData && dbData.length > 0) {
        const transformed: Record<string, DataMetrics> = {};
        dbData.forEach((row: any) => {
          transformed[row.month] = row.metrics;
        });
        setMonthlyData(transformed);

        const months = Object.keys(transformed).sort();
        if (months.length > 0) {
          const latest = months[months.length - 1];
          const secondLatest = months.length > 1 ? months[months.length - 2] : latest;
          setSelectedMonth(latest);
          setCompareMonth(secondLatest);
        }
      } else {
        setMonthlyData({});
      }
    } catch (e) {
      console.error("Master user detail fetch fail:", e);
    } finally {
      setDataLoaded(true);
    }
  };

  useEffect(() => {
    if (session?.user?.email === "wei0508@naver.com") {
      fetchUserData();
    }
  }, [decodedEmail, session]);

  const handleDeleteData = async (month: string) => {
    if (!confirm(`관리자 권한으로 ${decodedEmail} 사용자의 ${month} 데이터를 영구 삭제하시겠습니까?`)) return;

    try {
      const res = await fetch("/api/delete-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: decodedEmail,
          month: month
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "삭제 실패");
      }

      toast.success("데이터가 삭제되었습니다.");
      fetchUserData(); // Refresh data
    } catch (e: any) {
      toast.error(e.message || "삭제 처리 중 오류 발생");
    }
  };

  const rawData = monthlyData[selectedMonth] || initialDataMetrics;
  const rawCompareData = monthlyData[compareMonth] || initialDataMetrics;

  const data = getFlatMetrics(rawData);
  const compareData = getFlatMetrics(rawCompareData);

  const availableMonths = useMemo(() => {
    return Object.keys(monthlyData || {}).sort().reverse();
  }, [monthlyData]);

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

  const getDelta = (current: number, reference: number) => {
    if (!reference || reference === 0) return null;
    const diff = current - reference;
    return {
      percent: ((diff / reference) * 100).toFixed(1),
      isUp: diff >= 0,
      diff
    };
  };

  // Analysis Insights Logic (Best/Worst)
  const insights = useMemo(() => {
    if (!compareMonth || !data || !compareData) return null;

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

  // 맞춤 전문 키워드 맵 (사용자 요청 반영)
  const expertKeywords = useMemo(() => ({
    basicRevenue: ["친절한 고객 응대 말투", "리더의 조직 관리 대화법", "성공 사업가 마인드셋"],
    newPatientCount: ["고객 유입 마케팅 공식", "입소문 마케팅 비결", "브랜딩 차별화 전략"],
    nonBenefit: ["1등 상담 화법", "클로징 성공 기술", "고객 심리 공략"]
  }), []);

  const trendChartData = useMemo(() => {
    const sortedMonths = Object.keys(monthlyData || {}).sort();
    
    // Find index of start (compareMonth) and end (selectedMonth)
    const startIndex = sortedMonths.indexOf(compareMonth);
    const endIndex = sortedMonths.indexOf(selectedMonth);

    let filtered = sortedMonths;
    if (startIndex !== -1 && endIndex !== -1) {
      const start = Math.min(startIndex, endIndex);
      const end = Math.max(startIndex, endIndex);
      filtered = sortedMonths.slice(start, end + 1);
    } else {
      filtered = sortedMonths.slice(-6); // fallback to last 6 months
    }

    return filtered.map(month => ({
      name: month.split("-")[1] + "월",
      "총매출": getFlatMetrics(monthlyData[month])?.totalRevenue || 0,
      rawMonth: month
    }));
  }, [monthlyData, compareMonth, selectedMonth]);

  // Calculate Representative Worst Metric among the Top 3 (보험, 비급여, 신규환자)
  const representativeMetric = useMemo(() => {
    if (!compareMonth || !data || !compareData) return null;

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
    if (!compareMonth || !data || !compareData) return;

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
        const result = await res.json();
        if (result.error) { throw new Error(result.error); }
        setAiAnalysis(result);
      } catch (error) {
        console.error("AI Analysis Fetch Fail:", error);
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
              desc: "임시 가이드라인입니다. 비급여 항목의 매출 하락은 상담 프로세스나 데스크의 고객 응대 스크립점검으로 개선할 수 있습니다."
            }
          }
        });
      } finally {
        setLoadingAnalysis(false);
      }
    };

    fetchAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, compareMonth, data, compareData]);

  if (!dataLoaded) {
    return (
      <div className="min-h-screen bg-[#F2F4F6] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("ko-KR").format(num);
  };

  const formatMonth = (m: string) => {
    if (!m) return "데이터 없음";
    const [year, month] = m.split("-");
    const yearSuffix = year ? `${year.slice(2)}.` : "";
    return `${yearSuffix}${month}월`;
  };

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
              <h2 className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">[{decodedEmail}] 분석 리포트</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">{formatMonth(compareMonth)}</span>
                <span className="text-zinc-400 font-bold">~</span>
                <span className="text-sm font-extrabold text-primary bg-primary/5 px-2 py-0.5 rounded-lg border border-primary/10">{formatMonth(selectedMonth)}</span>
                <span className="text-xs font-bold text-zinc-400 ml-1">상세 분석 기간</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Start Month Selector */}
            <div className="relative group">
              <button className="flex items-center gap-1.5 bg-zinc-100 hover:bg-zinc-200 px-3 py-2 rounded-xl text-xs font-bold text-zinc-700 transition-colors border border-zinc-200 shadow-sm">
                <Calendar size={14} className="text-zinc-400" />
                <span className="text-[10px] text-zinc-400 mr-0.5 font-black uppercase">시작월</span>
                {compareMonth || "선택"}
                <ChevronDown size={14} className="text-zinc-300" />
              </button>
              <div className="absolute top-full right-0 mt-2 bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[60] min-w-[160px]">
                {availableMonths.map(m => (
                  <div key={m} className="flex items-center gap-1 group/item">
                    <button 
                      onClick={() => setCompareMonth(m)} 
                      className={`flex-1 text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors ${m === compareMonth ? "bg-zinc-100/50 text-zinc-900 font-black" : "hover:bg-zinc-50/50 text-zinc-600"}`}
                    >
                      {formatMonth(m)}
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteData(m);
                      }}
                      className="p-2 text-zinc-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover/item:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <span className="text-zinc-400 font-bold">~</span>

            {/* End Month Selector */}
            <div className="relative group">
              <button className="flex items-center gap-1.5 bg-primary/5 hover:bg-primary/10 px-3 py-2 rounded-xl text-xs font-bold text-primary transition-colors border border-primary/20 shadow-sm">
                <Calendar size={14} className="text-primary/60" />
                <span className="text-[10px] text-primary/40 mr-0.5 font-black uppercase">종료월</span>
                {selectedMonth}
                <ChevronDown size={14} className="text-primary/30" />
              </button>
              <div className="absolute top-full right-0 mt-2 bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[60] min-w-[160px]">
                {availableMonths.map(m => (
                  <div key={m} className="flex items-center gap-1 group/item">
                    <button 
                      onClick={() => setSelectedMonth(m)} 
                      className={`flex-1 text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors ${m === selectedMonth ? "bg-primary text-white font-black" : "hover:bg-zinc-50/50 text-zinc-600"}`}
                    >
                      {formatMonth(m)}
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteData(m);
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

        {/* ======================================================== */}
        {/* 🌟 PREMIUM MANAGEMENT DIAGNOSTICS SECTIONS (5 IDEAS) 🌟 */}
        {/* ======================================================== */}

        {/* 1. 월별 매출 히트맵 (GitHub-Style Heatmap) */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Card className="glass-card p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">📅 월별 매출 성장 격자 (히트맵)</h3>
                <p className="text-xs text-zinc-500 font-medium mt-1">
                  매출 규모에 따라 색상이 다르게 표현되는 격자입니다. 각 격자를 선택하여 분석월로 설정할 수 있습니다.
                </p>
              </div>
              <span className="text-[10px] font-black text-rose-500 bg-rose-50 border border-rose-100 px-2 py-1 rounded-md">매출 강도 분석</span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
              {(() => {
                const sortedMonths = Object.keys(monthlyData || {}).sort();
                if (sortedMonths.length === 0) return <div className="col-span-full text-center text-xs text-zinc-400 py-6">매출 기록이 없습니다.</div>;

                const maxRev = Math.max(...sortedMonths.map(m => getFlatMetrics(monthlyData[m])?.totalRevenue || 0), 1);

                return sortedMonths.map(m => {
                  const flat = getFlatMetrics(monthlyData[m]);
                  const rev = flat?.totalRevenue || 0;
                  const ratio = rev / maxRev;

                  let colorClass = "bg-zinc-100 hover:bg-zinc-200 text-zinc-400";
                  if (rev > 0) {
                    if (ratio >= 0.8) colorClass = "bg-rose-600 text-white hover:bg-rose-700 shadow-md";
                    else if (ratio >= 0.5) colorClass = "bg-rose-400 text-white hover:bg-rose-500 shadow-sm";
                    else if (ratio >= 0.3) colorClass = "bg-rose-200 text-rose-800 hover:bg-rose-300";
                    else colorClass = "bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100/80";
                  }

                  const isSelected = m === selectedMonth;
                  const isCompare = m === compareMonth;

                  return (
                    <button
                      key={m}
                      onClick={() => setSelectedMonth(m)}
                      className={`p-4 rounded-2xl flex flex-col justify-between h-28 text-left transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg relative overflow-hidden ${colorClass} ${
                        isSelected ? "ring-4 ring-primary ring-offset-2 scale-105 z-10" : ""
                      } ${isCompare ? "ring-2 ring-slate-400 ring-offset-1" : ""}`}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full animate-ping"></div>
                      )}
                      <span className="text-xs font-bold uppercase">{formatMonth(m)}</span>
                      <div className="mt-auto">
                        <p className="text-[10px] opacity-75 font-semibold">총 매출</p>
                        <p className="text-sm font-black tracking-tight">{formatNumber(Math.round(rev / 10000))}만원</p>
                      </div>
                    </button>
                  );
                });
              })()}
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-6 pt-4 border-t border-zinc-100/50 text-[10px] font-bold text-zinc-400">
              <span>💡 레전드:</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-zinc-100"></span> 데이터 없음</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-rose-50 border border-rose-100"></span> 30% 미만</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-rose-200"></span> 30% ~ 50%</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-rose-400"></span> 50% ~ 80%</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-rose-600"></span> 80% 이상 최고매출</span>
            </div>
          </Card>
        </section>

        {/* 2 & 3. 레이더 차트 및 AI 진단 점수 (KPI Radar & Score prescription) */}
        <section className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* 레이더 차트 */}
          <Card className="glass-card lg:col-span-2 p-8 flex flex-col items-center">
            <div className="w-full text-left mb-6">
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">🕸️ 5대 경영 핵심 지표 균형도 (Radar)</h3>
              <p className="text-xs text-zinc-500 font-medium mt-1">건강보험, 비급여, 자동차보험, 초진, 객단가의 상대적 균형 상태를 시각화합니다.</p>
            </div>

            {(() => {
              const healthIns = (data.patientPay || 0) + (data.insuranceClaim || 0);
              const nonBenefit = data.nonBenefit || 0;
              const autoIns = data.autoInsuranceClaim || 0;
              const newPatient = data.newPatientCount || 0;
              const arpu = data.totalRevenue / Math.max(data.patientCount || 1, 1);

              const maxHealth = 60000000; 
              const maxNonBenefit = 30000000;
              const maxAuto = 15000000;
              const maxNewPatient = 80;
              const maxArpu = 600000;

              const radarItems = [
                { label: "건강보험", score: Math.min(Math.round((healthIns / maxHealth) * 100), 100) },
                { label: "비급여", score: Math.min(Math.round((nonBenefit / maxNonBenefit) * 100), 100) },
                { label: "자보", score: Math.min(Math.round((autoIns / maxAuto) * 100), 100) },
                { label: "초진환자", score: Math.min(Math.round((newPatient / maxNewPatient) * 100), 100) },
                { label: "객단가", score: Math.min(Math.round((arpu / maxArpu) * 100), 100) }
              ];

              const cx = 150;
              const cy = 135;
              const r = 90;

              const vertices = radarItems.map((item, i) => {
                const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
                const x = cx + r * Math.cos(angle);
                const y = cy + r * Math.sin(angle);
                
                const valR = (item.score / 100) * r;
                const dx = cx + valR * Math.cos(angle);
                const dy = cy + valR * Math.sin(angle);

                return { x, y, dx, dy, ...item };
              });

              const polygonPath = vertices.map(v => `${v.dx},${v.dy}`).join(" ");
              const backgroundGrid = [0.25, 0.5, 0.75, 1.0].map(scale => {
                return vertices.map(v => {
                  const x = cx + r * scale * Math.cos(Math.atan2(v.y - cy, v.x - cx));
                  const y = cy + r * scale * Math.sin(Math.atan2(v.y - cy, v.x - cx));
                  return `${x},${y}`;
                }).join(" ");
              });

              return (
                <div className="relative w-full flex justify-center items-center">
                  <svg width="300" height="270" className="overflow-visible">
                    <defs>
                      <radialGradient id="radarRadial" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#3182f6" stopOpacity="0.05" />
                        <stop offset="100%" stopColor="#3182f6" stopOpacity="0.3" />
                      </radialGradient>
                    </defs>
                    
                    {backgroundGrid.map((path, idx) => (
                      <polygon 
                        key={idx} 
                        points={path} 
                        fill="none" 
                        stroke="#e2e8f0" 
                        strokeWidth="1" 
                        strokeDasharray={idx < 3 ? "2 2" : "none"} 
                      />
                    ))}

                    {vertices.map((v, idx) => (
                      <line 
                        key={idx} 
                        x1={cx} 
                        y1={cy} 
                        x2={v.x} 
                        y2={v.y} 
                        stroke="#e2e8f0" 
                        strokeWidth="1" 
                      />
                    ))}

                    <polygon 
                      points={polygonPath} 
                      fill="url(#radarRadial)" 
                      stroke="#3182f6" 
                      strokeWidth="2.5" 
                      className="transition-all duration-1000 ease-out"
                    />

                    {vertices.map((v, idx) => (
                      <circle 
                        key={idx} 
                        cx={v.dx} 
                        cy={v.dy} 
                        r="4.5" 
                        fill="#3182f6" 
                        stroke="#ffffff" 
                        strokeWidth="1.5" 
                        className="hover:scale-150 transition-transform cursor-pointer"
                      />
                    ))}

                    {vertices.map((v, idx) => {
                      let textAnchor = "middle";
                      let dyAdjust = 4;
                      if (Math.abs(v.x - cx) > 10) {
                        textAnchor = v.x > cx ? "start" : "end";
                      } else {
                        dyAdjust = v.y > cy ? 14 : -6;
                      }
                      
                      return (
                        <text
                          key={idx}
                          x={v.x + (v.x > cx ? 6 : v.x < cx ? -6 : 0)}
                          y={v.y + dyAdjust}
                          textAnchor={textAnchor as any}
                          className="text-[10px] font-extrabold fill-slate-700"
                        >
                          {v.label} ({v.score}점)
                        </text>
                      );
                    })}
                  </svg>
                </div>
              );
            })()}
          </Card>

          {/* AI 진단 점수 및 처방 처치 배지 */}
          <Card className="glass-card lg:col-span-3 p-8 flex flex-col justify-between">
            {(() => {
              const healthIns = (data.patientPay || 0) + (data.insuranceClaim || 0);
              const nonBenefit = data.nonBenefit || 0;
              const autoIns = data.autoInsuranceClaim || 0;
              const newPatient = data.newPatientCount || 0;
              const arpu = data.totalRevenue / Math.max(data.patientCount || 1, 1);

              const maxHealth = 60000000; 
              const maxNonBenefit = 30000000;
              const maxAuto = 15000000;
              const maxNewPatient = 80;
              const maxArpu = 600000;

              const scores = [
                Math.min(Math.round((healthIns / maxHealth) * 100), 100),
                Math.min(Math.round((nonBenefit / maxNonBenefit) * 100), 100),
                Math.min(Math.round((autoIns / maxAuto) * 100), 100),
                Math.min(Math.round((newPatient / maxNewPatient) * 100), 100),
                Math.min(Math.round((arpu / maxArpu) * 100), 100)
              ];

              const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / 5);

              let grade = "C+";
              let gradeColor = "from-amber-500 to-orange-600";
              let healthStatus = "개선이 필요한 경영 상태";
              if (avgScore >= 85) {
                grade = "A-";
                gradeColor = "from-rose-500 to-pink-600";
                healthStatus = "안정적이고 활력 있는 경영 구조";
              } else if (avgScore >= 70) {
                grade = "B";
                gradeColor = "from-indigo-500 to-blue-600";
                healthStatus = "일부 항목 지표 균형 보완 필요";
              }

              return (
                <div className="space-y-6 h-full flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">🩺 AI 병원 체질 종합 진단 스코어</h3>
                      <p className="text-xs text-zinc-500 font-medium mt-1">종합 점수 기반 체질 판정 및 맞춤형 처방</p>
                    </div>
                    <span className="text-[10px] font-black text-primary bg-primary/5 border border-primary/10 px-2 py-1 rounded-md">실시간 처방</span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-slate-50/50 rounded-3xl border border-zinc-100">
                    <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="48" cy="48" r="40" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                        <circle 
                          cx="48" 
                          cy="48" 
                          r="40" 
                          stroke="#3182f6" 
                          strokeWidth="8" 
                          fill="transparent" 
                          strokeDasharray={`${2 * Math.PI * 40}`}
                          strokeDashoffset={`${2 * Math.PI * 40 * (1 - avgScore / 100)}`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-2xl font-black text-slate-900">{avgScore}</span>
                        <span className="text-[9px] text-zinc-400 font-bold">SCORE</span>
                      </div>
                    </div>

                    <div className="space-y-1 text-center sm:text-left">
                      <div className="flex items-center justify-center sm:justify-start gap-2">
                        <span className={`px-2.5 py-0.5 bg-gradient-to-r ${gradeColor} text-white text-[10px] font-black rounded-lg shadow-sm`}>
                          {grade} 등급
                        </span>
                        <h4 className="font-extrabold text-slate-900 text-sm">{healthStatus}</h4>
                      </div>
                      <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                        초진 기여도와 비급여 동의 비율의 복합 분석 스코어입니다. 
                        아래 AI 스마트 처방을 확인하시고 조치를 이행하세요.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-[11px] font-black text-zinc-400 tracking-wider uppercase">💊 AI 스마트 처방 솔루션</p>
                    <div className="space-y-2">
                      {scores[3] < 60 ? (
                        <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-2.5">
                          <span className="mt-1 flex-shrink-0 w-2 h-2 rounded-full bg-blue-500"></span>
                          <p className="text-xs font-bold text-blue-800 leading-relaxed">
                            초진 환자 유입 점수가 낮습니다. 플레이스 상위 노출 마케팅 강화 및 데스크 초진 설문지 작성 프로세스 도입을 처방합니다.
                          </p>
                        </div>
                      ) : (
                        <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-2.5">
                          <span className="mt-1 flex-shrink-0 w-2 h-2 rounded-full bg-rose-500"></span>
                          <p className="text-xs font-bold text-rose-800 leading-relaxed">
                            평균 객단가(ARPU) 증대 처방: 내원 환자당 패키지 상담 전환 비중이 낮아 상담실 동의율 스크립트 재정비 및 클로징 화법 교육을 제안합니다.
                          </p>
                        </div>
                      )}
                      {scores[1] < 65 && (
                        <div className="p-3 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-2.5">
                          <span className="mt-1 flex-shrink-0 w-2 h-2 rounded-full bg-amber-500"></span>
                          <p className="text-xs font-bold text-amber-800 leading-relaxed">
                            비급여 매출 부진 처방: 비급여 세부 항목별 수가 매칭 진단이 시급하며, 카카오 채널톡 수가 패키지 리뉴얼 처치 프로세스를 시행하세요.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </Card>
        </section>

        {/* 4. 폭포형 매출 누수 분석 (Waterfall Leakage Analysis) */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Card className="glass-card p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">💸 폭포형 매출 회수 및 누수 분석 (Waterfall)</h3>
                <p className="text-xs text-zinc-500 font-medium mt-1">
                  총 매출(총진료비) 대비 실 수납 처리 현황(카드, 현금)과 결제 지연 상태인 미수금(누수 지표)을 차트로 분석합니다.
                </p>
              </div>
              <span className="text-[10px] font-black text-rose-500 bg-rose-50 border border-rose-100 px-2 py-1 rounded-md">누수 감지 엔진</span>
            </div>

            {(() => {
              const total = data.totalTreatmentFee || 0;
              const card = data.cardCollection || 0;
              const cash = data.cashCollection || 0;
              const rec = data.accountsReceivable || 0;

              const resolvedCard = card > 0 ? card : Math.round(total * 0.75);
              const resolvedCash = cash > 0 ? cash : Math.round(total * 0.20);
              const resolvedRec = rec > 0 ? rec : Math.round(total * 0.05);

              const items = [
                { label: "총 매출액 (Gross)", val: total, color: "bg-slate-900", percent: 100 },
                { label: "카드 결제액 (Card)", val: resolvedCard, color: "bg-blue-500", percent: Math.round((resolvedCard / total) * 100) },
                { label: "현금 수납액 (Cash)", val: resolvedCash, color: "bg-emerald-500", percent: Math.round((resolvedCash / total) * 100) },
                { label: "미수금 누수액 (Receivable)", val: resolvedRec, color: "bg-rose-500", percent: Math.round((resolvedRec / total) * 100), isLeak: true }
              ];

              return (
                <div className="space-y-6">
                  <div className="space-y-4">
                    {items.map((item, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs font-bold">
                          <span className="text-slate-700 flex items-center gap-1.5">
                            <span className={`w-2.5 h-2.5 rounded ${item.color}`}></span>
                            {item.label}
                          </span>
                          <span className={`${item.isLeak ? "text-rose-600" : "text-slate-900"}`}>
                            {formatNumber(item.val)}원 ({item.percent}%)
                          </span>
                        </div>
                        <div className="w-full h-4 bg-zinc-100 rounded-full overflow-hidden relative shadow-inner">
                          <div 
                            className={`h-full ${item.color} rounded-full transition-all duration-1000 ease-out`}
                            style={{ width: `${Math.min(item.percent, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 bg-slate-50 border border-zinc-100 rounded-2xl text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1"><AlertCircle size={14} className="text-primary" /> 회수 안전성 진단:</span>
                    {resolvedRec > total * 0.08 ? (
                      <span className="text-rose-600 font-extrabold">경고: 미수금 비중이 8%를 초과하여 병원 현금 흐름에 악영향을 줍니다. 추심 점검 필요!</span>
                    ) : (
                      <span className="text-emerald-600 font-extrabold">정상: 미수금이 매출의 5% 안쪽으로 철저하게 제어되고 있습니다.</span>
                    )}
                  </div>
                </div>
              );
            })()}
          </Card>
        </section>

        {/* 5. 다중 선택 타임라인 비교 (Multi-Month Comparator) */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Card className="glass-card p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">🗂️ 다중 선택 월별 데이터 교차 분석 (Multi-Selector)</h3>
                <p className="text-xs text-zinc-500 font-medium mt-1">
                  비교 분석할 개월들을 아래 체크박스에서 다중 선택(최대 3개)하면 즉시 시계열 비교표가 생성됩니다.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-md">교차 분석</span>
                {multiCompareMonths.length > 0 && (
                  <button 
                    onClick={() => setMultiCompareMonths([])}
                    className="text-[10px] font-bold text-zinc-400 hover:text-zinc-600 transition"
                  >
                    초기화
                  </button>
                )}
              </div>
            </div>

            {/* 체크박스 목록 */}
            <div className="flex flex-wrap gap-3 mb-6 p-4 bg-slate-50/50 rounded-2xl border border-zinc-100">
              {availableMonths.map(m => {
                const isChecked = multiCompareMonths.includes(m);
                return (
                  <label 
                    key={m} 
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                      isChecked 
                        ? "bg-primary/5 text-primary border-primary/40 shadow-sm" 
                        : "bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50"
                    }`}
                  >
                    <input 
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        let updated = [...multiCompareMonths];
                        if (isChecked) {
                          updated = updated.filter(item => item !== m);
                        } else {
                          if (updated.length >= 3) {
                            toast.error("최대 3개 월까지만 비교 가능합니다.");
                            return;
                          }
                          updated.push(m);
                        }
                        setMultiCompareMonths(updated.sort());
                      }}
                      className="accent-primary rounded"
                    />
                    {formatMonth(m)}
                  </label>
                );
              })}
            </div>

            {/* 비교 표 */}
            {multiCompareMonths.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-zinc-100">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-zinc-100 text-slate-700">
                    <tr>
                      <th className="py-3 px-4 font-extrabold">핵심 관리 항목</th>
                      {multiCompareMonths.map(m => (
                        <th key={m} className="py-3 px-4 font-black text-primary text-center">{formatMonth(m)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-medium">
                    {[
                      { label: "총 매출액", key: "totalRevenue", isWon: true },
                      { label: "비급여", key: "nonBenefit", isWon: true },
                      { label: "보험+자보 매출", key: "basicRevenue", isWon: true },
                      { label: "내원 환자수", key: "patientCount", unit: "명" },
                      { label: "신규 환자수", key: "newPatientCount", unit: "명" },
                      { label: "평균 객단가", key: "arpu", isWon: true }
                    ].map(row => (
                      <tr key={row.key} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-700">{row.label}</td>
                        {multiCompareMonths.map(m => {
                          const flat = getFlatMetrics(monthlyData[m]);
                          let val = (flat as any)[row.key] || 0;
                          if (row.key === "basicRevenue") {
                            val = (flat.patientPay || 0) + (flat.insuranceClaim || 0) + (flat.autoInsuranceClaim || 0);
                          }
                          return (
                            <td key={m} className="py-3.5 px-4 text-center font-extrabold text-slate-900">
                              {row.isWon ? `${formatNumber(Math.round(val))}원` : `${formatNumber(Math.round(val))}${row.unit}`}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-zinc-400 font-bold border border-dashed border-zinc-200 rounded-2xl">
                비교 분석할 월을 위 체크박스에서 선택해 주세요. (최대 3개 가능)
              </div>
            )}
          </Card>
        </section>

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
                <p className="text-sm text-zinc-500 font-medium mt-1">사용자가 시청한 병원 경영 솔루션 영상들입니다. (마스터 뷰)</p>
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
  );
}
