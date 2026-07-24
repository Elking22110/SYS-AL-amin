const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'akkjkjbnhafmolpvoiln.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

function apiRequest(method, path, body, extraHeaders = {}) {
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
        'Prefer': 'resolution=merge-duplicates,return=minimal',
        ...extraHeaders
      }
    };
    if (data) options.headers['Content-Length'] = Buffer.byteLength(data);
    const req = https.request(options, (res) => {
      let respData = '';
      res.on('data', c => respData += c);
      res.on('end', () => resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, body: respData }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  const seedPath = path.join(__dirname, '..', 'public', 'products_seed.json');
  const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  const products = seedData.products || [];

  const updatedProducts = [];
  
  products.forEach(p => {
    let name = p.name;
    let newName = name;
    
    if (name.startsWith('PPR-DR11-PN10')) {
      newName = name.replace('PPR-DR11-PN10', 'PN10');
    } else if (name.startsWith('PPR-DR6-PN20')) {
      newName = name.replace('PPR-DR6-PN20', 'PN20');
    } else if (name.startsWith('PPR-DR74-PN16')) {
      newName = name.replace('PPR-DR74-PN16', 'PN16');
    } else if (name.startsWith('PPR-DR74PN16')) {
      newName = name.replace('PPR-DR74PN16', 'PN16');
    } else if (name.startsWith('PPRCTDR11PN16')) {
      newName = name.replace('PPRCTDR11PN16', 'PN16');
    }
    
    if (newName !== name) {
      p.name = newName;
      p.updated_at = new Date().toISOString();
      updatedProducts.push(p);
    }
  });

  console.log(`Matched and renamed locally: ${updatedProducts.length} products.`);

  if (updatedProducts.length > 0) {
    // 1. Write back to products_seed.json
    fs.writeFileSync(seedPath, JSON.stringify(seedData, null, 2), 'utf8');
    console.log(`Saved updated seed file to ${seedPath}`);

    // 2. Upload/Upsert to Supabase
    const now = new Date().toISOString();
    const mappedForSupabase = updatedProducts.map(p => ({
      id: String(p.id),
      name: p.name,
      price: Number(p.price) || 0,
      cost: Number(p.cost || p.costPrice || p.cost_price) || 0,
      stock: Number(p.stock) || 0,
      barcode: p.barcode ? String(p.barcode) : null,
      main_category_id: p.mainCategoryId ? String(p.mainCategoryId) : null,
      sub_category_id: p.subCategoryId ? String(p.subCategoryId) : null,
      image_path: p.imagePath ? String(p.imagePath) : null,
      updated_at: now
    }));

    console.log(`Uploading ${mappedForSupabase.length} renamed products to Supabase...`);
    const { ok, status, body } = await apiRequest('POST', 'products', mappedForSupabase);
    if (ok) {
      console.log('✅ Successfully updated product names on Supabase.');
    } else {
      console.error(`❌ Failed to update Supabase. Status: ${status}, Body: ${body}`);
    }
  }
}

main().catch(console.error);
