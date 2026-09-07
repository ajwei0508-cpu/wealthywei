'use client';

import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { MessageSquare, Copy } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const SMS_TEMPLATES = [
  {
    title: "처음 안내문자",
    content: `한약 스케줄 안내드립니다.\n안녕하세요 xxx님 바른한의원 입니다.\n\n총 3제 xx일 처방을 x번(xx일씩)을 나누어서 달여드릴 예정입니다.\n복용종료 1주전에 진맥 예약 전화드리겠습니다.\n재진맥을 통해 원장님께서 꼼꼼하게 체질상태를 파악후 추가 해야할 약재를 비용 없이 보강해드립니다.\n궁금하신 상황은 언제든 편하게 문의 주세요.\n믿고 건강을 맡겨주신 만큼 신뢰 있는 한약으로 보답하겠습니다.`
  },
  {
    title: "재 처방 안내 문자",
    content: `한약 스케줄 안내드립니다.\n안녕하세요 xxx님 바른한의원 입니다.\n\n현재 x회중 x회(xx일) 처방입니다.\n이번 한약은 xxxx이 보강되었습니다.\n복용종료 1주전에 진맥 예약 전화드리겠습니다.\n궁금하신 상황은 언제든 편하게 문의 주세요.\n믿고 건강을 맡겨주신 만큼 신뢰 있는 한약으로 보답하겠습니다.`
  },
  {
    title: "마지막 처방 안내문자",
    content: `한약 스케줄 안내드립니다.\n안녕하세요 xxx님 바른한의원 입니다.\n\n현재 x회중 마지막 x회(xx일) 처방입니다.\n이번 한약은 xxxx이 보강되었습니다.\n복용종료후 건강해진 몸 상태 재검사 예약 전화드리겠습니다.\n궁금하신 상황은 언제든 편하게 문의 주세요.\n믿고 건강을 맡겨주신 만큼 신뢰 있는 한약으로 보답하겠습니다.`
  }
];

export default function HerbalSmsGuidePage() {
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("문자 내용이 복사되었습니다.");
  };

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto min-h-[calc(100vh-4rem)]">
        
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center shadow-sm border border-blue-500/20">
              <MessageSquare className="w-6 h-6 text-blue-400" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">한약 문자 안내</h1>
          </div>
          <p className="text-white/50 pl-15">환자에게 발송할 안내 문자를 확인하고 바로 복사하여 사용할 수 있습니다.</p>
        </div>

        {/* SMS Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {SMS_TEMPLATES.map((template, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-[#031C13] rounded-2xl overflow-hidden border border-white/10 shadow-lg flex flex-col"
            >
              {/* Card Header */}
              <div className="bg-black/40 px-6 py-4 flex items-center justify-between border-b border-white/5">
                <h3 className="text-amber-300 font-bold">{template.title}</h3>
                <button 
                  onClick={() => handleCopy(template.content)}
                  className="flex items-center gap-2 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Copy size={14} />
                  복사하기
                </button>
              </div>

              {/* Card Body */}
              <div className="p-6 flex-1 bg-black/20">
                <div className="relative">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/50 rounded-full"></div>
                  <pre className="pl-4 text-white/80 text-[15px] whitespace-pre-wrap font-sans leading-relaxed">
                    {template.content}
                  </pre>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
