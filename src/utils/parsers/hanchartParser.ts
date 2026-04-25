import { DataMetrics, initialDataMetrics } from "@/context/DataContext";
import { normalize, parseCleanNumber, extractDiscount } from "./parserUtils";

/**
 * 한차트 전용 고도화 파서
 * 1. 세로형(결산서): Key/Value 페어 행 단위 검색
 * 2. 가로형(구분별 집계): 헤더 열 분석 + 합계 행 검색
 * [v3.1] 원장님 요청에 따른 텍스트 매칭 정밀화 및 할인액(괄호) 추출 강화
 */
export const parseHanChart = (rows: any[][]): DataMetrics => {
  const extractedData: DataMetrics = JSON.parse(JSON.stringify(initialDataMetrics));
  extractedData.emrType = "hanchart";

  // 포맷 감지
  const headerRow = rows[0] || [];
  const isHorizontal = headerRow.some(cell => {
    const n = normalize(String(cell));
    return n.includes("구분") || n.includes("순위") || n.includes("총매출");
  });

  // --- 유틸리티: 키워드 기반 값 추출 ---
  const getValue = (keyword: string, exclude: string[] = []): string => {
    const normalizedKey = normalize(keyword);

    if (isHorizontal) {
      const colIndex = headerRow.findIndex(cell => {
        const n = normalize(String(cell));
        if (n.includes(normalizedKey)) {
          if (exclude.some(ex => n.includes(normalize(ex)))) return false;
          return true;
        }
        return false;
      });

      if (colIndex !== -1) {
        const sumRow = rows.find(r => normalize(String(r[0] || r[1])).includes("합계"));
        return sumRow ? String(sumRow[colIndex]) : "0";
      }
    } else {
      const row = rows.find(r => {
        if (!r[0]) return false;
        const normalizedRow = normalize(r[0]);
        if (normalizedRow.includes(normalizedKey)) {
          if (exclude.some(ex => normalizedRow.includes(normalize(ex)))) return false;
          return true;
        }
        return false;
      });
      return row ? String(row[1]) : "0";
    }
    return "0";
  };

  // 1. 환자 유입 지표
  let newPatients = 0;
  let rePatients = 0;

  if (isHorizontal) {
    const firstVisitRow = rows.find(r => normalize(String(r[1])).includes("초진"));
    const reVisitRow = rows.find(r => normalize(String(r[1])).includes("재진"));
    // 가로형 포맷: 구분 컬럼의 괄호 밖 숫자가 인원수 (예: 초진(64))
    newPatients = firstVisitRow ? parseCleanNumber(String(firstVisitRow[1]).match(/(\d+)/)?.[1]) : 0;
    rePatients = reVisitRow ? parseCleanNumber(String(reVisitRow[1]).match(/(\d+)/)?.[1]) : 0;
  } else {
    const firstVisitRow = rows.find(r => r[1] && normalize(r[1]).includes("초진"));
    const reVisitRow = rows.find(r => r[1] && normalize(r[1]).includes("재진"));
    newPatients = firstVisitRow ? parseCleanNumber(String(firstVisitRow[1]).match(/(\d+)/)?.[1]) : 0;
    rePatients = reVisitRow ? parseCleanNumber(String(reVisitRow[1]).match(/(\d+)/)?.[1]) : 0;
  }

  // 2. 매출 구성 요소 추출 (유저 요청 텍스트 일치)
  // 총진료비 = 총매출액
  const totalRevenueNode = parseCleanNumber(getValue("총매출액")) || parseCleanNumber(getValue("총진료비"));
  
  // 급여진료비합 (본항+청구)
  const copay = parseCleanNumber(getValue("급여본부")) || parseCleanNumber(getValue("본인부담금"));
  const healthInsurance = parseCleanNumber(getValue("급여청구")) || parseCleanNumber(getValue("보험청구액", ["자보", "자동차", "산재"]));
  
  // 자동차보험 및 산재
  const autoInsurance = parseCleanNumber(getValue("자보청구")) || parseCleanNumber(getValue("자동차보험"));
  const workerComp = parseCleanNumber(getValue("산재청구")) || parseCleanNumber(getValue("산재보험"));
  
  // 비급여 (괄호 제외 순수 수치)
  const taxFreeRaw = getValue("비과세비급여"); 
  const taxableRaw = getValue("과세비급여");
  const taxFreeNonCovered = parseCleanNumber(taxFreeRaw);
  const taxableNonCovered = parseCleanNumber(taxableRaw);

  // 3. 리서치 기반 할인액 추출 (괄호 안의 수치 합산)
  const taxFreeDiscount = extractDiscount(taxFreeRaw);
  const taxableDiscount = extractDiscount(taxableRaw);
  const totalDiscount = taxFreeDiscount + taxableDiscount;

  // 4. 지표 매핑 (V3 Schema)
  extractedData.patientMetrics = {
    ...extractedData.patientMetrics,
    total: newPatients + rePatients,
    new: newPatients,
    returning: rePatients,
    auto: autoInsurance > 0 ? 1 : 0, 
  };

  extractedData.generatedRevenue = {
    ...extractedData.generatedRevenue,
    copay,
    insurance: healthInsurance,
    auto: autoInsurance,
    worker: workerComp,
    nonCovered: taxFreeNonCovered + taxableNonCovered,
    // 원장님 요청: 모든 구성 요소의 합으로 총매출 재산출
    total: copay + healthInsurance + autoInsurance + workerComp + taxFreeNonCovered + taxableNonCovered,
    patientTotal: parseCleanNumber(getValue("본부금합")) || (copay + taxFreeNonCovered + taxableNonCovered)
  };

  extractedData.leakage = {
    ...extractedData.leakage,
    receivables: parseCleanNumber(getValue("미수금")),
    discountTotal: totalDiscount,
    roundOffTotal: 0
  };

  // EMR 특화 데이터 보강 (UI 라벨용)
  extractedData.emrSpecific["총진료비"] = totalRevenueNode; 
  extractedData.emrSpecific["급여진료비합"] = copay + healthInsurance;
  extractedData.emrSpecific["과세 비급여"] = taxableNonCovered;
  extractedData.emrSpecific["비과세 비급여"] = taxFreeNonCovered;
  extractedData.emrSpecific["비과세할인액"] = taxFreeDiscount;
  extractedData.emrSpecific["과세할인액"] = taxableDiscount;
  
  const totalWithDiscount = extractedData.generatedRevenue.total + totalDiscount;
  extractedData.emrSpecific["할인율"] = totalWithDiscount > 0 
    ? (totalDiscount / totalWithDiscount) * 100 
    : 0;

  if (rePatients > 0) extractedData.emrSpecific["재진 환자수"] = rePatients;

  // 수납 수단
  const cash = parseCleanNumber(getValue("현금"));
  const card = parseCleanNumber(getValue("카드"));
  const bank = parseCleanNumber(getValue("통장"));
  extractedData.cashFlow.totalReceived = cash + card + bank;
  extractedData.paymentMethods = { cash, card, other: bank };

  return extractedData;
};
