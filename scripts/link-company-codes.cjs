/**
 * link-company-codes.cjs
 * يربط أكواد الشركة الفعلية بمنتجات BR, سمارت ابيض, كيسيل في ملف products_seed.json
 * يدعم ثلاث مجموعات رئيسية: BR (لحام PPR), SM/KS (صرف سمارت وكيسيل)
 */

const fs = require('fs');
const path = require('path');

// ============================================================
// 1. قراءة البيانات
// ============================================================
const seedPath   = path.join(__dirname, '..', 'public', 'products_seed.json');
const sourcePath = path.join(__dirname, 'company_list_source.txt');
const reportPath = path.join(__dirname, 'company_match_report.json');

const seedData     = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const sourceText   = fs.readFileSync(sourcePath, 'utf8');
const allProducts  = seedData.products || [];

// ============================================================
// 2. تطبيع النصوص
// ============================================================
function normalizeAr(str) {
  if (!str) return '';
  return str
    .replace(/[\uFEF5-\uFEFC]/g, 'لا') // توحيد لام-ألف ligature
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/وصل[هة]/g, 'جلبه') // وصلة → جلبه
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - '٠'.charCodeAt(0)))
    .replace(/[\u064B-\u065F]/g, '')
    // إضافة مسافات بين الحروف والأرقام وبين العربي والإنجليزي لمنع التصاق الكلمات في الـ PDF
    .replace(/([a-zA-Z\u0600-\u06FF]+)(\d+)/g, '$1 $2')
    .replace(/(\d+)([a-zA-Z\u0600-\u06FF]+)/g, '$1 $2')
    .replace(/([\u0600-\u06FF]+)([a-zA-Z]+)/g, '$1 $2')
    .replace(/([a-zA-Z]+)([\u0600-\u06FF]+)/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// خريطة البوصات → مم
const FRACTION_TO_MM = {
  '1/2': 20, '2/1': 20, '1/2"': 20,
  '3/4': 25, '4/3': 25, '3/4"': 25,
  '1/4-1': 40, '1-1/4': 40, '1.1/4': 40, '1.25': 40,
  '1/2-1': 50, '1-1/2': 50, '1.1/2': 50, '1.5': 50,
  '1': 32, '2': 63, '2.5': 75, '3': 90, '4': 110, '5': 125, '6': 160, '8': 200,
};

// خريطة البوصات بالعربي → مم (للسمارت والكيسيل الذي يستخدم بوصة في الأسماء)
const AR_INCH_TO_MM = {
  '١/٢': 20, '٣/٤': 25, '١': 32,
  '١,٢٥': 40, '١.٢٥': 40,
  '١,٥': 48,  '١.٥': 48,  // 1.5 inch في صرف سمارت = 48mm
  '٢': 60,                  // 2 inch في صرف سمارت = 60mm
  '٢,٥': 75,  '٢.٥': 75,
  '٣': 90,    '٤': 110,   '٥': 125, '٦': 160, '٨': 200,
};

// مقاسات مم صالحة للأنابيب والقطع
const VALID_MM = new Set([20, 25, 32, 40, 48, 50, 60, 63, 75, 90, 110, 125, 160, 200]);
// مقاسات الإنش المتعارف عليها → مم
const INCH_TO_MM = {
  '0.5': 20, '0.75': 25,
  '1': 32, '1.25': 40, '1.5': 50,
  '2': 63, '2.5': 75, '3': 90, '4': 110, '6': 160, '8': 200
};
// مقاسات خاصة بسمارت (48mm = 1.5", 60mm = 2")
const SMART_INCH_TO_MM = {
  '0.5': 20, '0.75': 25,
  '1': 32, '1.25': 40, '1.5': 48,
  '2': 60, '2.5': 75, '3': 90, '4': 110, '6': 160, '8': 200
};
// مقاسات خاصة بكيسيل (مطابقة للمعيار)
const KS_INCH_TO_MM = {
  '0.5': 20, '0.75': 25,
  '1': 32, '1.25': 40, '1.5': 50,
  '2': 63, '2.5': 75, '3': 90, '4': 110, '6': 160, '8': 200
};

// ============================================================
// 3. استخراج الأحجام من النص
// ============================================================
function extractSizes(text, useSmartInches = false) {
  if (!text) return [];
  
  const inchMap = useSmartInches ? SMART_INCH_TO_MM : INCH_TO_MM;
  
  // 1. استبدال الفاصلة والنقطة العربية
  let t = text.replace(/٫/g, '.').replace(/,/g, '.');
  
  // 2. تحويل الأرقام العربية/الهندية
  t = t.replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - '٠'.charCodeAt(0)));
  
  // 3. توحيد كسور البوصة
  t = t.replace(/١\s*\/\s*٢/g, '1/2')
       .replace(/٢\s*\/\s*١/g, '1/2')
       .replace(/٣\s*\/\s*٤/g, '3/4')
       .replace(/٤\s*\/\s*٣/g, '3/4');
  // (الأرقام العربية تحولت بالفعل خطوة 2)

  const sizes = [];

  // 4. إزالة أطوال المواسير (مثل 4م، 6 متر، 150 سم) لتجنب تفسيرها كأقطار
  t = t.replace(/(?<![\d\.])(\d+(?:\.\d+)?)\s*(?:م|متر|سم|cm|meter|meters)(?![\d\w\u0600-\u06FF])/g, ' ');

  // 5. استخراج الكسور الصغيرة أولاً (بوصة)
  const fracMatches = t.matchAll(/\b(\d+[\-\s\.]+\d+\/\d+|\d+\/\d+)\b/g);
  for (const match of fracMatches) {
    const rawVal = match[1].replace(/\s+/g, '').replace('-', '/').replace('.', '/');
    const parts = rawVal.split('/').map(Number);
    if (parts.every(p => p < 10)) {
      let mapped = rawVal;
      if (rawVal === '1/2' || rawVal === '2/1') mapped = '1/2';
      else if (rawVal === '3/4' || rawVal === '4/3') mapped = '3/4';
      else if (['1/1/2','1/2/1','1-1/2'].includes(rawVal)) mapped = '1-1/2';
      else if (['1/1/4','1/4/1','1-1/4'].includes(rawVal)) mapped = '1-1/4';
      
      const mm = FRACTION_TO_MM[mapped];
      if (mm !== undefined) sizes.push(mm);
    }
  }

  // إزالة الكسور الصغيرة من النص المتبقي
  let clean = t.replace(/\b([0-9]\/[0-9]|[0-9]\-[0-9]\/[0-9])\b/g, ' ');
  clean = clean.replace(/[\/\*]/g, ' '); // تحويل / و * إلى مسافات

  // 6. استخراج الأرقام المتبقية وتصنيفها
  const numMatches = clean.matchAll(/(?<![\d\.])(\d+(?:\.\d+)?)(?![\d\.])/g);
  for (const match of numMatches) {
    const val = parseFloat(match[1]);
    const str = String(val);
    
    if (VALID_MM.has(val)) {
      sizes.push(val);
    } else if (inchMap[str] !== undefined) {
      sizes.push(inchMap[str]);
    }
  }

  return [...new Set(sizes)];
}

// ============================================================
// 4. تحليل أنواع القطع
// ============================================================
const PART_TYPES = {
  // أنواع BR (PPR لحام)
  'كوع45':     ['كوع', '45'],
  'كوع90':     ['كوع', '90'],
  'كوعطويل':   ['كوع', 'طويل'],
  'كوعذكر45':  ['كوع', 'ذكر', '45'],
  'كوعذكر90':  ['كوع', 'ذكر', '90'],
  'كرنك':      ['كرنك'],
  'كرنكقصير':  ['كرنك', 'قصير'],
  'تي':        ['تى'],
  'تيمسلوب':   ['تى', 'مسلوب'],
  'تيمزدوج':   ['تى', 'مزدوج'],
  'صليبة':     ['صليبه'],
  'جلبة':      ['جلبه'],
  'جلبةمتحركة':['جلبه', 'صاموله'],
  'طبة':       ['طبه'],
  'طبةاختبار': ['طبه', 'اختبار'],
  'مسلوب':     ['مسلوب'],
  'فلانشة':    ['فلانشه'],
  'بردة':      ['برده'],
  'بطارية':    ['بطاريه'],
  'كوعسن':     ['كوع', 'بسن'],
  'تيسن':      ['تى', 'بسن'],
  'جلبةسن':    ['جلبه', 'بسن'],
  'تيمحبس':    ['تى', 'محبس'],
  'واي':       ['واي'],
  'محبسبلية':  ['محبس', 'بليه'],
  'محبسدفن':   ['محبس', 'دفن'],
  'محبسزاوية': ['محبس', 'زاويه'],
  'مانعارتداد':['مانع', 'ارتداد'],
  'لاكور':     ['لاكور'],
  'مواسير':    ['مواسير'],
  'ياردة':     ['ياردة'],

  // أنواع SM/KS (صرف PVC)
  'مشترك45':   ['مشترك', '45'],
  'مشترك90':   ['مشترك', '87'],  // 87.5 يُطابق 90
  'مشترك90b':  ['مشترك', '90'],
  'مشتركبباب': ['مشترك', 'بباب'],
  'مشتركقصير': ['مشترك', 'قصير'],
  'مشتركصليبة':['مشترك', 'صليبه'],
  'مشتركمسلوب':['مشترك', 'مسلوب'],
  'كوع45s':    ['كوع', '45'],
  'كوع90s':    ['كوع', '90'],
  'كوع87s':    ['كوع', '87'],
  'كوعبباب':   ['كوع', 'بباب'],
  'كوعقصير':   ['كوع', 'قصير'],
  'جلبةصرف':   ['جلبه', 'صرف'],
  'جلبةاصلاح': ['جلبه', 'اصلاح'],
  'طبةتسليك':  ['طبه', 'تسليك'],
  'طبةقطع':    ['طبه', 'قطع'],
  'هواية':     ['هوايه'],
  'سيفون':     ['سيفون'],
  'جاليتراب':  ['جاليتراب'],
  'مجرى':      ['مجرى'],
  'صفاية':     ['صفايه'],
};

function detectPartType(text) {
  const n = normalizeAr(text);
  const types = [];
  for (const [key, kws] of Object.entries(PART_TYPES)) {
    if (kws.map(normalizeAr).every(kw => n.includes(kw))) {
      types.push(key);
    }
  }
  return types;
}

// ============================================================
// 5. تحليل قائمة الشركة
// ============================================================
function parseCompanyLine(line) {
  line = line.trim();
  if (!line || /^(Code|Brand|#)/.test(line)) return null;
  
  const codeM = line.match(/\b(\d{9})\b/);
  if (!codeM) return null;
  const code = codeM[1];
  
  let cleanLine = line.replace(/\b\d{9}\b/, '').trim();
  
  const BRANDS = ['BR','KS','SM','SG','SL','NC','MX','BU','FT','MP'];
  let brand = null;
  let lp = null;
  
  for (const b of BRANDS) {
    const r1 = new RegExp('\\b' + b + '\\s+(\\d+(?:\\.\\d+)?)\\b', 'i');
    const r2 = new RegExp('\\b(\\d+(?:\\.\\d+)?)\\s+' + b + '\\b', 'i');
    
    let m = cleanLine.match(r1);
    if (m) { brand = b; lp = parseFloat(m[1]); cleanLine = cleanLine.replace(r1,'').trim(); break; }
    m = cleanLine.match(r2);
    if (m) { brand = b; lp = parseFloat(m[1]); cleanLine = cleanLine.replace(r2,'').trim(); break; }
  }
  
  if (!brand) {
    const bm = cleanLine.match(/\b(BR|KS|SM|SG|SL|NC|MX|BU|FT|MP)\b/);
    if (!bm) return null;
    brand = bm[1];
    cleanLine = cleanLine.replace(/\b(BR|KS|SM|SG|SL|NC|MX|BU|FT|MP)\b/,'').trim();
  }
  
  const name = cleanLine.replace(/[*]+/g,'').trim().replace(/\s+/g,' ');
  return { code, name, brand, lp };
}

const companyList = [];
for (const line of sourceText.split('\n')) {
  const parsed = parseCompanyLine(line);
  if (parsed) companyList.push(parsed);
}
console.log(`Parsed ${companyList.length} company products.`);

// ============================================================
// 6. تصنيف منتجات السيستم
// ============================================================
const brProducts    = allProducts.filter(p => p.mainCategoryId === 'Br');
const smartProducts = allProducts.filter(p => p.mainCategoryId === 'اسمارت ابيض');
const ksProducts    = allProducts.filter(p => p.mainCategoryId === 'كيسيل');
console.log(`Found: BR=${brProducts.length}, Smart=${smartProducts.length}, Kessel=${ksProducts.length}`);

// ============================================================
// 7. دوال مساعدة
// ============================================================
const isBlack    = t => normalizeAr(t).match(/اسود|uv/);
const isShort    = t => normalizeAr(t).includes('قصير');
const isBuried   = t => normalizeAr(t).match(/مدفون|دفن/);
const isMale     = t => normalizeAr(t).match(/ذكر|خارجي|خارجي/);
const isFemale   = t => normalizeAr(t).match(/انثي|داخلي/);
const hasSocket  = t => normalizeAr(t).match(/سوكت|بسوكت/);
const hasInspect = t => normalizeAr(t).match(/كشف|مفتوح|باب/);

function similarity(a, b) {
  const wa = new Set(normalizeAr(a).split(' ').filter(Boolean));
  const wb = new Set(normalizeAr(b).split(' ').filter(Boolean));
  let common = 0;
  for (const w of wa) if (wb.has(w)) common++;
  return common / Math.max(wa.size, wb.size, 1);
}

// ============================================================
// 8. مطابقة منتجات BR
// ============================================================
const brFittings = companyList.filter(c => c.brand === 'BR' && /^3[5-9]\d{7}$/.test(c.code));

function matchBR(product) {
  const pName   = product.name || '';
  const pTypes  = detectPartType(pName);
  const pSizes  = extractSizes(pName, false);
  const pBlack  = isBlack(pName);
  const pShort  = isShort(pName);
  const pMale   = isMale(pName);
  const pFemale = isFemale(pName);
  
  let best = null, bestScore = 0;
  
  for (const comp of brFittings) {
    const cTypes  = detectPartType(comp.name);
    const cSizes  = extractSizes(comp.name, false);
    const cBlack  = isBlack(comp.name);
    const cShort  = isShort(comp.name);
    const cMale   = isMale(comp.name);
    const cFemale = isFemale(comp.name);
    
    // فلترة صارمة: اللون
    if (!!pBlack !== !!cBlack) continue;
    
    // فلترة صارمة: الأحجام (يجب تطابق العدد والقيم)
    if (pSizes.length !== cSizes.length) continue;
    const sizeOk = pSizes.every(ps => cSizes.some(cs => Math.abs(cs - ps) <= 2));
    if (!sizeOk) continue;
    
    let score = 0;
    const typeOverlap = pTypes.filter(t => cTypes.includes(t)).length;
    score += typeOverlap * 4;
    if (!!pShort === !!cShort)  score += 1;
    if (!!pMale  === !!cMale)   score += 1;
    if (!!pFemale === !!cFemale) score += 1;
    score += similarity(pName, comp.name) * 2;
    
    if (score > bestScore) { bestScore = score; best = comp; }
  }
  
  return bestScore >= 4 ? best : null;
}

// ============================================================
// 9. مطابقة منتجات سمارت (SM)
// ============================================================
// سمارت يستخدم 48mm (≈ 1.5 بوصة), 60mm (≈ 2 بوصة) وليس 50 و 63
const smFittings = companyList.filter(c => ['SM','SG','SL','NC','MX'].includes(c.brand));

// خريطة تحويل من بوصة السيستم → مم سمارت
function smartInchToMM(text) {
  const n = text.replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - '٠'.charCodeAt(0)))
                .replace(/,/g, '.').replace(/٫/g, '.');
  // يارده / يارده ١.٥ / ١ بوصه / إلخ
  // نستخدم خريطة خاصة بسمارت
  const MAP = {
    '1.5': 48, '1,5': 48,
    '2': 60,
    '3': 90, '4': 110, '6': 160,
    '1': 32, '0.75': 25, '0.5': 20,
  };
  
  // استخراج المقاسات بالبوصة من النص
  const sizes = [];
  for (const [inch, mm] of Object.entries(MAP)) {
    // نبحث عن الرقم متبوعاً بـ "بوصه" أو في بداية اسم الصنف
    const pat = new RegExp('(?<![\\d\\.])' + inch.replace('.', '\\.') + '(?![\\d\\.])', 'g');
    if (pat.test(n)) sizes.push(mm);
  }
  return [...new Set(sizes)];
}

function matchSmart(product) {
  const pName  = product.name || '';
  const subCat = product.subCategoryId || '';
  const pTypes = detectPartType(pName);
  const pBuried= isBuried(pName);
  const pInspect = hasInspect(pName);
  
  // الأحجام - سمارت يستخدم بوصة بالعربي في اسم المنتج
  // نحاول أولاً استخراج من اسم المنتج ثم من التصنيف الفرعي
  let pSizes = extractSizes(pName, true);
  if (pSizes.length === 0) {
    pSizes = extractSizes(subCat, true);
  }
  
  let best = null, bestScore = 0;
  
  for (const comp of smFittings) {
    const cTypes   = detectPartType(comp.name);
    const cSizes   = extractSizes(comp.name, false); // قائمة الشركة بالمم الفعلي
    const cBuried  = isBuried(comp.name);
    const cInspect = hasInspect(comp.name);
    
    // تطابق الأحجام (سمارت: 1.5"→48mm, 2"→60mm)
    if (pSizes.length !== cSizes.length) continue;
    const sizeOk = pSizes.every(ps => cSizes.some(cs => Math.abs(cs - ps) <= 2));
    if (!sizeOk) continue;
    
    // تطابق الأنواع
    const typeOverlap = pTypes.filter(t => cTypes.includes(t)).length;
    if (typeOverlap === 0 && pTypes.length > 0) continue;
    
    let score = typeOverlap * 4;
    if (!!pBuried === !!cBuried) score += 1;
    if (!!pInspect === !!cInspect) score += 1;
    score += similarity(pName, comp.name) * 2;
    
    if (score > bestScore && score >= 4) { bestScore = score; best = comp; }
  }
  
  return best;
}

// ============================================================
// 10. مطابقة منتجات كيسيل (KS)
// ============================================================
// كيسيل يستخدم مم مباشرة في الأسماء وأحياناً بوصة (4 بوصة = 110mm)
const ksFittings = companyList.filter(c => c.brand === 'KS');

// خريطة البوصة → مم للكيسيل
function kesselSizeFromName(pName, subCat) {
  // أولاً: ابحث عن مم في الاسم
  let sizes = extractSizes(pName, false);
  if (sizes.length > 0) return sizes;
  
  // ثانياً: ابحث في التصنيف الفرعي
  sizes = extractSizes(subCat, false);
  if (sizes.length > 0) return sizes;
  
  // ثالثاً: بوصة عربي مباشرة في الاسم
  const pn = normalizeAr(pName);
  const boucheMap = [
    { kw: '1 بوصه', mm: 32 }, { kw: '1 بوصة', mm: 32 },
    { kw: '2 بوصه', mm: 63 }, { kw: '2 بوصة', mm: 63 },
    { kw: '3 بوصه', mm: 90 }, { kw: '3 بوصة', mm: 90 },
    { kw: '4 بوصه', mm: 110 }, { kw: '4 بوصة', mm: 110 },
    { kw: '6 بوصه', mm: 160 }, { kw: '6 بوصة', mm: 160 },
    { kw: '8 بوصه', mm: 200 }, { kw: '8 بوصة', mm: 200 },
    { kw: '1 بوصه', mm: 32 },
  ];
  for (const { kw, mm } of boucheMap) {
    if (pn.includes(normalizeAr(kw))) return [mm];
  }
  
  return [];
}

function matchKessel(product) {
  const pName  = product.name || '';
  const subCat = product.subCategoryId || '';
  const pTypes = detectPartType(pName);
  const pBuried= isBuried(pName);
  const pInspect = hasInspect(pName);
  
  const pSizes = kesselSizeFromName(pName, subCat);
  
  let best = null, bestScore = 0;
  
  for (const comp of ksFittings) {
    const cTypes   = detectPartType(comp.name);
    const cSizes   = extractSizes(comp.name, false);
    const cBuried  = isBuried(comp.name);
    const cInspect = hasInspect(comp.name);
    
    // تطابق الأحجام
    if (pSizes.length !== cSizes.length) continue;
    const sizeOk = pSizes.every(ps => cSizes.some(cs => Math.abs(cs - ps) <= 2));
    if (!sizeOk) continue;
    
    // تطابق الأنواع
    const typeOverlap = pTypes.filter(t => cTypes.includes(t)).length;
    if (typeOverlap === 0 && pTypes.length > 0) continue;
    
    let score = typeOverlap * 4;
    if (!!pBuried === !!cBuried) score += 2;
    if (!!pInspect === !!cInspect) score += 1;
    score += similarity(pName, comp.name) * 2;
    
    if (score > bestScore && score >= 4) { bestScore = score; best = comp; }
  }
  
  return best;
}

// ============================================================
// 11. تشغيل المطابقة
// ============================================================
const report = [];
let matched = 0, cleared = 0;

function applyCode(product, compMatch) {
  if (compMatch) {
    product.barcode = compMatch.code;
    product.sku     = compMatch.code;
    product.supplierCode = compMatch.code;
    report.push({
      productId:   product.id,
      productName: product.name,
      companyCode: compMatch.code,
      companyName: compMatch.name,
      brand:       compMatch.brand,
    });
    matched++;
  } else {
    product.barcode = undefined;
    product.sku     = undefined;
    product.supplierCode = undefined;
    cleared++;
  }
}

for (const p of brProducts)    applyCode(p, matchBR(p));
for (const p of smartProducts) applyCode(p, matchSmart(p));
for (const p of ksProducts)    applyCode(p, matchKessel(p));

// ============================================================
// 12. حفظ النتائج
// ============================================================
const cleanedProducts = allProducts.map(p => {
  const c = { ...p };
  if (c.barcode === undefined) delete c.barcode;
  if (c.sku     === undefined) delete c.sku;
  if (c.supplierCode === undefined) delete c.supplierCode;
  return c;
});

seedData.products = cleanedProducts;
fs.writeFileSync(seedPath, JSON.stringify(seedData, null, 2), 'utf8');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

console.log('==================================================');
console.log(`✅ BR     : ${brProducts.filter(p => p.barcode).length} / ${brProducts.length}`);
console.log(`✅ سمارت  : ${smartProducts.filter(p => p.barcode).length} / ${smartProducts.length}`);
console.log(`✅ كيسيل  : ${ksProducts.filter(p => p.barcode).length} / ${ksProducts.length}`);
console.log(`📊 المجموع: ${matched}`);
console.log(`🗑️  مُسح  : ${cleared}`);
console.log('==================================================');
