"use client";

import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface AnalysisTimerProps {
  isLoading: boolean;
  estimatedSeconds?: number;
  onTimeout?: () => void;
}

export default function AnalysisTimer({ isLoading, estimatedSeconds = 30, onTimeout }: AnalysisTimerProps) {
  const [timeLeft, setTimeLeft] = useState(estimatedSeconds);

  useEffect(() => {
    if (!isLoading) {
      setTimeLeft(estimatedSeconds);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onTimeout?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isLoading, estimatedSeconds, onTimeout]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!isLoading) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black shadow-lg shadow-blue-500/5 animate-in fade-in slide-in-from-top-1 duration-500">
      <Clock size={14} className="animate-pulse" />
      <span className="tracking-widest uppercase">분석 완료까지 예상 시간: </span>
      <span className="text-white font-black tabular-nums">{formatTime(timeLeft)}</span>
    </div>
  );
}
