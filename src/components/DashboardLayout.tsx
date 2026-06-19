"use client";

import React from "react";
import DashboardSidebar from "./DashboardSidebar";
import { motion } from "framer-motion";
import { useSession, signOut } from "next-auth/react";
import { Activity, Lock } from "lucide-react";

import { usePathname, useRouter } from "next/navigation";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { data: session, status } = useSession();
  const masterEmail = process.env.NEXT_PUBLIC_MASTER_EMAIL || "wei0508@naver.com";
  const isMaster = session?.user?.email?.toLowerCase() === masterEmail.toLowerCase();
  const pathname = usePathname();
  const router = useRouter();
  
  const approvalStatus = (session?.user as any)?.approvalStatus || 'pending';
  const userRole = (session?.user as any)?.role || 'director';

  const realName = (session?.user as any)?.realName;
  const clinicName = (session?.user as any)?.clinicName;
  const phone = (session?.user as any)?.phone;

  // Protect routes for staff
  React.useEffect(() => {
    if (userRole === 'staff') {
      const allowedPaths = ['/employee', '/notice', '/requests', '/happycall'];
      if (!allowedPaths.some(p => pathname.startsWith(p))) {
        router.push('/employee/reception');
      }
    }
  }, [userRole, pathname, router]);

  // Security: Auto-logout after 10 minutes of inactivity
  React.useEffect(() => {
    if (status !== "authenticated") return;
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        signOut({ callbackUrl: '/' });
      }, 10 * 60 * 1000); // 10 minutes
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('scroll', resetTimer);
    window.addEventListener('click', resetTimer);

    resetTimer(); // initialize

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('scroll', resetTimer);
      window.removeEventListener('click', resetTimer);
    };
  }, [status]);

  if (status === "loading") return <div className="min-h-screen bg-white/5 flex items-center justify-center">Loading...</div>;

  // Enforce Profile Completion for Directors globally
  if (status === "authenticated" && userRole === 'director' && (!realName || !clinicName || !phone)) {
    if (pathname !== '/') {
      router.replace('/');
      return <div className="min-h-screen bg-white/5 flex items-center justify-center">프로필 설정 페이지로 이동 중...</div>;
    }
  }

  if (!isMaster && approvalStatus !== 'approved') {
    return (
      <div className="flex min-h-screen bg-[#031C13] items-center justify-center p-6">
        <div className="max-w-md w-full bg-white/5 p-12 rounded-[2rem] shadow-xl border border-white/5 text-center space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto">
            {approvalStatus === 'pending' ? <Activity size={40} /> : <Lock size={40} />}
          </div>
          <div className="space-y-4">
            <h1 className="text-2xl font-black text-white">
              {approvalStatus === 'pending' ? "승인 대기 중" : "접근 제한됨"}
            </h1>
            <p className="text-white/50 font-medium">
              {approvalStatus === 'pending' 
                ? "관리자가 원장님의 가입 신청을 확인 중입니다. 승인이 완료되면 모든 서비스를 이용하실 수 있습니다."
                : "죄송합니다. 원장님의 계정은 접근이 거부되었습니다. 마스터에게 문의해주세요."}
            </p>
          </div>
          <button 
            onClick={() => signOut()}
            className="w-full py-4 bg-emerald-950 text-white rounded-2xl font-bold hover:bg-emerald-900 transition-all"
          >
            로그아웃
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#031C13]">
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
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-emerald-600/5 blur-[120px] rounded-full -mr-64 -mt-64 pointer-events-none z-0"></div>
    </div>
  );
}
