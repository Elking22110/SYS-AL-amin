const fs = require('fs');
const path = require('path');

const brainDir = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\ebd2664e-4f6d-489b-b8c1-eb85182a52e4';

function inspectBackupObject() {
  const filePath = path.join(brainDir, 'backup_smart_kessel_br_2026-08-13T20-57-58-085Z.json');
  if (!fs.existsSync(filePath)) {
    console.log('Backup file not found:', filePath);
    return;
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);

  console.log('Keys in backup_smart_kessel_br:', Object.keys(data));

  let prods = [];
  if (Array.isArray(data)) {
    prods = data;
  } else if (data.products && Array.isArray(data.products)) {
    prods = data.products;
  } else if (data.data && data.data.products && Array.isArray(data.data.products)) {
    prods = data.data.products;
  } else {
    // If it's a map of items
    prods = Object.values(data).filter(item => typeof item === 'object');
  }

  console.log(`Extracted ${prods.length} products from backup_smart_kessel_br`);

  const kesselProds = prods.filter(p => 
    p && (
      (p.name && p.name.includes('كيسيل')) || 
      (p.main_category_id && String(p.main_category_id).includes('كيسيل')) ||
      (p.sub_category_id && String(p.sub_category_id).includes('كيسيل')) ||
      (p.category && String(p.category).includes('كيسيل')) ||
      (p.subCategory && String(p.subCategory).includes('كيسيل'))
    )
  );

  console.log(`Found ${kesselProds.length} Kessel products in backup_smart_kessel_br`);
}

inspectBackupObject();
