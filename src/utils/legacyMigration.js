/**
 * LEGACY INDEXEDDB MIGRATION ENGINE
 * ===================================
 * Safe, one-time, non-destructive migration from the legacy broken database
 * (opened as "undefined" due to missing this.dbName assignment) to the
 * canonical named database.
 *
 * Lifecycle:
 *   detectLegacy() → backup() → copyAllStores() → verify() → markComplete()
 *
 * NEVER deletes the legacy database.
 * NEVER runs twice (migration marker stored in canonical settings store).
 * NEVER overwrites canonical data that is newer than legacy.
 */

const MIGRATION_MARKER_KEY = 'legacy_db_migration_v1_completed';
const MIGRATION_LOCK_LS_KEY = '__legacy_migration_in_progress__';

// All known POS store names — used to verify migration coverage
const KNOWN_POS_STORES = [
  'products', 'categories', 'customers', 'suppliers', 'expenses',
  'sales', 'shifts', 'returns', 'users', 'settings', 'backups',
  'sync_outbox'
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function logMigration(level, message, data) {
  const prefix = `[LegacyMigration] [${level}]`;
  if (data !== undefined) {
    console[level === 'ERROR' ? 'error' : level === 'WARN' ? 'warn' : 'log'](prefix, message, data);
  } else {
    console[level === 'ERROR' ? 'error' : level === 'WARN' ? 'warn' : 'log'](prefix, message);
  }
}

/** Open an existing IDB by name WITHOUT triggering upgradeneeded (read-only inspection) */
function openExistingDB(dbName) {
  return new Promise((resolve) => {
    // Open without a version to get the current stored version
    const req = indexedDB.open(dbName);

    req.onerror = () => {
      logMigration('WARN', `Could not open "${dbName}" for inspection:`, req.error);
      resolve(null);
    };

    req.onblocked = () => {
      logMigration('WARN', `DB "${dbName}" is blocked by another connection`);
      resolve(null);
    };

    req.onupgradeneeded = (event) => {
      // This DB didn't exist — abort so we don't create it accidentally
      logMigration('INFO', `"${dbName}" does not exist (upgradeneeded fired) — aborting open`);
      try { event.target.transaction.abort(); } catch (_) {}
      resolve(null);
    };

    req.onsuccess = () => {
      resolve(req.result);
    };
  });
}

/** Read all records from an object store (returns [] on any error) */
function readAllFromStore(db, storeName) {
  return new Promise((resolve) => {
    try {
      if (!db.objectStoreNames.contains(storeName)) {
        resolve([]);
        return;
      }
      const tx = db.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => { logMigration('WARN', `getAll failed for ${storeName}`); resolve([]); };
    } catch (err) {
      logMigration('WARN', `readAllFromStore error for ${storeName}:`, err?.message);
      resolve([]);
    }
  });
}

/** Count records in a store */
function countStore(db, storeName) {
  return new Promise((resolve) => {
    try {
      if (!db.objectStoreNames.contains(storeName)) { resolve(0); return; }
      const tx = db.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.count();
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => resolve(0);
    } catch (_) { resolve(0); }
  });
}

/** Upsert a single record into a store using put() */
function putRecord(db, storeName, record) {
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(record);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

/** Get a single record by key */
function getRecord(db, storeName, key) {
  return new Promise((resolve) => {
    try {
      if (!db.objectStoreNames.contains(storeName)) { resolve(null); return; }
      const tx = db.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch (_) { resolve(null); }
  });
}

/** Read migration marker from canonical DB settings store */
async function getMigrationMarker(canonicalDb) {
  try {
    if (!canonicalDb.objectStoreNames.contains('settings')) return null;
    const record = await getRecord(canonicalDb, 'settings', MIGRATION_MARKER_KEY);
    return record || null;
  } catch (_) { return null; }
}

/** Write migration marker into canonical DB settings store */
async function setMigrationMarker(canonicalDb, details) {
  try {
    if (!canonicalDb.objectStoreNames.contains('settings')) return;
    await putRecord(canonicalDb, 'settings', {
      key: MIGRATION_MARKER_KEY,
      value: true,
      completedAt: new Date().toISOString(),
      ...details
    });
    logMigration('INFO', '✅ Migration marker written to canonical DB settings');
  } catch (err) {
    logMigration('WARN', 'Failed to write migration marker:', err?.message);
  }
}

// ─── Step 1: Detect Legacy Database ─────────────────────────────────────────

/**
 * Scans all existing IndexedDB databases and finds the one that:
 * 1. Is NOT the canonical DB
 * 2. Contains known POS object stores
 * 3. Has actual records (not empty)
 *
 * Returns { dbName, version, storeNames, counts, totalRecords } or null.
 */
async function detectLegacyDB(canonicalDbName) {
  logMigration('INFO', `Scanning for legacy DB. Canonical name: "${canonicalDbName}"`);

  if (typeof indexedDB.databases !== 'function') {
    logMigration('WARN', 'indexedDB.databases() not available — falling back to "undefined" probe');
    // Fallback: directly probe the known broken name
    return await probeSingleDB('undefined', canonicalDbName);
  }

  let allDbs;
  try {
    allDbs = await indexedDB.databases();
  } catch (err) {
    logMigration('WARN', 'indexedDB.databases() threw:', err?.message);
    return await probeSingleDB('undefined', canonicalDbName);
  }

  logMigration('INFO', `Found ${allDbs.length} total IndexedDB database(s):`,
    allDbs.map(d => d.name));

  // Filter candidates: exclude canonical, exclude obvious system DBs
  const candidates = (allDbs || []).filter(db => {
    const name = db.name || '';
    if (name === canonicalDbName) return false;                   // Skip canonical
    if (!name || name === '') return false;                       // Skip unnamed
    if (name.startsWith('_chrome') || name.startsWith('chrome')) return false;
    if (name.startsWith('CrashReports')) return false;
    if (name.startsWith('GCM')) return false;
    return true;
  });

  logMigration('INFO', `Legacy DB candidates: [${candidates.map(d => `"${d.name}"`).join(', ')}]`);

  // Inspect each candidate to find one with real POS data
  for (const candidate of candidates) {
    const info = await inspectDBForPOSData(candidate.name);
    if (info && info.hasPOSData) {
      logMigration('INFO', `✅ Legacy DB identified: "${candidate.name}" — ${info.totalRecords} total records`, info.counts);
      return { dbName: candidate.name, ...info };
    } else {
      logMigration('INFO', `"${candidate.name}" has no POS data — skipping`);
    }
  }

  return null;
}

/** Probe a single DB name directly (fallback for environments without databases()) */
async function probeSingleDB(dbName, canonicalDbName) {
  if (dbName === canonicalDbName) return null;
  const info = await inspectDBForPOSData(dbName);
  if (info && info.hasPOSData) {
    logMigration('INFO', `✅ Legacy DB found via probe: "${dbName}" — ${info.totalRecords} records`);
    return { dbName, ...info };
  }
  return null;
}

/** Open a DB and check if it contains real POS stores with records */
async function inspectDBForPOSData(dbName) {
  const db = await openExistingDB(dbName);
  if (!db) return null;

  try {
    const storeNames = Array.from(db.objectStoreNames);
    const hasPOSStores = KNOWN_POS_STORES.some(s => storeNames.includes(s));

    if (!hasPOSStores) {
      db.close();
      return { hasPOSData: false, storeNames, counts: {}, totalRecords: 0 };
    }

    // Count records in all available stores
    const counts = {};
    let totalRecords = 0;
    for (const storeName of storeNames) {
      const count = await countStore(db, storeName);
      counts[storeName] = count;
      totalRecords += count;
    }

    db.close();
    return { hasPOSData: totalRecords > 0, storeNames, counts, totalRecords };
  } catch (err) {
    try { db.close(); } catch (_) {}
    logMigration('WARN', `Error inspecting "${dbName}":`, err?.message);
    return null;
  }
}

// ─── Step 2: Check if Migration Is Needed ────────────────────────────────────

/**
 * Returns:
 *   'NOT_NEEDED'       — canonical has data, skip
 *   'FRESH_INSTALL'    — no legacy exists, skip
 *   'ALREADY_DONE'     — marker found, skip
 *   'REQUIRED'         — legacy has data, canonical is empty/new
 *   'PARTIAL'          — both have data, merge needed
 */
async function assessMigrationNeed(canonicalDb, legacyInfo) {
  // Check migration marker first
  const marker = await getMigrationMarker(canonicalDb);
  if (marker && marker.value === true) {
    logMigration('INFO', `Migration already completed at ${marker.completedAt} — skipping`);
    return 'ALREADY_DONE';
  }

  if (!legacyInfo) {
    logMigration('INFO', 'No legacy DB detected — fresh install or already migrated');
    return 'FRESH_INSTALL';
  }

  // Count canonical DB records in key stores
  let canonicalTotal = 0;
  for (const storeName of KNOWN_POS_STORES) {
    canonicalTotal += await countStore(canonicalDb, storeName);
  }

  logMigration('INFO', `Assessment — Legacy records: ${legacyInfo.totalRecords}, Canonical records: ${canonicalTotal}`);

  if (canonicalTotal === 0 && legacyInfo.totalRecords > 0) {
    return 'REQUIRED';
  }

  if (canonicalTotal > 0 && legacyInfo.totalRecords > 0) {
    return 'PARTIAL'; // Both have data — merge with conflict resolution
  }

  return 'NOT_NEEDED';
}

// ─── Step 3: Backup Legacy Data ──────────────────────────────────────────────

/**
 * Creates a compact JSON backup of all legacy data in localStorage.
 * Keyed by 'legacy_db_backup_v1' — survives app restart.
 * Also attempts to write to userData file via Electron IPC if available.
 */
async function backupLegacyData(legacyDb) {
  logMigration('INFO', 'Creating legacy data backup before migration...');
  const backup = {
    exportedAt: new Date().toISOString(),
    source: legacyDb.name,
    stores: {}
  };

  const storeNames = Array.from(legacyDb.objectStoreNames);
  for (const storeName of storeNames) {
    try {
      backup.stores[storeName] = await readAllFromStore(legacyDb, storeName);
    } catch (_) {
      backup.stores[storeName] = [];
    }
  }

  const backupJson = JSON.stringify(backup);

  // Store in localStorage (survives across sessions)
  try {
    localStorage.setItem('legacy_db_backup_v1', backupJson);
    logMigration('INFO', `✅ Backup saved to localStorage (${Math.round(backupJson.length / 1024)}KB)`);
  } catch (err) {
    logMigration('WARN', 'localStorage backup failed (quota?):', err?.message);
  }

  // Also attempt file backup via Electron IPC
  try {
    if (typeof window !== 'undefined' && window.electronAPI) {
      const userDataPath = await window.userData?.getUserDataPath?.();
      if (userDataPath && window.fileSystem) {
        const backupPath = `${userDataPath}/legacy_db_backup_${Date.now()}.json`;
        await window.fileSystem.writeFile(backupPath, backupJson);
        logMigration('INFO', `✅ Backup written to file: ${backupPath}`);
      }
    }
  } catch (_) {
    // File backup is best-effort — localStorage backup is sufficient
  }

  return backup;
}

// ─── Step 4: Migrate All Stores ──────────────────────────────────────────────

/**
 * Copies all records from legacyDb to canonicalDb.
 * Conflict resolution:
 *   - Record only in legacy   → copy to canonical
 *   - Record only in canonical → keep as-is
 *   - Record in both, legacy newer (updated_at) → overwrite canonical
 *   - Record in both, canonical newer → keep canonical
 *   - Record in both, identical timestamps → skip duplicate
 */
async function migrateAllStores(legacyDb, canonicalDb) {
  const storeNames = Array.from(legacyDb.objectStoreNames);
  const results = {};

  logMigration('INFO', `Migrating stores: [${storeNames.join(', ')}]`);

  for (const storeName of storeNames) {
    // Skip stores that don't exist in canonical DB (they will be created by ensureStoresExist)
    if (!canonicalDb.objectStoreNames.contains(storeName)) {
      logMigration('WARN', `Store "${storeName}" not in canonical DB — will skip (ensureStoresExist will create it on next cycle)`);
      results[storeName] = { skipped: true, reason: 'store_not_in_canonical' };
      continue;
    }

    try {
      results[storeName] = await migrateStore(legacyDb, canonicalDb, storeName);
      logMigration('INFO', `  ${storeName}: copied=${results[storeName].copied}, skipped=${results[storeName].skipped}, conflicts_resolved=${results[storeName].conflictsResolved}, errors=${results[storeName].errors}`);
    } catch (err) {
      logMigration('ERROR', `  ${storeName}: FAILED —`, err?.message);
      results[storeName] = { failed: true, error: err?.message };
    }
  }

  return results;
}

async function migrateStore(legacyDb, canonicalDb, storeName) {
  const legacyRecords = await readAllFromStore(legacyDb, storeName);
  const canonicalRecords = await readAllFromStore(canonicalDb, storeName);

  // Build a map of canonical records by their primary key for O(1) lookup
  // We use id as PK for most stores; settings uses key
  const getPK = (record, sName) => {
    if (sName === 'settings') return record?.key;
    if (sName === 'sync_outbox') return record?.operation_id;
    return record?.id !== undefined ? String(record.id) : null;
  };

  const canonicalMap = new Map();
  for (const rec of canonicalRecords) {
    const pk = getPK(rec, storeName);
    if (pk != null) canonicalMap.set(String(pk), rec);
  }

  let copied = 0;
  let skipped = 0;
  let conflictsResolved = 0;
  let errors = 0;

  for (const legacyRecord of legacyRecords) {
    if (!legacyRecord) continue;

    // Preserve ALL original fields — never strip IDs, timestamps, relationships
    const pk = getPK(legacyRecord, storeName);
    const pkStr = pk != null ? String(pk) : null;

    if (pkStr == null) {
      // No primary key — just copy (shouldn't happen in normal data)
      try {
        await putRecord(canonicalDb, storeName, legacyRecord);
        copied++;
      } catch (err) {
        logMigration('WARN', `  ${storeName}: no-PK record put() failed:`, err?.message);
        errors++;
      }
      continue;
    }

    const canonicalRecord = canonicalMap.get(pkStr);

    if (!canonicalRecord) {
      // ✅ Legacy-only record → copy as-is, preserving every field
      try {
        await putRecord(canonicalDb, storeName, legacyRecord);
        copied++;
      } catch (err) {
        logMigration('WARN', `  ${storeName}/${pkStr}: copy failed:`, err?.message);
        errors++;
      }
    } else {
      // ⚡ Conflict: both DBs have this record
      const legacyTime = new Date(legacyRecord.updated_at || legacyRecord.completedAt || 0).getTime();
      const canonicalTime = new Date(canonicalRecord.updated_at || canonicalRecord.completedAt || 0).getTime();

      if (isNaN(legacyTime) || isNaN(canonicalTime) || legacyTime === canonicalTime) {
        // Same or unparseable timestamp → skip (trust canonical)
        skipped++;
      } else if (legacyTime > canonicalTime) {
        // Legacy is newer → overwrite canonical
        try {
          await putRecord(canonicalDb, storeName, legacyRecord);
          conflictsResolved++;
        } catch (err) {
          logMigration('WARN', `  ${storeName}/${pkStr}: conflict overwrite failed:`, err?.message);
          errors++;
        }
      } else {
        // Canonical is newer → keep canonical
        skipped++;
      }
    }
  }

  return { copied, skipped, conflictsResolved, errors, legacyTotal: legacyRecords.length };
}

// ─── Step 5: Verify Migration ─────────────────────────────────────────────────

async function verifyMigration(legacyDb, canonicalDb) {
  logMigration('INFO', 'Verifying migration counts...');
  const verification = {};
  let allMatch = true;

  const storeNames = Array.from(legacyDb.objectStoreNames).filter(s =>
    canonicalDb.objectStoreNames.contains(s)
  );

  for (const storeName of storeNames) {
    const legacyCount = await countStore(legacyDb, storeName);
    const canonicalCount = await countStore(canonicalDb, storeName);
    // canonical should have >= legacy (never less, because we merge)
    const ok = canonicalCount >= legacyCount;
    if (!ok) allMatch = false;
    verification[storeName] = { legacy: legacyCount, canonical: canonicalCount, ok };
  }

  logMigration('INFO', 'Verification results:', verification);
  return { allMatch, stores: verification };
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

let _migrationPromise = null; // Singleton guard — prevents running twice

/**
 * runLegacyMigration(canonicalDb)
 *
 * Call this AFTER canonicalDb is open and BEFORE loading any business data.
 * Returns a result object with migration details.
 * Is idempotent — safe to call multiple times (only runs once).
 */
export async function runLegacyMigration(canonicalDb) {
  // ✅ Singleton guard — if already running, return same promise
  if (_migrationPromise) {
    logMigration('INFO', 'Migration already in progress — awaiting existing run');
    return _migrationPromise;
  }

  _migrationPromise = _runMigrationInternal(canonicalDb);
  return _migrationPromise;
}

async function _runMigrationInternal(canonicalDb) {
  const result = {
    legacyDetected: false,
    legacyDbName: null,
    canonicalDbName: canonicalDb?.name,
    migrationRequired: false,
    migrationExecuted: false,
    backupCreated: false,
    verificationPassed: false,
    stores: {},
    error: null
  };

  // Guard: in-progress lock via localStorage (extra safety across hot-reloads)
  if (localStorage.getItem(MIGRATION_LOCK_LS_KEY) === 'true') {
    logMigration('WARN', 'Migration lock detected — another tab/instance may be migrating. Skipping.');
    return result;
  }

  try {
    // ── Step 1: Detect legacy DB ──
    logMigration('INFO', '══ STEP 1: Detecting legacy database ══');
    const legacyInfo = await detectLegacyDB(canonicalDb.name);

    if (!legacyInfo) {
      logMigration('INFO', 'No legacy DB found — fresh install or already migrated. Nothing to do.');
      return result;
    }

    result.legacyDetected = true;
    result.legacyDbName = legacyInfo.dbName;

    // ── Step 2: Assess if migration is needed ──
    logMigration('INFO', '══ STEP 2: Assessing migration need ══');
    const assessment = await assessMigrationNeed(canonicalDb, legacyInfo);
    logMigration('INFO', `Assessment result: ${assessment}`);

    if (assessment === 'ALREADY_DONE' || assessment === 'FRESH_INSTALL' || assessment === 'NOT_NEEDED') {
      result.migrationRequired = false;
      return result;
    }

    result.migrationRequired = true;

    // ── Step 3: Open legacy DB for reading ──
    logMigration('INFO', '══ STEP 3: Opening legacy database ══');
    localStorage.setItem(MIGRATION_LOCK_LS_KEY, 'true');
    const legacyDb = await openExistingDB(legacyInfo.dbName);

    if (!legacyDb) {
      logMigration('ERROR', `Failed to open legacy DB "${legacyInfo.dbName}"`);
      result.error = 'Could not open legacy database';
      localStorage.removeItem(MIGRATION_LOCK_LS_KEY);
      return result;
    }

    try {
      // ── Step 4: Backup ──
      logMigration('INFO', '══ STEP 4: Creating backup ══');
      await backupLegacyData(legacyDb);
      result.backupCreated = true;

      // ── Step 5: Migrate ──
      logMigration('INFO', '══ STEP 5: Migrating all stores ══');
      const storeResults = await migrateAllStores(legacyDb, canonicalDb);
      result.stores = storeResults;
      result.migrationExecuted = true;

      // ── Step 6: Verify ──
      logMigration('INFO', '══ STEP 6: Verifying migration ══');
      const verification = await verifyMigration(legacyDb, canonicalDb);
      result.verification = verification;
      result.verificationPassed = verification.allMatch;

      if (!verification.allMatch) {
        logMigration('WARN', '⚠️ Verification failed — some stores have count mismatch. Legacy DB is preserved.');
        // Do NOT mark as complete — allow retry next startup
        localStorage.removeItem(MIGRATION_LOCK_LS_KEY);
        return result;
      }

      // ── Step 7: Mark migration complete ──
      logMigration('INFO', '══ STEP 7: Marking migration complete ══');
      await setMigrationMarker(canonicalDb, {
        legacyDbName: legacyInfo.dbName,
        stores: storeResults,
        verification: verification.stores
      });

      logMigration('INFO', '✅ ══════════════════════════════════');
      logMigration('INFO', '✅ LEGACY MIGRATION COMPLETED SUCCESSFULLY');
      logMigration('INFO', `✅ Migrated from "${legacyInfo.dbName}" → "${canonicalDb.name}"`);
      logMigration('INFO', '✅ ══════════════════════════════════');

    } finally {
      try { legacyDb.close(); } catch (_) {}
      localStorage.removeItem(MIGRATION_LOCK_LS_KEY);
    }

  } catch (err) {
    result.error = err?.message || String(err);
    logMigration('ERROR', 'MIGRATION FAILED:', err?.message);
    logMigration('ERROR', err?.stack || '');
    localStorage.removeItem(MIGRATION_LOCK_LS_KEY);
    // DO NOT mark as complete — preserve everything for retry
  }

  return result;
}

/**
 * Utility: get migration status (for debug/admin pages)
 */
export async function getMigrationStatus(canonicalDb) {
  const marker = await getMigrationMarker(canonicalDb);
  const legacyInfo = await detectLegacyDB(canonicalDb?.name || '');
  return {
    markerFound: !!marker,
    marker,
    legacyDbDetected: !!legacyInfo,
    legacyInfo
  };
}
