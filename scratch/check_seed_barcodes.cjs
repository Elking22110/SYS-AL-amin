const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, '..', 'public', 'products_seed.json');
const sourcePath = path.join(__dirname, '..', 'scripts', 'company_list_source.txt');

const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const products = seedData.products || [];

const companyCodes = new Set();
const sourceLines = fs.readFileSync(sourcePath, 'utf8').split('\n');
sourceLines.forEach(line => {
  const m = line.match(/\b(\d{9})\b/);
  if (m) companyCodes.add(m[1]);
});

const systemCodes = new Set();
products.forEach(p => {
  if (p.barcode) systemCodes.add(String(p.barcode).trim());
});

console.log(`📋 Total unique codes in company_list_source.txt: ${companyCodes.size}`);
console.log(`📋 Total products with barcodes in products_seed.json: ${systemCodes.size}`);

let intersectionCount = 0;
const missingInSeed = [];
companyCodes.forEach(code => {
  if (systemCodes.has(code)) {
    intersectionCount++;
  } else {
    missingInSeed.push(code);
  }
});

console.log(`📊 Matches (intersection): ${intersectionCount}`);
console.log(`📊 Missing in products_seed.json: ${missingInSeed.length}`);
if (missingInSeed.length > 0) {
  console.log(`Sample missing codes (First 5):`, missingInSeed.slice(0, 5));
}
