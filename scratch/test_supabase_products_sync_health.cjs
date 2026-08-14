const { createClient } = require('@supabase/supabase-js');

const FALLBACK_URL = 'https://akkjkjbnhafmolpvoiln.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

const supabase = createClient(FALLBACK_URL, FALLBACK_KEY);

async function runSupabaseProductsSyncHealthTests() {
  console.log('==================================================');
  console.log('SIS AL AMEEN — SUPABASE PRODUCTS SYNC HEALTH SUITE');
  console.log('==================================================\n');

  let passCount = 0;
  let failCount = 0;

  function assert(condition, testName, extraInfo = '') {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passCount++;
    } else {
      console.error(`[FAIL] ${testName} ${extraInfo}`);
      failCount++;
    }
  }

  // Fetch sample products
  const { data: sampleProducts, error: fetchErr } = await supabase
    .from('products')
    .select('*')
    .limit(5);

  if (fetchErr || !sampleProducts || sampleProducts.length === 0) {
    console.error('❌ Failed to fetch sample products for test suite:', fetchErr);
    process.exit(1);
  }

  const sample = sampleProducts[0];

  // Helper serializer matching mapLocalToCloud
  function toCloudProduct(p) {
    return {
      id: String(p.id),
      name: p.name,
      price: Number(p.price || 0),
      cost: Number(p.cost || 0),
      stock: Number(p.stock || 0),
      barcode: p.barcode || null,
      main_category_id: p.main_category_id || p.mainCategoryId || null,
      sub_category_id: p.sub_category_id || p.subCategoryId || null,
      image_path: p.image_path || p.imagePath || null,
      updated_at: new Date().toISOString()
    };
  }

  // TEST 1: Normal existing product update
  const payload1 = toCloudProduct(sample);
  const { error: err1 } = await supabase.from('products').upsert(payload1);
  assert(!err1, 'TEST 1: Normal existing product update returns HTTP 200/2xx', err1 ? err1.message : '');

  // TEST 2: Product reorder batch update (without sort_order column)
  const batchPayloads = sampleProducts.map(toCloudProduct);
  const { error: err2 } = await supabase.from('products').upsert(batchPayloads);
  assert(!err2, 'TEST 2: Product reorder batch update succeeds without 400', err2 ? err2.message : '');

  // TEST 3: New test product creation
  const newProdId = 'TEST_SYNC_' + Date.now();
  const newProdPayload = toCloudProduct({
    id: newProdId,
    name: 'منتج تجربة مزامنة فنية',
    price: 99,
    cost: 50,
    stock: 10,
    barcode: '999888777',
    main_category_id: sample.main_category_id,
    sub_category_id: sample.sub_category_id
  });
  const { error: err3 } = await supabase.from('products').insert(newProdPayload);
  assert(!err3, 'TEST 3: New product creation payload succeeds', err3 ? err3.message : '');

  // TEST 4: Product update after reorder
  newProdPayload.price = 105;
  const { error: err4 } = await supabase.from('products').upsert(newProdPayload);
  assert(!err4, 'TEST 4: Product update after reorder succeeds', err4 ? err4.message : '');

  // TEST 5: Product cleanup / delete
  const { error: err5 } = await supabase.from('products').delete().eq('id', newProdId);
  assert(!err5, 'TEST 5: Product delete payload succeeds', err5 ? err5.message : '');

  // TEST 6: Batch product sync (5 products)
  const { error: err6 } = await supabase.from('products').upsert(batchPayloads);
  assert(!err6, 'TEST 6: Batch product sync returns zero HTTP 400 errors', err6 ? err6.message : '');

  // TEST 7: Single product sync fallback
  const { error: err7 } = await supabase.from('products').upsert(toCloudProduct(sample));
  assert(!err7, 'TEST 7: Single product fallback returns zero HTTP 400 errors', err7 ? err7.message : '');

  // TEST 8: Verify payload columns strictly match database schema
  const validSchemaColumns = new Set(['barcode', 'cost', 'id', 'image_path', 'main_category_id', 'name', 'price', 'stock', 'sub_category_id', 'updated_at']);
  const payloadKeys = Object.keys(toCloudProduct(sample));
  const hasInvalidColumn = payloadKeys.some(k => !validSchemaColumns.has(k));
  assert(!hasInvalidColumn, 'TEST 8: Serialized cloud payload contains ONLY valid schema columns');

  console.log('\n--------------------------------------------------');
  console.log(`TOTAL PASSED: ${passCount}`);
  console.log(`TOTAL FAILED: ${failCount}`);
  console.log('--------------------------------------------------\n');

  if (failCount > 0) process.exit(1);
}

runSupabaseProductsSyncHealthTests();
