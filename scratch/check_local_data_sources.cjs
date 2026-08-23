const fs = require('fs');
const path = require('path');

const appData = process.env.APPDATA || '';
const localAppData = process.env.LOCALAPPDATA || '';

console.log('APPDATA:', appData);
console.log('LOCALAPPDATA:', localAppData);

function searchDirs(base, keyword) {
  if (!fs.existsSync(base)) return [];
  try {
    const files = fs.readdirSync(base);
    return files.filter(f => f.toLowerCase().includes(keyword.toLowerCase())).map(f => path.join(base, f));
  } catch (e) {
    return [];
  }
}

console.log('APPDATA matches:', searchDirs(appData, 'pos'));
console.log('APPDATA matches ameen:', searchDirs(appData, 'ameen'));
console.log('APPDATA matches electron:', searchDirs(appData, 'electron'));

console.log('LOCALAPPDATA matches:', searchDirs(localAppData, 'pos'));
console.log('LOCALAPPDATA matches ameen:', searchDirs(localAppData, 'ameen'));

const seedPath = path.join(__dirname, '../public/products_seed.json');
if (fs.existsSync(seedPath)) {
  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  console.log('public/products_seed.json products count:', seed.products ? seed.products.length : (Array.isArray(seed) ? seed.length : 0));
  console.log('public/products_seed.json categories count:', seed.categories ? seed.categories.length : 0);
}
