const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, '..', 'public', 'products_seed.json');
const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const allProducts = seedData.products || [];

// Get unmatched BR/Smart/Kessel products based on missing barcode/sku
const brProducts    = allProducts.filter(p => p.mainCategoryId === 'Br');
const smartProducts = allProducts.filter(p => p.mainCategoryId === 'اسمارت ابيض');
const ksProducts    = allProducts.filter(p => p.mainCategoryId === 'كيسيل');

const unmatchedBR    = brProducts.filter(p => !p.barcode && !p.sku);
const unmatchedSmart = smartProducts.filter(p => !p.barcode && !p.sku);
const unmatchedKS    = ksProducts.filter(p => !p.barcode && !p.sku);

console.log(`\n=== True Unmatched BR (${unmatchedBR.length} / ${brProducts.length}) ===`);
unmatchedBR.forEach(p => console.log(`  [${p.id}] ${p.name}`));

console.log(`\n=== True Unmatched Smart (${unmatchedSmart.length} / ${smartProducts.length}) ===`);
unmatchedSmart.forEach(p => console.log(`  [${p.id}] ${p.name}`));

console.log(`\n=== True Unmatched Kessel (${unmatchedKS.length} / ${ksProducts.length}) ===`);
unmatchedKS.forEach(p => console.log(`  [${p.id}] ${p.name}`));
