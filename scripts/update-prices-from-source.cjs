/**
 * update-prices-from-source.cjs
 * يقوم بتحديث أسعار المنتجات في السيستم (products_seed.json) 
 * بناءً على الأسعار الرسمية المقابلة لأكوادها في قائمة الشركة (company_list_source.txt)
 * كما يقوم بإنشاء تقرير مفصل بجميع التغييرات التي تمت.
 */

const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, '..', 'public', 'products_seed.json');
const sourcePath = path.join(__dirname, 'company_list_source.txt');
const reportPath = path.join(__dirname, '..', 'price_update_report.txt');

// 1. قراءة البيانات
if (!fs.existsSync(seedPath)) {
  console.error(`❌ لم يتم العثور على ملف seed في المسار: ${seedPath}`);
  process.exit(1);
}
if (!fs.existsSync(sourcePath)) {
  console.error(`❌ لم يتم العثور على قائمة الشركة في المسار: ${sourcePath}`);
  process.exit(1);
}

const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const sourceText = fs.readFileSync(sourcePath, 'utf8');
const products = seedData.products || [];

// 2. تحليل قائمة الشركة وبناء خريطة الكود -> السعر
const companyPriceMap = {};
const companyNameMap = {};

sourceText.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || /^(Code|Brand|#)/.test(trimmed)) return;

  // استخراج الكود المكون من 9 أرقام
  const codeMatch = trimmed.match(/\b(\d{9})\b/);
  if (!codeMatch) return;
  const code = codeMatch[1];

  // استخراج السعر المكتوب في نهاية السطر
  // نقوم بالبحث عن آخر رقم عشري أو صحيح في السطر
  const tokens = trimmed.split(/\s+/);
  let price = null;
  
  // نمرر من النهاية للبحث عن السعر
  for (let i = tokens.length - 1; i >= 0; i--) {
    const val = parseFloat(tokens[i]);
    if (!isNaN(val) && tokens[i].includes('.') || (val > 0 && i === tokens.length - 1)) {
      price = val;
      break;
    }
  }

  if (price !== null) {
    companyPriceMap[code] = price;
    
    // استخراج الاسم (كل ما بين الكود والسعر)
    let cleanName = trimmed.replace(code, '').replace(String(price), '').trim();
    // إزالة رموز الماركات المكررة في النهاية
    cleanName = cleanName.replace(/\b(BR|KS|SM|SG|SL|NC|MX|BU|FT|MP)\b/g, '').replace(/[*]+/g, '').trim();
    companyNameMap[code] = cleanName;
  }
});

console.log(`ℹ️ تم قراءة ${Object.keys(companyPriceMap).length} سعر من ملف قائمة الشركة.\n`);

// 3. تحديث الأسعار في seedData وتسجيل التغييرات
let updatedCount = 0;
let unchangedCount = 0;
const changes = [];

products.forEach(p => {
  if (!p.barcode) return;
  
  const code = p.barcode;
  const newPrice = companyPriceMap[code];
  
  if (newPrice !== undefined) {
    const oldPrice = p.price || 0;
    
    if (oldPrice !== newPrice) {
      p.price = newPrice;
      changes.push({
        id: p.id,
        name: p.name,
        code: code,
        companyName: companyNameMap[code] || '',
        oldPrice: oldPrice,
        newPrice: newPrice,
        category: p.mainCategoryId
      });
      updatedCount++;
    } else {
      unchangedCount++;
    }
  }
});

// 4. كتابة البيانات المحدثة إلى seed
fs.writeFileSync(seedPath, JSON.stringify(seedData, null, 2), 'utf8');
console.log(`✅ تم تحديث أسعار ${updatedCount} صنف في ملف products_seed.json`);
console.log(`ℹ️ تم الإبقاء على أسعار ${unchangedCount} صنف دون تغيير لتطابقها بالفعل.`);

// 5. إنشاء التقرير النصي
let reportContent = '';
reportContent += '='.repeat(80) + '\n';
reportContent += '               تقرير تحديث وتغيير أسعار المنتجات في السيستم\n';
reportContent += `               تاريخ التحديث: ${new Date().toLocaleString('ar-EG')}\n`;
reportContent += '='.repeat(80) + '\n\n';

reportContent += `إجمالي الأصناف المحدثة أسعارها: ${updatedCount}\n`;
reportContent += `إجمالي الأصناف المتطابقة سعرياً: ${unchangedCount}\n\n`;

const categories = {
  'Br': 'فئة BR - مواسير وقطع PPR لحام',
  'اسمارت ابيض': 'فئة سمارت أبيض - صرف SM',
  'كيسيل': 'فئة كيسيل - صرف KS'
};

Object.entries(categories).forEach(([catId, catLabel]) => {
  const catChanges = changes.filter(c => c.category === catId);
  
  reportContent += '='.repeat(80) + '\n';
  reportContent += `  ${catLabel} (عدد الأصناف المحدثة: ${catChanges.length})\n`;
  reportContent += '='.repeat(80) + '\n\n';
  
  if (catChanges.length > 0) {
    reportContent += '  ' + 'ID'.padEnd(8) + 'كود الشركة'.padEnd(14) + 'السعر القديم'.padEnd(14) + 'السعر الجديد'.padEnd(14) + 'اسم المنتج في السيستم\n';
    reportContent += '  ' + '-'.repeat(76) + '\n';
    
    catChanges.forEach(c => {
      const id = String(c.id).padEnd(8);
      const code = String(c.code).padEnd(14);
      const oldP = `${c.oldPrice} ج.م`.padEnd(14);
      const newP = `${c.newPrice} ج.م`.padEnd(14);
      reportContent += `  ${id}${code}${oldP}${newP}${c.name}\n`;
    });
  } else {
    reportContent += '  لا توجد تغييرات سعرية في هذه الفئة.\n';
  }
  reportContent += '\n';
});

fs.writeFileSync(reportPath, reportContent, 'utf8');
console.log(`📝 تم حفظ تقرير التحديث في: ${reportPath}`);
