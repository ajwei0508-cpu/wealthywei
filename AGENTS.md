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

# 📌 Latest Cross-PC Handoff Context (2026-10-18 · 바른한의원 & wealthywei)
- **1. `wealthywei` (1번 프로젝트)**:
  - 좌측 사이드바 `바른리프팅` 하위에 **`윤곽진단` (`/lifting-compare`)** 메뉴 추가 및 시술 전후 리프팅 윤곽비교 스튜디오(After 기준 사진 기본값, 전/후 개별 윤곽선 수동 편집, 3점 중심축 자동 각도·크기 교정) 탑재 완료.
- **2. `바른한의원 홈페이지` (3번 프로젝트 · `story-3d.html`, `body-explorer.html`, 6대 상세페이지)**:
  - **전 페이지 인라인 삽입형 스크롤 자동 연동 Before/After 3D 생체스캔 탑재**: 수동 모달 오픈 없이 메인 3D 쇼룸(`#live-scroll-ba-hud`), 6대 상세페이지(`#inline-scroll-ba-card` & `#runway-scroll-ba-plate`), 3D 인체모형 백과(`#encyc-ba-stage`) 전체에서 스크롤을 내리면 자동으로 치료 전(Before)에서 치료 후(After) 3D 스캔으로 실시간(`8% ➔ 96%`) 변환.
  - **Vibrant Wellness (`vibrant.noomoagency.com`) 스타일 3D 인체모형 질환·의학·SCI 논문 백과사전 (`body-explorer.html` / `wordpress-body-explorer.html`) 구축 완료**:
    - GLSL Perlin 3D Noise 피부 투시 디졸브 셰이더 + 7대 인체 부위(`knee`, `cervical`, `lumbar`, `brain`, `heart`, `gut`, `pelvis`) 60fps 3D 장기/관절 마이크로 모션 + 카메라 자동 줌인(Fly-to) + 우측 백과사전 스크롤 연동 회복 모션.
    - **무릎(`?part=knee`) 클릭 시 소아 키 성장·성조숙증 심층 백과**: 성장 저해 5대 원인, **감기·비염이 잦은 아이 부모님 실전 6단계 관리 프로토콜**, 약선 음식 vs 금기 식품, 수면·점프·경혈(독비·족삼리·양릉천) 루틴, 전세계 SCI/PubMed 논문 레퍼런스 완벽 수록.
  - **전국 한의사 대상 B2B 템플릿 화이트라벨(`clinic-template-config.js`) & 3단 시안성 모드(`다크 로얄` / `온기 한지 화이트` / `큰글씨 고시안성`) 탑재 완료**.
  - 상세 인수인계 내역은 `D:\bareun-homepage\HANDOFF_LATEST.md`에 기록되어 있습니다.
