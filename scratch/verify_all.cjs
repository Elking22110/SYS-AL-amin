const fs = require('fs');

// Check syncManager.js
const sync = fs.readFileSync('./src/utils/syncManager.js', 'utf8');
console.log('=== syncManager.js ===');
console.log('1. users in INDEXEDDB_TABLES:', sync.includes("'categories', 'users']"));
console.log('2. ID normalize in Realtime handler:', sync.includes('newRecord.id = String(newRecord.id)'));
console.log('3. users in keyMap (Realtime):', sync.includes("users: 'users'"));
console.log('4. users in mapCloudToLocal:', sync.includes("} else if (table === 'users') {"));
console.log('5. ID normalize before upload:', sync.includes('uploadData.id = String(record.id)'));
console.log('6. users upload mapping:', sync.includes("storeName === 'users'"));
console.log('7. ID normalize in download:', sync.includes('cloudItem.id = String(cloudItem.id)'));
console.log('8. id field in localItem:', sync.includes('id: cloudItem.id,'));
console.log('9. users download mapping:', sync.includes('localItem.createdAt = cloudItem.created_at'));

// Check database.js
const db = fs.readFileSync('./src/utils/database.js', 'utf8');
console.log('\n=== database.js ===');
const idNormCount = (db.match(/data\.id = String\(data\.id\)/g) || []).length;
console.log('1. ID normalize in add() and update():', idNormCount, 'occurrences (need 2)');

// Check DataLoader.jsx  
const loader = fs.readFileSync('./src/components/DataLoader.jsx', 'utf8');
console.log('\n=== DataLoader.jsx ===');
console.log('1. Self-healing missing products:', loader.includes('SELF-HEALING'));
console.log('2. Deduplication migration:', loader.includes('DEDUPLICATION MIGRATION'));
console.log('3. 2296 threshold check:', loader.includes('currentProducts.length < 2296'));

// Check Supabase client
const client = fs.readFileSync('./src/utils/supabaseClient.js', 'utf8');
console.log('\n=== supabaseClient.js ===');
console.log('1. Has VITE_SUPABASE_URL:', client.includes('VITE_SUPABASE_URL'));
console.log('2. Has VITE_SUPABASE_ANON_KEY:', client.includes('VITE_SUPABASE_ANON_KEY'));
console.log('3. Has isKeysConfigured export:', client.includes('isKeysConfigured'));
