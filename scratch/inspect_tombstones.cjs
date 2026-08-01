const fs = require('fs');

const seed = JSON.parse(fs.readFileSync('./public/products_seed.json', 'utf8'));

console.log('=== FORENSIC DELETION SEQUENCE TRACE ===');

// Check the missing 752 products against seed categories
const missingCategories = new Set();
const missingCategoryProducts = {};

seed.products.forEach(p => {
  const main = p.mainCategoryId || 'UNASSIGNED';
  missingCategoryProducts[main] = missingCategoryProducts[main] || [];
  missingCategoryProducts[main].push(p);
});

console.log('Categories present in seed data:');
seed.categories.filter(c => !c.parentId).forEach(c => {
  console.log(`- Main Category: "${c.name}" | ID: "${c.id}"`);
});
