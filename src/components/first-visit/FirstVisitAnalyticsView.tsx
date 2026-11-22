"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Calendar,
  Sparkles,
  Search,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import toast from "react-hot-toast";
import { FirstVisitRow } from "@/types/firstVisit";
import {
  ClinicPatientMetrics,
  DemographicData,
  DEFAULT_CLINIC_METRICS,
  DEFAULT_DEMOGRAPHIC,
  computeMetricsFromRows,
  evaluateFirstVisitStats,
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
}

export default function FirstVisitAnalyticsView({
  existingFirstVisitRows = [],
  embedded = false,
}: FirstVisitAnalyticsViewProps) {
  const [demographic, setDemographic] = useState<DemographicData>(DEFAULT_DEMOGRAPHIC);
  const [presets, setPresets] = useState<RegionPresetOption[]>([]);
  const [locating, setLocating] = useState(false);

  // 주소 직접 검색 관련 상태
  const [addressQuery, setAddressQuery] = useState("");
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);

  // 초진 환자 메트릭: 기존 초진 시트로부터 기본 자동 연동
  const [clinic, setClinic] = useState<ClinicPatientMetrics>(() => {
    if (existingFirstVisitRows && existingFirstVisitRows.length > 0) {
      return computeMetricsFromRows(existingFirstVisitRows);
    }
    return DEFAULT_CLINIC_METRICS;
  });

  const [expandedTheoryIds, setExpandedTheoryIds] = useState<Record<string, boolean>>({});

  // 1. 기존 초진 시트(rows)가 변경되거나 마운트될 때 100% 자동 연동
  useEffect(() => {
    if (existingFirstVisitRows && existingFirstVisitRows.length > 0) {
      const calculated = computeMetricsFromRows(existingFirstVisitRows);
      setClinic(calculated);
    }
  }, [existingFirstVisitRows]);

  // 2. 행정동 프리셋 목록 로드
  useEffect(() => {
    fetch("/api/sgis/demographics?list=1")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.presets)) setPresets(data.presets);
      })
      .catch(() => {});
  }, []);

  // 3. 6개월(반기) 단위 통계청 인구수 자동 업데이트 로직
  useEffect(() => {
    const checkSemiAnnualUpdate = async () => {
      try {
        const lastSyncStr =
          typeof window !== "undefined"
            ? localStorage.getItem("barun_sgis_last_sync")
            : null;
        const now = Date.now();
        const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000; // 약 180일(6개월)

        const shouldUpdate =
          !lastSyncStr || now - parseInt(lastSyncStr, 10) > SIX_MONTHS_MS;

        if (shouldUpdate) {
          const res = await fetch(
            `/api/sgis/demographics?code=${demographic.regionCode}`
          );
          if (res.ok) {
            const freshData: DemographicData = await res.json();
            setDemographic(freshData);
            if (typeof window !== "undefined") {
              localStorage.setItem("barun_sgis_last_sync", now.toString());
            }
          }
        }
      } catch (err) {
        console.warn("6개월 주기 통계 자동 업데이트 확인 중 오류", err);
      }
    };

    checkSemiAnnualUpdate();
  }, [demographic.regionCode]);

  // 현재 위치 GPS 조회
  const handleDetectLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error(
        "브라우저 위치 정보를 지원하지 않습니다. 상단 검색창에 주소를 직접 입력해 주세요."
      );
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `/api/sgis/demographics?lat=${latitude}&lng=${longitude}`
          );
          if (!res.ok) throw new Error("인구 조회 실패");
          const data: DemographicData = await res.json();
          setDemographic(data);
          if (typeof window !== "undefined") {
            localStorage.setItem("barun_sgis_last_sync", Date.now().toString());
          }
          toast.success(`${data.regionName} 인구 데이터를 반영했습니다.`);
        } catch {
          toast.error("통계청 인구 조회 중 오류가 발생했습니다.");
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        toast(
          "위치 권한이 허용되지 않아 기본 지역을 유지합니다. 상단 주소 검색창을 통해 직접 검색하실 수 있습니다."
        );
      },
      { timeout: 8000, enableHighAccuracy: false }
    );
  };

  // 주소 직접 검색 핸들러 (도로명, 지번, 동명 검색 지원)
  const handleSearchAddress = async (
    targetQuery?: string,
    extra?: { sido?: string; sigungu?: string; bname?: string }
  ) => {
    const q = (targetQuery ?? addressQuery).trim();
    if (!q) {
      toast("검색하실 주소나 읍·면·동 이름을 입력해 주세요.");
      return;
    }

    setIsSearchingAddress(true);
    const toastId = toast.loading(`"${q}" 지역 인구수를 조회하고 있습니다...`);
    try {
      const qs = new URLSearchParams({ query: q });
      if (extra?.sido) qs.set("sido", extra.sido);
      if (extra?.sigungu) qs.set("sigungu", extra.sigungu);
      if (extra?.bname) qs.set("bname", extra.bname);

      const res = await fetch(`/api/sgis/demographics?${qs.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "해당 지역의 인구 통계를 찾을 수 없습니다.");
      }
      setDemographic(data as DemographicData);
      if (typeof window !== "undefined") {
        localStorage.setItem("barun_sgis_last_sync", Date.now().toString());
      }
      toast.success(`${data.regionName} 인구 데이터를 반영했습니다.`, { id: toastId });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "주소 검색 중 오류가 발생했습니다. 도로명이나 동 이름을 다시 확인해 주세요.";
      toast.error(msg, { id: toastId });
    } finally {
      setIsSearchingAddress(false);
    }
  };

  // 다음(Daum) 우편번호/도로명 주소 검색 팝업
  const openDaumPostcode = () => {
    const scriptId = "daum-postcode-script";
    const execute = () => {
      if (typeof window !== "undefined" && (window as any).daum?.Postcode) {
        new (window as any).daum.Postcode({
          oncomplete: (data: any) => {
            const addr =
              data.roadAddress ||
              data.address ||
              `${data.sido} ${data.sigungu} ${data.bname}`;
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

  // 지역 프리셋 수동 변경
  const handlePresetChange = async (code: string) => {
    if (!code) return;
    try {
      const res = await fetch(`/api/sgis/demographics?code=${code}`);
      if (!res.ok) return;
      const data: DemographicData = await res.json();
      setDemographic(data);
      if (typeof window !== "undefined") {
        localStorage.setItem("barun_sgis_last_sync", Date.now().toString());
      }
      toast.success(`${data.regionName} 기준으로 업데이트되었습니다.`);
    } catch {
      toast.error("지역 인구 데이터를 불러오지 못했습니다.");
    }
  };

  // 7대 지표 실시간 계산
  const diagnosis = useMemo(
    () => evaluateFirstVisitStats(clinic, demographic),
    [clinic, demographic]
  );

  // 차트 데이터 (그린: 현재 수치, 골드: 기준치)
  const chartData = useMemo(
    () =>
      diagnosis.indicators.map((ind) => ({
        name: ind.shortName,
        현재수치: ind.currentValue,
        기준치: ind.benchmarkTarget,
      })),
    [diagnosis]
  );

  const toggleTheory = (id: string) => {
    setExpandedTheoryIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div
      className={
        embedded
          ? "bg-[#FAFAFA] text-[#111111] rounded-[28px] p-5 md:p-8 border border-[#E5E5E5] select-text"
          : "min-h-screen bg-[#FAFAFA] text-[#111111] px-6 py-8 md:px-10 md:py-10 select-text"
      }
    >
      <div className="max-w-6xl mx-auto space-y-7">
        {/* 1. 심플 헤더 & 통계청 인구/6개월 주기 기준 표시 */}
        <header className="bg-white border border-[#E5E5E5] rounded-2xl p-6 md:p-7 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-block w-2 h-2 rounded-full bg-[#15803D]" />
                <span className="text-[11px] font-bold tracking-[0.18em] uppercase text-[#B8924A]">
                  BARUN FIRST-VISIT INTELLIGENCE
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#111111]">
                초진시스템 · 인구 비례 7대 경영 통계
              </h1>
              <p className="text-sm text-[#555555] mt-1">
                통계청 공식 배후 인구와 원내 초진 데이터를 자동 대조하여 기준점·부족분(Gap)·경영 위험을 진단합니다.
              </p>
            </div>

            {/* 주소 직접 검색 & GPS & 지역 선택 컨트롤 바 */}
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5">
              {/* 1. 주소 직접 검색창 */}
              <div className="relative flex items-center min-w-[260px] sm:min-w-[310px]">
                <Search size={14} className="absolute left-3.5 text-[#737373] pointer-events-none" />
                <input
                  type="text"
                  value={addressQuery}
                  onChange={(e) => setAddressQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearchAddress()}
                  placeholder="주소·동명 직접 검색 (예: 정자동, 테헤란로 152)"
                  className="w-full pl-9 pr-14 py-2.5 rounded-xl bg-white border border-[#D4D4D4] text-xs font-semibold text-[#111111] placeholder:text-[#999999] focus:outline-none focus:border-[#B8924A] shadow-sm transition"
                />
                <button
                  type="button"
                  onClick={() => handleSearchAddress()}
                  disabled={isSearchingAddress}
                  className="absolute right-1.5 px-2.5 py-1.5 rounded-lg bg-[#111111] hover:bg-[#262626] text-white text-[11px] font-bold transition cursor-pointer disabled:opacity-60"
                >
                  {isSearchingAddress ? "조회중" : "검색"}
                </button>
              </div>

              {/* 2. 우편번호/도로명 주소 찾기 팝업 버튼 */}
              <button
                type="button"
                onClick={openDaumPostcode}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#FBF7EE] hover:bg-[#F5ECD7] border border-[#D4AF37] text-[#7A5B1F] text-xs font-bold transition shadow-sm cursor-pointer"
                title="카카오/다음 공식 주소 검색창 열기"
              >
                <Search size={13} className="text-[#B8924A]" />
                <span>주소 찾기</span>
              </button>

              {/* 3. 현재 위치 GPS 조회 버튼 */}
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={locating}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#0F5132] hover:bg-[#0B3D26] text-white text-xs font-bold transition cursor-pointer disabled:opacity-60 shadow-sm"
              >
                <MapPin size={13} className="text-[#D4AF37]" />
                <span>{locating ? "조회 중..." : "GPS 위치"}</span>
              </button>

              {/* 4. 주요 지역 선택 드롭다운 */}
              <select
                value={demographic.regionCode}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="px-3 py-2.5 rounded-xl bg-white border border-[#D4D4D4] text-xs font-semibold text-[#111111] focus:outline-none focus:border-[#B8924A] cursor-pointer shadow-sm max-w-[210px] truncate"
              >
                <option value={demographic.regionCode}>
                  {demographic.regionName}
                </option>
                {presets.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name} ({p.totalPopulation.toLocaleString()}명)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 동네 인구 및 통계청 기준 안내 바 */}
          <div className="mt-5 pt-5 border-t border-[#EFEFEF] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-xs">
            <div>
              <span className="text-[#737373] block mb-0.5">적용 배후 지역</span>
              <span className="font-bold text-[#111111]">{demographic.regionName}</span>
            </div>
            <div>
              <span className="text-[#737373] block mb-0.5">통계청 배후 총인구</span>
              <span className="font-bold text-[#0F5132] text-sm">
                {demographic.totalPopulation.toLocaleString()}명
              </span>
            </div>
            <div>
              <span className="text-[#737373] block mb-0.5">통계청 자료 기준</span>
              <span className="font-bold text-[#111111] text-sm flex items-center gap-1">
                <Calendar size={13} className="text-[#B8924A]" />
                {demographic.censusBaseDate || "2026년 05월 자료"}
              </span>
            </div>
            <div>
              <span className="text-[#737373] block mb-0.5">동네 65세 이상 고령화율</span>
              <span className="font-bold text-[#111111] text-sm">{demographic.seniorRatio}%</span>
            </div>
            <div>
              <span className="text-[#737373] block mb-0.5">동네 여성 인구 비율</span>
              <span className="font-bold text-[#111111] text-sm">{demographic.femaleRatio}%</span>
            </div>
          </div>
        </header>

        {/* 2. 초진 시트 실시간 자동 연동 상태 스트립 (심플 & 자동) */}
        <div className="bg-white border border-[#E5E5E5] rounded-2xl px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#15803D] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#15803D]"></span>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-extrabold text-[#111111]">
                  초진 표준 시트 자동 연동 중
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[#ECFDF5] border border-[#BBF7D0] text-[#0F5132] text-[10px] font-extrabold flex items-center gap-1">
                  <Sparkles size={11} className="text-[#B8924A]" />
                  실시간 자동 집계
                </span>
              </div>
              <p className="text-xs text-[#666666] mt-0.5">
                현재 입력된 {existingFirstVisitRows.length.toLocaleString()}명의 환자 데이터를 바탕으로 7대 경영 지표를 자동으로 산출 및 분석합니다.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-[#555555] bg-[#FAFAFA] px-3.5 py-2 rounded-xl border border-[#EFEFEF]">
            <span>순수초진 <strong className="text-[#0F5132]">{clinic.firstVisits}명</strong></span>
            <span className="text-[#D4D4D4]">·</span>
            <span>재초진 <strong className="text-[#111111]">{clinic.reFirstVisits}명</strong></span>
            <span className="text-[#D4D4D4]">·</span>
            <span>재진 내원 <strong className="text-[#111111]">{clinic.revisits}건</strong></span>
            <span className="text-[#D4D4D4]">·</span>
            <span>비급여 <strong className="text-[#B8924A]">{clinic.nonReimbursableVisits}건</strong></span>
          </div>
        </div>

        {/* 3. 핵심 요약 KPI 스트립 (화이트 · 블랙 · 골드 · 그린) */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* 종합 경영 위험도 (블랙 카드) */}
          <div className="bg-[#111111] text-white rounded-2xl p-6 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-widest uppercase text-[#D4AF37]">
                RISK SCORE
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-[#D4AF37] font-semibold">
                {diagnosis.overallRiskScore <= 20
                  ? "건전"
                  : diagnosis.overallRiskScore <= 50
                  ? "주의"
                  : "위험"}
              </span>
            </div>
            <div className="my-3">
              <span className="text-4xl font-black tracking-tight">
                {diagnosis.overallRiskScore}
              </span>
              <span className="text-sm text-white/50 ml-1">/ 100</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-white/70">
              <span className="text-[#4ADE80] font-semibold">정상 {diagnosis.healthyCount}</span>
              <span className="text-[#D4AF37] font-semibold">주의 {diagnosis.warningCount}</span>
              <span className="text-white font-semibold">위험 {diagnosis.criticalCount}</span>
            </div>
          </div>

          {/* 인구 비례 초진 침투율 */}
          <div className="bg-white border border-[#E5E5E5] rounded-2xl p-6 flex flex-col justify-between shadow-sm">
            <span className="text-xs font-semibold text-[#666666]">
              배후 인구 대비 초진 침투율 (MPI)
            </span>
            <div className="my-2">
              <span className="text-3xl font-extrabold text-[#0F5132]">
                {diagnosis.marketPenetrationIndex}
              </span>
              <span className="text-xs text-[#666666] ml-1.5">명 / 1,000명</span>
            </div>
            <p className="text-[11px] text-[#737373]">
              권장 기준 1.5 ~ 3.0‰ · 순수초진 {clinic.firstVisits.toLocaleString()}명
            </p>
          </div>

          {/* 고령화 & 성별 왜곡 지수 */}
          <div className="bg-white border border-[#E5E5E5] rounded-2xl p-6 flex flex-col justify-between shadow-sm">
            <span className="text-xs font-semibold text-[#666666]">
              인구 구조 왜곡 지수 (동네 대비)
            </span>
            <div className="my-2 grid grid-cols-2 gap-3">
              <div>
                <div className="text-[11px] text-[#737373]">고령화(GDI)</div>
                <div className="text-2xl font-extrabold text-[#111111]">
                  {diagnosis.geriatricDistortionIndex}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#737373]">성별(Gender)</div>
                <div className="text-2xl font-extrabold text-[#B8924A]">
                  {diagnosis.genderDistortionIndex}
                </div>
              </div>
            </div>
            <p className="text-[11px] text-[#737373]">
              GDI 적정 0.7~1.3 · 성별 적정 1.1~1.3
            </p>
          </div>

          {/* 총괄 경영 진단 */}
          <div className="bg-[#FBF7EE] border border-[#E6D5B3] rounded-2xl p-6 flex flex-col justify-between shadow-sm">
            <span className="text-[11px] font-bold tracking-wider uppercase text-[#8C6B2D]">
              EXECUTIVE DIAGNOSIS
            </span>
            <p className="text-xs leading-relaxed text-[#262626] font-medium mt-2">
              {diagnosis.executiveSummary}
            </p>
          </div>
        </section>

        {/* 4. 7대 지표 vs 기준치 비교 차트 (심플 화이트·그린·골드) */}
        <section className="bg-white border border-[#E5E5E5] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-[#111111]">
                7대 핵심 지표 vs 권장 기준치 비교
              </h2>
              <p className="text-xs text-[#666666] mt-0.5">
                그린(현재 원내 수치)과 골드(석학 이론 권장 기준치)의 격차를 한눈에 확인합니다.
              </p>
            </div>
          </div>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EFEFEF" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#111111", fontSize: 12, fontWeight: 600 }}
                  axisLine={{ stroke: "#E5E5E5" }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: "#737373", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  unit="%"
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
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                <Bar dataKey="현재수치" fill="#0F5132" radius={[6, 6, 0, 0]} maxBarSize={34} />
                <Bar dataKey="기준치" fill="#C5A059" radius={[6, 6, 0, 0]} maxBarSize={34} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* 5. 7대 지표 상세 분석 카드 (심플 & 명료) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-[#111111]">
              7대 지표 상세 진단 · 권위자 이론 및 경영 리스크
            </h2>
            <span className="text-xs text-[#666666]">
              총 {clinic.totalVisits.toLocaleString()}건 기준
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {diagnosis.indicators.map((ind) => {
              const isHealthy = ind.status === "HEALTHY";
              const isWarning = ind.status === "WARNING";
              const isExpanded = !!expandedTheoryIds[ind.id];

              return (
                <article
                  key={ind.id}
                  className={`bg-white rounded-2xl p-6 border transition-colors shadow-sm ${
                    isHealthy
                      ? "border-[#E5E5E5]"
                      : isWarning
                      ? "border-[#D4AF37]"
                      : "border-[#111111]"
                  }`}
                >
                  {/* 카드 상단 */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <span className="text-[11px] font-bold text-[#B8924A]">
                        0{ind.order} · {ind.authorityName}
                      </span>
                      <h3 className="text-base font-bold text-[#111111] mt-0.5">{ind.name}</h3>
                    </div>

                    {isHealthy ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#ECFDF5] border border-[#BBF7D0] text-[#0F5132] text-[11px] font-bold flex-shrink-0">
                        <CheckCircle2 size={12} /> 정상
                      </span>
                    ) : isWarning ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FBF7EE] border border-[#E6D5B3] text-[#8C6B2D] text-[11px] font-bold flex-shrink-0">
                        <AlertTriangle size={12} /> 주의
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#111111] text-[#D4AF37] text-[11px] font-bold flex-shrink-0">
                        <ShieldAlert size={12} /> 위험
                      </span>
                    )}
                  </div>

                  {/* 수치 · 기준치 · Gap */}
                  <div className="flex items-baseline justify-between pb-4 mb-4 border-b border-[#F0F0F0]">
                    <div className="flex items-baseline gap-2.5">
                      <span className="text-3xl font-black text-[#111111]">
                        {ind.displayValue}
                      </span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded ${
                          ind.gap >= 0
                            ? "bg-[#ECFDF5] text-[#0F5132]"
                            : "bg-[#111111] text-[#D4AF37]"
                        }`}
                      >
                        Gap {ind.gapDisplay}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-[#737373] block">권장 기준점</span>
                      <span className="text-xs font-semibold text-[#111111]">
                        {ind.benchmarkRange}
                      </span>
                    </div>
                  </div>

                  {/* 심플 프로그레스 바 */}
                  <div className="relative h-2 w-full bg-[#F0F0F0] rounded-full overflow-hidden mb-4">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isHealthy ? "bg-[#0F5132]" : isWarning ? "bg-[#C5A059]" : "bg-[#111111]"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(2, ind.currentValue))}%` }}
                    />
                  </div>

                  {/* 부족 시 경영 위험 상황 */}
                  <div
                    className={`rounded-xl p-3.5 mb-3 ${
                      isHealthy
                        ? "bg-[#FAFAFA] border border-[#EAEAEA]"
                        : "bg-[#FBF7EE] border border-[#E6D5B3]"
                    }`}
                  >
                    <div className="text-[11px] font-bold text-[#111111] mb-1">
                      부족·이탈 시 경영 위험 상황
                    </div>
                    <p className="text-xs text-[#404040] leading-relaxed">{ind.riskScenario}</p>
                  </div>

                  {/* 실행 처방 */}
                  <div className="text-xs text-[#0F5132] bg-[#F4F8F5] border border-[#D4E7DA] rounded-xl p-3 mb-3">
                    <span className="font-bold">경영 처방: </span>
                    <span className="text-[#1F2937]">{ind.recommendation}</span>
                  </div>

                  {/* 학술/권위자 근거 토글 */}
                  <button
                    type="button"
                    onClick={() => toggleTheory(ind.id)}
                    className="w-full flex items-center justify-between text-[11px] font-semibold text-[#666666] hover:text-[#111111] pt-1 cursor-pointer"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <BookOpen size={12} className="text-[#B8924A]" />
                      권위자 이론 및 기준점 선정 근거 보기
                    </span>
                    {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>

                  {isExpanded && (
                    <div className="mt-2.5 pt-2.5 border-t border-[#F0F0F0] text-xs text-[#525252] leading-relaxed">
                      {ind.authorityTheory}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
