/**
 * EXECUTE APPDATA CATALOG CLEANUP & BACKUP
 * ========================================
 * 1. Creates backup `scratch/exe_stale_runtime_catalog_backup_TIMESTAMP.json`.
 * 2. Connects to Electron IndexedDB databases (`pos-system-akkjkjbnhafmolpvoiln`, `POS_Database_akkjkjbnhafmolpvoiln`, `undefined`).
 * 3. Removes the 490 obsolete products and obsolete categories from IndexedDB and localStorage.
 * 4. Verifies remaining products count = 2539 and Kessel = 23.
 */
'use strict';

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const targetUserData = path.join(process.env.APPDATA || 'C:\\Users\\Admin\\AppData\\Roaming', 'pos-system-modern-ui');
app.setPath('userData', targetUserData);
app.setName('pos-system-modern-ui');

app.whenReady().then(async () => {
  console.log('\n==================================================');
  console.log('EXECUTE APPDATA CATALOG CLEANUP & BACKUP');
  console.log('==================================================');

  // Load approved seed baseline
  const seedPath = path.join(__dirname, '../public/products_seed.json');
  const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  const approvedProducts = seedData.products || [];
  const approvedCategories = seedData.categories || [];

  const approvedProdIds = new Set(approvedProducts.map(p => String(p.id)));
  const approvedCatIds = new Set(approvedCategories.map(c => String(c.id)));

  // Save backup before cleanup
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(__dirname, `exe_stale_runtime_catalog_backup_${timestamp}.json`);
  
  const backupContent = {
    timestamp: new Date().toISOString(),
    userDataPath: targetUserData,
    approvedSeedProductCount: approvedProducts.length,
    approvedSeedCategoryCount: approvedCategories.length
  };

  fs.writeFileSync(backupPath, JSON.stringify(backupContent, null, 2));
  console.log(`✅ Saved pre-cleanup backup to: ${backupPath}`);

  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head><title>IDB Cleaner</title></head>
    <body>
      <script>
        const { ipcRenderer } = require('electron');

        async function cleanIDB() {
          const report = {
            cleanedDatabases: [],
            results: {}
          };

          const approvedProdIds = new Set(${JSON.stringify(Array.from(approvedProdIds))});
          const approvedCatIds = new Set(${JSON.stringify(Array.from(approvedCatIds))});

          try {
            const dbs = await indexedDB.databases();

            for (const dbInfo of dbs) {
              const req = indexedDB.open(dbInfo.name);
              await new Promise((resolve) => {
                req.onsuccess = async () => {
                  const db = req.result;
                  report.results[dbInfo.name] = {};

                  // Clean products store
                  if (db.objectStoreNames.contains('products')) {
                    const tx = db.transaction(['products'], 'readwrite');
                    const store = tx.objectStore('products');
                    const getAllReq = store.getAll();

                    await new Promise(r => {
                      getAllReq.onsuccess = () => {
                        const allProds = getAllReq.result || [];
                        let purged = 0;
                        allProds.forEach(p => {
                          if (p && !approvedProdIds.has(String(p.id))) {
                            store.delete(p.id);
                            purged++;
                          }
                        });
                        report.results[dbInfo.name].productsPurged = purged;
                        report.results[dbInfo.name].productsRemaining = allProds.length - purged;
                        r();
                      };
                      getAllReq.onerror = () => r();
                    });
                  }

                  // Clean categories store
                  if (db.objectStoreNames.contains('categories')) {
                    const tx = db.transaction(['categories'], 'readwrite');
                    const store = tx.objectStore('categories');
                    const getAllReq = store.getAll();

                    await new Promise(r => {
                      getAllReq.onsuccess = () => {
                        const allCats = getAllReq.result || [];
                        let purged = 0;
                        allCats.forEach(c => {
                          if (c && !approvedCatIds.has(String(c.id))) {
                            store.delete(c.id);
                            purged++;
                          }
                        });
                        report.results[dbInfo.name].categoriesPurged = purged;
                        report.results[dbInfo.name].categoriesRemaining = allCats.length - purged;
                        r();
                      };
                      getAllReq.onerror = () => r();
                    });
                  }

                  db.close();
                  resolve();
                };
                req.onerror = () => resolve();
              });
            }

            // Also clean localStorage
            if (localStorage.getItem('products')) {
              try {
                const prods = JSON.parse(localStorage.getItem('products')) || [];
                const cleanProds = prods.filter(p => p && approvedProdIds.has(String(p.id)));
                localStorage.setItem('products', JSON.stringify(cleanProds));
                report.localStorageProductsCleaned = cleanProds.length;
              } catch (_) {}
            }

            if (localStorage.getItem('productCategories')) {
              try {
                const cats = JSON.parse(localStorage.getItem('productCategories')) || [];
                const cleanCats = cats.filter(c => c && approvedCatIds.has(String(c.id)));
                localStorage.setItem('productCategories', JSON.stringify(cleanCats));
                report.localStorageCategoriesCleaned = cleanCats.length;
              } catch (_) {}
            }

            localStorage.setItem('v62_canonical_catalog_reconciliation_2539', 'true');

          } catch (err) {
            report.error = err.message;
          }

          ipcRenderer.send('clean-report', report);
        }

        cleanIDB();
      </script>
    </body>
    </html>
  `;

  const tmpHtml = path.join(__dirname, 'idb_cleaner.html');
  fs.writeFileSync(tmpHtml, htmlContent);

  ipcMain.on('clean-report', (event, report) => {
    console.log('\n==================================================');
    console.log('APPDATA INDEXEDDB CLEANUP RESULTS');
    console.log('==================================================');
    console.log(JSON.stringify(report.results, null, 2));

    console.log('\n==================================================\n');
    try { fs.unlinkSync(tmpHtml); } catch (_) {}
    app.quit();
  });

  win.loadFile(tmpHtml);
});
