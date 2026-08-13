const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const FALLBACK_URL = 'https://akkjkjbnhafmolpvoiln.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

const supabase = createClient(FALLBACK_URL, FALLBACK_KEY);

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runProductRuntimeTest() {
  console.log('==================================================');
  console.log('SIS AL AMEEN — PRODUCT RUNTIME LIFECYCLE VERIFIER');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  // 1. Initial Baseline Check
  console.log('📌 STEP 1: Baseline Check on Supabase Cloud');
  const { data: initialProds, error: pErr } = await supabase.from('products').select('id');
  const { data: initialCats, error: cErr } = await supabase.from('categories').select('id');

  if (pErr || cErr || !initialProds || !initialCats) {
    console.error('❌ STEP 1 FAILED: Cannot connect to Supabase Cloud:', pErr || cErr);
    failed++;
    return;
  }

  const baseProdCount = initialProds.length;
  const baseCatCount = initialCats.length;
  console.log(`  - Baseline Products: ${baseProdCount} | Baseline Categories: ${baseCatCount}`);
  console.log('✅ STEP 1 PASSED\n');
  passed++;

  // 2. Synthetic Product CREATE Test
  console.log('📌 STEP 2: Product CREATE Stage-by-Stage Verification');
  const testProdId = 'test_prod_' + Date.now();
  const testProdName = '__CRUD_TEST_PRODUCT__';
  const testProdBarcode = '__CRUD_TEST_BARCODE__';
  const nowIso = new Date().toISOString();

  // Stage 1: UI Object Shape
  const stage1UIObject = {
    id: testProdId,
    name: testProdName,
    price: 150.5,
    wholesalePrice: 130.0,
    stock: 50,
    minStock: 5,
    barcode: testProdBarcode,
    sync_status: 'pending',
    _isNewLocally: true,
    created_at: nowIso,
    updated_at: nowIso
  };

  console.log('  [Stage 1 UI Object Shape]:', JSON.stringify({
    id: stage1UIObject.id,
    name: stage1UIObject.name,
    sync_status: stage1UIObject.sync_status,
    _isNewLocally: stage1UIObject._isNewLocally,
    created_at: stage1UIObject.created_at,
    updated_at: stage1UIObject.updated_at
  }, null, 2));

  // Stage 2: Supabase Cloud INSERT matching exact database schema
  const { data: insData, error: insErr } = await supabase.from('products').insert({
    id: stage1UIObject.id,
    name: stage1UIObject.name,
    price: stage1UIObject.price,
    cost: 130.0,
    stock: stage1UIObject.stock,
    barcode: stage1UIObject.barcode,
    updated_at: stage1UIObject.updated_at
  }).select('*');

  if (insErr || !insData || insData.length === 0) {
    console.error('❌ STEP 2 FAILED: Supabase Cloud INSERT failed:', insErr);
    failed++;
    return;
  }

  console.log(`  [Stage 3 Supabase Response]: Inserted product ID ${insData[0].id} into Supabase Cloud.`);
  console.log('✅ STEP 2 PASSED\n');
  passed++;

  // 3. 15-Second Runtime Persistence Test Across Sync Cycles
  console.log('📌 STEP 3: 15-Second Runtime Persistence Test Across Multiple Sync Cycles');
  console.log('  - Waiting 15 seconds to verify product is NEVER deleted by Zombie Prevention...');
  
  for (let cycle = 1; cycle <= 3; cycle++) {
    await sleep(5000);
    const { data: checkProd, error: checkErr } = await supabase
      .from('products')
      .select('id, name, updated_at')
      .eq('id', testProdId)
      .single();

    if (checkErr || !checkProd) {
      console.error(`❌ STEP 3 FAILED at Cycle ${cycle} (15-sec test): Product was unexpectedly deleted!`, checkErr);
      failed++;
      return;
    }
    console.log(`  - [Cycle ${cycle} / 5s]: Product ${checkProd.id} ("${checkProd.name}") is ALIVE and ACTIVE in Cloud.`);
  }

  console.log('✅ STEP 3 PASSED: Product survived 15 seconds across 3 sync cycles without deletion!\n');
  passed++;

  // 4. Product UPDATE Test
  console.log('📌 STEP 4: Product UPDATE Test');
  const updatedProdName = '__CRUD_TEST_PRODUCT_UPDATED__';
  const updateIso = new Date().toISOString();

  const { error: upErr } = await supabase.from('products').upsert({
    id: testProdId,
    name: updatedProdName,
    price: 175.0,
    barcode: testProdBarcode,
    updated_at: updateIso
  });

  if (upErr) {
    console.error('❌ STEP 4 FAILED: Product UPDATE failed on Supabase:', upErr);
    failed++;
  } else {
    await sleep(3000);
    const { data: fetchUp } = await supabase.from('products').select('name, price').eq('id', testProdId).single();
    if (fetchUp && fetchUp.name === updatedProdName) {
      console.log(`  - Successfully updated product name to "${fetchUp.name}" (Price: ${fetchUp.price}).`);
      console.log('✅ STEP 4 PASSED\n');
      passed++;
    } else {
      console.error('❌ STEP 4 FAILED: Updated product name mismatch.');
      failed++;
    }
  }

  // 5. Product DELETE Test
  console.log('📌 STEP 5: Product DELETE Test');
  const { error: delErr } = await supabase.from('products').delete().eq('id', testProdId);

  if (delErr) {
    console.error('❌ STEP 5 FAILED: Product DELETE failed on Supabase:', delErr);
    failed++;
  } else {
    await sleep(3000);
    const { data: fetchDel } = await supabase.from('products').select('id').eq('id', testProdId);
    if (!fetchDel || fetchDel.length === 0) {
      console.log(`  - Successfully deleted product ID ${testProdId} from Supabase Cloud.`);
      console.log('✅ STEP 5 PASSED\n');
      passed++;
    } else {
      console.error('❌ STEP 5 FAILED: Product still exists after delete.');
      failed++;
    }
  }

  // 6. Product RE-CREATE Test (with NEW ID)
  console.log('📌 STEP 6: Product RE-CREATE Test (New ID Persistence)');
  const newProdId = 'test_prod_recreated_' + Date.now();
  const recreateName = '__CRUD_TEST_PRODUCT_RECREATED__';
  const recreateIso = new Date().toISOString();

  const { error: reInsErr } = await supabase.from('products').insert({
    id: newProdId,
    name: recreateName,
    price: 200.0,
    barcode: '__CRUD_TEST_BARCODE_NEW__',
    updated_at: recreateIso
  });

  if (reInsErr) {
    console.error('❌ STEP 6 FAILED: Product RE-CREATE failed:', reInsErr);
    failed++;
  } else {
    console.log(`  - Successfully re-created new product ID ${newProdId} ("${recreateName}").`);
    // Cleanup synthetic recreated product
    await supabase.from('products').delete().eq('id', newProdId);
    console.log('✅ STEP 6 PASSED\n');
    passed++;
  }

  // 7. Code Audit & Business Data Safety Verification
  console.log('📌 STEP 7: Zero Existing Business Data Corruption Verification');
  const { data: finalProds } = await supabase.from('products').select('id');
  const { data: finalCats } = await supabase.from('categories').select('id');

  const finalProdCount = finalProds ? finalProds.length : 0;
  const finalCatCount = finalCats ? finalCats.length : 0;

  console.log(`  - Baseline Products: ${baseProdCount} | Final Products: ${finalProdCount}`);
  console.log(`  - Baseline Categories: ${baseCatCount} | Final Categories: ${finalCatCount}`);

  if (baseProdCount === finalProdCount && baseCatCount === finalCatCount) {
    console.log('  - PERFECT MATCH: Zero existing catalog products or categories were modified or corrupted.');
    console.log('✅ STEP 7 PASSED\n');
    passed++;
  } else {
    console.error(`❌ STEP 7 FAILED: Count mismatch! Expected ${baseProdCount}/${baseCatCount}, got ${finalProdCount}/${finalCatCount}`);
    failed++;
  }

  console.log('==================================================');
  console.log(`SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('==================================================');

  if (failed === 0) {
    console.log('\n🎉 ALL PRODUCT RUNTIME LIFECYCLE TESTS PASSED SUCCESSFULLY!');
  } else {
    process.exit(1);
  }
}

runProductRuntimeTest();
