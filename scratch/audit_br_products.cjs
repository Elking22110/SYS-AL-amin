/**
 * scratch/audit_br_products.cjs
 * Performs a complete product-by-product audit of the BR category against company_list_source.txt.
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
  'قطع ٢/١',
  'قطع ٤/٣ بوصة',
  'قطع ١ بوصة',
  'قطع ١,٢٥ بوصة',
  'قطع ١,٥ بوصة',
  'قطع ٢ بوصة',
  'قطع اسواد ٣/٤',
  'قطع ١ بوصه اسود',
  'قطع ١,٥ اسود'
];

function getCorrectBRSubcategory(name) {
  let clean = name;

  // 1. Strip pressure ratings and SDR ratings
  clean = clean.replace(/pn\d+/gi, '');
  clean = clean.replace(/sdr\d+(?:\.\d+)?/gi, '');
  clean = clean.replace(/dr\d+/gi, '');

  // 2. Strip angles (highly refined to avoid matching diameters)
  clean = clean.replace(/درجة\s*(?:45|90|87\.5|875)/g, '');
  clean = clean.replace(/درجه\s*(?:45|90|87\.5|875)/g, '');
  clean = clean.replace(/(?:45|90|87\.5|875)\s*°/g, '');
  clean = clean.replace(/°\s*(?:45|90|87\.5|875)/g, '');
  clean = clean.replace(/(?:45|90|87\.5|875)\s*(?:درجة|درجه|د)\b/g, '');

  // Strip leading angle in '90 مم20كوع' or 'UV أسود90 مم25كوع'
  clean = clean.replace(/(?:90|45)\s*مم(?=\s*\d+)/g, '');
  clean = clean.replace(/(?:90|45)مم(?=\s*\d+)/g, '');
  clean = clean.replace(/(?:90|45)\s+مم(?=\d+)/g, '');
  clean = clean.replace(/(?:90|45)مم(?=\d+)/g, '');
  clean = clean.replace(/(?:90|45)\s+م\s+(?=\d+)/g, ' ');

  // 3. Strip wall thickness decimal values with 'مم' or 'مل'
  clean = clean.replace(/\d+\.\d+\s*(?:مم|مل|م)/g, '');
  clean = clean.replace(/\d+\,\d+\s*(?:مم|مل|m)/g, '');
  clean = clean.replace(/[٠-٩]+\.[٠-٩]+\s*(?:مم|مل|m)/g, '');
  clean = clean.replace(/[٠-٩]+\,[٠-٩]+\s*(?:مم|مل|m)/g, '');

  // 4. Strip square dimensions
  clean = clean.replace(/\d+\s*[\*xX×]\s*\d+/g, '');
  clean = clean.replace(/[٠-٩]+\s*[\*xX×]\s*[٠-٩]+/g, '');

  // 5. Strip length/packaging values
  clean = clean.replace(/(?:سم|متر|مل|م|بستلة|كيلو)\s*\d+/g, '');
  clean = clean.replace(/(?:سم|متر|مل|م|بستلة|كيلو)\s*[٠-٩]+/g, '');
  clean = clean.replace(/\d+\s*(?:سم|متر|مل|m|بستلة|كيلو)/g, '');
  clean = clean.replace(/[٠-٩]+\s*(?:سم|متر|مل|m|بستلة|كيلو)/g, '');
  clean = clean.replace(/\bم\s*\d+\b/g, '');
  clean = clean.replace(/\bم\d+\b/g, '');

  const lower = name.toLowerCase();
  const isBlack = lower.includes('اسود') || lower.includes('أسود') || lower.includes('uv') || lower.includes('ألسود');

  if (isBlack) {
    if (/50|٥٠|1\.5|١\,٥|1.5\s*بوصه|1.5\s*بوصة/.test(clean)) return 'قطع ١,٥ اسود';
    if (/32|٣٢|1\s*بوصه|1\s*بوصة/.test(clean)) return 'قطع ١ بوصه اسود';
    if (/25|٢٥|3\/4|٤\/٣/.test(clean) || lower.includes('3/4') || lower.includes('٤/٣')) return 'قطع اسواد ٣/٤';
  }

  // Strip fractions
  clean = clean.replace(/\d+\/\d+/g, '');
  clean = clean.replace(/[٠-٩]+\/[٠-٩]+/g, '');

  // Determine larger size for reducers/tees
  const sizes = [];
  if (/160|١٦٠|6\s*بوصه|6\s*بوصة/.test(clean)) sizes.push({ name: 'قطع ٢ بوصة', val: 160 });
  if (/110|١١٠|4\s*بوصه|4\s*بوصة/.test(clean)) sizes.push({ name: 'قطع ٢ بوصة', val: 110 });
  if (/90|٩٠|75|٧٥|63|٦٣|2\s*بوصه|2\s*بوصة/.test(clean)) sizes.push({ name: 'قطع ٢ بوصة', val: 63 });
  if (/50|٥٠|48|٤٨|1\.5|١\,٥|1.5\s*بوصه|1.5\s*بوصة/.test(clean)) sizes.push({ name: 'قطع ١,٥ بوصة', val: 50 });
  if (/40|٤٠|1\.25|١\,٢٥|1.25\s*بوصه|1.25\s*بوصة/.test(clean)) sizes.push({ name: 'قطع ١,٢٥ بوصة', val: 40 });
  if (/32|٣٢|1\s*بوصه|1\s*بوصة/.test(clean)) sizes.push({ name: 'قطع ١ بوصة', val: 32 });
  if (/25|٢٥/.test(clean) || name.includes('3/4') || name.includes('٤/٣')) sizes.push({ name: 'قطع ٤/٣ بوصة', val: 25 });
  if (/20|٢٠/.test(clean) || name.includes('1/2') || name.includes('٢/١')) sizes.push({ name: 'قطع ٢/١', val: 20 });

  if (sizes.length > 0) {
    sizes.sort((a, b) => b.val - a.val);
    return sizes[0].name;
  }

  return null;
}

const brProducts = products.filter(p => p.mainCategoryId === 'Br');

const reportBySubCat = {};
SUB_CATS.forEach(sub => {
  reportBySubCat[sub] = [];
});
reportBySubCat['قطع مشكله BR اسمارت و'] = [];

brProducts.forEach(p => {
  const code = String(p.supplierCode || p.barcode || p.sku || p.id || '').trim();
  const catalogItem = catalogMap.get(code);

  const detectName = catalogItem ? catalogItem.name : p.name;
  const correctSub = getCorrectBRSubcategory(detectName);
  const subToReport = p.subCategoryId;

  if (subToReport === 'قطع مشكله BR اسمارت و' || subToReport === 'افيز اسمارت') return;

  // Skip flexible connections and non-standard accessory items that may use length in cm
  if (p.name.includes('وصلة') || p.name.includes('وصله') || p.name.includes('محبس دفن') || p.name.includes('شحم') || p.name.includes('جاليتراب') || p.name.includes('عزل') || p.name.includes('شريط')) return;

  const issues = [];

  if (correctSub && p.subCategoryId !== correctSub) {
    issues.push(`موقع المجموعة الفرعية غير صحيح (الحالي: ${p.subCategoryId} | المفترض: ${correctSub})`);
  }

  if (catalogItem) {
    if (Math.abs(p.price - catalogItem.price) > 0.01) {
      issues.push(`مخالفة السعر (الحالي: ${p.price} | الكتالوج: ${catalogItem.price})`);
    }
  } else {
    if (code.match(/^\d{7,10}$/)) {
      issues.push('الكود غير موجود بكتالوج الشركة الرسمي');
    }
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

const outputPath = path.join(__dirname, 'br_audit_report.json');
fs.writeFileSync(outputPath, JSON.stringify(reportBySubCat, null, 2), 'utf8');
console.log('BR audit report generated successfully in scratch/br_audit_report.json!');
console.log('Total discrepancies flagged:', Object.values(reportBySubCat).reduce((acc, curr) => acc + curr.length, 0));
