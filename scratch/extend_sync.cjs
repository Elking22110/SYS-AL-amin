const fs = require('fs');
const path = require('path');

const syncManagerFile = 'd:\\My Work\\pos-main\\src\\utils\\syncManager.js';
const proxyFile = 'd:\\My Work\\pos-main\\src\\utils\\localStorageProxy.js';
const sqlFile = 'd:\\My Work\\pos-main\\supabase_schema.sql';

// 1. Update syncManager.js
let syncCode = fs.readFileSync(syncManagerFile, 'utf8');

// Update localStores list
syncCode = syncCode.replace(
    `    const localStores = [
      'suppliers', 
      'supplier_supplies', 
      'supplier_payments', 
      'expenses',
      'storeInfo',
      'pos-settings',
      'system-settings'
    ];`,
    `    const localStores = [
      'suppliers', 
      'supplier_supplies', 
      'supplier_payments', 
      'expenses',
      'storeInfo',
      'pos-settings',
      'system-settings',
      'activeShift',
      'manufacturing_waste',
      'productImages'
    ];`
);

// Update tableMap
syncCode = syncCode.replace(
    `      const tableMap = {
        'storeInfo': 'store_info',
        'pos-settings': 'pos_settings',
        'system-settings': 'system_settings'
      };`,
    `      const tableMap = {
        'storeInfo': 'store_info',
        'pos-settings': 'pos_settings',
        'system-settings': 'system_settings',
        'activeShift': 'active_shift',
        'productImages': 'product_images'
      };`
);

// Update isSingleObject
syncCode = syncCode.replace(
    `      const isSingleObject = ['storeInfo', 'pos-settings', 'system-settings'].includes(tableName);`,
    `      const isSingleObject = ['storeInfo', 'pos-settings', 'system-settings', 'activeShift', 'productImages'].includes(tableName);`
);

fs.writeFileSync(syncManagerFile, syncCode);
console.log('syncManager.js updated successfully with new syncable tables.');

// 2. Update localStorageProxy.js
let proxyCode = fs.readFileSync(proxyFile, 'utf8');

proxyCode = proxyCode.replace(
    `const LOCAL_SYNC_STORES = [
    'suppliers', 
    'supplier_supplies', 
    'supplier_payments', 
    'expenses',
    'storeInfo',
    'pos-settings',
    'system-settings'
];`,
    `const LOCAL_SYNC_STORES = [
    'suppliers', 
    'supplier_supplies', 
    'supplier_payments', 
    'expenses',
    'storeInfo',
    'pos-settings',
    'system-settings',
    'activeShift',
    'manufacturing_waste',
    'productImages'
];`
);

fs.writeFileSync(proxyFile, proxyCode);
console.log('localStorageProxy.js updated successfully with new syncable tables.');

// 3. Update supabase_schema.sql to append new tables
let sqlCode = fs.readFileSync(sqlFile, 'utf8');

const newTablesSQL = `
-- ========================================================
-- ADDITIONAL SYSTEM TABLES (SHIFT STATE, WASTE, IMAGES)
-- ========================================================

-- 15. active_shift Table (maps to activeShift in localCache)
CREATE TABLE IF NOT EXISTS public.active_shift (
    id TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.active_shift DISABLE ROW LEVEL SECURITY;

-- 16. manufacturing_waste Table (maps to manufacturing_waste in localCache)
CREATE TABLE IF NOT EXISTS public.manufacturing_waste (
    id TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.manufacturing_waste DISABLE ROW LEVEL SECURITY;

-- 17. product_images Table (maps to productImages in localCache)
CREATE TABLE IF NOT EXISTS public.product_images (
    id TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.product_images DISABLE ROW LEVEL SECURITY;

-- Apply updated_at trigger to new tables
DROP TRIGGER IF EXISTS update_active_shift_modtime ON public.active_shift;
CREATE TRIGGER update_active_shift_modtime BEFORE UPDATE ON public.active_shift FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_manufacturing_waste_modtime ON public.manufacturing_waste;
CREATE TRIGGER update_manufacturing_waste_modtime BEFORE UPDATE ON public.manufacturing_waste FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_images_modtime ON public.product_images;
CREATE TRIGGER update_product_images_modtime BEFORE UPDATE ON public.product_images FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`;

// Append the new tables to the end of the SQL file if not already present
if (!sqlCode.includes('public.active_shift')) {
    sqlCode += newTablesSQL;
    fs.writeFileSync(sqlFile, sqlCode);
    console.log('supabase_schema.sql updated successfully with new tables.');
} else {
    console.log('supabase_schema.sql already has new tables.');
}
