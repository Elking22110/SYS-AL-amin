const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, '..', 'public', 'products_seed.json');
const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

const targets = seedData.products.filter(p => {
  const name = p.name || '';
  const mainCat = p.mainCategoryId || '';
  const isMatchedCat = mainCat === 'Br' || mainCat === 'اسمارت ابيض' || mainCat === 'كيسيل';
  const hasNameMatch = name.toLowerCase().includes('br') || name.includes('سمارت') || name.includes('كيسل') || name.includes('كيسيل');
  return hasNameMatch && !isMatchedCat;
});

console.log('Count of brand products in other categories:', targets.length);
targets.slice(0, 30).forEach(p => {
  console.log(`- [ID: ${p.id}] [Category: ${p.mainCategoryId}] ${p.name}`);
});
