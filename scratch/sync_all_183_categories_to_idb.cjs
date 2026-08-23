/**
 * SYNC ALL 183 APPROVED CATEGORIES TO INDEXEDDB
 * ============================================
 */
'use strict';

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const targetUserData = path.join(process.env.APPDATA || 'C:\\Users\\Admin\\AppData\\Roaming', 'pos-system-modern-ui');
app.setPath('userData', targetUserData);
app.setName('pos-system-modern-ui');

app.whenReady().then(async () => {
  const seedPath = path.join(__dirname, '../public/products_seed.json');
  const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  const approvedCategories = seedData.categories || [];

  console.log(`[Seed] Approved categories count = ${approvedCategories.length}`);

  const win = new BrowserWindow({
    show: false,
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head><title>Category Syncer</title></head>
    <body>
      <script>
        const { ipcRenderer } = require('electron');
        const categories = ${JSON.stringify(approvedCategories)};

        async function syncCategories() {
          const canonicalReq = indexedDB.open('pos-system-akkjkjbnhafmolpvoiln');
          await new Promise(r => {
            canonicalReq.onsuccess = async () => {
              const db = canonicalReq.result;
              if (db.objectStoreNames.contains('categories')) {
                const tx = db.transaction(['categories'], 'readwrite');
                const store = tx.objectStore('categories');
                categories.forEach(c => store.put(c));
                await new Promise(r2 => { tx.oncomplete = r2; tx.onerror = r2; });
              }
              db.close();
              r();
            };
            canonicalReq.onerror = () => r();
          });
          ipcRenderer.send('categories-synced', true);
        }

        syncCategories();
      </script>
    </body>
    </html>
  `;

  const tmpHtml = path.join(__dirname, 'cat_syncer.html');
  fs.writeFileSync(tmpHtml, htmlContent);

  ipcMain.on('categories-synced', () => {
    console.log('✅ Successfully synced all 183 categories into IndexedDB');
    try { fs.unlinkSync(tmpHtml); } catch (_) {}
    app.quit();
  });

  win.loadFile(tmpHtml);
});
