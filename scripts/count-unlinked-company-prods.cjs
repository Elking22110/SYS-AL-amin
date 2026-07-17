const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, '..', 'public', 'products_seed.json');
const sourcePath = path.join(__dirname, 'company_list_source.txt');

const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const sourceText = fs.readFileSync(sourcePath, 'utf8');
const allProducts = seedData.products || [];

// Collect all codes currently assigned to products in the system
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
  return code;
}

const companyCodes = [];
for (const line of sourceText.split('\n')) {
  const parsedCode = parseCompanyLine(line);
  if (parsedCode) companyCodes.push(parsedCode);
}

const uniqueCompanyCodes = [...new Set(companyCodes)];

let unlinkedCount = 0;
const unlinkedList = [];

uniqueCompanyCodes.forEach(code => {
  if (!assignedCodes.has(String(code))) {
    unlinkedCount++;
    unlinkedList.push(code);
  }
});

console.log('Total company products in PDF:', uniqueCompanyCodes.length);
console.log('Linked company products:', uniqueCompanyCodes.length - unlinkedCount);
console.log('Unlinked/missing company products:', unlinkedCount);

// Let's print some details about which codes are unlinked
const codeToLineMap = {};
for (const line of sourceText.split('\n')) {
  const parsedCode = parseCompanyLine(line);
  if (parsedCode) {
    codeToLineMap[parsedCode] = line.trim();
  }
}

console.log('\nSample of unlinked company products from PDF:');
unlinkedList.slice(0, 15).forEach(code => {
  console.log(`- [Code: ${code}] ${codeToLineMap[code]}`);
});
