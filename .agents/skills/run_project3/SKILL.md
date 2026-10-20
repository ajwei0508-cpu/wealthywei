---
name: run_project3
description: 사용자님이 "3번 실행해줘" 또는 "3번실행해줘"라고 말씀하시면 바른한의원 홈페이지 프로젝트를 깃허브에서 pull하고 로컬 서버를 자동으로 켜는 스킬입니다.
---
# 자동 실행 방법 (3번 실행해줘)

사용자님이 "3번 실행해줘" 또는 "3번실행해줘"라고 명령하시면, 즉시 다음 단계에 따라 작업을 수행해 주세요.

1. **최신 코드 가져오기**:
   - `run_command` 툴을 사용해서 실행합니다.
   - `Cwd`: `c:\Users\0508a\.gemini\antigravity\scratch\바른한의원 홈페이지`
   - `CommandLine`: `git pull origin main`

2. **최신 작업 인수인계서 확인하기**:
   - `view_file` 툴로 `c:\Users\0508a\.gemini\antigravity\scratch\바른한의원 홈페이지\HANDOFF_LATEST.md` 및 `AGENTS.md`를 읽어 가장 마지막으로 진행된 3D 스크롤 시네마(22프레임, 1·3인칭 시점 혼합, 전·후 비교 스튜디오) 컨텍스트를 숙지합니다.

3. **로컬 서버 실행하기 (포트 3000 & 포트 3001 동시 구동)**:
   - 코드를 정상적으로 가져왔다면, 이어서 서버를 실행합니다.
   - `Cwd`: `c:\Users\0508a\.gemini\antigravity\scratch\바른한의원 홈페이지\homepage`
   - `CommandLine`: `node serve.js`
   - `IsDaemon`: `true`
   - `WaitMsBeforeAsync`: 2000

4. **사용자에게 안내하기**:
   - 최고급 하이엔드 웹사이트 제작자 "아트"로서:
     - 최신 코드를 `git pull` 완료하고 로컬 서버(**포트 3000 수정 후 완성본 `http://localhost:3000/story-3d.html`**, **전·후 비교 스튜디오 `http://localhost:3000/compare.html`**, **포트 3001 수정 전 페이지 `http://localhost:3001`**)를 모두 구동했음을 안내하고, 마지막 3D 스크롤 연출 작업에 이어서 어떤 부분을 추가로 다듬을지 여쭙니다.
