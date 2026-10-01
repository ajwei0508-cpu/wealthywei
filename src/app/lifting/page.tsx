"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { 
  Gem, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  Lock, 
  Layers, 
  ArrowRight, 
  Clock, 
  FileText, 
  Download, 
  HeartHandshake, 
  AlertCircle, 
  ChevronRight, 
  Eye, 
  Target, 
  Compass, 
  Smile, 
  Activity,
  Flame,
  Award,
  Play,
  Video,
  ExternalLink,
  Maximize,
  Volume2,
  Share2,
  FileCheck,
  Presentation
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface ProtocolCard {
  id: string;
  title: string;
  badge: string;
  summary: string;
  smasTarget: string;
  duration: string;
  interval: string;
  needleType: string;
  points: string[];
  keyAdvice: string;
}

const protocols: ProtocolCard[] = [
  {
    id: "cog-thread",
    title: "하이엔드 코그(Cog) 매선 리프팅",
    badge: "강력한 중력 리프팅",
    summary: "처진 볼살과 심부볼, 무너진 턱선을 360도 양방향 돌기사로 SMAS층과 유지인대에 고정하여 즉각적인 V라인을 형성합니다.",
    smasTarget: "천층근건막체계 (SMAS) 및 광대유지인대",
    duration: "40 ~ 50분",
    interval: "6개월 ~ 1년 주기 권장",
    needleType: "19G ~ 21G Cannula Cog Thread (양방향/프레스 코그)",
    points: [
      "피부 손상을 최소화하는 블런트 캐뉼라(Blunt Cannula) 자입법 적용",
      "이개전부(귀 앞) 최소 자입점을 통한 흉터 배제 설계",
      "단순 견인이 아닌 안면 벡터(Vector) 역방향의 다각도 안착 기법",
      "멍과 부종을 차단하는 층별 박리 및 균일 텐션 유지"
    ],
    keyAdvice: "고객에게 '과교정(Overcorrection)' 직후의 당김 느낌을 미리 고지해야 3일 차 불안 컴플레인을 100% 예방할 수 있습니다."
  },
  {
    id: "mono-thread",
    title: "미세 탄력 모노 & 볼륨 매선",
    badge: "진피 재생 & 콜라겐 타이트닝",
    summary: "피부 진피하층에 격자(Mesh) 구조로 자입하여 자가 콜라겐 생성을 유도하고 피부 밀도와 잔주름을 탄탄하게 복원합니다.",
    smasTarget: "진피하층 및 피하지방층 (Dermis & Subcutis)",
    duration: "25 ~ 30분",
    interval: "3~4주 간격 3회 집중 케어",
    needleType: "29G ~ 31G Mono & Screw Thread",
    points: [
      "팔자주름 함몰 부위 볼륨 필업(Fill-up) 격자 자입",
      "눈가 잔주름 및 입가 마리오네트 라인 밀도 강화",
      "조직 내 지속적 신생혈관 생성 및 엘라스틴 증식 촉진",
      "시술 직후 일상생활 복귀 가능 (Zero 다운타임)"
    ],
    keyAdvice: "단독 시술보다 코그 매선 후 지지대 보강용으로 콤비네이션할 때 만족도가 2.8배 상승합니다."
  },
  {
    id: "contour-injection",
    title: "윤곽 약침 & 비대칭 라인 교정",
    badge: "지방분해 & 붓기 배출",
    summary: "이중턱과 심부볼 지방세포를 안전하게 분해하고 림프 순환을 촉진하여 무거운 페이스 라인을 가볍고 날렵하게 정돈합니다.",
    smasTarget: "협부지방패드(Bichat's fat pad) 및 활경근(Platysma)",
    duration: "15 ~ 20분",
    interval: "1~2주 간격 3~5회",
    needleType: "30G 미세 주입기",
    points: [
      "천연 한방 추출물 기반의 스테로이드/트리암 제로 처방",
      "이중턱 침착 지방의 림프관 배출 극대화",
      "좌우 비대칭 턱선 및 저작근 긴장 밸런싱",
      "리프팅 매선 전 사전 감량으로 견인 효과 극대화"
    ],
    keyAdvice: "턱 밑 지방이 두꺼운 고객은 리프팅 전 윤곽약침으로 무게를 먼저 줄여주어야 매선이 오래 유지됩니다."
  },
  {
    id: "fascia-acupuncture",
    title: "두경부 근막 이완 미용침 (MTS/Face)",
    badge: "두피 견인 & 전신 순환",
    summary: "측두근, 모상건막, 흉쇄유돌근의 긴장을 풀어 안면 전체를 위로 끌어올리는 근본적 안티에이징 기초 시술입니다.",
    smasTarget: "측두근(Temporalis) 및 모상건막(Galea aponeurotica)",
    duration: "30분",
    interval: "주 1~2회 정기 관리",
    needleType: "0.20 x 30mm 미세침 및 피내침",
    points: [
      "헤어라인 내측 측두근 자극으로 상안검 처짐 개선",
      "안면 신경 주행 경로를 고려한 혈류 촉진 자침",
      "목-어깨 근막(승모근, 후두하근) 방사통 및 순환 해소",
      "혈색 톤업과 부종의 즉각적 완화"
    ],
    keyAdvice: "얼굴만 만져서는 리프팅이 오래가지 않습니다. 측두근과 모상건막의 단단함을 푸는 것이 핵심 앵커(Anchor)입니다."
  }
];

const psychologySteps = [
  {
    phase: "1단계",
    title: "콤플렉스 안전 지대 형성",
    desc: "환자는 '처짐'을 인정하는 순간 자존감의 위협을 느낍니다. '환자분의 잘못된 습관 때문이 아니라, 누구나 겪는 자연스러운 인체 해부학적 변화'임을 먼저 짚어주어 수치심을 덜고 방어벽을 해제합니다.",
    icon: ShieldCheck,
    tag: "방어기제 해제"
  },
  {
    phase: "2단계",
    title: "기대치 현실화 & 거울 진단",
    desc: "환자가 손가락으로 얼굴을 위로 바짝 당기며 바라는 20대 시절의 모습과 실제 시술의 차이를 거울을 보며 솔직히 조율합니다. 과도한 기대치를 정직하게 바로잡을 때 신뢰도가 급상승합니다.",
    icon: Eye,
    tag: "신뢰 구축"
  },
  {
    phase: "3단계",
    title: "방치 비용(Cost of Inaction) 환기",
    desc: "지금의 얕은 주름이 깊은 유착과 피부 늘어짐으로 진행될 경우 소요될 미래의 비용과 시간적 손실을 차분히 설명합니다. 불안감을 조성하는 것이 아니라, 현명한 조기 관리의 경제성을 납득시킵니다.",
    icon: Target,
    tag: "결정 촉진"
  },
  {
    phase: "4단계",
    title: "1:1 맞춤형 복합 플랜 제안",
    desc: "'단일 시술'이 아닌 [윤곽 감량 -> 코그 견인 -> 모노 볼륨 -> 사후 탄력]의 완성형 로드맵을 제시하여 할인 경쟁에 휘말리지 않는 고가치 티켓팅을 성사시킵니다.",
    icon: Award,
    tag: "고가치 전환"
  }
];

const vectorAreas = [
  {
    area: "심부볼 & 불독살 (Jowl Line)",
    problem: "안면 유지인대 이완으로 인한 하안검 지방 처짐",
    solution: "이개전부 앵커링 코그 매선 4~6줄 + 심부볼 윤곽약침",
    effect: "하안부 둔탁함 제거, 날렵한 V라인 턱선 복원"
  },
  {
    area: "팔자주름 (Nasolabial Fold)",
    problem: "앞광대 지방 패드 하수 및 상악골 함몰 복합",
    solution: "비익 기저부 볼륨 스크류 매선 10줄 + 측두 견인 코그 2줄",
    effect: "입가 그늘 개선, 5세 이상 젊어 보이는 인상"
  },
  {
    area: "이중턱 & 턱밑 늘어짐 (Submental)",
    problem: "활경근 약화 및 턱밑 림프 순환 정체",
    solution: "활경근 격자 모노 매선 20줄 + 턱밑 윤곽약침",
    effect: "목과 턱의 경계선 확립, 옆태 라인 밀착"
  },
  {
    area: "눈가 & 이마 처짐 (Upper Face)",
    problem: "전두근 피로 및 안륜근 이완으로 인한 눈꼬리 처짐",
    solution: "측두근 두피 매선 + 눈가 미세 안면침",
    effect: "시원한 눈매 개방감, 피로해 보이는 인상 개선"
  }
];

function LiftingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab") as "video" | "protocol" | "psychology" | "vector" | "sop" | null;

  const [activeTab, setActiveTab] = useState<"video" | "protocol" | "psychology" | "vector" | "sop">("video");
  const [selectedProtocol, setSelectedProtocol] = useState<string>("cog-thread");
  const videoContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tabParam && ["video", "protocol", "psychology", "vector", "sop"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tab: "video" | "protocol" | "psychology" | "vector" | "sop") => {
    setActiveTab(tab);
    router.replace(`/lifting?tab=${tab}`, { scroll: false });
  };

  const currentProtocol = protocols.find(p => p.id === selectedProtocol) || protocols[0];

  const toggleFullScreen = () => {
    if (!videoContainerRef.current) return;
    if (!document.fullscreenElement) {
      if (videoContainerRef.current.requestFullscreen) {
        videoContainerRef.current.requestFullscreen().catch(() => {
          toast.error("전체 화면을 지원하지 않는 브라우저 환경입니다.");
        });
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const copyVideoLink = () => {
    navigator.clipboard.writeText("https://youtu.be/aQdbo9vdN3I");
    toast.success("영상 링크가 클립보드에 복사되었습니다!");
  };

  const { data: session, status } = useSession();
  const userStatus = (session?.user as any)?.approvalStatus || 'pending';
  const approvedCategories = (session?.user as any)?.approvedCategories || [];
  const userCategory = (session?.user as any)?.approvedCategory || '';
  const masterEmail = process.env.NEXT_PUBLIC_MASTER_EMAIL || "wei0508@naver.com";
  const isMaster = session?.user?.email?.toLowerCase() === masterEmail.toLowerCase();
  
  const isLiftingApproved = isMaster || (userStatus === 'approved' && (
    approvedCategories.includes('lifting') || 
    approvedCategories.includes('consulting') || 
    approvedCategories.includes('바른리프팅') || 
    approvedCategories.includes('바른컨설팅') ||
    userCategory === 'lifting' || 
    userCategory === 'consulting' ||
    userCategory === '바른리프팅' ||
    userCategory === '바른컨설팅'
  ));

  if (status === "authenticated" && !isLiftingApproved) {
    return (
      <div className="min-h-screen bg-[#031C13] flex items-center justify-center p-6 text-white">
        <div className="max-w-md w-full p-8 rounded-3xl bg-black/60 border border-amber-500/30 text-center shadow-2xl backdrop-blur-md space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-black text-white">바른 리프팅 회원 전용</h2>
          <p className="text-sm text-white/70 leading-relaxed">
            본 콘텐츠는 <span className="text-amber-400 font-bold">바른컨설팅</span> 또는 <span className="text-emerald-400 font-bold">바른리프팅</span> 승인 자격을 보유하신 원장님 전용 임상 시스템입니다.
          </p>
          <div className="pt-4 flex flex-col gap-2">
            <Link 
              href="/requests"
              className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-lg"
            >
              열람 권한 신청 및 문의하기
            </Link>
            <Link 
              href="/"
              className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-xs transition-all"
            >
              메인 홈으로 이동
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#031C13] text-white">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 pt-24">
        
        {/* Hero Banner Header */}
        <div className="relative mb-10 rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-950/80 via-[#06291C] to-[#02140D] border border-emerald-500/20 p-8 md:p-12 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
          <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10">
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 mb-4"
            >
              <span className="px-3.5 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-[11px] font-black uppercase tracking-[0.25em] flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <Gem size={13} className="text-amber-400" />
                Barun Aesthetic & Lifting System
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                Clinical Masterclass
              </span>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col lg:flex-row lg:items-end justify-between gap-6"
            >
              <div>
                <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-4 leading-tight">
                  바른 리프팅{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-emerald-200 to-teal-300 font-extrabold">
                    마스터 클래스
                  </span>
                </h1>
                <p className="text-white/70 text-base md:text-lg font-normal max-w-3xl leading-relaxed">
                  원장실 1:1 초진상담 영상 실전 분석부터 근막(SMAS) 텐션 재배치 임상 기술,
                  소비자 심리 기반 티켓팅까지 아우르는 바른컨설팅 프리미엄 리프팅 통합 솔루션입니다.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="px-4 py-3 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] text-white/50 uppercase font-black tracking-wider">Access Status</p>
                    <p className="text-xs font-bold text-emerald-300">정회원 시청 권한 인증</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <div className="flex items-center gap-2 p-1.5 bg-black/40 rounded-2xl border border-white/10 backdrop-blur-md mb-8 overflow-x-auto shadow-xl">
          {/* 1. 초진상담 영상 (OPEN) */}
          <button
            onClick={() => handleTabChange("video")}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-xs tracking-wider transition-all duration-300 whitespace-nowrap ${
              activeTab === "video"
                ? "bg-gradient-to-r from-rose-600 via-amber-500 to-emerald-600 text-white shadow-lg shadow-rose-950/50 scale-[1.02]"
                : "text-white/70 hover:text-white hover:bg-white/5"
            }`}
          >
            <Play size={15} className={activeTab === "video" ? "fill-white text-white" : "text-rose-400"} />
            초진상담 영상 (실전 강의)
            <span className="px-1.5 py-0.5 text-[9px] bg-rose-500/30 text-rose-200 rounded font-black">HD</span>
          </button>

          {/* 2. 리프팅 시스템 (OPEN) */}
          <button
            onClick={() => router.push("/lifting/system")}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-xs tracking-wider transition-all duration-300 whitespace-nowrap bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 shadow-lg shadow-amber-900/30"
          >
            <Presentation size={15} className="text-amber-400" />
            리프팅 시스템 (슬라이드)
            <span className="px-1.5 py-0.5 text-[9px] bg-amber-400 text-black rounded font-black">NEW</span>
          </button>

          {/* 3. 소비자 심리 상담 & 티켓팅 (OPEN) */}
          <button
            onClick={() => handleTabChange("psychology")}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-xs tracking-wider transition-all duration-300 whitespace-nowrap ${
              activeTab === "psychology"
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-900/40 scale-[1.02]"
                : "text-white/70 hover:text-white hover:bg-white/5"
            }`}
          >
            <HeartHandshake size={16} className={activeTab === "psychology" ? "text-white" : "text-emerald-400"} />
            소비자 심리 상담 & 티켓팅
          </button>

          {/* Divider */}
          <div className="h-6 w-px bg-white/10 mx-1 shrink-0 hidden sm:block" />

          {/* 4. 임상 프로토콜 & 매선술 (LOCKED) */}
          <button
            onClick={() => {
              handleTabChange("protocol");
              toast("🔒 임상 프로토콜 메뉴는 현재 비공개 잠금 상태입니다.", { icon: "🔒" });
            }}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-xs tracking-wider transition-all duration-300 whitespace-nowrap border ${
              activeTab === "protocol"
                ? "bg-black/60 border-amber-500/40 text-amber-300"
                : "text-white/40 border-transparent hover:text-white/60 hover:bg-white/[0.03]"
            }`}
          >
            <Layers size={14} className="opacity-60" />
            임상 프로토콜 & 매선술
            <Lock size={12} className="text-amber-400/70" />
            <span className="px-1.5 py-0.5 text-[9px] bg-white/10 text-white/50 rounded font-bold">잠금</span>
          </button>

          {/* 5. 안면 부위별 벡터 맵 (LOCKED) */}
          <button
            onClick={() => {
              handleTabChange("vector");
              toast("🔒 안면 벡터 맵 메뉴는 현재 비공개 잠금 상태입니다.", { icon: "🔒" });
            }}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-xs tracking-wider transition-all duration-300 whitespace-nowrap border ${
              activeTab === "vector"
                ? "bg-black/60 border-amber-500/40 text-amber-300"
                : "text-white/40 border-transparent hover:text-white/60 hover:bg-white/[0.03]"
            }`}
          >
            <Compass size={14} className="opacity-60" />
            안면 부위별 벡터 맵
            <Lock size={12} className="text-amber-400/70" />
            <span className="px-1.5 py-0.5 text-[9px] bg-white/10 text-white/50 rounded font-bold">잠금</span>
          </button>

          {/* 6. 시술 전후 안심 케어 SOP (LOCKED) */}
          <button
            onClick={() => {
              handleTabChange("sop");
              toast("🔒 안심 케어 SOP 메뉴는 현재 비공개 잠금 상태입니다.", { icon: "🔒" });
            }}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-xs tracking-wider transition-all duration-300 whitespace-nowrap border ${
              activeTab === "sop"
                ? "bg-black/60 border-amber-500/40 text-amber-300"
                : "text-white/40 border-transparent hover:text-white/60 hover:bg-white/[0.03]"
            }`}
          >
            <Clock size={14} className="opacity-60" />
            시술 전후 안심 케어 SOP
            <Lock size={12} className="text-amber-400/70" />
            <span className="px-1.5 py-0.5 text-[9px] bg-white/10 text-white/50 rounded font-bold">잠금</span>
          </button>
        </div>

        {/* Tab: 초진상담 영상 (Featured Video Player) */}
        {activeTab === "video" && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {/* Main Video Box */}
            <div className="relative rounded-3xl bg-black/60 border border-white/10 overflow-hidden shadow-2xl backdrop-blur-md">
              
              {/* Video Player Header Bar */}
              <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                    <Play size={22} className="fill-rose-400 translate-x-0.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-black uppercase tracking-wider">
                        Live Clinic Lecture
                      </span>
                      <span className="text-white/40 text-xs flex items-center gap-1 font-semibold">
                        <Clock size={12} /> 초진 상담 분석
                      </span>
                    </div>
                    <h2 className="text-xl md:text-2xl font-black text-white">
                      바른 리프팅 1:1 프리미엄 초진상담 실전 마스터 가이드
                    </h2>
                  </div>
                </div>

                {/* Control Action Buttons */}
                <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                  <button
                    onClick={toggleFullScreen}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/15 text-white/80 hover:text-white text-xs font-bold transition-all border border-white/10"
                    title="전체 화면으로 시청"
                  >
                    <Maximize size={14} />
                    <span className="hidden sm:inline">전체화면</span>
                  </button>
                  <button
                    onClick={copyVideoLink}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/15 text-white/80 hover:text-white text-xs font-bold transition-all border border-white/10"
                    title="영상 링크 공유"
                  >
                    <Share2 size={14} />
                    <span className="hidden sm:inline">링크 복사</span>
                  </button>
                  <a
                    href="https://youtu.be/aQdbo9vdN3I"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition-all shadow-lg shadow-rose-900/30 active:scale-95"
                  >
                    <ExternalLink size={14} />
                    <span>유튜브 열기</span>
                  </a>
                </div>
              </div>

              {/* YouTube Iframe Player Container */}
              <div ref={videoContainerRef} className="relative w-full aspect-video bg-black group">
                <iframe
                  className="w-full h-full border-none"
                  src="https://www.youtube.com/embed/aQdbo9vdN3I?autoplay=1&rel=0&modestbranding=1"
                  title="바른 리프팅 초진상담 영상"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                  allowFullScreen
                />
              </div>

              {/* Player Bottom Briefing */}
              <div className="p-6 md:p-8 bg-gradient-to-t from-black via-black/80 to-transparent border-t border-white/5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                    <p className="text-[10px] font-bold text-amber-400 uppercase mb-1">상담 핵심 주제</p>
                    <p className="text-sm font-bold text-white">환자 방어기제 해제 & 거울 진단 화법</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                    <p className="text-[10px] font-bold text-emerald-400 uppercase mb-1">목표 달성</p>
                    <p className="text-sm font-bold text-white">과교정 불안 해소 및 고관여 티켓팅</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                    <p className="text-[10px] font-bold text-teal-300 uppercase mb-1">적용 대상</p>
                    <p className="text-sm font-bold text-white">처짐/비대칭/주름 리프팅 초진 환자</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Video Lecture Insights Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: 4 Key Checkpoints */}
              <div className="lg:col-span-8 p-8 md:p-10 rounded-3xl bg-black/40 border border-white/10 backdrop-blur-md space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={18} className="text-amber-400" />
                  <h3 className="text-xl font-black text-white">영상 속 핵심 초진상담 체크포인트 4선</h3>
                </div>
                <p className="text-sm text-white/60 leading-relaxed mb-6">
                  환자가 원장실 문을 열고 들어와 시술 결정을 내리기까지의 심리적 의사결정 경로를 단계별로 체계화했습니다.
                </p>

                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-amber-400/30 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-amber-400 px-2.5 py-0.5 rounded-full bg-amber-400/10">
                        POINT 01
                      </span>
                      <span className="text-xs font-bold text-white/40">첫 라포 형성</span>
                    </div>
                    <h4 className="text-base font-bold text-white mb-1.5">
                      손가락으로 볼살을 당겨 올리는 환자의 심리 읽기
                    </h4>
                    <p className="text-sm text-white/70 leading-relaxed font-light">
                      환자가 직접 얼굴을 당겨 보일 때 이를 면박 주지 않고, &lsquo;환자분이 가장 되찾고 싶으신 모습의 본질&rsquo;에 깊이 공감하며 안전한 대화 무드를 구축합니다.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-emerald-400/30 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-emerald-400 px-2.5 py-0.5 rounded-full bg-emerald-500/10">
                        POINT 02
                      </span>
                      <span className="text-xs font-bold text-white/40">원리 시각화</span>
                    </div>
                    <h4 className="text-base font-bold text-white mb-1.5">
                      근막(SMAS) 지지대 비유로 어색함에 대한 두려움 해소
                    </h4>
                    <p className="text-sm text-white/70 leading-relaxed font-light">
                      &ldquo;피부 겉면만 무리하게 당기면 인상이 사나워집니다. 우리 시술은 건축물의 뼈대처럼 속 근막(SMAS)에 부드러운 지지대를 세워 원래의 자연스러운 미소를 살리는 과정입니다.&rdquo;
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-teal-400/30 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-teal-300 px-2.5 py-0.5 rounded-full bg-teal-500/10">
                        POINT 03
                      </span>
                      <span className="text-xs font-bold text-white/40">가치 제안</span>
                    </div>
                    <h4 className="text-base font-bold text-white mb-1.5">
                      방치 비용(Cost of Inaction) 환기로 결단 유도
                    </h4>
                    <p className="text-sm text-white/70 leading-relaxed font-light">
                      단순 비용 견적을 던지는 것이 아니라, 얕은 주름이 깊은 유착과 피부 늘어짐으로 진행되었을 때 치러야 할 미래의 기회비용을 짚어 현명한 조기 치료를 권고합니다.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-rose-400/30 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-rose-400 px-2.5 py-0.5 rounded-full bg-rose-500/10">
                        POINT 04
                      </span>
                      <span className="text-xs font-bold text-white/40">컴플레인 제로</span>
                    </div>
                    <h4 className="text-base font-bold text-white mb-1.5">
                      3일 차 당김 & 경미한 멍에 대한 선제적 안심 고지
                    </h4>
                    <p className="text-sm text-white/70 leading-relaxed font-light">
                      시술 직후 약간의 과교정 느낌과 조직 안착 반응을 상담 중에 먼저 상세히 설명해 줌으로써, 3일 뒤 환자가 느낄 불안감을 100% 신뢰로 치환합니다.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Download & Clinic Tools */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Consultation Script Card */}
                <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-[#063122] to-[#02170E] border border-emerald-500/30 shadow-2xl space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center">
                    <FileCheck size={20} />
                  </div>
                  <h4 className="text-lg font-black text-white">초진상담 원장용 클로징</h4>
                  <p className="text-xs text-white/70 leading-relaxed">
                    초진 환자의 80%가 망설이는 가장 큰 이유는 가격이 아닌 &lsquo;부자연스러움에 대한 공포&rsquo;입니다. 이 한마디로 신뢰를 완성하십시오.
                  </p>
                  <blockquote className="p-4 rounded-xl bg-black/40 border border-white/10 text-xs text-emerald-200 leading-relaxed italic">
                    &ldquo;환자분, 인위적으로 바뀐 얼굴이 아니라 &lsquo;어디 다녀왔는지 모르겠는데 참 편안하고 젊어졌다&rsquo;는 소리를 듣게 해드리는 것이 바른 리프팅의 원칙입니다.&rdquo;
                  </blockquote>
                </div>

                {/* Quick Link to Other Open Menus */}
                <div className="p-6 rounded-3xl bg-black/40 border border-white/10 space-y-4">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles size={16} className="text-amber-400" />
                    다음 추천 핵심 코스
                  </h4>
                  <p className="text-xs text-white/50 leading-relaxed">
                    초진상담 영상을 확인하셨다면, 리프팅 시스템 슬라이드와 소비자 심리 상담 4단계를 함께 숙지하세요.
                  </p>
                  <div className="space-y-2 pt-1">
                    <button
                      onClick={() => router.push("/lifting/system")}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-950/40"
                    >
                      <Presentation size={14} />
                      <span>리프팅 시스템 (18 슬라이드) 열람하기</span>
                      <ArrowRight size={14} />
                    </button>
                    <button
                      onClick={() => handleTabChange("psychology")}
                      className="w-full py-3 rounded-xl bg-emerald-600/80 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all border border-emerald-500/30"
                    >
                      <HeartHandshake size={14} />
                      <span>소비자 심리 상담 & 티켓팅 보기</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        )}

        {/* Tab: 소비자 심리 상담 & 티켓팅 */}
        {activeTab === "psychology" && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            <div className="p-8 rounded-3xl bg-black/40 border border-white/10 backdrop-blur-md">
              <div className="max-w-2xl mb-8">
                <span className="text-xs font-black text-amber-400 uppercase tracking-widest mb-2 block">
                  High-Conversion Consultation Flow
                </span>
                <h2 className="text-2xl md:text-3xl font-black text-white mb-3">
                  소비자 심리 기반 4단계 리프팅 상담 전략
                </h2>
                <p className="text-sm text-white/70 leading-relaxed">
                  리프팅 환자는 &lsquo;노화에 대한 두려움&rsquo;과 &lsquo;부자연스러움에 대한 공포&rsquo;를 동시에 지닙니다.
                  단순한 견적 제시가 아닌 내면의 심리 장벽을 단계별로 허물어주는 독보적 커뮤니케이션입니다.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {psychologySteps.map((step, idx) => {
                  const Icon = step.icon;
                  return (
                    <div key={idx} className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-400/30 transition-all duration-300 group">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-black text-amber-400 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20">
                          {step.phase}
                        </span>
                        <span className="text-[11px] font-bold text-white/50 group-hover:text-emerald-300 transition-colors">
                          {step.tag}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                          <Icon size={18} />
                        </div>
                        <h3 className="text-lg font-bold text-white">{step.title}</h3>
                      </div>
                      <p className="text-sm text-white/70 leading-relaxed font-light">
                        {step.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Consultation Script Box */}
            <div className="p-8 rounded-3xl bg-gradient-to-br from-[#04281B] to-[#02130C] border border-emerald-500/30 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <Sparkles size={20} className="text-amber-400" />
                <h3 className="text-lg font-bold text-white">원장용 실전 상담 클로징 멘트</h3>
              </div>
              <blockquote className="p-6 rounded-2xl bg-black/40 border border-white/10 text-emerald-200 text-sm md:text-base leading-relaxed italic">
                &ldquo;환자분, 리프팅은 단순히 피부를 위로 잡아당기는 공사가 아닙니다. 환자분 고유의 표정과 미소가 가장 자연스럽고 생기 있게 되살아나도록, 무너진 근막 지지대를 부드럽게 세워주는 작업입니다. 억지스러운 변화가 아니라 &lsquo;요즘 얼굴이 왜 이렇게 편안하고 밝아졌냐&rsquo;는 소리를 듣게 해드리겠습니다.&rdquo;
              </blockquote>
            </div>

            {/* Next Recommended Navigation Banner */}
            <div className="p-6 md:p-8 rounded-3xl bg-black/40 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block mb-1">NEXT RECOMMENDED STEP</span>
                <h4 className="text-base font-bold text-white">리프팅 시스템 18 슬라이드로 작용 기전과 패키지 가격 전략 확인하기</h4>
                <p className="text-xs text-white/50 mt-1">HIFU 4대 리프팅 비교, 원가/할인가 구성표, 위험구역 SOP가 슬라이드로 제공됩니다.</p>
              </div>
              <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
                <button
                  onClick={() => handleTabChange("video")}
                  className="flex-1 sm:flex-none px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 font-bold text-xs flex items-center justify-center gap-2 transition-all border border-white/10"
                >
                  <Play size={13} className="text-rose-400" />
                  <span>초진상담 영상</span>
                </button>
                <button
                  onClick={() => router.push("/lifting/system")}
                  className="flex-1 sm:flex-none px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-950/40"
                >
                  <Presentation size={14} />
                  <span>리프팅 시스템 슬라이드</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab: 잠금된 비공개 임상 콘텐츠 (protocol, vector, sop) */}
        {(activeTab === "protocol" || activeTab === "vector" || activeTab === "sop") && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="relative rounded-3xl bg-gradient-to-br from-black/80 via-[#041D13] to-black/90 border border-amber-500/30 p-8 md:p-14 shadow-2xl backdrop-blur-xl overflow-hidden"
          >
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
              {/* Lock Badge */}
              <div className="inline-flex items-center justify-center p-4 rounded-3xl bg-gradient-to-br from-amber-500/20 to-black border border-amber-500/40 shadow-[0_0_35px_rgba(245,158,11,0.25)] mb-2">
                <Lock size={36} className="text-amber-400" />
              </div>

              <div>
                <span className="px-3.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-[11px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 mb-3">
                  <ShieldCheck size={13} className="text-amber-400" />
                  RESTRICTED CLINICAL ACCESS • 비공개 잠금
                </span>
                <h2 className="text-2xl md:text-4xl font-black text-white tracking-tight">
                  {activeTab === "protocol" && "임상 프로토콜 & 매선술"}
                  {activeTab === "vector" && "안면 부위별 벡터 맵"}
                  {activeTab === "sop" && "시술 전후 안심 케어 SOP"}
                  <span className="text-amber-400 block sm:inline sm:ml-2 text-xl md:text-2xl font-bold">
                    (비공개 잠금 안내)
                  </span>
                </h2>
              </div>

              <div className="p-6 md:p-8 rounded-2xl bg-black/40 border border-white/10 text-left space-y-4 shadow-inner">
                <p className="text-white/80 text-sm md:text-base leading-relaxed">
                  원장님의 즉각적인 매출 성장과 실전 진료력 강화를 위해 현재 바른 리프팅에서는 <br className="hidden sm:inline" />
                  <strong className="text-amber-300">① 초진상담 영상 실전 강의</strong>,{" "}
                  <strong className="text-amber-300">② 리프팅 시스템 (18 슬라이드 전 과정)</strong>,{" "}
                  <strong className="text-amber-300">③ 소비자 심리 상담 & 티켓팅</strong> 3대 핵심 메뉴를 집중 공개 운영하고 있습니다.
                </p>
                <div className="h-px bg-white/10" />
                <p className="text-white/60 text-xs md:text-sm leading-relaxed">
                  {activeTab === "protocol" && "💡 코그/모노 매선 심도 자입각 및 윤곽약침 복합 처방은 오프라인 임상 실습 및 정규 심화 과정 이수 원장님께 순차 개방됩니다."}
                  {activeTab === "vector" && "💡 심부볼·팔자·이중턱 해부학적 인장 벡터 맵과 앵커링 테크닉은 실전 세미나 수료 후 열람 가능합니다."}
                  {activeTab === "sop" && "💡 D-Day~4주 차 선제적 컴플레인 방어 SOP 및 사후 케어 지침은 차기 정규 기수 업데이트 시 개방됩니다."}
                </p>
              </div>

              {/* Recommended Action Cards (The 3 open menus) */}
              <div className="pt-4 text-left">
                <p className="text-xs font-black uppercase text-amber-400 tracking-wider mb-3 px-1">
                  지금 바로 열람 가능한 3대 핵심 메뉴
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Option 1: Video */}
                  <button
                    onClick={() => handleTabChange("video")}
                    className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-rose-400/50 hover:bg-rose-500/[0.05] transition-all group text-left flex flex-col justify-between"
                  >
                    <div>
                      <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <Play size={16} className="fill-rose-400 translate-x-0.5" />
                      </div>
                      <h4 className="text-sm font-bold text-white mb-1 group-hover:text-rose-300 transition-colors">
                        초진상담 영상 강의
                      </h4>
                      <p className="text-xs text-white/50 leading-relaxed">
                        원장실 1:1 상담 기법 및 컴플레인 제로 전략
                      </p>
                    </div>
                    <div className="mt-4 flex items-center gap-1 text-[11px] font-bold text-rose-400 group-hover:translate-x-1 transition-transform">
                      <span>영상 바로 시청</span>
                      <ArrowRight size={12} />
                    </div>
                  </button>

                  {/* Option 2: System Slides */}
                  <button
                    onClick={() => router.push("/lifting/system")}
                    className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 hover:border-amber-400 hover:bg-amber-500/15 transition-all group text-left flex flex-col justify-between shadow-lg shadow-amber-950/20"
                  >
                    <div>
                      <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <Presentation size={16} />
                      </div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                          리프팅 시스템 (슬라이드)
                        </h4>
                        <span className="px-1.5 py-0.5 text-[9px] bg-amber-400 text-black font-black rounded">18장</span>
                      </div>
                      <p className="text-xs text-white/50 leading-relaxed">
                        HIFU 원리, 4대 리프팅 비교, 패키지 가격 및 안전 SOP
                      </p>
                    </div>
                    <div className="mt-4 flex items-center gap-1 text-[11px] font-bold text-amber-400 group-hover:translate-x-1 transition-transform">
                      <span>슬라이드 열람</span>
                      <ArrowRight size={12} />
                    </div>
                  </button>

                  {/* Option 3: Psychology */}
                  <button
                    onClick={() => handleTabChange("psychology")}
                    className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-emerald-400/50 hover:bg-emerald-500/[0.05] transition-all group text-left flex flex-col justify-between"
                  >
                    <div>
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <HeartHandshake size={16} />
                      </div>
                      <h4 className="text-sm font-bold text-white mb-1 group-hover:text-emerald-300 transition-colors">
                        소비자 심리 상담 & 티켓팅
                      </h4>
                      <p className="text-xs text-white/50 leading-relaxed">
                        방어기제 해제부터 방치비용 환기, 고가치 패키지 클로징
                      </p>
                    </div>
                    <div className="mt-4 flex items-center gap-1 text-[11px] font-bold text-emerald-400 group-hover:translate-x-1 transition-transform">
                      <span>상담 기법 보기</span>
                      <ArrowRight size={12} />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

      </main>
    </div>
  );
}

export default function LiftingPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={
        <div className="min-h-screen bg-[#031C13] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-400 border-t-transparent"></div>
        </div>
      }>
        <LiftingContent />
      </Suspense>
    </DashboardLayout>
  );
}
