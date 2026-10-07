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

    const prompt = `
당신은 한의학 전문 한열허실(寒熱虛實) 설문지 및 환자 문진표 정밀 판독 AI입니다.
원장님이 업로드한 설문지/차트 사진(총 ${selectedImages.length}장, 최대 3장)을 정밀하게 분석하여 환자가 체크(V, O, 밑줄, 형광펜, 동그라미 등)한 증상 항목을 정확히 찾아내야 합니다.

[다중 이미지 판독 안내]
- 제공된 ${selectedImages.length}장의 사진은 동일 환자의 앞/뒷면 또는 분할 촬영된 설문지 페이지들입니다.
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

[🚨 가장 중요한 판독 원칙: 부분 판독 및 판독 불가 영역 붉은 표시]
1. [판독 가능한 항목 최대한 추출]:
   - 사진 전체를 멈추지 마십시오. 글씨나 체크 표시가 보이는 부분은 판독할 수 있는 데까지 모두 판독하여 checkedItems에 추가하십시오.
   - 단 한두 개 항목이라도 식별되면 절대로 실패로 처리하지 말고 판독 결과를 반환하십시오.

2. [판독 불가 영역 위치 보고 (unreadableRegions)]:
   - 빛 반사, 그림자, 초점 흐림, 손가락 가림, 접힘 등으로 특정 영역의 글자나 체크 여부를 명확히 식별하기 어려운 경우, 해당 영역의 좌표와 사유를 unreadableRegions 배열에 반드시 기록하십시오.
   - imageIndex: 해당 영역이 위치한 사진의 순번 (0부터 시작: 0=첫 번째 사진, 1=두 번째 사진, 2=세 번째 사진)
   - box2d: [ymin, xmin, ymax, xmax] (사진 전체를 0~1000 기준으로 정규화한 사각형 좌표: ymin=위, xmin=왼쪽, ymax=아래, xmax=오른쪽)
   - label: 판독 불가 유형 (예: "빛 반사 영역", "초점 흐림 영역", "그림자 가림", "식별 불가")
   - reason: 구체적인 판독 불가 사유 및 추정되는 영향 항목 (예: "조명 반사로 인해 하단 소변/대변 항목 식별 어려움")
   - 만약 특정 사진 1장이 완전히 심하게 흔들려 전체 판독이 불가능한 경우, 해당 사진의 imageIndex에 box2d: [50, 50, 950, 950]으로 지정하고 다른 사진들은 계속 판독하십시오.

3. [전면 중단(isReadable: false) 조건]:
   - 오직 업로드된 사진들이 한열허실 설문지가 전혀 아니거나(예: 동물, 음식, 풍경 등 무관한 사진), 모든 사진이 검은 화면이어서 단 하나의 증상도 판독할 수 없을 때만 isReadable: false로 응답하십시오.

4. [체크 없는 원본 빈 양식인 경우]:
   - 설문지는 식별되나 환자의 체크 표시가 전혀 없는 경우:
   => isReadable: true, isFilled: false, checkedItems: [], unreadableRegions: []

반드시 마크다운 백틱 없이 순수 JSON 형식으로만 응답하십시오:
{
  "isReadable": boolean,
  "isPartial": boolean,
  "isFilled": boolean,
  "errorMessage": string | null,
  "checkedItems": [
    {
      "category": "소화",
      "type": "한"
    }
  ],
  "unreadableRegions": [
    {
      "imageIndex": 0,
      "box2d": [ymin, xmin, ymax, xmax],
      "label": "빛 반사 영역",
      "reason": "강한 빛 반사로 인해 증상 항목 판독 불가"
    }
  ],
  "summary": "총 N개 증상 판독 완료 (M개 판독 불가 영역 감지)"
}
`;

    // Prepare image parts for Gemini
    const imageParts = selectedImages.map((img) => ({
      inlineData: {
        data: img.imageBase64.replace(/^data:image\/\w+;base64,/, ""),
        mimeType: img.mimeType || "image/jpeg"
      }
    }));

    // Try gemini-2.5-flash first, fallback to gemini-3.8-flash if needed
    let text = "";
    try {
      const model = genAI.getGenerativeModel(
        { model: "gemini-2.5-flash" }, 
        { apiVersion: "v1beta" }
      );
      const result = await model.generateContent([prompt, ...imageParts]);
      text = result.response.text();
    } catch (modelError: any) {
      console.warn("Primary model (gemini-2.5-flash) failed, trying gemini-3.8-flash:", modelError?.message);
      const fallbackModel = genAI.getGenerativeModel(
        { model: "gemini-3.8-flash" },
        { apiVersion: "v1beta" }
      );
      const fallbackResult = await fallbackModel.generateContent([prompt, ...imageParts]);
      text = fallbackResult.response.text();
    }

    const cleanText = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      return NextResponse.json({
        success: false,
        isReadable: false,
        errorMessage: "AI 판독 응답 형식을 파싱할 수 없습니다. 다시 시도해 주세요."
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // If completely unreadable and zero items checked
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
      errorMessage: "AI 이미지 분석 도중 오류가 발생했습니다: " + (error?.message || "알 수 없는 오류")
    }, { status: 500 });
  }
}
