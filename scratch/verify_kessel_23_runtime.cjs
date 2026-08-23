/**
 * VERIFY KESSEL 23 PRODUCTS & CATEGORIES
 * =====================================
 */
'use strict';

const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, '../public/products_seed.json');
const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const products = seedData.products || [];
const categories = seedData.categories || [];

const kesselProducts = products.filter(p => {
  const name = p.name || '';
  const mainCat = String(p.main_category_id || p.category || '');
  return name.includes('كيسيل') || name.includes('كيسل') || mainCat.includes('كيسيل') || mainCat.includes('كيسل');
});

console.log('\n==================================================');
console.log('KESSEL 23 CATALOG VERIFICATION');
console.log('==================================================');
console.log(`Total Kessel Products in Approved Baseline: ${kesselProducts.length}`);

const kesselMainCat = categories.find(c => c.name === 'كيسيل');
console.log(`Kessel Main Category in Seed             : ${kesselMainCat ? `ID: ${kesselMainCat.id} ("${kesselMainCat.name}")` : '❌ NOT FOUND'}`);

const kesselSubcats = categories.filter(c => c.parent_id === 'كيسيل' || c.name.includes('كيسيل'));
console.log(`Kessel Subcategories Count               : ${kesselSubcats.length}`);
kesselSubcats.forEach(sc => {
  console.log(`  - [ID: ${sc.id}] Name: "${sc.name}" | Parent: "${sc.parent_id}"`);
});

console.log('\nKessel Products List (23 items):');
kesselProducts.forEach((kp, idx) => {
  console.log(`  ${idx + 1}. [ID: ${kp.id}] "${kp.name}" | Price: ${kp.price} | MainCat: "${kp.main_category_id}" | SubCat: "${kp.sub_category_id || ''}"`);
});

console.log('\n==================================================\n');
