/**
 * 초정밀 한차트(Hanchart) 월간 결산 CSV 파서
 * 
 * 이미지 분석 기반 개선 사항:
 * 1. 컬럼 위치 자동 탐색: 숫자가 몇 번째 칸에 있든 해당 행에서 가장 먼저 발견되는 숫자를 추출합니다.
 * 2. 전 항목 매핑: 현금/카드수납, 미수금, 본인부담금 등 이미지상의 상/하단 모든 항목을 커버합니다.
 * 3. 정량적 검증: 이미지상의 '총진료비'와 '세부 항목 합계'가 일치하는지 로직 내에서 검증합니다.
 */

/**
 * 키워드 정문화 (공백, 따옴표, 특수문자 제거)
 */
const normalizeKeyword = (k: string) => k.replace(/[\s\t\n\r"'( )]/g, '');

/**
 * 숫자 데이터 정제 (괄호 제거, 콤마 제거, 소수점 처리)
 */
export const parseCleanNumber = (str: string): number => {
  if (!str) return 0;
  const beforeParen = str.split('(')[0];
  const integerPart = beforeParen.split('.')[0];
  const cleaned = integerPart.replace(/[^0-9-]/g, '');
  const result = parseInt(cleaned, 10);
  return isNaN(result) ? 0 : result;
};

/**
 * 한 행(columns)에서 유효한 숫자가 들어있는 첫 번째 칸을 찾아 값을 반환합니다.
 */
const findFirstNumericValue = (columns: string[]): number => {
  // 첫 번째 칸(키워드)은 제외하고 두 번째 칸부터 탐색
  for (let i = 1; i < columns.length; i++) {
    const val = parseCleanNumber(columns[i]);
    if (val !== 0) return val;
  }
  return 0;
};

export const extractDateFromFilename = (filename: string): string => {
  const match = filename.match(/(\d{4})년\s*(\d{1,2})월/);
  if (match) {
    const year = match[1];
    const month = match[2].padStart(2, '0');
    return `${year}-${month}`;
  }
  const matchHyphen = filename.match(/(\d{4})-(\d{2})/);
  if (matchHyphen) return `${matchHyphen[1]}-${matchHyphen[2]}`;
  return "";
};

export interface DataMetrics {
  totalRevenue: number;
  patientPay: number;
  insuranceClaim: number;
  patientCount: number;
  newPatientCount: number;
  autoInsuranceCount: number;
  industrialAccidentClaim: number;
  autoInsuranceClaim: number;
  totalTreatmentFee: number;
  nonBenefit: number;
  patientTotalBase: number;
  accountsReceivable: number;
  totalCollection: number;
  cashCollection: number;
  cardCollection: number;
}

export const parseHanchartCSV = (csvText: string, filename: string): (DataMetrics & { month: string }) | null => {
  const lines = csvText.split(/\r?\n/);
  const month = extractDateFromFilename(filename);
  
  if (!month) {
    console.error("파일명에서 날짜를 추출할 수 없습니다.");
    return null;
  }

  // 기본값으로 초기화
  const metrics: DataMetrics = {
    totalRevenue: 0,
    patientPay: 0,
    insuranceClaim: 0,
    patientCount: 0,
    newPatientCount: 0,
    autoInsuranceCount: 0,
    industrialAccidentClaim: 0,
    autoInsuranceClaim: 0,
    totalTreatmentFee: 0,
    nonBenefit: 0,
    patientTotalBase: 0,
    accountsReceivable: 0,
    totalCollection: 0,
    cashCollection: 0,
    cardCollection: 0,
  };

  let nonBenefit1 = 0; // 비과세
  let nonBenefit2 = 0; // 과세

  lines.forEach(line => {
    // CSV 표준 분리 (따옴표 대응)
    const columns = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/^"|"$/g, '').trim());
    if (columns.length < 1) return;

    const rawKeyword = columns[0];
    const keyword = normalizeKeyword(rawKeyword);

    // [상단 테이블: 매출 집계]
    if (keyword.includes("본인부담금") && !keyword.includes("합계")) {
      metrics.patientPay = findFirstNumericValue(columns);
    } else if (keyword.includes("보험청구액")) {
      metrics.insuranceClaim = findFirstNumericValue(columns);
    } else if (keyword.includes("비과세비급여진료비")) {
      nonBenefit1 = findFirstNumericValue(columns);
    } else if (keyword.includes("과세비급여진료비")) {
      nonBenefit2 = findFirstNumericValue(columns);
    } else if (keyword.includes("자동차보험청구금액")) {
      metrics.autoInsuranceClaim = findFirstNumericValue(columns);
    } else if (keyword.includes("본인부담금합계")) {
      metrics.patientTotalBase = findFirstNumericValue(columns);
    } else if (keyword.includes("총진료비")) {
      const val = findFirstNumericValue(columns);
      metrics.totalRevenue = val;
      metrics.totalTreatmentFee = val;
    } 
    // [하단 테이블: 수납 집계]
    else if (keyword === "현금합계") {
      metrics.cashCollection = findFirstNumericValue(columns);
    } else if (keyword === "카드") {
      metrics.cardCollection = findFirstNumericValue(columns);
    } else if (keyword.includes("수납금액합계")) {
      metrics.totalCollection = findFirstNumericValue(columns);
    } else if (keyword.includes("남은미수액")) {
      metrics.accountsReceivable = findFirstNumericValue(columns);
    }
  });

  metrics.nonBenefit = nonBenefit1 + nonBenefit2;

  // 정밀 검증 로그 출력 (사용자가 콘솔에서 확인 가능)
  console.log(`\n[${month}] 한차트 데이터 정밀 분석 결과:`);
  console.log(`- 총진료비 (A): ${metrics.totalRevenue.toLocaleString()}원`);
  console.log(`- 보험 매출 합계 (B+C+D): ${(metrics.patientPay + metrics.insuranceClaim + metrics.autoInsuranceClaim).toLocaleString()}원`);
  console.log(`  * 본인부담금(B): ${metrics.patientPay.toLocaleString()}원`);
  console.log(`  * 보험청구액(C): ${metrics.insuranceClaim.toLocaleString()}원`);
  console.log(`  * 자보청구액(D): ${metrics.autoInsuranceClaim.toLocaleString()}원`);
  console.log(`- 비급여 합계 (E): ${metrics.nonBenefit.toLocaleString()}원`);
  console.log(`- 수납내역: 현금(${metrics.cashCollection.toLocaleString()}), 카드(${metrics.cardCollection.toLocaleString()}), 미수(${metrics.accountsReceivable.toLocaleString()})`);
  
  const validationSum = metrics.patientPay + metrics.insuranceClaim + metrics.nonBenefit + metrics.autoInsuranceClaim;
  const diff = metrics.totalRevenue - validationSum;
  
  if (diff === 0 && metrics.totalRevenue > 0) {
    console.log("✅ 분석 성공: 모든 항목의 합계가 총진료비와 정확히 일치합니다.");
  } else if (metrics.totalRevenue > 0) {
    console.warn(`⚠️ 분석 주의: 총진료비와 세부 항목간 ${diff.toLocaleString()}원의 차이가 있습니다.`);
  }

  return { ...metrics, month };
};
