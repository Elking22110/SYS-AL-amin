/**
 * READ ACTUAL ELECTRON INDEXEDDB RECORD COUNTS AND ITEMS
 * =======================================================
 * Uses Electron process to query the exact IndexedDB used by the app.
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
  console.log('ACTUAL ELECTRON RUNTIME ENVIRONMENT');
  console.log('==================================================');
  console.log(`App Name           : ${app.getName()}`);
  console.log(`App Version        : ${app.getVersion()}`);
  console.log(`App Path           : ${app.getAppPath()}`);
  console.log(`UserData Path      : ${app.getPath('userData')}`);
  console.log(`isPackaged         : ${app.isPackaged}`);

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
    <head><title>IDB Reader</title></head>
    <body>
      <script>
        const { ipcRenderer } = require('electron');

        async function inspectIDB() {
          const report = {
            databases: [],
            stores: {}
          };

          try {
            const dbs = await indexedDB.databases();
            report.databases = dbs;

            for (const dbInfo of dbs) {
              const req = indexedDB.open(dbInfo.name);
              await new Promise((resolve) => {
                req.onsuccess = async () => {
                  const db = req.result;
                  const storeNames = Array.from(db.objectStoreNames);
                  report.stores[dbInfo.name] = {};

                  for (const storeName of storeNames) {
                    try {
                      const tx = db.transaction([storeName], 'readonly');
                      const store = tx.objectStore(storeName);
                      const countReq = store.count();
                      await new Promise(r => {
                        countReq.onsuccess = () => {
                          report.stores[dbInfo.name][storeName] = countReq.result;
                          r();
                        };
                        countReq.onerror = () => r();
                      });
                    } catch (e) {
                      report.stores[dbInfo.name][storeName] = 'ERROR: ' + e.message;
                    }
                  }
                  db.close();
                  resolve();
                };
                req.onerror = () => resolve();
              });
            }

            // Also inspect products store directly in all databases found
            for (const dbInfo of dbs) {
              const dbReq = indexedDB.open(dbInfo.name);
              await new Promise((resolve) => {
                dbReq.onsuccess = async () => {
                  const db = dbReq.result;
                  if (db.objectStoreNames.contains('products')) {
                    const tx = db.transaction(['products'], 'readonly');
                    const store = tx.objectStore('products');
                    const getAllReq = store.getAll();
                    getAllReq.onsuccess = () => {
                      report['products_' + dbInfo.name] = getAllReq.result || [];
                      db.close();
                      resolve();
                    };
                    getAllReq.onerror = () => { db.close(); resolve(); };
                  } else {
                    db.close();
                    resolve();
                  }
                };
                dbReq.onerror = () => resolve();
              });
            }

            // Also check localStorage
            report.localStorageKeys = Object.keys(localStorage);
            if (localStorage.getItem('products')) {
              try {
                report.localStorageProducts = JSON.parse(localStorage.getItem('products'));
              } catch (_) {}
            }

          } catch (err) {
            report.error = err.message;
          }

          ipcRenderer.send('idb-report', report);
        }

        inspectIDB();
      </script>
    </body>
    </html>
  `;

  const tmpHtml = path.join(__dirname, 'idb_reader.html');
  fs.writeFileSync(tmpHtml, htmlContent);

  ipcMain.on('idb-report', (event, report) => {
    console.log('\n==================================================');
    console.log('ACTUAL INDEXEDDB DATABASES IN USERDATA');
    console.log('==================================================');
    console.log('Databases:', report.databases);
    console.log('\nStores & Counts:');
    console.log(JSON.stringify(report.stores, null, 2));

    const seedPath = path.join(__dirname, '../public/products_seed.json');
    const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    const seedIds = new Set((seedData.products || []).map(p => String(p.id)));

    Object.keys(report).forEach(key => {
      if (key.startsWith('products_')) {
        const prods = report[key];
        console.log(`\n📦 Store '${key}' count: ${prods.length}`);
        const extra = prods.filter(p => p && !seedIds.has(String(p.id)));
        console.log(`   Extra products not in approved seed (2539): ${extra.length}`);

        if (prods.length > 0) {
          fs.writeFileSync(
            path.join(__dirname, `exe_runtime_products_${key}.json`),
            JSON.stringify(prods, null, 2)
          );
          console.log(`   Saved dump to scratch/exe_runtime_products_${key}.json`);
        }
      }
    });

    if (report.localStorageProducts) {
      console.log(`\n📦 LocalStorage 'products' count: ${report.localStorageProducts.length}`);
      const extraLS = report.localStorageProducts.filter(p => p && !seedIds.has(String(p.id)));
      console.log(`   Extra products in localStorage not in approved seed (2539): ${extraLS.length}`);
    }

    console.log('\n==================================================\n');
    try { fs.unlinkSync(tmpHtml); } catch (_) {}
    app.quit();
  });

  win.loadFile(tmpHtml);
});
