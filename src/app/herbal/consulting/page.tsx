'use client';

import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { ExternalLink, Video, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const HERBAL_VIDEOS = [
  { category: "한약씨앗 심기", items: [
    { id: "seed_1", title: "검진 이상 없는 씨앗", url: "https://naver.me/Fc6P4b7N" },
    { id: "seed_2", title: "결정권 없는 씨앗", url: "https://naver.me/F6Q25oJ9" },
    { id: "seed_3", title: "결정권 제한 씨앗", url: "https://naver.me/GLhRwIMm" },
    { id: "seed_4", title: "환자 진술에 맞춘 씨앗", url: "https://naver.me/FVFHXaoA" }
  ]},
  { category: "한약 상담", items: [
    { id: "consult_1", title: "종합검사(연복)", url: "http://naver.me/xOxXcFGE" },
    { id: "consult_2", title: "상황별 상담", url: "https://naver.me/GVVnDHk8" }
  ]},
  { category: "복용법 안내", items: [
    { id: "guide_1", title: "한약 복용법 설명", url: "http://naver.me/Fk7iCMq6" }
  ]},
  { category: "중간 진맥", items: [
    { id: "pulse_1", title: "중간 진맥", url: "http://naver.me/GvcCCdk9" }
  ]}
];

export default function HerbalConsultingPage() {
  const [selectedVideo, setSelectedVideo] = useState<{title: string, url: string} | null>(null);

  const handleVideoClick = (video: {title: string, url: string}) => {
    setSelectedVideo(video);
  };

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto min-h-[calc(100vh-4rem)]">
        
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center shadow-sm border border-amber-500/20">
              <Video className="w-6 h-6 text-amber-400" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">한약 상담 영상</h1>
          </div>
          <p className="text-white/50 pl-15">네이버 MYBOX 링크는 보안상 새 창에서 열리며, 유튜브 주소로 교체 시 즉시 재생됩니다.</p>
        </div>

        {/* Video Grid by Category */}
        <div className="space-y-12 pb-10">
          {HERBAL_VIDEOS.map((section) => (
            <div key={section.category}>
              <h2 className="text-xl font-bold text-amber-300 mb-4 flex items-center gap-2">
                <div className="w-1.5 h-6 bg-amber-400 rounded-full"></div>
                {section.category}
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                {section.items.map((video, idx) => (
                  <motion.div 
                    key={video.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => handleVideoClick(video)}
                    className="group relative cursor-pointer rounded-2xl overflow-hidden bg-black/40 aspect-video shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-white/10 hover:border-amber-500 flex flex-col items-center justify-center"
                  >
                    <Video className="w-10 h-10 text-white/20 group-hover:text-amber-400/50 transition-colors mb-3" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm">
                      <div className="w-12 h-12 bg-amber-500/90 text-white rounded-full flex items-center justify-center scale-90 group-hover:scale-110 shadow-lg transition-transform duration-300">
                        <ExternalLink className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent p-4 pt-10 text-center">
                      <h3 className="text-white font-bold text-sm leading-tight">{video.title}</h3>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selectedVideo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
            onClick={() => setSelectedVideo(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-2xl bg-[#0a0a0a] rounded-2xl overflow-hidden shadow-2xl border border-white/10"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-center z-10 pointer-events-none">
                <h3 className="text-white font-bold drop-shadow-md">{selectedVideo.title}</h3>
                <button 
                  onClick={() => setSelectedVideo(null)}
                  className="w-8 h-8 bg-black/50 hover:bg-black/80 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-colors pointer-events-auto"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="pt-16 pb-8 px-8 flex flex-col items-center text-center">
                {(selectedVideo.url.includes('naver.me') || selectedVideo.url.includes('mybox.pstatic.net')) ? (
                  <div className="py-12 px-6 flex flex-col items-center">
                    <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mb-6 border border-amber-500/20">
                      <AlertCircle className="w-8 h-8 text-amber-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">네이버 MYBOX 링크 안내</h3>
                    <p className="text-white/70 mb-8 max-w-md">
                      이 주소는 네이버 보안 정책상 우리 웹사이트 안에서 자동 재생이 제한되는 '클라우드 폴더 주소'입니다.<br/><br/>
                      <span className="text-amber-400 font-bold">이곳에서 즉시 재생되도록 하려면 영상을 '유튜브(일부공개)'로 업로드하여 주소를 변경해야 합니다.</span>
                    </p>
                    
                    <button
                      onClick={() => window.open(selectedVideo.url, '_blank')}
                      className="bg-amber-500 hover:bg-amber-600 text-black font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-colors"
                    >
                      네이버에서 새 창으로 열기 <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="w-full aspect-video bg-black rounded-xl overflow-hidden flex items-center justify-center relative">
                    <p className="text-white/50 text-sm absolute">유튜브 등 외부 플레이어가 렌더링되는 영역입니다.</p>
                    {/* Placeholder for YouTube iframe */}
                    <iframe 
                      className="w-full h-full relative z-10"
                      src={selectedVideo.url} 
                      title={selectedVideo.title} 
                      frameBorder="0" 
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                      allowFullScreen 
                    />
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
