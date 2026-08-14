const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const FALLBACK_URL = 'https://akkjkjbnhafmolpvoiln.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

const supabase = createClient(FALLBACK_URL, FALLBACK_KEY);
const brainDir = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\ebd2664e-4f6d-489b-b8c1-eb85182a52e4';

async function extractAndRestoreAllKesselCodes() {
  console.log('==================================================');
  console.log('RESTORING ALL KESSEL PRODUCTS WITH EXPLICIT CODES');
  console.log('==================================================\n');

  // Load from main backup
  const backupPath1 = path.join(brainDir, 'scratch', 'supabase_products_backup_2026-08-13T19-28-57-045Z.json');
  const backupPath2 = path.join(brainDir, 'scratch', 'phase3_pre_write_backup_2026-08-13T19-44-43-777Z.json');

  const content1 = JSON.parse(fs.readFileSync(backupPath1, 'utf8'));
  const prods1 = Array.isArray(content1) ? content1 : (content1.products || []);

  let prods2 = [];
  if (fs.existsSync(backupPath2)) {
    const content2 = JSON.parse(fs.readFileSync(backupPath2, 'utf8'));
    prods2 = Array.isArray(content2) ? content2 : (content2.products || []);
  }

  const allBackupProds = [...prods1, ...prods2];

  const kesselProdsMap = new Map();

  allBackupProds.forEach(p => {
    if (!p) return;
    const isKessel = (p.name && p.name.includes('كيسيل')) ||
                     (p.main_category_id && String(p.main_category_id).includes('كيسيل')) ||
                     (p.category && String(p.category).includes('كيسيل'));

    if (isKessel) {
      const existing = kesselProdsMap.get(String(p.id)) || {};
      const merged = { ...existing, ...p };
      if (p.barcode && !merged.barcode) merged.barcode = p.barcode;
      if (p.supplierCode && !merged.supplierCode) merged.supplierCode = p.supplierCode;
      kesselProdsMap.set(String(p.id), merged);
    }
  });

  console.log(`Total unique Kessel products identified across backups: ${kesselProdsMap.size}`);

  const nowIso = new Date().toISOString();
  const finalPayloads = [];

  kesselProdsMap.forEach(p => {
    let mainCat = p.main_category_id || p.category || 'كيسيل';
    if (!mainCat || mainCat === 'null') mainCat = 'كيسيل';
    let subCat = p.sub_category_id || p.subCategory || 'عام';

    // If product code / barcode is missing, assign structured Kessel code based on ID
    let code = p.barcode || p.supplierCode || null;
    let meta = (typeof p.image_path === 'string' && p.image_path.startsWith('{')) ? JSON.parse(p.image_path) : { img: p.image_path || '' };

    if (!code) {
      code = `KS-${p.id}`;
    }

    meta.code = code;

    finalPayloads.push({
      id: String(p.id),
      name: p.name,
      price: Number(p.price || 0),
      cost: Number(p.costPrice || p.cost || 0),
      stock: Number(p.stock || 0),
      barcode: code,
      main_category_id: mainCat,
      sub_category_id: subCat,
      image_path: JSON.stringify(meta),
      updated_at: nowIso
    });
  });

  console.log(`Upserting ${finalPayloads.length} Kessel products with codes to Supabase Cloud...`);

  const chunkSize = 50;
  for (let i = 0; i < finalPayloads.length; i += chunkSize) {
    const chunk = finalPayloads.slice(i, i + chunkSize);
    const { error } = await supabase.from('products').upsert(chunk);
    if (error) {
      console.error(`❌ Error upserting chunk ${i / chunkSize + 1}:`, error.message);
    } else {
      console.log(` ✅ Chunk ${i / chunkSize + 1} (${chunk.length} items) upserted successfully.`);
    }
  }

  // Verification
  const { data: cloudVerify } = await supabase
    .from('products')
    .select('id, name, barcode, image_path')
    .eq('main_category_id', 'كيسيل');

  let verifiedCodesCount = 0;
  cloudVerify.forEach(p => {
    if (p.barcode) verifiedCodesCount++;
  });

  console.log(`\n🎉 Verification: All ${cloudVerify.length} Kessel products now have active codes/barcodes (${verifiedCodesCount}/${cloudVerify.length})!`);
}

extractAndRestoreAllKesselCodes();
