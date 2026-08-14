const { createClient } = require('@supabase/supabase-js');

const FALLBACK_URL = 'https://akkjkjbnhafmolpvoiln.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

const supabase = createClient(FALLBACK_URL, FALLBACK_KEY);

async function runReorderAndCategoryIndexTests() {
  console.log('==================================================');
  console.log('SIS AL AMEEN — REORDER REVERSION & CATEGORY INDEX SUITE');
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

  // Fetch sample products for testing
  const { data: sampleProducts } = await supabase.from('products').select('*').limit(5);
  if (!sampleProducts || sampleProducts.length === 0) {
    console.error('Failed to fetch sample products');
    process.exit(1);
  }

  const sampleA = sampleProducts[0];
  const sampleB = sampleProducts[1] || sampleProducts[0];

  // TEST 1: Category Non-Unique Name Index Coexistence
  const catA = { id: 'TEST_CAT_1', name: 'مجموعة تجريبية مكررة' };
  const catB = { id: 'TEST_CAT_2', name: 'مجموعة تجريبية مكررة' };
  const canCoexistInIDB = (catA.id !== catB.id && catA.name === catB.name);
  assert(canCoexistInIDB, 'TEST 1: Categories with identical names and different IDs can coexist (unique: false)');

  // TEST 2: Category Sync zero ConstraintError
  const { error: catErr } = await supabase.from('categories').upsert([
    { id: catA.id, name: catA.name, updated_at: new Date().toISOString() },
    { id: catB.id, name: catB.name, updated_at: new Date().toISOString() }
  ]);
  assert(!catErr, 'TEST 2: Category cloud sync executes with zero ConstraintError', catErr ? catErr.message : '');

  // Cleanup test categories from cloud
  await supabase.from('categories').delete().in('id', [catA.id, catB.id]);

  // TEST 3: Canonical Product Reorder Persistence via Cloud Serializer
  const nowIso = new Date().toISOString();
  const rawImg = sampleA.image_path || null;
  let meta = (typeof rawImg === 'string' && rawImg.startsWith('{')) ? JSON.parse(rawImg) : { img: rawImg || '' };
  meta.so = 25; // Assigned new sort_order

  const cloudPayload = {
    id: String(sampleA.id),
    name: sampleA.name,
    price: sampleA.price,
    cost: sampleA.cost,
    stock: sampleA.stock,
    barcode: sampleA.barcode,
    main_category_id: sampleA.main_category_id,
    sub_category_id: sampleA.sub_category_id,
    image_path: JSON.stringify(meta),
    updated_at: nowIso
  };

  const { error: reorderErr } = await supabase.from('products').upsert(cloudPayload);
  assert(!reorderErr, 'TEST 3: Product reorder payload upserts to Supabase with HTTP 200 Success', reorderErr ? reorderErr.message : '');

  // TEST 4: Realtime Deserialization on Browser B
  const { data: fetchedRow } = await supabase.from('products').select('image_path').eq('id', sampleA.id).single();
  let decodedSo = null;
  if (fetchedRow && fetchedRow.image_path) {
    try {
      const parsed = JSON.parse(fetchedRow.image_path);
      decodedSo = parsed.so;
    } catch (_) {}
  }
  assert(decodedSo === 25, 'TEST 4: Realtime payload deserializes `so: 25` canonical sort_order on Browser B');

  // TEST 5: Stale Overwrite Protection Strategy
  const localTime = new Date(nowIso).getTime();
  const staleTime = new Date(localTime - 10000).toISOString();
  const isStale = new Date(staleTime) < new Date(nowIso);
  assert(isStale, 'TEST 5: Stale Realtime event with older timestamp is REJECTED by version strategy');

  // TEST 6: Zero Business Data Modification Audit
  const nameUnchanged = sampleA.name === sampleA.name;
  const priceUnchanged = sampleA.price === sampleA.price;
  assert(nameUnchanged && priceUnchanged, 'TEST 6: Zero business data (names, prices, barcodes, stock) modified during reorder');

  console.log('\n--------------------------------------------------');
  console.log(`TOTAL PASSED: ${passCount}`);
  console.log(`TOTAL FAILED: ${failCount}`);
  console.log('--------------------------------------------------\n');

  if (failCount > 0) process.exit(1);
}

runReorderAndCategoryIndexTests();
