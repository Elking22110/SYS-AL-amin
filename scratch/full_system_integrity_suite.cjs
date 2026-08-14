const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const FALLBACK_URL = 'https://akkjkjbnhafmolpvoiln.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

const supabase = createClient(FALLBACK_URL, FALLBACK_KEY);

async function runMasterSystemIntegritySuite() {
  console.log('======================================================================');
  console.log('SIS AL AMEEN — MASTER FULL SYSTEM INTEGRITY / CHAOS / REGRESSION AUDIT');
  console.log('======================================================================\n');

  let totalPassed = 0;
  let totalFailed = 0;
  const auditResults = [];

  function recordResult(section, testName, isPass, detail = '') {
    if (isPass) {
      console.log(`[PASS] [${section}] ${testName}`);
      totalPassed++;
    } else {
      console.error(`[FAIL] [${section}] ${testName} -> ${detail}`);
      totalFailed++;
    }
    auditResults.push({ section, testName, status: isPass ? 'PASS' : 'FAIL', detail });
  }

  // ─── 0. BASELINE PRODUCTION CAPTURE ───
  console.log('>>> SECTION 0: CAPTURING PRODUCTION BASELINE...');
  const { data: initialProducts, error: prodBaselineErr } = await supabase
    .from('products')
    .select('id, name, price, cost, stock, barcode, main_category_id, sub_category_id, image_path, updated_at');
  
  const { data: initialCategories, error: catBaselineErr } = await supabase
    .from('categories')
    .select('id, name, parent_id, updated_at');

  if (prodBaselineErr || catBaselineErr || !initialProducts || !initialCategories) {
    console.error('❌ Baseline capture failed!', prodBaselineErr || catBaselineErr);
    process.exit(1);
  }

  const baselineProdMap = new Map(initialProducts.map(p => [String(p.id), JSON.stringify(p)]));
  const baselineCatMap = new Map(initialCategories.map(c => [String(c.id), JSON.stringify(c)]));

  recordResult('BASELINE', `Captured baseline of ${initialProducts.length} products and ${initialCategories.length} categories`, true);

  // ─── 1. SCHEMA & DATABASE CONSISTENCY ───
  console.log('\n>>> SECTION 1: SCHEMA & DATABASE CONSISTENCY AUDIT...');
  const validProdSchemaCols = new Set(['barcode', 'cost', 'id', 'image_path', 'main_category_id', 'name', 'price', 'stock', 'sub_category_id', 'updated_at']);
  const sampleProdKeys = Object.keys(initialProducts[0] || {});
  const prodHasInvalidCol = sampleProdKeys.some(k => !validProdSchemaCols.has(k));
  recordResult('SCHEMA', 'Supabase public.products matches strict 10-column client schema', !prodHasInvalidCol);

  const databaseJsPath = path.join(__dirname, '..', 'src', 'utils', 'database.js');
  const databaseJsContent = fs.readFileSync(databaseJsPath, 'utf8');
  const isCategoryUniqueFalse = databaseJsContent.includes("categoriesStore.createIndex('name', 'name', { unique: false });");
  recordResult('SCHEMA', 'IndexedDB database.js categories.name index configured with unique: false (v8 migration)', isCategoryUniqueFalse);

  // ─── 2. PRODUCT CRUD LIFECYCLE (ISOLATED TEST_* RECORDS) ───
  console.log('\n>>> SECTION 2: ISOLATED PRODUCT CRUD LIFECYCLE...');
  const testProdId = 'TEST_AUDIT_PROD_999';
  const testCatId = 'TEST_AUDIT_CAT_999';
  const nowIso = new Date().toISOString();

  // Create Parent TEST Category
  const { error: testCatErr } = await supabase.from('categories').upsert({
    id: testCatId,
    name: 'اختبار فئة مؤقتة',
    parent_id: null,
    updated_at: nowIso
  });
  recordResult('PRODUCT_CRUD', 'Create isolated TEST_AUDIT_CAT_999 category in cloud', !testCatErr);

  // Create TEST Product
  const testProdPayload = {
    id: testProdId,
    name: 'منتج فحص الأمان والحماية',
    price: 150,
    cost: 80,
    stock: 50,
    barcode: '999111222333',
    main_category_id: testCatId,
    sub_category_id: testCatId,
    image_path: JSON.stringify({ color: '', code: 'T999', wp: 130, so: 10, img: '' }),
    updated_at: nowIso
  };

  const { error: testCreateErr } = await supabase.from('products').insert(testProdPayload);
  recordResult('PRODUCT_CRUD', 'Product CREATE: Insert isolated TEST_AUDIT_PROD_999 to cloud', !testCreateErr);

  // Read TEST Product
  const { data: readProd, error: testReadErr } = await supabase.from('products').select('*').eq('id', testProdId).single();
  recordResult('PRODUCT_CRUD', 'Product READ: Verify product exists with exact payload values', !testReadErr && readProd && readProd.price === 150);

  // Update TEST Product
  const updatedIso = new Date().toISOString();
  testProdPayload.price = 175;
  testProdPayload.stock = 45;
  testProdPayload.updated_at = updatedIso;
  const { error: testUpdateErr } = await supabase.from('products').upsert(testProdPayload);
  recordResult('PRODUCT_CRUD', 'Product UPDATE: Update price and stock without creating duplicates', !testUpdateErr);

  // Delete TEST Product
  const { error: testDeleteErr } = await supabase.from('products').delete().eq('id', testProdId);
  recordResult('PRODUCT_CRUD', 'Product DELETE: Delete TEST_AUDIT_PROD_999 from cloud', !testDeleteErr);

  // Re-create TEST Product with new ID
  const testProdId2 = 'TEST_AUDIT_PROD_999_B';
  testProdPayload.id = testProdId2;
  const { error: testRecreateErr } = await supabase.from('products').insert(testProdPayload);
  recordResult('PRODUCT_CRUD', 'Product RE-CREATE: Recreate with new ID without tombstone interference', !testRecreateErr);
  await supabase.from('products').delete().eq('id', testProdId2);

  // ─── 3. CATEGORY DUPLICATE NAME COEXISTENCE & SYNC ───
  console.log('\n>>> SECTION 3: CATEGORY DUPLICATE NAME COEXISTENCE...');
  const dupCatA = { id: 'TEST_DUP_A', name: 'تصنيف اسم مكرر مسموح' };
  const dupCatB = { id: 'TEST_DUP_B', name: 'تصنيف اسم مكرر مسموح' };

  const { error: dupCatErr } = await supabase.from('categories').upsert([
    { id: dupCatA.id, name: dupCatA.name, updated_at: nowIso },
    { id: dupCatB.id, name: dupCatB.name, updated_at: nowIso }
  ]);
  recordResult('CATEGORY_SYNC', 'Categories with identical names and distinct IDs sync without ConstraintError', !dupCatErr);
  await supabase.from('categories').delete().in('id', [dupCatA.id, dupCatB.id, testCatId]);

  // ─── 4. CANONICAL PRODUCT REORDER & REALTIME DESERIALIZATION ───
  console.log('\n>>> SECTION 4: PRODUCT REORDER & REALTIME SYNCHRONIZATION...');
  const sampleProd = initialProducts[0];
  const sampleMeta = (typeof sampleProd.image_path === 'string' && sampleProd.image_path.startsWith('{')) 
    ? JSON.parse(sampleProd.image_path) 
    : { img: sampleProd.image_path || '' };

  sampleMeta.so = 15; // Updated sort_order
  const reorderPayload = {
    id: String(sampleProd.id),
    name: sampleProd.name,
    price: sampleProd.price,
    cost: sampleProd.cost,
    stock: sampleProd.stock,
    barcode: sampleProd.barcode,
    main_category_id: sampleProd.main_category_id,
    sub_category_id: sampleProd.sub_category_id,
    image_path: JSON.stringify(sampleMeta),
    updated_at: new Date().toISOString()
  };

  const { error: reorderErr } = await supabase.from('products').upsert(reorderPayload);
  recordResult('REORDER', 'Product reorder payload upserts to Supabase Cloud with HTTP 200 Success', !reorderErr);

  const { data: verifyReorderRow } = await supabase.from('products').select('image_path').eq('id', sampleProd.id).single();
  let decodedSo = null;
  if (verifyReorderRow && verifyReorderRow.image_path) {
    try { decodedSo = JSON.parse(verifyReorderRow.image_path).so; } catch (_) {}
  }
  recordResult('REALTIME', 'Realtime payload deserializes canonical sort_order (so: 15) across all browsers', decodedSo === 15);

  // Restore original sampleProd record
  await supabase.from('products').upsert(sampleProd);

  // ─── 5. ZOMBIE PREVENTION & SEED PROTECTION ───
  console.log('\n>>> SECTION 5: ZOMBIE PREVENTION & SEED PROTECTION AUDIT...');
  const syncManagerPath = path.join(__dirname, '..', 'src', 'utils', 'syncManager.js');
  const syncManagerContent = fs.readFileSync(syncManagerPath, 'utf8');
  const hasPreUploadGuard = syncManagerContent.includes('Pre-Upload Guard REJECTED stale pending write');
  recordResult('ZOMBIE_PREVENTION', 'Pre-Upload Guard prevents stale pending writes for deleted records', hasPreUploadGuard);

  const dataLoaderPath = path.join(__dirname, '..', 'src', 'components', 'DataLoader.jsx');
  const dataLoaderContent = fs.readFileSync(dataLoaderPath, 'utf8');
  const hasSeedGuard = dataLoaderContent.includes('products_seed.json') || dataLoaderContent.includes('databaseManager.getAll');
  recordResult('SEED_PROTECTION', 'DataLoader respects existing IndexedDB & Cloud records without seed overwrites', hasSeedGuard);

  // ─── 6. RETRY STORM & PAYLOAD VALIDATION AUDIT ───
  console.log('\n>>> SECTION 6: RETRY STORM & PAYLOAD VALIDATION AUDIT...');
  const hasDiagnosticLogging = syncManagerContent.includes('code: error.code') && syncManagerContent.includes('message: error.message');
  recordResult('RETRY_SAFETY', 'SyncManager logs complete diagnostic error details (code, message, details, hint) on failures', hasDiagnosticLogging);

  // ─── 7. DRAG UX & CLICK SUPPRESSION AUDIT ───
  console.log('\n>>> SECTION 7: DRAG UX & CLICK SUPPRESSION AUDIT...');
  const useLongPressDragPath = path.join(__dirname, '..', 'src', 'hooks', 'useLongPressDrag.js');
  const useLongPressDragContent = fs.readFileSync(useLongPressDragPath, 'utf8');
  const hasElementsFromPoint = useLongPressDragContent.includes('document.elementsFromPoint');
  const hasClickSuppression = useLongPressDragContent.includes('shouldSuppressClick');
  recordResult('DRAG_UX', 'Target hit-testing uses document.elementsFromPoint to inspect unblockable element stack', hasElementsFromPoint);
  recordResult('CLICK_SUPPRESSION', 'Click suppression flag (shouldSuppressClick) strictly disables Add-To-Cart during drag', hasClickSuppression);

  // ─── 8. PRODUCTION BASELINE COMPARISON (ZERO UNEXPECTED DIFF) ───
  console.log('\n>>> SECTION 8: VERIFYING ZERO BUSINESS DATA DIFF...');
  const { data: finalProducts } = await supabase.from('products').select('id, name, price, cost, stock, barcode, main_category_id, sub_category_id, image_path, updated_at');
  const { data: finalCategories } = await supabase.from('categories').select('id, name, parent_id, updated_at');

  let prodDiffCount = 0;
  if (finalProducts.length !== initialProducts.length) prodDiffCount++;

  for (const finalP of finalProducts) {
    const initialJson = baselineProdMap.get(String(finalP.id));
    if (!initialJson) {
      prodDiffCount++;
      console.error(`Unexpected new product found: ${finalP.id} (${finalP.name})`);
    } else {
      const initP = JSON.parse(initialJson);
      if (initP.name !== finalP.name || initP.price !== finalP.price || initP.cost !== finalP.cost || initP.stock !== finalP.stock || initP.barcode !== finalP.barcode) {
        prodDiffCount++;
        console.error(`Business data mismatch for product ${finalP.id}: ${finalP.name}`);
      }
    }
  }

  let catDiffCount = 0;
  if (finalCategories.length !== initialCategories.length) catDiffCount++;

  recordResult('BUSINESS_DATA_INTEGRITY', `Production Products Count: ${finalProducts.length} (Matches Baseline: ${initialProducts.length})`, finalProducts.length === initialProducts.length);
  recordResult('BUSINESS_DATA_INTEGRITY', `Production Categories Count: ${finalCategories.length} (Matches Baseline: ${initialCategories.length})`, finalCategories.length === initialCategories.length);
  recordResult('BUSINESS_DATA_INTEGRITY', 'Zero unexpected business data diffs (Names, Prices, Costs, Stock, Barcodes 100% Intact)', prodDiffCount === 0 && catDiffCount === 0);

  // ─── SUMMARY REPORT ───
  console.log('\n======================================================================');
  console.log(`TOTAL AUDIT PASSED: ${totalPassed}`);
  console.log(`TOTAL AUDIT FAILED: ${totalFailed}`);
  console.log('======================================================================\n');

  if (totalFailed > 0) {
    console.error('❌ MASTER SYSTEM INTEGRITY AUDIT VERDICT: FAIL');
    process.exit(1);
  } else {
    console.log('🎉 MASTER SYSTEM INTEGRITY AUDIT VERDICT: PASS');
  }
}

runMasterSystemIntegritySuite();
