/**
 * 데이터 파싱용 유틸리티 함수
 */

export const normalize = (text: unknown): string =>
  String(text || "")
    .replace(/[\n\r\s\(\)\[\]\{\}]/g, "")
    .replace(/[^\w\uAC00-\uD7AF]+/g, "")
    .trim();

export const parseCleanNumber = (val: unknown): number => {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    // 괄호 안의 숫자(할인액 등)는 제외하고 순수 숫자만 추출
    const withoutParens = val.replace(/\(.*\)/g, "");
    const cleaned = withoutParens.replace(/[^0-9.-]+/g, "");
    return parseFloat(cleaned) || 0;
  }
  return 0;
};

/**
 * 한차트 특유의 괄호 안 숫자(할인액) 추출
 * 예: "42,000(12,000)" -> 12000 반환
 */
export const extractDiscount = (val: unknown): number => {
  if (typeof val === "string") {
    const match = val.match(/\(([^)]+)\)/);
    if (match) {
      const cleaned = match[1].replace(/[^0-9.-]+/g, "");
      return parseFloat(cleaned) || 0;
    }
  }
  return 0;
};

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
