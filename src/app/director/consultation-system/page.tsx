"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import DashboardLayout from "@/components/DashboardLayout";

const slides = [
  {
    step: 1,
    title: "인사",
    subtitle: "환자의 방어기제를 허무는 첫 단추",
    content: "진료실이라는 낯설고 두려운 공간에서 환자의 방어기제를 허무는 첫 단추입니다. 커뮤니케이션 이론에서는 첫인상과 가벼운 대화(Ice-breaking)가 단순한 예의를 넘어, 첫 이미지를 만드는 아주 중요한 행동입니다. 최대한 목소리는 힘있게 미소를 지으면서 인사하세요. 환자는 이 짧은 순간 의료진이 자신을 어떻게 바라보는지 파악하게 됩니다.",
    image: "/images/consultation/step1.png"
  },
  {
    step: 2,
    title: "경청",
    subtitle: "기대치 차이를 좁히고 니즈를 파악하는 유일한 방법",
    content: "환자의 겉으로 드러난 통증만 보지 말고, 환자의 말을 끊지 않고 끝까지 듣는 행위는 환자의 목표가 정확히 어디에 있는지 파악하는 유일한 방법입니다. 진료 현장의 많은 분쟁은 치료 실패가 아니라 의사와 환자의 '기대치 차이'에서 발생하므로, 경청은 이를 사전에 조율하는 필수 과정입니다.",
    image: "/images/consultation/step2.png"
  },
  {
    step: 3,
    title: "검사",
    subtitle: "주관적 증상을 객관적 데이터로 시각화",
    content: "주관적으로 느끼는 증상을 기기(각종 체열진단기, 인바디, 초음파, 이학적검사 등)를 통해 시각적이고 객관적인 데이터로 변환하는 단계입니다. 단순히 병을 찾기 위한 목적뿐만 아니라, 환자에게 \"당신의 고통은 상상이나 꾀병이 아니라 실재하는 문제이며, 우리가 정확히 파악하고 있다\"는 확신을 주어 진단의 권위를 세워야 합니다.",
    image: "/images/consultation/step3.png"
  },
  {
    step: 4,
    title: "진단",
    subtitle: "막연한 고통에 '정확한 병명' 부여",
    content: "환자가 겪는 '왜 아프죠?', '무엇이 문제죠?'와 같은 막연한 고통의 실체에 '정확한 병명'을 부여하여 불안감을 통제 가능한 상태로 전환합니다. 의료진은 환자에게 발생하거나 발생 가능한 증상의 진단명을 명확히 설명해 신뢰를 쌓아야 합니다.",
    image: "/images/consultation/step4.png"
  },
  {
    step: 5,
    title: "치료내용",
    subtitle: "설득이 아닌 '동행'의 관점에서 설명",
    content: "어떤 치료를, 왜 해야 하며, 다른 대안은 없는지 설명하는 단계입니다. 이는 의료법에 명시된 필수 의무 사항으로, 환자가 자신의 신체에 가해지는 의료 행위를 온전히 이해하고 스스로 결정 할 수 있도록 돕습니다. 설득이 아닌 '동행'의 관점에서 환자와 같은 방향을 바라보는 과정입니다.",
    image: "/images/consultation/step5.png"
  },
  {
    step: 6,
    title: "향후 계획",
    subtitle: "사후 오해 차단 및 명확한 가이드라인 제공",
    content: "치료 과정에서 전형적으로 발생이 예상되는 부작용이나 후유증, 그리고 환자가 일상에서 지켜야 할 준수사항을 고지합니다. 치료의 성공은 의료진의 기술뿐만 아니라 환자의 협조도에 크게 좌우되므로, 명확한 가이드라인을 제공하여 사후에 발생할 수 있는 오해를 차단하고 다음 계획이 더 있다는 점을 강조해 안심시켜 줍니다.",
    image: "/images/consultation/step6.png"
  },
  {
    step: 7,
    title: "공감",
    subtitle: "치료 과정을 안정적으로 이끄는 강력한 마취제",
    content: "환자가 겪는 고통의 무게를 의료진이 온전히 이해하고 있음을 전달합니다. 아무리 완벽한 치료 계획도 정서적 지지가 빠지면 환자는 방어적으로 변합니다. \"그동안 많이 아프셨겠습니다\"라는 짧은 공감 한마디가 치료 과정 전체를 안정적으로 이끌어가는 강력한 마취제 역할을 합니다.",
    image: "/images/consultation/step7.png"
  },
  {
    step: 8,
    title: "겁주기",
    subtitle: "위험성을 객관적으로 명시하는 윤리적 개입",
    content: "단순히 환자를 위협하는 것이 아니라, 임상 상담 기법 중 하나인 '공포 소구(Fear Appeal)'를 통해 치료를 방치했을 때의 위험성을 객관적으로 명시하는 과정입니다. 환자가 심각성을 인지하지 못하고 치료를 미룰 때, 증상 악화 시 치러야 할 기회비용을 단호하게 짚어주어 올바른 의사결정을 촉구하는 윤리적 개입입니다.",
    image: "/images/consultation/step8.png"
  },
  {
    step: 9,
    title: "수양명경락 설명",
    subtitle: "나를 자세히 알아봐주는 병원에 대한 신뢰 형성",
    content: "환자 입장에서는 나를 자세하게 알아봐주는 병원을 신뢰 할 수 밖에 없습니다. 사회에서 문제가 생기는 경우는 대부분 나를 이해해주지 못할 때 발생합니다. 가족도 몰라주는 나의 몸 상태를 알아봐줄 때 신뢰가 상승하고 믿음이 생깁니다. 한약에 대한 씨앗을 심어야 합니다.",
    image: "/images/consultation/step9.png"
  }
];

export default function ConsultationSystemPage() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col min-h-[calc(100vh-80px)] max-w-6xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-amber-300">
            상담법 시스템
          </h1>
          <p className="text-white/60 mt-2 text-sm">
            성공적인 진료와 환자의 신뢰를 얻기 위한 9단계 커뮤니케이션 전략
          </p>
        </div>

        {/* Slider Container */}
        <div className="relative flex-1 flex flex-col items-center justify-center bg-white/5 rounded-3xl border border-white/10 overflow-hidden shadow-2xl backdrop-blur-sm p-4">
          
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-4xl flex flex-col items-center text-center p-6 md:p-12 mb-8"
            >
              <div className="w-32 h-32 md:w-48 md:h-48 rounded-full flex items-center justify-center border-4 border-amber-500/30 mb-8 shadow-xl shadow-emerald-900/20 relative overflow-hidden bg-black/50">
                <Image 
                  src={slides[currentIndex].image} 
                  alt={slides[currentIndex].title}
                  fill
                  className="object-cover"
                />
              </div>

              <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-emerald-300 text-xs font-bold tracking-widest uppercase mb-6">
                Step 0{slides[currentIndex].step}
              </div>

              <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
                {slides[currentIndex].title}
              </h2>

              <h3 className="text-lg md:text-xl font-bold text-amber-300/90 mb-8">
                {slides[currentIndex].subtitle}
              </h3>

              <div className="bg-black/20 p-6 md:p-8 rounded-2xl border border-white/5 shadow-inner w-full max-w-3xl">
                <p className="text-white/80 leading-relaxed text-base md:text-lg text-left break-keep">
                  {slides[currentIndex].content}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation Controls */}
          <button
            onClick={handlePrev}
            className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-white/70 hover:bg-emerald-500/20 hover:text-white hover:border-emerald-500/40 transition-all z-10 focus:outline-none"
          >
            <ChevronLeft size={24} />
          </button>

          <button
            onClick={handleNext}
            className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-white/70 hover:bg-emerald-500/20 hover:text-white hover:border-emerald-500/40 transition-all z-10 focus:outline-none"
          >
            <ChevronRight size={24} />
          </button>

          {/* Progress Indicators */}
          <div className="absolute bottom-8 left-0 w-full flex justify-center gap-2 px-4 flex-wrap">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`transition-all duration-300 rounded-full focus:outline-none ${
                  currentIndex === idx
                    ? "w-8 h-2 bg-amber-400"
                    : "w-2 h-2 bg-white/20 hover:bg-white/40"
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
