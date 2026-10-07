"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CreditCard, 
  Send, 
  Sparkles, 
  CheckCircle2, 
  ClipboardPaste, 
  Copy, 
  ArrowLeft,
  Smartphone,
  ExternalLink,
  Zap,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";

export default function MobileCardReceiverPage() {
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [lastSent, setLastSent] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(true);

  // Paste from clipboard button
  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard) {
        const clipText = await navigator.clipboard.readText();
        if (clipText) {
          setText(clipText);
          toast.success("클립보드에서 문자를 붙여넣었습니다.");
          return;
        }
      }
      toast.error("클립보드 읽기 권한이 없습니다. 텍스트 상자에 길게 눌러 붙여넣기 해주세요.");
    } catch {
      toast.error("텍스트 상자를 터치한 후 '붙여넣기'를 눌러주세요.");
    }
  };

  // Submit to server
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim()) {
      toast.error("결제 문자 내용을 입력해 주세요.");
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch("/api/cards/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`🎉 PC 원장에 ${data.count}건이 실시간 반영되었습니다!`, { duration: 4000 });
        setLastSent(prev => [...(data.transactions || []), ...prev].slice(0, 10));
        setText("");
      } else {
        toast.error(data.error || "전송에 실패했습니다.");
      }
    } catch (e: any) {
      toast.error("서버 연결에 실패했습니다. PC가 켜져 있는지 확인해주세요.");
    } finally {
      setIsSending(false);
    }
  };

  // Quick sample test
  const handleQuickSample = (card: string, amount: string, merchant: string) => {
    const today = new Date();
    const m = today.getMonth() + 1;
    const d = today.getDate();
    const hh = String(today.getHours()).padStart(2, "0");
    const mm = String(today.getMinutes()).padStart(2, "0");
    const sample = `[Web발신]
${card} 승인
${amount}원 일시불
${m}/${d} ${hh}:${mm}
${merchant}`;
    setText(sample);
  };

  return (
    <div className="min-h-screen bg-[#070b09] text-white p-4 max-w-md mx-auto flex flex-col justify-between selection:bg-amber-400 selection:text-black font-sans pb-12">
      <Toaster position="top-center" />

      {/* Header */}
      <div>
        <header className="flex items-center justify-between pb-4 border-b border-white/10 mb-6 pt-2">
          <Link href="/cards" className="flex items-center gap-2 text-xs font-semibold text-white/60 hover:text-white">
            <ArrowLeft size={16} />
            <span>PC 대시보드로</span>
          </Link>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-bold text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>PC 실시간 동기화 ON</span>
          </div>
        </header>

        {/* Title */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
              MOBILE DIRECT SYNC
            </span>
          </div>
          <h1 className="text-xl font-black text-white tracking-tight">
            스마트폰 카드 결제 실시간 전송기
          </h1>
          <p className="text-xs text-white/50 mt-1">
            카드사 결제 문자나 앱 알림을 복사해 넣으면 PC 원장으로 0.1초 만에 자동 분류 저장됩니다.
          </p>
        </div>

        {/* Action Form */}
        <form onSubmit={handleSend} className="space-y-4">
          <div className="relative">
            <textarea
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="카드 결제 문자나 카카오 알림톡을 여기에 붙여넣으세요..."
              className="w-full p-4 rounded-2xl bg-black/60 border border-white/15 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-amber-400/70 transition-all resize-none shadow-inner"
            />

            <button
              type="button"
              onClick={handlePasteClipboard}
              className="absolute right-3 bottom-3 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-md"
            >
              <ClipboardPaste size={13} className="text-amber-400" />
              <span>클립보드 붙여넣기</span>
            </button>
          </div>

          {/* Quick Real Test Buttons */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">
              원터치 실제 결제 포맷 테스트:
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickSample("현대카드 the Black", "48,000", "스타벅스 리저브 청담")}
                className="p-2 rounded-xl bg-neutral-900 border border-white/10 text-[11px] font-semibold text-white/80 hover:border-amber-400/40 text-left truncate"
              >
                ☕ 현대카드 4.8만
              </button>
              <button
                type="button"
                onClick={() => handleQuickSample("신한카드 The ACE", "115,000", "GS칼텍스 삼일주유소")}
                className="p-2 rounded-xl bg-neutral-900 border border-white/10 text-[11px] font-semibold text-white/80 hover:border-blue-400/40 text-left truncate"
              >
                ⛽ 신한카드 11.5만
              </button>
              <button
                type="button"
                onClick={() => handleQuickSample("삼성카드 iD ON", "79,800", "쿠팡 로켓프레시")}
                className="p-2 rounded-xl bg-neutral-900 border border-white/10 text-[11px] font-semibold text-white/80 hover:border-cyan-400/40 text-left truncate"
              >
                📦 삼성카드 7.9만
              </button>
            </div>
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={isSending || !text.trim()}
            className="w-full py-4 rounded-2xl text-sm font-black text-black bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 shadow-xl shadow-amber-500/25 active:scale-98 cursor-pointer"
          >
            <Send size={16} />
            <span>{isSending ? "PC 원장으로 전송 중..." : "PC 원장으로 실시간 전송하기"}</span>
          </button>
        </form>

        {/* Recently Transferred List */}
        {lastSent.length > 0 && (
          <div className="mt-8 space-y-2">
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 size={14} />
              <span>방금 PC에 성공적으로 저장된 내역</span>
            </div>
            <div className="space-y-1.5">
              {lastSent.map((tx, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-white">{tx.merchant}</div>
                    <div className="text-[10px] text-white/40">{tx.cardName} • {tx.date}</div>
                  </div>
                  <div className="font-mono font-black text-amber-300">
                    ₩{Number(tx.amount).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <footer className="mt-8 pt-4 border-t border-white/10 text-center text-[10px] text-white/30 space-y-1">
        <p className="flex items-center justify-center gap-1">
          <ShieldCheck size={12} className="text-emerald-400" />
          <span>로컬 네트워크 내 암호화 전송 지원</span>
        </p>
        <p>© 2026 Luxe Card Intelligence | Designed by Art</p>
      </footer>
    </div>
  );
}
