/**
 * scratch/apply_br_audit_fixes.cjs
 * Applies subcategory corrections to BR products based on br_audit_report.json and updates Supabase.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const seedPath = path.join(__dirname, '..', 'public', 'products_seed.json');
const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const products = seedData.products || [];

const reportPath = path.join(__dirname, 'br_audit_report.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

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

// Extract fixes from report
const subCatFixes = {};
Object.entries(report).forEach(([sub, items]) => {
  items.forEach(item => {
    const isSubcatIssue = item.issues.some(issue => issue.includes('المجموعة الفرعية'));
    if (isSubcatIssue) {
      const match = item.issues[0].match(/المفترض:\s*([^)]+)/);
      if (match) {
        subCatFixes[String(item.id)] = match[1].trim();
      }
    }
  });
});

async function execute() {
  console.log(`Extracted ${Object.keys(subCatFixes).length} BR subcategory fixes from report.`);
  console.log('Applying updates to products_seed.json...');
  let updatedSeedCount = 0;
  
  for (const product of products) {
    const stringId = String(product.id);
    
    if (subCatFixes[stringId]) {
      console.log(`- ID ${stringId} (${product.name}): Subcategory ${product.subCategoryId} -> ${subCatFixes[stringId]}`);
      product.subCategoryId = subCatFixes[stringId];
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
    
    const updateBody = {
      sub_category_id: subCat,
      updated_at: new Date().toISOString()
    };
    
    console.log(`- Supabase: Updating BR product ID ${idStr} (${prod.name}) -> ${subCat}...`);
    await apiRequest('PATCH', `products?id=eq.${id}`, updateBody);
  }

  console.log('✅ All BR corrections synced with Supabase successfully!');
}

execute().catch(err => {
  console.error('Execution failed:', err);
  process.exit(1);
});
