"use client";

import React, { useState, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";
import {
  ArrowLeft,
  Maximize,
  Minimize,
  ExternalLink,
  Sparkles,
  Lock,
  ScanFace,
  RotateCcw
} from "lucide-react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";

export default function LiftingContourDiagnosisPage() {
  const { data: session, status } = useSession();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const userStatus = (session?.user as any)?.approvalStatus || "pending";
  const approvedCategories = (session?.user as any)?.approvedCategories || [];
  const userCategory = (session?.user as any)?.approvedCategory || "";
  const masterEmail = process.env.NEXT_PUBLIC_MASTER_EMAIL || "wei0508@naver.com";
  const isMaster = session?.user?.email?.toLowerCase() === masterEmail.toLowerCase();

  const isLiftingApproved =
    isMaster ||
    (userStatus === "approved" &&
      (approvedCategories.includes("lifting") ||
        approvedCategories.includes("consulting") ||
        approvedCategories.includes("바른리프팅") ||
        approvedCategories.includes("바른컨설팅") ||
        userCategory === "lifting" ||
        userCategory === "consulting" ||
        userCategory === "바른리프팅" ||
        userCategory === "바른컨설팅"));

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().then(() => {
        setIsFullscreen(true);
      }).catch(() => {
        toast.error("전체 화면 모드를 전환할 수 없습니다.");
      });
    } else {
      document.exitFullscreen?.().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  if (status === "authenticated" && !isLiftingApproved) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-[#031C13] flex items-center justify-center p-6 text-white">
          <div className="max-w-md w-full p-8 rounded-3xl bg-black/60 border border-amber-500/30 text-center shadow-2xl backdrop-blur-md space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
              <Lock size={32} />
            </div>
            <h2 className="text-2xl font-black text-white">바른 리프팅 회원 전용</h2>
            <p className="text-sm text-white/70 leading-relaxed">
              본 콘텐츠는 <span className="text-amber-400 font-bold">바른컨설팅</span> 또는{" "}
              <span className="text-emerald-400 font-bold">바른리프팅</span> 승인 자격을 보유하신 원장님 전용 임상 시스템입니다.
            </p>
            <div className="pt-4 flex flex-col gap-2">
              <Link
                href="/requests"
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-lg"
              >
                열람 권한 신청 및 문의하기
              </Link>
              <Link
                href="/lifting"
                className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-xs transition-all"
              >
                바른 리프팅 홈으로 이동
              </Link>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div
        ref={containerRef}
        className="flex flex-col w-full h-screen bg-[#07090e] text-white overflow-hidden select-auto"
      >
        {/* 상단 네비게이션 & 컨트롤 바 */}
        <div className="h-14 px-5 bg-[#0b0f18] border-b border-white/10 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3">
            <Link
              href="/lifting"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white/80 hover:text-white transition-all"
            >
              <ArrowLeft size={14} />
              <span>바른 리프팅</span>
            </Link>

            <div className="h-4 w-px bg-white/10" />

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-extrabold flex items-center gap-1.5">
                <ScanFace size={13} className="text-emerald-400" />
                윤곽진단
              </span>
              <span className="text-white/30 text-xs">/</span>
              <span className="text-sm font-extrabold text-amber-300 flex items-center gap-1.5">
                리프팅 윤곽비교 (시술 전 녹색 · 시술 후 붉은색 정밀 정합)
                <Sparkles size={13} className="text-amber-400" />
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIframeKey((prev) => prev + 1);
                toast.success("리프팅 윤곽비교 워크스페이스를 새로고침했습니다.");
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white/70 hover:text-white transition-all cursor-pointer"
              title="윤곽비교 앱 초기화 새로고침"
            >
              <RotateCcw size={13} />
              <span>앱 새로고침</span>
            </button>

            <a
              href="/lifting-compare.html"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-xs font-bold text-emerald-300 transition-all"
            >
              <ExternalLink size={13} />
              <span>독립 새 창으로 열기</span>
            </a>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-xs font-bold text-amber-300 transition-all cursor-pointer"
            >
              {isFullscreen ? <Minimize size={13} /> : <Maximize size={13} />}
              <span>{isFullscreen ? "전체화면 종료" : "전체화면 보기"}</span>
            </button>
          </div>
        </div>

        {/* 리프팅 윤곽비교 메인 워크스페이스 (BAREUN CONTOUR VISION™) */}
        <div className="flex-1 w-full relative bg-[#07090e] overflow-hidden">
          <iframe
            key={iframeKey}
            src="/lifting-compare.html"
            title="바른 리프팅 윤곽진단 - 리프팅 윤곽비교"
            className="w-full h-full border-0 block"
            allow="clipboard-read; clipboard-write; fullscreen"
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
