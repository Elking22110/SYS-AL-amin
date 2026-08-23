/**
 * STEP 0 — FORENSIC DISCOVERY
 * ============================
 * Fetches the actual state from Supabase BEFORE any cleanup:
 *  • Total product count
 *  • Sample of first 50 products (id, name, barcode, price, stock, updated_at)
 *  • Total category count
 *  • Sample tombstones from localStorage (if accessible)
 *
 * DOES NOT DELETE ANYTHING.
 * Run: node scratch/step0_catalog_discovery.cjs
 */
'use strict';

const https = require('https');
const fs    = require('fs');

const SUPABASE_URL = 'akkjkjbnhafmolpvoiln.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

function api(path, method = 'GET', body = null, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: SUPABASE_URL,
      path,
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
        try { resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) }); }
        catch (_) { resolve({ status: res.statusCode, headers: res.headers, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log('\n' + '═'.repeat(60));
  console.log('  STEP 0 — FORENSIC CATALOG DISCOVERY');
  console.log('  Supabase: akkjkjbnhafmolpvoiln');
  console.log('═'.repeat(60));

  // ── 1. Count products ────────────────────────────────────────
  console.log('\n[1/5] Counting products in Supabase...');
  const countRes = await api('/rest/v1/products?select=id&limit=1');
  const totalProducts = countRes.headers['content-range']
    ? countRes.headers['content-range'].split('/')[1]
    : 'unknown';
  console.log(`  → Total products: ${totalProducts}`);

  // ── 2. Count categories ──────────────────────────────────────
  console.log('\n[2/5] Counting categories...');
  const catCount = await api('/rest/v1/categories?select=id&limit=1');
  const totalCats = catCount.headers['content-range']
    ? catCount.headers['content-range'].split('/')[1]
    : 'unknown';
  console.log(`  → Total categories: ${totalCats}`);

  // ── 3. Fetch first 100 products (name, id, price, stock, barcode) ─────
  console.log('\n[3/5] Fetching sample of up to 500 products...');
  const sample = await api(
    '/rest/v1/products?select=id,name,price,stock,barcode,main_category_id,sub_category_id,sort_order,updated_at&order=updated_at.desc&limit=500',
    'GET', null,
    { 'Prefer': 'count=exact' }
  );
  const products = Array.isArray(sample.body) ? sample.body : [];
  console.log(`  → Fetched ${products.length} products for inspection`);

  // ── 4. Fetch ALL product IDs for full inventory ───────────────
  console.log('\n[4/5] Fetching ALL product IDs...');
  const allIds = await api(
    '/rest/v1/products?select=id,name,barcode,price,stock,updated_at&limit=2000',
    'GET', null,
    { 'Prefer': 'count=exact' }
  );
  const allProducts = Array.isArray(allIds.body) ? allIds.body : [];
  console.log(`  → Total IDs fetched: ${allProducts.length}`);

  // ── 5. Fetch categories for reference ────────────────────────
  console.log('\n[5/5] Fetching categories...');
  const catsRes = await api('/rest/v1/categories?select=id,name,parent_id&limit=500');
  const categories = Array.isArray(catsRes.body) ? catsRes.body : [];
  console.log(`  → Categories fetched: ${categories.length}`);

  // ── REPORT ──────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log('  SUMMARY');
  console.log('═'.repeat(60));
  console.log(`  Products in Supabase : ${totalProducts}`);
  console.log(`  Categories           : ${totalCats}`);
  console.log(`  Products fetched     : ${allProducts.length}`);

  // Price distribution
  const priceBuckets = { zero: 0, low: 0, mid: 0, high: 0 };
  for (const p of allProducts) {
    const price = Number(p.price) || 0;
    if (price === 0) priceBuckets.zero++;
    else if (price < 50) priceBuckets.low++;
    else if (price < 500) priceBuckets.mid++;
    else priceBuckets.high++;
  }

  console.log('\n  Price Distribution:');
  console.log(`    Zero-price products : ${priceBuckets.zero}`);
  console.log(`    Price 1-49          : ${priceBuckets.low}`);
  console.log(`    Price 50-499        : ${priceBuckets.mid}`);
  console.log(`    Price 500+          : ${priceBuckets.high}`);

  // Date distribution
  const now = Date.now();
  const recentCutoff  = now - 30  * 24 * 3600 * 1000; // 30 days
  const mediumCutoff  = now - 180 * 24 * 3600 * 1000; // 6 months
  let recent = 0, medium = 0, old = 0, noDate = 0;
  for (const p of allProducts) {
    if (!p.updated_at) { noDate++; continue; }
    const t = new Date(p.updated_at).getTime();
    if (t > recentCutoff) recent++;
    else if (t > mediumCutoff) medium++;
    else old++;
  }
  console.log('\n  Freshness:');
  console.log(`    Updated <30 days    : ${recent}`);
  console.log(`    Updated 30-180 days : ${medium}`);
  console.log(`    Updated >180 days   : ${old}`);
  console.log(`    No date             : ${noDate}`);

  // ── Save full catalog to disk ────────────────────────────────
  const outPath = __dirname + '/catalog_discovery_' + Date.now() + '.json';
  const output = {
    discoveredAt: new Date().toISOString(),
    supabaseUrl: `https://${SUPABASE_URL}`,
    totalProductsCount: totalProducts,
    totalCategoriesCount: totalCats,
    allProducts,
    categories,
    priceBuckets,
    freshness: { recent, medium, old, noDate }
  };
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\n  ✅ Full catalog saved to: ${outPath}`);

  // ── Show first 20 and last 20 products ──────────────────────
  console.log('\n  ── FIRST 20 PRODUCTS (newest updated) ──');
  allProducts.slice(0, 20).forEach((p, i) => {
    console.log(`    [${i+1}] ID:${p.id} | ${p.name} | Price:${p.price} | Stock:${p.stock} | ${p.updated_at?.split('T')[0] || 'no-date'}`);
  });

  console.log('\n  ── LAST 20 PRODUCTS (oldest updated) ──');
  const last20 = allProducts.slice(-20);
  last20.forEach((p, i) => {
    console.log(`    [${allProducts.length - 20 + i + 1}] ID:${p.id} | ${p.name} | Price:${p.price} | Stock:${p.stock} | ${p.updated_at?.split('T')[0] || 'no-date'}`);
  });

  console.log('\n' + '═'.repeat(60));
  console.log('  ⚠️  NEXT STEP:');
  console.log('  Review the catalog_discovery_*.json file,');
  console.log('  identify which products are APPROVED,');
  console.log('  then run step1_backup_and_cleanup.cjs');
  console.log('═'.repeat(60) + '\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
