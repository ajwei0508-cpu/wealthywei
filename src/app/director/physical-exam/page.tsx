'use client';

import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Activity, Play, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const EXAM_VIDEOS = [
  { id: "vZslcyGN4IE", title: "SLRT" },
  { id: "DfePXX0c3ys", title: "무릎" },
  { id: "NDwmAan88Co", title: "bi lslrt" },
  { id: "nj5tJU7EGSo", title: "xcross" },
  { id: "BPIz7P6HPm8", title: "고관절" }
];

export default function DirectorPhysicalExamPage() {
  const [selectedVideo, setSelectedVideo] = useState<{ id: string, title: string } | null>(null);

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto min-h-[calc(100vh-4rem)]">
        
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center shadow-sm border border-emerald-200">
              <Activity className="w-6 h-6 text-emerald-600" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">이학적검사 가이드</h1>
          </div>
          <p className="text-gray-500 pl-15">부위별 정확하고 신속한 이학적 검사 방법을 영상으로 확인하세요.</p>
        </div>

        {/* Video Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 pb-10">
          {EXAM_VIDEOS.map((video, idx) => (
            <motion.div 
              key={video.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => setSelectedVideo(video)}
              className="group relative cursor-pointer rounded-2xl overflow-hidden bg-gray-900 aspect-[9/16] shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-200 hover:border-emerald-400"
            >
              {/* Thumbnail Background */}
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-60 group-hover:opacity-40 transition-opacity"
                style={{ backgroundImage: `url(https://i.ytimg.com/vi/${video.id}/maxresdefault.jpg), url(https://i.ytimg.com/vi/${video.id}/hqdefault.jpg)` }}
              />
              
              {/* Play Button Overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-14 bg-emerald-500/90 text-white rounded-full flex items-center justify-center backdrop-blur-sm scale-90 group-hover:scale-110 shadow-lg shadow-emerald-500/30 transition-transform duration-300">
                  <Play fill="currentColor" className="ml-1 w-6 h-6" />
                </div>
              </div>

              {/* Title Bar */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-5 pt-12">
                <h3 className="text-white font-bold text-lg">{video.title}</h3>
                <p className="text-emerald-300 text-xs mt-1 font-medium">이학적검사 1분 요약</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Video Modal */}
      <AnimatePresence>
        {selectedVideo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm"
            onClick={() => setSelectedVideo(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm aspect-[9/16] bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10"
              onClick={e => e.stopPropagation()}
            >
              <div className="absolute top-4 right-4 z-50">
                <button 
                  onClick={() => setSelectedVideo(null)}
                  className="w-10 h-10 bg-black/50 hover:bg-white/20 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-colors border border-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <iframe
                src={`https://www.youtube.com/embed/${selectedVideo.id}?autoplay=1&loop=1&playlist=${selectedVideo.id}`}
                className="w-full h-full border-none outline-none"
                allow="autoplay; fullscreen"
                allowFullScreen
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
