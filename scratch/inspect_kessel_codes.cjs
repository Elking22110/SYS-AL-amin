const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const FALLBACK_URL = 'https://akkjkjbnhafmolpvoiln.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

const supabase = createClient(FALLBACK_URL, FALLBACK_KEY);
const brainDir = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\ebd2664e-4f6d-489b-b8c1-eb85182a52e4';

async function inspectKesselCodes() {
  console.log('==================================================');
  console.log('INSPECTING KESSEL CODES IN CLOUD & BACKUPS');
  console.log('==================================================\n');

  // Query Cloud Kessel Products
  const { data: cloudKessel } = await supabase
    .from('products')
    .select('*')
    .eq('main_category_id', 'كيسيل');

  console.log(`Cloud Kessel Products Count: ${cloudKessel ? cloudKessel.length : 0}`);

  if (cloudKessel && cloudKessel.length > 0) {
    console.log('\nCloud Kessel Sample Records (with barcode & image_path metadata):');
    cloudKessel.slice(0, 10).forEach(p => {
      let meta = {};
      if (typeof p.image_path === 'string' && p.image_path.startsWith('{')) {
        try { meta = JSON.parse(p.image_path); } catch (_) {}
      }
      console.log(` - ID: ${p.id} | Name: "${p.name}" | Barcode: "${p.barcode || ''}" | CodeInMeta: "${meta.code || ''}" | Price: ${p.price}`);
    });
  }

  // Inspect Backup file for supplier codes
  const backupPath = path.join(brainDir, 'scratch', 'supabase_products_backup_2026-08-13T19-28-57-045Z.json');
  if (fs.existsSync(backupPath)) {
    const raw = fs.readFileSync(backupPath, 'utf8');
    const content = JSON.parse(raw);
    const prods = Array.isArray(content) ? content : (content.products || []);
    const kesselBackup = prods.filter(p => 
      p && ((p.name && p.name.includes('كيسيل')) || (p.main_category_id && String(p.main_category_id).includes('كيسيل')))
    );

    console.log(`\nBackup File Kessel Products Count: ${kesselBackup.length}`);
    let withBarcode = 0;
    let withSupplierCode = 0;

    kesselBackup.forEach(p => {
      if (p.barcode) withBarcode++;
      let meta = {};
      if (typeof p.image_path === 'string' && p.image_path.startsWith('{')) {
        try { meta = JSON.parse(p.image_path); } catch (_) {}
      }
      if (p.supplierCode || meta.code) withSupplierCode++;
    });

    console.log(` - Backup Kessel with barcode: ${withBarcode}`);
    console.log(` - Backup Kessel with supplierCode/meta.code: ${withSupplierCode}`);
  }
}

inspectKesselCodes();
