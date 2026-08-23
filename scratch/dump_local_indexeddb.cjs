const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const targetUserData = 'C:\\Users\\Admin\\AppData\\Roaming\\pos-system-modern-ui';
if (fs.existsSync(targetUserData)) {
  console.log('[Electron Dump] Overriding userData path to:', targetUserData);
  app.setPath('userData', targetUserData);
}

app.whenReady().then(async () => {
  console.log('[Electron Dump] App ready with userData =', app.getPath('userData'));
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  });

  console.log('[Electron Dump] Loading http://localhost:5173 ...');
  await win.loadURL('http://localhost:5173');

  await new Promise(r => setTimeout(r, 2000));

  console.log('[Electron Dump] Querying all IndexedDB databases...');
  const dumpResult = await win.webContents.executeJavaScript(`
    new Promise(async (resolve, reject) => {
      try {
        let dbs = [];
        if (indexedDB.databases) {
          dbs = await indexedDB.databases();
        }
        console.log('Available databases:', dbs);
        
        let allResults = {};
        
        for (const dbInfo of dbs) {
          const dbName = dbInfo.name;
          if (!dbName) continue;
          
          await new Promise((res) => {
            const req = indexedDB.open(dbName);
            req.onerror = () => res();
            req.onsuccess = () => {
              const db = req.result;
              const stores = Array.from(db.objectStoreNames);
              if (stores.includes('products')) {
                const tx = db.transaction(['products'], 'readonly');
                const pReq = tx.objectStore('products').getAll();
                pReq.onsuccess = () => {
                  allResults[dbName] = {
                    version: db.version,
                    stores,
                    products: pReq.result || []
                  };
                  res();
                };
                pReq.onerror = () => res();
              } else {
                allResults[dbName] = { version: db.version, stores, products: [] };
                res();
              }
            };
          });
        }
        
        resolve({ dbs, allResults });
      } catch (err) {
        reject(err.message || String(err));
      }
    })
  `);

  console.log('[Electron Dump] IndexedDB Databases found:', dumpResult.dbs);
  for (const [dbname, data] of Object.entries(dumpResult.allResults)) {
    console.log(`  -> DB "${dbname}" (v${data.version}): ${data.products.length} products`);
  }

  const dumpPath = path.join(__dirname, 'local_indexeddb_products_dump.json');
  fs.writeFileSync(dumpPath, JSON.stringify(dumpResult, null, 2));
  console.log(`[Electron Dump] Saved dump file to: ${dumpPath}`);

  app.quit();
}).catch(err => {
  console.error('[Electron Dump] Error:', err);
  app.quit();
});
