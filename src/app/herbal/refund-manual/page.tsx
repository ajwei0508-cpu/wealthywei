'use client';

import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { ShieldAlert, AlertTriangle, AlertCircle, Info, Copy, FileText, Maximize2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Image from 'next/image';

const REFUND_STAGES = [
  "1단계 : 무조건 환불을 막아라",
  "2단계 : 환불 이유를 정확하게 파악하라",
  "3단계 : 줘야 될 상황이면 쿨 하게 돌려주다",
  "4단계 : 환불 사유가 안된다면 절대로 해주지 않습니다."
];

const REFUND_CASES = [
  {
    title: "예시 1번",
    situation: "3제 패키지를 하셨으나 1제 먼저 먹어보고 2제 고민해보겠습니다. 2제만 환불해주세요.",
    script: `아 충분히 가능하죠 편하게 하셔도 됩니다. 
다만 제가 1제가 아닌 3제를 권유해드린 중요한 이유가 있습니다.

지금 결정에 따라 복용하신 한제 마져도 효과가 날라 갈수있어요. 왜 그러냐

지금 퇴행성 질환은 1제를 먹고 쭈욱 좋아지는것이 아니라 계속 저축하면서 효과를 쌓아가야하는겁니다. 환자분께서 저를 믿으신 만큼 저도 환자분 입장에서 최고의 효과를 낼 수 있는 게 3제라고 판단되어 안내해드린겁니다. 또한 큰 비용을 지불하고 믿고 맡기신 만큼 저도 사실 약재부분을 1제 결제하신분들보다 더 신경쓰는게 사실입니다. 다른 이유가 없다면 제 가족이라고 생각하고 제가 솔직히 말씀드리겠습니다. 3제가 정답입니다.`
  },
  {
    title: "예시 2번",
    situation: "오늘 결제후 갑자기 내일 환불 해주세요 한다.",
    script: `어떤 사유가 있으실가요?? 지금 달이고 있는데 굉장히 난감한 상황이 되어버렸습니다. 몸이 너무 안 좋으셔서 제가 녹용도 최상품이랑 고급약재로 달이고 있는데 신경을 많이 썻습니다. 효과 보실수 있게 정성들여 처방했습니다. 혹시 환불을 고려 해주실수 있을가요?`
  },
  {
    title: "예시 3번",
    situation: "한약 먹고 소화가 안되서 죽겠어요. 환불 하고 싶습니다.",
    script: `약의 농도가 워낙 찐해서 그렇습니다. 몸에 적응되면 괜찮아 질겁니다. 제가 위장 강화되는 약 준비 도와드리겠습니다. 복용하는데 훨씬 편해 지실겁니다.

의료법에 따라 처방이 나간 약은 어떤 사유로도 환불이 되지 않습니다. 저를 믿고 지으신 만큼 약 교체를 도와드릴수 있습니다. 다만 지금 약재 농도가 굉장히 찐해서 폐기 하기 너무 아깝네요.`
  },
  {
    title: "예시 4번",
    situation: "한약 먹고 설사를 계속 합니다. 환불 하고 싶습니다. 원장님 (사실 이런 불평은 나오게 하면 안됩니다.)",
    script: `노폐물 배출하는 과정입니다. 설사를 많이 할 수 록 체내에 쌓인 노폐물이 엄청나다는겁니다. 노폐물 다 빠지면 멈추거니 불편해도 꾸준히 복용하시면 됩니다. 절 믿고 잘 복용해주세요 효과로 보답하겠습니다.`
  },
  {
    title: "예시 5번",
    situation: "약 결제 후 바로 환불을 요청하는 경우",
    script: `즉시 환불`
  }
];

export default function HerbalRefundManualPage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("대응 스크립트가 복사되었습니다.");
  };

  return (
    <DashboardLayout>
      <div className="p-8 max-w-5xl mx-auto min-h-[calc(100vh-4rem)]">
        
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center shadow-sm border border-rose-500/20">
              <ShieldAlert className="w-6 h-6 text-rose-400" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">환자 환불 대응 매뉴얼</h1>
          </div>
          <p className="text-white/50 pl-15">상황별 환불 방어 지침 및 응대 스크립트를 숙지하세요.</p>
        </div>

        {/* Warning Principle */}
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-6 mb-10">
          <h2 className="text-rose-400 font-bold text-lg mb-4 flex items-center gap-2">
            <AlertTriangle size={20} />
            환불을 절대로 쉽게 해주면 안됩니다. (환불 대응 4단계)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {REFUND_STAGES.map((stage, idx) => (
              <div key={idx} className="bg-black/30 px-4 py-3 rounded-xl border border-rose-500/10 flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-sm shrink-0">
                  {idx + 1}
                </div>
                <span className="text-white/90 text-sm font-medium">{stage.split(' : ')[1] || stage}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Legal Evidence Section */}
        <div className="mb-10">
          <h2 className="text-xl font-bold text-amber-300 mb-4 flex items-center gap-2">
            <FileText size={20} />
            법적 근거 자료 (처방 의약품 환불 불가 규정)
          </h2>
          <p className="text-white/50 text-sm mb-4">환불 불가 사유를 설명할 때 활용할 수 있는 보건복지부 및 국민신문고 공식 답변 자료입니다. 클릭하여 확대할 수 있습니다.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div 
              onClick={() => setSelectedImage('/images/refund_evidence_1.png')}
              className="relative bg-white rounded-xl overflow-hidden cursor-pointer group border border-white/10 hover:border-amber-400 transition-colors shadow-lg"
            >
              <Image src="/images/refund_evidence_1.png" alt="보건복지부 고시" width={800} height={600} className="w-full h-auto object-contain" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="bg-black/80 text-white px-4 py-2 rounded-full flex items-center gap-2 font-bold text-sm">
                  <Maximize2 size={16} /> 크게 보기
                </div>
              </div>
            </div>
            <div 
              onClick={() => setSelectedImage('/images/refund_evidence_2.png')}
              className="relative bg-white rounded-xl overflow-hidden cursor-pointer group border border-white/10 hover:border-amber-400 transition-colors shadow-lg"
            >
              <Image src="/images/refund_evidence_2.png" alt="국민신문고 답변" width={800} height={1200} className="w-full h-[300px] object-cover object-top" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="bg-black/80 text-white px-4 py-2 rounded-full flex items-center gap-2 font-bold text-sm">
                  <Maximize2 size={16} /> 크게 보기
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cases */}
        <div className="space-y-6 pb-10">
          {REFUND_CASES.map((caseItem, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-[#031C13] rounded-2xl overflow-hidden border border-white/10 shadow-lg"
            >
              <div className="bg-black/40 px-6 py-4 border-b border-white/5 flex items-center gap-3">
                <AlertCircle className="text-amber-400 w-5 h-5" />
                <h3 className="text-amber-300 font-bold text-lg">{caseItem.title}</h3>
              </div>
              <div className="p-6">
                <div className="mb-5 bg-white/5 p-4 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2 text-white/50 text-xs font-bold mb-2">
                    <Info size={14} />
                    상황
                  </div>
                  <p className="text-white/90 font-medium">{caseItem.situation}</p>
                </div>

                <div className="relative bg-emerald-950/30 p-5 rounded-xl border border-emerald-900/50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-emerald-400 text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded-md">대응 스크립트</span>
                    <button 
                      onClick={() => handleCopy(caseItem.script)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300 hover:text-emerald-200 transition-colors"
                    >
                      <Copy size={14} />
                      복사하기
                    </button>
                  </div>
                  <pre className="text-emerald-100/90 text-[15px] whitespace-pre-wrap font-sans leading-relaxed">
                    {caseItem.script}
                  </pre>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      
      {/* Image Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm"
            onClick={() => setSelectedImage(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="absolute top-4 right-4 z-50">
                <button 
                  onClick={() => setSelectedImage(null)}
                  className="w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-auto w-full h-full p-2 bg-zinc-100 flex items-start justify-center">
                <Image src={selectedImage} alt="확대 이미지" width={1200} height={1600} className="w-full h-auto object-contain" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
