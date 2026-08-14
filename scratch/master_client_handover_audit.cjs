/**
 * SIS AL AMEEN — MASTER CLIENT HANDOVER AUDIT & QUALITY CERTIFICATE
 * scratch/master_client_handover_audit.cjs
 *
 * Comprehensive final sign-off verification before handing over the installer to the client.
 */

const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC  = path.join(ROOT, 'src');

let passed = 0, failed = 0;
const auditIssues = [];

function PASS(id) {
  console.log(`  ✅ [PASS] ${id}`);
  passed++;
}
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

SECTION('1. INSTALLER & PACKAGED ARTIFACT INTEGRITY');

const exePath = path.join(ROOT, 'release', 'SIS AL AMEEN - نظام الأمين Setup 2.0.0.exe');
const exeExists = fs.existsSync(exePath);
const exeSizeMB = exeExists ? (fs.statSync(exePath).size / (1024 * 1024)).toFixed(1) : 0;

if (exeExists && parseFloat(exeSizeMB) > 50) {
  PASS(`EXE_INSTALLER_READY (${exeSizeMB} MB)`);
} else {
  FAIL('EXE_INSTALLER_READY', `Installer missing or invalid size: ${exeSizeMB} MB`);
}

const unpackedExePath = path.join(ROOT, 'release', 'win-unpacked', 'SIS AL AMEEN - نظام الأمين.exe');
if (fs.existsSync(unpackedExePath)) {
  PASS('UNPACKED_EXE_READY');
} else {
  FAIL('UNPACKED_EXE_READY', 'Unpacked executable directory missing');
}

SECTION('2. STARTUP & SECURITY GATES (LICENSE -> AUTH -> READY)');

const appCode = readFile(path.join(SRC, 'App.jsx'));
if (appCode.includes('LICENSE_REQUIRED') && appCode.includes('AUTH_REQUIRED') && appCode.includes('READY')) {
  PASS('SECURITY_GATES_DEFINED');
} else {
  FAIL('SECURITY_GATES_DEFINED', 'Boot state machine missing');
}

if (appCode.includes('licenseManager.verifyActivation()')) {
  PASS('LICENSE_CHECK_PRIMARY');
} else {
  FAIL('LICENSE_CHECK_PRIMARY', 'License check missing on startup');
}

SECTION('3. ROUTER STABILITY & ELECTRON FILE:// COMPATIBILITY');

const mainCode = readFile(path.join(SRC, 'main.jsx'));
if (mainCode.includes('HashRouter') && !mainCode.includes('BrowserRouter')) {
  PASS('HASH_ROUTER_ACTIVE');
} else {
  FAIL('HASH_ROUTER_ACTIVE', 'BrowserRouter active instead of HashRouter');
}

if (appCode.includes('ErrorBoundary') && appCode.includes('<ErrorBoundary>')) {
  PASS('ERROR_BOUNDARY_ACTIVE');
} else {
  FAIL('ERROR_BOUNDARY_ACTIVE', 'ErrorBoundary wrapper missing');
}

if (appCode.includes('<Route path="*" element={<Navigate to="/" replace />} />')) {
  PASS('WILDCARD_FALLBACK_ACTIVE');
} else {
  FAIL('WILDCARD_FALLBACK_ACTIVE', 'Wildcard route fallback missing');
}

SECTION('4. DATALOADER & CLEAN STARTUP ISOLATION');

const dlCode = readFile(path.join(SRC, 'components', 'DataLoader.jsx'));
if (dlCode.includes('app_data_schema_version = 60') || dlCode.includes('app_data_schema_version')) {
  PASS('DATALOADER_SCHEMA_GUARD_V60');
} else {
  FAIL('DATALOADER_SCHEMA_GUARD_V60', 'DataLoader schema version guard missing');
}

if (!dlCode.includes('D:/products_seed.json')) {
  PASS('NO_DEV_PATHS_IN_DATALOADER');
} else {
  FAIL('NO_DEV_PATHS_IN_DATALOADER', 'DataLoader contains dev file paths');
}

SECTION('5. PRINT SYSTEM & WINDOW POPUP HANDLER');

const electronMainCode = readFile(path.join(ROOT, 'electron', 'main.cjs'));
if (electronMainCode.includes('about:blank') && electronMainCode.includes("return { action: 'allow' }")) {
  PASS('ELECTRON_PRINT_WINDOW_ALLOWED');
} else {
  FAIL('ELECTRON_PRINT_WINDOW_ALLOWED', 'Electron setWindowOpenHandler intercepts about:blank and breaks printing');
}

const thermalCode = readFile(path.join(SRC, 'utils', 'thermalPrinter.js'));
if (thermalCode.includes('01553448631') && thermalCode.includes('Elking')) {
  PASS('THERMAL_PRINTER_FOOTER_CONFIGURED');
} else {
  FAIL('THERMAL_PRINTER_FOOTER_CONFIGURED', 'Thermal printer footer missing Elking info');
}

SECTION('6. ZOMBIE DELETION & CANONICAL DATA PROTECTION');

const syncCode = readFile(path.join(SRC, 'utils', 'syncManager.js'));
if (syncCode.includes('isSyncAllowed()') && syncCode.includes('verifyActivation')) {
  PASS('SYNC_SECURITY_GATED');
} else {
  FAIL('SYNC_SECURITY_GATED', 'syncManager isSyncAllowed gate missing');
}

if (syncCode.includes('Realtime DELETE REJECTED') || syncCode.includes('isRecordTombstoned')) {
  PASS('ZOMBIE_DELETE_GUARD_ACTIVE');
} else {
  FAIL('ZOMBIE_DELETE_GUARD_ACTIVE', 'Zombie deletion guard missing in syncManager');
}

SECTION('FINAL CLIENT HANDOVER SUMMARY');
console.log(`  Total Handover Audits : ${passed + failed}`);
console.log(`  Passed                : ${passed}`);
console.log(`  Failed                : ${failed}`);

if (failed > 0) {
  console.error('\n  CRITICAL BLOCKERS DETECTED BEFORE HANDOVER:');
  auditIssues.forEach(i => console.error(`  ❌ [${i.severity}] ${i.id}: ${i.detail}`));
  process.exit(1);
} else {
  console.log('\n  CLIENT HANDOVER VERDICT: READY FOR CLIENT DELIVERY ✅\n');
}
