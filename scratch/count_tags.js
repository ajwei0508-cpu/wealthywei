import fs from 'fs';
const content = fs.readFileSync('c:/Users/0508a/bareun-app/src/app/master/page.tsx', 'utf8');
let openTags = 0;
let closeTags = 0;
// Very simple check
for (let i = 0; i < content.length; i++) {
  if (content[i] === '<' && content[i+1] !== '/' && content[i+1] !== '!' && content[i+1] !== ' ' && isNaN(parseInt(content[i+1]))) {
    // Check if it's not part of a comparison like < count
    // This is hard to do with a simple loop, but let's try
    let j = i + 1;
    let tag = '';
    while(j < content.length && content[j] !== ' ' && content[j] !== '>') {
      tag += content[j];
      j++;
    }
    if (tag && /^[a-zA-Z]/.test(tag)) {
        openTags++;
    }
  }
  if (content[i] === '<' && content[i+1] === '/') {
    closeTags++;
  }
}
console.log(`Open: ${openTags}, Close: ${closeTags}`);
