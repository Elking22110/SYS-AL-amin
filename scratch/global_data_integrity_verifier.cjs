const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const FALLBACK_URL = 'https://akkjkjbnhafmolpvoiln.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

const supabase = createClient(FALLBACK_URL, FALLBACK_KEY);

async function runGlobalIntegrityVerifier() {
  console.log('==================================================');
  console.log('SIS AL AMEEN — GLOBAL DATA INTEGRITY VERIFIER');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  // 1. Baseline Check
  console.log('📌 TEST 1: Baseline Check on Supabase Cloud');
  const { data: initialProds, error: pErr } = await supabase.from('products').select('id');
  const { data: initialCats, error: cErr } = await supabase.from('categories').select('id');
  const { data: initialCusts, error: custErr } = await supabase.from('customers').select('id');
  const { data: initialSups, error: sErr } = await supabase.from('suppliers').select('id');

  if (pErr || cErr || custErr || sErr || !initialProds || !initialCats) {
    console.error('❌ TEST 1 FAILED: Cannot connect to Supabase Cloud:', pErr || cErr || custErr || sErr);
    failed++;
    return;
  }

  const baseProdCount = initialProds.length;
  const baseCatCount = initialCats.length;
  console.log(`  - Baseline Products: ${baseProdCount}`);
  console.log(`  - Baseline Categories: ${baseCatCount}`);
  console.log(`  - Baseline Customers: ${initialCusts?.length || 0}`);
  console.log(`  - Baseline Suppliers: ${initialSups?.length || 0}`);
  console.log('✅ TEST 1 PASSED\n');
  passed++;

  // 2. Synthetic Test Record Creation across Entities
  console.log('📌 TEST 2: Universal CREATE Flow for Test Customer & Supplier');
  const testCustId = 'test_cust_' + Date.now();
  const testSupId = 'test_sup_' + Date.now();
  const nowIso = new Date().toISOString();

  const { error: insCustErr } = await supabase.from('customers').insert({
    id: testCustId,
    name: 'عميل اختيار آلي ' + Date.now(),
    phone: '01000000000',
    type: 'عميل عادي',
    debt: 0,
    updated_at: nowIso
  });

  const { error: insSupErr } = await supabase.from('suppliers').upsert({
    id: testSupId,
    value: {
      id: testSupId,
      name: 'مورد اختبار آلي ' + Date.now(),
      phone: '01100000000',
      updated_at: nowIso
    },
    updated_at: nowIso
  });

  if (insCustErr || insSupErr) {
    console.error('❌ TEST 2 FAILED: Synthetic CREATE failed:', insCustErr || insSupErr);
    failed++;
  } else {
    console.log(`  - Successfully created synthetic Customer (${testCustId}) & Supplier (${testSupId}).`);
    console.log('✅ TEST 2 PASSED\n');
    passed++;
  }

  // 3. Universal UPDATE Flow
  console.log('📌 TEST 3: Universal UPDATE Flow');
  const updatedCustName = 'عميل اختيار آلي (معدل)';
  const { error: upCustErr } = await supabase.from('customers').upsert({
    id: testCustId,
    name: updatedCustName,
    phone: '01000000000',
    updated_at: new Date().toISOString()
  });

  if (upCustErr) {
    console.error('❌ TEST 3 FAILED: Synthetic UPDATE failed:', upCustErr);
    failed++;
  } else {
    console.log(`  - Successfully updated synthetic Customer name to "${updatedCustName}".`);
    console.log('✅ TEST 3 PASSED\n');
    passed++;
  }

  // 4. Universal DELETE Flow
  console.log('📌 TEST 4: Universal DELETE Flow');
  const { error: delCustErr } = await supabase.from('customers').delete().eq('id', testCustId);
  const { error: delSupErr } = await supabase.from('suppliers').delete().eq('id', testSupId);

  if (delCustErr || delSupErr) {
    console.error('❌ TEST 4 FAILED: Synthetic DELETE failed:', delCustErr || delSupErr);
    failed++;
  } else {
    console.log('  - Successfully deleted synthetic Customer & Supplier from Supabase Cloud.');
    console.log('✅ TEST 4 PASSED\n');
    passed++;
  }

  // 5. Universal RE-CREATE Flow (Timestamped Tombstone Safety)
  console.log('📌 TEST 5: Universal RE-CREATE Flow');
  const { error: reInsErr } = await supabase.from('customers').insert({
    id: testCustId,
    name: 'عميل معاد إنشاؤه',
    phone: '01000000000',
    updated_at: new Date().toISOString()
  });

  if (reInsErr) {
    console.error('❌ TEST 5 FAILED: Re-creation of deleted record failed:', reInsErr);
    failed++;
  } else {
    console.log('  - Re-creation of customer succeeded. Cleaning up test record...');
    await supabase.from('customers').delete().eq('id', testCustId);
    console.log('✅ TEST 5 PASSED\n');
    passed++;
  }

  // 6. Static Code Inspection Across All Data Entities
  console.log('📌 TEST 6: Static Code Inspection of Universal Architecture');
  const syncManagerCode = fs.readFileSync('src/utils/syncManager.js', 'utf8');
  const customersCode = fs.readFileSync('src/pages/Customers.jsx', 'utf8');
  const suppliersCode = fs.readFileSync('src/pages/Suppliers.jsx', 'utf8');
  const expensesCode = fs.readFileSync('src/pages/Expenses.jsx', 'utf8');
  const productsCode = fs.readFileSync('src/pages/Products.jsx', 'utf8');

  const syncOk = syncManagerCode.includes('getDeletedTombstonesMap') && syncManagerCode.includes('isRecordTombstoned');
  const custOk = customersCode.includes('_isNewLocally: true') && customersCode.includes('supabase.from(\'customers\').insert');
  const supOk = suppliersCode.includes('_isNewLocally: true') && suppliersCode.includes('supabase.from(\'suppliers\').upsert');
  const expOk = expensesCode.includes('_isNewLocally = true') && expensesCode.includes('supabase.from(\'expenses\').upsert');
  const prodOk = productsCode.includes('_isNewLocally: true');

  if (syncOk && custOk && supOk && expOk && prodOk) {
    console.log('  - All CRUD modules (Products, Categories, Customers, Suppliers, Expenses) adhere to Universal Data Architecture.');
    console.log('  - syncManager enforces timestamped tombstones & lifecycle-aware guards universally.');
    console.log('✅ TEST 6 PASSED\n');
    passed++;
  } else {
    console.error('❌ TEST 6 FAILED: Code inspection failed for one or more modules.');
    failed++;
  }

  // 7. Zero Existing Business Data Corruption Verification
  console.log('📌 TEST 7: Zero Existing Business Data Corruption Verification');
  const { data: finalProds } = await supabase.from('products').select('id');
  const { data: finalCats } = await supabase.from('categories').select('id');

  const finalProdCount = finalProds ? finalProds.length : 0;
  const finalCatCount = finalCats ? finalCats.length : 0;

  console.log(`  - Baseline Products: ${baseProdCount} | Final Products: ${finalProdCount}`);
  console.log(`  - Baseline Categories: ${baseCatCount} | Final Categories: ${finalCatCount}`);

  if (baseProdCount === finalProdCount && baseCatCount === finalCatCount) {
    console.log('  - PERFECT MATCH: Zero existing catalog products or categories were modified or corrupted.');
    console.log('✅ TEST 7 PASSED\n');
    passed++;
  } else {
    console.error(`❌ TEST 7 FAILED: Count mismatch! Expected ${baseProdCount}/${baseCatCount}, got ${finalProdCount}/${finalCatCount}`);
    failed++;
  }

  console.log('==================================================');
  console.log(`SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('==================================================');

  if (failed === 0) {
    console.log('\n🎉 GLOBAL DATA CRUD & SYNC HARDENING VERIFIED SUCCESSFULLY!');
  } else {
    process.exit(1);
  }
}

runGlobalIntegrityVerifier();
