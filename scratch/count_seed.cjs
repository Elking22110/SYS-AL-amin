const fs = require('fs');
try {
  const seed = JSON.parse(fs.readFileSync('public/products_seed.json', 'utf8'));
  console.log('Total products in seed:', seed.products?.length);
  console.log('Total categories in seed:', seed.categories?.length);
} catch (err) {
  console.error('Error reading seed:', err);
}
