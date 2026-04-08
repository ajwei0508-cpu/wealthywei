import * as XLSX from "xlsx";
import { DataMetrics } from "@/context/DataContext";

export interface MappingResult {
  original: string;
  standard: string;
}

export interface ParseExcelResult {
  targetMonth: string;
  extractedData: Partial<DataMetrics>;
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

const parseNumericValue = (val: unknown): number => {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const cleaned = val.replace(/[^0-9.-]+/g, "");
    return parseFloat(cleaned) || 0;
  }
  return 0;
};

// Define keyword groups with explicit types based on DataMetrics keys
type KeywordGroupKey = 'patientPay' | 'insuranceClaim' | 'industrialAccidentClaim' | 'autoInsuranceClaim' | 'totalTreatmentFee' | 'patientCount' | 'newPatientCount' | 'autoInsuranceCount' | 'nonBenefit' | 'accountsReceivable' | 'cashCollection' | 'cardCollection';

const KEYWORD_GROUPS: Record<KeywordGroupKey, { label: string; keywords: string[] }> = {
  patientPay: { label: "본인부담금", keywords: ["본부금", "본인부담", "수납액", "환자부담", "본부", "수납그"] },
  insuranceClaim: { label: "보험청구액", keywords: ["청구금", "보험청구", "공단청구", "공단부담", "조합부담", "조합", "청구액", "청구합"] },
  industrialAccidentClaim: { label: "산재청구액", keywords: ["산재", "산업재해", "산재보험"] },
  autoInsuranceClaim: { label: "자보청구액", keywords: ["자보", "자동차", "자동차보험", "자보청구"] },
  totalTreatmentFee: { label: "총진료비", keywords: ["총매출", "총진료", "합계", "총매출액", "진료비계", "총계", "진료비합계"] },
  patientCount: { label: "내원환자수", keywords: ["내원", "환자수", "총내원", "래원", "수납인원"] },
  newPatientCount: { label: "신규환자수", keywords: ["신규", "신환", "초진", "처음", "신입"] },
  autoInsuranceCount: { label: "자보환자수", keywords: ["자보", "자동차"] },
  nonBenefit: { label: "비급여", keywords: ["비급여", "일반", "비보험"] },
  accountsReceivable: { label: "미수금", keywords: ["미수금", "미수"] },
  cashCollection: { label: "현금수납", keywords: ["현금", "현금수납"] },
  cardCollection: { label: "카드수납", keywords: ["카드", "카드수납"] },
};

export const parseExcelFile = (
  file: File, 
  defaultMonth: string
): Promise<ParseExcelResult> => {
  return new Promise((resolve, reject) => {
    const filenameDate = extractDateFromFilename(file.name);
    const targetMonth = filenameDate || defaultMonth;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });

        if (!jsonData || jsonData.length === 0) {
          return reject(new Error("비어있는 엑셀 파일입니다."));
        }

        const extractedData: Partial<DataMetrics> = {};
        const successList: MappingResult[] = [];

        let trueHeaderRowIndex = -1;
        for (let i = 0; i < Math.min(jsonData.length, 50); i++) {
          const row = jsonData[i];
          if (!row || row.length < 2) continue;
          
          let matchCount = 0;
          row.forEach(cell => {
            const norm = normalize(cell);
            if (!norm) return;
            Object.values(KEYWORD_GROUPS).forEach(group => {
              if (group.keywords.some(k => norm.includes(normalize(k)))) matchCount++;
            });
          });

          if (matchCount >= 2) {
            trueHeaderRowIndex = i;
            break;
          }
        }

        if (trueHeaderRowIndex === -1) {
           return reject(new Error("헤더 발견 실패"));
        }

        const activeHeaderRow = jsonData[trueHeaderRowIndex];
        const colMap: Partial<Record<KeywordGroupKey, number>> = {};
        
        activeHeaderRow.forEach((cell, colIndex) => {
          const norm = normalize(cell);
          if (!norm) return;
          (Object.entries(KEYWORD_GROUPS) as [KeywordGroupKey, { label: string; keywords: string[] }][]).forEach(([key, group]) => {
            if (colMap[key] === undefined && group.keywords.some(k => norm.includes(normalize(k)))) {
              colMap[key] = colIndex;
            }
          });
        });

        (Object.entries(colMap) as [KeywordGroupKey, number][]).forEach(([key, colIndex]) => {
          let foundValue = 0;
          for (let r = trueHeaderRowIndex + 1; r < Math.min(jsonData.length, trueHeaderRowIndex + 200); r++) {
            if (!jsonData[r]) continue;
            const firstColValue = normalize(jsonData[r][0]);
            if (firstColValue.includes("합계") || firstColValue.includes("소계")) {
              foundValue = parseNumericValue(jsonData[r][colIndex]);
              if (foundValue !== 0) break;
            }
          }

          if (foundValue === 0) {
            for (let offset = 1; offset <= 5; offset++) {
              const dataRowIndex = trueHeaderRowIndex + offset;
              if (jsonData[dataRowIndex]) {
                const val = parseNumericValue(jsonData[dataRowIndex][colIndex]);
                if (val !== 0) {
                  foundValue = val;
                  break;
                }
              }
            }
          }
          
          if (foundValue !== 0) {
            extractedData[key] = foundValue;
            successList.push({ original: String(activeHeaderRow[colIndex]).trim(), standard: KEYWORD_GROUPS[key].label });
          }
        });

        // totalRevenue logic
        if (extractedData.totalTreatmentFee) {
          extractedData.totalRevenue = extractedData.totalTreatmentFee;
        } else {
          extractedData.totalRevenue = 
            (extractedData.patientPay || 0) + 
            (extractedData.insuranceClaim || 0) + 
            (extractedData.autoInsuranceClaim || 0) + 
            (extractedData.nonBenefit || 0);
        }

        if (successList.length > 0) {
          if (!extractedData.totalRevenue || extractedData.totalRevenue === 0) {
            for (let r = 0; r < Math.min(jsonData.length, 500); r++) {
              const row = jsonData[r];
              if (!row) continue;
              const rowString = JSON.stringify(row);
              if (rowString.includes("합계") || rowString.includes("총계") || rowString.includes("총매출")) {
                let maxVal = 0;
                row.forEach(cell => {
                  const num = parseNumericValue(cell);
                  if (num > maxVal) maxVal = num;
                });
                if (maxVal > 1000) {
                  extractedData.totalRevenue = maxVal;
                  break;
                }
              }
            }
          }

          if (extractedData.totalTreatmentFee && (!extractedData.totalRevenue || extractedData.totalRevenue === 0)) {
            extractedData.totalRevenue = extractedData.totalTreatmentFee;
          } else if (!extractedData.totalRevenue || extractedData.totalRevenue === 0) {
            extractedData.totalRevenue = 
              (extractedData.patientPay || 0) + 
              (extractedData.insuranceClaim || 0) + 
              (extractedData.autoInsuranceClaim || 0) + 
              (extractedData.nonBenefit || 0);
          }

          return resolve({ targetMonth, extractedData, mappingResults: successList });
        } else {
          let foundSomething = false;
          let fallbackRevenue = 0;
          for (let r = 0; r < Math.min(jsonData.length, 100); r++) {
            const row = jsonData[r];
            if (!row) continue;
            const rowStr = JSON.stringify(row);
            if (rowStr.includes("합계") || rowStr.includes("총계")) {
              let maxVal = 0;
              row.forEach(cell => {
                const num = parseNumericValue(cell);
                if (num > maxVal) maxVal = num;
              });
              if (maxVal > 0) {
                fallbackRevenue = maxVal;
                foundSomething = true;
                break;
              }
            }
          }

          if (foundSomething) {
            extractedData.totalRevenue = fallbackRevenue;
            return resolve({ targetMonth, extractedData, mappingResults: [] });
          } else {
            return reject(new Error("데이터 추출에 실패했습니다. 필드 이름을 확인하거나 '합계' 행을 포함해 주세요."));
          }
        }
      } catch (error) {
        return reject(new Error("파일 처리 중 오류 발생"));
      }
    };
    reader.onerror = () => reject(new Error("파일 읽기 실패"));
    reader.readAsBinaryString(file);
  });
};
