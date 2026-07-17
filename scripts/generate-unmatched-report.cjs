/**
 * generate-unmatched-report.cjs
 * يولّد تقرير بالأصناف غير المكوّدة مع توضيح السبب
 */
const fs   = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, '..', 'public', 'products_seed.json');
const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const allProducts = seedData.products || [];

// أصناف بدون كود
const br    = allProducts.filter(p => p.mainCategoryId === 'Br'            && !p.barcode);
const smart = allProducts.filter(p => p.mainCategoryId === 'اسمارت ابيض'  && !p.barcode);
const ks    = allProducts.filter(p => p.mainCategoryId === 'كيسيل'         && !p.barcode);

// =====================================================
// أسباب عدم التكويد لكل صنف معروف
// =====================================================
const NO_CODE_REASON = {
  10053: 'نبل نيكل - منتج حديد/نحاس ليس في قائمة الشركة',
  10055: 'بكرة تفلون - ملحق غير مدرج في قائمة الشركة',
  10056: 'بكرة تفلون - ملحق غير مدرج في قائمة الشركة',
  10057: 'بكرة عازل تيواني - ملحق تيواني غير مدرج',
  10058: 'بكرة عازل - ملحق غير مدرج في قائمة الشركة',
  10059: 'افيز إيطالي - براغي تثبيت من مورد آخر',
  10087: 'نبل نيكل - منتج حديد/نحاس ليس في قائمة الشركة',
  10090: 'عزل سيكا ١٠٧ - منتج Sika بمورد مختلف',
  10091: 'شاسيه ايديال ستاندر - منتج Ideal Standard بمورد مختلف',
  10092: 'خزان دفن جيربت - منتج Geberit بمورد مختلف',
  10098: 'صندوق دفن جروهي - منتج Grohe بمورد مختلف',
  10114: 'اسمارت بوكس - لا يوجد كود مخصص في قائمة الشركة',
  10116: 'خلاط دوش جروهى - منتج Grohe بمورد مختلف',
  10117: 'خزان دفن جروهي - منتج Grohe بمورد مختلف',
  10147: 'بكرة تفلون إيطالي - ملحق من مورد آخر',
  10148: 'بكرة تفلون صيني - ملحق من مورد آخر',
  10149: 'افيز فيشر - براغي تثبيت من مورد آخر',
  10244: 'افيز ٣/٤ - براغي تثبيت غير مدرجة في الشركة',
  10245: 'افيز ١ بوصه - براغي تثبيت غير مدرجة',
  10246: 'افيز ١,٥ - براغي تثبيت غير مدرجة',
  10247: 'افيز ٢ - براغي تثبيت غير مدرجة',
  10248: 'افيز ٣ - براغي تثبيت غير مدرجة',
  10249: 'افيز ٤ - براغي تثبيت غير مدرجة',
  10250: 'افيز ٦ - براغي تثبيت غير مدرجة',
};

let output = '=== الأصناف المسجلة في السيستم ولم يتم تكويدها ===\n';
output += '=== (لعدم وجود كود مقابل لها في قائمة الشركة) ===\n\n';

output += `1. فئة BR (إجمالي ${br.length} صنف):\n`;
br.forEach(p => {
  const reason = NO_CODE_REASON[p.id] ? `  ← ${NO_CODE_REASON[p.id]}` : '';
  output += `   - [ID: ${p.id}] ${p.name}${reason}\n`;
});

output += `\n2. فئة سمارت أبيض (إجمالي ${smart.length} صنف):\n`;
smart.forEach(p => {
  const reason = NO_CODE_REASON[p.id] ? `  ← ${NO_CODE_REASON[p.id]}` : '';
  output += `   - [ID: ${p.id}] ${p.name}${reason}\n`;
});

output += `\n3. فئة كيسيل (إجمالي ${ks.length} صنف):\n`;
ks.forEach(p => {
  const reason = NO_CODE_REASON[p.id] ? `  ← ${NO_CODE_REASON[p.id]}` : '';
  output += `   - [ID: ${p.id}] ${p.name}${reason}\n`;
});

const outputPath = path.join(__dirname, '..', 'unmatched_system_products.txt');
fs.writeFileSync(outputPath, output, 'utf8');

console.log(`✅ تم كتابة ${br.length + smart.length + ks.length} صنف غير مكوّد`);
