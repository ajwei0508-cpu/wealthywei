"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Users,
  FileText,
  ChevronLeft,
  Download,
  ShieldCheck,
  File,
  FileImage,
  CheckCircle,
  X,
  Crown,
  Wand2,
  Sparkles,
  Copy,
  Save,
  Share2,
  AlertTriangle,
  ArrowRight,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  MASTER_SURVEY_FIELDS,
  PRESET_CATEGORY_LABELS,
  PresetCategory,
  getNestedField,
  setNestedField,
} from "@/lib/surveyPresets";
import SurveyFullSheetView from "@/components/survey/SurveyFullSheetView";

type Submission = {
  user_id: string;
  data: any;
  updated_at: string;
  submitted: boolean;
};

function AdminSurveyContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<"submissions" | "studio">(
    searchParams.get("tab") === "studio" ? "studio" : "submissions"
  );
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<Submission | null>(null);
  const [studioUser, setStudioUser] = useState<Submission | null>(null);
  const [studioPart, setStudioPart] = useState<number>(1);
  const [selectedFieldId, setSelectedFieldId] = useState<string>(MASTER_SURVEY_FIELDS[0].id);
  const [presetCategory, setPresetCategory] = useState<PresetCategory>("pain");
  const [masterDraftText, setMasterDraftText] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDiagnosis, setAiDiagnosis] = useState<{ diagnosis: string; drafts: string[] } | null>(null);
  const [savingToDb, setSavingToDb] = useState(false);

  const [isMounted, setIsMounted] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    if (searchParams.get("tab") === "studio") {
      setActiveTab("studio");
    }
  }, [searchParams]);

  const userMap = useMemo(() => {
    const map = new Map<string, string>();
    allUsers.forEach(u => {
      if (u.email) map.set(u.email.toLowerCase(), u.realName || u.name);
    });
    return map;
  }, [allUsers]);

  useEffect(() => {
    setIsMounted(true);
    if (status === "unauthenticated") {
      router.push("/");
      return;
    }

    const masterEmail = (process.env.NEXT_PUBLIC_MASTER_EMAIL || "wei0508@naver.com").toLowerCase();
    if (status === "authenticated" && session?.user?.email?.toLowerCase() !== masterEmail) {
      toast.error("마스터 관리자 전용 메뉴입니다.");
      router.push("/survey");
      return;
    }

    if (status === "authenticated" && !hasFetched) {
      fetchData();
      setHasFetched(true);
    }
  }, [status, session?.user?.email, router, hasFetched]);

  const fetchData = async () => {
    try {
      const uRes = await fetch("/api/master/users");
      if (uRes.ok) {
        const { data } = await uRes.json();
        setAllUsers(data || []);
      }

      const res = await fetch("/api/survey/admin");
      const json = await res.json();
      if (json.data) {
        setSubmissions(json.data);
        if (json.data.length > 0 && !studioUser) {
          setStudioUser(json.data[0]);
        }
      }
    } catch {
      toast.error("데이터를 불러오는데 실패했습니다.");
    }
  };

  const currentFieldMeta = useMemo(
    () => MASTER_SURVEY_FIELDS.find(f => f.id === selectedFieldId) || MASTER_SURVEY_FIELDS[0],
    [selectedFieldId]
  );

  const rawMemberAnswer = useMemo(() => {
    if (!studioUser?.data) return "";
    return getNestedField(studioUser.data[currentFieldMeta.chapterKey], currentFieldMeta.fieldPath);
  }, [studioUser, currentFieldMeta]);

  useEffect(() => {
    setMasterDraftText(rawMemberAnswer || "");
    setAiDiagnosis(null);
  }, [selectedFieldId, studioUser?.user_id, rawMemberAnswer]);

  const calcCompletionPct = (subData: any) => {
    if (!subData) return 0;
    const flatStrings = (obj: any): string[] => {
      let res: string[] = [];
      if (!obj || typeof obj !== "object") return res;
      for (const k in obj) {
        const val = obj[k];
        if (typeof val === "string") res.push(val);
        else if (Array.isArray(val)) {
          val.forEach((v: any) => {
            if (typeof v === "string") res.push(v);
            else if (typeof v === "object" && v !== null) res.push(...flatStrings(v));
          });
        } else if (typeof val === "object" && val !== null) {
          res.push(...flatStrings(val));
        }
      }
      return res;
    };
    const chs = ["ch1", "ch2", "ch3", "ch4", "ch5", "ch6"].map(k => {
      const strs = flatStrings(subData[k]);
      if (strs.length === 0) return 0;
      return strs.filter(s => s && s.trim().length > 0).length / strs.length;
    });
    return Math.round((chs.reduce((a, b) => a + b, 0) / 6) * 100);
  };

  const handleCopyKakaoResumeMsg = (sub: Submission) => {
    const pct = calcCompletionPct(sub.data);
    const directorName = sub.data?.ch1?.name || userMap.get(sub.user_id.toLowerCase()) || "원장";
    const origin = typeof window !== "undefined" ? window.location.origin : "https://wealthywei.vercel.app";
    const msg = `[바른컨설팅 정밀 경영 진단 안내]\n\n안녕하세요, ${directorName} 원장님! 🌿\n현재 작성 중이던 바른컨설팅 경영 진단 워크북이 [${pct}%] 안전하게 클라우드에 보관되어 있습니다.\n\n잘 보이게 꾸며 쓰실 필요 없이, 현재 병원의 있는 그대로의 리얼한 현황만 편하게 적어주시면 마스터가 문제점과 맞춤 솔루션을 정밀 분석해 드립니다.\n\n진료 쉬는 시간이나 퇴근 후 아래 링크에서 3분 마이크로 세션으로 이어서 완료해 보세요!\n👉 이어쓰기 바로가기: ${origin}/survey`;
    navigator.clipboard.writeText(msg);
    toast.success(`${directorName} 원장님께 보낼 카카오톡 이어쓰기 안내 문구가 복사되었습니다!`);
  };

  // 1번 기능: 마스터 전용 AI 문제점 진단 & 3가지 다듬기 실행
  const handleRunStudioAi = async () => {
    setAiLoading(true);
    try {
      const res = await fetch("/api/survey/ai-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: studioUser?.data?.ch1?.name || userMap.get(studioUser?.user_id?.toLowerCase() || "") || "원장",
          clinic: studioUser?.data?.ch1?.clinic || "대상 한의원",
          degree: studioUser?.data?.ch1?.degree || "",
          questionLabel: `[Part ${currentFieldMeta.part} - STEP ${currentFieldMeta.orderNo}] ${currentFieldMeta.title}`,
          currentValue: rawMemberAnswer || masterDraftText,
          mode: "master_diagnosis",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "AI 진단 실패");
      setAiDiagnosis({ diagnosis: json.diagnosis || "", drafts: json.drafts || [] });
      toast.success("1번: AI 리얼 현황 문제점 진단 및 3가지 컨설팅 솔루션이 도출되었습니다.");
    } catch (e: any) {
      toast.error(e.message || "AI 실행 중 오류가 발생했습니다.");
    } finally {
      setAiLoading(false);
    }
  };

  // 마스터가 다듬은 문장을 해당 원장님 워크북 DB에 저장
  const handleSaveRefinedToUser = async () => {
    if (!studioUser) return;
    setSavingToDb(true);
    try {
      const nextData = setNestedField(
        studioUser.data || {},
        currentFieldMeta.chapterKey,
        currentFieldMeta.fieldPath,
        masterDraftText
      );
      const res = await fetch("/api/survey/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: studioUser.user_id,
          data: nextData,
        }),
      });
      if (!res.ok) throw new Error("저장 실패");
      const updatedSub = { ...studioUser, data: nextData, updated_at: new Date().toISOString() };
      setStudioUser(updatedSub);
      setSubmissions(prev => prev.map(s => (s.user_id === studioUser.user_id ? updatedSub : s)));
      toast.success("마스터가 다듬은 솔루션이 해당 원장님의 워크북 데이터에 반영되었습니다!");
    } catch (e: any) {
      toast.error(e.message || "저장 중 오류가 발생했습니다.");
    } finally {
      setSavingToDb(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getFilesList = (data: any) => {
    if (!data) return [];
    const allFiles: { category: string; urls: string[] }[] = [];
    const safePush = (category: string, urls: any) => {
      const arr = Array.isArray(urls) ? urls : urls ? [urls] : [];
      const validUrls = arr.filter(u => typeof u === "string" && u.trim().length > 0);
      if (validUrls.length > 0) {
        allFiles.push({ category, urls: validUrls });
      }
    };

    safePush("한약 복용 안내문 (Q32)", data?.ch2?.herbInstructionsFile);
    safePush("환자 Q&A 매뉴얼 (Q10)", data?.ch3?.patientQnaFile);
    safePush("지표 관리 양식 (Q27)", data?.ch4?.indicatorsFile);
    safePush("채팅 전체 채널 캡처 (Q49)", data?.ch5?.chatSystem?.capture1);
    safePush("채팅 대화 내용 캡처 (Q49)", data?.ch5?.chatSystem?.capture2);
    safePush("소통 가이드라인 문서 (Q49)", data?.ch5?.chatSystem?.guideFile);
    safePush("채팅/소통 추가 파일", data?.ch5?.chatSystem?.files);
    safePush("사내 교육 자료 (Q51)", data?.ch5?.eduMaterials);
    safePush("원내 홍보물 비치 사진 (Q54)", data?.ch6?.promoPhotos);

    if (data?.ch6?.safetyFiles && typeof data.ch6.safetyFiles === "object") {
      Object.entries(data.ch6.safetyFiles).forEach(([key, urls]) => {
        safePush(`안전 매뉴얼 (${key})`, urls);
      });
    }
    return allFiles;
  };

  const renderDataSection = (
    title: string,
    items: { label: string; value: any; type?: "text" | "list" | "table" | "kv" }[]
  ) => {
    const hasValue = items.some(item => {
      if (!item.value) return false;
      if (Array.isArray(item.value) && item.value.length === 0) return false;
      if (typeof item.value === "object" && Object.keys(item.value).length === 0) return false;
      return true;
    });
    if (!hasValue) return null;

    return (
      <div className="bg-[#07261B] rounded-3xl border border-white/10 overflow-hidden shadow-md mb-7">
        <div className="px-6 py-4 bg-[#0A3526] border-b border-white/10 flex items-center justify-between">
          <h3 className="font-black text-[#F5F2EB] flex items-center gap-2.5 text-base">
            <div className="w-1.5 h-5 bg-amber-400 rounded-full" />
            {title}
          </h3>
        </div>
        <div className="p-6 space-y-6">
          {items.map((item, idx) => {
            if (!item.value || (Array.isArray(item.value) && item.value.length === 0)) return null;
            return (
              <div key={idx} className="space-y-2">
                <p className="text-xs font-black text-amber-300 tracking-wide pl-1">{item.label}</p>
                {item.type === "table" ? (
                  <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#041810]">
                    <table className="w-full text-sm">
                      <thead className="bg-white/5 text-amber-300 font-bold border-b border-white/10">
                        <tr>
                          {Object.keys(item.value[0]).map(k => (
                            <th key={k} className="px-4 py-3 text-left text-xs uppercase">{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {item.value.map((row: any, ridx: number) => (
                          <tr key={ridx} className="border-b border-white/5 last:border-none">
                            {Object.values(row).map((v: any, vidx: number) => (
                              <td key={vidx} className="px-4 py-3 font-medium text-[#F5F2EB]/90 whitespace-pre-wrap">{v}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : item.type === "kv" ? (
                  <div className="flex flex-wrap gap-2 pt-1 pl-1">
                    {(Object.entries(item.value) as [string, any][]).map(([k, v]) => v && (
                      <span key={k} className="px-3 py-1.5 bg-amber-400/15 text-amber-300 rounded-xl text-xs font-black border border-amber-400/30">
                        ✓ {k}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-[#041810] rounded-2xl text-sm font-medium text-[#F5F2EB] leading-relaxed whitespace-pre-wrap border border-white/10">
                    {item.value}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-[#031C13] text-[#F5F2EB] p-6 sm:p-10 pb-24">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* 상단 헤더 & 마스터 전용 메뉴 탭 분리 */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-white/10 pb-8">
          <div>
            <button
              onClick={() => router.push("/survey")}
              className="flex items-center gap-2 text-amber-300/80 hover:text-amber-300 font-bold text-xs mb-4 transition-colors"
            >
              <ChevronLeft size={16} /> 설문 워크북 화면으로 돌아가기
            </button>
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center text-[#031C13] shadow-lg shadow-amber-500/20">
                <Crown size={26} />
              </div>
              <div>
                <p className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em]">MASTER ONLY CONTROL CENTER</p>
                <h1 className="text-3xl sm:text-4xl font-black text-[#F5F2EB] tracking-tight">
                  바른컨설팅 마스터 진단 & AI 코칭 스튜디오
                </h1>
              </div>
            </div>
          </div>

          {/* 마스터 전용 2대 메뉴 탭 + 마스터 본인 설문지 바로가기 */}
          <div className="flex flex-wrap gap-2 bg-[#07261B] p-1.5 rounded-2xl border border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab("submissions")}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black transition-all ${
                activeTab === "submissions"
                  ? "bg-amber-400 text-[#031C13] shadow-lg"
                  : "text-white/70 hover:text-white hover:bg-white/5"
              }`}
            >
              <Users size={15} />
              1. 원장님별 리얼 현황 취합 ({submissions.length}명)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("studio")}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black transition-all ${
                activeTab === "studio"
                  ? "bg-gradient-to-r from-amber-400 to-emerald-400 text-[#031C13] shadow-lg"
                  : "text-amber-300 hover:bg-white/5"
              }`}
            >
              <Wand2 size={15} />
              2. 마스터 전용: AI 문제점 다듬기 & 모범 프리셋 (1·2번 기능)
            </button>
            <button
              type="button"
              onClick={() => router.push("/survey?mode=view")}
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-black bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-all"
            >
              <FileText size={15} />
              👑 마스터 본인 작성 설문지 확인·수정
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            TAB 1: 원장님별 리얼 현황 취합 & 4번 카카오 이어쓰기 독려 관리
           ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "submissions" && (
          <div className="bg-[#07261B] rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
            <div className="px-7 py-5 border-b border-white/10 flex flex-wrap items-center justify-between gap-4 bg-[#0A3526]/60">
              <div>
                <h2 className="text-lg font-black text-[#F5F2EB]">신규/컨설팅 회원 리얼 설문 수합 현황</h2>
                <p className="text-xs text-emerald-200/60 mt-0.5">
                  원장님들이 꾸미지 않고 작성한 날것(Raw) 데이터를 열람하고, 미완료 회원에게 이어쓰기 안내장을 발송하거나 AI 코칭 스튜디오로 불러옵니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push("/survey?mode=view")}
                className="px-4 py-2.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/40 text-amber-300 text-xs font-black flex items-center gap-1.5 transition-all"
              >
                <Crown size={14} /> 마스터 본인 설문지 바로 열람
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10 bg-[#041810]/60">
                    <th className="px-6 py-4 text-[11px] font-black text-amber-300 uppercase tracking-wider">원장님 / 이메일</th>
                    <th className="px-6 py-4 text-[11px] font-black text-amber-300 uppercase tracking-wider">한의원명</th>
                    <th className="px-6 py-4 text-[11px] font-black text-amber-300 uppercase tracking-wider text-center">작성 진행률</th>
                    <th className="px-6 py-4 text-[11px] font-black text-amber-300 uppercase tracking-wider text-center">제출 상태</th>
                    <th className="px-6 py-4 text-[11px] font-black text-amber-300 uppercase tracking-wider text-center">첨부 파일</th>
                    <th className="px-6 py-4 text-[11px] font-black text-amber-300 uppercase tracking-wider text-center">최종 업데이트</th>
                    <th className="px-6 py-4 text-[11px] font-black text-amber-300 uppercase tracking-wider text-right">마스터 전용 액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {submissions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-8 py-20 text-center font-bold text-white/40">
                        아직 저장된 설문 데이터가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    submissions.map((sub, idx) => {
                      const fileList = getFilesList(sub.data);
                      const totalFiles = fileList.reduce((acc, curr) => acc + (curr.urls?.length || 0), 0);
                      const isSubmitted = sub.submitted || sub.data?.submitted;
                      const pct = calcCompletionPct(sub.data);
                      const directorName = sub.data?.ch1?.name || userMap.get(sub.user_id.toLowerCase()) || "미입력";
                      const clinicName = sub.data?.ch1?.clinic || "-";
                      const masterEmail = (process.env.NEXT_PUBLIC_MASTER_EMAIL || "wei0508@naver.com").toLowerCase();
                      const isMasterRow = sub.user_id.toLowerCase() === masterEmail;

                      return (
                        <tr key={idx} className="hover:bg-white/5 transition-all">
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-black text-[#F5F2EB]">{directorName} 원장님</p>
                              {isMasterRow && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-[#031C13] text-[10px] font-black">
                                  MASTER 본인
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-white/45">{sub.user_id}</p>
                          </td>
                          <td className="px-6 py-5 text-sm font-bold text-emerald-300">{clinicName}</td>
                          <td className="px-6 py-5 text-center">
                            <div className="inline-flex flex-col items-center gap-1">
                              <span className="text-xs font-black text-amber-300">{pct}%</span>
                              <div className="w-20 bg-white/10 rounded-full h-1.5 overflow-hidden">
                                <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-center">
                            {isSubmitted ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-black rounded-full border border-emerald-500/40">
                                <CheckCircle size={12} /> 최종 제출됨
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500/15 text-amber-300 text-xs font-black rounded-full border border-amber-400/30">
                                작성 중 ({pct}%)
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-5 text-center">
                            <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${totalFiles > 0 ? "bg-amber-400/15 text-amber-300" : "text-white/30"}`}>
                              {totalFiles}개
                            </span>
                          </td>
                          <td className="px-6 py-5 text-center text-xs text-white/55 font-medium">
                            {formatDate(sub.updated_at)}
                          </td>
                          <td className="px-6 py-5 text-right">
                            <div className="inline-flex flex-wrap items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleCopyKakaoResumeMsg(sub)}
                                title="미완료 원장님께 보낼 카카오톡 이어쓰기 안내장 복사"
                                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-amber-300 flex items-center gap-1.5 transition-all"
                              >
                                <Share2 size={13} /> 알림톡 문구
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setStudioUser(sub);
                                  setActiveTab("studio");
                                }}
                                className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#031C13] text-xs font-black flex items-center gap-1.5 transition-all shadow-sm"
                              >
                                <Wand2 size={13} /> AI 다듬기·프리셋
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedUser(sub)}
                                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 transition-all"
                              >
                                <FileText size={13} /> 설문지 전체 확인
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            TAB 2: 1·2번 마스터 전용 메뉴 — AI 문제점 진단·다듬기 & 1클릭 모범 프리셋 스튜디오
           ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "studio" && (
          <div className="space-y-6">
            {/* 상단 컨트롤 바: 대상 원장님 선택 & 병원 유형 프리셋 선택 */}
            <div className="p-6 rounded-3xl bg-[#07261B] border border-amber-400/30 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-[#031C13] text-[10px] font-black uppercase">
                    MASTER STUDIO
                  </span>
                  <h2 className="text-lg font-black text-[#F5F2EB]">
                    원장님 리얼 데이터 문제점 진단 & 표준 솔루션 다듬기
                  </h2>
                </div>
                <p className="text-xs text-emerald-200/70">
                  좌측에서 원장님이 작성한 <strong>날것(Raw) 리얼 현황</strong>을 확인하고, 우측에서 <strong>[1번: AI 문제점 진단·다듬기]</strong>와 <strong>[2번: 상위 1% 모범 프리셋]</strong>으로 솔루션을 완성하세요.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <label className="block text-[10px] font-black text-amber-300 uppercase mb-1">분석할 대상 원장님 선택</label>
                  <select
                    value={studioUser?.user_id || ""}
                    onChange={e => {
                      const found = submissions.find(s => s.user_id === e.target.value);
                      if (found) setStudioUser(found);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-[#041810] border border-white/15 text-sm font-bold text-[#F5F2EB] outline-none focus:border-amber-400"
                  >
                    {submissions.length === 0 && <option value="">제출된 회원 없음 (샘플 모드)</option>}
                    {submissions.map((s, idx) => {
                      const dName = s.data?.ch1?.name || userMap.get(s.user_id.toLowerCase()) || s.user_id;
                      const cName = s.data?.ch1?.clinic ? `(${s.data.ch1.clinic})` : "";
                      return (
                        <option key={`${s.user_id}-${idx}`} value={s.user_id}>
                          {dName} 원장님 {cName} — {calcCompletionPct(s.data)}%
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            </div>

            {/* 메인 스튜디오 그리드: 좌측 문항 리스트 / 우측 비교·다듬기 워크스페이스 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* 좌측: Part 1 ~ 6 & 문항 선택 패널 (4 cols) */}
              <div className="lg:col-span-4 bg-[#07261B] rounded-3xl border border-white/10 p-5 space-y-4 h-fit">
                <p className="text-xs font-black text-amber-300 uppercase tracking-wider">
                  STEP 1. 파트 및 코칭 문항 선택
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {[1, 2, 3, 4, 5, 6].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setStudioPart(p);
                        const firstInPart = MASTER_SURVEY_FIELDS.find(f => f.part === p);
                        if (firstInPart) setSelectedFieldId(firstInPart.id);
                      }}
                      className={`py-2 rounded-xl text-xs font-black transition-all ${
                        studioPart === p
                          ? "bg-amber-400 text-[#031C13]"
                          : "bg-[#041810] text-white/60 hover:text-white border border-white/5"
                      }`}
                    >
                      Part {p}
                    </button>
                  ))}
                </div>

                <div className="space-y-2 pt-2">
                  {MASTER_SURVEY_FIELDS.filter(f => f.part === studioPart).map(field => {
                    const val = studioUser?.data
                      ? getNestedField(studioUser.data[field.chapterKey], field.fieldPath)
                      : "";
                    const hasVal = val && val.trim().length > 0;
                    const isSelected = selectedFieldId === field.id;
                    return (
                      <button
                        key={field.id}
                        type="button"
                        onClick={() => setSelectedFieldId(field.id)}
                        className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-2 ${
                          isSelected
                            ? "bg-amber-400/15 border-amber-400 text-[#F5F2EB] shadow-md"
                            : "bg-[#041810]/70 border-white/10 text-white/75 hover:border-white/25"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[10px] font-black text-amber-300">STEP {field.orderNo}</span>
                            <span className="text-[10px] text-white/40">({field.legacyQ})</span>
                          </div>
                          <p className="text-xs font-bold leading-snug">{field.title}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black flex-shrink-0 ${
                          hasVal ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-white/30"
                        }`}>
                          {hasVal ? "작성됨" : "미작성"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 우측: 원장님 리얼 현황 vs 마스터 AI 다듬기 & 1클릭 프리셋 (8 cols) */}
              <div className="lg:col-span-8 space-y-6">
                {/* 1. 원장님이 제출한 날것(Raw) 리얼 현황 박스 */}
                <div className="p-6 rounded-3xl bg-[#07261B] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-400/30 text-rose-300 text-xs font-black">
                        RAW DATA (원장님 리얼 현황)
                      </span>
                      <h3 className="text-base font-black text-[#F5F2EB]">
                        STEP {currentFieldMeta.orderNo}. {currentFieldMeta.title} ({currentFieldMeta.legacyQ})
                      </h3>
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#041810] border border-white/10 min-h-[90px] text-sm text-[#F5F2EB]/90 whitespace-pre-wrap leading-relaxed">
                    {rawMemberAnswer ? (
                      rawMemberAnswer
                    ) : (
                      <span className="text-white/35 italic">
                        아직 원장님이 이 문항을 작성하지 않았습니다. 아래에서 바로 텍스트를 입력해 AI 진단을 테스트하거나 모범 프리셋을 처방할 수 있습니다.
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. [기능 2] 마스터 전용 1클릭 상위 1% 모범 프리셋 비교·적용 */}
                {currentFieldMeta.presets && (
                  <div className="p-6 rounded-3xl bg-[#07261B] border border-emerald-500/30 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Sparkles size={18} className="text-amber-400" />
                        <h4 className="text-sm font-black text-[#F5F2EB]">
                          [2번 마스터 기능] 상위 1% 한의원 표준 모범 프리셋 (1클릭 처방)
                        </h4>
                      </div>
                      <div className="flex gap-1.5">
                        {(["pain", "diet", "local"] as PresetCategory[]).map(cat => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setPresetCategory(cat)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                              presetCategory === cat
                                ? "bg-emerald-500 text-[#031C13]"
                                : "bg-[#041810] text-white/60 hover:text-white border border-white/10"
                            }`}
                          >
                            {PRESET_CATEGORY_LABELS[cat].label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#041810] border border-emerald-500/25 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-emerald-300">
                          ✦ {PRESET_CATEGORY_LABELS[presetCategory].label} — {PRESET_CATEGORY_LABELS[presetCategory].desc}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setMasterDraftText(currentFieldMeta.presets![presetCategory]);
                            toast.success("모범 프리셋이 아래 마스터 코칭 에디터에 로드되었습니다.");
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#031C13] text-xs font-black flex items-center gap-1 transition-all"
                        >
                          이 프리셋 불러오기 <ArrowRight size={12} />
                        </button>
                      </div>
                      <p className="text-xs sm:text-sm text-[#F5F2EB]/90 whitespace-pre-wrap leading-relaxed">
                        {currentFieldMeta.presets[presetCategory]}
                      </p>
                    </div>
                  </div>
                )}

                {/* 3. [기능 1] 마스터 전용 AI 문제점 정밀 진단 & 전문 문장 다듬기 */}
                <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0A3526] via-[#07261B] to-[#051F15] border border-amber-400/40 space-y-5 shadow-xl">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Wand2 size={18} className="text-amber-400" />
                      <h4 className="text-sm font-black text-[#F5F2EB]">
                        [1번 마스터 기능] AI 리얼 현황 문제점 진단 & 컨설팅 문장 다듬기
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={handleRunStudioAi}
                      disabled={aiLoading}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-[#031C13] font-black text-xs flex items-center gap-2 shadow-lg hover:brightness-105 disabled:opacity-50 transition-all"
                    >
                      <Wand2 size={14} className={aiLoading ? "animate-spin" : ""} />
                      {aiLoading ? "AI가 문제점 및 솔루션을 분석 중입니다..." : "AI 문제점 진단 & 3가지 다듬기 실행"}
                    </button>
                  </div>

                  {aiDiagnosis && (
                    <div className="space-y-4 pt-2 border-t border-white/10">
                      {aiDiagnosis.diagnosis && (
                        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-400/30 space-y-1">
                          <p className="text-xs font-black text-rose-300 flex items-center gap-1.5">
                            <AlertTriangle size={14} /> AI가 포착한 현재 병원의 핵심 문제점 / 병목 진단
                          </p>
                          <p className="text-xs sm:text-sm text-[#F5F2EB] leading-relaxed">{aiDiagnosis.diagnosis}</p>
                        </div>
                      )}
                      <div className="space-y-2.5">
                        <p className="text-xs font-black text-amber-300">✨ AI 추천 맞춤형 컨설팅 다듬기 초안 (클릭 시 에디터에 반영)</p>
                        {aiDiagnosis.drafts.map((d, idx) => (
                          <div key={idx} className="p-4 rounded-2xl bg-[#041810] border border-amber-400/25 flex items-start justify-between gap-4">
                            <p className="text-xs sm:text-sm text-[#F5F2EB] whitespace-pre-wrap leading-relaxed flex-1">{d}</p>
                            <button
                              type="button"
                              onClick={() => {
                                setMasterDraftText(d);
                                toast.success(`초안 ${idx + 1}이 마스터 에디터에 적용되었습니다.`);
                              }}
                              className="px-3.5 py-2 rounded-xl bg-amber-400 text-[#031C13] text-xs font-black flex-shrink-0 hover:bg-amber-300"
                            >
                              선택
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 마스터 최종 코칭/다듬기 편집창 및 저장/복사 */}
                  <div className="space-y-3 pt-2 border-t border-white/10">
                    <label className="block text-xs font-black text-amber-300">
                      마스터 최종 코칭 & 다듬기 솔루션 에디터
                    </label>
                    <textarea
                      rows={6}
                      value={masterDraftText}
                      onChange={e => setMasterDraftText(e.target.value)}
                      placeholder="원장님의 리얼 현황을 바탕으로 다듬어진 표준 매뉴얼/멘트를 이곳에서 최종 편집하세요."
                      className="w-full p-4 rounded-2xl bg-[#041810] border border-white/15 text-sm text-[#F5F2EB] leading-relaxed focus:outline-none focus:border-amber-400"
                    />
                    <div className="flex flex-wrap items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(masterDraftText);
                          toast.success("다듬어진 솔루션 문장이 클립보드에 복사되었습니다!");
                        }}
                        className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-[#F5F2EB] flex items-center gap-1.5"
                      >
                        <Copy size={14} /> 클립보드 복사 (카톡/보고서 전달용)
                      </button>
                      {studioUser && (
                        <button
                          type="button"
                          onClick={handleSaveRefinedToUser}
                          disabled={savingToDb}
                          className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#031C13] text-xs font-black flex items-center gap-1.5 shadow-lg"
                        >
                          <Save size={14} />
                          {savingToDb ? "저장 중..." : "원장님 워크북 DB에 다듬은 내용 반영"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── 상세 열람 모달 (Part 1 ~ Part 6 전체 51문항 통합 열람) ─────────────────── */}
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md">
            <div className="bg-[#051F15] w-full max-w-6xl max-h-[92vh] rounded-[36px] shadow-2xl overflow-hidden flex flex-col border border-amber-400/30">
              {/* Modal Header */}
              <div className="px-8 py-5 bg-[#082B1E] border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
                    RAW REALITY SUBMISSION REPORT • STEP 01 ~ 51
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-[#F5F2EB] mt-0.5">
                    {selectedUser.data?.ch1?.name || userMap.get(selectedUser.user_id.toLowerCase()) || selectedUser.user_id} 원장님 ({selectedUser.data?.ch1?.clinic || "한의원"})
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => router.push(`/survey?userId=${encodeURIComponent(selectedUser.user_id)}&mode=edit`)}
                    className="px-4 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-black flex items-center gap-1.5"
                  >
                    <Sparkles size={14} /> 이 설문지 직접 수정·보완하기
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStudioUser(selectedUser);
                      setSelectedUser(null);
                      setActiveTab("studio");
                    }}
                    className="px-4 py-2.5 rounded-xl bg-amber-400 text-[#031C13] text-xs font-black flex items-center gap-1.5"
                  >
                    <Wand2 size={14} /> 이 데이터로 AI 다듬기 스튜디오 열기
                  </button>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="p-2.5 bg-white/10 hover:bg-white/15 rounded-xl text-white/70 hover:text-white transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Modal Body: SurveyFullSheetView */}
              <div className="flex-1 overflow-y-auto p-6 sm:p-8">
                <SurveyFullSheetView
                  data={selectedUser.data}
                  updatedAt={selectedUser.updated_at}
                  submitted={selectedUser.submitted || selectedUser.data?.submitted}
                  isMaster={true}
                  onEditPart={() => {
                    router.push(`/survey?userId=${encodeURIComponent(selectedUser.user_id)}&mode=edit`);
                  }}
                  onOpenStudio={() => {
                    setStudioUser(selectedUser);
                    setSelectedUser(null);
                    setActiveTab("studio");
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminSurveyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#031C13]" />}>
      <AdminSurveyContent />
    </Suspense>
  );
}
