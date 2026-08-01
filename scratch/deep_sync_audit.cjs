const fs = require('fs');

console.log('===========================================================');
console.log('TRACE-BASED MULTI-DEVICE SYNCHRONIZATION HARDENING AUDIT');
console.log('===========================================================');

const syncCode = fs.readFileSync('./src/utils/syncManager.js', 'utf8');
const dbCode = fs.readFileSync('./src/utils/database.js', 'utf8');
const dataLoaderCode = fs.readFileSync('./src/components/DataLoader.jsx', 'utf8');
const posGridCode = fs.readFileSync('./src/components/POS/ProductGrid.jsx', 'utf8');
const productsCode = fs.readFileSync('./src/pages/Products.jsx', 'utf8');

// 1. Audit Table Pull Logic (Incremental vs Full Pull)
console.log('\n--- 1. Table Pull Strategy Inspection ---');
const fullPullMatch = syncCode.match(/FULL_PULL_TABLES\s*=\s*new Set\(([^)]+)\)/);
console.log(`FULL_PULL_TABLES definition: ${fullPullMatch ? fullPullMatch[1] : 'Not found'}`);

// 2. Audit Tombstone Deletion Loop & Deletion Propagation
console.log('\n--- 2. Tombstone & Realtime Deletion Propagation ---');
const hasTombstoneLoop = syncCode.includes("sync_status === 'deleted'");
const hasRealtimeDelete = syncCode.includes("eventType === 'DELETE'");
console.log(`Tombstone sync loop present in syncStore(): ${hasTombstoneLoop}`);
console.log(`Realtime DELETE handling in handleRealtimeChange(): ${hasRealtimeDelete}`);

// 3. Audit Conflict Resolution Policy (LWW / Timestamps / Locks)
console.log('\n--- 3. Conflict Resolution Implementation ---');
const hasTimestampComp = syncCode.includes('updated_at') && (syncCode.includes('>') || syncCode.includes('<'));
console.log(`Timestamp comparison in syncManager: ${hasTimestampComp}`);

// 4. Audit Category Dataset Integrity Across Components
console.log('\n--- 4. Category Source of Truth Inspection ---');
const productsCategoryFetch = productsCode.includes("databaseManager.getAll('categories')");
const posCategoryFetch = posGridCode.includes("categories");
console.log(`Products.jsx consumes categories from IndexedDB/LocalStorage: ${productsCategoryFetch}`);
console.log(`ProductGrid.jsx consumes categories prop: ${posCategoryFetch}`);

// 5. Audit Realtime Event Idempotency
console.log('\n--- 5. Realtime Idempotency Audit ---');
const hasIdempotentCheck = syncCode.includes('reconcileUniqueIndexConflicts');
console.log(`Unique conflict reconciliation during realtime sync: ${hasIdempotentCheck}`);
