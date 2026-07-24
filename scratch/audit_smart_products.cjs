/**
 * scratch/audit_smart_products.cjs
 * performs a complete product-by-product audit of the Smart Home white category against company_list_source.txt
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
    // Match brand and price at end (e.g. BR 177.25, SM 104.00, etc.)
    const brandPriceMatch = rest.match(/\s+([A-Z]{2})\s+([\d\.]+)\s*$/);
    if (brandPriceMatch) {
      const brand = brandPriceMatch[1];
      const price = parseFloat(brandPriceMatch[2]);
      const name = rest.replace(/\s+[A-Z]{2}\s+[\d\.]+\s*$/, '').trim();
      catalogMap.set(code, { name, brand, price });
    }
  }
});

// Smart Home Subcategories of interest
const SUB_CATS = ['١بوصه', 'بوصه ١,٥', 'بوصه 2', 'بوصه 3', 'بوصه 4', 'بوصه 6'];

// Refined function to detect the correct size subcategory from the product name
function getCorrectSubcategory(name) {
  let clean = name;

  // 1. Strip angles to prevent false positive size match (e.g. 45 -> 4", 90 -> 90mm = 3")
  clean = clean.replace(/45\s*(?:درجة|درجه|°|د)/g, '');
  clean = clean.replace(/90\s*(?:درجة|درجه|°|د)/g, '');
  clean = clean.replace(/87\.5\s*(?:درجة|درجه|°|د)?/g, '');
  clean = clean.replace(/٨٧\.٥\s*(?:درجة|درجه|°|د)?/g, '');
  clean = clean.replace(/875\s*(?:درجة|درجه|°|د)?/g, '');
  clean = clean.replace(/٨٧٥\s*(?:درجة|درجه|°|د)?/g, '');

  // 2. Strip wall thickness decimal values with 'مم' or 'مل' (e.g. 2.5mm thickness -> false 25mm match)
  clean = clean.replace(/\d+\.\d+\s*(?:مم|مل|م)/g, '');
  clean = clean.replace(/\d+\,\d+\s*(?:مم|مل|م)/g, '');
  clean = clean.replace(/[٠-٩]+\.[٠-٩]+\s*(?:مم|مل|m)/g, '');
  clean = clean.replace(/[٠-٩]+\,[٠-٩]+\s*(?:مم|مل|m)/g, '');

  // 3. Strip fractions (like 1/2, 3/4, 2/1, 4/3) to prevent false positive numbers
  clean = clean.replace(/\d+\/\d+/g, '');
  clean = clean.replace(/[٠-٩]+\/[٠-٩]+/g, '');

  // 4. Strip square dimensions (like 60*60, 50*50, 20*20)
  clean = clean.replace(/\d+\s*[\*xX×]\s*\d+/g, '');
  clean = clean.replace(/[٠-٩]+\s*[\*xX×]\s*[٠-٩]+/g, '');

  // 5. Strip length/packaging values (like سم30, سم40, سم50, سم60, سم80, سم100, متر1, متر6)
  clean = clean.replace(/(?:سم|متر|مل|م|بستلة|كيلو)\s*\d+/g, '');
  clean = clean.replace(/(?:سم|متر|مل|م|بستلة|كيلو)\s*[٠-٩]+/g, '');
  clean = clean.replace(/\d+\s*(?:سم|متر|مل|م|بستلة|كيلو)/g, '');
  clean = clean.replace(/[٠-٩]+\s*(?:سم|متر|مل|م|بستلة|كيلو)/g, '');

  // A. 6 inch / 160 mm
  if (/160|١٦٠|6\s*بوصه|6\s*بوصة/.test(clean)) return 'بوصه 6';

  // B. 4 inch / 110 mm
  if (/110|١١٠|4\s*بوصه|4\s*بوصة/.test(clean)) return 'بوصه 4';

  // C. 3 inch / 75 mm
  if (/75|٧٥|3\s*بوصه|3\s*بوصة/.test(clean)) return 'بوصه 3';

  // D. 2 inch / 63 mm / 60 mm
  if (/63|٦٣|60|٦٠|2\s*بوصه|2\s*بوصة/.test(clean)) return 'بوصه 2';

  // E. 1.5 inch / 50 mm / 48 mm
  if (/50|٥٠|48|٤٨|1\.5|١\,٥|١\.٥|1.5\s*بوصه|1.5\s*بوصة/.test(clean)) return 'بوصه ١,٥';

  // F. 1 inch / 32 mm / 25 mm / 20 mm
  if (/32|٣٢|25|٢٥|20|٢٠|1\s*بوصه|1\s*بوصة/.test(clean)) return '١بوصه';

  return null;
}

const smartProducts = products.filter(p => p.mainCategoryId === 'اسمارت ابيض');

const reportBySubCat = {};
SUB_CATS.forEach(sub => {
  reportBySubCat[sub] = [];
});

smartProducts.forEach(p => {
  const code = String(p.supplierCode || p.barcode || p.sku || p.id || '').trim();
  const catalogItem = catalogMap.get(code);

  const correctSub = getCorrectSubcategory(p.name);
  const subToReport = p.subCategoryId;

  const issues = [];

  // Check subcategory sizing mismatch
  if (correctSub && p.subCategoryId !== correctSub) {
    issues.push(`موقع المجموعة الفرعية غير صحيح (الحالي: ${p.subCategoryId} | المفترض: ${correctSub})`);
  }

  // Check price mismatch with catalog
  if (catalogItem) {
    if (Math.abs(p.price - catalogItem.price) > 0.01) {
      issues.push(`مخالفة السعر (الحالي: ${p.price} | الكتالوج: ${catalogItem.price})`);
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

// Write output to a JSON report file for audit analysis
const outputPath = path.join(__dirname, 'smart_audit_report.json');
fs.writeFileSync(outputPath, JSON.stringify(reportBySubCat, null, 2), 'utf8');
console.log('Smart audit report generated successfully in scratch/smart_audit_report.json!');
console.log('Total discrepancies flagged:', Object.values(reportBySubCat).reduce((acc, curr) => acc + curr.length, 0));
