const fs = require('fs');
const path = require('path');

const brainDir = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\ebd2664e-4f6d-489b-b8c1-eb85182a52e4';

function inspectBackupFiles() {
  console.log('==================================================');
  console.log('INSPECTING KESSEL BACKUP FILES');
  console.log('==================================================\n');

  const files = [
    'backup_smart_kessel_br_2026-08-13T20-57-58-085Z.json',
    'scratch/supabase_products_backup_2026-08-13T19-28-57-045Z.json',
    'scratch/supabase_products_backup_2026-08-13T19-29-09-125Z.json',
    'scratch/supabase_products_backup_2026-08-13T19-29-38-605Z.json',
    'scratch/phase3_pre_write_backup_2026-08-13T19-44-16-568Z.json'
  ];

  for (const relFile of files) {
    const fullPath = path.join(brainDir, relFile);
    if (!fs.existsSync(fullPath)) {
      console.log(`File not found: ${relFile}`);
      continue;
    }

    try {
      const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      const prods = Array.isArray(content) ? content : (content.products || content.data?.products || []);
      
      const kesselProds = prods.filter(p => 
        (p.name && p.name.includes('كيسيل')) || 
        (p.main_category_id && String(p.main_category_id).includes('كيسيل')) ||
        (p.sub_category_id && String(p.sub_category_id).includes('كيسيل')) ||
        (p.category && String(p.category).includes('كيسيل')) ||
        (p.subCategory && String(p.subCategory).includes('كيسيل'))
      );

      console.log(`\n📦 File: "${relFile}"`);
      console.log(`   Total records in file: ${prods.length}`);
      console.log(`   Kessel products in file: ${kesselProds.length}`);

      if (kesselProds.length > 0) {
        console.log('   Sample Kessel records:');
        kesselProds.slice(0, 5).forEach(p => {
          console.log(`    - ID: ${p.id} | Name: "${p.name}" | Main: "${p.main_category_id || p.category}" | Sub: "${p.sub_category_id || p.subCategory}"`);
        });
      }
    } catch (err) {
      console.error(`Error reading ${relFile}:`, err.message);
    }
  }
}

inspectBackupFiles();
