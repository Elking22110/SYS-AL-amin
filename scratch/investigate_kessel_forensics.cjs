/**
 * FORENSIC KESSEL INVESTIGATION
 * =============================
 * Inspects all KESSEL products in:
 * 1. public/products_seed.json
 * 2. scratch/kessel_*.json / audit reports / backups
 * 3. Supabase products table
 *
 * DOES NOT DELETE OR MODIFY ANYTHING.
 * Run: node scratch/investigate_kessel_forensics.cjs
 */
'use strict';

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const SUPABASE_URL = 'akkjkjbnhafmolpvoiln.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

function fetchSupabase(pathStr) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: SUPABASE_URL,
      path: pathStr,
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json'
      }
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('\n' + '═'.repeat(75));
  console.log('  FORENSIC KESSEL INVESTIGATION');
  console.log('═'.repeat(75));

  // 1. Inspect public/products_seed.json for Kessel items
  const seedPath = path.join(__dirname, '../public/products_seed.json');
  const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  const seedProducts = seedData.products || [];
  const seedCategories = seedData.categories || [];

  const kesselSeedProducts = seedProducts.filter(p => {
    const nameStr = (p.name || '').toLowerCase();
    const catStr = String(p.mainCategoryId || p.main_category_id || p.subCategoryId || p.sub_category_id || '').toLowerCase();
    return nameStr.includes('كيسيل') || nameStr.includes('kessel') || catStr.includes('كيسيل') || catStr.includes('kessel');
  });

  console.log(`\n[Seed Catalog] KESSEL products found in public/products_seed.json: ${kesselSeedProducts.length}`);

  // 2. Check scratch audit reports / backups for Kessel
  const scratchDir = __dirname;
  const scratchFiles = fs.readdirSync(scratchDir);

  const kesselReports = scratchFiles.filter(f => f.toLowerCase().includes('kessel') && f.endsWith('.json'));
  console.log('\n[Scratch Kessel Files]:', kesselReports);

  for (const f of kesselReports) {
    try {
      const content = JSON.parse(fs.readFileSync(path.join(scratchDir, f), 'utf8'));
      console.log(`  → ${f}: ${Array.isArray(content) ? content.length : Object.keys(content).length} keys/items`);
    } catch (_) {}
  }

  // 3. Fetch current KESSEL products from Supabase
  const cloudProdsP1 = await fetchSupabase('/rest/v1/products?select=*&limit=1000&offset=0');
  const cloudProdsP2 = await fetchSupabase('/rest/v1/products?select=*&limit=1000&offset=1000');
  const cloudProdsP3 = await fetchSupabase('/rest/v1/products?select=*&limit=1000&offset=2000');
  const allCloudProds = [...(Array.isArray(cloudProdsP1) ? cloudProdsP1 : []), ...(Array.isArray(cloudProdsP2) ? cloudProdsP2 : []), ...(Array.isArray(cloudProdsP3) ? cloudProdsP3 : [])];

  const kesselCloudProducts = allCloudProds.filter(p => {
    const nameStr = (p.name || '').toLowerCase();
    const catStr = String(p.main_category_id || p.sub_category_id || '').toLowerCase();
    return nameStr.includes('كيسيل') || nameStr.includes('kessel') || catStr.includes('كيسيل') || catStr.includes('kessel');
  });

  console.log(`\n[Supabase Cloud] KESSEL products found in Supabase: ${kesselCloudProducts.length}`);

  // 4. Print list of KESSEL products in seed
  console.log('\n' + '─'.repeat(75));
  console.log('  KESSEL PRODUCTS IN SEED CATALOG:');
  console.log('─'.repeat(75));
  kesselSeedProducts.forEach((p, i) => {
    console.log(`  [${i+1}] ID: ${p.id} | Barcode: ${p.barcode || '-'} | Price: ${p.price} | MainCat: "${p.mainCategoryId || p.main_category_id || '-'}" | SubCat: "${p.subCategoryId || p.sub_category_id || '-'}" | Name: "${p.name}"`);
  });

  // 5. Check Categories related to Kessel in seed
  const kesselCategories = seedCategories.filter(c => {
    const nameStr = (c.name || '').toLowerCase();
    const idStr = (c.id || '').toLowerCase();
    return nameStr.includes('كيسيل') || nameStr.includes('kessel') || idStr.includes('kessel') || idStr.includes('كيسيل');
  });

  console.log('\n' + '─'.repeat(75));
  console.log('  KESSEL CATEGORIES IN SEED CATALOG:');
  console.log('─'.repeat(75));
  kesselCategories.forEach((c, i) => {
    console.log(`  [${i+1}] ID: "${c.id}" | Name: "${c.name}" | Parent: "${c.parent_id || c.parentId || null}"`);
  });

  // Save report to disk
  fs.writeFileSync(path.join(scratchDir, 'kessel_investigation_report.json'), JSON.stringify({
    seedKesselProductsCount: kesselSeedProducts.length,
    cloudKesselProductsCount: kesselCloudProducts.length,
    seedKesselCategoriesCount: kesselCategories.length,
    seedKesselProducts: kesselSeedProducts,
    seedKesselCategories: kesselCategories,
    cloudKesselProducts: kesselCloudProducts
  }, null, 2));

  console.log('\n' + '═'.repeat(75));
  console.log(`  Saved discovery report to: ${path.join(scratchDir, 'kessel_investigation_report.json')}`);
  console.log('═'.repeat(75) + '\n');
}

main().catch(console.error);
