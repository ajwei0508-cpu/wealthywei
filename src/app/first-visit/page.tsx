"use client";

import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import FirstVisitAiReportView from "@/components/first-visit/FirstVisitAiReportView";
import {
  FirstVisitRow,
  FirstVisitWorkspace,
  MasterMemberSummary,
  SHEET_COLUMNS,
  SheetColumnKey,
  UploadHistoryLog,
} from "@/types/firstVisit";
import {
  extractRawTableFromArrayBuffer,
  convertRawTableToEvents,
  mergeParsedEventsIntoRows,
  computeMissingDataReport,
  computeFirstVisitAnalytics,
  exportFirstVisitWorkbookXlsx,
  parseAnyDateToISO,
  formatISOToKoreanMD,
  AiColumnMappingHint,
} from "@/lib/firstVisitEngine";
import {
  Upload,
  Sparkles,
  Save,
  Download,
  Plus,
  Trash2,
  Search,
  AlertTriangle,
  ShieldCheck,
  Crown,
  FileSpreadsheet,
  History,
  CheckCircle2,
  Filter,
  ChevronDown,
  ChevronUp,
  Lock,
  Building2,
  Calendar,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

function FirstVisitSystemContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const masterEmail = (process.env.NEXT_PUBLIC_MASTER_EMAIL || "wei0508@naver.com").toLowerCase();
  const loggedInEmail = session?.user?.email?.toLowerCase() || "";
  const isMaster = loggedInEmail === masterEmail;

  const userStatus = (session?.user as any)?.approvalStatus || "pending";
  const approvedCategories: string[] = (session?.user as any)?.approvedCategories || [];
  const userCategory = (session?.user as any)?.approvedCategory || "";
  const userRole = (session?.user as any)?.role || "director";

  const isConsultingApproved =
    userStatus === "approved" &&
    (approvedCategories.includes("consulting") ||
      approvedCategories.includes("바른컨설팅") ||
      userCategory === "consulting" ||
      userCategory === "바른컨설팅");

  const viewAsParam = searchParams.get("viewAs")?.toLowerCase().trim() || "";
  const activeTargetEmail = isMaster && viewAsParam ? viewAsParam : loggedInEmail;

  // Data States
  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState<FirstVisitWorkspace | null>(null);
  const [rows, setRows] = useState<FirstVisitRow[]>([]);
  const [uploadLogs, setUploadLogs] = useState<UploadHistoryLog[]>([]);
  const [memberWorkspaces, setMemberWorkspaces] = useState<MasterMemberSummary[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Action States
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // UI & Filter States
  const [activeTab, setActiveTab] = useState<"sheet" | "report" | "history">("sheet");
  const [fallbackDateInput, setFallbackDateInput] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [visitTypeFilter, setVisitTypeFilter] = useState<string>("all");
  const [missingColFilter, setMissingColFilter] = useState<SheetColumnKey | "any_core" | "none">("none");
  const [isGuideExpanded, setIsGuideExpanded] = useState(true);
  const [isMasterPanelOpen, setIsMasterPanelOpen] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Workspace
  const fetchWorkspace = async (targetEmail?: string) => {
    setLoading(true);
    try {
      const q =
        isMaster && targetEmail && targetEmail !== loggedInEmail
          ? `?viewAs=${encodeURIComponent(targetEmail)}`
          : "";
      const res = await fetch(`/api/first-visit${q}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "초진 데이터를 불러올 수 없습니다.");
      }
      const data = await res.json();
      setWorkspace(data.workspace);
      setRows(data.workspace?.rows || []);
      setUploadLogs(data.workspace?.uploadLogs || []);
      if (Array.isArray(data.memberWorkspaces)) {
        setMemberWorkspaces(data.memberWorkspaces);
      }
      setHasUnsavedChanges(false);
    } catch (err: any) {
      toast.error(err.message || "데이터 조회 실패");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
      return;
    }
    if (status === "authenticated") {
      if (userRole === "staff" || (!isConsultingApproved && !isMaster)) {
        setLoading(false);
        return;
      }
      fetchWorkspace(activeTargetEmail);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, activeTargetEmail, isMaster, isConsultingApproved, userRole]);

  // Derived Analytics & Missing Data Report
  const missingReport = useMemo(() => computeMissingDataReport(rows), [rows]);
  const analytics = useMemo(() => computeFirstVisitAnalytics(rows), [rows]);

  const availableMonths = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => {
      const iso = r.visitDateISO || r.firstVisitISO;
      if (iso && iso.length >= 7) s.add(iso.slice(0, 7));
    });
    return Array.from(s).sort();
  }, [rows]);

  // Filtered Rows
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (selectedMonth !== "all") {
        const iso = r.visitDateISO || r.firstVisitISO;
        if (!iso || !iso.startsWith(selectedMonth)) return false;
      }
      if (visitTypeFilter !== "all") {
        if (visitTypeFilter === "blank") {
          if (r.visitType.trim() !== "") return false;
        } else if (r.visitType !== visitTypeFilter) {
          return false;
        }
      }
      if (missingColFilter !== "none") {
        if (missingColFilter === "any_core") {
          const coreKeys: SheetColumnKey[] = [
            "age",
            "visitType",
            "insuranceType",
            "treatmentDetail",
            "nextReservation",
            "visitRoute",
          ];
          if (!coreKeys.some((k) => !String(r[k] || "").trim())) return false;
        } else {
          if (String(r[missingColFilter] || "").trim() !== "") return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const hay = `${r.patientName} ${r.treatmentDetail} ${r.visitRoute} ${r.nonCoveredList} ${r.insuranceType} ${r.visitDate}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, selectedMonth, visitTypeFilter, missingColFilter, searchQuery]);

  const buildQuerySuffix = () =>
    isMaster && activeTargetEmail && activeTargetEmail !== loggedInEmail
      ? `?viewAs=${encodeURIComponent(activeTargetEmail)}`
      : "";

  // Save Workspace Handler
  const handleSaveWorkspace = async (
    customRows?: FirstVisitRow[],
    customLogs?: UploadHistoryLog[],
    customEmr?: string,
    silent?: boolean
  ) => {
    setIsSaving(true);
    try {
      const payloadRows = customRows ?? rows;
      const payloadLogs = customLogs ?? uploadLogs;
      const res = await fetch(`/api/first-visit${buildQuerySuffix()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: payloadRows,
          uploadLogs: payloadLogs,
          lastDetectedEmr: customEmr ?? workspace?.lastDetectedEmr,
          aiReport: workspace?.aiReport ?? null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "저장 실패");
      }
      const saved = await res.json();
      setWorkspace(saved.workspace);
      setHasUnsavedChanges(false);
      if (!silent) {
        toast.success("개인 전용 공간에 안전하게 저장되었습니다.");
      }
      if (isMaster) {
        // 마스터 요약 목록 새로고침
        const refreshRes = await fetch(`/api/first-visit${buildQuerySuffix()}`);
        if (refreshRes.ok) {
          const refreshJson = await refreshRes.json();
          if (Array.isArray(refreshJson.memberWorkspaces)) {
            setMemberWorkspaces(refreshJson.memberWorkspaces);
          }
        }
      }
      return saved.workspace as FirstVisitWorkspace;
    } catch (err: any) {
      toast.error(err.message || "저장 중 오류가 발생했습니다.");
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  // Trigger AI Report Generation
  const handleGenerateAiReport = async (overrideRows?: FirstVisitRow[]) => {
    const targetRows = overrideRows ?? rows;
    if (targetRows.length === 0) {
      toast.error("분석할 환자 데이터가 없습니다.");
      return;
    }
    setIsGeneratingAi(true);
    const toastId = toast.loading("AI가 초진·재내원 데이터와 공란 항목을 심층 분석 중입니다...");
    try {
      const res = await fetch(`/api/first-visit/analyze${buildQuerySuffix()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: targetRows }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "AI 분석 생성 실패");
      }
      const data = await res.json();
      setWorkspace((prev) =>
        prev
          ? { ...prev, rows: targetRows, aiReport: data.aiReport, updatedAt: new Date().toISOString() }
          : prev
      );
      setHasUnsavedChanges(false);
      toast.success("원장님 맞춤형 AI 심층 분석 리포트가 완성되었습니다!", { id: toastId });
    } catch (err: any) {
      toast.error(err.message || "AI 분석 실패", { id: toastId });
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Multi-File Upload & Smart EMR Parsing
  const processFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setIsUploading(true);
    const toastId = toast.loading(
      `${files.length}개 일일 환자 리스트의 차트 양식 및 단어를 AI로 정밀 분석 중입니다...`
    );

    try {
      // 파일명 기준 날짜순 정렬 (연속 일자 업로드 시 1회 -> 2회 -> 3회 자동 연결 정확도 극대화)
      const sortedFiles = [...files].sort((a, b) => a.name.localeCompare(b.name));

      let workingRows = [...rows];
      const newLogs: UploadHistoryLog[] = [];
      let totalAdded = 0;
      let totalRevisits = 0;
      let totalPureSkipped = 0;
      let lastEmr = workspace?.lastDetectedEmr || "";

      for (const file of sortedFiles) {
        const buf = await file.arrayBuffer();
        const extraction = extractRawTableFromArrayBuffer(buf, file.name);

        if (extraction.dataRows.length === 0) {
          toast.error(`${file.name}: 유효한 환자 행을 찾을 수 없습니다.`);
          continue;
        }

        let aiHint: AiColumnMappingHint = {};
        if (!extraction.isGoogleSheetTemplate) {
          try {
            const parseRes = await fetch("/api/first-visit/parse", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                headers: extraction.headers,
                sampleRows: extraction.dataRows.slice(0, 12),
              }),
            });
            if (parseRes.ok) {
              const parsedJson = await parseRes.json();
              aiHint = parsedJson.hint || {};
            }
          } catch {
            // 폴백: 내장 EMR 규칙 엔진 사용
          }
        }

        const converted = convertRawTableToEvents(
          extraction,
          fallbackDateInput || undefined,
          aiHint
        );

        const mergeResult = mergeParsedEventsIntoRows(
          workingRows,
          converted.events,
          converted.emrDetected,
          converted.unmappedColumns
        );

        workingRows = mergeResult.mergedRows;
        lastEmr = mergeResult.emrDetected;
        totalAdded += mergeResult.newPatientsAdded;
        totalRevisits += mergeResult.revisitsUpdated;
        totalPureSkipped += mergeResult.pureRevisitsSkipped;

        newLogs.unshift({
          id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          fileName: file.name,
          uploadedAt: new Date().toISOString(),
          emrDetected: mergeResult.emrDetected,
          newPatientsAdded: mergeResult.newPatientsAdded,
          revisitsUpdated: mergeResult.revisitsUpdated,
          pureRevisitsSkipped: mergeResult.pureRevisitsSkipped,
          unmappedColumns: mergeResult.unmappedColumns,
        });
      }

      const combinedLogs = [...newLogs, ...uploadLogs].slice(0, 100);
      setRows(workingRows);
      setUploadLogs(combinedLogs);
      setIsGuideExpanded(true);

      await handleSaveWorkspace(workingRows, combinedLogs, lastEmr, true);

      toast.success(
        `업로드 완료! 초진·재초진 ${totalAdded}명 정리 · 재내원(2·3회) ${totalRevisits}건 자동 반영${
          totalPureSkipped > 0 ? ` (일반 구환 재진 ${totalPureSkipped}명 자동 제외)` : ""
        }`,
        { id: toastId, duration: 5000 }
      );

      // 업로드 직후 AI 리포트도 자동 생성/최신화
      if (workingRows.length > 0) {
        await handleGenerateAiReport(workingRows);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "파일 분석 중 오류가 발생했습니다.", { id: toastId });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Inline Cell Edit
  const handleCellChange = (rowId: string, key: SheetColumnKey, value: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const next: FirstVisitRow = {
          ...r,
          [key]: value,
          updatedAt: new Date().toISOString(),
        };

        const refYear = r.visitDateISO
          ? Number(r.visitDateISO.slice(0, 4))
          : new Date().getFullYear();

        if (key === "visitDate") {
          const iso = parseAnyDateToISO(value, refYear);
          if (iso) next.visitDateISO = iso;
          else if (!value.trim()) next.visitDateISO = "";
        } else if (key === "firstVisitDate") {
          const iso = parseAnyDateToISO(value, refYear);
          if (iso) next.firstVisitISO = iso;
          else if (!value.trim()) next.firstVisitISO = "";
        } else if (key === "secondVisitDate") {
          const iso = parseAnyDateToISO(value, refYear);
          if (iso) next.secondVisitISO = iso;
          else if (!value.trim()) next.secondVisitISO = "";
        } else if (key === "thirdVisitDate") {
          const iso = parseAnyDateToISO(value, refYear);
          if (iso) next.thirdVisitISO = iso;
          else if (!value.trim()) next.thirdVisitISO = "";
        }

        return next;
      })
    );
    setHasUnsavedChanges(true);
  };

  // Add Manual Row
  const handleAddEmptyRow = () => {
    const todayISO = fallbackDateInput || new Date().toISOString().slice(0, 10);
    const todayLabel = formatISOToKoreanMD(todayISO);
    const newRow: FirstVisitRow = {
      id: `fv_manual_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      visitDate: todayLabel,
      visitDateISO: todayISO,
      patientName: "",
      age: "",
      visitType: "초진",
      insuranceType: "",
      treatmentDetail: "",
      nextReservation: "",
      firstVisitDate: todayLabel,
      firstVisitISO: todayISO,
      secondVisitDate: "",
      secondVisitISO: "",
      thirdVisitDate: "",
      thirdVisitISO: "",
      visitRoute: "",
      nonCoveredList: "",
      nonCoveredCount: "",
      immediatePaymentCount: "",
      herbalMonthlySummary: "",
      packageCount: "",
      herbalFollowupPayment: "",
      packageRenewal: "",
      delayedPaymentWithinMonth: "",
      sourceFile: "직접 입력",
      updatedAt: new Date().toISOString(),
    };
    setRows((prev) => [newRow, ...prev]);
    setHasUnsavedChanges(true);
    toast.success("새 환자 입력 행이 상단에 추가되었습니다.");
  };

  const handleDeleteRow = (rowId: string, name: string) => {
    if (!window.confirm(`'${name || "이름 미입력"}' 환자 행을 삭제하시겠습니까?`)) return;
    const updated = rows.filter((r) => r.id !== rowId);
    setRows(updated);
    setHasUnsavedChanges(true);
  };

  const handleResetAll = async () => {
    const ownerLabel = workspace?.clinicName || activeTargetEmail;
    if (
      !window.confirm(
        `정말로 [${ownerLabel}] 계정의 모든 초진 시트 데이터(${rows.length}건)와 AI 리포트를 초기화하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/first-visit${buildQuerySuffix()}`, { method: "DELETE" });
      if (!res.ok) throw new Error("초기화 실패");
      setRows([]);
      setUploadLogs([]);
      setWorkspace((prev) => (prev ? { ...prev, rows: [], uploadLogs: [], aiReport: null } : null));
      setHasUnsavedChanges(false);
      toast.success("초진 시스템 데이터가 모두 초기화되었습니다.");
      if (isMaster) fetchWorkspace(activeTargetEmail);
    } catch (err: any) {
      toast.error(err.message || "초기화 중 오류 발생");
    }
  };

  // Unauthorized View
  if (status === "authenticated" && !isMaster && (!isConsultingApproved || userRole === "staff")) {
    return (
      <DashboardLayout>
        <div className="min-h-[80vh] flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-3xl p-10 text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center mx-auto">
              <Lock size={30} />
            </div>
            <h2 className="text-2xl font-black text-white">바른컨설팅 회원 전용 시스템</h2>
            <p className="text-sm text-white/60 leading-relaxed">
              <strong>초진 시스템</strong>은 바른컨설팅 승인 원장님과 마스터만 이용하실 수 있습니다. 권한 문의는 마스터에게 요청해 주세요.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-[1680px] mx-auto px-6 lg:px-10 py-8 space-y-7 relative z-10">
        {/* 1. 마스터 전용 전체 회원 열람 스위처 (오직 마스터에게만 표시) */}
        {isMaster && (
          <div className="bg-gradient-to-r from-amber-500/15 via-emerald-950/90 to-amber-500/10 border border-amber-400/35 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                  <Crown size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-amber-300">
                      MASTER EXCLUSIVE CONTROL
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                      개인간 비공유 · 마스터 단독 전체 열람
                    </span>
                  </div>
                  <h2 className="text-base font-black text-white">
                    현재 열람 중인 계정:{" "}
                    <span className="text-amber-300">
                      {workspace?.clinicName || "마스터 본원"} ({workspace?.directorName || activeTargetEmail})
                    </span>
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {activeTargetEmail !== loggedInEmail && (
                  <button
                    type="button"
                    onClick={() => router.push("/first-visit")}
                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition cursor-pointer"
                  >
                    내(마스터) 시트로 돌아가기
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsMasterPanelOpen((p) => !p)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/30 text-amber-200 text-xs font-bold transition cursor-pointer"
                >
                  <span>원장님별 저장 목록 ({memberWorkspaces.length}곳)</span>
                  {isMasterPanelOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>
            </div>

            {isMasterPanelOpen && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-white/10 max-h-60 overflow-y-auto pr-1">
                {/* 마스터 본인 */}
                <button
                  type="button"
                  onClick={() => router.push("/first-visit")}
                  className={`text-left p-3.5 rounded-2xl border transition cursor-pointer ${
                    activeTargetEmail === loggedInEmail
                      ? "bg-amber-400/20 border-amber-400 text-white shadow-md"
                      : "bg-black/25 border-white/10 text-white/75 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black text-amber-300 flex items-center gap-1">
                      <Crown size={12} /> 마스터 본원
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10">
                      본인 계정
                    </span>
                  </div>
                  <p className="text-[11px] text-white/50 truncate">{loggedInEmail}</p>
                </button>

                {memberWorkspaces
                  .filter((m) => m.ownerEmail !== loggedInEmail)
                  .map((m) => {
                    const isSelected = activeTargetEmail === m.ownerEmail;
                    return (
                      <button
                        key={m.ownerEmail}
                        type="button"
                        onClick={() =>
                          router.push(`/first-visit?viewAs=${encodeURIComponent(m.ownerEmail)}`)
                        }
                        className={`text-left p-3.5 rounded-2xl border transition cursor-pointer ${
                          isSelected
                            ? "bg-emerald-500/25 border-emerald-400 text-white shadow-md"
                            : "bg-black/25 border-white/10 text-white/75 hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-extrabold text-white truncate flex items-center gap-1.5">
                            <Building2 size={12} className="text-emerald-400 shrink-0" />
                            {m.clinicName}
                          </span>
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                              m.rowCount > 0
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : "bg-white/5 text-white/35"
                            }`}
                          >
                            {m.rowCount}명
                          </span>
                        </div>
                        <p className="text-[11px] text-white/60 truncate">
                          {m.directorName} 원장님 · {m.ownerEmail}
                        </p>
                        {m.rowCount > 0 && (
                          <p className="text-[10px] text-amber-300/90 font-semibold mt-1">
                            2차 {m.secondVisitRate}% · 3차 {m.thirdVisitRate}%
                          </p>
                        )}
                      </button>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* 2. 메인 타이틀 & 개인 보안 배지 & 저장/다운로드 액션바 */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-extrabold">
                <ShieldCheck size={14} />
                개인별 독립 암호화 저장 · 타 회원 비공개 (마스터만 열람 가능)
              </span>
              {workspace?.lastDetectedEmr && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-200 text-xs font-bold">
                  최근 인식 양식: {workspace.lastDetectedEmr}
                </span>
              )}
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              초진 시스템{" "}
              <span className="text-lg font-bold text-amber-300 ml-1">
                ({workspace?.clinicName || "내 한의원"})
              </span>
            </h1>
            <p className="text-sm text-white/55">
              어떤 차트 프로그램(한차트·오케이차트·한의사랑·동의보감·엑셀)이든 일일 환자 리스트를 올리시면{" "}
              <strong className="text-white/90">표준 19개 초진 시트</strong>로 자동 정리하고, 이후 내원 명부 업로드 시{" "}
              <strong className="text-amber-300">2회·3회 재내원일</strong>까지 자동 추적합니다.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleSaveWorkspace()}
              disabled={isSaving || loading}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black transition shadow-lg cursor-pointer active:scale-95 ${
                hasUnsavedChanges
                  ? "bg-amber-400 hover:bg-amber-300 text-[#031C13] ring-2 ring-amber-300/60 animate-pulse"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white"
              }`}
            >
              <Save size={15} />
              <span>
                {isSaving
                  ? "저장 중..."
                  : hasUnsavedChanges
                  ? "수정사항 내 계정에 저장 *"
                  : "내 계정에 저장됨"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (rows.length === 0) {
                  toast.error("다운로드할 데이터가 없습니다.");
                  return;
                }
                exportFirstVisitWorkbookXlsx(rows, workspace?.clinicName);
                toast.success("구글 시트 19개 표준 양식(.xlsx)으로 다운로드되었습니다.");
              }}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-extrabold transition cursor-pointer"
            >
              <Download size={15} className="text-emerald-400" />
              <span>표준 시트 엑셀(.xlsx) 다운로드</span>
            </button>

            {rows.length > 0 && (
              <button
                type="button"
                onClick={handleResetAll}
                className="flex items-center gap-1.5 px-3.5 py-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-300 text-xs font-bold transition cursor-pointer"
              >
                <Trash2 size={14} />
                <span>초기화</span>
              </button>
            )}
          </div>
        </div>

        {/* 3. 전 차트 자동 분석 업로드 드롭존 */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files?.length) {
              processFiles(e.dataTransfer.files);
            }
          }}
          className={`rounded-3xl border-2 border-dashed p-6 lg:p-7 transition-all ${
            isDragging
              ? "border-amber-400 bg-amber-400/10 scale-[1.005]"
              : "border-emerald-500/30 bg-gradient-to-br from-white/[0.06] to-white/[0.02] hover:border-emerald-400/50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".xlsx,.xls,.csv,.tsv,.txt"
            onChange={(e) => {
              if (e.target.files?.length) processFiles(e.target.files);
            }}
            className="hidden"
          />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
                <Upload size={26} className={isUploading ? "animate-bounce" : ""} />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-black text-white">
                    일일 환자 리스트 업로드 (전 차트 자동 단어·구조 인식)
                  </h3>
                  <span className="px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 text-[11px] font-black">
                    다중 파일 동시 업로드 가능
                  </span>
                </div>
                <p className="text-xs text-white/60 leading-relaxed">
                  한차트 · 오케이차트 · 한의사랑 · 동의보감 · 자체 엑셀(.xlsx, .xls, .csv) 모두 지원합니다.
                  차트에 없는 시트 항목은 <strong className="text-amber-300">자동 공란 처리</strong> 후 아래에서 원장님께 안내해 드립니다.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <div className="flex items-center gap-2 bg-black/30 border border-white/10 rounded-xl px-3 py-2">
                <Calendar size={14} className="text-amber-400" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-white/45 font-bold">
                    날짜 열 없는 단일 파일 기준일(선택)
                  </span>
                  <input
                    type="date"
                    value={fallbackDateInput}
                    onChange={(e) => setFallbackDateInput(e.target.value)}
                    className="bg-transparent text-xs font-bold text-white focus:outline-none [color-scheme:dark]"
                  />
                </div>
                {fallbackDateInput && (
                  <button
                    type="button"
                    onClick={() => setFallbackDateInput("")}
                    className="text-white/40 hover:text-white cursor-pointer"
                    title="기준일 초기화"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-[#031C13] font-black text-sm shadow-lg shadow-emerald-500/20 transition cursor-pointer disabled:opacity-60 active:scale-95"
              >
                <FileSpreadsheet size={17} />
                <span>{isUploading ? "자동 분석 및 정리 중..." : "환자 리스트 파일 선택"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4. 원장님 전용 공란(미기재) 항목 안내 패널 (요구사항 4번 핵심) */}
        {rows.length > 0 && (
          <div className="bg-amber-500/[0.08] border border-amber-400/30 rounded-3xl p-5 lg:p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-amber-200">
                    {missingReport.directorHeadline}
                  </h3>
                  <p className="text-xs text-white/55">
                    차트 원본에 없는 항목은 임의로 채우지 않고 공란으로 비워두었습니다. 배지를 클릭하면 해당 항목이 비어 있는 환자만 바로 필터링됩니다.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGuideExpanded((p) => !p)}
                className="text-xs font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <span>{isGuideExpanded ? "안내 접기" : "상세 보기"}</span>
                {isGuideExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>
            </div>

            {isGuideExpanded && (
              <div className="space-y-3 pt-2 border-t border-amber-400/15">
                <ul className="space-y-1.5 text-xs text-white/80 leading-relaxed pl-4 list-disc marker:text-amber-400">
                  {missingReport.directorMessages.map((msg, i) => (
                    <li key={i}>{msg}</li>
                  ))}
                </ul>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {missingColFilter !== "none" && (
                    <button
                      type="button"
                      onClick={() => setMissingColFilter("none")}
                      className="px-3 py-1.5 rounded-xl bg-amber-400 text-[#031C13] text-xs font-black flex items-center gap-1 cursor-pointer"
                    >
                      <X size={12} /> 공란 필터 해제
                    </button>
                  )}

                  {missingReport.partialBlankColumns.map((col) => (
                    <button
                      key={col.key}
                      type="button"
                      onClick={() => {
                        setActiveTab("sheet");
                        setMissingColFilter((prev) => (prev === col.key ? "none" : col.key));
                      }}
                      title={col.guide}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                        missingColFilter === col.key
                          ? "bg-amber-400 text-[#031C13] border-amber-300 font-black"
                          : "bg-black/30 text-amber-200/90 border-amber-400/25 hover:bg-amber-400/15"
                      }`}
                    >
                      부분 공란 · {col.shortLabel} ({col.missingCount}명 / {col.missingPct}%)
                    </button>
                  ))}

                  {missingReport.completelyBlankColumns.map((col) => (
                    <span
                      key={col.key}
                      title={col.guide}
                      className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-white/5 text-white/45 border border-white/10"
                    >
                      차트 미포함(전체 공란) · {col.shortLabel}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 5. 메인 탭 전환기 (19열 표준 시트 vs AI 분석 리포트 vs 업로드 이력) */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab("sheet")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
                activeTab === "sheet"
                  ? "bg-emerald-500 text-[#031C13] shadow-md"
                  : "text-white/65 hover:text-white"
              }`}
            >
              <FileSpreadsheet size={15} />
              <span>초진 표준 정리 시트 ({rows.length}명)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("report")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
                activeTab === "report"
                  ? "bg-amber-400 text-[#031C13] shadow-md"
                  : "text-white/65 hover:text-white"
              }`}
            >
              <Sparkles size={15} />
              <span>원장님 AI 심층 분석 리포트</span>
              {workspace?.aiReport && (
                <span className="px-1.5 py-0.5 text-[10px] rounded bg-black/20 font-extrabold">
                  READY
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
                activeTab === "history"
                  ? "bg-white/20 text-white shadow-md"
                  : "text-white/65 hover:text-white"
              }`}
            >
              <History size={15} />
              <span>업로드 이력 ({uploadLogs.length})</span>
            </button>
          </div>

          {activeTab === "sheet" && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="이름, 증상, 경로, 비급여 검색..."
                  className="pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/35 focus:outline-none focus:border-emerald-400 w-52"
                />
              </div>

              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#07291c] border border-white/15 text-xs font-bold text-white focus:outline-none"
              >
                <option value="all">전체 월 ({rows.length}명)</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={visitTypeFilter}
                onChange={(e) => setVisitTypeFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#07291c] border border-white/15 text-xs font-bold text-white focus:outline-none"
              >
                <option value="all">초진/재초진 전체</option>
                <option value="초진">초진만</option>
                <option value="재초진">재초진만</option>
                <option value="blank">구분 공란만</option>
              </select>

              <button
                type="button"
                onClick={() =>
                  setMissingColFilter((p) => (p === "any_core" ? "none" : "any_core"))
                }
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  missingColFilter === "any_core"
                    ? "bg-amber-400 text-[#031C13] border-amber-300 font-black"
                    : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
                }`}
              >
                <Filter size={13} />
                <span>핵심항목 공란 환자만</span>
              </button>

              <button
                type="button"
                onClick={handleAddEmptyRow}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/35 text-emerald-200 text-xs font-extrabold transition cursor-pointer"
              >
                <Plus size={14} />
                <span>수동 행 추가</span>
              </button>
            </div>
          )}
        </div>

        {/* 6. 탭 컨텐츠 영역 */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-4">
            <div className="w-11 h-11 rounded-full border-4 border-emerald-400 border-t-transparent animate-spin" />
            <p className="text-sm text-white/60 font-bold">초진 시스템 데이터를 불러오는 중입니다...</p>
          </div>
        ) : activeTab === "sheet" ? (
          <div className="bg-[#052319] border border-white/10 rounded-[28px] shadow-2xl overflow-hidden">
            {rows.length === 0 ? (
              <div className="py-24 px-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mx-auto text-emerald-300">
                  <FileSpreadsheet size={30} />
                </div>
                <h3 className="text-lg font-black text-white">
                  일일 환자 리스트를 업로드하여 초진 시트를 시작하세요
                </h3>
                <p className="text-xs text-white/55 max-w-xl mx-auto leading-relaxed">
                  위 업로드 영역에 차트 프로그램에서 내려받은 일일 수진자 명부(.xlsx, .xls, .csv)를 올리시면
                  19개 표준 열에 맞춰 자동 정리되며, 없는 항목은 공란 처리 후 원장님께 안내해 드립니다.
                </p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#031C13] text-xs font-black transition cursor-pointer"
                  >
                    첫 일일 환자 리스트 업로드
                  </button>
                  <button
                    type="button"
                    onClick={handleAddEmptyRow}
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition cursor-pointer"
                  >
                    직접 행 추가하기
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto max-h-[68vh]">
                  <table className="w-full border-collapse text-xs">
                    {/* 2번 구글 시트 100% 동일 2단 병합 헤더 */}
                    <thead className="sticky top-0 z-20">
                      <tr className="bg-[#02140E] border-b border-white/10 text-[11px] font-black">
                        <th className="py-2 px-2 bg-[#02140E] sticky left-0 z-30 border-r border-white/10" />
                        <th colSpan={7} className="py-2 px-3 text-left text-white/40 border-r border-white/10">
                          기본 초진·진료 정보 (클릭하여 직접 수정 가능)
                        </th>
                        <th className="py-2 px-3 text-center bg-emerald-900/60 text-emerald-300 border-r border-white/15">
                          초진일
                        </th>
                        <th
                          colSpan={2}
                          className="py-2 px-3 text-center bg-amber-900/50 text-amber-300 border-r border-white/15"
                        >
                          재내원일 (후속 명부 업로드 시 자동 기입)
                        </th>
                        <th colSpan={9} className="py-2 px-3 text-left text-white/45">
                          유입 경로 · 비급여 · 한약 · 패키지 결제 추적 (차트 미포함 항목은 공란 유지)
                        </th>
                        <th className="py-2 px-2 bg-[#02140E]" />
                      </tr>

                      <tr className="bg-[#083022] border-b border-white/15 text-white/90">
                        <th className="py-3 px-2.5 text-center font-black text-white/45 bg-[#083022] sticky left-0 z-30 border-r border-white/10 min-w-[44px]">
                          No
                        </th>
                        {SHEET_COLUMNS.map((col) => {
                          const isStickyDate = col.key === "visitDate";
                          const isStickyName = col.key === "patientName";
                          return (
                            <th
                              key={col.key}
                              className={`py-3 px-2.5 text-left font-extrabold leading-snug border-r border-white/10 ${
                                col.widthClass
                              } ${
                                isStickyDate
                                  ? "sticky left-[44px] z-30 bg-[#083022]"
                                  : isStickyName
                                  ? "sticky left-[140px] z-30 bg-[#083022] shadow-[4px_0_8px_rgba(0,0,0,0.25)]"
                                  : col.groupHeader === "초진일"
                                  ? "bg-emerald-950/90 text-emerald-200 text-center"
                                  : col.groupHeader === "재내원일"
                                  ? "bg-amber-950/80 text-amber-200 text-center"
                                  : ""
                              }`}
                            >
                              <div className="whitespace-pre-line text-[11px]">{col.label}</div>
                            </th>
                          );
                        })}
                        <th className="py-3 px-2.5 text-center font-bold text-white/45 min-w-[52px]">
                          삭제
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-white/[0.07]">
                      {filteredRows.map((row, idx) => (
                        <tr
                          key={row.id}
                          className="hover:bg-white/[0.04] transition-colors group"
                        >
                          <td className="py-2 px-2 text-center text-[11px] font-bold text-white/35 bg-[#052319] group-hover:bg-[#093224] sticky left-0 z-10 border-r border-white/10">
                            {idx + 1}
                          </td>

                          {SHEET_COLUMNS.map((col) => {
                            const val = row[col.key] || "";
                            const isBlank = !val.trim();
                            const isStickyDate = col.key === "visitDate";
                            const isStickyName = col.key === "patientName";

                            return (
                              <td
                                key={col.key}
                                className={`p-1 border-r border-white/[0.06] ${
                                  isStickyDate
                                    ? "sticky left-[44px] z-10 bg-[#052319] group-hover:bg-[#093224]"
                                    : isStickyName
                                    ? "sticky left-[140px] z-10 bg-[#052319] group-hover:bg-[#093224] shadow-[4px_0_8px_rgba(0,0,0,0.2)]"
                                    : col.groupHeader === "초진일"
                                    ? "bg-emerald-950/20"
                                    : col.groupHeader === "재내원일"
                                    ? "bg-amber-950/15"
                                    : ""
                                }`}
                              >
                                {col.options ? (
                                  <select
                                    value={val}
                                    onChange={(e) =>
                                      handleCellChange(row.id, col.key, e.target.value)
                                    }
                                    className={`w-full px-2 py-1.5 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-400 transition ${
                                      isBlank
                                        ? "bg-amber-500/[0.06] text-white/35 border border-dashed border-amber-400/20"
                                        : val === "초진" || val === "유" || val === "건보"
                                        ? "bg-emerald-500/15 text-emerald-200"
                                        : val === "재초진" || val === "자보"
                                        ? "bg-blue-500/15 text-blue-200"
                                        : val === "무"
                                        ? "bg-rose-500/15 text-rose-200"
                                        : "bg-purple-500/15 text-purple-200"
                                    }`}
                                  >
                                    {col.options.map((opt) => (
                                      <option
                                        key={opt || "__blank"}
                                        value={opt}
                                        className="bg-[#052319] text-white"
                                      >
                                        {opt === "" ? "(공란)" : opt}
                                      </option>
                                    ))}
                                    {val && !col.options.includes(val) && (
                                      <option value={val} className="bg-[#052319] text-white">
                                        {val}
                                      </option>
                                    )}
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    value={val}
                                    placeholder={col.placeholder || ""}
                                    onChange={(e) =>
                                      handleCellChange(row.id, col.key, e.target.value)
                                    }
                                    className={`w-full px-2 py-1.5 rounded-lg text-xs focus:outline-none focus:bg-white/10 focus:ring-1 focus:ring-emerald-400 transition ${
                                      isStickyName
                                        ? "font-extrabold text-white"
                                        : col.key === "secondVisitDate" ||
                                          col.key === "thirdVisitDate"
                                        ? "text-center font-bold text-amber-200 placeholder:text-white/15"
                                        : col.key === "firstVisitDate" || col.key === "visitDate"
                                        ? "text-center font-semibold text-emerald-100 placeholder:text-white/20"
                                        : "text-white/90 placeholder:text-white/15"
                                    } ${
                                      isBlank &&
                                      (col.category === "core" || col.category === "marketing")
                                        ? "bg-amber-500/[0.04]"
                                        : "bg-transparent"
                                    }`}
                                  />
                                )}
                              </td>
                            );
                          })}

                          <td className="p-1 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(row.id, row.patientName)}
                              className="p-1.5 rounded-lg text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                              title="행 삭제"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 하단 상태바 */}
                <div className="px-6 py-3.5 bg-black/30 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-white/55">
                  <div className="flex items-center gap-4">
                    <span>
                      표시 중: <strong className="text-white">{filteredRows.length}명</strong> / 전체{" "}
                      <strong className="text-white">{rows.length}명</strong>
                    </span>
                    <span>
                      2차 재내원:{" "}
                      <strong className="text-amber-300">{analytics.overallSecondVisitRate}%</strong>
                    </span>
                    <span>
                      3차 재내원:{" "}
                      <strong className="text-emerald-300">{analytics.overallThirdVisitRate}%</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {workspace?.updatedAt && (
                      <span>
                        마지막 저장: {new Date(workspace.updatedAt).toLocaleString("ko-KR")}
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        ) : activeTab === "report" ? (
          <FirstVisitAiReportView
            clinicName={workspace?.clinicName || "내 한의원"}
            directorName={workspace?.directorName || "원장님"}
            analytics={analytics}
            missingReport={missingReport}
            aiReport={workspace?.aiReport || null}
            isGenerating={isGeneratingAi}
            onGenerateReport={() => handleGenerateAiReport()}
          />
        ) : (
          /* 업로드 이력 탭 */
          <div className="bg-white/5 border border-white/10 rounded-[28px] p-6 lg:p-8 space-y-4">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <History size={18} className="text-emerald-400" />
              일일 환자 리스트 업로드 및 자동 매칭 이력
            </h3>
            {uploadLogs.length === 0 ? (
              <p className="text-sm text-white/45 py-10 text-center">
                아직 업로드된 파일 이력이 없습니다.
              </p>
            ) : (
              <div className="divide-y divide-white/10">
                {uploadLogs.map((log) => (
                  <div
                    key={log.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={15} className="text-emerald-400" />
                        <span className="text-sm font-extrabold text-white">{log.fileName}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300">
                          {log.emrDetected}
                        </span>
                      </div>
                      <p className="text-xs text-white/50">
                        업로드 일시: {new Date(log.uploadedAt).toLocaleString("ko-KR")}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                      <span className="px-3 py-1 rounded-xl bg-blue-500/15 text-blue-200 border border-blue-400/25">
                        신규 초진·재초진 +{log.newPatientsAdded}명
                      </span>
                      <span className="px-3 py-1 rounded-xl bg-amber-500/15 text-amber-200 border border-amber-400/25">
                        재내원(2·3회) 자동연결 +{log.revisitsUpdated}건
                      </span>
                      {log.pureRevisitsSkipped > 0 && (
                        <span className="px-3 py-1 rounded-xl bg-white/5 text-white/50">
                          일반 재진 제외 {log.pureRevisitsSkipped}명
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function FirstVisitSystemPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#031C13] flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-4 border-emerald-400 border-t-transparent animate-spin" />
        </div>
      }
    >
      <FirstVisitSystemContent />
    </Suspense>
  );
}
