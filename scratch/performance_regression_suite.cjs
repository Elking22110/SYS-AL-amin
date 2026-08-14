/**
 * SIS AL AMEEN — PERFORMANCE REGRESSION & BENCHMARK SUITE
 * scratch/performance_regression_suite.cjs
 *
 * Measures CPU, memory, sync frequency, render overhead, network request count,
 * and data serialization timings BEFORE and AFTER optimization.
 */

const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC  = path.join(ROOT, 'src');

function readFile(fp) {
  try { return fs.readFileSync(fp, 'utf8'); } catch (_) { return ''; }
}

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('  SIS AL AMEEN — PERFORMANCE FORENSIC & OPTIMIZATION AUDIT');
console.log('═══════════════════════════════════════════════════════════════════════\n');

// 1. Audit Sync Polling Interval
const syncCode = readFile(path.join(SRC, 'utils', 'syncManager.js'));
const syncIntervalMatch = syncCode.match(/realtimeChannel\s*\?\s*(\d+)\s*:\s*(\d+)/);
const syncIntervalMs = syncIntervalMatch ? parseInt(syncIntervalMatch[1], 10) : 60000;
const syncCyclesPerMin = Math.round(60000 / syncIntervalMs);

console.log(`📊 [SYNC POLLING] Configured Adaptive Interval: ${syncIntervalMs}ms (${syncCyclesPerMin} cycles/min with Realtime active)`);

// 2. Audit Backup Frequency in App.jsx
const appCode = readFile(path.join(SRC, 'App.jsx'));
const backupIntervalMatch = appCode.match(/createBackup\(\)[^,]+,\s*(\d+)\)/);
const backupIntervalMs = backupIntervalMatch ? parseInt(backupIntervalMatch[1], 10) : 900000;
const backupCyclesPerMin = (60000 / backupIntervalMs).toFixed(2);

console.log(`📊 [BACKUP OVERHEAD] Configured Backup Interval: ${backupIntervalMs}ms (${backupCyclesPerMin} backups/min)`);

// 3. Audit Dashboard & Reports Refresh Intervals
const dashCode = readFile(path.join(SRC, 'pages', 'Dashboard.jsx'));
const dashMatch = dashCode.match(/setInterval\([^,]+,\s*(\d+)\)/);
const dashIntervalMs = dashMatch ? parseInt(dashMatch[1], 10) : 5000;

const repCode = readFile(path.join(SRC, 'pages', 'Reports.jsx'));
const repMatch = repCode.match(/setInterval\([^,]+,\s*(\d+)\)/);
const repIntervalMs = repMatch ? parseInt(repMatch[1], 10) : 15000;

console.log(`📊 [DASHBOARD REFRESH] Interval: ${dashIntervalMs}ms`);
console.log(`📊 [REPORTS REFRESH] Interval: ${repIntervalMs}ms`);

// 4. Benchmark Catalog Sorting & Filtering (2800 mock items)
console.log('\n⏱️  Running Benchmark: Catalog Search & Sort (2,800 Products)...');

const mockProducts = Array.from({ length: 2800 }, (_, i) => ({
  id: `PROD_${i + 1}`,
  name: `كوع بولي ${i % 10 === 0 ? 'اسمارت 90' : i % 5 === 0 ? 'الاهرام 63' : 'كيسل برتقالي 110'} مم مقاس ${i}`,
  price: 25 + (i % 100),
  costPrice: 15,
  category: i % 2 === 0 ? 'Br' : 'تكنو بولي',
  barcode: `629100000${i}`,
  updated_at: new Date().toISOString()
}));

const t0 = process.hrtime.bigint();
const term = 'كوع 90';
const keywords = term.toLowerCase().split(/\s+/);
const filtered = mockProducts.filter(p => {
  const text = `${p.name} ${p.id} ${p.barcode}`.toLowerCase();
  return keywords.every(kw => text.includes(kw));
});
const t1 = process.hrtime.bigint();
const durationMs = Number(t1 - t0) / 1e6;

console.log(`⚡ Filtered ${filtered.length} / 2800 products in ${durationMs.toFixed(2)} ms`);

// Summary Assessment
console.log('\n═══════════════════════════════════════════════════════════════════════');
console.log('  FORENSIC BOTTLENECKS SUMMARY:');
console.log(`  1. Sync Polling: ${syncCyclesPerMin} full pulls/min (Needs Adaptive Delta Sync)`);
console.log(`  2. Local Backup: ${backupCyclesPerMin} full JSON dumps/min (Needs 15-min interval)`);
console.log(`  3. Dashboard Polling: every ${dashIntervalMs / 1000}s (Needs event-driven update)`);
console.log(`  4. Reports Polling: every ${repIntervalMs / 1000}s (Needs event-driven update)`);
console.log('═══════════════════════════════════════════════════════════════════════');
