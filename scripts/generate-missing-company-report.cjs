const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, '..', 'public', 'products_seed.json');
const sourcePath = path.join(__dirname, 'company_list_source.txt');
const outputPath = path.join(__dirname, '..', 'missing_company_products_in_system.txt');

const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const sourceText = fs.readFileSync(sourcePath, 'utf8');
const allProducts = seedData.products || [];

// Collect assigned codes
const assignedCodes = new Set();
allProducts.forEach(p => {
  if (p.barcode) assignedCodes.add(String(p.barcode));
  if (p.sku) assignedCodes.add(String(p.sku));
  if (p.supplierCode) assignedCodes.add(String(p.supplierCode));
});

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
    if (bm) {
      brand = bm[1];
      cleanLine = cleanLine.replace(/\b(BR|KS|SM|SG|SL|NC|MX|BU|FT|MP)\b/,'').trim();
    }
  }
  const name = cleanLine.replace(/[*]+/g,'').trim().replace(/\s+/g,' ');
  return { code, name, brand, price: lp, rawLine: line };
}

const companyProducts = [];
const seenCodes = new Set();

for (const line of sourceText.split('\n')) {
  const parsed = parseCompanyLine(line);
  if (parsed && !seenCodes.has(parsed.code)) {
    seenCodes.add(parsed.code);
    companyProducts.push(parsed);
  }
}

// Filter unlinked/missing products
const missingProducts = companyProducts.filter(cp => !assignedCodes.has(String(cp.code)));

// Group by brand
const brMissing = missingProducts.filter(cp => cp.brand === 'BR');
const smartMissing = missingProducts.filter(cp => ['SM','SG','SL','NC','MX'].includes(cp.brand));
const ksMissing = missingProducts.filter(cp => cp.brand === 'KS');
const otherMissing = missingProducts.filter(cp => !brMissing.includes(cp) && !smartMissing.includes(cp) && !ksMissing.includes(cp));

let fileContent = `=== أصناف الشركة المذكورة في قائمة الأسعار (PDF) وليست مسجلة في السيستم ===
إجمالي الأصناف المفقودة: ${missingProducts.length} صنف من أصل 838 صنف بالملف.

--------------------------------------------------
1. منتجات BR المفقودة (إجمالي ${brMissing.length} صنف):
--------------------------------------------------
`;

brMissing.forEach(cp => {
  fileContent += ` - [كود: ${cp.code}] ${cp.name} | السعر: ${cp.price || 'غير محدد'}\n`;
});

fileContent += `\n--------------------------------------------------
2. منتجات سمارت أبيض المفقودة (إجمالي ${smartMissing.length} صنف):
--------------------------------------------------
`;

smartMissing.forEach(cp => {
  fileContent += ` - [كود: ${cp.code}] ${cp.name} | السعر: ${cp.price || 'غير محدد'}\n`;
});

fileContent += `\n--------------------------------------------------
3. منتجات كيسيل المفقودة (إجمالي ${ksMissing.length} صنف):
--------------------------------------------------
`;

ksMissing.forEach(cp => {
  fileContent += ` - [كود: ${cp.code}] ${cp.name} | السعر: ${cp.price || 'غير محدد'}\n`;
});

if (otherMissing.length > 0) {
  fileContent += `\n--------------------------------------------------
4. منتجات أخرى مفقودة بالملف (إجمالي ${otherMissing.length} صنف):
--------------------------------------------------
`;
  otherMissing.forEach(cp => {
    fileContent += ` - [كود: ${cp.code}] ${cp.name} | السعر: ${cp.price || 'غير محدد'}\n`;
  });
}

fs.writeFileSync(outputPath, fileContent, 'utf8');
console.log(`Successfully generated report of missing company products at: ${outputPath}`);
