"use client";

import React, { useEffect, useState } from "react";
import { Tv, Play, TrendingUp, Check, ArrowRight } from "lucide-react";
import { useVideoHistory } from "@/context/VideoHistoryContext";
import toast from "react-hot-toast";
import { YoutubeSkeleton } from "./Skeleton";

interface YoutubeVideoLinkProps {
  keyword: string;
  mLabel: string;
  isUp: boolean;
  activeSolution: any;
}

export function YoutubeVideoLink({ keyword, mLabel, isUp, activeSolution }: YoutubeVideoLinkProps) {
  const [video, setVideo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { addHistory, isWatched } = useVideoHistory();

  useEffect(() => {
    async function fetchVideo() {
      try {
        setLoading(true);
        setErrorMsg(null);
        
        if (!keyword) {
          setErrorMsg("검색 키워드가 없습니다.");
          return;
        }

        const CACHE_KEY = `yt_cache_${keyword}`;
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          const isExpired = Date.now() - timestamp > 24 * 60 * 60 * 1000;
          if (!isExpired && data.items && data.items.length > 0) {
            setVideo(data.items[0]);
            setLoading(false);
            return;
          }
        }

        const res = await fetch(`/api/youtube?q=${encodeURIComponent(keyword)}`);
        const result = await res.json();
        
        if (!res.ok) {
          if (result.error === "YouTube_Quota_Exceeded") {
             setErrorMsg("유튜브 API 일일 한도가 초과되었습니다.");
          } else {
             setErrorMsg("영상을 불러올 수 없습니다 (API 오류)");
          }
          return;
        }

        if (result.items && result.items.length > 0) {
          setVideo(result.items[0]);
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            data: result,
            timestamp: Date.now()
          }));
        } else {
          setErrorMsg("관련 영상을 찾을 수 없습니다.");
        }
      } catch (err) {
        console.error("Failed to fetch youtube", err);
        setErrorMsg("영상을 불러올 수 없습니다 (네트워크 오류)");
      } finally {
        setLoading(false);
      }
    }
    fetchVideo();
  }, [keyword]);

  if (loading) {
    return <YoutubeSkeleton />;
  }

  if (errorMsg || !video || !video.id?.videoId) {
    const isQuotaError = errorMsg?.includes("한도");
    return (
      <a 
        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(keyword)}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => {
          addHistory({
            title: activeSolution?.title || `${keyword} 검색`,
            keyword: keyword,
            desc: activeSolution?.desc,
            indicator: mLabel
          });
        }}
        className={`p-3 rounded-xl border transition-all flex flex-col gap-2 relative group overflow-hidden ${isUp ? "bg-white border-emerald-100 hover:border-emerald-300" : "bg-white border-zinc-200 hover:border-primary/40 shadow-sm"}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${isQuotaError ? "bg-rose-50 text-rose-600" : "bg-zinc-50 text-zinc-500"}`}>
               <Tv size={14} />
            </div>
            <p className="text-[11px] font-bold text-slate-800">
              {isQuotaError ? "유튜브 직접 확인" : (errorMsg || "영상 연결")}
            </p>
          </div>
          <ArrowRight size={12} className="text-zinc-300 group-hover:text-primary transition-colors" />
        </div>
        
        <div className="flex flex-col gap-1">
          <h4 className="text-[12px] font-extrabold text-slate-900 group-hover:text-primary transition-colors">
            "{keyword}" 검색 결과 보기
          </h4>
          <p className="text-[10px] text-zinc-400 font-medium leading-relaxed">
            {isQuotaError ? "현재 API 사용량이 많아 유튜브에서 직접 원장님께 필요한 영상을 찾아드립니다." : "관련 영상을 유튜브에서 바로 확인할 수 있습니다."}
          </p>
        </div>

        <div className="absolute top-0 right-0 w-16 h-1 bg-rose-500 opacity-20 group-hover:opacity-100 transition-opacity"></div>
      </a>
    );
  }

  const videoId = video.id.videoId;
  return (
    <a 
      href={`https://www.youtube.com/watch?v=${videoId}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        addHistory({
          title: video.snippet.title,
          keyword: keyword,
          desc: activeSolution?.desc || "AI 추천 경영 영상 학습",
          indicator: mLabel || "AI 추천",
          id: videoId
        });
        toast.success("경영 학습 기록에 저장되었습니다.");
      }}
      className={`relative overflow-hidden group flex items-center gap-3 p-2 rounded-xl border transition-all hover:-translate-y-[1px] shadow-sm ${isUp ? "bg-white border-emerald-100 hover:border-emerald-300 hover:shadow-emerald-100" : "bg-white border-zinc-200 hover:border-primary/40 hover:shadow-slate-200"}`}
    >
      <div className="relative w-24 h-16 bg-slate-900 rounded-lg overflow-hidden flex-shrink-0">
        <img src={video.snippet.thumbnails?.default?.url || video.snippet.thumbnails?.medium?.url} alt="thumbnail" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
          <Play size={20} className="text-white fill-white shadow-sm" />
        </div>
        <div className="absolute top-1 left-1 bg-rose-500 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-md shadow-sm flex items-center gap-0.5">
          <TrendingUp size={8} /> TOP VIEW
        </div>
      </div>
      <div className="flex-1 overflow-hidden pr-2 flex flex-col justify-center">
        <p className={`text-[10px] font-bold mb-1 truncate flex items-center gap-1 ${isUp ? "text-emerald-600" : "text-primary"}`}>
          <Tv size={10} /> 추천 영상: [{keyword}]
          {isWatched(keyword) && <Check size={10} className="ml-1" />}
        </p>
        <h4 className="text-[11px] sm:text-xs font-bold text-slate-800 line-clamp-2 group-hover:text-primary transition-colors leading-snug" dangerouslySetInnerHTML={{ __html: video.snippet.title }}></h4>
      </div>
    </a>
  );
}
