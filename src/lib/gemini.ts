import { GoogleGenerativeAI, RequestOptions } from "@google/generative-ai";

/**
 * Gemini API 중앙 관리 파일 (Server-Only Singleton)
 *
 * 보안 원칙:
 * - 이 모듈은 반드시 서버(API Route / Server Action)에서만 import 되어야 합니다.
 * - 클라이언트 번들에 API 키가 평문 노출되는 것을 원천 차단하기 위해
 *   정적 `process.env.NEXT_PUBLIC_*` 참조를 금지합니다.
 */

if (typeof window !== "undefined") {
  throw new Error("Security Violation: src/lib/gemini.ts must never be imported in client-side code.");
}

// Vercel 등 배포 환경에 기존 NEXT_PUBLIC_GEMINI_API_KEY만 등록되어 있는 경우까지 호환하되,
// Next.js 컴파일러의 클라이언트 번들 인라이닝(DefinePlugin)이 절대 발생하지 않도록 동적 키로만 조회합니다.
const legacyEnvName = ["NEXT_PUBLIC", "GEMINI", "API", "KEY"].join("_");

export function getServerGeminiApiKey(): string {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env[legacyEnvName] ||
    ""
  ).trim();
}

const GEMINI_API_KEY = getServerGeminiApiKey();

if (!GEMINI_API_KEY) {
  console.warn("⚠️ [Gemini] 서버 환경 변수 GEMINI_API_KEY가 설정되지 않았습니다.");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const requestOptions: RequestOptions = {
  apiVersion: "v1beta",
};

const model = genAI.getGenerativeModel(
  { model: "gemini-2.5-flash" },
  requestOptions
);

/**
 * 결제 잔액 소진(402) 또는 인증 실패(401/403)처럼 동일 키로 재시도해도 무의미한 에러인지 판별합니다.
 */
export function isBillingOrAuthError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error || "");
  return (
    msg.includes("402") ||
    msg.includes("depleted") ||
    msg.includes("Payment Required") ||
    msg.includes("401") ||
    msg.includes("403") ||
    msg.includes("API_KEY_INVALID") ||
    msg.includes("PERMISSION_DENIED")
  );
}

/**
 * 연결 테스트용 함수 (서버 전용)
 */
export async function testGeminiConnection() {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is missing");
  try {
    const result = await model.generateContent("Hello! This is a test.");
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("🔥 [Gemini] Connection Test Failed:", error);
    throw error;
  }
}

export { genAI, model };
