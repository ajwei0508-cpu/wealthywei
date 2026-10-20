---
name: run_project4
description: 사용자님이 "4번 실행해줘" 또는 "4번실행해줘"라고 말씀하시면 글로벌 광고 영상 편집자(태국·일본·미국·한국 대표작 연구 전문가) 모드로 전환하여, wealthyCINEMA 프로젝트를 git clone/pull하고 로컬 서버(http://localhost:4000)를 자동으로 켜며, 업로드된 동영상 파일을 10초 단위로 정밀 해부(1.구도, 2.대사, 3.내용, 4.장면, 5.100% 복제용 AI 프롬프트)하는 스킬입니다.
---
# 자동 실행 방법 (4번 실행해줘 - 크로스 PC 자동 동기화 & 글로벌 광고 영상 10초 정밀 해부 모드)

사용자님이 **"4번 실행해줘"** 또는 **"4번실행해줘"**라고 명령하시면, 어느 컴퓨터에서든 즉시 다음 단계에 따라 작업을 수행해 주세요.

## 1. 크로스 PC 저장소 확인 및 최신 코드 동기화 (`git clone` / `git pull`)
1. 현재 컴퓨터에 `wealthyCINEMA` 폴더가 있는지 확인합니다 (`c:\Users\0508a\.gemini\antigravity\scratch\wealthyCINEMA`, `D:\wealthyCINEMA`, 또는 현재 작업 폴더 내 `wealthyCINEMA`).
2. 만약 폴더가 없다면 즉시 클론합니다:
   - `git clone https://github.com/ajwei0508-cpu/wealthyCINEMA.git`
3. 폴더가 존재한다면 최신 작업 내역과 영상·리포트를 가져옵니다:
   - `git -C <wealthyCINEMA경로> pull origin main`
4. `HANDOFF_LATEST.md`와 `AGENTS.md`를 읽어 직전까지 분석한 영상 및 리포트 상태를 숙지합니다.

## 2. 로컬 스튜디오 서버 구동 (`http://localhost:4000`)
- 4000번 포트가 이미 실행 중인지 확인하고, 실행 중이 아니면 `node serve.js` (`IsDaemon: true`, 포트 `4000`)를 백그라운드로 구동합니다.

## 3. 10초 단위 광고 영상 정밀 해부 & 1:1 AI 복제 프롬프트 추출 프로토콜
새로운 동영상 파일이 `wealthyCINEMA/videos/`에 추가되었거나 채팅창에 업로드되면, **반드시 실제 영상 프레임과 오디오를 `read_file`로 처음부터 끝까지 직접 시청**한 뒤 10초 단위(`00:00~00:10`, `00:10~00:20`...)로 다음 5가지를 초정밀 작성하여 `reports/<파일명>.json` 및 `reports/<파일명>.md`로 저장하고 GitHub에 `git push`합니다:
1. **구도 (Composition & Camera Work)**: 샷 사이즈, 앵글, 카메라 무브먼트(Zoom/Pan/Tilt/POV), 렌즈 화각 및 심도
2. **대사 · 자막 · 사운드 (Dialogue, Typography & Audio)**: 실제 대사/추임새, 자막 문구/위치, 구간별 효과음(SFX) 및 BGM
3. **내용 · 광고 심리학 (Narrative & Ad Psychology)**: 서사 전개 및 태국·일본·미국·한국 광고 레퍼런스 연출 기법
4. **장면 · 미장센 (Scene & Mise-en-scène)**: 실제 배경·차량·소품, 등장인물의 정확한 외형·체형·수염·모자·의상·맨발 여부·행동 디테일, 조명과 컬러 팔레트
5. **100% 복제용 순수 영문 AI 프롬프트 (1:1 Video Cloning Prompts)**:
   - Gemini(Veo) / Kling / Sora / Runway에 바로 붙여넣을 수 있도록 메타 제목 없이 실제 장면과 동작만 100% 정확하게 묘사한 **순수 영문 비디오 모션 프롬프트** 및 **첫 프레임 이미지 생성 프롬프트**
