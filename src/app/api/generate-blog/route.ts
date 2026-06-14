import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';

// Vercel 환경에서 타임아웃을 최대화 (Pro: 300초, Hobby: 60초)
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'dummy_key_for_build' });

    const { keyword } = await req.json();
    if (!keyword) {
      return NextResponse.json({ message: 'Keyword is required' }, { status: 400 });
    }

    // STEP 1: 마크다운 본문 및 이미지 프롬프트 추출을 위한 시스템 프롬프트 주입
    const textResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `당신은 대전 '바른한의원 대전본점'의 대표 원장입니다. 탈모, 성장, 성조숙증, 여성질환, 피부리프팅, 비염, 진맥, 한약, 황제공진단, 근골격계 질환 전문 한의사 모드로 답변하세요. 보건복지부령을 준수하며, 매선침이나 정안침은 절대 언급 금지입니다. 
          반드시 응답은 아래 구조화된 JSON 형태로만 출력하세요. 
          {
            "title": "블로그 제목",
            "content": "여기에 3000자 분량의 정성스러운 마크다운 포맷팅 본문을 작성하세요. 중간중간 이미지 삽입 위치에 [IMAGE_PLACEHOLDER_1]부터 [IMAGE_PLACEHOLDER_6]까지 태그를 심어두세요.",
            "imagePrompts": [
              "Thumbnail: 영문 이미지 생성 프롬프트 1",
              "Exercise 1: 영문 이미지 생성 프롬프트 2",
              "Exercise 2: 영문 이미지 생성 프롬프트 3",
              "Exercise 3: 영문 이미지 생성 프롬프트 4",
              "Food: 영문 이미지 생성 프롬프트 5",
              "Story: 영문 이미지 생성 프롬프트 6"
            ]
          }`
        },
        {
          role: 'user',
          content: `타겟 키워드는 [${keyword}] 입니다. 3050 여성 및 맘카페 회원을 타겟으로 블로그 포스팅과 이미지용 프롬프트 6개를 생성해줘.`
        }
      ],
      response_format: { type: "json_object" }
    });

    const contentStr = textResponse.choices[0].message.content || '{}';
    const blogData = JSON.parse(contentStr);
    let finalContent = blogData.content;
    const imageUrls = [];

    // STEP 2: 순차적 이미지 생성 루프
    const imagePrompts = blogData.imagePrompts || [];
    for (let i = 0; i < imagePrompts.length; i++) {
      try {
        const imageResponse = await openai.images.generate({
          model: "dall-e-3",
          prompt: `${imagePrompts[i]}, photorealistic, 8k, warm lighting, high quality photography style`,
          n: 1,
          size: "1024x1024",
        });

        const generatedImageUrl = imageResponse.data[0].url;
        imageUrls.push(generatedImageUrl);

        // 본문의 플레이스홀더를 실제 생성된 이미지 URL 마크다운 태그로 치환
        finalContent = finalContent.replace(
          `[IMAGE_PLACEHOLDER_${i + 1}]`,
          `\n\n![바른한의원 이미지 ${i + 1}](${generatedImageUrl})\n\n`
        );
        
        // API 속도 제한(Rate Limit) 방지를 위해 1.5초 간격 딜레이 휴식
        await new Promise((resolve) => setTimeout(resolve, 1500));

      } catch (imgError) {
        console.error(`${i + 1}번째 이미지 생성 실패, 대체 플레이스홀더 유지:`, imgError);
        finalContent = finalContent.replace(`[IMAGE_PLACEHOLDER_${i + 1}]`, `\n*(이미지 생성 오류)*\n`);
      }
    }

    return NextResponse.json({
      success: true,
      title: blogData.title,
      fullBody: finalContent,
      images: imageUrls
    });

  } catch (error) {
    console.error('블로그 자동 파이프라인 에러:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
