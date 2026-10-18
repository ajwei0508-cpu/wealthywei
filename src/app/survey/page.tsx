"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ChevronRight, ChevronLeft, Check, User, Stethoscope, ClipboardList,
  BarChart3, Users, Shield, Upload, X, Sparkles, Mic, MicOff,
  Star, Target, Zap, Save, Lock, AlertCircle, PlusCircle,
  Clock, Share2, BookOpen, Crown, Wand2, Copy, CheckCircle2, Eye, Coffee, Edit3, FileText
} from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer
} from "recharts";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import {
  MASTER_SURVEY_FIELDS,
  PRESET_CATEGORY_LABELS,
  PresetCategory,
} from "@/lib/surveyPresets";
import SurveyFullSheetView from "@/components/survey/SurveyFullSheetView";

// ─── Types ──────────────────────────────────────────────────────────────────
export type SurveyData = {
  ch1: {
    name: string; clinic: string; degree: string; specialist: string; media: string; vision: string; mission: string; goal: string; mbti: string;
    intro: string;         // Q1. 자기소개 + 경력
    actionStep: string;    // Q3. 비전 달성 행동
    weakness: string;      // Q4. 부족한 점/해결책
    whyCome: string;       // Q5. 내원 이유 (Part 2에서 렌더링)
    whyLeave: string;      // Q6. 안 오는 이유 (Part 2에서 렌더링)
    clinicPride: string;   // Q9. 한의원 자랑
    philosophy: string;    // Q44. 관리 철학
    desiredLeader: string; // Q45. 어떤 원장님
  };
  ch2: {
    addressHours: string;         // Q30. 주소/시간
    clinicSize: string;           // Q42. 실평수/베드수
    patientFlow: string;          // Q11. 환자 동선
    consultScript: string;        // Q12. 진단 멘트
    herbConsultProcess: string;   // Q15. 약 상담/결제 과정
    happyCallSystem: string;      // Q31. 해피콜 시스템
    herbInstructions: string;     // Q32. 복용법 안내 과정
    herbInstructionsFile: string[];
    herbManagementSystem: string; // Q33. 한약 관리 시스템
  };
  ch3: {
    equipmentDetail: string;        // Q7. 보유 물리치료 및 검사기기
    treatmentDefinition: string;    // Q8. 치료/경영 정의
    patientQna: string;             // Q10. Q&A 리스트
    patientQnaFile: string[];
    diseasePlans: string;           // Q13. 질환별 계획
    mskExample: string;             // Q14. 근골격계 상담 예시
    charting: { disease: string; case1: string; case2: string; case3: string }[]; // Q16. 차팅 사례
    billingRoutine: string;         // Q17. 루틴 청구법
    chunaRoutine: string;           // Q18. 추나 루틴
    herbRecommendation: string;     // Q19. 약 필요성 설명
    acupointRecommendation: string; // Q21. 약침 권유
  };
  ch4: {
    targetMetrics: { revenue: string; profit: string; nonBenefit: string; autoInsurance: string; dailyPatients: string; }; // Q22. 희망 목표
    workingDays: string;            // Q26. 진료일수
    profitUsage: string;            // Q23. 수익 사용 계획
    growthInvestment: string;       // Q24. 추가비용 지불 의사
    immediateInvestment: string;    // Q25. 당장 투자 금액
    indicators: string;             // Q27. 관찰 지표/관리방법
    indicatorsFile: string[];
    investmentHistory: string;      // Q28. 투자비용/회수금
    expenses: { item: string; amount: string }[]; // Q29. 경비 내역
  };
  ch5: {
    staff: { role: string; salary: string; days: string; hours: string; incentive: string; }[]; // Q34. 직원 구성
    staffCounts: { desk: string; treatment: string; decoction: string; other: string; };        // Q43. 파트별 근무 인원
    mealSnack: { nightMeal: string; snack: string; lunch: string; eatTogether: string; };      // Q35~38 식사/간식
    welfare: string;                // Q39, 40 복지 상세
    staffDiscount: string;          // Q41. 직원 할인
    idealStaff: string;             // Q46. 인재상
    expectations: { manager: string; regular: string; communication: string; }; // Q47. 역할 기대 + 소통 주기
    chatSystem: { program: string; channels: string; capture1?: string; capture2?: string; guideFile?: string; files: string[]; }; // Q48, 49
    eduMeeting: string;             // Q50. 교육/회의 시스템
    eduMaterials: string[];         // Q51. 교육 자료 목록
  };
  ch6: {
    safetyEducation: string;        // Q52. 직원 안전/보안 교육 현황
    safetyItems: Record<string, boolean>;
    safetyFiles: Record<string, string[]>;
    marketingStatus: { channels: string; cost: string; goal: string; }; // Q53. 마케팅 현황 + 목표
    promoMaterials: string;         // Q54. 홍보물 현황
    promoPhotos: string[];
    finalGoal: string;              // Final. 컨설팅 발전 희망 능력
  };
};

const MBTI_LIST = ["INTJ","INTP","ENTJ","ENTP","INFJ","INFP","ENFJ","ENFP","ISTJ","ISFJ","ESTJ","ESFJ","ISTP","ISFP","ESTP","ESFP"];

export const SAFETY_ITEMS = [
  "개인정보보호 교육", "성희롱예방 교육", "직원간 대화 규칙", "환자 응대 규칙",
  "화재/전기 안전 교육", "감염 관리 매뉴얼", "발침 사고 대응", "낙상 사고 대응",
  "응급 상황 프로토콜", "컴플레인 대응", "의료 장비 관리", "약품 안전 관리",
  "보안/CCTV 운영", "탕전실 안전", "주차 관리 안내", "비상연락망 체계",
  "직원 보건 교육", "근골격계 질환 예방"
];

const CHAPTER_CONFIG = [
  { id: 1, icon: User,          title: "Part 1. 원장님 브랜딩 & 경영 철학", subtitle: "Who You Are",          shortTitle: "브랜딩",     color: "from-emerald-600 to-teal-700",   estMin: 3, cards: ["01-05 브랜딩 & 리더십", "06-09 경영 철학 & 비전"] },
  { id: 2, icon: Stethoscope,   title: "Part 2. 공간 입지 & 환자 경험 여정", subtitle: "Clinic UX & Journey",  shortTitle: "공간·동선",  color: "from-teal-600 to-emerald-800",   estMin: 3, cards: ["10-11 입지 & 공간 규모", "12-16 환자 동선 & 내원/이탈 요인", "17-19 해피콜 & 한약 안내"] },
  { id: 3, icon: ClipboardList, title: "Part 3. 임상 루틴 & 처방 시스템",   subtitle: "Clinical SOP",         shortTitle: "임상루틴",   color: "from-amber-600 to-emerald-700",  estMin: 4, cards: ["20-21 치료 철학 & 장비", "22-24 임상 매뉴얼 & 치료 계획", "25 대표 3대 질환 차팅", "26-29 청구·추나·처방 권유"] },
  { id: 4, icon: BarChart3,     title: "Part 4. 경영 지표 & 재무 투자",     subtitle: "Numbers & Goals",      shortTitle: "재무목표",   color: "from-emerald-700 to-cyan-700",   estMin: 3, cards: ["30-32 5대 목표 수치 & 수익 배분", "33-35 투자금 & 성장 예산", "36-37 핵심 지표 & 월 고정경비"] },
  { id: 5, icon: Users,         title: "Part 5. 조직 문화 & 팀 빌딩",       subtitle: "People & Culture",     shortTitle: "조직문화",   color: "from-teal-700 to-emerald-600",   estMin: 4, cards: ["38-39 직원 처우 & 파트 인원", "40-42 식사·복리후생·할인", "43-44 인재상 & 직책별 역할", "45-47 메신저 소통 & 교육"] },
  { id: 6, icon: Shield,        title: "Part 6. 안전 리스크 & 마케팅 비전", subtitle: "Safety & Marketing",   shortTitle: "안전·마케팅", color: "from-amber-500 to-emerald-800", estMin: 3, cards: ["48 원내 18대 안전 체크리스트", "49-50 마케팅 & 원내 홍보물", "51 경영 명인의 자화상"] },
];

const getLevel = (pct: number) => {
  if (pct < 40) return { name: "진단 시작 (수련생)", icon: "🌱", color: "text-emerald-300", bg: "bg-emerald-500/15 border-emerald-500/30" };
  if (pct < 70) return { name: "데이터 구축 (전문의)", icon: "⚕️", color: "text-teal-300", bg: "bg-teal-500/15 border-teal-500/30" };
  if (pct < 90) return { name: "정밀 분석 (명의)", icon: "🏅", color: "text-amber-300", bg: "bg-amber-500/15 border-amber-500/30" };
  return { name: "완벽 수합 (경영 명인)", icon: "👑", color: "text-amber-300", bg: "bg-gradient-to-r from-amber-500/20 to-emerald-500/20 border-amber-400/50" };
};

export const initialData: SurveyData = {
  ch1: { name: "", clinic: "", degree: "", specialist: "", media: "", vision: "", mission: "", goal: "", mbti: "", intro: "", actionStep: "", weakness: "", whyCome: "", whyLeave: "", clinicPride: "", philosophy: "", desiredLeader: "" },
  ch2: { addressHours: "", clinicSize: "", patientFlow: "", consultScript: "", herbConsultProcess: "", happyCallSystem: "", herbInstructions: "", herbInstructionsFile: [], herbManagementSystem: "" },
  ch3: { equipmentDetail: "", treatmentDefinition: "", patientQna: "", patientQnaFile: [], diseasePlans: "", mskExample: "", charting: [{ disease: "대표 질환 1 (예: 경추통)", case1: "", case2: "", case3: "" }, { disease: "대표 질환 2 (예: 요통)", case1: "", case2: "", case3: "" }, { disease: "대표 질환 3 (예: 슬통)", case1: "", case2: "", case3: "" }], billingRoutine: "", chunaRoutine: "", herbRecommendation: "", acupointRecommendation: "" },
  ch4: { targetMetrics: { revenue: "", profit: "", nonBenefit: "", autoInsurance: "", dailyPatients: "" }, workingDays: "", profitUsage: "", growthInvestment: "", immediateInvestment: "", indicators: "", indicatorsFile: [], investmentHistory: "", expenses: [{ item: "임대료", amount: "" }, { item: "인건비", amount: "" }, { item: "의약품/한약재", amount: "" }] },
  ch5: { staff: [{ role: "실장", salary: "", days: "", hours: "", incentive: "" }, { role: "간호조무사", salary: "", days: "", hours: "", incentive: "" }], staffCounts: { desk: "", treatment: "", decoction: "", other: "" }, mealSnack: { nightMeal: "", snack: "", lunch: "", eatTogether: "" }, welfare: "", staffDiscount: "", idealStaff: "", expectations: { manager: "", regular: "", communication: "" }, chatSystem: { program: "카카오톡", channels: "", capture1: "", capture2: "", guideFile: "", files: [] }, eduMeeting: "", eduMaterials: [] },
  ch6: { safetyEducation: "", safetyItems: Object.fromEntries(SAFETY_ITEMS.map(q => [q, false])), safetyFiles: {}, marketingStatus: { channels: "", cost: "", goal: "" }, promoMaterials: "", promoPhotos: [], finalGoal: "" },
};

// ─── STT Hook (원장님 날것 음성 그대로 받아적기) ────────────────────────────
function useSTT() {
  const [listeningId, setListeningId] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const startSTT = useCallback((fieldId: string, onResult: (t: string) => void) => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error("이 브라우저는 음성 인식을 지원하지 않습니다."); return; }
    if (listeningId === fieldId) {
      recognitionRef.current?.stop();
      setListeningId(null);
      return;
    }
    recognitionRef.current?.stop();
    const rec = new SR();
    rec.lang = "ko-KR";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      const transcript = Array.from(e.results).map((r: any) => r[0].transcript).join("");
      onResult(transcript);
    };
    rec.onerror = () => setListeningId(null);
    rec.onend = () => setListeningId(null);
    rec.start();
    recognitionRef.current = rec;
    setListeningId(fieldId);
  }, [listeningId]);

  return { listeningId, startSTT };
}

// ─── Sub-components ──────────────────────────────────────────────────────────
const FileUpload = ({ label, value = [], onUpload, hint, disabled }: { label: string; value: string | string[]; onUpload: (urls: string[]) => void; hint?: string; disabled?: boolean }) => {
  const [uploading, setUploading] = useState(false);
  const normalizedValue = Array.isArray(value) ? value : (value ? [value] : []);

  const getFileIcon = (url: string) => {
    const ext = url.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || "")) return { icon: <Sparkles size={16} />, color: "bg-emerald-600", label: "IMG" };
    if (['pdf'].includes(ext || "")) return { icon: <ClipboardList size={16} />, color: "bg-rose-500", label: "PDF" };
    if (['xlsx', 'xls', 'csv'].includes(ext || "")) return { icon: <BarChart3 size={16} />, color: "bg-emerald-500", label: "XLS" };
    if (['zip', '7z', 'rar'].includes(ext || "")) return { icon: <Shield size={16} />, color: "bg-amber-500", label: "ZIP" };
    return { icon: <Upload size={16} />, color: "bg-slate-500", label: "FILE" };
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const largeFiles = files.filter(f => f.size > 50 * 1024 * 1024);
    if (largeFiles.length > 0) {
      toast.error("50MB를 초과하는 파일이 포함되어 있습니다.");
      return;
    }

    setUploading(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        let contentType = file.type;
        if (!contentType) {
          if (ext === 'xlsx') contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          else if (ext === 'xls') contentType = 'application/vnd.ms-excel';
          else if (ext === 'pdf') contentType = 'application/pdf';
          else if (ext === 'docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        }
        const { error } = await supabase.storage
          .from('survey-files')
          .upload(path, file, { contentType: contentType || 'application/octet-stream', upsert: false });
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('survey-files').getPublicUrl(path);
        return publicUrl;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      onUpload([...normalizedValue, ...uploadedUrls]);
      toast.success(`${uploadedUrls.length}개의 파일이 업로드되었습니다.`);
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(`업로드 중 오류가 발생했습니다: ${err.message}`);
    } finally {
      setUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  const removeFile = (index: number) => {
    const newList = [...normalizedValue];
    newList.splice(index, 1);
    onUpload(newList);
  };

  return (
    <div className="space-y-3">
      {label && <Lbl hint={hint}>{label}</Lbl>}
      {normalizedValue.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {normalizedValue.map((url, idx) => {
            const meta = getFileIcon(url);
            return (
              <div key={idx} className="group relative flex items-center gap-3 p-3 bg-[#092E20] border border-white/10 rounded-2xl shadow-sm hover:border-amber-400/40 transition-all">
                <div className={`w-9 h-9 ${meta.color} rounded-xl flex items-center justify-center text-white shadow-sm`}>
                  {meta.icon}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-[9px] font-black text-amber-400/80 uppercase tracking-tighter">{meta.label}</p>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-[#F5F2EB] truncate block hover:text-amber-300 hover:underline">
                    첨부파일 {idx + 1} 열람
                  </a>
                </div>
                {!disabled && (
                  <button onClick={() => removeFile(idx)} className="p-1.5 text-white/40 hover:text-rose-400 transition-colors">
                    <X size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!disabled && (
        <label className={`flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
          uploading ? "bg-emerald-950/60 border-amber-400 animate-pulse" : "bg-[#051F15]/70 border-white/15 hover:border-amber-400/50 hover:bg-[#082B1E]"
        }`}>
          <input type="file" className="hidden" onChange={handleFile} multiple disabled={uploading} />
          <div className="w-11 h-11 rounded-2xl bg-white/5 flex items-center justify-center text-amber-400">
            {uploading ? <Sparkles size={22} className="animate-spin" /> : <Upload size={22} />}
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-[#F5F2EB]">{uploading ? "클라우드 업로드 중..." : "파일 선택 또는 드래그 앤 드롭"}</p>
            <p className="text-[10px] text-white/45 mt-0.5">문서(PDF, 엑셀, 워드), 이미지, 압축파일(.zip) 최대 50MB</p>
          </div>
        </label>
      )}
    </div>
  );
};

const Lbl = ({ children, hint, stepBadge, legacyQ }: { children: React.ReactNode; hint?: string; stepBadge?: string; legacyQ?: string }) => (
  <div className="mb-2.5">
    <div className="flex flex-wrap items-center gap-2">
      {stepBadge && (
        <span className="px-2 py-0.5 rounded-md bg-amber-400/15 border border-amber-400/30 text-[10px] font-black text-amber-300 tracking-wider">
          STEP {stepBadge}
        </span>
      )}
      {legacyQ && (
        <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-bold text-white/45">
          {legacyQ}
        </span>
      )}
      <label className="block text-sm font-extrabold text-[#F5F2EB]">{children}</label>
    </div>
    {hint && <p className="text-xs text-emerald-200/60 mt-1 leading-relaxed">{hint}</p>}
  </div>
);

const Inp = ({ value, onChange, placeholder, type = "text", err, readOnly }: any) => (
  <input type={type} value={value} readOnly={readOnly}
    onChange={e => onChange(e.target.value)} placeholder={placeholder}
    className={`w-full px-4 py-3 rounded-xl border text-[#F5F2EB] text-sm font-medium placeholder:text-white/25 focus:outline-none focus:ring-2 transition-all ${
      err ? "border-red-400 bg-red-950/30 focus:ring-red-400/30" : "border-white/12 bg-[#041810]/90 focus:ring-amber-400/30 focus:border-amber-400/60"
    } ${readOnly ? "opacity-60 cursor-not-allowed" : ""}`}
  />
);

// ─── 마스터 전용 1,2번 도구 바 (일반 회원에게는 절대 노출되지 않음) ──────────
const MasterFieldToolkit = ({
  fieldId,
  questionLabel,
  currentValue,
  onApply,
  clinicMeta,
}: {
  fieldId: string;
  questionLabel: string;
  currentValue: string;
  onApply: (val: string) => void;
  clinicMeta: { name: string; clinic: string; degree: string };
}) => {
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiResult, setAiResult] = useState<{ diagnosis: string; drafts: string[] } | null>(null);
  const [showPresets, setShowPresets] = useState(false);

  const meta = MASTER_SURVEY_FIELDS.find(f => f.id === fieldId);

  const handleRunMasterAi = async () => {
    setLoadingAi(true);
    try {
      const res = await fetch("/api/survey/ai-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: clinicMeta.name,
          clinic: clinicMeta.clinic,
          degree: clinicMeta.degree,
          questionLabel,
          currentValue,
          mode: "master_diagnosis",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "AI 분석 오류");
      setAiResult({ diagnosis: json.diagnosis || "", drafts: json.drafts || [] });
      toast.success("마스터 AI 진단 및 다듬기 초안이 생성되었습니다.");
    } catch (e: any) {
      toast.error(e.message || "AI 다듬기 실패");
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="mt-2.5 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-[#0A2E20] to-emerald-900/20 border border-amber-400/30 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Crown size={13} className="text-amber-400" />
          <span className="text-[11px] font-black text-amber-300 uppercase tracking-wider">Master Only 코칭 도구</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRunMasterAi}
            disabled={loadingAi}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#031C13] text-xs font-black transition-all shadow-sm disabled:opacity-50"
          >
            <Wand2 size={12} className={loadingAi ? "animate-spin" : ""} />
            {loadingAi ? "AI 문제점 분석 중..." : "1번: AI 문제점 진단 & 다듬기"}
          </button>
          {meta?.presets && (
            <button
              type="button"
              onClick={() => setShowPresets(p => !p)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-[#F5F2EB] text-xs font-bold transition-all"
            >
              <Sparkles size={12} className="text-amber-400" />
              2번: 1클릭 모범 프리셋 {showPresets ? "닫기" : "열기"}
            </button>
          )}
        </div>
      </div>

      {/* 2번: 1클릭 상위 1% 모범 프리셋 */}
      {showPresets && meta?.presets && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-2 border-t border-white/10">
          {(["pain", "diet", "local"] as PresetCategory[]).map(cat => (
            <div key={cat} className="p-3 rounded-xl bg-[#041810]/90 border border-white/10 flex flex-col justify-between gap-2">
              <div>
                <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-black mb-1">
                  {PRESET_CATEGORY_LABELS[cat].label}
                </span>
                <p className="text-xs text-white/80 whitespace-pre-wrap leading-relaxed">{meta.presets![cat]}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onApply(meta.presets![cat]);
                  toast.success(`[${PRESET_CATEGORY_LABELS[cat].label}] 모범 프리셋이 적용되었습니다.`);
                }}
                className="w-full py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-400/30 text-emerald-200 text-[11px] font-bold transition-all"
              >
                이 프리셋으로 교체 적용
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 1번: AI 문제점 진단 & 3가지 다듬기 결과 */}
      {aiResult && (
        <div className="space-y-2.5 pt-2 border-t border-white/10">
          {aiResult.diagnosis && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-400/30 text-xs text-rose-200">
              <span className="font-black text-rose-300 mr-1.5">🔍 마스터 AI 리얼 현황 문제점 진단:</span>
              {aiResult.diagnosis}
            </div>
          )}
          <div className="grid grid-cols-1 gap-2">
            {aiResult.drafts.map((draft, i) => (
              <div key={i} className="p-3 rounded-xl bg-[#041810] border border-amber-400/20 flex items-start justify-between gap-3">
                <p className="text-xs text-[#F5F2EB] whitespace-pre-wrap leading-relaxed flex-1">{draft}</p>
                <button
                  type="button"
                  onClick={() => {
                    onApply(draft);
                    toast.success("AI 컨설팅 다듬기 문장이 적용되었습니다.");
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-400 text-[#031C13] text-[11px] font-black flex-shrink-0 hover:bg-amber-300 transition-all"
                >
                  적용
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const STATextarea = ({
  id,
  value,
  onChange,
  placeholder,
  rows = 4,
  err,
  readOnly,
  listeningId,
  onMic,
  masterMode,
  fieldId,
  questionLabel,
  clinicMeta,
}: any) => (
  <div>
    <div className="relative">
      <textarea
        id={id}
        rows={rows}
        value={value}
        readOnly={readOnly}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-4 py-3.5 pr-12 rounded-xl border text-[#F5F2EB] text-sm font-medium placeholder:text-white/25 focus:outline-none focus:ring-2 transition-all resize-y leading-relaxed ${
          err ? "border-red-400 bg-red-950/30 focus:ring-red-400/30" : "border-white/12 bg-[#041810]/90 focus:ring-amber-400/30 focus:border-amber-400/60"
        } ${readOnly ? "opacity-60 cursor-not-allowed" : ""}`}
      />
      {!readOnly && onMic && (
        <button
          type="button"
          title="음성으로 편하게 말하면 그대로 받아적습니다"
          onClick={() => onMic(id, (t: string) => onChange(value ? value + " " + t : t))}
          className={`absolute top-3 right-3 p-2 rounded-xl transition-all ${
            listeningId === id
              ? "bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/40"
              : "bg-white/8 text-white/50 hover:text-amber-300 hover:bg-white/15"
          }`}
        >
          {listeningId === id ? <MicOff size={15} /> : <Mic size={15} />}
        </button>
      )}
    </div>
    {masterMode && fieldId && (
      <MasterFieldToolkit
        fieldId={fieldId}
        questionLabel={questionLabel || fieldId}
        currentValue={value}
        onApply={onChange}
        clinicMeta={clinicMeta}
      />
    )}
  </div>
);

const SCard = ({ id, badge, title, subtitle, children }: { id?: string; badge?: string; title: string; subtitle?: string; children: React.ReactNode }) => (
  <div id={id} className="bg-[#07261B]/90 backdrop-blur-xl rounded-3xl border border-white/10 shadow-xl overflow-hidden scroll-mt-36">
    <div className="px-7 py-5 bg-gradient-to-r from-[#0A3526] via-[#082B1E] to-[#062117] border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-3">
        {badge && (
          <span className="px-2.5 py-1 rounded-lg bg-amber-400/15 border border-amber-400/30 text-amber-300 text-xs font-black">
            {badge}
          </span>
        )}
        <h3 className="font-black text-[#F5F2EB] text-base md:text-lg tracking-tight">{title}</h3>
      </div>
      {subtitle && <span className="text-xs text-emerald-300/60 font-medium">{subtitle}</span>}
    </div>
    <div className="p-7 md:p-8 space-y-7">{children}</div>
  </div>
);

// ─── 5번 제작: 하이엔드 실시간 컨설팅 리포트 빌더 & 브로슈어 프리뷰 ─────────
const LiveReportBuilderWidget = ({
  radarData,
  totalPct,
  safetyPct,
  data,
  level,
  onOpenDossier,
  onOpenResumeModal,
}: {
  radarData: any[];
  totalPct: number;
  safetyPct: number;
  data: SurveyData;
  level: { name: string; icon: string; color: string; bg: string };
  onOpenDossier: () => void;
  onOpenResumeModal: () => void;
}) => {
  return (
    <div className="fixed right-5 top-1/2 -translate-y-1/2 z-30 hidden 2xl:block w-64">
      <div className="bg-[#062319]/95 backdrop-blur-2xl rounded-3xl border border-amber-400/25 shadow-[0_20px_60px_rgba(0,0,0,0.6)] p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <p className="text-[9px] font-black text-amber-400 uppercase tracking-[0.2em]">LIVE DIAGNOSTIC</p>
            <h4 className="text-xs font-black text-[#F5F2EB] mt-0.5">실시간 진단 리포트 빌더</h4>
          </div>
          <span className="text-lg">{level.icon}</span>
        </div>

        <div className="h-40 -my-2">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="68%">
              <PolarGrid stroke="rgba(255,255,255,0.12)" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "#D4AF37", fontWeight: 700 }} />
              <Radar dataKey="fill" stroke="#10B981" fill="#D4AF37" fillOpacity={0.35} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-2 pt-1 border-t border-white/10 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-white/55 font-medium">리얼 데이터 밀도</span>
            <span className="font-black text-amber-300">{totalPct}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/55 font-medium">안전 방어 지수</span>
            <span className="font-black text-emerald-300">{safetyPct}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/55 font-medium">목표 월매출</span>
            <span className="font-black text-[#F5F2EB] truncate max-w-[110px]">
              {data.ch4.targetMetrics.revenue ? `${data.ch4.targetMetrics.revenue}` : "미입력"}
            </span>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={onOpenDossier}
            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-[#031C13] font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 hover:brightness-105 transition-all"
          >
            <BookOpen size={13} />
            실시간 진단 브로슈어 열기
          </button>
          <button
            type="button"
            onClick={onOpenResumeModal}
            className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all"
          >
            <Coffee size={12} className="text-amber-300" />
            3분 저장 & 나중에 이어쓰기
          </button>
        </div>
      </div>
    </div>
  );
};

export default function SurveyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { listeningId, startSTT } = useSTT();

  const [step, setStep] = useState(1);
  const [pageMode, setPageMode] = useState<"edit" | "view">("edit");
  const [data, setData] = useState<SurveyData>(initialData);
  const [submitted, setSubmitted] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string>("");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [showSuccess, setShowSuccess] = useState(false);
  const [stampStep, setStampStep] = useState<number | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  // 마스터 전용: 본인 설문지뿐만 아니라 모든 회원 원장님 설문지를 선택해 열람/수정 가능
  const isMaster = session?.user?.email?.toLowerCase() === (process.env.NEXT_PUBLIC_MASTER_EMAIL || "wei0508@naver.com").toLowerCase();
  const [masterCoachingMode, setMasterCoachingMode] = useState(false);
  const [memberList, setMemberList] = useState<{ user_id: string; name: string; clinic: string; submitted: boolean; updated_at: string }[]>([]);
  const [targetUserId, setTargetUserId] = useState<string>("");

  // 4번: 스마트 이어쓰기 모달 / 5번: 실시간 진단 브로슈어 모달
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [showDossierModal, setShowDossierModal] = useState(false);

  const isReadOnly = false;

  // URL 파라미터 (?mode=view, ?userId=...) 감지
  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("mode") === "view") {
        setPageMode("view");
      }
      const uid = sp.get("userId");
      if (uid) {
        setTargetUserId(uid.toLowerCase());
      }
    }
  }, []);

  const loadSurveyData = useCallback((uid?: string) => {
    const query = uid ? `?userId=${encodeURIComponent(uid)}` : "";
    fetch(`/api/survey${query}`)
      .then(r => r.json())
      .then(({ data: saved, memberList: mList }) => {
        if (mList && Array.isArray(mList)) {
          setMemberList(mList);
        }
        if (saved?.data) {
          const merged = { ...initialData };
          for (const chKey of ["ch1", "ch2", "ch3", "ch4", "ch5", "ch6"] as const) {
            if (saved.data[chKey]) {
              merged[chKey] = { ...initialData[chKey], ...saved.data[chKey] };
            }
          }
          setData(merged);
          setSubmitted(Boolean(saved.submitted || saved.data?.submitted));
          setUpdatedAt(saved.updated_at || "");
        } else {
          setData(initialData);
          setSubmitted(false);
          setUpdatedAt("");
        }
        setHasFetched(true);
      })
      .catch(() => {});
  }, []);

  // ── Data Fetching ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (status === "unauthenticated") { router.push("/"); return; }
    if (status === "authenticated") {
      const approvalStatus = (session?.user as any)?.approvalStatus;
      const approvedCategories = (session?.user as any)?.approvedCategories || [];
      const approvedCategory = (session?.user as any)?.approvedCategory;

      const hasPermission = approvedCategories.includes('opening') ||
                          approvedCategories.includes('consulting') ||
                          approvedCategory === 'opening' ||
                          approvedCategory === 'consulting';

      if (!isMaster && (approvalStatus !== 'approved' || !hasPermission)) {
        toast.error("바른개원법 또는 바른컨설팅 승인 권한이 필요합니다.");
        router.push("/");
        return;
      }

      if (hasFetched) return;
      loadSurveyData(targetUserId || undefined);
    }
  }, [status, router, isMaster, hasFetched, targetUserId, loadSurveyData, session?.user?.email, (session?.user as any)?.approvalStatus, (session?.user as any)?.approvedCategory, JSON.stringify((session?.user as any)?.approvedCategories)]);

  // ── Auto-save (2.5초 디바운스) ─────────────────────────────────────────────
  const saveTimer = useRef<any>(null);
  const forceSaveNow = useCallback(async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus("saving");
    try {
      const query = isMaster && targetUserId ? `?userId=${encodeURIComponent(targetUserId)}` : "";
      await fetch(`/api/survey${query}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      setSaveStatus("saved");
      setUpdatedAt(new Date().toISOString());
      return true;
    } catch {
      setSaveStatus("unsaved");
      return false;
    }
  }, [data, isMaster, targetUserId]);

  useEffect(() => {
    if (isReadOnly || !hasFetched) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus("unsaved");
    saveTimer.current = setTimeout(() => {
      forceSaveNow();
    }, 2500);
    return () => clearTimeout(saveTimer.current);
  }, [data, isReadOnly, hasFetched, forceSaveNow]);

  // ── Progress Logic (재배치된 Part 1 ~ Part 6 기준) ────────────────────────
  const fillPct = useMemo(() => {
    const countPartFields = (values: string[]) => {
      const total = values.length;
      const filled = values.filter(v => typeof v === "string" && v.trim().length > 0).length;
      return { filled, total, ratio: total === 0 ? 0 : filled / total };
    };

    const p1 = countPartFields([
      data.ch1.name, data.ch1.degree, data.ch1.intro, data.ch1.mbti,
      data.ch1.clinicPride, data.ch1.desiredLeader, data.ch1.philosophy,
      data.ch1.vision, data.ch1.actionStep, data.ch1.weakness
    ]);
    const p2 = countPartFields([
      data.ch2.addressHours, data.ch2.clinicSize, data.ch2.patientFlow,
      data.ch2.consultScript, data.ch2.herbConsultProcess, data.ch1.whyCome,
      data.ch1.whyLeave, data.ch2.happyCallSystem, data.ch2.herbInstructions,
      data.ch2.herbManagementSystem
    ]);
    const p3 = countPartFields([
      data.ch3.treatmentDefinition, data.ch3.equipmentDetail, data.ch3.patientQna,
      data.ch3.diseasePlans, data.ch3.mskExample,
      data.ch3.charting[0]?.case1 || "", data.ch3.charting[1]?.case1 || "", data.ch3.charting[2]?.case1 || "",
      data.ch3.billingRoutine, data.ch3.chunaRoutine, data.ch3.herbRecommendation, data.ch3.acupointRecommendation
    ]);
    const p4 = countPartFields([
      data.ch4.targetMetrics.revenue, data.ch4.targetMetrics.profit, data.ch4.targetMetrics.nonBenefit,
      data.ch4.targetMetrics.autoInsurance, data.ch4.targetMetrics.dailyPatients,
      data.ch4.workingDays, data.ch4.profitUsage, data.ch4.investmentHistory,
      data.ch4.growthInvestment, data.ch4.immediateInvestment, data.ch4.indicators
    ]);
    const p5 = countPartFields([
      data.ch5.staff[0]?.salary || "", data.ch5.staffCounts.desk, data.ch5.staffCounts.treatment,
      data.ch5.mealSnack.lunch, data.ch5.welfare, data.ch5.staffDiscount,
      data.ch5.idealStaff, data.ch5.expectations.manager, data.ch5.expectations.regular,
      data.ch5.expectations.communication, data.ch5.chatSystem.program, data.ch5.chatSystem.channels,
      data.ch5.eduMeeting
    ]);
    const safetyCheckedCount = Object.values(data.ch6.safetyItems || {}).filter(Boolean).length;
    const p6 = countPartFields([
      safetyCheckedCount > 0 ? "checked" : "",
      data.ch6.marketingStatus.channels, data.ch6.marketingStatus.cost,
      data.ch6.marketingStatus.goal, data.ch6.promoMaterials, data.ch6.finalGoal
    ]);

    const parts = [p1, p2, p3, p4, p5, p6];
    const chapters = parts.map(p => p.ratio);
    const total = Math.round((chapters.reduce((a, b) => a + b, 0) / 6) * 100);

    return { chapters, parts, total };
  }, [data]);

  const safetyPct = useMemo(() => {
    const checked = Object.values(data.ch6.safetyItems || {}).filter(Boolean).length;
    return Math.round((checked / SAFETY_ITEMS.length) * 100);
  }, [data.ch6.safetyItems]);

  const level = getLevel(fillPct.total);
  const radarData = CHAPTER_CONFIG.map((ch, i) => ({
    subject: ch.shortTitle,
    fill: Math.round(fillPct.chapters[i] * 100),
  }));

  const currentPartStats = fillPct.parts[step - 1];
  const remainingInPart = Math.max(0, currentPartStats.total - currentPartStats.filled);
  const estRemainingMinutes = Math.max(1, Math.ceil(remainingInPart * 0.4));

  const clinicMeta = {
    name: data.ch1.name || session?.user?.name || "원장",
    clinic: data.ch1.clinic || "우리 한의원",
    degree: data.ch1.degree || "",
  };

  const validateAndNext = async () => {
    await forceSaveNow();
    setStampStep(step);
    setTimeout(() => {
      setStampStep(null);
      if (step < 6) {
        setStep(s => s + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 650);
  };

  const handleSubmit = async () => {
    if (!confirm("작성하신 리얼 현황 데이터를 최종 제출하시겠습니까?\n(제출 후에도 언제든 내용을 보완·수정하실 수 있습니다.)")) return;
    try {
      await forceSaveNow();
      await fetch("/api/survey/submit", { method: "POST" });
      setSubmitted(true);
      setShowSuccess(true);
    } catch {
      toast.error("제출 실패");
    }
  };

  const handleCopyResumeLink = async () => {
    await forceSaveNow();
    const url = typeof window !== "undefined" ? `${window.location.origin}/survey` : "https://wealthywei.vercel.app/survey";
    const text = `[바른컨설팅 경영 진단 워크북 이어쓰기]\n• 원장님: ${clinicMeta.name} 원장님\n• 현재 보관 진행률: ${fillPct.total}% (Part ${step}/6 진행 중)\n• 이어쓰기 바로가기: ${url}`;
    await navigator.clipboard.writeText(text);
    toast.success("이어쓰기 링크와 진행 요약이 클립보드에 복사되었습니다! 카카오톡 '나와의 채팅'에 붙여넣어 보관하세요.");
  };

  const upd1 = (f: string, v: any) => setData(d => ({ ...d, ch1: { ...d.ch1, [f]: v } }));
  const upd2 = (f: string, v: any) => setData(d => ({ ...d, ch2: { ...d.ch2, [f]: v } }));
  const upd3 = (f: string, v: any) => setData(d => ({ ...d, ch3: { ...d.ch3, [f]: v } }));
  const upd4 = (f: string, v: any) => setData(d => ({ ...d, ch4: { ...d.ch4, [f]: v } }));
  const upd5 = (f: string, v: any) => setData(d => ({ ...d, ch5: { ...d.ch5, [f]: v } }));

  // ── Part 1: 원장님 브랜딩 & 경영 철학 (01 ~ 09) ───────────────────────────
  const renderCh1 = () => (
    <div className="space-y-8">
      <SCard id="card-0" badge="STEP 01 ~ 05" title="원장님 프로필 & 리더십 정체성" subtitle="가장 편안하게 원장님 본인의 이야기를 들려주세요">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <Lbl stepBadge="01-A">원장님 성함</Lbl>
            <Inp value={data.ch1.name} onChange={(v: string) => upd1("name", v)} placeholder="예: 홍길동" readOnly={isReadOnly} />
          </div>
          <div>
            <Lbl stepBadge="01-B">한의원명</Lbl>
            <Inp value={data.ch1.clinic} onChange={(v: string) => upd1("clinic", v)} placeholder="예: 바른한의원" readOnly={isReadOnly} />
          </div>
          <div>
            <Lbl stepBadge="01-C">학위 및 전문과목</Lbl>
            <Inp value={data.ch1.degree} onChange={(v: string) => upd1("degree", v)} placeholder="예: 한의학박사, 침구과 전문의" readOnly={isReadOnly} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-7 pt-4 border-t border-white/10">
          <div>
            <Lbl stepBadge="02" legacyQ="Q1" hint="포장하지 마시고 인턴, 레지던트, 부원장, 학회, 방송 등 실제 살아오신 이력을 있는 그대로 적어주세요.">
              상세 이력 및 프로필
            </Lbl>
            <STATextarea
              id="ch1-intro"
              fieldId="ch1.intro"
              questionLabel="상세 이력 및 프로필 (Q1)"
              value={data.ch1.intro}
              onChange={(v: string) => upd1("intro", v)}
              placeholder="사소한 약력이라도 현재 원장님이 걸어오신 실제 경력을 모두 적어주세요."
              rows={7}
              readOnly={isReadOnly}
              listeningId={listeningId}
              onMic={startSTT}
              masterMode={isMaster && masterCoachingMode}
              clinicMeta={clinicMeta}
            />
          </div>
          <div className="space-y-6">
            <div>
              <Lbl stepBadge="03" legacyQ="Q3-1" hint="원장님의 실제 성향에 맞는 리더십 코칭을 위해 활용됩니다.">
                원장님의 MBTI 성향
              </Lbl>
              <select
                value={data.ch1.mbti}
                onChange={e => upd1("mbti", e.target.value)}
                disabled={isReadOnly}
                className="w-full px-4 py-3 rounded-xl border border-white/12 bg-[#041810] text-[#F5F2EB] text-sm font-bold focus:ring-2 focus:ring-amber-400/30 outline-none"
              >
                <option value="">MBTI 유형 선택</option>
                {MBTI_LIST.map(m => <option key={m} value={m} className="bg-[#041810] text-white">{m}</option>)}
              </select>
            </div>
            <div>
              <Lbl stepBadge="04" legacyQ="Q9" hint="현재 환자분들이 실제로 좋아하시거나 우리 병원에서 가장 자신 있는 부분은 무엇인가요?">
                우리 병원만의 실제 자랑거리
              </Lbl>
              <STATextarea
                id="ch1-pride"
                fieldId="ch1.clinicPride"
                questionLabel="우리 병원만의 자랑거리 (Q9)"
                value={data.ch1.clinicPride}
                onChange={(v: string) => upd1("clinicPride", v)}
                placeholder="시설, 침 실력, 친절함, 입지 등 현재 실제로 강점이라고 느끼는 점을 적어주세요."
                rows={4}
                readOnly={isReadOnly}
                listeningId={listeningId}
                onMic={startSTT}
                masterMode={isMaster && masterCoachingMode}
                clinicMeta={clinicMeta}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-7 pt-4 border-t border-white/10">
          <div>
            <Lbl stepBadge="05" legacyQ="Q45" hint="직원들에게 어떤 원장님으로 기억되고 싶으신가요?">
              꿈꾸는 리더상
            </Lbl>
            <STATextarea
              id="ch1-leader"
              fieldId="ch1.desiredLeader"
              questionLabel="꿈꾸는 리더상 (Q45)"
              value={data.ch1.desiredLeader}
              onChange={(v: string) => upd1("desiredLeader", v)}
              placeholder="예: 기준이 명확한 원장, 소통이 잘 되는 원장 등 솔직한 바람을 적어주세요."
              rows={3}
              readOnly={isReadOnly}
              listeningId={listeningId}
              onMic={startSTT}
              masterMode={isMaster && masterCoachingMode}
              clinicMeta={clinicMeta}
            />
          </div>
          <div>
            <Lbl stepBadge="06" legacyQ="Q44" hint="현재 직원들을 대하고 관리할 때 실제로 적용하시는 기준이나 가치관은 무엇인가요?">
              현재 직원 관리 철학 및 방식
            </Lbl>
            <STATextarea
              id="ch1-philosophy"
              fieldId="ch1.philosophy"
              questionLabel="직원 관리 철학 (Q44)"
              value={data.ch1.philosophy}
              onChange={(v: string) => upd1("philosophy", v)}
              placeholder="현재 직원들을 어떻게 대하고 계신지 솔직하게 적어주세요."
              rows={3}
              readOnly={isReadOnly}
              listeningId={listeningId}
              onMic={startSTT}
              masterMode={isMaster && masterCoachingMode}
              clinicMeta={clinicMeta}
            />
          </div>
        </div>
      </SCard>

      <SCard id="card-1" badge="STEP 07 ~ 09" title="경영 비전 & 현재 병원의 리얼 고민" subtitle="잘 안 되고 있는 부분일수록 구체적으로 적어주셔야 정확한 진단이 가능합니다">
        <div>
          <Lbl stepBadge="07" legacyQ="Q2" hint="현재 운영 중인 병원의 1년~3년 뒤 목표와 비전을 편하게 적어주세요.">
            앞으로의 비전 / 미션 / 목표
          </Lbl>
          <STATextarea
            id="ch1-vision"
            fieldId="ch1.vision"
            questionLabel="앞으로의 비전/미션/목표 (Q2)"
            value={data.ch1.vision}
            onChange={(v: string) => upd1("vision", v)}
            placeholder="거창한 미사여구 없이 원장님이 진짜 원하시는 병원의 미래 모습을 적어주세요."
            rows={4}
            readOnly={isReadOnly}
            listeningId={listeningId}
            onMic={startSTT}
            masterMode={isMaster && masterCoachingMode}
            clinicMeta={clinicMeta}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-7 pt-4 border-t border-white/10">
          <div>
            <Lbl stepBadge="08" legacyQ="Q3-2" hint="목표 달성을 위해 우리 병원에서 지금 당장 바뀌어야 한다고 느끼는 점은 무엇인가요?">
              반드시 실행되어야 할 변화
            </Lbl>
            <STATextarea
              id="ch1-actionStep"
              fieldId="ch1.actionStep"
              questionLabel="반드시 실행되어야 할 변화 (Q3)"
              value={data.ch1.actionStep}
              onChange={(v: string) => upd1("actionStep", v)}
              placeholder="원장님이 느끼시기에 가장 시급하게 고쳐야 할 점들을 적어주세요."
              rows={5}
              readOnly={isReadOnly}
              listeningId={listeningId}
              onMic={startSTT}
              masterMode={isMaster && masterCoachingMode}
              clinicMeta={clinicMeta}
            />
          </div>
          <div>
            <Lbl stepBadge="09" legacyQ="Q4" hint="현재 병원 경영에서 가장 어렵고 막막하게 느껴지는 실제 문제점과 생각하시는 원인을 적어주세요.">
              현재 가장 부족한 점 및 원인 (핵심 고민)
            </Lbl>
            <STATextarea
              id="ch1-weakness"
              fieldId="ch1.weakness"
              questionLabel="부족한 점 및 원인/해결책 (Q4)"
              value={data.ch1.weakness}
              onChange={(v: string) => upd1("weakness", v)}
              placeholder="예: 초진은 오는데 재진 정착이 안 됨 / 한약 권유가 입에서 잘 안 떨어짐 / 직원 관리가 힘듦 등 리얼한 고민"
              rows={5}
              readOnly={isReadOnly}
              listeningId={listeningId}
              onMic={startSTT}
              masterMode={isMaster && masterCoachingMode}
              clinicMeta={clinicMeta}
            />
          </div>
        </div>
      </SCard>
    </div>
  );

  // ── Part 2: 공간 입지 & 환자 경험 여정 (10 ~ 19) ──────────────────────────
  const renderCh2 = () => (
    <div className="space-y-8">
      <SCard id="card-0" badge="STEP 10 ~ 11" title="입지 환경 & 병원 공간 규모" subtitle="병원의 물리적 환경과 운영 시간을 확인합니다">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
          <div>
            <Lbl stepBadge="10" legacyQ="Q30" hint="현재 병원 위치(상권 특징 포함 가능)와 요일별 실제 진료 시간을 적어주세요.">
              상세 주소 및 요일별 운영 시간
            </Lbl>
            <STATextarea
              id="ch2-addr"
              value={data.ch2.addressHours}
              onChange={(v: string) => upd2("addressHours", v)}
              placeholder="예: 서울시 강남구 OO동 (아파트 단지 앞) / 평일 09:00~19:00 (화·목 야간 21시), 토 09:00~14:00"
              rows={4}
              readOnly={isReadOnly}
              listeningId={listeningId}
              onMic={startSTT}
            />
          </div>
          <div className="space-y-4">
            <div>
              <Lbl stepBadge="11" legacyQ="Q42" hint="실평수, 진료실 수, 상담실 유무, 치료실 베드 수를 적어주세요.">
                병원 실평수 및 베드 수
              </Lbl>
              <Inp
                value={data.ch2.clinicSize}
                onChange={(v: string) => upd2("clinicSize", v)}
                placeholder="예: 실평수 45평 / 진료실 1, 상담실 1 / 일반베드 10개, 추나베드 1개"
                readOnly={isReadOnly}
              />
            </div>
            <div className="p-4 rounded-2xl bg-amber-400/10 border border-amber-400/20">
              <p className="text-[11px] font-black text-amber-300 mb-1">💡 리얼 현황 체크 포인트</p>
              <p className="text-xs text-white/70 leading-relaxed">
                별도의 독립 상담실이 있는지, 혹은 진료실이나 데스크에서 바로 상담·수납이 이루어지는지도 함께 적어주시면 동선 진단에 큰 도움이 됩니다.
              </p>
            </div>
          </div>
        </div>
      </SCard>

      <SCard id="card-1" badge="STEP 12 ~ 16" title="환자 내원 동선 & 초진 상담·이탈 리얼 분석" subtitle="환자가 문을 열고 들어와 나갈 때까지 실제로 벌어지는 일을 적어주세요">
        <div>
          <Lbl stepBadge="12" legacyQ="Q11" hint="이상적인 동선이 아니라, 현재 실제로 환자가 접수부터 수납 후 나갈 때까지 거치는 과정을 순서대로 적어주세요.">
            전체 환자 내원 동선 리허설 (현재 실제 상황)
          </Lbl>
          <STATextarea
            id="ch2-flow"
            fieldId="ch2.patientFlow"
            questionLabel="전체 환자 내원 동선 (Q11)"
            value={data.ch2.patientFlow}
            onChange={(v: string) => upd2("patientFlow", v)}
            placeholder="예: 데스크 접수 → 대기실 대기 → 원장실 진료(약 5분) → 치료실 핫팩·침·부항(약 40분) → 데스크 수납 후 귀가"
            rows={5}
            readOnly={isReadOnly}
            listeningId={listeningId}
            onMic={startSTT}
            masterMode={isMaster && masterCoachingMode}
            clinicMeta={clinicMeta}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-7 pt-4 border-t border-white/10">
          <div>
            <Lbl stepBadge="13" legacyQ="Q12" hint="초진 환자가 진료실에 앉았을 때 원장님이 평소 실제로 하시는 설명 멘트를 적어주세요.">
              초진 환자 진단/상담 실제 멘트
            </Lbl>
            <STATextarea
              id="ch2-script"
              fieldId="ch2.consultScript"
              questionLabel="초진 원장 진단/상담 멘트 (Q12)"
              value={data.ch2.consultScript}
              onChange={(v: string) => upd2("consultScript", v)}
              placeholder="실제 진료실에서 초진 환자에게 건네는 첫마디와 진단 설명 방식을 그대로 적어주세요."
              rows={5}
              readOnly={isReadOnly}
              listeningId={listeningId}
              onMic={startSTT}
              masterMode={isMaster && masterCoachingMode}
              clinicMeta={clinicMeta}
            />
          </div>
          <div>
            <Lbl stepBadge="14" legacyQ="Q15" hint="한약 상담 후 실제 결제까지 누가, 어디서, 어떻게 안내하고 있나요?">
              한약 상담 후 결제 유도 프로세스
            </Lbl>
            <STATextarea
              id="ch2-herbProcess"
              fieldId="ch2.herbConsultProcess"
              questionLabel="상담 후 결제 유도 시스템 (Q15)"
              value={data.ch2.herbConsultProcess}
              onChange={(v: string) => upd2("herbConsultProcess", v)}
              placeholder="예: 원장이 진료실에서 가격까지 다 말하고 데스크에서 결제만 함 / 실장이 따로 상담함 등 현재 방식"
              rows={5}
              readOnly={isReadOnly}
              listeningId={listeningId}
              onMic={startSTT}
              masterMode={isMaster && masterCoachingMode}
              clinicMeta={clinicMeta}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-7 pt-4 border-t border-white/10">
          <div>
            <Lbl stepBadge="15" legacyQ="Q5" hint="환자 입장에서 우리 병원에 내원하는 진짜 이유는 무엇이라고 생각하시나요?">
              환자들이 우리 병원에 오는 이유
            </Lbl>
            <STATextarea
              id="ch1-whyCome"
              fieldId="ch1.whyCome"
              questionLabel="환자들이 오는 이유 (Q5)"
              value={data.ch1.whyCome}
              onChange={(v: string) => upd1("whyCome", v)}
              placeholder="환자들이 실제로 느끼는 우리 병원의 매력이나 내원 동기"
              rows={4}
              readOnly={isReadOnly}
              listeningId={listeningId}
              onMic={startSTT}
              masterMode={isMaster && masterCoachingMode}
              clinicMeta={clinicMeta}
            />
          </div>
          <div>
            <Lbl stepBadge="16" legacyQ="Q6" hint="초진 후 재진을 안 오거나 치료를 중단하는 진짜 이유는 무엇이라고 생각하시나요?">
              환자들이 안 오거나 이탈하는 이유
            </Lbl>
            <STATextarea
              id="ch1-whyLeave"
              fieldId="ch1.whyLeave"
              questionLabel="환자들이 안 오는 이유 (Q6)"
              value={data.ch1.whyLeave}
              onChange={(v: string) => upd1("whyLeave", v)}
              placeholder="솔직하게 느끼시는 우리 병원의 약점이나 환자 이탈 포인트"
              rows={4}
              readOnly={isReadOnly}
              listeningId={listeningId}
              onMic={startSTT}
              masterMode={isMaster && masterCoachingMode}
              clinicMeta={clinicMeta}
            />
          </div>
        </div>
      </SCard>

      <SCard id="card-2" badge="STEP 17 ~ 19" title="해피콜 사후관리 & 한약 복용 안내 시스템" subtitle="치료 후 환자 관리 현황과 실제 안내 자료를 확인합니다">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
          <div className="space-y-6">
            <div>
              <Lbl stepBadge="17" legacyQ="Q31" hint="치료 후 안부 연락(전화/문자/카톡)을 실제로 어떻게 하고 계신가요? 안 하고 계시면 '미시행'이라고 적어주세요.">
                해피콜 운영 현황 (리얼 현황)
              </Lbl>
              <STATextarea
                id="ch2-happycall"
                fieldId="ch2.happyCallSystem"
                questionLabel="해피콜 운영 현황 (Q31)"
                value={data.ch2.happyCallSystem}
                onChange={(v: string) => upd2("happyCallSystem", v)}
                placeholder="예: 한약 환자에게만 수령 확인 문자 발송, 일반 침 환자는 따로 안 함 등"
                rows={3}
                readOnly={isReadOnly}
                listeningId={listeningId}
                onMic={startSTT}
                masterMode={isMaster && masterCoachingMode}
                clinicMeta={clinicMeta}
              />
            </div>
            <div>
              <Lbl stepBadge="18-A" legacyQ="Q32" hint="환자에게 한약 복용법과 주의사항을 전달하는 실제 과정을 적어주세요.">
                한약 복용법 안내 과정
              </Lbl>
              <STATextarea
                id="ch2-herbInst"
                value={data.ch2.herbInstructions}
                onChange={(v: string) => upd2("herbInstructions", v)}
                placeholder="예: 택배 상자에 종이 안내문 동봉 / 카톡으로 복용법 이미지 전송 등"
                rows={4}
                readOnly={isReadOnly}
                listeningId={listeningId}
                onMic={startSTT}
              />
            </div>
          </div>
          <div className="space-y-6">
            <FileUpload
              label="STEP 18-B. 현재 사용 중인 복용 안내문 파일 첨부 (Q32)"
              value={data.ch2.herbInstructionsFile}
              onUpload={(urls: string[]) => upd2("herbInstructionsFile", urls)}
              hint="현재 실제로 환자에게 나가는 복용 안내문(이미지/PDF/워드)이 있다면 그대로 올려주세요."
              disabled={isReadOnly}
            />
            <div>
              <Lbl stepBadge="19" legacyQ="Q33" hint="현재 사용 중인 전자차트(EMR) 및 원내/원외 탕전 관리 프로그램을 적어주세요.">
                한약 및 차트 관리 프로그램 종류
              </Lbl>
              <Inp
                value={data.ch2.herbManagementSystem}
                onChange={(v: string) => upd2("herbManagementSystem", v)}
                placeholder="예: 한차트, 오케이차트, 한의사랑, 동의보감 + OO원외탕전"
                readOnly={isReadOnly}
              />
            </div>
          </div>
        </div>
      </SCard>
    </div>
  );

  // ── Part 3: 임상 루틴 & 처방 시스템 (20 ~ 29) ─────────────────────────────
  const renderCh3 = () => (
    <div className="space-y-8">
      <SCard id="card-0" badge="STEP 20 ~ 21" title="치료 철학 & 보유 장비 현황" subtitle="원장님의 진료 철학과 현재 보유하신 치료·검사 인프라를 파악합니다">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
          <div>
            <Lbl stepBadge="20" legacyQ="Q8" hint="원장님이 평소 생각하시는 '치료'와 '경영'의 정의를 솔직하게 적어주세요.">
              치료와 경영의 정의
            </Lbl>
            <STATextarea
              id="ch3-treatmentDef"
              fieldId="ch3.treatmentDefinition"
              questionLabel="치료와 경영의 정의 (Q8)"
              value={data.ch3.treatmentDefinition}
              onChange={(v: string) => upd3("treatmentDefinition", v)}
              placeholder="정답은 없습니다. 원장님이 평소 느끼시는 치료와 경영에 대한 생각을 편하게 적어주세요."
              rows={5}
              readOnly={isReadOnly}
              listeningId={listeningId}
              onMic={startSTT}
              masterMode={isMaster && masterCoachingMode}
              clinicMeta={clinicMeta}
            />
          </div>
          <div>
            <Lbl stepBadge="21" legacyQ="Q7" hint="현재 원내에 보유 중인 물리치료 기기 및 검사 장비를 대수까지 적어주세요.">
              보유 물리치료 및 검사 기기 상세
            </Lbl>
            <STATextarea
              id="ch3-equip"
              value={data.ch3.equipmentDetail}
              onChange={(v: string) => upd3("equipmentDetail", v)}
              placeholder="예: ICT 6대, 초음파 2대, 무중력 감압기 1대, 인바디 1대, 수양명경락검사기 1대 등"
              rows={5}
              readOnly={isReadOnly}
              listeningId={listeningId}
              onMic={startSTT}
            />
          </div>
        </div>
      </SCard>

      <SCard id="card-1" badge="STEP 22 ~ 24" title="임상 응대 매뉴얼 & 질환별 치료 계획" subtitle="현재 매뉴얼이 없다면 '없음'이라고 솔직하게 적어주셔도 됩니다">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
          <div>
            <Lbl stepBadge="22-A" legacyQ="Q10" hint="환자들이 자주 묻는 질문(10~20가지)에 대한 직원 표준 답변 리스트가 정리되어 있나요?">
              환자 다빈도 Q&A 리스트 현황
            </Lbl>
            <STATextarea
              id="ch3-patientQna"
              value={data.ch3.patientQna}
              onChange={(v: string) => upd3("patientQna", v)}
              placeholder="표준 Q&A 매뉴얼 보유 여부와 환자들이 가장 자주 묻는 질문들을 적어주세요."
              rows={5}
              readOnly={isReadOnly}
              listeningId={listeningId}
              onMic={startSTT}
            />
          </div>
          <div>
            <FileUpload
              label="STEP 22-B. 환자 Q&A 매뉴얼 파일 제출 (Q10)"
              value={data.ch3.patientQnaFile}
              onUpload={(urls: string[]) => upd3("patientQnaFile", urls)}
              hint="보유 중인 응대 매뉴얼 파일이 있다면 업로드해주세요."
              disabled={isReadOnly}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-7 pt-4 border-t border-white/10">
          <div>
            <Lbl stepBadge="23" legacyQ="Q13" hint="질환별로 정해진 치료 기간·횟수 계획이 있나요? 실제로 환자에게 어떻게 안내하시나요?">
              질환별 표준 치료 계획 유무 및 현황
            </Lbl>
            <STATextarea
              id="ch3-diseasePlans"
              fieldId="ch3.diseasePlans"
              questionLabel="질환별 표준 치료 계획 (Q13)"
              value={data.ch3.diseasePlans}
              onChange={(v: string) => upd3("diseasePlans", v)}
              placeholder="예: 급성 요통은 주 3회씩 2주 오라고 함 / 특별히 정해진 횟수 없이 아플 때 오라고 함 등"
              rows={5}
              readOnly={isReadOnly}
              listeningId={listeningId}
              onMic={startSTT}
              masterMode={isMaster && masterCoachingMode}
              clinicMeta={clinicMeta}
            />
          </div>
          <div>
            <Lbl stepBadge="24" legacyQ="Q14" hint="주로 보시는 근골격계 환자에게 질환의 원인과 치료 경과를 설명하시는 실제 방식을 적어주세요.">
              근골격계 상담 실제 예시 (대표 질환 루틴)
            </Lbl>
            <STATextarea
              id="ch3-mskExample"
              value={data.ch3.mskExample}
              onChange={(v: string) => upd3("mskExample", v)}
              placeholder="환자에게 허리/목/어깨 통증의 원인과 치료 과정을 어떻게 설명하시는지 적어주세요."
              rows={5}
              readOnly={isReadOnly}
              listeningId={listeningId}
              onMic={startSTT}
            />
          </div>
        </div>
      </SCard>

      <SCard id="card-2" badge="STEP 25" title="대표 질환 3종 실제 차팅 & 처치 사례 (Q16)" subtitle="현재 실제로 가장 많이 보시는 3가지 질환의 처치와 청구 조합을 적어주세요">
        <div className="space-y-6">
          {data.ch3.charting.map((row, idx) => (
            <div key={idx} className="p-6 rounded-2xl bg-[#041810]/80 border border-white/10 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-400 text-[#031C13] flex items-center justify-center text-sm font-black">
                  0{idx + 1}
                </div>
                <div className="flex-1">
                  <Inp
                    value={row.disease}
                    onChange={(v: string) => {
                      const a = [...data.ch3.charting];
                      a[idx] = { ...a[idx], disease: v };
                      setData(d => ({ ...d, ch3: { ...d.ch3, charting: a } }));
                    }}
                    placeholder="사례 질환명 (예: 경추통 / 급성 요부염좌 / 슬관절염)"
                    readOnly={isReadOnly}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <Lbl hint="주로 사용하는 침/전침 술기 및 청구 항목">침 / 전침</Lbl>
                  <STATextarea
                    value={row.case1}
                    onChange={(v: string) => {
                      const a = [...data.ch3.charting];
                      a[idx] = { ...a[idx], case1: v };
                      setData(d => ({ ...d, ch3: { ...d.ch3, charting: a } }));
                    }}
                    placeholder="예: 경혈침 + 관절내침 + 전침"
                    rows={3}
                    readOnly={isReadOnly}
                  />
                </div>
                <div>
                  <Lbl hint="부항/뜸 등 부수 처치 및 청구 항목">부항 / 뜸</Lbl>
                  <STATextarea
                    value={row.case2}
                    onChange={(v: string) => {
                      const a = [...data.ch3.charting];
                      a[idx] = { ...a[idx], case2: v };
                      setData(d => ({ ...d, ch3: { ...d.ch3, charting: a } }));
                    }}
                    placeholder="예: 습식부항(자락관법) 또는 건식유관법 + 간접구"
                    rows={3}
                    readOnly={isReadOnly}
                  />
                </div>
                <div>
                  <Lbl hint="물리치료 및 비급여/특수 처치 항목">물리치료 / 약침 / 기타</Lbl>
                  <STATextarea
                    value={row.case3}
                    onChange={(v: string) => {
                      const a = [...data.ch3.charting];
                      a[idx] = { ...a[idx], case3: v };
                      setData(d => ({ ...d, ch3: { ...d.ch3, charting: a } }));
                    }}
                    placeholder="예: 경피적외선 + ICT + 중성어혈약침"
                    rows={3}
                    readOnly={isReadOnly}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </SCard>

      <SCard id="card-3" badge="STEP 26 ~ 29" title="청구 · 추나 · 한약 · 약침 권유 리얼 루틴" subtitle="현재 진료실에서 실제로 이루어지는 처방 권유 방식을 적어주세요">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
          <div>
            <Lbl stepBadge="26" legacyQ="Q17" hint="질환별로 주로 묶어서 청구하시는 루틴 세트 방식이 있나요?">
              질환별 루틴 청구법
            </Lbl>
            <STATextarea
              id="ch3-billing"
              value={data.ch3.billingRoutine}
              onChange={(v: string) => upd3("billingRoutine", v)}
              placeholder="예: 초진 통침+건식부항+ICT / 재진 격일 자락관법 교차 청구 등"
              rows={4}
              readOnly={isReadOnly}
              listeningId={listeningId}
              onMic={startSTT}
            />
          </div>
          <div>
            <Lbl stepBadge="27" legacyQ="Q18" hint="추나 치료 시 시술 전후 정해진 루틴이나 소요 시간, 권유 기준이 있나요?">
              추나 치료 루틴 (전/후 과정)
            </Lbl>
            <STATextarea
              id="ch3-chuna"
              value={data.ch3.chunaRoutine}
              onChange={(v: string) => upd3("chunaRoutine", v)}
              placeholder="추나 시행 여부 및 시술 전후 과정, 현재 하루 평균 추나 건수 등"
              rows={4}
              readOnly={isReadOnly}
              listeningId={listeningId}
              onMic={startSTT}
            />
          </div>
          <div>
            <Lbl stepBadge="28" legacyQ="Q19" hint="환자에게 질병 치료 관점에서 한약이 왜 필요한지 실제로 어떻게 설명하시나요?">
              한약 치료 필요성 실제 설명 멘트
            </Lbl>
            <STATextarea
              id="ch3-herbRec"
              fieldId="ch3.herbRecommendation"
              questionLabel="한약 치료 필요성 설명 예시 (Q19)"
              value={data.ch3.herbRecommendation}
              onChange={(v: string) => upd3("herbRecommendation", v)}
              placeholder="실제로 환자에게 한약을 권할 때 하시는 말씀이나 권유가 안 되는 상황을 적어주세요."
              rows={5}
              readOnly={isReadOnly}
              listeningId={listeningId}
              onMic={startSTT}
              masterMode={isMaster && masterCoachingMode}
              clinicMeta={clinicMeta}
            />
          </div>
          <div>
            <Lbl stepBadge="29" legacyQ="Q21" hint="비급여 약침의 효능과 비용 안내, 권유를 실제로 어떻게 하고 계신가요?">
              약침 권유 및 효능 설명 루틴
            </Lbl>
            <STATextarea
              id="ch3-acupointRec"
              fieldId="ch3.acupointRecommendation"
              questionLabel="약침 권유 및 효능 설명 루틴 (Q21)"
              value={data.ch3.acupointRecommendation}
              onChange={(v: string) => upd3("acupointRecommendation", v)}
              placeholder="사용 중인 약침 종류, 1회/패키지 비용, 환자에게 권유하는 실제 멘트를 적어주세요."
              rows={5}
              readOnly={isReadOnly}
              listeningId={listeningId}
              onMic={startSTT}
              masterMode={isMaster && masterCoachingMode}
              clinicMeta={clinicMeta}
            />
          </div>
        </div>
      </SCard>
    </div>
  );

  // ── Part 4: 경영 지표 & 재무 투자 (30 ~ 37) ───────────────────────────────
  const renderCh4 = () => (
    <div className="space-y-8">
      <SCard id="card-0" badge="STEP 30 ~ 32" title="희망 경영 목표 수치 (5대 핵심 KPI) & 수익 계획" subtitle="원장님이 도달하고 싶은 구체적인 목표 숫자를 입력해주세요">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { f: "revenue", stepNo: "30-A", label: "월 총 매출 목표 (Q22)", hint: "급여+비급여+자보 합산 목표액", ph: "예: 7,000만 원" },
            { f: "profit", stepNo: "30-B", label: "월 순이익 목표 (Q22)", hint: "모든 경비 제외 후 원장님 순수익", ph: "예: 3,000만 원" },
            { f: "nonBenefit", stepNo: "30-C", label: "비급여 매출 목표 (Q22)", hint: "한약/약침/비급여 추나 등", ph: "예: 2,500만 원" },
            { f: "autoInsurance", stepNo: "30-D", label: "자동차보험 매출 목표 (Q22)", hint: "월 자보 청구 목표액", ph: "예: 1,500만 원" },
            { f: "dailyPatients", stepNo: "30-E", label: "일평균 환자 수 목표 (Q22)", hint: "하루 평균 내원 목표 인원", ph: "예: 55명" },
            { f: "workingDays", stepNo: "31", label: "희망 진료 일수/시간 (Q26)", hint: "원하시는 주당 근무 일수", ph: "예: 주 5일 (09:30~19:00)" },
          ].map(({ f, stepNo, label, hint, ph }) => (
            <div key={f}>
              <Lbl stepBadge={stepNo} hint={hint}>{label}</Lbl>
              <Inp
                value={f === "workingDays" ? data.ch4.workingDays : data.ch4.targetMetrics[f as keyof typeof data.ch4.targetMetrics]}
                onChange={(v: string) => {
                  if (f === "workingDays") upd4("workingDays", v);
                  else setData(d => ({ ...d, ch4: { ...d.ch4, targetMetrics: { ...d.ch4.targetMetrics, [f]: v } } }));
                }}
                placeholder={ph}
                readOnly={isReadOnly}
              />
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-white/10">
          <Lbl stepBadge="32" legacyQ="Q23" hint="목표하신 순이익이 발생했을 때 어떻게 배분·관리·재투자하실 계획인가요?">
            순이익 배분 및 사용 계획
          </Lbl>
          <STATextarea
            id="ch4-usage"
            fieldId="ch4.profitUsage"
            questionLabel="순이익 사용 계획 (Q23)"
            value={data.ch4.profitUsage}
            onChange={(v: string) => upd4("profitUsage", v)}
            placeholder="대출 상환, 저축, 병원 재투자, 직원 인센티브 등 구체적인 자금 활용 계획을 적어주세요."
            rows={4}
            readOnly={isReadOnly}
            listeningId={listeningId}
            onMic={startSTT}
            masterMode={isMaster && masterCoachingMode}
            clinicMeta={clinicMeta}
          />
        </div>
      </SCard>

      <SCard id="card-1" badge="STEP 33 ~ 35" title="초기 투자금 회수 현황 & 성장 투자 여력" subtitle="현재 병원의 재무 상태와 성장 투자 가능 범위를 솔직하게 알려주세요">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
          <div>
            <Lbl stepBadge="33" legacyQ="Q28" hint="병원 개원(또는 인수) 시 총 투자금과 현재까지 회수/상환된 금액은 얼마인가요?">
              개설 투자금 및 회수/대출 현황
            </Lbl>
            <STATextarea
              id="ch4-invHist"
              value={data.ch4.investmentHistory}
              onChange={(v: string) => upd4("investmentHistory", v)}
              placeholder="예: 총 3.5억 투자 (닥터론 2.5억 포함), 현재 잔여 대출 1.8억, 월 원리금 400만 원 상환 중"
              rows={4}
              readOnly={isReadOnly}
              listeningId={listeningId}
              onMic={startSTT}
            />
          </div>
          <div>
            <Lbl stepBadge="34" legacyQ="Q24" hint="병원 성장을 위해 매달 추가로 지출 가능한 마케팅/시스템 비용 한도는 어느 정도인가요?">
              월간 추가 성장 투자 의사
            </Lbl>
            <STATextarea
              id="ch4-growthInv"
              value={data.ch4.growthInvestment}
              onChange={(v: string) => upd4("growthInvestment", v)}
              placeholder="예: 확실한 매출 상승 근거가 있다면 월 200~400만 원 추가 투입 가능"
              rows={4}
              readOnly={isReadOnly}
              listeningId={listeningId}
              onMic={startSTT}
            />
          </div>
        </div>
        <div className="pt-4 border-t border-white/10">
          <Lbl stepBadge="35" legacyQ="Q25" hint="빠른 성장을 위해 지금 당장 가용할 수 있는 여유 투자금이 있으신가요?">
            즉시 투입 가능 여유 자금
          </Lbl>
          <Inp
            value={data.ch4.immediateInvestment}
            onChange={(v: string) => upd4("immediateInvestment", v)}
            placeholder="예: 1,500만 원 / 현재 여유자금 없음 등 솔직하게 기재"
            readOnly={isReadOnly}
          />
        </div>
      </SCard>

      <SCard id="card-2" badge="STEP 36 ~ 37" title="핵심 관찰 지표 & 월평균 실제 경비 명세" subtitle="현재 관리 중인 숫자와 매월 나가는 실제 비용을 점검합니다">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
          <div>
            <Lbl stepBadge="36-A" legacyQ="Q27" hint="현재 매일/매주 확인하시는 지표(신환수, 재진수, 매출 등)가 있나요? 따로 안 보고 계시면 없다고 적어주세요.">
              원내 관찰 지표 및 관리 방법
            </Lbl>
            <STATextarea
              id="ch4-ind"
              fieldId="ch4.indicators"
              questionLabel="관찰 지표 및 관리 방법 (Q27)"
              value={data.ch4.indicators}
              onChange={(v: string) => upd4("indicators", v)}
              placeholder="예: 매일 퇴근 전 차트에서 일매출만 확인함 / 엑셀로 초진 경로와 재진율을 기록 중 등"
              rows={5}
              readOnly={isReadOnly}
              listeningId={listeningId}
              onMic={startSTT}
              masterMode={isMaster && masterCoachingMode}
              clinicMeta={clinicMeta}
            />
          </div>
          <div>
            <FileUpload
              label="STEP 36-B. 현재 사용 중인 지표 관리 엑셀/양식 첨부 (Q27)"
              value={data.ch4.indicatorsFile}
              onUpload={(urls: string[]) => upd4("indicatorsFile", urls)}
              hint="평소 기록하시는 매출장부나 엑셀 시트가 있다면 업로드해주세요."
              disabled={isReadOnly}
            />
          </div>
        </div>

        <div className="pt-4 border-t border-white/10">
          <Lbl stepBadge="37" legacyQ="Q29" hint="현재 한 달 평균 지출되는 고정비/변동비 내역을 알고 계신 범위 내에서 적어주세요.">
            월평균 경비 지출 내역 상세
          </Lbl>
          <div className="overflow-x-auto mt-3 p-5 bg-[#041810]/80 rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 pr-4 font-black text-amber-300 text-xs uppercase">경비 항목 (Q29)</th>
                  <th className="text-left py-3 pr-4 font-black text-amber-300 text-xs uppercase">월 평균 금액 (단위: 만 원)</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {data.ch4.expenses.map((row, idx) => (
                  <tr key={idx} className="border-b border-white/5 last:border-0">
                    <td className="py-3 pr-4">
                      <Inp
                        value={row.item}
                        onChange={(v: string) => {
                          const a = [...data.ch4.expenses];
                          a[idx] = { ...a[idx], item: v };
                          setData(d => ({ ...d, ch4: { ...d.ch4, expenses: a } }));
                        }}
                        placeholder="예: 임대료 / 인건비 / 한약재·원외탕전비 / 마케팅비"
                        readOnly={isReadOnly}
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <Inp
                        value={row.amount}
                        onChange={(v: string) => {
                          const a = [...data.ch4.expenses];
                          a[idx] = { ...a[idx], amount: v };
                          setData(d => ({ ...d, ch4: { ...d.ch4, expenses: a } }));
                        }}
                        placeholder="예: 450"
                        type="text"
                        readOnly={isReadOnly}
                      />
                    </td>
                    <td className="py-3 text-right">
                      {!isReadOnly && data.ch4.expenses.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const a = data.ch4.expenses.filter((_, i) => i !== idx);
                            setData(d => ({ ...d, ch4: { ...d.ch4, expenses: a } }));
                          }}
                          className="p-2 text-white/30 hover:text-rose-400"
                        >
                          <X size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!isReadOnly && (
              <button
                type="button"
                onClick={() => setData(d => ({ ...d, ch4: { ...d.ch4, expenses: [...d.ch4.expenses, { item: "", amount: "" }] } }))}
                className="mt-4 px-5 py-2.5 text-xs font-black text-amber-300 bg-amber-400/10 rounded-xl hover:bg-amber-400/20 transition-all border border-amber-400/30 flex items-center gap-2"
              >
                <PlusCircle size={14} /> 경비 항목 추가하기
              </button>
            )}
          </div>
        </div>
      </SCard>
    </div>
  );

  // ── Part 5: 조직 문화 & 팀 빌딩 (38 ~ 47) ─────────────────────────────────
  const renderCh5 = () => (
    <div className="space-y-8">
      <SCard id="card-0" badge="STEP 38 ~ 39" title="직원 구성 · 급여 처우 & 파트별 인원" subtitle="현재 함께 근무 중인 직원분들의 실제 근무 조건과 인원 구성을 적어주세요">
        <div className="overflow-x-auto p-5 bg-[#041810]/80 rounded-2xl border border-white/10">
          <Lbl stepBadge="38" legacyQ="Q34" hint="현재 근무 중인 직원분들의 직책, 월 급여(실수령/세전 여부 포함 가능), 근무일, 시간, 인센티브 유무를 적어주세요.">
            상세 직원 처우 리스트
          </Lbl>
          <table className="w-full text-sm mt-3">
            <thead>
              <tr className="border-b border-white/10">
                {["직책/담당", "월 급여(만 원)", "근무일", "근무시간", "인센티브 조건"].map(h => (
                  <th key={h} className="text-left py-3 pr-2 font-black text-amber-300 text-xs uppercase">{h}</th>
                ))}
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {data.ch5.staff.map((row, idx) => (
                <tr key={idx} className="border-b border-white/5 last:border-0">
                  <td className="py-3 pr-2"><Inp value={row.role} onChange={(v: string) => { const a = [...data.ch5.staff]; a[idx] = { ...a[idx], role: v }; setData(d => ({ ...d, ch5: { ...d.ch5, staff: a } })); }} placeholder="실장" readOnly={isReadOnly} /></td>
                  <td className="py-3 pr-2"><Inp value={row.salary} onChange={(v: string) => { const a = [...data.ch5.staff]; a[idx] = { ...a[idx], salary: v }; setData(d => ({ ...d, ch5: { ...d.ch5, staff: a } })); }} placeholder="예: 실수령 280" readOnly={isReadOnly} /></td>
                  <td className="py-3 pr-2"><Inp value={row.days} onChange={(v: string) => { const a = [...data.ch5.staff]; a[idx] = { ...a[idx], days: v }; setData(d => ({ ...d, ch5: { ...d.ch5, staff: a } })); }} placeholder="주 5일" readOnly={isReadOnly} /></td>
                  <td className="py-3 pr-2"><Inp value={row.hours} onChange={(v: string) => { const a = [...data.ch5.staff]; a[idx] = { ...a[idx], hours: v }; setData(d => ({ ...d, ch5: { ...d.ch5, staff: a } })); }} placeholder="09:00-19:00" readOnly={isReadOnly} /></td>
                  <td className="py-3 pr-2"><Inp value={row.incentive} onChange={(v: string) => { const a = [...data.ch5.staff]; a[idx] = { ...a[idx], incentive: v }; setData(d => ({ ...d, ch5: { ...d.ch5, staff: a } })); }} placeholder="없음 / 비급여 3%" readOnly={isReadOnly} /></td>
                  <td className="py-3">
                    {!isReadOnly && data.ch5.staff.length > 1 && (
                      <button type="button" onClick={() => setData(d => ({ ...d, ch5: { ...d.ch5, staff: d.ch5.staff.filter((_, i) => i !== idx) } }))} className="p-1.5 text-white/30 hover:text-rose-400">
                        <X size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isReadOnly && (
            <button
              type="button"
              onClick={() => setData(d => ({ ...d, ch5: { ...d.ch5, staff: [...d.ch5.staff, { role: "", salary: "", days: "", hours: "", incentive: "" }] } }))}
              className="mt-4 px-5 py-2.5 text-xs font-black text-amber-300 bg-amber-400/10 rounded-xl hover:bg-amber-400/20 transition-all border border-amber-400/30"
            >
              + 직원 행 추가하기
            </button>
          )}
        </div>

        <div className="pt-4 border-t border-white/10">
          <Lbl stepBadge="39" legacyQ="Q43" hint="현재 각 파트별로 배치된 실제 근무 인원수를 적어주세요.">
            파트별 현재 근무 인원수
          </Lbl>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-3">
            {[
              { f: "desk", label: "데스크/상담 인원" },
              { f: "treatment", label: "치료실 인원" },
              { f: "decoction", label: "탕전실 인원" },
              { f: "other", label: "부원장/기타 인원" },
            ].map(({ f, label }) => (
              <div key={f}>
                <Lbl>{label}</Lbl>
                <Inp
                  value={data.ch5.staffCounts[f as keyof typeof data.ch5.staffCounts]}
                  onChange={(v: string) => setData(d => ({ ...d, ch5: { ...d.ch5, staffCounts: { ...d.ch5.staffCounts, [f]: v } } }))}
                  placeholder="예: 2명"
                  readOnly={isReadOnly}
                />
              </div>
            ))}
          </div>
        </div>
      </SCard>

      <SCard id="card-1" badge="STEP 40 ~ 42" title="식사 · 복리후생 & 직원 할인 규정" subtitle="현재 실제로 제공하고 계신 식대와 복지 혜택을 적어주세요">
        <div>
          <Lbl stepBadge="40" legacyQ="Q35~38" hint="점심, 야간식사, 간식 제공 방식과 원장님이 직원들과 함께 식사하시는지 여부를 적어주세요.">
            식사 및 간식 문화 현황
          </Lbl>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-3">
            {[
              { f: "lunch", label: "점심 식사 (Q37)", ph: "예: 도시락 / 식대 월 15만" },
              { f: "nightMeal", label: "야간 식사 (Q35)", ph: "예: 법인카드 배달 결제" },
              { f: "snack", label: "간식 제공 (Q36)", ph: "예: 월 10만 원 간식비" },
              { f: "eatTogether", label: "원장과 식사 여부 (Q38)", ph: "예: 각자 식사 / 주 1회 함께" },
            ].map(({ f, label, ph }) => (
              <div key={f}>
                <Lbl>{label}</Lbl>
                <Inp
                  value={data.ch5.mealSnack[f as keyof typeof data.ch5.mealSnack]}
                  onChange={(v: string) => setData(d => ({ ...d, ch5: { ...d.ch5, mealSnack: { ...d.ch5.mealSnack, [f]: v } } }))}
                  placeholder={ph}
                  readOnly={isReadOnly}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-7 pt-4 border-t border-white/10">
          <div>
            <Lbl stepBadge="41" legacyQ="Q39, 40" hint="연차, 유니폼, 명절 상여, 경조사비, 퇴직금 등 현재 제공 중인 복지 제도를 적어주세요.">
              현재 복지 혜택 상세
            </Lbl>
            <STATextarea
              id="ch5-welfare"
              value={data.ch5.welfare}
              onChange={(v: string) => upd5("welfare", v)}
              placeholder="현재 시행 중인 복지 혜택을 있는 그대로 적어주세요."
              rows={4}
              readOnly={isReadOnly}
              listeningId={listeningId}
              onMic={startSTT}
            />
          </div>
          <div>
            <Lbl stepBadge="42" legacyQ="Q41" hint="직원 본인이나 가족, 지인이 내원했을 때 진료비·한약 할인 규정이 어떻게 되나요?">
              직원 본인 및 지인 할인 혜택
            </Lbl>
            <STATextarea
              id="ch5-discount"
              value={data.ch5.staffDiscount}
              onChange={(v: string) => upd5("staffDiscount", v)}
              placeholder="예: 직원 본인 침 무료·한약 50% / 직계가족 30% / 따로 정해진 규정 없음 등"
              rows={4}
              readOnly={isReadOnly}
              listeningId={listeningId}
              onMic={startSTT}
            />
          </div>
        </div>
      </SCard>

      <SCard id="card-2" badge="STEP 43 ~ 44" title="인재상 & 직책별 역할 기대치 · 면담 주기" subtitle="원장님이 직원들에게 바라는 역할과 실제 면담 주기를 확인합니다">
        <div>
          <Lbl stepBadge="43" legacyQ="Q46" hint="어떤 성향과 태도를 가진 직원과 일할 때 가장 만족스러우신가요?">
            함께 일하고 싶은 인재상
          </Lbl>
          <STATextarea
            id="ch5-idealStaff"
            fieldId="ch5.idealStaff"
            questionLabel="함께 일하고 싶은 인재상 (Q46)"
            value={data.ch5.idealStaff}
            onChange={(v: string) => upd5("idealStaff", v)}
            placeholder="원장님이 가장 선호하시는 직원 스타일을 적어주세요."
            rows={4}
            readOnly={isReadOnly}
            listeningId={listeningId}
            onMic={startSTT}
            masterMode={isMaster && masterCoachingMode}
            clinicMeta={clinicMeta}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-white/10">
          <div>
            <Lbl stepBadge="44-A" legacyQ="Q47" hint="실장/팀장에게 기대하는 핵심 역할">
              중간관리자(실장) 역할 기대치
            </Lbl>
            <STATextarea
              id="ch5-managerExp"
              value={data.ch5.expectations.manager}
              onChange={(v: string) => setData(d => ({ ...d, ch5: { ...d.ch5, expectations: { ...d.ch5.expectations, manager: v } } }))}
              placeholder="실장에게 바라는 역할과 현재 아쉬운 점"
              rows={4}
              readOnly={isReadOnly}
              listeningId={listeningId}
              onMic={startSTT}
            />
          </div>
          <div>
            <Lbl stepBadge="44-B" legacyQ="Q47" hint="일반 직원들에게 기대하는 핵심 역할">
              일반 직원 역할 기대치
            </Lbl>
            <STATextarea
              id="ch5-regularExp"
              value={data.ch5.expectations.regular}
              onChange={(v: string) => setData(d => ({ ...d, ch5: { ...d.ch5, expectations: { ...d.ch5.expectations, regular: v } } }))}
              placeholder="치료실/데스크 직원에게 바라는 기본 태도와 업무"
              rows={4}
              readOnly={isReadOnly}
              listeningId={listeningId}
              onMic={startSTT}
            />
          </div>
          <div>
            <Lbl stepBadge="44-C" legacyQ="Q47" hint="현재 직원들과 정기 면담을 하고 계신가요?">
              직원 면담/소통 주기 및 방식
            </Lbl>
            <STATextarea
              id="ch5-commExp"
              value={data.ch5.expectations.communication}
              onChange={(v: string) => setData(d => ({ ...d, ch5: { ...d.ch5, expectations: { ...d.ch5.expectations, communication: v } } }))}
              placeholder="예: 연봉협상 때만 1년에 1번 면담 / 분기별 1:1 면담 등"
              rows={4}
              readOnly={isReadOnly}
              listeningId={listeningId}
              onMic={startSTT}
            />
          </div>
        </div>
      </SCard>

      <SCard id="card-3" badge="STEP 45 ~ 47" title="원내 메신저 소통 & 교육·회의 시스템" subtitle="현재 원내 단톡방 운영 현황과 교육 자료를 확인합니다">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
          <div>
            <Lbl stepBadge="45-A" legacyQ="Q48" hint="평소 직원들과 업무 소통에 사용하는 메신저는 무엇인가요?">
              주 사용 소통 프로그램
            </Lbl>
            <Inp
              value={data.ch5.chatSystem.program}
              onChange={(v: string) => setData(d => ({ ...d, ch5: { ...d.ch5, chatSystem: { ...d.ch5.chatSystem, program: v } } }))}
              placeholder="예: 카카오톡, 잔디, 슬랙, 네이버웍스"
              readOnly={isReadOnly}
            />
          </div>
          <div>
            <Lbl stepBadge="45-B" legacyQ="Q49" hint="현재 생성되어 있는 단톡방 종류와 방별 용도를 적어주세요.">
              채팅방 구분 및 활용 목적
            </Lbl>
            <Inp
              value={data.ch5.chatSystem.channels}
              onChange={(v: string) => setData(d => ({ ...d, ch5: { ...d.ch5, chatSystem: { ...d.ch5.chatSystem, channels: v } } }))}
              placeholder="예: 전체 공지방 1개만 운영 중 / 공지방·진료방·탕전방 분리 운영"
              readOnly={isReadOnly}
            />
          </div>
        </div>

        <div className="p-6 bg-[#041810]/80 rounded-2xl border border-white/10">
          <Lbl stepBadge="45-C" legacyQ="Q49" hint="현재 운영 중인 단톡방 목록 캡처와 실제 대화 예시 캡처가 있다면 업로드해주세요.">
            채팅 소통 시스템 증빙 자료 (최대 3개)
          </Lbl>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-4">
            <FileUpload
              label="캡처 1: 전체 채널 목록"
              value={data.ch5.chatSystem.capture1 || ""}
              onUpload={(urls: string[]) => setData(d => ({ ...d, ch5: { ...d.ch5, chatSystem: { ...d.ch5.chatSystem, capture1: urls[0] || "" } } }))}
              disabled={isReadOnly}
            />
            <FileUpload
              label="캡처 2: 실제 업무 대화 예시"
              value={data.ch5.chatSystem.capture2 || ""}
              onUpload={(urls: string[]) => setData(d => ({ ...d, ch5: { ...d.ch5, chatSystem: { ...d.ch5.chatSystem, capture2: urls[0] || "" } } }))}
              disabled={isReadOnly}
            />
            <FileUpload
              label="소통 규칙/가이드라인 문서"
              value={data.ch5.chatSystem.guideFile || ""}
              onUpload={(urls: string[]) => setData(d => ({ ...d, ch5: { ...d.ch5, chatSystem: { ...d.ch5.chatSystem, guideFile: urls[0] || "" } } }))}
              disabled={isReadOnly}
            />
          </div>
        </div>

        <div className="pt-4 border-t border-white/10 space-y-6">
          <div>
            <Lbl stepBadge="46" legacyQ="Q50" hint="현재 정기적인 직원 교육이나 회의를 진행하고 계신가요? 안 하고 계시면 '미진행'이라고 적어주세요.">
              원내 교육 및 회의 주기/방식
            </Lbl>
            <STATextarea
              id="ch5-eduMeeting"
              fieldId="ch5.eduMeeting"
              questionLabel="원내 교육/회의 시스템 (Q50)"
              value={data.ch5.eduMeeting}
              onChange={(v: string) => upd5("eduMeeting", v)}
              placeholder="예: 따로 정기 회의 없음 / 매월 첫째 주 월요일 점심시간 30분 회의 등"
              rows={4}
              readOnly={isReadOnly}
              listeningId={listeningId}
              onMic={startSTT}
              masterMode={isMaster && masterCoachingMode}
              clinicMeta={clinicMeta}
            />
          </div>
          <div className="p-6 bg-[#041810]/80 rounded-2xl border border-white/10">
            <Lbl stepBadge="47" legacyQ="Q51" hint="현재 병원에서 신입 직원 교육용으로 쓰는 자료나 매뉴얼이 있다면 첨부해주세요 (최대 3개).">
              원내 보유 교육 자료 첨부
            </Lbl>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-4">
              {[0, 1, 2].map(idx => (
                <FileUpload
                  key={idx}
                  label={`교육 자료 ${idx + 1}`}
                  value={data.ch5.eduMaterials[idx] || ""}
                  onUpload={(urls: string[]) => {
                    const a = [...data.ch5.eduMaterials];
                    a[idx] = urls[0] || "";
                    setData(d => ({ ...d, ch5: { ...d.ch5, eduMaterials: a } }));
                  }}
                  disabled={isReadOnly}
                />
              ))}
            </div>
          </div>
        </div>
      </SCard>
    </div>
  );

  // ── Part 6: 안전 리스크 & 마케팅 비전 (48 ~ 51) ───────────────────────────
  const renderCh6 = () => (
    <div className="space-y-8">
      <SCard id="card-0" badge="STEP 48" title="원내 18대 안전·보안·비상 대응 체크리스트 (Q52)" subtitle="현재 실제로 매뉴얼이 구비되어 있고 교육이 완료된 항목만 솔직하게 체크해주세요">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5 p-5 rounded-2xl bg-[#041810] border border-amber-400/25">
            <div>
              <p className="text-xs font-black text-amber-300 uppercase tracking-wider">SAFETY SYSTEM REAL CHECK</p>
              <p className="text-sm text-[#F5F2EB] font-bold mt-0.5">
                전체 {SAFETY_ITEMS.length}개 필수 안전 항목 중 현재 보유: <span className="text-amber-400 font-black">{Object.values(data.ch6.safetyItems).filter(Boolean).length}개 ({safetyPct}%)</span>
              </p>
            </div>
            <div className="w-full sm:w-56 bg-white/10 rounded-full h-3 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 rounded-full transition-all duration-700" style={{ width: `${safetyPct}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SAFETY_ITEMS.map(item => {
              const isChecked = data.ch6.safetyItems[item];
              const fileUrl = data.ch6.safetyFiles[item];
              return (
                <div key={item} className={`p-4 rounded-2xl border transition-all ${isChecked ? "border-amber-400/60 bg-amber-400/10" : "border-white/10 bg-[#041810]/60"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      disabled={isReadOnly}
                      onClick={() => setData(d => ({ ...d, ch6: { ...d.ch6, safetyItems: { ...d.ch6.safetyItems, [item]: !isChecked } } }))}
                      className="flex items-center gap-3 text-left flex-1"
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-xs transition-all ${isChecked ? "bg-amber-400 text-[#031C13]" : "bg-white/5 text-white/35 border border-white/10"}`}>
                        {isChecked ? <Check size={16} /> : "미비"}
                      </div>
                      <div>
                        <span className={`text-sm font-bold block ${isChecked ? "text-amber-200" : "text-[#F5F2EB]/75"}`}>{item}</span>
                        <span className="text-[10px] text-white/40">{isChecked ? "매뉴얼/교육 보유 (아래에 증빙 첨부 가능)" : "클릭하여 보유 체크"}</span>
                      </div>
                    </button>
                  </div>
                  {isChecked && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <FileUpload
                        label=""
                        value={fileUrl || []}
                        onUpload={(urls: string[]) => setData(d => ({ ...d, ch6: { ...d.ch6, safetyFiles: { ...d.ch6.safetyFiles, [item]: urls } } }))}
                        hint={`${item} 매뉴얼/증빙 파일`}
                        disabled={isReadOnly}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </SCard>

      <SCard id="card-1" badge="STEP 49 ~ 50" title="마케팅 채널 현황 & 원내 비치 홍보물" subtitle="현재 실제로 진행 중인 광고·마케팅과 원내 배너/책자 현황을 적어주세요">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
          <div className="space-y-5">
            <div>
              <Lbl stepBadge="49-A" legacyQ="Q53" hint="현재 진행 중인 마케팅 채널(플레이스, 블로그 대행, 당근 광고, 버스/엘리베이터 등)을 모두 적어주세요.">
                현재 마케팅 운영 채널 현황
              </Lbl>
              <STATextarea
                id="ch6-mktChannels"
                value={data.ch6.marketingStatus.channels}
                onChange={(v: string) => setData(d => ({ ...d, ch6: { ...d.ch6, marketingStatus: { ...d.ch6.marketingStatus, channels: v } } }))}
                placeholder="예: 브랜드 블로그 대행(월 80), 네이버 플레이스 파워링크(월 50), 당근 광고(월 30) / 또는 마케팅 전혀 안 함"
                rows={4}
                readOnly={isReadOnly}
                listeningId={listeningId}
                onMic={startSTT}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Lbl stepBadge="49-B" legacyQ="Q53" hint="월 마케팅 총 지출액">월 마케팅 지출 비용</Lbl>
                <Inp
                  value={data.ch6.marketingStatus.cost}
                  onChange={(v: string) => setData(d => ({ ...d, ch6: { ...d.ch6, marketingStatus: { ...d.ch6.marketingStatus, cost: v } } }))}
                  placeholder="예: 월 160만 원"
                  readOnly={isReadOnly}
                />
              </div>
              <div>
                <Lbl stepBadge="49-C" legacyQ="Q53" hint="희망하는 마케팅 결과">마케팅 목표 (KPI)</Lbl>
                <Inp
                  value={data.ch6.marketingStatus.goal}
                  onChange={(v: string) => setData(d => ({ ...d, ch6: { ...d.ch6, marketingStatus: { ...d.ch6.marketingStatus, goal: v } } }))}
                  placeholder="예: 월 초진 80명 이상"
                  readOnly={isReadOnly}
                />
              </div>
            </div>
          </div>

          <div>
            <Lbl stepBadge="50-A" legacyQ="Q54" hint="대기실, 진료실, 치료실 베드 주변에 비치된 배너, 포스터, 리플릿 현황을 적어주세요.">
              원내 비치 홍보물 현황
            </Lbl>
            <STATextarea
              id="ch6-promoMat"
              value={data.ch6.promoMaterials}
              onChange={(v: string) => setData(d => ({ ...d, ch6: { ...d.ch6, promoMaterials: v } }))}
              placeholder="예: 대기실에 공진단 배너 1개, 치료실에는 따로 붙어있는 안내문 없음 등"
              rows={8}
              readOnly={isReadOnly}
              listeningId={listeningId}
              onMic={startSTT}
            />
          </div>
        </div>

        <div className="p-6 bg-[#041810]/80 rounded-2xl border border-white/10">
          <Lbl stepBadge="50-B" legacyQ="Q54" hint="실제 대기실/치료실에 비치된 홍보물이나 배너 사진이 있다면 업로드해주세요 (최대 5장).">
            원내 홍보물 비치 사진 첨부
          </Lbl>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
            {[0, 1, 2, 3, 4].map(idx => (
              <FileUpload
                key={idx}
                label={`사진 ${idx + 1}`}
                value={data.ch6.promoPhotos[idx] || ""}
                onUpload={(urls: string[]) => {
                  const a = [...(data.ch6.promoPhotos || [])];
                  a[idx] = urls[0] || "";
                  setData(d => ({ ...d, ch6: { ...d.ch6, promoPhotos: a } }));
                }}
                disabled={isReadOnly}
              />
            ))}
          </div>
        </div>
      </SCard>

      <SCard id="card-2" badge="STEP 51 (FINAL)" title="내가 꿈꾸는 경영 명인의 자화상" subtitle="이번 바른컨설팅을 통해 원장님이 꼭 해결하고 싶고 도달하고 싶은 최종 모습을 적어주세요">
        <Lbl stepBadge="51" legacyQ="Final" hint="컨설팅 종료 후 원장님과 병원이 어떤 모습으로 변화되어 있기를 바라시나요?">
          컨설팅을 통해 이루고 싶은 최종 목표
        </Lbl>
        <STATextarea
          id="ch6-finalGoal"
          fieldId="ch6.finalGoal"
          questionLabel="컨설팅 최종 목표 (Final)"
          value={data.ch6.finalGoal}
          onChange={(v: string) => setData(d => ({ ...d, ch6: { ...d.ch6, finalGoal: v } }))}
          placeholder="원장님의 가장 솔직한 바람과 목표를 적어주세요."
          rows={5}
          readOnly={isReadOnly}
          listeningId={listeningId}
          onMic={startSTT}
          masterMode={isMaster && masterCoachingMode}
          clinicMeta={clinicMeta}
        />
      </SCard>
    </div>
  );

  const chaptersRender = [renderCh1, renderCh2, renderCh3, renderCh4, renderCh5, renderCh6];
  const ch = CHAPTER_CONFIG[step - 1];
  const Icon = ch.icon;

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#031C13] flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#031C13] text-[#F5F2EB] pb-24">
      {/* 5번 제작: 우측 고정 실시간 컨설팅 리포트 빌더 위젯 */}
      <LiveReportBuilderWidget
        radarData={radarData}
        totalPct={fillPct.total}
        safetyPct={safetyPct}
        data={data}
        level={level}
        onOpenDossier={() => setShowDossierModal(true)}
        onOpenResumeModal={() => setShowResumeModal(true)}
      />

      {/* 마스터 전용 플로팅 컨트롤러 (일반 회원은 볼 수 없음) */}
      {isMaster && (
        <div className="fixed left-5 bottom-5 z-40 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => router.push("/survey/admin?tab=studio")}
            className="flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 text-[#031C13] rounded-2xl shadow-2xl hover:-translate-y-0.5 active:scale-95 transition-all font-black text-xs"
          >
            <Crown size={18} />
            <div className="text-left">
              <p className="text-[9px] uppercase tracking-widest opacity-80">Master Exclusive Menu</p>
              <p className="text-xs font-black">마스터 AI 다듬기 & 프리셋 스튜디오</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setMasterCoachingMode(m => !m)}
            className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border text-xs font-black transition-all shadow-xl ${
              masterCoachingMode
                ? "bg-emerald-600 text-white border-amber-300"
                : "bg-[#07261B]/95 text-amber-300 border-amber-400/30 hover:bg-[#0A3526]"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Wand2 size={14} />
              현재 화면에 1·2번 코칭 도구 표시
            </span>
            <span className="px-2 py-0.5 rounded bg-black/30 text-[10px]">{masterCoachingMode ? "ON" : "OFF"}</span>
          </button>
        </div>
      )}

      {/* 파트 완료 스탬프 애니메이션 */}
      {stampStep !== null && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="animate-bounce bg-[#07261B] rounded-[36px] p-10 shadow-2xl border-2 border-amber-400 text-center">
            <div className="text-5xl mb-3">✨</div>
            <p className="text-xs font-black text-amber-300 uppercase tracking-widest mb-1">MICRO SESSION SAVED</p>
            <p className="font-black text-[#F5F2EB] text-2xl">Part {stampStep} 안전하게 저장 완료!</p>
          </div>
        </div>
      )}

      {/* 상단 고정 헤더 (모드 전환 + 진행률 + 마스터 대상 전환 + 4번/5번 버튼) */}
      <header className="sticky top-0 z-40 bg-[#031C13]/95 backdrop-blur-2xl border-b border-white/10 shadow-xl print:hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 space-y-2.5">
          {/* 최상단: 모드 스위처 (설문 작성·수정 vs 내가 작성한 설문지 전체 확인) + 마스터 설문 대상 선택 */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-white/10">
            <div className="flex items-center gap-1.5 bg-[#07261B] p-1 rounded-2xl border border-amber-400/30">
              <button
                type="button"
                onClick={() => setPageMode("edit")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                  pageMode === "edit"
                    ? "bg-gradient-to-r from-amber-400 to-amber-500 text-[#031C13] shadow-md"
                    : "text-white/70 hover:text-white"
                }`}
              >
                <Sparkles size={13} />
                ✍️ 파트별 설문 작성·수정
              </button>
              <button
                type="button"
                onClick={() => {
                  forceSaveNow();
                  setPageMode("view");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                  pageMode === "view"
                    ? "bg-gradient-to-r from-amber-400 to-amber-500 text-[#031C13] shadow-md"
                    : "text-amber-300 hover:bg-white/5"
                }`}
              >
                <FileText size={13} />
                📋 작성한 설문지 전체 확인 (STEP 01~51)
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isMaster && (
                <div className="flex items-center gap-2 bg-[#07261B] px-3 py-1.5 rounded-xl border border-amber-400/40">
                  <Crown size={13} className="text-amber-400 flex-shrink-0" />
                  <span className="text-[11px] font-black text-amber-300 whitespace-nowrap">열람·작성 대상:</span>
                  <select
                    value={targetUserId}
                    onChange={e => {
                      const nextUid = e.target.value;
                      setTargetUserId(nextUid);
                      loadSurveyData(nextUid || undefined);
                    }}
                    className="bg-[#031C13] text-[#F5F2EB] text-xs font-bold px-2.5 py-1 rounded-lg border border-white/15 outline-none"
                  >
                    <option value="">👑 마스터 본인 작성 설문지 ({session?.user?.name || "마스터"})</option>
                    {memberList.map((m: any, idx: number) => {
                      const uid = m.user_id || m.userId || `member-${idx}`;
                      const cName = m.clinic || m.clinicName || "한의원 미입력";
                      const dName = m.name || m.directorName || uid;
                      return (
                        <option key={`${uid}-${idx}`} value={uid}>
                          🏥 {cName} · {dName} 원장님 {m.submitted ? "(제출완료)" : "(작성중)"}
                        </option>
                      );
                    })}
                  </select>
                  <button
                    type="button"
                    onClick={() => router.push("/survey/admin")}
                    className="px-2.5 py-1 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 text-[11px] font-black transition-all whitespace-nowrap"
                  >
                    전체 원장님 대시보드 →
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition text-white/70"
                title="홈으로 이동"
              >
                <ChevronLeft size={18} />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] text-amber-400 font-black uppercase tracking-widest">바른컨설팅 정밀 경영 진단 워크북</p>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-bold text-emerald-300">
                    <Clock size={10} /> {pageMode === "view" ? "전체 문항 열람 모드" : "3분 마이크로 세션"}
                  </span>
                </div>
                <h1 className="text-[#F5F2EB] font-black text-sm sm:text-base">
                  {pageMode === "view"
                    ? `${data.ch1.clinic || "우리 한의원"} (${data.ch1.name || session?.user?.name || "원장"}님) — 작성 설문지 전체 확인`
                    : ch.title}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowDossierModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-amber-300 text-xs font-black transition-all"
              >
                <BookOpen size={13} />
                <span className="hidden md:inline">실시간 진단 브로슈어</span>
                <span>({fillPct.total}%)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowResumeModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[#F5F2EB] text-xs font-bold transition-all"
              >
                <Coffee size={13} className="text-amber-300" />
                <span className="hidden sm:inline">나중에 이어쓰기</span>
              </button>

              <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border ${
                saveStatus === "saved"
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                  : saveStatus === "saving"
                  ? "bg-amber-500/15 border-amber-400/30 text-amber-300 animate-pulse"
                  : "bg-white/5 border-white/10 text-white/60"
              }`}>
                <Save size={12} />
                {saveStatus === "saved" ? "자동저장됨" : saveStatus === "saving" ? "저장 중..." : "작성 중"}
              </div>
            </div>
          </div>

          {/* 전체 진행 프로그레스 바 */}
          <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 rounded-full transition-all duration-700"
              style={{ width: `${Math.max(4, fillPct.total)}%` }}
            />
          </div>

          {/* 6개 파트 탭 네비게이션 (작성 모드일 때 표시) */}
          {pageMode === "edit" && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {CHAPTER_CONFIG.map((c, idx) => {
                const CI = c.icon;
                const partPct = Math.round(fillPct.chapters[idx] * 100);
                const done = partPct >= 90;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setStep(c.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-all ${
                      step === c.id
                        ? "bg-gradient-to-r from-amber-400 to-amber-500 text-[#031C13] shadow-lg shadow-amber-500/20"
                        : done
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : "bg-white/5 text-white/60 hover:bg-white/10 border border-white/5"
                    }`}
                  >
                    {done ? <Check size={12} /> : <CI size={12} />}
                    <span>Part {c.id}. {c.shortTitle}</span>
                    <span className={`text-[10px] ${step === c.id ? "text-[#031C13]/80" : "text-amber-300/80"}`}>{partPct}%</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-7">
        {pageMode === "view" ? (
          <SurveyFullSheetView
            data={data}
            updatedAt={updatedAt}
            submitted={submitted}
            isMaster={isMaster}
            onEditPart={(partNo) => {
              setStep(partNo);
              setPageMode("edit");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onOpenStudio={isMaster ? () => router.push("/survey/admin?tab=studio") : undefined}
          />
        ) : (
          <>
            {/* 리얼 현황 수집 안내 배너 (핵심 가이드) */}
            <div className="p-5 rounded-3xl bg-gradient-to-r from-[#0A3526] via-[#07261B] to-[#0A3526] border border-amber-400/30 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-300 flex-shrink-0 mt-0.5">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <p className="text-xs font-black text-amber-300 uppercase tracking-wider mb-0.5">
                    REAL CLINIC STATUS COLLECTION • 있는 그대로의 리얼 데이터를 적어주세요
                  </p>
                  <p className="text-xs sm:text-sm text-[#F5F2EB]/90 leading-relaxed">
                    잘 보이려고 꾸며 쓰거나 정답을 찾으실 필요가 전혀 없습니다! 현재 병원에서 <strong>실제로 하고 계신 날것(Raw) 그대로의 상황</strong>과 <strong>안 되고 있는 부분</strong>을 솔직하게 적어주셔야 바른컨설팅 마스터가 정확한 문제점을 찾아 해결책을 설계할 수 있습니다.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    forceSaveNow();
                    setPageMode("view");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="px-3.5 py-2 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/40 text-xs font-black text-amber-300 flex items-center gap-1.5 transition-all"
                >
                  <FileText size={14} /> 내가 작성한 설문지 한눈에 보기
                </button>
                <span className="px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
                  <Mic size={13} className="text-amber-400" /> 음성 구술 가능
                </span>
              </div>
            </div>

            {/* 4번 제작: 현재 Part의 3분 마이크로 세션 헤더 & 서브카드 점프 바 */}
            <div className="p-6 rounded-3xl bg-[#07261B]/70 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className={`p-4 bg-gradient-to-br ${ch.color} rounded-2xl shadow-lg flex-shrink-0 border border-white/15`}>
                  <Icon size={28} className="text-white" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-xs font-black text-amber-400 uppercase tracking-widest">
                      PART 0{step} / 06 • {ch.subtitle}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-[11px] font-black text-amber-300">
                      {remainingInPart === 0 ? "✅ 이 파트 작성 완료!" : `⏱️ 남은 항목 ${remainingInPart}개 (약 ${estRemainingMinutes}분 소요)`}
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-[#F5F2EB] tracking-tight">{ch.title}</h2>
                </div>
              </div>

              {/* 서브 섹션 빠른 이동 */}
              <div className="flex flex-wrap gap-2">
                {ch.cards.map((cardTitle, cIdx) => (
                  <button
                    key={cIdx}
                    type="button"
                    onClick={() => {
                      const el = document.getElementById(`card-${cIdx}`);
                      el?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-amber-400/15 border border-white/10 hover:border-amber-400/40 text-xs font-bold text-white/80 hover:text-amber-300 transition-all"
                  >
                    #{cIdx + 1} {cardTitle}
                  </button>
                ))}
              </div>
            </div>

            {/* 현재 챕터 폼 렌더링 */}
            {chaptersRender[step - 1]()}

            {/* 하단 네비게이션 & 3분 마이크로 세션 저장 바 */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-8 border-t border-white/10">
              <div className="flex flex-wrap items-center gap-3">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={() => { setStep(s => s - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className="flex items-center gap-2 px-6 py-3.5 rounded-2xl border border-white/15 bg-white/5 text-[#F5F2EB] font-bold text-sm hover:bg-white/10 transition-all"
                  >
                    <ChevronLeft size={16} /> 이전 파트
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowResumeModal(true)}
                  className="flex items-center gap-2 px-5 py-3.5 rounded-2xl border border-amber-400/30 bg-amber-400/10 text-amber-300 font-bold text-sm hover:bg-amber-400/20 transition-all"
                >
                  <Coffee size={16} /> 여기까지 저장 후 나중에 이어쓰기
                </button>
                <button
                  type="button"
                  onClick={() => {
                    forceSaveNow();
                    setPageMode("view");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="flex items-center gap-2 px-5 py-3.5 rounded-2xl border border-white/15 bg-white/5 text-[#F5F2EB] font-bold text-sm hover:bg-white/10 transition-all"
                >
                  <FileText size={16} className="text-amber-400" /> 작성한 설문지 전체 확인
                </button>
              </div>

              <div className="flex items-center gap-3">
                {step < 6 ? (
                  <button
                    type="button"
                    onClick={validateAndNext}
                    className="flex items-center gap-2 px-8 py-3.5 rounded-2xl font-black text-sm text-[#031C13] shadow-xl transition-all hover:brightness-105 active:scale-95 bg-gradient-to-r from-amber-400 to-amber-500"
                  >
                    Part {step} 저장 후 다음 파트로 <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="flex items-center gap-2 px-8 py-3.5 rounded-2xl font-black text-sm text-[#031C13] bg-gradient-to-r from-amber-400 via-amber-300 to-emerald-400 shadow-xl hover:brightness-105 active:scale-95 transition-all"
                  >
                    <Check size={16} /> ✨ {submitted ? "수정 내용 재제출하기" : "리얼 현황 최종 제출 완료"}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* ─── 4번 제작: 3분 마이크로 세션 & 스마트 이어쓰기 모달 ──────────────── */}
      {showResumeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="bg-[#07261B] rounded-[32px] p-8 max-w-lg w-full border border-amber-400/30 shadow-2xl space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-300">
                  <Coffee size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">SMART MICRO-SESSION SAVE</p>
                  <h3 className="text-xl font-black text-[#F5F2EB]">여기까지 안전하게 보관되었습니다</h3>
                </div>
              </div>
              <button onClick={() => setShowResumeModal(false)} className="p-2 text-white/40 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 rounded-2xl bg-[#041810] border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white/70">현재 전체 작성 보관율</span>
                <span className="text-lg font-black text-amber-400">{fillPct.total}% 완료</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {CHAPTER_CONFIG.map((c, idx) => {
                  const pct = Math.round(fillPct.chapters[idx] * 100);
                  return (
                    <div key={c.id} className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center">
                      <p className="text-[10px] text-white/50 font-bold">Part {c.id}. {c.shortTitle}</p>
                      <p className={`text-sm font-black mt-0.5 ${pct >= 80 ? "text-emerald-400" : pct > 0 ? "text-amber-300" : "text-white/30"}`}>
                        {pct}%
                      </p>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-emerald-200/70 leading-relaxed">
                진료 중간이나 퇴근 후 스마트폰/PC 어디서든 다시 접속하시면 방금 작성하신 문항부터 바로 이어서 작성하실 수 있습니다.
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleCopyResumeLink}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 text-[#031C13] font-black text-sm flex items-center justify-center gap-2 shadow-lg hover:brightness-105 transition-all"
              >
                <Share2 size={16} /> 카카오톡 보관용 이어쓰기 링크 & 요약 복사
              </button>
              <button
                type="button"
                onClick={() => setShowResumeModal(false)}
                className="w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white/80 font-bold text-xs transition-all"
              >
                계속 이어서 작성하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 5번 제작: 실시간 컨설팅 진단 브로슈어 (Live Diagnostic Dossier) 모달 ── */}
      {showDossierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-lg p-4 overflow-y-auto">
          <div className="bg-[#051F15] rounded-[36px] max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-amber-400/40 shadow-[0_25px_80px_rgba(0,0,0,0.8)] p-6 sm:p-10 space-y-8">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-amber-400/20 pb-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-[10px] font-black uppercase tracking-[0.2em] mb-2">
                  <Sparkles size={12} /> BARUN CONSULTING • REAL-TIME DIAGNOSTIC DOSSIER
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-[#F5F2EB] tracking-tight">
                  {data.ch1.clinic || "우리 한의원"} — {data.ch1.name || session?.user?.name || "원장"}님 경영 진단 브로슈어
                </h2>
                <p className="text-xs text-emerald-200/60 mt-1">
                  설문에 입력하신 리얼 현황 데이터가 실시간으로 컨설팅 브로슈어에 반영됩니다.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDossierModal(false);
                    setPageMode("view");
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/40 text-xs font-black text-amber-300 flex items-center gap-1.5"
                >
                  <FileText size={14} /> 전체 51개 문항 상세 열람
                </button>
                <button
                  type="button"
                  onClick={() => setShowDossierModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white flex items-center gap-1.5"
                >
                  <X size={15} /> 닫기
                </button>
              </div>
            </div>

            {/* 상단 육각형 레이더 & 핵심 경영 스냅샷 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center bg-[#082B1E] p-6 rounded-3xl border border-white/10">
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="72%">
                    <PolarGrid stroke="rgba(255,255,255,0.15)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "#D4AF37", fontWeight: 800 }} />
                    <Radar dataKey="fill" stroke="#10B981" fill="#D4AF37" fillOpacity={0.4} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-[#041810] border border-white/10">
                  <p className="text-[10px] font-black text-amber-400 uppercase">현재 진단 등급</p>
                  <p className="text-base font-black text-[#F5F2EB] mt-1">{level.icon} {level.name}</p>
                </div>
                <div className="p-4 rounded-2xl bg-[#041810] border border-white/10">
                  <p className="text-[10px] font-black text-amber-400 uppercase">데이터 수집 밀도</p>
                  <p className="text-2xl font-black text-emerald-400 mt-1">{fillPct.total}%</p>
                </div>
                <div className="p-4 rounded-2xl bg-[#041810] border border-white/10">
                  <p className="text-[10px] font-black text-amber-400 uppercase">원내 안전 방어율</p>
                  <p className="text-2xl font-black text-amber-300 mt-1">{safetyPct}%</p>
                </div>
                <div className="p-4 rounded-2xl bg-[#041810] border border-white/10">
                  <p className="text-[10px] font-black text-white/45 uppercase">목표 월 총매출</p>
                  <p className="text-sm font-black text-[#F5F2EB] mt-1">{data.ch4.targetMetrics.revenue || "미입력"}</p>
                </div>
                <div className="p-4 rounded-2xl bg-[#041810] border border-white/10">
                  <p className="text-[10px] font-black text-white/45 uppercase">목표 월 순이익</p>
                  <p className="text-sm font-black text-[#F5F2EB] mt-1">{data.ch4.targetMetrics.profit || "미입력"}</p>
                </div>
                <div className="p-4 rounded-2xl bg-[#041810] border border-white/10">
                  <p className="text-[10px] font-black text-white/45 uppercase">성향 / 전문과목</p>
                  <p className="text-sm font-black text-[#F5F2EB] mt-1">{data.ch1.mbti || "-"} / {data.ch1.degree || "-"}</p>
                </div>
              </div>
            </div>

            {/* 파트별 리얼 현황 요약 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                {
                  title: "Part 1. 원장님 브랜딩 & 핵심 고민",
                  items: [
                    { k: "병원 자랑거리", v: data.ch1.clinicPride },
                    { k: "비전/목표", v: data.ch1.vision },
                    { k: "시급한 변화", v: data.ch1.actionStep },
                    { k: "핵심 부족한 점", v: data.ch1.weakness },
                  ],
                },
                {
                  title: "Part 2. 공간 & 환자 여정 리얼 진단",
                  items: [
                    { k: "규모/베드수", v: data.ch2.clinicSize },
                    { k: "환자 내원 동선", v: data.ch2.patientFlow },
                    { k: "초진 상담 멘트", v: data.ch2.consultScript },
                    { k: "환자 이탈 요인", v: data.ch1.whyLeave },
                  ],
                },
                {
                  title: "Part 3. 임상 루틴 & 처방 설득",
                  items: [
                    { k: "보유 장비", v: data.ch3.equipmentDetail },
                    { k: "질환별 치료계획", v: data.ch3.diseasePlans },
                    { k: "한약 설득 멘트", v: data.ch3.herbRecommendation },
                    { k: "약침 권유 루틴", v: data.ch3.acupointRecommendation },
                  ],
                },
                {
                  title: "Part 4~6. 재무·조직·마케팅 비전",
                  items: [
                    { k: "관찰 지표", v: data.ch4.indicators },
                    { k: "희망 인재상", v: data.ch5.idealStaff },
                    { k: "마케팅 현황", v: data.ch6.marketingStatus.channels },
                    { k: "최종 자화상", v: data.ch6.finalGoal },
                  ],
                },
              ].map((sec, idx) => (
                <div key={idx} className="p-5 rounded-2xl bg-[#082B1E]/80 border border-white/10 space-y-3">
                  <h4 className="text-sm font-black text-amber-300 border-b border-white/10 pb-2">{sec.title}</h4>
                  {sec.items.map((it, i) => (
                    <div key={i} className="text-xs">
                      <span className="font-bold text-emerald-300/80 block mb-0.5">• {it.k}</span>
                      <p className="text-[#F5F2EB]/90 pl-2.5 line-clamp-2">{it.v || <span className="text-white/25 italic">아직 작성되지 않았습니다</span>}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 최종 제출 완료 축하 모달 */}
      {showSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md">
          <div className="bg-[#07261B] rounded-[40px] p-10 max-w-md w-full mx-4 text-center shadow-2xl border border-amber-400/40 space-y-4">
            <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-emerald-600 rounded-[28px] flex items-center justify-center mx-auto mb-4 shadow-2xl">
              <span className="text-5xl">🏆</span>
            </div>
            <h2 className="text-3xl font-black text-[#F5F2EB]">수고하셨습니다!</h2>
            <p className="text-base text-amber-300 font-bold">우리 병원의 리얼 현황 제출 완료 🎉</p>
            <p className="text-white/70 text-xs sm:text-sm leading-relaxed">
              작성해주신 솔직한 현황 데이터를 바탕으로<br />
              <span className="font-bold text-amber-300">바른컨설팅 마스터</span>가 핵심 문제점과 맞춤형 성장 솔루션을 정밀 분석합니다.
            </p>
            <div className="space-y-2.5 pt-2">
              <button
                onClick={() => {
                  setShowSuccess(false);
                  setPageMode("view");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 text-[#031C13] font-black text-sm rounded-2xl shadow-xl hover:brightness-105 active:scale-95 transition-all"
              >
                📋 내가 작성한 설문지 전체 확인하기
              </button>
              <button
                onClick={() => router.push("/")}
                className="w-full py-3.5 bg-white/10 hover:bg-white/15 text-[#F5F2EB] font-bold text-sm rounded-2xl transition-all"
              >
                🏠 메인 대시보드로 이동
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
