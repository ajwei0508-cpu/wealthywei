"use client";

import React, { useState, useEffect, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  ExternalLink,
  Video,
  Activity,
  Stethoscope,
  Maximize,
  Pill,
  Loader2,
} from "lucide-react";

interface VideoStreamItem {
  id: string;
  title: string;
  streamUrl: string;
  thumbUrl: string;
}

function DirectMyboxPlayer({
  shortUrl,
  title,
  badgeColor = "emerald",
}: {
  shortUrl: string;
  title: string;
  badgeColor?: "emerald" | "blue" | "rose" | "amber" | "purple";
}) {
  const [items, setItems] = useState<VideoStreamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/mybox-video?mode=meta&url=${encodeURIComponent(shortUrl)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.ok && Array.isArray(data.items)) {
          setItems(data.items);
          setActiveIndex(0);
        }
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [shortUrl]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, activeIndex]);

  const toggleFullScreen = () => {
    const container = wrapperRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const currentItem = items[activeIndex];

  return (
    <div className="video-card bg-gradient-to-b from-white/10 to-transparent border border-white/10 rounded-[2.5rem] p-6 md:p-10 shadow-2xl backdrop-blur-sm flex flex-col">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3">
          <div className="p-3 bg-emerald-500/20 rounded-2xl">
            <Video size={26} className="text-emerald-400" />
          </div>
          {title}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/10">
            {[1, 1.25, 1.5, 2].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => setPlaybackSpeed(spd)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  playbackSpeed === spd
                    ? "bg-amber-500 text-black"
                    : "text-white/60 hover:text-white"
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
          <button
            onClick={toggleFullScreen}
            className="flex items-center gap-2 text-xs md:text-sm bg-emerald-500/20 text-emerald-300 font-bold hover:bg-emerald-500/40 px-4 py-2.5 rounded-xl transition-all"
          >
            <Maximize size={15} />
            전체 화면
          </button>
          <a
            href={shortUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs md:text-sm bg-white/10 text-white/70 font-bold hover:bg-white/20 hover:text-white px-4 py-2.5 rounded-xl transition-all"
          >
            <ExternalLink size={15} />
            원본 링크
          </a>
        </div>
      </div>

      <div
        ref={wrapperRef}
        className="video-wrapper w-full aspect-video rounded-3xl overflow-hidden bg-black relative border-2 border-white/10 shadow-2xl flex items-center justify-center"
      >
        {loading ? (
          <div className="flex flex-col items-center gap-3 text-white/60">
            <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
            <span className="text-sm font-bold">고화질 영상 스트리밍 연결 중...</span>
          </div>
        ) : currentItem ? (
          <video
            key={currentItem.streamUrl}
            ref={videoRef}
            src={currentItem.streamUrl}
            poster={currentItem.thumbUrl}
            controls
            playsInline
            className="w-full h-full object-contain outline-none"
            onLoadedData={() => {
              if (videoRef.current) videoRef.current.playbackRate = playbackSpeed;
            }}
          />
        ) : (
          <div className="text-white/50 text-sm">영상을 불러올 수 없습니다.</div>
        )}
      </div>

      {items.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {items.map((it, idx) => (
            <button
              key={it.id}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                idx === activeIndex
                  ? "bg-amber-500 text-black shadow"
                  : "bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              {idx + 1}. {it.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HanyakVideoPage() {
  const [activeTab, setActiveTab] = useState<"bokyong" | "jinmaek" | "yeonbok" | "yotong">("bokyong");

  const tabs = [
    { id: "bokyong", label: "바른 복용법 설명", number: "1" },
    { id: "jinmaek", label: "바른 중간진맥", number: "2" },
    { id: "yeonbok", label: "바른 종합검사 연복", number: "3" },
    { id: "yotong", label: "요통초진 다이어트", number: "4" },
  ] as const;

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#031C13] text-white p-4 md:p-8 overflow-x-hidden">
        <div className="max-w-6xl mx-auto space-y-12 mt-16 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 to-emerald-500 flex items-center gap-4">
              <div className="p-4 bg-emerald-500/10 rounded-3xl border border-emerald-500/20">
                <Pill size={40} className="text-emerald-400" />
              </div>
              바른 한약 시스템 영상
            </h1>
            <p className="text-white/60 text-lg ml-2">
              바른 한약 시스템에 대한 모든 영상을 현재 창에서 바로 재생하여 확인하세요.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap gap-4 border-b border-white/10 pb-6"
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 rounded-2xl font-bold transition-all flex items-center gap-3 ${
                  activeTab === tab.id
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/50 scale-105"
                    : "bg-white/5 text-white/50 hover:bg-white/10"
                }`}
              >
                <span className="w-6 h-6 rounded-full bg-black/20 flex items-center justify-center text-xs">
                  {tab.number}
                </span>
                {tab.label}
              </button>
            ))}
          </motion.div>

          <AnimatePresence mode="wait">
            {activeTab === "bokyong" && (
              <motion.div
                key="bokyong"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <DirectMyboxPlayer
                  shortUrl="http://naver.me/Fk7iCMq6"
                  title="바른 복용법 설명"
                  badgeColor="blue"
                />
              </motion.div>
            )}

            {activeTab === "jinmaek" && (
              <motion.div
                key="jinmaek"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <DirectMyboxPlayer
                  shortUrl="http://naver.me/GvcCCdk9"
                  title="바른 중간진맥"
                  badgeColor="rose"
                />
              </motion.div>
            )}

            {activeTab === "yeonbok" && (
              <motion.div
                key="yeonbok"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <DirectMyboxPlayer
                  shortUrl="http://naver.me/xOxXcFGE"
                  title="바른 종합검사 연복"
                  badgeColor="amber"
                />
              </motion.div>
            )}

            {activeTab === "yotong" && (
              <motion.div
                key="yotong"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 xl:grid-cols-2 gap-8"
              >
                <DirectMyboxPlayer
                  shortUrl="https://naver.me/FuNhF7NU"
                  title="요통초진에서 다이어트 (초진상담)"
                  badgeColor="purple"
                />
                <DirectMyboxPlayer
                  shortUrl="https://naver.me/GFCCwwpr"
                  title="요통초진에서 다이어트 (한약상담)"
                  badgeColor="emerald"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="absolute top-40 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>
        <div className="absolute top-80 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>
      </div>
    </DashboardLayout>
  );
}
