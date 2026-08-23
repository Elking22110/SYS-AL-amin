const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../public');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

console.log('JSON files in public/:');
files.forEach(f => {
  const p = path.join(dir, f);
  const content = JSON.parse(fs.readFileSync(p, 'utf8'));
  const prods = content.products || (Array.isArray(content) ? content : []);
  const cats = content.categories || [];
  console.log(`  - ${f}: ${prods.length} products, ${cats.length} categories (${fs.statSync(p).size} bytes)`);
});

const scratchDir = __dirname;
const scratchFiles = fs.readdirSync(scratchDir).filter(f => f.endsWith('.json'));
console.log('\nJSON files in scratch/:');
scratchFiles.forEach(f => {
  const p = path.join(scratchDir, f);
  try {
    const content = JSON.parse(fs.readFileSync(p, 'utf8'));
    const prods = content.products || (Array.isArray(content) ? content : []);
    const cats = content.categories || [];
    console.log(`  - ${f}: ${prods.length} products, ${cats.length} categories (${fs.statSync(p).size} bytes)`);
  } catch (e) {
    console.log(`  - ${f}: (error parsing or non-json format: ${e.message})`);
  }
});
