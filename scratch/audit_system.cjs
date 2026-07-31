const fs = require('fs');
const https = require('https');

const SUPABASE_URL = 'akkjkjbnhafmolpvoiln.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

async function auditCloudTables() {
  console.log('=== AUDIT 1: SUPABASE CORE TABLES CHECK ===');
  const tables = ['products', 'categories', 'customers', 'sales', 'shifts', 'returns', 'users'];
  for (const t of tables) {
    await new Promise((resolve) => {
      const options = {
        hostname: SUPABASE_URL,
        path: `/rest/v1/${t}?select=*&limit=1`,
        method: 'GET',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      };
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            const keys = parsed[0] ? Object.keys(parsed[0]).join(', ') : 'EMPTY';
            console.log(`Table [${t}]: Status ${res.statusCode} | Columns: ${keys}`);
          } catch (e) {
            console.log(`Table [${t}]: Status ${res.statusCode} | Response: ${body}`);
          }
          resolve();
        });
      });
      req.on('error', console.error);
      req.end();
    });
  }
}

async function auditProductsData() {
  console.log('\n=== AUDIT 2: PRODUCTS DATA INTEGRITY CHECK ===');
  const seed = JSON.parse(fs.readFileSync('./public/products_seed.json', 'utf8'));
  console.log(`Seed Products Count: ${seed.products.length}`);
  console.log(`Seed Categories Count: ${seed.categories.length}`);

  // Check duplicate IDs in seed
  const idMap = new Map();
  const duplicateIds = [];
  seed.products.forEach(p => {
    const sId = String(p.id);
    if (idMap.has(sId)) {
      duplicateIds.push(sId);
    }
    idMap.set(sId, p);
  });
  console.log(`Duplicate Product IDs in Seed: ${duplicateIds.length === 0 ? 'NONE ✅' : duplicateIds.join(', ')}`);

  // Check Orphan Products (products whose mainCategoryId doesn't match any category in seed or categoryMigration)
  const catNames = new Set(seed.categories.map(c => c.name));
  seed.categories.forEach(c => catNames.add(c.id));

  const orphanProducts = seed.products.filter(p => p.mainCategoryId && !catNames.has(p.mainCategoryId));
  console.log(`Orphan Products in Seed: ${orphanProducts.length}`);
  if (orphanProducts.length > 0) {
    console.log('Sample orphans:', orphanProducts.slice(0, 3).map(p => `${p.id}: ${p.name} (main: ${p.mainCategoryId})`));
  }
}

async function run() {
  await auditCloudTables();
  await auditProductsData();
}

run();
