"use client";

import React from "react";
import { useSession } from "next-auth/react";

export default function Watermark() {
  const { data: session } = useSession();
  
  // session 정보가 없으면 렌더링하지 않음
  if (!session?.user) return null;

  const name = session.user.name || (session.user as any).realName || "User";
  const email = session.user.email || "";
  const identifier = `${name} (${email})`;

  // 워터마크 텍스트를 여러 번 반복해서 화면에 채움
  const watermarkText = Array(50).fill(identifier).join("  •  ");

  return (
    <div 
      className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden flex items-center justify-center opacity-[0.03]"
      style={{ userSelect: 'none' }}
    >
      <div 
        className="w-[200vw] h-[200vh] flex flex-wrap items-center justify-center -rotate-12 text-white font-black text-4xl break-all whitespace-pre-wrap leading-[3rem]"
      >
        {watermarkText}
      </div>
    </div>
  );
}
