'use client';

import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Stethoscope } from 'lucide-react';

export default function DirectorTreatmentPage() {
  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
        <div className="w-20 h-20 bg-blue-100 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
          <Stethoscope className="w-10 h-10 text-blue-500" />
        </div>
        <h1 className="text-3xl font-black text-gray-900 mb-4">진료법 페이지 준비 중</h1>
        <p className="text-gray-500 text-center max-w-md">
          현재 원장님을 위한 맞춤형 진료법 가이드 및 영상 자료를 준비하고 있습니다. 조금만 기다려 주세요!
        </p>
      </div>
    </DashboardLayout>
  );
}
