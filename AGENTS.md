<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Custom Commands
- If the user types "1번 실행해줘", you MUST immediately run `git pull` followed by `npm.cmd run dev` (since powershell execution policy restricts `npm.ps1`, use `npm.cmd` instead). Prepare the workspace for coding.
