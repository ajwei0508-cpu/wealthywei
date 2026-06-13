export const DEFAULT_TEMPLATES = {
  '4일차': '안녕하세요, [환자명] 님! [한의원 상호] [직원성함] 입니다.^^ 며칠 전 치료받으신 [치료항목] 부위는 좀 어떠신가요? 불편하신 점이 없는지 안부 차 연락드렸습니다. 바쁘시더라도 시간 나실 때 한 번 내원해주시면 경과를 꼼꼼히 확인해 드리겠습니다. 편안한 하루 보내세요!',
  '7일차': '안녕하세요, [환자명] 님! [한의원 상호] [직원성함] 입니다.^^ 지난번 방문하신 지 일주일 정도 지났는데, 그동안 내원이 없으셔서 걱정되는 마음에 연락드렸습니다. 치료 중간에 중단하시면 오히려 증상이 악화될 수 있으니, 편하신 시간에 꼭 예약 잡고 방문 부탁드립니다. 도와드릴 수 있는 부분이 있다면 언제든 말씀해주세요.',
  '8일 이상': '안녕하세요, [환자명] 님! [한의원 상호] [직원성함] 입니다.^^ 최근 많이 바쁘셨죠? 통증은 잊을 만할 때 다시 찾아오는 경우가 많아서, 걱정되는 마음에 연락드렸어요. 가벼운 마음으로 상태 점검 한 번 받으러 오시면 원장님께서 꼼꼼히 봐드릴게요. 이번 주 편한 시간 알려주시면 예약 잡아드릴까요?'
};

export interface ReplaceParams {
  patientName: string;
  clinicName: string;
  staffName: string;
  treatmentItem?: string;
}

export function replaceTemplate(template: string, params: ReplaceParams): string {
  let text = template;
  text = text.replace(/\[환자명\]/g, params.patientName);
  text = text.replace(/\[한의원 상호\]/g, params.clinicName || '저희 한의원');
  text = text.replace(/\[직원성함\]/g, params.staffName || '담당 직원');
  text = text.replace(/\[치료항목\]/g, params.treatmentItem || '치료');
  return text;
}
