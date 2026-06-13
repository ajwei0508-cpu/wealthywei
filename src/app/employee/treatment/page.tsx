"use client";

import React, { useState, useEffect, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Play, Clock, Tag, X, CheckCircle2, Sparkles, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";

export default function TreatmentTrainingPage() {
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
        const stored = localStorage.getItem(`watched_treatment_${session.user.email}`);
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
              .filter((p: any) => p.category === 'treatment')
              .map((p: any) => p.video_id);
              
            if (dbWatched && dbWatched.length > 0) {
              const merged = Array.from(new Set([...localWatched, ...dbWatched]));
              setWatchedVideos(merged);
              localStorage.setItem(`watched_treatment_${session.user.email}`, JSON.stringify(merged));
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
      localStorage.setItem(`watched_treatment_${session.user.email}`, JSON.stringify(newWatched));
      
      // DB 진행률 업데이트 (API 호출)
      fetch('/api/staff/video-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session.user.email, videoId: id, category: 'treatment' })
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
    "id": "hotpack-1",
    "title": "핫팩 교육",
    "category": "치료실 기본",
    "duration": "03:15",
    "description": "안전하고 효과적인 핫팩 준비 및 환자 적용 방법에 대한 교육 영상입니다.",
    "url": "https://api.wecandeo.com/video/default/BOKNS9AQWrHtcygjPaNnukLKu689JLEt1WZB3isU4TA2etO1g27tbWfMxzxNx4FQQZvSUKjqXHhYhObdRmzdblAieie.mp4",
    "thumbnail": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=1453&auto=format&fit=crop",
    "options": [
      "온도를 최대한 높인다.",
      "핫팩과 피부 사이에 적절한 두께의 수건을 댄다.",
      "환자가 뜨겁다고 해도 참으라고 한다."
    ],
    "answerIndex": 1
  },
  {
    "id": "ict-1",
    "title": "ICT 교육",
    "category": "기기 사용법",
    "duration": "05:00",
    "description": "간섭파 치료기(ICT)의 올바른 사용법 및 주의사항에 대한 교육 영상입니다.",
    "url": "https://api.wecandeo.com/video/default/BOKNS9AQWrHtcygjPaNnukLKu689JLEt1WZB3isU4TA0AsO2TDCYmiivMxzxNx4FQQZvSUKjqXHhYaymDfVtb3uAieie.mp4",
    "thumbnail": "https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=1453&auto=format&fit=crop",
    "options": [
      "패드가 겹치게 부착한다.",
      "통증 부위를 교차하도록 대각선으로 부착한다.",
      "강도를 한 번에 최대로 올린다."
    ],
    "answerIndex": 1
  },
  {
    "id": "ict-2",
    "title": "ICT 스펀지 소독",
    "category": "위생 관리",
    "duration": "03:00",
    "description": "ICT 스펀지의 올바른 세척 및 소독 방법에 대한 교육 영상입니다.",
    "url": "https://api.wecandeo.com/video/default/BOKNS9AQWrHtcygjPaNnukLKu689JLEt1WZB3isU4TA0lAlzqSy8gxvMxzxNx4FQQZvSUKjqXHhY3uPTTL4WY0Qieie.mp4",
    "thumbnail": "https://images.unsplash.com/photo-1584432810601-6c7f27d2362b?q=80&w=1453&auto=format&fit=crop"
  },
  {
    "id": "microwave-1",
    "title": "극초단파 교육",
    "category": "기기 사용법",
    "duration": "05:00",
    "description": "극초단파 기기의 올바른 사용법 및 주의사항에 대한 교육 영상입니다.",
    "url": "https://api.wecandeo.com/video/default/BOKNS9AQWrHtcygjPaNnukLKu689JLEt1WZB3isU4TA002bl8aepFuisMxzxNx4FQQZvSUKjqXHhZYF7Dea4wv2Qieie.mp4",
    "thumbnail": "https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=1453&auto=format&fit=crop"
  },
  {
    "id": "cupping-1",
    "title": "부항컵 제조",
    "category": "치료실 기본",
    "duration": "04:30",
    "description": "부항컵 제조 및 관리에 대한 교육 영상입니다.",
    "url": "https://play.wecandeo.com/video/v/?key=BOKNS9AQWrHtcygjPaNnukLKu689JLEt1WZB3isU4TA3W6oXzd2yTUAieie",
    "thumbnail": "https://images.unsplash.com/photo-1584432810601-6c7f27d2362b?q=80&w=1453&auto=format&fit=crop"
  },
  {
    "id": "sono-1",
    "title": "소노 교육",
    "category": "기기 사용법",
    "duration": "05:00",
    "description": "소노(초음파) 치료기 사용법 및 주의사항에 대한 교육 영상입니다.",
    "url": "https://api.wecandeo.com/video/default/BOKNS9AQWrHtcygjPaNnukLKu689JLEt1WZB3isU4TA1iiaiidnubCZsPMxzxNx4FQQZvSUKjqXHhZnJFNipdcriihAieie.mp4",
    "thumbnail": "https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=1453&auto=format&fit=crop"
  },
  {
    "id": "magnetic-1",
    "title": "자기장 교육",
    "category": "기기 사용법",
    "duration": "05:00",
    "description": "자기장 치료기 사용법 및 주의사항에 대한 교육 영상입니다.",
    "url": "https://api.wecandeo.com/video/default/BOKNS9AQWrHtcygjPaNnukLKu689JLEt1WZB3isU4TA12aKe7Agl2efMxzxNx4FQQZvSUKjqXHhbVyfo7TsHsIAieie.mp4",
    "thumbnail": "https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=1453&auto=format&fit=crop"
  },
  {
    "id": "chuna-prep-1",
    "title": "추나 준비 안내",
    "category": "치료실 기본",
    "duration": "05:00",
    "description": "추나 요법 전 준비 및 환자 안내 방법에 대한 교육 영상입니다.",
    "url": "https://www.youtube.com/embed/7DljE5rgVqM",
    "thumbnail": "https://img.youtube.com/vi/7DljE5rgVqM/hqdefault.jpg",
    "options": [
      "주머니에 있는 물건을 빼도록 안내",
      "금속 장신구 제거 안내",
      "치료 전 반드시 금식하도록 안내"
    ],
    "answerIndex": 2
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
            <h1 className="text-3xl font-black text-white mb-2">치료실 교육</h1>
            <p className="text-white/60">치료실 업무 매뉴얼 및 실무 교육 영상을 확인하세요.</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 min-w-[280px]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-white/70">나의 교육 이수율</span>
              <span className="text-xl font-black text-amber-400">{progress}%</span>
            </div>
            <div className="h-2.5 w-full bg-black/40 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-emerald-700 to-blue-400 rounded-full"
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
                  ? "bg-emerald-600 text-white shadow-emerald-500/20"
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
              className="group cursor-pointer bg-white/5 rounded-2xl overflow-hidden border border-white/10 hover:border-emerald-600/50 hover:bg-white/10 transition-all shadow-xl"
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
                    <div className="bg-emerald-700 animate-pulse text-white px-2 py-1 rounded-md text-[10px] font-black tracking-wider shadow-lg backdrop-blur-md">
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
                  <div className="w-14 h-14 rounded-full bg-emerald-600 flex items-center justify-center scale-90 group-hover:scale-100 transition-transform duration-300 shadow-xl text-white">
                    <Play fill="currentColor" className="ml-1" size={24} />
                  </div>
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-bold px-2.5 py-1 bg-emerald-600/20 text-amber-300 rounded-md flex items-center gap-1 border border-emerald-600/20">
                    <Tag size={10} />
                    {video.category}
                  </span>
                </div>
                <h3 className="text-white font-bold text-lg mb-2 group-hover:text-amber-400 transition-colors">{video.title}</h3>
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
                  <Play size={16} className="text-amber-400" />
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
                  <div className="absolute inset-0 z-50 bg-[#031C13] flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
                    <div className="max-w-2xl w-full bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-sm">
                      <div className="flex items-center justify-center gap-3 mb-6">
                        <div className="p-3 bg-emerald-600/20 rounded-2xl">
                          <Sparkles className="text-amber-400" size={28} />
                        </div>
                      </div>
                      <h2 className="text-2xl font-black text-white text-center mb-2">돌발 퀴즈</h2>
                      <p className="text-white/50 text-center mb-8">영상을 잘 시청하셨는지 확인해볼까요?</p>
                      
                      <div className="space-y-3">
                        {selectedVideo.options.map((option: string, i: number) => (
                          <button
                            key={i}
                            onClick={() => setQuizAnswer(i)}
                            className={`w-full p-4 rounded-xl border text-left font-bold transition-all ${quizAnswer === i ? 'bg-emerald-700 border-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20'}`}
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
                          className="px-8 py-4 bg-emerald-700 hover:bg-emerald-600 disabled:bg-white/10 disabled:text-white/30 text-white rounded-xl font-black text-lg transition-all"
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
                    className={`px-5 py-2 rounded-xl font-bold flex items-center gap-2 text-sm border ${watchedVideos.includes(selectedVideo.id) ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' : 'bg-emerald-700 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 transition-all'}`}
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
