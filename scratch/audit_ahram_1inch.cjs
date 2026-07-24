const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, '..', 'public', 'products_seed.json');
const data = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const products = data.products || [];

// First, let's see all subcategory names related to Ahram 1 inch poly
const ahramSubcats = new Set();
products.forEach(p => {
  if ((p.name || '').includes('الاهرام') || (p.name || '').includes('اهرام')) {
    if (p.subCategoryId) ahramSubcats.add(p.subCategoryId);
  }
});
console.log('All Ahram subcategories:', Array.from(ahramSubcats));

// Products in "قطع ١بوصه الاهرام ابيض" - show full list
console.log('\n--- قطع ١بوصه الاهرام ابيض (current members) ---');
const oneInchWhite = products.filter(p => p.subCategoryId === 'قطع ١بوصه الاهرام ابيض');
console.log(`Count: ${oneInchWhite.length}`);
oneInchWhite.forEach(p => console.log(`  [${p.id}] ${p.name}`));

// Products in "قطع ١بوصه بولى الاهرام" - check if exists
console.log('\n--- قطع ١بوصه بولى الاهرام (if exists) ---');
const oneInchPolySearch = products.filter(p => 
  p.subCategoryId && (
    p.subCategoryId.includes('١بوصه بولى') || 
    p.subCategoryId.includes('1 بوصه بولي') ||
    p.subCategoryId.includes('١ بوصه بولى')
  )
);
console.log(`Count: ${oneInchPolySearch.length}`);
oneInchPolySearch.forEach(p => console.log(`  [${p.id}] subCat:${p.subCategoryId} | ${p.name}`));
