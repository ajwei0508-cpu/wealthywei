"use client";

import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import FirstVisitAiReportView from "@/components/first-visit/FirstVisitAiReportView";
import {
  FirstVisitRow,
  FirstVisitWorkspace,
  FirstVisitTrack,
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
  getTodayKSTISO,
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
  UserPlus,
  Check,
  Users,
  BarChart3,
} from "lucide-react";
import toast from "react-hot-toast";

interface ManualEntryDraft {
  visitDate: string;
  patientName: string;
  gender: string;
  age: string;
  visitType: string;
  insuranceType: string;
  treatmentDetail: string;
  chunaType: string;
  nextReservation: string;
  firstVisitDate: string;
  secondVisitDate: string;
  thirdVisitDate: string;
  visitRoute: string;
  nonCoveredList: string;
  nonCoveredCount: string;
  immediatePaymentCount: string;
  herbalMonthlySummary: string;
  packageCount: string;
  herbalFollowupPayment: string;
  packageRenewal: string;
  delayedPaymentWithinMonth: string;
}

function createInitialDraft(dateISO: string): ManualEntryDraft {
  const label = formatISOToKoreanMD(dateISO);
  return {
    visitDate: label,
    patientName: "",
    gender: "",
    age: "",
    visitType: "초진",
    insuranceType: "건보",
    treatmentDetail: "",
    chunaType: "",
    nextReservation: "유",
    firstVisitDate: label,
    secondVisitDate: "",
    thirdVisitDate: "",
    visitRoute: "",
    nonCoveredList: "",
    nonCoveredCount: "",
    immediatePaymentCount: "",
    herbalMonthlySummary: "",
    packageCount: "",
    herbalFollowupPayment: "",
    packageRenewal: "",
    delayedPaymentWithinMonth: "",
  };
}

function shiftDateISO(iso: string, deltaDays: number): string {
  const base = iso || getTodayKSTISO();
  const [y, m, d] = base.split("-").map(Number);
  if (!y || !m || !d) return getTodayKSTISO();
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

const SINGLE_WORD_COLUMN_LABEL: Record<SheetColumnKey, string> = {
  visitDate: "일자",
  patientName: "이름",
  gender: "성별",
  age: "나이",
  visitType: "구분",
  insuranceType: "보험",
  treatmentDetail: "진료",
  chunaType: "추나",
  nextReservation: "예약",
  firstVisitDate: "초진일",
  secondVisitDate: "2회",
  thirdVisitDate: "3회",
  visitRoute: "경로",
  nonCoveredList: "비급여",
  nonCoveredCount: "판매수",
  immediatePaymentCount: "즉시결제",
  herbalMonthlySummary: "한약",
  packageCount: "패키지",
  herbalFollowupPayment: "연복",
  packageRenewal: "연장",
  delayedPaymentWithinMonth: "추후결제",
};

function FirstVisitSystemContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const masterEmail = (process.env.NEXT_PUBLIC_MASTER_EMAIL || "wei0508@naver.com").toLowerCase();
  const loggedInEmail = session?.user?.email?.toLowerCase() || "";
  const userRole = (session?.user as any)?.role || "director";
  const isStaff = userRole === "staff";
  const isMaster = loggedInEmail === masterEmail && !isStaff;

  const userStatus = (session?.user as any)?.approvalStatus || "pending";
  const approvedCategories: string[] = (session?.user as any)?.approvedCategories || [];
  const userCategory = (session?.user as any)?.approvedCategory || "";

  const isConsultingApproved =
    userStatus === "approved" &&
    (approvedCategories.includes("consulting") ||
      approvedCategories.includes("바른컨설팅") ||
      userCategory === "consulting" ||
      userCategory === "바른컨설팅");

  // 바른컨설팅 승인 원장님 + 해당 한의원 소속 직원 + 마스터 모두 허용
  const hasMenuAccess = isMaster || isConsultingApproved || isStaff;

  // 오직 마스터만 타 계정(viewAs) 열람 가능
  const viewAsParam = searchParams.get("viewAs")?.toLowerCase().trim() || "";
  const activeTargetEmail = isMaster && viewAsParam ? viewAsParam : loggedInEmail;

  // Data States
  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState<FirstVisitWorkspace | null>(null);
  const [rows, setRows] = useState<FirstVisitRow[]>([]);
  const [uploadLogs, setUploadLogs] = useState<UploadHistoryLog[]>([]);
  const [memberWorkspaces, setMemberWorkspaces] = useState<MasterMemberSummary[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // 20초 간격 자동 저장 상태 및 경합 방지 Ref
  const AUTO_SAVE_INTERVAL_SEC = 20;
  const [autoSaveCountdown, setAutoSaveCountdown] = useState<number>(AUTO_SAVE_INTERVAL_SEC);
  const [lastAutoSavedTime, setLastAutoSavedTime] = useState<string>("");
  const changeVersionRef = useRef<number>(0);
  const autoSaveInFlightRef = useRef<boolean>(false);

  // Action States
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // 1번 요구사항: 해당일에 맞춰 자동으로 날짜 기입 (당일 KST 날짜 기본 세팅)
  const [fallbackDateInput, setFallbackDateInput] = useState<string>(() => getTodayKSTISO());

  // 2번 요구사항: 개별 수동 기입 폼 상태 (기본값: 접기)
  const [isManualPanelOpen, setIsManualPanelOpen] = useState<boolean>(false);
  const [isManualDetailExpanded, setIsManualDetailExpanded] = useState<boolean>(false);
  const [manualDraft, setManualDraft] = useState<ManualEntryDraft>(() =>
    createInitialDraft(getTodayKSTISO())
  );

  // UI & Filter States
  const [activeTab, setActiveTab] = useState<"sheet" | "report" | "history">("sheet");
  const [activeAnalysisTrack, setActiveAnalysisTrack] = useState<FirstVisitTrack>("insurance");
  const [sheetColumnMode, setSheetColumnMode] = useState<"all" | FirstVisitTrack>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [visitTypeFilter, setVisitTypeFilter] = useState<string>("all");
  const [missingColFilter, setMissingColFilter] = useState<SheetColumnKey | "any_core" | "none">("none");
  const [isGuideExpanded, setIsGuideExpanded] = useState(false);
  const [isMasterPanelOpen, setIsMasterPanelOpen] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 해당일(fallbackDateInput)이 변경될 때 수동 입력 폼의 일자 및 1회(초진일) 자동 기입 동기화
  const handleSelectedDateChange = (newDateISO: string) => {
    const validISO = newDateISO || getTodayKSTISO();
    setFallbackDateInput(validISO);
    const label = formatISOToKoreanMD(validISO);
    setManualDraft((prev) => ({
      ...prev,
      visitDate: label,
      firstVisitDate: label,
    }));
  };

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
      if (!hasMenuAccess) {
        setLoading(false);
        return;
      }
      fetchWorkspace(activeTargetEmail);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, activeTargetEmail, hasMenuAccess]);

  // 월별 선택 옵션 (전체 기간 vs 각 월별 인원)
  const availableMonthOptions = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => {
      const iso = r.visitDateISO || r.firstVisitISO;
      if (iso && iso.length >= 7) {
        const ym = iso.slice(0, 7);
        map.set(ym, (map.get(ym) || 0) + 1);
      }
    });
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([month, count]) => {
        const [y, m] = month.split("-");
        return { month, label: `${y}년 ${Number(m)}월`, count };
      });
  }, [rows]);

  const availableMonths = useMemo(
    () => availableMonthOptions.map((m) => m.month).sort(),
    [availableMonthOptions]
  );

  // 선택된 월이 현재 데이터에 없으면 자동으로 '전체(all)'로 복귀
  useEffect(() => {
    if (selectedMonth !== "all" && rows.length > 0 && !availableMonths.includes(selectedMonth)) {
      setSelectedMonth("all");
    }
  }, [selectedMonth, availableMonths, rows.length]);

  // 통계 분석용 범위 데이터 (전체 기간 vs 선택된 특정 월)
  const scopedReportRows = useMemo(() => {
    if (selectedMonth === "all") return rows;
    return rows.filter((r) => {
      const iso = r.visitDateISO || r.firstVisitISO;
      return iso && iso.startsWith(selectedMonth);
    });
  }, [rows, selectedMonth]);

  // Derived Analytics & Missing Data Report (선택 범위 연동)
  const missingReport = useMemo(() => computeMissingDataReport(scopedReportRows), [scopedReportRows]);
  const analytics = useMemo(() => computeFirstVisitAnalytics(scopedReportRows), [scopedReportRows]);

  // 일자 또는 1회 초진일이 비어있는 행 수
  const blankDateRowCount = useMemo(
    () => rows.filter((r) => !r.visitDate?.trim() || !r.firstVisitDate?.trim()).length,
    [rows]
  );

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

  const handleSaveClinicOpenYear = async (yearNum: number) => {
    setWorkspace((prev) => (prev ? { ...prev, clinicOpenYear: yearNum } : prev));
    try {
      const res = await fetch(`/api/first-visit${buildQuerySuffix()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicOpenYear: yearNum }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "개원 연도 저장 실패");
      }
      const saved = await res.json();
      if (saved?.workspace) {
        setWorkspace((prev) =>
          prev
            ? { ...prev, clinicOpenYear: saved.workspace.clinicOpenYear ?? yearNum }
            : saved.workspace
        );
      }
    } catch (err: any) {
      console.error("Clinic open year save error:", err);
      toast.error("개원 연도 서버 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    }
  };

  // Save Workspace Handler
  const handleSaveWorkspace = async (
    customRows?: FirstVisitRow[],
    customLogs?: UploadHistoryLog[],
    customEmr?: string,
    silent?: boolean,
    customSuccessMsg?: string,
    isAutoSave = false
  ) => {
    const saveVersion = changeVersionRef.current;
    setIsSaving(true);
    try {
      const targetDateISO = fallbackDateInput || getTodayKSTISO();
      const targetDateLabel = formatISOToKoreanMD(targetDateISO);

      // 저장 시 일자(visitDate)나 1회(firstVisitDate)가 비어있는 행은 해당일로 자동 보정
      const rawRows = customRows ?? rows;
      let anyDateFilled = false;
      const payloadRows = rawRows.map((r) => {
        const next = { ...r };
        if (!next.visitDate?.trim()) {
          const iso = next.firstVisitISO || targetDateISO;
          next.visitDateISO = iso;
          next.visitDate = formatISOToKoreanMD(iso) || targetDateLabel;
          anyDateFilled = true;
        }
        if (!next.firstVisitDate?.trim()) {
          const iso = next.visitDateISO || targetDateISO;
          next.firstVisitISO = iso;
          next.firstVisitDate = next.visitDate || formatISOToKoreanMD(iso) || targetDateLabel;
          anyDateFilled = true;
        }
        return next;
      });

      if (!customRows && (!isAutoSave || (anyDateFilled && changeVersionRef.current === saveVersion))) {
        setRows(payloadRows);
      }

      const payloadLogs = customLogs ?? uploadLogs;
      const res = await fetch(`/api/first-visit${buildQuerySuffix()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: payloadRows,
          uploadLogs: payloadLogs,
          lastDetectedEmr: customEmr ?? workspace?.lastDetectedEmr,
          aiReport: workspace?.aiReport ?? null,
          ...(workspace?.clinicOpenYear !== undefined
            ? { clinicOpenYear: workspace.clinicOpenYear }
            : {}),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "저장 실패");
      }
      const saved = await res.json();
      setWorkspace(saved.workspace);
      setLastAutoSavedTime(
        new Date().toLocaleTimeString("ko-KR", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
      // 저장 요청 중에 추가 입력이 발생하지 않았을 때만 미저장 상태 해제
      if (changeVersionRef.current === saveVersion) {
        setHasUnsavedChanges(false);
      }
      if (isAutoSave) {
        toast.success("20초 자동 저장이 완료되었습니다.", { id: "fv-autosave", duration: 2200 });
      } else if (!silent) {
        toast.success(
          customSuccessMsg ||
            "소속 한의원 전용 보안 공간에 안전하게 저장되었습니다. (마스터 외 타 계정 열람 불가)"
        );
      }
      if (isMaster && !isAutoSave) {
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
      if (isAutoSave) {
        toast.error("자동 저장 중 일시적 오류가 발생했습니다. 20초 후 다시 시도합니다.", {
          id: "fv-autosave",
          duration: 3000,
        });
      } else {
        toast.error(err.message || "저장 중 오류가 발생했습니다.");
      }
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  // 최신 자동저장 핸들러 참조 유지 (연속 입력 중에도 정확히 20초 간격으로 안전하게 자동 저장)
  const latestAutoSaveRef = useRef<() => Promise<FirstVisitWorkspace | null>>(() => Promise.resolve(null));
  latestAutoSaveRef.current = () =>
    handleSaveWorkspace(undefined, undefined, undefined, true, undefined, true);

  useEffect(() => {
    if (!hasUnsavedChanges || status !== "authenticated" || !hasMenuAccess || loading || isUploading) {
      setAutoSaveCountdown(AUTO_SAVE_INTERVAL_SEC);
      return;
    }

    let remaining = AUTO_SAVE_INTERVAL_SEC;
    setAutoSaveCountdown(remaining);

    const timer = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        if (!autoSaveInFlightRef.current) {
          autoSaveInFlightRef.current = true;
          latestAutoSaveRef.current().finally(() => {
            autoSaveInFlightRef.current = false;
          });
        }
        remaining = AUTO_SAVE_INTERVAL_SEC;
      }
      setAutoSaveCountdown(remaining);
    }, 1000);

    return () => clearInterval(timer);
  }, [hasUnsavedChanges, status, hasMenuAccess, loading, isUploading]);

  // Trigger AI Report Generation (전체 또는 현재 선택된 월 기준 분석)
  const handleGenerateAiReport = async (overrideRows?: FirstVisitRow[]) => {
    const isSubset = !overrideRows && selectedMonth !== "all";
    const targetRows = overrideRows ?? scopedReportRows;
    if (targetRows.length === 0) {
      toast.error("분석할 환자 데이터가 없습니다.");
      return;
    }
    setIsGeneratingAi(true);
    const scopeLabel =
      !overrideRows && selectedMonth !== "all"
        ? `${availableMonthOptions.find((m) => m.month === selectedMonth)?.label || selectedMonth} `
        : "";
    const toastId = toast.loading(`AI가 ${scopeLabel}초진·재내원 데이터를 심층 분석 중입니다...`);
    try {
      const res = await fetch(`/api/first-visit/analyze${buildQuerySuffix()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: targetRows, isFilteredSubset: isSubset }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "AI 분석 생성 실패");
      }
      const data = await res.json();
      setWorkspace((prev) =>
        prev
          ? {
              ...prev,
              rows: isSubset ? prev.rows : targetRows,
              aiReport: data.aiReport,
              updatedAt: new Date().toISOString(),
            }
          : prev
      );
      setHasUnsavedChanges(false);
      toast.success(`${scopeLabel}맞춤형 AI 심층 분석이 완성되었습니다!`, { id: toastId });
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
      const sortedFiles = [...files].sort((a, b) => a.name.localeCompare(b.name));

      let workingRows = [...rows];
      const newLogs: UploadHistoryLog[] = [];
      let totalAdded = 0;
      let totalUpdated = 0;
      let totalRevisits = 0;
      let totalPureSkipped = 0;
      let lastEmr = workspace?.lastDetectedEmr || "";

      const activeDateISO = fallbackDateInput || getTodayKSTISO();

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
          activeDateISO,
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
        totalUpdated += mergeResult.existingRowsUpdated;
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
        `업로드 완료! 신규 ${totalAdded}명${
          totalUpdated > 0 ? ` · 기존 환자 정보(성별·나이 등) ${totalUpdated}건 자동 보강` : ""
        } · 재내원(2·3회) ${totalRevisits}건 반영${
          totalPureSkipped > 0 ? ` (일반 구환 재진 ${totalPureSkipped}명 자동 제외)` : ""
        }`,
        { id: toastId, duration: 5500 }
      );

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

  // Inline Cell Edit (해당일 자동 날짜 동기화 포함)
  const handleCellChange = (rowId: string, key: SheetColumnKey, value: string) => {
    const defaultDateISO = fallbackDateInput || getTodayKSTISO();
    const defaultDateLabel = formatISOToKoreanMD(defaultDateISO);

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
          : Number(defaultDateISO.slice(0, 4));

        if (key === "visitDate") {
          const iso = parseAnyDateToISO(value, refYear);
          if (iso) {
            next.visitDateISO = iso;
            // 1회 초진일이 비어있거나 기존 일자와 같았다면 함께 자동 동기화
            if (!r.firstVisitDate?.trim() || r.firstVisitDate === r.visitDate) {
              next.firstVisitISO = iso;
              next.firstVisitDate = formatISOToKoreanMD(iso);
            }
          } else if (!value.trim()) {
            next.visitDateISO = "";
          }
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
        } else {
          // 다른 셀을 수동 입력할 때 일자(visitDate)가 비어있다면 해당일에 맞춰 자동 기입
          if (!next.visitDate?.trim()) {
            next.visitDate = defaultDateLabel;
            next.visitDateISO = defaultDateISO;
          }
          if (!next.firstVisitDate?.trim()) {
            next.firstVisitDate = next.visitDate || defaultDateLabel;
            next.firstVisitISO = next.visitDateISO || defaultDateISO;
          }
        }

        return next;
      })
    );
    changeVersionRef.current += 1;
    setHasUnsavedChanges(true);
  };

  // 특정 행의 날짜 컬럼에 해당일(fallbackDateInput) 원클릭 자동 기입
  const handleFillRowDateWithSelected = (
    rowId: string,
    targetKey: "visitDate" | "firstVisitDate" | "secondVisitDate" | "thirdVisitDate"
  ) => {
    const activeISO = fallbackDateInput || getTodayKSTISO();
    const activeLabel = formatISOToKoreanMD(activeISO);
    handleCellChange(rowId, targetKey, activeLabel);
    toast.success(`${activeLabel} 날짜가 자동 기입되었습니다.`);
  };

  // 공란인 일자/1회 초진일 전체를 해당일로 일괄 자동 기입 후 즉시 저장
  const handleFillAllBlankDates = async () => {
    const activeISO = fallbackDateInput || getTodayKSTISO();
    const activeLabel = formatISOToKoreanMD(activeISO);
    const updated = rows.map((r) => {
      const next = { ...r };
      if (!next.visitDate?.trim()) {
        next.visitDate = activeLabel;
        next.visitDateISO = activeISO;
      }
      if (!next.firstVisitDate?.trim()) {
        next.firstVisitDate = next.visitDate || activeLabel;
        next.firstVisitISO = next.visitDateISO || activeISO;
      }
      return next;
    });
    setRows(updated);
    await handleSaveWorkspace(
      updated,
      undefined,
      undefined,
      false,
      `공란 날짜가 해당일(${activeLabel})로 자동 기입 및 저장되었습니다.`
    );
  };

  // 2번 요구사항: 개별 환자 수동 기입 폼 등록 및 즉시 저장
  const handleRegisterManualPatientAndSave = async () => {
    if (!manualDraft.patientName.trim()) {
      toast.error("환자 이름을 입력해 주세요.");
      return;
    }

    const activeISO = fallbackDateInput || getTodayKSTISO();
    const activeLabel = formatISOToKoreanMD(activeISO);
    const refYear = Number(activeISO.slice(0, 4));

    const visitISO = parseAnyDateToISO(manualDraft.visitDate, refYear) || activeISO;
    const visitLabel = manualDraft.visitDate.trim() || formatISOToKoreanMD(visitISO) || activeLabel;

    const firstISO = parseAnyDateToISO(manualDraft.firstVisitDate, refYear) || visitISO;
    const firstLabel =
      manualDraft.firstVisitDate.trim() || formatISOToKoreanMD(firstISO) || visitLabel;

    const secondISO = parseAnyDateToISO(manualDraft.secondVisitDate, refYear);
    const thirdISO = parseAnyDateToISO(manualDraft.thirdVisitDate, refYear);

    const newRow: FirstVisitRow = {
      id: `fv_manual_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      visitDate: visitLabel,
      visitDateISO: visitISO,
      patientName: manualDraft.patientName.trim(),
      gender: manualDraft.gender,
      age: manualDraft.age.trim(),
      visitType: manualDraft.visitType,
      insuranceType: manualDraft.insuranceType,
      treatmentDetail: manualDraft.treatmentDetail.trim(),
      chunaType: manualDraft.chunaType,
      nextReservation: manualDraft.nextReservation,
      firstVisitDate: firstLabel,
      firstVisitISO: firstISO,
      secondVisitDate: secondISO
        ? formatISOToKoreanMD(secondISO)
        : manualDraft.secondVisitDate.trim(),
      secondVisitISO: secondISO,
      thirdVisitDate: thirdISO
        ? formatISOToKoreanMD(thirdISO)
        : manualDraft.thirdVisitDate.trim(),
      thirdVisitISO: thirdISO,
      visitRoute: manualDraft.visitRoute.trim(),
      nonCoveredList: manualDraft.nonCoveredList.trim(),
      nonCoveredCount: manualDraft.nonCoveredCount.trim(),
      immediatePaymentCount: manualDraft.immediatePaymentCount.trim(),
      herbalMonthlySummary: manualDraft.herbalMonthlySummary.trim(),
      packageCount: manualDraft.packageCount.trim(),
      herbalFollowupPayment: manualDraft.herbalFollowupPayment.trim(),
      packageRenewal: manualDraft.packageRenewal.trim(),
      delayedPaymentWithinMonth: manualDraft.delayedPaymentWithinMonth.trim(),
      sourceFile: isStaff
        ? `직원 수동 기입 (${session?.user?.name || "직원"})`
        : "개별 수동 기입",
      updatedAt: new Date().toISOString(),
    };

    const updatedRows = [newRow, ...rows];
    setRows(updatedRows);
    setActiveTab("sheet");

    // 입력 폼 초기화 (해당일 날짜는 그대로 자동 유지)
    setManualDraft(createInitialDraft(activeISO));

    await handleSaveWorkspace(
      updatedRows,
      undefined,
      undefined,
      false,
      `'${newRow.patientName}' 환자(${visitLabel}) 데이터가 개별 기입 및 저장되었습니다. (마스터 외 타 계정 비공개)`
    );
  };

  // Add Manual Row in Table (해당일 날짜 자동 기입)
  const handleAddEmptyRow = () => {
    const todayISO = fallbackDateInput || getTodayKSTISO();
    const todayLabel = formatISOToKoreanMD(todayISO);
    const newRow: FirstVisitRow = {
      id: `fv_manual_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      visitDate: todayLabel,
      visitDateISO: todayISO,
      patientName: "",
      gender: "",
      age: "",
      visitType: "초진",
      insuranceType: "",
      treatmentDetail: "",
      chunaType: "",
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
      sourceFile: isStaff
        ? `직원 수동 기입 (${session?.user?.name || "직원"})`
        : "직접 입력",
      updatedAt: new Date().toISOString(),
    };
    setRows((prev) => [newRow, ...prev]);
    changeVersionRef.current += 1;
    setHasUnsavedChanges(true);
    toast.success(
      `해당일(${todayLabel}) 날짜가 자동 기입된 새 환자 입력 행이 상단에 추가되었습니다.`
    );
  };

  const handleDeleteRow = async (rowId: string, name: string) => {
    if (!window.confirm(`'${name || "이름 미입력"}' 환자 행을 삭제하시겠습니까?`)) return;
    const updated = rows.filter((r) => r.id !== rowId);
    setRows(updated);
    await handleSaveWorkspace(
      updated,
      undefined,
      undefined,
      false,
      `'${name || "선택"}' 환자 행이 삭제되고 저장되었습니다.`
    );
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
  if (status === "authenticated" && !hasMenuAccess) {
    return (
      <DashboardLayout>
        <div className="min-h-[80vh] flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-3xl p-10 text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center mx-auto">
              <Lock size={30} />
            </div>
            <h2 className="text-2xl font-black text-white">바른컨설팅 회원 및 소속 직원 전용</h2>
            <p className="text-sm text-white/60 leading-relaxed">
              <strong>초진 시스템</strong>은 바른컨설팅 승인 원장님, 소속 한의원 직원 및 마스터만 이용하실 수 있습니다. 권한 문의는 마스터에게 요청해 주세요.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const activeDateLabel = formatISOToKoreanMD(fallbackDateInput || getTodayKSTISO());

  const visibleSheetColumns = SHEET_COLUMNS.filter((c) => {
    if (sheetColumnMode === "all") return true;
    if (sheetColumnMode === "insurance") return c.track === "insurance";
    return (
      c.key === "visitDate" ||
      c.key === "patientName" ||
      c.key === "visitRoute" ||
      c.track === "non_covered"
    );
  });

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
                      개인간 비공유 · 마스터만 본인 외 전체 열람 가능
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

        {/* 2. 메인 타이틀 & 저장/다운로드 액션바 */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div className="space-y-2">
            {isStaff && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/35 text-amber-300 text-xs font-extrabold">
                  <Users size={13} />
                  소속 한의원 직원 권한 접속 ({session?.user?.name || "직원"}님)
                </span>
              </div>
            )}
            <h1 className="text-3xl font-black text-white tracking-tight">
              초진 시스템{" "}
              <span className="text-lg font-bold text-amber-300 ml-1">
                ({workspace?.clinicName || "내 한의원"})
              </span>
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {blankDateRowCount > 0 && (
              <button
                type="button"
                onClick={handleFillAllBlankDates}
                className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-xs font-extrabold transition cursor-pointer"
              >
                <Calendar size={14} />
                <span>
                  공란 날짜({blankDateRowCount}건) 해당일({activeDateLabel}) 자동기입·저장
                </span>
              </button>
            )}

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
                  ? `수정사항 저장하기 * (${autoSaveCountdown}초 후 자동저장)`
                  : lastAutoSavedTime
                  ? `안전하게 저장됨 (${lastAutoSavedTime})`
                  : "안전하게 저장됨"}
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

        {/* 3. 전 차트 자동 분석 업로드 드롭존 (환자 리스트 파일 선택) */}
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
          className={`rounded-3xl border-2 border-dashed p-5 lg:p-6 transition-all ${
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

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
                <Upload size={22} className={isUploading ? "animate-bounce" : ""} />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-black text-white">
                    일일 환자 리스트 엑셀/CSV 업로드 (날짜 누락 시 해당일 [{activeDateLabel}] 자동 기입)
                  </h3>
                  <span className="px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 text-[11px] font-black">
                    다중 파일 동시 업로드 가능
                  </span>
                </div>
                <p className="text-xs text-white/60 leading-relaxed">
                  한차트 · 오케이차트 · 한의사랑 · 동의보감 · 자체 엑셀(.xlsx, .xls, .csv) 모두 지원하며, 업로드 즉시 자동 저장됩니다.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-[#031C13] font-black text-xs shadow-lg shadow-emerald-500/20 transition cursor-pointer disabled:opacity-60 active:scale-95"
              >
                <FileSpreadsheet size={16} />
                <span>{isUploading ? "자동 분석 및 정리 중..." : "환자 리스트 파일 선택"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4. 개별 초진 환자 수동 기입 (심플 버전 · 기본 접힘) */}
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl px-5 py-3.5 transition-all">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setIsManualPanelOpen((p) => !p)}
              className="flex items-center gap-2.5 text-left cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
                <UserPlus size={16} />
              </div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-sm font-extrabold text-white group-hover:text-amber-200 transition">
                  개별 초진 수동 기입
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 text-[11px] font-bold">
                  {activeDateLabel}
                </span>
              </div>
            </button>

            {/* 심플 날짜 설정 + 접기/펼치기 */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-black/30 border border-white/15 rounded-xl px-2.5 py-1.5">
                <Calendar size={13} className="text-amber-400 shrink-0" />
                <input
                  type="date"
                  value={fallbackDateInput}
                  onChange={(e) => handleSelectedDateChange(e.target.value)}
                  className="bg-transparent text-xs font-bold text-white focus:outline-none [color-scheme:dark]"
                />
              </div>

              <button
                type="button"
                onClick={() => handleSelectedDateChange(getTodayKSTISO())}
                className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-amber-400/20 border border-white/10 text-amber-200 text-xs font-bold transition cursor-pointer"
              >
                오늘
              </button>

              <button
                type="button"
                onClick={() => setIsManualPanelOpen((p) => !p)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white/80 transition cursor-pointer"
              >
                <span>{isManualPanelOpen ? "입력창 접기" : "입력창 펼치기"}</span>
                {isManualPanelOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
          </div>

          {isManualPanelOpen && (
            <div className="mt-4 pt-4 border-t border-white/10 space-y-3.5">
              {/* 1줄: 보험(원장) 기본 정보 (성별 포함) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-white/60">일자</label>
                  <input
                    type="text"
                    value={manualDraft.visitDate}
                    onChange={(e) =>
                      setManualDraft((prev) => ({
                        ...prev,
                        visitDate: e.target.value,
                        firstVisitDate:
                          !prev.firstVisitDate || prev.firstVisitDate === prev.visitDate
                            ? e.target.value
                            : prev.firstVisitDate,
                      }))
                    }
                    placeholder={activeDateLabel}
                    className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/15 text-xs font-bold text-emerald-300 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-white/80">
                    이름 <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={manualDraft.patientName}
                    onChange={(e) =>
                      setManualDraft((prev) => ({ ...prev, patientName: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleRegisterManualPatientAndSave();
                      }
                    }}
                    placeholder="홍길동"
                    className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/15 text-xs font-bold text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-white/60">성별</label>
                  <div className="grid grid-cols-2 gap-1 bg-black/30 border border-white/15 rounded-xl p-1">
                    {(["남", "여"] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() =>
                          setManualDraft((prev) => ({
                            ...prev,
                            gender: prev.gender === g ? "" : g,
                          }))
                        }
                        className={`py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                          manualDraft.gender === g
                            ? "bg-amber-400 text-[#031C13]"
                            : "text-white/60 hover:text-white"
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-white/60">나이</label>
                  <input
                    type="text"
                    value={manualDraft.age}
                    onChange={(e) => setManualDraft((prev) => ({ ...prev, age: e.target.value }))}
                    placeholder="45"
                    className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/15 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-white/60">구분</label>
                  <select
                    value={manualDraft.visitType}
                    onChange={(e) =>
                      setManualDraft((prev) => ({ ...prev, visitType: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#041E15] border border-white/15 text-xs text-white focus:outline-none focus:border-emerald-400"
                  >
                    <option value="초진">초진</option>
                    <option value="재초진">재초진</option>
                    <option value="">공란</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-white/60">보험</label>
                  <select
                    value={manualDraft.insuranceType}
                    onChange={(e) =>
                      setManualDraft((prev) => ({ ...prev, insuranceType: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#041E15] border border-white/15 text-xs text-white focus:outline-none focus:border-emerald-400"
                  >
                    <option value="건보">건보</option>
                    <option value="자보">자보</option>
                    <option value="비급여">비급여</option>
                    <option value="">공란</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-white/60">예약 안내</label>
                  <select
                    value={manualDraft.nextReservation}
                    onChange={(e) =>
                      setManualDraft((prev) => ({ ...prev, nextReservation: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#041E15] border border-white/15 text-xs text-white focus:outline-none focus:border-emerald-400"
                  >
                    <option value="유">유</option>
                    <option value="무">무</option>
                    <option value="">공란</option>
                  </select>
                </div>
              </div>

              {/* 2줄: 진료내역 · 내원경로 · 재내원일 */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
                <div className="lg:col-span-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-white/60">진료 내역</label>
                    <div className="flex items-center gap-1">
                      {["약침", "한약", "비급여"].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() =>
                            setManualDraft((prev) => {
                              const cur = prev.treatmentDetail.trim();
                              if (cur.includes(tag)) return prev;
                              return {
                                ...prev,
                                treatmentDetail: cur ? `${cur} / ${tag}` : tag,
                              };
                            })
                          }
                          className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-emerald-500/20 text-[10px] font-semibold text-white/70 hover:text-emerald-200 transition cursor-pointer"
                        >
                          +{tag}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="text"
                    value={manualDraft.treatmentDetail}
                    onChange={(e) =>
                      setManualDraft((prev) => ({ ...prev, treatmentDetail: e.target.value }))
                    }
                    placeholder="증상 및 치료 내용"
                    className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/15 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div className="lg:col-span-2 space-y-1">
                  <label className="text-[11px] font-bold text-white/60 block">추나</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {["단순", "복잡"].map((ct) => (
                      <button
                        key={ct}
                        type="button"
                        onClick={() =>
                          setManualDraft((prev) => ({
                            ...prev,
                            chunaType: prev.chunaType === ct ? "" : ct,
                          }))
                        }
                        className={`py-2 rounded-xl text-xs font-extrabold border transition cursor-pointer ${
                          manualDraft.chunaType === ct
                            ? ct === "복잡"
                              ? "bg-amber-400/25 border-amber-400 text-amber-200"
                              : "bg-teal-500/25 border-teal-400 text-teal-200"
                            : "bg-black/30 border-white/15 text-white/55 hover:text-white"
                        }`}
                      >
                        {ct}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-white/60">내원경로</label>
                  </div>
                  <div className="flex flex-wrap items-center gap-1 pb-0.5">
                    {[
                      "소개",
                      "홈페이지",
                      "맘카페",
                      "인스타",
                      "스레드",
                      "유튜브",
                      "구글",
                      "블로그",
                      "플레이스",
                      "네이버",
                      "간판",
                      "당근",
                    ].map((rt) => (
                      <button
                        key={rt}
                        type="button"
                        onClick={() =>
                          setManualDraft((prev) => ({ ...prev, visitRoute: rt }))
                        }
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
                          manualDraft.visitRoute === rt
                            ? "bg-amber-400 text-[#031C13] font-bold shadow-sm"
                            : "bg-white/5 hover:bg-amber-400/20 text-white/70 hover:text-amber-200"
                        }`}
                      >
                        {rt}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={manualDraft.visitRoute}
                    onChange={(e) =>
                      setManualDraft((prev) => ({ ...prev, visitRoute: e.target.value }))
                    }
                    placeholder="직접 입력 또는 단축키 선택"
                    className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/15 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div className="lg:col-span-3 grid grid-cols-3 gap-1.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-white/60 block truncate">1회</label>
                    <input
                      type="text"
                      value={manualDraft.firstVisitDate}
                      onChange={(e) =>
                        setManualDraft((prev) => ({ ...prev, firstVisitDate: e.target.value }))
                      }
                      placeholder={activeDateLabel}
                      className="w-full px-2 py-2 rounded-xl bg-black/30 border border-white/15 text-xs text-emerald-300 text-center focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-white/60 block truncate">2회</label>
                    <input
                      type="text"
                      value={manualDraft.secondVisitDate}
                      onChange={(e) =>
                        setManualDraft((prev) => ({ ...prev, secondVisitDate: e.target.value }))
                      }
                      placeholder="-"
                      className="w-full px-2 py-2 rounded-xl bg-black/30 border border-white/15 text-xs text-white text-center placeholder:text-white/25 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-white/60 block truncate">3회</label>
                    <input
                      type="text"
                      value={manualDraft.thirdVisitDate}
                      onChange={(e) =>
                        setManualDraft((prev) => ({ ...prev, thirdVisitDate: e.target.value }))
                      }
                      placeholder="-"
                      className="w-full px-2 py-2 rounded-xl bg-black/30 border border-white/15 text-xs text-white text-center placeholder:text-white/25 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 3줄(선택): 비급여·한약·패키지 추가 입력 (기본 접힘) */}
              {isManualDetailExpanded && (
                <div className="pt-3 border-t border-white/10 grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {[
                    { label: "비급여 목록", key: "nonCoveredList" as const, ph: "녹용, 공진단" },
                    { label: "판매 건수", key: "nonCoveredCount" as const, ph: "공진단 1" },
                    { label: "즉시 결제", key: "immediatePaymentCount" as const, ph: "1건" },
                    { label: "한약 월총", key: "herbalMonthlySummary" as const, ph: "보약 1" },
                    { label: "패키지", key: "packageCount" as const, ph: "약침 1" },
                    { label: "연복 유무", key: "herbalFollowupPayment" as const, ph: "유/무" },
                    { label: "패키지 연장", key: "packageRenewal" as const, ph: "유/무" },
                    { label: "1달내 결제", key: "delayedPaymentWithinMonth" as const, ph: "결제 내역" },
                  ].map((f) => (
                    <div key={f.key} className="space-y-1">
                      <label className="text-[11px] font-bold text-white/55">{f.label}</label>
                      <input
                        type="text"
                        value={manualDraft[f.key]}
                        onChange={(e) =>
                          setManualDraft((prev) => ({ ...prev, [f.key]: e.target.value }))
                        }
                        placeholder={f.ph}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-black/25 border border-white/10 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* 하단 액션 바 (심플 1줄) */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsManualDetailExpanded((p) => !p)}
                  className="text-xs font-semibold text-white/55 hover:text-amber-300 flex items-center gap-1 transition cursor-pointer"
                >
                  <span>{isManualDetailExpanded ? "비급여(실장) 항목 닫기" : "+ 비급여(실장) 항목 입력"}</span>
                  {isManualDetailExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setManualDraft(createInitialDraft(fallbackDateInput || getTodayKSTISO()))}
                    className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white/70 transition cursor-pointer"
                  >
                    초기화
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleRegisterManualPatientAndSave}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#031C13] text-xs font-black transition cursor-pointer active:scale-95"
                  >
                    <Plus size={14} />
                    <span>등록 및 저장</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 5. 원장님 안내 (기본 접힘 · 미기재 한 단어 + 호버 자동 설명) */}
        {rows.length > 0 && (
          <div className="bg-white/[0.04] border border-amber-400/25 rounded-2xl px-5 py-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => setIsGuideExpanded((p) => !p)}
                  className="inline-flex items-center gap-2 text-left cursor-pointer group shrink-0"
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-400/15 text-amber-300 flex items-center justify-center shrink-0">
                    <AlertTriangle size={14} />
                  </div>
                  <span className="text-xs font-black text-amber-200 group-hover:text-amber-100 transition">
                    원장님 안내
                  </span>
                </button>

                {/* 미기재 항목 한 단어 표시 + 마우스 호버 시 상황 설명 안내문 자동 표시 */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {missingColFilter !== "none" && (
                    <button
                      type="button"
                      onClick={() => setMissingColFilter("none")}
                      className="px-2 py-0.5 rounded-md bg-amber-400 text-[#031C13] text-[11px] font-black inline-flex items-center gap-1 cursor-pointer"
                    >
                      <X size={11} /> 해제
                    </button>
                  )}

                  {missingReport.partialBlankColumns.map((col) => {
                    const oneWord = SINGLE_WORD_COLUMN_LABEL[col.key] || col.shortLabel;
                    const isSelected = missingColFilter === col.key;
                    return (
                      <div key={col.key} className="relative group/tip">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab("sheet");
                            setMissingColFilter((prev) => (prev === col.key ? "none" : col.key));
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                            isSelected
                              ? "bg-amber-400 text-[#031C13] border-amber-300 font-black"
                              : "bg-amber-400/10 text-amber-200 border-amber-400/30 hover:bg-amber-400/20"
                          }`}
                        >
                          {oneWord}
                        </button>
                        {/* 호버 자동 안내문 */}
                        <div className="pointer-events-none invisible opacity-0 group-hover/tip:visible group-hover/tip:opacity-100 transition-all duration-150 absolute left-0 bottom-full mb-2 w-72 z-[80] rounded-xl bg-[#0B1612] border border-amber-400/40 p-3 shadow-2xl">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs font-black text-amber-300">
                              {col.shortLabel} 미기재
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-200">
                              {col.missingCount}명 ({col.missingPct}%)
                            </span>
                          </div>
                          <p className="text-[11px] text-white/85 leading-relaxed">
                            {col.guide}
                          </p>
                          <p className="text-[10px] text-emerald-300/90 mt-1.5 font-semibold">
                            클릭하면 해당 미기재 환자만 시트에서 필터링됩니다.
                          </p>
                        </div>
                      </div>
                    );
                  })}

                  {missingReport.completelyBlankColumns.map((col) => {
                    const oneWord = SINGLE_WORD_COLUMN_LABEL[col.key] || col.shortLabel;
                    return (
                      <div key={col.key} className="relative group/tip">
                        <span className="inline-block px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white/5 text-white/55 border border-white/10 hover:border-white/30 hover:text-white/85 transition cursor-help">
                          {oneWord}
                        </span>
                        {/* 호버 자동 안내문 */}
                        <div className="pointer-events-none invisible opacity-0 group-hover/tip:visible group-hover/tip:opacity-100 transition-all duration-150 absolute left-0 bottom-full mb-2 w-72 z-[80] rounded-xl bg-[#0B1612] border border-white/20 p-3 shadow-2xl">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs font-black text-white">
                              {col.shortLabel}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-white/70">
                              차트 미포함
                            </span>
                          </div>
                          <p className="text-[11px] text-white/80 leading-relaxed">
                            {col.guide}
                          </p>
                          <p className="text-[10px] text-amber-300/85 mt-1.5 font-semibold">
                            시트에서 개별로 수동 기입 후 저장할 수 있습니다.
                          </p>
                        </div>
                      </div>
                    );
                  })}

                  {missingReport.partialBlankColumns.length === 0 &&
                    missingReport.completelyBlankColumns.length === 0 && (
                      <span className="text-xs font-bold text-emerald-300">
                        모든 항목 기재 완료
                      </span>
                    )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsGuideExpanded((p) => !p)}
                className="text-xs font-bold text-amber-300/90 hover:text-amber-200 flex items-center gap-1 shrink-0 cursor-pointer px-2.5 py-1 rounded-lg hover:bg-white/5 transition"
              >
                <span>{isGuideExpanded ? "안내 접기" : "안내 펼치기"}</span>
                {isGuideExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>

            {isGuideExpanded && (
              <div className="space-y-2 pt-3 border-t border-white/10">
                <p className="text-xs font-bold text-amber-200/90">
                  {missingReport.directorHeadline}
                </p>
                <ul className="space-y-1 text-xs text-white/75 leading-relaxed pl-4 list-disc marker:text-amber-400">
                  {missingReport.directorMessages.map((msg, i) => (
                    <li key={i}>{msg}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* 6. 메인 탭 전환기: [초진 시트] · [보험(원장)] · [비급여(실장)] · [이력] */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-3">
          <div className="flex flex-wrap items-center gap-1.5 bg-white/5 p-1.5 rounded-2xl border border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab("sheet")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
                activeTab === "sheet"
                  ? "bg-emerald-500 text-[#031C13] shadow-md"
                  : "text-white/65 hover:text-white"
              }`}
            >
              <FileSpreadsheet size={14} />
              <span>초진 시트 ({rows.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("report");
                setActiveAnalysisTrack("insurance");
              }}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
                activeTab === "report" && activeAnalysisTrack === "insurance"
                  ? "bg-white text-[#0F5132] shadow-md"
                  : "text-white/75 hover:text-white"
              }`}
            >
              <BarChart3 size={14} />
              <span>보험 (원장)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("report");
                setActiveAnalysisTrack("non_covered");
              }}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
                activeTab === "report" && activeAnalysisTrack === "non_covered"
                  ? "bg-amber-400 text-[#111111] shadow-md"
                  : "text-white/75 hover:text-white"
              }`}
            >
              <Sparkles size={14} />
              <span>비급여 (실장)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
                activeTab === "history"
                  ? "bg-white/20 text-white shadow-md"
                  : "text-white/55 hover:text-white"
              }`}
            >
              <History size={14} />
              <span>이력 ({uploadLogs.length})</span>
            </button>
          </div>

          {activeTab === "report" && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#07291c] border border-amber-400/40 text-xs font-extrabold text-amber-200">
                <Calendar size={13} className="text-amber-400 shrink-0" />
                <span>분석 범위:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent text-white font-black focus:outline-none cursor-pointer"
                >
                  <option value="all" className="bg-[#052319] text-white">
                    전체 기간 ({rows.length}명)
                  </option>
                  {availableMonthOptions.map((m) => (
                    <option key={m.month} value={m.month} className="bg-[#052319] text-white">
                      {m.label} ({m.count}명)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {activeTab === "sheet" && (
            <div className="flex flex-wrap items-center gap-2">
              {/* 시트 열 보기 스위치: 전체 / 보험(원장) / 비급여(실장) */}
              <div className="inline-flex items-center bg-black/30 border border-white/15 rounded-xl p-0.5 text-[11px] font-bold">
                {(
                  [
                    { id: "all", label: "전체열" },
                    { id: "insurance", label: "보험(원장)" },
                    { id: "non_covered", label: "비급여(실장)" },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSheetColumnMode(m.id)}
                    className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                      sheetColumnMode === m.id
                        ? "bg-amber-400 text-[#031C13] font-black"
                        : "text-white/65 hover:text-white"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
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
                <span>수동 행 추가 ({activeDateLabel})</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveWorkspace()}
                disabled={isSaving}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                  hasUnsavedChanges
                    ? "bg-amber-400 text-[#031C13] shadow-md"
                    : "bg-emerald-600/80 hover:bg-emerald-500 text-white"
                }`}
              >
                <Save size={13} />
                <span>{isSaving ? "저장 중..." : "시트 저장"}</span>
              </button>
            </div>
          )}
        </div>

        {/* 7. 탭 컨텐츠 영역 */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-4">
            <div className="w-11 h-11 rounded-full border-4 border-emerald-400 border-t-transparent animate-spin" />
            <p className="text-sm text-white/60 font-bold">초진 시스템 데이터를 불러오는 중입니다...</p>
          </div>
        ) : activeTab === "sheet" ? (
          <div className="bg-[#052319] border border-white/10 rounded-[28px] shadow-2xl overflow-hidden">
            {rows.length === 0 ? (
              <div className="py-20 px-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mx-auto text-emerald-300">
                  <FileSpreadsheet size={30} />
                </div>
                <h3 className="text-lg font-black text-white">
                  상단 [개별 초진 환자 수동 기입] 또는 [일일 환자 리스트 업로드]로 시트를 시작하세요
                </h3>
                <p className="text-xs text-white/55 max-w-xl mx-auto leading-relaxed">
                  해당일(<strong className="text-amber-300">{activeDateLabel}</strong>)에 맞춰 날짜가 자동으로 기입됩니다. 위 개별 수동 기입 창에서 환자를 바로 등록·저장하거나, 차트 프로그램의 환자 명부 파일을 업로드해 보세요.
                </p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleAddEmptyRow}
                    className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#031C13] text-xs font-black transition cursor-pointer"
                  >
                    + 해당일({activeDateLabel}) 수동 행 바로 추가하기
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#031C13] text-xs font-black transition cursor-pointer"
                  >
                    일일 환자 리스트 파일 업로드
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto max-h-[68vh]">
                  <table className="w-full border-collapse text-xs">
                    <thead className="sticky top-0 z-20">
                      <tr className="bg-[#083022] border-b border-white/15 text-white/90">
                        <th className="py-3 px-2.5 text-center font-black text-white/45 bg-[#083022] sticky left-0 z-30 border-r border-white/10 min-w-[44px]">
                          No
                        </th>
                        {visibleSheetColumns.map((col) => {
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
                                  ? "sticky left-[136px] z-30 bg-[#083022] shadow-[4px_0_8px_rgba(0,0,0,0.25)]"
                                  : col.groupHeader === "초진일"
                                  ? "bg-emerald-950/90 text-emerald-200 text-center"
                                  : col.groupHeader === "재내원일"
                                  ? "bg-amber-950/80 text-amber-200 text-center"
                                  : col.track === "non_covered"
                                  ? "bg-[#10261E] text-amber-100"
                                  : ""
                              }`}
                            >
                              <div className="whitespace-pre-line text-[11px]">{col.label}</div>
                            </th>
                          );
                        })}
                        <th className="py-3 px-2.5 text-center font-bold text-white/60 min-w-[92px]">
                          저장/삭제
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

                          {visibleSheetColumns.map((col) => {
                            const val = row[col.key] || "";
                            const isBlank = !val.trim();
                            const isStickyDate = col.key === "visitDate";
                            const isStickyName = col.key === "patientName";
                            const isDateCol =
                              col.key === "visitDate" ||
                              col.key === "firstVisitDate" ||
                              col.key === "secondVisitDate" ||
                              col.key === "thirdVisitDate";

                            return (
                              <td
                                key={col.key}
                                className={`p-1 border-r border-white/[0.06] ${
                                  isStickyDate
                                    ? "sticky left-[44px] z-10 bg-[#052319] group-hover:bg-[#093224]"
                                    : isStickyName
                                    ? "sticky left-[136px] z-10 bg-[#052319] group-hover:bg-[#093224] shadow-[4px_0_8px_rgba(0,0,0,0.2)]"
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
                                        : val === "복잡"
                                        ? "bg-amber-500/20 text-amber-200"
                                        : val === "단순"
                                        ? "bg-teal-500/20 text-teal-200"
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
                                  <div className="relative flex items-center">
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
                                    {isDateCol && isBlank && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleFillRowDateWithSelected(
                                            row.id,
                                            col.key as
                                              | "visitDate"
                                              | "firstVisitDate"
                                              | "secondVisitDate"
                                              | "thirdVisitDate"
                                          )
                                        }
                                        title={`해당일(${activeDateLabel}) 자동 기입`}
                                        className="opacity-0 group-hover:opacity-100 absolute right-1 px-1.5 py-0.5 rounded bg-emerald-500/80 hover:bg-emerald-400 text-[#031C13] text-[9px] font-black transition cursor-pointer shrink-0"
                                      >
                                        +{activeDateLabel}
                                      </button>
                                    )}
                                  </div>
                                )}
                              </td>
                            );
                          })}

                          <td className="p-1 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  handleSaveWorkspace(
                                    undefined,
                                    undefined,
                                    undefined,
                                    false,
                                    `'${row.patientName || "해당"}' 환자 행을 포함한 시트가 안전하게 저장되었습니다.`
                                  )
                                }
                                disabled={isSaving}
                                className={`px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-0.5 transition cursor-pointer ${
                                  hasUnsavedChanges
                                    ? "bg-amber-400 hover:bg-amber-300 text-[#031C13]"
                                    : "bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300"
                                }`}
                                title="개별 저장"
                              >
                                <Check size={11} />
                                <span>저장</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteRow(row.id, row.patientName)}
                                className="p-1.5 rounded-lg text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                                title="행 삭제"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
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
                  <div className="flex items-center gap-3">
                    {workspace?.updatedAt && (
                      <span>
                        마지막 저장: {new Date(workspace.updatedAt).toLocaleString("ko-KR")}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleSaveWorkspace()}
                      disabled={isSaving}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#031C13] font-black text-xs transition cursor-pointer"
                    >
                      {isSaving ? "저장 중..." : "전체 변경사항 저장"}
                    </button>
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
            rows={scopedReportRows}
            activeTrack={activeAnalysisTrack}
            onTrackChange={setActiveAnalysisTrack}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            availableMonths={availableMonthOptions}
            totalAllRowsCount={rows.length}
            clinicOpenYear={workspace?.clinicOpenYear ?? null}
            workspaceOwnerEmail={workspace?.ownerEmail || activeTargetEmail}
            onClinicOpenYearChange={handleSaveClinicOpenYear}
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
