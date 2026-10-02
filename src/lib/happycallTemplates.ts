export const DEFAULT_TEMPLATES = {
  '4일차': '안녕하세요, [환자명] 님! [한의원 상호] [직원성함] 입니다.^^ 다름이 아니라, 오늘 아침에 원장님이랑 차트 보는데 [환자명] 님 생각이 나서 연락드렸어요. [치료상황] 혹시 이번 주 편한 시간으로 예약 잡아드릴까요?',
  '7일차': '안녕하세요, [환자명] 님! [한의원 상호] [직원성함] 입니다.^^ 벌써 일주일째 얼굴을 못 뵈었네요.^^ 바쁘신 와중에 몸이 더 고단해지신 건 아닐까 걱정스러운 마음에 문자 남겨요. 원장님께서 지금이 \'치료 골든타임\'이라고 꼭 챙겨달라 하셨는데, 혹시 몸이 좀 편해지셨어도 뿌리까지 치료하는 게 정말 중요합니다! 그래야 재발확률이 줄어듭니다. 이번 주 편한시간에 치료 받는건 어떠실가요?',
  '8일 이상': '안녕하세요, [환자명] 님! [한의원 상호] [직원성함] 입니다.^^ 최근 많이 바쁘셨지요?^^ 다름이 아니라 치료는 아프지 않을 때 지켜내는 게 가장 효과가 좋고 비용도 덜 들거든요. 혹시 아직 조금 뻐근한 곳이 남아있거나 불편한 부분이 있으시다면 방치하지 마시고, 이번 주 편한 시간에 오셔서 상태를 한 번 점검해보시는 건 어떨까요?^^ 편하신 시간 알려주시면 예약 도와드리겠습니다.'
};

export const CARRYOVER_TEMPLATES = {
  '4일차': '안녕하세요, [환자명] 님! [한의원 상호] [직원성함] 입니다.^^ 주말(연휴) 편안히 잘 보내셨나요? 연휴 동안 치료받으셨던 부위가 다시 불편해지진 않으셨는지 걱정되어 출근하자마자 안부 연락드렸어요. [치료상황] 이번 주 편하신 시간으로 예약 잡아드릴까요?',
  '7일차': '안녕하세요, [환자명] 님! [한의원 상호] [직원성함] 입니다.^^ 주말(연휴) 편안히 잘 보내셨는지요? 연휴 동안 몸이 더 고단해지신 건 아닐까 걱정스러운 마음에 연락 남겨드려요. 원장님께서 지금이 \'치료 골든타임\'이라고 꼭 챙겨달라 하셨는데, 혹시 통증이 줄었더라도 뿌리까지 치료하는 게 재발 방지에 정말 중요합니다! 이번 주 편한 시간에 치료 이어가시는 건 어떠실까요?',
  '8일 이상': '안녕하세요, [환자명] 님! [한의원 상호] [직원성함] 입니다.^^ 최근 긴 연휴와 바쁜 일상 잘 보내셨지요?^^ 치료는 아프지 않을 때 지켜내는 게 가장 효과가 좋고 비용도 덜 들거든요. 혹시 아직 조금 뻐근한 곳이 남아있거나 불편한 부분이 있으시다면 방치하지 마시고, 이번 주 편한 시간에 오셔서 상태를 점검해보시는 건 어떨까요?^^'
};

export interface ReplaceParams {
  patientName: string;
  clinicName: string;
  staffName: string;
  treatmentItem?: string;
  isCarryover?: boolean;
}

export function replaceTemplate(template: string, params: ReplaceParams): string {
  let text = template;
  text = text.replace(/\[환자명\]/g, params.patientName);
  text = text.replace(/\[한의원 상호\]/g, params.clinicName || '저희 한의원');
  text = text.replace(/\[직원성함\]/g, params.staffName || '담당 직원');

  // Treatment situational sentences for 4-day happy call
  let treatmentSituation = '';
  const item = params.treatmentItem || '치료';
  if (item === '부항') {
    treatmentSituation = '지난번 부항 상태가 안좋게 나오셔서, 지금쯤이면 치료를 한 번 더 받으셔야 노폐물이 제대로 빠지고 회복이 빠르시거든요.';
  } else if (item === '침' || item === '침치료') {
    treatmentSituation = '지난번 침 맞으신 부위가 아직 다 안 풀리셨을 수 있어서, 지금쯤이면 연속해서 치료를 받으셔야 근육이 제대로 이완되고 효과가 오래 유지되시거든요.';
  } else if (item === '추나') {
    treatmentSituation = '지난번 추나 교정 받으신 뼈와 관절이 원래대로 돌아가려는 성질이 강해서, 지금쯤이면 한 번 더 맞춰주셔야 바른 정렬이 뇌에 인지되고 교정 효과가 오래 가시거든요.';
  } else if (item === '한약') {
    treatmentSituation = '지난번 처방해드린 약이 몸에 적응하면서 피로 회복과 기혈 순환을 돕고 있을 텐데, 약 복용 상태를 체크하고 남은 분량의 효과적 복용을 도와드리려고 연락드렸거든요.';
  } else {
    // Default fallback
    treatmentSituation = '지난번 치료받으신 부위가 아직 덜 풀리셨을 수 있어서, 지금쯤이면 치료를 한 번 더 받으셔야 회복이 빠르시거든요.';
  }

  text = text.replace(/\[치료상황\]/g, treatmentSituation);
  return text;
}
