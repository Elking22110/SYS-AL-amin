const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const FALLBACK_URL = 'https://akkjkjbnhafmolpvoiln.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

const supabase = createClient(FALLBACK_URL, FALLBACK_KEY);

async function restoreSmartWhiteFromBackup() {
  console.log('==================================================');
  console.log('RESTORATION: Restoring "اسمارت ابيض" from Backup');
  console.log('==================================================\n');

  // Load full category backup
  const backupFile = 'backup_smart_kessel_br_2026-08-13T20-57-58-085Z.json';
  let backupPath = path.join(__dirname, backupFile);
  if (!fs.existsSync(backupPath)) {
    backupPath = path.join(__dirname, '..', backupFile);
  }

  if (!fs.existsSync(backupPath)) {
    console.error('❌ Backup file not found at:', backupPath);
    process.exit(1);
  }

  const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  const allProds = backupData.products || [];
  const smartProds = allProds.filter(p => (p.main_category_id || p.mainCategoryId) === 'اسمارت ابيض');

  console.log(`📦 Found ${smartProds.length} Smart White products in backup file.`);

  // Prepare records for Supabase upsert
  const uploadPayload = smartProds.map(p => {
    return {
      id: String(p.id),
      name: p.name,
      price: p.price ?? 0,
      cost: p.cost ?? p.costPrice ?? 0,
      stock: p.stock ?? 0,
      barcode: p.barcode ?? null,
      main_category_id: p.main_category_id || p.mainCategoryId || 'اسمارت ابيض',
      sub_category_id: p.sub_category_id || p.subCategoryId || null,
      image_path: p.image_path || p.imagePath || null,
      updated_at: p.updated_at || new Date().toISOString()
    };
  });

  // Upsert in batches of 100
  const chunkSize = 100;
  let restoredCount = 0;

  for (let i = 0; i < uploadPayload.length; i += chunkSize) {
    const chunk = uploadPayload.slice(i, i + chunkSize);
    const { error: upErr } = await supabase.from('products').upsert(chunk);
    if (upErr) {
      console.error(`❌ Error restoring chunk ${i}:`, upErr);
    } else {
      restoredCount += chunk.length;
    }
  }

  console.log(`✅ Successfully restored ${restoredCount} Smart White products to Supabase Cloud.`);

  // Verify on Supabase
  const { data: currentSmart } = await supabase
    .from('products')
    .select('id')
    .eq('main_category_id', 'اسمارت ابيض');

  console.log(`📊 Current Smart White count on Supabase: ${currentSmart?.length || 0}`);

  console.log('\n==================================================');
  console.log('RESTORATION COMPLETED SUCCESSFULLY');
  console.log('==================================================');
}

restoreSmartWhiteFromBackup();
