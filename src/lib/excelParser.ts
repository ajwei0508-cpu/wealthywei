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

export const extractDateFromFilename = (filename: string): string | null => {
  const parenMatch = filename.match(/(\d{4})[^\d](\d{1,2})/);
  if (parenMatch) return `${parenMatch[1]}-${parenMatch[2].padStart(2, "0")}`;

  const digit6Match = filename.match(/(\d{4})(\d{2})/);
  if (digit6Match) return `${digit6Match[1]}-${digit6Match[2]}`;

  const fullYearMatch = filename.match(/(\d{4})[^\d]?(\d{1,2})/);
  if (fullYearMatch) return `${fullYearMatch[1]}-${fullYearMatch[2].padStart(2, "0")}`;

  const shortYearMatch = filename.match(/(\d{2})[^\d]?(\d{1,2})/);
  if (shortYearMatch) return `20${shortYearMatch[1]}-${shortYearMatch[2].padStart(2, "0")}`;

  return null;
};

const normalize = (text: unknown): string =>
  String(text || "").replace(/[\n\r\s\(\)\[\]\{\}]/g, "").replace(/[^\w\uAC00-\uD7AF]+/g, "").trim();

const parseCleanNumber = (val: unknown): number => {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const withoutParens = val.replace(/\(.*\)/g, "");
    const cleaned = withoutParens.replace(/[^0-9.-]+/g, "");
    return parseFloat(cleaned) || 0;
  }
  return 0;
};

const extractParensNumber = (val: unknown): number => {
  if (typeof val === "string") {
    const match = val.match(/\(([^)]+)\)/);
    if (match) {
      const cleaned = match[1].replace(/[^0-9.-]+/g, "");
      return parseFloat(cleaned) || 0;
    }
  }
  return 0;
};

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

const autoDetectType = (jsonData: string[][]): "A" | "B" | "C" | "D" | "HEURISTIC" | "UNKNOWN" => {
  const first3Rows = jsonData.slice(0, 3).map(row => JSON.stringify(row));
  const fullContent = first3Rows.join(" ");

  if (jsonData[0] && normalize(jsonData[0][0]) === normalize("월말결산")) return "D";
  if (fullContent.includes("매출 집계") || fullContent.includes("급여진료비합")) return "A";
  if (fullContent.includes("차트번호") && fullContent.includes("수진자명") && fullContent.includes("수진일")) return "B";
  if (fullContent.includes("일자") && (fullContent.includes("진료비총 액") || fullContent.includes("진료비총액"))) return "C";

  let keywordMatchCount = 0;
  const flatData = jsonData.flat().map(c => normalize(c)).join(" ");
  MAPPING_CONFIG.forEach(cfg => {
    if (cfg.keywords.some(k => flatData.includes(normalize(k)))) keywordMatchCount++;
  });
  if (keywordMatchCount >= 4) return "HEURISTIC";

  return "UNKNOWN";
};

const parseTypeA = (jsonData: string[][], targetMonth: string): ParseExcelResult[] => {
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
};

const parseTypeB = (jsonData: string[][], filenameMonth: string): ParseExcelResult[] => {
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

  return [{ targetMonth: filenameMonth, extractedData, mappingResults }];
};

const parseTypeC = (jsonData: string[][]): ParseExcelResult[] => {
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
};

const parseTypeD = (jsonData: string[][]): ParseExcelResult[] => {
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
};

const parseHeuristic = (jsonData: string[][], targetMonth: string): ParseExcelResult[] => {
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
};

export const parseExcelFile = (file: File, defaultMonth: string): Promise<ParseExcelResult[]> => {
  return new Promise((resolve, reject) => {
    const filenameDate = extractDateFromFilename(file.name);
    const targetMonth = filenameDate || defaultMonth;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const jsonData = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[wb.SheetNames[0]], { header: 1 });
        if (!jsonData || jsonData.length === 0) return reject(new Error("비어있는 엑셀 파일입니다."));

        const type = autoDetectType(jsonData);
        let results: ParseExcelResult[] = [];
        switch (type) {
          case "A": results = parseTypeA(jsonData, targetMonth); break;
          case "B": results = parseTypeB(jsonData, targetMonth); break;
          case "C": results = parseTypeC(jsonData); break;
          case "D": results = parseTypeD(jsonData); break;
          case "HEURISTIC": results = parseHeuristic(jsonData, targetMonth); break;
          default: return reject(new Error("지원하지 않는 엑셀 파일 형식입니다."));
        }
        resolve(results.length > 0 ? results : reject(new Error("데이터를 추출할 수 없습니다.")));
      } catch (e) { reject(new Error("파일 처리 중 오류 발생")); }
    };
    reader.onerror = () => reject(new Error("파일 읽기 실패"));
    reader.readAsBinaryString(file);
  });
};
