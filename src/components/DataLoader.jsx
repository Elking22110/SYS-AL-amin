import React, { useState, useEffect } from 'react';
import { DataValidator } from '../utils/dataValidation';
import databaseManager from '../utils/database';

const DataLoader = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('جاري تحميل البيانات...');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingMessage('جاري تهيئة قاعدة البيانات...');
        await databaseManager.init();
        await databaseManager.ensureStoresExist();

        // تشغيل هجرة البيانات الصحية (seeding) إذا لم تكن قد جرت
        const migrationDone = localStorage.getItem('migration_sanitary_alamin_v20') === 'true';
        if (!migrationDone) {
          setLoadingMessage('جاري استيراد قاعدة البيانات لأول مرة (قد يستغرق ذلك ثوانٍ)...');
          console.log('جارِ استيراد قاعدة بيانات الأدوات الصحية الكاملة لمتجر الأمين من DataLoader...');
          const response = await fetch('/products_seed.json');
          if (!response.ok) {
            throw new Error('فشل تحميل ملف البيانات الأولية للمنتجات');
          }
          const seedData = await response.json();
          const categories = seedData.categories || [];
          const products = seedData.products || [];

          // مسح كل البيانات القديمة
          const keysToClear = [
            'products', 'productCategories', 'sales', 'customers',
            'suppliers', 'supplier_supplies', 'supplier_payments',
            'shifts', 'activeShift', 'notifications',
            'reseed_done_msgroupplast_v3', 'reseed_done_msgroupplast_v2',
            'reseed_done_msgroupplast_v1', 'pos-settings', 
            'migration_sanitary_alamin_v1', 'migration_sanitary_alamin_v2',
            'migration_sanitary_alamin_v3', 'migration_sanitary_alamin_v4',
            'migration_sanitary_alamin_v5', 'migration_sanitary_alamin_v6', 'migration_sanitary_alamin_v7', 'migration_sanitary_alamin_v8', 'migration_sanitary_alamin_v9', 'migration_sanitary_alamin_v10', 'migration_sanitary_alamin_v11', 'migration_sanitary_alamin_v12', 'migration_sanitary_alamin_v13', 'migration_sanitary_alamin_v14', 'migration_sanitary_alamin_v15', 'migration_sanitary_alamin_v16', 'migration_sanitary_alamin_v17',
            'categories_hierarchical_migration_v6', 'categories_hierarchical_migration_v7'
          ];
          keysToClear.forEach(k => { try { localStorage.removeItem(k); } catch (_) {} });

          // مسح IndexedDB القديمة وإعادة تهيئتها بالبيانات الكاملة
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
          console.log('تم استيراد البيانات إلى IndexedDB بنجاح');

          localStorage.setItem('productCategories', JSON.stringify(categories));
          localStorage.setItem('products', JSON.stringify(products));
          localStorage.setItem('migration_sanitary_alamin_v20', 'true');
        }

        // ----------------------------------------------------
        // PATCH: Inject new subcategory products for "قطع بلاكور+محابس+شيك بلف"
        // ----------------------------------------------------
        const patchDone = localStorage.getItem('patch_alamin_v21_products') === 'true';
        if (!patchDone) {
          console.log('DataLoader: Running patch_alamin_v21_products to inject new products...');
          const response = await fetch('/products_seed.json');
          if (response.ok) {
            const seedData = await response.json();
            const products = seedData.products || [];
            const categories = seedData.categories || [];
            
            // Filter products belonging to the target main category
            const patchProducts = products.filter(p => p.mainCategoryId === 'قطع بلاكور+محابس+شيك بلف');
            
            // Load current products from IndexedDB
            const existingProds = await databaseManager.getAll('products');
            const existingIds = new Set(existingProds.map(p => p.id));
            
            // Filter out already existing ones
            const toAdd = patchProducts.filter(p => !existingIds.has(p.id));
            
            if (toAdd.length > 0) {
              console.log(`DataLoader Patch: Merging ${toAdd.length} new products into database...`);
              // Add to IndexedDB
              for (const p of toAdd) {
                await databaseManager.update('products', p);
              }
              // Add to localStorage
              const currentLS = JSON.parse(localStorage.getItem('products') || '[]');
              const currentLSIds = new Set(currentLS.map(p => p.id));
              const updatedLS = [...currentLS, ...toAdd.filter(p => !currentLSIds.has(p.id))];
              localStorage.setItem('products', JSON.stringify(updatedLS));
              
              console.log(`DataLoader Patch: Successfully merged ${toAdd.length} products.`);
            }

            // Sync categories to IndexedDB from localStorage
            const localCats = JSON.parse(localStorage.getItem('productCategories') || '[]');
            if (localCats.length > 0) {
              for (const cat of localCats) {
                await databaseManager.update('categories', cat);
              }
            }

            localStorage.setItem('patch_alamin_v21_products', 'true');
          }
        }
        // ----------------------------------------------------

        // ----------------------------------------------------
        // PATCH v22: Inject new subcategory products for "قطع اكوا استار"
        // ----------------------------------------------------
        const patchAquaDone = localStorage.getItem('patch_alamin_v22_aqua') === 'true';
        if (!patchAquaDone) {
          console.log('DataLoader: Running patch_alamin_v22_aqua to inject Aqua Star products...');
          const aquaResponse = await fetch('/products_seed.json');
          if (aquaResponse.ok) {
            const aquaSeedData = await aquaResponse.json();
            const aquaAllProducts = aquaSeedData.products || [];
            const aquaAllCategories = aquaSeedData.categories || [];

            // Filter products belonging to Aqua Star main category
            const aquaProducts = aquaAllProducts.filter(p => p.mainCategoryId === 'قطع اكوا استار');

            // Load current products from IndexedDB
            const aquaExistingProds = await databaseManager.getAll('products');
            const aquaExistingIds = new Set(aquaExistingProds.map(p => p.id));

            // Only add non-existing products
            const aquaToAdd = aquaProducts.filter(p => !aquaExistingIds.has(p.id));

            if (aquaToAdd.length > 0) {
              console.log(`DataLoader Patch v22: Merging ${aquaToAdd.length} Aqua Star products...`);
              for (const p of aquaToAdd) {
                await databaseManager.update('products', p);
              }
              // Sync to localStorage
              const aquaCurrentLS = JSON.parse(localStorage.getItem('products') || '[]');
              const aquaCurrentLSIds = new Set(aquaCurrentLS.map(p => p.id));
              const aquaUpdatedLS = [...aquaCurrentLS, ...aquaToAdd.filter(p => !aquaCurrentLSIds.has(p.id))];
              localStorage.setItem('products', JSON.stringify(aquaUpdatedLS));
              console.log(`DataLoader Patch v22: Successfully merged ${aquaToAdd.length} Aqua Star products.`);
            }

            // Sync Aqua Star subcategories to IndexedDB
            const aquaSubCats = aquaAllCategories.filter(c => c.parentId === 'قطع اكوا استار');
            for (const cat of aquaSubCats) {
              await databaseManager.update('categories', cat);
            }
            // Also sync full category list to localStorage
            const aquaLocalCats = JSON.parse(localStorage.getItem('productCategories') || '[]');
            const aquaLocalCatIds = new Set(aquaLocalCats.map(c => c.id));
            const aquaCatsToAdd = aquaSubCats.filter(c => !aquaLocalCatIds.has(c.id));
            if (aquaCatsToAdd.length > 0) {
              localStorage.setItem('productCategories', JSON.stringify([...aquaLocalCats, ...aquaCatsToAdd]));
            }

            localStorage.setItem('patch_alamin_v22_aqua', 'true');
          }
        }
        // ----------------------------------------------------

        // ----------------------------------------------------
        // PATCH v23: Remove stale 'category' field from all local products
        // (causes Supabase PGRST204 error — column doesn't exist in schema)
        // ----------------------------------------------------
        const patchCleanDone = localStorage.getItem('patch_alamin_v23_clean_category') === 'true';
        if (!patchCleanDone) {
          console.log('DataLoader: Running patch_alamin_v23_clean_category...');
          // Clean IndexedDB
          const allProds = await databaseManager.getAll('products');
          let cleanedCount = 0;
          for (const p of allProds) {
            if (p.hasOwnProperty('category')) {
              const { category, ...cleanProd } = p;
              await databaseManager.update('products', cleanProd);
              cleanedCount++;
            }
          }
          // Clean localStorage
          const lsProds = JSON.parse(localStorage.getItem('products') || '[]');
          const cleanedLS = lsProds.map(p => {
            if (p && p.hasOwnProperty('category')) {
              const { category, ...rest } = p;
              return rest;
            }
            return p;
          });
          localStorage.setItem('products', JSON.stringify(cleanedLS));
          console.log(`DataLoader Patch v23: Cleaned 'category' field from ${cleanedCount} products in IndexedDB.`);
          localStorage.setItem('patch_alamin_v23_clean_category', 'true');
        }
        // ----------------------------------------------------

        // ----------------------------------------------------
        // PATCH v24: Remove stale 'description' field from all local categories
        // (causes Supabase PGRST204 error — column doesn't exist in schema)
        // ----------------------------------------------------
        const patchCleanCatsDone = localStorage.getItem('patch_alamin_v24_clean_cats') === 'true';
        if (!patchCleanCatsDone) {
          console.log('DataLoader: Running patch_alamin_v24_clean_cats...');
          // Clean IndexedDB
          const allCats = await databaseManager.getAll('categories');
          let cleanedCatsCount = 0;
          for (const c of allCats) {
            if (c.hasOwnProperty('description')) {
              const { description, ...cleanCat } = c;
              await databaseManager.update('categories', cleanCat);
              cleanedCatsCount++;
            }
          }
          // Clean localStorage
          const lsCats = JSON.parse(localStorage.getItem('productCategories') || '[]');
          const cleanedLSCats = lsCats.map(c => {
            if (c && c.hasOwnProperty('description')) {
              const { description, ...rest } = c;
              return rest;
            }
            return c;
          });
          localStorage.setItem('productCategories', JSON.stringify(cleanedLSCats));
          console.log(`DataLoader Patch v24: Cleaned 'description' from ${cleanedCatsCount} categories in IndexedDB.`);
          localStorage.setItem('patch_alamin_v24_clean_cats', 'true');
        }
        // ----------------------------------------------------

        // ----------------------------------------------------
        // PATCH v25: Inject new subcategory products for "مجموعه حنفيات+نواكل"
        // ----------------------------------------------------
        const patchFaucetsDone = localStorage.getItem('patch_alamin_v25_faucets') === 'true';
        if (!patchFaucetsDone) {
          console.log('DataLoader: Running patch_alamin_v25_faucets to inject Faucets & Nickel products...');
          const response = await fetch('/products_seed.json');
          if (response.ok) {
            const seedData = await response.json();
            const products = seedData.products || [];
            const categories = seedData.categories || [];

            // Filter products belonging to Faucets & Nickel main category
            const targetProducts = products.filter(p => p.mainCategoryId === 'مجموعه حنفيات+نواكل');

            // Load current products from IndexedDB
            const existingProds = await databaseManager.getAll('products');
            const existingIds = new Set(existingProds.map(p => p.id));

            // Only add non-existing products
            const toAdd = targetProducts.filter(p => !existingIds.has(p.id));

            if (toAdd.length > 0) {
              console.log(`DataLoader Patch v25: Merging ${toAdd.length} Faucets & Nickel products...`);
              for (const p of toAdd) {
                await databaseManager.update('products', p);
              }
              // Sync to localStorage
              const currentLS = JSON.parse(localStorage.getItem('products') || '[]');
              const currentLSIds = new Set(currentLS.map(p => p.id));
              const updatedLS = [...currentLS, ...toAdd.filter(p => !currentLSIds.has(p.id))];
              localStorage.setItem('products', JSON.stringify(updatedLS));
              console.log(`DataLoader Patch v25: Successfully merged ${toAdd.length} products.`);
            }

            // Sync Faucets & Nickel subcategories to IndexedDB
            const faucetsSubCats = categories.filter(c => c.parentId === 'مجموعه حنفيات+نواكل');
            for (const cat of faucetsSubCats) {
              await databaseManager.update('categories', cat);
            }
            // Also sync full category list to localStorage
            const localCats = JSON.parse(localStorage.getItem('productCategories') || '[]');
            const localCatIds = new Set(localCats.map(c => c.id));
            const catsToAdd = faucetsSubCats.filter(c => !localCatIds.has(c.id));
            if (catsToAdd.length > 0) {
              localStorage.setItem('productCategories', JSON.stringify([...localCats, ...catsToAdd]));
            }

            localStorage.setItem('patch_alamin_v25_faucets', 'true');
          }
        }
        // ----------------------------------------------------

        // ----------------------------------------------------
        // PATCH v26: Inject new subcategory products for flexible hoses, showers, and sink units
        // ----------------------------------------------------
        const patchRemainingDone = localStorage.getItem('patch_alamin_v26_remaining') === 'true';
        if (!patchRemainingDone) {
          console.log('DataLoader: Running patch_alamin_v26_remaining to inject remaining products...');
          const response = await fetch('/products_seed.json');
          if (response.ok) {
            const seedData = await response.json();
            const products = seedData.products || [];
            const categories = seedData.categories || [];

            const targetMainCategoryIds = new Set(['وصله متعدده', 'شاور+مساطر', 'وحدات حوض+مرايات']);

            // Filter products belonging to target main categories
            const targetProducts = products.filter(p => targetMainCategoryIds.has(p.mainCategoryId));

            // Load current products from IndexedDB
            const existingProds = await databaseManager.getAll('products');
            const existingIds = new Set(existingProds.map(p => p.id));

            // Only add non-existing products
            const toAdd = targetProducts.filter(p => !existingIds.has(p.id));

            if (toAdd.length > 0) {
              console.log(`DataLoader Patch v26: Merging ${toAdd.length} remaining products...`);
              for (const p of toAdd) {
                await databaseManager.update('products', p);
              }
              // Sync to localStorage
              const currentLS = JSON.parse(localStorage.getItem('products') || '[]');
              const currentLSIds = new Set(currentLS.map(p => p.id));
              const updatedLS = [...currentLS, ...toAdd.filter(p => !currentLSIds.has(p.id))];
              localStorage.setItem('products', JSON.stringify(updatedLS));
              console.log(`DataLoader Patch v26: Successfully merged ${toAdd.length} products.`);
            }

            // Sync updated subcategories to IndexedDB
            const targetSubCats = categories.filter(c => targetMainCategoryIds.has(c.parentId));
            for (const cat of targetSubCats) {
              await databaseManager.update('categories', cat);
            }
            // Also sync full category list to localStorage
            const localCats = JSON.parse(localStorage.getItem('productCategories') || '[]');
            const localCatIds = new Set(localCats.map(c => c.id));
            const catsToAdd = targetSubCats.filter(c => !localCatIds.has(c.id));
            if (catsToAdd.length > 0) {
              localStorage.setItem('productCategories', JSON.stringify([...localCats, ...catsToAdd]));
            }

            localStorage.setItem('patch_alamin_v26_remaining', 'true');
          }
        }
        // ----------------------------------------------------

        // ----------------------------------------------------
        // MIGRATION: Local Storage to IndexedDB One-Time Sync
        // ----------------------------------------------------
        const syncMigrationDone = localStorage.getItem('local_to_indexeddb_sync_migration_v3') === 'true';
        if (!syncMigrationDone) {
          console.log('DataLoader: Running one-time localStorage to IndexedDB sync migration...');
          const STORES_TO_MIGRATE = ['products', 'categories', 'customers', 'sales', 'shifts', 'returns', 'users'];
          for (const storeName of STORES_TO_MIGRATE) {
            const keyMap = {
              'categories': 'productCategories',
              'products': 'products',
              'customers': 'customers',
              'sales': 'sales',
              'shifts': 'shifts',
              'returns': 'returns',
              'users': 'users'
            };
            const lsKey = keyMap[storeName];
            try {
              const localData = JSON.parse(localStorage.getItem(lsKey) || '[]');
              if (Array.isArray(localData) && localData.length > 0) {
                for (const item of localData) {
                  if (item && item.id) {
                    const existing = await databaseManager.get(storeName, item.id);
                    if (!existing) {
                      const itemToMigrate = { ...item };
                      itemToMigrate.sync_status = 'pending';
                      itemToMigrate.updated_at = new Date().toISOString();
                      await databaseManager.update(storeName, itemToMigrate);
                    }
                  }
                }
              }
            } catch (err) {
              console.error(`DataLoader: Migration failed for ${storeName}:`, err);
            }
          }
          localStorage.setItem('local_to_indexeddb_sync_migration_v3', 'true');
        }
        // ----------------------------------------------------

        // ----------------------------------------------------
        // MIGRATION: Mark existing IndexedDB records without 'synced' status as 'pending'
        // ----------------------------------------------------
        const dbStatusMigrationDone = localStorage.getItem('db_status_sync_migration_v2') === 'true';
        if (!dbStatusMigrationDone) {
          console.log('DataLoader: Running database status migration to mark unsynced items as pending...');
          const STORES_TO_MIGRATE = ['products', 'categories', 'customers', 'sales', 'shifts', 'returns', 'users'];
          for (const storeName of STORES_TO_MIGRATE) {
            try {
              const allItems = await databaseManager.getAll(storeName);
              for (const item of allItems) {
                if (item && item.sync_status !== 'synced') {
                  const updatedItem = { ...item };
                  updatedItem.sync_status = 'pending';
                  if (!updatedItem.updated_at) {
                    updatedItem.updated_at = new Date().toISOString();
                  }
                  await databaseManager.update(storeName, updatedItem);
                }
              }
            } catch (err) {
              console.error(`DataLoader: Status migration failed for ${storeName}:`, err);
            }
          }
          localStorage.setItem('db_status_sync_migration_v2', 'true');
        }
        // ----------------------------------------------------

        // ----------------------------------------------------
        // SELF-HEALING: Verify and auto-import any missing products from the seed file
        // ----------------------------------------------------
        try {
          const currentProducts = await databaseManager.getAll('products');
          if (currentProducts.length < 2296) {
            console.log(`[DataLoader] Missing products detected (${currentProducts.length} < 2296). Auto-importing gaps...`);
            setLoadingMessage('جاري استيراد المنتجات المفقودة...');
            const response = await fetch('/products_seed.json');
            if (response.ok) {
              const seedData = await response.json();
              const seedProducts = seedData.products || [];
              const existingIds = new Set(currentProducts.map(p => p.id));
              
              const toAdd = seedProducts.filter(p => !existingIds.has(p.id));
              if (toAdd.length > 0) {
                console.log(`[DataLoader] Merging ${toAdd.length} missing products...`);
                for (const p of toAdd) {
                  const cleanP = { ...p };
                  if (cleanP.hasOwnProperty('category')) {
                    delete cleanP.category;
                  }
                  cleanP.sync_status = 'pending';
                  cleanP.updated_at = new Date().toISOString();
                  await databaseManager.update('products', cleanP);
                }
                
                // Also update localStorage products
                const currentLS = JSON.parse(localStorage.getItem('products') || '[]');
                const currentLSIds = new Set(currentLS.map(p => p.id));
                const updatedLS = [...currentLS, ...toAdd.filter(p => !currentLSIds.has(p.id))];
                localStorage.setItem('products', JSON.stringify(updatedLS));
                console.log(`[DataLoader] Successfully merged ${toAdd.length} missing products.`);
              }
            }
          }
        } catch (err) {
          console.error('[DataLoader] Failed to self-heal missing products:', err);
        }
        // ----------------------------------------------------

        // ----------------------------------------------------
        // DEDUPLICATION MIGRATION: Clean up integer vs string ID duplicates locally
        // ----------------------------------------------------
        try {
          console.log('[DataLoader] Running deduplication and ID normalization migration...');
          const stores = ['products', 'categories'];
          for (const storeName of stores) {
            const allItems = await databaseManager.getAll(storeName);
            if (allItems && allItems.length > 0) {
              const uniqueItemsMap = new Map();
              const idsToDelete = [];

              for (const item of allItems) {
                if (!item || item.id === undefined) continue;
                const stringId = String(item.id);

                if (uniqueItemsMap.has(stringId)) {
                  const existing = uniqueItemsMap.get(stringId);
                  if (existing.sync_status !== 'synced' && item.sync_status === 'synced') {
                    uniqueItemsMap.set(stringId, { ...item, id: stringId });
                  }
                  idsToDelete.push(item.id);
                } else {
                  uniqueItemsMap.set(stringId, { ...item, id: stringId });
                  if (typeof item.id === 'number') {
                    idsToDelete.push(item.id);
                  }
                }
              }

              if (idsToDelete.length > 0) {
                console.log(`[DataLoader] Deduplicating ${storeName}: deleting ${idsToDelete.length} numeric/duplicate keys...`);
                const transaction = databaseManager.db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                
                for (const id of idsToDelete) {
                  await new Promise((resolve) => {
                    const req = store.delete(id);
                    req.onsuccess = resolve;
                    req.onerror = resolve;
                  });
                }

                for (const item of uniqueItemsMap.values()) {
                  await new Promise((resolve) => {
                    const req = store.put(item);
                    req.onsuccess = resolve;
                    req.onerror = resolve;
                  });
                }

                // Update localStorage
                const keyMap = { products: 'products', categories: 'productCategories' };
                const lsKey = keyMap[storeName];
                if (lsKey) {
                  localStorage.setItem(lsKey, JSON.stringify(Array.from(uniqueItemsMap.values())));
                }
                console.log(`[DataLoader] Deduplicated ${storeName} successfully. New count: ${uniqueItemsMap.size}`);
              }
            }
          }
        } catch (err) {
          console.error('[DataLoader] Failed to deduplicate stores:', err);
        }
        // ----------------------------------------------------

        // ----------------------------------------------------
        // PATCH v23: Inject REAL company codes (e.g. 351050001) for BR & Smart products
        // يُضيف أكواد الشركة الفعلية من الـ PDF (مثل 351050001) للمنتجات BR وسمارت
        // ويستبدل أي أكواد مدير قديمة (AL.XXXX) بالأكواد الصحيحة
        // ----------------------------------------------------
        const companyCodesPatchDone = localStorage.getItem('patch_company_codes_v23') === 'true';
        if (!companyCodesPatchDone) {
          try {
            console.log('[DataLoader] Patch v23: Injecting real company codes into BR/Smart products...');
            setLoadingMessage('جاري ربط أكواد الشركة بمنتجات BR وسمارت...');
            const seedResp = await fetch('/products_seed.json');
            if (seedResp.ok) {
              const seedData = await seedResp.json();
              const seedProducts = seedData.products || [];
              // بناء map من id → { barcode, sku }
              // seed الجديد يحتوي على كود الشركة (مثل 351050001) للمنتجات المطابقة
              // وقيمة undefined للمنتجات غير المطابقة
              const codeMap = new Map();
              for (const sp of seedProducts) {
                // نخزن الكود حتى لو undefined لنعرف أي منتج يجب تصفيره
                codeMap.set(String(sp.id), { barcode: sp.barcode, sku: sp.sku });
              }
              if (codeMap.size > 0) {
                const currentProds = await databaseManager.getAll('products');
                let patchedCount = 0;
                for (const p of currentProds) {
                  const isBRorSmart = 
                    p.mainCategoryId === 'Br' || 
                    p.mainCategoryId === 'اسمارت ابيض' ||
                    (p.name && (p.name.includes('BR') || p.name.includes('سمارت')));
                  
                  if (!isBRorSmart) continue;
                  
                  const codes = codeMap.get(String(p.id));
                  if (codes !== undefined) {
                    const updated = {
                      ...p,
                      barcode: codes.barcode,  // كود الشركة الفعلي أو undefined
                      sku:     codes.sku,      // نفس الكود
                    };
                    await databaseManager.update('products', updated);
                    patchedCount++;
                  }
                }
                // تحديث localStorage أيضاً
                const lsProds = JSON.parse(localStorage.getItem('products') || '[]');
                const updatedLS = lsProds.map(p => {
                  const isBRorSmart = 
                    p.mainCategoryId === 'Br' || 
                    p.mainCategoryId === 'اسمارت ابيض' ||
                    (p.name && (p.name.includes('BR') || p.name.includes('سمارت')));
                  
                  if (!isBRorSmart) return p;
                  
                  const codes = codeMap.get(String(p.id));
                  if (codes !== undefined) return { ...p, barcode: codes.barcode, sku: codes.sku };
                  return p;
                });
                localStorage.setItem('products', JSON.stringify(updatedLS));
                console.log(`[DataLoader] Patch v23: Updated company codes in ${patchedCount} BR/Smart products.`);
              }
            }
            localStorage.setItem('patch_company_codes_v23', 'true');
            // تنظيف الفلاجات القديمة
            localStorage.removeItem('patch_almodeer_barcodes_v22');
            localStorage.removeItem('patch_almodeer_barcodes_v22b');
            localStorage.removeItem('patch_almodeer_barcodes_v22c');
          } catch (err) {
            console.error('[DataLoader] Patch v23 failed:', err);
          }
        }
        // ----------------------------------------------------
        // PATCH text: Enforce UNIQUE company codes (e.g. 351050001) for BR, Smart, and Kessel products
        // ويقوم بإزالة الأكواد المكررة ومزامنتها تلقائياً مع قاعدة بيانات Supabase السحابية
        // ----------------------------------------------------
        const companyCodesPatchv39Done = localStorage.getItem('patch_company_codes_v39_all') === 'true';
        if (!companyCodesPatchv39Done) {
          try {
            console.log('[DataLoader] Patch v39: Enforcing unique company codes into BR/Smart/Kessel products with sync triggers...');
            setLoadingMessage('جاري تنظيف ومزامنة أكواد الشركة الفريدة بمنتجات BR، سمارت، وكيسيل...');
            const seedResp = await fetch('/products_seed.json?t=' + Date.now());
            if (seedResp.ok) {
              const seedData = await seedResp.json();
              const seedProducts = seedData.products || [];
              
              const codeMap = new Map();
              for (const sp of seedProducts) {
                if (sp.barcode || sp.supplierCode) {
                  codeMap.set(String(sp.id), { 
                    barcode: sp.barcode || null, 
                    sku: sp.sku || null, 
                    supplierCode: sp.supplierCode || null 
                  });
                }
              }
              
              const currentProds = await databaseManager.getAll('products');
              let patchedCount = 0;
              const nowStr = new Date().toISOString();
              
              for (const p of currentProds) {
                const isTarget = 
                  p.mainCategoryId === 'Br' || 
                  p.mainCategoryId === 'اسمارت ابيض' ||
                  p.mainCategoryId === 'كيسيل' ||
                  (p.name && (p.name.includes('BR') || p.name.includes('سمارت') || p.name.includes('كيسيل') || p.name.includes('كيسل')));
                
                if (!isTarget) continue;
                
                const codes = codeMap.get(String(p.id));
                if (codes !== undefined) {
                  const updated = {
                    ...p,
                    barcode: codes.barcode,
                    sku:     codes.sku,
                    supplierCode: codes.supplierCode,
                    sync_status: 'pending', // إطلاق مزامنة سحابية
                    updated_at: nowStr      // تحديث وقت التعديل
                  };
                  await databaseManager.update('products', updated);
                  patchedCount++;
                } else {
                  // إذا كان الصنف مكوّداً في السابق بكود مكرر وتم تنظيفه بالـ seed
                  if (p.supplierCode || p.barcode) {
                    const updated = {
                      ...p,
                      barcode: null,
                      sku: null,
                      supplierCode: null,
                      sync_status: 'pending',
                      updated_at: nowStr
                    };
                    await databaseManager.update('products', updated);
                    patchedCount++;
                  }
                }
              }
              
              // Update localStorage products
              const lsProds = JSON.parse(localStorage.getItem('products') || '[]');
              const updatedLS = lsProds.map(p => {
                const isTarget = 
                  p.mainCategoryId === 'Br' || 
                  p.mainCategoryId === 'اسمارت ابيض' ||
                  p.mainCategoryId === 'كيسيل' ||
                  (p.name && (p.name.includes('BR') || p.name.includes('سمارت') || p.name.includes('كيسيل') || p.name.includes('كيسل')));
                
                if (!isTarget) return p;
                
                const codes = codeMap.get(String(p.id));
                if (codes !== undefined) {
                  return { 
                    ...p, 
                    barcode: codes.barcode, 
                    sku: codes.sku,
                    supplierCode: codes.supplierCode,
                    sync_status: 'pending',
                    updated_at: nowStr
                  };
                } else {
                  if (p.supplierCode || p.barcode) {
                    return {
                      ...p,
                      barcode: null,
                      sku: null,
                      supplierCode: null,
                      sync_status: 'pending',
                      updated_at: nowStr
                    };
                  }
                }
                return p;
              });
              localStorage.setItem('products', JSON.stringify(updatedLS));
              console.log(`[DataLoader] Patch v39: Enforced unique company codes in ${patchedCount} BR/Smart/Kessel products.`);
            }
            localStorage.setItem('patch_company_codes_v39_all', 'true');
          } catch (err) {
            console.error('[DataLoader] Patch v39 failed:', err);
          }
        }
        // ----------------------------------------------------


        setLoadingMessage('جاري التحقق من البيانات...');
        
        // التحقق من صحة البيانات
        const validation = DataValidator.validateStoredData();
        if (!validation.isValid) {
          setLoadingMessage('جاري إصلاح البيانات...');
          await new Promise(resolve => setTimeout(resolve, 1000)); // محاكاة وقت الإصلاح
          
          const repaired = DataValidator.repairData();
          if (!repaired) {
            setLoadingMessage('خطأ في إصلاح البيانات');
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }

        setLoadingMessage('جاري تحميل البيانات...');
        await new Promise(resolve => setTimeout(resolve, 500)); // محاكاة وقت التحميل
        
        setIsLoading(false);
      } catch (error) {
        console.error('خطأ في تحميل البيانات:', error);
        setLoadingMessage('خطأ في تحميل البيانات');
        await new Promise(resolve => setTimeout(resolve, 2000));
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">نظام إدارة المبيعات</h2>
          <p className="text-blue-300">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  return children;
};

export default DataLoader;




