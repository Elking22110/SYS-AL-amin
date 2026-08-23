/**
 * ANALYZE ACTUAL EXE RUNTIME EXTRA PRODUCTS (490 ITEMS)
 * ====================================================
 */
'use strict';

const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, '../public/products_seed.json');
const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const approvedProducts = seedData.products || [];
const approvedCategories = seedData.categories || [];

const approvedProdIds = new Set(approvedProducts.map(p => String(p.id)));
const approvedCatIds = new Set(approvedCategories.map(c => String(c.id)));

const dumpPath = path.join(__dirname, 'exe_runtime_products_products_pos-system-akkjkjbnhafmolpvoiln.json');
if (!fs.existsSync(dumpPath)) {
  console.error(`Dump file not found: ${dumpPath}`);
  process.exit(1);
}

const runtimeProducts = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));

console.log('\n==================================================');
console.log('ACTUAL EXE RUNTIME PRODUCTS ANALYSIS');
console.log('==================================================');
console.log(`Total Runtime Products in IDB : ${runtimeProducts.length}`);
console.log(`Approved Products Baseline    : ${approvedProducts.length}`);

const approvedMatch = [];
const exeOnlyExtra = [];

runtimeProducts.forEach(p => {
  const pid = String(p.id);
  if (approvedProdIds.has(pid)) {
    approvedMatch.push(p);
  } else {
    exeOnlyExtra.push(p);
  }
});

console.log(`Approved Match Count          : ${approvedMatch.length}`);
console.log(`EXE-Only Extra Products       : ${exeOnlyExtra.length}`);

const missingFromExe = approvedProducts.filter(p => !runtimeProducts.some(r => String(r.id) === String(p.id)));
console.log(`Approved Missing From EXE     : ${missingFromExe.length}`);

console.log('\nSample EXE-Only Extra Products (first 15):');
exeOnlyExtra.slice(0, 15).forEach(e => {
  console.log(`  - [ID: ${e.id}] Name: "${e.name}" | Price: ${e.price} | Barcode: "${e.barcode || ''}" | Cat: "${e.main_category_id || e.category || ''}"`);
});

// Save detailed breakdown to scratch
const breakdown = {
  timestamp: new Date().toISOString(),
  totalRuntimeCount: runtimeProducts.length,
  approvedCount: approvedProducts.length,
  approvedMatchCount: approvedMatch.length,
  exeOnlyExtraCount: exeOnlyExtra.length,
  missingFromExeCount: missingFromExe.length,
  exeOnlyExtraSample: exeOnlyExtra.slice(0, 50)
};

fs.writeFileSync(
  path.join(__dirname, 'actual_exe_catalog_breakdown.json'),
  JSON.stringify(breakdown, null, 2)
);

console.log('\nSaved detailed breakdown to scratch/actual_exe_catalog_breakdown.json');
console.log('==================================================\n');
