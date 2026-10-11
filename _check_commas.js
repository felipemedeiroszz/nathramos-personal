const fs = require('fs');
const s = fs.readFileSync('src/messages/en-US.json', 'utf8');
const lines = s.split('\n');
for (let i = 0; i < lines.length; i++) {
  const t = lines[i].trim();
  if (/^},?$/.test(t) && i > 0) {
    const prev = lines[i - 1].trim();
    if (prev.endsWith(',')) {
      console.log('trailing comma before line', i + 1, '->', prev);
    }
  }
}
console.log('done');
