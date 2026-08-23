/**
 * READ ACTUAL ELECTRON INDEXEDDB RECORD COUNTS AND ITEMS
 * =======================================================
 * Uses Electron process to query the exact IndexedDB used by the app.
 */
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

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

            // Also inspect products store directly in canonical DB
            const canonicalReq = indexedDB.open('pos_canonical_db_v2');
            await new Promise((resolve) => {
              canonicalReq.onsuccess = async () => {
                const db = canonicalReq.result;
                if (db.objectStoreNames.contains('products')) {
                  const tx = db.transaction(['products'], 'readonly');
                  const store = tx.objectStore('products');
                  const getAllReq = store.getAll();
                  getAllReq.onsuccess = () => {
                    report.canonicalProducts = getAllReq.result || [];
                    db.close();
                    resolve();
                  };
                  getAllReq.onerror = () => { db.close(); resolve(); };
                } else {
                  db.close();
                  resolve();
                }
              };
              canonicalReq.onerror = () => resolve();
            });

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

  const { ipcMain } = require('electron');

  ipcMain.on('idb-report', (event, report) => {
    console.log('\n==================================================');
    console.log('ACTUAL INDEXEDDB DATABASES IN USERDATA');
    console.log('==================================================');
    console.log('Databases:', report.databases);
    console.log('\nStores & Counts:');
    console.log(JSON.stringify(report.stores, null, 2));

    if (report.canonicalProducts) {
      console.log(`\nCanonical DB 'products' Store Record Count: ${report.canonicalProducts.length}`);
      
      const seedPath = path.join(__dirname, '../public/products_seed.json');
      const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
      const seedIds = new Set((seedData.products || []).map(p => String(p.id)));

      const extraProducts = report.canonicalProducts.filter(p => !seedIds.has(String(p.id)));
      console.log(`Extra products not in approved seed (2539): ${extraProducts.length}`);

      if (extraProducts.length > 0) {
        console.log('\nSample Extra Products (up to 10):');
        extraProducts.slice(0, 10).forEach(p => {
          console.log(`  - [ID: ${p.id}] ${p.name} | Price: ${p.price} | Cat: ${p.main_category_id || p.category || 'N/A'}`);
        });

        fs.writeFileSync(
          path.join(__dirname, 'exe_runtime_products.json'),
          JSON.stringify(report.canonicalProducts, null, 2)
        );
        console.log(`\nSaved actual runtime products to: scratch/exe_runtime_products.json`);
      }
    }

    console.log('==================================================\n');
    try { fs.unlinkSync(tmpHtml); } catch (_) {}
    app.quit();
  });

  win.loadFile(tmpHtml);
});
