const fs = require('fs');

const seed = JSON.parse(fs.readFileSync('./public/products_seed.json', 'utf8'));

console.log('===========================================================');
console.log('DATASET INVESTIGATION: PRODUCTS VS POS SUBCATEGORIES FOR KISEL');
console.log('===========================================================');

const allCats = seed.categories;
console.log(`Total Categories in Seed: ${allCats.length}`);

const mainCats = allCats.filter(c => !c.parentId);
const subCats = allCats.filter(c => c.parentId);

console.log(`Main Categories Count: ${mainCats.length}`);
console.log(`Sub Categories Count: ${subCats.length}`);

// Inspect Kisel main category and its subcategories in categories store
const kiselMain = allCats.find(c => c.name === 'كيسيل' || c.name === 'كيسل' || c.id === 'كيسيل');
console.log('\nKisel Main Category Object in Categories Store:', kiselMain);

const kiselSubCatsInStore = allCats.filter(c => String(c.parentId) === String(kiselMain?.id) || c.parentId === kiselMain?.name);
console.log(`\nSubcategories under Kisel in Categories Store (${kiselSubCatsInStore.length} items):`);
kiselSubCatsInStore.forEach((c, idx) => console.log(`${idx + 1}. ID: "${c.id}" | Name: "${c.name}" | ParentID: "${c.parentId}"`));

// Now inspect products assigned to Kisel
const kiselProds = seed.products.filter(p => p.mainCategoryId === 'كيسيل' || p.mainCategoryId === 'كيسل' || (p.name || '').includes('كيسيل') || (p.name || '').includes('كيسل'));
console.log(`\nTotal Products assigned to Kisel: ${kiselProds.length}`);

const uniqueProductSubCats = Array.from(new Set(kiselProds.map(p => p.subCategoryId).filter(Boolean)));
console.log(`\nUnique subCategoryId values on Kisel Products (${uniqueProductSubCats.length} items):`);
uniqueProductSubCats.forEach((sub, idx) => console.log(`${idx + 1}. "${sub}"`));

// Now compare what POS (ProductGrid.jsx) computes vs Products (Products.jsx)
console.log('\n--- SIMULATING PRODUCTS PAGE DISPLAY ---');
console.log('Products page filters categories array directly:');
const productsPageKiselSubs = allCats.filter(c => {
  if (!c.parentId) return false;
  const parent = allCats.find(p => String(p.id) === String(c.parentId) || p.name === c.parentId);
  return parent && (parent.name === 'كيسيل' || parent.id === 'كيسيل');
});
console.log(`Products Page Displays (${productsPageKiselSubs.length} items):`);
productsPageKiselSubs.forEach((c, idx) => console.log(`${idx + 1}. "${c.name}"`));

console.log('\n--- SIMULATING POS PAGE DISPLAY ---');
console.log('POS page ProductGrid.jsx filteredCategories logic:');
const KEISEL_DRAIN_NAMES = ['بلاعات كيسيل'];
const KEISEL_TO_MERGE_NAMES = ['قطع ١١٠', 'قطع ١٦٠', 'مواسير كيسيل', 'نظام كيسل المدفون ٢٠٠', 'نظام كيسل المدفون ١١٠', 'نظام كيسل المدفون ١٦٠'];

// POS logic:
const posAllSubs = allCats
  .filter(c => String(c.parentId) === String(kiselMain?.id) || String(c.parentId) === String(kiselMain?.name))
  .map(c => ({ id: c.id, name: c.name }));

const keepSeparate = posAllSubs.filter(
  c => !KEISEL_DRAIN_NAMES.includes(c.name) && !KEISEL_TO_MERGE_NAMES.includes(c.name)
);
const drainSubs = posAllSubs.filter(c => KEISEL_DRAIN_NAMES.includes(c.name));
const hasMerged = posAllSubs.some(c => KEISEL_TO_MERGE_NAMES.includes(c.name));

const posDisplayResult = [
  ...keepSeparate,
  ...(hasMerged ? [{ id: '__keisel_merged__', name: 'نظام وقطع ١١٠-٢٠٠ ومواسير' }] : []),
  ...drainSubs
];

console.log(`POS Page Displays (${posDisplayResult.length} items):`);
posDisplayResult.forEach((c, idx) => console.log(`${idx + 1}. "${c.name}" (ID: ${c.id})`));

console.log('\n--- COMPARING THE TWO LISTS ---');
const prodNames = productsPageKiselSubs.map(c => c.name);
const posNames = posDisplayResult.map(c => c.name);

const inProdNotPos = prodNames.filter(n => !posNames.includes(n));
const inPosNotProd = posNames.filter(n => !prodNames.includes(n));

console.log('Subcategories in Products Page BUT NOT in POS Page:', inProdNotPos);
console.log('Subcategories in POS Page BUT NOT in Products Page:', inPosNotProd);
