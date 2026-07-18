const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, '..', 'public', 'products_seed.json');
const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const products = seedData.products || [];

// فحص تكرارات الباركود
const barcodeCounts = {};
const skuCounts = {};
const supplierCodeCounts = {};
const allMatchedCodes = {};

products.forEach(p => {
  if (p.barcode) {
    const c = String(p.barcode).trim();
    barcodeCounts[c] = (barcodeCounts[c] || 0) + 1;
    allMatchedCodes[c] = (allMatchedCodes[c] || 0) + 1;
  }
  if (p.sku) {
    const c = String(p.sku).trim();
    skuCounts[c] = (skuCounts[c] || 0) + 1;
    allMatchedCodes[c] = (allMatchedCodes[c] || 0) + 1;
  }
  if (p.supplierCode) {
    const c = String(p.supplierCode).trim();
    supplierCodeCounts[c] = (supplierCodeCounts[c] || 0) + 1;
    allMatchedCodes[c] = (allMatchedCodes[c] || 0) + 1;
  }
});

console.log(`📋 Total products in products_seed.json: ${products.length}`);

// البحث عن التكرارات
const dupBarcodes = Object.entries(barcodeCounts).filter(e => e[1] > 1);
const dupSkus = Object.entries(skuCounts).filter(e => e[1] > 1);
const dupSupplierCodes = Object.entries(supplierCodeCounts).filter(e => e[1] > 1);

console.log(`\n🔍 Duplicates Analysis in products_seed.json:`);
console.log(`- Duplicate Barcodes: ${dupBarcodes.length}`);
dupBarcodes.slice(0, 10).forEach(e => {
  console.log(`  Code: "${e[0]}" is used by ${e[1]} products in p.barcode`);
});

console.log(`- Duplicate SKUs: ${dupSkus.length}`);
dupSkus.slice(0, 10).forEach(e => {
  console.log(`  Code: "${e[0]}" is used by ${e[1]} products in p.sku`);
});

console.log(`- Duplicate Supplier Codes: ${dupSupplierCodes.length}`);
dupSupplierCodes.slice(0, 10).forEach(e => {
  console.log(`  Code: "${e[0]}" is used by ${e[1]} products in p.supplierCode`);
});

// لنرى كم كود فريد في الـ PDF سيطابق أكثر من منتج في السيستم
const sourcePath = path.join(__dirname, '..', 'scripts', 'company_list_source.txt');
const companyCodes = new Set();
const sourceLines = fs.readFileSync(sourcePath, 'utf8').split('\n');
sourceLines.forEach(line => {
  const m = line.match(/\b(\d{9})\b/);
  if (m) companyCodes.add(m[1]);
});

let totalMatchedInstances = 0;
let doubleMatchedCodesCount = 0;

companyCodes.forEach(code => {
  const matches = products.filter(p => 
    (p.barcode && String(p.barcode).trim() === code) ||
    (p.sku && String(p.sku).trim() === code) ||
    (p.supplierCode && String(p.supplierCode).trim() === code)
  );
  if (matches.length > 0) {
    totalMatchedInstances += matches.length;
    if (matches.length > 1) {
      doubleMatchedCodesCount++;
      console.log(`⚠️ Code "${code}" matches ${matches.length} products:`);
      matches.forEach(m => {
        console.log(`   - ID: ${m.id} | Name: "${m.name}" | Category: ${m.mainCategoryId}`);
      });
    }
  }
});

console.log(`\n📊 PDF Matches Statistics:`);
console.log(`- Unique codes from PDF price list: ${companyCodes.size}`);
console.log(`- Mapped products in system matching PDF: ${totalMatchedInstances}`);
console.log(`- Codes matching MULTIPLE products: ${doubleMatchedCodesCount}`);
