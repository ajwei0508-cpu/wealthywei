"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { 
  ChevronLeft, 
  ChevronRight, 
  Maximize, 
  Minimize, 
  Sparkles, 
  Gem, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Flame, 
  Compass, 
  Layers, 
  Clock, 
  Play, 
  ExternalLink, 
  Activity, 
  FileText, 
  Target, 
  HeartHandshake, 
  UserCheck, 
  Scissors, 
  CheckSquare, 
  Square, 
  RotateCcw,
  Presentation,
  ArrowLeft,
  Lock,
  Zap,
  HelpCircle
} from "lucide-react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";

interface SlideData {
  id: number;
  category: "원리 및 개념" | "세일즈 & 상담" | "임상 안전 SOP";
  tag: string;
  title: string;
  subtitle: string;
  image?: string;
  imageAlt?: string;
  imageCaption?: string;
  content: React.ReactNode;
}

export default function LiftingSystemPage() {
  const { data: session, status } = useSession();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});
  const slideContainerRef = useRef<HTMLDivElement>(null);

  // 권한 확인 (1) 바른컨설팅, (2) 바른리프팅 승인자 또는 마스터
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

  const toggleCheck = (idx: number) => {
    setCheckedItems(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const resetChecklist = () => {
    setCheckedItems({});
    toast.success("체크리스트가 초기화되었습니다.");
  };

  const slides: SlideData[] = [
    // Slide 1
    {
      id: 1,
      category: "원리 및 개념",
      tag: "SYSTEM OVERVIEW",
      title: "바른 리프팅 통합 마스터 시스템",
      subtitle: "HIFU 원리 & 리프팅 방식별 비교 & 실전 세일즈 & 임상 안전 프로토콜",
      content: (
        <div className="space-y-6 text-left">
          <p className="text-base md:text-lg text-white/90 leading-relaxed">
            본 시스템은 <span className="text-amber-400 font-bold">HIFU 리프팅의 작용 기전 및 타 리프팅(RF/실/거상)과의 심층 비교</span>부터 
            초음파 정밀 진단, 원내 패키지 프로그램 가격 구성, 소비자 심리 기반 타겟별 상담 멘트, 
            그리고 <span className="text-emerald-400 font-bold">화상 및 신경 손상을 원천 차단하는 표준 안전 수칙(SOP)</span>까지 
            원장님과 의료진을 위해 슬라이드 형태로 집대성한 실전 마스터 가이드입니다.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-400/40 transition-colors">
              <span className="text-xs font-black text-amber-400 uppercase tracking-widest block mb-1">PART 01</span>
              <h4 className="text-base font-bold text-white mb-2">HIFU 기전 & 4대 리프팅 비교</h4>
              <p className="text-xs text-white/60 leading-relaxed">
                열응고점 즉각 수축, 콜라겐 리모델링, 지방 분해와 HIFU vs RF고주파 vs 실리프팅 완벽 대조
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-teal-400/40 transition-colors">
              <span className="text-xs font-black text-teal-400 uppercase tracking-widest block mb-1">PART 02</span>
              <h4 className="text-base font-bold text-white mb-2">실전 세일즈 & 티켓팅</h4>
              <p className="text-xs text-white/60 leading-relaxed">
                원가/할인가 패키지, 원내 마케팅 5계명, 4대 환자 타겟별 원장실 실전 멘트
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-rose-400/40 transition-colors">
              <span className="text-xs font-black text-rose-400 uppercase tracking-widest block mb-1">PART 03</span>
              <h4 className="text-base font-bold text-white mb-2">안전 프로토콜 (SOP)</h4>
              <p className="text-xs text-white/60 leading-relaxed">
                과거 수술 이력 골든룰, Danger Zone 마킹도, 3대 화상 예방 및 인터랙티브 체크리스트
              </p>
            </div>
          </div>
        </div>
      )
    },

    // Slide 2: Updated with other lifting modalities comparison & custom diagram
    {
      id: 2,
      category: "원리 및 개념",
      tag: "HIFU & MODALITIES",
      title: "HIFU의 기본 개념 & 주요 리프팅 방식 완벽 비교",
      subtitle: "피부 속 4.5mm SMAS 근막층 열응고점 형성 원리 및 4대 리프팅 방식(HIFU vs RF vs 실 vs 거상) 비교",
      image: "/images/lifting/skin_layers.jpg",
      imageAlt: "피부층별 침투 깊이 및 리프팅 시술 방식 비교 다이어그램",
      imageCaption: "해부학적 침투 깊이: RF 고주파 (1.5~3.0mm 진피층) vs 실리프팅 (피하지방층) vs HIFU (4.5mm SMAS 근막층)",
      content: (
        <div className="space-y-6 text-left max-w-4xl mx-auto">
          {/* Concept Summary Box */}
          <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30">
            <h4 className="text-lg font-black text-amber-300 mb-1.5 flex items-center gap-2">
              <Flame size={18} className="text-amber-400" />
              HIFU(고강도 집속 초음파)의 핵심 기전
            </h4>
            <p className="text-white/90 text-sm leading-relaxed">
              피부 표피에는 전혀 상처를 남기지 않고 초음파 빔을 심부 <strong>4.5mm SMAS 근막층</strong>에 돋보기처럼 집속시켜 
              <strong> 60~70℃의 미세 열응고점(TCP)</strong>을 형성합니다. 이로 인해 즉각적인 근막 수축과 2~3개월에 걸친 콜라겐 리모델링을 유도합니다.
            </p>
          </div>

          {/* 4 Modalities Comparative Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. HIFU */}
            <div className="p-5 rounded-2xl bg-black/50 border border-amber-400/40 shadow-lg relative overflow-hidden">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-black uppercase mb-2 inline-block">
                01. HIFU (초음파 리프팅)
              </span>
              <h5 className="text-base font-bold text-white mb-1">울쎄라 · 슈링크 · 리프테라</h5>
              <div className="space-y-1.5 text-xs text-white/80 mt-2">
                <p>• <strong>타겟 깊이</strong>: SMAS 근막층 (4.5mm) & 피하지방층 (3.0mm)</p>
                <p>• <strong>작용 원리</strong>: 고온 열응고점으로 근막 수축 + 지방 분해</p>
                <p>• <strong>주요 효과</strong>: 처진 턱선 거상, 이중턱/심부볼 지방 감소, V라인</p>
                <p className="text-amber-300 font-semibold pt-1">💡 핵심: 무너진 안면의 기초 기둥(근막)을 다시 세우는 시술</p>
              </div>
            </div>

            {/* 2. RF */}
            <div className="p-5 rounded-2xl bg-black/50 border border-teal-400/30 shadow-lg">
              <span className="px-2.5 py-0.5 rounded-full bg-teal-400/20 text-teal-300 text-[10px] font-black uppercase mb-2 inline-block">
                02. RF (고주파 타이트닝)
              </span>
              <h5 className="text-base font-bold text-white mb-1">써마지 · 올리지오 · 인모드</h5>
              <div className="space-y-1.5 text-xs text-white/80 mt-2">
                <p>• <strong>타겟 깊이</strong>: 진피층 (1.5mm ~ 3.0mm 얕은 층)</p>
                <p>• <strong>작용 원리</strong>: 고주파 전류 저항열(40~55℃)로 콜라겐 조임</p>
                <p>• <strong>주요 효과</strong>: 피부 잔주름, 모공 축소, 늘어진 피부 탄력</p>
                <p className="text-teal-300 font-semibold pt-1">💡 차이점: HIFU가 &lsquo;윤곽 거상&rsquo;이라면 RF는 &lsquo;가죽 조임(타이트닝)&rsquo;</p>
              </div>
            </div>

            {/* 3. Thread Lifting */}
            <div className="p-5 rounded-2xl bg-black/50 border border-rose-400/30 shadow-lg">
              <span className="px-2.5 py-0.5 rounded-full bg-rose-400/20 text-rose-300 text-[10px] font-black uppercase mb-2 inline-block">
                03. 실 리프팅 / 매선 (물리적 견인)
              </span>
              <h5 className="text-base font-bold text-white mb-1">코그 매선 · PDO · PLLA 돌기사</h5>
              <div className="space-y-1.5 text-xs text-white/80 mt-2">
                <p>• <strong>타겟 깊이</strong>: 피하지방층 & 유지인대</p>
                <p>• <strong>작용 원리</strong>: 돌기사가 조직을 물리적으로 걸어 당겨 고정</p>
                <p>• <strong>주요 효과</strong>: 가장 강력한 즉각 견인, 깊은 팔자/불독살 고정</p>
                <p className="text-rose-300 font-semibold pt-1">💡 시너지: HIFU로 지방을 줄인 후 실로 잠글 때 효과 2배</p>
              </div>
            </div>

            {/* 4. Surgical Facelift */}
            <div className="p-5 rounded-2xl bg-black/50 border border-white/20 shadow-lg">
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white/70 text-[10px] font-black uppercase mb-2 inline-block">
                04. 외과적 안면거상술 (수술)
              </span>
              <h5 className="text-base font-bold text-white mb-1">안면거상 · 미니거상 (Facelift)</h5>
              <div className="space-y-1.5 text-xs text-white/80 mt-2">
                <p>• <strong>타겟 깊이</strong>: 피부 전층 및 SMAS 전면 절제</p>
                <p>• <strong>작용 원리</strong>: 귀 앞 절개 후 늘어진 피부와 근막을 잘라내어 봉합</p>
                <p>• <strong>주요 효과</strong>: 60대 이상 극심한 늘어짐의 영구적 제거</p>
                <p className="text-white/60 font-semibold pt-1">💡 차이점: 마취/흉터/긴 회복기(2~4주). 비수술 선호 환자엔 HIFU가 정답</p>
              </div>
            </div>
          </div>

          {/* Patient Dialogue Quick Tip */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-transparent border-l-4 border-amber-400">
            <p className="text-xs font-bold text-amber-300 mb-1">원장실 실전 상담 1줄 요약 공식</p>
            <p className="text-xs text-white/90 leading-relaxed">
              &ldquo;환자분, <strong>RF 고주파</strong>가 늘어난 옷 가죽을 쫀쫀하게 다려주는 시술이라면, 
              <strong>HIFU(초음파)</strong>는 무너진 옷걸이 기둥(근막)을 바르게 세우고 처진 지방을 줄여주는 근본 리프팅입니다.&rdquo;
            </p>
          </div>
        </div>
      )
    },

    // Slide 3
    {
      id: 3,
      category: "원리 및 개념",
      tag: "CORE 01: CONTRACTION",
      title: "하이푸의 3대 핵심 ① 즉각적인 수축",
      subtitle: "삼겹살을 불판에 구우면 고기가 오그라들면서 작아지죠?",
      image: "/images/lifting/image4.png",
      imageAlt: "불판 위의 삼겹살 수축 비유",
      imageCaption: "열에 의해 단백질이 수축하는 인체 원리를 환자가 가장 직관적으로 이해하는 비유",
      content: (
        <div className="space-y-4 text-left max-w-3xl mx-auto">
          <p className="text-base text-white/90 leading-relaxed">
            단백질 성분의 피부 근막(SMAS)에 60~70℃의 열응고점이 닿는 순간, 
            <strong>열 변성(Thermal Denaturation)에 의한 즉각적인 수축 반응</strong>이 발생합니다.
          </p>
          <div className="p-4 rounded-xl bg-amber-500/10 border-l-4 border-amber-400">
            <p className="text-xs font-bold text-amber-300 mb-1">환자 설명용 비유 화법</p>
            <p className="text-sm text-white/80 leading-relaxed">
              &ldquo;환자분, 삼겹살을 뜨거운 불판 위에 올리면 고기가 오그라들면서 크기가 줄어들죠? 
              우리 얼굴 속 늘어진 근막층도 마찬가지로 고온의 초음파 열을 받으면 즉각 팽팽하게 좁혀지며 라인을 올려줍니다.&rdquo;
            </p>
          </div>
        </div>
      )
    },

    // Slide 4
    {
      id: 4,
      category: "원리 및 개념",
      tag: "CORE 02: REMODELING",
      title: "하이푸의 3대 핵심 ② 콜라겐 재생과 리모델링",
      subtitle: "메마른 땅에 단비가 내려 푸른 새싹이 돋듯, 천연 콜라겐과 엘라스틴 생성",
      image: "/images/lifting/image5.png",
      imageAlt: "메마른 땅과 푸른 초원의 재생 비유",
      imageCaption: "미세 열자극을 통해 섬유아세포를 깨워 피부 속 밀도를 회복시키는 과정",
      content: (
        <div className="space-y-4 text-left max-w-3xl mx-auto">
          <p className="text-base text-white/90 leading-relaxed">
            열응고점이 형성된 부위에 인체의 자연 상처 치유 기전(Wound Healing Process)이 작동하여 
            <strong>섬유아세포를 강력히 자극</strong>합니다.
          </p>
          <div className="p-4 rounded-xl bg-emerald-500/10 border-l-4 border-emerald-400">
            <p className="text-xs font-bold text-emerald-300 mb-1">상담 핵심 멘트</p>
            <p className="text-sm text-white/80 leading-relaxed">
              &ldquo;가뭄으로 쩍쩍 갈라지고 메마른 땅을 갈아엎고 비료를 주면 푸른 잔디가 싱그럽게 돋아나듯, 
              초음파 열 자극을 받은 자리에서 인체 고유의 천연 콜라겐과 엘라스틴이 활발하게 차올라 피부 탄력과 모공이 함께 개선됩니다.&rdquo;
            </p>
          </div>
        </div>
      )
    },

    // Slide 5
    {
      id: 5,
      category: "원리 및 개념",
      tag: "CORE 03: LIPOLYSIS",
      title: "하이푸의 3대 핵심 ③ 지방 분해 및 감소",
      subtitle: "뜨거운 프라이팬 위의 버터처럼, 불필요한 지방을 녹여 턱선 윤곽 개선",
      image: "/images/lifting/image6.png",
      imageAlt: "프라이팬 위의 녹는 버터 비유",
      imageCaption: "이중턱과 심부볼 지방세포를 분해하여 날렵한 V라인 형성",
      content: (
        <div className="space-y-4 text-left max-w-3xl mx-auto">
          <p className="text-base text-white/90 leading-relaxed">
            피하지방층 깊이(4.5mm/3.0mm)에 집중된 고온 에너지가 
            <strong>두꺼운 지방세포를 안전하게 파괴 및 분해</strong>하여 림프관을 통해 배출시킵니다.
          </p>
          <div className="p-4 rounded-xl bg-teal-500/10 border-l-4 border-teal-400">
            <p className="text-xs font-bold text-teal-300 mb-1">환자 눈높이 설명</p>
            <p className="text-sm text-white/80 leading-relaxed">
              &ldquo;달궈진 프라이팬 위에서 버터가 부드럽게 녹아 사라지듯, 턱 밑에 뭉쳐서 목과 턱의 경계를 흐리던 
              이중턱과 심부볼 지방을 사르르 녹여내어 매끄러운 V라인 턱선을 완성합니다.&rdquo;
            </p>
          </div>
        </div>
      )
    },

    // Slide 6: Evidence-Based Neocollagenesis & Clinical Timeline
    {
      id: 6,
      category: "원리 및 개념",
      tag: "EVIDENCE-BASED TIMELINE",
      title: "[논문 근거] HIFU 조직 반응 타임라인 & 콜라겐 재생 곡선",
      subtitle: "시술 직후의 '일시적 수축·부종' vs 3~6개월 차의 '진정한 Type I 콜라겐 피크' & 2~4주 잠복기(Silent Phase)의 진실",
      image: "/images/lifting/collagen_timeline.jpg",
      imageAlt: "HIFU 피부 조직 반응 듀얼 커브 곡선 (일시적 수축 vs 성숙 콜라겐 합성)",
      imageCaption: "SCI급 논문 조직학 근거: 초기 부종/열수축 소실(점선) 후, 3~6개월(90~180일) 시점에 Type I 성숙 콜라겐 및 엘라스틴 신생 피크(황금 실선 90%) 도달",
      content: (
        <div className="space-y-6 text-left max-w-4xl mx-auto">
          {/* Scientific Summary Alert */}
          <div className="p-4 rounded-xl bg-amber-500/10 border-l-4 border-amber-400">
            <h4 className="text-xs font-black text-amber-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <AlertCircle size={14} />
              기존 임상 설명의 오류와 의학적 진실
            </h4>
            <p className="text-xs text-white/90 leading-relaxed">
              기존에 흔히 말하던 &lsquo;2~3개월에 완성된다&rsquo;는 설명은 절반만 맞습니다. 
              조직학적 생검(Biopsy) 연구에 따르면, <strong>진정한 Type I 성숙 콜라겐 생성과 임상적 최대 리프팅 효과는 3개월(90일)부터 본격화되어 3~6개월(180일) 사이에 정점(Peak)</strong>에 달합니다. 
              또한 시술 후 2~4주는 초기 부종이 빠지며 일시적으로 효과가 멈춘 듯 보이는 <strong>&lsquo;잠복기(The Silent Phase)&rsquo;</strong>를 반드시 거칩니다.
            </p>
          </div>

          {/* 4-Stage Clinical Cascade */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10">
              <span className="px-2 py-0.5 rounded-md bg-white/10 text-white/70 text-[10px] font-black uppercase mb-1.5 inline-block">
                Stage 1 (Day 0 ~ 1주)
              </span>
              <h5 className="text-sm font-bold text-white mb-1">열 변성 수축 & 미세 부종 (Early Contraction)</h5>
              <p className="text-xs text-white/60 leading-relaxed">
                60~70℃ 열로 콜라겐 섬유의 삼중나선이 1/3 길이로 즉각 수축하고 경미한 염증성 부종이 생겨 얼굴이 즉각 좁아 보입니다. (콜라겐 신생이 아닌 일시적 물리적 수축)
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-amber-500/30">
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase mb-1.5 inline-block">
                Stage 2 (2주 ~ 4주 차) ★컴플레인 주의
              </span>
              <h5 className="text-sm font-bold text-amber-200 mb-1">잠복기 (The Silent Phase)</h5>
              <p className="text-xs text-white/60 leading-relaxed">
                초기 부종이 가라앉으며 환자가 &lsquo;효과가 다 빠졌나?&rsquo; 착각하는 시기입니다. 
                그러나 조직 내에서는 대식세포가 괴사 잔해를 청소하고 섬유아세포 침윤과 미성숙 Type III 콜라겐 합성이 물밑에서 활발히 시작됩니다.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-emerald-500/30">
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase mb-1.5 inline-block">
                Stage 3 (3개월 ~ 6개월) ★임상 정점 (PEAK)
              </span>
              <h5 className="text-sm font-bold text-emerald-300 mb-1">성숙 콜라겐 리모델링 & 최대 거상 (Peak)</h5>
              <p className="text-xs text-white/60 leading-relaxed">
                미성숙 Type III 콜라겐이 단단하고 질긴 <strong>Type I 성숙 콜라겐으로 교체(Cross-linking)</strong>되고 대량의 엘라스틴이 합성됩니다. 
                환자가 체감하는 <strong>가장 자연스럽고 강력한 리프팅 라인이 완성되는 골든 피크 타임</strong>입니다.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-teal-500/30">
              <span className="px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 text-[10px] font-black uppercase mb-1.5 inline-block">
                Stage 4 (6개월 ~ 12개월 이상)
              </span>
              <h5 className="text-sm font-bold text-teal-200 mb-1">장기 유지기 (Sustained Remodeling)</h5>
              <p className="text-xs text-white/60 leading-relaxed">
                재건된 견고한 콜라겐 지지대가 인장 강도를 유지하며 12~18개월간 노화 지연 효과를 지속합니다. (권장 유지 주기: 6개월~1년)
              </p>
            </div>
          </div>

          {/* Peer-Reviewed Medical Citations */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
            <h5 className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
              <FileText size={14} />
              SCI급 핵심 의학 논문 레퍼런스
            </h5>
            <div className="space-y-1.5 text-[11px] text-white/70">
              <p>• <strong>Sasaki GH, Tevez A. (2012)</strong> <em>Aesthet Surg J</em>: 조직 생검 결과 시술 90일(3개월) 차에 HSP47 양성 섬유아세포 및 성숙 Type I 콜라겐/엘라스틴 합성이 정점에 달하며 임상 효과는 3~6개월에 피크를 이룸을 증명.</p>
              <p>• <strong>Alam M, et al. (2010)</strong> <em>J Am Acad Dermatol (JAAD)</em>: 초음파 안면 거상의 기전: 즉각적 열 변성 이후 90~180일에 걸친 점진적이고 지속적인 콜라겐 섬유 재배열 및 리프팅 유지 규명.</p>
              <p>• <strong>Fabi SG, et al. (2015)</strong> <em>J Drugs Dermatol (JDD)</em>: 글로벌 다학제 컨센서스: HIFU의 진정한 임상적 리프팅 결과 평가는 반드시 3개월~6개월(90~180일) 시점에 진행해야 함을 공식 권고.</p>
            </div>
          </div>

          {/* Doctor Dialogue Tip */}
          <div className="p-4 rounded-xl bg-black/50 border border-emerald-500/30">
            <p className="text-xs font-bold text-emerald-300 mb-1">원장실 실전 환자 티칭 가이드 (컴플레인 100% 차단)</p>
            <p className="text-xs text-white/80 leading-relaxed">
              &ldquo;환자분, 시술 직후 팽팽한 건 일시적인 열 수축 반응이고, <strong>2~3주 차가 되면 붓기가 빠지면서 효과가 제자리로 돌아간 것처럼 느껴지는 &lsquo;정상적인 잠복기&rsquo;</strong>가 찾아옵니다. 
              속에서 내 살의 진짜 콜라겐이 차올라 <strong>얼굴이 눈에 띄게 올라붙는 진짜 피크는 3개월부터 6개월 사이</strong>에 나타나니 안심하고 기다려주시면 됩니다.&rdquo;
            </p>
          </div>
        </div>
      )
    },

    // Slide 7
    {
      id: 7,
      category: "원리 및 개념",
      tag: "ULTRASOUND CHECK",
      title: "초음파 정밀 진단 시스템",
      subtitle: "초음파로 지방 두께를 직접 측정하여 환자가 눈으로 확인하는 객관적 진료",
      image: "/images/lifting/image7.png",
      imageAlt: "필립스 초음파 지방 두께 측정 화면",
      imageCaption: "실제 임상 초음파 스캔: 피하지방층 두께 0.826cm 확인 및 시각화",
      content: (
        <div className="space-y-4 text-left max-w-3xl mx-auto">
          <p className="text-base text-white/90 leading-relaxed">
            원장실에서 눈대중으로 진단하는 것이 아니라, <strong>초음파 진단기를 통해 환자가 고민하는 부위의 지방층 두께를 직접 계측</strong>합니다.
          </p>
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
            <h5 className="text-xs font-black text-amber-400 uppercase tracking-wider">신뢰도 200% 상승 상담 포인트</h5>
            <p className="text-xs text-white/80 leading-relaxed">
              &ldquo;환자분, 여기 화면 보시면 턱 밑 피하지방 두께가 0.826cm로 측정됩니다. 
              피부 늘어짐뿐만 아니라 지방층의 무게가 아래로 쏠려 불독살을 만드는 원인이므로, 
              이 지방층을 타겟팅하여 두께를 줄여주면 확실한 라인이 살아납니다.&rdquo;
            </p>
          </div>
        </div>
      )
    },

    // Slide 8: Program & Pricing (Old Slide 8 video removed!)
    {
      id: 8,
      category: "세일즈 & 상담",
      tag: "PROGRAM & PRICING",
      title: "프로그램 구성 & 가격 정책",
      subtitle: "기본 3회 패키지 설계 및 한의원 침치료 병행으로 가치 극대화",
      content: (
        <div className="space-y-6 text-left max-w-3xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
              <span className="text-xs font-bold text-amber-400 uppercase block mb-1">회당 단가</span>
              <h4 className="text-2xl font-black text-white mb-2">20 ~ 30만 원</h4>
              <p className="text-xs text-white/60 leading-relaxed">
                이벤트 및 원내 프로모션 시즌에 따라 유동적으로 단가를 설정합니다.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
              <span className="text-xs font-bold text-emerald-400 uppercase block mb-1">기본 추천 패키지</span>
              <h4 className="text-2xl font-black text-white mb-2">3회 기본 패키지</h4>
              <p className="text-xs text-white/60 leading-relaxed">
                원가 60만 원 이상에서 패키지 할인가를 적용하여 3회 정기 관리를 유도합니다.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-black/40 border border-white/10 space-y-3">
            <h5 className="text-sm font-black text-white flex items-center gap-2">
              <Sparkles size={16} className="text-amber-400" />
              시술 프로토콜 핵심 원칙
            </h5>
            <ul className="text-xs text-white/80 space-y-2 leading-relaxed">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                <span><strong>침치료 반드시 병행</strong>: 안면 및 두경부 경혈 자침을 병행하여 혈류 순환과 리프팅 유지력을 극대화.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                <span><strong>주걱턱/이중턱 2분 서비스</strong>: 본 시술 외 2분간 보너스 조사를 더해 감동 만족감 선사.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                <span><strong>표준 조사 시간</strong>: 좌우 각각 5분씩, 총 안면 10~12분 집중 샷 조사.</span>
              </li>
            </ul>
          </div>
        </div>
      )
    },

    // Slide 9: Ticket Strategy
    {
      id: 9,
      category: "세일즈 & 상담",
      tag: "TICKET STRATEGY",
      title: "원내 티켓팅 노하우 5계명",
      subtitle: "전 직원이 한마음으로 움직이는 시스템 구축",
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-left max-w-4xl mx-auto">
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
            <span className="w-7 h-7 rounded-xl bg-amber-400/20 text-amber-300 text-xs font-black flex items-center justify-center mb-3">1</span>
            <h5 className="text-sm font-bold text-white mb-1">직원 교육 및 장점 숙지</h5>
            <p className="text-xs text-white/60 leading-relaxed">직원이 리프팅 원리를 믿어야 환자에게 확신을 전달할 수 있습니다.</p>
          </div>
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
            <span className="w-7 h-7 rounded-xl bg-amber-400/20 text-amber-300 text-xs font-black flex items-center justify-center mb-3">2</span>
            <h5 className="text-sm font-bold text-white mb-1">직원 무료 시술 체험</h5>
            <p className="text-xs text-white/60 leading-relaxed">접수실/치료실 직원이 직접 받아보고 감탄할 때 자연스러운 구전이 일어납니다.</p>
          </div>
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
            <span className="w-7 h-7 rounded-xl bg-amber-400/20 text-amber-300 text-xs font-black flex items-center justify-center mb-3">3</span>
            <h5 className="text-sm font-bold text-white mb-1">전후 사진 촬영 & 홍보</h5>
            <p className="text-xs text-white/60 leading-relaxed">직원의 비포/애프터 사진을 데스크 상담 태블릿과 안내물에 적극 활용합니다.</p>
          </div>
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
            <span className="w-7 h-7 rounded-xl bg-emerald-400/20 text-emerald-300 text-xs font-black flex items-center justify-center mb-3">4</span>
            <h5 className="text-sm font-bold text-white mb-1">원장님 직접 시술</h5>
            <p className="text-xs text-white/60 leading-relaxed">원장 얼굴의 탄력이 최고의 명함입니다. 원장님 본인도 주기적으로 시술받으세요.</p>
          </div>
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
            <span className="w-7 h-7 rounded-xl bg-emerald-400/20 text-emerald-300 text-xs font-black flex items-center justify-center mb-3">5</span>
            <h5 className="text-sm font-bold text-white mb-1">원내 배너 올-인 전시</h5>
            <p className="text-xs text-white/60 leading-relaxed">대기실, 진료실, 치료베드 천장 등 환자의 시선이 머무는 모든 곳에 배너와 포스터를 전시합니다.</p>
          </div>
        </div>
      )
    },

    // Slide 10: Script 1
    {
      id: 10,
      category: "세일즈 & 상담",
      tag: "SCRIPT 01: PAIN PATIENT",
      title: "타겟별 상담 멘트 ① 통증 환자 (불독살 여성)",
      subtitle: "통증 부위 초음파 설명 후 자연스럽게 볼살 처짐으로 유도",
      content: (
        <div className="space-y-6 text-left max-w-3xl mx-auto">
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
            <p className="text-xs font-bold text-rose-400 uppercase mb-1">타겟 프로필</p>
            <p className="text-sm font-bold text-white">어깨/허리 통증으로 내원했으나 볼살과 턱선이 처져 있는 중년 여성</p>
          </div>
          <div className="p-6 rounded-2xl bg-gradient-to-br from-black/80 to-[#042116] border border-emerald-500/30 shadow-xl space-y-3">
            <span className="text-xs font-black text-amber-400 uppercase tracking-widest block">실전 대화 스크립트</span>
            <blockquote className="text-base text-emerald-100 leading-relaxed italic">
              &ldquo;(통증 부위 초음파 보여주며 상태 설명 후)...<br/><br/>
              &lsquo;근데 환자분, 요즘 많이 피곤하신가 봐요? <strong>볼살이 추욱 내려앉았네요.</strong><br/>
              이러면 화장도 잘 안 먹고, 팔자주름도 깊어져서 훨씬 나이 들어 보이는데... 
              거울 보실 때마다 <strong>나이 먹는 거 같아서 속상하지 않으세요?</strong>&rsquo;&rdquo;
            </blockquote>
          </div>
          <p className="text-xs text-white/50 leading-relaxed">
            💡 <strong>상담 핵심</strong>: 통증 진료로 쌓인 신뢰 관계 속에서 환자의 깊은 콤플렉스를 자연스럽게 터치하여 방어벽 없이 리프팅 상담으로 전환합니다.
          </p>
        </div>
      )
    },

    // Slide 11: Script 2
    {
      id: 11,
      category: "세일즈 & 상담",
      tag: "SCRIPT 02: ASYMMETRY",
      title: "타겟별 상담 멘트 ② 안면 비대칭 (턱관절 여성)",
      subtitle: "턱 비대칭의 스트레스 기억을 상기시키고 양측 밸런싱 비전 제시",
      content: (
        <div className="space-y-6 text-left max-w-3xl mx-auto">
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
            <p className="text-xs font-bold text-amber-400 uppercase mb-1">타겟 프로필</p>
            <p className="text-sm font-bold text-white">턱관절 장애, 목 통증 및 좌우 턱선 비대칭이 눈에 띄는 환자</p>
          </div>
          <div className="p-6 rounded-2xl bg-gradient-to-br from-black/80 to-[#042116] border border-emerald-500/30 shadow-xl space-y-3">
            <span className="text-xs font-black text-amber-400 uppercase tracking-widest block">실전 대화 스크립트</span>
            <blockquote className="text-base text-emerald-100 leading-relaxed italic">
              &ldquo;&lsquo;환자분, <strong>턱 비대칭이 꽤 심한 편이신 것 같습니다.</strong> 혹시 평소에 알고 계셨나요? 
              사진 찍으실 때 스트레스받지 않으셨어요?&rsquo;<br/><br/>
              (환자가 불편했던 기억을 떠올리며 수긍할 때)...<br/><br/>
              &lsquo;<strong>어느 쪽 얼굴이 더 예뻐 보이세요?</strong> 네, 오른쪽이 훨씬 예쁘시네요. 
              처진 왼쪽 턱선을 하이푸로 집중해서 끌어올려 주면, <strong>양쪽 다 예쁘게 턱선이 잡히면서</strong> 얼굴이 훨씬 작아 보이실 겁니다.&rsquo;&rdquo;
            </blockquote>
          </div>
          <p className="text-xs text-white/50 leading-relaxed">
            💡 <strong>상담 핵심</strong>: 더 예쁜 쪽을 기준으로 맞추겠다는 긍정적인 솔루션을 제시하여 환자의 거부감을 기대감으로 전환합니다.
          </p>
        </div>
      )
    },

    // Slide 12: Script 3
    {
      id: 12,
      category: "세일즈 & 상담",
      tag: "SCRIPT 03: DIET",
      title: "타겟별 상담 멘트 ③ 다이어트 환자",
      subtitle: "체중 감량 시 발생하는 얼굴 처짐 방지 및 V라인 시너지",
      content: (
        <div className="space-y-6 text-left max-w-3xl mx-auto">
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
            <p className="text-xs font-bold text-teal-400 uppercase mb-1">타겟 프로필</p>
            <p className="text-sm font-bold text-white">한방 다이어트/감량 프로그램 진행 중인 환자 (특별 이벤트 제안)</p>
          </div>
          <div className="p-6 rounded-2xl bg-gradient-to-br from-black/80 to-[#042116] border border-emerald-500/30 shadow-xl space-y-3">
            <span className="text-xs font-black text-amber-400 uppercase tracking-widest block">실전 대화 스크립트</span>
            <blockquote className="text-base text-emerald-100 leading-relaxed italic">
              &ldquo;&lsquo;지금 다이어트하시면서 체중이 너무 잘 빠지고 계신데요, 
              <strong>이럴 때 얼굴 리프팅을 꼭 같이하시는 걸 추천해 드립니다.</strong><br/><br/>
              환자분이 원래 얼굴뼈가 작으신 편이라 피하지방이 턱선에 많이 뭉쳐 있거든요. 
              (초음파 화면으로 두께 즉시 확인)...<br/><br/>
              리프팅으로 V라인을 확실히 잡아주면 얼굴이 확 작아져서, 
              <strong>남들이 볼 때 살이 2배는 더 많이 빠진 것처럼 느껴집니다.</strong>&rsquo;&rdquo;
            </blockquote>
          </div>
          <p className="text-xs text-white/50 leading-relaxed">
            💡 <strong>상담 핵심</strong>: 감량 노력의 시각적 보상을 '작은 얼굴 V라인'으로 2배 체감할 수 있도록 동기부여합니다.
          </p>
        </div>
      )
    },

    // Slide 13: Script 4
    {
      id: 13,
      category: "세일즈 & 상담",
      tag: "SCRIPT 04: AESTHETIC",
      title: "타겟별 상담 멘트 ④ 성형/피부관리 환자",
      subtitle: "피부 칭찬으로 방어막을 허문 후 턱선 두께에 대한 부드러운 개입",
      content: (
        <div className="space-y-6 text-left max-w-3xl mx-auto">
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
            <p className="text-xs font-bold text-rose-400 uppercase mb-1">타겟 프로필</p>
            <p className="text-sm font-bold text-white">성형 수술 이력이 있거나 미용/피부 관리에 고관여인 여성 환자</p>
          </div>
          <div className="p-6 rounded-2xl bg-gradient-to-br from-black/80 to-[#042116] border border-emerald-500/30 shadow-xl space-y-3">
            <span className="text-xs font-black text-amber-400 uppercase tracking-widest block">실전 대화 스크립트</span>
            <blockquote className="text-base text-emerald-100 leading-relaxed italic">
              &ldquo;&lsquo;환자분, 평소에 피부 관리 정말 열심히 하시나 봐요? <strong>피부가 너무 좋아 보이세요!</strong><br/><br/>
              그런데... 다른 곳은 다 좋으신데 <strong>여기 턱선이 살짝 두꺼워지고 있네요.</strong><br/>
              피부 탄력이 좋아도 턱선에 무게감이 실리면 인상이 무거워 보이거든요. 
              하이푸로 턱선만 가볍게 정돈해 주시면 지금보다 훨씬 세련된 인상이 되실 겁니다.&rsquo;&rdquo;
            </blockquote>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-white/70">
            📌 <strong>원내 액션</strong>: 직원에게 지시하여 배너를 온 한의원에 전시하고, 시즌별 타겟 문자 홍보를 병행합니다.
          </div>
        </div>
      )
    },

    // Slide 14: Safety 1 (Golden Rule)
    {
      id: 14,
      category: "임상 안전 SOP",
      tag: "SAFETY 01: HISTORY",
      title: "[시술 전] 특이 병력 및 과거 수술 이력 진단",
      subtitle: "초음파 전달 경로와 열 흡수율 변화로 인한 화상 및 신경 손상 완벽 예방",
      content: (
        <div className="space-y-4 text-left max-w-4xl mx-auto">
          <p className="text-sm text-white/80 leading-relaxed">
            과거 수술 이력은 초음파 반사열로 인한 예상치 못한 화상 위험을 유발합니다. 반드시 아래 <strong>골든 룰(Golden Rule)</strong>을 확인하십시오.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-xs text-white/80">
              <thead className="bg-black/60 text-amber-400 font-bold uppercase border-b border-white/10">
                <tr>
                  <th className="p-3 text-left">과거 이력</th>
                  <th className="p-3 text-left">발생 가능한 리스크</th>
                  <th className="p-3 text-left">임상 대처 및 안전 수칙 (Golden Rule)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 bg-white/[0.01]">
                <tr>
                  <td className="p-3 font-bold text-rose-300 whitespace-nowrap">실리콘 보형물<br/>(턱 끝, 이마, 코)</td>
                  <td className="p-3 text-white/70">뼈막 위 실리콘 표면에 닿으면 100% 반사되어 표피 화상 및 물집 유발</td>
                  <td className="p-3 text-amber-300 font-semibold">[절대 금기] 보형물 직상부는 절대로 조사 금지. 주변부(경계선)까지만 회피 시술.</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-rose-300 whitespace-nowrap">안면 윤곽 수술<br/>(양악, 뼈 절제)</td>
                  <td className="p-3 text-white/70">뼈 절제로 간격이 좁아져 반사열 화상 위험 및 신경 위치 얕아짐</td>
                  <td className="p-3 text-emerald-300 font-semibold">초음파 영상으로 뼈 깊이 확인 필수. 3.0mm 등 얕은 팁 교체 및 출력 감소.</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-amber-200 whitespace-nowrap">지방 흡입 / 이식</td>
                  <td className="p-3 text-white/70">유착으로 불규칙 열전달 및 고열로 인한 볼 패임(Dimpling) 위험</td>
                  <td className="p-3 text-white/90">지방 이식 부위(앞볼/이마) 최소 3개월 회피. 볼 패임 부위는 Vector 고정점으로만 활용.</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-teal-300 whitespace-nowrap">필러 / 보톡스</td>
                  <td className="p-3 text-white/70">보톡스 직후 열 가할 시 타 근육 마비, 필러 주입 부위 고열 시 열분해 가속</td>
                  <td className="p-3 text-white/90">HIFU 선행 → 보톡스/필러 후행 원칙. 보톡스/필러 후 HIFU 시 최소 1~2주 간격 유지.</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-teal-300 whitespace-nowrap">실 리프팅<br/>(PDO/PLLA)</td>
                  <td className="p-3 text-white/70">녹는 실에 고열이 직접 가해지면 실의 변형 및 끊어짐으로 효과 반감</td>
                  <td className="p-3 text-white/90">같은 날 시술 시 HIFU 먼저 시행 후 실 삽입. 이미 실이 있는 경우 최소 1개월 후 시술.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )
    },

    // Slide 15: Safety 2 (Danger Zone) with custom face map
    {
      id: 15,
      category: "임상 안전 SOP",
      tag: "SAFETY 02: DANGER ZONE",
      title: "[시술 직전] Danger Zone 마킹 & 회피 지침",
      subtitle: "흰색 피부 마킹 펜으로 절대 금기 구역과 신경 주의 구역을 사전 표시",
      image: "/images/lifting/danger_zones.jpg",
      imageAlt: "안면 위험 구역 및 신경 주행 경로 해부학 가이드",
      imageCaption: "빨간색 빗금: 절대 금기 구역 (미간, 눈가 안와, 입술 1cm, 목 중앙) / 황금 점선: 신경 주의 구역 (관자놀이, 턱선 하단)",
      content: (
        <div className="space-y-4 text-left max-w-4xl mx-auto">
          <div className="p-3.5 rounded-xl bg-rose-500/10 border-l-4 border-rose-500 text-xs text-white/80">
            ⚠️ <strong>마킹 필수 규칙</strong>: 마킹 선 안쪽으로는 핸드피스 팁이 침범하지 않도록 조사 동선을 엄격히 제한해야 합니다. 턱선 뼈 부위는 핸드피스로 과도하게 눌러 압박하지 마세요.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-black/40 border border-rose-500/30">
              <span className="text-xs font-black text-rose-400 uppercase tracking-widest block mb-2">
                🚫 절대 금기 구역 [X 표시 & 빗금 마킹]
              </span>
              <ul className="text-xs text-white/80 space-y-2.5 leading-relaxed">
                <li>• <strong>미간 및 이마 중앙</strong>: 신경 밀집 및 얇은 피부층으로 심한 두통 및 신경 자극 유발.</li>
                <li>• <strong>눈가 안쪽 (안구 상단)</strong>: 초음파의 안구 직접 조사를 막기 위해 안와 뼈 경계 안쪽은 절대 금지.</li>
                <li>• <strong>입술 주변 및 인중</strong>: 입술 끝에서 최소 1cm 이상 여유를 두고 라인을 그려 회피.</li>
                <li>• <strong>목 중앙 (갑상선 부위)</strong>: 목젖 및 갑상선 위치 수직 중앙 라인은 절대로 조사 금지.</li>
              </ul>
            </div>

            <div className="p-5 rounded-2xl bg-black/40 border border-amber-500/30">
              <span className="text-xs font-black text-amber-400 uppercase tracking-widest block mb-2">
                ⚠️ 안면 신경 주의 구역 [출력 감소 & 압박 금지]
              </span>
              <ul className="text-xs text-white/80 space-y-3 leading-relaxed">
                <li>
                  <strong className="text-amber-300 block">• 관자놀이 (Temporal branch)</strong>
                  신경 주행이 매우 얕아 강한 타격 시 눈썹 움직임 일시적 마비 위험. 에너지 감쇄 필수.
                </li>
                <li>
                  <strong className="text-amber-300 block">• 턱 라인 하단 (Marginal mandibular branch)</strong>
                  턱선 아래 뼈를 강하게 눌러 쏘면 입술 비대칭 마비 발생 가능. 뼈를 압박하지 않고 띄워 조사.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )
    },

    // Slide 16: Safety 3 (Burn Prevention) with custom coupling illustration
    {
      id: 16,
      category: "임상 안전 SOP",
      tag: "SAFETY 03: BURN PREVENTION",
      title: "[시술 중] 표피 화상(Welts) 예방 3대 수칙",
      subtitle: "핸드피스 조작 숙련도 부족으로 발생하는 줄 모양 붉은 자국 원천 차단",
      image: "/images/lifting/coupling_technique.jpg",
      imageAlt: "핸드피스 90도 수직 밀착 vs 에어갭 접촉 불량 비교",
      imageCaption: "좌측(정상): 90도 수직 밀착으로 심부 집속 / 우측(위험): 비스듬한 접촉 및 공기층(Air Gap)으로 표피 반사열 화상 유발",
      content: (
        <div className="space-y-4 text-left max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-emerald-500/40 transition-colors">
              <span className="px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase mb-2 inline-block">
                수칙 1
              </span>
              <h4 className="text-base font-bold text-white mb-1.5">완벽 밀착 (Coupling)</h4>
              <p className="text-xs text-white/70 leading-relaxed">
                카트리지 팁과 피부 사이 공기층이 생기면 초음파가 표피에 집중되어 화상이 발생합니다. 
                <strong>초음파 젤을 충분히 바르고, 핸드피스를 피부 면에 &lsquo;수직으로 완벽히 밀착&rsquo;</strong>시켜 시술하세요.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-500/40 transition-colors">
              <span className="px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase mb-2 inline-block">
                수칙 2
              </span>
              <h4 className="text-base font-bold text-white mb-1.5">샷 발사 중 이동 금지</h4>
              <p className="text-xs text-white/70 leading-relaxed">
                에너지가 나오는 동안 핸드피스를 움직이면 표피 라인을 따라 줄 모양 화상을 입습니다. 
                <strong>반드시 한 샷이 완전히 완료된 후</strong> 다음 위치로 이동해야 합니다.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-teal-500/40 transition-colors">
              <span className="px-2.5 py-1 rounded-md bg-teal-500/20 text-teal-300 text-[10px] font-black uppercase mb-2 inline-block">
                수칙 3
              </span>
              <h4 className="text-base font-bold text-white mb-1.5">지나친 중첩 금지</h4>
              <p className="text-xs text-white/70 leading-relaxed">
                동일한 위치에 연속 조사 시 과도한 열 축적으로 손상이 생깁니다. 
                <strong>일정한 간격(Spacing)을 유지</strong>하며 에너지를 균일하게 분산시키세요.
              </p>
            </div>
          </div>
        </div>
      )
    },

    // Slide 17: Post Care Table
    {
      id: 17,
      category: "임상 안전 SOP",
      tag: "SAFETY 04: POST CARE",
      title: "[시술 후] 정상 반응 vs 이상 부작용 응급 대처",
      subtitle: "정상 회복 과정 안내 및 화상 발생 시 골든타임 집중 조치",
      content: (
        <div className="space-y-4 text-left max-w-4xl mx-auto">
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-xs text-white/80">
              <thead className="bg-black/60 text-amber-400 font-bold uppercase border-b border-white/10">
                <tr>
                  <th className="p-3 text-left">구분</th>
                  <th className="p-3 text-left">증상 및 임상 경과</th>
                  <th className="p-3 text-left">원장 조치 및 관리 가이드</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 bg-white/[0.01]">
                <tr>
                  <td className="p-3 font-bold text-emerald-400 whitespace-nowrap">붉음증 (Erythema)<br/><span className="text-[10px] text-white/40">[정상 반응]</span></td>
                  <td className="p-3 text-white/70">시술 직후 대부분 발생하며 피부가 가볍게 붉어짐.</td>
                  <td className="p-3 text-white/90">보통 1~2시간 내 자연 소실. 진정 팩 및 쿨링 관리 시행.</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-amber-300 whitespace-nowrap">부종 및 통증<br/><span className="text-[10px] text-white/40">[정상 반응]</span></td>
                  <td className="p-3 text-white/70">피부가 두꺼운 경우 익일 부종 심해질 수 있음. 1~2주간 뻐근함.</td>
                  <td className="p-3 text-white/90">정상 회복 과정임을 사전 안내. 필요시 가벼운 진정 케어.</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-rose-400 whitespace-nowrap">줄 모양 화상 자국<br/><span className="text-[10px] text-rose-300">[이상 부작용]</span></td>
                  <td className="p-3 text-white/70">표피 접촉 불량이나 중첩 조사로 인해 붉은 띠 모양 부풀어 오름.</td>
                  <td className="p-3 text-rose-200 font-semibold">발생 즉시 얼음찜질(Cooling)로 열감 식힘. 재생 연고 처방 및 흉터 방지 집중 관리.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )
    },

    // Slide 18: Final Checklist
    {
      id: 18,
      category: "임상 안전 SOP",
      tag: "FINAL CHECKLIST",
      title: "[최종 점검] HIFU 안전 시술 1분 체크리스트",
      subtitle: "매 시술 들어가기 직전, 아래 6가지 항목을 최종 점검하십시오",
      content: (
        <div className="space-y-4 text-left max-w-3xl mx-auto">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span className="text-xs font-bold text-white/60">
              확인된 항목: <span className="text-amber-400 font-black">{Object.values(checkedItems).filter(Boolean).length}</span> / 6
            </span>
            <button
              onClick={resetChecklist}
              className="flex items-center gap-1 text-xs text-white/40 hover:text-white transition-colors"
            >
              <RotateCcw size={12} />
              <span>초기화</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {[
              { id: 1, title: "1. 병력 확인", desc: "실리콘 보형물, 윤곽 수술, 최근 필러/보톡스/실리프팅 여부를 확인했는가?" },
              { id: 2, title: "2. 팁 선택", desc: "지방 두께 및 수술 이력에 맞춰 적절한 깊이(4.5mm / 3.0mm / 1.5mm) 카트리지를 선택했는가?" },
              { id: 3, title: "3. Danger Zone", desc: "흰색 마킹 펜으로 절대 금기 구역(미간, 눈가 안쪽, 입술 1cm, 목 중앙)을 표기했는가?" },
              { id: 4, title: "4. 젤 도포", desc: "공기층이 남지 않도록 초음파 젤을 충분하고 균일하게 바르고 수직 밀착했는가?" },
              { id: 5, title: "5. 조사 테크닉", desc: "샷 발사 중 핸드피스를 움직이지 않고, 과도한 오버랩 없이 Spacing을 유지하는가?" },
              { id: 6, title: "6. 비대칭 배분", desc: "환자의 처짐 정도를 확인하고 더 처진 쪽에 60% 샷을 배분하여 디자인했는가?" }
            ].map(item => {
              const isChecked = !!checkedItems[item.id];
              return (
                <div
                  key={item.id}
                  onClick={() => toggleCheck(item.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-4 ${
                    isChecked
                      ? "bg-emerald-950/40 border-emerald-500/50 shadow-md shadow-emerald-950/40"
                      : "bg-white/[0.02] border-white/5 hover:border-white/20"
                  }`}
                >
                  <div>
                    <h5 className={`text-xs font-bold ${isChecked ? "text-emerald-300" : "text-white"}`}>
                      {item.title}
                    </h5>
                    <p className="text-[11px] text-white/60 leading-relaxed mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                  <div className="shrink-0 text-white/60">
                    {isChecked ? (
                      <CheckCircle2 size={20} className="text-emerald-400" />
                    ) : (
                      <Square size={20} className="text-white/30" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {Object.values(checkedItems).filter(Boolean).length === 6 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 rounded-xl bg-gradient-to-r from-emerald-600/30 to-teal-600/30 border border-emerald-400 text-center"
            >
              <p className="text-xs font-black text-emerald-300">
                🎉 모든 안전 점검이 완료되었습니다. 안전하게 시술을 시작하십시오!
              </p>
            </motion.div>
          )}
        </div>
      )
    }
  ];

  const currentSlide = slides[currentIndex] || slides[0];

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < slides.length - 1 ? prev + 1 : prev));
  }, [slides.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === " ") {
      handleNext();
    } else if (e.key === "ArrowLeft") {
      handlePrev();
    } else if (e.key === "Escape" && isFullscreen) {
      setIsFullscreen(false);
    }
  }, [handleNext, handlePrev, isFullscreen]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const toggleFullscreen = () => {
    if (!slideContainerRef.current) return;
    if (!document.fullscreenElement) {
      if (slideContainerRef.current.requestFullscreen) {
        slideContainerRef.current.requestFullscreen().catch(() => {
          toast.error("전체 화면을 지원하지 않는 브라우저입니다.");
        });
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  // 권한 미달 시 잠금 화면 렌더링
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
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#031C13] text-white">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-20">
          
          {/* Header Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <Link 
                href="/lifting" 
                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors"
              >
                <ArrowLeft size={18} />
              </Link>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                    <Presentation size={11} className="text-amber-400" />
                    Interactive Slide Deck
                  </span>
                  <span className="text-xs text-white/40 font-semibold">
                    총 {slides.length}개 슬라이드
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                    바른컨설팅 & 바른리프팅 승인
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-white">
                  바른 리프팅 <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-emerald-300">시스템 슬라이드</span>
                </h1>
              </div>
            </div>

            {/* Category Selector */}
            <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-xl border border-white/10 text-xs overflow-x-auto">
              {["ALL", "원리 및 개념", "세일즈 & 상담", "임상 안전 SOP"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
                    selectedCategory === cat
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/50"
                      : "text-white/50 hover:text-white"
                  }`}
                >
                  {cat === "ALL" ? "전체 보기" : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Main Slide Card Container */}
          <div 
            ref={slideContainerRef}
            className="relative rounded-3xl bg-gradient-to-br from-black/80 via-[#041F15] to-black border border-emerald-500/20 shadow-2xl overflow-hidden backdrop-blur-md min-h-[580px] flex flex-col justify-between"
          >
            {/* Slide Top Bar */}
            <div className="p-6 md:p-8 flex items-center justify-between border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-300 text-xs font-black">
                  Slide {String(currentIndex + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
                </span>
                <span className="text-xs font-bold text-emerald-400 hidden sm:inline">
                  [{currentSlide.category}]
                </span>
                <span className="text-[11px] font-semibold text-white/40 uppercase hidden md:inline">
                  {currentSlide.tag}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={toggleFullscreen}
                  className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-white border border-white/10 flex items-center justify-center transition-colors"
                  title="전체 화면"
                >
                  {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                </button>
              </div>
            </div>

            {/* Slide Body */}
            <div className="p-6 md:p-12 flex-1 flex flex-col items-center justify-center text-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="w-full max-w-4xl flex flex-col items-center"
                >
                  {/* Slide Title Header */}
                  <h2 className="text-2xl md:text-4xl font-black text-white mb-2 leading-tight">
                    {currentSlide.title}
                  </h2>
                  <h3 className="text-sm md:text-lg font-bold text-amber-300/90 mb-8 max-w-3xl">
                    {currentSlide.subtitle}
                  </h3>

                  {/* Optional Slide Image */}
                  {currentSlide.image && (
                    <div className="mb-8 flex flex-col items-center w-full">
                      <div className="relative w-full max-w-xl h-56 md:h-72 rounded-2xl overflow-hidden border-2 border-emerald-500/30 shadow-2xl bg-black">
                        <Image
                          src={currentSlide.image}
                          alt={currentSlide.imageAlt || currentSlide.title}
                          fill
                          className="object-contain md:object-cover"
                        />
                      </div>
                      {currentSlide.imageCaption && (
                        <p className="text-[11px] text-white/60 mt-2.5 font-medium max-w-lg leading-relaxed">
                          📌 {currentSlide.imageCaption}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Slide Main Content */}
                  <div className="w-full">
                    {currentSlide.content}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Slide Navigation Buttons */}
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className={`absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full border flex items-center justify-center transition-all z-10 ${
                currentIndex === 0
                  ? "opacity-20 cursor-not-allowed border-white/5 bg-black/20 text-white/30"
                  : "bg-black/60 hover:bg-emerald-600 border-white/10 hover:border-emerald-400 text-white shadow-xl hover:scale-110 active:scale-95"
              }`}
              title="이전 슬라이드 (← 키)"
            >
              <ChevronLeft size={24} />
            </button>

            <button
              onClick={handleNext}
              disabled={currentIndex === slides.length - 1}
              className={`absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full border flex items-center justify-center transition-all z-10 ${
                currentIndex === slides.length - 1
                  ? "opacity-20 cursor-not-allowed border-white/5 bg-black/20 text-white/30"
                  : "bg-black/60 hover:bg-emerald-600 border-white/10 hover:border-emerald-400 text-white shadow-xl hover:scale-110 active:scale-95"
              }`}
              title="다음 슬라이드 (→ 키 또는 스페이스)"
            >
              <ChevronRight size={24} />
            </button>

            {/* Slide Bottom Bar with Dots & Buttons */}
            <div className="p-4 md:p-6 border-t border-white/10 bg-white/[0.01] flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-1.5 flex-wrap justify-center max-w-xl">
                {slides.map((s, idx) => (
                  <button
                    key={s.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`transition-all duration-200 rounded-full ${
                      currentIndex === idx
                        ? "w-8 h-2.5 bg-gradient-to-r from-amber-400 to-emerald-400"
                        : "w-2.5 h-2.5 bg-white/20 hover:bg-white/40"
                    }`}
                    title={`Slide ${idx + 1}: ${s.title}`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/15 text-xs font-bold disabled:opacity-30 transition-all border border-white/10"
                >
                  이전
                </button>
                <button
                  onClick={handleNext}
                  disabled={currentIndex === slides.length - 1}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold disabled:opacity-30 transition-all shadow-lg shadow-emerald-950/40"
                >
                  다음
                </button>
              </div>
            </div>
          </div>

          {/* Slide Outline Drawer / Quick Jump Grid */}
          <div className="mt-12 p-8 rounded-3xl bg-black/40 border border-white/10">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Layers size={18} className="text-amber-400" />
              슬라이드 전체 바로가기 목차 (총 18개)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {slides.map((s, idx) => {
                const isCurrent = currentIndex === idx;
                return (
                  <button
                    key={s.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`text-left p-3.5 rounded-xl border text-xs transition-all ${
                      isCurrent
                        ? "bg-emerald-950/60 border-emerald-400 text-white font-bold shadow-md shadow-emerald-950/50"
                        : "bg-white/[0.02] border-white/5 text-white/60 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-black ${isCurrent ? "text-amber-400" : "text-white/40"}`}>
                        #{String(idx + 1).padStart(2, '0')} {s.category}
                      </span>
                    </div>
                    <p className="truncate font-semibold">{s.title}</p>
                  </button>
                );
              })}
            </div>
          </div>

        </main>
      </div>
    </DashboardLayout>
  );
}
