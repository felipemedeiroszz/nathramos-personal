const fs = require('fs');
const s = fs.readFileSync('src/messages/en-US.json', 'utf8');
let depth = 0, inStr = false, esc = false;
let line = 1, col = 1;
let lastDepth1Line = 0;
for (let i = 0; i < s.length; i++) {
  const c = s[i];
  if (c === '\n') { line++; col = 1; continue; }
  if (esc) { esc = false; col++; continue; }
  if (c === '\\') { esc = true; col++; continue; }
  if (c === '"') { inStr = !inStr; col++; continue; }
  if (!inStr) {
    if (c === '{') { depth++; }
    else if (c === '}') {
      depth--;
      if (depth === 1) lastDepth1Line = line;
      if (depth < 0) { console.log('NEGATIVE depth at line', line, 'col', col, 'pos', i); break; }
    }
  }
  col++;
}
console.log('final depth:', depth, 'last depth=1 line:', lastDepth1Line);
