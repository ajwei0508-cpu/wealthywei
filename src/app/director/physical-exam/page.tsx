'use client';

import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Activity } from 'lucide-react';

export default function DirectorPhysicalExamPage() {
  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
        <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
          <Activity className="w-10 h-10 text-emerald-500" />
        </div>
        <h1 className="text-3xl font-black text-gray-900 mb-4">이학적검사 페이지 준비 중</h1>
        <p className="text-gray-500 text-center max-w-md">
          상세한 이학적 검사 방법과 체크리스트가 곧 업데이트될 예정입니다.
        </p>
      </div>
    </DashboardLayout>
  );
}
