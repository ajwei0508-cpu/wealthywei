"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import React from "react";

export default function KakaoLogin() {
  const { data: session, status } = useSession();

  if (status === "authenticated" && session) {
    return (
      <div className="flex items-center gap-4 p-4 bg-white rounded-3xl toss-shadow border border-zinc-100 animate-in fade-in duration-500">
        <div className="relative">
          <img 
            src={session.user?.image || "/default-profile.png"} 
            alt="profile" 
            className="w-12 h-12 rounded-full border-2 border-primary/10 object-cover"
          />
          <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-4 h-4 rounded-full border-2 border-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate">{session.user?.name} 원장님</p>
          <p className="text-[11px] text-zinc-500 font-medium">바른컨설팅 멤버</p>
        </div>
        <button 
          onClick={() => signOut()}
          className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
        >
          로그아웃
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn("kakao")}
      className="flex items-center justify-center gap-3 w-full max-w-sm bg-[#FEE500] hover:bg-[#FDE500]/90 text-slate-900 px-6 py-4 rounded-2xl font-bold text-base transition-all toss-shadow group"
    >
      <svg 
        className="w-5 h-5" 
        viewBox="0 0 24 24" 
        fill="currentColor"
      >
        <path d="M12 3C6.477 3 2 6.477 2 10.75c0 2.822 1.954 5.305 4.887 6.643-.16.54-.582 1.96-.667 2.257-.107.375.12.37.252.282.104-.069 1.637-1.112 2.292-1.558.423.061.859.093 1.304.093 5.523 0 10-3.477 10-7.75S17.523 3 12 3z" />
      </svg>
      카카오로 1초 만에 시작하기
    </button>
  );
}
