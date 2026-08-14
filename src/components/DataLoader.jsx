import React, { useState, useEffect } from 'react';
import { DataValidator } from '../utils/dataValidation';
import databaseManager from '../utils/database';
import { supabase, isKeysConfigured } from '../utils/supabaseClient';
import syncManager from '../utils/syncManager';

const DataLoader = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('جاري تحميل البيانات...');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingMessage('جاري تهيئة قاعدة البيانات...');
        await databaseManager.init();
        await databaseManager.ensureStoresExist();

        // ----------------------------------------------------
        // WIPE OPERATIONAL DATA TRIGGER CHECK
        // ----------------------------------------------------
        const shouldWipe = localStorage.getItem('__wipe_operational_data_alamin__') === 'true';
        if (shouldWipe) {
          console.log('[DataLoader] Performing operational data wipe...');
          const db = databaseManager.db;
          const storesToClear = ['sales', 'customers', 'shifts', 'returns'];
          try {
            const transaction = db.transaction(storesToClear, 'readwrite');
            storesToClear.forEach(storeName => {
              try { transaction.objectStore(storeName).clear(); } catch (_) {}
            });
          } catch (_) {}

          const storesToClearLS = [
            'sales', 'customers', 'shifts', 'returns',
            'suppliers', 'supplier_supplies', 'supplier_payments', 'suppliers_seeded', 'expenses',
            'activeShift'
          ];
          storesToClearLS.forEach(key => {
            try { localStorage.removeItem(key); } catch (_) {}
          });
          localStorage.removeItem('__wipe_operational_data_alamin__');
          window.location.reload();
          return;
        }

        // ----------------------------------------------------
        // DETERMINISTIC MIGRATION & HYDRATION GUARD (v60)
        // ----------------------------------------------------
        const existingProdsOnInit = await databaseManager.getAll('products');
        const hasExistingData = Array.isArray(existingProdsOnInit) && existingProdsOnInit.length > 0;
        const schemaVersion = Number(localStorage.getItem('app_data_schema_version') || 0);

        const HISTORICAL_PATCH_FLAGS = [
          'migration_sanitary_alamin_v20', 'patch_alamin_v21_products', 'patch_alamin_v22_aqua',
          'patch_alamin_v23_clean_category', 'patch_alamin_v24_clean_cats', 'patch_alamin_v25_faucets',
          'patch_alamin_v26_remaining', 'local_to_indexeddb_sync_migration_v3', 'db_status_sync_migration_v2',
          'sub_cat_fix_migration_v1', 'patch_company_codes_v23', 'patch_company_codes_v40_all',
          'patch_company_codes_v41_all_v2', 'patch_restore_deleted_products_v42', 'patch_sync_seed_v43',
          'patch_restore_deleted_v44', 'patch_ppr_rename_v45', 'patch_ahram_1inch_poly_v46',
          'patch_fix_zero_prices_v47', 'patch_ahram_1_5_poly_v48', 'patch_ahram_1_5_poly_v49',
          'patch_ahram_poly_cats_v50', 'patch_remove_kisel_ahram_v51', 'patch_ahram_poly2and3_v52'
        ];

        if (hasExistingData || schemaVersion >= 60) {
          // If production data exists locally, mark all historical patch flags done and set schema version
          HISTORICAL_PATCH_FLAGS.forEach(flag => {
            try { localStorage.setItem(flag, 'true'); } catch (_) {}
          });
          localStorage.setItem('app_data_schema_version', '60');
          console.log(`[DataLoader] Database opened. Production catalog active (${existingProdsOnInit.length} products). Skipping historical patches.`);
        } else {
          // Empty database: Cloud-First Hydration
          let pulledFromCloud = false;
          if (isKeysConfigured && supabase) {
            try {
              setLoadingMessage('جاري سحب كتالوج المنتجات من السحاب...');
              console.log('[DataLoader] Empty DB: Pulling canonical products & categories from Supabase...');
              const { data: cloudProds, error: pErr } = await supabase.from('products').select('*');
              const { data: cloudCats, error: cErr } = await supabase.from('categories').select('*');

              if (!pErr && cloudProds && cloudProds.length > 0) {
                const mappedProds = cloudProds.map(p => {
                  const local = syncManager.mapCloudToLocal('products', p);
                  local.sync_status = 'synced';
                  return local;
                });
                const mappedCats = (cloudCats || []).map(c => {
                  const local = syncManager.mapCloudToLocal('categories', c);
                  local.sync_status = 'synced';
                  return local;
                });

                for (const p of mappedProds) {
                  await databaseManager.update('products', p);
                }
                for (const c of mappedCats) {
                  await databaseManager.update('categories', c);
                }

                window.__bypass_sync_proxy__ = true;
                localStorage.setItem('products', JSON.stringify(mappedProds));
                localStorage.setItem('productCategories', JSON.stringify(mappedCats));
                window.__bypass_sync_proxy__ = false;

                pulledFromCloud = true;
                console.log(`[DataLoader] Cloud Hydration SUCCESS: loaded ${mappedProds.length} products & ${mappedCats.length} categories.`);
              }
            } catch (err) {
              console.warn('[DataLoader] Cloud Hydration failed:', err);
            }
          }

          if (!pulledFromCloud) {
            setLoadingMessage('جاري استيراد البيانات الأولية...');
            try {
              let response;
              try { response = await fetch('/products_seed.json'); } catch (_) {}
              if (response && response.ok) {
                const seedData = await response.json();
                const categories = seedData.categories || [];
                const products = seedData.products || [];

                await databaseManager.importData({
                  products: products,
                  categories: categories,
                  users: [
                    {
                      id: 'admin',
                      username: 'admin',
                      email: 'admin@alaminstore.com',
                      role: 'admin',
                      name: 'المدير العام'
                    }
                  ]
                });
                window.__bypass_sync_proxy__ = true;
                localStorage.setItem('productCategories', JSON.stringify(categories));
                localStorage.setItem('products', JSON.stringify(products));
                window.__bypass_sync_proxy__ = false;
                console.log('[DataLoader] Seed import complete.');
              } else {
                console.warn('[DataLoader] products_seed.json unavailable (Electron production). Skipping initial seed import. Cloud data is canonical.');
              }
            } catch (err) {
              console.warn('[DataLoader] Seed fetch skipped:', err.message);
            }
          }

          HISTORICAL_PATCH_FLAGS.forEach(flag => {
            try { localStorage.setItem(flag, 'true'); } catch (_) {}
          });
          localStorage.setItem('app_data_schema_version', '60');
        }

        setLoadingMessage('جاري التحقق من البيانات...');
        try {
          const validation = DataValidator.validateStoredData();
          if (!validation.isValid) {
            DataValidator.repairData();
          }
        } catch (_) {}

        setIsLoading(false);
      } catch (error) {
        console.error('[DataLoader] Error during loadData:', error);
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-white mb-2">SIS AL AMEEN - نظام الأمين</h2>
          <p className="text-slate-400">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  return children;
};

export default DataLoader;


