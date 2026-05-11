"use client";

import React, { useState } from "react";
import { 
  BarChart3, 
  Lock, 
  ChevronDown, 
  LayoutDashboard, 
  FileText, 
  Stethoscope, 
  Pill,
  TrendingUp,
  Settings,
  LogOut,
  User,
  Crown,
  ClipboardList,
  Sparkles,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  isLocked?: boolean;
  isOpen?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
  isActive?: boolean;
}

const NavItem = ({ icon: Icon, label, isLocked, isOpen, onClick, children, isActive }: NavItemProps) => {
  return (
    <div className="mb-2">
      <button
        onClick={isLocked ? undefined : onClick}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${
          isLocked 
            ? "cursor-not-allowed text-white/30" 
            : isActive 
              ? "bg-white/10 text-white shadow-lg" 
              : "text-white/60 hover:bg-white/5 hover:text-white"
        }`}
      >
        <div className="flex items-center gap-3">
          <Icon size={20} className={isLocked ? "text-white/20" : isActive ? "text-blue-400" : "group-hover:text-blue-400"} />
          <span className="text-sm font-semibold tracking-tight">{label}</span>
        </div>
        {isLocked ? (
          <Lock size={14} className="text-white/20" />
        ) : children ? (
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown size={16} />
          </motion.div>
        ) : null}
      </button>

      <AnimatePresence>
        {isOpen && !isLocked && children && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden overflow-y-auto"
          >
            <div className="pl-11 pr-4 py-2 space-y-1">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function DashboardSidebar() {
  const { data: session } = useSession();
  const [isConsultingOpen, setIsConsultingOpen] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  const masterEmail = process.env.NEXT_PUBLIC_MASTER_EMAIL || "wei0508@naver.com";
  const isMaster = session?.user?.email?.toLowerCase() === masterEmail.toLowerCase();

  const userStatus = (session?.user as any)?.approvalStatus || 'pending';
  const approvedCategories = (session?.user as any)?.approvedCategories || [];
  const userCategory = (session?.user as any)?.approvedCategory || '';

  const isConsultingApproved = userStatus === 'approved' && (approvedCategories.includes('consulting') || userCategory === 'consulting');
  const isTreatmentApproved = userStatus === 'approved' && (approvedCategories.includes('treatment') || approvedCategories.includes('consulting') || userCategory === 'treatment' || userCategory === 'consulting');
  const isOpeningApproved = userStatus === 'approved' && (approvedCategories.includes('opening') || approvedCategories.includes('consulting') || userCategory === 'opening' || userCategory === 'consulting');
  const isPrescriptionApproved = userStatus === 'approved' && (approvedCategories.includes('prescription') || userCategory === 'prescription');

  const consultingSubMenus = [
    "AI 차팅", "원장", "직원", "실비", "眞장부맥법", "바른 비급여", "마케팅"
  ];

  return (
    <aside className="w-72 h-screen bg-[#1A365D] flex flex-col fixed left-0 top-0 z-50 text-white shadow-2xl overflow-hidden border-r border-white/5">
      {/* Logo Section */}
      <div className="p-8 pb-10 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
          <TrendingUp size={24} className="text-white" strokeWidth={2.5} />
        </div>
        <div className="flex flex-col">
          <h1 className="text-lg font-black tracking-tighter leading-none">바른컨설팅</h1>
          <span className="text-[10px] text-blue-300 font-bold uppercase tracking-widest mt-1">Management Platform</span>
        </div>
      </div>

      {/* Navigation Section */}
      <nav className="flex-1 px-4 sidebar-scroll overflow-y-auto">
        <div className="mb-4">
          <p className="px-4 text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-4">Core Services</p>
          
          {/* 1. 바른컨설팅 (Accordion) */}
          <NavItem 
            icon={LayoutDashboard} 
            label="바른컨설팅" 
            isLocked={!isConsultingApproved && !isMaster}
            isOpen={isConsultingOpen} 
            onClick={() => setIsConsultingOpen(!isConsultingOpen)}
            isActive={pathname === "/" || pathname === "/details"}
          >
            {consultingSubMenus.map((sub, idx) => (
              <div 
                key={idx} 
                className="text-[13px] font-medium py-2 text-white/40 cursor-not-allowed flex items-center gap-2 group/sub"
                title={`${sub} 서비스는 현재 준비 중입니다.`}
              >
                <div className="w-1 h-1 bg-white/20 rounded-full group-hover/sub:bg-blue-400 transition-colors"></div>
                {sub}
                <span className="text-[9px] bg-white/5 px-1.5 py-0.5 rounded-md ml-auto opacity-40">SOON</span>
              </div>
            ))}
          </NavItem>

          {/* 1.1 AI 경영 분석 */}
          <NavItem 
            icon={Sparkles} 
            label="AI 경영 분석" 
            isLocked={!isConsultingApproved && !isMaster}
            isActive={pathname.startsWith("/emr")}
            onClick={() => {
              const selEmr = (session?.user as any)?.selectedEmr;
              if (selEmr) {
                router.push(`/emr/${selEmr}`);
              } else {
                router.push("/");
              }
            }}
          />

          {/* 2. 바른개원법 */}
          <NavItem 
            icon={FileText} 
            label="바른개원법" 
            isLocked={!isOpeningApproved && !isMaster} 
            isActive={pathname === "/survey"}
            onClick={() => router.push("/survey")}
          />
          
          {/* 3. 바른진료법 */}
          <NavItem 
            icon={Stethoscope} 
            label="바른진료법" 
            isLocked={!isTreatmentApproved && !isMaster} 
          />
          
          {/* 4. 바른처방법 */}
          <NavItem 
            icon={Pill} 
            label="바른처방법" 
            isLocked={!isPrescriptionApproved && !isMaster} 
          />
        </div>

        <div className="mt-10 mb-4 pt-10 border-t border-white/5">
          <p className="px-4 text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-4">Support & Tools</p>
          <NavItem icon={Settings} label="설정" isLocked />
        </div>
      </nav>

      {/* User Info Section */}
      <div className="p-6 mt-auto bg-black/10 border-t border-white/5 relative z-[100] pointer-events-auto">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/10 overflow-hidden">
            {session?.user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={session.user.image} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User size={20} className="text-white/40" />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <p className="text-sm font-bold text-white truncate">{session?.user?.name || "원장님"}</p>
            <p className="text-[10px] text-white/40 truncate">{session?.user?.email || "Medical Management"}</p>
          </div>
        </div>

        {/* Master Admin Button (Conditional) */}
        {isMaster && (
          <div className="flex flex-col gap-2 mt-4">
            <Link 
              href="/master"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-br from-blue-400/20 to-blue-500/10 border border-blue-400/20 hover:from-blue-400/30 hover:to-blue-500/20 hover:border-blue-400/40 text-blue-200 text-xs font-bold transition-all group shadow-lg shadow-blue-900/10 relative z-10 cursor-pointer active:scale-95"
            >
              <BarChart3 size={14} className="text-blue-400 group-hover:scale-110 transition-transform" />
              마스터 매출 통계 관리
            </Link>
          </div>
        )}

        {/* Workbook Button — ALL users */}
        <Link 
          href="/survey"
          className="w-full flex items-center justify-center gap-2 py-2.5 mb-3 rounded-xl bg-blue-500/10 border border-blue-400/20 hover:bg-blue-500/20 hover:border-blue-400/40 text-blue-300 hover:text-blue-200 text-xs font-bold transition-all group relative z-10 mt-3 cursor-pointer active:scale-95"
        >
          <ClipboardList size={14} className="group-hover:scale-110 transition-transform" />
          경영 진단 워크북 작성
        </Link>

        {/* EMR Change Button */}
        <button 
          onClick={() => router.push("/?change=true")}
          className="w-full flex items-center justify-center gap-2 py-2.5 mb-2 rounded-xl bg-amber-500/10 border border-amber-400/20 hover:bg-amber-500/20 hover:text-amber-400 text-amber-300 text-xs font-bold transition-all group relative z-10 cursor-pointer active:scale-95"
        >
          <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
          사용 차트(EMR) 변경
        </button>

        <button 
          onClick={() => signOut()}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 text-white/50 text-xs font-bold transition-all"
        >
          <LogOut size={14} />
          로그아웃
        </button>
      </div>
    </aside>
  );
}
