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

# 📌 Latest Cross-PC Handoff Context (2026-10-15 · 바른한의원 `D:\bareun-homepage`)
- **직전까지 완료된 작업 (`D:\bareun-homepage\homepage\story-3d.html`, `index.html`, `wordpress-story-3d.html`)**:
  1. **6대 핵심 진료 카드(`안정위원장` / `추나` / `성장` / `다이어트` / `탈모` / `황제공진단`) 전용 직관적 이미지 6종 신규 생성 (`card_1_director.jpg` ~ `card_6_gongjindan.jpg`) 및 메인 타이틀 단독 표시** (부가 대사·뱃지·버튼 제거).
  2. **STORY 06 (`관절 튼튼 회복`) 만세 모션 & 초록색 관절 7곳 순차 점등** (`life_4b_chuna_recovery.jpg` ➔ `life_4b_chuna_manse.jpg`, `목` ➔ `어깨` ➔ `팔` ➔ `척추` ➔ `허리` ➔ `다리` ➔ `발` 에메랄드 그린 순차 팝업).
  3. **STORY 03 (`쑥쑥 자란 우리 아이`) 키 성장 후 별빛 반짝임 타이밍 수정** (아이 키가 자라는 모션 `growthProgress >= 0.96` 완료 직후 별 모양 팝인).
- **🚨 이어서 바로 수행해야 할 [마지막 요청 명령어] 원문**:
  ```text
  https://lusion.co/projects/infinite_passerella

  처럼 스크롤 해서 이미지로 설명하는 상세페이로 제작해줘 
  추나 / 탈모 / 황제공진단 / 안정위 / 카드별로 최고급 디자인으로 연출해주고 내용에 필요한 정보는 온라인에서 수집하고 / 논문 자료를 근거하면 더 좋아 / 필요한 이미지와 영상은 직접 하이엔드 수준으로 생성해줘 / 소비자가 공감 할 수 있는 스토리텔링 필수 / 직관적이게 / 전문가 /
  ```
  - 상세 인수인계 내역 및 원장님 실사 레퍼런스(`D:\bareun-homepage\homepage\director_real_reference.jpg`) 안내는 `D:\bareun-homepage\HANDOFF_LATEST.md`에 기록되어 있습니다.
