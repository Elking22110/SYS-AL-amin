/**
 * scratch/audit_kessel_products.cjs
 * Performs a complete product-by-product audit of the Kessel category against company_list_source.txt.
 */

const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, '..', 'public', 'products_seed.json');
const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const products = seedData.products || [];

const companySourcePath = path.join(__dirname, '..', 'scripts', 'company_list_source.txt');
const sourceLines = fs.readFileSync(companySourcePath, 'utf8').split('\n').map(l => l.trim()).filter(Boolean);

// Parse catalog map code -> { name, brand, price }
const catalogMap = new Map();
sourceLines.forEach(line => {
  const match = line.match(/^(\d{7,10})\s+(.+)$/);
  if (match) {
    const code = match[1];
    let rest = match[2].trim();
    const brandPriceMatch = rest.match(/\s+([A-Z]{2})\s+([\d\.]+)\s*$/);
    if (brandPriceMatch) {
      const brand = brandPriceMatch[1];
      const price = parseFloat(brandPriceMatch[2]);
      const name = rest.replace(/\s+[A-Z]{2}\s+[\d\.]+\s*$/, '').trim();
      catalogMap.set(code, { name, brand, price });
    }
  }
});

const SUB_CATS = [
  'مواسير كيسل',
  'نظام كيسيل المدفون ١١٠',
  'نظام كيسيل المدفون ١٦٠',
  'نظام كيسل المدفون ٢٠٠',
  'قطع ٦٣ كيسل',
  'قطع ٤٠ كيسل',
  'قطع ٥٠',
  'قطع ٧٥',
  'قطع ١١٠',
  'قطع ١٦٠',
  'بلاعات كيسل',
  'قطع ١بوصه كيسل'
];

function getCorrectKesselSubcategory(name) {
  const lower = name.toLowerCase();

  // 1. Check for pipes first
  if (lower.includes('مواسير') || lower.includes('ماسورة') || lower.includes('ماسوره') || lower.includes('ياردة') || lower.includes('يارده')) {
    return 'مواسير كيسل';
  }

  // 2. Check for drains / covers / gullies
  if (lower.includes('بيبة') || lower.includes('بيبه') || lower.includes('صفاية') || lower.includes('صفايه') || lower.includes('مانع رائحة') || lower.includes('برقع بيبة') || lower.includes('غطاء بيبة') || lower.includes('علاية') || lower.includes('عﻼية') || lower.includes('رقبة طويلة') || (lower.includes('جسم') && lower.includes('مخرج'))) {
    return 'بلاعات كيسل';
  }

  // 3. Check for buried (مدفون) systems
  if (lower.includes('مدفون')) {
    if (lower.includes('200') || lower.includes('٢٠٠')) return 'نظام كيسل المدفون ٢٠٠';
    if (lower.includes('160') || lower.includes('١٦٠')) return 'نظام كيسيل المدفون ١٦٠';
    if (lower.includes('110') || lower.includes('١١٠')) return 'نظام كيسيل المدفون ١١٠';
  }

  // 4. Clean up names for size extraction (strip angles, decimals, fractions)
  let clean = name;
  clean = clean.replace(/45\s*(?:درجة|درجه|°|د)/g, '');
  clean = clean.replace(/90\s*(?:درجة|درجه|°|د)/g, '');
  clean = clean.replace(/87\.5\s*(?:درجة|درجه|°|د)?/g, '');
  clean = clean.replace(/٨٧\.٥\s*(?:درجة|درجه|°|د)?/g, '');

  clean = clean.replace(/\d+\.\d+\s*(?:مم|مل|م)/g, '');
  clean = clean.replace(/\d+\,\d+\s*(?:مم|مل|m)/g, '');
  clean = clean.replace(/[٠-٩]+\.[٠-٩]+\s*(?:مم|مل|m)/g, '');
  clean = clean.replace(/[٠-٩]+\,[٠-٩]+\s*(?:مم|مل|m)/g, '');

  clean = clean.replace(/\d+\/\d+/g, '');
  clean = clean.replace(/[٠-٩]+\/[٠-٩]+/g, '');

  clean = clean.replace(/\d+\s*(?:سم|متر|مل|m)/g, '');
  clean = clean.replace(/[٠-٩]+\s*(?:سم|متر|مل|m)/g, '');

  // 5. Size based cutoffs
  if (/160|١٦٠|6\s*بوصه|6\s*بوصة/.test(clean)) return 'قطع ١٦٠';
  if (/110|١١٠|4\s*بوصه|4\s*بوصة/.test(clean)) return 'قطع ١١٠';
  if (/75|٧٥|3\s*بوصه|3\s*بوصة/.test(clean)) return 'قطع ٧٥';
  if (/63|٦٣|60|٦٠|2\s*بوصه|2\s*بوصة/.test(clean)) return 'قطع ٦٣ كيسل';
  if (/50|٥٠|48|٤٨|1\.5|١\,٥|1.5\s*بوصه|1.5\s*بوصة/.test(clean)) return 'قطع ٥٠';
  if (/40|٤٠/.test(clean)) return 'قطع ٤٠ كيسل';
  if (/32|٣٢|25|٢٥|20|٢٠|1\s*بوصه|1\s*بوصة/.test(clean)) return 'قطع ١بوصه كيسل';

  return null;
}

const kesselProducts = products.filter(p => p.mainCategoryId === 'كيسيل');

const reportBySubCat = {};
SUB_CATS.forEach(sub => {
  reportBySubCat[sub] = [];
});

kesselProducts.forEach(p => {
  const code = String(p.supplierCode || p.barcode || p.sku || p.id || '').trim();
  const catalogItem = catalogMap.get(code);

  const detectName = catalogItem ? catalogItem.name : p.name;
  const correctSub = getCorrectKesselSubcategory(detectName);
  const subToReport = p.subCategoryId;

  const issues = [];

  // Check subcategory sizing mismatch
  if (correctSub && p.subCategoryId !== correctSub) {
    // If it is a reducer, e.g. 50/110, check if either matches. Let's allow either size if it is a reducer.
    const isReducer = p.name.includes('مسلوب') || (catalogItem && catalogItem.name.includes('مسلوب'));
    if (isReducer) {
      const parts = p.name.match(/\d+/g) || [];
      const matchesAny = parts.some(part => {
        if (part === '160' && correctSub === 'قطع ١٦٠') return true;
        if (part === '110' && correctSub === 'قطع ١١٠') return true;
        if (part === '75' && correctSub === 'قطع ٧٥') return true;
        if (part === '63' && correctSub === 'قطع ٦٣ كيسل') return true;
        if (part === '50' && correctSub === 'قطع ٥٠') return true;
        if (part === '40' && correctSub === 'قطع ٤٠ كيسل') return true;
        return false;
      });
      if (!matchesAny) {
        issues.push(`موقع المجموعة الفرعية غير صحيح للمسلوب (الحالي: ${p.subCategoryId} | المفترض: ${correctSub})`);
      }
    } else {
      issues.push(`موقع المجموعة الفرعية غير صحيح (الحالي: ${p.subCategoryId} | المفترض: ${correctSub})`);
    }
  }

  // Check price mismatch with catalog
  if (catalogItem) {
    if (Math.abs(p.price - catalogItem.price) > 0.01) {
      issues.push(`مخالفة السعر (الحالي: ${p.price} | الكتالوج: ${catalogItem.price})`);
    }
    // Check key word mismatch
    const sysLower = p.name.toLowerCase();
    const catLower = catalogItem.name.toLowerCase();
    if (sysLower.includes('كوع') && !catLower.includes('كوع')) {
      issues.push(`نوع الصنف مختلف (كوع في النظام | ${catalogItem.name} في الكتالوج)`);
    } else if (sysLower.includes('مشترك') && !catLower.includes('مشترك') && !catLower.includes('تى')) {
      issues.push(`نوع الصنف مختلف (مشترك في النظام | ${catalogItem.name} في الكتالوج)`);
    }
    const doorSys = sysLower.includes('بباب') || sysLower.includes('باب كشف');
    const doorCat = catLower.includes('بباب') || catLower.includes('باب كشف') || catLower.includes('بباب كشف');
    if (doorSys !== doorCat) {
      issues.push(`مخالفة وجود باب كشف (النظام: ${doorSys ? 'بباب' : 'بدون'} | الكتالوج: ${doorCat ? 'بباب' : 'بدون'})`);
    }
  } else {
    issues.push('الكود غير موجود بكتالوج الشركة الرسمي');
  }

  if (issues.length > 0) {
    if (reportBySubCat[subToReport]) {
      reportBySubCat[subToReport].push({
        id: p.id,
        code,
        name: p.name,
        catalogName: catalogItem ? catalogItem.name : 'غير موجود',
        price: p.price,
        catalogPrice: catalogItem ? catalogItem.price : 'N/A',
        issues
      });
    }
  }
});

const outputPath = path.join(__dirname, 'kessel_audit_report.json');
fs.writeFileSync(outputPath, JSON.stringify(reportBySubCat, null, 2), 'utf8');
console.log('Kessel audit report generated successfully in scratch/kessel_audit_report.json!');
console.log('Total discrepancies flagged:', Object.values(reportBySubCat).reduce((acc, curr) => acc + curr.length, 0));
