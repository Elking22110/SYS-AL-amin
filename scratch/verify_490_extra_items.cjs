/**
 * IDENTIFY THE 490 EXTRA PRODUCTS & CATEGORIES
 * ============================================
 * Compares approved 2,539 catalog with legacy migration backups to identify the 490 extra products.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, '../public/products_seed.json');
const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const approvedProducts = seedData.products || [];
const approvedCategories = seedData.categories || [];

const approvedIds = new Set(approvedProducts.map(p => String(p.id)));
const approvedCatIds = new Set(approvedCategories.map(c => String(c.id)));
const approvedCatNames = new Set(approvedCategories.map(c => c.name));

console.log(`\n========================================`);
console.log(`APPROVED CANONICAL BASELINE:`);
console.log(`  Products   : ${approvedProducts.length}`);
console.log(`  Categories : ${approvedCategories.length}`);
console.log(`========================================\n`);

// Inspect previous backups in scratch folder to find where 3029 items came from
const scratchDir = __dirname;
const files = fs.readdirSync(scratchDir).filter(f => f.endsWith('.json'));

files.forEach(f => {
  try {
    const content = JSON.parse(fs.readFileSync(path.join(scratchDir, f), 'utf8'));
    const prods = Array.isArray(content) ? content : (content.products || []);
    if (prods.length > 2539) {
      console.log(`📁 Found large dataset file: ${f} (${prods.length} products)`);
      const extra = prods.filter(p => p && !approvedIds.has(String(p.id)));
      console.log(`   Extra products not in approved set: ${extra.length}`);
      if (extra.length > 0) {
        console.log(`   Sample extra items (up to 5):`);
        extra.slice(0, 5).forEach(e => {
          console.log(`     - [ID: ${e.id}] ${e.name} | Price: ${e.price} | MainCat: "${e.main_category_id || e.mainCategoryId || e.category}"`);
        });
      }
    }
  } catch (_) {}
});

console.log('\n========================================\n');
