---
name: run_project3
description: 사용자님이 "3번 실행해줘" 또는 "3번실행해줘"라고 말씀하시면 바른한의원 홈페이지 프로젝트(3D 진료 체어사이드 뷰어 & B2B 분양 시스템 포함)를 깃허브에서 pull하고 로컬 서버를 자동으로 켜는 스킬입니다.
---
# 자동 실행 방법 (3번 실행해줘)

사용자님이 "3번 실행해줘" 또는 "3번실행해줘"라고 명령하시면, 즉시 다음 단계에 따라 작업을 수행해 주세요.

1. **디렉토리 확인 및 최신 코드 가져오기**:
   - `D:\bareun-homepage` 디렉토리가 존재하는지 확인합니다. 존재하지 않으면:
     - `CommandLine`: `git clone https://github.com/ajwei0508-cpu/bareun-homepage.git D:\bareun-homepage`
   - 존재하면 `D:\bareun-homepage\homepage`로 이동하여:
     - `CommandLine`: `git pull https://github.com/ajwei0508-cpu/bareun-homepage.git`

2. **최신 작업 인수인계서 확인하기**:
   - `D:\bareun-homepage\HANDOFF_LATEST.md` 및 `D:\bareun-homepage\AGENTS.md`를 읽어 최신 작업 내역(**3D 진료 체어사이드 티칭 뷰어 `chairside-3d.html`**, **한의사 원장님 대상 분양 랜딩 `sales-pitch.html`**, **11개 상세페이지 Sample A 일괄 적용 및 커스텀 스튜디오 `detail-pages-editor.html`**) 컨텍스트를 숙지합니다.

3. **로컬 서버 실행하기 (포트 3000 & 포트 3001 동시 구동)**:
   - `Cwd`: `D:\bareun-homepage\homepage`
   - `CommandLine`: `node serve.js`
   - `IsDaemon`: `true`
   - `WaitMsBeforeAsync`: 2000

4. **사용자에게 핵심 링크 및 인수인계 보고하기**:
   - 최고급 하이엔드 웹사이트 제작자 "아트"로서 사용자에게 보고:
     - 최신 코드 `git pull` 및 로컬 서버 정상 가동 안내:
       - 🏆 **3D 진료 비급여 치료 동의용 타임랩스 티칭 뷰어**: `http://localhost:3000/chairside-3d.html`
       - 💼 **한의사 원장님 대상 분양 안내 랜딩페이지**: `http://localhost:3000/sales-pitch.html`
       - 🎨 **11대 상세페이지 통합 커스텀 스튜디오**: `http://localhost:3000/detail-pages-editor.html`
       - 🏛️ **메인 3D 시네마 쇼룸**: `http://localhost:3000/story-3d.html`
       - 🦴 **3D 인체모형 의학백과**: `http://localhost:3000/body-explorer.html`
     - 최신 인수인계 상태와 다음 진행할 작업을 브리핑합니다.
