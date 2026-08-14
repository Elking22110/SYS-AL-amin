const { calculateReorder } = require('../src/utils/reorderManager.js');
const { sortProductsByHistoricalOrder } = require('../src/utils/subcategorySorter.js');

async function runCrossBrowserSyncTestSuite() {
  console.log('==================================================');
  console.log('SIS AL AMEEN — CROSS-BROWSER REORDER SYNC TEST');
  console.log('==================================================\n');

  let passCount = 0;
  let failCount = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passCount++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failCount++;
    }
  }

  const supabaseCloudDB = new Map();

  // Initial products dataset with a valid past timestamp
  const initialProducts = [
    { id: '101', name: 'Product A', sub_category_id: 'بوصه 4', sort_order: 10, updated_at: '2026-08-01T00:00:00.000Z', sync_status: 'synced' },
    { id: '102', name: 'Product B', sub_category_id: 'بوصه 4', sort_order: 20, updated_at: '2026-08-01T00:00:00.000Z', sync_status: 'synced' },
    { id: '103', name: 'Product C', sub_category_id: 'بوصه 4', sort_order: 30, updated_at: '2026-08-01T00:00:00.000Z', sync_status: 'synced' },
    { id: '104', name: 'Product D', sub_category_id: 'بوصه 4', sort_order: 40, updated_at: '2026-08-01T00:00:00.000Z', sync_status: 'synced' },
    { id: '105', name: 'Product E', sub_category_id: 'بوصه 4', sort_order: 50, updated_at: '2026-08-01T00:00:00.000Z', sync_status: 'synced' }
  ];

  initialProducts.forEach(p => supabaseCloudDB.set(p.id, { ...p }));

  let browserALocalDB = initialProducts.map(p => ({ ...p }));
  let browserBLocalDB = initialProducts.map(p => ({ ...p }));

  // STEP 1: Browser A Reorders Product E (index 4) to index 1
  const { reorderedList: step1List } = calculateReorder(browserALocalDB, 4, 1);
  const nowIso = new Date().toISOString();

  step1List.forEach(p => {
    supabaseCloudDB.set(p.id, {
      ...p,
      updated_at: nowIso
    });
  });
  browserALocalDB = step1List.map(p => ({ ...p, updated_at: nowIso }));

  const step1CloudNames = Array.from(supabaseCloudDB.values())
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(p => p.name);

  assert(
    JSON.stringify(step1CloudNames) === JSON.stringify(['Product A', 'Product E', 'Product B', 'Product C', 'Product D']),
    'TEST 1: Browser A reorder batch upserts canonical order [A, E, B, C, D] to Supabase Cloud'
  );

  // STEP 2: Browser B receives Realtime / Polling Sync from Supabase
  function isCloudNewerThanLocal(cloudRecord, localRecord) {
    const cloudTime = new Date(cloudRecord.updated_at || 0).getTime();
    const localTime = new Date(localRecord.updated_at || 0).getTime();
    if (cloudTime !== localTime) return cloudTime > localTime;
    return Number(cloudRecord.sort_order || 0) !== Number(localRecord.sort_order || 0);
  }

  Array.from(supabaseCloudDB.values()).forEach(cloudRecord => {
    const local = browserBLocalDB.find(p => p.id === cloudRecord.id);
    if (!local || isCloudNewerThanLocal(cloudRecord, local)) {
      const idx = browserBLocalDB.findIndex(p => p.id === cloudRecord.id);
      if (idx !== -1) browserBLocalDB[idx] = { ...cloudRecord };
      else browserBLocalDB.push({ ...cloudRecord });
    }
  });

  const browserBSorted = sortProductsByHistoricalOrder(browserBLocalDB, 'اسمارت ابيض');
  const browserBNames = browserBSorted.map(p => p.name);

  assert(
    JSON.stringify(browserBNames) === JSON.stringify(['Product A', 'Product E', 'Product B', 'Product C', 'Product D']),
    `TEST 2: Browser B receives cloud update and renders exact canonical order [A, E, B, C, D]`
  );

  // STEP 3: Browser B Refresh Test
  const browserBRefreshed = sortProductsByHistoricalOrder(browserBLocalDB, 'اسمارت ابيض');
  const refreshedNames = browserBRefreshed.map(p => p.name);
  assert(
    JSON.stringify(refreshedNames) === JSON.stringify(['Product A', 'Product E', 'Product B', 'Product C', 'Product D']),
    `TEST 3: Browser B Refresh reconstructs exact same canonical order [A, E, B, C, D]`
  );

  // STEP 4: Reverse Direction Test — Browser B moves B (now at index 2) to last position (index 4)
  const { reorderedList: step2List } = calculateReorder(browserBSorted, 2, 4);
  const nowIso2 = new Date(Date.now() + 1000).toISOString();

  step2List.forEach(p => {
    supabaseCloudDB.set(p.id, {
      ...p,
      updated_at: nowIso2
    });
  });
  browserBLocalDB = step2List.map(p => ({ ...p, updated_at: nowIso2 }));

  Array.from(supabaseCloudDB.values()).forEach(cloudRecord => {
    const local = browserALocalDB.find(p => p.id === cloudRecord.id);
    if (!local || isCloudNewerThanLocal(cloudRecord, local)) {
      const idx = browserALocalDB.findIndex(p => p.id === cloudRecord.id);
      if (idx !== -1) browserALocalDB[idx] = { ...cloudRecord };
      else browserALocalDB.push({ ...cloudRecord });
    }
  });

  const browserAReverseSorted = sortProductsByHistoricalOrder(browserALocalDB, 'اسمارت ابيض');
  const reverseNames = browserAReverseSorted.map(p => p.name);
  assert(
    JSON.stringify(reverseNames) === JSON.stringify(['Product A', 'Product E', 'Product C', 'Product D', 'Product B']),
    `TEST 4: Reverse sync (Browser B -> Browser A) updates Browser A automatically to [A, E, C, D, B]`
  );

  // STEP 5: Stale Event Protection Test
  const staleRecord = { id: '105', name: 'Product E', sort_order: 50, updated_at: '2020-01-01T00:00:00.000Z' };
  const currentLocalE = browserALocalDB.find(p => p.id === '105');
  const isStaleAccepted = isCloudNewerThanLocal(staleRecord, currentLocalE);
  assert(!isStaleAccepted, 'TEST 5: Stale cloud event with older timestamp is REJECTED by conflict resolution');

  console.log('\n--------------------------------------------------');
  console.log(`TOTAL PASSED: ${passCount}`);
  console.log(`TOTAL FAILED: ${failCount}`);
  console.log('--------------------------------------------------\n');

  if (failCount > 0) process.exit(1);
}

runCrossBrowserSyncTestSuite();
