const fs = require('fs');
const path = require('path');

const replacements = [
  // Page Backgrounds
  { from: /\bbg-\[\#F2F4F6\]\b/g, to: 'bg-[#031C13]' },
  { from: /\bbg-\[\#FAFAFB\]\b/g, to: 'bg-[#02120C]' },
  
  // Cards / Containers
  { from: /\bbg-white\b/g, to: 'bg-white/5' },
  
  // Text Colors (Slate/Zinc to White Opacities)
  { from: /\btext-slate-900\b/g, to: 'text-white' },
  { from: /\btext-slate-800\b/g, to: 'text-white/90' },
  { from: /\btext-slate-700\b/g, to: 'text-white/80' },
  { from: /\btext-slate-600\b/g, to: 'text-white/70' },
  { from: /\btext-slate-500\b/g, to: 'text-white/50' },
  { from: /\btext-zinc-900\b/g, to: 'text-white' },
  { from: /\btext-zinc-800\b/g, to: 'text-white/90' },
  { from: /\btext-zinc-700\b/g, to: 'text-white/80' },
  { from: /\btext-zinc-600\b/g, to: 'text-white/70' },
  { from: /\btext-zinc-500\b/g, to: 'text-white/50' },
  { from: /\btext-zinc-400\b/g, to: 'text-white/40' },
  { from: /\btext-zinc-300\b/g, to: 'text-white/30' },
  
  // Borders
  { from: /\bborder-zinc-200\b/g, to: 'border-white/10' },
  { from: /\bborder-zinc-100\b/g, to: 'border-white/5' },
  { from: /\bborder-zinc-50\b/g, to: 'border-white/5' },
  { from: /\bborder-slate-200\b/g, to: 'border-white/10' },
  { from: /\bborder-slate-100\b/g, to: 'border-white/5' },
  { from: /\bborder-slate-50\b/g, to: 'border-white/5' },
  { from: /\bdivide-zinc-50\b/g, to: 'divide-white/5' },
  { from: /\bdivide-zinc-100\b/g, to: 'divide-white/10' },
  { from: /\bdivide-slate-50\b/g, to: 'divide-white/5' },
  { from: /\bdivide-slate-100\b/g, to: 'divide-white/10' },
  
  // Backgrounds (Hover/Light fills)
  { from: /\bbg-zinc-200\b/g, to: 'bg-white/20' },
  { from: /\bbg-zinc-100\b/g, to: 'bg-white/10' },
  { from: /\bbg-zinc-50\b/g, to: 'bg-white/5' },
  { from: /\bbg-slate-100\b/g, to: 'bg-white/10' },
  { from: /\bbg-slate-50\b/g, to: 'bg-white/5' },
  { from: /\bhover:bg-zinc-100\b/g, to: 'hover:bg-white/10' },
  { from: /\bhover:bg-zinc-50\b/g, to: 'hover:bg-white/5' },
  { from: /\bhover:bg-slate-100\b/g, to: 'hover:bg-white/10' },
  { from: /\bhover:bg-slate-50\b/g, to: 'hover:bg-white/5' },

  // Brand/Status Colors (Light background variants to dark mode variants)
  { from: /\bbg-rose-50\b/g, to: 'bg-rose-500/10' },
  { from: /\bbg-blue-50\b/g, to: 'bg-amber-500/10' },
  { from: /\bbg-amber-50\b/g, to: 'bg-amber-500/10' },
  { from: /\bbg-emerald-50\b/g, to: 'bg-emerald-500/10' },
  { from: /\bbg-indigo-50\b/g, to: 'bg-indigo-500/10' },
  { from: /\bbg-primary\/5\b/g, to: 'bg-emerald-500/20' },
  { from: /\bborder-rose-100\b/g, to: 'border-rose-500/20' },
  { from: /\bborder-blue-100\b/g, to: 'border-amber-500/20' },
  { from: /\bborder-amber-100\b/g, to: 'border-amber-500/20' },
  { from: /\bborder-emerald-100\b/g, to: 'border-emerald-500/20' },
  { from: /\bborder-indigo-100\b/g, to: 'border-indigo-500/20' },
  
  // Status Text Accents
  { from: /\btext-rose-600\b/g, to: 'text-rose-400' },
  { from: /\btext-rose-500\b/g, to: 'text-rose-400' },
  { from: /\btext-amber-600\b/g, to: 'text-amber-400' },
  { from: /\btext-emerald-600\b/g, to: 'text-emerald-400' },
  { from: /\btext-indigo-600\b/g, to: 'text-indigo-400' },
  { from: /\btext-primary\b/g, to: 'text-emerald-400' },
  { from: /\btext-blue-600\b/g, to: 'text-amber-400' },
  
  // Replace old blue buttons to emerald 
  { from: /\bbg-blue-600\b/g, to: 'bg-emerald-600' },
  { from: /\bhover:bg-blue-700\b/g, to: 'hover:bg-emerald-700' },
  { from: /\bshadow-blue-500\/30\b/g, to: 'shadow-emerald-500/30' },
  
  // Replace specific blue-50 text to white
  { from: /\btext-blue-50\b/g, to: 'text-white/60' }
];

function walkDir(dir, callback) {
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

console.log(`\nSuccessfully updated light mode themes to Dark Emerald/Gold UX in ${modifiedFiles} files.`);
