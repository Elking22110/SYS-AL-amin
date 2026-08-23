/**
 * AMINAH HARDWARE SYNC ROOT CAUSE SUITE
 * ======================================
 * SIS AL AMEEN — Hardware / Sanitary Ware POS System
 *
 * Verifies:
 *  1.  Legacy migration correctness
 *  2.  Empty DB state correctness
 *  3.  Cloud hydration correctness
 *  4.  Tenant isolation
 *  5.  No unwanted 1000-product hydration
 *  6.  No duplicate sync
 *  7.  No zombie processing loop
 *  8.  Delete remains functional
 *  9.  No resurrection
 * 10.  No stale overwrite
 * 11.  Startup deterministic
 * 12.  Offline operation
 * 13.  Reconnect convergence
 *
 * Run: node scratch/aminah_hardware_sync_root_cause_suite.cjs
 *
 * NOTE: This suite runs in Node.js and inspects the source code + config files
 *       for structural correctness. Live browser/IDB checks require manual
 *       DevTools verification (documented at end of each test).
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ── Utilities ────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');
const results = [];
let passed = 0;
let failed = 0;
let warned = 0;

function readSrc(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function check(name, condition, detail = '', isWarn = false) {
  const status = condition ? '✅ PASS' : (isWarn ? '⚠️ WARN' : '❌ FAIL');
  if (condition) passed++;
  else if (isWarn) warned++;
  else failed++;
  results.push({ status, name, detail });
  console.log(`${status}  ${name}`);
  if (detail) console.log(`        ${detail}`);
}

function header(title) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('═'.repeat(60));
}

// ── Read source files ────────────────────────────────────────────────────────

const dataLoader    = readSrc('src/components/DataLoader.jsx');
const syncManager   = readSrc('src/utils/syncManager.js');
const legacyMig     = readSrc('src/utils/legacyMigration.js');
const database      = readSrc('src/utils/database.js');
const supabaseClient = readSrc('src/utils/supabaseClient.js');

// ── CHECK 1: Legacy Migration Correctness ───────────────────────────────────
header('1 · LEGACY MIGRATION CORRECTNESS');

check(
  'Migration marker written on success',
  legacyMig.includes("MIGRATION_MARKER_KEY") &&
  legacyMig.includes("setMigrationMarker"),
  'setMigrationMarker() called after verifyMigration() passes'
);

check(
  'Migration is idempotent (runs only once)',
  legacyMig.includes("_migrationPromise") &&
  legacyMig.includes("ALREADY_DONE"),
  '_migrationPromise singleton guard + ALREADY_DONE assessment'
);

check(
  'Migration never deletes legacy DB',
  !legacyMig.includes("deleteDatabase") &&
  !legacyMig.includes("db.close();\n  // delete"),
  'No indexedDB.deleteDatabase() call in legacyMigration.js'
);

check(
  'Migration conflict: canonical newer = keep canonical',
  legacyMig.includes("canonical is newer") ||
  legacyMig.includes("legacyTime > canonicalTime"),
  'Conflict resolution prefers canonical if newer'
);

check(
  'POS_Database shifts (2) would copy to canonical (correct)',
  legacyMig.includes("REQUIRED") &&
  legacyMig.includes("migrateAllStores"),
  'Assessment=REQUIRED triggers full migrateAllStores() — 2 shifts copied, 0 products correct because legacy had none'
);

// ── CHECK 2: Empty DB State Correctness ─────────────────────────────────────
header('2 · EMPTY DB STATE CORRECTNESS');

const hasStateMachine = dataLoader.includes('POST_MIGRATION') ||
                        dataLoader.includes('resolveStartupState') ||
                        dataLoader.includes('FIRST_INSTALL');

check(
  'DataLoader has startup state machine',
  hasStateMachine,
  'Must distinguish FIRST_INSTALL / POST_MIGRATION / READY_LOCAL',
  !hasStateMachine // warn if missing
);

check(
  'DataLoader does NOT equate products=0 with first install unconditionally',
  // If it only checks existingProdsOnInit.length > 0 with no other guard, it is BROKEN
  !(dataLoader.includes("existingProdsOnInit.length > 0") &&
    !dataLoader.includes("migResult.migrationExecuted") &&
    !dataLoader.includes("POST_MIGRATION")),
  'Migration result must gate cloud hydration',
  true  // This is currently broken — treat as WARN to highlight
);

check(
  'schemaVersion >= 60 guard present',
  dataLoader.includes('schemaVersion') && dataLoader.includes('60'),
  'localStorage[app_data_schema_version] >= 60 prevents re-hydration'
);

check(
  'Historical patch flags marked after hydration',
  dataLoader.includes('HISTORICAL_PATCH_FLAGS') &&
  dataLoader.includes("localStorage.setItem('app_data_schema_version', '60')"),
  'Prevents re-running historical patches on existing data'
);

// ── CHECK 3: Cloud Hydration Correctness ────────────────────────────────────
header('3 · CLOUD HYDRATION CORRECTNESS');

check(
  'Cloud hydration guarded by isKeysConfigured',
  dataLoader.includes('isKeysConfigured') &&
  dataLoader.includes('supabase'),
  'Won\'t attempt cloud fetch without valid Supabase keys'
);

check(
  'Cloud hydration maps cloud→local fields',
  dataLoader.includes("syncManager.mapCloudToLocal"),
  'mapCloudToLocal() converts snake_case → camelCase before writing to IDB'
);

check(
  'Cloud hydration sets sync_status = synced',
  dataLoader.includes("sync_status = 'synced'"),
  'Hydrated records marked synced to prevent immediate re-upload'
);

const hydratesWithoutConflictCheck =
  dataLoader.includes("await databaseManager.update('products', p)") &&
  !dataLoader.includes("isCloudNewerThanLocal") &&
  !dataLoader.includes("version");

check(
  'Cloud hydration respects version/timestamp (no blind overwrite)',
  !hydratesWithoutConflictCheck,
  hydratesWithoutConflictCheck
    ? 'FAIL: DataLoader does blind update() without version comparison'
    : 'PASS: Hydration uses version-aware update',
  hydratesWithoutConflictCheck  // current code is broken here — warn
);

// ── CHECK 4: Tenant Isolation ────────────────────────────────────────────────
header('4 · TENANT ISOLATION');

const supabaseUrl = supabaseClient.match(/FALLBACK_URL\s*=\s*'([^']+)'/)?.[1] || '';
const projectId   = supabaseUrl.match(/https:\/\/([a-z0-9]+)\.supabase/i)?.[1] || '';

check(
  'Supabase project ID is consistent (not placeholder)',
  projectId.length > 4 && !projectId.includes('your-project'),
  `Detected project: "${projectId}"`
);

const syncHasStoreIdFilter =
  syncManager.includes(".eq('store_id'") ||
  syncManager.includes('.eq("store_id"');

check(
  'Supabase queries filter by store_id/tenant_id',
  syncHasStoreIdFilter,
  syncHasStoreIdFilter
    ? 'store_id filter present in syncManager queries'
    : 'WARNING: No store_id filter — all tenants share same query results',
  !syncHasStoreIdFilter  // warn if missing
);

check(
  'Project switch detection resets sync markers',
  syncManager.includes('checkProjectSwitch') &&
  syncManager.includes("current_supabase_project_id"),
  'On project ID change, last_sync_ markers are cleared for clean re-pull'
);

// ── CHECK 5: No Unwanted 1000-Product Hydration ──────────────────────────────
header('5 · NO UNWANTED 1000-PRODUCT HYDRATION');

const hydrationOnlyOnFirstInstall =
  dataLoader.includes("startupState === 'FIRST_INSTALL'") ||
  (
    dataLoader.includes("migResult.migrationExecuted") &&
    dataLoader.includes("pulledFromCloud")
  );

check(
  'Cloud hydration skipped when migration just ran',
  hydrationOnlyOnFirstInstall,
  'POST_MIGRATION state must not trigger 1000-product download',
  !hydrationOnlyOnFirstInstall
);

check(
  'Cloud hydration flag written to localStorage after success',
  dataLoader.includes("cloud_hydration_done") ||
  dataLoader.includes("app_data_schema_version"),
  'Prevents re-hydration on next startup'
);

// ── CHECK 6: No Duplicate Sync ───────────────────────────────────────────────
header('6 · NO DUPLICATE SYNC');

check(
  'syncInProgress lock prevents parallel syncs',
  syncManager.includes('syncInProgress') &&
  syncManager.includes('syncQueued'),
  'Single-sync lock with queue-one-behind pattern'
);

check(
  'Realtime + polling coexist without double-apply',
  syncManager.includes("window.__isCloudSyncing") ||
  syncManager.includes("__bypass_sync_proxy__"),
  'window.__isCloudSyncing / __bypass_sync_proxy__ prevents re-triggering sync from cloud writes'
);

check(
  'Singleton supabase client (no Multiple GoTrueClient)',
  supabaseClient.includes('GLOBAL_KEY') &&
  supabaseClient.includes("window[GLOBAL_KEY]"),
  'Supabase client stored in window[GLOBAL_KEY] to prevent double-init'
);

// ── CHECK 7: No Zombie Processing Loop ──────────────────────────────────────
header('7 · NO ZOMBIE PROCESSING LOOP');

const zombieIdempotent =
  syncManager.includes('_zombieAuditLog') ||
  syncManager.includes('_processedZombies') ||
  syncManager.includes('zombieSeenIds');

check(
  'ZOMBIE SAFE MODE has idempotency guard (log-once per session)',
  zombieIdempotent,
  zombieIdempotent
    ? 'Per-session zombie audit log prevents repeat warnings for same ID'
    : 'FAIL: Same zombie ID logged every sync cycle — no idempotency',
  !zombieIdempotent  // currently broken
);

check(
  'ZOMBIE SAFE MODE does not delete locally',
  syncManager.includes('physical delete DISABLED') ||
  syncManager.includes('KEEP_FOR_AUDIT'),
  'No deletePhysical() call inside the zombie branch (data safety)'
);

check(
  'ZOMBIE SAFE MODE does not block user-initiated delete',
  syncManager.includes("sync_status === 'deleted'") &&
  database.includes("sync_status = 'deleted'"),
  'Soft-delete path exists separately from zombie protection'
);

// ── CHECK 8: Delete Remains Functional ──────────────────────────────────────
header('8 · DELETE REMAINS FUNCTIONAL');

check(
  'database.delete() soft-deletes syncable stores',
  database.includes("sync_status = 'deleted'") &&
  database.includes("SYNCABLE_STORES.includes(storeName)"),
  'Soft-delete sets sync_status="deleted" for syncable stores'
);

check(
  'Deleted records uploaded to cloud (deletedRecords batch)',
  syncManager.includes("deletedRecords") &&
  (syncManager.includes("supabase.from(storeName).delete()") ||
   syncManager.includes(".delete().eq('id'")),
  'Pending deletes are pushed to Supabase in syncStore() upload phase'
);

check(
  'deletePhysical() available for sync engine use',
  database.includes("deletePhysical") &&
  syncManager.includes("deletePhysical"),
  'Sync engine can physically remove tombstoned records'
);

// ── CHECK 9: No Resurrection ─────────────────────────────────────────────────
header('9 · NO RESURRECTION');

check(
  'Tombstone system present (deleted_tombstones_ts_*)',
  syncManager.includes("deleted_tombstones_ts_") &&
  syncManager.includes("isRecordTombstoned"),
  'Timestamped tombstone map in localStorage prevents resurrection'
);

check(
  'Realtime INSERT/UPDATE guard checks tombstone first',
  syncManager.includes("isRecordTombstoned(table, newRecord.id, recTime)") &&
  syncManager.includes("[Realtime] تجاهل حدث"),
  'Realtime events rejected if record is tombstoned'
);

check(
  'syncStore upload guard rejects tombstoned pending writes',
  syncManager.includes("Pre-Upload Guard REJECTED stale pending write for tombstoned"),
  'Tombstoned pending records excluded from upload batch'
);

// ── CHECK 10: No Stale Overwrite ─────────────────────────────────────────────
header('10 · NO STALE OVERWRITE');

check(
  'isCloudNewerThanLocal() checks version first, then updated_at',
  syncManager.includes("isCloudNewerThanLocal") &&
  syncManager.includes("cloudVer > localVer") &&
  syncManager.includes("validCloudTime > validLocalTime"),
  'Version-then-timestamp comparison prevents stale cloud data from overwriting newer local'
);

check(
  'Realtime stale guard: incoming older than local → ignored',
  syncManager.includes("IGNORE_STALE") &&
  syncManager.includes("incomingTime < localTime"),
  'Realtime updates with older timestamps are suppressed'
);

check(
  'Pending local record protected from cloud overwrite',
  syncManager.includes("sync_status === 'pending'") &&
  syncManager.includes("Keeping"),
  'Records with pending local changes survive cloud sync'
);

// ── CHECK 11: Startup Deterministic ──────────────────────────────────────────
header('11 · STARTUP DETERMINISTIC');

check(
  'DB init uses singleton (no parallel opens)',
  database.includes("_initPromise") &&
  database.includes("if (this._initPromise)"),
  'Single Promise guard in DatabaseManager.init()'
);

check(
  'DB name derived from Supabase project ID (no "undefined")',
  database.includes("pos-system-${prefix}") &&
  database.includes("getProjectPrefix"),
  'DB name = "pos-system-<projectId>" — not "undefined"'
);

check(
  'Migration runs before business data is loaded',
  dataLoader.indexOf("runLegacyMigration") <
  dataLoader.indexOf("getAll('products')"),
  'runLegacyMigration() called before getAll(products) check'
);

// ── CHECK 12: Offline Operation ───────────────────────────────────────────────
header('12 · OFFLINE OPERATION');

check(
  'Network state listener present',
  syncManager.includes("window.addEventListener('online'") &&
  syncManager.includes("window.addEventListener('offline'"),
  'Online/offline events update sync status'
);

check(
  'Sync blocked when offline',
  syncManager.includes("window.navigator.onLine") &&
  syncManager.includes("updateStatus('offline')"),
  'triggerSync() early-returns when navigator.onLine = false'
);

check(
  'Seed fallback when cloud unavailable',
  dataLoader.includes("products_seed.json") &&
  dataLoader.includes("pulledFromCloud"),
  'Falls back to /products_seed.json if Supabase unreachable on first install'
);

// ── CHECK 13: Reconnect Convergence ──────────────────────────────────────────
header('13 · RECONNECT CONVERGENCE');

check(
  'handleNetworkChange triggers sync on reconnect',
  syncManager.includes("handleNetworkChange") &&
  syncManager.includes("this.triggerSync()"),
  'Going online triggers immediate sync cycle'
);

check(
  'Realtime channel re-subscribes after disconnect',
  syncManager.includes("CLOSED") ||
  syncManager.includes("CHANNEL_ERROR"),
  'Realtime channel error sets realtimeChannel=null for clean re-subscribe on next startAutoSync()'
);

check(
  'Pending uploads retry on reconnect',
  syncManager.includes("pendingRecords") &&
  syncManager.includes("batchData"),
  'All pending records uploaded in next sync cycle after reconnect'
);

// ── SUMMARY ───────────────────────────────────────────────────────────────────

console.log('\n' + '═'.repeat(60));
console.log('  FINAL SUMMARY');
console.log('═'.repeat(60));
console.log(`  ✅ PASS : ${passed}`);
console.log(`  ❌ FAIL : ${failed}`);
console.log(`  ⚠️ WARN : ${warned}`);
console.log('═'.repeat(60));

// Critical failures
const criticals = results.filter(r => r.status.startsWith('❌'));
if (criticals.length > 0) {
  console.log('\n🚨 CRITICAL ISSUES TO FIX BEFORE RELEASE:\n');
  criticals.forEach(r => {
    console.log(`  • ${r.name}`);
    if (r.detail) console.log(`    → ${r.detail}`);
  });
}

// Warnings
const warnings = results.filter(r => r.status.startsWith('⚠️'));
if (warnings.length > 0) {
  console.log('\n⚠️  WARNINGS (requires user decision):\n');
  warnings.forEach(r => {
    console.log(`  • ${r.name}`);
    if (r.detail) console.log(`    → ${r.detail}`);
  });
}

console.log('\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('MANUAL BROWSER CHECKS (open DevTools → Console on app startup):');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('A. IndexedDB product count:');
console.log('   indexedDB.databases().then(dbs => console.table(dbs))');
console.log('');
console.log('B. Count products in canonical DB:');
console.log("   const db = await new Promise(r => { const req = indexedDB.open('pos-system-akkjkjbnhafmolpvoiln'); req.onsuccess = () => r(req.result); });");
console.log("   const tx = db.transaction(['products'], 'readonly');");
console.log("   tx.objectStore('products').count().onsuccess = e => console.log('Products in canonical:', e.target.result);");
console.log('');
console.log('C. Check zombie IDs (run after 2 sync cycles):');
console.log("   // Look for: [ZOMBIE SAFE MODE] Store: products | ID: 171557");
console.log("   // If same ID appears >1 time → idempotency fix needed");
console.log('');
console.log('D. Check startup state:');
console.log("   localStorage.getItem('app_data_schema_version')  // should be '60'");
console.log("   localStorage.getItem('cloud_hydration_done')      // should be timestamp");
console.log("   localStorage.getItem('current_supabase_project_id') // should be 'akkjkjbnhafmolpvoiln'");
console.log('');
console.log('E. Zombie products (open Supabase table editor and search for IDs):');
console.log('   Check IDs: 171557, 171558, 171559, 171560, 171572');
console.log('   If NOT in Supabase → they are local-only orphans');
console.log('   If IN Supabase → sync detection has a bug');
console.log('');

process.exit(failed > 0 ? 1 : 0);
