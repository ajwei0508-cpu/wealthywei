"use client";

import React, { useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRevenue } from "@/context/RevenueContext";
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
  ChevronDown
} from "lucide-react";
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

export default function DetailsPage() {
  const router = useRouter();
  const { data, compareData, monthlyData, selectedMonth, compareMonth, setSelectedMonth, setCompareMonth } = useRevenue();

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
            } else {
              valB = (data as any)[m.key] || 0;
              valA = (compareData as any)[m.key] || 0;
            }

            const delta = getDelta(valB, valA);
            const ratio = valA > 0 ? (valB / (valA + valB)) * 100 : 100;

            return (
              <Card 
                key={index} 
                className="flex flex-col justify-between h-64 bg-white border border-zinc-100 overflow-hidden px-6 py-6 toss-shadow group"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2.5 rounded-2xl ${m.bg} ${m.color} transition-transform group-hover:scale-110`}>
                      <m.icon size={18} />
                    </div>
                    <p className="text-zinc-500 text-sm font-bold tracking-tight">{m.label}</p>
                  </div>
                </div>
                
                <div className="space-y-5">
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
                    <div className="h-1.5 w-full bg-zinc-50 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(ratio, 100)}%` }}
                        transition={{ duration: 1, ease: "circOut" }}
                        className={`h-full ${delta?.isUp ? "bg-rose-500" : "bg-blue-500"}`} 
                      />
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

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
    </main>
  );
}
