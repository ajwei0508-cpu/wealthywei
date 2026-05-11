import fs from 'fs';
const content = fs.readFileSync('c:/Users/0508a/bareun-app/src/app/master/page.tsx', 'utf8');
let openBraces = 0;
let closeBraces = 0;
for (let char of content) {
  if (char === '{') openBraces++;
  if (char === '}') closeBraces++;
}
console.log(`Open: ${openBraces}, Close: ${closeBraces}`);
