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
  Check,
  Eye
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
  AreaChart,
  Area,
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
  
  // EMR-specific data takes precedence to ensure 100% accuracy with user's view
  const ok = dm.okchartData;
  const hs = dm.hanisarangData;
  const dbg = dm.donguibogamData;

  const totalRevenue = ok?.totalRevenue || hs?.totalRevenue || dbg?.totalRevenue || rev.total || 0;
  const patientCount = ok?.totalPatients || hs?.totalPatients || dbg?.totalPatients || pat.total || 0;
  const newPatientCount = ok?.newPatients || hs?.newPatients || dbg?.newPatients || pat.new || 0;
  const patientPay = ok?.copay || hs?.copay || dbg?.copay || rev.copay || 0;
  const insuranceClaim = ok?.insuranceClaim || hs?.insuranceClaim || dbg?.insuranceClaim || rev.insurance || 0;
  const autoInsuranceClaim = ok?.autoClaim || hs?.autoClaim || rev.auto || 0;
  const autoInsuranceCount = ok?.autoPatients || pat.auto || 0;
  const nonBenefit = ok?.nonCovered || hs?.nonCovered || dbg?.nonCovered || rev.nonCovered || 0;
  const industrialAccidentClaim = ok?.workerClaim || hs?.workerClaim || rev.worker || 0;
  const accountsReceivable = ok?.receivables || hs?.receivables || dbg?.receivables || leak.receivables || 0;
  const cashCollection = ok?.cashPayment || hs?.cashPayment || dbg?.cashTotal || pm.cash || 0;
  const cardCollection = ok?.cardPayment || hs?.cardPayment || dbg?.cardTotal || pm.card || 0;

  return {
    basicRevenue: patientPay + insuranceClaim + autoInsuranceClaim,
    nonBenefit: nonBenefit,
    newPatientCount: newPatientCount,
    totalTreatmentFee: totalRevenue,
    arpu: totalRevenue / Math.max(patientCount || 1, 1),
    patientCount: patientCount,
    patientPay: patientPay,
    insuranceClaim: insuranceClaim,
    autoInsuranceClaim: autoInsuranceClaim,
    autoInsuranceCount: autoInsuranceCount,
    industrialAccidentClaim: industrialAccidentClaim,
    accountsReceivable: accountsReceivable,
    cashCollection: cashCollection,
    cardCollection: cardCollection,
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
  const [selectedYear, setSelectedYear] = React.useState<string>("");
  const [analysisPeriodMode, setAnalysisPeriodMode] = React.useState<'1m' | '3m' | '6m' | '1y' | 'custom'>('3m');
  const [dataLoaded, setDataLoaded] = React.useState(false);
  const [aiAnalysis, setAiAnalysis] = React.useState<any>(null);
  const [loadingAnalysis, setLoadingAnalysis] = React.useState(false);
  const { watchHistory, convertToWatchUrl, removeFromHistory } = useVideoHistory();

  const handleRemoveHistory = (id: string, title: string) => {
    removeFromHistory(id, title);
    toast.success("기록이 삭제되었습니다.");
  };

  useEffect(() => {
    const masterEmail = process.env.NEXT_PUBLIC_MASTER_EMAIL || "wei0508@naver.com";
    if (status === "unauthenticated" || (status === "authenticated" && session?.user?.email?.toLowerCase() !== masterEmail.toLowerCase())) {
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
          setSelectedMonth(latest);
          
          const currentIndex = months.indexOf(latest);
          const targetIndex = Math.max(0, currentIndex - 2);
          const initialCompare = months[targetIndex];
          setCompareMonth(initialCompare);
          setSelectedYear(latest.split('-')[0]);
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

  const updateCompareMonthForMode = (mode: '1m' | '3m' | '6m' | '1y' | 'custom', endMonth: string, allMonths: string[]) => {
    if (!endMonth) return;
    if (mode === 'custom') return;

    const sortedMonths = [...allMonths].sort();
    const currentIndex = sortedMonths.indexOf(endMonth);
    if (currentIndex === -1) return;

    let targetIndex = currentIndex;
    if (mode === '1m') {
      targetIndex = currentIndex;
    } else if (mode === '3m') {
      targetIndex = Math.max(0, currentIndex - 2);
    } else if (mode === '6m') {
      targetIndex = Math.max(0, currentIndex - 5);
    } else if (mode === '1y') {
      targetIndex = Math.max(0, currentIndex - 11);
    }

    const calculatedCompareMonth = sortedMonths[targetIndex];
    if (calculatedCompareMonth) {
      setCompareMonth(calculatedCompareMonth);
    }
  };

  useEffect(() => {
    if (analysisPeriodMode !== 'custom' && selectedMonth && availableMonths.length > 0) {
      updateCompareMonthForMode(analysisPeriodMode, selectedMonth, availableMonths);
    }
  }, [analysisPeriodMode, selectedMonth, monthlyData]);

  useEffect(() => {
    const masterEmail = process.env.NEXT_PUBLIC_MASTER_EMAIL || "wei0508@naver.com";
    if (session?.user?.email?.toLowerCase() === masterEmail.toLowerCase()) {
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

  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    Object.keys(monthlyData || {}).forEach(m => {
      const y = m.split("-")[0];
      if (y) yearsSet.add(y);
    });
    if (yearsSet.size === 0) {
      yearsSet.add(new Date().getFullYear().toString());
    }
    return Array.from(yearsSet).sort().reverse();
  }, [monthlyData]);

  const yearlyTrendData = useMemo(() => {
    if (!selectedYear) return { trend: [], totalYearRevenue: 0, avgYearRevenue: 0, activeMonthCount: 0 };
    
    const trend = [];
    let maxVal = 1;
    let totalYearRevenue = 0;
    let activeMonthCount = 0;

    for (let m = 1; m <= 12; m++) {
      const monthStr = `${selectedYear}-${String(m).padStart(2, "0")}`;
      const record = monthlyData[monthStr];
      const revenue = record ? (getFlatMetrics(record).totalRevenue || 0) : 0;
      
      if (revenue > maxVal) {
        maxVal = revenue;
      }
      if (revenue > 0) {
        totalYearRevenue += revenue;
        activeMonthCount++;
      }

      trend.push({
        monthKey: monthStr,
        monthLabel: `${m}월`,
        hasData: !!record && revenue > 0,
        revenue
      });
    }

    return {
      trend: trend.map(t => ({
        ...t,
        ratio: (t.revenue / maxVal) * 100
      })),
      totalYearRevenue,
      avgYearRevenue: activeMonthCount > 0 ? Math.round(totalYearRevenue / activeMonthCount) : 0,
      activeMonthCount
    };
  }, [selectedYear, monthlyData]);

  const metrics = useMemo(() => [
    { key: "basicRevenue", label: "보험 매출", unit: "원", icon: ShieldCheck, color: "text-indigo-700", bg: "bg-indigo-500/10" },
    { key: "nonBenefit", label: "비급여", unit: "원", icon: TrendingUp, color: "text-cyan-600", bg: "bg-cyan-50" },
    { key: "newPatientCount", label: "신규환자수", unit: "명", icon: UserPlus, color: "text-indigo-400", bg: "bg-indigo-500/10" },
    { key: "totalTreatmentFee", label: "총진료비", unit: "원", icon: BarChart3, color: "text-purple-600", bg: "bg-purple-50" },
    { key: "arpu", label: "1인당 평균 객단가", unit: "원", icon: Wallet, color: "text-rose-400", bg: "bg-rose-500/10" },
    { key: "patientCount", label: "내원환자수", unit: "명", icon: Users, color: "text-amber-400", bg: "bg-amber-500/10" },
    { key: "patientPay", label: "본인부담금", unit: "원", icon: Wallet, color: "text-amber-400", bg: "bg-amber-500/10" },
    { key: "insuranceClaim", label: "보험청구액", unit: "원", icon: ShieldCheck, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { key: "autoInsuranceClaim", label: "자보청구액", unit: "원", icon: Car, color: "text-blue-700", bg: "bg-amber-500/10" },
    { key: "autoInsuranceCount", label: "자보환자수", unit: "명", icon: Users, color: "text-orange-600", bg: "bg-orange-50" },
    { key: "industrialAccidentClaim", label: "산재청구액", unit: "원", icon: Briefcase, color: "text-red-600", bg: "bg-red-50" },
    { key: "accountsReceivable", label: "미수금", unit: "원", icon: AlertCircle, color: "text-rose-400", bg: "bg-rose-500/10" },
    { key: "cashCollection", label: "현금수납", unit: "원", icon: Receipt, color: "text-white/70", bg: "bg-white/10" },
    { key: "cardCollection", label: "카드수납", unit: "원", icon: CreditCard, color: "text-amber-500", bg: "bg-amber-500/10" },
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
  }, [selectedMonth, compareMonth]);

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
      <header className="sticky top-0 z-50 bg-white/5/60 backdrop-blur-xl border-b border-white/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="hidden sm:flex flex-col">
              <h2 className="text-white/40 text-[10px] font-bold uppercase tracking-wider">[{decodedEmail}] 분석 리포트</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.open(`/emr/okchart?viewAs=${encodeURIComponent(decodedEmail)}`, "_blank")}
              className="px-4 py-2 bg-primary/10 text-emerald-400 hover:bg-primary/20 transition-all rounded-xl text-[11px] font-black shadow-sm flex items-center gap-1.5"
            >
              <Eye size={14} /> 오케이차트 화면
            </button>
            <button
              onClick={() => window.open(`/emr/hanisarang?viewAs=${encodeURIComponent(decodedEmail)}`, "_blank")}
              className="px-4 py-2 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all rounded-xl text-[11px] font-black shadow-sm flex items-center gap-1.5"
            >
              <Eye size={14} /> 한의사랑 화면
            </button>
            <button
              onClick={() => window.open(`/emr/hanchart?viewAs=${encodeURIComponent(decodedEmail)}`, "_blank")}
              className="px-4 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all rounded-xl text-[11px] font-black shadow-sm flex items-center gap-1.5 hidden md:flex"
            >
              <Eye size={14} /> 한차트 화면
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 md:p-12 space-y-12">


        {/* 전체 매출 성장추이 (Yearly Sales Growth & Forecast) */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Card className="glass-card p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h3 className="text-xl font-extrabold text-white tracking-tight">📈 연도별 전체 매출 성장 추이 분석 (Yearly Growth)</h3>
                <p className="text-xs text-white/50 font-medium mt-1">
                  1년 단위로 매출 데이터를 연도별로 분류하여 분석합니다. 아직 매출이 집계되지 않은 달은 <span className="text-teal-600 font-black">진료예정</span>으로 스마트 가상 대기 처리됩니다.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-md">연간 단위 분석</span>
                {/* 연도 선택 셀렉터 */}
                <div className="relative">
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="appearance-none bg-white/5 border border-white/10 text-xs font-black text-white/90 py-2 pl-4 pr-10 rounded-2xl cursor-pointer hover:border-zinc-300 transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
                  >
                    {availableYears.map(yr => (
                      <option key={yr} value={yr}>{yr}년 분석</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" size={14} />
                </div>
              </div>
            </div>

            {(() => {
              const chartData = yearlyTrendData.trend.map(t => ({
                name: t.monthLabel,
                "매출액": t.hasData ? t.revenue : 0,
                hasData: t.hasData
              }));

              return (
                <>
                  {/* 연간 통계 서머리 카드 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <div className="p-5 bg-white/50 border border-white/5 rounded-3xl flex flex-col justify-between">
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-wider">누적 연간 매출액</span>
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-2xl font-black text-slate-955">{formatNumber(yearlyTrendData.totalYearRevenue)}</span>
                        <span className="text-xs font-extrabold text-white/50">원</span>
                      </div>
                    </div>
                    <div className="p-5 bg-white/50 border border-white/5 rounded-3xl flex flex-col justify-between">
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-wider">월평균 매출액 (운영월 기준)</span>
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-2xl font-black text-slate-955">{formatNumber(yearlyTrendData.avgYearRevenue)}</span>
                        <span className="text-xs font-extrabold text-white/50">원/월</span>
                      </div>
                    </div>
                    <div className="p-5 bg-white/50 border border-white/5 rounded-3xl flex flex-col justify-between">
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-wider">데이터 집계 / 진료 예정</span>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xl font-black text-indigo-400">{yearlyTrendData.activeMonthCount}개월 집계</span>
                        <span className="text-white/30 font-bold">|</span>
                        <span className="text-sm font-extrabold text-teal-600">{12 - yearlyTrendData.activeMonthCount}개월 진료예정</span>
                      </div>
                    </div>
                  </div>

                  {/* 연간 매출 시각화 차트 */}
                  <div className="h-64 w-full bg-white/5/30 border border-white/5 rounded-3xl p-6 mb-8 relative overflow-hidden">
                    <div className="absolute top-4 left-6 z-10">
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-wider">월별 매출 추이 곡선 (Trend Curve)</span>
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 25, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3182f6" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#3182f6" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis 
                          dataKey="name" 
                          tickLine={false} 
                          axisLine={false} 
                          tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                        />
                        <YAxis 
                          tickLine={false} 
                          axisLine={false} 
                          tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                          tickFormatter={(v) => v > 0 ? `${(v / 10000).toFixed(0)}만` : '0'}
                        />
                        <RechartsTooltip 
                          cursor={{ stroke: '#e2e8f0', strokeWidth: 1.5, strokeDasharray: '3 3' }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const dataPoint = payload[0].payload;
                              return (
                                <div className="bg-emerald-950 text-white p-4 rounded-2xl shadow-xl border border-emerald-900 text-xs font-bold space-y-1">
                                  <p className="text-white/40 font-extrabold">{selectedYear}년 {dataPoint.name}</p>
                                  {dataPoint.hasData ? (
                                    <p className="text-sm font-black text-amber-400">
                                      매출액: {new Intl.NumberFormat("ko-KR").format(dataPoint["매출액"])}원
                                    </p>
                                  ) : (
                                    <p className="text-sm font-black text-teal-400 flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span>
                                      진료 예정
                                    </p>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="매출액" 
                          stroke="#3182f6" 
                          strokeWidth={3} 
                          fillOpacity={1} 
                          fill="url(#colorRevenue)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </>
              );
            })()}

            {/* 12개월 타임라인 및 프로그레스 그리드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {yearlyTrendData.trend.map(t => (
                <div 
                  key={t.monthKey} 
                  className={`p-5 rounded-[24px] border transition-all duration-300 ${
                    t.hasData 
                      ? "bg-white/5 border-white/5 shadow-sm hover:border-white/10 hover:shadow-md" 
                      : "bg-white/40 border-dashed border-white/10"
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-base font-black text-white">{selectedYear}년 {t.monthLabel}</span>
                    {t.hasData ? (
                      <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">매출 집계완료</span>
                    ) : (
                      <span className="relative flex h-5 items-center justify-center">
                        <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-teal-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                        <span className="text-[9.5px] font-black text-teal-700 bg-teal-50/70 border border-teal-100 px-2 py-0.5 rounded-md ml-2">🗓️ 진료예정</span>
                      </span>
                    )}
                  </div>

                  {t.hasData ? (
                    <div className="space-y-2">
                      <div className="flex justify-between items-baseline">
                        <span className="text-lg font-black text-slate-955">{formatNumber(t.revenue)}원</span>
                        <span className="text-[10px] font-bold text-white/40">최대치 대비 {Math.round(t.ratio)}%</span>
                      </div>
                      {/* 가로 프로그레스 바 */}
                      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden shadow-inner relative">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-600 to-indigo-600 rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${t.ratio}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="py-2">
                      <p className="text-xs font-bold text-white/40 leading-relaxed">
                        아직 매출이 발생하지 않은 기간입니다.<br />
                        해당 기간 도래 시 매출 분석이 활성화됩니다.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* 5. 다중 선택 타임라인 비교 (Multi-Month Comparator) */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Card className="glass-card p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h3 className="text-xl font-extrabold text-white tracking-tight">🗂️ 다중 선택 월별 데이터 교차 분석 (Multi-Selector)</h3>
                <p className="text-xs text-white/50 font-medium mt-1">
                  비교 분석할 개월들을 아래 체크박스에서 자유롭게 다중 선택하면 즉시 시계열 교차 비교표가 생성됩니다. 각 항목별 최고 수치는 <span className="text-amber-400 font-black">블루</span>, 최저 수치는 <span className="text-rose-400 font-black">레드</span>로 하이라이트됩니다.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md">교차 분석</span>
                {multiCompareMonths.length > 0 && (
                  <button 
                    onClick={() => setMultiCompareMonths([])}
                    className="text-[10px] font-bold text-white/40 hover:text-white/70 transition"
                  >
                    초기화
                  </button>
                )}
              </div>
            </div>

            {/* 체크박스 목록 */}
            <div className="flex flex-wrap gap-3 mb-6 p-4 bg-white/50 rounded-2xl border border-white/5">
              {availableMonths.map(m => {
                const isChecked = multiCompareMonths.includes(m);
                return (
                  <label 
                    key={m} 
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                      isChecked 
                        ? "bg-emerald-500/20 text-emerald-400 border-primary/40 shadow-sm" 
                        : "bg-white/5 text-white/50 border-white/10 hover:bg-white/5"
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
              <div className="overflow-x-auto rounded-2xl border border-white/5">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 border-b border-white/5 text-white/80">
                    <tr>
                      <th className="py-3 px-4 font-extrabold">핵심 관리 항목</th>
                      {multiCompareMonths.map(m => (
                        <th key={m} className="py-3 px-4 font-black text-emerald-400 text-center">{formatMonth(m)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 font-medium">
                    {[
                      { label: "총 매출액", key: "totalRevenue", isWon: true },
                      { label: "비급여", key: "nonBenefit", isWon: true },
                      { label: "보험+자보 매출", key: "basicRevenue", isWon: true },
                      { label: "내원 환자수", key: "patientCount", unit: "명" },
                      { label: "신규 환자수", key: "newPatientCount", unit: "명" },
                      { label: "평균 객단가", key: "arpu", isWon: true }
                    ].map(row => {
                      // 최고 / 최저 연산용 임시 배열 빌드
                      const valList = multiCompareMonths.map(m => {
                        const flat = getFlatMetrics(monthlyData[m]);
                        let val = (flat as any)[row.key] || 0;
                        if (row.key === "basicRevenue") {
                          val = (flat.patientPay || 0) + (flat.insuranceClaim || 0) + (flat.autoInsuranceClaim || 0);
                        }
                        return val;
                      });

                      const maxVal = Math.max(...valList);
                      const minVal = Math.min(...valList);
                      const allEqual = valList.every(v => v === valList[0]);

                      return (
                        <tr key={row.key} className="hover:bg-white/50 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-white/80">{row.label}</td>
                          {multiCompareMonths.map(m => {
                            const flat = getFlatMetrics(monthlyData[m]);
                            let val = (flat as any)[row.key] || 0;
                            if (row.key === "basicRevenue") {
                              val = (flat.patientPay || 0) + (flat.insuranceClaim || 0) + (flat.autoInsuranceClaim || 0);
                            }

                            // 최고/최저 데코레이션 스타일
                            let textClass = "text-white";
                            let cellBg = "";
                            let indicator = null;

                            if (multiCompareMonths.length > 1 && !allEqual) {
                              if (val === maxVal) {
                                textClass = "text-amber-400 font-black";
                                cellBg = "bg-amber-500/10/40";
                                indicator = <span className="inline-block w-1.5 h-1.5 bg-emerald-600 rounded-full ml-1.5"></span>;
                              } else if (val === minVal) {
                                textClass = "text-rose-400 font-black";
                                cellBg = "bg-rose-500/10/40";
                                indicator = <span className="inline-block w-1.5 h-1.5 bg-rose-500 rounded-full ml-1.5"></span>;
                              }
                            }

                            return (
                              <td key={m} className={`py-3.5 px-4 text-center font-extrabold transition-all duration-300 ${textClass} ${cellBg}`}>
                                <span className="inline-flex items-center justify-center">
                                  {row.isWon ? `${formatNumber(Math.round(val))}원` : `${formatNumber(Math.round(val))}${row.unit}`}
                                  {indicator}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-white/40 font-bold border border-dashed border-white/10 rounded-2xl">
                비교 분석할 월을 위 체크박스에서 선택해 주세요.
              </div>
            )}
          </Card>
        </section>

        {/* Watch History Section */}
        <section className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <Card className="glass-card p-10 mt-12 mb-20 shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 blur-3xl -mr-32 -mt-32 rounded-full"></div>
            <div className="flex items-center gap-4 mb-10 relative z-10">
              <div className="p-4 bg-primary/10 text-emerald-400 rounded-2xl shadow-inner">
                <History size={28} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight underline decoration-primary/20 decoration-8 underline-offset-[-2px]">시청 교육 영상 기록</h3>
                <p className="text-sm text-white/50 font-medium mt-1">사용자가 시청한 병원 경영 솔루션 영상들입니다. (마스터 뷰)</p>
              </div>
            </div>

            {watchHistory.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
                {watchHistory.slice(0, 8).map((video, idx) => (
                  <div key={idx} className="relative group">
                    <button
                      onClick={() => window.open(convertToWatchUrl(video), "_blank")}
                      className="w-full text-left space-y-4 p-6 rounded-[32px] border border-white/5 hover:border-primary/40 hover:bg-primary/[0.02] transition-all hover:shadow-xl hover:-translate-y-1 duration-300 bg-white/5"
                    >
                      <div className="flex items-start justify-between">
                        <div className="p-3 bg-white/10 text-white/50 rounded-2xl group-hover:bg-primary/10 group-hover:text-emerald-400 transition-colors">
                           <Play size={18} fill="currentColor" />
                        </div>
                        <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/20 border border-primary/10 px-2.5 py-0.5 rounded-full">
                          {video.indicator}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-2 leading-snug text-sm">
                          {video.title}
                        </h4>
                        {video.date && (
                          <div className="flex items-center justify-between mt-4">
                            <p className="text-[10px] text-white/40 font-bold flex items-center gap-1">
                              <CheckCircle2 size={10} className="text-emerald-500" /> 시청 완료
                            </p>
                            <span className="text-[9px] text-white/30 font-medium">{new Date(video.date).toLocaleDateString()}</span>
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
                      className="absolute -top-2 -right-2 p-2 bg-white/5 text-white/30 hover:text-rose-400 rounded-full shadow-lg border border-white/5 opacity-0 group-hover:opacity-100 transition-all z-20"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-24 text-center bg-white/50 rounded-[48px] border-2 border-dashed border-white/10 relative z-10">
                <div className="max-w-xs mx-auto space-y-4">
                  <div className="mx-auto w-16 h-16 bg-white/10 rounded-full flex items-center justify-center text-white/30">
                    <History size={32} />
                  </div>
                  <p className="text-white/40 font-bold">아직 시청하신 영상 기록이 없습니다.</p>
                </div>
              </div>
            )}
          </Card>
        </section>
      </div>
    </main>
  );
}
