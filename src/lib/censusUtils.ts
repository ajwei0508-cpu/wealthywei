/**
 * 통계청 및 주민등록 인구통계 6개월(반기) 공표 주기 계산 유틸리티
 * (Server & Client 공용)
 * 
 * 상반기: 5월 기준 공표 자료 (11월까지 유효)
 * 하반기: 11월 기준 공표 자료 (익년 5월까지 유효)
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

  return {
    censusBaseDate,
    nextUpdateDate,
    updateInterval,
    lastUpdatedIso: currentDate.toISOString(),
  };
}
