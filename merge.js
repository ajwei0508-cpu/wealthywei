const fs = require('fs');

const oldVideos = JSON.parse(fs.readFileSync('videos_old.json', 'utf8'));
const recOld = eval(oldVideos.reception);
const treatOld = eval(oldVideos.treatment);

// Update reception
let recCurrent = fs.readFileSync('src/app/employee/reception/page.tsx', 'utf8');
const quizMap = {};
quizMap['sugar-test-1'] = { question: '당 검사를 진행할 때 가장 주의해야 할 점은 무엇인가요?', options: ['환자 이름 두 번 확인', '검사지 재사용', '검사 30분 전 금식 안내'], answerIndex: 2 };
quizMap['first-visit-1'] = { question: '초진 환자 내원 시 가장 먼저 건네야 하는 인사말은?', options: ['어디가 아프신가요?', '처음 오셨나요? 신분증 부탁드립니다.', '안녕하세요! 예약하셨나요?'], answerIndex: 1 };
quizMap['payment-guide-1'] = { question: '환자에게 결제 금액을 안내할 때 올바른 태도는?', options: ['단답형으로 금액만 말한다.', '내역을 설명하며 친절히 안내한다.', '환자가 묻기 전에는 설명하지 않는다.'], answerIndex: 1 };

recOld.forEach(v => { if (quizMap[v.id]) v.quiz = quizMap[v.id]; });
recCurrent = recCurrent.replace(/const videos = \[\s*[\s\S]*?\s*\];/, 'const videos = ' + JSON.stringify(recOld, null, 2) + ';');
fs.writeFileSync('src/app/employee/reception/page.tsx', recCurrent);

// Update treatment
let treatCurrent = fs.readFileSync('src/app/employee/treatment/page.tsx', 'utf8');
const tQuizMap = {};
tQuizMap['hotpack-1'] = { question: '핫팩 적용 시 화상을 예방하기 위해 가장 중요한 조치는?', options: ['온도를 최대한 높인다.', '핫팩과 피부 사이에 적절한 두께의 수건을 댄다.', '환자가 뜨겁다고 해도 참으라고 한다.'], answerIndex: 1 };
tQuizMap['ict-1'] = { question: 'ICT 패드를 부착할 때 올바른 방법은?', options: ['패드가 겹치게 부착한다.', '통증 부위를 교차하도록 대각선으로 부착한다.', '강도를 한 번에 최대로 올린다.'], answerIndex: 1 };
tQuizMap['chuna-prep-1'] = { question: '추나 요법을 받기 전 환자에게 안내해야 할 사항이 아닌 것은?', options: ['주머니에 있는 물건을 빼도록 안내', '금속 장신구 제거 안내', '치료 전 반드시 금식하도록 안내'], answerIndex: 2 };

treatOld.forEach(v => { if (tQuizMap[v.id]) v.quiz = tQuizMap[v.id]; });
treatCurrent = treatCurrent.replace(/const videos = \[\s*[\s\S]*?\s*\];/, 'const videos = ' + JSON.stringify(treatOld, null, 2) + ';');
fs.writeFileSync('src/app/employee/treatment/page.tsx', treatCurrent);

console.log('Restored videos successfully.');
