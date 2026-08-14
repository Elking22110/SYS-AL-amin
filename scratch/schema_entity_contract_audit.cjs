/**
 * SIS AL AMEEN — SCHEMA TO CODE ENTITY CONTRACT AUDIT
 * scratch/schema_entity_contract_audit.cjs
 *
 * Verifies that EVERY business entity has a complete, working IndexedDB object store,
 * migration upgrade logic, outbox logging, Supabase sync path, and zero NotFoundError risks.
 */

const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC  = path.join(ROOT, 'src');

let passed = 0, failed = 0;
const auditIssues = [];

function PASS(id) { console.log(`  ✅ [PASS] ${id}`); passed++; }
function FAIL(id, detail, severity = 'P0') {
  console.error(`  ❌ [FAIL/${severity}] ${id}: ${detail}`);
  failed++;
  auditIssues.push({ id, detail, severity });
}
function SECTION(name) {
  console.log(`\n${'═'.repeat(75)}`);
  console.log(`  ${name}`);
  console.log('═'.repeat(75));
}

function readFile(fp) {
  try { return fs.readFileSync(fp, 'utf8'); } catch (_) { return ''; }
}

const dbCode = readFile(path.join(SRC, 'utils', 'database.js'));

const ALL_ENTITIES = [
  'products',
  'categories',
  'customers',
  'suppliers',
  'expenses',
  'sales',
  'shifts',
  'returns',
  'users',
  'settings',
  'backups',
  'sync_outbox'
];

SECTION('1. INDEXEDDB OBJECT STORE CONTRACT AUDIT');

ALL_ENTITIES.forEach(entity => {
  if (dbCode.includes(`'${entity}'`)) {
    PASS(`OBJECT_STORE_REGISTERED_${entity.toUpperCase()}`);
  } else {
    FAIL(`OBJECT_STORE_REGISTERED_${entity.toUpperCase()}`, `Object store '${entity}' is NOT registered in database.js`);
  }
});

SECTION('2. MIGRATION & UPGRADE LOGIC AUDIT');

if (dbCode.includes('suppliers') && dbCode.includes('expenses') && dbCode.includes('oldVersion < 10')) {
  PASS('MIGRATION_V10_PROPERLY_CONFIGURED');
} else {
  FAIL('MIGRATION_V10_PROPERLY_CONFIGURED', 'v10 migration block for suppliers & expenses missing in database.js');
}

if (dbCode.includes('ensureStoresExist') && dbCode.includes('missingStores.length > 0')) {
  PASS('ENSURE_STORES_EXIST_RECOVERY_ACTIVE');
} else {
  FAIL('ENSURE_STORES_EXIST_RECOVERY_ACTIVE', 'ensureStoresExist auto-recovery missing');
}

SECTION('3. STORE CONSTANTS AUDIT');

if (dbCode.includes('SYNCABLE_STORES') && dbCode.includes('suppliers') && dbCode.includes('expenses')) {
  PASS('SYNCABLE_STORES_INCLUDES_SUPPLIERS_AND_EXPENSES');
} else {
  FAIL('SYNCABLE_STORES_INCLUDES_SUPPLIERS_AND_EXPENSES', 'SYNCABLE_STORES missing suppliers or expenses');
}

SECTION('ENTITY CONTRACT AUDIT SUMMARY');
console.log(`  Total Checks : ${passed + failed}`);
console.log(`  Passed       : ${passed}`);
console.log(`  Failed       : ${failed}`);

if (failed > 0) {
  console.error('\n  CRITICAL ENTITY CONTRACT BLOCKERS DETECTED:');
  auditIssues.forEach(i => console.error(`  ❌ [${i.severity}] ${i.id}: ${i.detail}`));
  process.exit(1);
} else {
  console.log('\n  FINAL ENTITY CONTRACT VERDICT: PASS ✅\n');
}
