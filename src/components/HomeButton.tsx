"use client";

import React from "react";
import Link from "next/link";
import { Home } from "lucide-react";
import { usePathname } from "next/navigation";

export default function HomeButton() {
  const pathname = usePathname();

  // 홈 화면(/)에서는 홈 버튼을 숨깁니다.
  if (pathname === "/") return null;

  return (
    <div className="fixed top-6 left-6 z-[9999]">
      <Link href="/">
        <div className="group flex items-center gap-2 p-2 px-4 bg-white/80 backdrop-blur-md border border-slate-200/50 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:border-blue-200 hover:-translate-y-0.5 transition-all duration-300 active:scale-95">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform duration-300">
            <Home size={18} />
          </div>
          <span className="text-sm font-bold text-slate-600 group-hover:text-blue-600 transition-colors">
            홈으로
          </span>
        </div>
      </Link>
    </div>
  );
}
