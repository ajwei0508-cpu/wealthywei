"use client";

import * as XLSX from "xlsx";
import { DataMetrics, initialDataMetrics } from "@/context/DataContext";

export interface MappingResult {
  original: string;
  standard: string;
}

export interface ParseExcelResult {
  targetMonth: string;
  extractedData: DataMetrics;
  mappingResults: MappingResult[];
}

export function extractDateFromFilename(filename: string): string | null {
  // YYYY-MM, YYYY.MM, YYYY/MM 등 4자리 연도 우선
  const fullYearMatch = filename.match(/(\d{4})[^\d](\d{1,2})/);
  if (fullYearMatch) {
    const m = parseInt(fullYearMatch[2]);
    if (m >= 1 && m <= 12) return `${fullYearMatch[1]}-${fullYearMatch[2].padStart(2, "0")}`;
  }

  // YYYYMM 형식 (6자리 숫자)
  const digit6Match = filename.match(/(\d{4})(\d{2})/);
  if (digit6Match) {
    const m = parseInt(digit6Match[2]);
    if (m >= 1 && m <= 12 && digit6Match[1].startsWith("20")) {
      return `${digit6Match[1]}-${digit6Match[2]}`;
    }
  }

  // YY-MM 형식 (2자리 연도) - 월이 1~12 사이인 경우만 허용
  const shortYearMatch = filename.match(/(\d{2})[^\d](\d{1,2})/);
  if (shortYearMatch) {
    const m = parseInt(shortYearMatch[2]);
    if (m >= 1 && m <= 12) {
      return `20${shortYearMatch[1]}-${shortYearMatch[2].padStart(2, "0")}`;
    }
  }

  return null;
}

function normalize(text: unknown): string {
  return String(text || "").replace(/[\n\r\s\(\)\[\]\{\}]/g, "").replace(/[^\w\uAC00-\uD7AF]+/g, "").trim();
}

// 엑셀 숫자 형태의 날짜(Serial Date)를 YYYY-MM 형식으로 변환
const excelDateToMonth = (serial: number): string | null => {
  if (serial < 30000 || serial > 60000) return null; // 상식적인 범위 (1980~2060)
  try {
    const d = new Date((serial - 25569) * 86400 * 1000);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      if (year >= 2020 && year <= 2035) {
        return `${year}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      }
    }
  } catch (e) {}
  return null;
};

const tryExtractMonth = (val: unknown, baseYear?: string): string | null => {
  if (typeof val === "number") {
    // 만약 1~12 사이의 숫자이고 baseYear가 있다면 연말결산 형식으로 처리
    if (baseYear && val >= 1 && val <= 12) {
      return `${baseYear}-${String(val).padStart(2, "0")}`;
    }
    return excelDateToMonth(val);
  }
  const str = String(val || "").trim();
  
  // "1월", "2월" 등 단순 월 표시 처리
  if (baseYear && (str.endsWith("월") || /^\d{1,2}$/.test(str))) {
    const m = str.replace("월", "");
    const num = parseInt(m);
    if (!isNaN(num) && num >= 1 && num <= 12) {
      return `${baseYear}-${String(num).padStart(2, "0")}`;
    }
  }

  // YYYY-MM or YYYY.MM or YYYY/MM
  const match = str.match(/(\d{4})[^\d](\d{1,2})/);
  if (match) {
    const m = parseInt(match[2]);
    if (m >= 1 && m <= 12) return `${match[1]}-${match[2].padStart(2, "0")}`;
  }
  // YYYYMM
  const match2 = str.match(/(\d{4})(\d{2})/);
  if (match2 && match2[1].startsWith("20")) {
    const m = parseInt(match2[2]);
    if (m >= 1 && m <= 12) return `${match2[1]}-${match2[2]}`;
  }
  return null;
};

function parseCleanNumber(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const withoutParens = val.replace(/\(.*\)/g, "");
    const cleaned = withoutParens.replace(/[^0-9.-]+/g, "");
    return parseFloat(cleaned) || 0;
  }
  return 0;
}

function extractParensNumber(val: unknown): number {
  if (typeof val === "string") {
    const match = val.match(/\(([^)]+)\)/);
    if (match) {
      const cleaned = match[1].replace(/[^0-9.-]+/g, "");
      return parseFloat(cleaned) || 0;
    }
  }
  return 0;
}

// 5대 카테고리 매핑용 내부 타입
interface ParserMappingInfo {
  category: keyof DataMetrics;
  field: string;
  label: string;
  keywords: string[];
}

const MAPPING_CONFIG: ParserMappingInfo[] = [
  // 1. 유입 (Patient Metrics)
  { category: "patientMetrics", field: "total", label: "총 환자수", keywords: ["내원환자수", "총내원", "래원", "수납인원"] },
  { category: "patientMetrics", field: "new", label: "신규 환자수", keywords: ["신규환자수", "신환", "초진", "처음"] },
  
  // 2. 매출 (Generated Revenue)
  { category: "generatedRevenue", field: "total", label: "총 진료비", keywords: ["총진료비", "진료비계", "총계", "진료비합계", "총매출액"] },
  { category: "generatedRevenue", field: "copay", label: "본인부담금", keywords: ["본인부담", "본부금", "수납액"] },
  { category: "generatedRevenue", field: "insurance", label: "보험청구액", keywords: ["보험청구", "공단청구", "공단부담", "청구액"] },
  { category: "generatedRevenue", field: "auto", label: "자보청구액", keywords: ["자보", "자동차보험", "자보청구"] },
  { category: "generatedRevenue", field: "nonCovered", label: "비급여", keywords: ["비급여", "일반", "비보험"] },

  // 3. 누수 (Leakage)
  { category: "leakage", field: "receivables", label: "미수금", keywords: ["미수금", "미수"] },
  { category: "leakage", field: "discountTotal", label: "할인액", keywords: ["할인액", "할인", "에누리"] },

  // 4. 수납 (Cash Flow)
  { category: "cashFlow", field: "totalReceived", label: "실제 수납액", keywords: ["현금카드계", "수납총액", "수납합계"] },

  // 5. 결제 수단 (Payment Methods)
  { category: "paymentMethods", field: "cash", label: "현금 수납", keywords: ["현금수납", "현금"] },
  { category: "paymentMethods", field: "card", label: "카드 수납", keywords: ["카드수납", "카드"] },
];

function autoDetectType(jsonData: string[][]): "A" | "B" | "C" | "D" | "HEURISTIC" | "UNKNOWN" | "HANCHART" | "OKCHART" | "HANISARANG" | "DONGUIBOGAM" {
  const first3Rows = jsonData.slice(0, 3).map(row => JSON.stringify(row));
  const fullContent = first3Rows.join(" ");

  if (jsonData[0] && normalize(jsonData[0][0]) === normalize("월말결산")) return "D";
  const firstRowStr = jsonData[0]?.join("") || "";
  const secondRowStr = jsonData[1]?.join("") || "";
  
  if (firstRowStr.includes("구분") && (firstRowStr.includes("비과세비급여") || firstRowStr.includes("과세비급여"))) return "HANCHART";
  if (secondRowStr.includes("구분") && (secondRowStr.includes("비과세비급여") || secondRowStr.includes("과세비급여"))) return "HANCHART";
  
  if (secondRowStr.includes("내원환자수") || secondRowStr.includes("총진료비")) return "OKCHART";
  if (firstRowStr.includes("내원환자수") || firstRowStr.includes("총진료비")) return "OKCHART";

  if (firstRowStr.includes("차트번호") && firstRowStr.includes("수진자명")) return "HANISARANG";
  if (secondRowStr.includes("차트번호") && secondRowStr.includes("수진자명")) return "HANISARANG";

  if (firstRowStr.includes("총진료비") && firstRowStr.includes("청구금액") && firstRowStr.includes("실수납액")) return "DONGUIBOGAM";
  if (fullContent.includes("진료년월") && fullContent.includes("초진") && fullContent.includes("재진")) return "DONGUIBOGAM";

  let keywordMatchCount = 0;
  const flatData = jsonData.flat().map(c => normalize(c)).join(" ");
  MAPPING_CONFIG.forEach(cfg => {
    if (cfg.keywords.some(k => flatData.includes(normalize(k)))) keywordMatchCount++;
  });
  if (keywordMatchCount >= 4) return "HEURISTIC";

  return "UNKNOWN";
}

function parseTypeA(jsonData: string[][], targetMonth: string): ParseExcelResult[] {
  const extractedData: DataMetrics = JSON.parse(JSON.stringify(initialDataMetrics));
  const mappingResults: MappingResult[] = [];

  jsonData.forEach(row => {
    if (!row[0] || !row[1]) return;
    const label = normalize(row[0]);
    MAPPING_CONFIG.forEach(cfg => {
      if (cfg.keywords.some(k => label.includes(normalize(k)))) {
        const val = parseCleanNumber(row[1]);
        const disc = extractParensNumber(row[1]);
        if (val !== 0) {
          // @ts-ignore
          extractedData[cfg.category][cfg.field] = val;
          mappingResults.push({ original: String(row[0]), standard: cfg.label });
        }
        if (disc !== 0) {
          extractedData.leakage.discountTotal += disc;
          mappingResults.push({ original: `${row[0]}(할인)`, standard: "매출 누수(할인)" });
        }
      }
    });
  });

  return [{ targetMonth, extractedData, mappingResults }];
}

function parseTypeB(jsonData: string[][], targetMonth: string): ParseExcelResult[] {
  const extractedData: DataMetrics = JSON.parse(JSON.stringify(initialDataMetrics));
  const mappingResults: MappingResult[] = [];
  
  const headerIndex = jsonData.findIndex(row => row.join("").includes("수진일"));
  if (headerIndex === -1) return [];

  const headers = jsonData[headerIndex].map(h => normalize(h));
  let targetRowIndex = jsonData.findIndex((row, idx) => idx > headerIndex && (row.join("").includes("총계") || row.join("").includes("합계")));

  if (targetRowIndex !== -1) {
    const targetRow = jsonData[targetRowIndex];
    MAPPING_CONFIG.forEach(cfg => {
      const idx = headers.findIndex(h => cfg.keywords.some(k => h.includes(normalize(k))));
      if (idx !== -1) {
        // @ts-ignore
        extractedData[cfg.category][cfg.field] = parseCleanNumber(targetRow[idx]);
      }
    });

    let rowCount = 0;
    let newCount = 0;
    const idxNew = headers.findIndex(h => h.includes("초진"));
    for (let i = headerIndex + 1; i < targetRowIndex; i++) {
      if (jsonData[i].some(cell => cell)) {
        rowCount++;
        if (idxNew !== -1 && (String(jsonData[i][idxNew]) === "1" || String(jsonData[i][idxNew]).includes("초진"))) newCount++;
      }
    }
    extractedData.patientMetrics.total = rowCount;
    extractedData.patientMetrics.new = newCount;
    mappingResults.push({ original: "합계 행 + 로우 카운팅", standard: "B타입 전체 분석" });
  }

  return [{ targetMonth, extractedData, mappingResults }];
}

function parseTypeC(jsonData: string[][]): ParseExcelResult[] {
  const headerIndex = jsonData.findIndex(row => row.join("").includes("총진료비") || row.join("").includes("진료비총액"));
  if (headerIndex === -1) return [];

  const headers = jsonData[headerIndex].map(h => normalize(h));
  const idxDate = headers.findIndex(h => h.includes("일자"));
  const results: ParseExcelResult[] = [];

  for (let i = headerIndex + 1; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (idxDate === -1 || !row[idxDate] || row[idxDate].includes("합계")) continue;
    const match = String(row[idxDate]).match(/(\d{4}).*?(\d{1,2})/);
    if (!match) continue;
    const month = `${match[1]}-${match[2].padStart(2, "0")}`;
    const extractedData: DataMetrics = JSON.parse(JSON.stringify(initialDataMetrics));

    MAPPING_CONFIG.forEach(cfg => {
      const idx = headers.findIndex(h => cfg.keywords.some(k => h.includes(normalize(k))));
      if (idx !== -1) {
        // @ts-ignore
        extractedData[cfg.category][cfg.field] = parseCleanNumber(row[idx]);
      }
    });

    results.push({ targetMonth: month, extractedData, mappingResults: [{ original: "행 데이터", standard: "C타입 분석" }] });
  }
  return results;
}

function parseTypeD(jsonData: string[][]): ParseExcelResult[] {
  if (jsonData.length < 3) return [];
  const extractedData: DataMetrics = JSON.parse(JSON.stringify(initialDataMetrics));
  const mappingResults: MappingResult[] = [];

  const dateStr = String(jsonData[0][1] || "");
  const match = dateStr.match(/(\d{4})[^\d](\d{1,2})/);
  const targetMonth = match ? `${match[1]}-${match[2].padStart(2, "0")}` : "";

  const headers = jsonData[1].map(h => normalize(h));
  const dataRow = jsonData[2];

  MAPPING_CONFIG.forEach(cfg => {
    const idx = headers.findIndex(h => cfg.keywords.some(k => h.includes(normalize(k))));
    if (idx !== -1) {
      // @ts-ignore
      extractedData[cfg.category][cfg.field] = parseCleanNumber(dataRow[idx]);
    }
  });

  mappingResults.push({ original: "월말결산 합계 행", standard: "D타입 분석" });
  return [{ targetMonth, extractedData, mappingResults }];
}

function parseHeuristic(jsonData: string[][], targetMonth: string): ParseExcelResult[] {
  const extractedData: DataMetrics = JSON.parse(JSON.stringify(initialDataMetrics));
  const mappingResults: MappingResult[] = [];

  let bestHeaderRow = -1;
  let maxScore = 0;
  jsonData.forEach((row, rowIndex) => {
    let score = 0;
    const rowContent = row.map(c => normalize(c));
    MAPPING_CONFIG.forEach(cfg => {
      if (cfg.keywords.some(k => rowContent.some(cell => cell.includes(normalize(k))))) score++;
    });
    if (score > maxScore) { maxScore = score; bestHeaderRow = rowIndex; }
  });

  if (bestHeaderRow === -1 || maxScore < 2) return [];

  const headers = jsonData[bestHeaderRow].map(h => normalize(h));
  let foundTotalRow = -1;
  for (let i = jsonData.length - 1; i > bestHeaderRow; i--) {
    const rowStr = jsonData[i].join("");
    if (rowStr.includes("합계") || rowStr.includes("총계") || rowStr.includes("Total")) { foundTotalRow = i; break; }
  }

  if (foundTotalRow !== -1) {
    const totalRow = jsonData[foundTotalRow];
    MAPPING_CONFIG.forEach(cfg => {
      const idx = headers.findIndex(h => cfg.keywords.some(k => h.includes(normalize(k))));
      if (idx !== -1) {
        // @ts-ignore
        extractedData[cfg.category][cfg.field] = parseCleanNumber(totalRow[idx]);
      }
    });
    mappingResults.push({ original: "자동 감지 합계행", standard: "지능형 분석" });
  } else {
    let count = 0;
    for (let i = bestHeaderRow + 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || row.every(c => !c)) continue;
      MAPPING_CONFIG.forEach(cfg => {
        const idx = headers.findIndex(h => cfg.keywords.some(k => h.includes(normalize(k))));
        if (idx !== -1) {
          // @ts-ignore
          extractedData[cfg.category][cfg.field] += parseCleanNumber(row[idx]);
        }
      });
      count++;
    }
    extractedData.patientMetrics.total = count;
    mappingResults.push({ original: "자동 감지 리스트", standard: "지능형 합산 분석" });
  }

  mappingResults.unshift({ original: "Heuristic Search", standard: "비표준 양식 분석기 작동" });
  return [{ targetMonth, extractedData, mappingResults }];
}

function parseHanchart(jsonData: string[][], targetMonth: string): ParseExcelResult[] {
  const extractedData: DataMetrics = JSON.parse(JSON.stringify(initialDataMetrics));
  const mappingResults: MappingResult[] = [];
  
  extractedData.hanchartData = [];

  let isTableActive = false;
  let headerIndexes: Record<string, number> = {};

  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i].map(c => normalize(c));
    const rawRow = jsonData[i];

    if (!isTableActive && (row.includes("구분") && (row.includes("비과세비급여") || row.includes("과세비급여")))) {
      isTableActive = true;
      headerIndexes = {
        type: row.findIndex(c => c.includes("구분")),
        nonTaxable: row.findIndex(c => c.includes("비과세")),
        taxable: row.findIndex(c => c.includes("과세") && !c.includes("비과세")),
        coveredCopay: row.findIndex(c => c.includes("급여본부금") || c.includes("본인부담금")),
        coveredClaim: row.findIndex(c => c.includes("급여청구액")),
        autoClaim: row.findIndex(c => c === "자보청구액"),
        totalCopay: row.findIndex(c => c === "본부금합" || c === "수납할금액"),
        supportFund: row.findIndex(c => c === "건생비" || c === "지원금"),
        totalRevenue: row.findIndex(c => c === "총매출액"),
        ratio: row.findIndex(c => c === "매출비율"),
      };
      continue;
    }

    if (isTableActive) {
      if (!rawRow || rawRow.length === 0) continue;
      const typeLabelRaw = rawRow[headerIndexes.type] || "";
      const typeLabel = normalize(typeLabelRaw);
      if (!typeLabel) continue;

      const parseValue = (idx: number) => parseCleanNumber(rawRow[idx]);

      if (typeLabel.includes("합계")) {
        extractedData.generatedRevenue.nonCovered = parseValue(headerIndexes.nonTaxable) + parseValue(headerIndexes.taxable);
        extractedData.generatedRevenue.copay = parseValue(headerIndexes.coveredCopay);
        extractedData.generatedRevenue.insurance = parseValue(headerIndexes.coveredClaim);
        extractedData.generatedRevenue.auto = parseValue(headerIndexes.autoClaim);
        extractedData.generatedRevenue.total = parseValue(headerIndexes.totalRevenue);
        
        let newCount = 0;
        let totalCount = 0;
        extractedData.hanchartData?.forEach(hc => {
           const match = hc.type.match(/\((\d+)\)/);
           if (match) {
             const count = parseInt(match[1]);
             totalCount += count;
             if (hc.type.includes("초진")) newCount += count;
           }
        });
        extractedData.patientMetrics.new = newCount;
        extractedData.patientMetrics.total = totalCount;

        isTableActive = false;
        break; 
      }

      const rank = (extractedData.hanchartData?.length || 0) + 1;
      
      extractedData.hanchartData?.push({
        rank,
        type: String(rawRow[headerIndexes.type]),
        nonTaxable: parseValue(headerIndexes.nonTaxable),
        taxable: parseValue(headerIndexes.taxable),
        coveredCopay: parseValue(headerIndexes.coveredCopay),
        coveredClaim: parseValue(headerIndexes.coveredClaim),
        autoClaim: parseValue(headerIndexes.autoClaim),
        totalCopay: parseValue(headerIndexes.totalCopay),
        supportFund: parseValue(headerIndexes.supportFund),
        totalRevenue: parseValue(headerIndexes.totalRevenue),
        ratio: parseValue(headerIndexes.ratio),
      });
    }
  }

  if (extractedData.hanchartData && extractedData.hanchartData.length === 0) {
     return parseHeuristic(jsonData, targetMonth);
  }
  mappingResults.push({ original: "초진/재진 분류표", standard: "한차트 정밀 파싱" });
  return [{ targetMonth, extractedData, mappingResults }];
}

function parseOkchart(jsonData: string[][], targetMonth: string): ParseExcelResult[] {
  const results: ParseExcelResult[] = [];

  // 연말결산:2025 형식 찾기
  let contextYear = "";
  for (let i = 0; i < Math.min(jsonData.length, 5); i++) {
    const rowStr = jsonData[i].join(" ");
    const yearMatch = rowStr.match(/연말결산:(\d{4})/);
    if (yearMatch) {
      contextYear = yearMatch[1];
      break;
    }
  }

  // "월"이라는 정확한 컬럼이 있는 행을 우선적으로 헤더로 인식 (연말결산 등 리스트 형태)
  let headerRowIndex = jsonData.findIndex(row => row.some(cell => String(cell).trim() === "월"));
  
  // 못 찾으면 기존 방식대로 내원환자수나 총진료비가 있는 행 찾기
  if (headerRowIndex === -1) {
    headerRowIndex = jsonData.findIndex(row => 
      row.some(cell => String(cell).includes("내원환자수")) || 
      row.some(cell => String(cell).includes("총진료비"))
    );
  }

  if (headerRowIndex === -1) return [];

  const headers = jsonData[headerRowIndex].map(h => normalize(h));
  
  // 날짜/월 컬럼 인덱스 찾기
  const dateColIdx = headers.findIndex(h => 
    h === "월" || h === "월별" || h.includes("년월") || h.includes("일자") || h.includes("기간") || h.includes("구분") || h.includes("날짜")
  );

  // 모든 데이터 행 순회
  for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
    const dataRow = jsonData[i];
    if (!dataRow || dataRow.every(c => !c)) continue;
    
    // 합계 행 건너뛰기
    if (dataRow.some(cell => String(cell).includes("합계") || String(cell).includes("총계"))) continue;

    let rowMonth = targetMonth;
    if (dateColIdx !== -1 && dataRow[dateColIdx]) {
      const extracted = tryExtractMonth(dataRow[dateColIdx], contextYear);
      if (extracted) rowMonth = extracted;
    }

    const extractedData: DataMetrics = JSON.parse(JSON.stringify(initialDataMetrics));
    const mappingResults: MappingResult[] = [];

    const findAndParse = (keywords: string[]) => {
      const idx = headers.findIndex(h => keywords.some(k => h === normalize(k)));
      return idx !== -1 ? parseCleanNumber(dataRow[idx]) : 0;
    };

    extractedData.patientMetrics.total = findAndParse(["내원환자수"]);
    extractedData.patientMetrics.new = findAndParse(["신규환자수"]);
    extractedData.patientMetrics.auto = findAndParse(["자보환자수"]);
    extractedData.patientMetrics.dailyAvg = findAndParse(["진료일평균환자수"]);

    extractedData.generatedRevenue.total = findAndParse(["총진료비"]);
    extractedData.generatedRevenue.copay = findAndParse(["본인부담"]);
    extractedData.generatedRevenue.insurance = findAndParse(["보험(청구)"]);
    extractedData.generatedRevenue.auto = findAndParse(["자보(청구)"]);
    extractedData.generatedRevenue.worker = findAndParse(["산재(청구)"]);
    extractedData.generatedRevenue.nonCovered = findAndParse(["비급여"]);
    extractedData.generatedRevenue.patientTotal = findAndParse(["환자부담계"]);

    extractedData.leakage.receivables = findAndParse(["미수금"]);
    extractedData.leakage.discountTotal = findAndParse(["할인총액"]);
    extractedData.leakage.roundOffTotal = findAndParse(["절사총액"]);

    extractedData.cashFlow.totalReceived = findAndParse(["수납총액"]);
    extractedData.cashFlow.totalRefund = findAndParse(["환불총액"]);

    extractedData.paymentMethods.cash = findAndParse(["현금수납"]);
    extractedData.paymentMethods.card = findAndParse(["카드수납"]);
    extractedData.paymentMethods.other = findAndParse(["건생수납"]);

    extractedData.okchartData = {
      totalPatients: extractedData.patientMetrics.total,
      newPatients: extractedData.patientMetrics.new,
      autoPatients: extractedData.patientMetrics.auto,
      avgDailyPatients: extractedData.patientMetrics.dailyAvg,
      totalRevenue: extractedData.generatedRevenue.total,
      insuranceClaim: extractedData.generatedRevenue.insurance,
      copay: extractedData.generatedRevenue.copay,
      autoClaim: extractedData.generatedRevenue.auto,
      workerClaim: extractedData.generatedRevenue.worker,
      nonCovered: extractedData.generatedRevenue.nonCovered,
      patientTotal: extractedData.generatedRevenue.patientTotal,
      receivables: extractedData.leakage.receivables,
      discountTotal: extractedData.leakage.discountTotal,
      roundOffTotal: extractedData.leakage.roundOffTotal,
      totalReceived: extractedData.cashFlow.totalReceived,
      totalRefund: extractedData.cashFlow.totalRefund,
      cashPayment: extractedData.paymentMethods.cash,
      cardPayment: extractedData.paymentMethods.card,
      giftPayment: extractedData.paymentMethods.other,
    };

    mappingResults.push({ original: "오케이차트 수납통계", standard: "정밀 파싱" });
    results.push({ targetMonth: rowMonth, extractedData, mappingResults });
  }

  return results;
}

function parseHanisarang(jsonData: string[][], targetMonth: string): ParseExcelResult[] {
  const extractedData: DataMetrics = JSON.parse(JSON.stringify(initialDataMetrics));
  const mappingResults: MappingResult[] = [];
  
  // 한의사랑은 보통 첫 1-10행 사이에 헤더가 있음 (정규화하여 검색)
  let headerRowIndex = -1;
  let headers: string[] = [];

  for (let i = 0; i < Math.min(jsonData.length, 20); i++) {
    const normalizedRow = (jsonData[i] || []).map(cell => normalize(cell));
    if (normalizedRow.some(h => h.includes("차트번호") || h.includes("수진자명") || h.includes("총진료비"))) {
      headerRowIndex = i;
      headers = normalizedRow;
      break;
    }
  }

  if (headerRowIndex === -1) {
    console.error("Hanisarang Header detection failed. Raw data sample:", jsonData.slice(0, 3));
    return [];
  }
  
  const getIdx = (keywords: string[]) => {
    return headers.findIndex(h => keywords.some(k => h === normalize(k)));
  };

  const idxTotalRevenue = getIdx(["총진료비"]);
  const idxInsurance = getIdx(["보험청구액"]);
  const idxCopay1 = getIdx(["보험본인부담금"]);
  const idxCopay2 = getIdx(["급여전액본인부담"]);
  const idxCopay3 = getIdx(["일반본인부담금"]);
  const idxGeneralCopay = getIdx(["일반본인부담금"]); // 분리 설계 항목
  const idxReceived = getIdx(["수납액"]);
  const idxCash1 = getIdx(["현금금액"]);
  const idxCash2 = getIdx(["현금영수증"]);
  const idxCard = getIdx(["카드금액"]);
  const idxTransfer = getIdx(["이체금액"]);
  const idxReceivables = getIdx(["미수총액"]);
  const idxDiscount = getIdx(["할인금액"]);
  const idxRoundOff = getIdx(["절사액"]);
  const idxRefund = getIdx(["환불처리액"]);
  const idxNew = getIdx(["신규"]);
  const idxFirstVisit = getIdx(["초진"]);

  let totalCount = 0;
  let newCount = 0;

  for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (!row || row.length === 0 || !row[0]) continue; // Assume chart number exists for valid row

    totalCount++;
    if ((idxNew !== -1 && parseCleanNumber(row[idxNew]) > 0) || 
        (idxFirstVisit !== -1 && parseCleanNumber(row[idxFirstVisit]) > 0)) {
      newCount++;
    }

    extractedData.generatedRevenue.total += parseCleanNumber(row[idxTotalRevenue]);
    extractedData.generatedRevenue.insurance += parseCleanNumber(row[idxInsurance]);
    
    // 일반본인부담금을 제외한 나머지 본인부담금 합산 (분리 설계를 위함)
    const pureCopay = parseCleanNumber(row[idxCopay1]) + parseCleanNumber(row[idxCopay2]);
    const generalCopay = parseCleanNumber(row[idxGeneralCopay]);
    
    extractedData.generatedRevenue.copay += (pureCopay + generalCopay);
    if (extractedData.hanisarangData) {
      extractedData.hanisarangData.generalCopay = (extractedData.hanisarangData.generalCopay || 0) + generalCopay;
    }
    
    const idxNonCoveredCard = getIdx(["카드비급여"]);
    const idxNonCoveredCash = getIdx(["현금영수증비급여"]);
    if (idxNonCoveredCard !== -1) extractedData.generatedRevenue.nonCovered += parseCleanNumber(row[idxNonCoveredCard]);
    if (idxNonCoveredCash !== -1) extractedData.generatedRevenue.nonCovered += parseCleanNumber(row[idxNonCoveredCash]);

    extractedData.cashFlow.totalReceived += parseCleanNumber(row[idxReceived]);
    extractedData.paymentMethods.card += parseCleanNumber(row[idxCard]);
    extractedData.paymentMethods.cash += (parseCleanNumber(row[idxCash1]) + parseCleanNumber(row[idxCash2]));
    extractedData.paymentMethods.other += parseCleanNumber(row[idxTransfer]);

    extractedData.leakage.receivables += parseCleanNumber(row[idxReceivables]);
    extractedData.leakage.discountTotal += parseCleanNumber(row[idxDiscount]);
    extractedData.leakage.roundOffTotal += parseCleanNumber(row[idxRoundOff]);
    extractedData.cashFlow.totalRefund += parseCleanNumber(row[idxRefund]);
  }

  extractedData.patientMetrics.total = totalCount;
  extractedData.patientMetrics.new = newCount;
  
  // Fill the specific Hanisarang schema
  extractedData.hanisarangData = {
    totalPatients: totalCount,
    newPatients: newCount,
    totalRevenue: extractedData.generatedRevenue.total,
    insuranceClaim: extractedData.generatedRevenue.insurance,
    copay: extractedData.generatedRevenue.copay,
    nonCovered: extractedData.generatedRevenue.nonCovered,
    receivables: extractedData.leakage.receivables,
    discountTotal: extractedData.leakage.discountTotal,
    roundOffTotal: extractedData.leakage.roundOffTotal,
    totalReceived: extractedData.cashFlow.totalReceived,
    totalRefund: extractedData.cashFlow.totalRefund,
    cashPayment: extractedData.paymentMethods.cash,
    cardPayment: extractedData.paymentMethods.card,
    transferPayment: extractedData.paymentMethods.other,
  };

  mappingResults.push({ original: "한의사랑 통계 리스트", standard: "리스트 합산 분석" });
  return [{ targetMonth, extractedData, mappingResults }];
}

function parseDonguibogam(jsonData: string[][], defaultMonth: string): ParseExcelResult[] {
  const resultsMap: Record<string, ParseExcelResult> = {};

  const fullContent = jsonData.slice(0, 15).flat().map(c => normalize(c)).join("");
  const isFinancial = fullContent.includes("총진료비") || fullContent.includes("월별매출") || (fullContent.includes("실수납액") && fullContent.includes("총진료비"));
  const isTreatment = fullContent.includes("진료년월") || fullContent.includes("외래진료통계") || (fullContent.includes("초진") && fullContent.includes("진료년월"));

  // 상단 15줄에서 전체 월 정보가 있는지 먼저 검색
  let globalMonth = "";
  for (let i = 0; i < Math.min(jsonData.length, 15); i++) {
    const rowStr = jsonData[i].join(" ");
    // 연도를 2020~2035 사이로 엄격히 제한 (65년 등 오인 방지)
    const m = rowStr.match(/(202\d|203[0-5])\s*년?\s*[\/\-\. ]{0,3}\s*(\d{1,2})(?:\s*월)?/);
    if (m) {
      const year = m[1];
      const month = m[2].padStart(2, "0");
      if (parseInt(month) >= 1 && parseInt(month) <= 12) {
        globalMonth = `${year}-${month}`;
        break;
      }
    }
  }

  const baseMonth = globalMonth || defaultMonth;

  const getMonthFromRow = (row: string[], fallback: string) => {
    // [강화] 모든 열을 전수 스캔하여 날짜 후보를 찾음
    for (let i = 0; i < row.length; i++) {
      let rawVal = row[i];
      if (rawVal === undefined || rawVal === null || rawVal === "") continue;
      
      // 1. 엑셀 숫자형 날짜 (Serial Date) 처리
      if (typeof rawVal === 'number') {
        const m = excelDateToMonth(rawVal);
        if (m) return m;
      }

      // 2. SheetJS Date 객체 처리
      if (rawVal instanceof Date || (typeof rawVal === 'object' && Object.prototype.toString.call(rawVal) === '[object Date]')) {
        const d = rawVal as Date;
        if (!isNaN(d.getTime())) {
          const year = d.getFullYear();
          if (year >= 2020 && year <= 2035) {
            return `${year}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          }
        }
      }

      let s = String(rawVal).trim();
      if (!s || s === "0" || s.length < 4) continue;

      // 3. YYYY-MM-DD 또는 YYYY.MM.DD 또는 YYYY/MM/DD (공백 및 마침표 유연 처리)
      let m = s.match(/(202\d|203[0-5])[\.\-\/\s]+(\d{1,2})[\.\-\/\s]+(\d{1,2})/);
      if (m) return `${m[1]}-${m[2].padStart(2, "0")}`;

      // 4. 2026년 03월 형식 (공백 및 특수기호 유연 처리)
      m = s.match(/(202\d|203[0-5])\s*년?\s*[\/\-\. ]{0,3}\s*(\d{1,2})\s*월?/);
      if (m) {
        const month = m[2].padStart(2, "0");
        if (parseInt(month) >= 1 && parseInt(month) <= 12) return `${m[1]}-${month}`;
      }

      // 5. 20240115 (8자리 연속)
      if (/^202\d{5}$/.test(s)) return `${s.slice(0,4)}-${s.slice(4,6)}`;
      
      // 6. 24.01 (YY.MM) - 숫자만 있는 경우 방지를 위해 점(.) 필수 포함
      m = s.match(/^(2[0-5]|30)[\.\-\/](\d{1,2})$/);
      if (m) {
        const month = m[2].padStart(2, "0");
        if (parseInt(month) >= 1 && parseInt(month) <= 12) return `20${m[1]}-${month}`;
      }

      // 7. 기타 범용 Date.parse (2020년대 이후만 인정)
      const d = new Date(s);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        if (year >= 2020 && year <= 2035) {
          return `${year}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        }
      }
    }
    return fallback;
  };

  const createResult = (month: string): ParseExcelResult => ({
    targetMonth: month,
    extractedData: {
      ...JSON.parse(JSON.stringify(initialDataMetrics)),
      donguibogamData: {
        totalRevenue: 0, insuranceClaim: 0, copay: 0, fullCopay: 0, nonCovered: 0,
        discount: 0, receivables: 0, totalReceived: 0, cashTotal: 0, cardTotal: 0,
        newPatients: 0, recurringPatients: 0, referralPatients: 0, totalPatients: 0,
        treatments: {}, hasFinancialData: false, hasTreatmentData: false
      }
    },
    mappingResults: []
  });

  let lastSeenMonthFi = baseMonth;
  if (isFinancial) {
    let headerIdx = jsonData.findIndex(row => row.some(cell => normalize(cell).includes("총진료비")));
    if (headerIdx !== -1) {
      const headers = jsonData[headerIdx].map(h => normalize(h));
      for (let i = headerIdx + 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.every(c => !c) || row.some(c => String(c).includes("합계"))) continue;

        // 현재 행에서 월 정보 탐색, 없으면 이전 행의 월 상속
        const rowMonth = getMonthFromRow(row, lastSeenMonthFi);
        lastSeenMonthFi = rowMonth; // 상태 업데이트

        if (!resultsMap[rowMonth]) resultsMap[rowMonth] = createResult(rowMonth);
        const res = resultsMap[rowMonth];
        const d = res.extractedData.donguibogamData!;
        const getVal = (ks: string[]) => {
          const idx = headers.findIndex(h => ks.some(k => h === normalize(k)));
          return idx !== -1 ? parseCleanNumber(row[idx]) : 0;
        };

        d.totalRevenue += getVal(["총진료비"]);
        d.insuranceClaim += getVal(["청구금액"]);
        d.copay += getVal(["본인부담금"]);
        d.fullCopay += getVal(["전액본인부담금"]);
        d.nonCovered += getVal(["비보험"]);
        d.discount += getVal(["할인"]);
        d.receivables += getVal(["미수입금"]);
        d.totalReceived += getVal(["실수납액"]);
        d.cashTotal += getVal(["현금수납보험"]) + getVal(["현금수납비보험"]) + getVal(["현금영수증보험"]) + getVal(["현금영수증비보험"]);
        d.cardTotal += getVal(["카드수납보험"]) + getVal(["카드수납비보험"]);
        d.hasFinancialData = true;

        res.extractedData.generatedRevenue.total = d.totalRevenue;
        res.extractedData.generatedRevenue.insurance = d.insuranceClaim;
        res.extractedData.generatedRevenue.copay = d.copay + d.fullCopay;
        res.extractedData.generatedRevenue.nonCovered = d.nonCovered;
        res.extractedData.leakage.discountTotal = d.discount;
        res.extractedData.leakage.receivables = d.receivables;
        res.extractedData.cashFlow.totalReceived = d.totalReceived;
        res.extractedData.paymentMethods.cash = d.cashTotal;
        res.extractedData.paymentMethods.card = d.cardTotal;
        res.mappingResults.push({ original: "재무 행", standard: "동의보감 재무 분석" });
      }
    }
  } else if (isTreatment) {
    let lastSeenMonthTr = baseMonth;
    let headerIdx = jsonData.findIndex(row => row.some(cell => normalize(cell).includes(normalize("진료년월"))));
    if (headerIdx !== -1) {
      const headers = jsonData[headerIdx].map(h => normalize(h));
      // 날짜가 들어있는 열(Column) 인덱스 찾기
      const dateColIdx = headers.findIndex(h => h.includes("진료년월") || h.includes("내원일자"));
      
      for (let i = headerIdx + 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.every(c => !c) || row.some(c => String(c).includes("합계"))) continue;

        // 지정된 열(dateColIdx)에서 우선적으로 날짜 추출 시도
        let rowMonth = lastSeenMonthTr;
        if (dateColIdx !== -1 && row[dateColIdx]) {
           const found = getMonthFromRow([String(row[dateColIdx])], lastSeenMonthTr);
           if (found && found !== lastSeenMonthTr) {
             rowMonth = found;
           }
        } else {
           rowMonth = getMonthFromRow(row, lastSeenMonthTr);
        }
        
        lastSeenMonthTr = rowMonth;

        if (!resultsMap[rowMonth]) resultsMap[rowMonth] = createResult(rowMonth);
        const res = resultsMap[rowMonth];
        const d = res.extractedData.donguibogamData!;
        const getVal = (ks: string[]) => {
          const idx = headers.findIndex(h => ks.some(k => h === normalize(k)));
          return idx !== -1 ? parseCleanNumber(row[idx]) : 0;
        };

        d.newPatients += getVal(["초진"]);
        d.recurringPatients += getVal(["재진"]);
        d.referralPatients += getVal(["협진", "협의"]);
        d.totalPatients = d.newPatients + d.recurringPatients + d.referralPatients;
        d.hasTreatmentData = true;

        const commonHeaders = ["진료년월", "구분", "초진", "재진", "협진", "합계"];
        headers.forEach((h, idx) => {
          if (h && !commonHeaders.some(ch => h.includes(normalize(ch)))) {
            const count = parseCleanNumber(row[idx]);
            if (count > 0) d.treatments[h] = (d.treatments[h] || 0) + count;
          }
        });

        res.extractedData.patientMetrics.total = d.totalPatients;
        res.extractedData.patientMetrics.new = d.newPatients;
        res.mappingResults.push({ original: "진료 행", standard: "동의보감 진료 분석" });
      }
    }
  }

  return Object.values(resultsMap);
}

export const parseExcelFile = (file: File, defaultMonth: string, vendor: string = "auto"): Promise<ParseExcelResult[]> => {
  return new Promise((resolve, reject) => {
    const filenameDate = extractDateFromFilename(file.name);
    const targetMonth = filenameDate || defaultMonth;
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const arrayBuffer = evt.target?.result as ArrayBuffer;
        let wb;
        
        if (file.name.toLowerCase().endsWith(".csv")) {
          // [본질적 해결] TextDecoder를 사용하여 인코딩을 직접 처리 루틴
          let text = "";
          const decoderUtf8 = new TextDecoder("utf-8");
          const decoderEucKr = new TextDecoder("euc-kr");
          
          try {
            const tempText = decoderUtf8.decode(new Uint8Array(arrayBuffer));
            // 한글 키워드가 포함되어 있는지 확인하여 인코딩 판별
            if (tempText.includes("차트") || tempText.includes("수진") || tempText.includes("매출") || tempText.includes("진료")) {
              text = tempText;
            } else {
              throw new Error("Maybe not UTF-8");
            }
          } catch (e) {
            text = decoderEucKr.decode(new Uint8Array(arrayBuffer));
          }
          
          wb = XLSX.read(text, { type: "string" });
        } else {
          wb = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
        }

        const jsonData = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[wb.SheetNames[0]], { header: 1 });
        if (!jsonData || jsonData.length === 0) {
          reject(new Error("파일에 읽을 수 있는 데이터가 없습니다."));
          return;
        }

        let type: string = autoDetectType(jsonData);
        
        if (vendor === "hanchart") type = "HANCHART";
        else if (vendor === "okchart") type = "OKCHART";
        else if (vendor === "hanisarang") type = "HANISARANG";
        else if (vendor === "donguibogam") type = "DONGUIBOGAM"; 
        else if (vendor === "hanuisarang") type = "HANISARANG";
        
        // 데이터 정밀 로깅 (개발 모드)
        console.log(`[Parser] Detected Type: ${type}, Vendor: ${vendor}`);

        let results: ParseExcelResult[] = [];
        switch (type) {
          case "HANCHART": results = parseHanchart(jsonData, targetMonth); break;
          case "OKCHART": results = parseOkchart(jsonData, targetMonth); break;
          case "HANISARANG": results = parseHanisarang(jsonData, targetMonth); break;
          case "DONGUIBOGAM": results = parseDonguibogam(jsonData, targetMonth); break;
          case "A": results = parseTypeA(jsonData, targetMonth); break;
          case "B": 
            results = parseTypeB(jsonData, targetMonth); 
            if (results.length === 0 && (vendor === "hanuisarang" || vendor === "donguibogam" || vendor === "hanisarang")) results = parseTypeC(jsonData);
            break;
          case "C": results = parseTypeC(jsonData); break;
          case "D": 
            results = parseTypeD(jsonData); 
            if (results.length === 0 && vendor === "okchart") results = parseOkchart(jsonData, targetMonth);
            break;
          case "HEURISTIC": results = parseHeuristic(jsonData, targetMonth); break;
          default: 
            reject(new Error("지원하지 않는 파일 형식입니다. (형식 감지 실패)"));
            return;
        }
        
        results.forEach(res => {
          const gen = res.extractedData.generatedRevenue;
          gen.totalCovered = (gen.insurance || 0) + (gen.copay || 0);
          
          if (!res.extractedData.cashFlow.totalReceived) {
            res.extractedData.cashFlow.totalReceived = (res.extractedData.paymentMethods.cash || 0) + (res.extractedData.paymentMethods.card || 0);
          }
        });

        if (results.length > 0) {
          resolve(results);
        } else {
          reject(new Error("파일에서 유효한 데이터를 추출하지 못했습니다. EMR 설정과 파일을 다시 확인해주세요."));
        }
      } catch (e) { 
        console.error("Excel Parse Critical Error:", e);
        reject(new Error("파일 처리 중 오류 발생: " + (e as Error).message)); 
      }
    };
    reader.onerror = () => reject(new Error("파일 읽기 실패"));
    reader.readAsArrayBuffer(file);
  });
};
