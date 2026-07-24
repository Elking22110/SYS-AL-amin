/**
 * scratch/apply_smart_audit_fixes.cjs
 * Applies subcategory and price corrections to products_seed.json and updates Supabase.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const seedPath = path.join(__dirname, '..', 'public', 'products_seed.json');
const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const products = seedData.products || [];

const SUPABASE_URL = 'akkjkjbnhafmolpvoiln.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

function apiRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: SUPABASE_URL,
      path: '/rest/v1/' + path,
      method,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      }
    };
    if (data) options.headers['Content-Length'] = Buffer.byteLength(data);
    const req = https.request(options, (res) => {
      let respData = '';
      res.on('data', c => respData += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(respData ? JSON.parse(respData) : {});
        } else {
          reject(new Error(`API Error ${res.statusCode}: ${respData}`));
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const subCatFixes = {
  '171881': '١بوصه',
  '172022': 'بوصه 4',
  '171977': 'بوصه 4',
  '172026': 'بوصه 6',
  '20105': 'بوصه 4',
  '171935': 'بوصه 4',
  '171905': 'بوصه 6',
  '171907': 'بوصه 2',
  '171913': 'بوصه 2',
  '171959': 'بوصه 3',
  '171965': 'بوصه 3',
  '171966': 'بوصه 3',
  '171968': 'بوصه ١,٥',
  '171969': 'بوصه 2',
  '171980': 'بوصه 2',
  '172034': 'بوصه ١,٥'
};

const priceFixes = {
  '20017': 253.25,
  '20060': 238.00
};

async function execute() {
  console.log('Applying updates to products_seed.json...');
  let updatedSeedCount = 0;
  
  for (const product of products) {
    const stringId = String(product.id);
    let changed = false;
    
    if (subCatFixes[stringId]) {
      console.log(`- ID ${stringId} (${product.name}): Subcategory ${product.subCategoryId} -> ${subCatFixes[stringId]}`);
      product.subCategoryId = subCatFixes[stringId];
      changed = true;
    }
    
    if (priceFixes[stringId]) {
      console.log(`- ID ${stringId} (${product.name}): Price ${product.price} -> ${priceFixes[stringId]}`);
      product.price = priceFixes[stringId];
      changed = true;
    }
    
    if (changed) {
      product.updated_at = new Date().toISOString();
      updatedSeedCount++;
    }
  }
  
  if (updatedSeedCount > 0) {
    fs.writeFileSync(seedPath, JSON.stringify(seedData, null, 2), 'utf8');
    console.log(`✅ Saved ${updatedSeedCount} updates to products_seed.json!`);
  } else {
    console.log('No changes needed in products_seed.json.');
  }

  console.log('\nSyncing corrected products to Supabase...');
  for (const [idStr, subCat] of Object.entries(subCatFixes)) {
    const id = parseInt(idStr);
    const prod = products.find(p => p.id === id);
    if (!prod) continue;
    
    // We update both sub_category_id and updated_at
    const updateBody = {
      sub_category_id: subCat,
      updated_at: new Date().toISOString()
    };
    if (priceFixes[idStr]) {
      updateBody.price = priceFixes[idStr];
    }
    
    console.log(`- Supabase: Updating product ID ${idStr} (${prod.name})...`);
    await apiRequest('PATCH', `products?id=eq.${id}`, updateBody);
  }

  // Handle remaining price fixes that did not have subcategory fixes (if any)
  for (const [idStr, price] of Object.entries(priceFixes)) {
    if (subCatFixes[idStr]) continue; // already updated above
    const id = parseInt(idStr);
    const prod = products.find(p => p.id === id);
    if (!prod) continue;
    
    const updateBody = {
      price: price,
      updated_at: new Date().toISOString()
    };
    
    console.log(`- Supabase: Updating price for ID ${idStr} (${prod.name})...`);
    await apiRequest('PATCH', `products?id=eq.${id}`, updateBody);
  }

  console.log('✅ All corrections synced with Supabase successfully!');
}

execute().catch(err => {
  console.error('Execution failed:', err);
  process.exit(1);
});
