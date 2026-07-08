"use client";

import React from "react";
import { useSession } from "next-auth/react";

export default function Watermark() {
  const { data: session } = useSession();
  
  // session 정보가 없으면 렌더링하지 않음
  if (!session?.user) return null;

  // 로고와 바른컨설팅 텍스트를 반복해서 표시할 배열
  const items = Array.from({ length: 80 });

  return (
    <div 
      className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden flex items-center justify-center opacity-[0.03]"
      style={{ userSelect: 'none' }}
    >
      <div 
        className="w-[200vw] h-[200vh] flex flex-wrap items-center justify-center gap-x-20 gap-y-24 -rotate-12"
      >
        {items.map((_, i) => (
          <div key={i} className="flex items-center gap-4 text-white font-black text-6xl whitespace-nowrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" className="w-16 h-16 object-cover rounded-full grayscale" />
            <span>바른컨설팅</span>
          </div>
        ))}
      </div>
    </div>
  );
}
