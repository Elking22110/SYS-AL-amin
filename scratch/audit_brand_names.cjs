/**
 * scratch/audit_brand_names.cjs
 * Scans products of BR, Kessel, and Smart Home White, identifying which products lack brand identifiers in their names.
 */

const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, '..', 'public', 'products_seed.json');
const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const products = seedData.products || [];

const categoriesToAudit = ['Br', 'كيسيل', 'اسمارت ابيض'];

const report = {
  'Br': [],
  'كيسيل': [],
  'اسمارت ابيض': []
};

products.forEach(p => {
  if (!categoriesToAudit.includes(p.mainCategoryId)) return;
  
  const name = p.name || '';
  const mainCat = p.mainCategoryId;
  
  let hasIdentifier = false;
  
  if (mainCat === 'Br') {
    hasIdentifier = name.includes('BR') || name.includes('بي ار') || name.includes('بي أر') || name.includes('بي.ار') || name.includes('B.R') || name.includes('بي آر');
  } else if (mainCat === 'كيسيل') {
    hasIdentifier = name.includes('كيسيل') || name.includes('كيسل') || name.includes('KS') || name.includes('Kessel');
  } else if (mainCat === 'اسمارت ابيض') {
    hasIdentifier = name.includes('سمارت') || name.includes('اسمارت') || name.includes('SM') || name.includes('Smart');
  }
  
  if (!hasIdentifier) {
    report[mainCat].push({
      id: p.id,
      name: p.name,
      subCategoryId: p.subCategoryId
    });
  }
});

console.log('BR products lacking identifier:', report['Br'].length);
console.log('Kessel products lacking identifier:', report['كيسيل'].length);
console.log('Smart White products lacking identifier:', report['اسمارت ابيض'].length);

const outPath = path.join(__dirname, 'brand_names_report.json');
fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
console.log('Report saved to scratch/brand_names_report.json');
