"use client";

import React from "react";
import DashboardSidebar from "./DashboardSidebar";
import { motion } from "framer-motion";
import { useSession, signOut } from "next-auth/react";
import { Activity, Lock } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { data: session, status } = useSession();
  const masterEmail = process.env.NEXT_PUBLIC_MASTER_EMAIL || "wei0508@naver.com";
  const isMaster = session?.user?.email?.toLowerCase() === masterEmail.toLowerCase();
  
  const approvalStatus = (session?.user as any)?.approvalStatus || 'pending';

  if (status === "loading") return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading...</div>;

  // If not master and not approved, show waiting screen
  if (!isMaster && approvalStatus !== 'approved') {
    return (
      <div className="flex min-h-screen bg-[#F8F9FA] items-center justify-center p-6">
        <div className="max-w-md w-full bg-white p-12 rounded-[2rem] shadow-xl border border-slate-100 text-center space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto">
            {approvalStatus === 'pending' ? <Activity size={40} /> : <Lock size={40} />}
          </div>
          <div className="space-y-4">
            <h1 className="text-2xl font-black text-slate-900">
              {approvalStatus === 'pending' ? "승인 대기 중" : "접근 제한됨"}
            </h1>
            <p className="text-slate-500 font-medium">
              {approvalStatus === 'pending' 
                ? "관리자가 원장님의 가입 신청을 확인 중입니다. 승인이 완료되면 모든 서비스를 이용하실 수 있습니다."
                : "죄송합니다. 원장님의 계정은 접근이 거부되었습니다. 마스터에게 문의해주세요."}
            </p>
          </div>
          <button 
            onClick={() => signOut()}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all"
          >
            로그아웃
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F8F9FA]">
      <DashboardSidebar />
      <main className="flex-1 ml-72 overflow-x-hidden">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full h-full"
        >
          {children}
        </motion.div>
      </main>
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full -mr-64 -mt-64 pointer-events-none z-0"></div>
    </div>
  );
}
