"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface VideoItem {
  id?: string;
  title: string;
  desc: string;
  indicator: string;
  keyword?: string; // New: For YouTube Search Results
  date?: string;
  originalUrl?: string;
}

interface VideoHistoryContextType {
  watchHistory: VideoItem[];
  favoriteVideos: string[];
  addHistory: (video: VideoItem) => void;
  toggleFavorite: (id: string) => void;
  isWatched: (id: string) => boolean;
  isFavorite: (id: string) => boolean;
  convertToEmbedUrl: (url: string) => string;
  convertToWatchUrl: (idOrVideo: string | VideoItem) => string;
}

const VideoHistoryContext = createContext<VideoHistoryContextType | undefined>(undefined);

export const VideoHistoryProvider = ({ children }: { children: React.ReactNode }) => {
  const [watchHistory, setWatchHistory] = useState<VideoItem[]>([]);
  const [favoriteVideos, setFavoriteVideos] = useState<string[]>([]);

  useEffect(() => {
    try {
      const savedWatched = localStorage.getItem("watchHistory");
      if (savedWatched) setWatchHistory(JSON.parse(savedWatched));
    } catch(e) { console.warn("Failed to load watchHistory", e); }
    
    try {
      const savedFavs = localStorage.getItem("favoriteVideos");
      if (savedFavs) setFavoriteVideos(JSON.parse(savedFavs));
    } catch(e) { console.warn("Failed to load favoriteVideos", e); }
  }, []);

  const addHistory = (video: VideoItem) => {
    const newHistory = [
      { ...video, date: new Date().toISOString() },
      ...watchHistory.filter((v) => v.id !== video.id),
    ].slice(0, 50);
    setWatchHistory(newHistory);
    try {
      localStorage.setItem("watchHistory", JSON.stringify(newHistory));
    } catch(e) { console.warn("Failed to save watchHistory", e); }
  };

  const toggleFavorite = (videoId: string) => {
    const newFavs = favoriteVideos.includes(videoId)
      ? favoriteVideos.filter((id) => id !== videoId)
      : [...favoriteVideos, videoId];
    setFavoriteVideos(newFavs);
    try {
      localStorage.setItem("favoriteVideos", JSON.stringify(newFavs));
    } catch(e) { console.warn("Failed to save favoriteVideos", e); }
  };

  const isWatched = (id: string) => watchHistory.some((v) => (v.id === id || v.keyword === id));
  const isFavorite = (id: string) => favoriteVideos.includes(id);

  const convertToEmbedUrl = (url: string) => {
    if (!url) return "";
    if (url.includes("embed/")) return url;
    const match = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
    const videoId = match ? match[1] : "";
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  };

  const convertToWatchUrl = (idOrVideo: string | VideoItem) => {
    if (!idOrVideo) return "";
    
    if (typeof idOrVideo === "object") {
      if (idOrVideo.keyword) {
        const cleanKeyword = idOrVideo.keyword.replace(/#/g, "").trim();
        return `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanKeyword)}`;
      }
      return `https://www.youtube.com/watch?v=${idOrVideo.id}`;
    }

    if (idOrVideo.startsWith("http")) return idOrVideo;
    return `https://www.youtube.com/watch?v=${idOrVideo}`;
  };

  return (
    <VideoHistoryContext.Provider
      value={{
        watchHistory,
        favoriteVideos,
        addHistory,
        toggleFavorite,
        isWatched,
        isFavorite,
        convertToEmbedUrl,
        convertToWatchUrl,
      }}
    >
      {children}
    </VideoHistoryContext.Provider>
  );
};

export const useVideoHistory = () => {
  const context = useContext(VideoHistoryContext);
  if (context === undefined) {
    throw new Error("useVideoHistory must be used within a VideoHistoryProvider");
  }
  return context;
};
