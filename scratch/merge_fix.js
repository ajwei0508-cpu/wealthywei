const fs = require('fs');

const oldVideos = JSON.parse(fs.readFileSync('videos_old.json', 'utf8'));
const recOld = eval(oldVideos.reception);
const treatOld = eval(oldVideos.treatment);

// Update reception
let recCurrent = fs.readFileSync('src/app/employee/reception/page.tsx', 'utf8');
const quizMap = {};
quizMap['reception-intro-1'] = { options: ["환자가 오면 무시한다.", "환자에게 밝게 인사하며 예약 여부를 묻는다.", "환자에게 화를 낸다."], answerIndex: 1 };
quizMap['appointment-system-1'] = { options: ["예약을 이중으로 잡는다.", "예약 시간을 정확히 확인하고 입력한다.", "예약을 무시한다."], answerIndex: 1 };
quizMap['first-visit-1'] = { options: ["어디가 아프신가요?", "처음 오셨나요? 신분증 부탁드립니다.", "안녕하세요! 예약하셨나요?"], answerIndex: 1 };
quizMap['re-first-visit-1'] = { options: ["단답형으로 금액만 말한다.", "내역을 설명하며 친절히 안내한다.", "환자가 묻기 전에는 설명하지 않는다."], answerIndex: 1 };
quizMap['insurance-claim-1'] = { options: ["환자가 직접 알아보게 한다.", "필요 서류를 꼼꼼히 챙겨서 안내한다.", "실비 청구가 불가능하다고 한다."], answerIndex: 1 };
quizMap['sugar-test-1'] = { options: ['환자 이름 두 번 확인', '검사지 재사용', '검사 30분 전 금식 안내'], answerIndex: 2 };
quizMap['payment-guide-1'] = { options: ['단답형으로 금액만 말한다.', '내역을 설명하며 친절히 안내한다.', '환자가 묻기 전에는 설명하지 않는다.'], answerIndex: 1 };

recOld.forEach(v => { 
  if (quizMap[v.id]) {
    v.options = quizMap[v.id].options;
    v.answerIndex = quizMap[v.id].answerIndex;
  } 
});
recCurrent = recCurrent.replace(/const videos = \[\s*[\s\S]*?\s*\];/, 'const videos = ' + JSON.stringify(recOld, null, 2) + ';');
fs.writeFileSync('src/app/employee/reception/page.tsx', recCurrent);

// Update treatment
let treatCurrent = fs.readFileSync('src/app/employee/treatment/page.tsx', 'utf8');
const tQuizMap = {};
tQuizMap['hotpack-1'] = { options: ['온도를 최대한 높인다.', '핫팩과 피부 사이에 적절한 두께의 수건을 댄다.', '환자가 뜨겁다고 해도 참으라고 한다.'], answerIndex: 1 };
tQuizMap['ict-1'] = { options: ['패드가 겹치게 부착한다.', '통증 부위를 교차하도록 대각선으로 부착한다.', '강도를 한 번에 최대로 올린다.'], answerIndex: 1 };
tQuizMap['chuna-prep-1'] = { options: ['주머니에 있는 물건을 빼도록 안내', '금속 장신구 제거 안내', '치료 전 반드시 금식하도록 안내'], answerIndex: 2 };

treatOld.forEach(v => { 
  if (tQuizMap[v.id]) {
    v.options = tQuizMap[v.id].options;
    v.answerIndex = tQuizMap[v.id].answerIndex;
  }
});
treatCurrent = treatCurrent.replace(/const videos = \[\s*[\s\S]*?\s*\];/, 'const videos = ' + JSON.stringify(treatOld, null, 2) + ';');
fs.writeFileSync('src/app/employee/treatment/page.tsx', treatCurrent);

console.log('Restored videos successfully.');
