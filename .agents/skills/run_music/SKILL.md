---
name: run_music
description: 사용자님이 "뮤직 실행해줘" 또는 "뮤직실행해줘"라고 말씀하시면 SOUNDCLASH(D:\music) 1대1 음악 배틀 플랫폼 프로젝트를 깃허브(https://github.com/ajwei0508-cpu/music.git)에서 자동 pull하고 로컬 서버(http://localhost:5000)를 자동으로 켜는 스킬입니다.
---
# 자동 실행 방법 (뮤직 실행해줘 — SOUNDCLASH 1대1 음악 배틀 & 예측 아레나)

사용자님이 **"뮤직 실행해줘"** 또는 **"뮤직실행해줘"**라고 명령하시면, 어느 컴퓨터에서든 즉시 다음 단계에 따라 작업을 수행해 주세요.

## 1. 크로스 PC 저장소 확인 및 최신 코드 동기화 (`git clone` / `git pull`)
1. 현재 컴퓨터에 `D:\music` 폴더가 있는지 확인합니다.
2. 만약 폴더가 없다면 즉시 클론합니다:
   - `git clone https://github.com/ajwei0508-cpu/music.git D:\music`
3. 폴더가 존재한다면 최신 코드를 가져옵니다:
   - `git -C D:\music pull https://github.com/ajwei0508-cpu/music.git main`

## 2. 최신 인수인계 문서 확인
- `D:\music\HANDOFF_LATEST.md` 와 `D:\music\AGENTS.md` 를 읽어 최신 작업 상태와 구조를 파악합니다.

## 3. 로컬 아레나 서버 구동 (`http://localhost:5000`)
- 5000번 포트가 이미 실행 중인지 확인하고, 실행 중이 아니면 `D:\music`에서 `node serve.js` (`IsDaemon: true`, 포트 `5000`)를 백그라운드로 구동합니다.
- 브라우저 접속 주소: `http://localhost:5000`
- 필요 시 `npm.cmd test` (자동 QA 회귀 테스트) 및 `npm.cmd run promote:dry` (자동 홍보 CLI)로 상태를 검증하고 사용자에게 보고합니다.
