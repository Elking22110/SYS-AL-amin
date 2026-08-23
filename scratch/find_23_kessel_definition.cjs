const fs = require('fs');
const path = require('path');

const scratchDir = __dirname;
const files = fs.readdirSync(scratchDir);

console.log('Searching for 23 KESSEL products across all scratch files...');

files.forEach(file => {
  if (!file.endsWith('.json') && !file.endsWith('.cjs') && !file.endsWith('.js') && !file.endsWith('.txt')) return;
  const p = path.join(scratchDir, file);
  try {
    const text = fs.readFileSync(p, 'utf8');
    if (text.includes('23') && text.toLowerCase().includes('kessel')) {
      console.log(`\n========================================`);
      console.log(`Matched File: ${file}`);
      console.log(`========================================`);
      // Print first 500 chars or relevant snippets
      const lines = text.split('\n').filter(l => l.includes('23') || l.toLowerCase().includes('kessel'));
      console.log(lines.slice(0, 15).join('\n'));
    }
  } catch (_) {}
});
