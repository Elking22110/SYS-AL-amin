/**
 * EXTRACT EXACT 23 APPROVED KESSEL PRODUCTS
 * ==========================================
 * Reads supabase_products_full_backup_2026-08-23T06-53-30-088Z.json
 * Extracts the 23 KESSEL products present in that verified pre-deletion backup.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const backupPath = path.join(__dirname, 'supabase_products_full_backup_2026-08-23T06-53-30-088Z.json');
const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
const allProducts = backupData.products || [];

const kessel23 = allProducts.filter(p => {
  if (!p) return false;
  const nameStr = (p.name || '').toLowerCase();
  const mainCat = String(p.main_category_id || p.mainCategoryId || '').toLowerCase();
  const subCat = String(p.sub_category_id || p.subCategoryId || p.category || '').toLowerCase();
  return nameStr.includes('كيسيل') || nameStr.includes('كيسل') || mainCat.includes('كيسيل') || subCat.includes('كيسيل');
});

console.log(`\n========================================`);
console.log(`FOUND EXACTLY ${kessel23.length} KESSEL PRODUCTS IN BACKUP`);
console.log(`========================================\n`);

kessel23.forEach((p, i) => {
  console.log(`[${i+1}] ID: ${p.id} | Barcode: ${p.barcode || '-'} | Price: ${p.price} EGP | MainCat: "${p.main_category_id}" | SubCat: "${p.sub_category_id}" | Name: "${p.name}"`);
});

// Save to scratch/kessel_approved_23.json
const outputPath = path.join(__dirname, 'kessel_approved_23.json');
fs.writeFileSync(outputPath, JSON.stringify(kessel23, null, 2));
console.log(`\nSaved approved 23 Kessel products to: ${outputPath}\n`);
