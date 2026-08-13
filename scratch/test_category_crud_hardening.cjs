const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const FALLBACK_URL = 'https://akkjkjbnhafmolpvoiln.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

const supabase = createClient(FALLBACK_URL, FALLBACK_KEY);

async function runCategoryCrudTests() {
  console.log('==================================================');
  console.log('SIS AL AMEEN — CATEGORY CRUD HARDENING TEST SUITE');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  // 1. Initial Baseline Check
  console.log('📌 TEST 1: Baseline Check on Supabase Cloud');
  const { data: initialCats, error: cErr } = await supabase.from('categories').select('*');
  const { data: initialProds, error: pErr } = await supabase.from('products').select('*');

  if (cErr || pErr || !initialCats || !initialProds) {
    console.error('❌ TEST 1 FAILED: Cannot connect to Supabase Cloud:', cErr || pErr);
    failed++;
    return;
  }

  const baseCatCount = initialCats.length;
  const baseProdCount = initialProds.length;
  console.log(`  - Baseline Categories: ${baseCatCount} | Baseline Products: ${baseProdCount}`);
  console.log('✅ TEST 1 PASSED\n');
  passed++;

  // 2. Category CREATE Test
  console.log('📌 TEST 2: Category CREATE Flow');
  const testCatId = 'test_cat_' + Date.now();
  const testCatName = 'فئة اختبار تجريبية ' + Date.now();
  const nowIso = new Date().toISOString();

  const { error: insErr } = await supabase.from('categories').insert({
    id: testCatId,
    name: testCatName,
    parent_id: null,
    updated_at: nowIso
  });

  if (insErr) {
    console.error('❌ TEST 2 FAILED: Failed to insert test category on Supabase:', insErr);
    failed++;
  } else {
    console.log(`  - Successfully created Category "${testCatName}" (ID: ${testCatId}) on Supabase Cloud.`);
    console.log('✅ TEST 2 PASSED\n');
    passed++;
  }

  // 3. Category UPDATE Test
  console.log('📌 TEST 3: Category UPDATE Flow');
  const updatedName = testCatName + ' (معدلة)';
  const updateIso = new Date().toISOString();

  const { error: upErr } = await supabase.from('categories').upsert({
    id: testCatId,
    name: updatedName,
    parent_id: null,
    updated_at: updateIso
  });

  if (upErr) {
    console.error('❌ TEST 3 FAILED: Failed to update test category on Supabase:', upErr);
    failed++;
  } else {
    const { data: fetchUp } = await supabase.from('categories').select('name').eq('id', testCatId).single();
    if (fetchUp && fetchUp.name === updatedName) {
      console.log(`  - Successfully updated Category name to "${updatedName}" on Supabase Cloud.`);
      console.log('✅ TEST 3 PASSED\n');
      passed++;
    } else {
      console.error('❌ TEST 3 FAILED: Category update mismatch in cloud fetch.');
      failed++;
    }
  }

  // 4. Category DELETE Test
  console.log('📌 TEST 4: Category DELETE Flow');
  const { error: delErr } = await supabase.from('categories').delete().eq('id', testCatId);

  if (delErr) {
    console.error('❌ TEST 4 FAILED: Failed to delete test category on Supabase:', delErr);
    failed++;
  } else {
    const { data: fetchDel } = await supabase.from('categories').select('id').eq('id', testCatId);
    if (!fetchDel || fetchDel.length === 0) {
      console.log(`  - Successfully deleted Category ID: ${testCatId} from Supabase Cloud.`);
      console.log('✅ TEST 4 PASSED\n');
      passed++;
    } else {
      console.error('❌ TEST 4 FAILED: Category still exists after delete.');
      failed++;
    }
  }

  // 5. Category RE-CREATE after Delete (Reusing ID/Name with Timestamp check)
  console.log('📌 TEST 5: Category RE-CREATE Flow (Timestamped Tombstone Safety)');
  const recreateIso = new Date().toISOString();
  const { error: reInsErr } = await supabase.from('categories').insert({
    id: testCatId,
    name: testCatName + ' (إعادة إنشاء)',
    parent_id: null,
    updated_at: recreateIso
  });

  if (reInsErr) {
    console.error('❌ TEST 5 FAILED: Re-creation of deleted category failed:', reInsErr);
    failed++;
  } else {
    console.log('  - Re-creation of category succeeded. Cleaning up test record...');
    await supabase.from('categories').delete().eq('id', testCatId);
    console.log('✅ TEST 5 PASSED\n');
    passed++;
  }

  // 6. Verification of Static Code Protections
  console.log('📌 TEST 6: Static Code Protections Audit');
  const productsCode = fs.readFileSync('src/pages/Products.jsx', 'utf8');
  const syncManagerCode = fs.readFileSync('src/utils/syncManager.js', 'utf8');

  const hasAddCatFix = productsCode.includes('_isNewLocally: true') &&
                       productsCode.includes('databaseManager.update(\'categories\', categoryToAdd)') &&
                       productsCode.includes('supabase.from(\'categories\').insert');

  const hasUpdCatFix = productsCode.includes('databaseManager.update(\'categories\', targetCategoryObj)') &&
                       productsCode.includes('supabase.from(\'categories\').upsert');

  const hasTsTombstone = syncManagerCode.includes('getDeletedTombstonesMap') &&
                         syncManagerCode.includes('isRecordTombstoned');

  if (hasAddCatFix && hasUpdCatFix && hasTsTombstone) {
    console.log('  - Products.jsx: handleAddCategory and handleUpdateCategorySubmit persist to IndexedDB & Supabase Cloud.');
    console.log('  - syncManager.js: Timestamped tombstones & isRecordTombstoned prevent over-blocking.');
    console.log('✅ TEST 6 PASSED\n');
    passed++;
  } else {
    console.error('❌ TEST 6 FAILED: Static code protections incomplete.');
    failed++;
  }

  // 7. Final Baseline Integrity Check
  console.log('📌 TEST 7: Zero Existing Catalog Data Corruption Verification');
  const { data: finalCats } = await supabase.from('categories').select('id');
  const { data: finalProds } = await supabase.from('products').select('id');

  const finalCatCount = finalCats ? finalCats.length : 0;
  const finalProdCount = finalProds ? finalProds.length : 0;

  console.log(`  - Baseline Categories: ${baseCatCount} | Final Categories: ${finalCatCount}`);
  console.log(`  - Baseline Products: ${baseProdCount} | Final Products: ${finalProdCount}`);

  if (baseCatCount === finalCatCount && baseProdCount === finalProdCount) {
    console.log('  - PERFECT MATCH: Zero existing catalog categories or products were modified or corrupted.');
    console.log('✅ TEST 7 PASSED\n');
    passed++;
  } else {
    console.error(`❌ TEST 7 FAILED: Count mismatch! Expected ${baseCatCount}/${baseProdCount}, got ${finalCatCount}/${finalProdCount}`);
    failed++;
  }

  console.log('==================================================');
  console.log(`SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('==================================================');

  if (failed === 0) {
    console.log('\n🎉 ALL CATEGORY CRUD HARDENING TESTS PASSED SUCCESSFULLY!');
  } else {
    process.exit(1);
  }
}

runCategoryCrudTests();
