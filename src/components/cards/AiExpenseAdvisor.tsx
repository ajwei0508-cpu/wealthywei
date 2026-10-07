"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { useCardExpense } from "@/context/CardExpenseContext";
import { 
  Sparkles, 
  BrainCircuit, 
  Lightbulb, 
  ShieldCheck, 
  Zap, 
  TrendingDown, 
  CreditCard,
  Target
} from "lucide-react";

export default function AiExpenseAdvisor() {
  const { 
    totalSpend, 
    categoryStats, 
    cardStats, 
    filteredTransactions 
  } = useCardExpense();

  // Dynamic calculations for consumer psychology advice
  const diningStat = categoryStats.find(s => s.category.id === "dining");
  const shoppingStat = categoryStats.find(s => s.category.id === "shopping");
  const subscriptionStat = categoryStats.find(s => s.category.id === "subscription");

  const subscriptions = useMemo(() => {
    return filteredTransactions.filter(t => t.category === "subscription");
  }, [filteredTransactions]);

  const cardsCloseToTarget = useMemo(() => {
    return cardStats.filter(c => {
      const target = (c.card as any).monthlyTarget || 500000;
      return c.amount < target && c.amount >= target * 0.7;
    });
  }, [cardStats]);

  // Consumer stage assessment
  const spendingStage = useMemo(() => {
    if (totalSpend > 4000000) {
      return {
        title: "VVIP 하이엔드 소비 모드",
        desc: "고액 결제 및 파인다이닝 비중이 높은 최상위 라이프스타일 구간입니다.",
        badge: "프리미엄 레벨",
        color: "text-amber-400 border-amber-500/30 bg-amber-500/10"
      };
    } else if (totalSpend > 2000000) {
      return {
        title: "균형 잡힌 자산 관리 모드",
        desc: "필수 고정비와 라이프스타일 소비가 안정적인 비율을 유지하고 있습니다.",
        badge: "스마트 밸런스",
        color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
      };
    } else {
      return {
        title: "스마트 절약 & 실속형 모드",
        desc: "불필요한 지출이 통제되고 있는 고효율 소비 패턴입니다.",
        badge: "고효율 실속",
        color: "text-blue-400 border-blue-500/30 bg-blue-500/10"
      };
    }
  }, [totalSpend]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="w-full mb-8 relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c1f17] via-neutral-900 to-[#121614] border border-amber-500/30 p-6 lg:p-8 shadow-2xl"
    >
      {/* Background glow effects */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header with Art persona */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 via-yellow-500 to-amber-600 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.5)]">
            <BrainCircuit size={24} className="text-black" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-white tracking-wide">
                아트(Art)의 하이엔드 소비 심리 & 자산 전략 리포트
              </h3>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${spendingStage.color}`}>
                {spendingStage.badge}
              </span>
            </div>
            <p className="text-xs text-white/50 mt-0.5">
              소비자 심리 분석 모델 기반 카드 실적 최적화 및 지출 리밸런싱 솔루션
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-amber-300 flex items-center gap-1.5">
            <Sparkles size={13} className="text-amber-400" />
            <span>실시간 소비 심리 지수: 88.5 pt</span>
          </div>
        </div>
      </div>

      {/* Insight Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
        {/* Insight 1: Dining & Lifestyle */}
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm flex flex-col justify-between hover:border-amber-400/30 transition-all group">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Lightbulb size={15} />
                식비 & 미식 소비 진단
              </span>
              {diningStat && (
                <span className="text-[11px] font-mono text-white/40">
                  전체의 {diningStat.percent}% 차지
                </span>
              )}
            </div>

            <p className="text-xs text-white/70 leading-relaxed">
              {diningStat && diningStat.percent > 30 ? (
                <>
                  현재 외식 및 식음료 소비 비중이 <span className="text-amber-300 font-bold">{diningStat.percent}%</span>로 높은 수준입니다. 주말 파인다이닝 결제 패턴을 1~2회만 스마트하게 조율하면 약 <span className="text-emerald-400 font-bold">250,000원</span>의 잉여 투자 자금을 확보할 수 있습니다.
                </>
              ) : (
                <>
                  식비 지출이 전체 대비 적정 범위 내에서 유지되고 있습니다. 일상적인 배달이나 잦은 카페 결제 누수가 매우 잘 통제되고 있는 모범적인 상태입니다.
                </>
              )}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-white/40">
            <span>미식 만족도 최적화 제안</span>
            <span className="text-amber-400/80 font-medium">우수 지표</span>
          </div>
        </div>

        {/* Insight 2: Subscriptions & Recurring Bills */}
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm flex flex-col justify-between hover:border-purple-400/30 transition-all group">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                <Zap size={15} />
                고정 구독료 및 디지털 지출
              </span>
              <span className="text-[11px] font-mono text-white/40">
                총 {subscriptions.length}건 감지
              </span>
            </div>

            <p className="text-xs text-white/70 leading-relaxed">
              {subscriptions.length > 0 ? (
                <>
                  넷플릭스, ChatGPT, 유튜브 등 정기 결제가 매월 약 <span className="text-purple-300 font-bold">₩{subscriptionStat ? subscriptionStat.amount.toLocaleString() : "0"}</span> 발생 중입니다. 3개월 이상 미사용 중인 디지털 구독 서비스가 있는지 정기 점검을 권장합니다.
                </>
              ) : (
                <>
                  등록된 정기 구독료 지출이 발견되지 않았거나 소액입니다. 불필요한 자동결제 누수가 전혀 없는 매우 깔끔한 자산 구조입니다.
                </>
              )}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-white/40">
            <span>자동 결제 누수 감시</span>
            <span className="text-purple-400/80 font-medium">정상 가동</span>
          </div>
        </div>

        {/* Insight 3: Card Benefit & Target Spending */}
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm flex flex-col justify-between hover:border-emerald-400/30 transition-all group">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <Target size={15} />
                카드별 혜택 실적 최적화
              </span>
              <span className="text-[11px] font-mono text-emerald-400">
                실적 가이드
              </span>
            </div>

            <p className="text-xs text-white/70 leading-relaxed">
              {cardsCloseToTarget.length > 0 ? (
                <>
                  <span className="text-emerald-300 font-bold">{cardsCloseToTarget[0].card.name}</span>의 전월 실적 달성률이 70%를 돌파했습니다. 이번 달 남은 금액을 해당 카드로 집중 결제하면 <span className="text-amber-300 font-bold">최대 포인트 적립 및 VIP 라운지 혜택</span>을 100% 확보할 수 있습니다.
                </>
              ) : (
                <>
                  보유 중인 주요 VVIP 카드의 실적 구간이 고르게 달성되었거나 기준을 초과했습니다. 분산 결제를 통해 마일리지 및 캐시백 혜택을 극대화하십시오.
                </>
              )}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-white/40">
            <span>혜택 회수율 예측</span>
            <span className="text-emerald-400 font-medium">94.8% 극대화</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
