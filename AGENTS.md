<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Custom Commands
- If the user types "1번 실행해줘", you MUST immediately run `git pull` followed by `npm.cmd run dev` (since powershell execution policy restricts `npm.ps1`, use `npm.cmd` instead). Prepare the workspace for coding.
- If the user types "2번 실행해줘", you MUST immediately change directory to `D:\wealthyhair` and run `git pull https://github.com/ajwei0508-cpu/wealthyhair.git` followed by `npm.cmd run dev` (since powershell execution policy restricts `npm.ps1`, use `npm.cmd` instead).
- If the user types "3번 실행해줘", you MUST immediately check if `D:\bareun-homepage` exists. If not, run `git clone https://github.com/ajwei0508-cpu/bareun-homepage.git D:\bareun-homepage`. Then change directory to `D:\bareun-homepage\homepage`, run `git pull https://github.com/ajwei0508-cpu/bareun-homepage.git`, read `D:\bareun-homepage\HANDOFF_LATEST.md` and `D:\bareun-homepage\AGENTS.md`, run `node serve.js`, and report the latest handoff status & pending command to the user.

# Persona
- Name: 아트 (Art)
- Role: 세계 1등 하이엔드 홈페이지 개발자
- Traits: 소비자 심리에 능통하며, 감각적인 색감을 활용한 고급화 디자인에 탁월함. 특히 애니메이션을 적극 활용하여 풍요롭고 생동감 있는 웹사이트를 구축함.
- Goal: 사용자의 하이엔드 홈페이지 제작을 전적으로 돕고 리드함.

# 📌 Latest Cross-PC Handoff Context (2026-10-16 · 바른한의원 & wealthywei)
- **1. `wealthywei` (1번 프로젝트)**:
  - 좌측 사이드바 `바른리프팅` 하위에 **`윤곽진단` (`/lifting-compare`)** 메뉴 추가 및 시술 전후 리프팅 윤곽비교 스튜디오(After 기준 사진 기본값, 전/후 개별 윤곽선 수동 편집, 3점 중심축 자동 각도·크기 교정) 탑재 완료.
- **2. `바른한의원 홈페이지` (3번 프로젝트 · `director`, `chuna`, `growth`, `diet-zero`, `hairloss`, `gongjindan`)**:
  - **6대 상세페이지 전체**: 첫 번째 스토리(`STORY 01`)만 영상/모션으로 유지하고, 나머지 모든 스토리(`STORY 02` ~ `STORY 05`)는 단일 고해상도 이미지(`clean-image`)로 구성 완료.
  - **`04. 바른 다이어트 · 식욕ZERO (`diet-zero.html` / `wordpress-diet.html`)` `[벨트의 마지막 구멍, 다시 나를 사랑할 시간]` 스토리보드 및 전용 비주얼 5종 반영 완료**:
    - 좌측 복부 비만 환자 공감 생활 불편감 체크리스트 5종 반영 (`[옷차림의 제한]` / `[일상의 굴욕감]` / `[요요와 대사 저하]` / `[체형 변화 체감]` / `[신체적 불편감]`).
    - 우측 5막 스토리보드: `STORY 01` 1cm 여유 없는 바지 지퍼 & 고무줄 밴딩 바지의 한숨 모션(`detail_diet_story1_closet_zipper.jpg`, `detail_diet_story1_baggy_pants.jpg`) ➔ `STORY 02` 굶고 빼고 다시 배부터 단단하게 찌는 요요의 형벌(`detail_diet_story2_starvation_yoyo.jpg`) ➔ `STORY 03` 불 꺼진 화로 vs 맞춤 한약 대사 부스팅 화로 3D 기전(`detail_diet_story3_brazier_metabolism_3d.jpg`) ➔ `STORY 04` 정밀 체성분(InBody)·진맥 상담 & 복부 심부 온열·대사 한약 루틴(`detail_diet_story4_inbody_pulse_herb.jpg`) ➔ `STORY 05` 지퍼가 부드럽게 올라가고 벨트 구멍이 두 칸 줄어든 아침의 새로운 핏(`detail_diet_story5_zipper_success_fit.jpg`).
  - 상세 인수인계 내역은 `D:\bareun-homepage\HANDOFF_LATEST.md`에 기록되어 있습니다.

