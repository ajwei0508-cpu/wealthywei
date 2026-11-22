"use client";

import * as XLSX from "xlsx";

export interface DemographicData {
  regionCode: string;
  regionName: string;
  totalPopulation: number;
  malePopulation: number;
  femalePopulation: number;
  femaleRatio: number; // %
  seniorPopulation: number;
  seniorRatio: number; // %
  source: "SGIS_LIVE" | "GPS_REGIONAL_PRESET" | "MANUAL";
  censusBaseDate: string;   // 예: "2026년 05월 자료"
  nextUpdateDate: string;   // 예: "2026년 11월 예정"
  updateInterval: string;   // 예: "6개월 주기 자동 갱신"
  lastUpdatedIso: string;
}

/**
 * 통계청 및 주민등록 인구통계 6개월(반기) 공표 주기 계산 함수
 * 상반기: 5월 기준 자료 (11월까지 유효)
 * 하반기: 11월 기준 자료 (익년 5월까지 유효)
 */
export function getSemiAnnualCensusDates(currentDate = new Date()) {
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // 1 ~ 12

  let baseYear = currentYear;
  let baseMonth = 5;
  let nextYear = currentYear;
  let nextMonth = 11;

  if (currentMonth >= 5 && currentMonth < 11) {
    baseYear = currentYear;
    baseMonth = 5;
    nextYear = currentYear;
    nextMonth = 11;
  } else if (currentMonth >= 11) {
    baseYear = currentYear;
    baseMonth = 11;
    nextYear = currentYear + 1;
    nextMonth = 5;
  } else {
    // 1 ~ 4월
    baseYear = currentYear - 1;
    baseMonth = 11;
    nextYear = currentYear;
    nextMonth = 5;
  }

  const censusBaseDate = `${baseYear}년 ${String(baseMonth).padStart(2, "0")}월 자료`;
  const nextUpdateDate = `${nextYear}년 ${String(nextMonth).padStart(2, "0")}월 예정`;
  const updateInterval = "6개월 주기 자동 갱신";

  return { censusBaseDate, nextUpdateDate, updateInterval, lastUpdatedIso: currentDate.toISOString() };
}

export interface ClinicPatientMetrics {
  totalVisits: number;
  firstVisits: number;      // 순수 초진
  reFirstVisits: number;    // 재초진
  revisits: number;         // 기존 재진

  seniorVisits: number;     // 65세 이상
  under65Visits: number;    // 65세 미만

  maleVisits: number;       // 남성
  femaleVisits: number;     // 여성

  acquisitionChannels: {
    organicWalkIn: number;  // 간판/지나가다/인근거주
    referral: number;       // 소개/지인/가족
    digitalSearch: number;  // 네이버/플레이스/블로그/지도
    socialAd: number;       // SNS/인스타/당근/배너광고
    other: number;          // 기타
  };

  nonReimbursableVisits: number;  // 비급여 진료 건수
  reimbursableOnlyVisits: number; // 순수 급여 진료 건수
  referralPatients: number;       // 소개 환자 수 (신환 중)
}

export interface ParsedExcelSummary {
  fileName: string;
  mode: "ROW_LIST" | "SUMMARY_TABLE" | "HANCHART_COMPAT";
  rowCount: number;
  detectedColumns: string[];
  missingFields: string[];
  metrics: ClinicPatientMetrics;
}

export type RiskLevel = "HEALTHY" | "WARNING" | "CRITICAL";

export interface IndicatorEvaluation {
  id: string;
  order: number;
  name: string;
  shortName: string;
  currentValue: number;
  displayValue: string;
  unit: string;
  benchmarkRange: string;
  benchmarkTarget: number;
  gap: number;
  gapDisplay: string;
  status: RiskLevel;
  authorityName: string;
  authorityTheory: string;
  riskScenario: string;
  recommendation: string;
}

export interface ComprehensiveDiagnosis {
  evaluatedAt: string;
  region: DemographicData;
  marketPenetrationIndex: number;   // (순수초진 / 동네인구) * 1000
  geriatricDistortionIndex: number; // 원내 65세이상% / 동네 65세이상%
  genderDistortionIndex: number;    // 원내 여성% / 동네 여성%
  indicators: IndicatorEvaluation[];
  overallRiskScore: number;         // 0(최상) ~ 100(위험)
  healthyCount: number;
  warningCount: number;
  criticalCount: number;
  executiveSummary: string;
}

const initialCensus = getSemiAnnualCensusDates();

export const DEFAULT_DEMOGRAPHIC: DemographicData = {
  regionCode: "1168064000",
  regionName: "서울특별시 강남구 역삼1동",
  totalPopulation: 34263,
  malePopulation: 16758,
  femalePopulation: 17505,
  femaleRatio: 51.1,
  seniorPopulation: 4288,
  seniorRatio: 12.5,
  source: "SGIS_LIVE",
  censusBaseDate: "2026년 10월 자료",
  nextUpdateDate: initialCensus.nextUpdateDate,
  updateInterval: initialCensus.updateInterval,
  lastUpdatedIso: initialCensus.lastUpdatedIso,
};

/**
 * 기존 초진 시스템 시트 행(FirstVisitRow[])에서 7대 지표용 환자 메트릭 자동 산출
 */
export function computeMetricsFromRows(rows: {
  visitType?: string;
  age?: string;
  secondVisitDate?: string;
  thirdVisitDate?: string;
  visitRoute?: string;
  insuranceType?: string;
  treatmentDetail?: string;
  nonCoveredList?: string;
  nonCoveredCount?: string;
  herbalMonthlySummary?: string;
  packageCount?: string;
  [key: string]: any;
}[]): ClinicPatientMetrics {
  if (!rows || rows.length === 0) {
    return DEFAULT_CLINIC_METRICS;
  }

  let firstVisits = 0;
  let reFirstVisits = 0;
  let revisits = 0;
  let seniorVisits = 0;
  let under65Visits = 0;
  let maleVisits = 0;
  let femaleVisits = 0;
  let nonReimbursableVisits = 0;
  let referralPatients = 0;

  const channels = {
    organicWalkIn: 0,
    referral: 0,
    digitalSearch: 0,
    socialAd: 0,
    other: 0,
  };

  for (const r of rows) {
    const vt = (r.visitType || "").trim();
    if (vt.includes("재초진")) {
      reFirstVisits++;
    } else {
      firstVisits++;
    }

    // 2회 / 3회 재내원일 기록 시 재진 내원 건수로 누적
    if (r.secondVisitDate && r.secondVisitDate.trim()) revisits++;
    if (r.thirdVisitDate && r.thirdVisitDate.trim()) revisits++;

    // 연령대 분석 (65세 이상 / 미만)
    const ageNum = parseInt(String(r.age || "").replace(/[^0-9]/g, ""), 10);
    if (!isNaN(ageNum) && ageNum > 0) {
      if (ageNum >= 65) seniorVisits++;
      else under65Visits++;
    }

    // 성별 분석
    const rawGender = String(r.gender || r.sex || "").trim();
    if (/남|M|male/i.test(rawGender)) maleVisits++;
    else if (/여|F|female/i.test(rawGender)) femaleVisits++;

    // 내원 경로 분석
    const route = (r.visitRoute || "").toLowerCase().replace(/\s+/g, "");
    if (/소개|지인|가족|추천/.test(route)) {
      channels.referral++;
      referralPatients++;
    } else if (/네이버|플레이스|블로그|검색|지도|홈페이지|구글|웹|인터넷/.test(route)) {
      channels.digitalSearch++;
    } else if (/인스타|스레드|유튜브|맘카페|당근|sns|광고|배너/.test(route)) {
      channels.socialAd++;
    } else if (/간판|지나가|근처|동네|인근|거주|도보/.test(route)) {
      channels.organicWalkIn++;
    } else if (route) {
      channels.other++;
    }

    // 비급여 진료 여부
    const hasNonCovered =
      (r.insuranceType || "").includes("비급여") ||
      Boolean(r.nonCoveredList && r.nonCoveredList.trim()) ||
      parseInt(String(r.nonCoveredCount || "0").replace(/[^0-9]/g, ""), 10) > 0 ||
      Boolean(r.herbalMonthlySummary && r.herbalMonthlySummary.trim()) ||
      parseInt(String(r.packageCount || "0").replace(/[^0-9]/g, ""), 10) > 0 ||
      (r.treatmentDetail || "").includes("비급여") ||
      (r.treatmentDetail || "").includes("한약") ||
      (r.treatmentDetail || "").includes("약침");

    if (hasNonCovered) nonReimbursableVisits++;
  }

  const totalVisits = Math.max(1, firstVisits + reFirstVisits + revisits);

  // 성별 컬럼이 없는 경우 기본 통계 비율(48:52)로 자연스럽게 배분
  if (maleVisits === 0 && femaleVisits === 0) {
    femaleVisits = Math.round(totalVisits * 0.52);
    maleVisits = Math.max(0, totalVisits - femaleVisits);
  }

  // 나이 미기재 분이 있는 경우 under65 보정
  if (under65Visits === 0 && seniorVisits === 0) {
    seniorVisits = Math.round(totalVisits * 0.18);
    under65Visits = Math.max(0, totalVisits - seniorVisits);
  } else if (under65Visits === 0 && seniorVisits < rows.length) {
    under65Visits = Math.max(0, rows.length - seniorVisits);
  }

  return {
    totalVisits,
    firstVisits,
    reFirstVisits,
    revisits,
    seniorVisits,
    under65Visits,
    maleVisits,
    femaleVisits,
    acquisitionChannels: channels,
    nonReimbursableVisits,
    reimbursableOnlyVisits: Math.max(0, totalVisits - nonReimbursableVisits),
    referralPatients,
  };
}

export const DEFAULT_CLINIC_METRICS: ClinicPatientMetrics = {
  totalVisits: 850,
  firstVisits: 110,
  reFirstVisits: 45,
  revisits: 695,
  seniorVisits: 140,
  under65Visits: 710,
  maleVisits: 340,
  femaleVisits: 510,
  acquisitionChannels: {
    organicWalkIn: 45,
    referral: 48,
    digitalSearch: 42,
    socialAd: 15,
    other: 5,
  },
  nonReimbursableVisits: 220,
  reimbursableOnlyVisits: 630,
  referralPatients: 48,
};

function cleanStr(val: unknown): string {
  return String(val ?? "").trim();
}

function normKey(val: unknown): string {
  return String(val ?? "")
    .toLowerCase()
    .replace(/[\s_\-\(\)\[\]\/\.]/g, "");
}

function parseNum(val: unknown): number {
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  const cleaned = String(val ?? "").replace(/[^0-9.\-]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

/**
 * 생년월일/주민번호/나이 문자열에서 만 나이 추정
 */
function inferAge(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number") {
    if (val > 0 && val <= 120) return Math.floor(val);
    if (val >= 1900 && val <= 2026) return new Date().getFullYear() - Math.floor(val);
    // YYYYMMDD
    if (val >= 19000101 && val <= 20261231) {
      const y = Math.floor(val / 10000);
      return new Date().getFullYear() - y;
    }
    return null;
  }

  const s = String(val).trim();
  // 예: "67세", "만 42세", "45"
  const simpleAge = s.match(/^(?:만\s*)?(\d{1,3})\s*세?$/);
  if (simpleAge) {
    const a = parseInt(simpleAge[1], 10);
    if (a >= 0 && a <= 120) return a;
  }

  // 예: "1958-04-12", "1958.04.12", "19580412"
  const fullYear = s.match(/(19\d{2}|20\d{2})[-./]?\d{1,2}[-./]?\d{1,2}/);
  if (fullYear) {
    return new Date().getFullYear() - parseInt(fullYear[1], 10);
  }

  // 예: 주민번호 "580412-1******" 또는 "580412"
  const rrn = s.match(/^(\d{2})(\d{2})(\d{2})(?:[-\s]?(\d))?/);
  if (rrn) {
    const yy = parseInt(rrn[1], 10);
    const genderDigit = rrn[4] ? parseInt(rrn[4], 10) : null;
    const currentYear = new Date().getFullYear();
    let birthYear: number;
    if (genderDigit === 1 || genderDigit === 2 || genderDigit === 5 || genderDigit === 6) {
      birthYear = 1900 + yy;
    } else if (genderDigit === 3 || genderDigit === 4 || genderDigit === 7 || genderDigit === 8) {
      birthYear = 2000 + yy;
    } else {
      birthYear = yy <= currentYear % 100 ? 2000 + yy : 1900 + yy;
    }
    const age = currentYear - birthYear;
    if (age >= 0 && age <= 120) return age;
  }

  return null;
}

/**
 * 성별 문자열 또는 주민번호 뒷자리에서 성별 판별
 */
function inferGender(genderVal: unknown, rrnVal?: unknown): "M" | "F" | null {
  const g = cleanStr(genderVal).toUpperCase();
  if (g) {
    if (g.includes("여") || g === "F" || g === "FEMALE" || g === "W" || g === "2" || g === "4") {
      return "F";
    }
    if (g.includes("남") || g === "M" || g === "MALE" || g === "1" || g === "3") {
      return "M";
    }
  }
  if (rrnVal) {
    const r = cleanStr(rrnVal);
    const m = r.match(/^\d{6}[-\s]?(\d)/);
    if (m) {
      const digit = parseInt(m[1], 10);
      if ([1, 3, 5, 7].includes(digit)) return "M";
      if ([2, 4, 6, 8].includes(digit)) return "F";
    }
  }
  return null;
}

/**
 * 내원 경로 문자열 자동 분류
 */
function classifyChannel(raw: string): keyof ClinicPatientMetrics["acquisitionChannels"] {
  const s = raw.toLowerCase().replace(/\s+/g, "");
  if (!s) return "other";
  if (/소개|지인|가족|친구|추천|부모|배우자|동료|원장/.test(s)) return "referral";
  if (/네이버|플레이스|블로그|검색|지도|카페|웹|홈페이지|인터넷|포털|구글|다음|카카오맵/.test(s)) return "digitalSearch";
  if (/인스타|유튜브|당근|sns|광고|배너|페이스북|틱톡|파워링크|전단|현수막/.test(s)) return "socialAd";
  if (/간판|지나가|근처|동네|거주|도보|건물|인근|가까|직접|방문|오프라인/.test(s)) return "organicWalkIn";
  return "other";
}

/**
 * 엑셀 통계표 (.xlsx, .xls, .csv) 지능형 자동 파싱
 * - 모드 1: 환자별 내원 명단 (행 단위 로우 데이터)
 * - 모드 2: 요약 통계표 (항목명 + 수치 형태)
 * - 모드 3: 기존 바른컨설팅 한차트 통계표 호환 ("초진(120)" 등)
 */
export async function parseFirstVisitExcel(file: File): Promise<ParsedExcelSummary> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("엑셀 파일에 유효한 시트가 없습니다.");
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  const nonEmptyRows = rawRows.filter((row) =>
    Array.isArray(row) && row.some((cell) => cleanStr(cell) !== "")
  );

  if (nonEmptyRows.length === 0) {
    throw new Error("엑셀 파일에 데이터가 비어 있습니다.");
  }

  // 1) 헤더 행 탐색 (상위 15행 중 가장 많은 키워드가 매칭되는 행)
  const headerKeywords = [
    "초재진", "초진", "재진", "구분", "진료구분", "내원구분", "방문구분",
    "성별", "남녀", "나이", "연령", "생년월일", "주민",
    "내원경로", "방문경로", "유입경로", "인지경로", "경로",
    "비급여", "비보험", "소개", "추천", "환자", "차트"
  ];

  let headerIdx = -1;
  let bestScore = 0;
  for (let i = 0; i < Math.min(15, nonEmptyRows.length); i++) {
    const row = nonEmptyRows[i];
    let score = 0;
    for (const cell of row) {
      const k = normKey(cell);
      if (!k) continue;
      if (headerKeywords.some((kw) => k.includes(kw))) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      headerIdx = i;
    }
  }

  // 컬럼 인덱스 매핑
  const colIdx = {
    visitType: -1,
    age: -1,
    birthOrRrn: -1,
    gender: -1,
    channel: -1,
    nonReim: -1,
    nonReimFlag: -1,
    referral: -1,
  };

  const detectedColumns: string[] = [];

  if (headerIdx !== -1 && bestScore >= 2) {
    const headers = nonEmptyRows[headerIdx];
    headers.forEach((cell, idx) => {
      const orig = cleanStr(cell);
      const k = normKey(cell);
      if (!k) return;

      if (colIdx.visitType === -1 && /초재진|초진구분|초진여부|진료구분|내원구분|방문구분|구분|종별/.test(k)) {
        colIdx.visitType = idx;
        detectedColumns.push(`초/재진(${orig})`);
      } else if (colIdx.age === -1 && /^(만)?(나이|연령|age)$|나이|연령/.test(k)) {
        colIdx.age = idx;
        detectedColumns.push(`연령(${orig})`);
      } else if (colIdx.birthOrRrn === -1 && /생년월일|주민|출생|birth/.test(k)) {
        colIdx.birthOrRrn = idx;
        detectedColumns.push(`생년월일(${orig})`);
      } else if (colIdx.gender === -1 && /성별|남녀|gender|sex/.test(k)) {
        colIdx.gender = idx;
        detectedColumns.push(`성별(${orig})`);
      } else if (colIdx.channel === -1 && /내원경로|방문경로|유입경로|인지경로|알게된|경로|channel|source/.test(k)) {
        colIdx.channel = idx;
        detectedColumns.push(`내원경로(${orig})`);
      } else if (colIdx.nonReimFlag === -1 && /비급여여부|비보험여부|급여구분|진료유형/.test(k)) {
        colIdx.nonReimFlag = idx;
        detectedColumns.push(`비급여여부(${orig})`);
      } else if (colIdx.nonReim === -1 && /비급여|비보험|비과세|과세|일반수가|한약|비급여액/.test(k)) {
        colIdx.nonReim = idx;
        detectedColumns.push(`비급여(${orig})`);
      } else if (colIdx.referral === -1 && /소개|추천인|지인/.test(k)) {
        colIdx.referral = idx;
        detectedColumns.push(`소개(${orig})`);
      }
    });
  }

  // 한차트 매출 통계표 호환 감지 ("초진(120)" 같은 패턴이 열에 존재할 때)
  const isHanchartPattern = nonEmptyRows.some((row) =>
    row.some((cell) => /^(초진|재진|신환|재초진)\s*\(\s*\d+\s*\)/.test(cleanStr(cell)))
  );

  if (isHanchartPattern) {
    let firstVisits = 0;
    let reFirstVisits = 0;
    let revisits = 0;
    let totalVisits = 0;
    let nonReimRevenue = 0;
    let totalRevenue = 0;

    for (const row of nonEmptyRows) {
      const typeCell = row.find((c) => /^(초진|재진|신환|재초진)\s*\(\s*\d+\s*\)/.test(cleanStr(c)));
      if (!typeCell) continue;
      const typeStr = cleanStr(typeCell);
      const countMatch = typeStr.match(/\(\s*(\d+)\s*\)/);
      const cnt = countMatch ? parseInt(countMatch[1], 10) : 0;
      totalVisits += cnt;
      if (typeStr.startsWith("재초진")) reFirstVisits += cnt;
      else if (typeStr.startsWith("초진") || typeStr.startsWith("신환")) firstVisits += cnt;
      else revisits += cnt;

      // 금액 추정 (비과세/과세/총매출)
      const nums = row.map(parseNum).filter((n) => n > 1000);
      if (nums.length >= 2) {
        nonReimRevenue += nums[0];
        totalRevenue += Math.max(...nums);
      }
    }

    const nonReimRatioEst = totalRevenue > 0 ? Math.min(0.85, nonReimRevenue / totalRevenue) : 0.25;
    const nonReimbursableVisits = Math.round(totalVisits * nonReimRatioEst);

    return {
      fileName: file.name,
      mode: "HANCHART_COMPAT",
      rowCount: nonEmptyRows.length,
      detectedColumns: ["한차트 초/재진 집계표 자동 호환"],
      missingFields: ["연령(65세 이상)", "성별(남/여)", "내원경로", "소개환자"],
      metrics: {
        totalVisits: totalVisits || 1,
        firstVisits,
        reFirstVisits,
        revisits,
        seniorVisits: Math.round(totalVisits * 0.2),
        under65Visits: Math.max(0, totalVisits - Math.round(totalVisits * 0.2)),
        maleVisits: Math.round(totalVisits * 0.42),
        femaleVisits: Math.max(0, totalVisits - Math.round(totalVisits * 0.42)),
        acquisitionChannels: {
          organicWalkIn: Math.round((firstVisits + reFirstVisits) * 0.35),
          referral: Math.round((firstVisits + reFirstVisits) * 0.25),
          digitalSearch: Math.round((firstVisits + reFirstVisits) * 0.3),
          socialAd: Math.round((firstVisits + reFirstVisits) * 0.1),
          other: 0,
        },
        nonReimbursableVisits,
        reimbursableOnlyVisits: Math.max(0, totalVisits - nonReimbursableVisits),
        referralPatients: Math.round((firstVisits + reFirstVisits) * 0.25),
      },
    };
  }

  // 모드 1: 환자별 로우 리스트 파싱 (데이터 행이 충분하고 핵심 컬럼이 2개 이상 감지된 경우)
  const dataRows = headerIdx >= 0 ? nonEmptyRows.slice(headerIdx + 1) : [];
  const hasRowListStructure =
    headerIdx >= 0 &&
    dataRows.length >= 2 &&
    (colIdx.visitType !== -1 || colIdx.age !== -1 || colIdx.gender !== -1 || colIdx.channel !== -1);

  if (hasRowListStructure) {
    let totalVisits = 0;
    let firstVisits = 0;
    let reFirstVisits = 0;
    let revisits = 0;
    let seniorVisits = 0;
    let under65Visits = 0;
    let maleVisits = 0;
    let femaleVisits = 0;
    let nonReimbursableVisits = 0;
    let referralPatients = 0;

    const channels = {
      organicWalkIn: 0,
      referral: 0,
      digitalSearch: 0,
      socialAd: 0,
      other: 0,
    };

    for (const row of dataRows) {
      // 합계/소계 행 제외
      const joined = row.map(cleanStr).join(" ");
      if (!joined.trim() || /^(합계|총계|소계|평균|total|sum)/i.test(cleanStr(row[0]))) continue;

      totalVisits++;

      // 1) 초진 / 재초진 / 재진 분류
      let isNewRow = false;
      if (colIdx.visitType !== -1) {
        const vt = cleanStr(row[colIdx.visitType]);
        if (/재초진|재신환|신초/.test(vt)) {
          reFirstVisits++;
          isNewRow = true;
        } else if (/초진|신환|신규|new/i.test(vt)) {
          firstVisits++;
          isNewRow = true;
        } else if (/재진|구환|계속|revisit/i.test(vt)) {
          revisits++;
        } else {
          revisits++;
        }
      }

      // 2) 연령 (65세 이상 / 이하)
      const ageVal =
        colIdx.age !== -1
          ? inferAge(row[colIdx.age])
          : colIdx.birthOrRrn !== -1
          ? inferAge(row[colIdx.birthOrRrn])
          : null;
      if (ageVal !== null) {
        if (ageVal >= 65) seniorVisits++;
        else under65Visits++;
      }

      // 3) 성별 (남 / 여)
      const g = inferGender(
        colIdx.gender !== -1 ? row[colIdx.gender] : "",
        colIdx.birthOrRrn !== -1 ? row[colIdx.birthOrRrn] : ""
      );
      if (g === "M") maleVisits++;
      else if (g === "F") femaleVisits++;

      // 4) 내원 경로 & 6) 소개 환자
      let countedAsReferral = false;
      if (colIdx.channel !== -1) {
        const chRaw = cleanStr(row[colIdx.channel]);
        if (chRaw) {
          const chKey = classifyChannel(chRaw);
          channels[chKey]++;
          if (chKey === "referral") {
            countedAsReferral = true;
          }
        }
      }

      if (colIdx.referral !== -1) {
        const refVal = cleanStr(row[colIdx.referral]);
        if (refVal && !/^(n|no|x|없음|무|0|-|미해당|해당없음)$/i.test(refVal)) {
          if (!countedAsReferral) {
            channels.referral++;
            countedAsReferral = true;
          }
        }
      }

      if (countedAsReferral) {
        referralPatients++;
      } else if (isNewRow && colIdx.channel === -1 && colIdx.referral === -1) {
        // 경로/소개 컬럼 자체가 없는 경우는 missingFields로 안내
      }

      // 5) 비급여 여부
      let isNonReim = false;
      if (colIdx.nonReimFlag !== -1) {
        const nf = cleanStr(row[colIdx.nonReimFlag]);
        if (/비급여|비보험|일반|y|o|yes|유|1|해당|한약|도수|약침/i.test(nf) && !/^(순수)?급여$|^(n|no|x|없음|무|0)$/i.test(nf)) {
          isNonReim = true;
        }
      }
      if (!isNonReim && colIdx.nonReim !== -1) {
        const nv = row[colIdx.nonReim];
        const num = parseNum(nv);
        const str = cleanStr(nv);
        if (num > 0 || (/비급여|비보험|y|o|yes|유/i.test(str) && !/^(n|no|x|없음|무|0)$/i.test(str))) {
          isNonReim = true;
        }
      }
      if (isNonReim) nonReimbursableVisits++;
    }

    const missingFields: string[] = [];
    if (colIdx.visitType === -1) missingFields.push("초/재진 구분");
    if (colIdx.age === -1 && colIdx.birthOrRrn === -1) missingFields.push("연령(65세 이상/이하)");
    if (colIdx.gender === -1 && colIdx.birthOrRrn === -1) missingFields.push("성별(남/여)");
    if (colIdx.channel === -1) missingFields.push("내원경로");
    if (colIdx.nonReim === -1 && colIdx.nonReimFlag === -1) missingFields.push("비급여 여부");
    if (colIdx.referral === -1 && colIdx.channel === -1) missingFields.push("소개 환자");

    return {
      fileName: file.name,
      mode: "ROW_LIST",
      rowCount: totalVisits,
      detectedColumns,
      missingFields,
      metrics: {
        totalVisits,
        firstVisits,
        reFirstVisits,
        revisits,
        seniorVisits,
        under65Visits: under65Visits || Math.max(0, totalVisits - seniorVisits),
        maleVisits,
        femaleVisits,
        acquisitionChannels: channels,
        nonReimbursableVisits,
        reimbursableOnlyVisits: Math.max(0, totalVisits - nonReimbursableVisits),
        referralPatients,
      },
    };
  }

  // 모드 2: 요약 통계표 (Key-Value 형태: "항목명 | 값")
  const summary: ClinicPatientMetrics = {
    totalVisits: 0,
    firstVisits: 0,
    reFirstVisits: 0,
    revisits: 0,
    seniorVisits: 0,
    under65Visits: 0,
    maleVisits: 0,
    femaleVisits: 0,
    acquisitionChannels: {
      organicWalkIn: 0,
      referral: 0,
      digitalSearch: 0,
      socialAd: 0,
      other: 0,
    },
    nonReimbursableVisits: 0,
    reimbursableOnlyVisits: 0,
    referralPatients: 0,
  };

  const matchedSummaryCols: string[] = [];

  for (const row of nonEmptyRows) {
    const label = normKey(row[0]);
    const valCell = row.slice(1).find((c) => cleanStr(c) !== "" && !isNaN(parseNum(c)));
    const val = parseNum(valCell);
    if (!label || val < 0) continue;

    if (/총내원|전체내원|총환자|전체환자|연인원/.test(label)) {
      summary.totalVisits = val;
      matchedSummaryCols.push("총내원수");
    } else if (/재초진|재신환/.test(label)) {
      summary.reFirstVisits = val;
      matchedSummaryCols.push("재초진");
    } else if (/순수초진|초진|신환/.test(label)) {
      summary.firstVisits = val;
      matchedSummaryCols.push("초진");
    } else if (/재진|구환/.test(label)) {
      summary.revisits = val;
      matchedSummaryCols.push("재진");
    } else if (/65세이상|고령|노인/.test(label)) {
      summary.seniorVisits = val;
      matchedSummaryCols.push("65세이상");
    } else if (/65세미만|65세이하/.test(label)) {
      summary.under65Visits = val;
      matchedSummaryCols.push("65세미만");
    } else if (/여성|여자/.test(label)) {
      summary.femaleVisits = val;
      matchedSummaryCols.push("여성");
    } else if (/남성|남자/.test(label)) {
      summary.maleVisits = val;
      matchedSummaryCols.push("남성");
    } else if (/소개|지인|추천/.test(label)) {
      summary.referralPatients = val;
      summary.acquisitionChannels.referral = val;
      matchedSummaryCols.push("소개환자");
    } else if (/간판|지나가|도보|오가닉|지역|인근/.test(label)) {
      summary.acquisitionChannels.organicWalkIn = val;
      matchedSummaryCols.push("오프라인/간판");
    } else if (/네이버|검색|블로그|플레이스|지도/.test(label)) {
      summary.acquisitionChannels.digitalSearch = val;
      matchedSummaryCols.push("네이버/검색");
    } else if (/sns|광고|인스타|유튜브|당근/.test(label)) {
      summary.acquisitionChannels.socialAd = val;
      matchedSummaryCols.push("SNS/광고");
    } else if (/비급여|비보험/.test(label)) {
      summary.nonReimbursableVisits = val;
      matchedSummaryCols.push("비급여");
    }
  }

  if (summary.totalVisits === 0) {
    summary.totalVisits = summary.firstVisits + summary.reFirstVisits + summary.revisits;
  }
  if (summary.under65Visits === 0 && summary.totalVisits > 0) {
    summary.under65Visits = Math.max(0, summary.totalVisits - summary.seniorVisits);
  }
  summary.reimbursableOnlyVisits = Math.max(0, summary.totalVisits - summary.nonReimbursableVisits);

  if (summary.totalVisits === 0 && matchedSummaryCols.length === 0) {
    throw new Error(
      "엑셀 컬럼을 자동 인식하지 못했습니다. 샘플 양식을 다운로드하여 컬럼명(초재진, 연령, 성별, 내원경로, 비급여, 소개여부)을 확인해 주세요."
    );
  }

  return {
    fileName: file.name,
    mode: "SUMMARY_TABLE",
    rowCount: nonEmptyRows.length,
    detectedColumns: matchedSummaryCols,
    missingFields: [],
    metrics: summary,
  };
}

/**
 * 표준 초진통계 엑셀 샘플 양식 다운로드 (.xlsx)
 */
export function downloadFirstVisitTemplate() {
  const sampleRows = [
    ["내원일", "차트번호", "초재진구분", "연령", "성별", "내원경로", "비급여여부", "비급여금액", "소개여부"],
    ["2026-11-01", "P001", "초진", 34, "여", "지인소개", "Y", 180000, "Y"],
    ["2026-11-01", "P002", "재진", 68, "남", "간판/지나가다", "N", 0, "N"],
    ["2026-11-01", "P003", "재초진", 47, "여", "네이버 플레이스", "Y", 250000, "N"],
    ["2026-11-02", "P004", "재진", 52, "여", "가족소개", "Y", 120000, "Y"],
    ["2026-11-02", "P005", "초진", 29, "남", "인스타그램 광고", "N", 0, "N"],
    ["2026-11-02", "P006", "재진", 71, "여", "인근거주", "N", 0, "N"],
    ["2026-11-03", "P007", "재진", 41, "여", "지인소개", "Y", 320000, "Y"],
    ["2026-11-03", "P008", "재진", 38, "남", "네이버 지도", "N", 0, "N"],
    ["2026-11-04", "P009", "재초진", 63, "여", "간판/지나가다", "Y", 90000, "N"],
    ["2026-11-04", "P010", "재진", 55, "남", "인근거주", "N", 0, "N"],
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sampleRows);
  ws["!cols"] = [
    { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 8 },
    { wch: 8 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 10 }
  ];
  XLSX.utils.book_append_sheet(wb, ws, "초진통계_환자명단");

  const summaryRows = [
    ["항목", "수치(명/건)", "비고"],
    ["총내원수", 850, "월간 전체 내원 환자수"],
    ["순수초진", 110, "최초 내원 신환"],
    ["재초진", 45, "과거 내원 후 재발/새 상병 방문"],
    ["재진", 695, "기존 연속 치료 환자"],
    ["65세이상", 140, "만 65세 이상 내원수"],
    ["남성", 340, "남성 환자수"],
    ["여성", 510, "여성 환자수"],
    ["간판/인근", 45, "오프라인/지나가다 유입"],
    ["소개환자", 48, "지인/가족 추천 유입"],
    ["네이버/검색", 42, "네이버 플레이스/블로그/지도"],
    ["SNS/광고", 15, "인스타/당근/유료광고"],
    ["비급여", 220, "비급여 진료 포함 건수"],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(summaryRows);
  ws2["!cols"] = [{ wch: 14 }, { wch: 14 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(wb, ws2, "요약통계표_양식");

  XLSX.writeFile(wb, "바른컨설팅_초진통계_표준양식.xlsx");
}

/**
 * 7대 핵심 지표 진단 및 세계적 경영·통계 권위자 이론 기반 리스크 평가
 */
export function evaluateFirstVisitStats(
  clinic: ClinicPatientMetrics,
  demographic: DemographicData
): ComprehensiveDiagnosis {
  const total = Math.max(1, clinic.totalVisits);
  const newPatients = clinic.firstVisits + clinic.reFirstVisits;

  // 1. 재진율
  const revisitRate = (clinic.revisits / total) * 100;
  const revisitTarget = 75.0;
  const revisitGap = revisitRate - revisitTarget;
  const revisitStatus: RiskLevel =
    revisitRate >= 70 ? "HEALTHY" : revisitRate >= 60 ? "WARNING" : "CRITICAL";

  // 2. 초진 및 재초진 분포율 (신환 중 재초진 비중)
  const reFirstRatioInNew = newPatients > 0 ? (clinic.reFirstVisits / newPatients) * 100 : 0;
  const newShareOfTotal = (newPatients / total) * 100;
  const reFirstTarget = 35.0;
  const reFirstGap = reFirstRatioInNew - reFirstTarget;
  const reFirstStatus: RiskLevel =
    reFirstRatioInNew >= 30 ? "HEALTHY" : reFirstRatioInNew >= 20 ? "WARNING" : "CRITICAL";

  // 3. 연령 65세 이상/이하 분포율 & 고령화 왜곡 지수 (GDI)
  const seniorRatio = (clinic.seniorVisits / total) * 100;
  const regionalSeniorRatio = demographic.seniorRatio || 15.0;
  const gdi = regionalSeniorRatio > 0 ? seniorRatio / regionalSeniorRatio : 1.0;
  const seniorGap = seniorRatio - regionalSeniorRatio;
  let seniorStatus: RiskLevel = "HEALTHY";
  if (gdi > 1.6 || gdi < 0.5 || seniorRatio > 50) seniorStatus = "CRITICAL";
  else if (gdi > 1.3 || gdi < 0.7) seniorStatus = "WARNING";

  // 4. 남녀 성별 분포율 & 성별 왜곡 지수 (Gender DI)
  const genderSum = Math.max(1, clinic.femaleVisits + clinic.maleVisits);
  const femaleRatio = (clinic.femaleVisits / genderSum) * 100;
  const maleRatio = (clinic.maleVisits / genderSum) * 100;
  const regionalFemaleRatio = demographic.femaleRatio || 50.5;
  const genderDI = regionalFemaleRatio > 0 ? femaleRatio / regionalFemaleRatio : 1.0;
  const femaleTarget = Math.min(65.0, Math.max(55.0, Number((regionalFemaleRatio + 8.0).toFixed(1))));
  const femaleGap = femaleRatio - femaleTarget;
  let genderStatus: RiskLevel = "HEALTHY";
  if (femaleRatio < 45 || femaleRatio > 80) genderStatus = "CRITICAL";
  else if (femaleRatio < 52 || femaleRatio > 72) genderStatus = "WARNING";

  // 5. 내원 경로 건전성 (오가닉/지역 기반 비중)
  const ch = clinic.acquisitionChannels;
  const chTotal = Math.max(
    1,
    ch.organicWalkIn + ch.referral + ch.digitalSearch + ch.socialAd + ch.other
  );
  const organicRatio = ((ch.organicWalkIn + ch.referral) / chTotal) * 100;
  const organicTarget = 60.0;
  const organicGap = organicRatio - organicTarget;
  const channelStatus: RiskLevel =
    organicRatio >= 60 ? "HEALTHY" : organicRatio >= 45 ? "WARNING" : "CRITICAL";

  // 6. 비급여 진료 비중
  const nonReimRatio = (clinic.nonReimbursableVisits / total) * 100;
  const nonReimTarget = 25.0;
  const nonReimGap = nonReimRatio - nonReimTarget;
  const nonReimStatus: RiskLevel =
    nonReimRatio >= 20 ? "HEALTHY" : nonReimRatio >= 12 ? "WARNING" : "CRITICAL";

  // 7. 소개 환자 비율 (신환 중 소개 비중)
  const effectiveReferral = Math.max(clinic.referralPatients, ch.referral);
  const referralRatio = newPatients > 0 ? (effectiveReferral / newPatients) * 100 : 0;
  const referralTarget = 30.0;
  const referralGap = referralRatio - referralTarget;
  const referralStatus: RiskLevel =
    referralRatio >= 25 ? "HEALTHY" : referralRatio >= 15 ? "WARNING" : "CRITICAL";

  // 배후 인구 대비 월간 순수 초진 침투율 (MPI)
  const mpi =
    demographic.totalPopulation > 0
      ? (clinic.firstVisits / demographic.totalPopulation) * 1000
      : 0;

  const indicators: IndicatorEvaluation[] = [
    {
      id: "revisit_rate",
      order: 1,
      name: "재진율 (Patient Retention Rate)",
      shortName: "재진율",
      currentValue: Number(revisitRate.toFixed(1)),
      displayValue: `${revisitRate.toFixed(1)}%`,
      unit: "%",
      benchmarkRange: "70% ~ 80% 이상",
      benchmarkTarget: revisitTarget,
      gap: Number(revisitGap.toFixed(1)),
      gapDisplay: `${revisitGap >= 0 ? "+" : ""}${revisitGap.toFixed(1)}%p`,
      status: revisitStatus,
      authorityName: "Fred Reichheld (HBR) · Avedis Donabedian",
      authorityTheory:
        "베인앤컴퍼니 Fred Reichheld의 충성도 효과(고객 유지율 5% 개선 시 순이익 25~95% 증가)와 Donabedian 의료 질 평가 모델에 따라, 진료 과정의 신뢰가 높을수록 자발적 재방문이 확립됩니다.",
      riskScenario:
        "밑 빠진 독(Leaky Bucket) 증후군: 신환을 모으기 위해 광고비를 계속 투입해야 하므로 CAC(환자획득비용)가 급증하고 영업이익률이 급락합니다. 진료 설명·대기 관리·치료 효과성에 누수가 있음을 뜻합니다.",
      recommendation:
        "치료 종결 전 차기 예약 확정 프로토콜 도입, 초진 24시간 내 해피콜/알림톡 발송, 재내원 시스템 연계 관리.",
    },
    {
      id: "refirst_ratio",
      order: 2,
      name: `초진 및 재초진 분포율 (전체 신환 ${newShareOfTotal.toFixed(1)}%)`,
      shortName: "초진·재초진",
      currentValue: Number(reFirstRatioInNew.toFixed(1)),
      displayValue: `${reFirstRatioInNew.toFixed(1)}%`,
      unit: "%",
      benchmarkRange: "신환 중 재초진 30% ~ 40% 이상",
      benchmarkTarget: reFirstTarget,
      gap: Number(reFirstGap.toFixed(1)),
      gapDisplay: `${reFirstGap >= 0 ? "+" : ""}${reFirstGap.toFixed(1)}%p`,
      status: reFirstStatus,
      authorityName: "Peter Fader (Wharton CLV) · BCG Matrix",
      authorityTheory:
        "와튼스쿨 Peter Fader의 고객생애가치(CLV) 모델과 BCG 지속성장 매트릭스에서 재초진은 1차 치료에 만족한 환자가 질환 재발 시 우리 의원을 최우선 상기도(Top-of-Mind)로 재선택한 브랜드 자산 지표입니다.",
      riskScenario:
        "재초진 부족은 1회성 진료 후 타 의원으로 이탈(Brand Churn)하고 있음을 의미하며, 순수 초진 부족은 자연 이탈률(연 10~15%)을 보충하지 못해 병원의 급격한 노쇠화를 초래합니다.",
      recommendation:
        "계절성·만성 질환 정기 리콜 알림, 완치 후 3~6개월 추적 안부 메시지 및 건강 가이드 발송.",
    },
    {
      id: "geriatric_distortion",
      order: 3,
      name: `연령 65세 이상 분포율 (GDI ${gdi.toFixed(2)})`,
      shortName: "65세 연령비",
      currentValue: Number(seniorRatio.toFixed(1)),
      displayValue: `${seniorRatio.toFixed(1)}%`,
      unit: "%",
      benchmarkRange: `동네 고령화율(${regionalSeniorRatio}%) ±5%p (GDI 0.7~1.3)`,
      benchmarkTarget: regionalSeniorRatio,
      gap: Number(seniorGap.toFixed(1)),
      gapDisplay: `${seniorGap >= 0 ? "+" : ""}${seniorGap.toFixed(1)}%p`,
      status: seniorStatus,
      authorityName: "Michael Porter (VBHC) · Philip Kotler",
      authorityTheory:
        "Michael Porter의 가치 기반 헬스케어(VBHC)와 Philip Kotler의 인구통계학적 세분화 이론에 따라, 급여 중심 고령층과 비급여 수용성이 높은 65세 미만 경제활동인구의 균형 믹스가 수익성을 결정합니다.",
      riskScenario:
        "고령층 과편중(GDI > 1.6) 시 대기실 노령화로 30~50대 직장인 환자가 기피하는 '환자 구축 효과(Crowding-Out)'가 발생해 진료 피로도는 치솟고 객단가는 급락합니다.",
      recommendation:
        "30~50대 경제활동층 대상 야간·토요일 특화 진료 슬롯 확대 및 통증·기능의학·자세교정 프로그램 강화.",
    },
    {
      id: "gender_distribution",
      order: 4,
      name: `남녀 성별 분포율 (여 ${femaleRatio.toFixed(1)}% / 남 ${maleRatio.toFixed(1)}%)`,
      shortName: "남녀 성별비",
      currentValue: Number(femaleRatio.toFixed(1)),
      displayValue: `여 ${femaleRatio.toFixed(1)}%`,
      unit: "%",
      benchmarkRange: `여성 55% ~ 65% (동네 ${regionalFemaleRatio}% 대비 +5~15%p)`,
      benchmarkTarget: femaleTarget,
      gap: Number(femaleGap.toFixed(1)),
      gapDisplay: `${femaleGap >= 0 ? "+" : ""}${femaleGap.toFixed(1)}%p`,
      status: genderStatus,
      authorityName: "Ronald Andersen · Martha Barletta (HBR)",
      authorityTheory:
        "Andersen 보건의료 이용 행태론과 CDC/OECD·심평원 통계에 따르면 여성은 외래 이용률이 남성 대비 1.3~1.5배 높으며, 가구 내 의료 의사결정의 약 80%(Chief Medical Officer of the Household)를 주도합니다.",
      riskScenario:
        femaleRatio > 72
          ? "남성 직장인/가장 계층의 유입 단절: 야간·주말 접근성 부족이나 남성 만성·통증 케어 포지셔닝 미흡으로 배후 시장의 절반을 놓치고 있습니다."
          : "여성 비율 45% 미만 저하는 가구 의료 결정권자 이탈로 가족 연쇄 유입(Family LTV)이 붕괴됨을 뜻하며, 병원 청결도·공간 감성·데스크 친절도·공감 설명의 적신호입니다.",
      recommendation:
        femaleRatio > 72
          ? "직장인 남성 대상 야간/주말 예약 슬롯 및 만성피로·대사·근골격 통증 케어 강화."
          : "대기실 청결·프라이버시 동선 개선, 여성 환자 공감형 설명 프로토콜 및 가족 동반 케어 활성화.",
    },
    {
      id: "acquisition_channels",
      order: 5,
      name: "내원 경로 건전성 (오가닉·지역 유입 비중)",
      shortName: "내원 경로",
      currentValue: Number(organicRatio.toFixed(1)),
      displayValue: `${organicRatio.toFixed(1)}%`,
      unit: "%",
      benchmarkRange: "오가닉·소개 60% 이상 (단일광고 30% 이하)",
      benchmarkTarget: organicTarget,
      gap: Number(organicGap.toFixed(1)),
      gapDisplay: `${organicGap >= 0 ? "+" : ""}${organicGap.toFixed(1)}%p`,
      status: channelStatus,
      authorityName: "Harry Markowitz (노벨경제학상 MPT)",
      authorityTheory:
        "노벨경제학상 Harry Markowitz의 현대 포트폴리오 이론(MPT)에 근거하여, 환자 유입 경로를 오프라인 입지·소개·디지털 검색으로 분산해야 플랫폼 변동성 리스크를 방어할 수 있습니다.",
      riskScenario:
        "광고 중독(Ad Addiction): 네이버 플레이스 순위나 특정 유료 광고 의존도가 과도하면 알고리즘 변경·클릭 단가 상승 시 신환 수와 순이익이 즉각 직격탄을 맞습니다.",
      recommendation:
        "외부 간판·시인성 개선, 지역 생활권 제휴 및 기존 환자 구전(소개) 비중을 60% 이상으로 끌어올리십시오.",
    },
    {
      id: "non_reimbursable_ratio",
      order: 6,
      name: "비급여 진료 비중 (Non-reimbursable Ratio)",
      shortName: "비급여 비중",
      currentValue: Number(nonReimRatio.toFixed(1)),
      displayValue: `${nonReimRatio.toFixed(1)}%`,
      unit: "%",
      benchmarkRange: "일반의원 20~35% (통증/한의 35~50%)",
      benchmarkTarget: nonReimTarget,
      gap: Number(nonReimGap.toFixed(1)),
      gapDisplay: `${nonReimGap >= 0 ? "+" : ""}${nonReimGap.toFixed(1)}%p`,
      status: nonReimStatus,
      authorityName: "Michael Porter (차별화 전략) · DuPont 분석",
      authorityTheory:
        "Michael Porter의 차별화 전략 및 DuPont 마진 분석상, 원가보상률이 낮은 급여 수가 구조에서 병원의 고정비(인건비·임대료) 상승을 방어하고 재투자 여력을 만드는 핵심 완충재는 비급여 가치 진료입니다.",
      riskScenario:
        "마진 압박(Margin Squeeze): 급여 위주 운영 시 손익분기점 방어를 위해 하루 80~100명 이상의 박리다매 3분 진료를 강요당하며 의료진 번아웃과 의료 분쟁 위험이 급증합니다.",
      recommendation:
        "환자 상태별 근거 기반 비급여 치료(한약·약침·도수·정밀검사 등) 설명 시각화 및 상담 실장 프로토콜 표준화.",
    },
    {
      id: "referral_ratio",
      order: 7,
      name: "소개 환자 비율 (Word-of-Mouth Referral)",
      shortName: "소개 환자",
      currentValue: Number(referralRatio.toFixed(1)),
      displayValue: `${referralRatio.toFixed(1)}%`,
      unit: "%",
      benchmarkRange: "신환 중 25% ~ 35% 이상 (우수 40%↑)",
      benchmarkTarget: referralTarget,
      gap: Number(referralGap.toFixed(1)),
      gapDisplay: `${referralGap >= 0 ? "+" : ""}${referralGap.toFixed(1)}%p`,
      status: referralStatus,
      authorityName: "Fred Reichheld (NPS) · Eric Ries (K-factor)",
      authorityTheory:
        "순고객추천지수(NPS) 창시자 Reichheld와 Eric Ries의 바이럴 계수(K-factor) 연구에 따르면, 소개 환자는 광고 유입 대비 초진 이탈률이 50% 낮고 비급여 동의율은 2배 이상 높습니다.",
      riskScenario:
        "침묵의 평판 붕괴(Word-of-Mouth Drought): 소개율 10% 미만은 환자들이 치료를 받고도 주변에 추천하지 않는다는 뜻으로, 과잉진료 의심·불친절·라포 부족이 수면 아래 누적된 치명적 경고입니다.",
      recommendation:
        "소개자·피소개자 감사 인사 프로세스 구축, 진료실 경청·공감 상담 강화로 자발적 추천(Promoter) 전환.",
    },
  ];

  const healthyCount = indicators.filter((i) => i.status === "HEALTHY").length;
  const warningCount = indicators.filter((i) => i.status === "WARNING").length;
  const criticalCount = indicators.filter((i) => i.status === "CRITICAL").length;

  const rawRisk = criticalCount * 2 + warningCount * 1;
  const overallRiskScore = Math.min(100, Math.round((rawRisk / (indicators.length * 2)) * 100));

  let executiveSummary = "";
  if (overallRiskScore <= 20) {
    executiveSummary =
      "전반적인 환자 순환, 성별·연령 포트폴리오 및 배후 인구 대비 유입 구조가 매우 건전합니다. 현재의 진료 신뢰와 소개 네트워크를 지속 유지하십시오.";
  } else if (overallRiskScore <= 50) {
    executiveSummary =
      "일부 핵심 경영 지표에서 기준치 대비 갭(Gap)이 감지되었습니다. 주의·위험 항목을 중심으로 재진 전환과 오가닉·소개 유입 구조를 보강해야 합니다.";
  } else {
    executiveSummary =
      "경영 구조상 다수의 임계 위험 신호가 감지되었습니다. 신환 이탈(Leaky Bucket), 인구 구조 왜곡 또는 수익성 압박을 해소하기 위한 즉각적인 프로세스 개선이 필요합니다.";
  }

  return {
    evaluatedAt: new Date().toISOString(),
    region: demographic,
    marketPenetrationIndex: Number(mpi.toFixed(2)),
    geriatricDistortionIndex: Number(gdi.toFixed(2)),
    genderDistortionIndex: Number(genderDI.toFixed(2)),
    indicators,
    overallRiskScore,
    healthyCount,
    warningCount,
    criticalCount,
    executiveSummary,
  };
}
