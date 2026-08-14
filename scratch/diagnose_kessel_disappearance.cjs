const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const FALLBACK_URL = 'https://akkjkjbnhafmolpvoiln.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

const supabase = createClient(FALLBACK_URL, FALLBACK_KEY);

async function diagnoseKessel() {
  console.log('==================================================');
  console.log('DIAGNOSING KESSEL PRODUCTS DISAPPEARANCE');
  console.log('==================================================\n');

  // 1. Search Supabase Cloud products
  const { data: allProds, error: prodErr } = await supabase.from('products').select('*');
  if (prodErr) {
    console.error('Error querying Supabase products:', prodErr);
    return;
  }

  console.log(`Total products in Supabase Cloud: ${allProds.length}`);

  const kesselProds = allProds.filter(p => 
    (p.name && p.name.includes('كيسيل')) || 
    (p.main_category_id && String(p.main_category_id).includes('كيسيل')) ||
    (p.sub_category_id && String(p.sub_category_id).includes('كيسيل'))
  );

  console.log(`Found ${kesselProds.length} Kessel products in Supabase Cloud.`);

  if (kesselProds.length > 0) {
    console.log('\nSample Kessel products in Cloud:');
    kesselProds.slice(0, 5).forEach(p => {
      console.log(` - ID: ${p.id} | Name: "${p.name}" | Main: "${p.main_category_id}" | Sub: "${p.sub_category_id}"`);
    });
  }

  // 2. Check Supabase Categories for Kessel
  const { data: allCats } = await supabase.from('categories').select('*');
  const kesselCats = allCats.filter(c => c.name && c.name.includes('كيسيل'));
  console.log(`\nFound ${kesselCats.length} Kessel categories in Supabase Cloud:`);
  kesselCats.forEach(c => {
    console.log(` - ID: ${c.id} | Name: "${c.name}" | Parent: "${c.parent_id}"`);
  });

  // 3. Search backup json files in artifact directory
  const artifactDir = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\ebd2664e-4f6d-489b-b8c1-eb85182a52e4';
  if (fs.existsSync(artifactDir)) {
    const files = fs.readdirSync(artifactDir);
    const backupFiles = files.filter(f => f.endsWith('.json'));
    console.log(`\nFound ${backupFiles.length} backup JSON files in artifact directory:`);
    for (const bf of backupFiles) {
      try {
        const fullPath = path.join(artifactDir, bf);
        const stat = fs.statSync(fullPath);
        if (stat.size > 1000) {
          const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
          const list = Array.isArray(content) ? content : (content.products || content.data?.products || []);
          const kesselInBackup = list.filter(p => p && p.name && p.name.includes('كيسيل'));
          if (kesselInBackup.length > 0) {
            console.log(` 📦 Backup file "${bf}" contains ${kesselInBackup.length} Kessel products! (Total records: ${list.length})`);
          }
        }
      } catch (_) {}
    }
  }
}

diagnoseKessel();
