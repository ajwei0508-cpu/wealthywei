const fs = require('fs');
const path = require('path');

const replacements = [
  // Fix double slash issues caused by previous script
  { from: /bg-white\/5\/5/g, to: 'bg-white/5' },
  { from: /bg-white\/5\/10/g, to: 'bg-white/10' },
  { from: /bg-white\/5\/20/g, to: 'bg-white/20' },
  { from: /bg-white\/5\/40/g, to: 'bg-white/40' },
  { from: /bg-white\/5\/50/g, to: 'bg-white/50' },

  // Background Grays/Slates -> Emerald Dark
  { from: /bg-gray-900/g, to: 'bg-[#031C13]' },
  { from: /bg-gray-800/g, to: 'bg-[#042418]' },
  { from: /bg-gray-100/g, to: 'bg-white/5' },
  { from: /bg-gray-50/g, to: 'bg-white/5' },
  { from: /bg-slate-900/g, to: 'bg-[#031C13]' },
  { from: /bg-slate-800/g, to: 'bg-[#042418]' },
  
  // Text Grays/Slates -> White Opacity
  { from: /text-gray-900/g, to: 'text-white' },
  { from: /text-gray-800/g, to: 'text-white/90' },
  { from: /text-gray-700/g, to: 'text-white/80' },
  { from: /text-gray-600/g, to: 'text-white/70' },
  { from: /text-gray-500/g, to: 'text-white/50' },
  { from: /text-gray-400/g, to: 'text-white/40' },
  
  // Border Grays/Slates -> White Opacity
  { from: /border-gray-800/g, to: 'border-white/10' },
  { from: /border-gray-700/g, to: 'border-white/10' },
  { from: /border-gray-200/g, to: 'border-white/10' },
  { from: /border-gray-100/g, to: 'border-white/5' },
  
  // Blue -> Emerald / Amber (for badges and icons)
  { from: /bg-blue-100/g, to: 'bg-emerald-500/10' },
  { from: /border-blue-200/g, to: 'border-emerald-500/20' },
  { from: /text-blue-500/g, to: 'text-emerald-400' },
  { from: /text-blue-600/g, to: 'text-amber-400' },
  { from: /bg-blue-600/g, to: 'bg-emerald-600' },
  { from: /hover:bg-blue-700/g, to: 'hover:bg-emerald-700' },

  // Specifically for the Director/Employee pages which might have white backgrounds
  { from: /bg-white\b(?!\/)/g, to: 'bg-white/5' }, // Only replace bg-white if NOT followed by a slash
];

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory && !dirPath.includes('node_modules') && !dirPath.includes('.next')) {
      walkDir(dirPath, callback);
    } else if (dirPath.endsWith('.tsx') || dirPath.endsWith('.ts')) {
      callback(dirPath);
    }
  });
}

let modifiedFiles = 0;

// Apply globally to fix bg-white/5/5 issue
walkDir('./src/app', (filePath) => {
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

walkDir('./src/components', (filePath) => {
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

console.log(`\nSuccessfully applied UX themes and fixed syntax in ${modifiedFiles} files.`);
