const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const FALLBACK_URL = 'https://akkjkjbnhafmolpvoiln.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

const supabase = createClient(FALLBACK_URL, FALLBACK_KEY);

async function executeCodeCorrections() {
  console.log('==================================================');
  console.log('SIS AL AMEEN — SMART WHITE VERIFIED CODE CORRECTIONS');
  console.log('==================================================\n');

  // STEP 1: Fetch All Products for Backup & Baseline Audit
  const { data: allProds, error: pErr } = await supabase.from('products').select('*');
  if (pErr || !allProds) {
    console.error('❌ Failed to fetch products for backup:', pErr);
    process.exit(1);
  }

  const nowIso = new Date().toISOString();
  const backupFileName = `supabase_full_products_backup_${nowIso.replace(/[:.]/g, '-')}.json`;
  fs.writeFileSync(backupFileName, JSON.stringify(allProds, null, 2));
  console.log(`✅ STEP 1: Full Supabase Backup Saved -> ${backupFileName} (${allProds.length} total products)`);

  const swProds = allProds.filter(p => p.main_category_id === 'اسمارت ابيض');
  const swBackupFile = `smart_white_backup_${nowIso.replace(/[:.]/g, '-')}.json`;
  fs.writeFileSync(swBackupFile, JSON.stringify(swProds, null, 2));
  console.log(`✅ STEP 1: Smart White Backup Saved -> ${swBackupFile} (${swProds.length} Smart White products)`);

  // Target Verified Corrections Definition
  const corrections = [
    {
      name: "متر مواسير 3 بوصة 3 مم سمارت ابيض",
      currentCode: "333030005",
      correctCode: "333030002",
      reason: "Company catalog: 333030002 = 75mm / 3mm pipe; 333030005 = 90mm / 3mm pipe."
    },
    {
      name: "كوع 3بوصه عادة سمارت أبيض",
      currentCode: "353010003",
      correctCode: "353020003",
      reason: "353010003 = 45°/Open elbow; 353020003 = 90°/Normal elbow ('عادة' = 90°)."
    },
    {
      name: "كوع 3بوصه مفتوح سمارت أبيض",
      currentCode: "353020003",
      correctCode: "353010003",
      reason: "353020003 = 90°/Normal elbow; 353010003 = 45°/Open elbow ('مفتوح' = 45°)."
    },
    {
      name: "كوع 1.5 بوصه مفتوح سمارت أبيض",
      currentCode: "353020001",
      correctCode: "353010001",
      reason: "353020001 = 90° normal; 353010001 = 45° open."
    },
    {
      name: "كوع 1 بوصه مفتوح اسمارت هوم",
      currentCode: "353020007",
      correctCode: "353010007",
      reason: "353020007 = 90° normal; 353010007 = 45° open."
    },
    {
      name: "بوش 2×1.5 سمارت أبيض",
      currentCode: "373050001",
      correctCode: "373050001",
      reason: "Verified correct technical code 373050001 (60 / 48 mm reducer)."
    }
  ];

  // STEP 2: Capture BEFORE Snapshot of Affected Records
  console.log('\n📌 STEP 2: Capturing BEFORE Snapshot of Target Records:');
  const affectedRecords = [];

  for (const c of corrections) {
    const found = swProds.find(p => p.name === c.name || (p.barcode && String(p.barcode).trim() === c.currentCode));
    if (found) {
      affectedRecords.push({
        targetCorrection: c,
        beforeRecord: {
          id: found.id,
          name: found.name,
          barcode: found.barcode,
          price: found.price,
          stock: found.stock,
          main_category_id: found.main_category_id,
          sub_category_id: found.sub_category_id
        }
      });
      console.log(`  - Match Found for "${c.name}": ID=${found.id} | Current Barcode=${found.barcode} | Price=${found.price}`);
    } else {
      console.warn(`  ⚠️ Could not find exact product match for "${c.name}" (code ${c.currentCode})`);
    }
  }

  const snapshotFile = `before_snapshot_code_corrections_${nowIso.replace(/[:.]/g, '-')}.json`;
  fs.writeFileSync(snapshotFile, JSON.stringify(affectedRecords, null, 2));
  console.log(`✅ BEFORE Snapshot Saved -> ${snapshotFile}`);

  // STEP 3: Apply Verified Barcode Corrections
  console.log('\n📌 STEP 3: Applying Verified Barcode Updates to Supabase Cloud...');
  const updatedLog = [];

  for (const item of affectedRecords) {
    const rec = item.beforeRecord;
    const targetCode = item.targetCorrection.correctCode;

    if (rec.barcode === targetCode) {
      console.log(`  - Skipping "${rec.name}" (ID ${rec.id}) — Barcode is ALREADY ${targetCode}.`);
      updatedLog.push({
        id: rec.id,
        name: rec.name,
        oldCode: rec.barcode,
        newCode: targetCode,
        status: 'ALREADY_CORRECT',
        reason: item.targetCorrection.reason
      });
      continue;
    }

    const { error: upErr } = await supabase
      .from('products')
      .update({
        barcode: targetCode,
        updated_at: new Date().toISOString()
      })
      .eq('id', rec.id);

    if (upErr) {
      console.error(`❌ Failed to update barcode for product ID ${rec.id}:`, upErr);
    } else {
      console.log(`  ✅ Updated "${rec.name}" (ID ${rec.id}): Old Barcode=${rec.barcode} -> New Barcode=${targetCode}`);
      updatedLog.push({
        id: rec.id,
        name: rec.name,
        oldCode: rec.barcode,
        newCode: targetCode,
        status: 'UPDATED',
        reason: item.targetCorrection.reason
      });
    }
  }

  // STEP 4: POST-WRITE VERIFICATION & SAFETY CHECKS
  console.log('\n📌 STEP 4: Post-Write Verification & Safety Checks...');
  const { data: postProds } = await supabase.from('products').select('*');
  const postSW = postProds.filter(p => p.main_category_id === 'اسمارت ابيض');

  console.log(`  - Total Products on Cloud: ${postProds.length} (Baseline: ${allProds.length})`);
  console.log(`  - Smart White Total Products: ${postSW.length} (Baseline: ${swProds.length})`);

  let dupBarcodes = 0;
  const barcodeMap = new Map();
  for (const p of postSW) {
    if (p.barcode) {
      const b = String(p.barcode).trim();
      if (barcodeMap.has(b)) {
        dupBarcodes++;
        console.warn(`  ⚠️ Duplicate Barcode detected: "${b}" shared by IDs ${barcodeMap.get(b)} and ${p.id}`);
      } else {
        barcodeMap.set(b, p.id);
      }
    }
  }

  console.log(`  - Duplicate Barcode Count in Smart White: ${dupBarcodes}`);

  // Confirm Non-Smart White categories unchanged
  const brCount = postProds.filter(p => p.main_category_id === 'Br').length;
  const kesselCount = postProds.filter(p => p.main_category_id === 'كيسيل').length;
  console.log(`  - BR Category Products: ${brCount}`);
  console.log(`  - Kessel Category Products: ${kesselCount}`);

  console.log('\n==================================================');
  console.log('SUMMARY OF APPLIED CORRECTIONS:');
  console.log('==================================================');
  console.table(updatedLog);
}

executeCodeCorrections();
