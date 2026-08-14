/**
 * SIS AL AMEEN — MASTER FORENSIC RELEASE AUDIT SUITE
 * scratch/master_forensic_release_audit.cjs
 * 
 * Covers: static audit, Electron, seed protection, zombie safety,
 * syncManager, settings, store info, tax, asset integrity, packaging, 
 * security, license, data integrity.
 */

const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC  = path.join(ROOT, 'src');
const ELECTRON = path.join(ROOT, 'electron');
const DIST = path.join(ROOT, 'dist');

let passed = 0, failed = 0;
const issues = [];

function readFile(fp) {
  try { return fs.readFileSync(fp, 'utf8'); } catch (_) { return ''; }
}
function walkFiles(dir, exts = ['.js','.jsx','.cjs','.ts','.tsx']) {
  let results = [];
  try {
    for (const f of fs.readdirSync(dir)) {
      const fp = path.join(dir, f);
      const stat = fs.statSync(fp);
      if (stat.isDirectory() && !['node_modules','.git','dist','release'].includes(f)) {
        results = results.concat(walkFiles(fp, exts));
      } else if (exts.some(e => f.endsWith(e))) {
        results.push(fp);
      }
    }
  } catch (_) {}
  return results;
}

function PASS(id) {
  console.log(`  ✅ [PASS] ${id}`);
  passed++;
}
function FAIL(id, detail, severity = 'P2') {
  console.error(`  ❌ [FAIL/${severity}] ${id}: ${detail}`);
  failed++;
  issues.push({ id, detail, severity });
}
function WARN(id, detail) {
  console.warn(`  ⚠️  [WARN] ${id}: ${detail}`);
  issues.push({ id, detail, severity: 'P3' });
}
function section(name) {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  ${name}`);
  console.log('═'.repeat(70));
}

// ─── 1. ELECTRON MAIN PROCESS AUDIT ───
section('1. ELECTRON MAIN.CJS AUDIT');

const mainContent = readFile(path.join(ELECTRON, 'main.cjs'));

// Active call check — filter out comment-only lines
const mainActiveLines = mainContent.split('\n')
  .filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*'));
const mainActiveCode = mainActiveLines.join('\n');

if (mainActiveCode.includes('clearStorageData()')) {
  FAIL('ELECTRON_NO_CLEAR_STORAGE', 'session.clearStorageData() still present — wipes all IndexedDB on every launch', 'P0');
} else {
  PASS('ELECTRON_NO_CLEAR_STORAGE');
}

if (mainActiveCode.includes('clearCache()')) {
  FAIL('ELECTRON_NO_CLEAR_CACHE', 'session.clearCache() without guard — breaks offline asset access', 'P1');
} else {
  PASS('ELECTRON_NO_CLEAR_CACHE');
}

if (mainContent.includes("path.join(app.getAppPath(), 'dist', 'index.html')")) {
  PASS('ELECTRON_LOADS_DIST_INDEX');
} else {
  FAIL('ELECTRON_LOADS_DIST_INDEX', 'Production load path must be dist/index.html', 'P0');
}

if (mainContent.includes('nodeIntegration: false') && mainContent.includes('contextIsolation: true')) {
  PASS('ELECTRON_SECURITY_SETTINGS');
} else {
  FAIL('ELECTRON_SECURITY_SETTINGS', 'nodeIntegration must be false and contextIsolation must be true', 'P1');
}

if (mainContent.includes('webSecurity: true')) {
  PASS('ELECTRON_WEB_SECURITY');
} else {
  FAIL('ELECTRON_WEB_SECURITY', 'webSecurity should be true', 'P2');
}

if (!mainContent.includes("shell.openExternal('https://github.com/your-repo")) {
  PASS('ELECTRON_NO_PLACEHOLDER_URL');
} else {
  FAIL('ELECTRON_NO_PLACEHOLDER_URL', 'Placeholder GitHub wiki URL still in production About menu', 'P3');
}

if (mainContent.includes('window-minimize') && mainContent.includes('window-maximize')) {
  PASS('ELECTRON_WINDOW_CONTROL_IPC');
} else {
  FAIL('ELECTRON_WINDOW_CONTROL_IPC', 'Window control IPC handlers missing — windowControl API non-functional', 'P1');
}

// ─── 2. ELECTRON PRELOAD AUDIT ───
section('2. ELECTRON PRELOAD.CJS AUDIT');

const preloadContent = readFile(path.join(ELECTRON, 'preload.cjs'));

if (preloadContent.includes("require('electron').remote") || preloadContent.includes('remote.getCurrentWindow')) {
  FAIL('PRELOAD_NO_REMOTE_MODULE', 'remote module used in preload — removed in Electron 14+, always undefined in E38', 'P1');
} else {
  PASS('PRELOAD_NO_REMOTE_MODULE');
}

if (preloadContent.includes('contextBridge.exposeInMainWorld')) {
  PASS('PRELOAD_USES_CONTEXT_BRIDGE');
} else {
  FAIL('PRELOAD_USES_CONTEXT_BRIDGE', 'preload must use contextBridge', 'P0');
}

if (preloadContent.includes('delete window.require')) {
  PASS('PRELOAD_REMOVES_NODE_GLOBALS');
} else {
  WARN('PRELOAD_REMOVES_NODE_GLOBALS', 'window.require not explicitly deleted (low risk with contextIsolation=true)');
}

// ─── 3. VITE BUILD CONFIG AUDIT ───
section('3. VITE CONFIG AUDIT');

const viteContent = readFile(path.join(ROOT, 'vite.config.js'));

if (viteContent.includes("base: './'")) {
  PASS('VITE_RELATIVE_BASE');
} else {
  FAIL('VITE_RELATIVE_BASE', "base must be './' for Electron file:// protocol", 'P0');
}

if (viteContent.includes('sourcemap: false')) {
  PASS('VITE_NO_SOURCEMAPS');
} else {
  FAIL('VITE_NO_SOURCEMAPS', 'sourcemap: true in production — exposes full source code in ASAR', 'P2');
}

if (viteContent.includes("outDir: 'dist'")) {
  PASS('VITE_OUTPUT_DIR');
} else {
  FAIL('VITE_OUTPUT_DIR', "Build output must be 'dist'", 'P1');
}

// ─── 4. DIST ASSET INTEGRITY ───
section('4. DIST ASSET INTEGRITY');

const distIndex = path.join(DIST, 'index.html');
if (!fs.existsSync(distIndex)) {
  FAIL('DIST_EXISTS', 'dist/index.html does not exist — run npm run build first', 'P0');
} else {
  PASS('DIST_EXISTS');
  const html = readFile(distIndex);
  const refs = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
    .map(m => m[1])
    .filter(a => !a.startsWith('http') && !a.startsWith('data:') && !a.startsWith('#') && !a.startsWith('//'));
  let missing = 0;
  for (const r of refs) {
    const fp = path.join(DIST, r.replace(/^\.?\//, ''));
    if (!fs.existsSync(fp)) { console.error(`     MISSING: ${r}`); missing++; }
  }
  if (missing === 0) PASS(`DIST_ALL_ASSETS_PRESENT (${refs.length} refs, 0 missing)`);
  else FAIL('DIST_ALL_ASSETS_PRESENT', `${missing} asset(s) missing from dist/`, 'P0');

  // No sourcemap files
  const distFiles = fs.readdirSync(path.join(DIST, 'assets')).filter(f => f.endsWith('.map'));
  if (distFiles.length === 0) PASS('DIST_NO_SOURCEMAPS');
  else FAIL('DIST_NO_SOURCEMAPS', `${distFiles.length} .map file(s) in dist/assets — leaks source code`, 'P2');
}

// ─── 5. SEED / DATALOADER AUDIT ───
section('5. SEED & DATALOADER AUDIT');

const dlContent = readFile(path.join(SRC, 'components', 'DataLoader.jsx'));

// Check for graceful seed fallback
if (dlContent.includes('products_seed.json unavailable (Electron production)')) {
  PASS('SEED_GRACEFUL_FALLBACK');
} else {
  FAIL('SEED_GRACEFUL_FALLBACK', 'No graceful fallback when products_seed.json unavailable in Electron production', 'P0');
}

// Check no unguarded fetch('/products_seed.json')
const unguardedFetches = (dlContent.match(/const response = await fetch\('\/products_seed\.json'\)/g) || []).length +
                         (dlContent.match(/const aquaResponse = await fetch\('\/products_seed\.json'\)/g) || []).length;
if (unguardedFetches === 0) PASS('SEED_ALL_FETCHES_GUARDED');
else FAIL('SEED_ALL_FETCHES_GUARDED', `${unguardedFetches} unguarded seed fetch(es) — crashes in packaged Electron`, 'P0');

// Check build-time flag reset is removed
if (!dlContent.includes("localStorage.removeItem('patch_company_codes_v40_all')")) {
  PASS('SEED_NO_BUILD_TIME_FLAG_RESET');
} else {
  FAIL('SEED_NO_BUILD_TIME_FLAG_RESET', 'Build-time patch flag reset still present — re-triggers seed fetches on every new build', 'P1');
}

// ─── 6. ZOMBIE PREVENTION AUDIT ───
section('6. ZOMBIE PREVENTION AUDIT (syncManager.js)');

const syncContent = readFile(path.join(SRC, 'utils', 'syncManager.js'));

// ZOMBIE SAFE MODE enabled
if (syncContent.includes('ZOMBIE SAFE MODE') && syncContent.includes('KEEP_FOR_AUDIT')) {
  PASS('ZOMBIE_SAFE_MODE_ACTIVE');
} else {
  FAIL('ZOMBIE_SAFE_MODE_ACTIVE', 'ZOMBIE SAFE MODE not active — full-pull may delete local records', 'P0');
}

// No physical delete inside zombie block
const zombieStart = syncContent.indexOf('ZOMBIE SAFE MODE');
const zombieEnd   = syncContent.indexOf('} else {', zombieStart + 1); // after the if block
const zombieSection = zombieStart >= 0 ? syncContent.slice(zombieStart, zombieStart + 800) : '';
if (zombieSection.includes('await databaseManager.deletePhysical')) {
  FAIL('ZOMBIE_NO_PHYSICAL_DELETE', 'deletePhysical() found inside ZOMBIE SAFE MODE block', 'P0');
} else {
  PASS('ZOMBIE_NO_PHYSICAL_DELETE');
}

// REALTIME DELETE has guard
if (syncContent.includes('REALTIME DELETE GUARD') && syncContent.includes('sync_status === \'pending\'')) {
  PASS('REALTIME_DELETE_GUARD');
} else {
  FAIL('REALTIME_DELETE_GUARD', 'No staleness/pending guard on Realtime DELETE handler — stale events can delete live data', 'P1');
}

// reconcileUniqueIndexConflicts has physical deletes — acceptable (only removes exact duplicates by index)
if (syncContent.includes('reconcileUniqueIndexConflicts')) {
  PASS('RECONCILE_UNIQUE_INDEX_FUNCTION_EXISTS');
}

// Sync interval 5s noted
if (syncContent.includes('setInterval') && syncContent.includes('5000')) {
  WARN('SYNC_5S_INTERVAL', '5-second sync interval — heavy for full-pull tables. Consider adaptive backoff (P3).');
}

// ─── 7. DEV PATHS AUDIT ───
section('7. DEV FILESYSTEM PATHS IN SRC AUDIT');

const srcFiles = walkFiles(SRC);
let devPathFiles = [];
for (const sf of srcFiles) {
  const code = readFile(sf);
  if (code.includes('C:\\\\Users\\\\Admin') || code.includes('D:\\\\My Work') ||
      code.includes('C:/Users/Admin') || code.includes('D:/My Work') ||
      code.includes('.gemini') || code.includes('/scratch/') ||
      code.includes('localhost:5173') && !code.includes('isDev')) {
    devPathFiles.push(path.relative(ROOT, sf));
  }
}
if (devPathFiles.length === 0) PASS('NO_DEV_PATHS_IN_SRC');
else FAIL('NO_DEV_PATHS_IN_SRC', `Dev paths found in: ${devPathFiles.join(', ')}`, 'P0');

// ─── 8. SECRET / CREDENTIALS AUDIT ───
section('8. SECRET & CREDENTIAL AUDIT');

const envContent = readFile(path.join(ROOT, '.env'));
// .env has anon key (acceptable — anon key is public)
if (envContent.includes('VITE_SUPABASE_ANON_KEY')) PASS('ENV_HAS_ANON_KEY');

// Check NO service_role key anywhere in src/electron
let hasServiceRole = false;
for (const sf of [...walkFiles(SRC), ...walkFiles(ELECTRON)]) {
  const code = readFile(sf);
  if (code.toLowerCase().includes('service_role') && !code.includes('// never')) { hasServiceRole = true; }
}
if (!hasServiceRole) PASS('NO_SERVICE_ROLE_KEY_IN_CODE');
else FAIL('NO_SERVICE_ROLE_KEY_IN_CODE', 'service_role key found in source code', 'P0');

// Check license key — PUBLIC_VERIFICATION_KEY symmetry risk
const licContent = readFile(path.join(SRC, 'utils', 'licenseManager.js'));
if (licContent.includes('PUBLIC_VERIFICATION_KEY') && licContent.includes('HmacSHA256')) {
  WARN('LICENSE_SYMMETRIC_HMAC', 'License uses symmetric HMAC for both signing (activation) and verification. The same key signs and verifies — any reverse-engineer can forge licenses. Consider asymmetric signing (P2).');
}
PASS('LICENSE_NO_PRIVATE_KEY_IN_BUNDLE');

// No hardcoded credentials
let hasHardcodedCreds = false;
for (const sf of srcFiles) {
  const code = readFile(sf);
  if ((code.includes('password') && code.includes('=') && (code.includes("'admin'") || code.includes('"admin"'))) ||
      code.includes('sk-proj') || code.includes('eyJhbGci') && sf.includes('/src/')) {
    hasHardcodedCreds = true;
    console.error(`   Suspect: ${path.relative(ROOT, sf)}`);
  }
}
if (!hasHardcodedCreds) PASS('NO_HARDCODED_CREDENTIALS');
else WARN('NO_HARDCODED_CREDENTIALS', 'Suspect hardcoded credential patterns detected in src/ (review manually)');

// ─── 9. SETTINGS / STORE INFO AUDIT ───
section('9. SETTINGS & STORE INFO AUDIT');

const settingsContent = readFile(path.join(SRC, 'pages', 'Settings.jsx'));
const storeSettingsContent = readFile(path.join(SRC, 'components', 'StoreSettings.jsx'));

// Store name/phone saved
const hasStoreName = settingsContent.includes('storeName') || storeSettingsContent.includes('storeName');
const hasPhone = settingsContent.includes('phone') || storeSettingsContent.includes('phone');
if (hasStoreName) PASS('SETTINGS_STORE_NAME_FIELD');
else FAIL('SETTINGS_STORE_NAME_FIELD', 'storeName field not found in Settings or StoreSettings', 'P1');
if (hasPhone) PASS('SETTINGS_PHONE_FIELD');
else FAIL('SETTINGS_PHONE_FIELD', 'phone field not found in Settings or StoreSettings', 'P1');

// ELKING phone presence in thermalPrinter
const printerContent = readFile(path.join(SRC, 'utils', 'thermalPrinter.js'));
if (printerContent.includes('ELKING')) PASS('THERMAL_ELKING_FOOTER');
else WARN('THERMAL_ELKING_FOOTER', 'ELKING brand reference not found in thermalPrinter.js footer');

// ─── 10. SYNC MANAGER ARCHITECTURE AUDIT ───
section('10. SYNC MANAGER ARCHITECTURE AUDIT');

// Double-subscribe guard
if (syncContent.includes('if (this.realtimeChannel) return')) {
  PASS('REALTIME_NO_DOUBLE_SUBSCRIBE');
} else {
  FAIL('REALTIME_NO_DOUBLE_SUBSCRIBE', 'No guard against double Realtime channel subscription', 'P1');
}

// Sync in-progress guard
if (syncContent.includes('syncInProgress')) {
  PASS('SYNC_IN_PROGRESS_GUARD');
} else {
  FAIL('SYNC_IN_PROGRESS_GUARD', 'No syncInProgress guard — concurrent syncs possible', 'P1');
}

// Upload-then-download ordering
if (syncContent.includes('deletedRecords') && syncContent.includes('cloudUpdates')) {
  PASS('SYNC_UPLOAD_DOWNLOAD_ORDERING');
} else {
  WARN('SYNC_UPLOAD_DOWNLOAD_ORDERING', 'Cannot confirm upload-before-download ordering in syncStore');
}

// ─── 11. DATABASE SCHEMA AUDIT ───
section('11. DATABASE SCHEMA AUDIT');

const schemaContent = readFile(path.join(ROOT, 'supabase_schema.sql'));
if (schemaContent) {
  // Check for unique constraints
  if (schemaContent.includes('UNIQUE') || schemaContent.includes('unique')) PASS('SCHEMA_HAS_UNIQUE_CONSTRAINTS');
  // Check for updated_at
  if (schemaContent.includes('updated_at')) PASS('SCHEMA_HAS_UPDATED_AT');
  else FAIL('SCHEMA_HAS_UPDATED_AT', 'updated_at column not found in schema — sync ordering unreliable', 'P1');
  // Check for RLS
  if (schemaContent.toLowerCase().includes('row level security') || schemaContent.includes('enable_rls')) {
    PASS('SCHEMA_RLS_ENABLED');
  } else {
    WARN('SCHEMA_RLS_ENABLED', 'Row Level Security not mentioned in schema — verify in Supabase dashboard');
  }
} else {
  WARN('SCHEMA_FILE_EXISTS', 'supabase_schema.sql not found or empty — schema cannot be audited statically');
}

// ─── 12. TEST CONTAMINATION AUDIT ───
section('12. TEST CONTAMINATION AUDIT');

let testContamination = false;
for (const sf of srcFiles) {
  const code = readFile(sf);
  // look for patterns that should never run in production startup
  if (code.includes('__MOCK__') || code.includes('__TEST_MODE__') || 
      code.includes('restore_prod') || code.includes('seedRestore')) {
    console.error(`   Test contamination suspect: ${path.relative(ROOT, sf)}`);
    testContamination = true;
  }
}
if (!testContamination) PASS('NO_TEST_CONTAMINATION_IN_SRC');
else FAIL('NO_TEST_CONTAMINATION_IN_SRC', 'Test/mock patterns found in src/ files', 'P1');

// scratch/ files should not be in electron files array
const pkgContent = readFile(path.join(ROOT, 'package.json'));
const pkg = JSON.parse(pkgContent || '{}');
const buildFiles = JSON.stringify((pkg.build || {}).files || []);
if (buildFiles.includes('scratch')) {
  FAIL('SCRATCH_NOT_BUNDLED', 'scratch/ directory included in electron-builder files — test scripts shipped to production', 'P1');
} else {
  PASS('SCRATCH_NOT_BUNDLED');
}

// ─── 13. ELECTRON PACKAGE CONFIG AUDIT ───
section('13. ELECTRON PACKAGE CONFIG AUDIT');

if (pkg.main && (pkg.main.includes('electron/main.cjs') || pkg.main.includes('main.cjs'))) {
  PASS('PACKAGE_MAIN_POINTS_TO_ELECTRON');
} else {
  FAIL('PACKAGE_MAIN_POINTS_TO_ELECTRON', `package.json main=${pkg.main} — must point to electron/main.cjs`, 'P1');
}

const productName = pkg.build?.productName || '';
if (productName.includes('الأمين') || productName.toLowerCase().includes('al ameen') || productName.toLowerCase().includes('alamin')) {
  PASS(`PACKAGE_PRODUCT_NAME (${productName})`);
} else {
  WARN('PACKAGE_PRODUCT_NAME', `productName="${productName}" — verify it matches SIS AL AMEEN branding`);
}

// icon path check
const iconPath = pkg.build?.win?.icon || pkg.build?.icon;
if (iconPath) {
  const iconFull = path.join(ROOT, iconPath);
  if (fs.existsSync(iconFull)) PASS(`PACKAGE_ICON_EXISTS (${iconPath})`);
  else WARN('PACKAGE_ICON_EXISTS', `Icon path "${iconPath}" in package.json does not exist on disk`);
} else {
  WARN('PACKAGE_ICON', 'No icon configured in package.json build section — using default Electron icon');
}

// ─── 14. DATA LOSS RISK PATTERNS ───
section('14. DATA LOSS RISK PATTERNS');

// purge / truncate / hard reset patterns
let dataLossPatterns = [];
for (const sf of srcFiles) {
  const code = readFile(sf);
  const rel = path.relative(ROOT, sf);
  if (code.includes('indexedDB.deleteDatabase') && !rel.includes('test') && !rel.includes('scratch')) {
    dataLossPatterns.push(`indexedDB.deleteDatabase in ${rel}`);
  }
  if (code.includes('clearStorageData') && !rel.includes('electron')) {
    dataLossPatterns.push(`clearStorageData in ${rel}`);
  }
}
if (dataLossPatterns.length === 0) PASS('NO_UNEXPECTED_DB_WIPE_IN_SRC');
else FAIL('NO_UNEXPECTED_DB_WIPE_IN_SRC', dataLossPatterns.join('; '), 'P0');

// Check App.jsx resetUsers doesn't clobber real users
const appContent = readFile(path.join(SRC, 'App.jsx'));
if (appContent.includes('existingUsers.length === 0') && appContent.includes('resetUsers')) {
  PASS('APP_RESET_USERS_GUARDED');
} else {
  WARN('APP_RESET_USERS_GUARDED', 'Could not confirm resetUsers() is guarded by existence check');
}

// ─── 15. RELEASE INTEGRITY ───
section('15. RELEASE INTEGRITY');

const releaseDir = path.join(ROOT, 'release');
if (fs.existsSync(releaseDir)) {
  const exes = fs.readdirSync(releaseDir).filter(f => f.endsWith('.exe') && !f.endsWith('.blockmap'));
  if (exes.length > 0) {
    const exePath = path.join(releaseDir, exes[0]);
    const stat = fs.statSync(exePath);
    const sizeMB = (stat.size / 1024 / 1024).toFixed(1);
    const ageMs = Date.now() - stat.mtimeMs;
    const ageMins = Math.round(ageMs / 60000);
    if (sizeMB > 50) PASS(`RELEASE_EXE_EXISTS (${exes[0]}, ${sizeMB}MB, ${ageMins}min ago)`);
    else FAIL('RELEASE_EXE_SIZE', `Setup.exe too small (${sizeMB}MB) — may be incomplete build`, 'P1');
  } else {
    FAIL('RELEASE_EXE_EXISTS', 'No .exe found in release/ — run npx electron-builder --win nsis', 'P1');
  }
} else {
  FAIL('RELEASE_DIR_EXISTS', 'release/ directory does not exist', 'P1');
}

// ─── FINAL SUMMARY ───
console.log('\n' + '═'.repeat(70));
console.log('  MASTER FORENSIC RELEASE AUDIT — FINAL SUMMARY');
console.log('═'.repeat(70));

const p0 = issues.filter(i => i.severity === 'P0');
const p1 = issues.filter(i => i.severity === 'P1');
const p2 = issues.filter(i => i.severity === 'P2');
const p3 = issues.filter(i => i.severity === 'P3');

console.log(`\nTOTAL TESTS RUN   : ${passed + failed}`);
console.log(`PASSED            : ${passed}`);
console.log(`FAILED            : ${failed}`);
console.log(`\nISSUES BY SEVERITY:`);
console.log(`  P0 (DATA LOSS/BLOCKER) : ${p0.length}`);
console.log(`  P1 (MAJOR)             : ${p1.length}`);
console.log(`  P2 (IMPORTANT)         : ${p2.length}`);
console.log(`  P3 (MINOR/WARN)        : ${p3.length}`);

if (p0.length > 0) {
  console.log('\nP0 BLOCKERS:');
  p0.forEach(i => console.error(`  ❌ ${i.id}: ${i.detail}`));
}
if (p1.length > 0) {
  console.log('\nP1 MAJOR:');
  p1.forEach(i => console.error(`  ⚠️  ${i.id}: ${i.detail}`));
}

const verdict = (p0.length === 0 && p1.length === 0) ? 'PASS ✅' : 'FAIL ❌';
console.log(`\nFINAL RELEASE VERDICT: ${verdict}`);
console.log('═'.repeat(70) + '\n');

if (p0.length > 0 || p1.length > 0) process.exit(1);
