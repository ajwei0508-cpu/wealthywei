---
name: run_project2
description: 사용자님이 "2번 실행해줘"라고 말씀하시면 wealthyhair 프로젝트를 깃허브에서 pull하고 로컬 서버를 자동으로 켜는 스킬입니다.
---
# 자동 실행 방법 (2번 실행해줘)

사용자님이 "2번 실행해줘"라고 명령하시면, 즉시 다음 단계에 따라 작업을 수행해 주세요.

1. **최신 코드 가져오기**:
   - `run_command` 툴을 사용해서 실행합니다.
   - `Cwd`: `c:\Users\0508a\.gemini\antigravity\scratch\wealthyhair`
   - `CommandLine`: `git pull`
   
2. **로컬 서버 실행하기**:
   - 코드를 정상적으로 가져왔다면, 이어서 서버를 실행합니다.
   - `Cwd`: `c:\Users\0508a\.gemini\antigravity\scratch\wealthyhair`
   - `CommandLine`: `npm run dev`
   - `WaitMsBeforeAsync`: 2000 (명령어가 백그라운드 작업으로 넘어가도록 짧은 대기시간을 줍니다)

3. **사용자에게 안내하기**:
   - 두 가지 명령이 모두 실행되면, "최신 코드를 가져오고 로컬 서버를 성공적으로 켰습니다! http://localhost:5173 에 접속하여 확인해 보세요."라고 사용자에게 알려줍니다.
