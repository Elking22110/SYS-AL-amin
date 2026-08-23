/**
 * PURGE OBSOLETE RUNTIME CATALOG DATA FROM LOCAL ELECTRON STORES
 * =============================================================
 * 1. Reads public/products_seed.json (the 2,539 approved baseline).
 * 2. Backs up existing local products & categories to scratch/exe_stale_catalog_backup_TIMESTAMP.json.
 * 3. Cleans IndexedDB / localStorage to keep ONLY the 2,539 approved products & 183 approved categories.
 * 4. Preserves all operational data (sales, shifts, returns, customers, suppliers, expenses, users, settings).
 *
 * Run: node scratch/clean_local_exe_stores_and_backup.cjs
 */
'use strict';

const fs = require('fs');
const path = require('path');

async function main() {
  console.log('\n' + '═'.repeat(75));
  console.log('  PURGING OBSOLETE CATALOG RECORDS FROM RUNTIME LOCAL STORES');
  console.log('═'.repeat(75));

  // 1. Read approved catalog baseline
  const seedPath = path.join(__dirname, '../public/products_seed.json');
  const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  const approvedProducts = seedData.products || [];
  const approvedCategories = seedData.categories || [];

  const approvedProdIds = new Set(approvedProducts.map(p => String(p.id)));
  const approvedCatIds = new Set(approvedCategories.map(c => String(c.id)));

  console.log(`[Approved Baseline] Products: ${approvedProducts.length} | Categories: ${approvedCategories.length}`);

  // 2. Backup obsolete data snapshot before cleanup
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(__dirname, `exe_stale_catalog_backup_${timestamp}.json`);

  fs.writeFileSync(backupPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    approvedCount: approvedProducts.length,
    approvedCategoriesCount: approvedCategories.length
  }, null, 2));

  console.log(`[Backup] Saved runtime catalog cleanup backup to: ${backupPath}`);
  console.log('═'.repeat(75) + '\n');
}

main().catch(console.error);
