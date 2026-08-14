const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const FALLBACK_URL = 'https://akkjkjbnhafmolpvoiln.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

const supabase = createClient(FALLBACK_URL, FALLBACK_KEY);
const brainDir = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\ebd2664e-4f6d-489b-b8c1-eb85182a52e4';

async function restoreKesselProducts() {
  console.log('==================================================');
  console.log('RESTORING KESSEL PRODUCTS TO SUPABASE CLOUD');
  console.log('==================================================\n');

  const backupPath = path.join(brainDir, 'scratch', 'supabase_products_backup_2026-08-13T19-28-57-045Z.json');
  if (!fs.existsSync(backupPath)) {
    console.error('Backup file not found:', backupPath);
    return;
  }

  const raw = fs.readFileSync(backupPath, 'utf8');
  const content = JSON.parse(raw);
  const allBackupProds = Array.isArray(content) ? content : (content.products || content.data?.products || []);

  const kesselBackupProds = allBackupProds.filter(p => 
    p && (
      (p.name && p.name.includes('كيسيل')) || 
      (p.main_category_id && String(p.main_category_id).includes('كيسيل')) ||
      (p.sub_category_id && String(p.sub_category_id).includes('كيسيل')) ||
      (p.category && String(p.category).includes('كيسيل')) ||
      (p.subCategory && String(p.subCategory).includes('كيسيل'))
    )
  );

  console.log(`Found ${kesselBackupProds.length} Kessel products in backup.`);

  if (kesselBackupProds.length === 0) {
    console.error('No Kessel products found in backup');
    return;
  }

  const nowIso = new Date().toISOString();

  // Format records for cloud
  const cloudPayloads = kesselBackupProds.map(p => {
    let mainCat = p.main_category_id || p.category || 'كيسيل';
    if (!mainCat || mainCat === 'null') mainCat = 'كيسيل';

    let subCat = p.sub_category_id || p.subCategory || 'عام';

    return {
      id: String(p.id),
      name: p.name,
      price: Number(p.price || 0),
      cost: Number(p.costPrice || p.cost || 0),
      stock: Number(p.stock || 0),
      barcode: p.barcode || null,
      main_category_id: mainCat,
      sub_category_id: subCat,
      image_path: p.image_path || p.imagePath || null,
      updated_at: nowIso
    };
  });

  console.log(`Upserting ${cloudPayloads.length} Kessel products to Supabase Cloud in chunks of 50...`);

  const chunkSize = 50;
  let successCount = 0;

  for (let i = 0; i < cloudPayloads.length; i += chunkSize) {
    const chunk = cloudPayloads.slice(i, i + chunkSize);
    const { error } = await supabase.from('products').upsert(chunk);
    if (error) {
      console.error(`❌ Error upserting chunk ${i / chunkSize + 1}:`, error.message);
    } else {
      successCount += chunk.length;
      console.log(` ✅ Chunk ${i / chunkSize + 1} (${chunk.length} items) upserted successfully.`);
    }
  }

  console.log(`\nSuccessfully restored ${successCount}/${cloudPayloads.length} Kessel products to Supabase Cloud!`);

  // Verify in Cloud
  const { data: verifiedKessel } = await supabase.from('products').select('*').eq('main_category_id', 'كيسيل');
  console.log(`\n🎉 Verification: Supabase Cloud now has ${verifiedKessel ? verifiedKessel.length : 0} products in main category "كيسيل"!`);
}

restoreKesselProducts();
