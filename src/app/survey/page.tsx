"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ChevronRight, ChevronLeft, Check, User, Stethoscope, ClipboardList,
  BarChart3, Users, Shield, Upload, X, Sparkles, Mic, MicOff,
  Star, Target, Zap, Save, Lock, AlertCircle, PlusCircle
} from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer
} from "recharts";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";

// ─── Types ──────────────────────────────────────────────────────────────────
type SurveyData = {
  ch1: {
    name: string; clinic: string; degree: string; specialist: string; media: string; vision: string; mission: string; goal: string; mbti: string;
    intro: string;      // 1. 자기소개 + 경력
    actionStep: string; // 3. 비전 달성 행동
    weakness: string;   // 4. 부족한 점/해결책
    whyCome: string;    // 5. 내원 이유
    whyLeave: string;   // 6. 안 오는 이유
    clinicPride: string; // 9. 한의원 자랑
    philosophy: string; // 44. 관리 철학
    desiredLeader: string; // 45. 어떤 원장님
  };
  ch2: {
    addressHours: string;     // 30. 주소/시간
    clinicSize: string;       // 42. 실평수/베드수
    patientFlow: string;      // 11. 환자 동선
    consultScript: string;    // 12. 진단 멘트
    herbConsultProcess: string; // 15. 약 상담/결제 과정
    happyCallSystem: string;   // 31. 해피콜 시스템
    herbInstructions: string;  // 32. 복용법 안내 과정
    herbInstructionsFile: string[]; // (파일 업로드 - 다수)
    herbManagementSystem: string; // 33. 한약 관리 시스템
  };
  ch3: {
    equipmentDetail: string;      // 7. 보유 물리치료 및 검사기기
    treatmentDefinition: string;  // 8. 치료/경영 정의
    patientQna: string;           // 10. Q&A 리스트
    patientQnaFile: string[];      // (파일 업로드 - 다수)
    diseasePlans: string;         // 13. 질환별 계획
    mskExample: string;           // 14. 근골격계 상담 예시
    charting: { disease: string; case1: string; case2: string; case3: string }[]; // 16. 차팅 사례
    billingRoutine: string;       // 17. 루틴 청구법
    chunaRoutine: string;         // 18. 추나 루틴
    herbRecommendation: string;   // 19. 약 필요성 설명
    acupointRecommendation: string; // 21. 약침 권유
  };
  ch4: {
    targetMetrics: { revenue: string; profit: string; nonBenefit: string; autoInsurance: string; dailyPatients: string; }; // 22. 희망 목표
    workingDays: string;          // 26. 진료일수
    profitUsage: string;          // 23. 수익 사용 계획
    growthInvestment: string;     // 24. 추가비용 지불 의사
    immediateInvestment: string;  // 25. 당장 투자 금액
    indicators: string;           // 27. 관찰 지표/관리방법
    indicatorsFile: string[];      // (파일 업로드 - 다수)
    investmentHistory: string;    // 28. 투자비용/회수금
    expenses: { item: string; amount: string }[]; // 29. 경비 내역
  };
  ch5: {
    staff: { role: string; salary: string; days: string; hours: string; incentive: string; }[]; // 34. 직원 구성
    staffCounts: { desk: string; treatment: string; decoction: string; other: string; };       // 43. 파트별 근무 인원
    mealSnack: { nightMeal: string; snack: string; lunch: string; eatTogether: string; };     // 35, 36, 37, 38 식사/간식
    welfare: string;                // 39, 40 복지 상세
    staffDiscount: string;          // 41. 직원 할인
    idealStaff: string;             // 46. 인재상
    expectations: { manager: string; regular: string; communication: string; }; // 47. 역할 기대 + 소통 주기
    chatSystem: { program: string; channels: string; files: string[]; }; // 48, 49 채팅 소통 + 증빙 자료들
    eduMeeting: string;             // 50. 교육/회의 시스템
    eduMaterials: string[];         // 51. 교육 자료 목록 (최대 3개 파일)
  };
  ch6: {
    safetyEducation: string;        // 52. 직원 안전/보안 교육 현황
    safetyItems: Record<string, boolean>; // (체크리스트)
    safetyFiles: Record<string, string[]>;  // (개별 증빙 파일들)
    marketingStatus: { channels: string; cost: string; goal: string; }; // 53. 마케팅 현황 + 목표
    promoMaterials: string;         // 54. 홍보물 현황
    promoPhotos: string[];          // (홍보물 사진 최대 5개)
    finalGoal: string;              // 컨설팅 발전 희망 능력
  };
};

const MBTI_LIST = ["INTJ","INTP","ENTJ","ENTP","INFJ","INFP","ENFJ","ENFP","ISTJ","ISFJ","ESTJ","ESFJ","ISTP","ISFP","ESTP","ESFP"];

const SAFETY_ITEMS = [
  "개인정보보호 교육", "성희롱예방 교육", "직원간 대화 규칙", "환자 응대 규칙",
  "화재/전기 안전 교육", "감염 관리 매뉴얼", "발침 사고 대응", "낙상 사고 대응",
  "응급 상황 프로토콜", "컴플레인 대응", "의료 장비 관리", "약품 안전 관리",
  "보안/CCTV 운영", "탕전실 안전", "주차 관리 안내", "비상연락망 체계",
  "직원 보건 교육", "근골격계 질환 예방"
];

const CHAPTER_CONFIG = [
  { id: 1, icon: User,          title: "원장님 브랜딩 & 비전",   subtitle: "Who You Are",        color: "from-blue-500 to-indigo-600",    bg: "#3182f6" },
  { id: 2, icon: Stethoscope,   title: "진료 시스템 & 공간",    subtitle: "Clinic UX & Space",   color: "from-cyan-500 to-blue-600",     bg: "#06b6d4" },
  { id: 3, icon: ClipboardList, title: "임상 루틴 & 처방",    subtitle: "Clinical Routine",    color: "from-indigo-500 to-purple-600", bg: "#6366f1" },
  { id: 4, icon: BarChart3,     title: "지표와 경영 목표",      subtitle: "Numbers & Goals",    color: "from-violet-500 to-indigo-600", bg: "#8b5cf6" },
  { id: 5, icon: Users,         title: "팀 빌딩 & 조직 문화",   subtitle: "HR Management",       color: "from-blue-600 to-cyan-500",     bg: "#2563eb" },
  { id: 6, icon: Shield,        title: "위험 관리 & 마케팅",    subtitle: "Safety & Marketing", color: "from-slate-700 to-blue-800",    bg: "#334155" },
];

const getLevel = (pct: number) => {
  if (pct < 40) return { name: "수련생", icon: "🌱", color: "text-green-600", bg: "bg-green-50" };
  if (pct < 70) return { name: "전문의", icon: "⚕️", color: "text-indigo-600", bg: "bg-indigo-50" };
  if (pct < 90) return { name: "명의", icon: "🏅", color: "text-blue-600", bg: "bg-blue-50" };
  return { name: "경영 명인", icon: "👑", color: "text-amber-600", bg: "bg-amber-50" };
};

const initialData: SurveyData = {
  ch1: { name: "", clinic: "", degree: "", specialist: "", media: "", vision: "", mission: "", goal: "", mbti: "", intro: "", actionStep: "", weakness: "", whyCome: "", whyLeave: "", clinicPride: "", philosophy: "", desiredLeader: "" },
  ch2: { addressHours: "", clinicSize: "", patientFlow: "", consultScript: "", herbConsultProcess: "", happyCallSystem: "", herbInstructions: "", herbInstructionsFile: [], herbManagementSystem: "" },
  ch3: { equipmentDetail: "", treatmentDefinition: "", patientQna: "", patientQnaFile: [], diseasePlans: "", mskExample: "", charting: [{ disease: "대표 질환 1 (예: 경추통)", case1: "", case2: "", case3: "" }, { disease: "대표 질환 2 (예: 요통)", case1: "", case2: "", case3: "" }, { disease: "대표 질환 3 (예: 슬통)", case1: "", case2: "", case3: "" }], billingRoutine: "", chunaRoutine: "", herbRecommendation: "", acupointRecommendation: "" },
  ch4: { targetMetrics: { revenue: "", profit: "", nonBenefit: "", autoInsurance: "", dailyPatients: "" }, workingDays: "", profitUsage: "", growthInvestment: "", immediateInvestment: "", indicators: "", indicatorsFile: [], investmentHistory: "", expenses: [{ item: "임대료", amount: "" }, { item: "인건비", amount: "" }, { item: "소모품", amount: "" }] },
  ch5: { staff: [{ role: "실장", salary: "", days: "", hours: "", incentive: "" }, { role: "간호", salary: "", days: "", hours: "", incentive: "" }], staffCounts: { desk: "", treatment: "", decoction: "", other: "" }, mealSnack: { nightMeal: "", snack: "", lunch: "", eatTogether: "" }, welfare: "", staffDiscount: "", idealStaff: "", expectations: { manager: "", regular: "", communication: "" }, chatSystem: { program: "카카오톡", channels: "", files: [] }, eduMeeting: "", eduMaterials: [] },
  ch6: { safetyEducation: "", safetyItems: Object.fromEntries(SAFETY_ITEMS.map(q => [q, false])), safetyFiles: {}, marketingStatus: { channels: "", cost: "", goal: "" }, promoMaterials: "", promoPhotos: [], finalGoal: "" },
};

// ─── STT Hook ───────────────────────────────────────────────────────────────
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
const FileUpload = ({ label, value = [], onUpload, hint, disabled }: { label: string; value: string[]; onUpload: (urls: string[]) => void; hint?: string; disabled?: boolean }) => {
  const [uploading, setUploading] = useState(false);

  // 파일 확장자별 아이콘 및 색상 결정
  const getFileIcon = (url: string) => {
    const ext = url.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || "")) return { icon: <Sparkles size={16} />, color: "bg-blue-500", label: "IMG" };
    if (['pdf'].includes(ext || "")) return { icon: <ClipboardList size={16} />, color: "bg-rose-500", label: "PDF" };
    if (['xlsx', 'xls', 'csv'].includes(ext || "")) return { icon: <BarChart3 size={16} />, color: "bg-emerald-500", label: "XLS" };
    if (['zip', '7z', 'rar'].includes(ext || "")) return { icon: <Shield size={16} />, color: "bg-amber-500", label: "ZIP" };
    return { icon: <Upload size={16} />, color: "bg-slate-500", label: "FILE" };
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // 용량 제한 체크 (예: 파일당 50MB)
    const largeFiles = files.filter(f => f.size > 50 * 1024 * 1024);
    if (largeFiles.length > 0) {
      toast.error("50MB를 초과하는 파일이 포함되어 있습니다.");
      return;
    }

    setUploading(true);
    const newUrls: string[] = [...value];
    
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

        const { data, error } = await supabase.storage
          .from('survey-files')
          .upload(path, file, { contentType: contentType || 'application/octet-stream', upsert: false });

        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('survey-files').getPublicUrl(path);
        return publicUrl;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      onUpload([...value, ...uploadedUrls]);
      toast.success(`${uploadedUrls.length}개의 파일이 업로드되었습니다.`);
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(`업로드 중 오류가 발생했습니다: ${err.message}`);
    } finally {
      setUploading(false);
      if (e.target) e.target.value = ""; // 초기화
    }
  };

  const removeFile = (index: number) => {
    const newList = [...value];
    newList.splice(index, 1);
    onUpload(newList);
  };

  return (
    <div className="space-y-4">
      <Lbl hint={hint}>{label}</Lbl>
      
      {/* 업로드된 파일 리스트 */}
      {value.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {value.map((url, idx) => {
            const meta = getFileIcon(url);
            return (
              <div key={idx} className="group relative flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all">
                <div className={`w-10 h-10 ${meta.color} rounded-xl flex items-center justify-center text-white shadow-sm`}>
                  {meta.icon}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{meta.label}</p>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-slate-700 truncate block hover:text-blue-600 hover:underline">
                    파일 {idx + 1} 보기
                  </a>
                </div>
                {!disabled && (
                  <button onClick={() => removeFile(idx)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                    <X size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 업로드 영역 */}
      {!disabled && (
        <label className={`flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed rounded-3xl cursor-pointer transition-all ${
          uploading ? "bg-slate-50 border-blue-300 animate-pulse" : "bg-white border-slate-100 hover:border-blue-400 hover:bg-blue-50/30"
        }`}>
          <input type="file" className="hidden" onChange={handleFile} multiple disabled={uploading} />
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
            uploading ? "bg-blue-100" : "bg-slate-50 group-hover:bg-blue-100"
          }`}>
            {uploading ? <Sparkles size={28} className="text-blue-500" /> : <Upload size={28} className="text-slate-400 group-hover:text-blue-500" />}
          </div>
          <div className="text-center">
            <p className="text-sm font-black text-slate-600">{uploading ? "업로드 중..." : "파일들 선택 또는 드래그"}</p>
            <p className="text-[11px] text-slate-400 mt-1 font-bold">압축 파일(.zip), 문서, 이미지 모두 가능 (중복 선택 가능)</p>
          </div>
        </label>
      )}
    </div>
  );
};

const Lbl = ({ children, hint }: { children: React.ReactNode; hint?: string }) => (
  <div className="mb-2">
    <label className="block text-sm font-bold text-slate-700">{children}</label>
    {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
  </div>
);

const Inp = ({ value, onChange, placeholder, type = "text", err, readOnly }: any) => (
  <input type={type} value={value} readOnly={readOnly}
    onChange={e => onChange(e.target.value)} placeholder={placeholder}
    className={`w-full px-4 py-3 rounded-xl border text-slate-800 text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-2 transition-all ${
      err ? "border-red-400 bg-red-50 focus:ring-red-300" : "border-slate-200 bg-white focus:ring-blue-500/30 focus:border-blue-400"
    } ${readOnly ? "opacity-60 cursor-not-allowed" : ""}`}
  />
);

const STATextarea = ({ id, value, onChange, placeholder, rows = 4, err, readOnly, listeningId, onMic }: any) => (
  <div className="relative">
    <textarea id={id} rows={rows} value={value} readOnly={readOnly}
      onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className={`w-full px-4 py-3 pr-12 rounded-xl border text-slate-800 text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-2 transition-all resize-none ${
        err ? "border-red-400 bg-red-50 focus:ring-red-300" : "border-slate-200 bg-white focus:ring-blue-500/30 focus:border-blue-400"
      } ${readOnly ? "opacity-60 cursor-not-allowed" : ""}`}
    />
    {!readOnly && (
      <button onClick={() => onMic(id, (t: string) => onChange(value ? value + " " + t : t))}
        className={`absolute top-2.5 right-2.5 p-2 rounded-xl transition-all ${
          listeningId === id ? "bg-red-500 text-white animate-pulse" : "bg-slate-100 text-slate-400 hover:text-blue-500"
        }`}>
        {listeningId === id ? <MicOff size={14} /> : <Mic size={14} />}
      </button>
    )}
  </div>
);

const SCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
    <div className="px-8 py-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-100">
      <h3 className="font-bold text-slate-800 text-base">{title}</h3>
    </div>
    <div className="p-8 space-y-6">{children}</div>
  </div>
);

const RadarWidget = ({ radarData }: { radarData: any[] }) => (
  <div className="fixed right-4 top-1/2 -translate-y-1/2 z-40 hidden xl:block">
    <div className="bg-white/90 backdrop-blur-xl rounded-3xl border border-slate-100 shadow-2xl p-4 w-52">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-2">경영 진단 레이더</p>
      <ResponsiveContainer width="100%" height={160}>
        <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: "#64748b", fontWeight: 600 }} />
          <Radar dataKey="fill" stroke="#3182f6" fill="#3182f6" fillOpacity={0.3} strokeWidth={2} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

export default function SurveyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { listeningId, startSTT } = useSTT();

  const [step, setStep] = useState(1);
  const [data, setData] = useState<SurveyData>(initialData);
  const [submitted, setSubmitted] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [showSuccess, setShowSuccess] = useState(false);
  const [stampStep, setStampStep] = useState<number | null>(null);

  const isMaster = session?.user?.email?.toLowerCase() === (process.env.NEXT_PUBLIC_MASTER_EMAIL || "wei0508@naver.com").toLowerCase();
  const isReadOnly = submitted && !isMaster;

  // ── Data Fetching ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (status === "unauthenticated") { router.push("/"); }
    if (status === "authenticated") {
      fetch("/api/survey").then(r => r.json()).then(({ data: saved }) => {
        if (saved?.data) {
          // Deep merge logic to ensure new fields are initialized
          setData(prev => {
            const merged = { ...prev };
            // Simple merge for chapters
            for (const chKey of ["ch1", "ch2", "ch3", "ch4", "ch5", "ch6"] as const) {
              if (saved.data[chKey]) {
                merged[chKey] = { ...prev[chKey], ...saved.data[chKey] };
              }
            }
            return merged;
          });
        }
        if (saved?.submitted) setSubmitted(true);
      }).catch(() => {});
    }
  }, [status, router]);

  // ── Auto-save ──────────────────────────────────────────────────────────────
  const saveTimer = useRef<any>(null);
  useEffect(() => {
    if (isReadOnly) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus("unsaved");
    saveTimer.current = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        await fetch("/api/survey", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        setSaveStatus("saved");
      } catch { setSaveStatus("unsaved"); }
    }, 3000);
    return () => clearTimeout(saveTimer.current);
  }, [data, isReadOnly]);

  // ── Progress Logic ─────────────────────────────────────────────────────────
  const fillPct = useMemo(() => {
    const flatStrings = (obj: any): string[] => {
      let res: string[] = [];
      if (!obj || typeof obj !== 'object') return res;
      for (const k in obj) {
        const val = obj[k];
        if (typeof val === "string") {
          res.push(val);
        } else if (Array.isArray(val)) {
          val.forEach((v: any) => {
            if (typeof v === "string") {
              res.push(v);
            } else if (typeof v === "object" && v !== null) {
              res.push(...flatStrings(v));
            }
          });
        } else if (typeof val === "object" && val !== null) {
          res.push(...flatStrings(val));
        }
      }
      return res;
    };
    
    const chapters = [data.ch1, data.ch2, data.ch3, data.ch4, data.ch5, data.ch6].map(c => {
      const strings = flatStrings(c);
      if (strings.length === 0) return 0;
      const filledCount = strings.filter(s => typeof s === 'string' && s.trim().length > 0).length;
      return filledCount / strings.length;
    });
    
    return {
      chapters,
      total: Math.round((chapters.reduce((a, b) => a + b, 0) / 6) * 100)
    };
  }, [data]);

  const level = getLevel(fillPct.total);
  const radarData = CHAPTER_CONFIG.map((ch, i) => ({ subject: ch.title.split(" ")[0], fill: Math.round(fillPct.chapters[i] * 100) }));

  const validateAndNext = () => {
    setStampStep(step);
    setTimeout(() => {
      setStampStep(null);
      if (step < 6) { setStep(s => s + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }
    }, 800);
  };

  const handleSubmit = async () => {
    if (!confirm("최종 제출하시겠습니까?")) return;
    try {
      await fetch("/api/survey/submit", { method: "POST" });
      setSubmitted(true);
      setShowSuccess(true);
    } catch { toast.error("제출 실패"); }
  };

  const upd1 = (f: string, v: string) => setData(d => ({ ...d, ch1: { ...d.ch1, [f]: v } }));
  const upd2 = (f: string, v: string) => setData(d => ({ ...d, ch2: { ...d.ch2, [f]: v } }));
  const upd3 = (f: string, v: string) => setData(d => ({ ...d, ch3: { ...d.ch3, [f]: v } }));
  const upd4 = (f: string, v: string) => setData(d => ({ ...d, ch4: { ...d.ch4, [f]: v } }));
  const upd5 = (f: string, v: string) => setData(d => ({ ...d, ch5: { ...d.ch5, [f]: v } }));

  // ── Renders ────────────────────────────────────────────────────────────────
  const renderCh1 = () => (
    <div className="space-y-10">
      <SCard title="📋 [1, 9, 45] 원장님 브랜딩 & 상세 경력">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <Lbl>원장님 성함</Lbl>
              <Inp value={data.ch1.name} onChange={(v: string) => upd1("name", v)} placeholder="홍길동" readOnly={isReadOnly} />
            </div>
            <div>
              <Lbl hint="인턴, 레지던트, 전문의, 연체, 방송 출연 등 상세 이력">자기소개 및 경력 (Q1)</Lbl>
              <STATextarea id="ch1-intro" value={data.ch1.intro} onChange={(v: string) => upd1("intro", v)} placeholder="사소한 이력이라도 원장님을 홍보할 수 있는 모든 내용을 적어주세요." rows={8} readOnly={isReadOnly} listeningId={listeningId} onMic={startSTT} />
            </div>
          </div>
          <div className="space-y-6">
            <div>
              <Lbl>학위 및 전문과목</Lbl>
              <Inp value={data.ch1.degree} onChange={(v: string) => upd1("degree", v)} placeholder="예: 한의학박사, 침구과 전문의" readOnly={isReadOnly} />
            </div>
            <div>
              <Lbl hint="[Q9] 환자들에게 자랑하고 싶은 우리 병원만의 강점">병원만의 자랑거리 (Q9)</Lbl>
              <STATextarea id="ch1-pride" value={data.ch1.clinicPride} onChange={(v: string) => upd1("clinicPride", v)} placeholder="시설, 실력, 친절함 등 무엇이든 좋습니다." rows={4} readOnly={isReadOnly} listeningId={listeningId} onMic={startSTT} />
            </div>
            <div>
              <Lbl hint="[Q45] 직원들에게 어떤 원장님이 되고 싶으신가요?">꿈꾸는 리더상 (Q45)</Lbl>
              <Inp value={data.ch1.desiredLeader} onChange={(v: string) => upd1("desiredLeader", v)} placeholder="예: 소통하는 원장님, 실력으로 존경받는 스승" readOnly={isReadOnly} />
            </div>
          </div>
        </div>
      </SCard>

      <SCard title="🌟 [2, 3, 4] 비전 & 실행 전략">
        <div className="space-y-8">
          <div>
            <Lbl hint="[Q2] 현재 운영 중인 병원의 장기적 목표와 비전">앞으로의 비전/미션/목표 (Q2)</Lbl>
            <STATextarea id="ch1-vision" value={data.ch1.vision} onChange={(v: string) => upd1("vision", v)} placeholder="상세하게 정리해서 말씀 부탁드립니다." rows={5} readOnly={isReadOnly} listeningId={listeningId} onMic={startSTT} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-slate-50">
            <div>
              <Lbl hint="[Q3] 목표 달성을 위해 반드시 바뀌어야 할 점">반드시 실행되어야 할 변화 (Q3)</Lbl>
              <STATextarea value={data.ch1.actionStep} onChange={(v: string) => upd1("actionStep", v)} placeholder="구체적인 실행 행동을 적어주세요." rows={5} readOnly={isReadOnly} listeningId={listeningId} onMic={startSTT} />
            </div>
            <div>
              <Lbl hint="[Q4] 현재 경영에서 가장 어렵게 느껴지는 부분">부족한 점 및 원인/해결책 (Q4)</Lbl>
              <STATextarea value={data.ch1.weakness} onChange={(v: string) => upd1("weakness", v)} placeholder="원장님이 생각하시는 해결법도 함께 적어주세요." rows={5} readOnly={isReadOnly} listeningId={listeningId} onMic={startSTT} />
            </div>
          </div>
        </div>
      </SCard>

      <SCard title="🔍 [5, 6, 44] 시장 분석 & 관리 철학">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <Lbl hint="[Q5] 환자들이 내원하는 진짜 이유">환자들이 오는 이유 (Q5)</Lbl>
            <STATextarea value={data.ch1.whyCome} onChange={(v: string) => upd1("whyCome", v)} placeholder="환자의 입장에서 생각하는 우리 병원의 매력" rows={4} readOnly={isReadOnly} listeningId={listeningId} onMic={startSTT} />
          </div>
          <div>
            <Lbl hint="[Q6] 반대로 내원하지 않거나 이탈하는 이유">환자들이 안 오는 이유 (Q6)</Lbl>
            <STATextarea value={data.ch1.whyLeave} onChange={(v: string) => upd1("whyLeave", v)} placeholder="개선이 필요한 약점이나 경쟁력 차이" rows={4} readOnly={isReadOnly} listeningId={listeningId} onMic={startSTT} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 pt-8 border-t border-slate-50">
          <div>
            <Lbl>원장님의 MBTI (Q3)</Lbl>
            <select value={data.ch1.mbti} onChange={e => upd1("mbti", e.target.value)} disabled={isReadOnly} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 active:scale-95 transition-all outline-none">
              <option value="">MBTI 선택</option>
              {MBTI_LIST.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <Lbl hint="[Q44] 평소 직원들을 관리하시는 기본 가치관">원장님의 직원 관리 철학 (Q44)</Lbl>
            <Inp value={data.ch1.philosophy} onChange={(v: string) => upd1("philosophy", v)} placeholder="예: 자율과 책임, 성과에 따른 확실한 보상" readOnly={isReadOnly} />
          </div>
        </div>
      </SCard>
    </div>
  );

  const renderCh2 = () => (
    <div className="space-y-10">
      <SCard title="📍 [30, 42] 입지 & 병원 공간 상세">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <Lbl hint="[Q30] 현재 병원 위치와 요일별 진료 시간">상세 주소 및 운영 시간</Lbl>
            <STATextarea value={data.ch2.addressHours} onChange={(v: string) => upd2("addressHours", v)} placeholder="예: 서울 강남구... 평일 9-7, 토 9-2" rows={5} readOnly={isReadOnly} listeningId={listeningId} onMic={startSTT} />
          </div>
          <div className="flex flex-col justify-center gap-6">
            <div>
              <Lbl hint="[Q42] 대기실, 진료실, 치료실 등 병원 전체 크기">병원 실평수 및 베드 수</Lbl>
              <Inp value={data.ch2.clinicSize} onChange={(v: string) => upd2("clinicSize", v)} placeholder="예: 45평, 베드 10개" readOnly={isReadOnly} />
            </div>
            <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100">
              <p className="text-xs text-blue-600 font-bold mb-1">PRO TIP</p>
              <p className="text-[11px] text-slate-500 leading-relaxed font-medium">환자 동선 최적화를 위해 실평수 대비 베드 배치가 중요합니다.</p>
            </div>
          </div>
        </div>
      </SCard>

      <SCard title="🔄 [11, 12, 15] 환자 동선 & 상담 시스템">
        <div className="space-y-8">
          <div>
            <Lbl hint="[Q11] 환자가 내원하여 수납하고 나갈 때까지의 전 과정">전체 환자 내원 동선 리허설</Lbl>
            <STATextarea id="ch2-flow" value={data.ch2.patientFlow} onChange={(v: string) => upd2("patientFlow", v)} placeholder="접수 -> 대기 -> 문진 -> 치료 -> 사후 안내 등 세밀하게 적어주세요." rows={6} readOnly={isReadOnly} listeningId={listeningId} onMic={startSTT} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-slate-50">
            <div>
              <Lbl hint="[Q12] 초진 환자에게 원장님이 직접 하시는 고정 멘트">원장님만의 진단/상담 멘트</Lbl>
              <STATextarea id="ch2-script" value={data.ch2.consultScript} onChange={(v: string) => upd2("consultScript", v)} placeholder="환자의 신뢰를 얻는 특별한 멘트가 있다면?" rows={6} readOnly={isReadOnly} listeningId={listeningId} onMic={startSTT} />
            </div>
            <div>
              <Lbl hint="[Q15] 한약 상담 후 결제까지 이어지는 원내 상세 시스템">상담 후 결제 유도 시스템</Lbl>
              <STATextarea value={data.ch2.herbConsultProcess} onChange={(v: string) => upd2("herbConsultProcess", v)} placeholder="예: 원장 상담 -> 실장 2차 상담 -> 수납실 결제 안내" rows={6} readOnly={isReadOnly} listeningId={listeningId} onMic={startSTT} />
            </div>
          </div>
        </div>
      </SCard>

      <SCard title="🌿 [31, 32, 33] 고객 관리 & 한약 시스템">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-8">
            <div>
              <Lbl hint="[Q31] 치료 후 환자 안부 연락 및 관리 시스템">해피콜 운영 현황</Lbl>
              <Inp value={data.ch2.happyCallSystem} onChange={(v: string) => upd2("happyCallSystem", v)} placeholder="예: 초진 환자 익일 카톡 알림톡 발송" readOnly={isReadOnly} />
            </div>
            <div>
              <Lbl hint="[Q32] 환자에게 한약 복용법을 전달하는 방식">한약 복용법 안내 과정</Lbl>
              <STATextarea value={data.ch2.herbInstructions} onChange={(v: string) => upd2("herbInstructions", v)} placeholder="예: '서면 가이드 배부 및 대면 설명'" rows={5} readOnly={isReadOnly} listeningId={listeningId} onMic={startSTT} />
            </div>
          </div>
          <div className="flex flex-col gap-8">
            <FileUpload label="복용 안내문/가이드 파일 제출 (Q32)" value={data.ch2.herbInstructionsFile} 
                        onUpload={(url: string) => upd2("herbInstructionsFile", url)} 
                        hint="실제 환자에게 나가는 안내 파일을 업로드해주세요." disabled={isReadOnly} />
            <div>
              <Lbl hint="[Q33] 현재 이용 중인 한약 관리/수납 관리 프로그램">한약 관리 시스템 종류</Lbl>
              <Inp value={data.ch2.herbManagementSystem} onChange={(v: string) => upd2("herbManagementSystem", v)} placeholder="예: 한차트, OK차트 연동 탕전 시스템" readOnly={isReadOnly} />
            </div>
          </div>
        </div>
      </SCard>
    </div>
  );

  const renderCh3 = () => (
    <div className="space-y-10">
      <SCard title="📋 [7, 8] 치료 철학 & 장비">
        <div className="space-y-8">
          <div>
            <Lbl hint="[Q8] 원장님이 생각하시는 치료와 경영의 정의를 각각 말씀 부탁드립니다.">치료와 경영의 정의</Lbl>
            <STATextarea id="ch3-treatmentDefinition" value={data.ch3.treatmentDefinition} onChange={(v: string) => upd3("treatmentDefinition", v)} placeholder="예: '치료는 환자의 고통 해결이며, 경영은 그 가치를 지속시키는 시스템이다'" rows={5} readOnly={isReadOnly} listeningId={listeningId} onMic={startSTT} />
          </div>
          <div>
            <Lbl hint="[Q7] 보유 중인 물리치료 및 검사기기를 상세히 알려주세요.">보유 물리치료 및 검사 기기 상세</Lbl>
            <STATextarea id="ch3-equipmentDetail" value={data.ch3.equipmentDetail} onChange={(v: string) => upd3("equipmentDetail", v)} placeholder="예: ICT 5대, 건식 반신욕기 2대, 체수분 분석기 등" rows={5} readOnly={isReadOnly} listeningId={listeningId} onMic={startSTT} />
          </div>
        </div>
      </SCard>

      <SCard title="🏥 [10, 13, 14] 임상 시스템 & 매뉴얼">
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <Lbl hint="[Q10] 환자들이 자주 묻는 질문 10~20가지와 표준 답변 리스트가 있나요?">환자 Q&A 리스트 현황 (10~20문항)</Lbl>
              <STATextarea id="ch3-patientQna" value={data.ch3.patientQna} onChange={(v: string) => upd3("patientQna", v)} placeholder="표준 답변 매뉴얼 보유 여부 및 주요 항목을 적어주세요." rows={6} readOnly={isReadOnly} listeningId={listeningId} onMic={startSTT} />
            </div>
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-center">
              <FileUpload label="환자 Q&A 리스트 파일 제출 (Q10)" value={data.ch3.patientQnaFile} 
                          onUpload={(url: string) => upd3("patientQnaFile", url)} 
                          hint="워드, 엑셀, 이미지 등 매뉴얼 파일을 업로드해주세요." disabled={isReadOnly} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-50 pt-8">
            <div>
              <Lbl hint="[Q13] 질환별로 정해진 치료 계획(기간, 횟수 등)이 있나요?">질환별 표준 치료 계획 여부</Lbl>
              <STATextarea id="ch3-diseasePlans" value={data.ch3.diseasePlans} onChange={(v: string) => upd3("diseasePlans", v)} placeholder="예: 급성 염좌 2주 6회, 만성 요통 4주 12회 등" rows={6} readOnly={isReadOnly} listeningId={listeningId} onMic={startSTT} />
            </div>
            <div>
              <Lbl hint="[Q14] 주로 보시는 근골격계 환자 상담 예시를 정규화하여 말씀 부탁드립니다.">근골격계 상담 예제 (대표 질환 루틴)</Lbl>
              <STATextarea id="ch3-mskExample" value={data.ch3.mskExample} onChange={(v: string) => upd3("mskExample", v)} placeholder="환자에게 질환의 원인과 경과를 설명하는 표준 방식을 적어주세요." rows={6} readOnly={isReadOnly} listeningId={listeningId} onMic={startSTT} />
            </div>
          </div>
        </div>
      </SCard>

      <SCard title="📝 [16] 차팅 및 청구 루틴 (주요 사례 3종)">
        <div className="space-y-8">
          {data.ch3.charting.map((row, idx) => (
            <div key={idx} className="p-8 rounded-3xl bg-slate-50 border border-slate-200 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-sm font-black shadow-lg shadow-indigo-200">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <Inp value={row.disease} onChange={(v: string) => { const a = [...data.ch3.charting]; a[idx] = { ...a[idx], disease: v }; setData(d => ({ ...d, ch3: { ...d.ch3, charting: a } })); }} placeholder="사례 질환명 (예: 급성 허리 염좌)" readOnly={isReadOnly} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <Lbl hint="주로 사용하는 침/전침 술기 및 청구 항목">침 / 전침</Lbl>
                  <STATextarea value={row.case1} onChange={(v: string) => { const a = [...data.ch3.charting]; a[idx] = { ...a[idx], case1: v }; setData(d => ({ ...d, ch3: { ...d.ch3, charting: a } })); }} placeholder="술기 방식 입력" rows={3} readOnly={isReadOnly} />
                </div>
                <div className="space-y-3">
                  <Lbl hint="부항/뜸 등 부수 처치 및 청구 항목">부항 / 뜸</Lbl>
                  <STATextarea value={row.case2} onChange={(v: string) => { const a = [...data.ch3.charting]; a[idx] = { ...a[idx], case2: v }; setData(d => ({ ...d, ch3: { ...d.ch3, charting: a } })); }} placeholder="처치 내용 입력" rows={3} readOnly={isReadOnly} />
                </div>
                <div className="space-y-3">
                  <Lbl hint="물리치료 및 기타 특수 처치 항목">물리치료 / 기타</Lbl>
                  <STATextarea value={row.case3} onChange={(v: string) => { const a = [...data.ch3.charting]; a[idx] = { ...a[idx], case3: v }; setData(d => ({ ...d, ch3: { ...d.ch3, charting: a } })); }} placeholder="청구 세트 입력" rows={3} readOnly={isReadOnly} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </SCard>

      <SCard title="💊 [17, 18, 19, 21] 처방 및 시술 권유 루틴">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <Lbl hint="[Q17] 질환별로 주로 사용하는 묶음 청구(세트) 방식이 있나요?">질환별 루틴 청구법</Lbl>
            <STATextarea id="ch3-billingRoutine" value={data.ch3.billingRoutine} onChange={(v: string) => upd3("billingRoutine", v)} placeholder="예: 허리 통침 + 부항 + ICT 세팅" rows={4} readOnly={isReadOnly} listeningId={listeningId} onMic={startSTT} />
          </div>
          <div>
            <Lbl hint="[Q18] 추나 치료 시 시술 전후 정해진 루틴이 있나요?">추나 치료 루틴 (전/후 과정)</Lbl>
            <STATextarea id="ch3-chunaRoutine" value={data.ch3.chunaRoutine} onChange={(v: string) => upd3("chunaRoutine", v)} placeholder="환자를 추나 베드에 눕히고 시술 후 마무리까지의 과정" rows={4} readOnly={isReadOnly} listeningId={listeningId} onMic={startSTT} />
          </div>
          <div>
            <Lbl hint="[Q19] 환자에게 한약이 왜 필요한지 설명하는 방식 (질병 치료 관점)">한약 치료 필요성 설명 예시</Lbl>
            <STATextarea value={data.ch3.herbRecommendation} onChange={(v: string) => upd3("herbRecommendation", v)} placeholder="약이 질병 치료에 어떻게 작용하는지 설명하는 멘트" rows={5} readOnly={isReadOnly} listeningId={listeningId} onMic={startSTT} />
          </div>
          <div>
            <Lbl hint="[Q21] 약침의 효능과 권유 멘트 예시 자료를 말씀 부탁드립니다.">약침 권유 및 효능 설명 루틴</Lbl>
            <STATextarea value={data.ch3.acupointRecommendation} onChange={(v: string) => upd3("acupointRecommendation", v)} placeholder="비급여 약침 시술을 권유할 때의 표준 상담 방식" rows={5} readOnly={isReadOnly} listeningId={listeningId} onMic={startSTT} />
          </div>
        </div>
      </SCard>
    </div>
  );

  const renderCh4 = () => (
    <div className="space-y-10">
      <SCard title="🎯 [22, 26] 희망 경영 목표 (매출/순익)">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            { f: "revenue", label: "월 총 매출 목표 (Q22)", hint: "비급여+자보+보험 포함" },
            { f: "profit", label: "월 순이익 목표 (Q22)", hint: "경비 제외 원장님 수익" },
            { f: "nonBenefit", label: "비급여 매출 목표 (Q22)", hint: "한약/약침/추나 등" },
            { f: "autoInsurance", label: "자동차보험 매출 목표 (Q22)", hint: "" },
            { f: "dailyPatients", label: "일평균 환자 수 목표 (Q22)", hint: "단위: 명" },
            { f: "workingDays", label: "희망 진료 일수 (Q26)", hint: "예: 주 5일, 09:00~18:00" },
          ].map(({ f, label, hint }) => (
            <div key={f}>
              <Lbl hint={hint}>{label}</Lbl>
              <Inp value={f === "workingDays" ? data.ch4.workingDays : data.ch4.targetMetrics[f as keyof typeof data.ch4.targetMetrics]} 
                   onChange={(v: string) => {
                     if (f === "workingDays") upd4("workingDays", v);
                     else setData(d => ({ ...d, ch4: { ...d.ch4, targetMetrics: { ...d.ch4.targetMetrics, [f]: v } } }));
                   }} 
                   placeholder={f === "dailyPatients" ? "예: 40" : (f === "workingDays" ? "예: 주 5.5일" : "예: 5,000 만 원")} 
                   readOnly={isReadOnly} />
            </div>
          ))}
        </div>
        <div className="mt-8 pt-8 border-t border-slate-50">
          <Lbl hint="[Q23] 순이익 발생 시 어떻게 관리하거나 투자하실 계획인가요?">수익 사용 계획 (Profit Usage)</Lbl>
          <STATextarea id="ch4-usage" value={data.ch4.profitUsage} onChange={(v: string) => upd4("profitUsage", v)} placeholder="수익 배정 비율이나 개인 연금, 병원 재투자 계획 등을 적어주세요." rows={5} readOnly={isReadOnly} listeningId={listeningId} onMic={startSTT} />
        </div>
      </SCard>

      <SCard title="💰 [24, 25, 28] 투자 및 성장 의사">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <Lbl hint="[Q28] 병원 개설 시 총 투자금 및 현재까지 회수된 금액은 얼마인가요?">투자금 및 회수 현황</Lbl>
            <STATextarea value={data.ch4.investmentHistory} onChange={(v: string) => upd4("investmentHistory", v)} placeholder="예: 초기 투자 4억, 현재 월 1,000씩 상환 중" rows={4} readOnly={isReadOnly} listeningId={listeningId} onMic={startSTT} />
          </div>
          <div>
            <Lbl hint="[Q24] 병원 성장을 위해 매달 추가로 지출 가능한 마케팅/시설 비용">추가 지불 비용 의사</Lbl>
            <STATextarea value={data.ch4.growthInvestment} onChange={(v: string) => upd4("growthInvestment", v)} placeholder="예: 매출 상승폭에 따라 월 300~500만 원까지 가능" rows={4} readOnly={isReadOnly} listeningId={listeningId} onMic={startSTT} />
          </div>
        </div>
        <div className="border-t border-slate-50 pt-8">
          <Lbl hint="[Q25] 더 빠른 성장을 위해 지금 당장 투입 가능한 투자금이 있으신가요?">즉시 투자 가능 금액</Lbl>
          <Inp value={data.ch4.immediateInvestment} onChange={(v: string) => upd4("immediateInvestment", v)} placeholder="예: 2,000만 원" readOnly={isReadOnly} />
        </div>
      </SCard>

      <SCard title="📈 [27, 29] 지표 관리 & 경영 상세">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          <div>
            <Lbl hint="[Q27] 매일/매주 확인하시는 핵심 지표와 관리 자료가 있나요?">관찰 지표 및 관리 방법</Lbl>
            <STATextarea id="ch4-ind" value={data.ch4.indicators} onChange={(v: string) => upd4("indicators", v)} placeholder="예: '일일 신환수와 총 매출액을 엑셀로 별기 중'" rows={6} readOnly={isReadOnly} listeningId={listeningId} onMic={startSTT} />
          </div>
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-center">
            <FileUpload label="지표 관리 양식/자료 제출 (Q27)" value={data.ch4.indicatorsFile} 
                        onUpload={(url: string) => upd4("indicatorsFile", url)} 
                        hint="평소 기록하시는 대시보드나 엑셀 양식을 업로드해주세요." disabled={isReadOnly} />
          </div>
        </div>
        
        <div className="border-t border-slate-50 pt-8">
          <Lbl hint="[Q29] 현재 한 달 평균 지출되는 경비 내역을 상세히 알려주세요.">월평균 경비 내역 상세</Lbl>
          <div className="overflow-x-auto mt-4 p-6 bg-slate-50 rounded-3xl border border-slate-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  {["경비 항목 (Q29)", "월 금액 (만 원)"].map(h => <th key={h} className="text-left py-4 pr-4 font-black text-slate-500 text-xs uppercase tracking-wider">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.ch4.expenses.map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-100 last:border-0">
                    <td className="py-4 pr-4">
                      <Inp value={row.item} onChange={(v: string) => { const a = [...data.ch4.expenses]; a[idx] = { ...a[idx], item: v }; setData(d => ({ ...d, ch4: { ...d.ch4, expenses: a } })); }} placeholder="예: 임대료" readOnly={isReadOnly} />
                    </td>
                    <td className="py-4">
                      <Inp value={row.amount} onChange={(v: string) => { const a = [...data.ch4.expenses]; a[idx] = { ...a[idx], amount: v }; setData(d => ({ ...d, ch4: { ...d.ch4, expenses: a } })); }} placeholder="0" type="number" readOnly={isReadOnly} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!isReadOnly && (
              <button onClick={() => { setData(d => ({ ...d, ch4: { ...d.ch4, expenses: [...d.ch4.expenses, { item: "", amount: "" }] } })); }}
                className="mt-6 px-6 py-3 text-xs font-black text-blue-600 bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-blue-100 flex items-center gap-2">
                <PlusCircle size={14} /> 항목 추가하기
              </button>
            )}
          </div>
        </div>
      </SCard>
    </div>
  );

  const renderCh5 = () => (
    <div className="space-y-10">
      <SCard title="👥 [34, 43] 직원 구성 & 파트별 인원">
        <div className="overflow-x-auto p-6 bg-slate-50 rounded-3xl border border-slate-100">
          <Lbl hint="[Q34] 현재 함께 일하고 있는 직원분들의 상세 처우 현황을 파악합니다.">상세 직원 리스트 (Q34)</Lbl>
          <table className="w-full text-sm mt-4">
            <thead>
              <tr className="border-b border-slate-200">
                {["직책", "급여(만/월)", "근무일", "근무시간", "인센티브"].map(h => <th key={h} className="text-left py-4 pr-3 font-black text-slate-500 text-xs uppercase tracking-wider">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.ch5.staff.map((row, idx) => (
                <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-100/50 transition-colors">
                  <td className="py-4 pr-2"><Inp value={row.role} onChange={(v: string) => { const a = [...data.ch5.staff]; a[idx] = { ...a[idx], role: v }; setData(d => ({ ...d, ch5: { ...d.ch5, staff: a } })); }} placeholder="실장" readOnly={isReadOnly} /></td>
                  <td className="py-4 pr-2"><Inp value={row.salary} onChange={(v: string) => { const a = [...data.ch5.staff]; a[idx] = { ...a[idx], salary: v }; setData(d => ({ ...d, ch5: { ...d.ch5, staff: a } })); }} placeholder="350" readOnly={isReadOnly} /></td>
                  <td className="py-4 pr-2"><Inp value={row.days} onChange={(v: string) => { const a = [...data.ch5.staff]; a[idx] = { ...a[idx], days: v }; setData(d => ({ ...d, ch5: { ...d.ch5, staff: a } })); }} placeholder="주 5일" readOnly={isReadOnly} /></td>
                  <td className="py-4 pr-2"><Inp value={row.hours} onChange={(v: string) => { const a = [...data.ch5.staff]; a[idx] = { ...a[idx], hours: v }; setData(d => ({ ...d, ch5: { ...d.ch5, staff: a } })); }} placeholder="09:00-19:00" readOnly={isReadOnly} /></td>
                  <td className="py-4"><Inp value={row.incentive} onChange={(v: string) => { const a = [...data.ch5.staff]; a[idx] = { ...a[idx], incentive: v }; setData(d => ({ ...d, ch5: { ...d.ch5, staff: a } })); }} placeholder="목표 달성 시" readOnly={isReadOnly} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isReadOnly && (
            <button onClick={() => setData(d => ({ ...d, ch5: { ...d.ch5, staff: [...data.ch5.staff, { role: "", salary: "", days: "", hours: "", incentive: "" }] } }))}
              className="mt-6 px-6 py-3 text-xs font-black text-blue-600 bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-blue-100">
              + 직원 추가하기
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-10">
          {[
            { f: "desk", label: "데스크 인원 (Q43)" },
            { f: "treatment", label: "치료실 인원 (Q43)" },
            { f: "decoction", label: "탕전실 인원 (Q43)" },
            { f: "other", label: "기타 인원 (Q43)" },
          ].map(({ f, label }) => (
            <div key={f}>
              <Lbl>{label}</Lbl>
              <Inp value={data.ch5.staffCounts[f as keyof typeof data.ch5.staffCounts]} onChange={(v: string) => setData(d => ({ ...d, ch5: { ...d.ch5, staffCounts: { ...d.ch5.staffCounts, [f]: v } } }))} placeholder="0명" readOnly={isReadOnly} />
            </div>
          ))}
        </div>
      </SCard>

      <SCard title="🍎 [35-41] 복리후생 & 식사 문화">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { f: "nightMeal", label: "야간 식사 (Q35)" },
            { f: "snack", label: "간식 제공 (Q36)" },
            { f: "lunch", label: "점심 식사 (Q37)" },
            { f: "eatTogether", label: "원장과 식사 (Q38)" },
          ].map(({ f, label }) => (
            <div key={f}>
              <Lbl hint="제공 방식 및 비용">{label}</Lbl>
              <Inp value={data.ch5.mealSnack[f as keyof typeof data.ch5.mealSnack]} onChange={(v: string) => setData(d => ({ ...d, ch5: { ...d.ch5, mealSnack: { ...d.ch5.mealSnack, [f]: v } } }))} placeholder="예: 법인카드 결제" readOnly={isReadOnly} />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
          <div>
            <Lbl hint="[Q39, 40] 교통비, 연차, 유니폼, 경조사비 등 상세하게 말씀 부탁드립니다.">복지 혜택 상세 (Q39, 40)</Lbl>
            <STATextarea value={data.ch5.welfare} onChange={(v: string) => upd5("welfare", v)} placeholder="우리 병원만의 특별한 복지 제도를 모두 적어주세요." rows={5} readOnly={isReadOnly} listeningId={listeningId} onMic={startSTT} />
          </div>
          <div>
            <Lbl hint="[Q41] 직원 본인 또는 지인 내원 시 혜택이 어찌 되나요?">본인/지인 할인 혜택 (Q41)</Lbl>
            <STATextarea value={data.ch5.staffDiscount} onChange={(v: string) => upd5("staffDiscount", v)} placeholder="할인율 및 적용 범위를 상세히 적어주세요." rows={5} readOnly={isReadOnly} listeningId={listeningId} onMic={startSTT} />
          </div>
        </div>
      </SCard>

      <SCard title="🌱 [46, 47] 인재상 & 역할 기대">
        <div className="space-y-8">
          <div>
            <Lbl hint="[Q46] 어떤 성향과 능력을 가진 사람과 일하고 싶으신가요?">함께 일하고 싶은 원장님의 인재상</Lbl>
            <STATextarea id="ch5-idealStaff" value={data.ch5.idealStaff} onChange={(v: string) => upd5("idealStaff", v)} placeholder="예: '환자에게 따뜻하고 학습 성장이 빠른 사람'" rows={5} readOnly={isReadOnly} listeningId={listeningId} onMic={startSTT} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-slate-50">
            <div>
              <Lbl hint="[Q47] 팀장/실장에게 기대하는 핵심 역할">중간관리자 역할 기대치</Lbl>
              <STATextarea id="ch5-managerExp" value={data.ch5.expectations.manager} onChange={(v: string) => setData(d => ({ ...d, ch5: { ...d.ch5, expectations: { ...d.ch5.expectations, manager: v } } }))} placeholder="기대하는 핵심 역량과 책임" rows={5} readOnly={isReadOnly} listeningId={listeningId} onMic={startSTT} />
            </div>
            <div>
              <Lbl hint="[Q47] 일반 직원들에게 기대하는 핵심 역할">일반 직원 역할 기대치</Lbl>
              <STATextarea id="ch5-regularExp" value={data.ch5.expectations.regular} onChange={(v: string) => setData(d => ({ ...d, ch5: { ...d.ch5, expectations: { ...d.ch5.expectations, regular: v } } }))} placeholder="기대하는 태도와 업무 수준" rows={5} readOnly={isReadOnly} listeningId={listeningId} onMic={startSTT} />
            </div>
          </div>
          <div>
            <Lbl hint="[Q47] 원장님은 직원들과 얼마나 자주 소통(면담) 하시나요?">소통/면담 주기 및 방식</Lbl>
            <STATextarea value={data.ch5.expectations.communication} onChange={(v: string) => setData(d => ({ ...d, ch5: { ...d.ch5, expectations: { ...d.ch5.expectations, communication: v } } }))} placeholder="예: 매월 1회 개별 면담, 분기별 정기 회식" rows={3} readOnly={isReadOnly} listeningId={listeningId} onMic={startSTT} />
          </div>
        </div>
      </SCard>

      <SCard title="📱 [48, 49] 채팅 소통 시스템 (증빙 캡처 제출)">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          <div>
            <Lbl hint="[Q48] 평소 사용하는 소통 프로그램 (카톡, 슬랙, 밴드 등)">주 사용 소통 프로그램</Lbl>
            <Inp value={data.ch5.chatSystem.program} onChange={(v: string) => setData(d => ({ ...d, ch5: { ...d.ch5, chatSystem: { ...d.ch5.chatSystem, program: v } } }))} placeholder="카카오톡" readOnly={isReadOnly} />
          </div>
          <div>
            <Lbl hint="[Q49] 현재 생성되어 있는 채팅방 구분 및 활용 목적">채팅 채널 활용법 (방 별 목적)</Lbl>
            <Inp value={data.ch5.chatSystem.channels} onChange={(v: string) => setData(d => ({ ...d, ch5: { ...d.ch5, chatSystem: { ...d.ch5.chatSystem, channels: v } } }))} placeholder="예: 공지방, 진료보고방, 행정지원방 분리" readOnly={isReadOnly} />
          </div>
        </div>
        <div className="p-8 bg-slate-100 rounded-3xl border border-slate-200">
          <Lbl hint="[Q49] 원내 채팅 채널 구분 사진 및 실제 대화 내용 캡처, 가이드라인 파일을 제출해주세요.">채팅 시스템 증빙 자료 (파일 3개 세트)</Lbl>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <FileUpload label="캡처1: 전체 채널 구분" value={data.ch5.chatSystem.capture1} 
                        onUpload={(url: string) => setData(d => ({ ...d, ch5: { ...d.ch5, chatSystem: { ...d.ch5.chatSystem, capture1: url } } }))} 
                        disabled={isReadOnly} />
            <FileUpload label="캡처2: 대화 내용 예시" value={data.ch5.chatSystem.capture2} 
                        onUpload={(url: string) => setData(d => ({ ...d, ch5: { ...d.ch5, chatSystem: { ...d.ch5.chatSystem, capture2: url } } }))} 
                        disabled={isReadOnly} />
            <FileUpload label="소통 가이드라인 (문서)" value={data.ch5.chatSystem.guideFile} 
                        onUpload={(url: string) => setData(d => ({ ...d, ch5: { ...d.ch5, chatSystem: { ...d.ch5.chatSystem, guideFile: url } } }))} 
                        disabled={isReadOnly} />
          </div>
        </div>
      </SCard>

      <SCard title="📖 [50, 51] 교육 및 회의 시스템">
        <div className="space-y-8">
          <div>
            <Lbl hint="[Q50] 매주/매월 정기 교육 및 회의 시스템 정보를 알려주세요.">원내 교육/회의 주기 및 운영 방식</Lbl>
            <STATextarea id="ch1-eduMeeting" value={data.ch5.eduMeeting} onChange={(v: string) => upd5("eduMeeting", v)} placeholder="예: 매주 화요일 진료 전 30분 직무 교육 개최" rows={5} readOnly={isReadOnly} listeningId={listeningId} onMic={startSTT} />
          </div>
          <div className="p-8 bg-blue-50/50 rounded-3xl border border-blue-100/50">
            <Lbl hint="[Q51] 현재 병원에 구비된 원내 교육 자료 3가지 정도를 첨부 부탁드립니다.">핵심 교육 자료 공유 (최대 3개)</Lbl>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              {[0, 1, 2].map(idx => (
                <FileUpload key={idx} label={`교육 자료 ${idx + 1}`} 
                            value={data.ch5.eduMaterials[idx] || ""} 
                            onUpload={(url: string) => {
                              const a = [...data.ch5.eduMaterials];
                              a[idx] = url;
                              setData(d => ({ ...d, ch5: { ...d.ch5, eduMaterials: a } }));
                            }} disabled={isReadOnly} />
              ))}
            </div>
          </div>
        </div>
      </SCard>
    </div>
  );

  const renderCh6 = () => (
    <div className="space-y-10">
      <SCard title="🛡️ [52] 비상 대응 매뉴얼 (개별 증빙 제출)">
        <div>
          <Lbl hint="[Q52] 각 상황에 대해 교육을 완료하고 대응 매뉴얼이 있다면 체크 후 파일을 업로드해 주세요.">원내 안전 및 비상 대응 시스템 (18항목)</Lbl>
          <div className="grid grid-cols-1 gap-4 mt-6">
            {SAFETY_ITEMS.map(item => {
              const isChecked = data.ch6.safetyItems[item];
              const fileUrl = data.ch6.safetyFiles[item];
              return (
                <div key={item} className={`p-6 rounded-3xl border-2 transition-all ${isChecked ? "border-blue-400 bg-blue-50/30" : "border-slate-100 bg-white"}`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <button disabled={isReadOnly}
                      onClick={() => setData(d => ({ ...d, ch6: { ...d.ch6, safetyItems: { ...d.ch6.safetyItems, [item]: !isChecked } } }))}
                      className="flex items-center gap-4 text-left group">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 font-black text-sm transition-all shadow-md ${isChecked ? "bg-blue-600 text-white" : "bg-white text-slate-300 border border-slate-200"}`}>
                        {isChecked ? <Check size={20} /> : "X"}
                      </div>
                      <div>
                        <span className={`text-base font-bold transition-colors ${isChecked ? "text-blue-900" : "text-slate-400"}`}>{item}</span>
                        <p className="text-[10px] text-slate-400 mt-0.5">교육 완료 및 매뉴얼 보유 시 체크</p>
                      </div>
                    </button>
                    {isChecked && (
                      <div className="md:w-72">
                        <FileUpload label="" value={fileUrl || ""} 
                                    onUpload={(url: string) => setData(d => ({ ...d, ch6: { ...d.ch6, safetyFiles: { ...d.ch6.safetyFiles, [item]: url } } }))} 
                                    hint="매뉴얼 사진/문서" disabled={isReadOnly} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-10 p-8 bg-slate-900 rounded-[2.5rem] shadow-xl text-white">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-black text-blue-400">SAFETY SYSTEM PROGRESS</p>
              <p className="text-xl font-black">{Math.round(Object.values(data.ch6.safetyItems).filter(Boolean).length / SAFETY_ITEMS.length * 100)}%</p>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-3"><div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${Object.values(data.ch6.safetyItems).filter(Boolean).length / SAFETY_ITEMS.length * 100}%` }} /></div>
            <p className="text-[10px] text-slate-500 mt-4 text-center">전체 {SAFETY_ITEMS.length}개 항목 중 {Object.values(data.ch6.safetyItems).filter(Boolean).length}개 완료</p>
          </div>
        </div>
      </SCard>

      <SCard title="📢 [53, 54] 마케팅 현황 & 원내 홍보">
        <div className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <Lbl hint="[Q53] 현재 이용 중인 마케팅 채널, 월 비용 및 달성하고 싶은 구체적 목표">마케팅 채널 및 경영 목표</Lbl>
              <div className="grid grid-cols-1 gap-5">
                <div>
                  <Lbl hint="채널 및 상세 내용">현재 마케팅 현황</Lbl>
                  <STATextarea value={data.ch6.marketingStatus.channels} onChange={(v: string) => setData(d => ({ ...d, ch6: { ...d.ch6, marketingStatus: { ...d.ch6.marketingStatus, channels: v } } }))} placeholder="예: 블로그 체험단(월 100), 당근마켓 광고(월 20) 등" rows={4} readOnly={isReadOnly} listeningId={listeningId} onMic={startSTT} />
                </div>
                <div>
                  <Lbl hint="월 마케팅 총 지출">월 마케팅 비용</Lbl>
                  <Inp value={data.ch6.marketingStatus.cost} onChange={(v: string) => setData(d => ({ ...d, ch6: { ...d.ch6, marketingStatus: { ...d.ch6.marketingStatus, cost: v } } }))} placeholder="예: 250만 원" readOnly={isReadOnly} />
                </div>
                <div>
                  <Lbl hint="마케팅을 통해 얻고자 하는 구체적 결과">마케팅 목표 (KPI)</Lbl>
                  <Inp value={data.ch6.marketingStatus.goal} onChange={(v: string) => setData(d => ({ ...d, ch6: { ...d.ch6, marketingStatus: { ...d.ch6.marketingStatus, goal: v } } }))} placeholder="예: 월 신환 100명 유입" readOnly={isReadOnly} />
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <Lbl hint="[Q54] 병원 내부에 비치된 홍보물(배너, 전단지, 책자 등) 현황">원내 홍보물 현황 (배너/책자 등)</Lbl>
              <STATextarea value={data.ch6.promoMaterials} onChange={(v: string) => setData(d => ({ ...d, ch6: { ...d.ch6, promoMaterials: v } }))} placeholder="예: 거북목 배너 2개, 보약 홍보 책자 1종 비치 중" rows={11} readOnly={isReadOnly} listeningId={listeningId} onMic={startSTT} />
            </div>
          </div>
          <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100">
            <Lbl hint="[Q54] 실제 병원에 비치된 홍보물 사진을 업로드해 주세요 (최대 5개)">원내 홍보물 증빙 사진 제출</Lbl>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
              {[0, 1, 2, 3, 4].map(idx => (
                <FileUpload key={idx} label={`사진 ${idx + 1}`} 
                            value={data.ch6.promoPhotos[idx] || ""} 
                            onUpload={(url: string) => {
                              const a = [...(data.ch6.promoPhotos || [])];
                              a[idx] = url;
                              setData(d => ({ ...d, ch6: { ...d.ch6, promoPhotos: a } }));
                            }} disabled={isReadOnly} />
              ))}
            </div>
          </div>
        </div>
      </SCard>

      <SCard title="✨ 마지막 질문: 컨설팅의 최종 목표">
        <Lbl hint="이번 컨설팅을 통해 도달하고 싶은 모습">내가 꿈꾸는 경영 명인의 자화상</Lbl>
        <STATextarea value={data.ch6.finalGoal} onChange={(v: string) => setData(d => ({ ...d, ch6: { ...d.ch6, finalGoal: v } }))} placeholder="원장님이 생각하시는 최종적인 경영 비전을 적어주세요." rows={5} readOnly={isReadOnly} listeningId={listeningId} onMic={startSTT} />
      </SCard>

      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-10 text-center text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.15)_0%,transparent_70%)]" />
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/20 border border-blue-400/30 rounded-full">
            <Sparkles size={14} className="text-blue-400" />
            <span className="text-xs font-black text-blue-300 uppercase tracking-widest">AI Powered Analysis</span>
          </div>
          <h3 className="text-2xl md:text-3xl font-black leading-tight">
            이 모든 답변은 AI 분석을 통해 <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">원장님만을 위한 맞춤형 컨설팅 리포트</span>로<br />자동 변환됩니다.
          </h3>
          <div className="flex items-center justify-center gap-6 pt-2">
            {[{ icon: Star, label: "브랜딩 분석", color: "text-amber-400" }, { icon: Target, label: "경영 목표", color: "text-rose-400" }, { icon: Zap, label: "AI 맞춤 전략", color: "text-blue-400" }].map(({ icon: I, label, color }) => (
              <div key={label} className="flex items-center gap-2"><I size={16} className={color} /><span className="text-xs text-slate-300 font-bold">{label}</span></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const chaptersRender = [renderCh1, renderCh2, renderCh3, renderCh4, renderCh5, renderCh6];
  const ch = CHAPTER_CONFIG[step - 1];
  const Icon = ch.icon;

  if (status === "loading") return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-white">
      <RadarWidget radarData={radarData} />

      {stampStep !== null && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
          <div className="animate-bounce-once bg-white rounded-[40px] p-10 shadow-2xl border-4 border-blue-500 text-center">
            <div className="text-6xl mb-3">✅</div>
            <p className="font-black text-blue-700 text-xl">Chapter {stampStep} 완료!</p>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-slate-100 transition text-slate-400"><ChevronLeft size={18} /></button>
              <div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">바른컨설팅 정밀 진단 워크북</p>
                <h1 className="text-slate-900 font-black text-sm">Chapter {step} / 6 — {ch.title}</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black ${level.bg} ${level.color}`}>
                <span>{level.icon}</span>{level.name}
              </div>
              <div className="text-right">
                <span className="text-xs font-black text-slate-700">{fillPct.total}%</span>
              </div>
              <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border ${saveStatus === "saved" ? "bg-green-50 border-green-200 text-green-600" : saveStatus === "saving" ? "bg-blue-50 border-blue-200 text-blue-600 animate-pulse" : "bg-amber-50 border-amber-200 text-amber-600"}`}>
                <Save size={12} />{saveStatus === "saved" ? "저장됨" : saveStatus === "saving" ? "저장 중..." : "미저장"}
              </div>
            </div>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-3">
            <div className={`h-full bg-gradient-to-r ${ch.color} rounded-full transition-all duration-700`} style={{ width: `${Math.max(4, fillPct.total)}%` }} />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {CHAPTER_CONFIG.map(c => {
              const CI = c.icon;
              const done = fillPct.chapters[c.id - 1] === 1;
              return (
                <button key={c.id} onClick={() => setStep(c.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black whitespace-nowrap transition-all ${step === c.id ? `bg-gradient-to-r ${c.color} text-white shadow-md` : done ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-slate-50 text-slate-300"}`}>
                  {done ? <Check size={10} /> : <CI size={10} />}{c.title.split(" ")[0]}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {submitted && (
        <div className={`${isMaster ? "bg-amber-50 border-b border-amber-200 text-amber-700" : "bg-blue-50 border-b border-blue-200 text-blue-700"} px-6 py-3 text-center`}>
          <div className="flex items-center justify-center gap-2 text-sm font-bold">
            <Lock size={14} />
            {isMaster ? "마스터 권한으로 수정 가능합니다." : "제출이 완료되었습니다. 수정이 잠겨있습니다."}
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8 flex items-start gap-5">
          <div className={`p-4 bg-gradient-to-br ${ch.color} rounded-3xl shadow-lg flex-shrink-0`}>
            <Icon size={32} className="text-white" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Chapter {step} • {ch.subtitle} • 예상 5~10분</p>
            <h2 className="text-3xl font-black text-slate-900">{ch.title}</h2>
          </div>
        </div>

        {chaptersRender[step - 1]()}

        <div className={`flex items-center mt-10 pt-8 border-t border-slate-100 ${step === 1 ? "justify-end" : "justify-between"}`}>
          {step > 1 && (
            <button onClick={() => { setStep(s => s - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all">
              <ChevronLeft size={16} />이전 챕터
            </button>
          )}
          {step < 6 ? (
            <button onClick={validateAndNext}
              className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-bold text-sm text-white shadow-lg transition-all hover:opacity-90 active:scale-95 bg-gradient-to-r ${ch.color}`}>
              임시 저장 후 다음 <ChevronRight size={16} />
            </button>
          ) : !submitted ? (
            <button onClick={handleSubmit}
              className="flex items-center gap-2 px-8 py-3 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg hover:opacity-90 active:scale-95 transition-all">
              <Check size={16} />✨ 최종 제출 & AI 분석 요청
            </button>
          ) : (
            <div className="flex items-center gap-2 px-8 py-3 rounded-2xl font-bold text-sm text-slate-400 bg-slate-100 border border-slate-200">
              <Lock size={16} />제출 완료
            </div>
          )}
        </div>
      </main>

      {showSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="bg-white rounded-[40px] p-12 max-w-md w-full mx-4 text-center shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-300">
            <div className="relative mb-8">
              <div className="w-28 h-28 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[28px] flex items-center justify-center mx-auto shadow-2xl shadow-blue-500/30">
                <span className="text-5xl">🏆</span>
              </div>
            </div>
            <h2 className="text-4xl font-black text-slate-900 mb-2">수고하셨습니다!</h2>
            <p className="text-lg text-blue-600 font-bold mb-4">워크북 제출 완료! 🎉</p>
            <p className="text-slate-500 text-sm leading-relaxed mb-8">
              원장님의 모든 답변이 성공적으로 저장되었습니다.<br />
              <span className="font-bold text-slate-700">바른컨설팅 AI</span>가 맞춤형 분석 리포트를 곧 준비합니다.
            </p>
            <button
              onClick={() => router.push("/")}
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-black text-lg rounded-2xl shadow-xl shadow-blue-500/30 hover:opacity-90 active:scale-95 transition-all"
            >
              ✅ 확인 — 메인으로 이동
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
