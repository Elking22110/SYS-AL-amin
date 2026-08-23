/**
 * STEP 1: FULL SUPABASE INVENTORY & EXACT ID RECONCILIATION
 * =========================================================
 * 1. Reads local canonical catalog from public/products_seed.json (2,539 products).
 * 2. Fetches ALL products from Supabase using deterministic pagination:
 *      .order('updated_at', { ascending: true })
 *      .order('id', { ascending: true })
 * 3. Compares exact IDs:
 *      - MATCHED_PRODUCTS
 *      - LOCAL_ONLY_PRODUCTS
 *      - SUPABASE_ONLY_PRODUCTS
 * 4. Generates scratch/final_catalog_diff.json
 *
 * Run: node scratch/step1_full_inventory_and_diff.cjs
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://akkjkjbnhafmolpvoiln.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log('\n' + '═'.repeat(75));
  console.log('  STEP 1: FULL SUPABASE INVENTORY & EXACT ID RECONCILIATION');
  console.log('═'.repeat(75));

  // 1. Read local canonical seed catalog
  const seedPath = path.join(__dirname, '../public/products_seed.json');
  const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  const seedProducts = seedData.products || [];

  console.log(`[Local Seed Catalog] Total products in public/products_seed.json: ${seedProducts.length}`);

  const localMap = new Map();
  seedProducts.forEach(p => {
    localMap.set(String(p.id), p);
  });

  // 2. Fetch all products from Supabase using deterministic pagination
  let offset = 0;
  const pageSize = 1000;
  let allCloudProducts = [];
  let hasMore = true;

  console.log('Fetching ALL products from Supabase using deterministic pagination...');
  while (hasMore) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('updated_at', { ascending: true })
      .order('id', { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('❌ Supabase fetch error:', error.message);
      throw error;
    }

    if (data && data.length > 0) {
      allCloudProducts.push(...data);
      console.log(`  → Page fetched: ${data.length} items (Total so far: ${allCloudProducts.length})`);
      offset += data.length;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  const cloudMap = new Map();
  const cloudDuplicates = [];
  allCloudProducts.forEach(p => {
    const sid = String(p.id);
    if (cloudMap.has(sid)) {
      cloudDuplicates.push(p);
    } else {
      cloudMap.set(sid, p);
    }
  });

  console.log(`\n[Supabase Cloud] Total products fetched: ${allCloudProducts.length} (${cloudMap.size} unique IDs)`);

  // 3. Compare exact IDs
  const matched = [];
  const localOnly = [];
  const supabaseOnly = [];

  localMap.forEach((localProd, sid) => {
    if (cloudMap.has(sid)) {
      matched.push({
        id: sid,
        name: localProd.name,
        price: localProd.price
      });
    } else {
      localOnly.push({
        id: sid,
        name: localProd.name,
        price: localProd.price,
        barcode: localProd.barcode || null,
        main_category_id: localProd.mainCategoryId || localProd.main_category_id || 'عام',
        sub_category_id: localProd.subCategoryId || localProd.sub_category_id || 'عام'
      });
    }
  });

  cloudMap.forEach((cloudProd, sid) => {
    if (!localMap.has(sid)) {
      supabaseOnly.push({
        id: sid,
        name: cloudProd.name,
        price: cloudProd.price,
        barcode: cloudProd.barcode || null,
        main_category_id: cloudProd.main_category_id,
        sub_category_id: cloudProd.sub_category_id
      });
    }
  });

  console.log('\n' + '─'.repeat(75));
  console.log('  EXACT ID RECONCILIATION RESULTS:');
  console.log('─'.repeat(75));
  console.log(`  MATCHED PRODUCTS (In both)      : ${matched.length}`);
  console.log(`  LOCAL ONLY PRODUCTS (Missing Cloud): ${localOnly.length}`);
  console.log(`  SUPABASE ONLY PRODUCTS (Unwanted Cloud): ${supabaseOnly.length}`);
  console.log(`  SUPABASE DUPLICATE RECORD IDs    : ${cloudDuplicates.length}`);

  // Sample listing if any differences
  if (localOnly.length > 0) {
    console.log('\n  Sample LOCAL ONLY products (up to 5):');
    localOnly.slice(0, 5).forEach(p => console.log(`   - [ID: ${p.id}] ${p.name} | Price: ${p.price}`));
  }

  if (supabaseOnly.length > 0) {
    console.log('\n  Sample SUPABASE ONLY products (up to 5):');
    supabaseOnly.slice(0, 5).forEach(p => console.log(`   - [ID: ${p.id}] ${p.name} | Price: ${p.price}`));
  }

  // 4. Save diff report to scratch/final_catalog_diff.json
  const diffReport = {
    timestamp: new Date().toISOString(),
    counts: {
      seedCount: seedProducts.length,
      supabaseCount: allCloudProducts.length,
      supabaseUniqueCount: cloudMap.size,
      matchedCount: matched.length,
      localOnlyCount: localOnly.length,
      supabaseOnlyCount: supabaseOnly.length,
      cloudDuplicatesCount: cloudDuplicates.length
    },
    exactSetMatch: (localOnly.length === 0 && supabaseOnly.length === 0 && seedProducts.length === cloudMap.size),
    matchedProducts: matched,
    localOnlyProducts: localOnly,
    supabaseOnlyProducts: supabaseOnly,
    cloudDuplicates: cloudDuplicates
  };

  const diffPath = path.join(__dirname, 'final_catalog_diff.json');
  fs.writeFileSync(diffPath, JSON.stringify(diffReport, null, 2));

  console.log('\n' + '═'.repeat(75));
  console.log(`  Saved catalog diff report to: ${diffPath}`);
  console.log(`  EXACT SET MATCH: ${diffReport.exactSetMatch ? '✅ PASS (100% IDENTICAL)' : '⚠️ MISMATCH DETECTED'}`);
  console.log('═'.repeat(75) + '\n');
}

main().catch(console.error);
