"use client";

import React, { useState, useEffect, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Play,
  Video,
  X,
  FolderOpen,
  Film,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  Loader2,
  ListVideo,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface VideoCardConfig {
  id: string;
  title: string;
  subtitle?: string;
  url: string;
  isFolderHint?: boolean;
}

interface VideoSection {
  category: string;
  badge: string;
  description: string;
  items: VideoCardConfig[];
}

interface ResolvedPlayableItem {
  id: string;
  title: string;
  fileName: string;
  resourceKey: string;
  size?: number;
  streamUrl: string;
  thumbUrl: string;
  parentCardTitle: string;
  parentCategory: string;
  sourceUrl: string;
}

const HERBAL_VIDEOS: VideoSection[] = [
  {
    category: "한약씨앗 심기",
    badge: "STEP 01 · 초진 씨앗 화법",
    description: "초진 진료 단계에서 환자의 상황에 맞춰 자연스럽게 한약 처방의 필요성을 심어주는 핵심 실전 영상입니다.",
    items: [
      {
        id: "seed_1",
        title: "검진 이상 없는 씨앗",
        subtitle: "병원 검사상 정상이나 통증·불편감이 지속되는 환자",
        url: "https://naver.me/Fc6P4b7N",
      },
      {
        id: "seed_2",
        title: "결정권 없는 씨앗",
        subtitle: "가족·보호자와 상의가 필요한 환자에게 심는 씨앗",
        url: "https://naver.me/F6Q25oJ9",
      },
      {
        id: "seed_3",
        title: "결정권 제한 씨앗",
        subtitle: "비용·시간적 망설임이 있는 환자 맞춤형 씨앗",
        url: "https://naver.me/GLhRwIMm",
      },
      {
        id: "seed_4",
        title: "환자 진술에 맞춘 씨앗",
        subtitle: "환자가 직접 말한 증상 히스토리를 활용한 맞춤형 씨앗",
        url: "https://naver.me/FVFHXaoA",
      },
    ],
  },
  {
    category: "한약 상담",
    badge: "STEP 02 · 본 상담 & 클로징",
    description: "종합검사(연복) 안내부터 질환·연령·성별 상황별 실제 한약 상담 클로징까지 모든 케이스를 바로 재생하여 확인하세요.",
    items: [
      {
        id: "consult_1",
        title: "종합검사(연복)",
        subtitle: "연복 티켓팅 및 종합검사 기반 한약 상담 실전",
        url: "http://naver.me/xOxXcFGE",
      },
      {
        id: "consult_2",
        title: "상황별 상담 (전체 모음)",
        subtitle: "내장지방·다이어트·불면·람세이헌트·가족 상담 등 실전 케이스",
        url: "https://naver.me/GVVnDHk8",
        isFolderHint: true,
      },
    ],
  },
  {
    category: "복용법 안내",
    badge: "STEP 03 · 복용 티칭",
    description: "한약 및 공진단 처방 후 복용 순응도를 극대화하고 환불·컴플레인을 예방하는 복용법 설명 영상입니다.",
    items: [
      {
        id: "guide_1",
        title: "한약 복용법 설명",
        subtitle: "한약 및 공진단 올바른 복용법과 명현·호전 반응 안내",
        url: "http://naver.me/Fk7iCMq6",
      },
    ],
  },
  {
    category: "중간 진맥",
    badge: "STEP 04 · 재진 & 재처방",
    description: "복용 중반부 중간 진맥을 통해 환자 신뢰도를 높이고 자연스럽게 추가 처방(연복)으로 연결하는 과정입니다.",
    items: [
      {
        id: "pulse_1",
        title: "중간 진맥",
        subtitle: "중간 진맥 점검 및 후속 처방 브릿지 상담",
        url: "http://naver.me/GvcCCdk9",
      },
    ],
  },
];

export default function HerbalConsultingPage() {
  // Map of card.id -> resolved playable items from /api/mybox-video
  const [resolvedMap, setResolvedMap] = useState<Record<string, ResolvedPlayableItem[]>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [expandSituationalAll, setExpandSituationalAll] = useState<boolean>(true);

  // Active player modal state
  const [activePlaylist, setActivePlaylist] = useState<ResolvedPlayableItem[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isVideoLoading, setIsVideoLoading] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [watchedIds, setWatchedIds] = useState<string[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerWrapperRef = useRef<HTMLDivElement>(null);

  // Load watched history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("bareun_herbal_watched_videos");
      if (saved) setWatchedIds(JSON.parse(saved));
    } catch {}
  }, []);

  const markWatched = (id: string) => {
    setWatchedIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      try {
        localStorage.setItem("bareun_herbal_watched_videos", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Preload metadata for all cards so thumbnails & sub-videos are ready immediately
  useEffect(() => {
    let cancelled = false;
    HERBAL_VIDEOS.forEach((section) => {
      section.items.forEach(async (card) => {
        setLoadingMap((prev) => ({ ...prev, [card.id]: true }));
        try {
          const res = await fetch(`/api/mybox-video?mode=meta&url=${encodeURIComponent(card.url)}`);
          const data = await res.json();
          if (!cancelled && data.ok && Array.isArray(data.items) && data.items.length > 0) {
            const mapped: ResolvedPlayableItem[] = data.items.map((it: any) => ({
              ...it,
              parentCardTitle: card.title,
              parentCategory: section.category,
              sourceUrl: card.url,
            }));
            setResolvedMap((prev) => ({ ...prev, [card.id]: mapped }));
          }
        } catch (err) {
          console.error("Failed to resolve video meta for", card.title, err);
        } finally {
          if (!cancelled) {
            setLoadingMap((prev) => ({ ...prev, [card.id]: false }));
          }
        }
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Apply playback speed whenever video or speed changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, activeIndex, isModalOpen]);

  // Open player modal for a card or a specific resolved item
  const handleOpenCardPlayer = async (card: VideoCardConfig, sectionCategory: string, startIndex = 0) => {
    let items = resolvedMap[card.id];

    if (!items || items.length === 0) {
      setIsModalOpen(true);
      setIsVideoLoading(true);
      try {
        const res = await fetch(`/api/mybox-video?mode=meta&url=${encodeURIComponent(card.url)}`);
        const data = await res.json();
        if (data.ok && Array.isArray(data.items) && data.items.length > 0) {
          items = data.items.map((it: any) => ({
            ...it,
            parentCardTitle: card.title,
            parentCategory: sectionCategory,
            sourceUrl: card.url,
          }));
          setResolvedMap((prev) => ({ ...prev, [card.id]: items! }));
        }
      } catch (e) {
        console.error(e);
      }
    }

    if (items && items.length > 0) {
      setActivePlaylist(items);
      setActiveIndex(startIndex);
      setIsModalOpen(true);
      setIsVideoLoading(true);
      markWatched(items[startIndex]?.id || card.id);
    }
  };

  const handleCloseModal = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setIsModalOpen(false);
    setActivePlaylist([]);
    setActiveIndex(0);
  };

  const handleSelectPlaylistIndex = (idx: number) => {
    setActiveIndex(idx);
    setIsVideoLoading(true);
    if (activePlaylist[idx]) {
      markWatched(activePlaylist[idx].id);
    }
  };

  const toggleFullScreen = () => {
    const el = playerWrapperRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const currentVideo = activePlaylist[activeIndex] || null;

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 max-w-7xl mx-auto min-h-[calc(100vh-4rem)]">
        {/* Header */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center shadow-sm border border-amber-500/20">
                <Video className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400 block mb-0.5">
                  IN-APP DIRECT STREAMING PLAYER
                </span>
                <h1 className="text-3xl font-black text-white tracking-tight">한약 상담 영상</h1>
              </div>
            </div>
            <p className="text-white/60 text-sm">
              모든 한약 상담 영상을 새 창 이동 없이 <span className="text-amber-300 font-bold">현재 화면 내 전용 플레이어</span>에서 즉시 재생하고 연속 시청할 수 있습니다.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-3 rounded-2xl">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs text-white/80 font-medium">
              카드 클릭 시 <strong className="text-amber-300">즉시 인앱 플레이어</strong>가 실행됩니다
            </span>
          </div>
        </div>

        {/* Video Grid by Category */}
        <div className="space-y-12 pb-12">
          {HERBAL_VIDEOS.map((section) => {
            return (
              <div
                key={section.category}
                className="bg-white/[0.02] border border-white/10 rounded-3xl p-6 md:p-8 shadow-xl"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-white/10">
                  <div>
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <div className="w-1.5 h-6 bg-amber-400 rounded-full"></div>
                      <h2 className="text-xl md:text-2xl font-black text-white">{section.category}</h2>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        {section.badge}
                      </span>
                    </div>
                    <p className="text-xs md:text-sm text-white/50 pl-4">{section.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {section.items
                    .filter((card) => !card.isFolderHint)
                    .map((card, idx) => {
                      const resolvedList = resolvedMap[card.id] || [];
                      const isLoading = loadingMap[card.id];
                      const firstItem = resolvedList[0];
                      const isWatched = firstItem && watchedIds.includes(firstItem.id);

                      return (
                        <motion.div
                          key={card.id}
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          onClick={() => handleOpenCardPlayer(card, section.category, 0)}
                          className="group relative cursor-pointer rounded-2xl overflow-hidden bg-[#062319] border border-white/10 hover:border-amber-400/70 shadow-lg hover:shadow-amber-500/10 hover:-translate-y-1 transition-all duration-300 flex flex-col"
                        >
                          {/* Thumbnail Container */}
                          <div className="relative aspect-video bg-black/60 overflow-hidden">
                            {firstItem?.thumbUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={firstItem.thumbUrl}
                                alt={card.title}
                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-emerald-950 to-black">
                                {isLoading ? (
                                  <Loader2 className="w-8 h-8 text-amber-400/60 animate-spin" />
                                ) : (
                                  <Film className="w-10 h-10 text-white/20 group-hover:text-amber-400/60 transition-colors" />
                                )}
                              </div>
                            )}

                            {/* Dark Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                            {/* Top Badges */}
                            <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-600/90 text-white text-[10px] font-black flex items-center gap-1 shadow-md backdrop-blur-md">
                                <Play className="w-3 h-3 fill-current" />
                                HD 즉시 재생
                              </span>

                              {isWatched && (
                                <span className="px-2 py-0.5 rounded-md bg-black/70 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> 시청함
                                </span>
                              )}
                            </div>

                            {/* Center Play Button */}
                            <div className="absolute inset-0 flex items-center justify-center z-10">
                              <div className="w-14 h-14 rounded-full bg-amber-500/90 group-hover:bg-amber-400 text-black flex items-center justify-center shadow-[0_0_25px_rgba(245,158,11,0.5)] scale-95 group-hover:scale-110 transition-all duration-300">
                                <Play className="w-6 h-6 fill-current ml-0.5" />
                              </div>
                            </div>
                          </div>

                          {/* Card Info Footer */}
                          <div className="p-4 flex-1 flex flex-col justify-between bg-gradient-to-b from-[#07291D] to-[#041811]">
                            <div>
                              <h3 className="text-white font-bold text-base group-hover:text-amber-300 transition-colors leading-snug">
                                {card.title}
                              </h3>
                              {card.subtitle && (
                                <p className="text-white/50 text-xs mt-1 line-clamp-2 leading-relaxed">
                                  {card.subtitle}
                                </p>
                              )}
                            </div>
                            <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px]">
                              <span className="text-emerald-400 font-bold flex items-center gap-1">
                                <Play className="w-3 h-3 fill-current" />
                                클릭하여 바로 재생
                              </span>
                              <span className="text-white/40 font-medium">단독 영상</span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                </div>

                {/* 상황별 상담 폴더 내 개별 영상 13편 직통 그리드 노출 */}
                {section.items.some((it) => (resolvedMap[it.id]?.length || 0) > 1) && (
                  <div className="mt-8 pt-6 border-t border-white/10">
                    {section.items
                      .filter((it) => (resolvedMap[it.id]?.length || 0) > 1)
                      .map((folderCard) => {
                        const subVideos = resolvedMap[folderCard.id] || [];
                        return (
                          <div key={folderCard.id} className="space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <FolderOpen className="w-4 h-4 text-amber-400" />
                                <h3 className="text-sm md:text-base font-extrabold text-amber-300">
                                  [{folderCard.title}] 세부 영상 바로 선택 ({subVideos.length}편)
                                </h3>
                              </div>
                              <button
                                type="button"
                                onClick={() => setExpandSituationalAll((prev) => !prev)}
                                className="text-xs font-bold text-white/60 hover:text-amber-300 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                              >
                                {expandSituationalAll ? "목록 접기 ▲" : "전체 펼쳐보기 ▼"}
                              </button>
                            </div>

                            <AnimatePresence initial={false}>
                              {expandSituationalAll && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-1">
                                    {subVideos.map((sub, sIdx) => {
                                      const isSubWatched = watchedIds.includes(sub.id);
                                      return (
                                        <div
                                          key={sub.id}
                                          onClick={() =>
                                            handleOpenCardPlayer(folderCard, section.category, sIdx)
                                          }
                                          className="group cursor-pointer rounded-xl overflow-hidden bg-black/40 border border-white/10 hover:border-amber-400/70 transition-all flex items-center gap-3 p-2.5 hover:bg-white/[0.06]"
                                        >
                                          <div className="relative w-24 aspect-video rounded-lg overflow-hidden bg-black shrink-0 border border-white/10">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                              src={sub.thumbUrl}
                                              alt={sub.title}
                                              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                              loading="lazy"
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10">
                                              <div className="w-7 h-7 rounded-full bg-amber-500 text-black flex items-center justify-center shadow">
                                                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                                              </div>
                                            </div>
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                              <span className="text-[10px] font-black text-amber-400">
                                                #{String(sIdx + 1).padStart(2, "0")}
                                              </span>
                                              {isSubWatched && (
                                                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                              )}
                                            </div>
                                            <p className="text-xs font-bold text-white group-hover:text-amber-300 truncate transition-colors">
                                              {sub.title}
                                            </p>
                                            <p className="text-[10px] text-white/40 mt-0.5">클릭 시 즉시 재생</p>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* In-Page Direct Video Player Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md"
            onClick={handleCloseModal}
          >
            <motion.div
              ref={playerWrapperRef}
              initial={{ scale: 0.95, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 16 }}
              transition={{ type: "spring", damping: 26, stiffness: 300 }}
              className={`relative w-full ${
                activePlaylist.length > 1 ? "max-w-6xl" : "max-w-5xl"
              } bg-[#061A12] rounded-3xl overflow-hidden shadow-[0_25px_70px_rgba(0,0,0,0.85)] border border-white/15 flex flex-col max-h-[92vh]`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Top Bar */}
              <div className="flex items-center justify-between px-5 py-4 bg-black/50 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {currentVideo?.parentCategory || "한약 상담"}
                      </span>
                      {activePlaylist.length > 1 && (
                        <span className="text-xs font-bold text-amber-300">
                          {activeIndex + 1} / {activePlaylist.length}편
                        </span>
                      )}
                    </div>
                    <h3 className="text-white font-black text-base md:text-lg truncate mt-0.5">
                      {currentVideo
                        ? currentVideo.title === currentVideo.parentCardTitle
                          ? currentVideo.title
                          : `${currentVideo.parentCardTitle} — ${currentVideo.title}`
                        : "영상 불러오는 중..."}
                    </h3>
                  </div>
                </div>

                {/* Top Right Controls */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Playback Speed Selector */}
                  <div className="hidden sm:flex items-center bg-white/5 rounded-xl p-1 border border-white/10">
                    {[1, 1.25, 1.5, 2].map((spd) => (
                      <button
                        key={spd}
                        type="button"
                        onClick={() => setPlaybackSpeed(spd)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          playbackSpeed === spd
                            ? "bg-amber-500 text-black shadow"
                            : "text-white/60 hover:text-white"
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={toggleFullScreen}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/15 text-white/80 hover:text-white border border-white/10 transition-colors"
                    title="전체화면"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="p-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 transition-colors"
                    title="닫기 (ESC)"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Player Body + Optional Playlist Sidebar */}
              <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-black">
                {/* Main HTML5 Video Stage */}
                <div className="relative flex-1 aspect-video lg:aspect-auto bg-black flex items-center justify-center min-h-[260px]">
                  {isVideoLoading && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs pointer-events-none">
                      <Loader2 className="w-10 h-10 text-amber-400 animate-spin mb-3" />
                      <p className="text-xs font-bold text-white/80">
                        고화질 스트리밍 연결 중...
                      </p>
                    </div>
                  )}

                  {currentVideo ? (
                    <video
                      key={currentVideo.streamUrl}
                      ref={videoRef}
                      src={currentVideo.streamUrl}
                      poster={currentVideo.thumbUrl}
                      controls
                      autoPlay
                      playsInline
                      className="w-full h-full max-h-[75vh] object-contain outline-none"
                      onLoadedData={() => {
                        setIsVideoLoading(false);
                        if (videoRef.current) {
                          videoRef.current.playbackRate = playbackSpeed;
                        }
                      }}
                      onPlaying={() => setIsVideoLoading(false)}
                      onWaiting={() => setIsVideoLoading(true)}
                      onEnded={() => {
                        // Auto-advance if part of a multi-video playlist
                        if (activeIndex < activePlaylist.length - 1) {
                          handleSelectPlaylistIndex(activeIndex + 1);
                        }
                      }}
                    />
                  ) : (
                    <div className="text-white/50 text-sm py-20">영상을 준비하고 있습니다...</div>
                  )}
                </div>

                {/* Right Playlist Sidebar when folder has multiple videos */}
                {activePlaylist.length > 1 && (
                  <div className="w-full lg:w-80 bg-[#05150F] border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col max-h-64 lg:max-h-none">
                    <div className="p-4 border-b border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ListVideo className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-black text-white">
                          재생 목록 ({activeIndex + 1}/{activePlaylist.length})
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={activeIndex === 0}
                          onClick={() => handleSelectPlaylistIndex(Math.max(0, activeIndex - 1))}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white"
                          title="이전 영상"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={activeIndex === activePlaylist.length - 1}
                          onClick={() =>
                            handleSelectPlaylistIndex(
                              Math.min(activePlaylist.length - 1, activeIndex + 1)
                            )
                          }
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white"
                          title="다음 영상"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                      {activePlaylist.map((item, idx) => {
                        const isCurrent = idx === activeIndex;
                        const isDone = watchedIds.includes(item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSelectPlaylistIndex(idx)}
                            className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center gap-3 ${
                              isCurrent
                                ? "bg-amber-500/15 border-amber-400 text-white shadow-md"
                                : "bg-white/[0.03] border-white/5 text-white/70 hover:bg-white/[0.08] hover:text-white"
                            }`}
                          >
                            <div className="relative w-20 aspect-video rounded-lg overflow-hidden bg-black shrink-0 border border-white/10">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={item.thumbUrl}
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                              {isCurrent && (
                                <div className="absolute inset-0 bg-amber-500/40 flex items-center justify-center">
                                  <Play className="w-4 h-4 text-black fill-current" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-black text-amber-400">
                                  {String(idx + 1).padStart(2, "0")}
                                </span>
                                {isDone && (
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                )}
                              </div>
                              <p className="text-xs font-bold truncate mt-0.5">{item.title}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
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
