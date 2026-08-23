const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, '../public/products_seed.json');
const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

const seedProducts = seedData.products || [];
const seedCategories = seedData.categories || [];

console.log('Total products in seed:', seedProducts.length);
console.log('Total categories in seed:', seedCategories.length);

// Find all categories related to Kessel
const kesselCatIds = new Set();
const kesselCats = seedCategories.filter(c => {
  const nameStr = (c.name || '').toLowerCase();
  const idStr = String(c.id || '').toLowerCase();
  const parentStr = String(c.parent_id || c.parentId || '').toLowerCase();
  return nameStr.includes('كيسيل') || nameStr.includes('kessel') || idStr.includes('kessel') || idStr.includes('كيسيل') || parentStr.includes('كيسيل');
});

kesselCats.forEach(c => kesselCatIds.add(String(c.id)));

console.log('\n========================================');
console.log('KESSEL CATEGORIES IN SEED:', kesselCats.length);
console.log('========================================');
kesselCats.forEach(c => {
  console.log(` - ID: "${c.id}" | Name: "${c.name}" | Parent: "${c.parent_id || c.parentId || null}"`);
});

// Find products matching Kessel either by mainCategoryId, subCategoryId, or Name
const kesselProducts = seedProducts.filter(p => {
  const nameStr = (p.name || '').toLowerCase();
  const mainCat = String(p.mainCategoryId || p.main_category_id || '').toLowerCase();
  const subCat = String(p.subCategoryId || p.sub_category_id || '').toLowerCase();
  return nameStr.includes('كيسيل') || nameStr.includes('kessel') || kesselCatIds.has(mainCat) || kesselCatIds.has(subCat);
});

console.log('\n========================================');
console.log('KESSEL PRODUCTS IN SEED:', kesselProducts.length);
console.log('========================================');

// Group Kessel products by subCategoryId/mainCategoryId
const bySub = {};
kesselProducts.forEach(p => {
  const sub = p.subCategoryId || p.sub_category_id || 'unassigned';
  if (!bySub[sub]) bySub[sub] = [];
  bySub[sub].push(p);
});

Object.entries(bySub).forEach(([sub, prods]) => {
  const catObj = seedCategories.find(c => String(c.id) === String(sub));
  console.log(`\nCategory/Subcategory: "${catObj ? catObj.name : sub}" (ID: ${sub}) -> ${prods.length} products`);
  prods.slice(0, 10).forEach(p => console.log(`   [ID: ${p.id}] ${p.name} | Price: ${p.price}`));
});
