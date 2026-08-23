/**
 * FIND EXACT 23 KESSEL PRODUCTS
 * ==============================
 * Scans git history, previous backups, and scratch JSON files for the exact 23 approved KESSEL products.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('1. Checking scratch backup JSON files for Kessel products...');
const scratchDir = __dirname;
const jsonFiles = fs.readdirSync(scratchDir).filter(f => f.endsWith('.json'));

jsonFiles.forEach(file => {
  try {
    const content = JSON.parse(fs.readFileSync(path.join(scratchDir, file), 'utf8'));
    const prods = Array.isArray(content) ? content : (content.products || []);
    const kessel = prods.filter(p => {
      if (!p) return false;
      const n = (p.name || '').toLowerCase();
      const m = String(p.main_category_id || p.mainCategoryId || '').toLowerCase();
      const s = String(p.sub_category_id || p.subCategoryId || p.category || '').toLowerCase();
      return n.includes('كيسيل') || n.includes('كيسل') || m.includes('كيسيل') || s.includes('كيسيل');
    });
    if (kessel.length > 0) {
      console.log(`  - File: ${file} → Total Kessel items: ${kessel.length}`);
    }
  } catch (_) {}
});

console.log('\n2. Searching git commits for Kessel product lists...');
try {
  const commitLogs = execSync('git log --grep="kessel" -i --oneline', { cwd: path.join(__dirname, '..') }).toString();
  console.log('Commit logs:', commitLogs || 'none');
} catch (e) {
  console.log('Error searching git:', e.message);
}
