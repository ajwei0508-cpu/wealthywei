"use client";

import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { Stethoscope, Play, ShieldCheck, Clock } from "lucide-react";

export default function TreatmentPage() {
  const videoUrl = "https://play.wecandeo.com/video/v/?key=BOKNS9AQWrHlii9BTiicPOip0bcnNis6FTI4UGLEKisbMYn72VBELumP4PwUmjisAfZ65FwtMVisL5qrf76P4G0KDAAngXw2rpEBsQS";

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#0A0E1A] text-white">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 pt-28">
          
          {/* Header Section */}
          <div className="mb-12">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 mb-4"
            >
              <span className="px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-[0.2em]">
                Medical Education Center
              </span>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col md:flex-row md:items-end justify-between gap-6"
            >
              <div>
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
                  바른진료법 <span className="text-slate-500">마스터 클래스</span>
                </h1>
                <p className="text-slate-400 text-lg font-light max-w-2xl leading-relaxed">
                  바른컨설팅이 제안하는 최적의 진료 프로세스와 환자 커뮤니케이션 기법을 학습합니다. 
                  전문적인 임상 노하우를 시청해 보세요.
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Current Status</span>
                  <span className="text-sm font-bold text-emerald-400 flex items-center gap-1">
                    <ShieldCheck size={14} /> 수강 가능
                  </span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Video Player Section */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="relative group rounded-[3rem] overflow-hidden bg-black border border-white/10 shadow-2xl shadow-blue-500/10"
          >
            {/* Wecandeo Player Wrapper */}
            <div className="aspect-video w-full">
              <iframe
                src={videoUrl}
                className="w-full h-full border-none"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>

            {/* Video Info Overlay (Bottom) */}
            <div className="p-8 md:p-12 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="h-16 w-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                  <Stethoscope size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">바른진료법 핵심 요약 및 임상 적용 가이드</h3>
                  <div className="flex items-center gap-4 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1.5"><Clock size={14} /> 45:00</span>
                    <span className="flex items-center gap-1.5"><Play size={14} /> 1.2k Views</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={() => window.open("http://naver.me/5XTiFWSo", "_blank")}
                  className="px-8 py-4 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-black text-sm transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                >
                  강의자료 다운로드
                </button>
              </div>
            </div>
          </motion.div>

          {/* Quick Stats / Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            {[
              { label: "교육 목표", title: "진료 동의율 30% 향상", desc: "환자 심리 분석을 통한 효과적인 진료 상담 및 클로징 기법 마스터", icon: Play },
              { label: "추천 대상", title: "원장님 및 실장급", desc: "병원의 매출 성장을 견인하고 싶은 리더급 구성원 권장", icon: Stethoscope },
              { label: "수강 혜택", title: "인증 수료증 발급", desc: "교육 이수 완료 시 바른컨설팅 인증 진료 마스터 수료증 수여", icon: ShieldCheck },
            ].map((item, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + (idx * 0.1) }}
                className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] hover:bg-white/[0.04] transition-all group"
              >
                <div className="flex justify-between items-center mb-6">
                  <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all">
                    <item.icon size={20} />
                  </div>
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{item.label}</span>
                </div>
                <h4 className="text-lg font-bold text-white mb-2">{item.title}</h4>
                <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>

        </main>
      </div>
    </DashboardLayout>
  );
}
