const fs = require('fs');
const path = require('path');

const replacements = [
  // Base backgrounds
  { from: /bg-\[\#05080F\]/g, to: 'bg-[#031C13]' },
  { from: /bg-\[\#0A0E1A\]/g, to: 'bg-[#042418]' },
  { from: /bg-\[\#0D1117\]/g, to: 'bg-[#083021]' },
  { from: /bg-\[\#111624\]/g, to: 'bg-[#0A3D2A]' },
  { from: /bg-\[\#1A1F35\]/g, to: 'bg-[#10563C]' },
  { from: /bg-\[\#121824\]/g, to: 'bg-[#0B3A28]' },
  { from: /bg-\[\#161F2E\]/g, to: 'bg-[#0F4C35]' },
  { from: /bg-slate-900/g, to: 'bg-emerald-950' },
  { from: /bg-slate-800/g, to: 'bg-emerald-900' },
  { from: /bg-slate-800\/50/g, to: 'bg-emerald-900/50' },

  // Borders
  { from: /border-slate-800/g, to: 'border-emerald-900' },
  { from: /border-slate-700/g, to: 'border-emerald-800' },

  // Primary Action Colors (Blue -> Emerald/Amber)
  { from: /text-blue-500/g, to: 'text-amber-500' },
  { from: /text-blue-400/g, to: 'text-amber-400' },
  { from: /text-blue-300/g, to: 'text-amber-300' },
  { from: /text-blue-600/g, to: 'text-amber-600' },
  { from: /bg-blue-500/g, to: 'bg-emerald-600' }, // Buttons usually emerald
  { from: /bg-blue-600/g, to: 'bg-emerald-700' },
  { from: /hover:bg-blue-600/g, to: 'hover:bg-emerald-700' },
  { from: /hover:bg-blue-700/g, to: 'hover:bg-emerald-800' },
  { from: /border-blue-500/g, to: 'border-emerald-600' },
  { from: /border-blue-400/g, to: 'border-emerald-500' },
  { from: /ring-blue-500/g, to: 'ring-emerald-500' },
  { from: /bg-blue-500\/10/g, to: 'bg-emerald-500/10' },
  { from: /bg-blue-500\/20/g, to: 'bg-emerald-500/20' },
  { from: /bg-blue-400\/10/g, to: 'bg-emerald-400/10' },
  { from: /shadow-blue-500/g, to: 'shadow-emerald-500' },
  { from: /selection:bg-blue-500\/30/g, to: 'selection:bg-amber-500/30' },
  
  // Specific Gradient / Accents
  { from: /from-blue-600/g, to: 'from-emerald-700' },
  { from: /to-blue-800/g, to: 'to-emerald-900' },
  { from: /from-blue-500/g, to: 'from-emerald-600' },
  { from: /to-blue-600/g, to: 'to-emerald-700' },
  { from: /via-blue-500/g, to: 'via-emerald-600' },
  { from: /from-\[\#0A0E1A\]/g, to: 'from-[#042418]' },
  { from: /to-\[\#05080F\]/g, to: 'to-[#031C13]' },
];

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else if (dirPath.endsWith('.tsx') || dirPath.endsWith('.ts')) {
      callback(dirPath);
    }
  });
}

let modifiedFiles = 0;

walkDir('./src', (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  replacements.forEach(({ from, to }) => {
    content = content.replace(from, to);
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    modifiedFiles++;
    console.log(`Updated ${filePath}`);
  }
});

console.log(`\nSuccessfully updated UX colors in ${modifiedFiles} files.`);
