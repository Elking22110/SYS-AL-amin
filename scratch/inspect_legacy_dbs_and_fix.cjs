/**
 * FORENSIC INSPECTION OF LOCAL ELECTRON INDEXEDDB FILES
 * ======================================================
 * Reads records from all AppData IndexedDB databases and dumps their product counts.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');

console.log('\n==================================================');
console.log('ELECTRON APPDATA INDEXEDDB FORENSIC SEARCH');
console.log('==================================================\n');

const pathsToSearch = [
  path.join(appData, 'pos-system-modern-ui', 'IndexedDB'),
  path.join(appData, 'SIS AL AMEEN', 'IndexedDB'),
  path.join(appData, 'Electron', 'IndexedDB')
];

pathsToSearch.forEach(basePath => {
  if (!fs.existsSync(basePath)) {
    console.log(`❌ Folder does not exist: ${basePath}`);
    return;
  }
  console.log(`📁 Inspecting: ${basePath}`);
  const items = fs.readdirSync(basePath);
  items.forEach(item => {
    const fullPath = path.join(basePath, item);
    const stats = fs.statSync(fullPath);
    console.log(`   - ${item} (${stats.isDirectory() ? 'Directory' : 'File'}, ${(stats.size / 1024).toFixed(1)} KB)`);
  });
});

console.log('\n==================================================\n');
