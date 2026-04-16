/**
 * 통합 매출 파서 (Universal Revenue Parser)
 * 4가지 서로 다른 EMR 엑셀/CSV 포맷을 자동 감지하고 5대 핵심 지표로 변환합니다.
 */

import { DataMetrics, initialDataMetrics } from "@/context/DataContext";

/**
 * 키워드 정문화 (공백, 따옴표, 특수문자 제거)
 */
const normalize = (str: string) => str?.replace(/[\s\t\n\r"'( )]/g, '') || '';

/**
 * 숫자 정제 (괄호 제거, 콤마 제거 등)
 */
const parseCleanNumber = (str: string | number): number => {
  if (!str) return 0;
  if (typeof str === 'number') return str;
  const beforeParen = str.split('(')[0];
  const integerPart = beforeParen.split('.')[0];
  const cleaned = integerPart.replace(/[^0-9-]/g, '');
  const result = parseInt(cleaned, 10);
  return isNaN(result) ? 0 : result;
};

/**
 * 파일명에서 날짜 추출 (YYYY-MM)
 */
const extractDateFromFilename = (filename: string): string => {
  const match = filename.match(/(\d{4})년\s*(\d{1,2})월/);
  if (match) return `${match[1]}-${match[2].padStart(2, '0')}`;
  
  const matchHyphen = filename.match(/(\d{4})-(\d{2})/);
  if (matchHyphen) return `${matchHyphen[1]}-${matchHyphen[2]}`;
  
  return "";
};

export type ParserType = 'A' | 'B' | 'C' | 'D' | 'UNKNOWN';

export interface ParsedRevenue {
  month: string;
  metrics: DataMetrics;
}

/**
 * CSV 타입 자동 감지
 */
export const detectCSVType = (lines: string[]): ParserType => {
  if (lines.length < 2) return 'UNKNOWN';
  
  const content = lines.slice(0, 5).join('\n');
  
  if (content.includes("월말결산")) return 'D';
  if (content.includes("매출 집계") || content.includes("급여진료비합")) return 'A';
  if (content.includes("차트번호") && content.includes("수진자명") && content.includes("수진일")) return 'B';
  if (content.includes("일자") && (content.includes("진료비총 액") || content.includes("총진료비"))) return 'C';
  
  return 'UNKNOWN';
};

/**
 * [타입 A] 한차트 월간 보고서 파서
 */
const parseTypeA = (lines: string[], filename: string): ParsedRevenue[] => {
  const month = extractDateFromFilename(filename);
  if (!month) return [];

  const metrics: DataMetrics = JSON.parse(JSON.stringify(initialDataMetrics));

  lines.forEach(line => {
    const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/^"|"$/g, '').trim());
    if (cols.length < 2) return;
    
    const key = normalize(cols[0]);
    const val = parseCleanNumber(cols[1] || cols[2] || 0);

    // 1. 매출 (Generated Revenue)
    if (key.includes("총진료비")) {
      metrics.generatedRevenue.total = val;
    } else if (key.includes("급여진료비합") || key.includes("보험청구액")) {
      metrics.generatedRevenue.insurance = val;
    } else if (key.includes("본인부담금") && !key.includes("합계")) {
      metrics.generatedRevenue.copay = val;
    } else if (key.includes("비과세비급여") || key.includes("과세비급여") || key.includes("비보험")) {
      metrics.generatedRevenue.nonCovered += val;
    } else if (key.includes("자동차보험청구금액")) {
      metrics.generatedRevenue.auto = val;
    }
    // 2. 누수 (Leakage)
    else if (key.includes("남은미수액") || key.includes("미수금")) {
      metrics.leakage.receivables = val;
    }
    // 3. 수납 (Cash Flow)
    else if (key === "현금합계" || key === "현금수납") {
      metrics.paymentMethods.cash = val;
    } else if (key === "카드" || key === "카드수납") {
      metrics.paymentMethods.card = val;
    }
  });

  // 보험매출 합산: 보험청구 + 본인부담
  metrics.generatedRevenue.totalCovered = metrics.generatedRevenue.insurance + metrics.generatedRevenue.copay;
  // 수납액 합산
  metrics.cashFlow.totalReceived = metrics.paymentMethods.cash + metrics.paymentMethods.card;

  return [{ month, metrics }];
};

/**
 * [타입 B] 일일 수진 내역 리스트 파서
 */
const parseTypeB = (lines: string[], filename: string): ParsedRevenue[] => {
  // ... 기존 Type B 로직을 5대 지표 구조에 맞게 보강 ...
  const month = extractDateFromFilename(filename);
  if (!month) return [];
  
  const metrics: DataMetrics = JSON.parse(JSON.stringify(initialDataMetrics));
  
  const headerIdx = lines.findIndex(l => l.includes("차트번호"));
  if (headerIdx === -1) return [];

  const headers = lines[headerIdx].split(',').map(normalize);
  const totalIdx = headers.indexOf(normalize("총진료비"));
  const insClaimIdx = headers.indexOf(normalize("보험청구액"));
  const patPayIdx = headers.indexOf(normalize("보험본인부담금"));
  const genPayIdx = headers.indexOf(normalize("일반본인부담금"));

  let totalRow = lines.find((l, idx) => idx > headerIdx && (l.includes("합계") || l.includes("총계")));
  if (totalRow) {
    const cols = totalRow.split(',');
    metrics.generatedRevenue.total = parseCleanNumber(cols[totalIdx]);
    metrics.generatedRevenue.insurance = parseCleanNumber(cols[insClaimIdx]);
    metrics.generatedRevenue.copay = parseCleanNumber(cols[patPayIdx]);
    metrics.generatedRevenue.nonCovered = parseCleanNumber(cols[genPayIdx]);
    
    metrics.generatedRevenue.totalCovered = metrics.generatedRevenue.insurance + metrics.generatedRevenue.copay;
  }

  // 환자수 카운팅
  metrics.patientMetrics.total = lines.length - headerIdx - 2;

  return [{ month, metrics }];
};

/**
 * [타입 C] 월별 통계 리스트 파서
 */
const parseTypeC = (lines: string[]): ParsedRevenue[] => {
  const results: ParsedRevenue[] = [];
  const headerIdx = lines.findIndex(l => l.includes("일자") && (l.includes("총진료비") || l.includes("진료비총액")));
  if (headerIdx === -1) return [];

  const headers = lines[headerIdx].split(',').map(normalize);
  const dateIdx = headers.indexOf(normalize("일자"));
  const totalIdx = headers.indexOf(normalize("진료비총액")) !== -1 ? headers.indexOf(normalize("진료비총액")) : headers.indexOf(normalize("총진료비"));
  
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < headers.length) continue;
    
    const dateRaw = cols[dateIdx];
    const match = dateRaw?.match(/(\d{4}).*?(\d{1,2})/);
    if (!match) continue;

    const month = `${match[1]}-${match[2].padStart(2, '0')}`;
    const metrics: DataMetrics = JSON.parse(JSON.stringify(initialDataMetrics));
    
    metrics.generatedRevenue.total = parseCleanNumber(cols[totalIdx]);
    // C타입의 세부 항목 매핑 (EMR마다 다를 수 있으나 일반적인 패턴 적용)
    results.push({ month, metrics });
  }

  return results;
};

/**
 * [타입 D] 월말결산 요약 파서
 */
const parseTypeD = (lines: string[]): ParsedRevenue[] => {
  if (lines.length < 3) return [];
  
  const dateStr = lines[0].split(',')[1];
  const match = dateStr?.match(/(\d{4})[^\d](\d{1,2})/);
  const month = match ? `${match[1]}-${match[2].padStart(2, '0')}` : "";
  if (!month) return [];

  const metrics: DataMetrics = JSON.parse(JSON.stringify(initialDataMetrics));
  const headers = lines[1].split(',').map(normalize);
  const dataRow = lines[2].split(',');

  headers.forEach((h, idx) => {
    const val = parseCleanNumber(dataRow[idx]);
    if (h.includes("총진료비")) metrics.generatedRevenue.total = val;
    else if (h.includes("보험청구")) metrics.generatedRevenue.insurance = val;
    else if (h.includes("본인부담")) metrics.generatedRevenue.copay = val;
    else if (h.includes("비급여")) metrics.generatedRevenue.nonCovered = val;
    else if (h.includes("자보") || h.includes("자동차보험")) metrics.generatedRevenue.auto = val;
    else if (h.includes("미수금")) metrics.leakage.receivables = val;
    else if (h.includes("현금")) metrics.paymentMethods.cash = val;
    else if (h.includes("카드")) metrics.paymentMethods.card = val;
    else if (h.includes("환자수")) metrics.patientMetrics.total = val;
    else if (h.includes("신환")) metrics.patientMetrics.new = val;
  });

  metrics.generatedRevenue.totalCovered = metrics.generatedRevenue.insurance + metrics.generatedRevenue.copay;
  metrics.cashFlow.totalReceived = metrics.paymentMethods.cash + metrics.paymentMethods.card;

  return [{ month, metrics }];
};

/**
 * 범용 CSV 통합 분석기 메인 인터페이스
 */
export const parseUniversalCSV = (csvText: string, filename: string): ParsedRevenue[] => {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  const type = detectCSVType(lines);

  console.log(`[Universal Parser] 감지된 타입: ${type} (파일: ${filename})`);

  switch (type) {
    case 'A': return parseTypeA(lines, filename);
    case 'B': return parseTypeB(lines, filename);
    case 'C': return parseTypeC(lines);
    case 'D': return parseTypeD(lines);
    default:
      console.warn("알 수 없는 CSV 형식입니다.");
      return [];
  }
};
