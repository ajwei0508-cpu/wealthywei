/**
 * 대한민국 법정 공휴일 및 대체 공휴일 데이터베이스 (2024 ~ 2027)
 * 설날/추석 등 음력 연휴 및 대체공휴일까지 완벽하게 반영되어 있습니다.
 */

export interface HolidayInfo {
  name?: string;
  isHoliday: boolean;
}

// YYYY-MM-DD -> 공휴일 명칭
export const KOREAN_HOLIDAYS: Record<string, string> = {
  // --- 2024년 ---
  "2024-01-01": "신정",
  "2024-02-09": "설날 연휴",
  "2024-02-10": "설날",
  "2024-02-11": "설날 연휴",
  "2024-02-12": "대체공휴일(설날)",
  "2024-03-01": "삼일절",
  "2024-04-10": "제22대 국회의원선거",
  "2024-05-05": "어린이날",
  "2024-05-06": "대체공휴일(어린이날)",
  "2024-05-15": "부처님오신날",
  "2024-06-06": "현충일",
  "2024-08-15": "광복절",
  "2024-09-16": "추석 연휴",
  "2024-09-17": "추석",
  "2024-09-18": "추석 연휴",
  "2024-10-01": "임시공휴일(국군의 날)",
  "2024-10-03": "개천절",
  "2024-10-09": "한글날",
  "2024-12-25": "기독탄신일",

  // --- 2025년 ---
  "2025-01-01": "신정",
  "2025-01-28": "설날 연휴",
  "2025-01-29": "설날",
  "2025-01-30": "설날 연휴",
  "2025-03-01": "삼일절",
  "2025-03-03": "대체공휴일(삼일절)",
  "2025-05-05": "어린이날",
  "2025-05-06": "부처님오신날",
  "2025-06-06": "현충일",
  "2025-08-15": "광복절",
  "2025-10-03": "개천절",
  "2025-10-05": "추석 연휴",
  "2025-10-06": "추석",
  "2025-10-07": "추석 연휴",
  "2025-10-08": "대체공휴일(추석)",
  "2025-10-09": "한글날",
  "2025-12-25": "기독탄신일",

  // --- 2026년 ---
  "2026-01-01": "신정",
  "2026-02-16": "설날 연휴",
  "2026-02-17": "설날",
  "2026-02-18": "설날 연휴",
  "2026-02-19": "대체공휴일(설날)",
  "2026-03-01": "삼일절",
  "2026-03-02": "대체공휴일(삼일절)",
  "2026-05-05": "어린이날",
  "2026-05-24": "부처님오신날",
  "2026-05-25": "대체공휴일(부처님오신날)",
  "2026-06-06": "현충일",
  "2026-08-15": "광복절",
  "2026-08-17": "대체공휴일(광복절)",
  "2026-09-24": "추석 연휴",
  "2026-09-25": "추석",
  "2026-09-26": "추석 연휴",
  "2026-09-28": "대체공휴일(추석)",
  "2026-10-03": "개천절",
  "2026-10-05": "대체공휴일(개천절)",
  "2026-10-09": "한글날",
  "2026-12-25": "기독탄신일",

  // --- 2027년 ---
  "2027-01-01": "신정",
  "2027-02-06": "설날 연휴",
  "2027-02-07": "설날",
  "2027-02-08": "설날 연휴",
  "2027-02-09": "대체공휴일(설날)",
  "2027-03-01": "삼일절",
  "2027-05-05": "어린이날",
  "2027-05-13": "부처님오신날",
  "2027-06-06": "현충일",
  "2027-06-07": "대체공휴일(현충일)",
  "2027-08-15": "광복절",
  "2027-08-16": "대체공휴일(광복절)",
  "2027-09-14": "추석 연휴",
  "2027-09-15": "추석",
  "2027-09-16": "추석 연휴",
  "2027-10-03": "개천절",
  "2027-10-04": "대체공휴일(개천절)",
  "2027-10-09": "한글날",
  "2027-10-11": "대체공휴일(한글날)",
  "2027-12-25": "기독탄신일",
};

/**
 * 특정 날짜가 한국 법정공휴일인지 검사
 */
export function isKoreanHoliday(dateStr: string): HolidayInfo {
  const name = KOREAN_HOLIDAYS[dateStr];
  if (name) {
    return { isHoliday: true, name };
  }
  return { isHoliday: false };
}

/**
 * YYYY-MM-DD 문자열 생성 (로컬 날짜 기준)
 */
export function formatDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 병원이 쉬는 날인지 판별 (정기 휴진 요일 + 법정 공휴일)
 * @param date 검사할 날짜
 * @param closedDaysOfWeek 정기 휴진 요일 배열 (0: 일요일, 6: 토요일, 4: 목요일 등)
 */
export function isClinicClosed(
  date: Date,
  closedDaysOfWeek: number[] = [0] // 기본값: 일요일 휴진
): { isClosed: boolean; reason?: string } {
  const dayOfWeek = date.getDay();

  // 1. 요일별 휴진 검사
  if (closedDaysOfWeek.includes(dayOfWeek)) {
    const dayNames = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
    return { isClosed: true, reason: `${dayNames[dayOfWeek]} 정기휴진` };
  }

  // 2. 공휴일 검사
  const dateStr = formatDateKey(date);
  const holiday = isKoreanHoliday(dateStr);
  if (holiday.isHoliday) {
    return { isClosed: true, reason: holiday.name };
  }

  return { isClosed: false };
}

/**
 * 내원일과 오늘 사이의 "실제 진료일수(Business Days)"와 "쉬는 날 수"를 정밀 계산
 */
export function calculateClinicDays(
  lastVisitDateStr: string,
  today: Date = new Date(),
  closedDaysOfWeek: number[] = [0]
) {
  const parts = lastVisitDateStr.split("-");
  let cursor = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  cursor.setHours(0, 0, 0, 0);

  const targetToday = new Date(today);
  targetToday.setHours(0, 0, 0, 0);

  let calendarDays = 0;
  let businessDays = 0;
  let closedDays = 0;
  const holidaysEncountered: string[] = [];

  // 내원 다음 날부터 오늘까지 하루씩 전진하며 계산
  cursor.setDate(cursor.getDate() + 1);

  while (cursor <= targetToday) {
    calendarDays++;
    const closedCheck = isClinicClosed(cursor, closedDaysOfWeek);
    if (closedCheck.isClosed) {
      closedDays++;
      if (closedCheck.reason && !holidaysEncountered.includes(closedCheck.reason)) {
        holidaysEncountered.push(closedCheck.reason);
      }
    } else {
      businessDays++;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    calendarDays,
    businessDays,
    closedDays,
    holidaysEncountered,
  };
}

/**
 * 장기 연휴/주말 동안 골든타임(4일차, 7일차)에 도달했는지 역추적(Lookback)하는 검사기
 * 
 * 예: 5일 연휴(추석) 동안 병원이 닫아서 전화를 못 걸었을 때,
 * 연휴 중 4일차나 7일차가 도래했던 환자들을 '연휴 이월'로 살려냅니다.
 */
export function evaluateHappyCallStage(
  lastVisitDateStr: string,
  today: Date = new Date(),
  mode: "business" | "calendar" = "business",
  closedDaysOfWeek: number[] = [0]
): {
  targetStage: "4일차" | "7일차" | "8일 이상" | "대기";
  daysPassed: number;
  calendarDays: number;
  businessDays: number;
  isCarryover: boolean;
  carryoverReason?: string;
  badgeLabel?: string;
} {
  const { calendarDays, businessDays, closedDays, holidaysEncountered } = calculateClinicDays(
    lastVisitDateStr,
    today,
    closedDaysOfWeek
  );

  // 1. [진료일(영업일) 기준 모드] (가장 추천하는 모드)
  // 병원이 문을 연 날만 카운트하므로 긴 연휴(추석/설날)에도 억울하게 골든타임을 건너뛰지 않습니다.
  if (mode === "business") {
    let stage: "4일차" | "7일차" | "8일 이상" | "대기" = "대기";
    let isCarryover = false;
    let carryoverReason: string | undefined = undefined;
    let badgeLabel: string | undefined = undefined;

    if (businessDays < 4) {
      stage = "대기";
    } else if (businessDays === 4) {
      // 미내원 4일차 되는 환자만 추출
      stage = "4일차";
      // 만약 중간에 긴 연휴나 주말이 2일 이상 끼어있었다면 연휴 안내 뱃지
      if (closedDays >= 2) {
        isCarryover = true;
        carryoverReason = holidaysEncountered.length > 0 
          ? `${holidaysEncountered.join(", ")} 반영` 
          : "주말 휴진 반영";
        badgeLabel = holidaysEncountered.length > 0 ? "연휴 보정" : "주말 보정";
      }
    } else if (businessDays === 7) {
      stage = "7일차";
      if (closedDays >= 2) {
        isCarryover = true;
        carryoverReason = holidaysEncountered.length > 0 
          ? `${holidaysEncountered.join(", ")} 반영` 
          : "주말 휴진 반영";
        badgeLabel = holidaysEncountered.length > 0 ? "연휴 보정" : "주말 보정";
      }
    } else if (businessDays >= 8) {
      stage = "8일 이상";
    } else {
      // businessDays === 5 || businessDays === 6
      // 미내원 4일차 해피콜 시점이 지난 환자는 7일차(집중) 도래 전까지 대기
      stage = "대기";
    }

    return {
      targetStage: stage,
      daysPassed: businessDays,
      calendarDays,
      businessDays,
      isCarryover,
      carryoverReason,
      badgeLabel,
    };
  }

  // 2. [달력 일수 기준 모드] + [다일 연휴 역추적 윈도우 (Lookback Window)]
  // 달력 일수를 그대로 쓰되, 직전 휴일 동안 7일차/4일차를 맞이했던 환자를 첫 출근일에 자동 이월합니다.
  let stage: "4일차" | "7일차" | "8일 이상" | "대기" = "대기";
  let isCarryover = false;
  let carryoverReason: string | undefined = undefined;
  let badgeLabel: string | undefined = undefined;

  // 오늘 직전에 연속된 휴일(연휴 또는 주말)이 며칠이었는지 역추적
  let consecutiveClosedDaysBeforeToday = 0;
  const prevDate = new Date(today);
  prevDate.setHours(0, 0, 0, 0);
  prevDate.setDate(prevDate.getDate() - 1);

  const holidaysInStreak: string[] = [];
  while (true) {
    const check = isClinicClosed(prevDate, closedDaysOfWeek);
    if (check.isClosed) {
      consecutiveClosedDaysBeforeToday++;
      if (check.reason && !holidaysInStreak.includes(check.reason)) {
        holidaysInStreak.push(check.reason);
      }
      prevDate.setDate(prevDate.getDate() - 1);
    } else {
      break;
    }
  }

  if (calendarDays < 4) {
    stage = "대기";
  } else if (calendarDays === 4) {
    // 미내원 4일차 되는 환자
    stage = "4일차";
  } else if (consecutiveClosedDaysBeforeToday > 0 && calendarDays > 4 && calendarDays <= 4 + consecutiveClosedDaysBeforeToday) {
    // 직전 휴일/주말 동안 미내원 4일차를 맞이했던 환자 -> 첫 출근일에 4일차로 자동 이월
    stage = "4일차";
    isCarryover = true;
    const holidayName = holidaysInStreak.length > 0 ? holidaysInStreak.join("/") : "주말";
    carryoverReason = `${holidayName} 기간 중 4일차 도래 (이월됨)`;
    badgeLabel = consecutiveClosedDaysBeforeToday >= 3 ? "장기연휴 이월⚠️" : "주말이월⚠️";
  } else if (calendarDays === 7) {
    stage = "7일차";
  } else if (consecutiveClosedDaysBeforeToday > 0 && calendarDays > 7 && calendarDays <= 7 + consecutiveClosedDaysBeforeToday) {
    // 직전 연휴/주말 동안 7일차에 도달했던 환자 -> 첫 출근일에 7일차로 자동 이월
    stage = "7일차";
    isCarryover = true;
    const holidayName = holidaysInStreak.length > 0 ? holidaysInStreak.join("/") : "주말";
    carryoverReason = `${holidayName} 기간 중 7일차 도래 (이월됨)`;
    badgeLabel = consecutiveClosedDaysBeforeToday >= 3 ? "장기연휴 이월⚠️" : "주말이월⚠️";
  } else if (calendarDays >= 8) {
    stage = "8일 이상";
  } else {
    // calendarDays === 5 || calendarDays === 6
    // 4일차 안부콜 이후 7일차 도래 전까지는 대기
    stage = "대기";
  }

  return {
    targetStage: stage,
    daysPassed: calendarDays,
    calendarDays,
    businessDays,
    isCarryover,
    carryoverReason,
    badgeLabel,
  };
}
