/**
 * scratch/apply_brand_name_fixes.cjs
 * Cleans name suffixes and appends brand identifiers to BR, Kessel, and Smart Home White products.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const seedPath = path.join(__dirname, '..', 'public', 'products_seed.json');
const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const products = seedData.products || [];

const SUPABASE_URL = 'akkjkjbnhafmolpvoiln.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

function apiRequest(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: SUPABASE_URL,
      path: '/rest/v1/' + urlPath,
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

function cleanAndBrandName(name, mainCat) {
  let clean = name.trim();
  
  // 1. Clean trailing trash numbers (like 0 0, 00, .00, -00, -0)
  clean = clean.replace(/[\s\.\-]+0+(?:\s+0+)*\s*$/g, '').trim();
  clean = clean.replace(/\.00*$/g, '').trim();

  // 2. Check and append brand identifier
  if (mainCat === 'Br') {
    const hasBR = clean.includes('BR') || clean.includes('بي ار') || clean.includes('بي أر') || clean.includes('بي.ار') || clean.includes('B.R') || clean.includes('بي آر');
    if (!hasBR) {
      clean = clean + ' BR';
    }
  } else if (mainCat === 'كيسيل') {
    const hasKessel = clean.includes('كيسيل') || clean.includes('كيسل') || clean.includes('KS') || clean.includes('Kessel');
    if (!hasKessel) {
      clean = clean + ' كيسيل';
    }
  } else if (mainCat === 'اسمارت ابيض') {
    const hasSmart = clean.includes('سمارت') || clean.includes('اسمارت') || clean.includes('SM') || clean.includes('Smart');
    if (!hasSmart) {
      clean = clean + ' سمارت';
    }
  }
  
  return clean;
}

async function execute() {
  console.log('Auditing and updating product names in seed file...');
  let updatedSeedCount = 0;
  const updatesList = [];
  
  for (const product of products) {
    const mainCat = product.mainCategoryId;
    if (!['Br', 'كيسيل', 'اسمارت ابيض'].includes(mainCat)) continue;
    
    const originalName = product.name || '';
    const newName = cleanAndBrandName(originalName, mainCat);
    
    if (originalName !== newName) {
      console.log(`- ID ${product.id}: "${originalName}" -> "${newName}"`);
      product.name = newName;
      product.updated_at = new Date().toISOString();
      updatedSeedCount++;
      updatesList.push({ id: product.id, name: newName });
    }
  }
  
  if (updatedSeedCount > 0) {
    fs.writeFileSync(seedPath, JSON.stringify(seedData, null, 2), 'utf8');
    console.log(`✅ Saved ${updatedSeedCount} name updates to products_seed.json!`);
  } else {
    console.log('No name updates needed in products_seed.json.');
  }

  console.log('\nSyncing updated names to Supabase...');
  for (const update of updatesList) {
    const updateBody = {
      name: update.name,
      updated_at: new Date().toISOString()
    };
    
    console.log(`- Supabase: Updating product ID ${update.id} name to: "${update.name}"...`);
    await apiRequest('PATCH', `products?id=eq.${update.id}`, updateBody);
  }

  console.log('✅ All product names cleaned and updated with brand identifiers successfully!');
}

execute().catch(err => {
  console.error('Execution failed:', err);
  process.exit(1);
});
