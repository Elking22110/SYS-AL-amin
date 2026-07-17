/**
 * clean-seed-duplicates.cjs
 * يقوم بتنظيف التكرارات تماماً من ملف products_seed.json
 * ليتطابق الملف مع قاعدة بيانات العميل السليمة والخالية من التكرارات
 */

const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, '..', 'public', 'products_seed.json');
if (!fs.existsSync(seedPath)) {
  console.error('❌ ملف products_seed.json غير موجود');
  process.exit(1);
}

const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const products = seedData.products || [];

// التكرارات المحددة التي نريد حذف النسخ الزائدة منها
// سنحتفظ بنسخة واحدة ونحذف المكررات
const idsToDelete = new Set([
  10218,  // م ٢ بوصه بن ١٦ بي ار المكررة (سنحتفظ بـ 10192)
  10089,  // بكرة تفلون جامبو المكررة (سنحتفظ بـ 10055)
  171149, // طبة كاب ١/٢ المكررة
  171150, // كوع لحام ١/٢ المكررة
  171151, // تى لحام ١/٢ المكررة
  171152, // كوع لحام مفتوح ١/٢ المكررة
  171153, // محبس دفن ١/٢ المكررة
  171154, // محبس بلاكور ١/٢ المكررة
  171157, // كوع سن ١/٢ المكررة
  171158, // تى سن ١/٢ المكررة
  171159, // جلبة سن خارجي ١/٢ المكررة
  171161, // كرنك لحام ١/٢ المكررة
  171248, // محبس زاوية استانلس المكررة
  171249, // محبس زاوية p.g المكررة
  171250, // محبس زاوية vagner المكررة
  171251, // محبس زاوية H.R نحاس المكررة
  171252, // محبس زاوية ROVA صغير المكررة
  171253, // محبس زاوية p.g plus المكررة
  171254, // محبس زاوية ROVA ثقيل المكررة
  171255, // محبس زاوية SMART صغير المكررة
  171256, // محبس زاوية SMART كبير المكررة
  171257, // محبس زاوية SMART بوش المكررة
  171258, // محبس زاوية Active اسود المكررة
  171260, // محبس زاوية استانلس MARVEL المكررة
  171261, // محبس زاوية ROVA كبير المكررة
  171412, // وصلة ٣٠ سم تجاري المكررة
  171413, // وصلة ٤٠ سم تجاري المكررة
  171414, // وصلة ٥٠ سم تجاري المكررة
]);

const cleanedProducts = products.filter(p => !idsToDelete.has(p.id));

seedData.products = cleanedProducts;
fs.writeFileSync(seedPath, JSON.stringify(seedData, null, 2), 'utf8');

console.log(`✅ تم تنظيف Seed بنجاح!`);
console.log(`🗑️  تم حذف ${products.length - cleanedProducts.length} صنف مكرر بالخطأ.`);
console.log(`📊 عدد المنتجات الجديد في الـ Seed هو: ${cleanedProducts.length}`);
