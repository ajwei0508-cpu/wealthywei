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
    // 세션 확인 (비로그인 상태나 세션 만료 시에도 한열허실 설문지 판독은 허용)
    const session = await getServerSession(authOptions).catch(() => null);
    const userEmail = session?.user?.email || "anonymous_doctor";

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
한의학 전문 한열허실(寒熱虛實) 설문지/차트 사진(${selectedImages.length}장)을 정밀 판독하십시오.
환자가 체크(V, O, 밑줄, 형광펜, 동그라미)한 모든 증상을 찾아내십시오.

19대 기준 카테고리:
소화, 입맛, 수면, 소변, 대변, 땀, 통증, 추위 더위, 흉부 증상, 심리 증상, 피로도, 생리통, 생리 주기, 비염, 두통, 순환, 갈증, 관절, 부종

구분:
한 (Cold), 열 (Heat), 허 (Deficiency), 실 (Excess)

[핵심 판독 원칙]
1. 판독 가능한 항목은 멈추지 말고 끝까지 추출하여 checkedItems에 넣으십시오.
2. 빛 반사, 그림자, 초점 흐림 등으로 판독이 불가능하거나 모호한 부분은 unreadableRegions에 기록하십시오.
   - imageIndex: 0부터 시작하는 사진 번호 (0, 1, 2)
   - box2d: [ymin, xmin, ymax, xmax] (0~1000 정규화 좌표)
   - label: 판독 불가 사유 ("빛 반사 영역", "초점 흐림", "그림자 가림")
   - reason: 사유 및 영향 항목 설명
3. 설문지가 전혀 아니거나 100% 빈 화면일 때만 isReadable: false로 하십시오.

반드시 다음 JSON 구조로 응답하십시오:
{
  "isReadable": true,
  "isPartial": false,
  "isFilled": true,
  "errorMessage": null,
  "checkedItems": [
    { "category": "소화", "type": "한" }
  ],
  "unreadableRegions": [
    { "imageIndex": 0, "box2d": [100, 200, 300, 400], "label": "빛 반사 영역", "reason": "소변 항목 판독 불가" }
  ],
  "summary": "총 N개 증상 판독 완료"
}
`;

    // Prepare image parts for Gemini
    const imageParts = selectedImages.map((img) => ({
      inlineData: {
        data: img.imageBase64.replace(/^data:image\/\w+;base64,/, ""),
        mimeType: img.mimeType || "image/jpeg"
      }
    }));

    // Configure fast native JSON mode
    const generationConfig = {
      temperature: 0.1,
      maxOutputTokens: 2000,
      responseMimeType: "application/json"
    };

    // Candidate models to try in sequence for maximum reliability
    const candidateModels = [
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-1.5-flash"
    ];

    let text = "";
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel(
          { 
            model: modelName,
            generationConfig
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
