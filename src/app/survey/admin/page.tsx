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
  Lock,
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
  const [masterRedComment, setMasterRedComment] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDiagnosis, setAiDiagnosis] = useState<{ diagnosis: string; drafts: string[] } | null>(null);
  const [savingToDb, setSavingToDb] = useState(false);
  const [savingCommentToDb, setSavingCommentToDb] = useState(false);

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
    const savedComment = studioUser?.data?.masterComments?.[selectedFieldId] || "";
    setMasterRedComment(savedComment);
    const cachedAi = studioUser?.data?.masterAiCache?.[selectedFieldId] || null;
    setAiDiagnosis(cachedAi);
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

  // 공통: 특정 회원의 설문 데이터(data)를 DB에 즉시 업데이트
  const persistUserData = async (targetSub: Submission, nextData: any) => {
    const res = await fetch("/api/survey/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetUserId: targetSub.user_id,
        data: nextData,
      }),
    });
    if (!res.ok) throw new Error("저장 실패");
    const updatedSub = { ...targetSub, data: nextData, updated_at: new Date().toISOString() };
    setSubmissions(prev => prev.map(s => (s.user_id === targetSub.user_id ? updatedSub : s)));
    if (studioUser?.user_id === targetSub.user_id) {
      setStudioUser(updatedSub);
    }
    if (selectedUser?.user_id === targetSub.user_id) {
      setSelectedUser(updatedSub);
    }
    return updatedSub;
  };

  // 1번 기능: 마스터 전용 AI 문제점 진단 & 3가지 다듬기 실행 (실행 즉시 우측 다듬기 공간에 표시 + 캐시 저장)
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
      const nextAi = { diagnosis: json.diagnosis || "", drafts: json.drafts || [] };
      setAiDiagnosis(nextAi);

      if (studioUser) {
        const nextData = {
          ...(studioUser.data || {}),
          masterAiCache: {
            ...(studioUser.data?.masterAiCache || {}),
            [selectedFieldId]: nextAi,
          },
        };
        await persistUserData(studioUser, nextData);
      }

      toast.success("AI 다듬기 결과가 붉은색 코멘트 공간 바로 옆에 생성되었습니다!");
    } catch (e: any) {
      toast.error(e.message || "AI 실행 중 오류가 발생했습니다.");
    } finally {
      setAiLoading(false);
    }
  };

  // 마스터 전용 붉은색 비밀 코멘트 저장
  const handleSaveMasterRedComment = async (customComment?: string) => {
    if (!studioUser) return;
    const textToSave = customComment !== undefined ? customComment : masterRedComment;
    setSavingCommentToDb(true);
    try {
      const nextData = {
        ...(studioUser.data || {}),
        masterComments: {
          ...(studioUser.data?.masterComments || {}),
          [selectedFieldId]: textToSave,
        },
      };
      await persistUserData(studioUser, nextData);
      toast.success("마스터 전용 붉은색 비밀 코멘트가 안전하게 저장되었습니다!");
    } catch (e: any) {
      toast.error(e.message || "코멘트 저장 중 오류가 발생했습니다.");
    } finally {
      setSavingCommentToDb(false);
    }
  };

  // 마스터가 다듬은 문장을 해당 원장님 워크북 DB에 저장 (코멘트도 함께 저장)
  const handleSaveRefinedToUser = async () => {
    if (!studioUser) return;
    setSavingToDb(true);
    try {
      let nextData = setNestedField(
        studioUser.data || {},
        currentFieldMeta.chapterKey,
        currentFieldMeta.fieldPath,
        masterDraftText
      );
      nextData = {
        ...nextData,
        masterComments: {
          ...(nextData.masterComments || {}),
          [selectedFieldId]: masterRedComment,
        },
      };
      await persistUserData(studioUser, nextData);
      toast.success("마스터가 다듬은 솔루션과 붉은색 비밀 코멘트가 DB에 반영되었습니다!");
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
    safePush("차트 최근 2년 월별 매출·초재진 엑셀 (당월 제외)", data?.ch4?.chartRevenueFiles);
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
              2. 마스터 전용: 붉은색 비밀 코멘트 & AI 다듬기 스튜디오
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
                  원장님들이 꾸미지 않고 작성한 날것(Raw) 데이터를 열람하고, 마스터 전용 붉은색 비밀 코멘트 작성 및 AI 다듬기를 바로 실행합니다.
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
                    <th className="px-6 py-4 text-[11px] font-black text-amber-300 uppercase tracking-wider text-center">마스터 코멘트</th>
                    <th className="px-6 py-4 text-[11px] font-black text-amber-300 uppercase tracking-wider text-center">첨부 파일</th>
                    <th className="px-6 py-4 text-[11px] font-black text-amber-300 uppercase tracking-wider text-center">최종 업데이트</th>
                    <th className="px-6 py-4 text-[11px] font-black text-amber-300 uppercase tracking-wider text-right">마스터 전용 액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {submissions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-8 py-20 text-center font-bold text-white/40">
                        아직 저장된 설문 데이터가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    submissions.map((sub, idx) => {
                      const fileList = getFilesList(sub.data);
                      const totalFiles = fileList.reduce((acc, curr) => acc + (curr.urls?.length || 0), 0);
                      const commentCount = Object.values(sub.data?.masterComments || {}).filter(
                        (v: any) => typeof v === "string" && v.trim().length > 0
                      ).length;
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
                            <span
                              className={`text-xs font-black px-2.5 py-1 rounded-lg ${
                                commentCount > 0
                                  ? "bg-red-500/20 text-red-400 border border-red-500/40"
                                  : "text-white/30"
                              }`}
                            >
                              🔴 {commentCount}건
                            </span>
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
                                <Wand2 size={13} /> 코멘트·AI 다듬기
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
            TAB 2: 마스터 전용 메뉴 — 붉은색 비밀 코멘트 & 옆 공간 AI 다듬기 스튜디오
           ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "studio" && (
          <div className="space-y-6">
            {/* 상단 컨트롤 바: 대상 원장님 선택 & 병원 유형 프리셋 선택 */}
            <div className="p-6 rounded-3xl bg-[#07261B] border border-amber-400/30 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase">
                    MASTER SECRET COMMENT & AI STUDIO
                  </span>
                  <h2 className="text-lg font-black text-[#F5F2EB]">
                    마스터 전용 붉은색 비밀 코멘트 & 옆 공간 AI 다듬기 스튜디오
                  </h2>
                </div>
                <p className="text-xs text-emerald-200/70">
                  좌측에 <strong>마스터만 볼 수 있는 붉은색 코멘트 공간</strong>과 우측 바로 옆에 <strong>AI 다듬기 실시간 확인 공간</strong>이 나란히 배치되어 한눈에 비교·작성하실 수 있습니다.
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
                    const hasRedComment = Boolean(studioUser?.data?.masterComments?.[field.id]?.trim());
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
                            {hasRedComment && (
                              <span className="px-1.5 py-0.5 rounded bg-red-500/25 border border-red-500/40 text-red-300 text-[9px] font-black">
                                🔴 코멘트 있음
                              </span>
                            )}
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

              {/* 우측: 원장님 리얼 현황 + [좌: 마스터 붉은색 비밀 코멘트 | 우: AI 다듬기 바로 확인 공간] (8 cols) */}
              <div className="lg:col-span-8 space-y-6">
                {/* 1. 원장님이 제출한 날것(Raw) 리얼 현황 박스 + AI 다듬기 즉시 실행 버튼 */}
                <div className="p-6 rounded-3xl bg-[#07261B] border border-white/10 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-400/30 text-rose-300 text-xs font-black">
                        RAW DATA (원장님 리얼 현황)
                      </span>
                      <h3 className="text-base font-black text-[#F5F2EB]">
                        STEP {currentFieldMeta.orderNo}. {currentFieldMeta.title} ({currentFieldMeta.legacyQ})
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={handleRunStudioAi}
                      disabled={aiLoading}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-[#031C13] font-black text-xs flex items-center gap-1.5 shadow-lg hover:brightness-105 disabled:opacity-50 transition-all"
                    >
                      <Wand2 size={14} className={aiLoading ? "animate-spin" : ""} />
                      {aiLoading ? "AI 다듬기 분석 중..." : "✨ AI 다듬기 (아래 코멘트 옆 공간에서 바로 확인)"}
                    </button>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#041810] border border-white/10 min-h-[80px] text-sm text-[#F5F2EB]/90 whitespace-pre-wrap leading-relaxed">
                    {rawMemberAnswer ? (
                      rawMemberAnswer
                    ) : (
                      <span className="text-white/35 italic">
                        아직 원장님이 이 문항을 작성하지 않았습니다. 아래에서 바로 붉은색 마스터 코멘트를 남기거나 AI 다듬기 및 모범 프리셋을 처방할 수 있습니다.
                      </span>
                    )}
                  </div>
                </div>

                {/* ─── [핵심 요청 1 & 2] 좌측: 마스터 전용 붉은색 코멘트 공간 | 우측: AI 다듬기 바로 확인 공간 ─── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
                  {/* 좌측 컬럼: 1. 마스터만 확인할 수 있는 붉은색 코멘트 작성 공간 */}
                  <div className="p-6 rounded-3xl bg-gradient-to-br from-red-950/70 via-[#1D070C]/95 to-[#0E0306]/95 border-2 border-red-500/60 shadow-2xl flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-red-500/30 pb-3">
                        <div>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
                            <Lock size={10} /> MASTER ONLY 비밀 코멘트
                          </span>
                          <h4 className="text-sm font-black text-red-400 mt-1">
                            🔴 마스터 전용 붉은색 코멘트 작성란
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSaveMasterRedComment()}
                          disabled={savingCommentToDb}
                          className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md transition-all disabled:opacity-50"
                        >
                          <Save size={13} />
                          {savingCommentToDb ? "저장 중..." : "붉은색 코멘트 저장"}
                        </button>
                      </div>

                      <p className="text-[11px] text-red-200/80 leading-relaxed">
                        이곳에 작성하시는 코멘트는 <strong>선명한 붉은색 글씨</strong>로 기록되며, <strong>마스터 모드에서만 확인 가능</strong>합니다 (일반 원장님 화면에는 절대 노출되지 않습니다).
                      </p>

                      <textarea
                        rows={10}
                        value={masterRedComment}
                        onChange={e => setMasterRedComment(e.target.value)}
                        placeholder="🔴 원장님의 설문 답변을 보며 마스터만 확인하는 비밀 진단 메모, 컨설팅 핵심 지적 사항, 피드백 포인트를 붉은색으로 작성하세요..."
                        className="w-full p-4 rounded-2xl bg-black/60 border-2 border-red-500/50 text-red-400 font-bold text-sm placeholder:text-red-300/35 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-500/30 leading-relaxed resize-y"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-red-500/25 text-xs">
                      <span className="text-[11px] text-red-300/75 font-bold">
                        🔒 보안 등급: 마스터 단독 열람 전용
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(masterRedComment);
                            toast.success("마스터 붉은색 코멘트가 클립보드에 복사되었습니다!");
                          }}
                          className="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 text-xs font-black flex items-center gap-1"
                        >
                          <Copy size={12} /> 코멘트 복사
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 우측 컬럼: 2. AI 다듬기 클릭 시 코멘트 공간 옆에서 바로 확인할 수 있는 공간 */}
                  <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0A3526] via-[#07261B] to-[#051F15] border-2 border-amber-400/50 shadow-2xl flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                        <div>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400 text-[#031C13] text-[10px] font-black uppercase tracking-wider">
                            <Wand2 size={10} /> SIDE-BY-SIDE AI WORKSPACE
                          </span>
                          <h4 className="text-sm font-black text-[#F5F2EB] mt-1">
                            ✨ AI 다듬기 바로 확인 공간 (코멘트 옆)
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={handleRunStudioAi}
                          disabled={aiLoading}
                          className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-[#031C13] font-black text-xs flex items-center gap-1.5 shadow-lg hover:brightness-105 disabled:opacity-50 transition-all"
                        >
                          <Wand2 size={13} className={aiLoading ? "animate-spin" : ""} />
                          {aiLoading ? "AI 분석 중..." : aiDiagnosis ? "AI 다시 다듬기" : "AI 다듬기 실행"}
                        </button>
                      </div>

                      {aiLoading ? (
                        <div className="min-h-[260px] flex flex-col items-center justify-center text-center p-6 space-y-3">
                          <div className="w-9 h-9 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
                          <p className="text-xs sm:text-sm font-black text-amber-300">
                            AI가 원장님의 리얼 현황 문제점을 진단하고<br />3가지 컨설팅 문장으로 다듬고 있습니다...
                          </p>
                        </div>
                      ) : aiDiagnosis ? (
                        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                          {aiDiagnosis.diagnosis && (
                            <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-400/35 space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-black text-rose-300 flex items-center gap-1">
                                  <AlertTriangle size={13} /> AI 핵심 문제점 / 병목 진단
                                </p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextComment = masterRedComment
                                      ? `${masterRedComment}\n[AI 진단] ${aiDiagnosis.diagnosis}`
                                      : `[AI 진단] ${aiDiagnosis.diagnosis}`;
                                    setMasterRedComment(nextComment);
                                    handleSaveMasterRedComment(nextComment);
                                  }}
                                  className="px-2 py-0.5 rounded bg-red-500/30 hover:bg-red-500/45 border border-red-400/40 text-red-200 text-[10px] font-black"
                                >
                                  ← 좌측 붉은 코멘트로 복사
                                </button>
                              </div>
                              <p className="text-xs text-[#F5F2EB] leading-relaxed">{aiDiagnosis.diagnosis}</p>
                            </div>
                          )}

                          <div className="space-y-2">
                            <p className="text-xs font-black text-amber-300">
                              ✨ AI 추천 맞춤형 컨설팅 다듬기 초안 3선
                            </p>
                            {aiDiagnosis.drafts.map((d, idx) => (
                              <div
                                key={idx}
                                className="p-3.5 rounded-2xl bg-[#041810] border border-amber-400/25 space-y-2"
                              >
                                <p className="text-xs text-[#F5F2EB] whitespace-pre-wrap leading-relaxed">
                                  {d}
                                </p>
                                <div className="flex flex-wrap items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextComment = masterRedComment
                                        ? `${masterRedComment}\n\n[AI 다듬기 안 ${idx + 1}]\n${d}`
                                        : `[AI 다듬기 안 ${idx + 1}]\n${d}`;
                                      setMasterRedComment(nextComment);
                                      handleSaveMasterRedComment(nextComment);
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-red-500/25 hover:bg-red-500/40 border border-red-400/40 text-red-200 text-[10px] font-black transition-all"
                                  >
                                    ← 붉은 코멘트에 추가
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMasterDraftText(d);
                                      toast.success(`초안 ${idx + 1}이 하단 마스터 솔루션 에디터에 반영되었습니다.`);
                                    }}
                                    className="px-3 py-1 rounded-lg bg-amber-400 text-[#031C13] text-[10px] font-black hover:bg-amber-300"
                                  >
                                    에디터에 적용
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="min-h-[260px] flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-[#041810]/70 border border-dashed border-amber-400/30 space-y-2.5">
                          <Wand2 size={28} className="text-amber-400/80" />
                          <p className="text-xs sm:text-sm font-black text-amber-200">
                            우측 상단의 [AI 다듬기 실행] 버튼을 클릭하세요!
                          </p>
                          <p className="text-xs text-white/55 leading-relaxed max-w-sm">
                            좌측 <strong>붉은색 마스터 코멘트 공간</strong>을 보면서 바로 옆 이 공간에서 AI 문제점 진단과 3가지 다듬기 문장을 동시에 확인하고 원클릭으로 가져올 수 있습니다.
                          </p>
                        </div>
                      )}
                    </div>
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
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-black text-emerald-300">
                          ✦ {PRESET_CATEGORY_LABELS[presetCategory].label} — {PRESET_CATEGORY_LABELS[presetCategory].desc}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const nextComment = masterRedComment
                                ? `${masterRedComment}\n\n[모범 프리셋]\n${currentFieldMeta.presets![presetCategory]}`
                                : `[모범 프리셋]\n${currentFieldMeta.presets![presetCategory]}`;
                              setMasterRedComment(nextComment);
                              handleSaveMasterRedComment(nextComment);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-red-500/25 hover:bg-red-500/40 border border-red-400/40 text-red-200 text-xs font-black transition-all"
                          >
                            붉은 코멘트에 복사
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMasterDraftText(currentFieldMeta.presets![presetCategory]);
                              toast.success("모범 프리셋이 아래 마스터 코칭 에디터에 로드되었습니다.");
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#031C13] text-xs font-black flex items-center gap-1 transition-all"
                          >
                            에디터로 불러오기 <ArrowRight size={12} />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm text-[#F5F2EB]/90 whitespace-pre-wrap leading-relaxed">
                        {currentFieldMeta.presets[presetCategory]}
                      </p>
                    </div>
                  </div>
                )}

                {/* 3. 마스터 최종 코칭/다듬기 편집창 및 DB 반영 */}
                <div className="p-6 rounded-3xl bg-[#07261B] border border-amber-400/35 space-y-3 shadow-xl">
                  <label className="block text-xs font-black text-amber-300">
                    마스터 최종 코칭 & 다듬기 솔루션 에디터 (원장님 설문 답변에 직접 반영 가능)
                  </label>
                  <textarea
                    rows={5}
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
                        {savingToDb ? "저장 중..." : "원장님 워크북 DB에 다듬은 내용 & 코멘트 반영"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── 상세 열람 모달 (Part 1 ~ Part 6 전체 51문항 통합 열람 + 인라인 붉은색 코멘트 & 옆 공간 AI 다듬기) ── */}
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
                    <Wand2 size={14} /> 전용 스튜디오 탭에서 열기
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
                  onOpenMasterStudioForField={(fieldId, partNo) => {
                    setStudioUser(selectedUser);
                    setStudioPart(partNo);
                    setSelectedFieldId(fieldId);
                    setSelectedUser(null);
                    setActiveTab("studio");
                  }}
                  onSaveMasterComment={async (commentKey, commentText) => {
                    const nextData = {
                      ...(selectedUser.data || {}),
                      masterComments: {
                        ...(selectedUser.data?.masterComments || {}),
                        [commentKey]: commentText,
                      },
                    };
                    await persistUserData(selectedUser, nextData);
                  }}
                  onApplyAiToField={async (fieldId, newValue) => {
                    const dotIdx = fieldId.indexOf(".");
                    if (dotIdx > 0) {
                      const chKey = fieldId.slice(0, dotIdx);
                      const subKey = fieldId.slice(dotIdx + 1);
                      const nextData = setNestedField(selectedUser.data || {}, chKey, subKey, newValue);
                      await persistUserData(selectedUser, nextData);
                    }
                  }}
                  onSaveAiCache={async (commentKey, aiData) => {
                    const nextData = {
                      ...(selectedUser.data || {}),
                      masterAiCache: {
                        ...(selectedUser.data?.masterAiCache || {}),
                        [commentKey]: aiData,
                      },
                    };
                    await persistUserData(selectedUser, nextData);
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
