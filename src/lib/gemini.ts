import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Gemini API 중앙 관리 파일 (Singleton)
 * 모든 AI 호출은 이 파일에서 내보낸 genAI 및 model 인스턴스를 사용합니다.
 */

// 서버 측 키(GEMINI_API_KEY)를 우선하고, 클라이언트 측 키(NEXT_PUBLIC_GEMINI_API_KEY)를 차선으로 사용합니다.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  // 클라이언트 측이나 빌드 단계에서 에러로 터지지 않도록 경고만 남기되,
  // 실제 호출 시에는 에러가 발생하도록 처리합니다.
  console.warn("⚠️ [Gemini] GEMINI_API_KEY가 환경 변수에 설정되지 않았습니다.");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "");

// 원장님의 요청대로 1.5-flash 모델로 통일합니다.
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

/**
 * 연결 테스트용 함수
 */
export async function testGeminiConnection() {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is missing");
  try {
    const result = await model.generateContent("Hello! This is a test connection from Barun Consulting App.");
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("🔥 [Gemini] Connection Test Failed:", error);
    throw error;
  }
}

export { genAI, model };
