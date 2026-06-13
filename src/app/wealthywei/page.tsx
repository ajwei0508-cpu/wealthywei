"use client";

import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { Lock } from "lucide-react";
import Link from "next/link";

export default function MasterLoginPage() {
  const [masterPassword, setMasterPassword] = useState("");
  const [isMasterLogining, setIsMasterLogining] = useState(false);

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-rose-50">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="space-y-4">
          <div className="inline-block p-4 bg-white rounded-3xl shadow-xl shadow-rose-500/10 mb-2">
            <Lock size={48} className="text-rose-600" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">바른컨설팅 최고관리자</h1>
          <p className="text-slate-500 font-medium text-sm">마스터 전용 암호를 입력해주세요.</p>
        </div>

        <div className="bg-white rounded-[32px] p-8 shadow-xl border border-slate-100">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!masterPassword) {
                toast.error("비밀번호를 입력해주세요.");
                return;
              }
              setIsMasterLogining(true);
              try {
                const { signIn } = await import("next-auth/react");
                const res = await signIn("master-login", {
                  redirect: false,
                  password: masterPassword
                });
                if (res?.error) {
                  toast.error("마스터 비밀번호가 일치하지 않습니다.");
                } else {
                  window.location.href = "/master"; // Redirect to master dashboard
                }
              } catch (e) {
                toast.error("로그인 중 오류가 발생했습니다.");
              } finally {
                setIsMasterLogining(false);
              }
            }}
            className="space-y-6"
          >
            <div className="space-y-1.5 text-left">
              <label className="text-sm font-bold text-slate-700">마스터 비밀번호</label>
              <input
                type="password"
                required
                value={masterPassword}
                onChange={e => setMasterPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all text-slate-900 font-medium"
                placeholder="비밀번호 입력"
              />
            </div>
            <button
              type="submit"
              disabled={isMasterLogining || !masterPassword}
              className="w-full py-4 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg shadow-lg shadow-rose-500/30 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none disabled:shadow-none"
            >
              {isMasterLogining ? "접속 중..." : "안전하게 접속하기"}
            </button>
          </form>
          
          <div className="mt-6 pt-6 border-t border-slate-100">
            <Link href="/" className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors">
              일반 사용자 페이지로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
