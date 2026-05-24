"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Play, Clock, Tag, X, CheckCircle2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";

export default function ReceptionTrainingPage() {
  const [selectedVideo, setSelectedVideo] = useState<any | null>(null);
  const [watchedVideos, setWatchedVideos] = useState<string[]>([]);
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user?.email) {
      const stored = localStorage.getItem(`watched_reception_${session.user.email}`);
      if (stored) {
        try {
          setWatchedVideos(JSON.parse(stored));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [session?.user?.email]);

  const handleWatchComplete = (id: string) => {
    if (!session?.user?.email) return;
    if (!watchedVideos.includes(id)) {
      const newWatched = [...watchedVideos, id];
      setWatchedVideos(newWatched);
      localStorage.setItem(`watched_reception_${session.user.email}`, JSON.stringify(newWatched));
    }
  };

  // ?꾩떆 ?곸긽 ?곗씠??諛곗뿴
  const videos = [
    {
      id: "sugar-test-1",
      title: "??寃??援먯쑁",
      category: "寃??援먯쑁",
      duration: "05:00",
      description: "??寃??吏꾪뻾 諛⑸쾿 諛?二쇱쓽?ы빆?????援먯쑁 ?곸긽?낅땲??",
      url: "https://api.wecandeo.com/video/default/BOKNS9AQWrHtcygjPaNnuiiYWRC40kWDc1WZB3isU4TA2YzaipAXb9Q0vMxzxNx4FQQZvSUKjqXHhYcKiih4ippW9Ugieie.mp4",
      thumbnail: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=1453&auto=format&fit=crop"
    },
    {
      id: "liver-test-1",
      title: "媛??섏튂 寃??援먯쑁",
      category: "寃??援먯쑁",
      duration: "05:00",
      description: "媛??섏튂 寃??吏꾪뻾 諛⑸쾿 諛?二쇱쓽?ы빆?????援먯쑁 ?곸긽?낅땲??",
      url: "https://api.wecandeo.com/video/default/BOKNS9AQWrHtcygjPaNnuiiYWRC40kWDc1WZB3isU4TA13D2NPcgdc1PMxzxNx4FQQZvSUKjqXHhZXZ2aLXaSThQieie.mp4",
      thumbnail: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=1453&auto=format&fit=crop"
    },
    {
      id: "first-visit-1",
      title: "珥덉쭊 ?묒닔",
      category: "?섏옄 ?묐?",
      duration: "05:00",
      description: "珥덉쭊 ?섏옄 ?묒닔 諛??묐? 諛⑸쾿?????援먯쑁 ?곸긽?낅땲??",
      url: "https://www.youtube.com/embed/sH9tIazfEw8",
      thumbnail: "https://img.youtube.com/vi/sH9tIazfEw8/hqdefault.jpg"
    },
    {
      id: "re-first-visit-1",
      title: "?ъ큹吏꾩젒??,
      category: "?섏옄 ?묐?",
      duration: "05:00",
      description: "?ъ큹吏??섏옄 ?묒닔 諛??묐? 諛⑸쾿?????援먯쑁 ?곸긽?낅땲??",
      url: "https://www.youtube.com/embed/ePWOPsa8JF4",
      thumbnail: "https://img.youtube.com/vi/ePWOPsa8JF4/hqdefault.jpg"
    },
    {
      id: "re-visit-1",
      title: "?ъ쭊 ?묒닔",
      category: "?섏옄 ?묐?",
      duration: "05:00",
      description: "?ъ쭊 ?섏옄 ?묒닔 諛??묐? 諛⑸쾿?????援먯쑁 ?곸긽?낅땲??",
      url: "https://www.youtube.com/embed/InRHGLoNKoI",
      thumbnail: "https://img.youtube.com/vi/InRHGLoNKoI/hqdefault.jpg"
    },
    {
      id: "id-request-1",
      title: "?좊텇利??붿껌",
      category: "?섏옄 ?묐?",
      duration: "05:00",
      description: "?섏옄 ?좊텇利??붿껌 諛??묐? 諛⑸쾿?????援먯쑁 ?곸긽?낅땲??",
      url: "https://www.youtube.com/embed/KRcsxVHvUvY",
      thumbnail: "https://img.youtube.com/vi/KRcsxVHvUvY/hqdefault.jpg"
    },
    {
      id: "privacy-consent-1",
      title: "媛쒖씤?뺣낫 ?ъ씤 ?숈쓽",
      category: "?섏옄 ?묐?",
      duration: "05:00",
      description: "媛쒖씤?뺣낫 ?섏쭛 諛??쒖슜 ?숈쓽???덈궡 諛??쒕챸 諛⑸쾿?????援먯쑁 ?곸긽?낅땲??",
      url: "https://www.youtube.com/embed/O4t9BXkgelQ",
      thumbnail: "https://img.youtube.com/vi/O4t9BXkgelQ/hqdefault.jpg"
    },
    {
      id: "payment-guide-1",
      title: "寃곗젣 ?덈궡",
      category: "?섏옄 ?묐?",
      duration: "05:00",
      description: "?섏옄 吏꾨즺鍮?寃곗젣 諛??섎궔 ?덈궡 諛⑸쾿?????援먯쑁 ?곸긽?낅땲??",
      url: "https://www.youtube.com/embed/Y679VyHWdBU",
      thumbnail: "https://img.youtube.com/vi/Y679VyHWdBU/hqdefault.jpg"
    },
    {
      id: "insurance-claim-1",
      title: "?ㅻ퉬 泥?뎄 ?덈궡",
      category: "?섏옄 ?묐?",
      duration: "05:00",
      description: "?섏옄 ?ㅼ넀蹂댄뿕(?ㅻ퉬) 泥?뎄 ?쒕쪟 諛??덉감 ?덈궡 諛⑸쾿?????援먯쑁 ?곸긽?낅땲??",
      url: "https://www.youtube.com/embed/u3V_ggc8taE",
      thumbnail: "https://img.youtube.com/vi/u3V_ggc8taE/hqdefault.jpg"
    },
    {
      id: "meridian-test-1",
      title: "?섏뼇紐낃꼍?쎄????덈궡",
      category: "寃??援먯쑁",
      duration: "05:00",
      description: "?섏뼇紐낃꼍?쎄???吏꾪뻾 諛⑸쾿 諛??섏옄 ?덈궡?????援먯쑁 ?곸긽?낅땲??",
      url: "https://www.youtube.com/embed/OnqdPqXb6gE",
      thumbnail: "https://img.youtube.com/vi/OnqdPqXb6gE/hqdefault.jpg"
    },
    {
      id: "reservation-guide-1",
      title: "?덉빟 ?덈궡",
      category: "?섏옄 ?묐?",
      duration: "05:00",
      description: "?섏옄 吏꾨즺 ?덉빟 諛??묐? 諛⑸쾿?????援먯쑁 ?곸긽?낅땲??",
      url: "https://www.youtube.com/embed/OX9MqqiP_v8",
      thumbnail: "https://img.youtube.com/vi/OX9MqqiP_v8/hqdefault.jpg"
    },
    {
      id: "blood-pressure-guide-1",
      title: "?덉븬 ?덈궡",
      category: "寃??援먯쑁",
      duration: "05:00",
      description: "?섏옄 ?덉븬 痢≪젙 諛??덈궡 諛⑸쾿?????援먯쑁 ?곸긽?낅땲??",
      url: "https://www.youtube.com/embed/I4e6TR6wlqI",
      thumbnail: "https://img.youtube.com/vi/I4e6TR6wlqI/hqdefault.jpg"
    },
    {
      id: "thermography-test-1",
      title: "泥댁뿴吏꾨떒寃??,
      category: "寃??援먯쑁",
      duration: "05:00",
      description: "泥댁뿴吏꾨떒寃??吏꾪뻾 諛⑸쾿 諛??섏옄 ?덈궡?????援먯쑁 ?곸긽?낅땲??",
      url: "https://www.youtube.com/embed/IjGYF8V7rO8",
      thumbnail: "https://img.youtube.com/vi/IjGYF8V7rO8/hqdefault.jpg"
    },
    {
      id: "review-request-1",
      title: "由щ럭?붿껌",
      category: "?섏옄 ?묐?",
      duration: "05:00",
      description: "?섏옄 ?댁썝 ??由щ럭 ?묒꽦 ?붿껌 諛⑸쾿?????援먯쑁 ?곸긽?낅땲??",
      url: "https://www.youtube.com/embed/4YVrl61W-Vg",
      thumbnail: "https://img.youtube.com/vi/4YVrl61W-Vg/hqdefault.jpg"
    },
    {
      id: "body-fat-test-1",
      title: "泥댁?諛?寃??,
      category: "寃??援먯쑁",
      duration: "05:00",
      description: "泥댁?諛?寃??吏꾪뻾 諛⑸쾿 諛??섏옄 ?덈궡?????援먯쑁 ?곸긽?낅땲??",
      url: "https://www.youtube.com/embed/aLii6NvJtPk",
      thumbnail: "https://img.youtube.com/vi/aLii6NvJtPk/hqdefault.jpg"
    },
    {
      id: "auto-ins-thermography-1",
      title: "?먮낫 泥댁뿴 寃??,
      category: "寃??援먯쑁",
      duration: "05:00",
      description: "?먮룞李⑤낫???섏옄 泥댁뿴吏꾨떒寃??吏꾪뻾 諛⑸쾿 諛??덈궡?????援먯쑁 ?곸긽?낅땲??",
      url: "https://www.youtube.com/embed/BP-SYr29BIQ",
      thumbnail: "https://img.youtube.com/vi/BP-SYr29BIQ/hqdefault.jpg"
    }
  ];

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto h-full overflow-y-auto">
        <div className="mb-10">
          <h1 className="text-3xl font-black text-white mb-2">?묒닔??援먯쑁</h1>
          <p className="text-white/60">?묒닔???낅Т 留ㅻ돱??諛??ㅻТ 援먯쑁 ?곸긽???뺤씤?섏꽭??</p>
        </div>

        {/* ?꾪꽣 移?(UI?? */}
        <div className="flex gap-2 mb-8">
          <button className="px-4 py-2 bg-blue-500 text-white rounded-full text-sm font-bold shadow-lg shadow-blue-500/20">
            ?꾩껜 蹂닿린
          </button>
          <button className="px-4 py-2 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white rounded-full text-sm font-bold transition-all">
            寃??援먯쑁
          </button>
          <button className="px-4 py-2 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white rounded-full text-sm font-bold transition-all">
            ?섏옄 ?묐?
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
                {/* ?쒖껌 ?곹깭 諭껋? */}
                <div className="absolute top-3 left-3 z-10">
                  {watchedVideos.includes(video.id) ? (
                    <div className="bg-emerald-500/90 text-white px-2 py-1 rounded-md text-[10px] font-black tracking-wider flex items-center gap-1 shadow-lg backdrop-blur-md">
                      <CheckCircle2 size={12} />
                      ?쒖껌??                    </div>
                  ) : (
                    <div className="bg-rose-500 text-white px-2 py-1 rounded-md text-[10px] font-black tracking-wider flex items-center gap-1 shadow-[0_0_15px_rgba(244,63,94,0.6)] animate-pulse border border-rose-400">
                      <Sparkles size={12} className="animate-spin-slow" />
                      NEW
                    </div>
                  )}
                </div>
                {/* ?띿뒪???몃꽕??*/}
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
                    onEnded={() => handleWatchComplete(selectedVideo.id)}
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
              
              {/* ?쒖껌 ?꾨즺 踰꾪듉 (紐⑤떖 ?섎떒) */}
              <div className="p-4 bg-black/40 border-t border-white/5 flex justify-end">
                {watchedVideos.includes(selectedVideo.id) ? (
                  <button disabled className="px-5 py-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl font-bold flex items-center gap-2 text-sm border border-emerald-500/20">
                    <CheckCircle2 size={16} />
                    ?쒖껌 ?꾨즺??                  </button>
                ) : (
                  <button 
                    onClick={() => handleWatchComplete(selectedVideo.id)}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-2 text-sm transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                  >
                    <CheckCircle2 size={16} />
                    ?쒖껌 ?꾨즺 ?쒖떆?섍린
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
