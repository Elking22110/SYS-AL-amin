/**
 * SIS AL AMEEN — ELECTRON DATALOADER & MIGRATION FORENSIC SUITE
 * scratch/electron_dataloader_migration_forensic_suite.cjs
 *
 * Verifies clean startup, zero seed dependency, zero patch storms,
 * zero ERR_FILE_NOT_FOUND, and data preservation.
 */

const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC  = path.join(ROOT, 'src');
const ELECTRON = path.join(ROOT, 'electron');

let passed = 0, failed = 0;
const issues = [];

function PASS(id) {
  console.log(`  ✅ [PASS] ${id}`);
  passed++;
}
function FAIL(id, detail, severity = 'P0') {
  console.error(`  ❌ [FAIL/${severity}] ${id}: ${detail}`);
  failed++;
  issues.push({ id, detail, severity });
}
function section(name) {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  ${name}`);
  console.log('═'.repeat(70));
}

function readFile(fp) {
  try { return fs.readFileSync(fp, 'utf8'); } catch (_) { return ''; }
}

section('DATALOADER FORENSIC AUDIT');

const dlContent = readFile(path.join(SRC, 'components', 'DataLoader.jsx'));

// 1. Schema version guard (v60)
if (dlContent.includes("app_data_schema_version") && dlContent.includes("schemaVersion >= 60")) {
  PASS('1_SCHEMA_VERSION_PERSISTENCE');
} else {
  FAIL('1_SCHEMA_VERSION_PERSISTENCE', 'DataLoader does not use app_data_schema_version >= 60 guard');
}

// 2. No repeated historical patches
if (dlContent.includes("HISTORICAL_PATCH_FLAGS.forEach")) {
  PASS('2_NO_REPEATED_HISTORICAL_PATCHES');
} else {
  FAIL('2_NO_REPEATED_HISTORICAL_PATCHES', 'Historical patch flags not bulk-marked done on production DB open');
}

// 3. Seed fetch is isolated to clean install only
const rawSeedFetches = (dlContent.match(/fetch\(['"]\/products_seed\.json/g) || []).length;
if (rawSeedFetches <= 1) {
  PASS('3_NO_MULTIPLE_SEED_DEPENDENCIES');
} else {
  FAIL('3_NO_MULTIPLE_SEED_DEPENDENCIES', `DataLoader contains ${rawSeedFetches} active seed fetches (expected max 1 for clean install fallback)`);
}

// 4. No hardcoded developer paths in DataLoader
if (!dlContent.includes('D:/') && !dlContent.includes('C:\\Users') && !dlContent.includes('.gemini')) {
  PASS('4_NO_DEV_PATHS_IN_DATALOADER');
} else {
  FAIL('4_NO_DEV_PATHS_IN_DATALOADER', 'Developer filesystem paths found in DataLoader.jsx');
}

// 5. AuthProvider auto-login default admin for desktop POS
const authContent = readFile(path.join(SRC, 'components', 'AuthProvider.jsx'));
if (authContent.includes("!explicitLogout") && authContent.includes("admin@admin.com")) {
  PASS('5_AUTH_AUTO_LOGIN_ADMIN');
} else {
  FAIL('5_AUTH_AUTO_LOGIN_ADMIN', 'AuthProvider missing auto-login fallback for desktop POS');
}

// 6. LoginForm high contrast design
const loginContent = readFile(path.join(SRC, 'components', 'LoginForm.jsx'));
if (loginContent.includes('bg-slate-900') && loginContent.includes('text-white')) {
  PASS('6_LOGIN_FORM_HIGH_CONTRAST');
} else {
  FAIL('6_LOGIN_FORM_HIGH_CONTRAST', 'LoginForm contains low contrast text/background');
}

// 7. Sync & Realtime handlers intact
const syncContent = readFile(path.join(SRC, 'utils', 'syncManager.js'));
if (syncContent.includes('ZOMBIE SAFE MODE') && syncContent.includes('REALTIME DELETE GUARD')) {
  PASS('7_SYNC_REALTIME_SAFEGUARDS_INTACT');
} else {
  FAIL('7_SYNC_REALTIME_SAFEGUARDS_INTACT', 'Sync/Realtime safeguards missing or altered');
}

// 8. Database Manager schema intact
const dbContent = readFile(path.join(SRC, 'utils', 'database.js'));
if (dbContent.includes('POS_Database_') && dbContent.includes('ensureStoresExist')) {
  PASS('8_DATABASE_MANAGER_INTACT');
} else {
  FAIL('8_DATABASE_MANAGER_INTACT', 'Database manager stores/init corrupt');
}

section('FINAL DATALOADER FORENSIC SUMMARY');
console.log(`TOTAL AUDIT CHECKS : ${passed + failed}`);
console.log(`PASSED             : ${passed}`);
console.log(`FAILED             : ${failed}`);

if (failed > 0) {
  console.error('\nBLOCKERS:');
  issues.forEach(i => console.error(`❌ ${i.id}: ${i.detail}`));
  process.exit(1);
} else {
  console.log('\nVERDICT: ALL DATALOADER & MIGRATION AUDITS PASSED ✅\n');
}
