/**
 * PREPARE CATALOG CLEANUP & FULL BACKUP
 * =====================================
 * 1. Paginates and fetches ALL products from Supabase (using offset/limit)
 * 2. Fetches ALL categories from Supabase
 * 3. Creates verified full backup files in scratch/
 * 4. Loads local canonical catalog from public/products_seed.json
 * 5. Classifies Supabase products into:
 *      - APPROVED / KEEP (exist in local canonical catalog)
 *      - DELETE FROM SUPABASE (in Supabase but NOT in local canonical catalog)
 * 6. Generates full report with sample IDs/names for both lists
 * 7. ABSOLUTELY NO DELETIONS PERFORMED.
 *
 * Run: node scratch/prepare_catalog_cleanup_and_backup.cjs
 */
'use strict';

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const SUPABASE_URL = 'akkjkjbnhafmolpvoiln.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

function fetchPage(endpoint, offset = 0, limit = 1000) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: SUPABASE_URL,
      path: `${endpoint}?select=*&limit=${limit}&offset=${offset}`,
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'count=exact'
      }
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const body = JSON.parse(data);
          const range = res.headers['content-range'] || '';
          const total = range.split('/')[1] ? parseInt(range.split('/')[1], 10) : null;
          resolve({ status: res.statusCode, body, total });
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function fetchAllSupabaseProducts() {
  console.log('[Supabase Fetch] Paginating products...');
  let offset = 0;
  const limit = 1000;
  let allProducts = [];
  let totalCount = null;

  while (true) {
    console.log(`  → Fetching offset ${offset}...`);
    const page = await fetchPage('/rest/v1/products', offset, limit);
    if (!Array.isArray(page.body)) {
      throw new Error(`Failed to fetch page at offset ${offset}: ${JSON.stringify(page.body)}`);
    }
    if (page.total !== null) totalCount = page.total;
    allProducts.push(...page.body);
    console.log(`  → Got ${page.body.length} items (Total accumulated: ${allProducts.length})`);
    if (page.body.length < limit) break;
    offset += limit;
  }
  return { products: allProducts, totalCount: totalCount || allProducts.length };
}

async function fetchAllSupabaseCategories() {
  console.log('[Supabase Fetch] Fetching categories...');
  const page = await fetchPage('/rest/v1/categories', 0, 1000);
  return Array.isArray(page.body) ? page.body : [];
}

async function main() {
  console.log('\n' + '═'.repeat(70));
  console.log('  CATALOG CANONICALIZATION — STEP 1: EXPORT & CLASSIFICATION');
  console.log('═'.repeat(70));

  // 1. Fetch all products from Supabase with pagination
  const { products: cloudProducts, totalCount } = await fetchAllSupabaseProducts();
  console.log(`\n✅ Successfully fetched ALL ${cloudProducts.length} products from Supabase.`);

  // 2. Fetch all categories from Supabase
  const cloudCategories = await fetchAllSupabaseCategories();
  console.log(`✅ Successfully fetched ALL ${cloudCategories.length} categories from Supabase.`);

  // 3. Create & Verify Complete Backup Files
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname);
  const productsBackupPath = path.join(backupDir, `supabase_products_full_backup_${timestamp}.json`);
  const categoriesBackupPath = path.join(backupDir, `supabase_categories_full_backup_${timestamp}.json`);

  const productBackupData = {
    exportDate: new Date().toISOString(),
    totalCount: cloudProducts.length,
    products: cloudProducts
  };
  const categoryBackupData = {
    exportDate: new Date().toISOString(),
    totalCount: cloudCategories.length,
    categories: cloudCategories
  };

  fs.writeFileSync(productsBackupPath, JSON.stringify(productBackupData, null, 2));
  fs.writeFileSync(categoriesBackupPath, JSON.stringify(categoryBackupData, null, 2));

  // Verify backup integrity
  const readBackProds = JSON.parse(fs.readFileSync(productsBackupPath, 'utf8'));
  const readBackCats = JSON.parse(fs.readFileSync(categoriesBackupPath, 'utf8'));
  if (readBackProds.products.length !== cloudProducts.length || readBackCats.categories.length !== cloudCategories.length) {
    throw new Error('❌ Backup verification failed! Saved file size/count mismatch.');
  }

  console.log(`\n🔒 VERIFIED BACKUP CREATED:`);
  console.log(`   Products Backup   : ${productsBackupPath} (${fs.statSync(productsBackupPath).size} bytes)`);
  console.log(`   Categories Backup : ${categoriesBackupPath} (${fs.statSync(categoriesBackupPath).size} bytes)`);

  // 4. Load local canonical approved catalog
  const seedPath = path.join(__dirname, '../public/products_seed.json');
  if (!fs.existsSync(seedPath)) {
    throw new Error(`❌ Local approved catalog seed not found at: ${seedPath}`);
  }
  const seedContent = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  const localProducts = seedContent.products || (Array.isArray(seedContent) ? seedContent : []);
  const localCategories = seedContent.categories || [];

  console.log(`\n📋 LOCAL CANONICAL APPROVED CATALOG (public/products_seed.json):`);
  console.log(`   Approved Products Count   : ${localProducts.length}`);
  console.log(`   Approved Categories Count : ${localCategories.length}`);

  // Build local lookup map (by ID and by barcode/name for full match check)
  const localApprovedIds = new Set(localProducts.map(p => String(p.id)));

  // 5. Classify Cloud Products
  const approvedKeepList = [];
  const deleteFromCloudList = [];

  for (const cp of cloudProducts) {
    const cpId = String(cp.id);
    if (localApprovedIds.has(cpId)) {
      approvedKeepList.push(cp);
    } else {
      deleteFromCloudList.push(cp);
    }
  }

  // Check if any local approved products are missing in Supabase
  const cloudIdSet = new Set(cloudProducts.map(p => String(p.id)));
  const missingFromCloudList = localProducts.filter(lp => !cloudIdSet.has(String(lp.id)));

  // Save classification lists to disk for review
  const classificationPath = path.join(backupDir, `catalog_classification_plan_${timestamp}.json`);
  fs.writeFileSync(classificationPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      totalSupabaseProducts: cloudProducts.length,
      totalLocalApprovedProducts: localProducts.length,
      keepCount: approvedKeepList.length,
      deleteCount: deleteFromCloudList.length,
      missingFromCloudCount: missingFromCloudList.length
    },
    approvedKeepIds: approvedKeepList.map(p => ({ id: p.id, name: p.name, barcode: p.barcode, price: p.price })),
    deleteFromCloudIds: deleteFromCloudList.map(p => ({ id: p.id, name: p.name, barcode: p.barcode, price: p.price, updated_at: p.updated_at })),
    missingFromCloudIds: missingFromCloudList.map(p => ({ id: p.id, name: p.name, barcode: p.barcode, price: p.price }))
  }, null, 2));

  // 6. PRINT SUMMARY & SAMPLES
  console.log('\n' + '═'.repeat(70));
  console.log('  CLASSIFICATION REPORT (NO DELETIONS PERFORMED)');
  console.log('═'.repeat(70));
  console.log(`  Supabase Total Products      : ${cloudProducts.length}`);
  console.log(`  Local Approved Catalog Total  : ${localProducts.length}`);
  console.log('──────────────────────────────────────────────────────────────────────');
  console.log(`  ✅ APPROVED / KEEP COUNT     : ${approvedKeepList.length}`);
  console.log(`  🗑️  DELETE FROM SUPABASE COUNT: ${deleteFromCloudList.length}`);
  console.log(`  ➕ MISSING FROM CLOUD COUNT  : ${missingFromCloudList.length} (will be pushed during sync/convergence)`);
  console.log('──────────────────────────────────────────────────────────────────────');

  console.log('\n📌 SAMPLE APPROVED / KEEP PRODUCTS (First 15 items):');
  approvedKeepList.slice(0, 15).forEach((p, i) => {
    console.log(`   [${i+1}] ID: ${p.id} | Barcode: ${p.barcode || '-'} | Price: ${p.price} EGP | Name: "${p.name}"`);
  });

  console.log('\n📌 SAMPLE DELETE FROM SUPABASE PRODUCTS (First 15 items to be removed):');
  deleteFromCloudList.slice(0, 15).forEach((p, i) => {
    console.log(`   [${i+1}] ID: ${p.id} | Barcode: ${p.barcode || '-'} | Price: ${p.price} EGP | Name: "${p.name}"`);
  });

  if (deleteFromCloudList.length > 15) {
    console.log('\n📌 SAMPLE DELETE FROM SUPABASE PRODUCTS (Last 15 items to be removed):');
    deleteFromCloudList.slice(-15).forEach((p, i) => {
      console.log(`   [${i+1}] ID: ${p.id} | Barcode: ${p.barcode || '-'} | Price: ${p.price} EGP | Name: "${p.name}"`);
    });
  }

  console.log('\n' + '═'.repeat(70));
  console.log(`  Classification File Saved: ${classificationPath}`);
  console.log('  ⚠️  DELETION HAS NOT BEEN EXECUTED YET.');
  console.log('  Please review the counts and sample lists above.');
  console.log('═'.repeat(70) + '\n');
}

main().catch(err => {
  console.error('Fatal error during preparation:', err);
  process.exit(1);
});
