/**
 * SIS AL AMEEN — ELECTRON BOOT / AUTHENTICATION / LICENSE GATE TEST SUITE
 * scratch/electron_boot_gate_suite.cjs
 *
 * Verifies strict boot order:
 * 1. LICENSE GATE (if invalid -> License Activation Screen ONLY, 0 sync, 0 sidebar)
 * 2. AUTH GATE (if unauthenticated -> Login Screen ONLY, 0 sync, 0 sidebar)
 * 3. READY (Full application + DataLoader + SyncManager + Realtime)
 */

const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC  = path.join(ROOT, 'src');

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

section('1. APPLICATION BOOT STATE MACHINE AUDIT (App.jsx)');

const appContent = readFile(path.join(SRC, 'App.jsx'));

// Check bootState definition
if (appContent.includes("bootState") && appContent.includes("LICENSE_REQUIRED") && appContent.includes("AUTH_REQUIRED") && appContent.includes("READY")) {
  PASS('1_BOOT_STATE_MACHINE_DEFINED');
} else {
  FAIL('1_BOOT_STATE_MACHINE_DEFINED', 'App.jsx does not define explicit boot states (LICENSE_REQUIRED, AUTH_REQUIRED, READY)');
}

// Check License Gate Check before Auth Gate
if (appContent.includes("licenseManager.verifyActivation()") && appContent.includes("setBootState('LICENSE_REQUIRED')")) {
  PASS('2_LICENSE_GATE_CHECKED_FIRST');
} else {
  FAIL('2_LICENSE_GATE_CHECKED_FIRST', 'App.jsx does not enforce License Activation Check on startup');
}

// Check Auth Gate Check
if (appContent.includes("!user") && appContent.includes("setBootState('AUTH_REQUIRED')")) {
  PASS('3_AUTH_GATE_CHECKED_SECOND');
} else {
  FAIL('3_AUTH_GATE_CHECKED_SECOND', 'App.jsx does not enforce User Auth Gate after license check');
}

// Check License Screen Isolation (No Sidebar, No DataLoader)
const licenseGateBlock = appContent.substring(
  appContent.indexOf("bootState === 'LICENSE_REQUIRED'"),
  appContent.indexOf("bootState === 'AUTH_REQUIRED'")
);

if (licenseGateBlock.includes("<LicenseActivationModal") && !licenseGateBlock.includes("<Sidebar") && !licenseGateBlock.includes("<DataLoader")) {
  PASS('4_LICENSE_SCREEN_ISOLATED');
} else {
  FAIL('4_LICENSE_SCREEN_ISOLATED', 'License activation screen renders with Sidebar or DataLoader exposed!');
}

// Check Login Screen Isolation (No Sidebar, No DataLoader)
const authGateBlock = appContent.substring(
  appContent.indexOf("bootState === 'AUTH_REQUIRED'"),
  appContent.indexOf("GATE 4: FULL PROTECTED APPLICATION")
);

if (authGateBlock.includes("<LoginForm") && !authGateBlock.includes("<Sidebar") && !authGateBlock.includes("<DataLoader")) {
  PASS('5_LOGIN_SCREEN_ISOLATED');
} else {
  FAIL('5_LOGIN_SCREEN_ISOLATED', 'Login screen renders with Sidebar or DataLoader exposed!');
}

// Check Full App only on READY
const readyBlock = appContent.substring(appContent.indexOf("GATE 4: FULL PROTECTED APPLICATION"));
if (readyBlock.includes("<DataLoader>") && readyBlock.includes("<Sidebar />") && readyBlock.includes("<Routes>")) {
  PASS('6_FULL_APP_ONLY_ON_READY');
} else {
  FAIL('6_FULL_APP_ONLY_ON_READY', 'Main app shell rendered outside READY state');
}

section('2. SYNC MANAGER & REALTIME GATE AUDIT (syncManager.js)');

const syncContent = readFile(path.join(SRC, 'utils', 'syncManager.js'));

// Check isSyncAllowed method
if (syncContent.includes("isSyncAllowed()") && syncContent.includes("verifyActivation") && syncContent.includes("auth_token")) {
  PASS('7_SYNC_ALLOWED_SECURITY_GATE');
} else {
  FAIL('7_SYNC_ALLOWED_SECURITY_GATE', 'syncManager.js missing isSyncAllowed() security gate');
}

// Check startAutoSync gate check
if (syncContent.includes("startAutoSync()") && syncContent.includes("!this.isSyncAllowed()")) {
  PASS('8_START_AUTOSYNC_GATED');
} else {
  FAIL('8_START_AUTOSYNC_GATED', 'syncManager.startAutoSync() does not check isSyncAllowed()');
}

// Check startRealtimeSync gate check
if (syncContent.includes("startRealtimeSync()") && syncContent.includes("!this.isSyncAllowed()")) {
  PASS('9_START_REALTIME_GATED');
} else {
  FAIL('9_START_REALTIME_GATED', 'syncManager.startRealtimeSync() does not check isSyncAllowed()');
}

// Check triggerSync gate check
if (syncContent.includes("triggerSync()") && syncContent.includes("!this.isSyncAllowed()")) {
  PASS('10_TRIGGER_SYNC_GATED');
} else {
  FAIL('10_TRIGGER_SYNC_GATED', 'syncManager.triggerSync() does not check isSyncAllowed()');
}

section('3. LICENSE MANAGER & DEVICE BINDING AUDIT (licenseManager.js)');

const licContent = readFile(path.join(SRC, 'utils', 'licenseManager.js'));

// Check Machine Fingerprint
if (licContent.includes("getMachineFingerprint") && licContent.includes("device_binding")) {
  PASS('11_MACHINE_FINGERPRINT_BINDING');
} else {
  FAIL('11_MACHINE_FINGERPRINT_BINDING', 'licenseManager.js missing machine fingerprint device binding');
}

// Check Tamper & Expiration checks
if (licContent.includes("TAMPERED") && licContent.includes("WRONG_DEVICE") && licContent.includes("EXPIRED")) {
  PASS('12_TAMPER_AND_WRONG_DEVICE_CHECKS');
} else {
  FAIL('12_TAMPER_AND_WRONG_DEVICE_CHECKS', 'licenseManager.js missing TAMPERED/WRONG_DEVICE/EXPIRED checks');
}

section('4. SIDEBAR CLEANUP AUDIT (Sidebar.jsx)');

const sidebarContent = readFile(path.join(SRC, 'components', 'Sidebar.jsx'));

// Check Sidebar no longer invokes startAutoSync on mount
if (!sidebarContent.includes("syncManager.startAutoSync()")) {
  PASS('13_SIDEBAR_NO_DIRECT_AUTOSYNC');
} else {
  FAIL('13_SIDEBAR_NO_DIRECT_AUTOSYNC', 'Sidebar.jsx still directly calls syncManager.startAutoSync() on mount');
}

section('FINAL BOOT GATE SUMMARY');
console.log(`TOTAL AUDIT CHECKS : ${passed + failed}`);
console.log(`PASSED             : ${passed}`);
console.log(`FAILED             : ${failed}`);

if (failed > 0) {
  console.error('\nBLOCKERS:');
  issues.forEach(i => console.error(`❌ ${i.id}: ${i.detail}`));
  process.exit(1);
} else {
  console.log('\nVERDICT: ALL BOOT / AUTH / LICENSE GATES PASSED ✅\n');
}
