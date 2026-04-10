"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ChevronRight, ChevronLeft, Check, User, Stethoscope, ClipboardList,
  BarChart3, Users, Shield, Upload, X, Sparkles, Mic, MicOff,
  Star, Target, Zap, Save, Lock, AlertCircle
} from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer
} from "recharts";
import toast from "react-hot-toast";

// ─── Types ──────────────────────────────────────────────────────────────────
type SurveyData = {
  ch1: { name: string; clinic: string; degree: string; specialist: string; media: string; vision: string; mission: string; goal: string; mbti: string; };
  ch2: { whyCome: string; whyLeave: string; patientFlow: string; consultScript: string; };
  ch3: { charting: { disease: string; approach: string; billing: string }[]; chuna: string; herbalAcupoint: string; herbMedicine: string; equipment: string; };
  ch4: { revenueGoal: string; profitGoal: string; expenses: { item: string; amount: string }[]; dataMethod: string; };
  ch5: { staff: { role: string; salary: string; welfare: string; incentive: string }[]; philosophy: string; channels: string; };
  ch6: { meetingSchedule: string; safetyItems: Record<string, boolean>; };
};

const MBTI_LIST = ["INTJ","INTP","ENTJ","ENTP","INFJ","INFP","ENFJ","ENFP","ISTJ","ISFJ","ESTJ","ESFJ","ISTP","ISFP","ESTP","ESFP"];

const SAFETY_ITEMS = [
  "화상 대응 매뉴얼","낙상 예방 및 대응","아나필락시스 쇼크","침 부작용 대응","한약 알레르기 대응",
  "응급 CPR 교육","감염병 대응 SOP","화재 대피 훈련","의료 폐기물 처리","전기/가스 안전 점검",
  "소독 및 위생 관리","직원 성희롱 예방","환자 개인정보 보호","의료분쟁 대응 절차","야간 긴급 연락망",
  "특이 체질 환자 관리","외상 응급 처치","정신건강 위기 대응"
];

const CHAPTER_CONFIG = [
  { id: 1, icon: User,          title: "원장님 브랜딩",       subtitle: "Who You Are",        color: "from-blue-500 to-indigo-600",    bg: "#3182f6" },
  { id: 2, icon: Stethoscope,   title: "진료 시스템 & 동선",  subtitle: "Clinic UX",           color: "from-cyan-500 to-blue-600",     bg: "#06b6d4" },
  { id: 3, icon: ClipboardList, title: "임상 루틴 & 처방",    subtitle: "Clinical Routine",    color: "from-indigo-500 to-purple-600", bg: "#6366f1" },
  { id: 4, icon: BarChart3,     title: "지표와 경영",          subtitle: "Numbers & Goals",    color: "from-violet-500 to-indigo-600", bg: "#8b5cf6" },
  { id: 5, icon: Users,         title: "팀 빌딩 & 조직 문화", subtitle: "HR Management",       color: "from-blue-600 to-cyan-500",     bg: "#2563eb" },
  { id: 6, icon: Shield,        title: "위험 관리 & 매뉴얼",  subtitle: "Safety & Education", color: "from-slate-700 to-blue-800",    bg: "#334155" },
];

const BENCHMARKS: Record<string, string> = {
  revenueGoal: "전국 평균: 3,200만 원/월",
  profitGoal:  "전국 평균: 1,400만 원/월",
  임대료: "강남구 평균: 350만 원/월",
  인건비: "직원 3명 기준: 900만 원/월",
};

const LEVELS = [
  { min: 0,   name: "수련생",         icon: "🌱", color: "text-green-600",  bg: "bg-green-50  border-green-200" },
  { min: 20,  name: "수련의",         icon: "📘", color: "text-slate-600",  bg: "bg-slate-50  border-slate-200" },
  { min: 40,  name: "전문의",         icon: "⚕️", color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-200" },
  { min: 60,  name: "명의",           icon: "🏅", color: "text-blue-600",   bg: "bg-blue-50   border-blue-200" },
  { min: 80,  name: "원장 마에스트로", icon: "🌟", color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200" },
  { min: 100, name: "경영 명인",       icon: "👑", color: "text-amber-600",  bg: "bg-amber-50  border-amber-200" },
];

const ENCOURAGEMENTS: Record<string, string> = {
  "2": "훌륭합니다! 브랜딩이 완성됐어요! 다음으로 가볼까요? 💪",
  "3": "핵심을 완벽히 정리하셨어요! 이미 절반입니다 🔥",
  "4": "임상 루틴까지 완성! 거의 다 왔어요! 🏅",
  "5": "숫자로 보니 더욱 선명하죠? 팀을 살펴볼 차례입니다 💫",
  "6": "조직 문화까지! 마지막 관문만 남았어요 🚀",
};

const initialData: SurveyData = {
  ch1: { name: "", clinic: "", degree: "", specialist: "", media: "", vision: "", mission: "", goal: "", mbti: "" },
  ch2: { whyCome: "", whyLeave: "", patientFlow: "", consultScript: "" },
  ch3: { charting: [{ disease:"", approach:"", billing:"" }, { disease:"", approach:"", billing:"" }, { disease:"", approach:"", billing:"" }], chuna: "", herbalAcupoint: "", herbMedicine: "", equipment: "" },
  ch4: { revenueGoal: "", profitGoal: "", expenses: [{ item:"임대료", amount:"" }, { item:"인건비", amount:"" }, { item:"재료비", amount:"" }, { item:"마케팅비", amount:"" }, { item:"기타", amount:"" }], dataMethod: "" },
  ch5: { staff: [{ role:"", salary:"", welfare:"", incentive:"" }, { role:"", salary:"", welfare:"", incentive:"" }], philosophy: "", channels: "" },
  ch6: { meetingSchedule: "", safetyItems: Object.fromEntries(SAFETY_ITEMS.map(i => [i, false])) },
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

// ─── Helpers ─────────────────────────────────────────────────────────────────
const calcFill = (fields: string[]) => {
  if (fields.length === 0) return 0;
  return Math.min(1, fields.filter(f => f && f.trim().length > 0).length / fields.length);
};

const getLevel = (pct: number) => {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (pct >= LEVELS[i].min) return LEVELS[i];
  }
  return LEVELS[0];
};

// ─── Sub-components ──────────────────────────────────────────────────────────
const Lbl = ({ children, hint }: { children: React.ReactNode; hint?: string }) => (
  <div className="mb-2">
    <label className="block text-sm font-bold text-slate-700">{children}</label>
    {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
  </div>
);

const Inp = ({ id, value, onChange, placeholder, type = "text", err, readOnly }: {
  id?: string; value: string; onChange: (v: string) => void; placeholder?: string;
  type?: string; err?: boolean; readOnly?: boolean;
}) => (
  <input
    id={id} type={type} value={value} readOnly={readOnly}
    onChange={e => onChange(e.target.value)} placeholder={placeholder}
    className={`w-full px-4 py-3 rounded-xl border text-slate-800 text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-2 transition-all ${
      err ? "border-red-400 bg-red-50 focus:ring-red-300 animate-shake" : "border-slate-200 bg-white focus:ring-blue-500/30 focus:border-blue-400"
    } ${readOnly ? "opacity-60 cursor-not-allowed" : ""}`}
  />
);

interface TextareaProps {
  id: string; value: string; onChange: (v: string) => void; placeholder?: string;
  rows?: number; err?: boolean; readOnly?: boolean; listeningId: string | null;
  onMic: (fieldId: string, cb: (t: string) => void) => void;
}
const STATextarea = ({ id, value, onChange, placeholder, rows = 4, err, readOnly, listeningId, onMic }: TextareaProps) => (
  <div className="relative">
    <textarea
      id={id} rows={rows} value={value} readOnly={readOnly}
      onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className={`w-full px-4 py-3 pr-12 rounded-xl border text-slate-800 text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-2 transition-all resize-none ${
        err ? "border-red-400 bg-red-50 focus:ring-red-300" : "border-slate-200 bg-white focus:ring-blue-500/30 focus:border-blue-400"
      } ${readOnly ? "opacity-60 cursor-not-allowed" : ""}`}
    />
    {!readOnly && (
      <button
        type="button"
        onClick={() => onMic(id, (t) => onChange(value ? value + " " + t : t))}
        className={`absolute top-2.5 right-2.5 p-2 rounded-xl transition-all ${
          listeningId === id
            ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30"
            : "bg-slate-100 text-slate-400 hover:bg-blue-50 hover:text-blue-500"
        }`}
      >
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

// ─── Radar Widget ─────────────────────────────────────────────────────────────
const RadarWidget = ({ radarData }: { radarData: { subject: string; fill: number }[] }) => (
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
      <div className="space-y-1 mt-1">
        {radarData.map(d => (
          <div key={d.subject} className="flex items-center gap-2">
            <div className="h-1 bg-slate-100 rounded-full flex-1 overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${d.fill}%` }} />
            </div>
            <span className="text-[10px] text-slate-400 font-bold w-7 text-right">{d.fill}%</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ─── Profile Card Preview ─────────────────────────────────────────────────────
const ProfileCard = ({ d }: { d: SurveyData["ch1"] }) => (
  <div className="bg-gradient-to-br from-slate-900 to-blue-900 rounded-3xl p-6 text-white shadow-2xl">
    <p className="text-[9px] font-black text-blue-300 uppercase tracking-[0.3em] mb-3">명함 미리보기</p>
    <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center text-2xl mb-3 shadow-lg shadow-blue-500/30">
      {d.mbti ? "🧬" : "🏥"}
    </div>
    <h3 className="text-lg font-black">{d.name || "원장님 성함"}</h3>
    <p className="text-blue-300 text-xs font-bold mt-0.5">{d.specialist || "전문의 자격"}</p>
    <p className="text-slate-300 text-xs mt-1">{d.clinic || "병원명"}</p>
    {d.degree && <p className="text-slate-400 text-[10px] mt-1">{d.degree}</p>}
    {d.mbti && (
      <span className="inline-block mt-2 px-2 py-0.5 bg-blue-500/20 border border-blue-400/30 rounded-full text-[10px] font-black text-blue-300">{d.mbti}</span>
    )}
  </div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SurveyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { listeningId, startSTT } = useSTT();

  const [step, setStep] = useState(1);
  const [data, setData] = useState<SurveyData>(initialData);
  const [submitted, setSubmitted] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [errors, setErrors] = useState<string[]>([]);
  const [toastedPct, setToastedPct] = useState<Set<number>>(new Set());
  const [stampStep, setStampStep] = useState<number | null>(null);
  const [aiDrafts, setAiDrafts] = useState<{ vision: string[]; mission: string[] }>({ vision: [], mission: [] });
  const [loadingDraft, setLoadingDraft] = useState<"vision" | "mission" | null>(null);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);
  const isMaster = session?.user?.email?.toLowerCase() === (process.env.NEXT_PUBLIC_MASTER_EMAIL || "wei0508@naver.com").toLowerCase();
  const isReadOnly = submitted && !isMaster;

  // ── Load existing data ─────────────────────────────────────────────────────
  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/survey").then(r => r.json()).then(({ data: saved }) => {
      if (saved?.data) setData(saved.data);
      if (saved?.submitted) setSubmitted(true);
    }).catch(() => {});
  }, [status]);

  // ── Auto-save (3s debounce) ────────────────────────────────────────────────
  useEffect(() => {
    if (isReadOnly) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus("unsaved");
    saveTimer.current = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        await fetch("/api/survey", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        setSaveStatus("saved");
      } catch {
        setSaveStatus("unsaved");
      }
    }, 3000);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [data, isReadOnly]);

  // ── Milestone toasts ───────────────────────────────────────────────────────
  const fillPct = useMemo(() => {
    const ch1 = calcFill([data.ch1.name, data.ch1.clinic, data.ch1.degree, data.ch1.specialist, data.ch1.vision, data.ch1.mission, data.ch1.goal, data.ch1.mbti]);
    const ch2 = calcFill([data.ch2.whyCome, data.ch2.whyLeave, data.ch2.patientFlow, data.ch2.consultScript]);
    const ch3 = calcFill([...data.ch3.charting.flatMap(c => [c.disease, c.approach, c.billing]), data.ch3.chuna, data.ch3.herbalAcupoint, data.ch3.herbMedicine, data.ch3.equipment]);
    const ch4 = calcFill([data.ch4.revenueGoal, data.ch4.profitGoal, ...data.ch4.expenses.map(e => e.amount), data.ch4.dataMethod]);
    const ch5 = calcFill([...data.ch5.staff.flatMap(s => [s.role, s.salary]), data.ch5.philosophy, data.ch5.channels]);
    const ch6Safety = Object.values(data.ch6.safetyItems).filter(Boolean).length / SAFETY_ITEMS.length;
    const ch6 = (calcFill([data.ch6.meetingSchedule]) + ch6Safety) / 2;
    return {
      chapters: [ch1, ch2, ch3, ch4, ch5, ch6],
      total: Math.round(((ch1 + ch2 + ch3 + ch4 + ch5 + ch6) / 6) * 100),
    };
  }, [data]);

  useEffect(() => {
    const pct = fillPct.total;
    const milestones = [50, 80, 100];
    milestones.forEach(m => {
      if (pct >= m && !toastedPct.has(m)) {
        const msgs: Record<number, string> = {
          50: "🔥 벌써 절반! 원장님의 병원이 보입니다!",
          80: "💪 거의 다 왔습니다! 마지막 분발!",
          100: "🎉 완성! AI 분석이 곧 시작됩니다!",
        };
        toast.success(msgs[m], { duration: 4000 });
        setToastedPct(prev => new Set([...prev, m]));
      }
    });
  }, [fillPct.total, toastedPct]);

  const radarData = CHAPTER_CONFIG.map((ch, i) => ({
    subject: ch.title.split(" ")[0],
    fill: Math.round(fillPct.chapters[i] * 100),
    fullMark: 100,
  }));

  const level = getLevel(fillPct.total);

  // ── Validation & scroll ───────────────────────────────────────────────────
  const validateAndNext = () => {
    const required: { id: string; label: string }[] = step === 1
      ? [{ id: "ch1-name", label: "성함" }, { id: "ch1-clinic", label: "병원명" }, { id: "ch1-vision", label: "비전" }]
      : step === 2
        ? [{ id: "ch2-whyCome", label: "환자 유입 이유" }, { id: "ch2-patientFlow", label: "환자 동선" }]
        : [];

    const empty = required.filter(r => {
      const el = document.getElementById(r.id) as HTMLInputElement | HTMLTextAreaElement | null;
      return !el?.value?.trim();
    });

    if (empty.length > 0) {
      setErrors(empty.map(r => r.id));
      document.getElementById(empty[0].id)?.scrollIntoView({ behavior: "smooth", block: "center" });
      toast.error(`'${empty[0].label}' 항목을 입력해 주세요.`, { icon: "⚠️" });
      return;
    }

    setErrors([]);
    setStampStep(step);
    setTimeout(() => {
      setStampStep(null);
      if (step < 6) {
        setStep(s => s + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 900);
    if (ENCOURAGEMENTS[String(step + 1)]) {
      setTimeout(() => toast.success(ENCOURAGEMENTS[String(step + 1)], { duration: 3500 }), 950);
    }
  };

  // ── AI Draft ──────────────────────────────────────────────────────────────
  const fetchDraft = async (type: "vision" | "mission") => {
    setLoadingDraft(type);
    try {
      const res = await fetch("/api/survey/ai-draft", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.ch1.name, clinic: data.ch1.clinic, degree: data.ch1.degree, specialist: data.ch1.specialist, type }),
      });
      const { drafts } = await res.json();
      setAiDrafts(prev => ({ ...prev, [type]: drafts || [] }));
    } catch {
      toast.error("AI 초안 생성에 실패했습니다.");
    } finally {
      setLoadingDraft(null);
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!confirm("최종 제출 후에는 수정이 불가능합니다. 제출하시겠습니까?")) return;
    try {
      await fetch("/api/survey", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      await fetch("/api/survey/submit", { method: "POST" });
      setSubmitted(true);
      toast.success("🎉 워크북이 제출되었습니다! AI 분석이 시작됩니다.", { duration: 5000 });
    } catch {
      toast.error("제출 중 오류가 발생했습니다.");
    }
  };

  const upd1 = (f: keyof SurveyData["ch1"], v: string) => setData(d => ({ ...d, ch1: { ...d.ch1, [f]: v } }));
  const upd2 = (f: keyof SurveyData["ch2"], v: string) => setData(d => ({ ...d, ch2: { ...d.ch2, [f]: v } }));
  const upd3 = (f: keyof Omit<SurveyData["ch3"], "charting">, v: string) => setData(d => ({ ...d, ch3: { ...d.ch3, [f]: v } }));
  const upd4 = (f: keyof Omit<SurveyData["ch4"], "expenses">, v: string) => setData(d => ({ ...d, ch4: { ...d.ch4, [f]: v } }));
  const upd5 = (f: keyof Omit<SurveyData["ch5"], "staff">, v: string) => setData(d => ({ ...d, ch5: { ...d.ch5, [f]: v } }));

  // ── Chapter renders ──────────────────────────────────────────────────────
  const renderCh1 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <SCard title="📋 기본 정보">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <Lbl>원장님 성함 <span className="text-red-400">*</span></Lbl>
                <Inp id="ch1-name" value={data.ch1.name} onChange={v => upd1("name", v)} placeholder="홍길동" err={errors.includes("ch1-name")} readOnly={isReadOnly} />
              </div>
              <div>
                <Lbl>병원 이름 <span className="text-red-400">*</span></Lbl>
                <Inp id="ch1-clinic" value={data.ch1.clinic} onChange={v => upd1("clinic", v)} placeholder="○○한의원" err={errors.includes("ch1-clinic")} readOnly={isReadOnly} />
              </div>
              <div>
                <Lbl hint="예: 경희대 한의대 한의학박사">학위 및 출신학교</Lbl>
                <Inp value={data.ch1.degree} onChange={v => upd1("degree", v)} placeholder="경희대 한의대 졸업" readOnly={isReadOnly} />
              </div>
              <div>
                <Lbl hint="예: 침구과 전문의">전문의 자격</Lbl>
                <Inp value={data.ch1.specialist} onChange={v => upd1("specialist", v)} placeholder="침구과 전문의" readOnly={isReadOnly} />
              </div>
              <div>
                <Lbl hint="예: KBS 생로병사의 비밀 출연">방송/언론 경력</Lbl>
                <Inp value={data.ch1.media} onChange={v => upd1("media", v)} placeholder="방송 경력" readOnly={isReadOnly} />
              </div>
              <div>
                <Lbl>MBTI 유형</Lbl>
                <select value={data.ch1.mbti} onChange={e => upd1("mbti", e.target.value)} disabled={isReadOnly}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all disabled:opacity-60">
                  <option value="">MBTI 유형 선택</option>
                  {MBTI_LIST.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
          </SCard>

          <SCard title="🌟 비전 & 철학">
            {(["vision", "mission"] as const).map(field => (
              <div key={field}>
                <div className="flex items-center justify-between mb-2">
                  <Lbl hint={field === "vision" ? "예: 한국에서 가장 신뢰받는 한의원" : "예: 환자의 통증 없는 일상 회복을 사명으로"}>{field === "vision" ? "비전 (Vision)" : "미션 (Mission)"} <span className="text-red-400">*</span></Lbl>
                  {!isReadOnly && (
                    <button onClick={() => fetchDraft(field)} disabled={!!loadingDraft}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-bold rounded-xl transition-all border border-indigo-100 disabled:opacity-50">
                      <Sparkles size={12} />{loadingDraft === field ? "생성 중..." : "✨ AI 초안"}
                    </button>
                  )}
                </div>
                <STATextarea
                  id={`ch1-${field}`} value={data.ch1[field]}
                  onChange={v => upd1(field, v)}
                  placeholder={field === "vision" ? "10년 후 이 병원이 어떤 모습이길 바라시나요?" : "이 병원이 존재하는 이유는 무엇인가요?"}
                  rows={3} err={errors.includes(`ch1-${field}`)} readOnly={isReadOnly}
                  listeningId={listeningId} onMic={startSTT}
                />
                {aiDrafts[field].length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-black text-indigo-400 uppercase tracking-widest">✨ AI 추천 초안</p>
                    {aiDrafts[field].map((draft, i) => (
                      <button key={i} onClick={() => upd1(field, draft)}
                        className="w-full text-left p-3 rounded-xl border border-indigo-100 bg-indigo-50 hover:bg-indigo-100 text-sm text-indigo-800 font-medium transition-all hover:border-indigo-300">
                        {i + 1}. {draft}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div>
              <Lbl hint="예: 6개월 내 월매출 5,000만 원, 직원 추가 채용">올해의 핵심 목표</Lbl>
              <STATextarea id="ch1-goal" value={data.ch1.goal} onChange={v => upd1("goal", v)} placeholder="올해 반드시 이루고 싶은 목표를 구체적으로 적어주세요." rows={3} readOnly={isReadOnly} listeningId={listeningId} onMic={startSTT} />
            </div>
          </SCard>
        </div>
        <div className="hidden lg:block">
          <div className="sticky top-24">
            <ProfileCard d={data.ch1} />
          </div>
        </div>
      </div>
    </div>
  );

  const renderCh2 = () => (
    <div className="space-y-6">
      <SCard title="🔍 환자 유입 & 이탈 분석">
        <div>
          <Lbl hint="예: 네이버 플레이스, 지인 소개, 회사 근처">환자들이 오는 이유 <span className="text-red-400">*</span></Lbl>
          <STATextarea id="ch2-whyCome" value={data.ch2.whyCome} onChange={v => upd2("whyCome", v)} placeholder="환자들이 이 병원을 선택하는 가장 큰 이유는?" rows={4} err={errors.includes("ch2-whyCome")} readOnly={isReadOnly} listeningId={listeningId} onMic={startSTT} />
        </div>
        <div>
          <Lbl hint="예: 주차 부족, 대기 시간, 한약 가격 부담">재방문하지 않는 이유</Lbl>
          <STATextarea id="ch2-whyLeave" value={data.ch2.whyLeave} onChange={v => upd2("whyLeave", v)} placeholder="이탈 원인을 솔직하게 적어주세요." rows={4} readOnly={isReadOnly} listeningId={listeningId} onMic={startSTT} />
        </div>
      </SCard>
      <SCard title="🏥 환자 동선 & 상담 루틴">
        <div>
          <Lbl hint="예: 접수 → 대기 → 초진문진 → 진료 → 처치 → 수납">환자 동선 <span className="text-red-400">*</span></Lbl>
          <STATextarea id="ch2-patientFlow" value={data.ch2.patientFlow} onChange={v => upd2("patientFlow", v)} placeholder="초진부터 수납까지 단계별로 적어주세요." rows={5} err={errors.includes("ch2-patientFlow")} readOnly={isReadOnly} listeningId={listeningId} onMic={startSTT} />
        </div>
        <div>
          <Lbl hint="예: '이 치료는 3주 집중 후 2주 유지로 통증을 잡아요'">주요 질환별 상담 멘트</Lbl>
          <STATextarea id="ch2-consultScript" value={data.ch2.consultScript} onChange={v => upd2("consultScript", v)} placeholder="실제 사용하시는 멘트를 그대로 적어주세요." rows={5} readOnly={isReadOnly} listeningId={listeningId} onMic={startSTT} />
        </div>
      </SCard>
    </div>
  );

  const renderCh3 = () => (
    <div className="space-y-6">
      <SCard title="📝 차팅 & 청구 사례 3가지">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {["대표 질환", "치료 접근법", "주요 청구 항목"].map(h => (
                  <th key={h} className="text-left py-3 pr-4 font-bold text-slate-400 text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.ch3.charting.map((row, idx) => (
                <tr key={idx} className="border-b border-slate-50">
                  <td className="py-2 pr-3"><Inp value={row.disease} onChange={v => { const a = [...data.ch3.charting]; a[idx] = { ...a[idx], disease: v }; setData(d => ({ ...d, ch3: { ...d.ch3, charting: a } })); }} placeholder="예: 요추 디스크" readOnly={isReadOnly} /></td>
                  <td className="py-2 pr-3"><Inp value={row.approach} onChange={v => { const a = [...data.ch3.charting]; a[idx] = { ...a[idx], approach: v }; setData(d => ({ ...d, ch3: { ...d.ch3, charting: a } })); }} placeholder="예: 침 + 추나 + 약침" readOnly={isReadOnly} /></td>
                  <td className="py-2"><Inp value={row.billing} onChange={v => { const a = [...data.ch3.charting]; a[idx] = { ...a[idx], billing: v }; setData(d => ({ ...d, ch3: { ...d.ch3, charting: a } })); }} placeholder="예: 침술, 추나" readOnly={isReadOnly} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SCard>
      <SCard title="💉 치료별 설명 방식">
        {[{ key: "chuna" as const, label: "추나치료", hint: "예: '뼈를 맞추는 게 아니라 근육과 인대의 긴장을 풀어 척추 정렬을 돕는 치료'" },
          { key: "herbalAcupoint" as const, label: "약침", hint: "예: '순수 한약 성분을 정제해 경혈에 직접 주입하는 방식'" },
          { key: "herbMedicine" as const, label: "한약", hint: "예: '체질에 맞는 한약으로 몸의 근본을 개선해 재발을 방지'" },
          { key: "equipment" as const, label: "물리치료 기기 목록", hint: "예: 간섭파(ICT), TENS, 견인치료기, 온열치료기" }
        ].map(({ key, label, hint }) => (
          <div key={key}>
            <Lbl hint={hint}>{label}</Lbl>
            <STATextarea id={`ch3-${key}`} value={data.ch3[key]} onChange={v => upd3(key, v)} placeholder={hint} rows={3} readOnly={isReadOnly} listeningId={listeningId} onMic={startSTT} />
          </div>
        ))}
      </SCard>
    </div>
  );

  const renderCh4 = () => (
    <div className="space-y-6">
      <SCard title="🎯 경영 목표">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {([{ f: "revenueGoal" as const, label: "희망 월 매출 목표" }, { f: "profitGoal" as const, label: "희망 월 순이익 목표" }]).map(({ f, label }) => (
            <div key={f}>
              <div className="flex justify-between mb-2">
                <Lbl>{label}</Lbl>
                <span className="text-[10px] text-slate-400 font-bold bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg">{BENCHMARKS[f]}</span>
              </div>
              <Inp value={data.ch4[f]} onChange={v => upd4(f, v)} placeholder="월 ______ 만 원" readOnly={isReadOnly} />
            </div>
          ))}
        </div>
      </SCard>
      <SCard title="📊 월 경비 내역">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {["경비 항목", "월 금액 (만 원)"].map(h => <th key={h} className="text-left py-3 pr-4 font-bold text-slate-400 text-xs">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.ch4.expenses.map((row, idx) => (
                <tr key={idx} className="border-b border-slate-50">
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      <Inp value={row.item} onChange={v => { const a = [...data.ch4.expenses]; a[idx] = { ...a[idx], item: v }; setData(d => ({ ...d, ch4: { ...d.ch4, expenses: a } })); }} placeholder="항목" readOnly={isReadOnly} />
                      {BENCHMARKS[row.item] && <span className="text-[9px] text-slate-300 font-bold whitespace-nowrap hidden md:block">{BENCHMARKS[row.item]}</span>}
                    </div>
                  </td>
                  <td className="py-2"><Inp value={row.amount} onChange={v => { const a = [...data.ch4.expenses]; a[idx] = { ...a[idx], amount: v }; setData(d => ({ ...d, ch4: { ...d.ch4, expenses: a } })); }} placeholder="0" type="number" readOnly={isReadOnly} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isReadOnly && <button onClick={() => setData(d => ({ ...d, ch4: { ...d.ch4, expenses: [...d.ch4.expenses, { item: "", amount: "" }] } }))} className="mt-3 text-xs text-blue-500 hover:text-blue-700 font-bold transition-colors">+ 항목 추가</button>}
        </div>
      </SCard>
      <SCard title="📈 지표 관리 방식">
        <Lbl hint="예: 매달 말일 EMR 리포트 추출 후 엑셀 정리, 원장 직접 확인">현재 지표 관찰 방법</Lbl>
        <STATextarea id="ch4-data" value={data.ch4.dataMethod} onChange={v => upd4("dataMethod", v)} placeholder="매출, 환자 수, 재방문율을 어떻게 확인하시나요?" rows={4} readOnly={isReadOnly} listeningId={listeningId} onMic={startSTT} />
      </SCard>
    </div>
  );

  const renderCh5 = () => (
    <div className="space-y-6">
      <SCard title="👥 직원 구성">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {["직책", "연봉(만원)", "복지 혜택", "인센티브"].map(h => <th key={h} className="text-left py-3 pr-3 font-bold text-slate-400 text-xs">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.ch5.staff.map((row, idx) => (
                <tr key={idx} className="border-b border-slate-50">
                  {(["role", "salary", "welfare", "incentive"] as const).map(f => (
                    <td key={f} className="py-2 pr-2">
                      <Inp value={row[f]} onChange={v => { const a = [...data.ch5.staff]; a[idx] = { ...a[idx], [f]: v }; setData(d => ({ ...d, ch5: { ...d.ch5, staff: a } })); }} placeholder={{ role: "간호조무사", salary: "2,800", welfare: "4대보험", incentive: "없음" }[f]} readOnly={isReadOnly} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {!isReadOnly && <button onClick={() => setData(d => ({ ...d, ch5: { ...d.ch5, staff: [...d.ch5.staff, { role: "", salary: "", welfare: "", incentive: "" }] } }))} className="mt-3 text-xs text-blue-500 hover:text-blue-700 font-bold transition-colors">+ 직원 추가</button>}
        </div>
      </SCard>
      <SCard title="🌱 조직 문화 & 소통">
        <div>
          <Lbl hint="예: 직원들이 원장처럼 생각하고 자율과 책임을 동시에 갖도록">관리 철학 & 꿈꾸는 조직</Lbl>
          <STATextarea id="ch5-philosophy" value={data.ch5.philosophy} onChange={v => upd5("philosophy", v)} placeholder="어떤 조직 문화를 만들고 싶으신가요?" rows={4} readOnly={isReadOnly} listeningId={listeningId} onMic={startSTT} />
        </div>
        <div>
          <Lbl hint="예: 카카오톡 단체방, 주 1회 스탠딩 미팅, 노션 업무 공유">소통 채널 및 협업 도구</Lbl>
          <Inp value={data.ch5.channels} onChange={v => upd5("channels", v)} placeholder="팀과 어떻게 소통하시나요?" readOnly={isReadOnly} />
        </div>
      </SCard>
    </div>
  );

  const renderCh6 = () => (
    <div className="space-y-6">
      <SCard title="📅 교육 & 회의 시스템">
        <Lbl hint="예: 매주 월요일 8:30 스탠딩 미팅 10분, 월 1회 정기 면담">회의 및 직원 면담 일정</Lbl>
        <STATextarea id="ch6-meeting" value={data.ch6.meetingSchedule} onChange={v => setData(d => ({ ...d, ch6: { ...d.ch6, meetingSchedule: v } }))} placeholder="어떤 주기로 교육 및 면담을 진행하시나요?" rows={4} readOnly={isReadOnly} listeningId={listeningId} onMic={startSTT} />
      </SCard>
      <SCard title="🛡️ 비상 대응 매뉴얼 체크리스트 (18항목)">
        <p className="text-xs text-slate-400 font-medium">각 항목에 대해 병원 내 대응 매뉴얼 보유 또는 교육 실시 여부를 체크하세요.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SAFETY_ITEMS.map(item => {
            const isChecked = data.ch6.safetyItems[item];
            return (
              <button key={item} disabled={isReadOnly}
                onClick={() => setData(d => ({ ...d, ch6: { ...d.ch6, safetyItems: { ...d.ch6.safetyItems, [item]: !isChecked } } }))}
                className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all disabled:cursor-not-allowed ${isChecked ? "border-blue-400 bg-blue-50 text-blue-700" : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"}`}>
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-sm transition-all ${isChecked ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-300"}`}>
                  {isChecked ? "O" : "X"}
                </div>
                <span className="text-sm font-semibold">{item}</span>
              </button>
            );
          })}
        </div>
        <div className="p-4 bg-slate-50 rounded-2xl">
          <p className="text-xs text-slate-500 font-bold">현재 {Object.values(data.ch6.safetyItems).filter(Boolean).length} / {SAFETY_ITEMS.length} 항목 완비</p>
          <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2"><div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${Object.values(data.ch6.safetyItems).filter(Boolean).length / SAFETY_ITEMS.length * 100}%` }} /></div>
        </div>
      </SCard>

      {/* AI Analysis CTA */}
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

  const chapters = [renderCh1, renderCh2, renderCh3, renderCh4, renderCh5, renderCh6];
  const ch = CHAPTER_CONFIG[step - 1];
  const Icon = ch.icon;

  if (status === "loading") return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-white">
      {/* Radar Widget */}
      <RadarWidget radarData={radarData} />

      {/* Stamp Animation */}
      {stampStep !== null && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
          <div className="animate-bounce-once bg-white rounded-[40px] p-10 shadow-2xl border-4 border-blue-500 text-center">
            <div className="text-6xl mb-3">✅</div>
            <p className="font-black text-blue-700 text-xl">Chapter {stampStep} 완료!</p>
          </div>
        </div>
      )}

      {/* Sticky header */}
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
              {/* Level Badge */}
              <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black ${level.bg} ${level.color}`}>
                <span>{level.icon}</span>{level.name}
              </div>
              {/* Fill % */}
              <div className="text-right">
                <span className="text-xs font-black text-slate-700">{fillPct.total}%</span>
              </div>
              {/* Save status */}
              <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border ${saveStatus === "saved" ? "bg-green-50 border-green-200 text-green-600" : saveStatus === "saving" ? "bg-blue-50 border-blue-200 text-blue-600 animate-pulse" : "bg-amber-50 border-amber-200 text-amber-600"}`}>
                <Save size={12} />{saveStatus === "saved" ? "저장됨" : saveStatus === "saving" ? "저장 중..." : "미저장"}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-3">
            <div className={`h-full bg-gradient-to-r ${ch.color} rounded-full transition-all duration-700`} style={{ width: `${Math.max(4, fillPct.total)}%` }} />
          </div>

          {/* Chapter pills */}
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

      {/* Submitted Banner */}
      {submitted && (
        <div className={`${isMaster ? "bg-amber-50 border-b border-amber-200 text-amber-700" : "bg-blue-50 border-b border-blue-200 text-blue-700"} px-6 py-3 text-center`}>
          <div className="flex items-center justify-center gap-2 text-sm font-bold">
            <Lock size={14} />
            {isMaster ? "마스터 권한으로 수정 가능합니다." : "제출이 완료되었습니다. 수정이 잠겨있습니다."}
          </div>
        </div>
      )}

      {/* Content */}
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

        {chapters[step - 1]()}

        {/* Navigation */}
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
    </div>
  );
}
