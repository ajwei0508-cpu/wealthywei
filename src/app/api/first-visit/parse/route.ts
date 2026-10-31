import { NextRequest, NextResponse } from "next/server";
import { verifyFirstVisitAccess } from "@/lib/firstVisitServerAuth";
import { model } from "@/lib/gemini";
import { AiColumnMappingHint } from "@/lib/firstVisitEngine";

export async function POST(req: NextRequest) {
  const auth = await verifyFirstVisitAccess(null);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const headers: string[] = Array.isArray(body.headers) ? body.headers : [];
    const sampleRows: any[][] = Array.isArray(body.sampleRows) ? body.sampleRows.slice(0, 12) : [];

    if (headers.length === 0) {
      return NextResponse.json({ hint: {} as AiColumnMappingHint });
    }

    // 개인정보 최소화를 위해 샘플에서 성명/주민번호/전화번호 패턴 마스킹
    const maskedSample = sampleRows.map((row) =>
      (row || []).map((cell) => {
        const s = String(cell ?? "").trim();
        if (/^\d{6}-?[1-8]\d{6}$/.test(s)) return s.slice(0, 8) + "******";
        if (/^01[016789]-?\d{3,4}-?\d{4}$/.test(s)) return "010-****-****";
        return s.slice(0, 60);
      })
    );

    const indexedHeaders = headers.map((h, i) => `[${i}] "${h}"`).join(", ");

    const prompt = `
당신은 대한민국 한의원 전자의무기록(EMR: 한차트, 오케이차트, 한의사랑, 동의보감, 이지스 등) 데이터 구조 분석 전문가입니다.
업로드된 일일 환자 리스트의 열(헤더) 목록과 샘플 행을 분석하여, 표준 초진 시트(19개 열) 및 보조 식별키에 정확히 대응되는 열 번호(0부터 시작하는 인덱스 배열)와 용어 정규화 사전을 JSON으로 반환하세요.

[업로드 파일 헤더 목록]
${indexedHeaders}

[상위 샘플 데이터 행 (최대 12행)]
${JSON.stringify(maskedSample, null, 2)}

[매핑 규칙 - 매우 중요]
1. 파일에 실제로 존재하는 항목만 매핑하세요. 파일에 해당 의미의 열이 없다면 반드시 빈 배열 []로 두어야 합니다 (억지로 다른 열을 연결하지 마세요!).
2. 각 표준 키의 의미:
   - chartNo: 차트번호/등록번호/병록번호/환자번호
   - phone: 휴대폰/연락처/전화번호
   - birthOrRrn: 생년월일/주민등록번호 (나이 계산 보조용)
   - visitDate: 진료일/수진일/내원일/접수일/일자 (단, 다음예약일이나 생년월일 제외)
   - patientName: 환자명/수진자명/성명/이름 (담당원장/소개자 제외)
   - age: 나이/만나이/연령/성별나이
   - visitType: 초진/재초진/재진/신환/구환 구분 열
   - insuranceType: 환자구분/보험유형/급여구분/종별/자격 (건보, 자보, 비급여/일반 등)
   - treatmentDetail: 주소증/상병명/진료내역/치료내역/약침/추나/첩약/한약 관련 열들 (복수 열 가능)
   - nextReservation: 다음 진료 예약 유무 또는 차기 예약일자 열
   - firstVisitDate: 1회 초진일 전용 열이 따로 있는 경우만 지정
   - secondVisitDate: 2회 재내원일 전용 열이 따로 있는 경우만 지정
   - thirdVisitDate: 3회 재내원일 전용 열이 따로 있는 경우만 지정
   - visitRoute: 내원경로/방문경로/유입경로/소개자
   - nonCoveredList: 비급여 품목/목록 내역 열 (단순 금액 합계 열은 제외, 품목명이 적힌 열만)
   - nonCoveredCount: 비급여 목록별 판매 건수 열
   - immediatePaymentCount: 상담후 즉시 결제 건수 열
   - herbalMonthlySummary: 한약 월총 건수 및 처방목적 열
   - packageCount: 패키지 건수 열
   - herbalFollowupPayment: 1제 복용후 추가결제(연복유무) 열
   - packageRenewal: 패키지 종료후 연장 결제유무 열
   - delayedPaymentWithinMonth: 상담후 1달이내 결제 건수 열
3. valueNormalizations에는 샘플에서 발견된 특수 단어가 있을 때만 매핑하세요:
   - visitTypeMap: 값을 "초진" | "재초진" | "재진" | "" 중 하나로 매핑
   - insuranceTypeMap: 값을 "건보" | "자보" | "비급여" | "" 중 하나로 매핑
   - reservationMap: 값을 "유" | "무" | "" 중 하나로 매핑

반드시 아래 순수 JSON 형식으로만 응답하세요:
{
  "detectedEmr": "감지된 차트 프로그램명 (예: 오케이차트, 한차트, 한의사랑, 동의보감, 자체 시트 등)",
  "columnMap": {
    "chartNo": [],
    "phone": [],
    "birthOrRrn": [],
    "visitDate": [],
    "patientName": [],
    "age": [],
    "visitType": [],
    "insuranceType": [],
    "treatmentDetail": [],
    "nextReservation": [],
    "firstVisitDate": [],
    "secondVisitDate": [],
    "thirdVisitDate": [],
    "visitRoute": [],
    "nonCoveredList": [],
    "nonCoveredCount": [],
    "immediatePaymentCount": [],
    "herbalMonthlySummary": [],
    "packageCount": [],
    "herbalFollowupPayment": [],
    "packageRenewal": [],
    "delayedPaymentWithinMonth": []
  },
  "valueNormalizations": {
    "visitTypeMap": {},
    "insuranceTypeMap": {},
    "reservationMap": {}
  }
}
`;

    try {
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      });
      const text = result.response.text();
      const parsed = JSON.parse(text) as AiColumnMappingHint;
      return NextResponse.json({ hint: parsed });
    } catch (aiErr) {
      // AI 한도/네트워크 이슈 시 규칙 기반 파서 단독으로도 완벽 동작하도록 빈 힌트 반환
      console.warn("AI Column Mapping fallback to deterministic engine:", aiErr);
      return NextResponse.json({ hint: {} as AiColumnMappingHint });
    }
  } catch (err: any) {
    console.error("FirstVisit Parse Route Error:", err);
    return NextResponse.json({ hint: {} as AiColumnMappingHint });
  }
}
