import fs from 'fs';
const content = fs.readFileSync('c:/Users/0508a/bareun-app/src/app/master/page.tsx', 'utf8');
let openParen = 0;
let closeParen = 0;
for (let char of content) {
  if (char === '(') openParen++;
  if (char === ')') closeParen++;
}
console.log(`Open: ${openParen}, Close: ${closeParen}`);
