"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Search,
  Info,
  X,
  Target,
  TrendingUp,
  Crown,
  RotateCcw,
  Calendar,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import toast from "react-hot-toast";
import { FirstVisitRow, FirstVisitTrack } from "@/types/firstVisit";
import {
  DemographicData,
  DEFAULT_DEMOGRAPHIC,
  DEFAULT_INSURANCE_AVG_FEE_MANWON,
  DEFAULT_INSURANCE_SIM_SETTINGS,
  CHUNA_FEES,
  HERBAL_40DAY_FEE_MANWON,
  MIN_BODYPART_SAMPLE,
  DualTrackIndicator,
  BodyPartRetentionItem,
  InsuranceSimulationSettings,
  ChunaType,
  ChunaTargetPct,
  Herbal40TargetPct,
  evaluateDualTrackStats,
} from "@/lib/firstVisitStatsEngine";

interface RegionPresetOption {
  code: string;
  name: string;
  totalPopulation: number;
  femaleRatio: number;
  seniorRatio: number;
}

export interface MonthScopeOption {
  month: string; // "2026-11"
  label: string; // "2026년 11월"
  count: number;
}

interface FirstVisitAnalyticsViewProps {
  existingFirstVisitRows?: FirstVisitRow[];
  embedded?: boolean;
  activeTrack?: FirstVisitTrack;
  onTrackChange?: (track: FirstVisitTrack) => void;
  selectedMonth?: string;
  onMonthChange?: (month: string) => void;
  availableMonths?: MonthScopeOption[];
  totalAllRowsCount?: number;
}

type ModalPayload =
  | { kind: "indicator"; item: DualTrackIndicator }
  | { kind: "bodyPart"; part: BodyPartRetentionItem }
  | { kind: "demographic" }
  | { kind: "mission" }
  | { kind: "revenue" }
  | { kind: "chunaSim" }
  | { kind: "herbalSim" };

export default function FirstVisitAnalyticsView({
  existingFirstVisitRows = [],
  embedded = false,
  activeTrack: controlledTrack,
  onTrackChange,
  selectedMonth: controlledMonth,
  onMonthChange,
  availableMonths: controlledMonths,
  totalAllRowsCount,
}: FirstVisitAnalyticsViewProps) {
  const [internalTrack, setInternalTrack] = useState<FirstVisitTrack>("insurance");
  const track = controlledTrack ?? internalTrack;

  const setTrack = (next: FirstVisitTrack) => {
    setInternalTrack(next);
    onTrackChange?.(next);
  };

  const [internalMonth, setInternalMonth] = useState<string>("all");
  const activeMonth = controlledMonth ?? internalMonth;
  const handleMonthSelect = (m: string) => {
    setInternalMonth(m);
    onMonthChange?.(m);
  };

  // 단독 사용 시 내부에서 월 목록 및 필터링 자동 처리
  const derivedMonths = useMemo<MonthScopeOption[]>(() => {
    if (controlledMonths) return controlledMonths;
    const map = new Map<string, number>();
    for (const r of existingFirstVisitRows) {
      const iso = r.visitDateISO || r.firstVisitISO || "";
      if (iso.length >= 7) {
        const ym = iso.slice(0, 7);
        map.set(ym, (map.get(ym) || 0) + 1);
      }
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([ym, count]) => {
        const [y, m] = ym.split("-");
        return { month: ym, label: `${y}년 ${Number(m)}월`, count };
      });
  }, [controlledMonths, existingFirstVisitRows]);

  const scopedRows = useMemo(() => {
    if (controlledMonths !== undefined) {
      // 상위(page.tsx)에서 이미 월 필터링된 rows를 전달한 경우 그대로 사용
      return existingFirstVisitRows;
    }
    if (activeMonth === "all") return existingFirstVisitRows;
    return existingFirstVisitRows.filter((r) => {
      const iso = r.visitDateISO || r.firstVisitISO || "";
      return iso.startsWith(activeMonth);
    });
  }, [controlledMonths, existingFirstVisitRows, activeMonth]);

  const allCount = totalAllRowsCount ?? existingFirstVisitRows.length;

  const [demographic, setDemographic] = useState<DemographicData>(DEFAULT_DEMOGRAPHIC);
  const [presets, setPresets] = useState<RegionPresetOption[]>([]);
  const [locating, setLocating] = useState(false);

  const [addressQuery, setAddressQuery] = useState("");
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);

  // 보험(원장) 성별 직접 입력 보조 상태 (시트 미기재 시 즉시 보정 가능)
  const [genderOverride, setGenderOverride] = useState<{
    male: number | null;
    female: number | null;
  }>({ male: null, female: null });

  // 보험(원장) 1회 평균 객단가 직접 입력 상태 (비급여 제외 · 본부금 + 공단청구, 만원 단위)
  const [insuranceFeeInput, setInsuranceFeeInput] = useState<string>(
    String(DEFAULT_INSURANCE_AVG_FEE_MANWON)
  );
  const [customInsuranceFee, setCustomInsuranceFee] = useState<number | null>(null);

  // 추나(3회 기준) & 급여 첩약(40일분) 시뮬레이션 세부설정 (기본: 최대치 복잡추나 50% + 급여첩약 10%)
  const [simSettings, setSimSettings] = useState<InsuranceSimulationSettings>(
    DEFAULT_INSURANCE_SIM_SETTINGS
  );

  // 아이콘(ⓘ) 클릭 시 열리는 상세 설명 모달 상태
  const [activeModal, setActiveModal] = useState<ModalPayload | null>(null);

  // 성별 수동 보정값 & 보험 평균 객단가 & 시뮬레이션 세부설정 로컬 저장소 복원
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem("barun_fv_gender_override");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (typeof parsed.male === "number" || typeof parsed.female === "number")) {
          setGenderOverride({
            male: typeof parsed.male === "number" ? parsed.male : null,
            female: typeof parsed.female === "number" ? parsed.female : null,
          });
        }
      }
      const savedFee = localStorage.getItem("barun_fv_insurance_avg_fee");
      if (savedFee) {
        const num = parseFloat(savedFee);
        if (!isNaN(num) && num > 0 && num <= 100) {
          setCustomInsuranceFee(num);
          setInsuranceFeeInput(String(num));
        }
      }
      const savedSim = localStorage.getItem("barun_fv_insurance_sim_settings");
      if (savedSim) {
        const parsedSim = JSON.parse(savedSim);
        if (parsedSim && typeof parsedSim === "object") {
          setSimSettings((prev) => ({
            ...prev,
            ...(parsedSim.chunaType === "complex" || parsedSim.chunaType === "simple"
              ? { chunaType: parsedSim.chunaType }
              : {}),
            ...(parsedSim.chunaTargetPct === 10 ||
            parsedSim.chunaTargetPct === 30 ||
            parsedSim.chunaTargetPct === 50
              ? { chunaTargetPct: parsedSim.chunaTargetPct }
              : {}),
            ...(typeof parsedSim.includeChunaInTotal === "boolean"
              ? { includeChunaInTotal: parsedSim.includeChunaInTotal }
              : {}),
            ...(parsedSim.herbal40TargetPct === 5 ||
            parsedSim.herbal40TargetPct === 8 ||
            parsedSim.herbal40TargetPct === 10
              ? { herbal40TargetPct: parsedSim.herbal40TargetPct }
              : {}),
            ...(typeof parsedSim.includeHerbal40InTotal === "boolean"
              ? { includeHerbal40InTotal: parsedSim.includeHerbal40InTotal }
              : {}),
          }));
        }
      }
    } catch {}
  }, []);

  const updateSimSettings = (patch: Partial<InsuranceSimulationSettings>) => {
    setSimSettings((prev) => {
      const next = { ...prev, ...patch };
      if (typeof window !== "undefined") {
        localStorage.setItem("barun_fv_insurance_sim_settings", JSON.stringify(next));
      }
      return next;
    });
  };

  const resetSimSettingsToMax = () => {
    setSimSettings(DEFAULT_INSURANCE_SIM_SETTINGS);
    if (typeof window !== "undefined") {
      localStorage.removeItem("barun_fv_insurance_sim_settings");
    }
    toast.success("기본 최대치(복잡추나 50% · 급여첩약 10%)로 복원되었습니다.");
  };

  const handleInsuranceFeeChange = (raw: string) => {
    setInsuranceFeeInput(raw);
    const trimmed = raw.trim();
    if (trimmed === "") {
      setCustomInsuranceFee(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem("barun_fv_insurance_avg_fee");
      }
      return;
    }
    const num = parseFloat(trimmed);
    if (!isNaN(num) && num > 0 && num <= 100) {
      setCustomInsuranceFee(num);
      if (typeof window !== "undefined") {
        localStorage.setItem("barun_fv_insurance_avg_fee", String(num));
      }
    }
  };

  const resetInsuranceFee = () => {
    setCustomInsuranceFee(null);
    setInsuranceFeeInput(String(DEFAULT_INSURANCE_AVG_FEE_MANWON));
    if (typeof window !== "undefined") {
      localStorage.removeItem("barun_fv_insurance_avg_fee");
    }
    toast.success(`기본 보험 객단가(${DEFAULT_INSURANCE_AVG_FEE_MANWON}만 원)로 복원되었습니다.`);
  };

  const updateGenderInput = (field: "male" | "female", raw: string) => {
    const trimmed = raw.trim();
    const val = trimmed === "" ? null : Math.max(0, parseInt(trimmed, 10) || 0);
    setGenderOverride((prev) => {
      const next = { ...prev, [field]: val };
      if (typeof window !== "undefined") {
        localStorage.setItem("barun_fv_gender_override", JSON.stringify(next));
      }
      return next;
    });
  };

  const resetGenderInput = () => {
    setGenderOverride({ male: null, female: null });
    if (typeof window !== "undefined") {
      localStorage.removeItem("barun_fv_gender_override");
    }
    toast.success("시트 성별 기입값 기준으로 복원되었습니다.");
  };

  // 행정동 프리셋 목록 로드
  useEffect(() => {
    fetch("/api/sgis/demographics?list=1")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.presets)) setPresets(data.presets);
      })
      .catch(() => {});
  }, []);

  // 6개월(반기) 백그라운드 자동 갱신
  useEffect(() => {
    const checkSemiAnnualUpdate = async () => {
      try {
        const lastSyncStr =
          typeof window !== "undefined" ? localStorage.getItem("barun_sgis_last_sync") : null;
        const now = Date.now();
        const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000;
        if (!lastSyncStr || now - parseInt(lastSyncStr, 10) > SIX_MONTHS_MS) {
          const res = await fetch(`/api/sgis/demographics?code=${demographic.regionCode}`);
          if (res.ok) {
            const freshData: DemographicData = await res.json();
            setDemographic(freshData);
            if (typeof window !== "undefined") {
              localStorage.setItem("barun_sgis_last_sync", now.toString());
            }
          }
        }
      } catch {}
    };
    checkSemiAnnualUpdate();
  }, [demographic.regionCode]);

  const handleDetectLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("위치 정보를 지원하지 않습니다. 주소를 직접 검색해 주세요.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(`/api/sgis/demographics?lat=${latitude}&lng=${longitude}`);
          if (!res.ok) throw new Error("인구 조회 실패");
          const data: DemographicData = await res.json();
          setDemographic(data);
          toast.success(`${data.regionName} 인구 반영 완료`);
        } catch {
          toast.error("인구 조회 중 오류가 발생했습니다.");
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        toast("위치 권한이 거부되었습니다. 주소 검색창을 이용해 주세요.");
      },
      { timeout: 8000, enableHighAccuracy: false }
    );
  };

  const handleSearchAddress = async (
    targetQuery?: string,
    extra?: { sido?: string; sigungu?: string; bname?: string }
  ) => {
    const q = (targetQuery ?? addressQuery).trim();
    if (!q) {
      toast("주소나 동 이름을 입력해 주세요.");
      return;
    }
    setIsSearchingAddress(true);
    const toastId = toast.loading(`"${q}" 인구 조회 중...`);
    try {
      const qs = new URLSearchParams({ query: q });
      if (extra?.sido) qs.set("sido", extra.sido);
      if (extra?.sigungu) qs.set("sigungu", extra.sigungu);
      if (extra?.bname) qs.set("bname", extra.bname);

      const res = await fetch(`/api/sgis/demographics?${qs.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "지역을 찾을 수 없습니다.");
      setDemographic(data as DemographicData);
      toast.success(`${data.regionName} (${data.totalPopulation.toLocaleString()}명)`, { id: toastId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "주소를 다시 확인해 주세요.", { id: toastId });
    } finally {
      setIsSearchingAddress(false);
    }
  };

  const openDaumPostcode = () => {
    const scriptId = "daum-postcode-script";
    const execute = () => {
      if (typeof window !== "undefined" && (window as any).daum?.Postcode) {
        new (window as any).daum.Postcode({
          oncomplete: (data: any) => {
            const addr =
              data.roadAddress || data.address || `${data.sido} ${data.sigungu} ${data.bname}`;
            setAddressQuery(addr);
            handleSearchAddress(addr, {
              sido: data.sido || "",
              sigungu: data.sigungu || "",
              bname: data.bname || data.bname2 || "",
            });
          },
        }).open();
      }
    };
    if (typeof window !== "undefined" && !document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
      script.onload = execute;
      document.body.appendChild(script);
    } else {
      execute();
    }
  };

  const handlePresetChange = async (code: string) => {
    if (!code) return;
    try {
      const res = await fetch(`/api/sgis/demographics?code=${code}`);
      if (!res.ok) return;
      const data: DemographicData = await res.json();
      setDemographic(data);
      toast.success(`${data.regionName} 적용 완료`);
    } catch {}
  };

  // 2트랙 정밀 계산 (선택된 전체/월별 범위 + 입력한 보험 평균 객단가 + 추나/첩약 세부설정 기준)
  const evaluation = useMemo(
    () =>
      evaluateDualTrackStats(
        scopedRows,
        demographic,
        genderOverride,
        customInsuranceFee,
        simSettings
      ),
    [scopedRows, demographic, genderOverride, customInsuranceFee, simSettings]
  );

  const sim = evaluation.insuranceSimulation;

  const currentSummary = track === "insurance" ? evaluation.insurance : evaluation.nonCovered;

  const chartData = useMemo(
    () =>
      currentSummary.indicators.map((ind) => ({
        name: ind.title,
        현재: ind.currentValue,
        기준점: ind.targetValue,
      })),
    [currentSummary]
  );

  const hasGenderOverride = genderOverride.male !== null || genderOverride.female !== null;

  return (
    <div
      className={
        embedded
          ? "bg-[#FAFAFA] text-[#111111] rounded-[28px] p-5 md:p-7 border border-[#E5E5E5] select-text"
          : "min-h-screen bg-[#FAFAFA] text-[#111111] px-6 py-8 select-text"
      }
    >
      <div className="max-w-6xl mx-auto space-y-5">
        {/* 1. 최상단 2대 핵심 메뉴 스위치 [보험(원장)] vs [비급여(실장)] + 컴팩트 주소 검색 */}
        <div className="bg-white border border-[#E5E5E5] rounded-2xl p-4 md:p-5 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
            {/* 좌측: 2대 기준 메뉴 + 전체/월별 범위 선택 */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex p-1 rounded-xl bg-[#F2F2F2] border border-[#E5E5E5]">
                <button
                  type="button"
                  onClick={() => setTrack("insurance")}
                  className={`px-4 md:px-5 py-2.5 rounded-lg text-xs md:text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
                    track === "insurance"
                      ? "bg-[#0F5132] text-white shadow-sm"
                      : "text-[#555555] hover:text-[#111111]"
                  }`}
                >
                  <span>보험 (원장)</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-extrabold ${
                      track === "insurance"
                        ? "bg-white/20 text-[#F3D899]"
                        : "bg-black/5 text-[#666666]"
                    }`}
                  >
                    내원경로까지
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setTrack("non_covered")}
                  className={`px-4 md:px-5 py-2.5 rounded-lg text-xs md:text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
                    track === "non_covered"
                      ? "bg-[#111111] text-[#D4AF37] shadow-sm"
                      : "text-[#555555] hover:text-[#111111]"
                  }`}
                >
                  <span>비급여 (실장)</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-extrabold ${
                      track === "non_covered"
                        ? "bg-[#D4AF37]/20 text-[#D4AF37]"
                        : "bg-black/5 text-[#666666]"
                    }`}
                  >
                    패키지·한약·결제
                  </span>
                </button>
              </div>

              {/* 통계 기간 스위치: 전체 누적 vs 월별 선택 */}
              <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FBF7EE] border border-[#D4AF37]">
                <Calendar size={13} className="text-[#8C6B2D] shrink-0" />
                <select
                  value={activeMonth}
                  onChange={(e) => handleMonthSelect(e.target.value)}
                  className="bg-transparent text-xs font-extrabold text-[#111111] focus:outline-none cursor-pointer"
                  title="전체 누적 또는 월별 통계 선택"
                >
                  <option value="all">전체 기간 ({allCount}명)</option>
                  {derivedMonths.map((m) => (
                    <option key={m.month} value={m.month}>
                      {m.label} ({m.count}명)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 심플 주소 검색 바 */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex items-center min-w-[220px] sm:min-w-[260px]">
                <Search size={13} className="absolute left-3 text-[#737373] pointer-events-none" />
                <input
                  type="text"
                  value={addressQuery}
                  onChange={(e) => setAddressQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearchAddress()}
                  placeholder="동·도로명 검색 (예: 비래동)"
                  className="w-full pl-8 pr-12 py-2 rounded-xl bg-[#FAFAFA] border border-[#D4D4D4] text-xs font-semibold text-[#111111] placeholder:text-[#999999] focus:outline-none focus:border-[#B8924A]"
                />
                <button
                  type="button"
                  onClick={() => handleSearchAddress()}
                  disabled={isSearchingAddress}
                  className="absolute right-1 px-2.5 py-1 rounded-lg bg-[#111111] text-white text-[11px] font-bold cursor-pointer disabled:opacity-50"
                >
                  {isSearchingAddress ? ".." : "검색"}
                </button>
              </div>

              <button
                type="button"
                onClick={openDaumPostcode}
                className="px-3 py-2 rounded-xl bg-[#FBF7EE] hover:bg-[#F5ECD7] border border-[#D4AF37] text-[#7A5B1F] text-xs font-bold cursor-pointer"
              >
                주소 찾기
              </button>

              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={locating}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#0F5132] hover:bg-[#0B3D26] text-white text-xs font-bold cursor-pointer disabled:opacity-60"
              >
                <MapPin size={12} className="text-[#D4AF37]" />
                <span>{locating ? ".." : "GPS"}</span>
              </button>

              <select
                value={demographic.regionCode}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="px-2.5 py-2 rounded-xl bg-white border border-[#D4D4D4] text-xs font-semibold text-[#111111] max-w-[180px] truncate cursor-pointer"
              >
                <option value={demographic.regionCode}>{demographic.regionName}</option>
                {presets.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name} ({p.totalPopulation.toLocaleString()}명)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 1줄 배후 인구 핵심 요약 바 + ⓘ 아이콘 */}
          <div className="pt-3 border-t border-[#F0F0F0] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="font-extrabold text-[#111111]">{demographic.regionName}</span>
              <span className="text-[#0F5132] font-extrabold">
                인구 {demographic.totalPopulation.toLocaleString()}명
              </span>
              <span className="text-[#666666]">고령 {demographic.seniorRatio}%</span>
              <span className="text-[#666666]">여성 {demographic.femaleRatio}%</span>
              <span className="px-2 py-0.5 rounded-md bg-[#F4F8F5] text-[#0F5132] font-bold text-[11px]">
                {evaluation.districtType}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-[#737373]">
              <span>{demographic.censusBaseDate}</span>
              <button
                type="button"
                onClick={() => setActiveModal({ kind: "demographic" })}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F5F5F5] hover:bg-[#EAEAEA] text-[#111111] font-bold transition cursor-pointer"
                title="상권 기준점 설명 보기"
              >
                <Info size={12} className="text-[#B8924A]" />
                <span>상권기준</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2. 초심플 핵심 결론 3단 배너 (등급 · 이번주 1미션 · 잠재 매출효과) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
          {/* 달성 등급 */}
          <div className="md:col-span-3 bg-[#111111] text-white rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#D4AF37] flex items-center gap-1">
                <Crown size={13} /> {currentSummary.label} 등급
              </span>
              <span className="text-[11px] text-white/60">
                정상 {currentSummary.healthyCount}/{currentSummary.indicators.length}
              </span>
            </div>
            <div className="my-1.5 flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tight">{currentSummary.score}점</span>
              <span className="text-xs font-extrabold text-[#D4AF37]">{currentSummary.tier}</span>
            </div>
            <p className="text-[11px] text-white/65 truncate">{currentSummary.nextTierGapText}</p>
          </div>

          {/* 이번 주 딱 1가지 핵심 미션 */}
          <div className="md:col-span-6 bg-white border border-[#E5E5E5] rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-[#0F5132] flex items-center gap-1">
                <Target size={13} /> 최우선 목표 지시
              </span>
              <button
                type="button"
                onClick={() => setActiveModal({ kind: "mission" })}
                className="p-1 rounded-lg hover:bg-[#F5F5F5] text-[#737373] hover:text-[#111111] transition cursor-pointer"
                title="실행 지시 상세 보기"
              >
                <Info size={15} className="text-[#B8924A]" />
              </button>
            </div>
            <p className="text-base md:text-lg font-black text-[#111111] my-1.5 truncate">
              {currentSummary.focusMission}
            </p>
            <div className="flex items-center gap-2 text-[11px] text-[#737373]">
              <span>
                {activeMonth === "all"
                  ? `전체 ${scopedRows.length}명 연동`
                  : `${derivedMonths.find((m) => m.month === activeMonth)?.label || activeMonth} ${scopedRows.length}명 연동`}
              </span>
              <span>·</span>
              <span className="text-[#B8924A] font-bold">우측 ⓘ 클릭 시 실행 멘트 안내</span>
            </div>
          </div>

          {/* 기준점 도달 시 기대 효과 */}
          <div className="md:col-span-3 bg-[#FBF7EE] border border-[#E6D5B3] rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-[#8C6B2D] flex items-center gap-1">
                <TrendingUp size={13} /> 목표 도달 기대효과
              </span>
              <button
                type="button"
                onClick={() => setActiveModal({ kind: "revenue" })}
                className="p-1 rounded-lg hover:bg-[#F3E9D2] text-[#8C6B2D] transition cursor-pointer"
                title="잠재 매출 산출 근거 보기"
              >
                <Info size={15} />
              </button>
            </div>
            <div className="my-1.5">
              <span className="text-2xl font-black text-[#111111]">
                {scopedRows.length === 0
                  ? "데이터 대기"
                  : currentSummary.potentialMonthlyGainManwon > 0
                  ? `+월 ${currentSummary.potentialMonthlyGainManwon.toLocaleString()}만 원`
                  : "기준점 달성 완료"}
              </span>
            </div>
            {track === "insurance" ? (
              <div className="pt-1.5 border-t border-[#E6D5B3]/70 space-y-1">
                <div className="flex items-center justify-between gap-1.5 text-[11px]">
                  <span className="font-extrabold text-[#7A5B1F] shrink-0">보험 객단가</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      max="50"
                      value={insuranceFeeInput}
                      onChange={(e) => handleInsuranceFeeChange(e.target.value)}
                      className="w-14 px-1.5 py-0.5 rounded-md border border-[#D4AF37] bg-white text-right font-black text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#0F5132]"
                      title="비급여 제외 · 보험 1회 평균 진료비(본인부담금+공단청구액) 만원 단위"
                    />
                    <span className="font-bold text-[#7A5B1F]">만원</span>
                    {customInsuranceFee !== null && (
                      <button
                        type="button"
                        onClick={resetInsuranceFee}
                        title={`기본값(${DEFAULT_INSURANCE_AVG_FEE_MANWON}만원)으로 복원`}
                        className="p-0.5 rounded hover:bg-[#F3E9D2] text-[#8C6B2D] cursor-pointer"
                      >
                        <RotateCcw size={11} />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-[#7A5B1F]/85 font-semibold truncate">
                  본부금+청구 · 2·3차{sim.settings.includeChunaInTotal ? `+${sim.chunaLabel}${sim.settings.chunaTargetPct}%` : ""}{sim.settings.includeHerbal40InTotal ? `+첩약${sim.settings.herbal40TargetPct}%` : ""} (ⓘ 세부설정)
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-[#7A5B1F] font-semibold truncate">
                비급여·한약·패키지 중복제외 추정
              </p>
            )}
          </div>
        </div>

        {/* 3. 핵심 지표 카드 그리드 (글자 최소화 · 결론 집중 · ⓘ 아이콘 상세 안내) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {currentSummary.indicators.map((ind) => {
            const isHealthy = ind.status === "HEALTHY";
            const isWarning = ind.status === "WARNING";
            const isCritical = ind.status === "CRITICAL";

            return (
              <div
                key={ind.id}
                className={`bg-white rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                  isHealthy
                    ? "border-[#E5E5E5]"
                    : isWarning
                    ? "border-[#D4AF37]"
                    : isCritical
                    ? "border-[#111111] shadow-sm"
                    : "border-dashed border-[#D4D4D4]"
                }`}
              >
                {/* 상단: 제목 + 상태 배지 + ⓘ 아이콘 */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-extrabold text-[#111111] truncate">
                        {ind.title}
                      </span>
                      {ind.subMetric && (
                        <span className="text-[10px] font-semibold text-[#737373] shrink-0">
                          {ind.subMetric}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isHealthy ? (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#0F5132] text-[10px] font-extrabold">
                          <CheckCircle2 size={11} /> 정상
                        </span>
                      ) : isWarning ? (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#FBF7EE] text-[#8C6B2D] text-[10px] font-extrabold">
                          <AlertTriangle size={11} /> 주의
                        </span>
                      ) : isCritical ? (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#111111] text-[#D4AF37] text-[10px] font-extrabold">
                          <ShieldAlert size={11} /> 미달
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-[#F5F5F5] text-[#737373] text-[10px] font-bold">
                          대기
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => setActiveModal({ kind: "indicator", item: ind })}
                        className="w-6 h-6 rounded-full bg-[#F5F5F5] hover:bg-[#111111] text-[#555555] hover:text-[#D4AF37] flex items-center justify-center transition-colors cursor-pointer"
                        title="기준점 근거 및 실행 지시 보기"
                      >
                        <Info size={13} />
                      </button>
                    </div>
                  </div>

                  {/* 중앙: 핵심 수치 vs 권장 기준점 */}
                  <div className="flex items-baseline justify-between gap-2 mb-2.5">
                    <span className="text-3xl font-black tracking-tight text-[#111111]">
                      {ind.valueDisplay}
                    </span>
                    <div className="text-right">
                      <span className="text-[11px] font-bold text-[#666666] block">
                        {ind.targetDisplay}
                      </span>
                      <span
                        className={`text-[11px] font-extrabold ${
                          isHealthy
                            ? "text-[#0F5132]"
                            : isCritical
                            ? "text-[#111111]"
                            : "text-[#B8924A]"
                        }`}
                      >
                        {ind.gapDisplay}
                      </span>
                    </div>
                  </div>

                  {/* 미니 프로그레스 바 */}
                  <div className="h-1.5 w-full bg-[#F0F0F0] rounded-full overflow-hidden mb-3">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isHealthy
                          ? "bg-[#0F5132]"
                          : isWarning
                          ? "bg-[#C5A059]"
                          : isCritical
                          ? "bg-[#111111]"
                          : "bg-[#D4D4D4]"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(4, ind.currentValue))}%` }}
                    />
                  </div>
                </div>

                {/* 보험(원장) 전용: 성별 입력란 */}
                {ind.isGenderCard && (
                  <div className="mb-2.5 px-2.5 py-2 rounded-xl bg-[#FAFAFA] border border-[#EAEAEA] flex items-center justify-between gap-2 text-[11px]">
                    <span className="font-bold text-[#555555] shrink-0">성별 입력</span>
                    <div className="flex items-center gap-1.5">
                      <label className="inline-flex items-center gap-1">
                        <span className="text-[#666666] font-semibold">남</span>
                        <input
                          type="number"
                          min={0}
                          value={genderOverride.male ?? evaluation.recordedMale}
                          onChange={(e) => updateGenderInput("male", e.target.value)}
                          className="w-12 px-1.5 py-0.5 rounded border border-[#D4D4D4] bg-white text-center font-extrabold text-[#111111] focus:outline-none focus:border-[#0F5132]"
                        />
                      </label>
                      <label className="inline-flex items-center gap-1">
                        <span className="text-[#666666] font-semibold">여</span>
                        <input
                          type="number"
                          min={0}
                          value={genderOverride.female ?? evaluation.recordedFemale}
                          onChange={(e) => updateGenderInput("female", e.target.value)}
                          className="w-12 px-1.5 py-0.5 rounded border border-[#D4D4D4] bg-white text-center font-extrabold text-[#111111] focus:outline-none focus:border-[#0F5132]"
                        />
                      </label>
                      {hasGenderOverride && (
                        <button
                          type="button"
                          onClick={resetGenderInput}
                          title="시트 자동 집계로 초기화"
                          className="p-1 rounded hover:bg-[#EAEAEA] text-[#737373] cursor-pointer"
                        >
                          <RotateCcw size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* 하단: 딱 1줄 핵심 결론 */}
                <div
                  className={`px-3 py-2 rounded-xl text-xs font-extrabold truncate ${
                    isHealthy
                      ? "bg-[#F4F8F5] text-[#0F5132]"
                      : isCritical
                      ? "bg-[#111111] text-[#D4AF37]"
                      : "bg-[#FBF7EE] text-[#7A5B1F]"
                  }`}
                >
                  → {ind.conclusion}
                </div>
              </div>
            );
          })}
        </div>

        {/* 3-B. 보험(원장) 전용: 입력 질환별 삼진율(3회 내원율) 통합 진단 보드 */}
        {track === "insurance" && (
          <div className="bg-white border border-[#E5E5E5] rounded-2xl p-5 shadow-sm space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-[#111111]">
                  입력 질환별 삼진율 (3회 내원율)
                </span>
                <span className="px-2 py-0.5 rounded-md bg-[#F4F8F5] text-[#0F5132] text-[10px] font-extrabold">
                  목표 70%↑
                </span>
                {evaluation.bodyPartRetention.length > 0 && (
                  <span className="text-[11px] font-bold text-[#737373]">
                    {evaluation.bodyPartRetention.length}개 질환 자동분류
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-[11px] font-bold">
                <span className="inline-flex items-center gap-1 text-[#0F5132]">
                  <span className="w-2 h-2 rounded-full bg-[#0F5132]" /> 강점 (70%↑)
                </span>
                <span className="inline-flex items-center gap-1 text-[#B8924A]">
                  <span className="w-2 h-2 rounded-full bg-[#C5A059]" /> 보완 (50~69%)
                </span>
                <span className="inline-flex items-center gap-1 text-[#111111]">
                  <span className="w-2 h-2 rounded-full bg-[#111111]" /> 이탈주의 (&lt;50%)
                </span>
              </div>
            </div>

            {evaluation.bodyPartRetention.length > 0 ? (
              <>
                {/* 잘 잡는 질환 vs 놓치는 질환 핵심 1줄 요약 칩 (클릭 시 처방 모달) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div className="px-3 py-2 rounded-xl bg-[#F4F8F5] border border-[#C6DFCE] flex flex-wrap items-center gap-1.5">
                    <span className="font-extrabold text-[#0F5132] shrink-0">잘 잡는 질환:</span>
                    {evaluation.bodyPartRetention.filter(
                      (p) => p.patients >= MIN_BODYPART_SAMPLE && p.thirdRate >= 70 && !p.isConsultOnly
                    ).length > 0 ? (
                      evaluation.bodyPartRetention
                        .filter(
                          (p) => p.patients >= MIN_BODYPART_SAMPLE && p.thirdRate >= 70 && !p.isConsultOnly
                        )
                        .map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setActiveModal({ kind: "bodyPart", part: p })}
                            className="px-2 py-0.5 rounded-md bg-white border border-[#C6DFCE] text-[#0F5132] font-extrabold text-[11px] hover:bg-[#0F5132] hover:text-white transition cursor-pointer"
                          >
                            {p.label} {p.thirdRate}%
                          </button>
                        ))
                    ) : (
                      <span className="text-[#555555] text-[11px] font-semibold">
                        5명↑ 누적된 70% 달성 부위 대기
                      </span>
                    )}
                  </div>

                  <div className="px-3 py-2 rounded-xl bg-[#FBF7EE] border border-[#E6D5B3] flex flex-wrap items-center gap-1.5">
                    <span className="font-extrabold text-[#7A5B1F] shrink-0">놓치는 질환:</span>
                    {evaluation.bodyPartRetention.filter(
                      (p) => p.patients >= MIN_BODYPART_SAMPLE && p.thirdRate < 70 && !p.isConsultOnly
                    ).length > 0 ? (
                      evaluation.bodyPartRetention
                        .filter(
                          (p) => p.patients >= MIN_BODYPART_SAMPLE && p.thirdRate < 70 && !p.isConsultOnly
                        )
                        .sort((a, b) => a.thirdRate - b.thirdRate)
                        .map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setActiveModal({ kind: "bodyPart", part: p })}
                            className="px-2 py-0.5 rounded-md bg-[#111111] text-[#D4AF37] font-extrabold text-[11px] hover:opacity-85 transition cursor-pointer"
                          >
                            {p.label} {p.thirdRate}%
                          </button>
                        ))
                    ) : (
                      <span className="text-[#0F5132] text-[11px] font-extrabold">
                        {evaluation.bodyPartRetention.some(
                          (p) => p.patients >= MIN_BODYPART_SAMPLE && !p.isConsultOnly
                        )
                          ? "전 판정 부위 70%↑ 안정 유지"
                          : `표본 ${MIN_BODYPART_SAMPLE}명 미만 부위 누적 중`}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {evaluation.bodyPartRetention.map((part) => {
                    const isLowSample = part.patients < MIN_BODYPART_SAMPLE || Boolean(part.isConsultOnly);
                    const isGood = !isLowSample && part.thirdRate >= 70;
                    const isCrit = !isLowSample && part.thirdRate < 50;

                    return (
                      <div
                        key={part.id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          isLowSample
                            ? "bg-[#FAFAFA] border-dashed border-[#D4D4D4]"
                            : isGood
                            ? "bg-[#FAFAFA] border-[#E5E5E5]"
                            : isCrit
                            ? "bg-white border-[#111111]"
                            : "bg-white border-[#E6D5B3]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-extrabold text-[#111111] truncate">
                              {part.label}
                            </span>
                            <span className="text-[10px] font-semibold text-[#737373] shrink-0">
                              {part.patients}명 · 2차 {part.secondRate}%
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-sm font-black text-[#111111]">
                              {part.thirdRate}%
                            </span>
                            <span className="text-[10px] text-[#737373] font-semibold">
                              ({part.thirdCount}/{part.patients})
                            </span>
                            {part.isConsultOnly ? (
                              <span className="px-1.5 py-0.5 rounded bg-[#F5F5F5] text-[#666666] text-[10px] font-bold">
                                첩약군
                              </span>
                            ) : part.patients < MIN_BODYPART_SAMPLE ? (
                              <span className="px-1.5 py-0.5 rounded bg-[#F0F0F0] text-[#666666] text-[10px] font-bold">
                                누적중 ({part.patients}/{MIN_BODYPART_SAMPLE}명)
                              </span>
                            ) : isGood ? (
                              <span className="px-1.5 py-0.5 rounded bg-[#ECFDF5] text-[#0F5132] text-[10px] font-extrabold">
                                강점
                              </span>
                            ) : isCrit ? (
                              <span className="px-1.5 py-0.5 rounded bg-[#111111] text-[#D4AF37] text-[10px] font-extrabold">
                                이탈
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-[#FBF7EE] text-[#8C6B2D] text-[10px] font-extrabold">
                                보완
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => setActiveModal({ kind: "bodyPart", part })}
                              className="w-5 h-5 rounded-full bg-[#F2F2F2] hover:bg-[#111111] text-[#555555] hover:text-[#D4AF37] flex items-center justify-center transition-colors cursor-pointer"
                              title={`${part.label} 삼진율 처방 보기`}
                            >
                              <Info size={11} />
                            </button>
                          </div>
                        </div>

                        {/* 70% 기준선이 표시된 심플 바 */}
                        <div className="relative h-1.5 w-full bg-[#EAEAEA] rounded-full overflow-hidden">
                          <div
                            className="absolute top-0 bottom-0 w-[1.5px] bg-[#111111]/35 z-10"
                            style={{ left: "70%" }}
                            title="기준점 70%"
                          />
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isGood
                                ? "bg-[#0F5132]"
                                : isCrit
                                ? "bg-[#111111]"
                                : "bg-[#C5A059]"
                            }`}
                            style={{ width: `${Math.min(100, Math.max(3, part.thirdRate))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="p-3.5 rounded-xl bg-[#FAFAFA] border border-dashed border-[#D4D4D4] text-xs text-[#666666]">
                시트의 &apos;환자 진료 내역&apos;란에 질환·증상을 입력하면 고정 틀 없이 입력된 질환별로 인원과 삼진율이 자동 분류됩니다.
              </div>
            )}
          </div>
        )}

        {/* 4. 현재 수치 vs 권장 기준점 한눈에 비교 차트 (심플) */}
        <div className="bg-white border border-[#E5E5E5] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-extrabold text-[#111111]">
              {currentSummary.label} 지표 vs 권장 기준점
            </span>
            <div className="flex items-center gap-3 text-[11px] font-bold">
              <span className="inline-flex items-center gap-1 text-[#0F5132]">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#0F5132]" /> 현재 수치
              </span>
              <span className="inline-flex items-center gap-1 text-[#B8924A]">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#C5A059]" /> 권장 기준점
              </span>
            </div>
          </div>
          <div className="w-full h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 6, right: 12, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#111111", fontSize: 11, fontWeight: 700 }}
                  axisLine={{ stroke: "#E5E5E5" }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: "#888888", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#111111",
                    border: "1px solid #C5A059",
                    borderRadius: "10px",
                    color: "#FFFFFF",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="현재" fill="#0F5132" radius={[5, 5, 0, 0]} maxBarSize={28} />
                <Bar dataKey="기준점" fill="#C5A059" radius={[5, 5, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* ⓘ 아이콘 클릭 시 열리는 상세 설명 모달 (화이트 · 블랙 · 골드 · 그린) */}
      {/* ===================================================================== */}
      {activeModal && (
        <div
          className="fixed inset-0 z-[120] bg-black/55 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="bg-white text-[#111111] w-full max-w-lg rounded-3xl border border-[#E5E5E5] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="bg-[#111111] text-white px-6 py-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold tracking-widest uppercase text-[#D4AF37] block">
                  {activeModal.kind === "indicator"
                    ? `${activeModal.item.track === "insurance" ? "보험 (원장)" : "비급여 (실장)"} 기준점 가이드`
                    : activeModal.kind === "bodyPart"
                    ? "보험 (원장) 질환별 삼진율 처방"
                    : activeModal.kind === "demographic"
                    ? "동네 배후 인구 & 상권 기준"
                    : activeModal.kind === "mission"
                    ? "최우선 목표 실행 가이드"
                    : activeModal.kind === "chunaSim"
                    ? "추나 3회 정착 매출 · 세부설정"
                    : activeModal.kind === "herbalSim"
                    ? "급여 첩약 (40일분) · 세부설정"
                    : "목표 도달 기대효과 · 세부설정"}
                </span>
                <h3 className="text-base font-black mt-0.5">
                  {activeModal.kind === "indicator"
                    ? activeModal.item.title
                    : activeModal.kind === "bodyPart"
                    ? `${activeModal.part.label} — 삼진율 ${activeModal.part.thirdRate}%`
                    : activeModal.kind === "demographic"
                    ? demographic.regionName
                    : activeModal.kind === "mission"
                    ? currentSummary.focusMission
                    : activeModal.kind === "chunaSim"
                    ? `${sim.chunaLabel} ${sim.settings.chunaTargetPct}% (3회 기준 +${sim.chunaGainManwon.toLocaleString()}만 원)`
                    : activeModal.kind === "herbalSim"
                    ? `급여 첩약 40일분 ${sim.settings.herbal40TargetPct}% (+${sim.herbal40GainManwon.toLocaleString()}만 원)`
                    : `월 +${currentSummary.potentialMonthlyGainManwon.toLocaleString()}만 원 기대효과 산출식`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* 모달 본문 */}
            <div className="p-6 space-y-4 text-xs leading-relaxed max-h-[75vh] overflow-y-auto">
              {activeModal.kind === "indicator" && (
                <>
                  <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-[#FAFAFA] border border-[#EAEAEA]">
                    <div>
                      <span className="text-[#737373] block text-[11px]">현재 수치 / 실측 집계</span>
                      <span className="text-lg font-black text-[#111111]">
                        {activeModal.item.valueDisplay}
                      </span>
                      <span className="text-[11px] text-[#555555] block mt-0.5">
                        {activeModal.item.modal.exactCounts}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[11px] text-[#737373] block">권장 기준점</span>
                      <span className="text-sm font-extrabold text-[#0F5132]">
                        {activeModal.item.targetDisplay}
                      </span>
                      <span className="block text-[11px] font-bold text-[#B8924A]">
                        {activeModal.item.gapDisplay}
                      </span>
                    </div>
                  </div>

                  {/* 진료부위별 삼진율 카드 클릭 시 전체 부위 순위 요약표 제공 */}
                  {activeModal.item.id === "ins_bodypart_3rd" &&
                    evaluation.bodyPartRetention.length > 0 && (
                      <div className="border border-[#EAEAEA] rounded-xl overflow-hidden">
                        <div className="bg-[#FAFAFA] px-3.5 py-2 text-[11px] font-extrabold text-[#111111] flex justify-between border-b border-[#EAEAEA]">
                          <span>입력 질환 (인원)</span>
                          <span>2차 → 삼진율(3회)</span>
                        </div>
                        <div className="divide-y divide-[#F2F2F2]">
                          {evaluation.bodyPartRetention.map((p) => (
                            <div
                              key={p.id}
                              className="px-3.5 py-2 flex items-center justify-between text-[11px]"
                            >
                              <span className="font-bold text-[#111111]">
                                {p.label}{" "}
                                <span className="text-[#737373] font-medium">({p.patients}명)</span>
                              </span>
                              <span
                                className={`font-extrabold ${
                                  p.thirdRate >= 70
                                    ? "text-[#0F5132]"
                                    : p.thirdRate < 50 && p.patients >= 2 && !p.isConsultOnly
                                    ? "text-[#111111]"
                                    : "text-[#8C6B2D]"
                                }`}
                              >
                                2차 {p.secondRate}% → 삼진 {p.thirdRate}% ({p.thirdCount}/{p.patients}명)
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  <div>
                    <h4 className="font-extrabold text-[#111111] mb-1">1. 왜 이 기준점인가?</h4>
                    <p className="text-[#404040]">{activeModal.item.modal.benchmarkReason}</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#FBF7EE] border border-[#E6D5B3]">
                    <h4 className="font-extrabold text-[#7A5B1F] mb-1">2. 기준 미달 시 경영 리스크</h4>
                    <p className="text-[#404040]">{activeModal.item.modal.riskWarning}</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#F4F8F5] border border-[#C6DFCE]">
                    <h4 className="font-extrabold text-[#0F5132] mb-1">3. 목표 도달 실행 지시</h4>
                    <p className="text-[#1F2937] mb-2">{activeModal.item.modal.actionInstruction}</p>
                    <div className="p-2.5 rounded-lg bg-white border border-[#D4E7DA] text-[#0F5132] font-bold">
                      💬 실전 멘트: {activeModal.item.modal.scriptExample}
                    </div>
                  </div>

                  {activeModal.item.modal.formulaNote && (
                    <div className="px-3 py-2 rounded-lg bg-[#FAFAFA] border border-[#EAEAEA] text-[11px] text-[#666666]">
                      <strong className="text-[#111111]">기대효과 산출식:</strong>{" "}
                      {activeModal.item.modal.formulaNote}
                      {activeModal.item.modal.revenueImpactManwon > 0 && (
                        <span className="text-[#0F5132] font-extrabold ml-1">
                          (= +월 {activeModal.item.modal.revenueImpactManwon.toLocaleString()}만 원)
                        </span>
                      )}
                    </div>
                  )}
                </>
              )}

              {activeModal.kind === "bodyPart" && (
                <>
                  <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-[#FAFAFA] border border-[#EAEAEA]">
                    <div>
                      <span className="text-[#737373] block text-[11px]">해당 질환 내원 흐름</span>
                      <span className="text-base font-black text-[#111111]">
                        초진 {activeModal.part.patients}명 → 2회 {activeModal.part.secondCount}명(
                        {activeModal.part.secondRate}%) → 3회 {activeModal.part.thirdCount}명(
                        {activeModal.part.thirdRate}%)
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[11px] text-[#737373] block">목표 70%↑ 기준</span>
                      <span
                        className={`text-sm font-extrabold ${
                          activeModal.part.thirdRate >= 70 ? "text-[#0F5132]" : "text-[#8C6B2D]"
                        }`}
                      >
                        {activeModal.part.neededFor70 === 0
                          ? "강점 질환 달성"
                          : `+${activeModal.part.neededFor70}명 더 완주 필요`}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#FBF7EE] border border-[#E6D5B3]">
                    <h4 className="font-extrabold text-[#7A5B1F] mb-1">
                      1. {activeModal.part.label} 주요 3회 전 이탈 원인
                    </h4>
                    <p className="text-[#404040]">{activeModal.part.dropoutReason}</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#F4F8F5] border border-[#C6DFCE]">
                    <h4 className="font-extrabold text-[#0F5132] mb-1">
                      2. 원장님 맞춤 3회 완주 처방 &amp; 티업 멘트
                    </h4>
                    <p className="text-[#1F2937] mb-2">{activeModal.part.prescriptionGuide}</p>
                    <div className="p-2.5 rounded-lg bg-white border border-[#D4E7DA] text-[#0F5132] font-bold">
                      💬 실전 멘트: {activeModal.part.scriptExample}
                    </div>
                  </div>
                </>
              )}

              {activeModal.kind === "demographic" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-[#FAFAFA] border border-[#EAEAEA]">
                      <span className="text-[#737373] block">행정안전부 총인구</span>
                      <strong className="text-base font-black text-[#0F5132]">
                        {demographic.totalPopulation.toLocaleString()}명
                      </strong>
                    </div>
                    <div className="p-3 rounded-xl bg-[#FAFAFA] border border-[#EAEAEA]">
                      <span className="text-[#737373] block">상권 분류</span>
                      <strong className="text-sm font-black text-[#111111]">
                        {evaluation.districtType}
                      </strong>
                    </div>
                    <div className="p-3 rounded-xl bg-[#FAFAFA] border border-[#EAEAEA]">
                      <span className="text-[#737373] block">동네 65세↑ 고령화율</span>
                      <strong className="text-sm font-black">{demographic.seniorRatio}%</strong>
                    </div>
                    <div className="p-3 rounded-xl bg-[#FAFAFA] border border-[#EAEAEA]">
                      <span className="text-[#737373] block">인구 천명당 신환(MPI)</span>
                      <strong className="text-sm font-black">
                        현재 {evaluation.mpi}명 (권장 {evaluation.mpiTargetRange})
                      </strong>
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#F4F8F5] border border-[#C6DFCE] text-[#1F2937]">
                    <strong className="text-[#0F5132] block mb-1">맞춤 상권 가이드</strong>
                    {evaluation.districtTip}
                  </div>
                </>
              )}

              {activeModal.kind === "mission" && (
                <div className="p-4 rounded-xl bg-[#F4F8F5] border border-[#C6DFCE] space-y-2">
                  <strong className="text-[#0F5132] block text-sm">이번 주 집중 행동 지시</strong>
                  <p className="text-[#1F2937]">{currentSummary.focusMissionReason}</p>
                  <p className="text-[11px] text-[#555555] pt-2 border-t border-[#D4E7DA]">
                    * 한 번에 모든 지표를 고치기보다 가장 파급력이 큰 1가지 목표부터 달성하면 전체 경영 등급이 가장 빠르게 상승합니다.
                  </p>
                </div>
              )}

              {activeModal.kind === "chunaSim" && (
                <div className="space-y-4">
                  {/* 세부설정 컨트롤 */}
                  <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E5E5E5] space-y-3">
                    <div className="flex items-center justify-between">
                      <strong className="text-xs font-extrabold text-[#111111]">
                        1. 추나 청구 유형 선택 (3회 내원 = 초진1 + 재진2 기준)
                      </strong>
                      <button
                        type="button"
                        onClick={resetSimSettingsToMax}
                        className="text-[10px] font-bold text-[#8C6B2D] hover:underline cursor-pointer"
                      >
                        최대치 복원
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {(["complex", "simple"] as ChunaType[]).map((t) => {
                        const spec = CHUNA_FEES[t];
                        const active = sim.settings.chunaType === t;
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => updateSimSettings({ chunaType: t })}
                            className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                              active
                                ? "bg-[#0F5132] text-white border-[#0F5132] shadow-sm"
                                : "bg-white text-[#111111] border-[#D4D4D4] hover:border-[#0F5132]"
                            }`}
                          >
                            <div className="font-black text-xs flex items-center justify-between">
                              <span>{spec.label}</span>
                              {t === "complex" && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${active ? "bg-white/20 text-[#F3D899]" : "bg-[#FBF7EE] text-[#8C6B2D]"}`}>
                                  최대치
                                </span>
                              )}
                            </div>
                            <div className={`text-[10px] mt-1 ${active ? "text-white/85" : "text-[#666666]"}`}>
                              초진 {spec.firstWon.toLocaleString()}원 · 재진 {spec.revisitWon.toLocaleString()}원
                            </div>
                            <div className={`text-[10px] font-bold mt-0.5 ${active ? "text-[#F3D899]" : "text-[#0F5132]"}`}>
                              3회 총액 {spec.total3VisitsManwon}만 원
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div>
                      <strong className="text-xs font-extrabold text-[#111111] block mb-2">
                        2. 추나 유효 대상자 중 목표 비율
                      </strong>
                      <div className="grid grid-cols-3 gap-2">
                        {([10, 30, 50] as ChunaTargetPct[]).map((pct) => {
                          const active = sim.settings.chunaTargetPct === pct;
                          return (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => updateSimSettings({ chunaTargetPct: pct })}
                              className={`py-2 rounded-xl border text-xs font-black transition cursor-pointer ${
                                active
                                  ? "bg-[#111111] text-[#D4AF37] border-[#111111]"
                                  : "bg-white text-[#333333] border-[#D4D4D4] hover:border-[#111111]"
                              }`}
                            >
                              {pct}% {pct === 50 ? "(최대치)" : ""}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <label className="flex items-center justify-between pt-2 border-t border-[#E5E5E5] cursor-pointer">
                      <span className="text-[11px] font-bold text-[#333333]">
                        상단 「목표 도달 기대효과」 합산에 포함
                      </span>
                      <input
                        type="checkbox"
                        checked={sim.settings.includeChunaInTotal}
                        onChange={(e) => updateSimSettings({ includeChunaInTotal: e.target.checked })}
                        className="w-4 h-4 accent-[#0F5132] cursor-pointer"
                      />
                    </label>
                  </div>

                  {/* 유효 모수 & 순증 계산 내역 */}
                  <div className="p-3.5 rounded-xl bg-[#F4F8F5] border border-[#C6DFCE] space-y-1.5">
                    <strong className="text-[#0F5132] font-extrabold block">
                      실측 유효 대상자 &amp; 3회 순증 산출식
                    </strong>
                    <div className="text-[11px] text-[#1F2937]">
                      · 추나 유효 대상자: <strong>{sim.chunaEligibleCount}명</strong>{" "}
                      {sim.isFallbackEligibilityUsed ? (
                        <span className="text-[#666666]">(연령·상병 미기입으로 전체 × 65% 안전계수 적용)</span>
                      ) : (
                        <span className="text-[#555555]">
                          (전체 {scopedRows.length}명 중 65세↑ {sim.chunaExcludedSenior}명 · 자보{" "}
                          {sim.chunaExcludedAuto}명 · 순수한약/비근골격 {sim.chunaExcludedNonMsk}명 제외)
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#1F2937]">
                      · 1인당 3회 순증액: <strong>+{sim.perPatientNetGainManwon}만 원</strong>{" "}
                      <span className="text-[#555555]">
                        ({sim.chunaLabel} 3회 {sim.chuna3VisitTotalManwon}만 - 기존 보험 3회{" "}
                        {sim.baseline3VisitManwon}만)
                      </span>
                    </div>
                    <div className="text-xs font-black text-[#0F5132] pt-1 border-t border-[#C6DFCE]">
                      ▶ 추가 {sim.additionalChunaCount}명(목표 {sim.targetChunaCount}명 - 현재 {sim.currentChunaCount}명) × {sim.perPatientNetGainManwon}만 원 = +월 {sim.chunaGainManwon.toLocaleString()}만 원
                    </div>
                  </div>
                </div>
              )}

              {activeModal.kind === "herbalSim" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E5E5E5] space-y-3">
                    <div className="flex items-center justify-between">
                      <strong className="text-xs font-extrabold text-[#111111]">
                        급여 첩약 40일분 (60만 원) 목표 비율 선택
                      </strong>
                      <button
                        type="button"
                        onClick={resetSimSettingsToMax}
                        className="text-[10px] font-bold text-[#8C6B2D] hover:underline cursor-pointer"
                      >
                        최대치 복원
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {([5, 8, 10] as Herbal40TargetPct[]).map((pct) => {
                        const active = sim.settings.herbal40TargetPct === pct;
                        return (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => updateSimSettings({ herbal40TargetPct: pct })}
                            className={`py-2.5 rounded-xl border text-xs font-black transition cursor-pointer ${
                              active
                                ? "bg-[#111111] text-[#D4AF37] border-[#111111]"
                                : "bg-white text-[#333333] border-[#D4D4D4] hover:border-[#111111]"
                            }`}
                          >
                            {pct}% {pct === 8 ? "(권장)" : pct === 10 ? "(최대치)" : "(안정)"}
                          </button>
                        );
                      })}
                    </div>

                    <label className="flex items-center justify-between pt-2 border-t border-[#E5E5E5] cursor-pointer">
                      <span className="text-[11px] font-bold text-[#333333]">
                        상단 「목표 도달 기대효과」 합산에 포함
                      </span>
                      <input
                        type="checkbox"
                        checked={sim.settings.includeHerbal40InTotal}
                        onChange={(e) =>
                          updateSimSettings({ includeHerbal40InTotal: e.target.checked })
                        }
                        className="w-4 h-4 accent-[#0F5132] cursor-pointer"
                      />
                    </label>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#F4F8F5] border border-[#C6DFCE] space-y-1.5">
                    <strong className="text-[#0F5132] font-extrabold block">
                      40일분 급여 첩약 산출 공식 (본부금+공단청구)
                    </strong>
                    <div className="text-[11px] text-[#1F2937]">
                      · 6대 질환(디스크·소화불량·비염·월경통·안면마비 등) 중 2개 질환 각 20일분 완주 = 10일 × 4회 × 15만 원 = <strong>1인당 {HERBAL_40DAY_FEE_MANWON}만 원</strong>
                    </div>
                    <div className="text-xs font-black text-[#0F5132] pt-1 border-t border-[#C6DFCE]">
                      ▶ 전체 {scopedRows.length}명 × {sim.settings.herbal40TargetPct}% ({sim.herbal40TargetCount}명) × {HERBAL_40DAY_FEE_MANWON}만 원 = +{sim.herbal40GainManwon.toLocaleString()}만 원 (1.5~2개월 누적)
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#FBF7EE] border border-[#E6D5B3] text-[11px] text-[#555555]">
                    <strong className="text-[#7A5B1F] block mb-1">
                      비급여 한약 잠식(매출 역전) 방어 기준
                    </strong>
                    40일분 급여 첩약이 초진의 <strong>12%를 넘으면</strong> 원래 고마진 비급여 한약(35~45만 원)을 결제할 환자까지 급여로 이동해 순이익이 줄어들 수 있습니다. 권장 구간은 <strong>6~8%</strong>이며, 10% 설정 시 비급여 한약 전환율과 반드시 함께 관리하세요.
                  </div>
                </div>
              )}

              {activeModal.kind === "revenue" && (
                <div className="space-y-3">
                  {track === "insurance" ? (
                    <>
                      {/* ⓘ 모달 내 원클릭 세부설정 퀵 패널 */}
                      <div className="p-3.5 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5] space-y-2.5">
                        <div className="flex items-center justify-between">
                          <strong className="font-extrabold text-[#111111]">
                            시뮬레이션 세부설정 (기본: 최대치)
                          </strong>
                          <button
                            type="button"
                            onClick={resetSimSettingsToMax}
                            className="text-[10px] font-bold text-[#8C6B2D] hover:underline cursor-pointer"
                          >
                            최대치 복원
                          </button>
                        </div>

                        {/* 추나 설정 줄 */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                          <label className="inline-flex items-center gap-1.5 font-bold text-[#111111] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={sim.settings.includeChunaInTotal}
                              onChange={(e) =>
                                updateSimSettings({ includeChunaInTotal: e.target.checked })
                              }
                              className="accent-[#0F5132] cursor-pointer"
                            />
                            <span>추나 (3회 기준)</span>
                          </label>
                          <div className="flex items-center gap-1">
                            {(["complex", "simple"] as ChunaType[]).map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => updateSimSettings({ chunaType: t })}
                                className={`px-2 py-0.5 rounded-md font-extrabold cursor-pointer ${
                                  sim.settings.chunaType === t
                                    ? "bg-[#0F5132] text-white"
                                    : "bg-white border border-[#D4D4D4] text-[#555555]"
                                }`}
                              >
                                {t === "complex" ? "복잡" : "단순"}
                              </button>
                            ))}
                            <span className="text-[#CCCCCC] mx-0.5">|</span>
                            {([10, 30, 50] as ChunaTargetPct[]).map((pct) => (
                              <button
                                key={pct}
                                type="button"
                                onClick={() => updateSimSettings({ chunaTargetPct: pct })}
                                className={`px-2 py-0.5 rounded-md font-extrabold cursor-pointer ${
                                  sim.settings.chunaTargetPct === pct
                                    ? "bg-[#111111] text-[#D4AF37]"
                                    : "bg-white border border-[#D4D4D4] text-[#555555]"
                                }`}
                              >
                                {pct}%
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 급여 첩약 설정 줄 */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] pt-1.5 border-t border-[#EAEAEA]">
                          <label className="inline-flex items-center gap-1.5 font-bold text-[#111111] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={sim.settings.includeHerbal40InTotal}
                              onChange={(e) =>
                                updateSimSettings({ includeHerbal40InTotal: e.target.checked })
                              }
                              className="accent-[#0F5132] cursor-pointer"
                            />
                            <span>급여 첩약 (40일분)</span>
                          </label>
                          <div className="flex items-center gap-1">
                            {([5, 8, 10] as Herbal40TargetPct[]).map((pct) => (
                              <button
                                key={pct}
                                type="button"
                                onClick={() => updateSimSettings({ herbal40TargetPct: pct })}
                                className={`px-2 py-0.5 rounded-md font-extrabold cursor-pointer ${
                                  sim.settings.herbal40TargetPct === pct
                                    ? "bg-[#111111] text-[#D4AF37]"
                                    : "bg-white border border-[#D4D4D4] text-[#555555]"
                                }`}
                              >
                                {pct}%
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-[#FBF7EE] border border-[#E6D5B3] space-y-1.5">
                        <strong className="font-extrabold text-[#7A5B1F] block">
                          보험(원장) 매출 증대 예상치 산출 기준
                        </strong>
                        <div className="text-[#111111] font-bold">
                          · 적용 단가: 보험 1회 평균{" "}
                          <span className="text-[#0F5132]">
                            {Number(evaluation.feeBasis.insuranceAvgFeeManwon.toFixed(2))}만 원
                          </span>{" "}
                          <span className="text-[11px] font-semibold text-[#666666]">
                            ({evaluation.feeBasis.isCustomInput ? "원장님 직접 입력" : "기본값 · 본부금+공단청구"})
                          </span>
                        </div>
                        <p className="text-[10px] text-[#666666] pt-1 border-t border-[#E6D5B3]/60 leading-relaxed">
                          * 2차·3차는 각 방문 진료비 1회분씩 계산되어 중복이 없으며, 추나는 기존 보험 3회 진료비를 차감한 순증액만 합산합니다.<br />
                          * 예측·통제가 어려운 재초진·자보·65세 연령 비율은 거품 방지를 위해 제외했습니다.
                        </p>
                      </div>
                    </>
                  ) : (
                    <p className="text-[#555555]">
                      비급여·한약·패키지 미달 지표를 권장 기준점까지 달성했을 때 중복 항목을 제외하고 추산한 월간 기대 매출입니다.
                    </p>
                  )}

                  {scopedRows.length === 0 ? (
                    <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#EAEAEA] text-[#666666] font-bold text-center">
                      환자 시트 데이터가 연동되면 자동 산출됩니다.
                    </div>
                  ) : currentSummary.potentialBreakdown.length === 0 ? (
                    <div className="p-4 rounded-xl bg-[#ECFDF5] text-[#0F5132] font-bold text-center">
                      현재 트랙의 모든 권장 기준점을 달성하셨습니다!
                    </div>
                  ) : (
                    <div className="divide-y divide-[#EFEFEF] border border-[#EAEAEA] rounded-xl overflow-hidden">
                      {currentSummary.potentialBreakdown.map((b, i) => (
                        <div
                          key={i}
                          className="px-4 py-3 bg-white flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <strong className="font-extrabold text-[#111111] block">{b.label}</strong>
                            <span className="text-[11px] text-[#737373] block">{b.detail}</span>
                            {b.formula && (
                              <span className="text-[10px] text-[#0F5132] font-semibold block mt-0.5">
                                산출식: {b.formula}
                              </span>
                            )}
                          </div>
                          <span className="font-black text-[#0F5132] shrink-0">
                            +월 {b.gainManwon.toLocaleString()}만 원
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
