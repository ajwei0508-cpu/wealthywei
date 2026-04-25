const fs = require('fs');
const okchart = fs.readFileSync('src/app/emr/okchart/page.tsx', 'utf-8');
const hanisarang = fs.readFileSync('src/app/emr/hanisarang/page.tsx', 'utf-8');

// Extract the UI section from Okchart (from New Animated Hero Row down to right before Footer Info)
const okchartStart = okchart.indexOf('{/* New Animated Hero Row: Total Revenue */}');
const okchartEnd = okchart.indexOf('{/* Footer Info */}');
let uiChunk = okchart.substring(okchartStart, okchartEnd);

// Replace OKchart specific text with Hanisarang
uiChunk = uiChunk.replace(/오케이차트/g, '한의사랑');
uiChunk = uiChunk.replace(/okchartData/g, 'hanisarangData');

// Replace colors to match Hanisarang's Emerald theme
uiChunk = uiChunk.replace(/gold/g, 'emerald');
uiChunk = uiChunk.replace(/#FBBF24/g, '#10B981'); // Emerald-500
uiChunk = uiChunk.replace(/#F59E0B/g, '#059669'); // Emerald-600
uiChunk = uiChunk.replace(/#D4AF37/g, '#10B981');

// Extract the corresponding section to replace in Hanisarang
// We will replace from `{/* New Animated Hero Row: Total Revenue */}` or `{isMock && (` whichever is relevant
// Currently Hanisarang doesn't have the Hero Row, so we replace from the mock banner
const haniStart = hanisarang.indexOf('{isMock && (');
const haniEnd = hanisarang.indexOf('{/* Footer Info */}');

if (haniStart === -1 || haniEnd === -1) {
  console.log("Could not find replacement boundaries in Hanisarang.");
  process.exit(1);
}

const mockBanner = `{isMock && (
          <div className="mb-8 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Info size={20} />
            </div>
            <p className="text-emerald-200/80 text-sm font-medium italic">
              * 현재 보시는 화면은 가이드용 <span className="text-emerald-400 font-bold underline underline-offset-4 decoration-emerald-500/30">샘플 데이터</span>입니다. 엑셀 업로드 시 원장님 한의원의 실제 통계로 자동 업데이트됩니다.
            </p>
          </div>
        )}\n\n`;

const newHanisarang = hanisarang.substring(0, haniStart) + mockBanner + uiChunk + hanisarang.substring(haniEnd);

fs.writeFileSync('src/app/emr/hanisarang/page.tsx', newHanisarang);
console.log('Hanisarang successfully updated with Okchart template!');
