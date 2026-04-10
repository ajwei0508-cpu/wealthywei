import { GoogleGenerativeAI, RequestOptions } from "@google/generative-ai";

/**
 * Gemini API 중앙 관리 파일 (Singleton)
 * 
 * [404 오류 근본 원인 및 해결]
 * - SDK 0.24.x는 기본으로 v1beta 엔드포인트를 사용합니다.
 * - 최신 Gemini 모델들은 v1beta에서 제거되어 404가 발생합니다.
 * - 해결: getGenerativeModel의 RequestOptions에 apiVersion: "v1"을 명시합니다.
 *   (타입 정의: generative-ai.d.ts:1184 - apiVersion?: string)
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn("⚠️ [Gemini] GEMINI_API_KEY가 환경 변수에 설정되지 않았습니다.");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "");

// RequestOptions에 apiVersion: "v1"을 지정하여 v1beta 대신 v1 엔드포인트를 강제합니다.
const requestOptions: RequestOptions = {
  apiVersion: "v1",
};

const model = genAI.getGenerativeModel(
  { model: "gemini-1.5-flash" },
  requestOptions
);

/**
 * 연결 테스트용 함수
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
