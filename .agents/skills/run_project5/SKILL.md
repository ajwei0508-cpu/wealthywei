---
name: run_project5
description: 사용자님이 "5번 실행해줘", "5번실행해줘" 또는 "이미지메이커"라고 말씀하시면, 독립 인물 고정 AI 스튜디오(imagemaker) 프로젝트를 git pull하고 로컬 서버(http://localhost:4500)를 자동으로 켜는 스킬입니다.
---
# 자동 실행 방법 (5번 실행해줘 / 이미지메이커 - 단독 인물 고정 AI 스튜디오)

사용자님이 **"5번 실행해줘"** 또는 **"이미지메이커"**라고 명령하시면, 어느 컴퓨터에서든 즉시 다음 단계에 따라 작업을 수행해 주세요.

## 1. 크로스 PC 저장소 확인 및 최신 코드 동기화 (`git clone` / `git pull`)
1. 현재 컴퓨터에 `imagemaker` 폴더가 있는지 확인합니다 (`D:\imagemaker` 또는 작업 폴더 내 `imagemaker`).
2. 만약 폴더가 없다면 즉시 클론합니다:
   - `git clone https://github.com/ajwei0508-cpu/imagemaker.git D:\imagemaker`
3. 폴더가 존재한다면 최신 코드를 가져옵니다:
   - `git -C D:\imagemaker pull origin main`

## 2. 로컬 스튜디오 서버 구동 (`http://localhost:4500`)
- 4500번 포트가 이미 실행 중인지 확인하고, 실행 중이 아니면 `node serve.js` (`IsDaemon: true`, 포트 `4500`)를 백그라운드로 구동합니다.
- 브라우저 주소: `http://localhost:4500`

## 3. 핵심 기능 지원
- **FLUX Portrait LoRA / PuLID-FLUX**: 일관된 인물 골격·체형·두상 생성
- **Face Lock (InsightFace + CodeFormer)**: 대표 얼굴 1:1 정밀 랜드마크 교정 & 화질 복원
- **홈페이지 원클릭 교정**: `bareun-homepage/homepage` 내 원본 이미지를 자동 백업 후 100% 실물 얼굴로 교체
