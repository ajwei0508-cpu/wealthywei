"use client";

import React, { useState, useEffect, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Play, Clock, Tag, X, CheckCircle2, Sparkles, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";

export default function ReceptionTrainingPage() {
  const [selectedVideo, setSelectedVideo] = useState<any | null>(null);
  const [watchedVideos, setWatchedVideos] = useState<string[]>([]);
  const { data: session } = useSession();

  // 방어 로직 상태
  const playerRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [playedSeconds, setPlayedSeconds] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // AbortError 원천 차단: 브라우저 native play() 프로미스에 빈 catch를 달아 unhandledrejection 이벤트를 완전히 방지함
  useEffect(() => {
    const originalPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      const p = originalPlay.call(this);
      if (p && typeof p.catch === 'function') {
        p.catch(() => {}); // 빈 catch를 달아 자바스크립트 엔진이 unhandled로 인식하지 않게 함
      }
      return p; // 원본 프로미스를 그대로 반환하여 브라우저 내부 로직(재생 상태)이 꼬이지 않게 함
    };

    return () => {
      HTMLMediaElement.prototype.play = originalPlay;
    };
  }, []);

  useEffect(() => {
    const loadProgress = async () => {
      if (session?.user?.email) {
        // 1. Load from localStorage
        const stored = localStorage.getItem(`watched_reception_${session.user.email}`);
        let localWatched: string[] = [];
        if (stored) {
          try {
            localWatched = JSON.parse(stored);
            setWatchedVideos(localWatched);
          } catch (e) {
            console.error(e);
          }
        }
        
        // 2. Fetch from DB
        try {
          const res = await fetch('/api/staff/video-progress');
          if (res.ok) {
            const data = await res.json();
            const dbWatched = data.data
              .filter((p: any) => p.category === 'reception')
              .map((p: any) => p.video_id);
              
            if (dbWatched && dbWatched.length > 0) {
              const merged = Array.from(new Set([...localWatched, ...dbWatched]));
              setWatchedVideos(merged);
              localStorage.setItem(`watched_reception_${session.user.email}`, JSON.stringify(merged));
            }
          }
        } catch (e) {
          console.error(e);
        }
      }
    };
    loadProgress();
  }, [session?.user?.email]);

  // 안티치트: 화면 벗어남 감지
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && selectedVideo && playing) {
        setPlaying(false);
        if (playerRef.current) {
          playerRef.current.pause();
        }
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*');
        }
        alert('화면을 벗어나면 시청이 일시정지됩니다.');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [selectedVideo, playing]);

  // YouTube iframe 자동 완료 감지
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data && data.event === "onStateChange" && data.info === 0) {
          if (selectedVideo && !selectedVideo.url.includes('.mp4')) {
            handleEnded();
          }
        }
      } catch (e) {}
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [selectedVideo, showQuiz]);

  const handleWatchComplete = (id: string) => {
    if (!session?.user?.email) return;
    if (!watchedVideos.includes(id)) {
      const newWatched = [...watchedVideos, id];
      setWatchedVideos(newWatched);
      localStorage.setItem(`watched_reception_${session.user.email}`, JSON.stringify(newWatched));
      
      // DB 진행률 업데이트 (API 호출)
      fetch('/api/staff/video-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session.user.email, videoId: id, category: 'reception' })
      }).catch(console.error);
    }
    handleCloseVideo();
  };

  const handleCloseVideo = () => {
    setPlaying(false);
    if (playerRef.current) {
      playerRef.current.pause();
    }
    setTimeout(() => {
      setSelectedVideo(null);
      setPlayedSeconds(0);
      setShowQuiz(false);
      setQuizAnswer(null);
    }, 300);
  };

  const handleEnded = () => {
    if (selectedVideo?.options) {
      setShowQuiz(true);
    } else {
      handleWatchComplete(selectedVideo?.id);
    }
  };

  const handleQuizSubmit = () => {
    if (quizAnswer === selectedVideo?.answerIndex) {
      setIsSubmitting(true);
      setTimeout(() => {
        setIsSubmitting(false);
        handleWatchComplete(selectedVideo?.id);
      }, 1000);
    } else {
      alert('오답입니다. 영상을 다시 확인해주세요.');
    }
  };

  const handleProgress = (e: any) => {
    // Prevent skipping natively
    if (e.target.currentTime > playedSeconds + 2) {
      e.target.currentTime = playedSeconds;
    } else {
      setPlayedSeconds(e.target.currentTime);
    }
  };

  const videos = [
  {
    "id": "sugar-test-1",
    "title": "당 검사 교육",
    "category": "검사 교육",
    "duration": "05:00",
    "description": "당 검사 진행 방법 및 주의사항에 대한 교육 영상입니다.",
    "url": "https://api.wecandeo.com/video/default/BOKNS9AQWrHtcygjPaNnuiiYWRC40kWDc1WZB3isU4TA2YzaipAXb9Q0vMxzxNx4FQQZvSUKjqXHhYcKiih4ippW9Ugieie.mp4",
    "thumbnail": "https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=1453&auto=format&fit=crop",
    "options": [
      "환자 이름 두 번 확인",
      "검사지 재사용",
      "검사 30분 전 금식 안내"
    ],
    "answerIndex": 2
  },
  {
    "id": "liver-test-1",
    "title": "간 수치 검사 교육",
    "category": "검사 교육",
    "duration": "05:00",
    "description": "간 수치 검사 진행 방법 및 주의사항에 대한 교육 영상입니다.",
    "url": "https://api.wecandeo.com/video/default/BOKNS9AQWrHtcygjPaNnuiiYWRC40kWDc1WZB3isU4TA13D2NPcgdc1PMxzxNx4FQQZvSUKjqXHhZXZ2aLXaSThQieie.mp4",
    "thumbnail": "https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=1453&auto=format&fit=crop"
  },
  {
    "id": "first-visit-1",
    "title": "초진 접수",
    "category": "환자 응대",
    "duration": "05:00",
    "description": "초진 환자 접수 및 응대 방법에 대한 교육 영상입니다.",
    "url": "https://www.youtube.com/embed/sH9tIazfEw8",
    "thumbnail": "https://img.youtube.com/vi/sH9tIazfEw8/hqdefault.jpg",
    "options": [
      "어디가 아프신가요?",
      "처음 오셨나요? 신분증 부탁드립니다.",
      "안녕하세요! 예약하셨나요?"
    ],
    "answerIndex": 1
  },
  {
    "id": "re-first-visit-1",
    "title": "재초진접수",
    "category": "환자 응대",
    "duration": "05:00",
    "description": "재초진 환자 접수 및 응대 방법에 대한 교육 영상입니다.",
    "url": "https://www.youtube.com/embed/ePWOPsa8JF4",
    "thumbnail": "https://img.youtube.com/vi/ePWOPsa8JF4/hqdefault.jpg",
    "options": [
      "단답형으로 금액만 말한다.",
      "내역을 설명하며 친절히 안내한다.",
      "환자가 묻기 전에는 설명하지 않는다."
    ],
    "answerIndex": 1
  },
  {
    "id": "re-visit-1",
    "title": "재진 접수",
    "category": "환자 응대",
    "duration": "05:00",
    "description": "재진 환자 접수 및 응대 방법에 대한 교육 영상입니다.",
    "url": "https://www.youtube.com/embed/InRHGLoNKoI",
    "thumbnail": "https://img.youtube.com/vi/InRHGLoNKoI/hqdefault.jpg"
  },
  {
    "id": "id-request-1",
    "title": "신분증 요청",
    "category": "환자 응대",
    "duration": "05:00",
    "description": "환자 신분증 요청 및 응대 방법에 대한 교육 영상입니다.",
    "url": "https://www.youtube.com/embed/KRcsxVHvUvY",
    "thumbnail": "https://img.youtube.com/vi/KRcsxVHvUvY/hqdefault.jpg"
  },
  {
    "id": "privacy-consent-1",
    "title": "개인정보 사인 동의",
    "category": "환자 응대",
    "duration": "05:00",
    "description": "개인정보 수집 및 활용 동의서 안내 및 서명 방법에 대한 교육 영상입니다.",
    "url": "https://www.youtube.com/embed/O4t9BXkgelQ",
    "thumbnail": "https://img.youtube.com/vi/O4t9BXkgelQ/hqdefault.jpg"
  },
  {
    "id": "payment-guide-1",
    "title": "결제 안내",
    "category": "환자 응대",
    "duration": "05:00",
    "description": "환자 진료비 결제 및 수납 안내 방법에 대한 교육 영상입니다.",
    "url": "https://www.youtube.com/embed/Y679VyHWdBU",
    "thumbnail": "https://img.youtube.com/vi/Y679VyHWdBU/hqdefault.jpg",
    "options": [
      "단답형으로 금액만 말한다.",
      "내역을 설명하며 친절히 안내한다.",
      "환자가 묻기 전에는 설명하지 않는다."
    ],
    "answerIndex": 1
  },
  {
    "id": "insurance-claim-1",
    "title": "실비 청구 안내",
    "category": "환자 응대",
    "duration": "05:00",
    "description": "환자 실손보험(실비) 청구 서류 및 절차 안내 방법에 대한 교육 영상입니다.",
    "url": "https://www.youtube.com/embed/u3V_ggc8taE",
    "thumbnail": "https://img.youtube.com/vi/u3V_ggc8taE/hqdefault.jpg",
    "options": [
      "환자가 직접 알아보게 한다.",
      "필요 서류를 꼼꼼히 챙겨서 안내한다.",
      "실비 청구가 불가능하다고 한다."
    ],
    "answerIndex": 1
  },
  {
    "id": "meridian-test-1",
    "title": "수양명경락검사 안내",
    "category": "검사 교육",
    "duration": "05:00",
    "description": "수양명경락검사 진행 방법 및 환자 안내에 대한 교육 영상입니다.",
    "url": "https://www.youtube.com/embed/OnqdPqXb6gE",
    "thumbnail": "https://img.youtube.com/vi/OnqdPqXb6gE/hqdefault.jpg"
  },
  {
    "id": "reservation-guide-1",
    "title": "예약 안내",
    "category": "환자 응대",
    "duration": "05:00",
    "description": "환자 진료 예약 및 응대 방법에 대한 교육 영상입니다.",
    "url": "https://www.youtube.com/embed/OX9MqqiP_v8",
    "thumbnail": "https://img.youtube.com/vi/OX9MqqiP_v8/hqdefault.jpg"
  },
  {
    "id": "blood-pressure-guide-1",
    "title": "혈압 안내",
    "category": "검사 교육",
    "duration": "05:00",
    "description": "환자 혈압 측정 및 안내 방법에 대한 교육 영상입니다.",
    "url": "https://www.youtube.com/embed/I4e6TR6wlqI",
    "thumbnail": "https://img.youtube.com/vi/I4e6TR6wlqI/hqdefault.jpg"
  },
  {
    "id": "thermography-test-1",
    "title": "체열진단검사",
    "category": "검사 교육",
    "duration": "05:00",
    "description": "체열진단검사 진행 방법 및 환자 안내에 대한 교육 영상입니다.",
    "url": "https://www.youtube.com/embed/IjGYF8V7rO8",
    "thumbnail": "https://img.youtube.com/vi/IjGYF8V7rO8/hqdefault.jpg"
  },
  {
    "id": "review-request-1",
    "title": "리뷰요청",
    "category": "환자 응대",
    "duration": "05:00",
    "description": "환자 내원 후 리뷰 작성 요청 방법에 대한 교육 영상입니다.",
    "url": "https://www.youtube.com/embed/4YVrl61W-Vg",
    "thumbnail": "https://img.youtube.com/vi/4YVrl61W-Vg/hqdefault.jpg"
  },
  {
    "id": "body-fat-test-1",
    "title": "체지방 검사",
    "category": "검사 교육",
    "duration": "05:00",
    "description": "체지방 검사 진행 방법 및 환자 안내에 대한 교육 영상입니다.",
    "url": "https://www.youtube.com/embed/aLii6NvJtPk",
    "thumbnail": "https://img.youtube.com/vi/aLii6NvJtPk/hqdefault.jpg"
  },
  {
    "id": "auto-ins-thermography-1",
    "title": "자보 체열 검사",
    "category": "검사 교육",
    "duration": "05:00",
    "description": "자동차보험 환자 체열진단검사 진행 방법 및 안내에 대한 교육 영상입니다.",
    "url": "https://www.youtube.com/embed/BP-SYr29BIQ",
    "thumbnail": "https://img.youtube.com/vi/BP-SYr29BIQ/hqdefault.jpg"
  }
];

  const categories = ["전체", ...Array.from(new Set(videos.map(v => v.category)))];
  const [selectedCategory, setSelectedCategory] = useState("전체");

  const filteredVideos = selectedCategory === "전체" 
    ? videos 
    : videos.filter(v => v.category === selectedCategory);

  const completedVideos = videos.filter(v => watchedVideos.includes(v.id)).length;
  const totalVideos = videos.length;
  const progress = totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto h-full overflow-y-auto">
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-white mb-2">접수실 교육</h1>
            <p className="text-white/60">접수실 업무 매뉴얼 및 실무 교육 영상을 확인하세요.</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 min-w-[280px]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-white/70">나의 교육 이수율</span>
              <span className="text-xl font-black text-blue-400">{progress}%</span>
            </div>
            <div className="h-2.5 w-full bg-black/40 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full"
              />
            </div>
            <p className="text-xs text-white/40 text-right mt-2 font-medium">{completedVideos} / {totalVideos}개 완료</p>
          </div>
        </div>

        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map(category => (
            <button 
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-bold shadow-lg transition-all whitespace-nowrap ${
                selectedCategory === category
                  ? "bg-blue-500 text-white shadow-blue-500/20"
                  : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredVideos.map((video, idx) => (
            <motion.div
              key={video.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="group cursor-pointer bg-white/5 rounded-2xl overflow-hidden border border-white/10 hover:border-blue-500/50 hover:bg-white/10 transition-all shadow-xl"
              onClick={() => {
                setSelectedVideo(video);
                setPlaying(true);
              }}
            >
              <div className="relative aspect-video bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden border-b border-white/5">
                <div className="absolute top-3 left-3 z-10">
                  {watchedVideos.includes(video.id) ? (
                    <div className="bg-emerald-500/90 text-white px-2 py-1 rounded-md text-[10px] font-black tracking-wider flex items-center gap-1 shadow-lg backdrop-blur-md">
                      <CheckCircle2 size={12} /> 시청 완료
                    </div>
                  ) : (
                    <div className="bg-blue-600 animate-pulse text-white px-2 py-1 rounded-md text-[10px] font-black tracking-wider shadow-lg backdrop-blur-md">
                      NEW
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 flex items-center justify-center p-6 text-center group-hover:scale-105 transition-transform duration-500">
                  <h2 className="text-white/90 font-black text-2xl drop-shadow-md break-keep">
                    {video.title}
                  </h2>
                </div>
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

      <AnimatePresence>
        {selectedVideo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 bg-black/90 backdrop-blur-md"
            onClick={handleCloseVideo}
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
                  onClick={handleCloseVideo}
                  className="p-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="aspect-video bg-black w-full relative">
                {showQuiz && selectedVideo.options && (
                  <div className="absolute inset-0 z-50 bg-[#05080F] flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
                    <div className="max-w-2xl w-full bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-sm">
                      <div className="flex items-center justify-center gap-3 mb-6">
                        <div className="p-3 bg-blue-500/20 rounded-2xl">
                          <Sparkles className="text-blue-400" size={28} />
                        </div>
                      </div>
                      <h2 className="text-2xl font-black text-white text-center mb-2">돌발 퀴즈</h2>
                      <p className="text-white/50 text-center mb-8">영상을 잘 시청하셨는지 확인해볼까요?</p>
                      
                      <div className="space-y-3">
                        {selectedVideo.options.map((option: string, i: number) => (
                          <button
                            key={i}
                            onClick={() => setQuizAnswer(i)}
                            className={`w-full p-4 rounded-xl border text-left font-bold transition-all ${quizAnswer === i ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20'}`}
                          >
                            <span className="mr-3 opacity-50">{i + 1}.</span>
                            {option}
                          </button>
                        ))}
                      </div>

                      <div className="mt-8 flex justify-center">
                        <button
                          onClick={handleQuizSubmit}
                          disabled={quizAnswer === null || isSubmitting}
                          className="px-8 py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-white/10 disabled:text-white/30 text-white rounded-xl font-black text-lg transition-all"
                        >
                          {isSubmitting ? "처리 중..." : "정답 제출하고 교육 완료하기"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {selectedVideo.url.includes('.mp4') ? (
                  <video
                    ref={playerRef}
                    src={selectedVideo.url}
                    controls
                    autoPlay
                    className="w-full h-full object-contain outline-none"
                    controlsList="nodownload"
                    onEnded={handleEnded}
                    onPlay={() => setPlaying(true)}
                    onPause={() => setPlaying(false)}
                    onTimeUpdate={handleProgress}
                  />
                ) : (
                  <iframe
                    ref={iframeRef}
                    src={`${selectedVideo.url}${selectedVideo.url.includes('?') ? '&' : '?'}enablejsapi=1`}
                    className="w-full h-full border-none outline-none"
                    allowFullScreen
                    allow="autoplay; fullscreen"
                    onLoad={() => {
                      if (iframeRef.current?.contentWindow) {
                        iframeRef.current.contentWindow.postMessage(JSON.stringify({event: 'listening'}), '*');
                      }
                    }}
                  />
                )}
              </div>
              
              <div className="p-4 bg-black/40 border-t border-white/5 flex items-center justify-between">
                <p className="text-xs text-white/40 flex items-center gap-1.5">
                  <AlertCircle size={14} /> 화면을 벗어나거나 영상을 건너뛰면 시청이 인정되지 않습니다.
                </p>
                {(!selectedVideo.url.includes('.mp4') || watchedVideos.includes(selectedVideo.id)) && !showQuiz ? (
                  <button 
                    onClick={!watchedVideos.includes(selectedVideo.id) ? () => handleEnded() : undefined}
                    disabled={watchedVideos.includes(selectedVideo.id)} 
                    className={`px-5 py-2 rounded-xl font-bold flex items-center gap-2 text-sm border ${watchedVideos.includes(selectedVideo.id) ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 transition-all'}`}
                  >
                    <CheckCircle2 size={16} />
                    {watchedVideos.includes(selectedVideo.id) ? '시청 완료됨' : '수동 시청 완료 처리'}
                  </button>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
