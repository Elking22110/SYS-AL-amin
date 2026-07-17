/**
 * generate-full-report.cjs
 * يولّد ملف شامل بكل الأصناف مع أكوادها
 */
const fs   = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, '..', 'public', 'products_seed.json');
const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const all = seedData.products || [];

const cats = [
  { id: 'Br',           label: 'BR - مواسير وتوصيلات PPR' },
  { id: 'اسمارت ابيض', label: 'سمارت أبيض - صرف SM' },
  { id: 'كيسيل',        label: 'كيسيل - صرف KS' },
];

let out = '';
out += '='.repeat(70) + '\n';
out += '     قائمة الأصناف الكاملة مع أكواد الشركة\n';
out += '     تاريخ الإنتاج: ' + new Date().toLocaleDateString('ar-EG') + '\n';
out += '='.repeat(70) + '\n\n';

let totalCoded = 0, totalAll = 0;

cats.forEach(cat => {
  const prods   = all.filter(p => p.mainCategoryId === cat.id);
  const coded   = prods.filter(p => p.barcode);
  const uncoded = prods.filter(p => !p.barcode);
  totalCoded += coded.length;
  totalAll   += prods.length;

  out += '='.repeat(70) + '\n';
  out += `  ${cat.label}\n`;
  out += `  مكوّد: ${coded.length} | غير مكوّد: ${uncoded.length} | الإجمالي: ${prods.length}\n`;
  out += '='.repeat(70) + '\n\n';

  // --- المكوّدة ---
  if (coded.length > 0) {
    out += '  ✅ الأصناف المكوّدة:\n';
    out += '  ' + '-'.repeat(66) + '\n';
    out += '  ' + 'ID'.padEnd(8) + 'كود الشركة'.padEnd(16) + 'اسم الصنف\n';
    out += '  ' + '-'.repeat(66) + '\n';
    coded.forEach(p => {
      const id   = String(p.id).padEnd(8);
      const code = (p.barcode || '').padEnd(16);
      out += `  ${id}${code}${p.name}\n`;
    });
    out += '\n';
  }

  // --- غير المكوّدة ---
  if (uncoded.length > 0) {
    out += '  ❌ الأصناف بدون كود (غير موجودة في قائمة الشركة):\n';
    out += '  ' + '-'.repeat(66) + '\n';
    uncoded.forEach(p => {
      out += `  [${p.id}]  ${p.name}\n`;
    });
    out += '\n';
  }
});

out += '='.repeat(70) + '\n';
out += `  الإجمالي الكلي: ${totalCoded} مكوّد من ${totalAll} صنف\n`;
out += '='.repeat(70) + '\n';

const outPath = path.join(__dirname, '..', 'all_products_with_codes.txt');
fs.writeFileSync(outPath, out, 'utf8');
console.log(`✅ تم إنشاء الملف: all_products_with_codes.txt`);
console.log(`   إجمالي: ${totalCoded}/${totalAll} صنف مكوّد`);
