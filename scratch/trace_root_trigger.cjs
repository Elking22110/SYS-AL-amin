const fs = require('fs');

console.log('===========================================================');
console.log('TRACE ROOT TRIGGER & PRODUCT DUPLICATION INVESTIGATION');
console.log('===========================================================');

// 1. Scan DataLoader.jsx for all patches, seed loading, and deletion triggers
const dataLoaderContent = fs.readFileSync('./src/components/DataLoader.jsx', 'utf8');
const dataLoaderLines = dataLoaderContent.split('\n');

console.log('\n--- DataLoader.jsx Patches & Deletion Triggers ---');
dataLoaderLines.forEach((line, idx) => {
  if (
    line.includes('delete') ||
    line.includes('patch_') ||
    line.includes('dedup') ||
    line.includes('migration') ||
    line.includes('seed')
  ) {
    if (line.includes('Patch') || line.includes('PATCH') || line.includes('delete') || line.includes('deduplicat')) {
      console.log(`DataLoader.jsx:${idx + 1} | ${line.trim()}`);
    }
  }
});

// 2. Scan Products.jsx for all deletion calls
const productsContent = fs.readFileSync('./src/pages/Products.jsx', 'utf8');
const productsLines = productsContent.split('\n');

console.log('\n--- Products.jsx Deletion Triggers ---');
productsLines.forEach((line, idx) => {
  if (line.includes('handleDelete') || line.includes('databaseManager.delete')) {
    console.log(`Products.jsx:${idx + 1} | ${line.trim()}`);
  }
});

// 3. Scan SyncManager.js for deduplication / deletion triggers
const syncContent = fs.readFileSync('./src/utils/syncManager.js', 'utf8');
const syncLines = syncContent.split('\n');

console.log('\n--- syncManager.js Deletion / Reconciliation Triggers ---');
syncLines.forEach((line, idx) => {
  if (line.includes('delete') || line.includes('reconcile') || line.includes('duplicate')) {
    if (line.includes('deletePhysical') || line.includes('reconcile') || line.includes('delete(')) {
      console.log(`syncManager.js:${idx + 1} | ${line.trim()}`);
    }
  }
});
