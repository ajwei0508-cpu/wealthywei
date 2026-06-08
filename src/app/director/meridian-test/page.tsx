'use client';

import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Activity, Info } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MeridianTestPage() {
  const videoId = "VOSKYvP80lQ";

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto min-h-[calc(100vh-4rem)] flex flex-col">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center shadow-sm border border-purple-200">
              <Activity className="w-6 h-6 text-purple-600" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">수양명경락검사 설명</h1>
          </div>
          <p className="text-gray-500 pl-15">환자에게 검사 결과와 의미를 쉽고 명확하게 설명하는 가이드 영상입니다.</p>
        </div>

        {/* Content */}
        <div className="flex flex-col lg:flex-row gap-10 flex-1">
          {/* Video Player */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full lg:w-1/3 max-w-sm mx-auto lg:mx-0"
          >
            <div className="relative rounded-3xl overflow-hidden bg-black aspect-[9/16] shadow-2xl border border-gray-200">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&loop=1&playlist=${videoId}`}
                className="absolute inset-0 w-full h-full border-none outline-none"
                allow="autoplay; fullscreen"
                allowFullScreen
              />
            </div>
          </motion.div>

          {/* Explanation Text */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="w-full lg:w-2/3 flex flex-col gap-6"
          >
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex-1">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Info className="w-6 h-6 text-purple-500" />
                원장님을 위한 설명 가이드
              </h2>
              
              <div className="space-y-6">
                <div className="p-6 bg-purple-50/50 rounded-2xl border border-purple-100 transition-all hover:bg-purple-50">
                  <h3 className="font-bold text-purple-900 text-lg mb-3">1. 자율신경계 균형 (스트레스 반응)</h3>
                  <p className="text-gray-600 leading-relaxed">
                    스트레스에 대한 우리 몸의 반응을 조절하는 교감신경과 부교감신경의 균형 상태를 파악합니다. 이를 통해 만성 피로, 스트레스 누적 정도를 환자에게 객관적 수치로 시각화하여 설명할 수 있습니다.
                  </p>
                </div>

                <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100 transition-all hover:bg-blue-50">
                  <h3 className="font-bold text-blue-900 text-lg mb-3">2. 오장육부 경락 활성도 (기혈 흐름)</h3>
                  <p className="text-gray-600 leading-relaxed">
                    손발 끝의 주요 혈자리를 통해 각 장부의 에너지(기혈) 흐름을 측정합니다. 특정 장부의 기능이 항진되어 있는지, 혹은 저하되어 있는지를 그래프를 통해 알기 쉽게 안내합니다.
                  </p>
                </div>

                <div className="p-6 bg-emerald-50/50 rounded-2xl border border-emerald-100 transition-all hover:bg-emerald-50">
                  <h3 className="font-bold text-emerald-900 text-lg mb-3">3. 맞춤형 치료 방향 제시 (상담 포인트)</h3>
                  <p className="text-gray-600 leading-relaxed">
                    검사 결과를 바탕으로 현재의 통증이나 질환이 단순한 근골격계 문제가 아닌, 내부 장기의 불균형이나 자율신경계 이상에서 기인했음을 설명하고, <strong>한약 및 침 치료의 필요성</strong>을 효과적으로 강조합니다.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
