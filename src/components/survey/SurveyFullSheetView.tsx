"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  AlertCircle,
  FileText,
  FileImage,
  Download,
  Edit3,
  Printer,
  Filter,
  FolderOpen,
  User,
  Stethoscope,
  ClipboardList,
  BarChart3,
  Users,
  Shield,
  Wand2,
  Check,
  Lock,
  Sparkles,
  Copy,
  Save,
  AlertTriangle,
  Crown,
} from "lucide-react";
import toast from "react-hot-toast";
import type { SurveyData } from "@/app/survey/page";
import { SAFETY_ITEMS, calculateTotalMonthlyExpense, parseExpenseManWon } from "@/app/survey/page";
import {
  MASTER_SURVEY_FIELDS,
  PRESET_CATEGORY_LABELS,
  PresetCategory,
} from "@/lib/surveyPresets";

interface SurveyFullSheetViewProps {
  data: SurveyData;
  userEmail?: string;
  userName?: string;
  updatedAt?: string;
  submitted?: boolean;
  totalPct?: number;
  partPcts?: number[];
  onEditPart?: (partNumber: number) => void;
  isMaster?: boolean;
  onOpenMasterStudioForField?: (fieldId: string, partNumber: number) => void;
  onOpenStudio?: () => void;
  onSaveMasterComment?: (commentKey: string, commentText: string) => void | Promise<void>;
  onApplyAiToField?: (fieldId: string, newValue: string) => void | Promise<void>;
  onSaveAiCache?: (commentKey: string, aiData: { diagnosis: string; drafts: string[] }) => void;
}

type FilterMode = "all" | "filled" | "empty" | "files";

export default function SurveyFullSheetView({
  data,
  userEmail,
  userName,
  updatedAt,
  submitted,
  totalPct: propTotalPct,
  partPcts: propPartPcts,
  onEditPart,
  isMaster,
  onOpenMasterStudioForField,
  onOpenStudio,
  onSaveMasterComment,
  onApplyAiToField,
  onSaveAiCache,
}: SurveyFullSheetViewProps) {
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  // 마스터 전용: 각 문항별 인라인 붉은색 비밀 코멘트 입력 상태 & 옆 공간 AI 다듬기 결과 상태
  const [localComments, setLocalComments] = useState<Record<string, string>>({});
  const [aiLoadingMap, setAiLoadingMap] = useState<Record<string, boolean>>({});
  const [aiResultsMap, setAiResultsMap] = useState<Record<string, { diagnosis: string; drafts: string[] }>>({});
  const [openAiPanelMap, setOpenAiPanelMap] = useState<Record<string, boolean>>({});
  const [openPresetsMap, setOpenPresetsMap] = useState<Record<string, boolean>>({});

  // 설문지 대상(원장님 이메일/이름/한의원)이 바뀔 때 로컬 코멘트 및 AI 결과 상태를 즉시 초기화하여 다른 설문지에 코멘트가 섞이거나 전염되는 현상 원천 차단
  const surveyOwnerKey = `${userEmail || ""}::${userName || ""}::${data?.ch1?.clinic || ""}::${data?.ch1?.name || ""}`;
  React.useEffect(() => {
    setLocalComments({});
    setAiLoadingMap({});
    setAiResultsMap({});
    setOpenAiPanelMap({});
    setOpenPresetsMap({});
  }, [surveyOwnerKey]);

  const hasText = (v: any) => typeof v === "string" && v.trim().length > 0;
  const handleStudioTrigger = onOpenMasterStudioForField || (onOpenStudio ? () => onOpenStudio() : undefined);

  const getMasterCommentValue = (key: string) => {
    if (Object.prototype.hasOwnProperty.call(localComments, key)) return localComments[key];
    return (data as any)?.masterComments?.[key] || "";
  };

  const getAiResultForKey = (key: string) => {
    if (Object.prototype.hasOwnProperty.call(aiResultsMap, key)) return aiResultsMap[key];
    return (data as any)?.masterAiCache?.[key] || null;
  };

  const handleRunInlineAi = async (
    commentKey: string,
    step: string,
    label: string,
    rawValue: string,
    studioFieldId?: string
  ) => {
    setOpenAiPanelMap(prev => ({ ...prev, [commentKey]: true }));
    setAiLoadingMap(prev => ({ ...prev, [commentKey]: true }));
    try {
      const res = await fetch("/api/survey/ai-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data?.ch1?.name || userName || "원장",
          clinic: data?.ch1?.clinic || "우리 한의원",
          degree: data?.ch1?.degree || "",
          questionLabel: `[STEP ${step}] ${label}`,
          currentValue: rawValue,
          mode: "master_diagnosis",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "AI 다듬기 분석 실패");
      const resultObj = {
        diagnosis: json.diagnosis || "",
        drafts: Array.isArray(json.drafts) ? json.drafts : [],
      };
      setAiResultsMap(prev => ({ ...prev, [commentKey]: resultObj }));
      if (onSaveAiCache) {
        onSaveAiCache(commentKey, resultObj);
      }
      if (studioFieldId && studioFieldId !== commentKey && onSaveAiCache) {
        onSaveAiCache(studioFieldId, resultObj);
      }
      toast.success(`STEP ${step} AI 다듬기 결과가 코멘트 공간 옆에 생성되었습니다!`);
    } catch (e: any) {
      toast.error(e.message || "AI 다듬기 실행 중 오류가 발생했습니다.");
    } finally {
      setAiLoadingMap(prev => ({ ...prev, [commentKey]: false }));
    }
  };

  const computedStats = React.useMemo(() => {
    const ratioOf = (arr: any[]) => {
      if (!arr.length) return 0;
      const filled = arr.filter(hasText).length;
      return Math.round((filled / arr.length) * 100);
    };
    const p1 = ratioOf([data?.ch1?.name, data?.ch1?.degree, data?.ch1?.intro, data?.ch1?.mbti, data?.ch1?.clinicPride, data?.ch1?.desiredLeader, data?.ch1?.philosophy, data?.ch1?.vision, data?.ch1?.actionStep, data?.ch1?.weakness]);
    const p2 = ratioOf([data?.ch2?.addressHours, data?.ch2?.clinicSize, data?.ch2?.patientFlow, data?.ch2?.consultScript, data?.ch2?.herbConsultProcess, data?.ch1?.whyCome, data?.ch1?.whyLeave, data?.ch2?.happyCallSystem, data?.ch2?.herbInstructions, data?.ch2?.herbManagementSystem]);
    const p3 = ratioOf([data?.ch3?.treatmentDefinition, data?.ch3?.equipmentDetail, data?.ch3?.patientQna, data?.ch3?.diseasePlans, data?.ch3?.mskExample, data?.ch3?.charting?.[0]?.case1, data?.ch3?.billingRoutine, data?.ch3?.chunaRoutine, data?.ch3?.herbRecommendation, data?.ch3?.acupointRecommendation]);
    const hasChartExcel = (data?.ch4?.chartRevenueFiles?.length || 0) > 0 ? "uploaded" : "";
    const hasExpenses = calculateTotalMonthlyExpense(data?.ch4?.expenses).totalManWon > 0 ? "filled" : "";
    const p4 = ratioOf([data?.ch4?.targetMetrics?.revenue, data?.ch4?.targetMetrics?.profit, data?.ch4?.workingDays, data?.ch4?.profitUsage, data?.ch4?.investmentHistory, data?.ch4?.growthInvestment, data?.ch4?.immediateInvestment, data?.ch4?.indicators, hasChartExcel, hasExpenses]);
    const p5 = ratioOf([data?.ch5?.staff?.[0]?.salary, data?.ch5?.staffCounts?.desk, data?.ch5?.mealSnack?.lunch, data?.ch5?.welfare, data?.ch5?.staffDiscount, data?.ch5?.idealStaff, data?.ch5?.expectations?.manager, data?.ch5?.chatSystem?.program, data?.ch5?.eduMeeting]);
    const safetyCount = Object.values(data?.ch6?.safetyItems || {}).filter(Boolean).length;
    const p6 = ratioOf([safetyCount > 0 ? "checked" : "", data?.ch6?.marketingStatus?.channels, data?.ch6?.marketingStatus?.cost, data?.ch6?.marketingStatus?.goal, data?.ch6?.promoMaterials, data?.ch6?.finalGoal]);
    const parts = [p1, p2, p3, p4, p5, p6];
    const total = Math.round(parts.reduce((a, b) => a + b, 0) / 6);
    return { parts, total };
  }, [data]);

  const totalPct = propTotalPct ?? computedStats.total;
  const partPcts = propPartPcts ?? computedStats.parts;

  // 모든 첨부파일 추출
  const allUploadedFiles = React.useMemo(() => {
    const list: { part: number; step: string; category: string; urls: string[] }[] = [];
    const pushFiles = (part: number, step: string, category: string, raw: any) => {
      const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
      const valid = arr.filter(u => typeof u === "string" && u.trim().length > 0);
      if (valid.length > 0) list.push({ part, step, category, urls: valid });
    };

    pushFiles(2, "STEP 18-B", "한약 복용 안내문 (Q32)", data?.ch2?.herbInstructionsFile);
    pushFiles(3, "STEP 22-B", "환자 다빈도 Q&A 매뉴얼 (Q10)", data?.ch3?.patientQnaFile);
    pushFiles(4, "STEP 36-B", "지표 관리 양식/엑셀 (Q27)", data?.ch4?.indicatorsFile);
    pushFiles(4, "STEP 36-C", "차트 프로그램 최근 2년 월별 매출·초재진·청구·본부금·비급여·자보 엑셀 (당월 제외)", data?.ch4?.chartRevenueFiles);
    pushFiles(5, "STEP 45-C", "메신저 전체 채널 목록 캡처 (Q49)", data?.ch5?.chatSystem?.capture1);
    pushFiles(5, "STEP 45-C", "메신저 실제 대화 예시 캡처 (Q49)", data?.ch5?.chatSystem?.capture2);
    pushFiles(5, "STEP 45-C", "원내 소통 가이드라인 문서 (Q49)", data?.ch5?.chatSystem?.guideFile);
    pushFiles(5, "STEP 47", "원내 보유 교육 자료 (Q51)", data?.ch5?.eduMaterials);
    pushFiles(6, "STEP 50-B", "원내 비치 홍보물 사진 (Q54)", data?.ch6?.promoPhotos);

    if (data?.ch6?.safetyFiles && typeof data.ch6.safetyFiles === "object") {
      Object.entries(data.ch6.safetyFiles).forEach(([itemKey, urls]) => {
        pushFiles(6, "STEP 48", `안전 대응 매뉴얼 — ${itemKey} (Q52)`, urls);
      });
    }
    return list;
  }, [data]);

  const totalFileCount = allUploadedFiles.reduce((acc, cur) => acc + cur.urls.length, 0);

  // 각 문항 행 렌더링 헬퍼
  const renderQuestionRow = ({
    step,
    legacyQ,
    label,
    value,
    files,
    partNumber,
    studioFieldId,
  }: {
    step: string;
    legacyQ?: string;
    label: string;
    value?: string | React.ReactNode;
    files?: string[];
    partNumber: number;
    studioFieldId?: string;
  }) => {
    const validFiles = (files || []).filter(u => typeof u === "string" && u.trim().length > 0);
    const isFilled =
      (typeof value === "string" && value.trim().length > 0) ||
      (typeof value !== "string" && Boolean(value)) ||
      validFiles.length > 0;

    if (filterMode === "filled" && !isFilled) return null;
    if (filterMode === "empty" && isFilled) return null;
    if (filterMode === "files" && validFiles.length === 0) return null;

    const commentKey = studioFieldId || `step.${step}`;
    const currentRedComment = getMasterCommentValue(commentKey);
    const currentAiResult = getAiResultForKey(commentKey) || (studioFieldId ? getAiResultForKey(studioFieldId) : null);
    const isAiLoading = Boolean(aiLoadingMap[commentKey]);
    const rawStringVal = typeof value === "string" ? value : "";
    const presetMeta = studioFieldId ? MASTER_SURVEY_FIELDS.find(f => f.id === studioFieldId) : undefined;
    const showPresets = Boolean(openPresetsMap[commentKey]);

    return (
      <div className={`p-5 rounded-2xl border transition-all ${
        isFilled
          ? "bg-[#041810]/90 border-white/12"
          : "bg-[#041810]/40 border-dashed border-white/10"
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-amber-400/15 border border-amber-400/30 text-[10px] font-black text-amber-300">
              STEP {step}
            </span>
            {legacyQ && (
              <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-bold text-white/45">
                {legacyQ}
              </span>
            )}
            <h4 className="text-sm font-black text-[#F5F2EB]">{label}</h4>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 ${
              isFilled
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
            }`}>
              {isFilled ? <><Check size={10} /> 작성 완료</> : "미작성"}
            </span>

            {isMaster && (
              <>
                <button
                  type="button"
                  onClick={() => handleRunInlineAi(commentKey, step, label, rawStringVal, studioFieldId)}
                  disabled={isAiLoading}
                  className="px-3 py-1 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-105 text-[#031C13] text-[11px] font-black flex items-center gap-1 transition-all shadow-sm disabled:opacity-50"
                >
                  <Wand2 size={11} className={isAiLoading ? "animate-spin" : ""} />
                  {isAiLoading ? "AI 분석 중..." : "✨ AI 다듬기 (옆 공간 바로 확인)"}
                </button>
                {presetMeta?.presets && (
                  <button
                    type="button"
                    onClick={() => setOpenPresetsMap(p => ({ ...p, [commentKey]: !p[commentKey] }))}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-[#F5F2EB] text-[10px] font-bold flex items-center gap-1 transition-all"
                  >
                    <Sparkles size={10} className="text-amber-400" />
                    모범 프리셋 {showPresets ? "닫기" : "열기"}
                  </button>
                )}
                {studioFieldId && handleStudioTrigger && (
                  <button
                    type="button"
                    onClick={() => handleStudioTrigger(studioFieldId, partNumber)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[10px] font-black flex items-center gap-1 transition-all"
                  >
                    <Crown size={10} /> 스튜디오 열기
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* 텍스트 또는 커스텀 노드 답변 */}
        {typeof value === "string" ? (
          value.trim().length > 0 ? (
            <div className="text-sm text-[#F5F2EB]/90 whitespace-pre-wrap leading-relaxed pl-1">
              {value}
            </div>
          ) : (
            <p className="text-xs text-white/30 italic pl-1">아직 작성된 내용이 없습니다.</p>
          )
        ) : value ? (
          <div className="mt-2">{value}</div>
        ) : (
          <p className="text-xs text-white/30 italic pl-1">아직 작성된 내용이 없습니다.</p>
        )}

        {/* 첨부 파일이 있는 경우 */}
        {validFiles.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap gap-2">
            {validFiles.map((url, idx) => {
              const isImg = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
              return (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/30 text-amber-300 text-xs font-bold transition-all"
                >
                  {isImg ? <FileImage size={13} /> : <FileText size={13} />}
                  첨부파일 {idx + 1} 열기
                  <Download size={12} />
                </a>
              );
            })}
          </div>
        )}

        {/* ─── 마스터 전용 2열 워크스페이스: [좌측] 마스터 전용 붉은색 비밀 코멘트 | [우측] AI 다듬기 바로 확인 공간 ─── */}
        {isMaster && (
          <div className="mt-4 pt-4 border-t border-red-500/30 space-y-3 print:hidden">
            {showPresets && presetMeta?.presets && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pb-2">
                {(["pain", "diet", "local"] as PresetCategory[]).map(cat => (
                  <div key={cat} className="p-3 rounded-xl bg-[#03150E] border border-emerald-500/25 flex flex-col justify-between gap-2">
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-black mb-1">
                        {PRESET_CATEGORY_LABELS[cat].label}
                      </span>
                      <p className="text-xs text-white/85 whitespace-pre-wrap leading-relaxed">{presetMeta.presets![cat]}</p>
                    </div>
                    <div className="flex gap-1.5">
                      {studioFieldId && onApplyAiToField && (
                        <button
                          type="button"
                          onClick={() => {
                            onApplyAiToField(studioFieldId, presetMeta.presets![cat]);
                            toast.success(`[${PRESET_CATEGORY_LABELS[cat].label}] 프리셋이 설문 답변에 반영되었습니다.`);
                          }}
                          className="flex-1 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#031C13] text-[11px] font-black transition-all"
                        >
                          설문 답변에 적용
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const nextComment = currentRedComment
                            ? `${currentRedComment}\n\n[추천 프리셋]\n${presetMeta.presets![cat]}`
                            : `[추천 프리셋]\n${presetMeta.presets![cat]}`;
                          setLocalComments(prev => ({ ...prev, [commentKey]: nextComment }));
                          if (onSaveMasterComment) onSaveMasterComment(commentKey, nextComment);
                          toast.success("마스터 붉은색 코멘트란에 추가되었습니다.");
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 text-[11px] font-black transition-all"
                      >
                        코멘트로 복사
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
              {/* [1번 요청] 좌측: 마스터만 확인할 수 있는 붉은색 비밀 코멘트 공간 */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-red-950/60 via-[#1A070B]/90 to-[#0D0406]/90 border-2 border-red-500/50 shadow-lg flex flex-col justify-between space-y-2.5">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
                        <Lock size={10} /> MASTER ONLY 비밀 코멘트
                      </span>
                      <span className="text-[11px] font-black text-red-300">
                        (마스터만 열람 가능 · 붉은색 전용 메모)
                      </span>
                    </div>
                    {onSaveMasterComment && (
                      <button
                        type="button"
                        onClick={() => {
                          onSaveMasterComment(commentKey, currentRedComment);
                          toast.success(`STEP ${step} 마스터 비밀 코멘트가 저장되었습니다.`);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-red-500 hover:bg-red-400 text-white text-[10px] font-black flex items-center gap-1 transition-all shadow-sm"
                      >
                        <Save size={10} /> 코멘트 저장
                      </button>
                    )}
                  </div>

                  <textarea
                    rows={4}
                    value={currentRedComment}
                    onChange={e => {
                      const val = e.target.value;
                      setLocalComments(prev => ({ ...prev, [commentKey]: val }));
                      if (onSaveMasterComment) {
                        onSaveMasterComment(commentKey, val);
                      }
                    }}
                    placeholder="🔴 마스터 전용 비밀 진단 코멘트를 작성하세요 (작성된 글씨는 선명한 붉은색으로 표시되며 일반 원장님 화면에는 절대 노출되지 않습니다)."
                    className="w-full p-3.5 rounded-xl bg-black/55 border border-red-500/50 text-red-400 font-bold text-xs sm:text-sm placeholder:text-red-300/35 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-500/30 leading-relaxed resize-y"
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-red-300/75 pt-1">
                  <span>🔒 일반 회원 설문 화면 및 API 응답에서 완벽 분리·차단됨</span>
                  {currentRedComment && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(currentRedComment);
                        toast.success("마스터 붉은색 코멘트가 복사되었습니다.");
                      }}
                      className="text-red-300 hover:text-red-200 font-black flex items-center gap-1 underline"
                    >
                      <Copy size={10} /> 코멘트 복사
                    </button>
                  )}
                </div>
              </div>

              {/* [2번 요청] 우측: AI 다듬기 클릭 시 코멘트 공간 옆에서 바로 확인할 수 있는 공간 */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0B3324]/95 via-[#072319]/95 to-[#041810]/95 border-2 border-amber-400/45 shadow-lg flex flex-col justify-between space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400 text-[#031C13] text-[10px] font-black uppercase tracking-wider">
                      <Wand2 size={10} /> AI 다듬기 실시간 확인 공간
                    </span>
                    <span className="text-[11px] font-bold text-amber-200/85">
                      코멘트 공간 바로 옆에서 비교·적용
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRunInlineAi(commentKey, step, label, rawStringVal, studioFieldId)}
                    disabled={isAiLoading}
                    className="px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-[#031C13] text-[11px] font-black flex items-center gap-1 transition-all shadow-sm disabled:opacity-50"
                  >
                    <Wand2 size={11} className={isAiLoading ? "animate-spin" : ""} />
                    {isAiLoading ? "AI 다듬는 중..." : currentAiResult ? "AI 다시 다듬기" : "AI 다듬기 실행"}
                  </button>
                </div>

                {isAiLoading ? (
                  <div className="flex-1 min-h-[120px] flex flex-col items-center justify-center text-center p-4 space-y-2">
                    <div className="w-7 h-7 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs font-black text-amber-300">
                      AI가 원장님의 리얼 현황 문제점을 진단하고 3가지 컨설팅 문장으로 다듬고 있습니다...
                    </p>
                  </div>
                ) : currentAiResult ? (
                  <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                    {currentAiResult.diagnosis && (
                      <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-400/35 text-xs text-rose-200 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-black text-rose-300 flex items-center gap-1">
                            <AlertTriangle size={12} /> 🔍 AI 핵심 문제점 진단
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const nextComment = currentRedComment
                                ? `${currentRedComment}\n[AI 진단] ${currentAiResult.diagnosis}`
                                : `[AI 진단] ${currentAiResult.diagnosis}`;
                              setLocalComments(prev => ({ ...prev, [commentKey]: nextComment }));
                              if (onSaveMasterComment) onSaveMasterComment(commentKey, nextComment);
                              toast.success("AI 문제점 진단이 좌측 붉은색 마스터 코멘트에 반영되었습니다!");
                            }}
                            className="px-2 py-0.5 rounded bg-red-500/30 hover:bg-red-500/45 border border-red-400/40 text-red-200 text-[10px] font-black"
                          >
                            ← 코멘트로 가져오기
                          </button>
                        </div>
                        <p className="leading-relaxed">{currentAiResult.diagnosis}</p>
                      </div>
                    )}

                    <div className="space-y-2">
                      {currentAiResult.drafts?.map((draft: string, dIdx: number) => (
                        <div
                          key={dIdx}
                          className="p-3 rounded-xl bg-[#03150E] border border-amber-400/25 space-y-2"
                        >
                          <p className="text-xs text-[#F5F2EB] whitespace-pre-wrap leading-relaxed">
                            {draft}
                          </p>
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const nextComment = currentRedComment
                                  ? `${currentRedComment}\n\n[AI 다듬기 안 ${dIdx + 1}]\n${draft}`
                                  : `[AI 다듬기 안 ${dIdx + 1}]\n${draft}`;
                                setLocalComments(prev => ({ ...prev, [commentKey]: nextComment }));
                                if (onSaveMasterComment) onSaveMasterComment(commentKey, nextComment);
                                toast.success("좌측 붉은색 마스터 코멘트 공간에 복사되었습니다!");
                              }}
                              className="px-2.5 py-1 rounded-lg bg-red-500/25 hover:bg-red-500/40 border border-red-400/40 text-red-200 text-[10px] font-black transition-all"
                            >
                              ← 붉은 코멘트에 추가
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(draft);
                                toast.success("다듬어진 문장이 클립보드에 복사되었습니다.");
                              }}
                              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-white/80 text-[10px] font-bold flex items-center gap-1"
                            >
                              <Copy size={10} /> 복사
                            </button>
                            {studioFieldId && onApplyAiToField && (
                              <button
                                type="button"
                                onClick={() => {
                                  onApplyAiToField(studioFieldId, draft);
                                  toast.success("설문 답변에 AI 다듬기 문장이 즉시 반영되었습니다!");
                                }}
                                className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-[#031C13] text-[10px] font-black transition-all"
                              >
                                설문 답변에 적용
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 min-h-[115px] flex flex-col items-center justify-center text-center p-4 rounded-xl bg-black/25 border border-dashed border-amber-400/25 space-y-2">
                    <p className="text-xs font-bold text-amber-200/80">
                      우측 상단의 <strong className="text-amber-300">[✨ AI 다듬기]</strong> 버튼을 클릭하시면
                    </p>
                    <p className="text-[11px] text-white/55 leading-relaxed">
                      좌측 <strong>붉은색 마스터 코멘트 공간</strong> 바로 옆 이 자리에 AI 문제점 진단과 3가지 다듬기 초안이 즉시 표시됩니다.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const partHeader = (partNo: number, title: string, subtitle: string, IconComp: any) => (
    <div className="px-6 py-4 bg-gradient-to-r from-[#0A3526] via-[#082B1E] to-[#062117] border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-300">
          <IconComp size={20} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">PART 0{partNo}</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black">
              작성률 {partPcts[partNo - 1] ?? 0}%
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-[#F5F2EB]">{title}</h3>
        </div>
      </div>

      {onEditPart && (
        <button
          type="button"
          onClick={() => onEditPart(partNo)}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-amber-400 hover:text-[#031C13] text-[#F5F2EB] text-xs font-black flex items-center gap-1.5 transition-all border border-white/10"
        >
          <Edit3 size={13} /> Part {partNo} 수정하러 가기
        </button>
      )}
    </div>
  );

  const safetyCheckedList = SAFETY_ITEMS.filter(item => data?.ch6?.safetyItems?.[item]);
  const safetyUncheckedList = SAFETY_ITEMS.filter(item => !data?.ch6?.safetyItems?.[item]);

  return (
    <div className="space-y-8 print:bg-white print:text-black">
      {/* ─── 상단 종합 요약 배너 & 필터 바 ─────────────────────────────────── */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#0A3526] via-[#07261B] to-[#051F15] border border-amber-400/35 shadow-2xl space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-amber-400 text-[#031C13] text-[10px] font-black uppercase tracking-widest">
                FULL SURVEY SHEET VIEW
              </span>
              {submitted ? (
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black flex items-center gap-1">
                  <CheckCircle2 size={13} /> 최종 제출 완료됨
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black flex items-center gap-1">
                  <AlertCircle size={13} /> 임시저장 / 작성 진행 중 ({totalPct}%)
                </span>
              )}
              {updatedAt && (
                <span className="text-xs text-white/50 font-medium">
                  최근 저장: {new Date(updatedAt).toLocaleString("ko-KR")}
                </span>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#F5F2EB] tracking-tight">
              {data.ch1.clinic || "한의원명 미입력"} — {data.ch1.name || userName || "원장"}님 설문지 전체 확인
            </h2>
            {userEmail && <p className="text-xs text-emerald-300/70 mt-1">계정: {userEmail}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 print:hidden">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-[#F5F2EB] text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Printer size={14} className="text-amber-300" /> 인쇄 / PDF 저장
            </button>
            {onEditPart && (
              <button
                type="button"
                onClick={() => onEditPart(1)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-[#031C13] text-xs font-black flex items-center gap-1.5 shadow-lg hover:brightness-105 transition-all"
              >
                <Edit3 size={14} /> 설문 입력·수정 모드로 전환
              </button>
            )}
          </div>
        </div>

        {/* 파트별 진행률 미니 대시보드 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            "Part 1. 브랜딩",
            "Part 2. 공간·동선",
            "Part 3. 임상루틴",
            "Part 4. 재무목표",
            "Part 5. 조직문화",
            "Part 6. 안전·마케팅",
          ].map((label, i) => {
            const pct = partPcts[i] ?? 0;
            return (
              <button
                key={i}
                type="button"
                onClick={() => {
                  const el = document.getElementById(`full-part-${i + 1}`);
                  el?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="p-3.5 rounded-2xl bg-[#041810]/80 hover:bg-[#041810] border border-white/10 hover:border-amber-400/40 text-left transition-all"
              >
                <p className="text-[11px] font-bold text-white/60 truncate">{label}</p>
                <div className="flex items-end justify-between mt-1.5">
                  <span className={`text-lg font-black ${pct >= 80 ? "text-emerald-400" : pct > 0 ? "text-amber-300" : "text-white/30"}`}>
                    {pct}%
                  </span>
                  <span className="text-[10px] text-amber-300/70">이동 →</span>
                </div>
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-gradient-to-r from-emerald-400 to-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </button>
            );
          })}
        </div>

        {/* 필터 스위치 바 */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 print:hidden">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
            <Filter size={14} /> 문항 표시 필터:
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "all", label: "전체 문항 모두 보기 (STEP 01~51)" },
              { id: "filled", label: `작성 완료된 항목만 보기` },
              { id: "empty", label: `미작성 항목만 모아보기` },
              { id: "files", label: `첨부파일 모아보기 (${totalFileCount}개)` },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterMode(tab.id as FilterMode)}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                  filterMode === tab.id
                    ? "bg-amber-400 text-[#031C13] shadow-md"
                    : "bg-[#041810] text-white/70 hover:text-white border border-white/10"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── 첨부파일 전용 뷰 모드일 때 ─────────────────────────────────────── */}
      {filterMode === "files" && (
        <div className="bg-[#07261B] rounded-3xl border border-amber-400/30 p-7 space-y-6">
          <div className="flex items-center gap-2.5">
            <FolderOpen className="text-amber-400" size={22} />
            <h3 className="text-lg font-black text-[#F5F2EB]">업로드된 첨부파일 전체 모아보기 (총 {totalFileCount}개)</h3>
          </div>
          {allUploadedFiles.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#041810] border border-dashed border-white/10 text-white/40 font-bold text-sm">
              업로드된 첨부파일이 없습니다.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allUploadedFiles.map((group, idx) => (
                <div key={idx} className="p-5 rounded-2xl bg-[#041810] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-amber-400/15 text-amber-300 text-[10px] font-black">
                      Part {group.part} • {group.step}
                    </span>
                    <span className="text-xs font-bold text-emerald-300">{group.urls.length}개 파일</span>
                  </div>
                  <p className="text-sm font-black text-[#F5F2EB]">{group.category}</p>
                  <div className="space-y-2">
                    {group.urls.map((u, uidx) => (
                      <a
                        key={uidx}
                        href={u}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-amber-400/15 border border-white/10 hover:border-amber-400/40 text-xs font-bold text-[#F5F2EB] transition-all"
                      >
                        <span className="flex items-center gap-2">
                          <FileText size={14} className="text-amber-400" /> 파일 {uidx + 1} 열람/다운로드
                        </span>
                        <Download size={14} className="text-amber-400" />
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── PART 1: 원장님 브랜딩 & 경영 철학 ─────────────────────────────── */}
      <div id="full-part-1" className="bg-[#07261B] rounded-3xl border border-white/10 overflow-hidden shadow-xl scroll-mt-32">
        {partHeader(1, "Part 1. 원장님 브랜딩 & 경영 철학 (STEP 01 ~ 09)", "Who You Are", User)}
        <div className="p-6 space-y-4">
          {renderQuestionRow({
            step: "01",
            label: "원장님 성함 / 한의원명 / 학위 및 전문과목",
            value:
              hasText(data.ch1.name) || hasText(data.ch1.clinic) || hasText(data.ch1.degree)
                ? `• 성함: ${data.ch1.name || "미입력"}\n• 한의원명: ${data.ch1.clinic || "미입력"}\n• 학위/전문과목: ${data.ch1.degree || "미입력"}`
                : "",
            partNumber: 1,
          })}
          {renderQuestionRow({
            step: "02",
            legacyQ: "Q1",
            label: "상세 이력 및 프로필",
            value: data.ch1.intro,
            partNumber: 1,
            studioFieldId: "ch1.intro",
          })}
          {renderQuestionRow({
            step: "03",
            legacyQ: "Q3-1",
            label: "원장님의 MBTI 성향",
            value: data.ch1.mbti,
            partNumber: 1,
          })}
          {renderQuestionRow({
            step: "04",
            legacyQ: "Q9",
            label: "우리 병원만의 실제 자랑거리",
            value: data.ch1.clinicPride,
            partNumber: 1,
            studioFieldId: "ch1.clinicPride",
          })}
          {renderQuestionRow({
            step: "05",
            legacyQ: "Q45",
            label: "꿈꾸는 리더상",
            value: data.ch1.desiredLeader,
            partNumber: 1,
            studioFieldId: "ch1.desiredLeader",
          })}
          {renderQuestionRow({
            step: "06",
            legacyQ: "Q44",
            label: "현재 직원 관리 철학 및 방식",
            value: data.ch1.philosophy,
            partNumber: 1,
            studioFieldId: "ch1.philosophy",
          })}
          {renderQuestionRow({
            step: "07",
            legacyQ: "Q2",
            label: "앞으로의 비전 / 미션 / 목표",
            value: data.ch1.vision,
            partNumber: 1,
            studioFieldId: "ch1.vision",
          })}
          {renderQuestionRow({
            step: "08",
            legacyQ: "Q3-2",
            label: "반드시 실행되어야 할 변화",
            value: data.ch1.actionStep,
            partNumber: 1,
            studioFieldId: "ch1.actionStep",
          })}
          {renderQuestionRow({
            step: "09",
            legacyQ: "Q4",
            label: "현재 가장 부족한 점 및 원인 (핵심 고민)",
            value: data.ch1.weakness,
            partNumber: 1,
            studioFieldId: "ch1.weakness",
          })}
        </div>
      </div>

      {/* ─── PART 2: 공간 입지 & 환자 경험 여정 ────────────────────────────── */}
      <div id="full-part-2" className="bg-[#07261B] rounded-3xl border border-white/10 overflow-hidden shadow-xl scroll-mt-32">
        {partHeader(2, "Part 2. 공간 입지 & 환자 경험 여정 (STEP 10 ~ 19)", "Clinic UX & Journey", Stethoscope)}
        <div className="p-6 space-y-4">
          {renderQuestionRow({
            step: "10",
            legacyQ: "Q30",
            label: "상세 주소 및 요일별 운영 시간",
            value: data.ch2.addressHours,
            partNumber: 2,
            studioFieldId: "ch2.addressHours",
          })}
          {renderQuestionRow({
            step: "11",
            legacyQ: "Q42",
            label: "병원 실평수 · 베드 수 및 공간 구성 (진료실 / 상담실 / 검사실 / 원내약탕실 유무)",
            value: data.ch2.clinicSize,
            partNumber: 2,
            studioFieldId: "ch2.clinicSize",
          })}
          {renderQuestionRow({
            step: "12",
            legacyQ: "Q11",
            label: "전체 환자 내원 동선 리허설",
            value: data.ch2.patientFlow,
            partNumber: 2,
            studioFieldId: "ch2.patientFlow",
          })}
          {renderQuestionRow({
            step: "13",
            legacyQ: "Q12",
            label: "초진 환자 진단/상담 실제 멘트",
            value: data.ch2.consultScript,
            partNumber: 2,
            studioFieldId: "ch2.consultScript",
          })}
          {renderQuestionRow({
            step: "14",
            legacyQ: "Q15",
            label: "한약 상담 후 결제 유도 프로세스",
            value: data.ch2.herbConsultProcess,
            partNumber: 2,
            studioFieldId: "ch2.herbConsultProcess",
          })}
          {renderQuestionRow({
            step: "15",
            legacyQ: "Q5",
            label: "환자들이 우리 병원에 오는 이유",
            value: data.ch1.whyCome,
            partNumber: 2,
            studioFieldId: "ch1.whyCome",
          })}
          {renderQuestionRow({
            step: "16",
            legacyQ: "Q6",
            label: "환자들이 안 오거나 이탈하는 이유",
            value: data.ch1.whyLeave,
            partNumber: 2,
            studioFieldId: "ch1.whyLeave",
          })}
          {renderQuestionRow({
            step: "17",
            legacyQ: "Q31",
            label: "해피콜 운영 현황",
            value: data.ch2.happyCallSystem,
            partNumber: 2,
            studioFieldId: "ch2.happyCallSystem",
          })}
          {renderQuestionRow({
            step: "18",
            legacyQ: "Q32",
            label: "한약 복용법 안내 과정 및 안내문 파일",
            value: data.ch2.herbInstructions,
            files: data.ch2.herbInstructionsFile,
            partNumber: 2,
            studioFieldId: "ch2.herbInstructions",
          })}
          {renderQuestionRow({
            step: "19",
            legacyQ: "Q33",
            label: "한약 및 차트 관리 프로그램 종류",
            value: data.ch2.herbManagementSystem,
            partNumber: 2,
            studioFieldId: "ch2.herbManagementSystem",
          })}
        </div>
      </div>

      {/* ─── PART 3: 임상 루틴 & 처방 시스템 ───────────────────────────────── */}
      <div id="full-part-3" className="bg-[#07261B] rounded-3xl border border-white/10 overflow-hidden shadow-xl scroll-mt-32">
        {partHeader(3, "Part 3. 임상 루틴 & 처방 시스템 (STEP 20 ~ 29)", "Clinical SOP", ClipboardList)}
        <div className="p-6 space-y-4">
          {renderQuestionRow({
            step: "20",
            legacyQ: "Q8",
            label: "치료와 경영의 정의",
            value: data.ch3.treatmentDefinition,
            partNumber: 3,
            studioFieldId: "ch3.treatmentDefinition",
          })}
          {renderQuestionRow({
            step: "21",
            legacyQ: "Q7",
            label: "보유 물리치료 및 검사 기기 상세",
            value: data.ch3.equipmentDetail,
            partNumber: 3,
            studioFieldId: "ch3.equipmentDetail",
          })}
          {renderQuestionRow({
            step: "22",
            legacyQ: "Q10",
            label: "환자 다빈도 Q&A 리스트 현황 및 매뉴얼 파일",
            value: data.ch3.patientQna,
            files: data.ch3.patientQnaFile,
            partNumber: 3,
            studioFieldId: "ch3.patientQna",
          })}
          {renderQuestionRow({
            step: "23",
            legacyQ: "Q13",
            label: "질환별 표준 치료 계획 유무 및 현황",
            value: data.ch3.diseasePlans,
            partNumber: 3,
            studioFieldId: "ch3.diseasePlans",
          })}
          {renderQuestionRow({
            step: "24",
            legacyQ: "Q14",
            label: "근골격계 상담 실제 예시",
            value: data.ch3.mskExample,
            partNumber: 3,
            studioFieldId: "ch3.mskExample",
          })}
          {renderQuestionRow({
            step: "25",
            legacyQ: "Q16",
            label: "대표 질환 3종 실제 차팅 & 처치 사례",
            value: data.ch3.charting?.some(c => hasText(c.case1) || hasText(c.case2) || hasText(c.case3)) ? (
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-xs">
                  <thead className="bg-white/5 text-amber-300 font-black border-b border-white/10">
                    <tr>
                      <th className="p-3 text-left">질환명</th>
                      <th className="p-3 text-left">침 / 전침</th>
                      <th className="p-3 text-left">부항 / 뜸</th>
                      <th className="p-3 text-left">물리치료 / 약침 / 기타</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.ch3.charting.map((r, i) => (
                      <tr key={i} className="border-b border-white/5 last:border-none">
                        <td className="p-3 font-bold text-emerald-300">{r.disease || `질환 ${i + 1}`}</td>
                        <td className="p-3 text-[#F5F2EB]/90 whitespace-pre-wrap">{r.case1 || "-"}</td>
                        <td className="p-3 text-[#F5F2EB]/90 whitespace-pre-wrap">{r.case2 || "-"}</td>
                        <td className="p-3 text-[#F5F2EB]/90 whitespace-pre-wrap">{r.case3 || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : "",
            partNumber: 3,
          })}
          {renderQuestionRow({
            step: "26",
            legacyQ: "Q17",
            label: "질환별 루틴 청구법",
            value: data.ch3.billingRoutine,
            partNumber: 3,
            studioFieldId: "ch3.billingRoutine",
          })}
          {renderQuestionRow({
            step: "27",
            legacyQ: "Q18",
            label: "추나 치료 루틴 (전/후 과정)",
            value: data.ch3.chunaRoutine,
            partNumber: 3,
            studioFieldId: "ch3.chunaRoutine",
          })}
          {renderQuestionRow({
            step: "28",
            legacyQ: "Q19",
            label: "한약 치료 필요성 실제 설명 멘트",
            value: data.ch3.herbRecommendation,
            partNumber: 3,
            studioFieldId: "ch3.herbRecommendation",
          })}
          {renderQuestionRow({
            step: "29",
            legacyQ: "Q21",
            label: "약침 권유 및 효능 설명 루틴",
            value: data.ch3.acupointRecommendation,
            partNumber: 3,
            studioFieldId: "ch3.acupointRecommendation",
          })}
        </div>
      </div>

      {/* ─── PART 4: 경영 지표 & 재무 투자 ─────────────────────────────────── */}
      <div id="full-part-4" className="bg-[#07261B] rounded-3xl border border-white/10 overflow-hidden shadow-xl scroll-mt-32">
        {partHeader(4, "Part 4. 경영 지표 & 재무 투자 (STEP 30 ~ 37)", "Numbers & Goals", BarChart3)}
        <div className="p-6 space-y-4">
          {renderQuestionRow({
            step: "30",
            legacyQ: "Q22",
            label: "희망 경영 목표 수치 (5대 KPI)",
            value:
              hasText(data.ch4.targetMetrics.revenue) ||
              hasText(data.ch4.targetMetrics.profit) ||
              hasText(data.ch4.targetMetrics.nonBenefit) ||
              hasText(data.ch4.targetMetrics.autoInsurance) ||
              hasText(data.ch4.targetMetrics.dailyPatients)
                ? `• 월 총매출 목표: ${data.ch4.targetMetrics.revenue || "미입력"}\n• 월 순이익 목표: ${data.ch4.targetMetrics.profit || "미입력"}\n• 비급여 매출 목표: ${data.ch4.targetMetrics.nonBenefit || "미입력"}\n• 자동차보험 목표: ${data.ch4.targetMetrics.autoInsurance || "미입력"}\n• 일평균 환자 수 목표: ${data.ch4.targetMetrics.dailyPatients || "미입력"}`
                : "",
            partNumber: 4,
          })}
          {renderQuestionRow({
            step: "31",
            legacyQ: "Q26",
            label: "희망 진료 일수/시간",
            value: data.ch4.workingDays,
            partNumber: 4,
            studioFieldId: "ch4.workingDays",
          })}
          {renderQuestionRow({
            step: "32",
            legacyQ: "Q23",
            label: "순이익 배분 및 사용 계획",
            value: data.ch4.profitUsage,
            partNumber: 4,
            studioFieldId: "ch4.profitUsage",
          })}
          {renderQuestionRow({
            step: "33",
            legacyQ: "Q28",
            label: "개설 투자금 및 회수/대출 현황",
            value: data.ch4.investmentHistory,
            partNumber: 4,
            studioFieldId: "ch4.investmentHistory",
          })}
          {renderQuestionRow({
            step: "34",
            legacyQ: "Q24",
            label: "월간 추가 성장 투자 의사",
            value: data.ch4.growthInvestment,
            partNumber: 4,
            studioFieldId: "ch4.growthInvestment",
          })}
          {renderQuestionRow({
            step: "35",
            legacyQ: "Q25",
            label: "즉시 투입 가능 여유 자금",
            value: data.ch4.immediateInvestment,
            partNumber: 4,
            studioFieldId: "ch4.immediateInvestment",
          })}
          {renderQuestionRow({
            step: "36",
            legacyQ: "Q27",
            label: "원내 관찰 지표 및 관리 방법 (+양식 파일)",
            value: data.ch4.indicators,
            files: data.ch4.indicatorsFile,
            partNumber: 4,
            studioFieldId: "ch4.indicators",
          })}
          {renderQuestionRow({
            step: "36-C",
            legacyQ: "Q27-2",
            label: "차트 프로그램 최근 2년 월별 매출·초진·재진·청구·본부금·비급여·자보 엑셀 업로드 (현재 진료하는 달 제외)",
            value:
              (data.ch4.chartRevenueFiles?.length || 0) > 0
                ? `최근 2년(당월 제외) 차트 통계 엑셀 파일 총 ${data.ch4.chartRevenueFiles.length}개가 업로드되었습니다.\n(필수 포함 항목: 월 매출 · 초진 · 재진 · 청구 · 본부금 · 비급여 · 자보 매출)`
                : "",
            files: data.ch4.chartRevenueFiles,
            partNumber: 4,
          })}
          {(() => {
            const { totalManWon, filledCount } = calculateTotalMonthlyExpense(data.ch4.expenses);
            const totalWon = Math.round(totalManWon * 10000);
            const annualManWon = Math.round(totalManWon * 12);
            return renderQuestionRow({
              step: "37",
              legacyQ: "Q29",
              label: `월평균 경비 지출 내역 상세 (월 총 경비 자동합산: 총 ${totalManWon.toLocaleString()}만 원 / 월)`,
              value: data.ch4.expenses?.some(e => hasText(e.amount)) ? (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-amber-400/15 border border-amber-400/40 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-black text-amber-300">
                        📊 모든 경비 자동합산 월 총 경비 ({filledCount}개 항목 합산)
                      </p>
                      <p className="text-[11px] text-emerald-200/80 mt-0.5">
                        원화 환산 약 {totalWon.toLocaleString()}원 / 월 · 연간 환산 약 {annualManWon.toLocaleString()}만 원 / 년
                      </p>
                    </div>
                    <span className="text-lg sm:text-xl font-black text-amber-300">
                      총 {totalManWon.toLocaleString()}만 원 / 월
                    </span>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-white/10">
                    <table className="w-full text-xs">
                      <thead className="bg-white/5 text-amber-300 font-black border-b border-white/10">
                        <tr>
                          <th className="p-3 text-left">경비 항목</th>
                          <th className="p-3 text-right">월 평균 금액 (만 원)</th>
                          <th className="p-3 text-right">비중</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.ch4.expenses.map((r, i) => {
                          const amt = parseExpenseManWon(r.amount);
                          const pct = totalManWon > 0 && amt > 0 ? Math.round((amt / totalManWon) * 1000) / 10 : 0;
                          return (
                            <tr key={i} className="border-b border-white/5 last:border-none">
                              <td className="p-3 font-bold text-[#F5F2EB]">{r.item || "-"}</td>
                              <td className="p-3 text-right text-emerald-300 font-bold">
                                {amt > 0 ? `${amt.toLocaleString()}만 원` : r.amount || "-"}
                              </td>
                              <td className="p-3 text-right text-amber-300/80 font-bold">
                                {amt > 0 ? `${pct}%` : "-"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-amber-400/10 border-t border-amber-400/30 font-black text-amber-300">
                        <tr>
                          <td className="p-3">월 총 경비 합계 (자동합산)</td>
                          <td className="p-3 text-right text-sm">{totalManWon.toLocaleString()}만 원 / 월</td>
                          <td className="p-3 text-right">100%</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ) : "",
              partNumber: 4,
            });
          })()}
        </div>
      </div>

      {/* ─── PART 5: 조직 문화 & 팀 빌딩 ───────────────────────────────────── */}
      <div id="full-part-5" className="bg-[#07261B] rounded-3xl border border-white/10 overflow-hidden shadow-xl scroll-mt-32">
        {partHeader(5, "Part 5. 조직 문화 & 팀 빌딩 (STEP 38 ~ 47)", "People & Culture", Users)}
        <div className="p-6 space-y-4">
          {renderQuestionRow({
            step: "38",
            legacyQ: "Q34",
            label: "상세 직원 처우 리스트",
            value: data.ch5.staff?.some(s => hasText(s.salary) || hasText(s.days) || hasText(s.hours)) ? (
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-xs">
                  <thead className="bg-white/5 text-amber-300 font-black border-b border-white/10">
                    <tr>
                      <th className="p-3 text-left">직책/담당</th>
                      <th className="p-3 text-left">월 급여(만 원)</th>
                      <th className="p-3 text-left">근무일</th>
                      <th className="p-3 text-left">근무시간</th>
                      <th className="p-3 text-left">인센티브</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.ch5.staff.map((r, i) => (
                      <tr key={i} className="border-b border-white/5 last:border-none">
                        <td className="p-3 font-bold text-emerald-300">{r.role || "-"}</td>
                        <td className="p-3 text-[#F5F2EB]">{r.salary || "-"}</td>
                        <td className="p-3 text-[#F5F2EB]">{r.days || "-"}</td>
                        <td className="p-3 text-[#F5F2EB]">{r.hours || "-"}</td>
                        <td className="p-3 text-[#F5F2EB]">{r.incentive || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : "",
            partNumber: 5,
          })}
          {renderQuestionRow({
            step: "39",
            legacyQ: "Q43",
            label: "파트별 현재 근무 인원수",
            value:
              hasText(data.ch5.staffCounts.desk) ||
              hasText(data.ch5.staffCounts.treatment) ||
              hasText(data.ch5.staffCounts.decoction) ||
              hasText(data.ch5.staffCounts.other)
                ? `• 데스크/상담: ${data.ch5.staffCounts.desk || "0"}명 / • 치료실: ${data.ch5.staffCounts.treatment || "0"}명 / • 탕전실: ${data.ch5.staffCounts.decoction || "0"}명 / • 기타: ${data.ch5.staffCounts.other || "0"}명`
                : "",
            partNumber: 5,
          })}
          {renderQuestionRow({
            step: "40",
            legacyQ: "Q35~38",
            label: "식사 및 간식 문화 현황",
            value:
              hasText(data.ch5.mealSnack.lunch) ||
              hasText(data.ch5.mealSnack.nightMeal) ||
              hasText(data.ch5.mealSnack.snack) ||
              hasText(data.ch5.mealSnack.eatTogether)
                ? `• 점심식사: ${data.ch5.mealSnack.lunch || "미입력"}\n• 야간식사: ${data.ch5.mealSnack.nightMeal || "미입력"}\n• 간식제공: ${data.ch5.mealSnack.snack || "미입력"}\n• 원장과 식사 여부: ${data.ch5.mealSnack.eatTogether || "미입력"}`
                : "",
            partNumber: 5,
          })}
          {renderQuestionRow({
            step: "41",
            legacyQ: "Q39~40",
            label: "현재 복지 혜택 상세",
            value: data.ch5.welfare,
            partNumber: 5,
            studioFieldId: "ch5.welfare",
          })}
          {renderQuestionRow({
            step: "42",
            legacyQ: "Q41",
            label: "직원 본인 및 지인 할인 혜택",
            value: data.ch5.staffDiscount,
            partNumber: 5,
            studioFieldId: "ch5.staffDiscount",
          })}
          {renderQuestionRow({
            step: "43",
            legacyQ: "Q46",
            label: "함께 일하고 싶은 인재상",
            value: data.ch5.idealStaff,
            partNumber: 5,
            studioFieldId: "ch5.idealStaff",
          })}
          {renderQuestionRow({
            step: "44",
            legacyQ: "Q47",
            label: "직책별 역할 기대치 & 면담 주기",
            value:
              hasText(data.ch5.expectations.manager) ||
              hasText(data.ch5.expectations.regular) ||
              hasText(data.ch5.expectations.communication)
                ? `• 중간관리자(실장) 기대역할: ${data.ch5.expectations.manager || "미입력"}\n• 일반 직원 기대역할: ${data.ch5.expectations.regular || "미입력"}\n• 면담/소통 주기: ${data.ch5.expectations.communication || "미입력"}`
                : "",
            partNumber: 5,
          })}
          {renderQuestionRow({
            step: "45",
            legacyQ: "Q48~49",
            label: "원내 메신저 소통 체계 및 증빙 자료",
            value:
              hasText(data.ch5.chatSystem.program) || hasText(data.ch5.chatSystem.channels)
                ? `• 주 사용 메신저: ${data.ch5.chatSystem.program || "미입력"}\n• 채팅방 구분 및 목적: ${data.ch5.chatSystem.channels || "미입력"}`
                : "",
            files: [
              data.ch5.chatSystem.capture1 || "",
              data.ch5.chatSystem.capture2 || "",
              data.ch5.chatSystem.guideFile || "",
              ...(data.ch5.chatSystem.files || []),
            ],
            partNumber: 5,
          })}
          {renderQuestionRow({
            step: "46",
            legacyQ: "Q50",
            label: "원내 교육 및 회의 주기/방식",
            value: data.ch5.eduMeeting,
            partNumber: 5,
            studioFieldId: "ch5.eduMeeting",
          })}
          {renderQuestionRow({
            step: "47",
            legacyQ: "Q51",
            label: "원내 보유 교육 자료 첨부",
            value: data.ch5.eduMaterials?.some(Boolean) ? "첨부된 교육 자료가 있습니다." : "",
            files: data.ch5.eduMaterials,
            partNumber: 5,
          })}
        </div>
      </div>

      {/* ─── PART 6: 안전 리스크 & 마케팅 비전 ─────────────────────────────── */}
      <div id="full-part-6" className="bg-[#07261B] rounded-3xl border border-white/10 overflow-hidden shadow-xl scroll-mt-32">
        {partHeader(6, "Part 6. 안전 리스크 & 마케팅 비전 (STEP 48 ~ 51)", "Safety & Marketing", Shield)}
        <div className="p-6 space-y-4">
          {renderQuestionRow({
            step: "48",
            legacyQ: "Q52",
            label: `원내 18대 안전·보안·비상 대응 체크리스트 (보유 ${safetyCheckedList.length} / 18개)`,
            value:
              safetyCheckedList.length > 0 ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-bold text-emerald-300 mb-1.5">✓ 보유 완료 항목 ({safetyCheckedList.length}개)</p>
                    <div className="flex flex-wrap gap-1.5">
                      {safetyCheckedList.map(k => (
                        <span key={k} className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 text-xs font-bold">
                          ✓ {k}
                        </span>
                      ))}
                    </div>
                  </div>
                  {safetyUncheckedList.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-rose-300/80 mb-1.5">• 미비 항목 ({safetyUncheckedList.length}개)</p>
                      <div className="flex flex-wrap gap-1.5">
                        {safetyUncheckedList.map(k => (
                          <span key={k} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/45 text-xs">
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : "",
            partNumber: 6,
          })}
          {renderQuestionRow({
            step: "49",
            legacyQ: "Q53",
            label: "마케팅 채널 현황 · 월 지출 비용 · 목표 KPI",
            value:
              hasText(data.ch6.marketingStatus.channels) ||
              hasText(data.ch6.marketingStatus.cost) ||
              hasText(data.ch6.marketingStatus.goal)
                ? `• 운영 채널: ${data.ch6.marketingStatus.channels || "미입력"}\n• 월 마케팅 지출액: ${data.ch6.marketingStatus.cost || "미입력"}\n• 마케팅 목표(KPI): ${data.ch6.marketingStatus.goal || "미입력"}`
                : "",
            partNumber: 6,
          })}
          {renderQuestionRow({
            step: "50",
            legacyQ: "Q54",
            label: "원내 비치 홍보물 현황 및 실제 비치 사진",
            value: data.ch6.promoMaterials,
            files: data.ch6.promoPhotos,
            partNumber: 6,
            studioFieldId: "ch6.promoMaterials",
          })}
          {renderQuestionRow({
            step: "51",
            legacyQ: "Final",
            label: "내가 꿈꾸는 경영 명인의 자화상 (컨설팅 최종 목표)",
            value: data.ch6.finalGoal,
            partNumber: 6,
            studioFieldId: "ch6.finalGoal",
          })}
        </div>
      </div>
    </div>
  );
}
