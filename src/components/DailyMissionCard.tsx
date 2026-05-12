"use client";

import React, { useMemo } from "react";
import { Target, Sparkles, Quote, CheckCircle2, TrendingUp, Users, DollarSign } from "lucide-react";
import { motion } from "framer-motion";
import { DataMetrics } from "@/context/DataContext";

interface DailyMissionCardProps {
  data: DataMetrics;
  userName: string;
  emrType: "okchart" | "hanchart" | "donguibogam" | "hanisarang";
}

const QUOTES = [
  { text: "측정할 수 없으면 관리할 수 없다.", author: "피터 드러커" },
  { text: "혁신은 리더와 추종자를 구분하는 잣대다.", author: "스티브 잡스" },
  { text: "품질이란 아무도 보지 않을 때에도 바르게 행동하는 것이다.", author: "헨리 포드" },
  { text: "비즈니스 세계에서 가장 위험한 단어는 '우리는 항상 이렇게 해왔다'이다.", author: "그레이스 호퍼" },
  { text: "가장 만족한 고객이 최고의 광고다.", author: "필립 코틀러" },
  { text: "실패는 더 똑똑하게 다시 시작할 수 있는 기회일 뿐이다.", author: "헨리 포드" },
  { text: "리더십은 지위가 아니라 책임이다.", author: "피터 드러커" }
];

export const DailyMissionCard = ({ data, userName, emrType }: DailyMissionCardProps) => {
  // Use current date and EMR type to pick a mission and quote so it's unique per EMR and changes daily
  const today = new Date();
  
  // Create a stable seed based on date and EMR type
  const emrSalt = useMemo(() => {
    const salts: Record<string, number> = {
      okchart: 100,
      hanchart: 200,
      donguibogam: 300,
      hanisarang: 400
    };
    return salts[emrType] || 0;
  }, [emrType]);

  const dateSeed = useMemo(() => {
    return (today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()) + emrSalt;
  }, [today, emrSalt]);

  const currentQuote = useMemo(() => {
    return QUOTES[dateSeed % QUOTES.length];
  }, [dateSeed]);

  const mission = useMemo(() => {
    const missions = [
      {
        title: "신규 환자 사후 관리",
        description: `이번 달 신규 환자가 ${data.patientMetrics.new}명입니다. 오늘 그 중 3분께 안부 문자를 보내보세요.`,
        icon: <Users size={20} />,
        color: "text-blue-400",
        bg: "bg-blue-500/10"
      },
      {
        title: "미수금 점검",
        description: `현재 미수금이 ${new Intl.NumberFormat("ko-KR").format(data.leakage.receivables)}원입니다. 가장 오래된 미수 환자 1명에게 확인 전화를 해볼까요?`,
        icon: <DollarSign size={20} />,
        color: "text-amber-400",
        bg: "bg-amber-500/10"
      },
      {
        title: "진료 효율성 체크",
        description: `일평균 환자 수가 ${data.patientMetrics.dailyAvg.toFixed(1)}명입니다. 오늘 점심시간 5분만 할애하여 대기 시간을 줄일 수 있는 동선을 점검해보세요.`,
        icon: <TrendingUp size={20} />,
        color: "text-emerald-400",
        bg: "bg-emerald-500/10"
      },
      {
        title: "비급여 상담 매뉴얼",
        description: `비급여 비중이 현재 ${data.generatedRevenue.total > 0 ? ((data.generatedRevenue.nonCovered / data.generatedRevenue.total) * 100).toFixed(1) : 0}%입니다. 오늘 가장 많이 나가는 비급여 항목의 상담 멘트 하나만 고쳐보세요.`,
        icon: <Sparkles size={20} />,
        color: "text-purple-400",
        bg: "bg-purple-500/10"
      },
      {
        title: "팀워크 허들",
        description: "오늘 고생한 스태프 1명에게 구체적인 칭찬 한마디를 건네보세요. 긍정적인 에너지가 매출로 이어집니다.",
        icon: <CheckCircle2 size={20} />,
        color: "text-rose-400",
        bg: "bg-rose-500/10"
      }
    ];
    return missions[dateSeed % missions.length];
  }, [data, dateSeed]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Daily Mission */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        className="bg-gradient-to-br from-white/[0.03] to-transparent border border-white/10 rounded-[3rem] p-10 flex flex-col justify-between group hover:bg-white/[0.05] transition-all"
      >
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target size={18} className="text-blue-500" />
              <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">Today's Mission</span>
            </div>
            <h3 className="text-2xl font-black text-white tracking-tight">{mission.title}</h3>
          </div>
          <div className={`p-4 rounded-2xl ${mission.bg} ${mission.color}`}>
            {mission.icon}
          </div>
        </div>

        <p className="text-slate-400 text-lg font-medium leading-relaxed mb-10">
          {mission.description}
        </p>

        <div className="flex items-center gap-4">
          <div className="h-1 bg-white/10 grow rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 w-1/3" />
          </div>
          <span className="text-[10px] font-black text-slate-500">PROCEEDING</span>
        </div>
      </motion.div>

      {/* Quote Card */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        className="bg-[#111624] border border-white/5 rounded-[3rem] p-10 flex flex-col justify-center relative overflow-hidden group"
      >
        <div className="absolute -top-10 -right-10 p-12 opacity-5 group-hover:scale-110 transition-transform">
          <Quote size={200} />
        </div>
        
        <div className="relative z-10 text-center space-y-8">
          <div className="flex justify-center">
            <div className="p-3 bg-white/5 rounded-full text-slate-500">
              <Quote size={24} />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-white leading-relaxed italic">
            "{currentQuote.text}"
          </p>
          <div className="flex flex-col items-center">
            <div className="w-8 h-px bg-blue-500/50 mb-4" />
            <p className="text-slate-500 text-sm font-black uppercase tracking-widest">{currentQuote.author}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
