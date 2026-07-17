const fs = require('fs');
const report = JSON.parse(fs.readFileSync('scripts/company_match_report.json', 'utf8'));

const grouped = {};
report.forEach(r => {
  if (!grouped[r.brand]) grouped[r.brand] = [];
  grouped[r.brand].push(r);
});

for (const [brand, items] of Object.entries(grouped)) {
  console.log(`\n=== Brand: ${brand} (Matched ${items.length} items) ===`);
  items.slice(0, 15).forEach(r => {
    console.log(`  - ${r.productName.padEnd(45)} -> ${r.companyCode} | ${r.companyName}`);
  });
  if (items.length > 15) {
    console.log(`  ... and ${items.length - 15} more items`);
  }
}
