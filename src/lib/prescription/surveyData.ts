export interface SymptomItem {
  id: string;
  category: string;
  cold: string;       // 한(寒)
  heat: string;       // 열(熱)
  deficiency: string; // 허(虛)
  excess: string;     // 실(實)
}

export type DiagnosisType = "한" | "열" | "허" | "실";

export const SYMPTOM_DATA: SymptomItem[] = [
  {
    id: "digestion",
    category: "소화",
    cold: "소화불량, 식욕부진, 팽만감, 따뜻한 음식 선호, 울렁거린다",
    heat: "식욕항진, 빨리 배고픔, 공복시 속쓰림, 구취",
    deficiency: "항상 소화불량, 피곤하면 소화 안 됨, 매핵기, 잘 더부룩하다",
    excess: "식후 위통, 트림, 가슴 답답함, 급체, 울렁거림"
  },
  {
    id: "appetite",
    category: "입맛",
    cold: "입이 짧다, 소화가 안되서 음식 조절한다, 따뜻한 음식 선호",
    heat: "입맛이 좋다, 단 음식이나 찬 음식 선호",
    deficiency: "허기를 못 참는다, 요즘 살이 빠짐, 입맛이 없다, 금방 배부른다",
    excess: "요즘 살이 찜, 폭식, 과식"
  },
  {
    id: "sleep",
    category: "수면",
    cold: "많이 자도 피곤, 새벽에 자주 깨고 깊은 잠을 못 잠, 가위눌림",
    heat: "잠이 적고 뒤척임 많음, 쉽게 깸, 꿈 많음",
    deficiency: "쉽게 피로해져 일찍 잠듦, 자도 개운하지 않음",
    excess: "자다가 경계 벌떡 깸, 스트레스 받음 못 잔다"
  },
  {
    id: "urination",
    category: "소변",
    cold: "소변 맑고 양 많음, 잦은 배뇨, 야간뇨",
    heat: "소변 진하고 양 적음, 소변 시 작열감",
    deficiency: "소변 시 힘 없음, 잔뇨감, 배뇨 오래 걸림",
    excess: "배뇨 시 통증, 방광염, 소변이 급함, 요실금"
  },
  {
    id: "defecation",
    category: "대변",
    cold: "묽고 무른 변, 미즙변(덜 소화된 변), 물 설사, 찬것 설사",
    heat: "변비, 단단한 변, 냄새 심함, 항문 작열감, 기름진거 설사",
    deficiency: "대변 시 힘이 없음, 무른 변, 식후 변의, 잔변감",
    excess: "대변이 안나와 답답하다, 가스, 변비, 복통 동반"
  },
  {
    id: "sweat",
    category: "땀",
    cold: "잘 안 흘림, 운동해도 땀이 적음",
    heat: "식사중 땀, 땀이 많음, 조금만 움직여도 흐름",
    deficiency: "자면서 식은땀, 손발에 땀이 많음, 땀나면 피곤하다",
    excess: "갑자기 땀이 확 쏟아짐, 땀 냄새 강함, 땀 내면 기분 좋다"
  },
  {
    id: "pain",
    category: "통증",
    cold: "둔하고 묵직한 통증, 따뜻하게 하면 완화",
    heat: "타는 듯한 통증, 뜨거운 느낌",
    deficiency: "지속적인 통증, 무기력함 동반",
    excess: "날카롭고 찌르는 통증, 강한 압통"
  },
  {
    id: "temperature",
    category: "추위 더위",
    cold: "추위를 많이 탐, 손발이 차가움, 바람이 싫다",
    heat: "더위를 많이 탐, 얼굴이 붉고 열감",
    deficiency: "사계절 체온 조절 어려움, 저온에도 쉽게 피로, 몸이 더워도 신체 일부는 차다",
    excess: "열이 심하고 땀 많음, 한열왕래, 수족다한증"
  },
  {
    id: "chest",
    category: "흉부 증상",
    cold: "가슴 답답, 한숨 많음, 숨이 차면서 시원하지 않음",
    heat: "가슴이 화끈거림, 가슴 두근거림",
    deficiency: "두근거림, 심장이 약하고 가슴이 쉽게 답답, 숨이 차다",
    excess: "가슴이 꽉 막힌 느낌, 흉통 동반"
  },
  {
    id: "psychology",
    category: "심리 증상",
    cold: "우울감, 의욕 저하, 생각이 많고 망설임",
    heat: "불안, 초조, 화가 많고 짜증",
    deficiency: "기운 없음, 감정이 쉽게 소진됨",
    excess: "쉽게 흥분하고, 스트레스 강하게 느낌"
  },
  {
    id: "fatigue",
    category: "피로도",
    cold: "쉽게 지침, 휴식 필요",
    heat: "잠을 못 자도 피곤함이 덜함",
    deficiency: "조금만 움직여도 피로, 쉬어도 안 풀림",
    excess: "순간적으로 피곤하지만 쉬면 회복"
  },
  {
    id: "dysmenorrhea",
    category: "생리통",
    cold: "아랫배 차고 시린 느낌, 온찜질하면 완화",
    heat: "욱신거리는 통증, 붉은 혈괴 동반",
    deficiency: "생리 직전 피로감 심함, 무기력",
    excess: "극심한 생리통, 하복부 팽창, 덩어리진 혈"
  },
  {
    id: "menstrual_cycle",
    category: "생리 주기",
    cold: "주기가 늦어짐, 양이 적고 색이 연함",
    heat: "주기가 짧아짐, 양 많고 진한 색",
    deficiency: "생리 양 적고 장기간 지속됨",
    excess: "갑자기 생리가 많아지고 혈괴 배출"
  },
  {
    id: "rhinitis",
    category: "비염",
    cold: "콧물 맑고 묶음, 코 막힘 심함, 찬 공기에 악화",
    heat: "코가 건조하고 따가움, 누런 콧물, 코피",
    deficiency: "만성 비염, 후비루, 면역력 약함",
    excess: "알레르기 반응 심함, 재채기 연속"
  },
  {
    id: "headache",
    category: "두통",
    cold: "무겁고 둔한 통증, 추우면 심해짐",
    heat: "박동성 통증, 더우면 심해짐",
    deficiency: "피곤할 때 머리 띵함, 오래 가는 두통, 오후",
    excess: "날카로운 통증, 한쪽 두통, 편두통 심함, 오전"
  },
  {
    id: "circulation",
    category: "순환",
    cold: "혈액순환 저하, 쉽게 저림",
    heat: "얼굴이 붉고 열감 심함, 정맥류 경향",
    deficiency: "혈색 창백, 쉽게 어지러움, 빈혈 증상",
    excess: "혈압 상승, 두통 및 혈관 긴장 증가"
  },
  {
    id: "thirst",
    category: "갈증",
    cold: "갈증이 거의 없으며 따뜻한 음료 선호",
    heat: "심한 갈증, 찬 음료를 자주 찾음",
    deficiency: "입이 건조하지만 물을 많이 마시지 않음",
    excess: "갈증이 심하고 물을 많이 마셔도 해소되지 않음"
  },
  {
    id: "joints",
    category: "관절",
    cold: "관절이 뻣뻣 시린 느낌, 움직이면 뻐근, 찬기운 닿으면 아프다",
    heat: "관절이 홍종, 열감, 염증 동반",
    deficiency: "관절의 유연성 저하, 자주 시큰거림",
    excess: "급성 염증, 찌르는 듯한 강한 통증, 부기 심함"
  },
  {
    id: "edema",
    category: "부종",
    cold: "손발이 자주 붓고, 누르면 자국이 오래 지속됨",
    heat: "국소적인 붓기, 발적 동반",
    deficiency: "전신이 쉽게 부으며 피로 시 악화, 오후부종",
    excess: "급성 부종, 단단한 부기, 눌러도 쉽게 가라앉지 않음, 오전부종"
  }
];

export const DIAGNOSIS_INFO: Record<DiagnosisType, {
  name: string;
  hanja: string;
  english: string;
  themeColor: string;
  lightBg: string;
  borderColor: string;
  textColor: string;
  badgeBg: string;
  description: string;
  keyPrinciples: string;
}> = {
  한: {
    name: "한증",
    hanja: "寒",
    english: "Cold Pattern",
    themeColor: "from-cyan-500 to-blue-600",
    lightBg: "bg-cyan-500/10",
    borderColor: "border-cyan-500/40",
    textColor: "text-cyan-400",
    badgeBg: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    description: "양기(陽氣) 부족 또는 외한(外寒) 침습으로 인한 대사 저하 및 체온 조절력 약화 경향",
    keyPrinciples: "온리산한(溫裏散寒) · 온보비신(溫補脾腎) · 온경통락(溫經通絡)"
  },
  열: {
    name: "열증",
    hanja: "熱",
    english: "Heat Pattern",
    themeColor: "from-rose-500 to-red-600",
    lightBg: "bg-rose-500/10",
    borderColor: "border-rose-500/40",
    textColor: "text-rose-400",
    badgeBg: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    description: "음액(陰液) 부족 또는 양기(陽氣) 항진으로 인한 대사 항진 및 염증성 열감 경향",
    keyPrinciples: "청열사화(淸熱瀉火) · 자음강화(滋陰降火) · 양혈해독(凉血解毒)"
  },
  허: {
    name: "허증",
    hanja: "虛",
    english: "Deficiency Pattern",
    themeColor: "from-emerald-500 to-teal-600",
    lightBg: "bg-emerald-500/10",
    borderColor: "border-emerald-500/40",
    textColor: "text-emerald-400",
    badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    description: "정기(正氣), 기혈(氣血), 진액(津液) 등의 인체 필수 에너지가 전반적으로 고갈·쇠약해진 경향",
    keyPrinciples: "보기양혈(補氣養血) · 건비익기(健脾益氣) · 자음익정(滋陰益精)"
  },
  실: {
    name: "실증",
    hanja: "實",
    english: "Excess Pattern",
    themeColor: "from-indigo-500 to-violet-600",
    lightBg: "bg-indigo-500/10",
    borderColor: "border-indigo-500/40",
    textColor: "text-indigo-400",
    badgeBg: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
    description: "사기(邪氣)의 울체, 담음(痰飮), 어혈(瘀血), 식체(食滯) 등 병리적 노폐물이 정체·항진된 경향",
    keyPrinciples: "사하축수(瀉下逐水) · 행기활혈(行氣活血) · 거담소적(祛痰消積)"
  }
};
