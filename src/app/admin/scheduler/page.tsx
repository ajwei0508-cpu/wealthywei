"use client";

import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Calendar, Clock, Edit2, Play, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface ScheduleItem {
  id: string;
  date: string;
  dayOfWeek: string;
  timeSlot: string;
  keyword: string;
  status: '대기중' | '생성중' | '완료' | '실패';
}

const generateInitialSchedules = (): ScheduleItem[] => {
  const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  const today = new Date();

  return Array.from({ length: 7 }).map((_, index) => {
    const d = new Date(today);
    d.setDate(today.getDate() + index);
    
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dayOfWeek = dayNames[d.getDay()];
    
    return {
      id: `day-${index}`,
      date: `${yyyy}-${mm}-${dd}`,
      dayOfWeek: index === 0 ? `오늘 (${dayOfWeek})` : dayOfWeek,
      timeSlot: '09:00', // 기본 시간
      keyword: '',
      status: '대기중'
    };
  });
};

export default function BlogScheduler() {
  const [schedules, setSchedules] = useState<ScheduleItem[]>(generateInitialSchedules());
  const [isSystemActive, setIsSystemActive] = useState<boolean>(true);

  const handleKeywordChange = (id: string, newKeyword: string) => {
    setSchedules(prev => prev.map(item => item.id === id ? { ...item, keyword: newKeyword } : item));
  };

  const handleDateChange = (id: string, newDate: string) => {
    setSchedules(prev => prev.map(item => item.id === id ? { ...item, date: newDate } : item));
  };

  const handleTimeChange = (id: string, newTime: string) => {
    setSchedules(prev => prev.map(item => item.id === id ? { ...item, timeSlot: newTime } : item));
  };

  const triggerGeneration = async (id: string) => {
    if (!isSystemActive) {
      toast.error('시스템 작동 스위치가 꺼져있습니다. 오른쪽 상단의 스위치를 켜주세요.');
      return;
    }

    const target = schedules.find(item => item.id === id);
    if (!target || !target.keyword.trim()) {
      toast.error('타겟 키워드를 먼저 입력해주세요.');
      return;
    }

    // 상태를 '생성중'으로 변경
    setSchedules(prev => prev.map(item => item.id === id ? { ...item, status: '생성중' } : item));

    try {
      toast.success(`${target.keyword} 포스팅 생성을 시작합니다.\n(약 1~2분 소요)`);
      const res = await fetch('/api/generate-blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: target.keyword }),
      });
      if (res.ok) {
        setSchedules(prev => prev.map(item => item.id === id ? { ...item, status: '완료' } : item));
        toast.success(`${target.keyword} 포스팅과 이미지가 성공적으로 완성되었습니다!`);
      } else {
        setSchedules(prev => prev.map(item => item.id === id ? { ...item, status: '실패' } : item));
        toast.error(`${target.keyword} 포스팅 생성에 실패했습니다.`);
      }
    } catch (error) {
      setSchedules(prev => prev.map(item => item.id === id ? { ...item, status: '실패' } : item));
      toast.error(`서버 오류로 인해 실패했습니다.`);
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#031C13] p-8 md:p-12 text-white font-sans selection:bg-emerald-600/30">
        <div className="max-w-7xl mx-auto space-y-8 mt-16">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
                <Calendar className="text-emerald-400" size={32} />
                예약형 자동화 블로그 생성기
              </h1>
              <p className="text-emerald-400/80 font-medium">타겟 키워드를 설정하면 LLM 텍스트 작성과 고화질 이미지 6장이 순차적으로 자동 생성됩니다.</p>
            </div>
            
            {/* System Toggle Switch */}
            <div className="flex items-center gap-3 bg-black/20 p-3 rounded-xl border border-white/10 shrink-0">
              <div className="flex flex-col text-right">
                <span className="text-sm font-bold text-white">시스템 작동 스위치</span>
                <span className="text-[10px] text-slate-400">{isSystemActive ? '자동화 엔진 가동 중' : '안전 모드 (일시정지)'}</span>
              </div>
              <button
                onClick={() => setIsSystemActive(!isSystemActive)}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${isSystemActive ? 'bg-emerald-500' : 'bg-slate-600'}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${isSystemActive ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-[#0B3A28]/50 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-sm font-bold text-slate-300">
                    <th className="p-5">발행 예정일</th>
                    <th className="p-5">시간대</th>
                    <th className="p-5 min-w-[250px]">타겟 키워드 (수정 가능)</th>
                    <th className="p-5">상태</th>
                    <th className="p-5 text-right">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {schedules.map((item) => (
                    <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                      <td className="p-5 font-bold text-white/90 align-top">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-xs font-black text-emerald-400">{item.dayOfWeek}</span>
                          <input
                            type="date"
                            value={item.date}
                            onChange={(e) => handleDateChange(item.id, e.target.value)}
                            disabled={item.status === '생성중' || item.status === '완료'}
                            className="bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50 text-white [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                          />
                        </div>
                      </td>
                      <td className="p-5 text-sm font-medium text-slate-400 align-top">
                        <div className="flex items-center gap-2 mt-5">
                          <Clock size={16} className="text-amber-400 shrink-0" />
                          <input
                            type="time"
                            value={item.timeSlot}
                            onChange={(e) => handleTimeChange(item.id, e.target.value)}
                            disabled={item.status === '생성중' || item.status === '완료'}
                            className="bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50 text-white [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                          />
                        </div>
                      </td>
                      <td className="p-5 align-top">
                        <div className="relative">
                          <input
                            type="text"
                            value={item.keyword}
                            onChange={(e) => handleKeywordChange(item.id, e.target.value)}
                            disabled={item.status === '생성중' || item.status === '완료'}
                            className="w-full px-4 py-2.5 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all pl-10"
                            placeholder="키워드를 입력하세요"
                          />
                          <Edit2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                        </div>
                      </td>
                      <td className="p-5 align-top pt-8">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border
                          ${item.status === '대기중' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : ''}
                          ${item.status === '생성중' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse' : ''}
                          ${item.status === '완료' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : ''}
                          ${item.status === '실패' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : ''}
                        `}>
                          {item.status === '생성중' && <Loader2 size={12} className="animate-spin" />}
                          {item.status === '완료' && <CheckCircle2 size={12} />}
                          {item.status === '실패' && <AlertCircle size={12} />}
                          {item.status === '대기중' && <Clock size={12} />}
                          {item.status}
                        </div>
                      </td>
                      <td className="p-5 text-right align-top pt-6">
                        <button
                          onClick={() => triggerGeneration(item.id)}
                          disabled={!item.keyword.trim() || item.status === '생성중' || item.status === '완료' || !isSystemActive}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-white/30 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-900/20 transition-all active:scale-95 disabled:scale-100 disabled:shadow-none disabled:cursor-not-allowed"
                        >
                          {item.status === '대기중' ? (
                            <>
                              <Play size={14} className="fill-current" />
                              지금 즉시 생성
                            </>
                          ) : (
                            item.status
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Status Information Note */}
            <div className="bg-black/20 p-5 border-t border-white/5 flex items-start gap-3">
              <AlertCircle size={18} className="text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Vercel의 Serverless Function 타임아웃 제한으로 인해 동시에 여러 개를 생성할 경우 에러가 발생할 수 있습니다.<br />
                <strong className="text-white">생성 소요 시간은 대본 추출(약 10초) + 고해상도 이미지 6장 생성(약 1~2분)</strong>이 소요됩니다. 여유를 갖고 기다려주세요.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
