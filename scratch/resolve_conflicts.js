const fs = require('fs');

// 1. Resolve src/app/api/happycall/targets/route.ts -> Choose OURS
const targetsPath = 'src/app/api/happycall/targets/route.ts';
if (fs.existsSync(targetsPath)) {
  let content = fs.readFileSync(targetsPath, 'utf8');
  if (content.includes('<<<<<<< HEAD')) {
    // Keep HEAD (ours)
    const regex = /<<<<<<< HEAD([\s\S]*?)=======[\s\S]*?>>>>>>> [0-9a-f]+/g;
    content = content.replace(regex, '$1');
    fs.writeFileSync(targetsPath, content, 'utf8');
    console.log('Resolved targets/route.ts -> Kept HEAD');
  }
}

// 2. Resolve src/app/api/happycall/upload/route.ts -> Choose OURS
const uploadPath = 'src/app/api/happycall/upload/route.ts';
if (fs.existsSync(uploadPath)) {
  let content = fs.readFileSync(uploadPath, 'utf8');
  if (content.includes('<<<<<<< HEAD')) {
    const regex = /<<<<<<< HEAD([\s\S]*?)=======[\s\S]*?>>>>>>> [0-9a-f]+/g;
    content = content.replace(regex, '$1');
    fs.writeFileSync(uploadPath, content, 'utf8');
    console.log('Resolved upload/route.ts -> Kept HEAD');
  }
}

// 3. Resolve src/app/happycall/page.tsx -> Choose OURS
const happycallPagePath = 'src/app/happycall/page.tsx';
if (fs.existsSync(happycallPagePath)) {
  let content = fs.readFileSync(happycallPagePath, 'utf8');
  if (content.includes('<<<<<<< HEAD')) {
    const regex = /<<<<<<< HEAD([\s\S]*?)=======[\s\S]*?>>>>>>> [0-9a-f]+/g;
    content = content.replace(regex, '$1');
    fs.writeFileSync(happycallPagePath, content, 'utf8');
    console.log('Resolved happycall/page.tsx -> Kept HEAD');
  }
}

// 4. Resolve src/components/DashboardSidebar.tsx -> Choose OURS (keeps amber-400)
const sidebarPath = 'src/components/DashboardSidebar.tsx';
if (fs.existsSync(sidebarPath)) {
  let content = fs.readFileSync(sidebarPath, 'utf8');
  if (content.includes('<<<<<<< HEAD')) {
    const regex = /<<<<<<< HEAD([\s\S]*?)=======[\s\S]*?>>>>>>> [0-9a-f]+/g;
    content = content.replace(regex, '$1');
    fs.writeFileSync(sidebarPath, content, 'utf8');
    console.log('Resolved DashboardSidebar.tsx -> Kept HEAD');
  }
}

// 5. Resolve src/app/page.tsx -> Merge manually
const pagePath = 'src/app/page.tsx';
if (fs.existsSync(pagePath)) {
  let content = fs.readFileSync(pagePath, 'utf8');
  if (content.includes('<<<<<<< HEAD')) {
    // We want the remote's profileForm check (which includes || !profileForm.phone),
    // but OUR styling (emerald-700 and shadow-emerald-500/30).
    const mergedBlock = `                disabled={isSaving || !profileForm.realName || !profileForm.clinicName || !profileForm.age || !profileForm.phone}
                className="w-full py-4 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none disabled:shadow-none"`;
    
    const regex = /<<<<<<< HEAD[\s\S]*?=======[\s\S]*?>>>>>>> [0-9a-f]+/g;
    content = content.replace(regex, mergedBlock);
    fs.writeFileSync(pagePath, content, 'utf8');
    console.log('Resolved page.tsx -> Merged successfully');
  }
}

// 6. Resolve src/app/master/page.tsx -> Choose THEIRS (remote) but apply emerald/gold colors
const masterPagePath = 'src/app/master/page.tsx';
if (fs.existsSync(masterPagePath)) {
  let content = fs.readFileSync(masterPagePath, 'utf8');
  if (content.includes('<<<<<<< HEAD')) {
    // Keep THEIRS (remote)
    const regex = /<<<<<<< HEAD[\s\S]*?=======([\s\S]*?)>>>>>>> [0-9a-f]+/g;
    content = content.replace(regex, '$1');
    
    // Now replace blue/indigo colors inside this master/page.tsx file to match emerald/gold theme
    content = content.replace(/bg-blue-600/g, 'bg-emerald-600');
    content = content.replace(/hover:bg-blue-700/g, 'hover:bg-emerald-700');
    content = content.replace(/bg-blue-50/g, 'bg-emerald-50/10');
    content = content.replace(/text-blue-600/g, 'text-amber-500');
    content = content.replace(/border-blue-100/g, 'border-emerald-500/20');
    
    fs.writeFileSync(masterPagePath, content, 'utf8');
    console.log('Resolved master/page.tsx -> Kept THEIRS and themed to Emerald/Gold');
  }
}
