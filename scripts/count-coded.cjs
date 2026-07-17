const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, '..', 'public', 'products_seed.json');
const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const all = seedData.products || [];

const br = all.filter(p => p.mainCategoryId === 'Br');
const smart = all.filter(p => p.mainCategoryId === 'اسمارت ابيض');
const ks = all.filter(p => p.mainCategoryId === 'كيسيل');

const brCoded = br.filter(p => p.barcode);
const smartCoded = smart.filter(p => p.barcode);
const ksCoded = ks.filter(p => p.barcode);

const totalCodedAll = all.filter(p => p.barcode);

console.log('=== COUNT OF CODED PRODUCTS ===');
console.log(`BR: ${brCoded.length} coded out of ${br.length} total products`);
console.log(`Smart: ${smartCoded.length} coded out of ${smart.length} total products`);
console.log(`Kessel: ${ksCoded.length} coded out of ${ks.length} total products`);
console.log(`\nTotal matched/coded for these 3 categories: ${brCoded.length + smartCoded.length + ksCoded.length}`);
console.log(`Total coded products in the entire system: ${totalCodedAll.length} out of ${all.length} total products`);
