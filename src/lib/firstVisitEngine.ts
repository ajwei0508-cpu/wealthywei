import * as XLSX from "xlsx";
import {
  SHEET_COLUMNS,
  type FirstVisitRow,
  type FirstVisitAnalytics,
  type FirstVisitAiReportData,
  type MissingDataReport,
  type ColumnMissingStat,
  type SheetColumnKey,
  type MonthlySummaryItem,
  type AgeGroupStat,
  type RouteGroupStat,
  type SymptomGroupStat,
} from "@/types/firstVisit";

export interface AiColumnMappingHint {
  detectedEmr?: string;
  columnMap?: Partial<Record<SheetColumnKey | "chartNo" | "phone" | "birthOrRrn", number[]>>;
  valueNormalizations?: {
    visitTypeMap?: Record<string, "초진" | "재초진" | "재진" | "">;
    insuranceTypeMap?: Record<string, "건보" | "자보" | "비급여" | "">;
    reservationMap?: Record<string, "유" | "무" | "">;
  };
  rowEnhancements?: Record<
    number,
    {
      visitType?: string;
      insuranceType?: string;
      treatmentDetail?: string;
      nextReservation?: string;
      visitRoute?: string;
      nonCoveredList?: string;
    }
  >;
}

export interface RawTableExtraction {
  fileName: string;
  headers: string[];
  rawHeadersRow: string[];
  superHeadersRow: string[];
  dataRows: any[][];
  fallbackDateISO: string;
  isGoogleSheetTemplate: boolean;
}

export interface ParsedPatientEvent {
  kind: "new_episode" | "revisit_only";
  chartNo: string;
  phone: string;
  row: FirstVisitRow;
}

export interface MergeUploadResult {
  mergedRows: FirstVisitRow[];
  emrDetected: string;
  newPatientsAdded: number;
  existingRowsUpdated: number;
  revisitsUpdated: number;
  pureRevisitsSkipped: number;
  unmappedColumns: SheetColumnKey[];
}

function cleanStr(val: any): string {
  if (val === null || val === undefined) return "";
  return String(val).replace(/\r\n/g, " ").replace(/\n/g, " ").trim();
}

function normHeader(val: any): string {
  if (val === null || val === undefined) return "";
  return String(val).replace(/[\s\r\n\t"''()\[\]\/·\-_:]/g, "").toLowerCase();
}

/**
 * 날짜 파싱: Excel 시리얼 넘버(UTC 정확 계산), YYYY-MM-DD, YYYYMMDD, YYMMDD, M월 D일 등
 */
export function parseAnyDateToISO(val: any, referenceYear?: number): string {
  if (val === null || val === undefined || val === "") return "";
  const refYear = referenceYear || new Date().getFullYear();

  if (typeof val === "number") {
    if (val > 35000 && val < 65000) {
      const utcMs = Math.round((val - 25569) * 86400) * 1000;
      const d = new Date(utcMs);
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, "0");
      const day = String(d.getUTCDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }
    // 숫자형 YYYYMMDD 예: 20260501
    const numStr = String(Math.trunc(val));
    if (/^(202\d|203\d)(\d{2})(\d{2})$/.test(numStr)) {
      return `${numStr.slice(0, 4)}-${numStr.slice(4, 6)}-${numStr.slice(6, 8)}`;
    }
    return "";
  }

  const s = String(val).trim();
  if (!s) return "";

  // 1. YYYY-MM-DD, YYYY.MM.DD, YYYY/MM/DD, YYYY년 M월 D일
  const mFull = s.match(/(201\d|202\d|203\d)\s*[년.\-\/]\s*(\d{1,2})\s*[월.\-\/]\s*(\d{1,2})/);
  if (mFull) {
    const mo = Number(mFull[2]);
    const da = Number(mFull[3]);
    if (mo >= 1 && mo <= 12 && da >= 1 && da <= 31) {
      return `${mFull[1]}-${String(mo).padStart(2, "0")}-${String(da).padStart(2, "0")}`;
    }
  }

  // 2. YYYYMMDD
  const m8 = s.match(/^(201\d|202\d|203\d)(\d{2})(\d{2})$/);
  if (m8) {
    return `${m8[1]}-${m8[2]}-${m8[3]}`;
  }

  // 3. YY-MM-DD or YY.MM.DD or YYMMDD
  const m6Sep = s.match(/^(\d{2})[.\-\/](\d{1,2})[.\-\/](\d{1,2})$/);
  if (m6Sep) {
    const yr = Number(m6Sep[1]) + 2000;
    const mo = Number(m6Sep[2]);
    const da = Number(m6Sep[3]);
    if (mo >= 1 && mo <= 12 && da >= 1 && da <= 31) {
      return `${yr}-${String(mo).padStart(2, "0")}-${String(da).padStart(2, "0")}`;
    }
  }

  const m6 = s.match(/^(2\d|30)(\d{2})(\d{2})$/);
  if (m6) {
    const mo = Number(m6[2]);
    const da = Number(m6[3]);
    if (mo >= 1 && mo <= 12 && da >= 1 && da <= 31) {
      return `20${m6[1]}-${m6[2]}-${m6[3]}`;
    }
  }

  // 4. "5월 1일", "5월1일", "05/01", "5-1"
  const mKorMD = s.match(/^(\d{1,2})\s*월\s*(\d{1,2})\s*일?$/);
  if (mKorMD) {
    const mo = Number(mKorMD[1]);
    const da = Number(mKorMD[2]);
    if (mo >= 1 && mo <= 12 && da >= 1 && da <= 31) {
      return `${refYear}-${String(mo).padStart(2, "0")}-${String(da).padStart(2, "0")}`;
    }
  }

  const mSlashMD = s.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
  if (mSlashMD) {
    const mo = Number(mSlashMD[1]);
    const da = Number(mSlashMD[2]);
    if (mo >= 1 && mo <= 12 && da >= 1 && da <= 31) {
      return `${refYear}-${String(mo).padStart(2, "0")}-${String(da).padStart(2, "0")}`;
    }
  }

  return "";
}

/**
 * ISO 날짜("2026-05-01") -> 2번 구글 시트 스타일("5월 1일") 변환
 */
export function formatISOToKoreanMD(iso: string): string {
  if (!iso) return "";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${Number(m[2])}월 ${Number(m[3])}일`;
}

/**
 * 파일명 또는 상단 메타 텍스트에서 날짜 추출
 */
export function extractFallbackDateISO(fileName: string, topRows: any[][]): string {
  // 1. 상단 타이틀/기간 행 검색
  for (const row of topRows) {
    const joined = (row || []).map(cleanStr).join(" ");
    const m = joined.match(/(202\d|203\d)\s*[년.\-\/]\s*(\d{1,2})\s*[월.\-\/]\s*(\d{1,2})/);
    if (m) {
      return `${m[1]}-${String(Number(m[2])).padStart(2, "0")}-${String(Number(m[3])).padStart(2, "0")}`;
    }
  }
  // 2. 파일명 검색
  const fnFull = fileName.match(/(202\d|203\d)[.\-_년\s]*(\d{1,2})[.\-_월\s]*(\d{1,2})/);
  if (fnFull) {
    const mo = Number(fnFull[2]);
    const da = Number(fnFull[3]);
    if (mo >= 1 && mo <= 12 && da >= 1 && da <= 31) {
      return `${fnFull[1]}-${String(mo).padStart(2, "0")}-${String(da).padStart(2, "0")}`;
    }
  }
  const fnKor = fileName.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (fnKor) {
    const y = new Date().getFullYear();
    return `${y}-${String(Number(fnKor[1])).padStart(2, "0")}-${String(Number(fnKor[2])).padStart(2, "0")}`;
  }
  return "";
}

/**
 * ArrayBuffer(엑셀/CSV/TXT)에서 테이블 헤더와 데이터 행 추출
 */
export function extractRawTableFromArrayBuffer(
  arrayBuffer: ArrayBuffer,
  fileName: string
): RawTableExtraction {
  const lower = fileName.toLowerCase();
  let wb: XLSX.WorkBook;

  if (lower.endsWith(".csv") || lower.endsWith(".txt") || lower.endsWith(".tsv")) {
    const bytes = new Uint8Array(arrayBuffer);
    const utf8Text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    const hasReplacementChar = utf8Text.includes("\uFFFD");
    const looksValidKorean =
      !hasReplacementChar &&
      /[가-힣]/.test(utf8Text);

    let decoded = utf8Text;
    if (!looksValidKorean) {
      try {
        const eucKrText = new TextDecoder("euc-kr").decode(bytes);
        if (/[가-힣]/.test(eucKrText)) {
          decoded = eucKrText;
        }
      } catch {
        // ignore if euc-kr unsupported
      }
    }
    wb = XLSX.read(decoded, { type: "string", raw: true });
  } else {
    wb = XLSX.read(new Uint8Array(arrayBuffer), { type: "array", raw: true });
  }

  const firstSheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: "" });

  if (!rows || rows.length === 0) {
    return {
      fileName,
      headers: [],
      rawHeadersRow: [],
      superHeadersRow: [],
      dataRows: [],
      fallbackDateISO: "",
      isGoogleSheetTemplate: false,
    };
  }

  // 헤더 행 탐색 (상위 25행 내)
  let headerRowIdx = -1;
  let bestScore = 0;

  const headerKeywords = [
    "환자이름",
    "환자명",
    "수진자명",
    "수진자",
    "성명",
    "이름",
    "고객명",
    "환자성명",
    "차트번호",
    "챠트번호",
    "등록번호",
    "병록번호",
    "초진재초진",
    "초재진",
    "초재구분",
    "보험구분",
    "환자구분",
    "수진일",
    "진료일",
    "내원일",
    "일자",
  ];

  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const r = rows[i] || [];
    const normed = r.map(normHeader).filter(Boolean);
    if (normed.length < 2) continue;

    let score = 0;
    for (const cell of normed) {
      for (const kw of headerKeywords) {
        if (cell.includes(kw)) score += 2;
      }
      if (cell === "나이" || cell === "연령" || cell === "만나이") score += 2;
      if (cell === "1회" || cell === "2회" || cell === "3회") score += 2;
      if (cell.includes("내원경로") || cell.includes("방문경로")) score += 2;
    }

    if (score > bestScore) {
      bestScore = score;
      headerRowIdx = i;
    }
  }

  if (headerRowIdx === -1) {
    headerRowIdx = 0;
  }

  const rawHeadersRow = (rows[headerRowIdx] || []).map(cleanStr);
  const superHeadersRow =
    headerRowIdx > 0 ? (rows[headerRowIdx - 1] || []).map(cleanStr) : [];

  // 상단 병합 그룹 헤더(예: 초진일 / 재내원일) 보정
  const mergedHeaders = rawHeadersRow.map((h, idx) => {
    const sup = superHeadersRow[idx] || "";
    if (sup && (sup.includes("초진일") || sup.includes("재내원일"))) {
      return `${sup}_${h}`;
    }
    return h;
  });

  const normedHeaders = rawHeadersRow.map(normHeader);
  const isGoogleSheetTemplate =
    normedHeaders.some((h) => h.includes("초진재초진")) &&
    normedHeaders.some((h) => h === "1회") &&
    normedHeaders.some((h) => h === "2회") &&
    normedHeaders.some((h) => h.includes("비급여목록"));

  const topMetaRows = rows.slice(0, headerRowIdx);
  const fallbackDateISO = extractFallbackDateISO(fileName, topMetaRows);

  const dataRows = rows.slice(headerRowIdx + 1).filter((r) => {
    if (!r || r.length === 0) return false;
    const nonEmpty = r.map(cleanStr).filter(Boolean);
    if (nonEmpty.length === 0) return false;
    // 합계/총계 요약 행 제외
    const firstTwo = `${cleanStr(r[0])} ${cleanStr(r[1])}`;
    if (/^(합계|총계|소계|평균|총\s*\d+명|합\s*계)$/.test(firstTwo.trim())) {
      return false;
    }
    return true;
  });

  return {
    fileName,
    headers: mergedHeaders,
    rawHeadersRow,
    superHeadersRow,
    dataRows,
    fallbackDateISO,
    isGoogleSheetTemplate,
  };
}

/**
 * 이름 정제 (예: "홍길동(남/45)" -> 이름 "홍길동", 보조 나이 "45")
 */
function parsePatientNameAndInlineAge(rawName: any): { name: string; inlineAge: string } {
  const s = cleanStr(rawName);
  if (!s) return { name: "", inlineAge: "" };

  // 예: "홍길동(남/64)" or "홍길동 (여, 45세)"
  const m = s.match(/^([가-힣a-zA-Z\s]+?)\s*\(\s*[남여MFmf]?\s*[\/,\s]*(\d{1,3})\s*세?\s*\)$/);
  if (m) {
    return { name: m[1].trim(), inlineAge: m[2] };
  }
  // 예: "홍길동(12345)" -> 차트번호 분리
  const mChart = s.match(/^([가-힣a-zA-Z]+)\s*\(\d{3,}\)$/);
  if (mChart) {
    return { name: mChart[1].trim(), inlineAge: "" };
  }
  return { name: s, inlineAge: "" };
}

/**
 * 나이 추출: 숫자, "64세", "남/64", 주민번호 앞자리/생년월일 지원 (없으면 공란 "")
 */
export function parseAgeValue(rawAge: any, rawBirthOrRrn?: any, referenceYear?: number): string {
  const refYear = referenceYear || new Date().getFullYear();

  if (rawAge !== null && rawAge !== undefined && String(rawAge).trim() !== "") {
    const s = String(rawAge).trim();
    if (/^\d{1,3}$/.test(s)) {
      const n = Number(s);
      if (n >= 0 && n <= 120) return String(n);
    }
    // "남/64", "여/45세", "M/31", "64세"
    const mGenderAge = s.match(/(?:[남여MFmf]\s*[\/,\-]\s*)?(\d{1,3})\s*세?/);
    if (mGenderAge && s.length <= 12) {
      const n = Number(mGenderAge[1]);
      if (n >= 0 && n <= 120) return String(n);
    }
  }

  if (rawBirthOrRrn !== null && rawBirthOrRrn !== undefined && String(rawBirthOrRrn).trim() !== "") {
    const b = String(rawBirthOrRrn).trim();
    // 주민등록번호 형식: YYMMDD-1******
    const mRrn = b.match(/^(\d{2})(\d{2})(\d{2})\s*-?\s*([1-8])/);
    if (mRrn) {
      const yy = Number(mRrn[1]);
      const g = Number(mRrn[4]);
      const century = g === 1 || g === 2 || g === 5 || g === 6 ? 1900 : 2000;
      const birthYear = century + yy;
      const age = refYear - birthYear;
      if (age >= 0 && age <= 120) return String(age);
    }
    // YYYY-MM-DD 생년월일
    const mBirth = b.match(/^(19\d{2}|20[0-2]\d)[.\-\/]?(\d{2})[.\-\/]?(\d{2})/);
    if (mBirth) {
      const age = refYear - Number(mBirth[1]);
      if (age >= 0 && age <= 120) return String(age);
    }
  }

  return "";
}

/**
 * 초진 / 재초진 / 재진 정규화 (모르면 공란 "")
 */
export function normalizeVisitType(
  raw: any,
  customMap?: Record<string, "초진" | "재초진" | "재진" | "">
): "초진" | "재초진" | "재진" | "" {
  const s = cleanStr(raw);
  if (!s) return "";
  if (customMap && s in customMap) return customMap[s];

  const compact = s.replace(/\s+/g, "");
  if (
    compact.includes("재초진") ||
    compact === "재초" ||
    compact.includes("90일초진") ||
    compact.includes("3개월초진") ||
    compact.includes("타상병초진") ||
    compact.includes("상병초진") ||
    compact.includes("종결후초진")
  ) {
    return "재초진";
  }
  if (
    compact.includes("초진") ||
    compact.includes("신환") ||
    compact.includes("신규") ||
    compact.includes("첫방문") ||
    compact.includes("첫내원")
  ) {
    return "초진";
  }
  if (
    compact.includes("재진") ||
    compact.includes("구환") ||
    compact.includes("재방문") ||
    compact === "기존"
  ) {
    return "재진";
  }
  return "";
}

/**
 * 환자구분 (건보 / 자보 / 비급여) 정규화 (없으면 공란 "")
 */
export function normalizeInsuranceType(
  raw: any,
  customMap?: Record<string, "건보" | "자보" | "비급여" | "">
): string {
  const s = cleanStr(raw);
  if (!s) return "";
  if (customMap && s in customMap) return customMap[s];

  const compact = s.replace(/\s+/g, "");
  if (compact.includes("자보") || compact.includes("자동차") || compact.includes("교통사고")) {
    return "자보";
  }
  if (
    compact.includes("비급여") ||
    compact.includes("비보험") ||
    compact === "일반" ||
    compact.includes("일반진료") ||
    compact === "자비"
  ) {
    return "비급여";
  }
  if (
    compact.includes("건보") ||
    compact.includes("건강보험") ||
    compact.includes("의보") ||
    compact.includes("의료급여") ||
    compact.includes("차상위") ||
    compact === "급여" ||
    compact === "보험"
  ) {
    return "건보";
  }
  if (compact.includes("산재")) {
    return "산재";
  }
  return s;
}

/**
 * 다음 진료 예약 안내 ("유" / "무" / "") 정규화
 */
export function normalizeReservation(
  raw: any,
  customMap?: Record<string, "유" | "무" | "">
): string {
  const s = cleanStr(raw);
  if (!s) return "";
  if (customMap && s in customMap) return customMap[s];

  const compact = s.replace(/\s+/g, "").toUpperCase();
  if (compact === "유" || compact === "O" || compact === "Y" || compact === "YES" || compact === "예약" || compact === "예약완료") {
    return "유";
  }
  if (compact === "무" || compact === "X" || compact === "N" || compact === "NO" || compact === "미예약" || compact === "없음") {
    return "무";
  }
  // 만약 다음 예약 일자(예: 2026-05-04 또는 5월 4일 10:30)가 적혀있다면 "유"로 판정
  if (/(202\d|203\d)[.\-\/]\d{1,2}[.\-\/]\d{1,2}|\d{1,2}\s*월\s*\d{1,2}\s*일|\d{1,2}:\d{2}/.test(s)) {
    return "유";
  }
  return "";
}

/**
 * EMR 종류 자동 판별
 */
export function detectEmrTypeFromHeaders(rawHeaders: string[], isTemplate: boolean): string {
  if (isTemplate) return "바른 초진 표준시트";
  const joined = rawHeaders.map(normHeader).join("|");
  if (joined.includes("수진자명") && joined.includes("수진일")) return "한차트 (HanChart)";
  if (joined.includes("진료일자") && (joined.includes("보험유형") || joined.includes("초재진"))) return "오케이차트 (OkChart)";
  if (joined.includes("등록번호") && (joined.includes("자격") || joined.includes("내원일자"))) return "한의사랑 (Hanisarang)";
  if (joined.includes("병록번호") || joined.includes("만나이")) return "동의보감 (Donguibogam)";
  return "차트 자동감지 (범용 EMR)";
}

/**
 * 추출된 원시 테이블을 ParsedPatientEvent 배열 및 미매핑 컬럼 목록으로 변환
 */
export function convertRawTableToEvents(
  extraction: RawTableExtraction,
  userFallbackDateISO?: string,
  aiHint?: AiColumnMappingHint
): {
  events: ParsedPatientEvent[];
  emrDetected: string;
  unmappedColumns: SheetColumnKey[];
} {
  const { rawHeadersRow, superHeadersRow, dataRows, isGoogleSheetTemplate } = extraction;
  const effectiveFallbackDate = userFallbackDateISO || extraction.fallbackDateISO || "";
  const refYear = effectiveFallbackDate
    ? Number(effectiveFallbackDate.slice(0, 4))
    : new Date().getFullYear();

  // 1) 2번 구글 시트 표준 템플릿(19컬럼) 직접 매핑
  if (isGoogleSheetTemplate) {
    let lastForwardFillDateISO = effectiveFallbackDate;
    let lastForwardFillLabel = effectiveFallbackDate ? formatISOToKoreanMD(effectiveFallbackDate) : "";

    const events: ParsedPatientEvent[] = [];

    dataRows.forEach((r, idx) => {
      const rawDate = r[0];
      const parsedDateISO = parseAnyDateToISO(rawDate, refYear);
      if (parsedDateISO) {
        lastForwardFillDateISO = parsedDateISO;
        lastForwardFillLabel = formatISOToKoreanMD(parsedDateISO);
      } else if (cleanStr(rawDate)) {
        lastForwardFillLabel = cleanStr(rawDate);
      }

      const { name, inlineAge } = parsePatientNameAndInlineAge(r[1]);
      if (!name) return;

      const firstISO = parseAnyDateToISO(r[7], refYear) || lastForwardFillDateISO;
      const secondISO = parseAnyDateToISO(r[8], refYear);
      const thirdISO = parseAnyDateToISO(r[9], refYear);

      const vTypeNorm = normalizeVisitType(r[3]);
      const visitTypeVal = vTypeNorm === "재진" ? "" : vTypeNorm || cleanStr(r[3]);

      const row: FirstVisitRow = {
        id: `fv_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 7)}`,
        visitDate: parsedDateISO
          ? formatISOToKoreanMD(parsedDateISO)
          : lastForwardFillLabel || cleanStr(rawDate),
        visitDateISO: parsedDateISO || lastForwardFillDateISO,
        patientName: name,
        age: parseAgeValue(r[2], undefined, refYear) || inlineAge,
        visitType: visitTypeVal,
        insuranceType: normalizeInsuranceType(r[4]),
        treatmentDetail: cleanStr(r[5]),
        nextReservation: normalizeReservation(r[6]) || cleanStr(r[6]),
        firstVisitDate: firstISO ? formatISOToKoreanMD(firstISO) : cleanStr(r[7]),
        firstVisitISO: firstISO,
        secondVisitDate: secondISO ? formatISOToKoreanMD(secondISO) : cleanStr(r[8]),
        secondVisitISO: secondISO,
        thirdVisitDate: thirdISO ? formatISOToKoreanMD(thirdISO) : cleanStr(r[9]),
        thirdVisitISO: thirdISO,
        visitRoute: cleanStr(r[10]),
        nonCoveredList: cleanStr(r[11]),
        nonCoveredCount: cleanStr(r[12]),
        immediatePaymentCount: cleanStr(r[13]),
        herbalMonthlySummary: cleanStr(r[14]),
        packageCount: cleanStr(r[15]),
        herbalFollowupPayment: cleanStr(r[16]),
        packageRenewal: cleanStr(r[17]),
        delayedPaymentWithinMonth: cleanStr(r[18]),
        sourceFile: extraction.fileName,
        updatedAt: new Date().toISOString(),
      };

      events.push({
        kind: "new_episode",
        chartNo: "",
        phone: "",
        row,
      });
    });

    // 템플릿 자체에서 전체 공란인 열 계산
    const unmappedColumns = SHEET_COLUMNS.map((c) => c.key).filter((key) =>
      events.every((ev) => !cleanStr(ev.row[key]))
    );

    return {
      events,
      emrDetected: "바른 초진 표준시트",
      unmappedColumns,
    };
  }

  // 2) 일반 차트 프로그램(EMR) 일일 환자 리스트 매핑 (규칙 엔진 + AI 시맨틱 매핑 결합)
  const normed = rawHeadersRow.map((h, i) => {
    const sup = normHeader(superHeadersRow[i]);
    const cur = normHeader(h);
    return sup ? `${sup}_${cur}` : cur;
  });

  const findCols = (exactOrIncludes: string[], exclude: string[] = []): number[] => {
    const matched: number[] = [];
    normed.forEach((h, idx) => {
      if (!h) return;
      if (exclude.some((ex) => h.includes(ex))) return;
      if (exactOrIncludes.some((kw) => h === kw || h.includes(kw))) {
        matched.push(idx);
      }
    });
    return matched;
  };

  const pickCols = (
    key: SheetColumnKey | "chartNo" | "phone" | "birthOrRrn",
    fallbackKeywords: string[],
    exclude: string[] = []
  ): number[] => {
    const hinted = aiHint?.columnMap?.[key];
    if (Array.isArray(hinted) && hinted.length > 0) {
      return hinted.filter((idx) => typeof idx === "number" && idx >= 0 && idx < rawHeadersRow.length);
    }
    return findCols(fallbackKeywords, exclude);
  };

  const chartCols = pickCols("chartNo", ["차트번호", "챠트번호", "등록번호", "병록번호", "환자번호", "고객번호", "차트"]);
  const phoneCols = pickCols("phone", ["휴대폰", "연락처", "전화번호", "핸드폰"]);
  const birthCols = pickCols("birthOrRrn", ["주민번호", "주민등록번호", "생년월일"]);

  const dateCols = pickCols(
    "visitDate",
    ["진료일자", "수진일자", "수진일", "내원일자", "내원일", "진료일", "방문일자", "방문일", "접수일자", "접수일", "일자", "날짜"],
    ["예약", "생년", "초진일", "최초", "재내원"]
  );
  const nameCols = pickCols(
    "patientName",
    ["환자이름", "환자명", "수진자명", "수진자", "환자성명", "고객명", "성명", "이름"],
    ["원장", "의사", "담당", "소개자", "보호자"]
  );
  const ageCols = pickCols("age", ["만나이", "나이", "연령", "성별나이", "성별연령"]);
  const visitTypeCols = pickCols(
    "visitType",
    ["초진재초진", "초재진", "초재구분", "초진구분", "신구환", "내원구분", "방문구분", "진료구분", "초재"],
    ["보험", "급여"]
  );
  const insCols = pickCols(
    "insuranceType",
    ["환자구분", "보험구분", "보험유형", "보험종별", "급여구분", "자격구분", "진료유형", "유형", "종별", "자격"]
  );
  const detailCols = pickCols(
    "treatmentDetail",
    [
      "환자진료내역",
      "진료내역",
      "주소증",
      "주호소",
      "주상병명",
      "주상병",
      "상병명",
      "진단명",
      "증상",
      "내원목적",
      "치료내역",
      "치료내용",
      "처방내역",
      "시술내역",
      "진료내용",
      "진료메모",
      "약침",
      "추나",
      "첩약",
      "첩건",
    ]
  );
  const resvCols = pickCols("nextReservation", [
    "다음진료예약안내",
    "다음예약",
    "차기예약",
    "예약유무",
    "예약안내",
    "예약일자",
    "예약일",
    "예약여부",
  ]);
  const firstVisitCols = pickCols("firstVisitDate", ["초진일_1회", "1회", "초진일", "최초내원일"]);
  const secondVisitCols = pickCols("secondVisitDate", ["재내원일_2회", "2회"]);
  const thirdVisitCols = pickCols("thirdVisitDate", ["재내원일_3회", "3회"]);
  const routeCols = pickCols("visitRoute", ["내원경로", "방문경로", "유입경로", "인지경로", "내원동기", "마케팅경로", "소개자"]);
  const nonCovListCols = pickCols("nonCoveredList", ["비급여목록", "비급여품목", "비급여내역", "비보험내역"]);
  const nonCovCntCols = pickCols("nonCoveredCount", ["비급여목록별판매건수", "비급여판매건수", "비급여건수"]);
  const immPayCols = pickCols("immediatePaymentCount", ["상담후즉시결제", "즉시결제건수", "당일결제"]);
  const herbalSumCols = pickCols("herbalMonthlySummary", ["한약월총건수", "한약건수", "처방목적"]);
  const pkgCntCols = pickCols("packageCount", ["패키지건수"]);
  const herbalFollowCols = pickCols("herbalFollowupPayment", ["1제복용후추가결제", "연복유무", "연복"]);
  const pkgRenewCols = pickCols("packageRenewal", ["패키지복용후종료후연장", "패키지연장"]);
  const delayPayCols = pickCols("delayedPaymentWithinMonth", ["상담후1달이내결제", "1달이내결제"]);

  const colRegistry: Record<SheetColumnKey, number[]> = {
    visitDate: dateCols,
    patientName: nameCols,
    age: [...ageCols, ...birthCols],
    visitType: visitTypeCols,
    insuranceType: insCols,
    treatmentDetail: detailCols,
    nextReservation: resvCols,
    firstVisitDate: firstVisitCols.length > 0 ? firstVisitCols : dateCols,
    secondVisitDate: secondVisitCols,
    thirdVisitDate: thirdVisitCols,
    visitRoute: routeCols,
    nonCoveredList: nonCovListCols,
    nonCoveredCount: nonCovCntCols,
    immediatePaymentCount: immPayCols,
    herbalMonthlySummary: herbalSumCols,
    packageCount: pkgCntCols,
    herbalFollowupPayment: herbalFollowCols,
    packageRenewal: pkgRenewCols,
    delayedPaymentWithinMonth: delayPayCols,
  };

  // 차트에 아예 존재하지 않는 컬럼 목록 (2회/3회는 재내원 누적 매칭 항목이므로 별도 안내)
  const unmappedColumns: SheetColumnKey[] = (Object.keys(colRegistry) as SheetColumnKey[]).filter(
    (k) => {
      if (k === "visitDate" && effectiveFallbackDate) return false;
      if (k === "firstVisitDate" && (dateCols.length > 0 || effectiveFallbackDate)) return false;
      return colRegistry[k].length === 0;
    }
  );

  // 일자 전진 채움(Forward-fill)은 날짜 컬럼이 존재하고 일부 행만 비어있는 시트형 데이터일 때만 적용
  let runningDateISO = effectiveFallbackDate;
  const events: ParsedPatientEvent[] = [];

  dataRows.forEach((r, rowIdx) => {
    const rawNameCell = nameCols.length > 0 ? r[nameCols[0]] : "";
    const { name, inlineAge } = parsePatientNameAndInlineAge(rawNameCell);
    if (!name) return;

    const chartNo = chartCols.length > 0 ? cleanStr(r[chartCols[0]]) : "";
    const phone = phoneCols.length > 0 ? cleanStr(r[phoneCols[0]]) : "";

    let rowDateISO = "";
    if (dateCols.length > 0) {
      rowDateISO = parseAnyDateToISO(r[dateCols[0]], refYear);
      if (rowDateISO) {
        runningDateISO = rowDateISO;
      } else if (!cleanStr(r[dateCols[0]]) && runningDateISO) {
        rowDateISO = runningDateISO;
      }
    } else if (effectiveFallbackDate) {
      rowDateISO = effectiveFallbackDate;
    }

    const aiRow = aiHint?.rowEnhancements?.[rowIdx];

    // 초진/재초진/재진 구분
    const rawVisitType = visitTypeCols.length > 0 ? r[visitTypeCols[0]] : "";
    const normalizedVType =
      (aiRow?.visitType ? normalizeVisitType(aiRow.visitType) : "") ||
      normalizeVisitType(rawVisitType, aiHint?.valueNormalizations?.visitTypeMap);

    // 진료 내역 조합 (여러 컬럼일 경우 의미 있는 값만 결합: 주소증 + 약침/추나/첩약 여부)
    let treatmentDetail = "";
    if (aiRow?.treatmentDetail !== undefined && cleanStr(aiRow.treatmentDetail)) {
      treatmentDetail = cleanStr(aiRow.treatmentDetail);
    } else if (detailCols.length > 0) {
      const symptomParts: string[] = [];
      const modalityTags: string[] = [];

      for (const cIdx of detailCols) {
        const hName = cleanStr(rawHeadersRow[cIdx]);
        const val = cleanStr(r[cIdx]);
        if (!val || val === "0" || val === "-" || val.toUpperCase() === "N" || val === "무" || val === "X") {
          continue;
        }
        // 컬럼 자체가 약침/추나/첩약/한약 체크/금액 컬럼인 경우
        if (/^(약침|봉침|추나|첩약|첩건|한약|비급여)$/.test(hName.replace(/\s+/g, ""))) {
          if (val === "O" || val === "Y" || val === "유" || /^\d[\d,]*$/.test(val)) {
            modalityTags.push(hName.replace(/\s+/g, ""));
          } else {
            modalityTags.push(`${hName.replace(/\s+/g, "")}:${val}`);
          }
        } else {
          symptomParts.push(val);
        }
      }

      const baseText = Array.from(new Set(symptomParts)).join(", ");
      const modText = Array.from(new Set(modalityTags)).join(" / ");
      if (baseText && modText) {
        treatmentDetail = `${baseText} (${modText})`;
      } else {
        treatmentDetail = baseText || modText;
      }
    }

    const ageVal =
      parseAgeValue(
        ageCols.length > 0 ? r[ageCols[0]] : "",
        birthCols.length > 0 ? r[birthCols[0]] : "",
        refYear
      ) || inlineAge;

    const insuranceVal =
      (aiRow?.insuranceType ? normalizeInsuranceType(aiRow.insuranceType) : "") ||
      (insCols.length > 0
        ? normalizeInsuranceType(r[insCols[0]], aiHint?.valueNormalizations?.insuranceTypeMap)
        : "");

    const resvVal =
      (aiRow?.nextReservation ? normalizeReservation(aiRow.nextReservation) : "") ||
      (resvCols.length > 0
        ? normalizeReservation(r[resvCols[0]], aiHint?.valueNormalizations?.reservationMap)
        : "");

    const firstISO =
      (firstVisitCols.length > 0 ? parseAnyDateToISO(r[firstVisitCols[0]], refYear) : "") ||
      rowDateISO;
    const secondISO =
      secondVisitCols.length > 0 ? parseAnyDateToISO(r[secondVisitCols[0]], refYear) : "";
    const thirdISO =
      thirdVisitCols.length > 0 ? parseAnyDateToISO(r[thirdVisitCols[0]], refYear) : "";

    const routeVal =
      cleanStr(aiRow?.visitRoute) || (routeCols.length > 0 ? cleanStr(r[routeCols[0]]) : "");
    const nonCovListVal =
      cleanStr(aiRow?.nonCoveredList) ||
      (nonCovListCols.length > 0 ? cleanStr(r[nonCovListCols[0]]) : "");

    const rowObj: FirstVisitRow = {
      id: `fv_${Date.now()}_${rowIdx}_${Math.random().toString(36).slice(2, 7)}`,
      chartNo: chartNo || undefined,
      phone: phone || undefined,
      visitDate: rowDateISO ? formatISOToKoreanMD(rowDateISO) : (dateCols.length > 0 ? cleanStr(r[dateCols[0]]) : ""),
      visitDateISO: rowDateISO,
      patientName: name,
      age: ageVal,
      visitType: normalizedVType === "재진" ? "" : normalizedVType,
      insuranceType: insuranceVal,
      treatmentDetail,
      nextReservation: resvVal,
      firstVisitDate: firstISO ? formatISOToKoreanMD(firstISO) : "",
      firstVisitISO: firstISO,
      secondVisitDate: secondISO ? formatISOToKoreanMD(secondISO) : "",
      secondVisitISO: secondISO,
      thirdVisitDate: thirdISO ? formatISOToKoreanMD(thirdISO) : "",
      thirdVisitISO: thirdISO,
      visitRoute: routeVal,
      nonCoveredList: nonCovListVal,
      nonCoveredCount: nonCovCntCols.length > 0 ? cleanStr(r[nonCovCntCols[0]]) : "",
      immediatePaymentCount: immPayCols.length > 0 ? cleanStr(r[immPayCols[0]]) : "",
      herbalMonthlySummary: herbalSumCols.length > 0 ? cleanStr(r[herbalSumCols[0]]) : "",
      packageCount: pkgCntCols.length > 0 ? cleanStr(r[pkgCntCols[0]]) : "",
      herbalFollowupPayment: herbalFollowCols.length > 0 ? cleanStr(r[herbalFollowCols[0]]) : "",
      packageRenewal: pkgRenewCols.length > 0 ? cleanStr(r[pkgRenewCols[0]]) : "",
      delayedPaymentWithinMonth: delayPayCols.length > 0 ? cleanStr(r[delayPayCols[0]]) : "",
      sourceFile: extraction.fileName,
      updatedAt: new Date().toISOString(),
    };

    events.push({
      kind: normalizedVType === "재진" ? "revisit_only" : "new_episode",
      chartNo,
      phone,
      row: rowObj,
    });
  });

  const emrDetected =
    aiHint?.detectedEmr || detectEmrTypeFromHeaders(rawHeadersRow, isGoogleSheetTemplate);

  return {
    events,
    emrDetected,
    unmappedColumns,
  };
}

/**
 * 동일 환자 판별 키 매칭 (차트번호 우선 -> 이름+전화번호 -> 이름+나이 -> 이름 단독)
 */
function isSamePatient(existing: FirstVisitRow, incoming: FirstVisitRow): boolean {
  if (existing.chartNo && incoming.chartNo) {
    return existing.chartNo === incoming.chartNo;
  }
  const nameA = existing.patientName.replace(/\s+/g, "");
  const nameB = incoming.patientName.replace(/\s+/g, "");
  if (!nameA || nameA !== nameB) return false;

  if (existing.phone && incoming.phone) {
    return existing.phone.replace(/\D/g, "") === incoming.phone.replace(/\D/g, "");
  }
  if (existing.age && incoming.age) {
    return existing.age === incoming.age;
  }
  return true;
}

function daysBetweenISO(isoA: string, isoB: string): number {
  if (!isoA || !isoB) return 9999;
  const tA = new Date(`${isoA}T00:00:00Z`).getTime();
  const tB = new Date(`${isoB}T00:00:00Z`).getTime();
  if (isNaN(tA) || isNaN(tB)) return 9999;
  return Math.round((tB - tA) / (86400 * 1000));
}

/**
 * 새로 파싱된 일일 환자 이벤트를 기존 시트 행 배열에 시계열로 지능형 병합
 * - 초진/재초진 -> 신규 행 생성 (동일일 중복 업로드 시 공란 필드만 보강 업데이트)
 * - 재진 -> 기존 초진/재초진 환자의 2회·3회 재내원일 자동 기입!
 * - 초/재 구분이 아예 없는 파일의 경우 -> 최근 90일 내 초진 기록이 있는 환자면 2회·3회 재내원으로 자동 연결, 없으면 신규 행 추가
 */
export function mergeParsedEventsIntoRows(
  existingRows: FirstVisitRow[],
  events: ParsedPatientEvent[],
  emrDetected: string,
  unmappedColumns: SheetColumnKey[]
): MergeUploadResult {
  const rows: FirstVisitRow[] = existingRows.map((r) => ({ ...r }));

  // 날짜순 정렬하여 1회 -> 2회 -> 3회 체이닝이 순서대로 일어나도록 보장
  const sortedEvents = [...events].sort((a, b) => {
    const dA = a.row.visitDateISO || "9999-99-99";
    const dB = b.row.visitDateISO || "9999-99-99";
    if (dA !== dB) return dA.localeCompare(dB);
    // 동일 날짜면 초진/재초진을 먼저 처리
    if (a.kind !== b.kind) return a.kind === "new_episode" ? -1 : 1;
    return 0;
  });

  let newPatientsAdded = 0;
  let existingRowsUpdated = 0;
  let revisitsUpdated = 0;
  let pureRevisitsSkipped = 0;

  for (const ev of sortedEvents) {
    const incoming = ev.row;
    const visitISO = incoming.visitDateISO || incoming.firstVisitISO;

    // 1. 동일 환자 & 동일 초진일 중복 행 여부 확인
    const exactSameIdx = rows.findIndex(
      (r) =>
        isSamePatient(r, incoming) &&
        ((visitISO && (r.visitDateISO === visitISO || r.firstVisitISO === visitISO)) ||
          (!visitISO && r.visitDate === incoming.visitDate))
    );

    if (exactSameIdx !== -1 && ev.kind === "new_episode") {
      // 기존 행의 비어있는(공란) 컬럼만 안전하게 보완 (수동 입력 데이터 보존)
      const target = rows[exactSameIdx];
      let touched = false;
      for (const col of SHEET_COLUMNS) {
        const k = col.key;
        if (!cleanStr(target[k]) && cleanStr(incoming[k])) {
          target[k] = incoming[k];
          touched = true;
        }
      }
      if (!target.secondVisitISO && incoming.secondVisitISO) {
        target.secondVisitISO = incoming.secondVisitISO;
        target.secondVisitDate = incoming.secondVisitDate;
        touched = true;
      }
      if (!target.thirdVisitISO && incoming.thirdVisitISO) {
        target.thirdVisitISO = incoming.thirdVisitISO;
        target.thirdVisitDate = incoming.thirdVisitDate;
        touched = true;
      }
      if (!target.chartNo && incoming.chartNo) target.chartNo = incoming.chartNo;
      if (!target.phone && incoming.phone) target.phone = incoming.phone;
      if (touched) {
        target.updatedAt = new Date().toISOString();
        existingRowsUpdated++;
      }
      continue;
    }

    // 2. 기존 초진/재초진 에피소드 중 재내원(2회/3회) 연결 대상 탐색
    const findPriorEpisode = (): FirstVisitRow | undefined => {
      if (!visitISO) return undefined;
      const candidates = rows.filter((r) => {
        if (!isSamePatient(r, incoming)) return false;
        const baseISO = r.firstVisitISO || r.visitDateISO;
        if (!baseISO) return false;
        const diffDays = daysBetweenISO(baseISO, visitISO);
        return diffDays > 0 && diffDays <= 120;
      });
      if (candidates.length === 0) return undefined;
      // 가장 최근 초진/재초진 에피소드에 매칭
      candidates.sort((a, b) =>
        (b.firstVisitISO || b.visitDateISO).localeCompare(a.firstVisitISO || a.visitDateISO)
      );
      return candidates[0];
    };

    const applyRevisitDate = (episode: FirstVisitRow, dateISO: string): boolean => {
      if (!dateISO) return false;
      const baseISO = episode.firstVisitISO || episode.visitDateISO;
      if (dateISO === baseISO || dateISO === episode.secondVisitISO || dateISO === episode.thirdVisitISO) {
        return false;
      }
      const formatted = formatISOToKoreanMD(dateISO);
      if (!episode.secondVisitDate) {
        episode.secondVisitISO = dateISO;
        episode.secondVisitDate = formatted;
        episode.updatedAt = new Date().toISOString();
        return true;
      }
      if (episode.secondVisitISO && dateISO < episode.secondVisitISO) {
        // 더 이른 날짜가 뒤늦게 업로드된 경우 2회와 3회 정렬
        if (!episode.thirdVisitDate) {
          episode.thirdVisitISO = episode.secondVisitISO;
          episode.thirdVisitDate = episode.secondVisitDate;
        }
        episode.secondVisitISO = dateISO;
        episode.secondVisitDate = formatted;
        episode.updatedAt = new Date().toISOString();
        return true;
      }
      if (!episode.thirdVisitDate && (!episode.secondVisitISO || dateISO > episode.secondVisitISO)) {
        episode.thirdVisitISO = dateISO;
        episode.thirdVisitDate = formatted;
        episode.updatedAt = new Date().toISOString();
        return true;
      }
      return false;
    };

    if (ev.kind === "revisit_only") {
      const prior = findPriorEpisode();
      if (prior && visitISO) {
        if (applyRevisitDate(prior, visitISO)) {
          revisitsUpdated++;
        }
      } else {
        pureRevisitsSkipped++;
      }
      continue;
    }

    // 초진/재초진 컬럼이 공란("")인 일일 명부에서 기존 최근 초진 환자가 다시 등장한 경우 -> 재내원(2·3회)으로 자동 연결!
    if (!incoming.visitType && visitISO) {
      const prior = findPriorEpisode();
      if (prior) {
        if (applyRevisitDate(prior, visitISO)) {
          revisitsUpdated++;
        }
        continue;
      }
    }

    // 3. 신규 초진/재초진 행으로 추가
    rows.push(incoming);
    newPatientsAdded++;
  }

  // 전체 시트를 일자 오름차순으로 깔끔하게 정렬
  rows.sort((a, b) => {
    const dA = a.visitDateISO || a.firstVisitISO || "9999-99-99";
    const dB = b.visitDateISO || b.firstVisitISO || "9999-99-99";
    return dA.localeCompare(dB);
  });

  return {
    mergedRows: rows,
    emrDetected,
    newPatientsAdded,
    existingRowsUpdated,
    revisitsUpdated,
    pureRevisitsSkipped,
    unmappedColumns,
  };
}

/**
 * 4번 요구사항: 2번 시트 구성에서 없는 내용은 공란 유지 + 원장님께 상세 안내 리포트 생성
 */
export function computeMissingDataReport(rows: FirstVisitRow[]): MissingDataReport {
  const totalRows = rows.length;
  if (totalRows === 0) {
    return {
      totalRows: 0,
      completelyBlankColumns: [],
      partialBlankColumns: [],
      directorHeadline: "일일 환자 리스트를 업로드하시면 자동 매핑 결과 및 공란 항목 안내가 표시됩니다.",
      directorMessages: [],
    };
  }

  const allStats: ColumnMissingStat[] = SHEET_COLUMNS.map((col) => {
    const missingCount = rows.filter((r) => !cleanStr(r[col.key])).length;
    const missingPct = Number(((missingCount / totalRows) * 100).toFixed(1));
    return {
      key: col.key,
      label: col.label,
      shortLabel: col.shortLabel,
      missingCount,
      totalCount: totalRows,
      missingPct,
      isCompletelyBlank: missingCount === totalRows,
      guide: col.directorGuideWhenMissing,
      category: col.category,
    };
  });

  // 2회·3회 재내원일은 미방문 시 공란이 자연스러우므로 전체 공란일 때만 참고 안내로 분리
  const completelyBlankColumns = allStats.filter(
    (s) => s.isCompletelyBlank && s.key !== "secondVisitDate" && s.key !== "thirdVisitDate"
  );
  const partialBlankColumns = allStats.filter(
    (s) =>
      !s.isCompletelyBlank &&
      s.missingCount > 0 &&
      s.key !== "secondVisitDate" &&
      s.key !== "thirdVisitDate"
  );

  const directorMessages: string[] = [];

  const coreAndRouteCompletelyBlank = completelyBlankColumns.filter(
    (c) => c.category === "core" || c.category === "marketing" || c.key === "nextReservation"
  );
  const nonCoveredCompletelyBlank = completelyBlankColumns.filter(
    (c) => c.category === "non_covered"
  );

  if (coreAndRouteCompletelyBlank.length > 0) {
    directorMessages.push(
      `업로드된 차트 리스트에 [${coreAndRouteCompletelyBlank
        .map((c) => c.shortLabel)
        .join(", ")}] 정보가 포함되지 않아 임의 기입 없이 공란으로 비워두었습니다. 차트 출력 항목을 추가하시거나 시트 셀을 클릭해 보완해 주세요.`
    );
  }

  if (nonCoveredCompletelyBlank.length > 0) {
    directorMessages.push(
      `비급여·상담 전환 추적 항목(${nonCoveredCompletelyBlank
        .map((c) => c.shortLabel)
        .join(", ")})은 일반 EMR 일일 명부에 없는 원내 경영 지표이므로 공란 처리되었습니다. 원장님/실장님께서 해당 환자 행에 직접 기입하시면 개인 계정에 안전하게 저장됩니다.`
    );
  }

  const keyPartials = partialBlankColumns.filter((c) =>
    ["age", "visitType", "insuranceType", "treatmentDetail", "nextReservation", "visitRoute"].includes(
      c.key
    )
  );
  if (keyPartials.length > 0) {
    const detailText = keyPartials
      .map((c) => `${c.shortLabel} ${c.missingCount}명(${c.missingPct}%)`)
      .join(" · ");
    directorMessages.push(
      `일부 환자에서 누락(공란)된 항목이 확인되었습니다: ${detailText}. 우측 [공란 환자만 보기] 필터로 빠르게 점검하실 수 있습니다.`
    );
  }

  const directorHeadline =
    completelyBlankColumns.length > 0 || keyPartials.length > 0
      ? `원장님 안내: 2번 표준 시트 19개 항목 중 차트에 없는 ${completelyBlankColumns.length}개 열은 공란 처리되었으며, 부분 미기재 ${keyPartials.length}개 항목이 감지되었습니다.`
      : "2번 표준 시트의 모든 필수 항목이 빠짐없이 기입되어 있습니다.";

  return {
    totalRows,
    completelyBlankColumns,
    partialBlankColumns,
    directorHeadline,
    directorMessages,
  };
}

/**
 * 3번 구글 문서(Doc)와 동일한 증상/진료 부위 6대 분류기
 */
export function classifySymptomCategories(detail: string): string[] {
  const s = cleanStr(detail);
  if (!s) return [];

  const matched: string[] = [];
  const cleanedUpper = s.replace(/발등/g, "족배").replace(/발목|손목/g, "관절");

  if (/어깨|어꺠|오십견|회전근개|목|경추|뒷목|승모근|등|날개뼈|견갑|담|쇄골|갈비|늑간/.test(cleanedUpper)) {
    matched.push("어깨/목/등/담");
  }

  if (/허리|요통|요추|디스크|협착|골반|엉치|고관절|좌골|옆구리|천장관절/.test(s)) {
    matched.push("허리/요통");
  }
  if (/무릎|슬관절|다리|하체|정강이|종아리|허벅지|발목|발바닥|족저|발가락|발등|아킬레스|쥐남|(?<![재출다모])발(?!생|열)/.test(s)) {
    matched.push("무릎/하체/발");
  }
  if (/팔|팔꿈치|엘보|아래팔|윗팔|전완|상완|손|손목|손가락|손저림|손떨림|터널/.test(s)) {
    matched.push("팔/손/상체");
  }
  if (/비염|콧물|코막힘|축농증|기침|마른기침|가래|천식|감기|인후|호흡/.test(s)) {
    matched.push("비염/호흡기");
  }
  if (/다이어트|비만|보약|녹용|공진단|경옥고|청심원|한약상담|소화|체함|식도염|위염|속쓰림|속안좋음|설사|변비|복통|불면|불안|우울|화병|놀람|무기력|기력|피로|기운|어지럼|소변|절박뇨|전립선|생리|자궁|가려움|열감|노란끼/.test(s)) {
    matched.push("한약/내과/다이어트");
  }

  if (matched.length === 0) {
    // 두통, 구안와사, 안면, 이명 등 기타 내과/신경계 증상
    matched.push("한약/내과/다이어트");
  }

  return Array.from(new Set(matched));
}

export function classifyAgeGroup(ageStr: string): string {
  const clean = cleanStr(ageStr);
  if (!clean) return "";
  const n = Number(clean.replace(/[^\d]/g, ""));
  if (isNaN(n) || n < 0 || n > 125) return "";
  if (n < 20) return "10대 이하";
  if (n < 30) return "20대";
  if (n < 40) return "30대";
  if (n < 50) return "40대";
  if (n < 60) return "50대";
  if (n < 70) return "60대";
  if (n < 80) return "70대";
  return "80대 이상";
}

export function classifyRouteCategory(routeStr: string): string {
  const s = cleanStr(routeStr);
  if (!s) return "";
  if (/소개|추천|지인|가족|입소문/.test(s)) return "소개";
  if (/인터넷|네이버|검색|블로그|플레이스|인스타|유튜브|당근|온라인|홈페이지|카카오/.test(s)) return "인터넷/검색";
  if (/지나가다|간판|현수막|전단지|버스|외관/.test(s)) return "간판/지나가다";
  if (/오래전|예전|기존|재방문/.test(s)) return "오래전내원";
  if (/집근처|근처|동네|직장근처|인근/.test(s)) return "집근처";
  return s;
}

/**
 * 3번 구글 문서(Doc) 차트 3종 및 요약 테이블용 정밀 통계 산출
 */
export function computeFirstVisitAnalytics(rows: FirstVisitRow[]): FirstVisitAnalytics {
  const totalPatients = rows.length;
  const ageLabels = ["10대 이하", "20대", "30대", "40대", "50대", "60대", "70대", "80대 이상"];
  const symptomLabels = [
    "무릎/하체/발",
    "비염/호흡기",
    "어깨/목/등/담",
    "팔/손/상체",
    "한약/내과/다이어트",
    "허리/요통",
  ];

  if (totalPatients === 0) {
    return {
      totalPatients: 0,
      firstVisitCount: 0,
      reFirstVisitCount: 0,
      untypedVisitCount: 0,
      periodStart: "",
      periodEnd: "",
      periodLabel: "데이터 없음",
      overallSecondVisitCount: 0,
      overallThirdVisitCount: 0,
      overallSecondVisitRate: 0,
      overallThirdVisitRate: 0,
      overallReservationYesRate: 0,
      monthlySummary: [],
      dailySummary: [],
      ageDistribution: ageLabels.map((ageGroup) => ({
        ageGroup,
        total: 0,
        sharePct: 0,
        secondVisitCount: 0,
        thirdVisitCount: 0,
        secondVisitRate: 0,
        thirdVisitRate: 0,
      })),
      unknownAgeCount: 0,
      senior60PlusCount: 0,
      senior60PlusPct: 0,
      senior60PlusSecondRate: 0,
      senior60PlusThirdRate: 0,
      routeDistribution: [],
      recordedRouteCount: 0,
      missingRouteCount: 0,
      missingRoutePct: 0,
      symptomDistribution: symptomLabels.map((category) => ({
        category,
        count: 0,
        sharePct: 0,
      })),
      missingSymptomCount: 0,
      insuranceBreakdown: [],
      nonCoveredRecordedRows: 0,
    };
  }

  let firstVisitCount = 0;
  let reFirstVisitCount = 0;
  let untypedVisitCount = 0;
  let overallSecondVisitCount = 0;
  let overallThirdVisitCount = 0;
  let resvYesTotal = 0;
  let resvRecordedTotal = 0;

  // 일자 전진 채움 보정 (수동 편집 등으로 일부 일자가 비어있는 경우 대비)
  let runningISO = "";
  const effectiveISOs: string[] = rows.map((r) => {
    const iso = r.visitDateISO || r.firstVisitISO || parseAnyDateToISO(r.visitDate) || parseAnyDateToISO(r.firstVisitDate);
    if (iso) runningISO = iso;
    return iso || runningISO;
  });

  const validISOs = effectiveISOs.filter(Boolean).sort();
  const periodStart = validISOs[0] || "";
  const periodEnd = validISOs[validISOs.length - 1] || "";

  let periodLabel = "전체 기간";
  if (periodStart && periodEnd) {
    const [y1, m1] = periodStart.split("-");
    const [y2, m2] = periodEnd.split("-");
    if (y1 === y2 && m1 === m2) {
      periodLabel = `${y1}년 ${Number(m1)}월 (${formatISOToKoreanMD(periodStart)} ~ ${formatISOToKoreanMD(periodEnd)})`;
    } else if (y1 === y2) {
      periodLabel = `${y1}년 ${Number(m1)}월 ~ ${Number(m2)}월`;
    } else {
      periodLabel = `${y1}년 ${Number(m1)}월 ~ ${y2}년 ${Number(m2)}월`;
    }
  }

  const monthMap = new Map<string, MonthlySummaryItem>();
  const dayMap = new Map<string, { total: number; second: number; third: number }>();
  const ageMap = new Map<string, { total: number; second: number; third: number }>();
  ageLabels.forEach((a) => ageMap.set(a, { total: 0, second: 0, third: 0 }));

  let unknownAgeCount = 0;
  const routeMap = new Map<string, { count: number; second: number; third: number }>();
  let missingRouteCount = 0;

  const symptomMap = new Map<string, number>();
  symptomLabels.forEach((s) => symptomMap.set(s, 0));
  let missingSymptomCount = 0;

  const insMap = new Map<string, number>();
  let nonCoveredRecordedRows = 0;

  rows.forEach((r, idx) => {
    const has2nd = Boolean(cleanStr(r.secondVisitDate));
    const has3rd = Boolean(cleanStr(r.thirdVisitDate));
    if (has2nd) overallSecondVisitCount++;
    if (has3rd) overallThirdVisitCount++;

    if (r.visitType === "초진") firstVisitCount++;
    else if (r.visitType === "재초진") reFirstVisitCount++;
    else untypedVisitCount++;

    const resv = cleanStr(r.nextReservation);
    if (resv === "유" || resv === "무") {
      resvRecordedTotal++;
      if (resv === "유") resvYesTotal++;
    }

    const iso = effectiveISOs[idx];
    const monthKey = iso ? iso.slice(0, 7) : "일자미상";
    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, {
        month: monthKey,
        totalPatients: 0,
        firstVisitOnly: 0,
        reFirstVisitOnly: 0,
        secondVisitCount: 0,
        thirdVisitCount: 0,
        secondVisitRate: 0,
        thirdVisitRate: 0,
        reservationYesCount: 0,
        reservationRecordedCount: 0,
        reservationYesRate: 0,
      });
    }
    const mItem = monthMap.get(monthKey)!;
    mItem.totalPatients++;
    if (r.visitType === "초진") mItem.firstVisitOnly++;
    if (r.visitType === "재초진") mItem.reFirstVisitOnly++;
    if (has2nd) mItem.secondVisitCount++;
    if (has3rd) mItem.thirdVisitCount++;
    if (resv === "유" || resv === "무") {
      mItem.reservationRecordedCount++;
      if (resv === "유") mItem.reservationYesCount++;
    }

    if (iso) {
      if (!dayMap.has(iso)) dayMap.set(iso, { total: 0, second: 0, third: 0 });
      const dItem = dayMap.get(iso)!;
      dItem.total++;
      if (has2nd) dItem.second++;
      if (has3rd) dItem.third++;
    }

    // 연령대
    const ag = classifyAgeGroup(r.age);
    if (ag && ageMap.has(ag)) {
      const aStat = ageMap.get(ag)!;
      aStat.total++;
      if (has2nd) aStat.second++;
      if (has3rd) aStat.third++;
    } else {
      unknownAgeCount++;
    }

    // 내원경로
    const rt = classifyRouteCategory(r.visitRoute);
    if (rt) {
      if (!routeMap.has(rt)) routeMap.set(rt, { count: 0, second: 0, third: 0 });
      const rStat = routeMap.get(rt)!;
      rStat.count++;
      if (has2nd) rStat.second++;
      if (has3rd) rStat.third++;
    } else {
      missingRouteCount++;
    }

    // 주요 증상 및 진료 부위 (복합 부위 중복 집계 지원)
    const syms = classifySymptomCategories(r.treatmentDetail);
    if (syms.length > 0) {
      syms.forEach((sym) => {
        symptomMap.set(sym, (symptomMap.get(sym) || 0) + 1);
      });
    } else {
      missingSymptomCount++;
    }

    // 환자구분
    const insLabel = cleanStr(r.insuranceType) || "미기재";
    insMap.set(insLabel, (insMap.get(insLabel) || 0) + 1);

    // 비급여/한약/패키지 입력 여부
    if (
      cleanStr(r.nonCoveredList) ||
      cleanStr(r.nonCoveredCount) ||
      cleanStr(r.immediatePaymentCount) ||
      cleanStr(r.herbalMonthlySummary) ||
      cleanStr(r.packageCount) ||
      cleanStr(r.delayedPaymentWithinMonth)
    ) {
      nonCoveredRecordedRows++;
    }
  });

  const pct = (num: number, den: number) => (den > 0 ? Number(((num / den) * 100).toFixed(1)) : 0);

  const monthlySummary: MonthlySummaryItem[] = Array.from(monthMap.values())
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((m) => ({
      ...m,
      secondVisitRate: pct(m.secondVisitCount, m.totalPatients),
      thirdVisitRate: pct(m.thirdVisitCount, m.totalPatients),
      reservationYesRate: pct(m.reservationYesCount, m.reservationRecordedCount || m.totalPatients),
    }));

  const dailySummary = Array.from(dayMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, d]) => ({
      date,
      label: formatISOToKoreanMD(date),
      totalPatients: d.total,
      secondVisitRate: pct(d.second, d.total),
      thirdVisitRate: pct(d.third, d.total),
    }));

  const knownAgeTotal = totalPatients - unknownAgeCount;
  const ageDistribution: AgeGroupStat[] = ageLabels.map((ageGroup) => {
    const st = ageMap.get(ageGroup)!;
    return {
      ageGroup,
      total: st.total,
      sharePct: pct(st.total, knownAgeTotal || totalPatients),
      secondVisitCount: st.second,
      thirdVisitCount: st.third,
      secondVisitRate: pct(st.second, st.total),
      thirdVisitRate: pct(st.third, st.total),
    };
  });

  const seniors = ["60대", "70대", "80대 이상"].map((k) => ageMap.get(k)!);
  const senior60PlusCount = seniors.reduce((acc, cur) => acc + cur.total, 0);
  const senior2nd = seniors.reduce((acc, cur) => acc + cur.second, 0);
  const senior3rd = seniors.reduce((acc, cur) => acc + cur.third, 0);

  const recordedRouteCount = totalPatients - missingRouteCount;
  const routeDistribution: RouteGroupStat[] = Array.from(routeMap.entries())
    .map(([route, st]) => ({
      route,
      count: st.count,
      shareOfRecordedPct: pct(st.count, recordedRouteCount),
      secondVisitRate: pct(st.second, st.count),
      thirdVisitRate: pct(st.third, st.count),
    }))
    .sort((a, b) => b.count - a.count);

  const symptomDistribution: SymptomGroupStat[] = symptomLabels.map((category) => {
    const count = symptomMap.get(category) || 0;
    return {
      category,
      count,
      sharePct: pct(count, totalPatients),
    };
  });

  const insuranceBreakdown = Array.from(insMap.entries())
    .map(([label, count]) => ({
      label,
      count,
      pct: pct(count, totalPatients),
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totalPatients,
    firstVisitCount,
    reFirstVisitCount,
    untypedVisitCount,
    periodStart,
    periodEnd,
    periodLabel,
    overallSecondVisitCount,
    overallThirdVisitCount,
    overallSecondVisitRate: pct(overallSecondVisitCount, totalPatients),
    overallThirdVisitRate: pct(overallThirdVisitCount, totalPatients),
    overallReservationYesRate: pct(resvYesTotal, resvRecordedTotal || totalPatients),
    monthlySummary,
    dailySummary,
    ageDistribution,
    unknownAgeCount,
    senior60PlusCount,
    senior60PlusPct: pct(senior60PlusCount, totalPatients),
    senior60PlusSecondRate: pct(senior2nd, senior60PlusCount),
    senior60PlusThirdRate: pct(senior3rd, senior60PlusCount),
    routeDistribution,
    recordedRouteCount,
    missingRouteCount,
    missingRoutePct: pct(missingRouteCount, totalPatients),
    symptomDistribution,
    missingSymptomCount,
    insuranceBreakdown,
    nonCoveredRecordedRows,
  };
}

/**
 * API 장애/한도 초과 시에도 3번 Google Doc 양식 그대로 정밀 분석을 제공하는 폴백 리포트 생성기
 */
export function buildFallbackAiReport(
  analytics: FirstVisitAnalytics,
  missingReport: MissingDataReport
): FirstVisitAiReportData {
  const topSymptoms = [...analytics.symptomDistribution]
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count);

  const topRoute = analytics.routeDistribution[0];
  const youngGroups = analytics.ageDistribution.filter((a) =>
    ["10대 이하", "20대", "30대", "40대"].includes(a.ageGroup) && a.total > 0
  );
  const youngTotal = youngGroups.reduce((s, g) => s + g.total, 0);
  const young2nd = youngGroups.reduce((s, g) => s + g.secondVisitCount, 0);
  const young2ndRate = youngTotal > 0 ? ((young2nd / youngTotal) * 100).toFixed(1) : "0.0";

  const firstMonth = analytics.monthlySummary[0];
  const lastMonth = analytics.monthlySummary[analytics.monthlySummary.length - 1];
  const trendText =
    analytics.monthlySummary.length >= 2 && firstMonth && lastMonth
      ? `${firstMonth.month}월 ${firstMonth.totalPatients}명에서 ${lastMonth.month}월 ${lastMonth.totalPatients}명으로 흐름이 이어지고 있으며, 전체 평균 2차 재내원율은 ${analytics.overallSecondVisitRate}%, 3차 재내원율은 ${analytics.overallThirdVisitRate}%를 기록했습니다.`
      : `현재 수집된 기간 내 총 ${analytics.totalPatients}명(초진 ${analytics.firstVisitCount}명, 재초진 ${analytics.reFirstVisitCount}명)이 내원하였으며, 2차 재내원율 ${analytics.overallSecondVisitRate}%, 3차 재내원율 ${analytics.overallThirdVisitRate}%를 기록하고 있습니다.`;

  return {
    generatedAt: new Date().toISOString(),
    analyzedRowCount: analytics.totalPatients,
    introParagraph: `${analytics.periodLabel} 동안 수집된 초진 및 재초진 환자 데이터(총 ${analytics.totalPatients}건)를 바탕으로 월별·일별 환자 수 추이, 연령대별 재내원 특성, 내원 경로 및 주요 진료 부위에 대한 다각적 AI 분석 결과입니다.`,
    keyTakeaways: [
      {
        title: "1. 신규/재초진 환자 유입 흐름 및 연령대별 치료 순응도(재내원율) 진단",
        bullets: [
          {
            label: "환자 유입 및 재내원 추이",
            content: trendText,
          },
          {
            label: "고령층(60대 이상) 핵심 리텐션",
            content:
              analytics.senior60PlusCount > 0
                ? `60대 이상 고령층 환자(전체 환자의 ${analytics.senior60PlusPct}%, 총 ${analytics.senior60PlusCount}명)는 2차 재내원율 ${analytics.senior60PlusSecondRate}%, 3차 재내원율 ${analytics.senior60PlusThirdRate}%를 기록하며 원내 재방문율을 견인하고 있습니다.`
                : `연령 정보가 기입된 환자 데이터를 기준으로 연령대별 초기 이탈 구간을 점검할 필요가 있습니다.`,
          },
          {
            label: "청장년층 중도 이탈 방어 과제",
            content:
              youngTotal > 0
                ? `40대 이하 청장년·소아청소년 환자군(총 ${youngTotal}명)의 2차 재내원율은 ${young2ndRate}% 수준이므로, 초진 당일 치료 계획(최소 3회 집중 치료 골든타임) 안내 및 퇴실 전 다음 진료 예약 확정이 필요합니다.`
                : `연령 미기재(${analytics.unknownAgeCount}명) 환자의 연령 정보를 보완하면 세대별 정밀 이탈 관리가 가능합니다.`,
          },
        ],
      },
      {
        title: "2. 유입 경로별 충성도 분석 및 접수실 데이터(공란 항목) 관리 개선",
        bullets: [
          {
            label: "주력 유입 채널 성과",
            content: topRoute
              ? `내원 경로가 기록된 환자(${analytics.recordedRouteCount}명) 중 '${topRoute.route}' 유입이 ${topRoute.shareOfRecordedPct}%(${topRoute.count}명)로 가장 높으며, 해당 경로 환자의 2차 재내원율은 ${topRoute.secondVisitRate}%, 3차 재내원율은 ${topRoute.thirdVisitRate}%를 보였습니다.`
              : `현재 내원 경로 컬럼이 모두 공란으로 비어 있어 유입 채널별 리텐션 비교를 위해 접수 문진 보완이 필요합니다.`,
          },
          {
            label: "내원 경로 및 필수 항목 미기재율 점검",
            content: `전체 환자의 ${analytics.missingRoutePct}%(${analytics.missingRouteCount}명)에서 내원 경로가 공란 상태입니다. 접수 단계에서 내원 경로와 다음 진료 예약 안내(유/무) 수집 프로세스를 표준화하면 마케팅 ROI 분석 정확도가 크게 향상됩니다.`,
          },
        ],
      },
      {
        title: "3. 주요 진료 부위(주소증) 분포 및 한약·비급여 상담 연계 전략",
        bullets: [
          {
            label: "상위 주소증 집중도",
            content:
              topSymptoms.length > 0
                ? `환자들이 가장 많이 호소하는 진료 영역은 ${topSymptoms
                    .slice(0, 3)
                    .map((s) => `'${s.category}'(${s.sharePct}%, ${s.count}명)`)
                    .join(", ")} 순으로 나타났습니다.`
                : `진료 내역(주소증/치료법)이 공란인 환자가 많아 상병/주소증 컬럼 포함 업로드를 권장드립니다.`,
          },
          {
            label: "비급여 및 한약·패키지 확장성",
            content:
              analytics.nonCoveredRecordedRows > 0
                ? `현재 비급여·한약·패키지 관련 기록이 ${analytics.nonCoveredRecordedRows}건 기입되어 있습니다. 근골격계 급여 초진 환자 중 재내원 순응도가 높은 환자군을 대상으로 약침·추나·맞춤 한약 상담 연계를 강화하시기 바랍니다.`
                : `2번 시트의 비급여 판매·즉시결제·한약 월총 건수·패키지·연복 항목이 현재 공란 상태입니다. 상담 실장/원장님께서 시트에 결제 내역을 함께 체크하시면 초진 대비 비급여 전환율까지 자동 산출됩니다.`,
          },
        ],
      },
    ],
    missingFieldsNotice: missingReport.directorMessages,
    footnote:
      "참고 및 전제 조건: 최근 내원 환자의 재내원율은 2·3회차 진료가 아직 도래하지 않은 진행 중 영향이 반영되었을 수 있습니다. 일자가 공란으로 입력된 연속 행은 동일 일자 전진 채움(Forward-fill) 기준으로 집계하였으며, 업로드된 차트에 없는 시트 항목은 임의 추정 없이 공란으로 유지하였습니다.",
    aiModelUsed: "barun-clinical-engine",
  };
}

/**
 * 2번 구글 시트 100% 동일 레이아웃(.xlsx) 내보내기
 */
export function exportFirstVisitWorkbookXlsx(rows: FirstVisitRow[], clinicName?: string) {
  const row0 = Array(19).fill("");
  row0[7] = "초진일";
  row0[8] = "재내원일";

  const row1 = SHEET_COLUMNS.map((c) => c.label);

  const dataMatrix = rows.map((r) => [
    r.visitDate || "",
    r.patientName || "",
    r.age ? (isNaN(Number(r.age)) ? r.age : Number(r.age)) : "",
    r.visitType || "",
    r.insuranceType || "",
    r.treatmentDetail || "",
    r.nextReservation || "",
    r.firstVisitDate || "",
    r.secondVisitDate || "",
    r.thirdVisitDate || "",
    r.visitRoute || "",
    r.nonCoveredList || "",
    r.nonCoveredCount || "",
    r.immediatePaymentCount || "",
    r.herbalMonthlySummary || "",
    r.packageCount || "",
    r.herbalFollowupPayment || "",
    r.packageRenewal || "",
    r.delayedPaymentWithinMonth || "",
  ]);

  const ws = XLSX.utils.aoa_to_sheet([row0, row1, ...dataMatrix]);

  // I1:J1 "재내원일" 병합 (2번 구글 시트 동일 병합 구조)
  ws["!merges"] = [{ s: { r: 0, c: 8 }, e: { r: 0, c: 9 } }];

  ws["!cols"] = [
    { wch: 11 }, // 일자
    { wch: 12 }, // 환자 이름
    { wch: 7 },  // 나이
    { wch: 11 }, // 초진/재초진
    { wch: 16 }, // 환자구분
    { wch: 34 }, // 환자 진료 내역
    { wch: 15 }, // 다음 진료 예약 안내
    { wch: 11 }, // 1회
    { wch: 11 }, // 2회
    { wch: 11 }, // 3회
    { wch: 14 }, // 내원경로
    { wch: 24 }, // 비급여 목록
    { wch: 18 }, // 비급여 판매 건수
    { wch: 16 }, // 상담후 즉시 결제
    { wch: 24 }, // 한약 월총 건수
    { wch: 12 }, // 패키지 건수
    { wch: 18 }, // 1제 복용후 추가결제
    { wch: 22 }, // 패키지 종료후 연장
    { wch: 26 }, // 상담후 1달이내 결제
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "초진시스템_시트1");

  const today = new Date().toISOString().slice(0, 10);
  const safeClinic = (clinicName || "한의원").replace(/[\\/:*?"<>|]/g, "_");
  XLSX.writeFile(wb, `${safeClinic}_초진시스템_${today}.xlsx`);
}
