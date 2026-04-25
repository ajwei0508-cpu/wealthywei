"use client";

import React, { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  ChevronLeft,
  Check,
  User,
  Stethoscope,
  ClipboardList,
  BarChart3,
  Users,
  Shield,
  Upload,
  X,
  Sparkles,
  Star,
  Target,
  Zap
} from "lucide-react";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────
type SurveyData = {
  ch1: {
    name: string; clinic: string; degree: string; specialist: string; media: string;
    vision: string; mission: string; goal: string; mbti: string;
  };
  ch2: {
    whyCome: string; whyLeave: string; patientFlow: string; consultScript: string;
  };
  ch3: {
    charting: { disease: string; approach: string; billing: string }[];
    chuna: string; herbalAcupoint: string; herbMedicine: string;
    equipment: string;
  };
  ch4: {
    revenueGoal: string; profitGoal: string;
    expenses: { item: string; amount: string }[];
    dataMethod: string;
  };
  ch5: {
    staff: { role: string; salary: string; welfare: string; incentive: string }[];
    philosophy: string; channels: string;
    images: File[];
  };
  ch6: {
    meetingSchedule: string;
    safetyItems: Record<string, boolean>;
    uploadedFiles: File[];
  };
};

const MBTI_LIST = [
  "INTJ","INTP","ENTJ","ENTP",
  "INFJ","INFP","ENFJ","ENFP",
  "ISTJ","ISFJ","ESTJ","ESFJ",
  "ISTP","ISFP","ESTP","ESFP"
];

const SAFETY_ITEMS = [
  "화상 대응 매뉴얼", "낙상 예방 및 대응", "아나필락시스 쇼크",
  "침 부작용 대응", "한약 알레르기 대응", "응급 CPR 교육",
  "감염병 대응 SOP", "화재 대피 훈련", "의료 폐기물 처리",
  "전기/가스 안전 점검", "소독 및 위생 관리", "직원 성희롱 예방",
  "환자 개인정보 보호", "의료분쟁 대응 절차", "야간 긴급 연락망",
  "특이 체질 환자 관리", "외상 응급 처치", "정신건강 위기 대응"
];

const CHAPTER_CONFIG = [
  { id: 1, icon: User,          title: "원장님 브랜딩",       subtitle: "Who You Are",          color: "from-blue-500 to-indigo-600" },
  { id: 2, icon: Stethoscope,   title: "진료 시스템 & 동선",  subtitle: "Clinic UX",             color: "from-cyan-500 to-blue-600" },
  { id: 3, icon: ClipboardList, title: "임상 루틴 & 처방",    subtitle: "Clinical Routine",      color: "from-indigo-500 to-purple-600" },
  { id: 4, icon: BarChart3,     title: "지표와 경영",          subtitle: "Numbers & Goals",      color: "from-violet-500 to-indigo-600" },
  { id: 5, icon: Users,         title: "팀 빌딩 & 조직 문화", subtitle: "HR Management",         color: "from-blue-600 to-cyan-500" },
  { id: 6, icon: Shield,        title: "위험 관리 & 매뉴얼",  subtitle: "Safety & Education",   color: "from-slate-700 to-blue-800" },
];

const encouragements = [
  "",
  "훌륭합니다! 브랜딩을 완성하셨습니다. 다음 단계로 넘어가 볼까요?",
  "핵심을 잘 정리하셨습니다! 이미 절반을 오셨어요 💪",
  "임상 루틴까지 완성! 거의 다 왔습니다! 🔥",
  "숫자로 보니 더 명확해지죠? 이제 팀을 살펴볼 차례입니다.",
  "조직이 완성되었습니다! 마지막 관문만 남았어요 🏆",
];

const initialData: SurveyData = {
  ch1: { name: "", clinic: "", degree: "", specialist: "", media: "", vision: "", mission: "", goal: "", mbti: "" },
  ch2: { whyCome: "", whyLeave: "", patientFlow: "", consultScript: "" },
  ch3: {
    charting: [
      { disease: "", approach: "", billing: "" },
      { disease: "", approach: "", billing: "" },
      { disease: "", approach: "", billing: "" },
    ],
    chuna: "", herbalAcupoint: "", herbMedicine: "", equipment: ""
  },
  ch4: {
    revenueGoal: "", profitGoal: "",
    expenses: [
      { item: "임대료", amount: "" }, { item: "인건비", amount: "" },
      { item: "재료비", amount: "" }, { item: "마케팅비", amount: "" },
      { item: "기타", amount: "" },
    ],
    dataMethod: ""
  },
  ch5: {
    staff: [
      { role: "", salary: "", welfare: "", incentive: "" },
      { role: "", salary: "", welfare: "", incentive: "" },
    ],
    philosophy: "", channels: "", images: []
  },
  ch6: {
    meetingSchedule: "",
    safetyItems: Object.fromEntries(SAFETY_ITEMS.map(item => [item, false])),
    uploadedFiles: []
  }
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const Label = ({ children, hint }: { children: React.ReactNode; hint?: string }) => (
  <div className="mb-2">
    <label className="block text-sm font-bold text-slate-700">{children}</label>
    {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
  </div>
);

const Input = ({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) => (
  <input
    type={type}
    value={value}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
  />
);

const Textarea = ({ value, onChange, placeholder, rows = 4 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) => (
  <textarea
    rows={rows}
    value={value}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all resize-none"
  />
);

const SectionCard = ({ title, children, accent = "blue" }: {
  title: string; children: React.ReactNode; accent?: string;
}) => (
  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
    <div className={`px-8 py-5 bg-gradient-to-r ${accent === "blue" ? "from-blue-50 to-indigo-50" : "from-slate-50 to-blue-50"} border-b border-slate-100`}>
      <h3 className="font-bold text-slate-800 text-base">{title}</h3>
    </div>
    <div className="p-8 space-y-6">{children}</div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SurveyPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<SurveyData>(initialData);
  const [isDragging, setIsDragging] = useState(false);

  const progress = ((step - 1) / 5) * 100;
  const chapterConfig = CHAPTER_CONFIG[step - 1];

  const updateCh1 = (field: keyof SurveyData["ch1"], val: string) =>
    setData(d => ({ ...d, ch1: { ...d.ch1, [field]: val } }));
  const updateCh2 = (field: keyof SurveyData["ch2"], val: string) =>
    setData(d => ({ ...d, ch2: { ...d.ch2, [field]: val } }));
  const updateCh3 = (field: keyof Omit<SurveyData["ch3"], "charting">, val: string) =>
    setData(d => ({ ...d, ch3: { ...d.ch3, [field]: val } }));
  const updateCh4 = (field: keyof Omit<SurveyData["ch4"], "expenses">, val: string) =>
    setData(d => ({ ...d, ch4: { ...d.ch4, [field]: val } }));
  const updateCh5 = (field: keyof Omit<SurveyData["ch5"], "staff" | "images">, val: string) =>
    setData(d => ({ ...d, ch5: { ...d.ch5, [field]: val } }));

  const handleSaveNext = () => {
    toast.success("임시 저장 완료! 다음 챕터로 이동합니다.", { icon: "✅" });
    if (step < 6) {
      setStep(s => s + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      toast.success("🎉 모든 챕터 작성이 완료되었습니다!", { duration: 4000 });
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>, chapter: 5 | 6) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (chapter === 5) {
      setData(d => ({ ...d, ch5: { ...d.ch5, images: [...d.ch5.images, ...files] } }));
    } else {
      setData(d => ({ ...d, ch6: { ...d.ch6, uploadedFiles: [...d.ch6.uploadedFiles, ...files] } }));
    }
    toast.success(`${files.length}개 파일이 업로드되었습니다.`);
  }, []);

  // ─── Chapter Renders ──────────────────────────────────────────────────────
  const renderChapter1 = () => (
    <div className="space-y-6">
      <SectionCard title="📋 기본 정보">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <Label hint="예시: 이상훈 원장">원장님 성함</Label>
            <Input value={data.ch1.name} onChange={v => updateCh1("name", v)} placeholder="홍길동" />
          </div>
          <div>
            <Label hint="예시: 바른한의원 강남점">병원 이름</Label>
            <Input value={data.ch1.clinic} onChange={v => updateCh1("clinic", v)} placeholder="○○한의원" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <Label hint="예시: 한의학박사, 경희대 한의대">학위 및 출신학교</Label>
            <Input value={data.ch1.degree} onChange={v => updateCh1("degree", v)} placeholder="경희대 한의대 졸업" />
          </div>
          <div>
            <Label hint="예시: 침구과 전문의, 사상체질과">전문의 자격</Label>
            <Input value={data.ch1.specialist} onChange={v => updateCh1("specialist", v)} placeholder="침구과 전문의" />
          </div>
          <div>
            <Label hint="예시: KBS 생로병사의 비밀 출연">방송/언론 경력</Label>
            <Input value={data.ch1.media} onChange={v => updateCh1("media", v)} placeholder="방송 출연 또는 기고 이력" />
          </div>
        </div>
        <div>
          <Label hint="MBTI는 원장님의 강점과 소통 방식을 이해하는 데 활용됩니다">MBTI 유형</Label>
          <select
            value={data.ch1.mbti}
            onChange={e => updateCh1("mbti", e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
          >
            <option value="">MBTI 유형 선택</option>
            {MBTI_LIST.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </SectionCard>

      <SectionCard title="🌟 비전 & 철학" accent="slate">
        <div>
          <Label hint="예시: 한국에서 가장 신뢰받는 근골격계 전문 한의원">병원 비전 (Vision)</Label>
          <Textarea value={data.ch1.vision} onChange={v => updateCh1("vision", v)} placeholder="10년 후 이 병원이 어떤 모습이길 바라시나요?" rows={3} />
        </div>
        <div>
          <Label hint="예시: 환자의 통증 없는 일상 회복을 사명으로 삼습니다">미션 (Mission)</Label>
          <Textarea value={data.ch1.mission} onChange={v => updateCh1("mission", v)} placeholder="이 병원이 존재하는 이유는 무엇인가요?" rows={3} />
        </div>
        <div>
          <Label hint="예시: 6개월 내 월매출 5000만 원 달성, 직원 1명 추가 채용">올해의 핵심 목표</Label>
          <Textarea value={data.ch1.goal} onChange={v => updateCh1("goal", v)} placeholder="올해 안에 반드시 이루고 싶은 목표를 구체적으로 적어주세요." rows={3} />
        </div>
      </SectionCard>
    </div>
  );

  const renderChapter2 = () => (
    <div className="space-y-6">
      <SectionCard title="🔍 환자 유입 & 이탈 분석">
        <div>
          <Label hint="예시: 네이버 플레이스, 주변 직장인 점심 시간대, 지인 소개">환자들이 이 병원을 선택하는 이유</Label>
          <Textarea value={data.ch2.whyCome} onChange={v => updateCh2("whyCome", v)} placeholder="환자들이 우리 병원을 찾아오는 가장 큰 이유는 무엇이라고 생각하시나요?" rows={4} />
        </div>
        <div>
          <Label hint="예시: 주차 공간 부족, 대기 시간 길다, 한약 가격 부담">환자들이 재방문하지 않는 이유</Label>
          <Textarea value={data.ch2.whyLeave} onChange={v => updateCh2("whyLeave", v)} placeholder="재방문을 포기하게 만드는 요인이 무엇이라 생각하시나요?" rows={4} />
        </div>
      </SectionCard>
      <SectionCard title="🏥 환자 동선 & 상담 루틴" accent="slate">
        <div>
          <Label hint="예시: 접수 → 대기(5분) → 초진문진 → 진료실 입장 → 침 처치 → 물리치료 → 수납 → 예약">초진부터 수납까지의 환자 동선</Label>
          <Textarea value={data.ch2.patientFlow} onChange={v => updateCh2("patientFlow", v)} placeholder="환자가 병원 문을 열고 들어와서 나가기까지의 전체 흐름을 단계별로 적어주세요." rows={5} />
        </div>
        <div>
          <Label hint="예시: 디스크 환자에게 '이 치료는 3주 집중 치료 후 2주 유지 치료로 통증을 잡는 방식입니다'라고 설명">주요 질환별 상담 멘트 및 루틴</Label>
          <Textarea value={data.ch2.consultScript} onChange={v => updateCh2("consultScript", v)} placeholder="자주 오시는 환자 유형에 대해 어떻게 설명하고 상담하시나요? 실제 사용하시는 멘트를 적어주세요." rows={5} />
        </div>
      </SectionCard>
    </div>
  );

  const renderChapter3 = () => (
    <div className="space-y-6">
      <SectionCard title="📝 차팅 & 청구 사례 3가지">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-3 pr-4 font-bold text-slate-500 text-xs w-1/3">대표 질환</th>
                <th className="text-left py-3 pr-4 font-bold text-slate-500 text-xs w-1/3">치료 접근법</th>
                <th className="text-left py-3 font-bold text-slate-500 text-xs w-1/3">주요 청구 항목</th>
              </tr>
            </thead>
            <tbody className="space-y-2">
              {data.ch3.charting.map((row, idx) => (
                <tr key={idx} className="border-b border-slate-50">
                  <td className="py-2 pr-3">
                    <Input value={row.disease} onChange={v => {
                      const arr = [...data.ch3.charting];
                      arr[idx] = { ...arr[idx], disease: v };
                      setData(d => ({ ...d, ch3: { ...d.ch3, charting: arr } }));
                    }} placeholder="예: 요추 디스크" />
                  </td>
                  <td className="py-2 pr-3">
                    <Input value={row.approach} onChange={v => {
                      const arr = [...data.ch3.charting];
                      arr[idx] = { ...arr[idx], approach: v };
                      setData(d => ({ ...d, ch3: { ...d.ch3, charting: arr } }));
                    }} placeholder="예: 침 + 추나 + 약침" />
                  </td>
                  <td className="py-2">
                    <Input value={row.billing} onChange={v => {
                      const arr = [...data.ch3.charting];
                      arr[idx] = { ...arr[idx], billing: v };
                      setData(d => ({ ...d, ch3: { ...d.ch3, charting: arr } }));
                    }} placeholder="예: 침술, 추나, 한방물리치료" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
      <SectionCard title="💉 치료 설명 방식" accent="slate">
        <div>
          <Label hint="예시: 추나는 뼈를 맞추는 게 아니라 근육과 인대의 긴장을 풀어 척추 정렬을 돕는 치료입니다">추나치료 권유 & 설명 방식</Label>
          <Textarea value={data.ch3.chuna} onChange={v => updateCh3("chuna", v)} placeholder="추나치료를 어떻게 환자에게 소개하시나요?" rows={3} />
        </div>
        <div>
          <Label hint="예시: 약침은 순수 한약 성분을 정제하여 경혈에 직접 주입해 통증 부위에 집중 작용합니다">약침 권유 & 설명 방식</Label>
          <Textarea value={data.ch3.herbalAcupoint} onChange={v => updateCh3("herbalAcupoint", v)} placeholder="약침치료를 어떻게 권유하시나요?" rows={3} />
        </div>
        <div>
          <Label hint="예시: 체질에 맞는 한약을 통해 몸의 근본을 개선하여 재발을 방지합니다">한약 권유 & 설명 방식</Label>
          <Textarea value={data.ch3.herbMedicine} onChange={v => updateCh3("herbMedicine", v)} placeholder="한약 처방 시 환자에게 어떻게 설명하시나요?" rows={3} />
        </div>
        <div>
          <Label hint="예시: 간섭파(ICT), 경피전기신경자극기(TENS), 견인치료기, 온열치료기">보유 물리치료 기기 목록</Label>
          <Textarea value={data.ch3.equipment} onChange={v => updateCh3("equipment", v)} placeholder="병원에 보유하고 있는 물리치료 기기를 모두 나열해 주세요." rows={3} />
        </div>
      </SectionCard>
    </div>
  );

  const renderChapter4 = () => (
    <div className="space-y-6">
      <SectionCard title="🎯 경영 목표 수치">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <Label hint="예시: 5,000만 원 / 월">희망 월 매출 목표</Label>
            <Input value={data.ch4.revenueGoal} onChange={v => updateCh4("revenueGoal", v)} placeholder="월 ______ 만 원" />
          </div>
          <div>
            <Label hint="예시: 2,500만 원 / 월">희망 월 순이익 목표</Label>
            <Input value={data.ch4.profitGoal} onChange={v => updateCh4("profitGoal", v)} placeholder="월 ______ 만 원" />
          </div>
        </div>
      </SectionCard>
      <SectionCard title="📊 월 경비 내역" accent="slate">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-3 pr-4 font-bold text-slate-500 text-xs w-1/2">경비 항목</th>
                <th className="text-left py-3 font-bold text-slate-500 text-xs w-1/2">월 금액 (만 원)</th>
              </tr>
            </thead>
            <tbody>
              {data.ch4.expenses.map((row, idx) => (
                <tr key={idx} className="border-b border-slate-50">
                  <td className="py-2 pr-3">
                    <Input value={row.item} onChange={v => {
                      const arr = [...data.ch4.expenses];
                      arr[idx] = { ...arr[idx], item: v };
                      setData(d => ({ ...d, ch4: { ...d.ch4, expenses: arr } }));
                    }} placeholder="경비 항목" />
                  </td>
                  <td className="py-2">
                    <Input value={row.amount} onChange={v => {
                      const arr = [...data.ch4.expenses];
                      arr[idx] = { ...arr[idx], amount: v };
                      setData(d => ({ ...d, ch4: { ...d.ch4, expenses: arr } }));
                    }} placeholder="0" type="number" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={() => setData(d => ({ ...d, ch4: { ...d.ch4, expenses: [...d.ch4.expenses, { item: "", amount: "" }] } }))}
            className="mt-3 text-xs text-blue-500 hover:text-blue-700 font-bold flex items-center gap-1 transition-colors"
          >
            + 항목 추가
          </button>
        </div>
      </SectionCard>
      <SectionCard title="📈 지표 관리 방식">
        <Label hint="예시: 매달 말일 EMR에서 리포트 추출 후 엑셀로 정리, 원장 직접 확인">현재 어떻게 병원 지표를 관찰하고 관리하시나요?</Label>
        <Textarea value={data.ch4.dataMethod} onChange={v => updateCh4("dataMethod", v)} placeholder="매출, 환자 수, 재방문율 등을 어떤 방식으로 확인하고 계신지 적어주세요." rows={4} />
      </SectionCard>
    </div>
  );

  const renderChapter5 = () => (
    <div className="space-y-6">
      <SectionCard title="👥 직원 구성">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-3 pr-3 font-bold text-slate-500 text-xs">직책</th>
                <th className="text-left py-3 pr-3 font-bold text-slate-500 text-xs">연봉 (만 원)</th>
                <th className="text-left py-3 pr-3 font-bold text-slate-500 text-xs">복지 혜택</th>
                <th className="text-left py-3 font-bold text-slate-500 text-xs">인센티브</th>
              </tr>
            </thead>
            <tbody>
              {data.ch5.staff.map((row, idx) => (
                <tr key={idx} className="border-b border-slate-50">
                  <td className="py-2 pr-2"><Input value={row.role} onChange={v => {
                    const arr = [...data.ch5.staff];
                    arr[idx] = { ...arr[idx], role: v };
                    setData(d => ({ ...d, ch5: { ...d.ch5, staff: arr } }));
                  }} placeholder="예: 간호조무사" /></td>
                  <td className="py-2 pr-2"><Input value={row.salary} onChange={v => {
                    const arr = [...data.ch5.staff];
                    arr[idx] = { ...arr[idx], salary: v };
                    setData(d => ({ ...d, ch5: { ...d.ch5, staff: arr } }));
                  }} placeholder="2,800" /></td>
                  <td className="py-2 pr-2"><Input value={row.welfare} onChange={v => {
                    const arr = [...data.ch5.staff];
                    arr[idx] = { ...arr[idx], welfare: v };
                    setData(d => ({ ...d, ch5: { ...d.ch5, staff: arr } }));
                  }} placeholder="4대보험, 식대" /></td>
                  <td className="py-2"><Input value={row.incentive} onChange={v => {
                    const arr = [...data.ch5.staff];
                    arr[idx] = { ...arr[idx], incentive: v };
                    setData(d => ({ ...d, ch5: { ...d.ch5, staff: arr } }));
                  }} placeholder="없음 / 성과급" /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={() => setData(d => ({ ...d, ch5: { ...d.ch5, staff: [...d.ch5.staff, { role: "", salary: "", welfare: "", incentive: "" }] } }))}
            className="mt-3 text-xs text-blue-500 hover:text-blue-700 font-bold flex items-center gap-1 transition-colors"
          >
            + 직원 추가
          </button>
        </div>
      </SectionCard>
      <SectionCard title="🌱 조직 문화 & 소통" accent="slate">
        <div>
          <Label hint="예시: 직원들이 원장처럼 생각하고 행동할 수 있도록 자율과 책임을 동시에 부여합니다">관리 철학 & 꿈꾸는 조직의 모습</Label>
          <Textarea value={data.ch5.philosophy} onChange={v => updateCh5("philosophy", v)} placeholder="어떤 조직 문화를 만들고 싶으신가요? 직원을 어떻게 리드하시나요?" rows={4} />
        </div>
        <div>
          <Label hint="예시: 카카오톡 단체방, 주 1회 스탠딩 미팅, 노션으로 업무 공유">소통 채널 및 사용 협업 도구</Label>
          <Input value={data.ch5.channels} onChange={v => updateCh5("channels", v)} placeholder="어떤 방법으로 팀과 소통하시나요?" />
        </div>

        {/* Image Upload Zone */}
        <div>
          <Label hint="단체방 캡처, 홍보물, 직원 교육 자료 등">자료 업로드 (이미지/파일)</Label>
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={e => handleDrop(e, 5)}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${isDragging ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:border-blue-300 hover:bg-blue-50/30"}`}
          >
            <Upload className="mx-auto mb-3 text-slate-300" size={32} />
            <p className="text-sm font-bold text-slate-400">파일을 여기에 드래그하거나 클릭하여 업로드하세요</p>
            <p className="text-xs text-slate-300 mt-1">이미지, PDF, 문서 파일 가능</p>
            {data.ch5.images.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {data.ch5.images.map((f, i) => (
                  <span key={i} className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium flex items-center gap-1">
                    {f.name}
                    <button onClick={() => setData(d => ({ ...d, ch5: { ...d.ch5, images: d.ch5.images.filter((_, fi) => fi !== i) } }))}><X size={10} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  );

  const renderChapter6 = () => (
    <div className="space-y-6">
      <SectionCard title="📅 교육 & 회의 시스템">
        <Label hint="예시: 매주 월요일 오전 8:30 스탠딩 미팅 10분, 월 1회 정기 면담">회의 및 직원 면담 일정</Label>
        <Textarea value={data.ch6.meetingSchedule} onChange={v => setData(d => ({ ...d, ch6: { ...d.ch6, meetingSchedule: v } }))} placeholder="어떤 주기로, 어떤 방식으로 직원 교육 및 면담을 진행하시나요?" rows={4} />
      </SectionCard>

      <SectionCard title="🛡️ 비상 대응 매뉴얼 체크리스트 (18항목)" accent="slate">
        <p className="text-xs text-slate-400 mb-4 font-medium">각 항목에 대해 병원 내 대응 매뉴얼 또는 교육 실시 여부를 체크해주세요.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SAFETY_ITEMS.map((item) => {
            const isChecked = data.ch6.safetyItems[item];
            return (
              <button
                key={item}
                onClick={() => setData(d => ({
                  ...d,
                  ch6: { ...d.ch6, safetyItems: { ...d.ch6.safetyItems, [item]: !isChecked } }
                }))}
                className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                  isChecked
                    ? "border-blue-400 bg-blue-50 text-blue-700"
                    : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
                }`}
              >
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-sm transition-all ${isChecked ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-300"}`}>
                  {isChecked ? "O" : "X"}
                </div>
                <span className="text-sm font-semibold">{item}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-4 p-4 bg-slate-50 rounded-2xl">
          <p className="text-xs text-slate-500 font-bold">
            현재 {Object.values(data.ch6.safetyItems).filter(Boolean).length} / {SAFETY_ITEMS.length} 항목 완비
          </p>
        </div>
      </SectionCard>

      <SectionCard title="📎 교육 자료 업로드">
        <div
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={e => handleDrop(e, 6)}
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${isDragging ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:border-blue-300 hover:bg-blue-50/30"}`}
        >
          <Upload className="mx-auto mb-3 text-slate-300" size={32} />
          <p className="text-sm font-bold text-slate-400">교육 자료, 안전 매뉴얼 파일을 업로드하세요</p>
          <p className="text-xs text-slate-300 mt-1">PDF, 이미지, 문서 파일 가능</p>
          {data.ch6.uploadedFiles.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {data.ch6.uploadedFiles.map((f, i) => (
                <span key={i} className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">{f.name}</span>
              ))}
            </div>
          )}
        </div>
      </SectionCard>

      {/* Final Message */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-10 text-center text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(59,130,246,0.15)_0%,_transparent_70%)]" />
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/20 border border-blue-400/30 rounded-full">
            <Sparkles size={14} className="text-blue-400" />
            <span className="text-xs font-black text-blue-300 uppercase tracking-widest">AI Powered Analysis</span>
          </div>
          <h3 className="text-2xl md:text-3xl font-black leading-tight">
            이 모든 답변은 AI 분석을 통해 <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
              원장님만을 위한 맞춤형 컨설팅 리포트
            </span>로<br />
            자동 변환됩니다.
          </h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            지금 입력하신 모든 정보는 바른컨설팅 AI 엔진이 분석하여 원장님의 병원에 최적화된 성장 전략을 도출하는 데 사용됩니다.
          </p>
          <div className="flex items-center justify-center gap-6 pt-2">
            <div className="flex items-center gap-2"><Star size={16} className="text-amber-400" /><span className="text-xs text-slate-300 font-bold">브랜딩 분석</span></div>
            <div className="flex items-center gap-2"><Target size={16} className="text-rose-400" /><span className="text-xs text-slate-300 font-bold">경영 목표</span></div>
            <div className="flex items-center gap-2"><Zap size={16} className="text-blue-400" /><span className="text-xs text-slate-300 font-bold">AI 맞춤 전략</span></div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep = () => {
    switch (step) {
      case 1: return renderChapter1();
      case 2: return renderChapter2();
      case 3: return renderChapter3();
      case 4: return renderChapter4();
      case 5: return renderChapter5();
      case 6: return renderChapter6();
    }
  };

  const Icon = chapterConfig.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-white">
      {/* Sticky Top Progress Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-slate-100 transition text-slate-400">
                <ChevronLeft size={18} />
              </button>
              <div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">바른컨설팅 정밀 진단 워크북</p>
                <h1 className="text-slate-900 font-black text-sm">Chapter {step} / 6 — {chapterConfig.title}</h1>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-bold">{Math.round(progress)}% 완료</p>
            </div>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${chapterConfig.color} rounded-full transition-all duration-700 ease-out`}
              style={{ width: `${Math.max(5, progress)}%` }}
            />
          </div>
          {/* Chapter pills */}
          <div className="flex items-center gap-1 mt-3 overflow-x-auto pb-1">
            {CHAPTER_CONFIG.map((ch) => {
              const ChIcon = ch.icon;
              return (
                <button
                  key={ch.id}
                  onClick={() => setStep(ch.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black whitespace-nowrap transition-all ${
                    step === ch.id
                      ? `bg-gradient-to-r ${ch.color} text-white shadow-md`
                      : step > ch.id
                        ? "bg-slate-100 text-slate-500"
                        : "bg-slate-50 text-slate-300"
                  }`}
                >
                  {step > ch.id ? <Check size={10} /> : <ChIcon size={10} />}
                  {ch.title}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Chapter Header */}
        <div className="mb-8 flex items-start gap-5">
          <div className={`p-4 bg-gradient-to-br ${chapterConfig.color} rounded-3xl shadow-lg shadow-blue-500/20 flex-shrink-0`}>
            <Icon size={32} className="text-white" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Chapter {step} • {chapterConfig.subtitle}</p>
            <h2 className="text-3xl font-black text-slate-900">{chapterConfig.title}</h2>
            {step > 1 && (
              <p className="mt-2 text-sm text-blue-600 font-semibold bg-blue-50 border border-blue-100 px-4 py-1.5 rounded-full inline-block">
                {encouragements[step - 1]}
              </p>
            )}
          </div>
        </div>

        {/* Chapter Form */}
        {renderStep()}

        {/* Navigation Buttons */}
        <div className={`flex items-center mt-10 pt-8 border-t border-slate-100 ${step === 1 ? "justify-end" : "justify-between"}`}>
          {step > 1 && (
            <button
              onClick={() => { setStep(s => s - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all"
            >
              <ChevronLeft size={16} />
              이전 챕터
            </button>
          )}
          <button
            onClick={handleSaveNext}
            className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-bold text-sm text-white shadow-lg transition-all hover:opacity-90 active:scale-95 bg-gradient-to-r ${chapterConfig.color}`}
          >
            {step < 6 ? (
              <>임시 저장 후 다음 <ChevronRight size={16} /></>
            ) : (
              <>✨ 진단 완료 및 분석 요청 <Check size={16} /></>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}
