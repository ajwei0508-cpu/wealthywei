import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

interface ImagePayload {
  imageBase64: string;
  mimeType?: string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
        errorMessage: "분석할 설문지 이미지가 1장 이상 전달되지 않았습니다." 
      }, { status: 400 });
    }

    // Limit to max 3 images
    const selectedImages = imageList.slice(0, 3);

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel(
      { model: "gemini-2.5-flash" }, 
      { apiVersion: "v1beta" }
    );

    const prompt = `
당신은 한의학 전문 한열허실(寒熱虛實) 설문지 및 환자 문진표 정밀 판독 AI입니다.
원장님이 업로드한 설문지/차트 사진(총 ${selectedImages.length}장, 최대 3장)을 정밀하게 종합 분석하여 환자가 체크(V, O, 밑줄, 형광펜, 동그라미 등)한 증상 항목을 정확히 찾아내야 합니다.

[다중 이미지 판독 안내]
- 제공된 ${selectedImages.length}장의 사진은 동일 환자의 앞/뒷면, 또는 분할 촬영된 설문지 페이지들입니다.
- 각 사진을 순서대로 모두 확인하여, 모든 사진에 걸쳐 체크된 항목들을 중복 없이 통합(Merge)하여 반환해야 합니다.

[19대 기준 증상 구분 카테고리 목록]
1. 소화
2. 입맛
3. 수면
4. 소변
5. 대변
6. 땀
7. 통증
8. 추위 더위
9. 흉부 증상
10. 심리 증상
11. 피로도
12. 생리통
13. 생리 주기
14. 비염
15. 두통
16. 순환
17. 갈증
18. 관절
19. 부종

[한열허실(寒熱虛實) 구분]
- "한": 寒 (Cold) 증상 열
- "열": 熱 (Heat) 증상 열
- "허": 虛 (Deficiency) 증상 열
- "실": 實 (Excess) 증상 열

[🚨 가장 중요한 판독 엄격 규칙 (절대 준수)]
1. [해석 불가 시 강제 중단]:
   - 업로드된 사진 중 단 한 장이라도 너무 흐릿하거나, 글자가 뭉개졌거나, 심하게 기울어지거나, 조명이 어두워 어떤 글자나 체크인지 판독하기 어려운 경우
   - 한열허실 설문지가 아니거나 관련 없는 사진이 섞여 있는 경우
   => 절대로 억지로 끼워맞추거나 허위로 추측하여 체크하지 마십시오.
   => 반드시 isReadable: false로 설정하고, errorMessage에 몇 번째 사진이 판독 불가인지와 문제 사유를 구체적으로 명시하세요. (예: "제공된 사진 중 2번째 사진의 글씨 및 체크 표시가 흐릿하여 정확한 판독이 불가능합니다. 선명하게 다시 촬영해 주세요.")

2. [체크 없는 원본 빈 양식인 경우]:
   - 설문지는 명확히 식별되나, 환자의 체크/동그라미 표시가 전혀 없는 경우:
   => isReadable: true, isFilled: false, checkedItems: [] 로 응답하고 summary에 "체크 표시가 없는 빈 양식입니다."라고 기재하세요.

3. [정상 판독 및 체크 확인 시]:
   - 제공된 모든 사진에서 발견된 체크 항목을 중복 없이 checkedItems 배열에 종합하세요.
   - category는 반드시 위 19개 표준 카테고리 중 하나와 일치해야 합니다.
   - type은 반드시 "한", "열", "허", "실" 중 하나여야 합니다.

반드시 마크다운 따옴표 없이 순수한 JSON 형식으로만 응답하세요:
{
  "isReadable": boolean,
  "isFilled": boolean,
  "errorMessage": string | null,
  "checkedItems": [
    {
      "category": "소화",
      "type": "한"
    }
  ],
  "summary": "총 N장의 설문지에서 M개 항목 종합 판독 완료"
}
`;

    // Prepare image parts for Gemini
    const imageParts = selectedImages.map((img) => ({
      inlineData: {
        data: img.imageBase64.replace(/^data:image\/\w+;base64,/, ""),
        mimeType: img.mimeType || "image/jpeg"
      }
    }));

    const result = await model.generateContent([
      prompt,
      ...imageParts
    ]);

    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      return NextResponse.json({
        success: false,
        isReadable: false,
        errorMessage: "AI 판독 응답 형식이 올바르지 않습니다. 다시 시도해 주세요."
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.isReadable) {
      return NextResponse.json({
        success: false,
        isReadable: false,
        errorMessage: parsed.errorMessage || "이미지의 글자를 판독하기 어렵습니다. 선명하게 다시 촬영해 주세요."
      });
    }

    return NextResponse.json({
      success: true,
      isReadable: true,
      isFilled: parsed.isFilled ?? (parsed.checkedItems?.length > 0),
      checkedItems: parsed.checkedItems || [],
      summary: parsed.summary || `총 ${selectedImages.length}장의 사진에서 판독이 완료되었습니다.`
    });

  } catch (error: any) {
    console.error("Survey analysis error:", error);
    return NextResponse.json({
      success: false,
      isReadable: false,
      errorMessage: "AI 이미지 분석 도중 오류가 발생했습니다: " + (error?.message || "알 수 없는 오류")
    }, { status: 500 });
  }
}
