"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import KakaoLogin from "@/components/KakaoLogin";
import DashboardLayout from "@/components/DashboardLayout";
import { 
  TrendingUp, 
  Stethoscope, 
  Activity, 
  FileText, 
  BarChart2, 
  Sparkles, 
  Search, 
  ArrowRight,
  BrainCircuit,
  MessageSquare,
  Zap,
  Target
} from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useData } from "@/context/DataContext";
import { DailyMissionCard } from "@/components/DailyMissionCard";

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isChangeMode = searchParams.get("change") === "true";
  const { data: session, status, update } = useSession();
  const { data: currentData } = useData();

  const selectedEmr = (session?.user as any)?.selectedEmr;
  const userName = session?.user?.name || "원장";
  const realName = (session?.user as any)?.realName;
  const clinicName = (session?.user as any)?.clinicName;
  
  const [showProfileSetup, setShowProfileSetup] = React.useState(false);
  const [profileForm, setProfileForm] = React.useState({ realName: userName, clinicName: "", age: "" });
  const [isSaving, setIsSaving] = React.useState(false);

  // AI Chat State
  const [chatInput, setChatInput] = React.useState("");
  const [chatResponse, setChatResponse] = React.useState("");
  const [isChatLoading, setIsChatLoading] = React.useState(false);
  const chatRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (status === "authenticated" && (!realName || !clinicName)) {
      setShowProfileSetup(true);
    } else {
      setShowProfileSetup(false);
    }
  }, [status, realName, clinicName]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.realName || !profileForm.clinicName || !profileForm.age) {
      toast.error("모든 항목을 입력해주세요.");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm)
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("정보가 성공적으로 저장되었습니다.");
        await update(); // 세션 업데이트
        setShowProfileSetup(false);
      } else {
        toast.error(data.error || "저장에 실패했습니다.");
      }
    } catch (err) {
      toast.error("오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChatSubmit = async (e?: React.FormEvent, presetMessage?: string) => {
    e?.preventDefault();
    const query = presetMessage || chatInput;
    if (!query) return;

    setChatResponse("");
    setIsChatLoading(true);
    setChatInput(query);
    
    // Auto scroll to chat area
    setTimeout(() => {
      chatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          data: currentData,
          emrType: selectedEmr
        })
      });
      
      if (!res.ok) throw new Error("API Error");
      
      const reader = res.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      
      if (reader) {
        let text = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          text += decoder.decode(value, { stream: true });
          setChatResponse(text);
        }
      }
    } catch (err) {
      setChatResponse("데이터 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsChatLoading(false);
      setChatInput(""); // Clear input after complete
    }
  };

  // 로딩 상태
  if (status === "loading") {
    return (
      <main className="min-h-screen bg-[#05080F] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </main>
    );
  }

  // 1. 비로그인 상태
  if (status === "unauthenticated") {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-md w-full space-y-12 text-center">
          <div className="space-y-4">
            <div className="inline-block p-4 bg-white rounded-3xl shadow-xl shadow-blue-500/10 mb-6">
              <TrendingUp size={48} className="text-blue-600" strokeWidth={2.5} />
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">바른컨설팅</h1>
            <p className="text-slate-500 font-medium text-lg">데이터로 증명하는 병원 성장의 파트너</p>
          </div>
          <KakaoLogin />
        </div>
      </main>
    );
  }

  // 1.5 프로필 설정 모달 (신규 가입자)
  if (showProfileSetup) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-slate-50 p-8 md:p-12 lg:p-20 flex items-center justify-center">
          <div className="max-w-md w-full bg-white rounded-[32px] p-8 shadow-2xl space-y-8 animate-in fade-in slide-in-from-bottom-8">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles size={32} />
              </div>
              <h2 className="text-2xl font-black text-slate-900">환영합니다!</h2>
              <p className="text-slate-500 font-medium">서비스 이용을 위해 원장님의 정보를 입력해주세요.</p>
            </div>
            
            <form onSubmit={handleProfileSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">원장님 성함</label>
                <input 
                  type="text" 
                  required
                  value={profileForm.realName}
                  onChange={e => setProfileForm({...profileForm, realName: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 font-medium"
                  placeholder="홍길동"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">한의원명</label>
                <input 
                  type="text" 
                  required
                  value={profileForm.clinicName}
                  onChange={e => setProfileForm({...profileForm, clinicName: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 font-medium"
                  placeholder="바른한의원"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">연령 (나이)</label>
                <input 
                  type="number" 
                  required
                  min="20"
                  max="100"
                  value={profileForm.age}
                  onChange={e => setProfileForm({...profileForm, age: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 font-medium"
                  placeholder="35"
                />
              </div>
              
              <button 
                type="submit" 
                disabled={isSaving}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5 active:translate-y-0"
              >
                {isSaving ? "저장 중..." : "저장하고 시작하기"}
              </button>
            </form>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // 2. 차트 선택 모드 (미선택자 또는 변경 모드)
  if (!selectedEmr || isChangeMode) {
    const emrs = [
      {
        id: "hanchart",
        name: "한차트",
        description: "한의원 맞춤 초진/재진 및 항목별 매출 정밀 분석",
        color: "bg-blue-50 text-blue-600 border-blue-200 hover:border-blue-500",
        icon: <FileText size={40} className="mb-4" />
      },
      {
        id: "okchart",
        name: "오케이차트",
        description: "통합 매출 및 보험/비보험 상세 분석 체계",
        color: "bg-emerald-50 text-emerald-600 border-emerald-200 hover:border-emerald-500",
        icon: <Activity size={40} className="mb-4" />
      },
      {
        id: "hanisarang",
        name: "한의사랑",
        description: "환자 유입 및 수납액 비교 분석 특화",
        color: "bg-emerald-50 text-emerald-600 border-emerald-200 hover:border-emerald-500",
        icon: <Stethoscope size={40} className="mb-4" />
      },
      {
        id: "donguibogam",
        name: "동의보감",
        description: "종합 치료 항목별 통계 및 객단가 진단",
        color: "bg-amber-50 text-amber-600 border-amber-200 hover:border-amber-500",
        icon: <BarChart2 size={40} className="mb-4" />
      }
    ];

    return (
      <DashboardLayout>
        <div className="min-h-screen bg-slate-50 p-8 md:p-12 lg:p-20">
          <div className="max-w-7xl mx-auto space-y-16">
            <header className="space-y-4">
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                반갑습니다, {userName}님<br/>
                <span className="text-blue-600">사용하시는 차트</span>를 선택해 주세요.
              </h2>
              <p className="text-slate-500 font-medium text-xl">선택하신 차트에 맞춰 대시보드가 자동으로 구성됩니다.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150">
              {emrs.map((emr) => (
                <button
                  key={emr.id}
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/user/emr", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ emrId: emr.id })
                      });
                      if (res.ok) {
                        toast.success(`${emr.name}로 차트가 귀속되었습니다.`);
                        await update();
                        router.push(`/`);
                      } else {
                        router.push(`/emr/${emr.id}`);
                      }
                    } catch {
                      router.push(`/emr/${emr.id}`);
                    }
                  }}
                  className={`flex flex-col items-center text-center p-8 rounded-3xl border-2 transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm hover:shadow-xl ${emr.color}`}
                >
                  <div className="p-4 bg-white/60 rounded-2xl shadow-sm mb-4">
                    {emr.icon}
                  </div>
                  <h3 className="text-2xl font-bold mb-3 text-slate-800">{emr.name}</h3>
                  <p className="text-sm font-medium text-slate-600/90 leading-relaxed">
                    {emr.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // 3. AI 경영 비서 홈 화면 (차트가 이미 귀속된 경우)
  const formatNumber = (num: number) => new Intl.NumberFormat("ko-KR").format(num || 0);

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#05080F] text-white font-sans selection:bg-blue-500/30 overflow-x-hidden">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 pt-32 space-y-20">
          
          {/* AI Secretary Hero Section */}
          <section className="relative">
            {/* Background Glows */}
            <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none" />
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-purple-600/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="relative z-10 space-y-12">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3"
              >
                <span className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                  <BrainCircuit size={14} className="animate-pulse" /> 
                  AI Management Secretary Active
                </span>
              </motion.div>

              <div className="space-y-4">
                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9]"
                >
                  안녕하세요, <br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-blue-500">{userName} 원장님.</span>
                </motion.h1>
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-slate-400 text-xl font-light leading-relaxed max-w-2xl"
                >
                  오늘 우리 병원의 데이터를 정밀 분석했습니다. <br/>
                  궁금하신 지표나 개선 전략을 비서에게 물어보세요.
                </motion.p>
              </div>

              {/* AI Interaction Area */}
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="relative max-w-4xl"
                ref={chatRef}
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-[3rem] blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                <form 
                  onSubmit={handleChatSubmit}
                  className="relative bg-[#0D1117]/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-2 flex items-center shadow-2xl group"
                >
                  <div className="pl-8 text-blue-500">
                    {isChatLoading ? <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /> : <Sparkles size={24} className="animate-pulse" />}
                  </div>
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={isChatLoading}
                    placeholder="지난달 비급여 매출 비중은 어때? (입력하여 질문하기)"
                    className="w-full bg-transparent border-none px-6 py-6 text-lg font-medium text-white placeholder-slate-600 focus:outline-none focus:ring-0 disabled:opacity-50"
                  />
                  <button 
                    type="submit"
                    disabled={isChatLoading || !chatInput.trim()}
                    className="mr-2 p-5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white rounded-[2rem] transition-all shadow-xl shadow-blue-600/20 active:scale-95 group/btn"
                  >
                    <ArrowRight size={24} className="group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </form>

                {/* AI Chat Response Area */}
                <AnimatePresence>
                  {(chatResponse || isChatLoading) && (
                    <motion.div
                      initial={{ opacity: 0, y: -20, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -20, height: 0 }}
                      className="mt-6 p-8 bg-[#0D1117]/60 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0 border border-blue-500/20 mt-1">
                          <BrainCircuit size={20} />
                        </div>
                        <div className="flex-1 space-y-2">
                          <h4 className="text-sm font-bold text-blue-400 uppercase tracking-widest">AI Management Secretary</h4>
                          <div className="whitespace-pre-wrap text-slate-300 leading-relaxed font-light">
                            {chatResponse || "데이터를 분석하고 있습니다..."}
                            {isChatLoading && <span className="inline-block ml-1 animate-pulse">▋</span>}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Smart Suggestion Chips */}
                <div className="flex flex-wrap gap-3 mt-6 ml-4">
                  {[
                    { label: "최근 3개월 비급여 매출 트렌드 분석해줘", icon: <Zap size={12} /> },
                    { label: "신규 환자 유입을 늘리기 위한 마케팅 플랜 짜줘", icon: <Target size={12} /> },
                    { label: "보험 청구액이 유독 낮았던 달의 원인이 뭘까?", icon: <MessageSquare size={12} /> },
                    { label: "초진 환자 재진율을 높이는 상담 스크립트 작성해줘", icon: <Sparkles size={12} /> }
                  ].map((chip, i) => (
                    <button 
                      key={i}
                      type="button"
                      onClick={() => handleChatSubmit(undefined, chip.label)}
                      disabled={isChatLoading}
                      className="px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-blue-500/50 text-[11px] font-bold text-slate-400 hover:text-blue-400 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {chip.icon} {chip.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          </section>

          {/* Daily Mission & Management Quotes */}
          <section>
            <DailyMissionCard data={currentData} userName={userName} emrType={(selectedEmr as any) || "okchart"} />
          </section>

          {/* Quick Support Footer */}
          <footer className="pt-20 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-8 text-slate-600 text-[10px] font-bold uppercase tracking-widest">
             <div className="flex items-center gap-6">
                <span className="hover:text-slate-400 cursor-pointer transition-colors">이용약관</span>
                <span className="hover:text-slate-400 cursor-pointer transition-colors">개인정보처리방침</span>
                <span className="hover:text-slate-400 cursor-pointer transition-colors">고객센터</span>
             </div>
             <p>© 2026 BARUN CONSULTING. ALL RIGHTS RESERVED.</p>
          </footer>
        </main>
      </div>
    </DashboardLayout>
  );
}
