"use client";

import React from "react";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-zinc-200/60 rounded-lg ${className}`} />
  );
}

export function YoutubeSkeleton() {
  return (
    <div className="flex items-center gap-3 p-2 rounded-xl border border-zinc-100 bg-white/50">
      <Skeleton className="w-24 h-16 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-2 w-1/3" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}
