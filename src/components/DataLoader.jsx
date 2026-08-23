import React, { useState, useEffect } from 'react';
import { DataValidator } from '../utils/dataValidation';
import databaseManager from '../utils/database';
import { supabase, isKeysConfigured } from '../utils/supabaseClient';
import syncManager from '../utils/syncManager';
import { runLegacyMigration } from '../utils/legacyMigration';
import bundledProductsSeed from '../../public/products_seed.json';

const DataLoader = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('جاري تحميل البيانات...');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingMessage('جاري تهيئة قاعدة البيانات...');
        await databaseManager.init();
        await databaseManager.ensureStoresExist();

        // ── LEGACY DB MIGRATION ──────────────────────────────────────────────
        setLoadingMessage('جاري فحص بيانات التثبيت القديم...');
        let migResult = { migrationExecuted: false, migrationRequired: false, verificationPassed: false };
        try {
          migResult = await runLegacyMigration(databaseManager.db);
          if (migResult.migrationExecuted) {
            if (migResult.verificationPassed) {
              console.log('[DataLoader] ✅ Legacy migration succeeded:', migResult);
              setLoadingMessage('تم نقل بياناتك القديمة بنجاح...');
            } else {
              console.warn('[DataLoader] ⚠️ Legacy migration ran but verification failed — data preserved, will retry next launch');
            }
          } else if (migResult.migrationRequired && !migResult.migrationExecuted) {
            console.warn('[DataLoader] ⚠️ Migration required but did not execute — check logs');
          } else {
            console.log('[DataLoader] No legacy migration needed (fresh install or already done)');
          }
        } catch (migErr) {
          console.error('[DataLoader] Legacy migration encountered an error (non-fatal):', migErr);
        }

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
        // DETERMINISTIC STARTUP STATE MACHINE & RECONCILIATION (v62)
        // ----------------------------------------------------
        const v62ReconciliationDone = localStorage.getItem('v62_canonical_catalog_reconciliation_2539') === 'true';
        let existingProdsOnInit = await databaseManager.getAll('products');

        if (!v62ReconciliationDone && Array.isArray(existingProdsOnInit) && existingProdsOnInit.length > 2539) {
          console.log(`[DataLoader] V62 Reconciliation: Local IndexedDB contains ${existingProdsOnInit.length} products (expected 2539). Reconciling obsolete records...`);
          const approvedProdIds = new Set((bundledProductsSeed.products || []).map(p => String(p.id)));
          const approvedCatIds = new Set((bundledProductsSeed.categories || []).map(c => String(c.id)));

          let purgedCount = 0;
          for (const p of existingProdsOnInit) {
            if (p && !approvedProdIds.has(String(p.id))) {
              try { await databaseManager.delete('products', p.id); purgedCount++; } catch (_) {}
            }
          }

          const existingCats = await databaseManager.getAll('categories');
          if (Array.isArray(existingCats)) {
            for (const c of existingCats) {
              if (c && !approvedCatIds.has(String(c.id))) {
                try { await databaseManager.delete('categories', c.id); } catch (_) {}
              }
            }
          }

          existingProdsOnInit = await databaseManager.getAll('products');
          console.log(`[DataLoader] V62 Reconciliation COMPLETE: Purged ${purgedCount} obsolete products. Remaining: ${existingProdsOnInit.length}`);
          localStorage.setItem('v62_canonical_catalog_reconciliation_2539', 'true');
        }

        const localProductCount = Array.isArray(existingProdsOnInit) ? existingProdsOnInit.length : 0;
        const schemaVersion = Number(localStorage.getItem('app_data_schema_version') || 0);
        const cloudHydrationDone = localStorage.getItem('cloud_hydration_done');
        const hasSyncHistory = Object.keys(localStorage).some(k => k.startsWith('last_sync_'));

        const resolveStartupState = () => {
          if (localProductCount > 0 || schemaVersion >= 60) return 'READY_LOCAL';
          if (cloudHydrationDone) return 'ALREADY_SYNCED';
          if (hasSyncHistory) return 'ALREADY_SYNCED';
          if (migResult.migrationExecuted || migResult.migrationRequired) return 'POST_MIGRATION';
          return 'FIRST_INSTALL';
        };

        const startupState = resolveStartupState();
        console.log(`[DataLoader] Startup state: ${startupState} (products=${localProductCount}, schemaVersion=${schemaVersion}, migrationExecuted=${migResult.migrationExecuted})`);

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

        if (startupState === 'READY_LOCAL' || startupState === 'ALREADY_SYNCED') {
          HISTORICAL_PATCH_FLAGS.forEach(flag => {
            try { localStorage.setItem(flag, 'true'); } catch (_) {}
          });
          localStorage.setItem('app_data_schema_version', '60');
          console.log(`[DataLoader] ${startupState}: Production catalog active (${localProductCount} products). Skipping cloud hydration.`);

        } else if (startupState === 'POST_MIGRATION') {
          HISTORICAL_PATCH_FLAGS.forEach(flag => {
            try { localStorage.setItem(flag, 'true'); } catch (_) {}
          });
          localStorage.setItem('app_data_schema_version', '60');
          console.log('[DataLoader] POST_MIGRATION: Legacy DB had no products — skipping cloud hydration. Sync will converge incrementally.');

        } else {
          // FIRST_INSTALL — genuine first run with no data anywhere
          let pulledFromCloud = false;
          if (isKeysConfigured && supabase) {
            try {
              setLoadingMessage('جاري سحب كتالوج المنتجات من السحاب...');
              console.log('[DataLoader] FIRST_INSTALL: Pulling canonical products & categories from Supabase...');
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

                localStorage.setItem('cloud_hydration_done', new Date().toISOString());
                pulledFromCloud = true;
                console.log(`[DataLoader] FIRST_INSTALL Cloud Hydration SUCCESS: loaded ${mappedProds.length} products & ${mappedCats.length} categories.`);
              }
            } catch (err) {
              console.warn('[DataLoader] Cloud Hydration failed:', err);
            }
          }

          if (!pulledFromCloud) {
            setLoadingMessage('جاري استيراد البيانات الأولية...');
            try {
              const seedData = bundledProductsSeed;
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
              console.log(`[DataLoader] Seed import complete (${products.length} products & ${categories.length} categories).`);
            } catch (err) {
              console.warn('[DataLoader] Seed import error:', err.message);
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
