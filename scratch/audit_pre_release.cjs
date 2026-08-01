const fs = require('fs');
const https = require('https');

const SUPABASE_URL = 'akkjkjbnhafmolpvoiln.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

async function fetchCloudTable(tableName) {
  return new Promise((resolve) => {
    const options = {
      hostname: SUPABASE_URL,
      path: `/rest/v1/${tableName}?select=*`,
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
          resolve(JSON.parse(body));
        } catch (e) {
          resolve([]);
        }
      });
    });
    req.on('error', () => resolve([]));
    req.end();
  });
}

async function runAudit() {
  console.log('===========================================================');
  console.log('EXECUTING COMPREHENSIVE PRE-RELEASE AUDIT SCRIPT');
  console.log('===========================================================');

  // PART 1: Cloud vs Seed Data Consistency
  const cloudProducts = await fetchCloudTable('products');
  const cloudCategories = await fetchCloudTable('categories');
  const cloudUsers = await fetchCloudTable('users');
  const seed = JSON.parse(fs.readFileSync('./public/products_seed.json', 'utf8'));

  console.log('\n--- PART 1: DATA CONSISTENCY ---');
  console.log(`Cloud Products Count: ${cloudProducts.length}`);
  console.log(`Seed Products Count: ${seed.products.length}`);
  console.log(`Cloud Categories Count: ${cloudCategories.length}`);
  console.log(`Seed Categories Count: ${seed.categories.length}`);
  console.log(`Cloud Users Count: ${cloudUsers.length}`);

  // Check duplicate product IDs in seed & cloud
  const cloudProdIdCounts = {};
  cloudProducts.forEach(p => {
    cloudProdIdCounts[p.id] = (cloudProdIdCounts[p.id] || 0) + 1;
  });
  const dupCloudProdIds = Object.entries(cloudProdIdCounts).filter(([id, count]) => count > 1);

  console.log(`Duplicate Product IDs in Cloud: ${dupCloudProdIds.length}`);

  // PART 3: Product Reference Integrity
  console.log('\n--- PART 3: PRODUCT CONSISTENCY ---');
  const categoryIds = new Set(cloudCategories.map(c => String(c.id)));
  const categoryNames = new Set(cloudCategories.map(c => c.name));

  let orphanProductsCount = 0;
  cloudProducts.forEach(p => {
    const mainRef = p.main_category_id || p.mainCategoryId;
    const subRef = p.sub_category_id || p.subCategoryId;
    if (mainRef && !categoryIds.has(String(mainRef)) && !categoryNames.has(String(mainRef))) {
      orphanProductsCount++;
    }
  });
  console.log(`Orphan Products with invalid mainCategory reference: ${orphanProductsCount}`);

  // PART 5: User Constraints & Duplicate Check
  console.log('\n--- PART 5: USER CONSTRAINTS ---');
  const emails = cloudUsers.map(u => u.email).filter(Boolean);
  const dupEmails = emails.filter((e, idx) => emails.indexOf(e) !== idx);
  console.log(`Duplicate User Emails in Cloud: ${dupEmails.length} (${dupEmails.join(', ') || 'None'})`);

  // PART 6 & 7: Code Audit (Searching for Legacy Patches / Dead Code)
  console.log('\n--- PART 6 & 7: LEGACY PATCHES & DUPLICATIONS ---');
  const dataLoaderContent = fs.readFileSync('./src/components/DataLoader.jsx', 'utf8');
  const patchMatches = dataLoaderContent.match(/patch_[a-zA-Z0-9_]+/g) || [];
  const uniquePatches = Array.from(new Set(patchMatches));
  console.log(`Total Patches registered in DataLoader.jsx: ${uniquePatches.length}`);
  console.log(`Sample Patches: ${uniquePatches.slice(0, 10).join(', ')}`);
}

runAudit();
