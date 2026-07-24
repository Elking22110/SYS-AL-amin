const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'public', 'products_seed.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
const products = data.products || [];

console.log(`Total products: ${products.length}`);
const matches = products.filter(p => p.name.includes('DR11') || p.name.includes('PPR'));
console.log(`Matching products: ${matches.length}`);

// Print first 20 matches
matches.slice(0, 30).forEach(p => {
  console.log(`- ID: ${p.id} | Name: ${p.name}`);
});
