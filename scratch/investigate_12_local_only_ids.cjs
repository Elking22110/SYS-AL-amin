/**
 * FORENSIC INVESTIGATION — 12 LOCAL-ONLY PRODUCT IDs
 * ====================================================
 * Inspects IDs:
 * 171506, 171507, 171508, 171509, 171510, 171511,
 * 171513, 171514, 171515, 171516, 171517, 171518
 *
 * Checks:
 * 1. public/products_seed.json
 * 2. Supabase API (current status)
 * 3. Recent backups (scratch/supabase_products_full_backup_*.json)
 *
 * DOES NOT DELETE OR MODIFY ANYTHING.
 * Run: node scratch/investigate_12_local_only_ids.cjs
 */
'use strict';

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const TARGET_IDS = [
  '171506', '171507', '171508', '171509', '171510', '171511',
  '171513', '171514', '171515', '171516', '171517', '171518'
];

const SUPABASE_URL = 'akkjkjbnhafmolpvoiln.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

function fetchSupabaseById(id) {
  return new Promise((resolve) => {
    const opts = {
      hostname: SUPABASE_URL,
      path: `/rest/v1/products?id=eq.${encodeURIComponent(id)}`,
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json'
      }
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const body = JSON.parse(data);
          resolve(Array.isArray(body) && body.length > 0 ? body[0] : null);
        } catch (_) {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.end();
  });
}

async function main() {
  console.log('\n' + '═'.repeat(75));
  console.log('  FORENSIC INVESTIGATION — 12 LOCAL-ONLY PRODUCT IDs');
  console.log('═'.repeat(75));

  // 1. Load products_seed.json
  const seedPath = path.join(__dirname, '../public/products_seed.json');
  const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  const seedProducts = seedData.products || [];
  const seedMap = new Map(seedProducts.map(p => [String(p.id), p]));

  console.log(`[Seed Catalog] Total approved products in seed: ${seedProducts.length}`);

  // 2. Load latest backup file if available
  const scratchDir = __dirname;
  const backupFiles = fs.readdirSync(scratchDir).filter(f => f.startsWith('supabase_products_full_backup_') && f.endsWith('.json'));
  let backupMap = new Map();
  if (backupFiles.length > 0) {
    backupFiles.sort().reverse();
    const backupPath = path.join(scratchDir, backupFiles[0]);
    const bData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    const bProds = bData.products || [];
    backupMap = new Map(bProds.map(p => [String(p.id), p]));
    console.log(`[Backup] Loaded latest pre-deletion backup: ${backupFiles[0]} (${bProds.length} products)`);
  }

  // 3. Inspect each of the 12 IDs
  const forensicResults = [];

  for (const id of TARGET_IDS) {
    const inSeed = seedMap.get(id);
    const inBackup = backupMap.get(id);
    const inSupabase = await fetchSupabaseById(id);

    // Kessel check: check if name or category contains 'كيسيل' or 'kessel'
    const nameStr = (inSeed?.name || inBackup?.name || inSupabase?.name || '').toLowerCase();
    const catStr = (inSeed?.sub_category_id || inSeed?.subCategoryId || inBackup?.sub_category_id || '').toLowerCase();
    const isKessel = nameStr.includes('كيسيل') || nameStr.includes('kessel') || catStr.includes('كيسيل') || catStr.includes('kessel');

    forensicResults.push({
      id,
      name: inSeed ? inSeed.name : (inBackup ? inBackup.name : (inSupabase ? inSupabase.name : 'NOT_FOUND')),
      barcode: inSeed ? (inSeed.barcode || '-') : (inBackup ? (inBackup.barcode || '-') : '-'),
      price: inSeed ? inSeed.price : (inBackup ? inBackup.price : 0),
      category: inSeed ? (inSeed.subCategoryId || inSeed.sub_category_id || inSeed.category || '-') : (inBackup ? (inBackup.sub_category_id || '-') : '-'),
      stock: inSeed ? (inSeed.stock ?? 0) : (inBackup ? (inBackup.stock ?? 0) : 0),
      updated_at: inSeed ? (inSeed.updated_at || '-') : (inBackup ? (inBackup.updated_at || '-') : '-'),
      inSeed: !!inSeed,
      inBackup: !!inBackup,
      inSupabase: !!inSupabase,
      isKessel
    });
  }

  // 4. DISPLAY DETAILED REPORT
  console.log('\n' + '─'.repeat(75));
  console.log('  FORENSIC FINDINGS FOR THE 12 IDs:');
  console.log('─'.repeat(75));

  forensicResults.forEach((r, idx) => {
    console.log(`\n[${idx + 1}] ID: ${r.id}`);
    console.log(`    Name           : "${r.name}"`);
    console.log(`    Barcode        : ${r.barcode}`);
    console.log(`    Price          : ${r.price} EGP`);
    console.log(`    Category       : ${r.category}`);
    console.log(`    In Seed (2746) : ${r.inSeed ? 'YES ✅ (Approved)' : 'NO ❌'}`);
    console.log(`    In Backup      : ${r.inBackup ? 'YES ✅' : 'NO ❌'}`);
    console.log(`    In Supabase Now: ${r.inSupabase ? 'YES ✅' : 'NO ❌ (Missing)'}`);
    console.log(`    Kessel Product : ${r.isKessel ? 'YES ⚠️ (KESSEL)' : 'NO'}`);
  });

  // Summary counts
  const approvedAndMissing = forensicResults.filter(r => r.inSeed && !r.inSupabase);
  const kesselCount = forensicResults.filter(r => r.isKessel);

  console.log('\n' + '═'.repeat(75));
  console.log('  SUMMARY');
  console.log('═'.repeat(75));
  console.log(`  Total IDs Inspected           : ${TARGET_IDS.length}`);
  console.log(`  Approved in Seed Catalog      : ${forensicResults.filter(r => r.inSeed).length}`);
  console.log(`  Approved & Missing in Supabase: ${approvedAndMissing.length}`);
  console.log(`  Kessel Products               : ${kesselCount.length}`);
  console.log('═'.repeat(75) + '\n');
}

main().catch(console.error);
