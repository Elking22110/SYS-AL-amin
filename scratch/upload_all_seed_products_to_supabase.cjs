/**
 * upload_all_seed_products_to_supabase.cjs
 * يضمن رفع جميع الـ 2746 منتج الموجودة في products_seed.json إلى Supabase بالكامل
 * الاستخدام: node scratch/upload_all_seed_products_to_supabase.cjs
 */

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
  console.log('='.repeat(60));
  console.log('🚀 Uploading ALL 2746 Seed Products to Supabase');
  console.log('='.repeat(60));

  const seedPath = path.join(__dirname, '..', 'public', 'products_seed.json');
  const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  const products = seedData.products || [];

  console.log(`\n📦 Loaded ${products.length} products from products_seed.json`);

  // Map products to database columns (snake_case)
  const now = new Date().toISOString();
  const mapped = products.map(p => ({
    id: String(p.id),
    name: p.name || 'بدون اسم',
    price: Number(p.price) || 0,
    cost: Number(p.cost || p.costPrice || p.cost_price) || 0,
    stock: Number(p.stock) || 0,
    barcode: p.barcode ? String(p.barcode) : null,
    main_category_id: p.mainCategoryId ? String(p.mainCategoryId) : (p.main_category_id ? String(p.main_category_id) : null),
    sub_category_id: p.subCategoryId ? String(p.subCategoryId) : (p.sub_category_id ? String(p.sub_category_id) : null),
    image_path: p.imagePath || p.image_path || null,
    updated_at: p.updated_at || now
  }));

  // Batch upload (100 products per request)
  const batchSize = 100;
  let totalUploaded = 0;
  let totalErrors = 0;

  for (let i = 0; i < mapped.length; i += batchSize) {
    const batch = mapped.slice(i, i + batchSize);
    const result = await apiRequest('POST', 'products', batch);

    if (result.ok) {
      totalUploaded += batch.length;
      process.stdout.write(`\r  ✅ Uploaded ${totalUploaded}/${mapped.length} products to Supabase...`);
    } else {
      console.error(`\n  ❌ Error uploading batch [${i}-${i + batchSize}]:`, result.body.substring(0, 300));
      totalErrors += batch.length;
    }
  }

  console.log(`\n\n=== SUMMARY ===`);
  console.log(`✅ Successfully uploaded/merged: ${totalUploaded}`);
  if (totalErrors > 0) console.log(`❌ Errors: ${totalErrors}`);

  // Check total in Supabase
  const countRes = await new Promise((resolve) => {
    const req = https.get(`https://${SUPABASE_URL}/rest/v1/products?select=*`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Prefer': 'count=exact', 'Range': '0-0' }
    }, (res) => {
      resolve(res.headers['content-range'] || 'unknown');
    });
    req.on('error', () => resolve('error'));
  });

  console.log(`\n📊 Total Products in Supabase now: ${countRes.split('/')[1] || countRes}`);
}

main().catch(console.error);
