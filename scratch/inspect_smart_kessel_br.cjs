const fs = require('fs');
const path = require('path');

const brainDir = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\ebd2664e-4f6d-489b-b8c1-eb85182a52e4';

function inspectSmartKesselBr() {
  const filePath = path.join(brainDir, 'backup_smart_kessel_br_2026-08-13T20-57-58-085Z.json');
  if (!fs.existsSync(filePath)) {
    console.log('File not found');
    return;
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  console.log('Keys in file:', Object.keys(data));

  const prodsRaw = data.products;
  console.log(`typeof data.products: ${typeof prodsRaw}`);
  const prods = Array.isArray(prodsRaw) ? prodsRaw : (typeof prodsRaw === 'object' ? Object.values(prodsRaw) : []);
  console.log(`Total products in backup_smart_kessel_br: ${prods.length}`);

  const kessel = prods.filter(p => p && (
    (p.name && p.name.includes('كيسيل')) || 
    (p.main_category_id && String(p.main_category_id).includes('كيسيل')) ||
    (p.sub_category_id && String(p.sub_category_id).includes('كيسيل')) ||
    (p.category && String(p.category).includes('كيسيل')) ||
    (p.subCategory && String(p.subCategory).includes('كيسيل'))
  ));

  console.log(`Kessel products in file: ${kessel.length}`);
  kessel.slice(0, 15).forEach(p => {
    let meta = {};
    if (typeof p.image_path === 'string' && p.image_path.startsWith('{')) {
      try { meta = JSON.parse(p.image_path); } catch (_) {}
    }
    console.log(` - ID: [${p.id}] | Name: "${p.name}" | Barcode: "${p.barcode || ''}" | Code: "${p.supplierCode || meta.code || ''}" | Sub: "${p.sub_category_id || p.subCategory || ''}"`);
  });
}

inspectSmartKesselBr();
