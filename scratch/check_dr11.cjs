const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'public', 'products_seed.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
const products = data.products || [];

const prefixes = new Set();
products.forEach(p => {
  const match = p.name.match(/^PPR[A-Z0-9-]*\b/i);
  if (match) {
    prefixes.add(match[0]);
  }
});

console.log("Unique prefixes found:");
console.log(Array.from(prefixes));
