const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'public', 'products_seed.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
const products = data.products || [];

let matchCount = 0;
const results = [];

products.forEach(p => {
  let name = p.name;
  let newName = name;
  
  if (name.startsWith('PPR-DR11-PN10')) {
    newName = name.replace('PPR-DR11-PN10', 'PN10');
  } else if (name.startsWith('PPR-DR6-PN20')) {
    newName = name.replace('PPR-DR6-PN20', 'PN20');
  } else if (name.startsWith('PPR-DR74-PN16')) {
    newName = name.replace('PPR-DR74-PN16', 'PN16');
  } else if (name.startsWith('PPR-DR74PN16')) {
    newName = name.replace('PPR-DR74PN16', 'PN16');
  } else if (name.startsWith('PPRCTDR11PN16')) {
    newName = name.replace('PPRCTDR11PN16', 'PN16');
  }
  
  if (newName !== name) {
    matchCount++;
    results.push({ id: p.id, old: name, new: newName });
  }
});

console.log(`Total matches to rename: ${matchCount}`);
results.slice(0, 30).forEach(r => {
  console.log(`ID: ${r.id}`);
  console.log(`  OLD: ${r.old}`);
  console.log(`  NEW: ${r.new}`);
});
