const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, '..', 'public', 'products_seed.json');
const sourcePath = path.join(__dirname, 'company_list_source.txt');

const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const sourceText = fs.readFileSync(sourcePath, 'utf8');
const allProducts = seedData.products || [];

// Map of currently assigned barcodes/skus in our system
const assignedCodes = new Set();
allProducts.forEach(p => {
  if (p.barcode) assignedCodes.add(String(p.barcode));
  if (p.sku) assignedCodes.add(String(p.sku));
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
    if (!bm) return null;
    brand = bm[1];
    cleanLine = cleanLine.replace(/\b(BR|KS|SM|SG|SL|NC|MX|BU|FT|MP)\b/,'').trim();
  }
  
  const name = cleanLine.replace(/[*]+/g,'').trim().replace(/\s+/g,' ');
  return { code, name, brand, lp };
}

const companyProducts = [];
for (const line of sourceText.split('\n')) {
  const parsed = parseCompanyLine(line);
  if (parsed) companyProducts.push(parsed);
}

// Group company products by brand
const grouped = {
  BR: { total: 0, mapped: 0, unmapped: [] },
  Smart: { total: 0, mapped: 0, unmapped: [] }, // SM, SG, SL, NC, MX
  Kessel: { total: 0, mapped: 0, unmapped: [] } // KS
};

companyProducts.forEach(cp => {
  let targetGroup = null;
  if (cp.brand === 'BR') targetGroup = grouped.BR;
  else if (['SM', 'SG', 'SL', 'NC', 'MX'].includes(cp.brand)) targetGroup = grouped.Smart;
  else if (cp.brand === 'KS') targetGroup = grouped.Kessel;
  
  if (targetGroup) {
    targetGroup.total++;
    const isMapped = assignedCodes.has(String(cp.code));
    if (isMapped) {
      targetGroup.mapped++;
    } else {
      targetGroup.unmapped.push(cp);
    }
  }
});

console.log('=== STATS: How many codes from the company list are assigned to system products? ===');
console.log(`BR: ${grouped.BR.mapped} / ${grouped.BR.total} codes assigned`);
console.log(`Smart: ${grouped.Smart.mapped} / ${grouped.Smart.total} codes assigned`);
console.log(`Kessel: ${grouped.Kessel.mapped} / ${grouped.Kessel.total} codes assigned`);

console.log('\n--- Sample of Unassigned Company Codes (First 5 of each group) ---');
console.log('BR Unassigned:');
grouped.BR.unmapped.slice(0, 5).forEach(u => console.log(`  [${u.code}] ${u.name} (Price: ${u.lp})`));
console.log('Smart Unassigned:');
grouped.Smart.unmapped.slice(0, 5).forEach(u => console.log(`  [${u.code}] ${u.name} (Price: ${u.lp})`));
console.log('Kessel Unassigned:');
grouped.Kessel.unmapped.slice(0, 5).forEach(u => console.log(`  [${u.code}] ${u.name} (Price: ${u.lp})`));
