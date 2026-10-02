"use client";

import React, { useState, useEffect, useMemo } from "react";
import Card from "@/components/Card";
import {
  BarChart3,
  Calendar,
  Clock,
  Users,
  Eye,
  TrendingUp,
  Activity,
  Smartphone,
  Monitor,
  Download,
  RefreshCw,
  Search,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  ChevronRight,
  Filter,
  CheckCircle2,
  Timer,
  FileSpreadsheet,
  Zap,
  Flame,
  Globe
} from "lucide-react";
import toast from "react-hot-toast";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  PieChart,
  Pie
} from "recharts";

type PeriodType = "today" | "7d" | "14d" | "30d" | "90d" | "all";
type RoleFilterType = "all" | "director" | "staff" | "guest";
type SubTabType = "overview" | "daily" | "monthly" | "hourly" | "dwell" | "users" | "live";

function formatSeconds(sec: number): string {
  if (!sec || isNaN(sec)) return "0초";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  if (m === 0) return `${s}초`;
  if (s === 0) return `${m}분`;
  return `${m}분 ${s}초`;
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat("ko-KR").format(num || 0);
}

export default function MasterAnalyticsDashboard() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodType>("30d");
  const [roleFilter, setRoleFilter] = useState<RoleFilterType>("all");
  const [subTab, setSubTab] = useState<SubTabType>("overview");
  const [data, setData] = useState<any>(null);
  const [searchUser, setSearchUser] = useState("");
  const [searchPage, setSearchPage] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchAnalytics = async (isRefresh = false) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/master/analytics?period=${period}&role=${roleFilter}${isRefresh ? "&refresh=true" : ""}`);
      if (!res.ok) throw new Error("통계 데이터를 불러오지 못했습니다.");
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "통계 로딩 실패");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted) {
      fetchAnalytics();
    }
  }, [mounted, period, roleFilter]);

  // Download CSV export
  const exportToCSV = () => {
    if (!data?.dailyStats) return;
    const headers = ["날짜", "총 조회수", "순 방문자수", "세션 수", "평균 체류시간(초)", "원장님 뷰", "직원 뷰", "비회원 뷰"];
    const rows = data.dailyStats.map((d: any) => [
      d.date,
      d.views,
      d.uniqueVisitors,
      d.sessions,
      d.avgDurationSec,
      d.directorViews,
      d.staffViews,
      d.guestViews
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((e: any[]) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `바른컨설팅_방문통계_${period}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV 파일이 다운로드되었습니다.");
  };

  // Filtered Top Users
  const filteredUsers = useMemo(() => {
    if (!data?.topUsers) return [];
    if (!searchUser.trim()) return data.topUsers;
    const q = searchUser.toLowerCase();
    return data.topUsers.filter((u: any) =>
      u.email.toLowerCase().includes(q) ||
      u.realName.toLowerCase().includes(q) ||
      u.clinicName.toLowerCase().includes(q)
    );
  }, [data?.topUsers, searchUser]);

  // Filtered Top Pages
  const filteredPages = useMemo(() => {
    if (!data?.topPages) return [];
    if (!searchPage.trim()) return data.topPages;
    const q = searchPage.toLowerCase();
    return data.topPages.filter((p: any) =>
      p.path.toLowerCase().includes(q) ||
      p.title.toLowerCase().includes(q)
    );
  }, [data?.topPages, searchPage]);

  // Dwell bracket chart data
  const dwellPieData = useMemo(() => {
    if (!data?.dwellBrackets) return [];
    return data.dwellBrackets.filter((b: any) => b.count > 0);
  }, [data?.dwellBrackets]);

  // Dayparts calculation (오전, 오후, 저녁, 심야)
  const dayparts = useMemo(() => {
    if (!data?.hourlyStats) return null;
    let morning = 0; // 06~11
    let afternoon = 0; // 12~17
    let evening = 0; // 18~23
    let night = 0; // 00~05
    data.hourlyStats.forEach((h: any) => {
      if (h.hour >= 6 && h.hour < 12) morning += h.views;
      else if (h.hour >= 12 && h.hour < 18) afternoon += h.views;
      else if (h.hour >= 18 && h.hour < 24) evening += h.views;
      else night += h.views;
    });
    const total = morning + afternoon + evening + night || 1;
    return {
      morning: { count: morning, pct: Math.round((morning / total) * 100) },
      afternoon: { count: afternoon, pct: Math.round((afternoon / total) * 100) },
      evening: { count: evening, pct: Math.round((evening / total) * 100) },
      night: { count: night, pct: Math.round((night / total) * 100) },
    };
  }, [data?.hourlyStats]);

  if (!mounted) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Top Controls & Filter Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white/5 border border-white/10 p-5 rounded-3xl backdrop-blur-xl shadow-xl">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-white/50 flex items-center gap-1.5 mr-2">
            <Calendar size={14} className="text-emerald-400" />
            분석 기간:
          </span>
          {(
            [
              { id: "today", label: "오늘" },
              { id: "7d", label: "최근 7일" },
              { id: "14d", label: "최근 14일" },
              { id: "30d", label: "최근 30일" },
              { id: "90d", label: "최근 90일" },
              { id: "all", label: "전체 기간" },
            ] as const
          ).map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                period === p.id
                  ? "bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/20 scale-105"
                  : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
          {/* Role Filter */}
          <div className="flex items-center gap-1 bg-black/30 p-1 rounded-xl border border-white/10">
            <Filter size={12} className="text-white/40 ml-2" />
            {(
              [
                { id: "all", label: "전체" },
                { id: "director", label: "원장님" },
                { id: "staff", label: "직원" },
                { id: "guest", label: "비회원" },
              ] as const
            ).map((r) => (
              <button
                key={r.id}
                onClick={() => setRoleFilter(r.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  roleFilter === r.id
                    ? "bg-white/20 text-white font-black"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={exportToCSV}
              className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              title="CSV 엑셀 다운로드"
            >
              <Download size={13} className="text-amber-400" />
              엑셀 다운
            </button>
            <button
              onClick={() => fetchAnalytics(true)}
              disabled={loading}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-all flex items-center justify-center"
              title="실시간 새로고침"
            >
              <RefreshCw size={14} className={loading ? "animate-spin text-emerald-400" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* 1. Total Views */}
        <Card className="bg-gradient-to-br from-emerald-500/10 via-white/5 to-transparent border-white/10 p-6 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Eye size={72} className="text-emerald-400" />
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Eye size={14} />
              누적 페이지 조회수
            </span>
            <span className="text-[10px] font-bold text-white/40 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
              {period === "today" ? "오늘" : period === "all" ? "전체" : period}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black text-white tracking-tight">
              {formatNumber(data?.summary?.totalViews || 0)}
              <span className="text-sm font-bold text-white/50 ml-1">회</span>
            </h3>
          </div>
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
            <span className="text-white/40">오늘 조회수</span>
            <span className="text-emerald-400 font-bold">+{formatNumber(data?.summary?.todayViews || 0)}회</span>
          </div>
        </Card>

        {/* 2. Unique Visitors */}
        <Card className="bg-gradient-to-br from-blue-500/10 via-white/5 to-transparent border-white/10 p-6 relative overflow-hidden group hover:border-blue-500/30 transition-all">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Users size={72} className="text-blue-400" />
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <Users size={14} />
              순 방문자 수 (UV)
            </span>
            <span className="text-[10px] font-bold text-white/40 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
              세션 {formatNumber(data?.summary?.totalSessions || 0)}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black text-white tracking-tight">
              {formatNumber(data?.summary?.uniqueVisitors || 0)}
              <span className="text-sm font-bold text-white/50 ml-1">명</span>
            </h3>
          </div>
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
            <span className="text-white/40">오늘 순 방문자</span>
            <span className="text-blue-400 font-bold">+{formatNumber(data?.summary?.todayVisitors || 0)}명</span>
          </div>
        </Card>

        {/* 3. Average Dwell Time */}
        <Card className="bg-gradient-to-br from-amber-500/10 via-white/5 to-transparent border-white/10 p-6 relative overflow-hidden group hover:border-amber-500/30 transition-all">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Clock size={72} className="text-amber-400" />
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={14} />
              평균 체류 시간
            </span>
            <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              이탈률 {data?.summary?.bounceRate || 0}%
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black text-white tracking-tight">
              {formatSeconds(data?.summary?.avgDurationSec || 0)}
            </h3>
          </div>
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
            <span className="text-white/40">오늘 평균 체류</span>
            <span className="text-amber-400 font-bold">{formatSeconds(data?.summary?.todayAvgDurationSec || 0)}</span>
          </div>
        </Card>

        {/* 4. Peak Hour */}
        <Card className="bg-gradient-to-br from-indigo-500/10 via-white/5 to-transparent border-white/10 p-6 relative overflow-hidden group hover:border-indigo-500/30 transition-all">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Flame size={72} className="text-indigo-400" />
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <Flame size={14} />
              최다 접속 골든타임
            </span>
            <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
              피크 시간대
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-white tracking-tight">
              {data?.summary?.peakHour || "집계 중"}
            </h3>
          </div>
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
            <span className="text-white/40">주 접속 기기</span>
            <span className="text-indigo-300 font-bold flex items-center gap-1">
              {data?.devices?.mobile > data?.devices?.desktop ? (
                <>
                  <Smartphone size={12} /> 모바일 ({Math.round((data.devices.mobile / Math.max(1, data.summary.totalViews)) * 100)}%)
                </>
              ) : (
                <>
                  <Monitor size={12} /> 데스크톱 ({Math.round(((data?.devices?.desktop || 1) / Math.max(1, data?.summary?.totalViews || 1)) * 100)}%)
                </>
              )}
            </span>
          </div>
        </Card>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto">
        {(
          [
            { id: "overview", label: "통합 개요 & 트렌드", icon: Activity },
            { id: "daily", label: "일별 추이 통계", icon: Calendar },
            { id: "monthly", label: "월별 비교 통계", icon: TrendingUp },
            { id: "hourly", label: "시간대별 골든타임 (0~23시)", icon: Clock },
            { id: "dwell", label: "체류시간 & 인기페이지", icon: Timer },
            { id: "users", label: "회원별 활동 랭킹", icon: Users },
            { id: "live", label: "실시간 접속 피드", icon: Zap },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          const isActive = subTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? "bg-white/15 text-white border border-white/20 shadow-lg shadow-black/20"
                  : "text-white/50 hover:text-white/80 hover:bg-white/5"
              }`}
            >
              <Icon size={14} className={isActive ? "text-emerald-400" : "text-white/40"} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* LOADING SPINNER */}
      {loading && (
        <div className="py-20 flex flex-col items-center justify-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
          <p className="text-xs text-white/50 font-bold animate-pulse">방문 및 트래픽 빅데이터를 분석하는 중입니다...</p>
        </div>
      )}

      {/* TAB CONTENT */}
      {!loading && data && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* TAB 1: OVERVIEW */}
          {subTab === "overview" && (
            <div className="space-y-8">
              {/* Daily Trend Chart */}
              <Card className="bg-white/5 border-white/10 p-6 rounded-[32px] overflow-hidden">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <TrendingUp size={20} className="text-emerald-400" />
                      일별 방문 조회수 및 순 방문자(UV) 추이
                    </h3>
                    <p className="text-xs text-white/40 mt-1">
                      일자별 페이지뷰(PV)와 실제 방문한 순 사용자(UV)의 변동 곡선입니다.
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                      페이지뷰 (PV)
                    </span>
                    <span className="flex items-center gap-1.5 text-blue-400">
                      <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
                      순 방문자 (UV)
                    </span>
                  </div>
                </div>

                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.dailyStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="uvGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                      <XAxis dataKey="label" stroke="#ffffff40" fontSize={11} tickLine={false} />
                      <YAxis stroke="#ffffff40" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0F172A",
                          borderColor: "#ffffff20",
                          borderRadius: "16px",
                          boxShadow: "0 10px 25px -5px rgba(0,0,0,0.5)",
                          fontSize: "12px",
                        }}
                        labelStyle={{ color: "#ffffff", fontWeight: "bold", marginBottom: "4px" }}
                        formatter={(val: any, name: any) => [
                          `${val.toLocaleString()}회`,
                          name === "views" ? "페이지뷰" : "순 방문자",
                        ]}
                      />
                      <Area type="monotone" dataKey="views" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#viewsGrad)" />
                      <Area type="monotone" dataKey="uniqueVisitors" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#uvGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Grid: Hourly summary & Top pages summary */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Hourly Mini Chart */}
                <Card className="bg-white/5 border-white/10 p-6 rounded-[32px]">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-base font-black text-white flex items-center gap-2">
                        <Clock size={18} className="text-indigo-400" />
                        24시간 활동 집중도
                      </h4>
                      <p className="text-xs text-white/40 mt-0.5">하루 중 사용자가 가장 많이 몰리는 시간대</p>
                    </div>
                    <span className="text-[11px] font-black text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
                      {data.summary.peakHour}
                    </span>
                  </div>
                  <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.hourlyStats} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                        <XAxis dataKey="label" stroke="#ffffff40" fontSize={10} tickLine={false} interval={2} />
                        <YAxis stroke="#ffffff40" fontSize={10} tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#0F172A",
                            borderColor: "#ffffff20",
                            borderRadius: "12px",
                            fontSize: "12px",
                          }}
                          formatter={(v: any) => [`${v.toLocaleString()}회`, "조회수"]}
                        />
                        <Bar dataKey="views" radius={[4, 4, 0, 0]}>
                          {data.hourlyStats.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.isPeak ? "#fbbf24" : "#6366f1"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Dwell Time Distribution */}
                <Card className="bg-white/5 border-white/10 p-6 rounded-[32px]">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-base font-black text-white flex items-center gap-2">
                        <Timer size={18} className="text-amber-400" />
                        체류 시간 구간별 분포
                      </h4>
                      <p className="text-xs text-white/40 mt-0.5">전체 평균 체류: {formatSeconds(data.summary.avgDurationSec)}</p>
                    </div>
                  </div>
                  <div className="space-y-3 pt-2">
                    {data.dwellBrackets.map((bracket: any) => {
                      const totalSamples = data.dwellBrackets.reduce((acc: number, b: any) => acc + b.count, 0) || 1;
                      const pct = Math.round((bracket.count / totalSamples) * 100);
                      return (
                        <div key={bracket.key} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-white/80 font-bold">{bracket.label}</span>
                            <span className="text-white/50 font-mono text-[11px]">
                              {formatNumber(bracket.count)}회 ({pct}%)
                            </span>
                          </div>
                          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${pct}%`, backgroundColor: bracket.color }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>

              {/* Top 5 Pages Preview */}
              <Card className="bg-white/5 border-white/10 p-6 rounded-[32px] overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-base font-black text-white flex items-center gap-2">
                    <Eye size={18} className="text-emerald-400" />
                    가장 많이 조회된 핵심 페이지 Top 5
                  </h4>
                  <button
                    onClick={() => setSubTab("dwell")}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                  >
                    전체 보기 <ChevronRight size={14} />
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-white/40 uppercase text-[10px] font-black">
                        <th className="py-3 px-4">순위</th>
                        <th className="py-3 px-4">페이지 이름</th>
                        <th className="py-3 px-4">URL 경로</th>
                        <th className="py-3 px-4 text-right">조회수</th>
                        <th className="py-3 px-4 text-right">순 방문자</th>
                        <th className="py-3 px-4 text-right">평균 체류시간</th>
                        <th className="py-3 px-4 text-right">점유율</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-medium">
                      {data.topPages.slice(0, 5).map((page: any, idx: number) => (
                        <tr key={page.path} className="hover:bg-white/5 transition-colors">
                          <td className="py-3.5 px-4 font-black">
                            <span
                              className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] ${
                                idx === 0
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                  : idx === 1
                                  ? "bg-slate-300/20 text-slate-200"
                                  : idx === 2
                                  ? "bg-amber-700/20 text-amber-400"
                                  : "bg-white/5 text-white/50"
                              }`}
                            >
                              {idx + 1}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-black text-white">{page.title}</td>
                          <td className="py-3.5 px-4 text-white/50 font-mono text-[11px]">{page.path}</td>
                          <td className="py-3.5 px-4 text-right font-black text-emerald-400">{formatNumber(page.views)}회</td>
                          <td className="py-3.5 px-4 text-right text-white/80">{formatNumber(page.uniqueVisitors)}명</td>
                          <td className="py-3.5 px-4 text-right text-amber-300 font-bold">{formatSeconds(page.avgDurationSec)}</td>
                          <td className="py-3.5 px-4 text-right">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black border border-emerald-500/20">
                              {page.share}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 2: DAILY STATS */}
          {subTab === "daily" && (
            <div className="space-y-8">
              <Card className="bg-white/5 border-white/10 p-6 rounded-[32px]">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <Calendar size={20} className="text-emerald-400" />
                      일별 상세 통계 추이 (Daily Trend)
                    </h3>
                    <p className="text-xs text-white/40 mt-1">일자별 총 페이지뷰, 순 방문자, 평균 체류시간 통계입니다.</p>
                  </div>
                  <button
                    onClick={exportToCSV}
                    className="px-4 py-2 bg-emerald-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 hover:bg-emerald-400 transition"
                  >
                    <Download size={14} /> 일별 데이터 CSV 추출
                  </button>
                </div>

                <div className="h-[300px] w-full mb-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.dailyStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                      <XAxis dataKey="label" stroke="#ffffff40" fontSize={11} tickLine={false} />
                      <YAxis stroke="#ffffff40" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0F172A",
                          borderColor: "#ffffff20",
                          borderRadius: "16px",
                          fontSize: "12px",
                        }}
                      />
                      <Legend />
                      <Bar dataKey="views" name="총 페이지뷰" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="uniqueVisitors" name="순 방문자" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Daily Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-white/40 uppercase text-[10px] font-black bg-black/20">
                        <th className="py-3 px-4">날짜 (KST)</th>
                        <th className="py-3 px-4 text-right">총 조회수</th>
                        <th className="py-3 px-4 text-right">순 방문자(UV)</th>
                        <th className="py-3 px-4 text-right">세션 수</th>
                        <th className="py-3 px-4 text-right">평균 체류시간</th>
                        <th className="py-3 px-4 text-right">원장님 접속</th>
                        <th className="py-3 px-4 text-right">직원 접속</th>
                        <th className="py-3 px-4 text-right">비회원</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-medium">
                      {[...data.dailyStats].reverse().map((day: any) => (
                        <tr key={day.date} className="hover:bg-white/5 transition-colors">
                          <td className="py-3 px-4 font-black text-white">{day.date}</td>
                          <td className="py-3 px-4 text-right font-black text-emerald-400">{formatNumber(day.views)}회</td>
                          <td className="py-3 px-4 text-right text-blue-400 font-bold">{formatNumber(day.uniqueVisitors)}명</td>
                          <td className="py-3 px-4 text-right text-white/70">{formatNumber(day.sessions)}</td>
                          <td className="py-3 px-4 text-right text-amber-300 font-bold">{formatSeconds(day.avgDurationSec)}</td>
                          <td className="py-3 px-4 text-right text-indigo-300">{formatNumber(day.directorViews)}</td>
                          <td className="py-3 px-4 text-right text-amber-400">{formatNumber(day.staffViews)}</td>
                          <td className="py-3 px-4 text-right text-white/40">{formatNumber(day.guestViews)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 3: MONTHLY STATS */}
          {subTab === "monthly" && (
            <div className="space-y-8">
              <Card className="bg-white/5 border-white/10 p-6 rounded-[32px]">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <TrendingUp size={20} className="text-emerald-400" />
                      월별 방문 조회수 및 성장 추이 (Monthly Overview)
                    </h3>
                    <p className="text-xs text-white/40 mt-1">서비스 런칭 이후 월간 누적 트래픽과 전월 대비 증감율입니다.</p>
                  </div>
                </div>

                <div className="h-[300px] w-full mb-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.monthlyStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                      <XAxis dataKey="month" stroke="#ffffff40" fontSize={11} tickLine={false} />
                      <YAxis stroke="#ffffff40" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0F172A",
                          borderColor: "#ffffff20",
                          borderRadius: "16px",
                          fontSize: "12px",
                        }}
                      />
                      <Legend />
                      <Bar dataKey="views" name="월간 페이지뷰" fill="#10b981" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="uniqueVisitors" name="월간 순방문자 (MAU)" fill="#818cf8" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-white/40 uppercase text-[10px] font-black bg-black/20">
                        <th className="py-3 px-4">기준월</th>
                        <th className="py-3 px-4 text-right">월간 총 페이지뷰</th>
                        <th className="py-3 px-4 text-right">순 방문자(MAU)</th>
                        <th className="py-3 px-4 text-right">총 세션수</th>
                        <th className="py-3 px-4 text-right">평균 체류시간</th>
                        <th className="py-3 px-4 text-right">전월 대비 증감</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-medium">
                      {data.monthlyStats.map((m: any) => (
                        <tr key={m.month} className="hover:bg-white/5 transition-colors">
                          <td className="py-4 px-4 font-black text-white text-sm">{m.month}</td>
                          <td className="py-4 px-4 text-right font-black text-emerald-400 text-sm">{formatNumber(m.views)}회</td>
                          <td className="py-4 px-4 text-right text-indigo-300 font-bold">{formatNumber(m.uniqueVisitors)}명</td>
                          <td className="py-4 px-4 text-right text-white/70">{formatNumber(m.sessions)}</td>
                          <td className="py-4 px-4 text-right text-amber-300 font-bold">{formatSeconds(m.avgDurationSec)}</td>
                          <td className="py-4 px-4 text-right">
                            {m.growthRate !== 0 ? (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-black inline-flex items-center gap-1 ${
                                  m.growthRate > 0
                                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                    : "bg-emerald-500/10 text-amber-400 border border-emerald-500/20"
                                }`}
                              >
                                {m.growthRate > 0 ? `+${m.growthRate}%` : `${m.growthRate}%`}
                              </span>
                            ) : (
                              <span className="text-white/30">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 4: HOURLY STATS */}
          {subTab === "hourly" && (
            <div className="space-y-8">
              {/* Dayparts 4-Box Overview */}
              {dayparts && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="bg-white/5 border-white/10 p-5 rounded-2xl">
                    <span className="text-[10px] font-black text-white/40 uppercase">오전 (06시 ~ 12시)</span>
                    <h4 className="text-2xl font-black text-white mt-1">{formatNumber(dayparts.morning.count)}회</h4>
                    <p className="text-xs text-emerald-400 mt-1 font-bold">점유율 {dayparts.morning.pct}% (진료 준비/개시)</p>
                  </Card>
                  <Card className="bg-white/5 border-white/10 p-5 rounded-2xl">
                    <span className="text-[10px] font-black text-white/40 uppercase">오후 (12시 ~ 18시)</span>
                    <h4 className="text-2xl font-black text-white mt-1">{formatNumber(dayparts.afternoon.count)}회</h4>
                    <p className="text-xs text-amber-400 mt-1 font-bold">점유율 {dayparts.afternoon.pct}% (점심 & 오후 진료)</p>
                  </Card>
                  <Card className="bg-white/5 border-white/10 p-5 rounded-2xl">
                    <span className="text-[10px] font-black text-white/40 uppercase">저녁 (18시 ~ 24시)</span>
                    <h4 className="text-2xl font-black text-white mt-1">{formatNumber(dayparts.evening.count)}회</h4>
                    <p className="text-xs text-indigo-400 mt-1 font-bold">점유율 {dayparts.evening.pct}% (진료 마감 & 복습)</p>
                  </Card>
                  <Card className="bg-white/5 border-white/10 p-5 rounded-2xl">
                    <span className="text-[10px] font-black text-white/40 uppercase">심야 (00시 ~ 06시)</span>
                    <h4 className="text-2xl font-black text-white mt-1">{formatNumber(dayparts.night.count)}회</h4>
                    <p className="text-xs text-white/40 mt-1 font-bold">점유율 {dayparts.night.pct}% (야간 접속)</p>
                  </Card>
                </div>
              )}

              {/* 24-Hour Full Bar Chart */}
              <Card className="bg-white/5 border-white/10 p-6 rounded-[32px]">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <Clock size={20} className="text-indigo-400" />
                      24시간 시간대별 트래픽 분포 (00:00 ~ 23:59)
                    </h3>
                    <p className="text-xs text-white/40 mt-1">
                      골드 컬러 막대는 가장 많은 접속이 발생한 피크 타임입니다.
                    </p>
                  </div>
                </div>

                <div className="h-[340px] w-full mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.hourlyStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                      <XAxis dataKey="label" stroke="#ffffff40" fontSize={11} tickLine={false} />
                      <YAxis stroke="#ffffff40" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0F172A",
                          borderColor: "#ffffff20",
                          borderRadius: "16px",
                          fontSize: "12px",
                        }}
                        formatter={(val: any, name: any) => [
                          `${val.toLocaleString()}회`,
                          name === "views" ? "조회수" : "순 방문자",
                        ]}
                      />
                      <Bar dataKey="views" name="조회수" radius={[6, 6, 0, 0]}>
                        {data.hourlyStats.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.isPeak ? "#fbbf24" : "#6366f1"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Hourly Table */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                  {data.hourlyStats.map((h: any) => (
                    <div
                      key={h.hour}
                      className={`p-3 rounded-2xl border transition-all ${
                        h.isPeak
                          ? "bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/10"
                          : "bg-white/5 border-white/5"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-white">{h.label}</span>
                        {h.isPeak && <span className="text-[9px] font-black text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded">PEAK</span>}
                      </div>
                      <p className="text-base font-black text-white mt-1.5">{formatNumber(h.views)}회</p>
                      <p className="text-[10px] text-white/40 mt-0.5">평균 {formatSeconds(h.avgDurationSec)}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* TAB 5: DWELL & PAGES */}
          {subTab === "dwell" && (
            <div className="space-y-8">
              {/* Dwell Breakdown Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-white/5 border-white/10 p-6 rounded-[28px]">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl">
                      <Clock size={24} />
                    </div>
                    <div>
                      <p className="text-xs text-white/40 font-bold">플랫폼 전체 평균 체류시간</p>
                      <h4 className="text-2xl font-black text-white">{formatSeconds(data.summary.avgDurationSec)}</h4>
                    </div>
                  </div>
                </Card>
                <Card className="bg-white/5 border-white/10 p-6 rounded-[28px]">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-rose-500/10 text-rose-400 rounded-2xl">
                      <Zap size={24} />
                    </div>
                    <div>
                      <p className="text-xs text-white/40 font-bold">이탈률 (10초 미만 종료)</p>
                      <h4 className="text-2xl font-black text-white">{data.summary.bounceRate}%</h4>
                    </div>
                  </div>
                </Card>
                <Card className="bg-white/5 border-white/10 p-6 rounded-[28px]">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl">
                      <Sparkles size={24} />
                    </div>
                    <div>
                      <p className="text-xs text-white/40 font-bold">집중 열람 비율 (3분 이상)</p>
                      <h4 className="text-2xl font-black text-white">
                        {(() => {
                          const total = data.dwellBrackets.reduce((a: number, b: any) => a + b.count, 0) || 1;
                          const deep = (data.dwellBrackets[4]?.count || 0) + (data.dwellBrackets[5]?.count || 0);
                          return `${Math.round((deep / total) * 100)}%`;
                        })()}
                      </h4>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Top Pages Full Table */}
              <Card className="bg-white/5 border-white/10 p-6 rounded-[32px]">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <Eye size={20} className="text-emerald-400" />
                      페이지별 방문 조회수 및 체류 시간 순위
                    </h3>
                    <p className="text-xs text-white/40 mt-1">어떤 콘텐츠와 메뉴가 가장 인기 있고 오래 머무는지 확인하세요.</p>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={14} />
                    <input
                      type="text"
                      placeholder="페이지명 또는 경로 검색..."
                      value={searchPage}
                      onChange={(e) => setSearchPage(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-white/40 uppercase text-[10px] font-black bg-black/20">
                        <th className="py-3.5 px-4">순위</th>
                        <th className="py-3.5 px-4">페이지 이름</th>
                        <th className="py-3.5 px-4">URL 경로</th>
                        <th className="py-3.5 px-4 text-right">총 조회수</th>
                        <th className="py-3.5 px-4 text-right">순 방문자(UV)</th>
                        <th className="py-3.5 px-4 text-right">평균 체류 시간</th>
                        <th className="py-3.5 px-4 text-right">트래픽 점유율</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-medium">
                      {filteredPages.map((page: any, idx: number) => (
                        <tr key={page.path} className="hover:bg-white/5 transition-colors">
                          <td className="py-3.5 px-4 font-black">
                            <span
                              className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] ${
                                idx === 0
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                  : idx === 1
                                  ? "bg-slate-300/20 text-slate-200"
                                  : idx === 2
                                  ? "bg-amber-700/20 text-amber-400"
                                  : "bg-white/5 text-white/50"
                              }`}
                            >
                              {idx + 1}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-black text-white">{page.title}</td>
                          <td className="py-3.5 px-4 text-white/50 font-mono text-[11px]">{page.path}</td>
                          <td className="py-3.5 px-4 text-right font-black text-emerald-400">{formatNumber(page.views)}회</td>
                          <td className="py-3.5 px-4 text-right text-blue-400 font-bold">{formatNumber(page.uniqueVisitors)}명</td>
                          <td className="py-3.5 px-4 text-right text-amber-300 font-bold">{formatSeconds(page.avgDurationSec)}</td>
                          <td className="py-3.5 px-4 text-right">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black border border-emerald-500/20">
                              {page.share}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 6: USERS RANKING */}
          {subTab === "users" && (
            <div className="space-y-8">
              <Card className="bg-white/5 border-white/10 p-6 rounded-[32px]">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <Users size={20} className="text-indigo-400" />
                      원장님 및 회원별 활동 랭킹 (Top Active Users)
                    </h3>
                    <p className="text-xs text-white/40 mt-1">
                      플랫폼을 가장 열정적으로 활용하고 계신 원장님들과 직원들의 방문 기록입니다.
                    </p>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={14} />
                    <input
                      type="text"
                      placeholder="원장님 성함, 한의원, 이메일..."
                      value={searchUser}
                      onChange={(e) => setSearchUser(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-white/40 uppercase text-[10px] font-black bg-black/20">
                        <th className="py-3.5 px-4">순위</th>
                        <th className="py-3.5 px-4">회원 정보</th>
                        <th className="py-3.5 px-4">소속 한의원</th>
                        <th className="py-3.5 px-4">계정 구분</th>
                        <th className="py-3.5 px-4 text-right">총 방문 조회수</th>
                        <th className="py-3.5 px-4 text-right">평균 체류 시간</th>
                        <th className="py-3.5 px-4">최애 방문 페이지</th>
                        <th className="py-3.5 px-4 text-right">최근 활동</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-medium">
                      {filteredUsers.map((u: any, idx: number) => (
                        <tr key={u.email} className="hover:bg-white/5 transition-colors">
                          <td className="py-3.5 px-4 font-black">
                            <span
                              className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] ${
                                idx === 0
                                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                                  : idx === 1
                                  ? "bg-slate-300/20 text-slate-200"
                                  : idx === 2
                                  ? "bg-amber-700/20 text-amber-400"
                                  : "bg-white/5 text-white/50"
                              }`}
                            >
                              {idx + 1}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div>
                              <p className="font-extrabold text-white">{u.realName}</p>
                              <p className="text-[10px] text-white/40 font-mono">{u.email}</p>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-md bg-white/5 text-amber-300 border border-white/10 text-[11px] font-bold">
                              {u.clinicName}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                                u.role === "director"
                                  ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                                  : u.role === "staff"
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                  : "bg-white/5 text-white/40 border-white/10"
                              }`}
                            >
                              {u.role === "director" ? "원장님" : u.role === "staff" ? "직원" : "게스트"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-black text-indigo-400 text-sm">
                            {formatNumber(u.views)}회
                          </td>
                          <td className="py-3.5 px-4 text-right text-amber-300 font-bold">
                            {formatSeconds(u.avgDurationSec)}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-white/80 font-bold">{u.favoritePage}</span>
                          </td>
                          <td className="py-3.5 px-4 text-right text-white/40 text-[11px]">
                            {new Date(u.lastActive).toLocaleDateString("ko-KR", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 7: LIVE ACTIVITY STREAM */}
          {subTab === "live" && (
            <div className="space-y-8">
              <Card className="bg-white/5 border-white/10 p-6 rounded-[32px]">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <Zap size={20} className="text-amber-400 animate-pulse" />
                      실시간 최신 접속 스트림 (Live Activity Feed)
                    </h3>
                    <p className="text-xs text-white/40 mt-1">가장 최근 발생한 50건의 접속 및 활동 로그입니다.</p>
                  </div>
                  <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    실시간 감지 활성화
                  </span>
                </div>

                <div className="space-y-3">
                  {data.recentActivities.map((act: any) => (
                    <div
                      key={act.id}
                      className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/15 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white/50 shrink-0">
                          {act.device === "mobile" ? <Smartphone size={16} /> : <Monitor size={16} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-white text-xs">{act.userName}</span>
                            {act.clinicName && act.clinicName !== "-" && (
                              <span className="text-[10px] text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded font-bold">
                                {act.clinicName}
                              </span>
                            )}
                            <span className="text-[10px] text-white/30 font-mono">({act.userEmail})</span>
                          </div>
                          <p className="text-xs text-emerald-400 font-bold mt-0.5">
                            {act.title} <span className="text-white/30 font-mono text-[10px]">({act.path})</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs shrink-0 self-end sm:self-center">
                        {act.durationSec > 0 && (
                          <span className="text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded text-[11px]">
                            {formatSeconds(act.durationSec)} 머무름
                          </span>
                        )}
                        <span className="text-white/40 text-[11px]">
                          {new Date(act.createdAt).toLocaleTimeString("ko-KR", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
