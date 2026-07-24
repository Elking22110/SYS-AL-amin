/**
 * scratch/apply_kessel_audit_fixes.cjs
 * Applies subcategory, name and price corrections to Kessel products and updates Supabase.
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
  '171821': 'قطع ١١٠',
  '171822': 'بلاعات كيسل',
  '171830': 'قطع ١١٠',
  '172065': 'بلاعات كيسل',
  '172067': 'بلاعات كيسل',
  '172070': 'بلاعات كيسل',
  '172072': 'بلاعات كيسل',
  '40011': 'مواسير كيسل',
  '40014': 'نظام كيسيل المدفون ١٦٠',
  '40017': 'نظام كيسيل المدفون ١٦٠',
  '40019': 'مواسير كيسل',
  '40026': 'نظام كيسل المدفون ٢٠٠',
  '40027': 'مواسير كيسل',
  '40036': 'مواسير كيسل',
  '40040': 'قطع ٧٥',
  '40042': 'بلاعات كيسل',
  '40046': 'مواسير كيسل',
  '40047': 'مواسير كيسل',
  '40048': 'مواسير كيسل',
  '40049': 'بلاعات كيسل',
  '40050': 'قطع ١١٠',
  '40051': 'قطع ٥٠',
  '40052': 'قطع ٥٠',
  '40053': 'قطع ٥٠',
  '40080': 'بلاعات كيسل',
  '40082': 'قطع ١٦٠',
  '40150': 'نظام كيسيل المدفون ١١٠',
  '40151': 'نظام كيسيل المدفون ١١٠',
  '40166': 'نظام كيسيل المدفون ١١٠',
  '40168': 'نظام كيسيل المدفون ١١٠',
  '40171': 'نظام كيسيل المدفون ١١٠',
  '40182': 'نظام كيسيل المدفون ١١٠',
  '40183': 'نظام كيسيل المدفون ١١٠',
  '40114': 'نظام كيسل المدفون ٢٠٠',
  '40164': 'نظام كيسيل المدفون ١٦٠',
  '40165': 'نظام كيسيل المدفون ١٦٠',
  '40180': 'نظام كيسيل المدفون ١٦٠',
  '40132': 'قطع ٥٠',
  '40133': 'مواسير كيسل'
};

const nameFixes = {
  '40040': 'هواية ٧٥ مم كيسيل',
  '40050': 'كوع ١١٠ مم ٩٠ درجة كيسيل',
  '40051': 'كوع ٥٠ مم ٤٥ درجة كيسيل',
  '40052': 'جلبة ٥٠ مم كيسيل',
  '40053': 'طبة ٥٠ مم كيسيل',
  '40055': 'طبة ٥٠ مم كيسيل'
};

const priceFixes = {
  '40055': 35.00
};

async function execute() {
  console.log('Applying Kessel updates to products_seed.json...');
  let updatedSeedCount = 0;
  
  for (const product of products) {
    const stringId = String(product.id);
    let changed = false;
    
    if (subCatFixes[stringId]) {
      console.log(`- ID ${stringId} (${product.name}): Subcategory ${product.subCategoryId} -> ${subCatFixes[stringId]}`);
      product.subCategoryId = subCatFixes[stringId];
      changed = true;
    }
    
    if (nameFixes[stringId]) {
      console.log(`- ID ${stringId} (${product.name}): Name -> ${nameFixes[stringId]}`);
      product.name = nameFixes[stringId];
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
  
  // Set of all unique product IDs we need to update
  const allUpdatedIds = new Set([
    ...Object.keys(subCatFixes),
    ...Object.keys(nameFixes),
    ...Object.keys(priceFixes)
  ]);
  
  for (const idStr of allUpdatedIds) {
    const id = parseInt(idStr);
    const prod = products.find(p => p.id === id);
    if (!prod) continue;
    
    const updateBody = {
      updated_at: new Date().toISOString()
    };
    
    if (subCatFixes[idStr]) {
      updateBody.sub_category_id = subCatFixes[idStr];
    }
    if (nameFixes[idStr]) {
      updateBody.name = nameFixes[idStr];
    }
    if (priceFixes[idStr]) {
      updateBody.price = priceFixes[idStr];
    }
    
    console.log(`- Supabase: Updating Kessel product ID ${idStr} (${prod.name})...`);
    await apiRequest('PATCH', `products?id=eq.${id}`, updateBody);
  }

  console.log('✅ All Kessel corrections synced with Supabase successfully!');
}

execute().catch(err => {
  console.error('Execution failed:', err);
  process.exit(1);
});
