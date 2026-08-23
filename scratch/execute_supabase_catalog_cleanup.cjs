/**
 * STEP 1: EXECUTE SUPABASE CATALOG CLEANUP & CONVERGENCE
 * =======================================================
 * 1. Reads classification plan (282 to delete, 426 missing to add)
 * 2. Deletes 282 obsolete products from Supabase (batches of 50)
 * 3. Upserts 426 missing approved products to Supabase (batches of 100)
 * 4. Verifies final count in Supabase equals 2,746
 *
 * Run: node scratch/execute_supabase_catalog_cleanup.cjs
 */
'use strict';

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const SUPABASE_URL = 'akkjkjbnhafmolpvoiln.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

function requestSupabase(endpoint, method = 'GET', body = null, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: SUPABASE_URL,
      path: endpoint,
      method,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'count=exact',
        ...extraHeaders
      }
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          const range = res.headers['content-range'] || '';
          const total = range.split('/')[1] ? parseInt(range.split('/')[1], 10) : null;
          resolve({ status: res.statusCode, headers: res.headers, body: parsed, total });
        } catch (_) {
          resolve({ status: res.statusCode, headers: res.headers, body: data, total: null });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Find latest classification file in scratch/
function findLatestClassificationFile() {
  const scratchDir = __dirname;
  const files = fs.readdirSync(scratchDir).filter(f => f.startsWith('catalog_classification_plan_') && f.endsWith('.json'));
  if (files.length === 0) throw new Error('No catalog_classification_plan_*.json file found!');
  files.sort().reverse();
  return path.join(scratchDir, files[0]);
}

async function countSupabaseProducts() {
  const res = await requestSupabase('/rest/v1/products?select=id&limit=1');
  if (res.headers['content-range']) {
    return parseInt(res.headers['content-range'].split('/')[1], 10);
  }
  return 0;
}

async function main() {
  console.log('\n' + '═'.repeat(75));
  console.log('  STEP 1: SUPABASE CATALOG CLEANUP & CONVERGENCE EXECUTION');
  console.log('═'.repeat(75));

  const planFile = findLatestClassificationFile();
  console.log(`[Plan] Using classification plan: ${planFile}`);
  const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));

  const deleteItems = plan.deleteFromCloudIds || [];
  const missingItems = plan.missingFromCloudIds || [];

  console.log(`\n  Items to DELETE from Supabase : ${deleteItems.length}`);
  console.log(`  Items to UPSERT to Supabase   : ${missingItems.length}`);

  const initialCount = await countSupabaseProducts();
  console.log(`  Initial Supabase product count : ${initialCount}`);

  // 1. DELETE OBSOLETE PRODUCTS (in batches of 50 using in.(id1,id2,...))
  console.log('\n[1/3] Deleting 282 obsolete products from Supabase...');
  let deletedCount = 0;
  const deleteBatchSize = 50;

  for (let i = 0; i < deleteItems.length; i += deleteBatchSize) {
    const chunk = deleteItems.slice(i, i + deleteBatchSize);
    // Encode IDs for URL
    const idListParam = chunk.map(item => encodeURIComponent(String(item.id))).join(',');
    const deletePath = `/rest/v1/products?id=in.(${idListParam})`;
    
    const res = await requestSupabase(deletePath, 'DELETE');
    if (res.status >= 200 && res.status < 300) {
      deletedCount += chunk.length;
      console.log(`  → Deleted batch ${Math.floor(i / deleteBatchSize) + 1}/${Math.ceil(deleteItems.length / deleteBatchSize)} (${chunk.length} items, total deleted: ${deletedCount})`);
    } else {
      console.error(`  ❌ Failed deleting batch starting at index ${i}: Status ${res.status}`, res.body);
    }
  }

  console.log(`✅ Deletion phase complete. Deleted: ${deletedCount}/${deleteItems.length} products.`);

  // 2. UPSERT MISSING APPROVED PRODUCTS (in batches of 100)
  console.log('\n[2/3] Upserting 426 missing approved products to Supabase...');
  
  // Load full product objects from local products_seed.json
  const seedPath = path.join(__dirname, '../public/products_seed.json');
  const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  const localProductsMap = new Map((seedData.products || []).map(p => [String(p.id), p]));

  const upsertPayloads = missingItems.map(item => {
    const local = localProductsMap.get(String(item.id)) || item;
    return {
      id: String(local.id),
      name: local.name,
      price: local.price ?? 0,
      cost: local.cost ?? 0,
      stock: local.stock ?? 0,
      barcode: local.barcode ?? null,
      main_category_id: local.mainCategoryId || local.main_category_id || null,
      sub_category_id: local.subCategoryId || local.sub_category_id || null,
      image_path: local.imagePath || local.image_path || null,
      updated_at: local.updated_at || new Date().toISOString()
    };
  });

  let upsertedCount = 0;
  const upsertBatchSize = 100;

  for (let i = 0; i < upsertPayloads.length; i += upsertBatchSize) {
    const chunk = upsertPayloads.slice(i, i + upsertBatchSize);
    const res = await requestSupabase('/rest/v1/products', 'POST', chunk, {
      'Prefer': 'resolution=merge-duplicates'
    });
    if (res.status >= 200 && res.status < 300) {
      upsertedCount += chunk.length;
      console.log(`  → Upserted batch ${Math.floor(i / upsertBatchSize) + 1}/${Math.ceil(upsertPayloads.length / upsertBatchSize)} (${chunk.length} items, total upserted: ${upsertedCount})`);
    } else {
      console.error(`  ❌ Failed upserting batch starting at index ${i}: Status ${res.status}`, res.body);
    }
  }

  console.log(`✅ Upsert phase complete. Upserted: ${upsertedCount}/${missingItems.length} products.`);

  // 3. VERIFY FINAL COUNT IN SUPABASE
  console.log('\n[3/3] Verifying final count in Supabase...');
  const finalCount = await countSupabaseProducts();
  console.log(`  Final Supabase Product Count : ${finalCount}`);
  console.log(`  Expected Count               : 2746`);

  if (finalCount === 2746) {
    console.log(`\n🎉 PERFECT CONVERGENCE! Supabase product count matches approved catalog (2,746).`);
  } else {
    console.warn(`\n⚠️ Count mismatch: Supabase has ${finalCount}, expected 2,746.`);
  }

  console.log('\n' + '═'.repeat(75) + '\n');
}

main().catch(err => {
  console.error('Fatal error during Supabase cleanup:', err);
  process.exit(1);
});
