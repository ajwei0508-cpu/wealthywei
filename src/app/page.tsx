"use client";

import React, { useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/Card";
import { 
  TrendingUp, 
  Users, 
  ShieldCheck, 
  FileSpreadsheet, 
  Plus, 
  ArrowRight, 
  CheckCircle2, 
  FileSearch, 
  Info, 
  ChevronDown,
  TrendingDown,
  Calendar,
  Wallet
} from "lucide-react";
import * as XLSX from "xlsx";
import { useRevenue, RevenueData } from "@/context/RevenueContext";
import toast from "react-hot-toast";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";

interface MappingResult {
  original: string;
  standard: string;
}

export default function Home() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mappingResults, setMappingResults] = useState<MappingResult[]>([]);
  const [failedHeaders, setFailedHeaders] = useState<string[]>([]);
  const { data, compareData, monthlyData, selectedMonth, compareMonth, setSelectedMonth, setCompareMonth, setMonthlyData } = useRevenue();

  // 1. Month List for Selector
  const availableMonths = useMemo(() => {
    return Object.keys(monthlyData).sort().reverse();
  }, [monthlyData]);

  // 2. Comparison Logic (Current B vs Reference A)
  const getComparison = (key: keyof RevenueData) => {
    const prevValue = compareData[key];
    const currentValue = data[key];

    if (prevValue === undefined || prevValue === 0) return null;

    const diff = currentValue - prevValue;
    const percent = (diff / prevValue) * 100;

    return {
      percent: Math.abs(percent).toFixed(1),
      isUp: diff >= 0,
      diff
    };
  };

  // 3. Chart Data Preparation (Last 6 months)
  const chartData = useMemo(() => {
    return Object.keys(monthlyData)
      .sort()
      .slice(-6)
      .map(month => ({
        name: month.split("-")[1] + "월",
        revenue: monthlyData[month].totalRevenue,
        rawMonth: month
      }));
  }, [monthlyData]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 날짜 상관없이 등록: 프롬프트 제거 및 현재 선택된 월 또는 오늘 날짜 사용
    let targetMonth = selectedMonth || new Date().toISOString().slice(0, 7);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        const normalize = (text: any) => 
          String(text || "").replace(/[\n\r\s\(\)\[\]\{\}]/g, "").replace(/[^\w\uAC00-\uD7AF]+/g, "").trim();

        const extractedData: any = {};
        const successList: MappingResult[] = [];
        const foundHeadersInScan: string[] = [];
        
        const KEYWORD_GROUPS = {
          patientPay: { label: "본인부담금", keywords: ["본부금", "본인부담", "수납액", "환자부담"] },
          insuranceClaim: { label: "보험청구액", keywords: ["청구금", "보험청구", "공단청구", "공단부담", "조합부담"] },
          industrialAccidentClaim: { label: "산재청구액", keywords: ["산재", "산업재해"] },
          autoInsuranceClaim: { label: "자보청구액", keywords: ["자보", "자동차", "자동차보험"] },
          totalTreatmentFee: { label: "총진료비", keywords: ["총매출", "총진료", "합계", "총매출액"] },
          patientCount: { label: "내원환자수", keywords: ["내원", "환자수", "총내원"] },
          newPatientCount: { label: "신규환자수", keywords: ["신규", "신환", "초진"] },
          autoInsuranceCount: { label: "자보환자수", keywords: ["자보", "자동차"] },
          nonBenefit: { label: "비급여", keywords: ["비급여"] },
          accountsReceivable: { label: "미수금", keywords: ["미수금"] },
          cashCollection: { label: "현금수납", keywords: ["현금수납"] },
          cardCollection: { label: "카드수납", keywords: ["카드수납"] },
        };

        const parseNumericValue = (val: any) => {
          if (typeof val === "number") return val;
          if (typeof val === "string") {
            const cleaned = val.replace(/[^0-9.-]+/g, "");
            return parseFloat(cleaned) || 0;
          }
          return 0;
        };

        // 7행의 법칙 (Index 5: Header, Index 6: Data)
        let trueHeaderRowIndex = 5; 
        const headerRow = jsonData[trueHeaderRowIndex];
        
        if (!headerRow || headerRow.length < 3) {
          // Fallback scanning
          for (let i = 0; i < Math.min(jsonData.length, 15); i++) {
            const row = jsonData[i];
            let matchCount = 0;
            row.forEach(cell => {
              const norm = normalize(cell);
              Object.values(KEYWORD_GROUPS).forEach(group => {
                if (group.keywords.some(k => norm.includes(normalize(k)))) matchCount++;
              });
            });
            if (matchCount >= 3) {
              trueHeaderRowIndex = i;
              break;
            }
          }
        }

        const activeHeaderRow = jsonData[trueHeaderRowIndex];
        if (activeHeaderRow) {
          const colMap: Record<string, number> = {};
          activeHeaderRow.forEach((cell, colIndex) => {
            const norm = normalize(cell);
            if (!norm) return;
            Object.entries(KEYWORD_GROUPS).forEach(([key, group]) => {
              if (colMap[key] === undefined && group.keywords.some(k => norm.includes(normalize(k)))) {
                colMap[key] = colIndex;
              }
            });
          });

          // 필드별 데이터 추출 루틴
          Object.entries(colMap).forEach(([key, colIndex]) => {
            let foundValue = 0;
            
            // 1순위: '합계' 또는 '소계' 행 탐지
            for (let r = trueHeaderRowIndex + 1; r < Math.min(jsonData.length, trueHeaderRowIndex + 100); r++) {
              const firstColValue = normalize(jsonData[r][0]);
              if (firstColValue.includes("합계") || firstColValue.includes("소계")) {
                foundValue = parseNumericValue(jsonData[r][colIndex]);
                break;
              }
            }

            // 2순위: 합격 행이 없으면 7행(Index 6) 고정 추출
            if (foundValue === 0) {
              const dataRowIndex = trueHeaderRowIndex + 1; // 기본 7행
              if (jsonData[dataRowIndex]) {
                foundValue = parseNumericValue(jsonData[dataRowIndex][colIndex]);
              }
            }
            
            if (foundValue !== 0) {
              extractedData[key] = foundValue;
              successList.push({ original: String(activeHeaderRow[colIndex]).trim(), standard: (KEYWORD_GROUPS as any)[key].label });
            }
          });

          // 총매출 보정: 총진료비가 있으면 그것을 사용, 없으면 모든 주요 항목(비급여 포함) 합산
          if (extractedData.totalTreatmentFee) {
            extractedData.totalRevenue = extractedData.totalTreatmentFee;
          } else {
            extractedData.totalRevenue = 
              (extractedData.patientPay || 0) + 
              (extractedData.insuranceClaim || 0) + 
              (extractedData.autoInsuranceClaim || 0) + 
              (extractedData.nonBenefit || 0);
          }

          setMonthlyData(targetMonth, extractedData);
          setMappingResults(successList);
          setFailedHeaders([]);
          
          if (successList.length > 0) {
            toast.success(`${targetMonth} 매출 데이터를 분석 및 저장했습니다.`, { duration: 5000 });
          } else {
            toast.error("데이터 추출에 실패했습니다. 키워드가 일치하는지 확인해 주세요.");
          }
        } else {
          setMappingResults([]);
          setFailedHeaders(Array.from(new Set(foundHeadersInScan))); 
          toast.error("헤더 감지에 실패했습니다.");
        }
      } catch (error) {
        toast.error("파일 처리 중 오류 발생");
        console.error(error);
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatNumber = (num: number) => new Intl.NumberFormat("ko-KR").format(num);

  const ComparisonBadge = ({ metric }: { metric: keyof RevenueData }) => {
    const comp = getComparison(metric);
    if (!comp) return null;
    return (
      <div className={`flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-full ${comp.isUp ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600"}`}>
        {comp.isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
        {comp.percent}%
      </div>
    );
  };

  const totalRevComp = getComparison("totalRevenue");

  const formatMonth = (m: string) => {
    if (!m) return "데이터 없음";
    const [year, month] = m.split("-");
    const yearSuffix = year ? `${year.slice(2)}.` : "";
    return `${yearSuffix}${month}월`;
  };

  return (
    <main className="min-h-screen p-6 md:p-12 max-w-7xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-4">
          <div>
            <h2 className="text-zinc-500 text-sm font-medium mb-1">바른컨설팅 분석 모드</h2>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">안녕하세요, 원장님.</h1>
          </div>
          
          {/* Dual Month Selectors */}
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-zinc-400 ml-1">기준월 A</span>
              <div className="relative group">
                <button className="flex items-center gap-1.5 bg-zinc-100 hover:bg-zinc-200 px-3 py-2 rounded-xl text-sm font-bold text-zinc-900 transition-colors border border-zinc-200">
                  <Calendar size={14} className="text-zinc-500" />
                  {compareMonth || "선택"}
                  <ChevronDown size={14} className="text-zinc-400" />
                </button>
                <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-xl border border-zinc-100 p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-[140px]">
                  {availableMonths.map(m => (
                    <button key={m} onClick={() => setCompareMonth(m)} className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors ${m === compareMonth ? "bg-zinc-100 text-zinc-900" : "hover:bg-zinc-50 text-zinc-600"}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 text-zinc-300">
              <ArrowRight size={16} />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-primary ml-1">비교 대상월 B</span>
              <div className="relative group">
                <button className="flex items-center gap-1.5 bg-primary/5 hover:bg-primary/10 px-3 py-2 rounded-xl text-sm font-bold text-primary transition-colors border border-primary/20">
                  <Calendar size={14} className="text-primary" />
                  {selectedMonth}
                  <ChevronDown size={14} className="text-primary/40" />
                </button>
                <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-xl border border-zinc-100 p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-[140px]">
                  {availableMonths.map(m => (
                    <button key={m} onClick={() => setSelectedMonth(m)} className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors ${m === selectedMonth ? "bg-primary text-white" : "hover:bg-zinc-50 text-zinc-600"}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 w-full md:w-auto">
          <div className="flex items-center gap-3 w-full">
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="flex-1 md:flex-none bg-white text-slate-900 border border-zinc-200 px-5 py-2.5 rounded-full font-semibold text-sm flex items-center justify-center gap-2 toss-shadow hover:bg-zinc-50 transition-colors">
              <FileSpreadsheet size={18} className="text-emerald-600" />
              매출 엑셀 분석하기
            </button>
            <button className="flex-1 md:flex-none bg-primary text-white px-5 py-2.5 rounded-full font-semibold text-sm flex items-center justify-center gap-2 toss-shadow hover:opacity-90 transition-opacity">
              <Plus size={18} />
              새 컨설팅 등록
            </button>
          </div>
          <p className="text-[10px] text-zinc-400 font-medium">
            <Info size={10} className="inline mr-1 mb-0.5" />
            데이터는 서버에 저장되지 않고 브라우저에만 유지됩니다.
          </p>
        </div>
      </div>

      {/* Analysis Summary Banner */}
      {compareMonth && selectedMonth && compareMonth !== selectedMonth && totalRevComp && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
          <div className={`p-4 rounded-3xl flex items-center justify-center gap-3 border ${totalRevComp.isUp ? "bg-rose-50/50 border-rose-100" : "bg-blue-50/50 border-blue-100"}`}>
            <div className={`p-2 rounded-full ${totalRevComp.isUp ? "bg-rose-100 text-rose-600" : "bg-blue-100 text-blue-600"}`}>
              {totalRevComp.isUp ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
            </div>
            <p className="font-bold text-zinc-900">
              현재 <span className="text-primary">[{selectedMonth}]</span>의 매출은 <span className="text-zinc-500">[{compareMonth}]</span> 대비{" "}
              <span className={totalRevComp.isUp ? "text-rose-600" : "text-blue-600"}>
                {totalRevComp.percent}% {totalRevComp.isUp ? "상승" : "하락"}
              </span>한 상태입니다.
            </p>
          </div>
        </div>
      )}

      {/* Hero Sales Card */}
      <div onClick={() => router.push("/details")} className="cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99] group">
        <Card className="grid grid-cols-1 md:grid-cols-3 gap-8 md:divide-x md:divide-zinc-100 relative overflow-hidden bg-white px-6 py-6">
          {/* Card 1: 총매출 */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-zinc-500 font-bold text-xs uppercase tracking-wider">
                <TrendingUp size={16} className="text-primary" />
                총매출
              </div>
              <ComparisonBadge metric="totalRevenue" />
            </div>
            <div className="flex items-end gap-1 flex-wrap">
              <span className="text-4xl font-bold text-slate-900 leading-none whitespace-nowrap">{formatNumber(data.totalRevenue)}</span>
              <span className="text-lg font-semibold text-zinc-400 whitespace-nowrap">원</span>
              <span className="text-xs text-zinc-400 font-medium ml-1 whitespace-nowrap">({formatMonth(selectedMonth)})</span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-2 font-medium flex items-center gap-1 whitespace-nowrap">
              <span className="bg-zinc-100 px-1.5 py-0.5 rounded uppercase font-bold text-[9px]">A: 기준월</span>
              {compareMonth ? `${formatNumber(compareData.totalRevenue)}원 (${formatMonth(compareMonth)})` : "비교 대상 없음"}
            </div>
          </div>

          {/* Card 2: 보험 매출 (본인부담금 + 보험청구액 + 자보) */}
          <div className="md:pl-8 flex flex-col gap-1">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-zinc-500 font-bold text-xs uppercase tracking-wider">
                <ShieldCheck size={16} className="text-indigo-700" />
                보험 매출
              </div>
              {(() => {
                const valB = (data.patientPay || 0) + (data.insuranceClaim || 0) + (data.autoInsuranceClaim || 0);
                const valA = (compareData.patientPay || 0) + (compareData.insuranceClaim || 0) + (compareData.autoInsuranceClaim || 0);
                const diff = valB - valA;
                const percent = valA > 0 ? ((diff / valA) * 100).toFixed(1) : null;
                const isUp = diff >= 0;
                if (percent === null) return null;
                return (
                  <div className={`flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-full ${isUp ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600"}`}>
                    {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {Math.abs(parseFloat(percent))}%
                  </div>
                );
              })()}
            </div>
            <div className="flex items-end gap-1 flex-wrap">
              <span className="text-4xl font-bold text-slate-900 leading-none whitespace-nowrap">
                {formatNumber((data.patientPay || 0) + (data.insuranceClaim || 0) + (data.autoInsuranceClaim || 0))}
              </span>
              <span className="text-lg font-semibold text-zinc-400 whitespace-nowrap">원</span>
              <span className="text-xs text-zinc-400 font-medium ml-1 whitespace-nowrap">({formatMonth(selectedMonth)})</span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-2 font-medium flex items-center gap-1 whitespace-nowrap">
              <span className="bg-zinc-100 px-1.5 py-0.5 rounded uppercase font-bold text-[9px]">A: 기준월</span>
              {compareMonth ? `${formatNumber((compareData.patientPay || 0) + (compareData.insuranceClaim || 0) + (compareData.autoInsuranceClaim || 0))}원 (${formatMonth(compareMonth)})` : "비교 대상 없음"}
            </div>
          </div>

          {/* Card 3: 비급여 매출 */}
          <div className="md:pl-8 flex flex-col gap-1">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-zinc-500 font-bold text-xs uppercase tracking-wider">
                <Wallet size={16} className="text-emerald-700" />
                비급여 매출
              </div>
              <ComparisonBadge metric="nonBenefit" />
            </div>
            <div className="flex items-end gap-1 flex-wrap">
              <span className="text-4xl font-bold text-slate-900 leading-none whitespace-nowrap">{formatNumber(data.nonBenefit)}</span>
              <span className="text-lg font-semibold text-zinc-400 whitespace-nowrap">원</span>
              <span className="text-xs text-zinc-400 font-medium ml-1 whitespace-nowrap">({formatMonth(selectedMonth)})</span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-2 font-medium flex items-center gap-1 whitespace-nowrap">
              <span className="bg-zinc-100 px-1.5 py-0.5 rounded uppercase font-bold text-[9px]">A: 기준월</span>
              {compareMonth ? `${formatNumber(compareData.nonBenefit)}원 (${formatMonth(compareMonth)})` : "비교 대상 없음"}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          {chartData.length > 0 && (
            <Card>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-bold text-lg leading-tight">매출 성장 추이</h3>
                  <p className="text-xs text-zinc-400 mt-1">최근 6개월 데이터</p>
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9CA3AF" }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                    <RechartsTooltip cursor={{ fill: "#F9FAFB", radius: 8 }} content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs shadow-xl font-bold border-none">
                            {payload[0].value?.toLocaleString()}원
                          </div>
                        );
                      }
                      return null;
                    }} />
                    <Bar dataKey="revenue" radius={[6, 6, 0, 0]} barSize={24}>
                      {chartData.map((entry) => (
                        <Cell key={`cell-${entry.rawMonth}`} fill={entry.rawMonth === selectedMonth ? "#3182F6" : entry.rawMonth === compareMonth ? "#94A3B8" : "#E5E7EB"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {mappingResults.length > 0 && (
            <Card className="bg-emerald-50/30 border-emerald-100 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex items-center gap-2 mb-4 text-emerald-900 font-bold text-lg">
                <CheckCircle2 size={20} className="text-emerald-600" />
                <h3>매칭 결과 리포트</h3>
              </div>
              <div className="space-y-2">
                {mappingResults.map((res, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-emerald-100/50 last:border-0 text-emerald-800">
                    <span className="font-medium">[{res.original}]</span>
                    <ArrowRight size={14} className="text-emerald-400" />
                    <span className="font-bold text-emerald-900">{res.standard} 매칭 확인</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="flex flex-col">
            <h3 className="font-bold text-lg mb-4 text-primary">지능형 분석 리포트</h3>
            <div className="space-y-4 flex-1">
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100">
                <h4 className="font-bold text-sm mb-2">신규 환자 유입 분석</h4>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">대비월(B) vs 기준월(A)</span>
                  <ComparisonBadge metric="newPatientCount" />
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100">
                <h4 className="font-bold text-sm mb-2">비급여 매출 비중</h4>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">대비월(B) vs 기준월(A)</span>
                  <ComparisonBadge metric="nonBenefit" />
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 text-white border-none p-6">
            <h1 className="text-sm font-bold text-blue-400 mb-1 font-mono uppercase tracking-[0.2em]">System Status</h1>
            <h3 className="font-bold text-lg mb-2">데이터 클라우드 실시간 동기화</h3>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              현재 {Object.keys(monthlyData).length}개의 월별 데이터가 안전하게 보관되어 있습니다. <br />
              비교 모드를 통해 성장 전략을 도출하세요.
            </p>
            <button className="w-full bg-blue-600 text-white py-3 rounded-2xl font-bold text-sm hover:bg-blue-500 transition-colors toss-shadow">
              정밀 컨설팅 보고서 출력
            </button>
          </Card>
        </div>
      </div>
    </main>
  );
}
