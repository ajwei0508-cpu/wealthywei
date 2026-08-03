"use client";

import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import { Play, ExternalLink, Video, Activity, Stethoscope, Maximize } from "lucide-react";

export default function JinmaekPage() {
  const [activeTab, setActiveTab] = useState<"gongjin" | "system">("gongjin");

  const toggleFullScreen = (e: React.MouseEvent<HTMLButtonElement>) => {
    const card = (e.currentTarget as HTMLElement).closest('.video-card');
    const container = card?.querySelector('.video-wrapper') as HTMLElement;
    if (!container) return;
    
    if (!document.fullscreenElement) {
      if (container.requestFullscreen) {
        container.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`);
          alert("전체 화면 모드를 지원하지 않는 환경입니다.");
        });
      } else if ((container as any).webkitRequestFullscreen) { /* Safari support */
        (container as any).webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#031C13] text-white p-8 overflow-x-hidden">
        <div className="max-w-6xl mx-auto space-y-12 mt-16 relative z-10">
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 flex items-center gap-4">
              <div className="p-4 bg-amber-500/10 rounded-3xl border border-amber-500/20">
                <Stethoscope size={40} className="text-amber-400" />
              </div>
              眞장부맥법 영상 자료실
            </h1>
            <p className="text-white/60 text-lg ml-2">진맥 시스템과 공진단 처방에 대한 핵심 인사이트를 확인하세요.</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col sm:flex-row gap-4 border-b border-white/10 pb-6"
          >
            <button 
              onClick={() => setActiveTab("gongjin")}
              className={`px-8 py-4 rounded-2xl font-bold transition-all flex items-center gap-3 ${activeTab === "gongjin" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/50 scale-105" : "bg-white/5 text-white/50 hover:bg-white/10"}`}
            >
              <span className="w-6 h-6 rounded-full bg-black/20 flex items-center justify-center text-xs">1</span>
              진맥으로 공진단 30환
            </button>
            <button 
              onClick={() => setActiveTab("system")}
              className={`px-8 py-4 rounded-2xl font-bold transition-all flex items-center gap-3 ${activeTab === "system" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/50 scale-105" : "bg-white/5 text-white/50 hover:bg-white/10"}`}
            >
              <span className="w-6 h-6 rounded-full bg-black/20 flex items-center justify-center text-xs">2</span>
              진장부맥 시스템 과정
            </button>
          </motion.div>

          <AnimatePresence mode="wait">
            {activeTab === "gongjin" && (
              <motion.div
                key="gongjin"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="video-card bg-gradient-to-b from-white/10 to-transparent border border-white/10 rounded-[3rem] p-8 md:p-12 shadow-2xl backdrop-blur-sm">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                    <h2 className="text-3xl font-black text-white flex items-center gap-3">
                      <div className="p-3 bg-rose-500/20 rounded-2xl">
                        <Video size={28} className="text-rose-400" />
                      </div>
                      진맥으로 공진단 30환
                    </h2>
                    <div className="flex gap-2">
                      <button 
                        onClick={toggleFullScreen}
                        className="flex items-center gap-2 text-sm bg-emerald-500/20 text-emerald-300 font-bold hover:bg-emerald-500/40 px-4 py-3 rounded-xl transition-all hover:scale-105 active:scale-95"
                      >
                        <Maximize size={16} />
                        전체 화면
                      </button>
                      <a 
                        href="https://naver.me/Flc1FqiV" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm bg-blue-500/20 text-blue-300 font-bold hover:bg-blue-500/40 px-4 py-3 rounded-xl transition-all hover:scale-105 active:scale-95"
                      >
                        <ExternalLink size={16} />
                        새 창 열기
                      </a>
                    </div>
                  </div>
                  <div className="video-wrapper w-full aspect-video rounded-3xl overflow-hidden bg-black/50 relative border-2 border-white/10 shadow-2xl group">
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                      <div className="text-white/20 flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/30"></div>
                        <span>영상 불러오는 중...</span>
                      </div>
                    </div>
                    <iframe 
                      src="https://naver.me/Flc1FqiV" 
                      className="w-full h-full border-0 relative z-10" 
                      allowFullScreen
                      sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-forms"
                    ></iframe>
                  </div>
                  <p className="mt-6 text-amber-500/70 text-sm font-bold text-center bg-amber-500/5 py-3 rounded-xl">
                    ※ 네이버 정책에 의해 직접 재생이 거부될 수 있습니다. 영상이 빈 화면으로 나오면 우측 상단의 '새 창에서 열기' 버튼을 눌러주세요.
                  </p>
                </div>
              </motion.div>
            )}

            {activeTab === "system" && (
              <motion.div
                key="system"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* 진맥 과정 */}
                  <div className="video-card bg-gradient-to-br from-white/10 to-transparent border border-white/10 rounded-[3rem] p-8 flex flex-col hover:border-white/20 transition-all">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-black text-white flex items-center gap-3">
                        <div className="p-3 bg-amber-500/20 rounded-2xl">
                          <Activity size={24} className="text-amber-400" />
                        </div>
                        진맥
                      </h2>
                      <div className="flex gap-2">
                        <button 
                          onClick={toggleFullScreen}
                          className="flex items-center gap-2 text-xs font-bold bg-white/10 text-emerald-400 hover:bg-white/20 px-3 py-2 rounded-xl transition-all"
                        >
                          <Maximize size={14} />
                          전체 화면
                        </button>
                        <a 
                          href="https://naver.me/5yWpGWuu" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-xs font-bold bg-white/10 text-white hover:bg-white/20 px-3 py-2 rounded-xl transition-all"
                        >
                          <ExternalLink size={14} />
                          새 창 열기
                        </a>
                      </div>
                    </div>
                    <div className="video-wrapper w-full aspect-video rounded-2xl overflow-hidden bg-black/50 relative border-2 border-white/10 flex-grow shadow-lg">
                      <iframe 
                        src="https://naver.me/5yWpGWuu" 
                        className="w-full h-full border-0" 
                        allowFullScreen
                        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-forms"
                      ></iframe>
                    </div>
                  </div>

                  {/* 결론 */}
                  <div className="video-card bg-gradient-to-br from-emerald-900/20 to-transparent border border-white/10 rounded-[3rem] p-8 flex flex-col hover:border-emerald-500/30 transition-all">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-black text-white flex items-center gap-3">
                        <div className="p-3 bg-emerald-500/20 rounded-2xl">
                          <Play size={24} className="text-emerald-400" />
                        </div>
                        결론
                      </h2>
                      <div className="flex gap-2">
                        <button 
                          onClick={toggleFullScreen}
                          className="flex items-center gap-2 text-xs font-bold bg-white/10 text-emerald-400 hover:bg-white/20 px-3 py-2 rounded-xl transition-all"
                        >
                          <Maximize size={14} />
                          전체 화면
                        </button>
                        <a 
                          href="https://naver.me/FRuHRuCN" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-xs font-bold bg-white/10 text-white hover:bg-white/20 px-3 py-2 rounded-xl transition-all"
                        >
                          <ExternalLink size={14} />
                          새 창 열기
                        </a>
                      </div>
                    </div>
                    <div className="video-wrapper w-full aspect-video rounded-2xl overflow-hidden bg-black/50 relative border-2 border-emerald-500/20 flex-grow shadow-lg">
                      <iframe 
                        src="https://naver.me/FRuHRuCN" 
                        className="w-full h-full border-0" 
                        allowFullScreen
                        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-forms"
                      ></iframe>
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-amber-500/70 text-sm font-bold text-center bg-amber-500/5 py-3 rounded-xl max-w-2xl mx-auto">
                  ※ 영상 뷰어 권한 문제로 빈 화면이 나올 경우, 우측 상단의 '새 창 열기' 링크를 클릭하여 외부에서 감상하시기 바랍니다.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          
        </div>
        {/* Background glow effects */}
        <div className="absolute top-40 left-0 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>
        <div className="absolute top-80 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>
      </div>
    </DashboardLayout>
  );
}
