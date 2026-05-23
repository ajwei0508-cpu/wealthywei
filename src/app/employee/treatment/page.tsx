"use client";

import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Play, Clock, Tag, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function TreatmentTrainingPage() {
  const [selectedVideo, setSelectedVideo] = useState<any | null>(null);

  // 임시 영상 데이터 배열
  const videos = [
    {
      id: "hotpack-1",
      title: "핫팩 교육",
      category: "치료실 기본",
      duration: "03:15",
      description: "안전하고 효과적인 핫팩 준비 및 환자 적용 방법에 대한 교육 영상입니다.",
      url: "https://api.wecandeo.com/video/default/BOKNS9AQWrHtcygjPaNnukLKu689JLEt1WZB3isU4TA2etO1g27tbWfMxzxNx4FQQZvSUKjqXHhYhObdRmzdblAieie.mp4",
      thumbnail: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=1453&auto=format&fit=crop" // 임시 썸네일
    },
    {
      id: "ict-1",
      title: "ICT 교육",
      category: "기기 사용법",
      duration: "05:00",
      description: "간섭파 치료기(ICT)의 올바른 사용법 및 주의사항에 대한 교육 영상입니다.",
      url: "https://api.wecandeo.com/video/default/BOKNS9AQWrHtcygjPaNnukLKu689JLEt1WZB3isU4TA0AsO2TDCYmiivMxzxNx4FQQZvSUKjqXHhYaymDfVtb3uAieie.mp4",
      thumbnail: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=1453&auto=format&fit=crop" // 임시 썸네일
    },
    {
      id: "ict-2",
      title: "ICT 스펀지 소독",
      category: "위생 관리",
      duration: "03:00",
      description: "ICT 스펀지의 올바른 세척 및 소독 방법에 대한 교육 영상입니다.",
      url: "https://api.wecandeo.com/video/default/BOKNS9AQWrHtcygjPaNnukLKu689JLEt1WZB3isU4TA0lAlzqSy8gxvMxzxNx4FQQZvSUKjqXHhY3uPTTL4WY0Qieie.mp4",
      thumbnail: "https://images.unsplash.com/photo-1584432810601-6c7f27d2362b?q=80&w=1453&auto=format&fit=crop" // 임시 썸네일
    },
    {
      id: "microwave-1",
      title: "극초단파 교육",
      category: "기기 사용법",
      duration: "05:00",
      description: "극초단파 기기의 올바른 사용법 및 주의사항에 대한 교육 영상입니다.",
      url: "https://api.wecandeo.com/video/default/BOKNS9AQWrHtcygjPaNnukLKu689JLEt1WZB3isU4TA002bl8aepFuisMxzxNx4FQQZvSUKjqXHhZYF7Dea4wv2Qieie.mp4",
      thumbnail: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=1453&auto=format&fit=crop"
    },
    {
      id: "cupping-1",
      title: "부항컵 제조",
      category: "치료실 기본",
      duration: "04:30",
      description: "부항컵 제조 및 관리에 대한 교육 영상입니다.",
      url: "https://play.wecandeo.com/video/v/?key=BOKNS9AQWrHtcygjPaNnukLKu689JLEt1WZB3isU4TA3W6oXzd2yTUAieie",
      thumbnail: "https://images.unsplash.com/photo-1584432810601-6c7f27d2362b?q=80&w=1453&auto=format&fit=crop"
    },
    {
      id: "sono-1",
      title: "소노 교육",
      category: "기기 사용법",
      duration: "05:00",
      description: "소노(초음파) 치료기 사용법 및 주의사항에 대한 교육 영상입니다.",
      url: "https://api.wecandeo.com/video/default/BOKNS9AQWrHtcygjPaNnukLKu689JLEt1WZB3isU4TA1iiaiidnubCZsPMxzxNx4FQQZvSUKjqXHhZnJFNipdcriihAieie.mp4",
      thumbnail: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=1453&auto=format&fit=crop"
    },
    {
      id: "magnetic-1",
      title: "자기장 교육",
      category: "기기 사용법",
      duration: "05:00",
      description: "자기장 치료기 사용법 및 주의사항에 대한 교육 영상입니다.",
      url: "https://api.wecandeo.com/video/default/BOKNS9AQWrHtcygjPaNnukLKu689JLEt1WZB3isU4TA12aKe7Agl2efMxzxNx4FQQZvSUKjqXHhbVyfo7TsHsIAieie.mp4",
      thumbnail: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=1453&auto=format&fit=crop"
    },
    {
      id: "chuna-prep-1",
      title: "추나 준비 안내",
      category: "치료실 기본",
      duration: "05:00",
      description: "추나 요법 전 준비 및 환자 안내 방법에 대한 교육 영상입니다.",
      url: "https://www.youtube.com/embed/7DljE5rgVqM",
      thumbnail: "https://img.youtube.com/vi/7DljE5rgVqM/hqdefault.jpg"
    }
  ];

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto h-full overflow-y-auto">
        <div className="mb-10">
          <h1 className="text-3xl font-black text-white mb-2">치료실 교육</h1>
          <p className="text-white/60">치료실 업무 매뉴얼 및 실무 교육 영상을 확인하세요.</p>
        </div>

        {/* 필터 칩 (UI용) */}
        <div className="flex gap-2 mb-8">
          <button className="px-4 py-2 bg-blue-500 text-white rounded-full text-sm font-bold shadow-lg shadow-blue-500/20">
            전체 보기
          </button>
          <button className="px-4 py-2 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white rounded-full text-sm font-bold transition-all">
            치료실 기본
          </button>
          <button className="px-4 py-2 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white rounded-full text-sm font-bold transition-all">
            기기 사용법
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <motion.div 
              key={video.id}
              whileHover={{ y: -5 }}
              className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden cursor-pointer group hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col"
              onClick={() => setSelectedVideo(video)}
            >
              <div className="relative aspect-video bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden border-b border-white/5">
                {/* 텍스트 썸네일 */}
                <div className="absolute inset-0 flex items-center justify-center p-6 text-center group-hover:scale-105 transition-transform duration-500">
                  <h2 className="text-white/90 font-black text-2xl drop-shadow-md break-keep">
                    {video.title}
                  </h2>
                </div>
                {/* Hover Play Button */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40 backdrop-blur-[2px]">
                  <div className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center scale-90 group-hover:scale-100 transition-transform duration-300 shadow-xl text-white">
                    <Play fill="currentColor" className="ml-1" size={24} />
                  </div>
                </div>
                <div className="absolute bottom-3 right-3 bg-black/60 px-2 py-1 rounded-md flex items-center gap-1.5 text-xs font-bold text-white backdrop-blur-md">
                  <Clock size={12} className="text-blue-400" />
                  {video.duration}
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-bold px-2.5 py-1 bg-blue-500/20 text-blue-300 rounded-md flex items-center gap-1 border border-blue-500/20">
                    <Tag size={10} />
                    {video.category}
                  </span>
                </div>
                <h3 className="text-white font-bold text-lg mb-2 group-hover:text-blue-400 transition-colors">{video.title}</h3>
                <p className="text-white/40 text-sm line-clamp-2 leading-relaxed">{video.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Video Player Modal */}
      <AnimatePresence>
        {selectedVideo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 bg-black/90 backdrop-blur-md"
            onClick={() => setSelectedVideo(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-5xl bg-[#0F172A] rounded-2xl overflow-hidden shadow-2xl border border-white/10"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/20">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <Play size={16} className="text-blue-400" />
                  {selectedVideo.title}
                </h3>
                <button 
                  onClick={() => setSelectedVideo(null)}
                  className="w-8 h-8 hover:bg-white/10 rounded-full flex items-center justify-center text-white/50 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="aspect-video bg-black w-full relative">
                {selectedVideo.url.includes('.mp4') ? (
                  <video 
                    src={selectedVideo.url} 
                    controls 
                    autoPlay 
                    className="w-full h-full object-contain outline-none"
                    controlsList="nodownload"
                  />
                ) : (
                  <iframe
                    src={selectedVideo.url}
                    className="w-full h-full border-none outline-none"
                    allowFullScreen
                    allow="autoplay; fullscreen"
                  />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
