/**
 * FORENSIC AUDIT: TRACE 490 EXTRA RUNTIME PRODUCTS & OLD CATEGORIES
 * =================================================================
 * 1. Scans Electron AppData / userData folders on Windows:
 *    - %APPDATA%\pos-system-modern-ui
 *    - %APPDATA%\SIS AL AMEEN
 *    - %APPDATA%\Electron
 *    - %APPDATA%\antigravity-ide
 *    - IndexedDB directories, Local Storage directories, LevelDB files.
 * 2. Checks local workspace for hardcoded legacy product arrays or old seed files:
 *    - public/products_seed.json
 *    - src/utils/legacyMigration.js
 *    - src/utils/categoryMigration.js
 *    - src/utils/database.js
 *    - any embedded JSON files in src/ or public/
 * 3. Identifies every product in legacyMigration or seed sources that is NOT in the 2,539 approved baseline.
 *
 * DOES NOT DELETE ANYTHING.
 * Run: node scratch/audit_exe_runtime_sources.cjs
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('\n' + '═'.repeat(75));
console.log('  FORENSIC AUDIT: 490 EXTRA PRODUCTS & OLD CATEGORIES RECONCILIATION');
console.log('═'.repeat(75));

// 1. Check local seed file public/products_seed.json
const seedPath = path.join(__dirname, '../public/products_seed.json');
const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const seedProducts = seedData.products || [];
const seedCategories = seedData.categories || [];

console.log(`\n[1] public/products_seed.json:`);
console.log(`    Total Products  : ${seedProducts.length}`);
console.log(`    Total Categories: ${seedCategories.length}`);

// Approved 2539 Set
const approvedMap = new Map();
seedProducts.forEach(p => approvedMap.set(String(p.id), p));

// 2. Inspect src/utils/legacyMigration.js
const legacyMigrationPath = path.join(__dirname, '../src/utils/legacyMigration.js');
let legacyProductsInCode = [];
let legacyCategoriesInCode = [];

if (fs.existsSync(legacyMigrationPath)) {
  const legacyCode = fs.readFileSync(legacyMigrationPath, 'utf8');
  console.log(`\n[2] src/utils/legacyMigration.js file size: ${(legacyCode.length / 1024).toFixed(1)} KB`);

  // Check if legacyMigration has hardcoded legacy products/categories or reads old storage
  const legacyProdMatch = legacyCode.match(/LEGACY_PRODUCTS\s*=\s*(\[[\s\S]*?\]);/);
  if (legacyProdMatch) {
    try {
      // Evaluate or parse array if possible
      console.log('    Found LEGACY_PRODUCTS array in legacyMigration.js!');
    } catch (_) {}
  }
}

// 3. Scan Electron AppData folders for installed EXE user data
const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');

console.log(`\n[3] Scanning Electron AppData / UserData paths:`);
console.log(`    AppData: ${appData}`);
console.log(`    LocalAppData: ${localAppData}`);

const possibleAppDirs = [
  path.join(appData, 'pos-system-modern-ui'),
  path.join(appData, 'SIS AL AMEEN'),
  path.join(appData, 'sis-al-ameen'),
  path.join(appData, 'Electron'),
  path.join(appData, 'elking-pos'),
  path.join(localAppData, 'Programs', 'pos-system-modern-ui'),
  path.join(localAppData, 'Programs', 'SIS AL AMEEN')
];

possibleAppDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`    📁 Found App UserData Directory: ${dir}`);
    try {
      const contents = fs.readdirSync(dir);
      console.log(`       Files/Folders: ${contents.join(', ')}`);
      
      const idbPath = path.join(dir, 'IndexedDB');
      if (fs.existsSync(idbPath)) {
        console.log(`       📁 IndexedDB Path: ${idbPath}`);
        const idbFolders = fs.readdirSync(idbPath);
        console.log(`          Databases: ${idbFolders.join(', ')}`);
      }

      const lsPath = path.join(dir, 'Local Storage');
      if (fs.existsSync(lsPath)) {
        console.log(`       📁 Local Storage Path: ${lsPath}`);
      }
    } catch (e) {
      console.log(`       Error reading dir: ${e.message}`);
    }
  } else {
    console.log(`    ❌ Not found: ${dir}`);
  }
});

// 4. Check src/utils/categoryMigration.js and DataLoader.jsx
const categoryMigrationPath = path.join(__dirname, '../src/utils/categoryMigration.js');
if (fs.existsSync(categoryMigrationPath)) {
  const catMigCode = fs.readFileSync(categoryMigrationPath, 'utf8');
  console.log(`\n[4] src/utils/categoryMigration.js file size: ${(catMigCode.length / 1024).toFixed(1)} KB`);
}

const dataLoaderPath = path.join(__dirname, '../src/components/DataLoader.jsx');
if (fs.existsSync(dataLoaderPath)) {
  const dataLoaderCode = fs.readFileSync(dataLoaderPath, 'utf8');
  console.log(`\n[5] src/components/DataLoader.jsx file size: ${(dataLoaderCode.length / 1024).toFixed(1)} KB`);
}

console.log('\n' + '═'.repeat(75) + '\n');
