const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, '..', 'public', 'products_seed.json');
const sourcePath = path.join(__dirname, '..', 'scripts', 'company_list_source.txt');

const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const products = seedData.products || [];

// قراءة قائمة الشركة وتصنيف الباركودات
const brCodes = new Set();
const smCodes = new Set();
const ksCodes = new Set();

const sourceLines = fs.readFileSync(sourcePath, 'utf8').split('\n');
sourceLines.forEach(line => {
  const m = line.match(/\b(\d{9})\b/);
  if (!m) return;
  const code = m[1];
  
  // تحديد الماركة
  if (line.includes('BR')) {
    brCodes.add(code);
  } else if (line.includes('KS')) {
    ksCodes.add(code);
  } else if (['SM', 'SG', 'SL', 'NC', 'MX'].some(brand => line.includes(brand))) {
    smCodes.add(code);
  }
});

// حصر الأصناف المكودة في السيستم بناء على تطابق الباركودات مع كل مجموعة
let brMatched = 0;
let smMatched = 0;
let ksMatched = 0;
let otherMatched = 0;

products.forEach(p => {
  if (!p.barcode) return;
  const barcode = String(p.barcode).trim();
  
  if (brCodes.has(barcode)) {
    brMatched++;
  } else if (smCodes.has(barcode)) {
    smMatched++;
  } else if (ksCodes.has(barcode)) {
    ksMatched++;
  } else if (/^\d{9}$/.test(barcode)) {
    // كود مكون من 9 أرقام ولكنه لم ينتم للماركات الثلاث
    otherMatched++;
  }
});

console.log('==================================================');
console.log('📊 تقرير حصر منتجات الشركة المكودة بالسيستم:');
console.log('==================================================');
console.log(`🟢 منتجات بي أر (BR PPR) المكودة بالسيستم:    ${brMatched} صنف`);
console.log(`🔵 منتجات سمارت هوم (Smart PVC) المكودة بالسيستم: ${smMatched} صنف`);
console.log(`🟡 منتجات كيسيل (Kessel PP) المكودة بالسيستم:    ${ksMatched} صنف`);
console.log('--------------------------------------------------');
console.log(`📌 إجمالي منتجات الشركة المكودة حالياً بالكامل:  ${brMatched + smMatched + ksMatched} صنف`);
console.log('==================================================');
