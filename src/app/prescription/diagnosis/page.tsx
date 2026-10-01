"use client";

import React, { useState, useMemo, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import { 
  SYMPTOM_DATA, 
  DIAGNOSIS_INFO, 
  DiagnosisType, 
  SymptomItem 
} from "@/lib/prescription/surveyData";
import { 
  Sparkles, 
  Camera, 
  Upload, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  ShieldCheck, 
  Flame, 
  Layers, 
  Copy, 
  Printer, 
  FileText, 
  X, 
  Check, 
  TrendingUp, 
  ChevronRight,
  Info,
  Pill,
  Lock
} from "lucide-react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";

export default function HanYeolHeoSilDiagnosisPage() {
  const { data: session, status } = useSession();
  
  // Permission verification
  const userStatus = (session?.user as any)?.approvalStatus || 'pending';
  const approvedCategories = (session?.user as any)?.approvedCategories || [];
  const userCategory = (session?.user as any)?.approvedCategory || '';
  const masterEmail = process.env.NEXT_PUBLIC_MASTER_EMAIL || "wei0508@naver.com";
  const isMaster = session?.user?.email?.toLowerCase() === masterEmail.toLowerCase();
  
  const isPrescriptionApproved = isMaster || (userStatus === 'approved' && (
    approvedCategories.includes('prescription') || 
    approvedCategories.includes('consulting') || 
    approvedCategories.includes('바른처방법') || 
    approvedCategories.includes('바른컨설팅') ||
    userCategory === 'prescription' || 
    userCategory === 'consulting' ||
    userCategory === '바른처방법' || 
    userCategory === '바른컨설팅'
  ));

  // Checked state: Key is `${symptomId}_${type}` where type is "한" | "열" | "허" | "실"
  const [checkedCells, setCheckedCells] = useState<Set<string>>(new Set());

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState<{ id: string; dataUrl: string; name: string }[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Toggle single cell
  const toggleCell = (id: string, type: DiagnosisType) => {
    const key = `${id}_${type}`;
    setCheckedCells(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Reset all checks
  const handleReset = () => {
    if (checkedCells.size === 0) return;
    if (window.confirm("선택된 모든 증상 체크를 초기화하시겠습니까?")) {
      setCheckedCells(new Set());
      toast.success("체크리스트가 초기화되었습니다.");
    }
  };

  // Preset sample cases for quick demonstration
  const loadPreset = (presetType: "cold_deficiency" | "heat_excess") => {
    const next = new Set<string>();
    if (presetType === "cold_deficiency") {
      // 비위허한(脾胃虛寒)형 샘플
      ["digestion_한", "digestion_허", "appetite_한", "sleep_한", "sleep_허", "urination_한", "defecation_한", "temperature_한", "temperature_허", "circulation_한", "fatigue_허", "thirst_한", "joints_한"].forEach(k => next.add(k));
      toast.success("비위허한(脾胃虛寒) 임상 증상 샘플이 반영되었습니다.");
    } else {
      // 간담습열/심화항성(肝膽濕熱/心火亢盛)형 실열 샘플
      ["digestion_열", "digestion_실", "appetite_열", "appetite_실", "sleep_열", "sleep_실", "urination_열", "defecation_열", "sweat_열", "sweat_실", "pain_열", "temperature_열", "temperature_실", "psychology_열", "psychology_실", "headache_열", "thirst_열"].forEach(k => next.add(k));
      toast.success("간담습열/실열(實熱) 임상 증상 샘플이 반영되었습니다.");
    }
    setCheckedCells(next);
  };

  // Count calculations
  const counts = useMemo(() => {
    let cold = 0;
    let heat = 0;
    let deficiency = 0;
    let excess = 0;

    checkedCells.forEach(key => {
      if (key.endsWith("_한")) cold++;
      if (key.endsWith("_열")) heat++;
      if (key.endsWith("_허")) deficiency++;
      if (key.endsWith("_실")) excess++;
    });

    const total = cold + heat + deficiency + excess;

    const list: { type: DiagnosisType; count: number; ratio: number }[] = [
      { type: "한", count: cold, ratio: total > 0 ? Math.round((cold / total) * 100) : 0 },
      { type: "열", count: heat, ratio: total > 0 ? Math.round((heat / total) * 100) : 0 },
      { type: "허", count: deficiency, ratio: total > 0 ? Math.round((deficiency / total) * 100) : 0 },
      { type: "실", count: excess, ratio: total > 0 ? Math.round((excess / total) * 100) : 0 },
    ];

    // 많이 체크된 순서대로 정렬 (동점 시 기본 순서 한열허실 유지)
    list.sort((a, b) => b.count - a.count);

    return {
      cold,
      heat,
      deficiency,
      excess,
      total,
      ranked: list
    };
  }, [checkedCells]);

  // Handle Image File Select (supports multiple files, up to 3)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setAnalysisError(null);

    const availableSlots = 3 - selectedImages.length;
    if (availableSlots <= 0) {
      toast.error("설문지 사진은 최대 3장까지만 등록 가능합니다.");
      return;
    }

    const filesToRead = Array.from(files).slice(0, availableSlots);

    if (files.length > availableSlots) {
      toast(`최대 3장까지만 선택할 수 있어 앞선 ${availableSlots}장만 추가되었습니다.`, { icon: "ℹ️" });
    }

    filesToRead.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name}은(는) 이미지 파일이 아닙니다.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setSelectedImages(prev => {
          if (prev.length >= 3) return prev;
          return [...prev, {
            id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            dataUrl,
            name: file.name
          }];
        });
      };
      reader.readAsDataURL(file);
    });

    // Reset input value so same files can be re-selected if deleted
    e.target.value = "";
  };

  const handleRemoveImage = (id: string) => {
    if (isAnalyzing) return;
    setSelectedImages(prev => prev.filter(img => img.id !== id));
  };

  // Run AI Vision Analysis (Up to 3 images)
  const handleStartAnalysis = async () => {
    if (selectedImages.length === 0) {
      toast.error("분석할 설문지 이미지를 1장 이상 등록해 주세요 (최대 3장).");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const res = await fetch("/api/prescription/analyze-survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: selectedImages.map(img => ({
            imageBase64: img.dataUrl,
            mimeType: img.dataUrl.startsWith("data:image/png") ? "image/png" : "image/jpeg"
          }))
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        // 해석이 잘 안되거나 오류 발생 시: 작업을 중단하고 문제를 알려줌 (요구사항 3 충족)
        setAnalysisError(data.errorMessage || "이미지 판독 중 오류가 발생했습니다.");
        setIsAnalyzing(false);
        return;
      }

      if (data.isFilled === false || (data.checkedItems && data.checkedItems.length === 0)) {
        toast("설문지 양식은 확인되었으나 체크 표시가 발견되지 않았습니다. 직접 체크를 진행해 주세요.", {
          icon: "ℹ️",
          duration: 4000
        });
        setIsUploadModalOpen(false);
        setIsAnalyzing(false);
        return;
      }

      // Map recognized categories to state
      const nextChecked = new Set(checkedCells);
      let matchedCount = 0;

      data.checkedItems.forEach((item: { category: string; type: DiagnosisType }) => {
        const found = SYMPTOM_DATA.find(s => s.category.trim() === item.category.trim());
        if (found && ["한", "열", "허", "실"].includes(item.type)) {
          nextChecked.add(`${found.id}_${item.type}`);
          matchedCount++;
        }
      });

      setCheckedCells(nextChecked);
      setIsUploadModalOpen(false);
      setIsAnalyzing(false);
      toast.success(`총 ${selectedImages.length}장의 사진에서 ${matchedCount}개 증상이 종합 판독되어 반영되었습니다!`);

    } catch (err: any) {
      console.error(err);
      setAnalysisError("네트워크 오류 또는 AI 처리 시간 초과가 발생했습니다. 다시 시도해 주세요.");
      setIsAnalyzing(false);
    }
  };

  // Copy Result Summary to Clipboard
  const handleCopySummary = () => {
    if (counts.total === 0) {
      toast.error("체크된 증상이 없습니다.");
      return;
    }

    const rankText = counts.ranked
      .map((r, i) => `${i + 1}위: ${r.type}(${DIAGNOSIS_INFO[r.type].name}) - ${r.count}개 (${r.ratio}%)`)
      .join("\n");

    const text = `[바른처방법 - 한열허실(寒熱虛實) 변증 진단 결과]
총 체크 증상 수: ${counts.total}개

[변증 순위]
${rankText}

주요 고려 치법: ${DIAGNOSIS_INFO[counts.ranked[0].type].keyPrinciples}
설명: ${DIAGNOSIS_INFO[counts.ranked[0].type].description}
- 바른컨설팅 처방 시스템`;

    navigator.clipboard.writeText(text);
    toast.success("진단 결과 요약이 클립보드에 복사되었습니다.");
  };

  // Rank Font Size Resolver (많이 체크된 순으로 글자 크기를 큰 순에서 작은 순으로)
  const getRankTypography = (rankIndex: number) => {
    switch (rankIndex) {
      case 0: // 1위 (최다)
        return {
          titleSize: "text-6xl md:text-7xl font-black tracking-tight",
          countSize: "text-3xl md:text-4xl font-extrabold",
          badgeClass: "bg-amber-400 text-black font-black text-xs px-3 py-1 shadow-lg shadow-amber-950/50",
          cardClass: "border-2 border-amber-400/80 bg-gradient-to-br from-amber-500/20 via-black/80 to-[#041E14] shadow-[0_0_35px_rgba(245,158,11,0.25)] scale-[1.02]",
          label: "1순위 주증(主證)"
        };
      case 1: // 2위
        return {
          titleSize: "text-3xl md:text-4xl font-extrabold",
          countSize: "text-xl md:text-2xl font-bold",
          badgeClass: "bg-white/20 text-white font-bold text-[11px] px-2.5 py-0.5",
          cardClass: "border border-white/20 bg-black/40 hover:border-white/30",
          label: "2순위 겸증(兼證)"
        };
      case 2: // 3위
        return {
          titleSize: "text-xl md:text-2xl font-bold",
          countSize: "text-base md:text-lg font-semibold",
          badgeClass: "bg-white/10 text-white/70 font-medium text-[10px] px-2 py-0.5",
          cardClass: "border border-white/10 bg-black/30 opacity-80",
          label: "3순위"
        };
      default: // 4위 (최소)
        return {
          titleSize: "text-sm md:text-base font-semibold",
          countSize: "text-xs md:text-sm font-medium",
          badgeClass: "bg-white/5 text-white/40 font-medium text-[9px] px-1.5 py-0.5",
          cardClass: "border border-white/5 bg-black/20 opacity-60",
          label: "4순위"
        };
    }
  };

  if (status === "authenticated" && !isPrescriptionApproved) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-[#031C13] flex items-center justify-center p-6 text-white">
          <div className="max-w-md w-full p-8 rounded-3xl bg-black/60 border border-amber-500/30 text-center shadow-2xl backdrop-blur-md space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
              <Lock size={32} />
            </div>
            <h2 className="text-2xl font-black text-white">바른처방법 회원 전용</h2>
            <p className="text-sm text-white/70 leading-relaxed">
              본 진단 시스템은 <span className="text-amber-400 font-bold">바른처방법</span> 또는 <span className="text-emerald-400 font-bold">바른컨설팅</span> 승인 자격을 보유하신 원장님 전용 프로그램입니다.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#031C13] text-white print:bg-white print:text-black">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-20">
          
          {/* Header Hero Banner */}
          <div className="relative mb-8 rounded-3xl overflow-hidden bg-gradient-to-br from-[#062B1D] via-[#041F15] to-[#02130C] border border-emerald-500/20 p-8 md:p-10 shadow-2xl">
            <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
                    <Pill size={13} className="text-amber-400" />
                    바른처방법 • 임상 변증 진단
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                    19대 지표 실시간 매핑
                  </span>
                </div>
                <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight mb-3">
                  한열허실(寒熱虛實) <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-emerald-200 to-teal-300">정밀 진단 시스템</span>
                </h1>
                <p className="text-white/70 text-sm md:text-base max-w-3xl leading-relaxed">
                  소화·수면·대소변·통증 등 19개 핵심 신체 지표를 기반으로 환자의 병리적 편향성을 정밀 분석합니다.
                  직접 체크하거나, <strong className="text-amber-300 font-bold">환자 설문지 사진을 업로드</strong>하여 AI 자동 판독을 진행하세요.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 shrink-0 print:hidden">
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="px-5 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs md:text-sm flex items-center gap-2 transition-all shadow-xl shadow-amber-950/40 transform active:scale-95"
                >
                  <Camera size={16} />
                  <span>설문지 사진 / 촬영 분석</span>
                  <span className="px-1.5 py-0.5 text-[9px] bg-black text-amber-300 rounded font-black">AI</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadPreset("cold_deficiency")}
                    className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-semibold border border-white/10 transition-colors"
                    title="비위허한 샘플 체크"
                  >
                    샘플 1 (허한)
                  </button>
                  <button
                    onClick={() => loadPreset("heat_excess")}
                    className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-semibold border border-white/10 transition-colors"
                    title="간담실열 샘플 체크"
                  >
                    샘플 2 (실열)
                  </button>
                  <button
                    onClick={handleReset}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-white/60 hover:text-rose-300 border border-white/10 transition-colors"
                    title="전체 체크 초기화"
                  >
                    <RotateCcw size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Diagnosis Result Panel (Dynamic Typography Ranking) */}
          <div className="mb-10 rounded-3xl bg-black/60 border border-white/15 p-6 md:p-8 backdrop-blur-xl shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10 mb-6">
              <div>
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block mb-1">
                  Real-Time Diagnostic Ranking & Pattern Analysis
                </span>
                <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                  <TrendingUp size={22} className="text-amber-400" />
                  실시간 변증 순위 및 한열허실 비중
                </h2>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-white/60 font-semibold">
                  총 선택된 증상: <strong className="text-amber-300 text-sm">{counts.total}개</strong>
                </span>
                <button
                  onClick={handleCopySummary}
                  disabled={counts.total === 0}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/80 hover:text-white text-xs font-bold border border-white/10 flex items-center gap-1.5 transition-all disabled:opacity-30 disabled:cursor-not-allowed print:hidden"
                >
                  <Copy size={13} />
                  <span>결과 복사</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/80 hover:text-white text-xs font-bold border border-white/10 flex items-center gap-1.5 transition-all print:hidden"
                >
                  <Printer size={13} />
                  <span>인쇄</span>
                </button>
              </div>
            </div>

            {/* Dynamic Sized Ranking Cards: 많이 체크된 순서대로 큰 글자 크기 적용 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {counts.ranked.map((item, idx) => {
                const info = DIAGNOSIS_INFO[item.type];
                const typo = getRankTypography(idx);
                const isTop = idx === 0 && item.count > 0;

                return (
                  <motion.div
                    key={item.type}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25 }}
                    className={`rounded-2xl p-5 md:p-6 flex flex-col justify-between transition-all ${typo.cardClass}`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className={`rounded-full uppercase tracking-wider ${typo.badgeClass}`}>
                          {typo.label}
                        </span>
                        <span className="text-xs font-bold text-white/50">
                          {info.english}
                        </span>
                      </div>

                      {/* Main Ranked Character & Name (Dynamic Size) */}
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className={`${typo.titleSize} ${info.textColor}`}>
                          {info.hanja}
                        </span>
                        <span className="text-lg md:text-xl font-bold text-white">
                          {info.name}
                        </span>
                      </div>

                      <p className="text-xs text-white/60 line-clamp-2 leading-relaxed mb-4">
                        {info.description}
                      </p>
                    </div>

                    {/* Count & Progress Bar */}
                    <div className="pt-3 border-t border-white/10">
                      <div className="flex items-baseline justify-between mb-1.5">
                        <span className="text-xs text-white/50 font-medium">체크 증상 수</span>
                        <div className="flex items-baseline gap-1">
                          <span className={`${typo.countSize} font-black ${isTop ? "text-amber-300" : "text-white"}`}>
                            {item.count}
                          </span>
                          <span className="text-xs text-white/50">개 ({item.ratio}%)</span>
                        </div>
                      </div>

                      {/* Bar indicator */}
                      <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                        <div 
                          className={`h-full rounded-full bg-gradient-to-r ${info.themeColor} transition-all duration-500`}
                          style={{ width: `${Math.min(100, item.ratio)}%` }}
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Clinical Conclusion Banner */}
            {counts.total > 0 && (
              <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-amber-400 text-black font-black text-[10px]">
                      방제 진단 방향
                    </span>
                    <h3 className="text-base font-bold text-white">
                      가장 우세한 병리: <span className="text-amber-300 font-extrabold">{DIAGNOSIS_INFO[counts.ranked[0].type].name}({counts.ranked[0].type})</span> 경향
                    </h3>
                  </div>
                  <p className="text-xs text-white/70 leading-relaxed">
                    주요 치법 권고: <strong className="text-emerald-300">{DIAGNOSIS_INFO[counts.ranked[0].type].keyPrinciples}</strong>
                  </p>
                </div>
                <div className="text-xs text-white/50 shrink-0">
                  ※ 복합 증상(한열착잡, 허실협잡) 여부를 종합 참작하여 처방을 구성하십시오.
                </div>
              </div>
            )}
          </div>

          {/* Interactive 19-Category Diagnostic Table */}
          <div className="rounded-3xl bg-black/50 border border-white/10 shadow-2xl overflow-hidden backdrop-blur-md">
            
            {/* Table Header Bar */}
            <div className="p-6 md:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 bg-white/[0.02]">
              <div>
                <h3 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
                  <Layers size={18} className="text-amber-400" />
                  19대 신체 지표별 한열허실 체크리스트
                </h3>
                <p className="text-xs text-white/60 mt-1">
                  각 지표별로 환자가 호소하는 증상 셀을 클릭하여 선택하세요. 복수 선택이 가능합니다.
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-bold shrink-0">
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> 한(寒)</div>
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-400" /> 열(熱)</div>
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> 허(虛)</div>
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-400" /> 실(實)</div>
              </div>
            </div>

            {/* Responsive Table Container */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-white/[0.04] border-b border-white/10 text-xs font-bold text-white/60 uppercase tracking-wider">
                    <th className="py-4 px-5 w-28 text-center text-amber-300 font-extrabold">증상 구분</th>
                    <th className="py-4 px-5 w-1/4 text-cyan-300 border-l border-white/5">한(寒)</th>
                    <th className="py-4 px-5 w-1/4 text-rose-300 border-l border-white/5">열(熱)</th>
                    <th className="py-4 px-5 w-1/4 text-emerald-300 border-l border-white/5">허(虛)</th>
                    <th className="py-4 px-5 w-1/4 text-indigo-300 border-l border-white/5">실(實)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {SYMPTOM_DATA.map((row) => {
                    const isCold = checkedCells.has(`${row.id}_한`);
                    const isHeat = checkedCells.has(`${row.id}_열`);
                    const isDeficiency = checkedCells.has(`${row.id}_허`);
                    const isExcess = checkedCells.has(`${row.id}_실`);

                    return (
                      <tr key={row.id} className="hover:bg-white/[0.02] transition-colors group">
                        
                        {/* Category Label */}
                        <td className="py-4 px-5 font-bold text-white/90 text-center bg-black/30 border-r border-white/5">
                          <span className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-white/90 block group-hover:border-amber-400/40 transition-colors">
                            {row.category}
                          </span>
                        </td>

                        {/* 한(寒) Cell */}
                        <td 
                          onClick={() => toggleCell(row.id, "한")}
                          className={`py-3.5 px-4 cursor-pointer transition-all border-r border-white/5 select-none ${
                            isCold 
                              ? "bg-cyan-950/40 text-cyan-100 font-semibold shadow-inner" 
                              : "text-white/70 hover:bg-cyan-500/[0.04]"
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border transition-all ${
                              isCold 
                                ? "bg-cyan-500 border-cyan-400 text-black shadow-md shadow-cyan-900/50" 
                                : "border-white/20 bg-black/40 group-hover:border-cyan-400/50"
                            }`}>
                              {isCold && <Check size={11} strokeWidth={3} />}
                            </div>
                            <span className="leading-relaxed">{row.cold}</span>
                          </div>
                        </td>

                        {/* 열(熱) Cell */}
                        <td 
                          onClick={() => toggleCell(row.id, "열")}
                          className={`py-3.5 px-4 cursor-pointer transition-all border-r border-white/5 select-none ${
                            isHeat 
                              ? "bg-rose-950/40 text-rose-100 font-semibold shadow-inner" 
                              : "text-white/70 hover:bg-rose-500/[0.04]"
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border transition-all ${
                              isHeat 
                                ? "bg-rose-500 border-rose-400 text-white shadow-md shadow-rose-900/50" 
                                : "border-white/20 bg-black/40 group-hover:border-rose-400/50"
                            }`}>
                              {isHeat && <Check size={11} strokeWidth={3} />}
                            </div>
                            <span className="leading-relaxed">{row.heat}</span>
                          </div>
                        </td>

                        {/* 허(虛) Cell */}
                        <td 
                          onClick={() => toggleCell(row.id, "허")}
                          className={`py-3.5 px-4 cursor-pointer transition-all border-r border-white/5 select-none ${
                            isDeficiency 
                              ? "bg-emerald-950/40 text-emerald-100 font-semibold shadow-inner" 
                              : "text-white/70 hover:bg-emerald-500/[0.04]"
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border transition-all ${
                              isDeficiency 
                                ? "bg-emerald-500 border-emerald-400 text-black shadow-md shadow-emerald-900/50" 
                                : "border-white/20 bg-black/40 group-hover:border-emerald-400/50"
                            }`}>
                              {isDeficiency && <Check size={11} strokeWidth={3} />}
                            </div>
                            <span className="leading-relaxed">{row.deficiency}</span>
                          </div>
                        </td>

                        {/* 실(實) Cell */}
                        <td 
                          onClick={() => toggleCell(row.id, "실")}
                          className={`py-3.5 px-4 cursor-pointer transition-all select-none ${
                            isExcess 
                              ? "bg-indigo-950/40 text-indigo-100 font-semibold shadow-inner" 
                              : "text-white/70 hover:bg-indigo-500/[0.04]"
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border transition-all ${
                              isExcess 
                                ? "bg-indigo-500 border-indigo-400 text-white shadow-md shadow-indigo-900/50" 
                                : "border-white/20 bg-black/40 group-hover:border-indigo-400/50"
                            }`}>
                              {isExcess && <Check size={11} strokeWidth={3} />}
                            </div>
                            <span className="leading-relaxed">{row.excess}</span>
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="p-5 border-t border-white/10 bg-black/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-white/50">
              <p>
                💡 각 증상 칸을 클릭하면 즉시 체크/해제되며 상단 진단 순위가 실시간으로 재계산됩니다.
              </p>
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="text-amber-400 hover:text-amber-300 font-bold self-start sm:self-auto"
              >
                ↑ 상단 진단 결과 보러가기
              </button>
            </div>
          </div>

        </main>
      </div>

      {/* AI Survey Photo Analysis Modal */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-2xl bg-gradient-to-br from-[#05261A] to-[#02130C] border border-amber-500/30 rounded-3xl p-6 md:p-8 shadow-2xl text-white overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Close Button */}
              <button
                onClick={() => {
                  if (isAnalyzing) return;
                  setIsUploadModalOpen(false);
                }}
                className="absolute top-6 right-6 w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center border border-white/10 transition-colors"
              >
                <X size={18} />
              </button>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-[11px] font-black uppercase tracking-wider inline-flex items-center gap-1.5">
                    <Sparkles size={12} className="text-amber-400" />
                    AI Vision Multi-Image Survey Recognition • 최대 3장
                  </span>
                  <span className="text-xs font-bold text-white/50">
                    선택된 사진: <strong className="text-amber-300">{selectedImages.length}</strong> / 3장
                  </span>
                </div>
                <h3 className="text-xl md:text-2xl font-black text-white">
                  설문지 사진 업로드 및 종합 판독
                </h3>
                <p className="text-xs text-white/60 mt-1 leading-relaxed">
                  환자가 작성한 설문지 앞/뒷면 또는 분할 촬영본을 <strong className="text-amber-300 font-bold">최대 3장까지</strong> 한 번에 등록하여 종합 분석할 수 있습니다.
                </p>
              </div>

              {/* Upload Dropzone & Actions */}
              <div className="space-y-4 overflow-y-auto flex-1 pr-1">
                
                {/* Error Banner when unreadable (요구사항 3: 강제로 하지말고 작업을 멈추고 문제를 알려줌) */}
                {analysisError && (
                  <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs space-y-1.5 animate-shake">
                    <div className="flex items-center gap-2 font-bold text-rose-300 text-sm">
                      <AlertTriangle size={18} className="text-rose-400 shrink-0" />
                      <span>판독 중단 안내</span>
                    </div>
                    <p className="leading-relaxed text-rose-100">
                      {analysisError}
                    </p>
                    <p className="text-[11px] text-rose-300/80 pt-1">
                      ⚠️ 글자나 체크 표시가 흐릿하면 임의로 판독하지 않고 안전을 위해 작업을 중단합니다. 선명한 사진으로 다시 시도하거나 직접 수동 체크를 진행해 주세요.
                    </p>
                  </div>
                )}

                {/* Multiple Images Gallery Grid */}
                {selectedImages.length > 0 ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {selectedImages.map((img, idx) => (
                        <div 
                          key={img.id}
                          className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-white/20 bg-black/60 flex items-center justify-center group shadow-md"
                        >
                          <img 
                            src={img.dataUrl} 
                            alt={img.name} 
                            className="max-h-full max-w-full object-contain"
                          />

                          {/* Top Tag & Delete Button */}
                          <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                            <span className="px-2 py-0.5 rounded-md bg-black/80 text-amber-300 font-bold text-[10px] border border-amber-500/30 backdrop-blur-sm shadow">
                              사진 {idx + 1}
                            </span>
                            {!isAnalyzing && (
                              <button
                                onClick={() => handleRemoveImage(img.id)}
                                className="w-6 h-6 rounded-md bg-black/80 hover:bg-rose-600 text-white/80 hover:text-white flex items-center justify-center transition-colors pointer-events-auto border border-white/20"
                                title="사진 삭제"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Add more button if less than 3 */}
                      {selectedImages.length < 3 && !isAnalyzing && (
                        <div className="aspect-[4/3] rounded-2xl border-2 border-dashed border-white/20 hover:border-amber-400/50 hover:bg-white/[0.04] transition-all flex flex-col items-center justify-center p-4 text-center group">
                          <div className="w-10 h-10 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                            <Upload size={18} />
                          </div>
                          <span className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                            + 사진 추가하기
                          </span>
                          <span className="text-[10px] text-white/40 mt-0.5">
                            ({selectedImages.length} / 3장 등록됨)
                          </span>
                          <div className="flex items-center gap-1.5 mt-2">
                            <button
                              onClick={() => fileInputRef.current?.click()}
                              className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold transition-colors"
                            >
                              파일
                            </button>
                            <button
                              onClick={() => cameraInputRef.current?.click()}
                              className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold transition-colors"
                            >
                              촬영
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Scanning Animation Bar */}
                    {isAnalyzing && (
                      <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full border-2 border-amber-400 border-t-transparent animate-spin shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-amber-300">
                            총 {selectedImages.length}장의 설문지 사진을 AI 비전으로 정밀 대조 및 통합 분석 중입니다...
                          </p>
                          <p className="text-[10px] text-white/50">
                            19대 지표의 체크 및 동그라미 표시를 교차 검증하고 있습니다.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-white/20 rounded-2xl p-8 text-center bg-white/[0.02] hover:border-amber-400/40 hover:bg-white/[0.04] transition-all space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center mx-auto">
                      <Upload size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white mb-1">
                        설문지 사진을 업로드하거나 촬영하세요 (최대 3장)
                      </p>
                      <p className="text-xs text-white/50">
                        PNG, JPG, JPEG 지원 • 설문지 앞/뒷면 또는 분할 촬영본을 한 번에 선택 가능
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition-colors shadow-lg"
                      >
                        <Upload size={14} />
                        <span>사진 파일 선택 (최대 3장)</span>
                      </button>

                      <button
                        onClick={() => cameraInputRef.current?.click()}
                        className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 transition-colors border border-white/10"
                      >
                        <Camera size={14} />
                        <span>카메라로 촬영</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Hidden inputs with multiple support */}
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept="image/*" 
                  multiple
                  className="hidden" 
                  onChange={handleFileChange}
                />
                <input 
                  ref={cameraInputRef}
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  className="hidden" 
                  onChange={handleFileChange}
                />

                {/* Quality Tips */}
                <div className="p-4 rounded-xl bg-black/40 border border-white/5 text-xs text-white/60 space-y-1">
                  <p className="font-bold text-amber-300 flex items-center gap-1.5">
                    <Info size={14} />
                    정확한 다중 설문지 판독을 위한 팁
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-white/50">
                    <li>설문지가 긴 경우 상단/하단 또는 앞면/뒷면으로 나누어 최대 3장까지 등록해 주세요.</li>
                    <li>모든 사진의 체크 항목이 자동으로 종합 합산되어 표에 일괄 체크됩니다.</li>
                    <li>글자가 심하게 뭉개지거나 판독이 불가능한 사진이 있을 경우 AI가 안전하게 작업을 중단합니다.</li>
                  </ul>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-6 border-t border-white/10 mt-6 flex items-center justify-between gap-3">
                <span className="text-xs text-white/50 hidden sm:inline">
                  {selectedImages.length > 0 ? `${selectedImages.length}장의 사진이 준비되었습니다.` : "사진을 선택해 주세요."}
                </span>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsUploadModalOpen(false)}
                    disabled={isAnalyzing}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-bold transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleStartAnalysis}
                    disabled={selectedImages.length === 0 || isAnalyzing}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs md:text-sm flex items-center gap-2 transition-all shadow-lg shadow-amber-950/40 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Sparkles size={14} />
                    <span>
                      {isAnalyzing 
                        ? `AI 종합 판독 중 (${selectedImages.length}장)...` 
                        : `AI 종합 정밀 판독 시작 (${selectedImages.length}장)`}
                    </span>
                  </button>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
