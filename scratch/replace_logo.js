const fs = require('fs');

const pageFile = './src/app/page.tsx';
let content = fs.readFileSync(pageFile, 'utf8');

// 1. Add Image import if it doesn't exist
if (!content.includes('import Image from "next/image";')) {
  content = content.replace(
    'import DashboardLayout from "@/components/DashboardLayout";',
    'import DashboardLayout from "@/components/DashboardLayout";\nimport Image from "next/image";'
  );
}

// 2. Replace the TrendingUp block with the Logo image
const oldIconBlock = '<div className="inline-block p-4 bg-white/5 rounded-3xl shadow-xl shadow-emerald-500/10 mb-2">\r\n              <TrendingUp size={48} className="text-amber-400" strokeWidth={2.5} />\r\n            </div>';
const oldIconBlockLF = '<div className="inline-block p-4 bg-white/5 rounded-3xl shadow-xl shadow-emerald-500/10 mb-2">\n              <TrendingUp size={48} className="text-amber-400" strokeWidth={2.5} />\n            </div>';

const newIconBlock = '<div className="inline-block p-1 bg-black/20 border border-white/10 rounded-full shadow-xl shadow-emerald-500/10 mb-2 relative w-24 h-24 overflow-hidden mx-auto">\n              <Image src="/logo.png" alt="바른컨설팅 로고" fill className="object-cover" />\n            </div>';

if (content.includes(oldIconBlock)) {
  content = content.replace(oldIconBlock, newIconBlock);
} else if (content.includes(oldIconBlockLF)) {
  content = content.replace(oldIconBlockLF, newIconBlock);
}

fs.writeFileSync(pageFile, content, 'utf8');
console.log('Successfully updated src/app/page.tsx');
