/**
 * link-almodeer-codes.js
 * ----------------------
 * يطابق المنتجات بين السيستم الجديد وبيانات برنامج المدير القديم
 * ويحفظ كود المدير (AL.XXXX) في حقل barcode لكل منتج
 *
 * الاستخدام:
 *   node scripts/link-almodeer-codes.js
 *
 * المخرجات:
 *   - public/products_seed_with_codes.json  (نسخة محدّثة فيها الأكواد)
 *   - scripts/link-report.json              (تقرير بنتائج المطابقة)
 */

const fs = require('fs');
const path = require('path');

// ======================== قراءة الملفات ========================
const seedPath    = path.join(__dirname, '../public/products_seed.json');
const almodeerPath = path.join(__dirname, '../AlmodeerBNK/pos_import_almodeer.json');
const outPath     = path.join(__dirname, '../public/products_seed_with_codes.json');
const reportPath  = path.join(__dirname, 'link-report.json');

const seed     = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const almodeer = JSON.parse(fs.readFileSync(almodeerPath, 'utf8'));

const newProds = seed.products || [];
const oldProds = almodeer.products || [];

// ======================== دالة التوحيد ========================
// أسماء البراندات الشائعة التي تُحذف قبل المطابقة
const BRANDS = ['br', 'smart', 'rova', 'active', 'h.r', 'lavora', 'bg', 'p.g', 'howay', 'ideal', 'درويت', 'ايديال', 'كيسيل'];

function normalize(s) {
  if (!s) return '';
  return s
    .replace(/[\u064B-\u065F]/g, '')          // إزالة التشكيل
    .replace(/[أإآا]/g, 'ا')                  // توحيد الألف
    .replace(/ة/g, 'ه')                       // توحيد التاء المربوطة
    .replace(/ى/g, 'ي')                       // توحيد الياء
    .replace(/[٠-٩]/g, d => d.charCodeAt(0) - 0x0660) // أرقام عربية → إنجليزية
    .replace(/[''ً]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// إزالة أسماء البراندات من النص الموحَّد
function stripBrands(s) {
  let result = s;
  for (const b of BRANDS) {
    // إزالة البراند كلمة مستقلة (في أي مكان)
    result = result.replace(new RegExp(`(^|\\s)${b.replace('.', '\\.')}(\\s|$)`, 'gi'), ' ');
  }
  return result.replace(/\s+/g, ' ').trim();
}

// ======================== بناء فهرس المدير (عادي + بدون براند) ========================
const exactMap    = new Map(); // اسم كامل موحَّد
const noBrandMap  = new Map(); // اسم بدون براند موحَّد

for (const p of oldProds) {
  const key   = normalize(p.name);
  const noB   = stripBrands(key);
  if (!exactMap.has(key))   exactMap.set(key, p);
  if (noB.length >= 5 && !noBrandMap.has(noB)) noBrandMap.set(noB, p);
}

// ======================== المطابقة ========================
const results = {
  exact:    [],
  branded:  [],   // تطابق بعد حذف البراند
  partial:  [],
  unmatched:[],
};

const updatedProducts = newProds.map(p => {
  const nKey  = normalize(p.name);
  const nKeyNB = stripBrands(nKey);

  // ---- مساعد لتطبيق الكود وإرجاع المنتج ----
  // ملاحظة: أكواد المدير (مثل 0102001) مختلفة عن أكواد المورد في الـ PDF (مثل 351020001)
  // لذلك نحفظ كود المدير فقط في barcode، أما supplierCode فيُملأ تلقائياً من أول رفع PDF
  const applyCode = (prod, match) => {
    const updated = { ...prod };
    if (!prod.barcode && match.barcode) updated.barcode = match.barcode;
    if (!prod.sku && match.sku)         updated.sku     = match.sku;
    return updated;
  };

  // 1. مطابقة تامة
  if (exactMap.has(nKey)) {
    const match = exactMap.get(nKey);
    results.exact.push({ id: p.id, name: p.name, alCode: match.barcode, alName: match.name });
    return applyCode(p, match);
  }

  // 2. مطابقة بعد حذف البراند (تطابق اسم القطعة بدون الماركة)
  if (nKeyNB.length >= 5 && noBrandMap.has(nKeyNB)) {
    const match = noBrandMap.get(nKeyNB);
    results.branded.push({ id: p.id, name: p.name, alCode: match.barcode, alName: match.name });
    return applyCode(p, match);
  }

  // 3. مطابقة جزئية — نفحص إذا كان الاسم (بعد حذف البراند) موجود جوه أي اسم قديم أو العكس
  let bestMatch = null;
  let bestScore = 0;
  const searchKey = nKeyNB.length >= 5 ? nKeyNB : nKey;

  for (const [ak, av] of noBrandMap) {
    if (ak.length < 5 || searchKey.length < 5) continue;
    if (searchKey.includes(ak) || ak.includes(searchKey)) {
      const score = Math.min(ak.length, searchKey.length);
      if (score > bestScore) { bestScore = score; bestMatch = av; }
    }
  }

  if (bestMatch && bestScore >= 8) {
    results.partial.push({ id: p.id, name: p.name, alCode: bestMatch.barcode, alName: bestMatch.name, score: bestScore });
    return applyCode(p, bestMatch);
  }

  // 4. غير متطابق نهائياً
  results.unmatched.push({ id: p.id, name: p.name });
  return p;
});

// ======================== حفظ المخرجات ========================
const updatedSeed = { ...seed, products: updatedProducts };
fs.writeFileSync(outPath, JSON.stringify(updatedSeed, null, 2), 'utf8');
fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf8');

// ======================== ملخص ========================
console.log('='.repeat(50));
console.log('✅ مطابقة تامة         :', results.exact.length);
console.log('🏷️  مطابقة بعد حذف براند:', results.branded.length);
console.log('🔶 مطابقة جزئية       :', results.partial.length);
console.log('❌ غير متطابق          :', results.unmatched.length);
console.log('   إجمالي مع كود       :', results.exact.length + results.branded.length + results.partial.length, 'من', newProds.length);
console.log('='.repeat(50));
console.log('📄 الملف المحدَّث      :', outPath);
console.log('📊 التقرير الكامل     :', reportPath);
