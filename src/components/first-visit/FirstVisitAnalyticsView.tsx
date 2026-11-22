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
  DualTrackIndicator,
  BodyPartRetentionItem,
  evaluateDualTrackStats,
} from "@/lib/firstVisitStatsEngine";

interface RegionPresetOption {
  code: string;
  name: string;
  totalPopulation: number;
  femaleRatio: number;
  seniorRatio: number;
}

interface FirstVisitAnalyticsViewProps {
  existingFirstVisitRows?: FirstVisitRow[];
  embedded?: boolean;
  activeTrack?: FirstVisitTrack;
  onTrackChange?: (track: FirstVisitTrack) => void;
}

type ModalPayload =
  | { kind: "indicator"; item: DualTrackIndicator }
  | { kind: "bodyPart"; part: BodyPartRetentionItem }
  | { kind: "demographic" }
  | { kind: "mission" }
  | { kind: "revenue" };

export default function FirstVisitAnalyticsView({
  existingFirstVisitRows = [],
  embedded = false,
  activeTrack: controlledTrack,
  onTrackChange,
}: FirstVisitAnalyticsViewProps) {
  const [internalTrack, setInternalTrack] = useState<FirstVisitTrack>("insurance");
  const track = controlledTrack ?? internalTrack;

  const setTrack = (next: FirstVisitTrack) => {
    setInternalTrack(next);
    onTrackChange?.(next);
  };

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

  // 아이콘(ⓘ) 클릭 시 열리는 상세 설명 모달 상태
  const [activeModal, setActiveModal] = useState<ModalPayload | null>(null);

  // 성별 수동 보정값 로컬 저장소 복원
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
    } catch {}
  }, []);

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

  // 2트랙 정밀 계산
  const evaluation = useMemo(
    () => evaluateDualTrackStats(existingFirstVisitRows, demographic, genderOverride),
    [existingFirstVisitRows, demographic, genderOverride]
  );

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
            {/* 2대 기준 메뉴 */}
            <div className="inline-flex p-1 rounded-xl bg-[#F2F2F2] border border-[#E5E5E5] self-start">
              <button
                type="button"
                onClick={() => setTrack("insurance")}
                className={`px-5 py-2.5 rounded-lg text-xs md:text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
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
                className={`px-5 py-2.5 rounded-lg text-xs md:text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
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
              <span>시트 {existingFirstVisitRows.length}명 자동 연동</span>
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
                {existingFirstVisitRows.length === 0
                  ? "데이터 대기"
                  : currentSummary.potentialMonthlyGainManwon > 0
                  ? `+월 ${currentSummary.potentialMonthlyGainManwon.toLocaleString()}만 원`
                  : "기준점 달성 완료"}
              </span>
            </div>
            <p className="text-[11px] text-[#7A5B1F] font-semibold truncate">
              {track === "insurance"
                ? `65세↓ 5만 · 65세↑ 2만 (평균 ${Number(evaluation.feeBasis.avgVisitFeeManwon.toFixed(2))}만/회)`
                : "비급여·한약·패키지 중복제외 추정"}
            </p>
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

        {/* 3-B. 보험(원장) 전용: 진료부위별 삼진율(3회 내원율) 강·약점 진단 보드 */}
        {track === "insurance" && (
          <div className="bg-white border border-[#E5E5E5] rounded-2xl p-5 shadow-sm space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-[#111111]">
                  진료부위별 삼진율 (3회 내원율)
                </span>
                <span className="px-2 py-0.5 rounded-md bg-[#F4F8F5] text-[#0F5132] text-[10px] font-extrabold">
                  목표 70%↑
                </span>
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
                    {evaluation.bodyPartRetention.filter((p) => p.thirdRate >= 70).length > 0 ? (
                      evaluation.bodyPartRetention
                        .filter((p) => p.thirdRate >= 70)
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
                        아직 70%↑ 달성 부위 없음
                      </span>
                    )}
                  </div>

                  <div className="px-3 py-2 rounded-xl bg-[#FBF7EE] border border-[#E6D5B3] flex flex-wrap items-center gap-1.5">
                    <span className="font-extrabold text-[#7A5B1F] shrink-0">놓치는 질환:</span>
                    {evaluation.bodyPartRetention.filter(
                      (p) => p.thirdRate < 70 && !p.isConsultOnly
                    ).length > 0 ? (
                      evaluation.bodyPartRetention
                        .filter((p) => p.thirdRate < 70 && !p.isConsultOnly)
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
                        전 진료부위 70%↑ 안정 유지
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {evaluation.bodyPartRetention.map((part) => {
                    const isGood = part.thirdRate >= 70;
                    const isLowSample = !isGood && (part.patients < 2 || part.isConsultOnly);
                    const isCrit = !isGood && !isLowSample && part.thirdRate < 50;

                    return (
                      <div
                        key={part.id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          isGood
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
                            {isGood ? (
                              <span className="px-1.5 py-0.5 rounded bg-[#ECFDF5] text-[#0F5132] text-[10px] font-extrabold">
                                강점
                              </span>
                            ) : part.isConsultOnly ? (
                              <span className="px-1.5 py-0.5 rounded bg-[#F5F5F5] text-[#666666] text-[10px] font-bold">
                                첩약군
                              </span>
                            ) : part.patients < 2 ? (
                              <span className="px-1.5 py-0.5 rounded bg-[#F5F5F5] text-[#666666] text-[10px] font-bold">
                                표본1명
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
                시트의 &apos;환자 진료 내역&apos;란에 통증·질환 부위(허리, 목, 어깨, 무릎, 발목, 손목, 소화 등)가 입력되면 잘 잡는 질환과 놓치는 질환이 자동 분류됩니다.
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
                    : "목표 도달 잠재 매출 시뮬레이션"}
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
                          <span>진료부위 (인원)</span>
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

              {activeModal.kind === "revenue" && (
                <div className="space-y-3">
                  {track === "insurance" ? (
                    <div className="p-3.5 rounded-xl bg-[#FBF7EE] border border-[#E6D5B3] space-y-1.5">
                      <strong className="font-extrabold text-[#7A5B1F] block">
                        보험(원장) 1회 진료비 산출 기준
                      </strong>
                      <div className="text-[#111111] font-bold">
                        · 65세 이하(미만): <span className="text-[#0F5132]">1회 5만 원</span> / 65세 이상:{" "}
                        <span className="text-[#0F5132]">1회 2만 원</span>
                      </div>
                      <div className="text-[11px] text-[#555555]">
                        {evaluation.feeBasis.isDefaultRatioUsed ? (
                          <span>
                            → 현재 나이 미기입 상태로 권장 연령비(80:20) 가중단가{" "}
                            <strong className="text-[#111111]">1회 4.4만 원</strong> 적용 중
                          </span>
                        ) : (
                          <span>
                            → 실측 연령 확인 {evaluation.feeBasis.knownAgeCount}명(65세↓{" "}
                            {evaluation.feeBasis.under65Count}명 · 65세↑{" "}
                            {evaluation.feeBasis.senior65Count}명) 반영 가중단가{" "}
                            <strong className="text-[#111111]">
                              1회 {Number(evaluation.feeBasis.avgVisitFeeManwon.toFixed(2))}만 원
                            </strong>{" "}
                            적용
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#737373] pt-1 border-t border-[#E6D5B3]/60">
                        * 2차·3차 내원은 각각 순수 1회분씩만 계산하며, 예약확정·골든타임·부위별 삼진율 등 연결 지표는 중복 합산에서 제외했습니다.
                      </p>
                    </div>
                  ) : (
                    <p className="text-[#555555]">
                      비급여·한약·패키지 미달 지표를 권장 기준점까지 달성했을 때 중복 항목을 제외하고 추산한 월간 기대 매출입니다.
                    </p>
                  )}

                  {existingFirstVisitRows.length === 0 ? (
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
