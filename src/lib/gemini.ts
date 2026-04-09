import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "AIzaSyDummyKeyForBuildBypass123456789";
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function testGeminiConnection() {
  try {
    const result = await model.generateContent("Hello! This is a test connection from Barun Consulting App.");
    const response = await result.response;
    const text = response.text();
    console.log("Gemini API Test Success:", text);
    return text;
  } catch (error) {
    console.error("Gemini API Test Failed:", error);
    throw error;
  }
}

export { genAI, model };
