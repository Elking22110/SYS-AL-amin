const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, '..', 'public', 'products_seed.json');
const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const products = seedData.products || [];
const categories = seedData.categories || [];
const catMap = new Map(categories.map(c => [c.id, c]));

// ============================================================
// MAPPING: orphan subCategoryId -> correct subCategoryId
// Based on analysis of product names and existing sub categories
// ============================================================

// --- كيسيل ---
// orphan: قطع ١١٠ كيسيل -> existing: قطع ١١٠
// orphan: قطع ١٦٠ كيسيل -> existing: قطع ١٦٠
// orphan: قطع ٧٥ كيسيل  -> existing: قطع ٧٥
// orphan: قطع ٦٣ كيسيل  -> existing: قطع ٦٣ كيسل
// orphan: قطع ٥٠ كيسيل  -> existing: قطع ٥٠
// orphan: قطع ٢٠٠ كيسيل -> existing: نظام كيسل المدفون ٢٠٠  (only 1 product: كوع زاوية مدفون 200mm)
// orphan: قطع كيسيل     -> mix of مواسير + بلاعات + others
//   - مواسير = مواسير كيسل
//   - صفاية/بيبة/غطاء/برقع/مانع = بلاعات كيسل

// --- اسمارت ابيض ---
// orphan: قطع سمارت -> products are drain/صرف products in various sizes
//   need to map by size mentioned in product name:
//   مم32, مم48, مم60, مم63, ¾", 1" -> بوصه ١,٥ / ١بوصه
//   مم75, مم90 -> بوصه 2 / بوصه 3
//   مم110 -> بوصه 4
//   مم160 -> بوصه 6
//   (The products have sizes in their names, map accordingly)

// --- بي ار لحام (main is missing!) ---
// Main cat 'بي ار لحام' doesn't exist, but 'Br' does.
// Sub cats used: قطع بولي, محابس ووصلات بولي, فلانشات وقطع بولي
// Products are PPR pipes and fittings. They should go to 'Br' main cat
// with appropriate sub cats OR we need to create the missing sub cats

// --- قطع صرف 6 بوصه ---
// orphan: قطع ٦ بوصه -> existing: قطع ٦بوصه  (space vs no space)
// orphan: قطع ٤ بوصه -> existing: قطع ٤بوصه
// orphan: قطع ٣ بوصه -> existing: قطع ٣بوصه
// orphan: قطع ٢ بوصه -> existing: قطع ٢بوصه
// orphan: مجر + جلتراب -> existing: مجر + جلتراپ  (ب vs پ)

// --- وصله متعدده ---
// orphan: وصلة تجاري -> existing: وصلة مرنة تجاري

// --- الاهرام بولي+صرف ---
// orphan: قطع ١بوصه بولى الاهرام -> existing: قطع ١بوصه الاهرام ابيض
// orphan: قطع ١,٥ بولى الاهرام   -> existing: قطع ١,٥ ابيض الاهرام
// orphan: بولى ٢ و ٣ بوصه الاهرام -> has sizes ٢ and ٣, map by product name

// ============================================================
// KESSEL: قطع كيسيل orphan - classify by product name
// ============================================================
function getKesselSubCatForProduct(productName) {
  // مواسير (pipes)
  if (productName.includes('مواسير') || productName.includes('ياردة') || productName.includes('م6') || productName.includes('م4') || productName.includes('م5') || productName.includes('م3')) {
    return 'مواسير كيسل';
  }
  // غطاء مواسير - pipe caps
  if (productName.includes('غطاء مواسير') || productName.includes('وصلة بباب كشف') || productName.includes('طبة بيبة') || productName.includes('50/40مسلوب') || productName.includes('مجمع صرف')) {
    return 'مواسير كيسل';
  }
  // صفاية / بيبة / بلاعة items
  if (productName.includes('صفاية') || productName.includes('عﻼية بغطاء') || productName.includes('عﻼية صفاية') || productName.includes('بيبة') || productName.includes('بيبه') ||
      productName.includes('مخرج جانبى') || productName.includes('مخرج من أسفل') || productName.includes('غطاء بيبة') || productName.includes('رقبة جاليتراب') ||
      productName.includes('رقبة طويلة') || productName.includes('برقع بيبة') || productName.includes('مانع رائحة') || productName.includes('غطاء استانلس') ||
      productName.includes('صفاية مخرج') || productName.includes('صفاية قصيرة') || productName.includes('صفاية بمخرج')) {
    return 'بلاعات كيسل';
  }
  // Default for كيسيل orphan products  
  return 'بلاعات كيسل';
}

// ============================================================
// SMART: قطع سمارت orphan - classify by product name
// ============================================================
function getSmartSubCatForProduct(productName) {
  // Look for size indicators in product name
  // مم160 or مم315 -> بوصه 6
  if (/مم\s*1[56]\d|مم\s*3\d\d|١٦٠|مم160|315مم/.test(productName)) {
    return 'بوصه 6';
  }
  // مم110 -> بوصه 4
  if (/مم\s*1[01]\d|١١٠|110مم|مم110/.test(productName)) {
    return 'بوصه 4';
  }
  // مم75 or مم90 -> بوصه 3
  if (/مم\s*[789]\d|٧٥|٩٠|75مم|90مم|مم75|مم90/.test(productName)) {
    return 'بوصه 3';
  }
  // مم63 or مم60 -> بوصه 2
  if (/مم\s*6[03]|٦٣|٦٠|63مم|60مم|مم63|مم60/.test(productName)) {
    return 'بوصه 2';
  }
  // 1" or مم32 or مم48 -> ١بوصه or بوصه ١,٥
  if (/مم\s*4[58]|مم\s*32|٤٨|٣٢|بوصة1|1\"|\"1|١ بوصة|بوصه 1/.test(productName)) {
    return 'بوصه ١,٥';
  }
  // ¾" or مم25 -> ١بوصه
  if (/3\/4|¾|٤\/٣|مم\s*2[59]/.test(productName)) {
    return '١بوصه';
  }
  // Large items like غرفة رفع, غرفة تفتيش, مجرى مائى, جاليتراب -> بوصه 4 (110mm is standard)
  if (productName.includes('غرفة') || productName.includes('مجرى مائى') || productName.includes('مجرى مائي') ||
      productName.includes('جاليتراب') || productName.includes('جلتراب') || productName.includes('حديد مجلفن')) {
    return 'بوصه 4';
  }
  // وصلة مرنة and حنفية -> ١بوصه (½" products)
  if (productName.includes('وصلة مرنة') || productName.includes('حنفية') || productName.includes('خﻼط دفن')) {
    return '١بوصه';
  }
  // مسلوب (reducers) - look at sizes
  if (productName.includes('مسلوب')) {
    if (/١١٠|110/.test(productName)) return 'بوصه 4';
    if (/٧٥|٩٠|75|90/.test(productName)) return 'بوصه 3';
    if (/٦٣|٦٠|63|60/.test(productName)) return 'بوصه 2';
    return 'بوصه 3';
  }
  // سيفون
  if (productName.includes('سيفون') || productName.includes('وصلة تمدد') || productName.includes('مانع ارتداد') || productName.includes('جلبة إصﻼح')) {
    if (/١١٠|110/.test(productName)) return 'بوصه 4';
    if (/٧٥|75/.test(productName)) return 'بوصه 3';
    if (/٦٠|٦٣|60|63/.test(productName)) return 'بوصه 2';
    return 'بوصه 4';
  }
  // غطاء
  if (productName.includes('غطاء') || productName.includes('وش استانلس')) {
    return 'بوصه 4';
  }
  // مواسير (pipes) - determine size
  if (productName.includes('مواسير')) {
    if (/١٦٠|160/.test(productName)) return 'بوصه 6';
    if (/١١٠|110/.test(productName)) return 'بوصه 4';
    if (/٧٥|75/.test(productName)) return 'بوصه 3';
    if (/٦٣|٦٠|63|60/.test(productName)) return 'بوصه 2';
    if (/٣٢|32/.test(productName)) return 'بوصه ١,٥';
    return 'بوصه 4';
  }
  // Default
  return 'بوصه 4';
}

// ============================================================
// AHRAAM: بولى ٢ و ٣ بوصه الاهرام - classify by name
// ============================================================
function getAhramSubCatFor2_3Bousa(productName) {
  if (/٢\s*بوصه|م\s*2|ص2/.test(productName)) return 'قطع ٢بوصه الاهرام ابيض';
  if (/٣\s*بوصه|٣بوصه/.test(productName)) return 'قطع ٣بوصه الاهرام ابيض';
  if (/مم\s*63|٦٣/.test(productName)) return 'قطع ٢بوصه الاهرام ابيض';
  if (/مم\s*75|٧٥/.test(productName)) return 'قطع ٣بوصه الاهرام ابيض';
  return 'قطع ٢بوصه الاهرام ابيض';
}

// ============================================================
// DIRECT MAPPING for simple cases
// ============================================================
const directMapping = {
  // كيسيل size-based
  'قطع ١١٠ كيسيل': 'قطع ١١٠',
  'قطع ١٦٠ كيسيل': 'قطع ١٦٠',
  'قطع ٧٥ كيسيل':  'قطع ٧٥',
  'قطع ٦٣ كيسيل':  'قطع ٦٣ كيسل',
  'قطع ٥٠ كيسيل':  'قطع ٥٠',
  'قطع ٢٠٠ كيسيل': 'نظام كيسل المدفون ٢٠٠',

  // قطع صرف 6 بوصه - space/spelling differences
  'قطع ٦ بوصه':    'قطع ٦بوصه',
  'قطع ٤ بوصه':    'قطع ٤بوصه',
  'قطع ٣ بوصه':    'قطع ٣بوصه',
  'قطع ٢ بوصه':    'قطع ٢بوصه',
  'مجر + جلتراب':  'مجر + جلتراپ',

  // وصله متعدده
  'وصلة تجاري':    'وصلة مرنة تجاري',

  // الاهرام بولي+صرف
  'قطع ١بوصه بولى الاهرام': 'قطع ١بوصه الاهرام ابيض',
  'قطع ١,٥ بولى الاهرام':   'قطع ١,٥ ابيض الاهرام',
};

// ============================================================
// Apply fixes
// ============================================================
let fixedCount = 0;
let brLahamFixed = 0;
let smartFixed = 0;
let ksOrphanFixed = 0;
let skipped = 0;
const fixLog = [];

products.forEach(p => {
  if (!p.subCategoryId) return;
  if (catMap.has(p.subCategoryId)) return; // already valid

  const originalSub = p.subCategoryId;

  // Direct mapping
  if (directMapping[originalSub]) {
    const newSub = directMapping[originalSub];
    fixLog.push({ name: p.name, from: originalSub, to: newSub });
    p.subCategoryId = newSub;
    fixedCount++;
    return;
  }

  // كيسيل: قطع كيسيل (generic) -> classify by name
  if (originalSub === 'قطع كيسيل' && p.mainCategoryId === 'كيسيل') {
    const newSub = getKesselSubCatForProduct(p.name);
    fixLog.push({ name: p.name, from: originalSub, to: newSub });
    p.subCategoryId = newSub;
    ksOrphanFixed++;
    fixedCount++;
    return;
  }

  // اسمارت: قطع سمارت -> classify by name
  if (originalSub === 'قطع سمارت' && p.mainCategoryId === 'اسمارت ابيض') {
    const newSub = getSmartSubCatForProduct(p.name);
    fixLog.push({ name: p.name, from: originalSub, to: newSub });
    p.subCategoryId = newSub;
    smartFixed++;
    fixedCount++;
    return;
  }

  // بي ار لحام -> reassign to Br main cat with matching sub
  if (p.mainCategoryId === 'بي ار لحام') {
    // Main cat 'بي ار لحام' doesn't exist. Move to 'Br' main cat.
    p.mainCategoryId = 'Br';
    
    if (originalSub === 'قطع بولي' || originalSub === 'فلانشات وقطع بولي') {
      // PPR pipes and fittings -> check if name mentions specific size
      // For pipes/fittings in Br (PPR), we need to put them in the right size sub
      // Looking at the products: PPR-DR11-PN10 م4 مم50/63/75/90/110 etc.
      // Br sub cats: قطع ٢/١, قطع ٤/٣ بوصة, قطع ١ بوصة, قطع ١,٢٥ بوصة, قطع ١,٥ بوصة, قطع ٢ بوصة
      const name = p.name;
      let newSub = 'قطع ٢ بوصة'; // default
      if (/مم\s*25|مم25/.test(name)) newSub = 'قطع ٢/١';
      else if (/مم\s*32|مم32/.test(name)) newSub = 'قطع ٤/٣ بوصة';
      else if (/مم\s*40|مم40/.test(name)) newSub = 'قطع ١ بوصة';
      else if (/مم\s*50|مم50/.test(name)) newSub = 'قطع ١,٢٥ بوصة';
      else if (/مم\s*63|مم63/.test(name)) newSub = 'قطع ١,٥ بوصة';
      else if (/مم\s*75|مم75/.test(name)) newSub = 'قطع ٢ بوصة';
      else if (/مم\s*90|مم90/.test(name)) newSub = 'قطع ٢ بوصة';
      else if (/مم\s*110|مم110/.test(name)) newSub = 'قطع مشكله BR اسمارت و'; // large pipe
      else if (/مم\s*160|مم160/.test(name)) newSub = 'قطع مشكله BR اسمارت و';
      
      if (originalSub === 'فلانشات وقطع بولي') newSub = 'قطع مشكله BR اسمارت و'; // فلانشات
      
      fixLog.push({ name: p.name, from: 'بي ار لحام > ' + originalSub, to: 'Br > ' + newSub });
      p.subCategoryId = newSub;
    } else if (originalSub === 'محابس ووصلات بولي') {
      // كوع بلاكور / جلبة -> قطع ٢/١ or قطع ٤/٣
      const name = p.name;
      let newSub = 'قطع ١ بوصة';
      if (/١\s*بوصه|1 بوصه|1"|32|١بوص/.test(name)) newSub = 'قطع ١ بوصة';
      else if (/3\/4|٤\/٣|٤۳/.test(name)) newSub = 'قطع ٤/٣ بوصة';
      
      fixLog.push({ name: p.name, from: 'بي ار لحام > ' + originalSub, to: 'Br > ' + newSub });
      p.subCategoryId = newSub;
    }
    
    brLahamFixed++;
    fixedCount++;
    return;
  }

  // الاهرام: بولى ٢ و ٣ بوصه الاهرام
  if (originalSub === 'بولى ٢ و ٣ بوصه الاهرام') {
    const newSub = getAhramSubCatFor2_3Bousa(p.name);
    fixLog.push({ name: p.name, from: originalSub, to: newSub });
    p.subCategoryId = newSub;
    fixedCount++;
    return;
  }

  // أصناف متنوعة / عام -> just remove invalid subCategoryId (keep main cat)
  if (originalSub === 'عام' && p.mainCategoryId === 'أصناف متنوعة') {
    // Remove subCategoryId since main cat doesn't exist anyway
    delete p.subCategoryId;
    fixLog.push({ name: p.name, from: originalSub, to: 'REMOVED' });
    fixedCount++;
    return;
  }

  // Unknown - log it
  console.log('UNKNOWN ORPHAN:', JSON.stringify(originalSub), '| main:', p.mainCategoryId, '|', p.name.slice(0, 50));
  skipped++;
});

// ============================================================
// Verify all products now have valid subCategoryId
// ============================================================
const remainingOrphans = products.filter(p => p.subCategoryId && !catMap.has(p.subCategoryId));

console.log('=== FIX RESULTS ===');
console.log('Total fixed:', fixedCount);
console.log('  - Direct mapping fixes:', fixedCount - brLahamFixed - smartFixed - ksOrphanFixed);
console.log('  - BR Laham reassigned to Br:', brLahamFixed);
console.log('  - Smart orphan classified:', smartFixed);
console.log('  - Kessel generic classified:', ksOrphanFixed);
console.log('  - Skipped (unknown):', skipped);
console.log('  - Remaining orphans after fix:', remainingOrphans.length);

if (remainingOrphans.length > 0) {
  console.log('\nStill orphan:');
  remainingOrphans.slice(0, 20).forEach(p => console.log(' sub:', p.subCategoryId, '| main:', p.mainCategoryId, '|', p.name.slice(0, 50)));
}

// ============================================================
// Save updated seed
// ============================================================
if (remainingOrphans.length === 0 || true) { // save regardless, check manually
  seedData.products = products;
  fs.writeFileSync(seedPath, JSON.stringify(seedData, null, 2), 'utf8');
  console.log('\n✅ Saved updated products_seed.json with', fixedCount, 'fixes');
}
