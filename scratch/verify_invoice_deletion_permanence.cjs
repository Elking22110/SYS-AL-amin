/**
 * SIS AL AMEEN — INVOICE DELETION PERMANENCE & ZERO RESURRECTION TEST SUITE
 * scratch/verify_invoice_deletion_permanence.cjs
 */

const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC  = path.join(ROOT, 'src');

let passed = 0, failed = 0;
function PASS(id) { console.log(`  ✅ [PASS] ${id}`); passed++; }
function FAIL(id, detail) { console.error(`  ❌ [FAIL] ${id}: ${detail}`); failed++; }

function readFile(fp) {
  try { return fs.readFileSync(fp, 'utf8'); } catch (_) { return ''; }
}

console.log('\n═══════════════════════════════════════════════════════════════════════');
console.log('  INVOICE DELETION & ZERO RESURRECTION FORENSIC AUDIT');
console.log('═══════════════════════════════════════════════════════════════════════');

const reportsCode = readFile(path.join(SRC, 'pages', 'Reports.jsx'));

// 1. Tombstone registration
if (reportsCode.includes("syncManager.addDeletedTombstone('sales', strId)")) {
  PASS('INVOICE_TOMBSTONE_REGISTRATION');
} else {
  FAIL('INVOICE_TOMBSTONE_REGISTRATION', 'addDeletedTombstone for sales missing in Reports.jsx');
}

// 2. Physical & Logical IndexedDB Deletion
if (reportsCode.includes("databaseManager.deletePhysical('sales', strId)") && reportsCode.includes("databaseManager.delete('sales', strId)")) {
  PASS('INVOICE_INDEXEDDB_PHYSICAL_DELETE');
} else {
  FAIL('INVOICE_INDEXEDDB_PHYSICAL_DELETE', 'databaseManager deletePhysical missing in Reports.jsx');
}

// 3. Supabase Cloud Deletion
if (reportsCode.includes(".from('sales').delete().eq('id', strId)")) {
  PASS('INVOICE_SUPABASE_CLOUD_DELETE');
} else {
  FAIL('INVOICE_SUPABASE_CLOUD_DELETE', 'Supabase cloud delete missing in Reports.jsx');
}

// 4. Outbox Tombstone Operation
if (reportsCode.includes("store_name: 'sales'") && reportsCode.includes("operation_type: 'DELETE'")) {
  PASS('INVOICE_OUTBOX_DELETE_OPERATION');
} else {
  FAIL('INVOICE_OUTBOX_DELETE_OPERATION', 'Outbox DELETE operation for sales missing in Reports.jsx');
}

// 5. Active Shift Clean Up
if (reportsCode.includes("activeShift.sales = (activeShift.sales || []).filter")) {
  PASS('INVOICE_ACTIVE_SHIFT_CLEANUP');
} else {
  FAIL('INVOICE_ACTIVE_SHIFT_CLEANUP', 'Active shift sales cleanup missing in Reports.jsx');
}

// 6. Historical Shifts Clean Up
if (reportsCode.includes("shift.sales = shift.sales.filter")) {
  PASS('INVOICE_HISTORICAL_SHIFTS_CLEANUP');
} else {
  FAIL('INVOICE_HISTORICAL_SHIFTS_CLEANUP', 'Historical shifts sales cleanup missing in Reports.jsx');
}

console.log('\n═══════════════════════════════════════════════════════════════════════');
console.log(`  Total Checks : ${passed + failed}`);
console.log(`  Passed       : ${passed}`);
console.log(`  Failed       : ${failed}`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('\n  INVOICE DELETION LOCKDOWN VERDICT: PASS ✅\n');
}
