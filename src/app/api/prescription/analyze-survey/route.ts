import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 60;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

interface ImagePayload {
  imageBase64: string;
  mimeType?: string;
}

export async function POST(req: NextRequest) {
  try {
    // 세션 확인 (비로그인 상태나 세션 만료 시에도 한열허실 설문지 판독은 전면 허용)
    const session = await getServerSession(authOptions).catch(() => null);

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ 
        success: false, 
        isReadable: false, 
        errorMessage: "GEMINI_API_KEY가 서버에 설정되어 있지 않습니다." 
      }, { status: 500 });
    }

    const body = await req.json();
    
    // Support both multiple images (up to 3) and single image
    let imageList: ImagePayload[] = [];

    if (Array.isArray(body.images) && body.images.length > 0) {
      imageList = body.images.slice(0, 3);
    } else if (body.imageBase64) {
      imageList = [{ imageBase64: body.imageBase64, mimeType: body.mimeType || "image/jpeg" }];
    }

    if (imageList.length === 0) {
      return NextResponse.json({ 
        success: false, 
        isReadable: false, 
        errorMessage: "분석할 설문지 이미지가 등록되지 않았습니다." 
      }, { status: 400 });
    }

    // Limit to max 3 images
    const selectedImages = imageList.slice(0, 3);

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    const prompt = `
당신은 한의학 전문 "한열허실(寒熱虛實)" 설문지/차트 판독 수석 AI입니다.
첨부된 설문지 사진(${selectedImages.length}장)에서 환자가 수기로 체크(V 표시, 동그라미, 빗금, 밑줄 등)한 모든 증상을 정밀 판독하십시오.

[매우 중요한 판독 규칙]:
1. 빈 원형(○)이나 체크 표시가 없는 항목은 절대로 포함하지 마십시오.
   오직 환자가 V 표시나 볼펜/형광펜 체크를 해둔 항목만 정확히 추출하십시오.
2. 19대 기준 카테고리:
   소화, 입맛, 수면, 소변, 대변, 땀, 통증, 추위 더위, 흉부 증상, 심리 증상, 피로도, 생리통, 생리 주기, 비염, 두통, 순환, 갈증, 관절, 부종
3. 판독된 증상의 한열허실(type) 판별 기준:
   - [한(Cold)]: 따뜻한 물/음식 선호, 찬것 먹으면 설사, 손발/몸 차가움, 맑은 소변, 땀 안 남, 묽은 변/설사
   - [열(Heat)]: 더위, 찬물 선호, 입술/입안 마름, 속쓰림(공복), 변비, 얼굴 붉음, 땀 많음, 갈증
   - [허(Deficiency)]: 입이 짧다, 허기 못 참음, 피로, 땀내면 지침, 잔뇨감, 소변 잦음, 소화불량 지속, 기운 없음
   - [실(Excess)]: 잘 체함, 더부룩함, 가스 잘 참, 배 팽만, 통증 심함, 하루라도 변 못보면 무척 불편, 급체
4. 빛 반사, 그림자, 초점 흐림 등으로 완전히 판독이 불가능한 영역이 있다면 unreadableRegions에 기록하십시오.
   - imageIndex: 0부터 시작하는 사진 번호 (0, 1, 2)
   - box2d: [ymin, xmin, ymax, xmax] (0~1000 정규화 좌표)
   - label: 판독 불가 사유 ("빛 반사 영역", "초점 흐림", "그림자 가림")
   - reason: 사유 설명

반드시 다음 JSON 구조로 응답하십시오:
{
  "isReadable": true,
  "isPartial": false,
  "isFilled": true,
  "errorMessage": null,
  "checkedItems": [
    { "category": "소화", "type": "한", "text": "배에서 소리가 자주 난다" }
  ],
  "unreadableRegions": [],
  "summary": "총 N개 체크 항목 판독 완료"
}
`;

    // Prepare image parts for Gemini
    const imageParts = selectedImages.map((img) => ({
      inlineData: {
        data: img.imageBase64.replace(/^data:image\/\w+;base64,/, ""),
        mimeType: img.mimeType || "image/jpeg"
      }
    }));

    // Configure fast native JSON mode with thinking budget disabled to prevent MAX_TOKENS truncation
    const generationConfig = {
      temperature: 0.1,
      maxOutputTokens: 4000,
      responseMimeType: "application/json",
      thinkingConfig: {
        thinkingBudget: 0
      }
    };

    // Candidate models to try in sequence
    const candidateModels = [
      "gemini-2.5-flash",
      "gemini-1.5-flash"
    ];

    let text = "";
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel(
          { 
            model: modelName,
            generationConfig: modelName.includes("2.5") ? generationConfig : {
              temperature: 0.1,
              maxOutputTokens: 4000,
              responseMimeType: "application/json"
            }
          }, 
          { apiVersion: "v1beta" }
        );
        const result = await model.generateContent([prompt, ...imageParts]);
        text = result.response.text();
        if (text && text.trim().length > 0) {
          break; // 성공 시 루프 종료
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[AI Vision] ${modelName} 호출 실패, 다음 모델로 대체 시도:`, err?.message);
      }
    }

    if (!text) {
      throw new Error(lastError?.message || "AI 비전 모델로부터 응답을 받지 못했습니다.");
    }

    const cleanText = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    let parsed: any = null;

    // 1차: 정규식으로 { ... } 추출
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch (jsonErr) {
        console.warn("JSON.parse error on matched block:", jsonErr);
      }
    }

    // 2차: 전체 텍스트 직접 파싱
    if (!parsed) {
      try {
        parsed = JSON.parse(cleanText);
      } catch (directErr) {
        console.warn("JSON.parse error on direct text:", directErr);
      }
    }

    // 3차 폴백: 정규식으로 체크 항목 수동 복원
    if (!parsed) {
      console.warn("Falling back to regex recovery for checkedItems");
      const recoveredItems: Array<{ category: string; type: string }> = [];
      const itemRegex = /"category"\s*:\s*"([^"]+)"\s*,\s*"type"\s*:\s*"([한열허실])"/g;
      let match;
      while ((match = itemRegex.exec(cleanText)) !== null) {
        recoveredItems.push({ category: match[1], type: match[2] });
      }

      parsed = {
        isReadable: recoveredItems.length > 0,
        isFilled: recoveredItems.length > 0,
        checkedItems: recoveredItems,
        unreadableRegions: [],
        summary: `정규식 복원 판독: ${recoveredItems.length}개 증상 식별`
      };
    }

    if (parsed.isReadable === false && (!parsed.checkedItems || parsed.checkedItems.length === 0)) {
      return NextResponse.json({
        success: false,
        isReadable: false,
        errorMessage: parsed.errorMessage || "설문지 형식을 식별할 수 없습니다. 한열허실 설문지 사진을 올려주세요."
      });
    }

    const checkedItems = Array.isArray(parsed.checkedItems) ? parsed.checkedItems : [];
    const unreadableRegions = Array.isArray(parsed.unreadableRegions) ? parsed.unreadableRegions : [];
    const isPartial = unreadableRegions.length > 0 || parsed.isPartial || false;

    return NextResponse.json({
      success: true,
      isReadable: true,
      isPartial,
      isFilled: parsed.isFilled ?? (checkedItems.length > 0),
      checkedItems,
      unreadableRegions,
      summary: parsed.summary || `총 ${selectedImages.length}장의 사진에서 ${checkedItems.length}개 증상이 판독되었습니다.`
    });

  } catch (error: any) {
    console.error("Survey analysis error:", error);
    return NextResponse.json({
      success: false,
      isReadable: false,
      errorMessage: "AI 이미지 판독 중 오류가 발생했습니다: " + (error?.message || "서버 통신 실패")
    }, { status: 500 });
  }
}
