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
  const data = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  const products = data.products || [];

  const NEW_POLY_SUBCAT = 'قطع ١بوصه بولى الاهرام';
  const OLD_MIXED_SUBCAT = 'قطع ١بوصه الاهرام ابيض';
  
  // These IDs are 1-inch poly products that should move to the new poly subcategory
  const polyIds = new Set([
    80159, 80160, 80161, 80162, 80163, 80164, 80165, 80166, 80167,
    80168, 80169, 80170, 80171, 80172, 80173, 80179, 80180
  ].map(String));

  const toUpdate = [];
  let dryRun = false;

  products.forEach(p => {
    const id = String(p.id);
    if (p.subCategoryId === OLD_MIXED_SUBCAT && polyIds.has(id)) {
      console.log(`Moving [${p.id}] ${p.name}  →  ${NEW_POLY_SUBCAT}`);
      toUpdate.push(p);
    }
  });

  console.log(`\nTotal to move: ${toUpdate.length}`);

  if (dryRun) {
    console.log('\n[DRY RUN] Set dryRun=false to apply changes.');
    return;
  }

  // Apply changes to seed
  const now = new Date().toISOString();
  const uploadBatch = [];
  toUpdate.forEach(p => {
    p.subCategoryId = NEW_POLY_SUBCAT;
    p.updated_at = now;
    uploadBatch.push({
      id: String(p.id),
      name: p.name,
      price: Number(p.price) || 0,
      cost: Number(p.cost || p.costPrice) || 0,
      stock: Number(p.stock) || 0,
      barcode: p.barcode ? String(p.barcode) : null,
      main_category_id: p.mainCategoryId ? String(p.mainCategoryId) : null,
      sub_category_id: NEW_POLY_SUBCAT,
      updated_at: now
    });
  });

  fs.writeFileSync(seedPath, JSON.stringify(data, null, 2), 'utf8');
  console.log('Saved seed file.');

  const { ok, status, body } = await apiRequest('POST', 'products', uploadBatch);
  if (ok) {
    console.log(`✅ Successfully updated ${uploadBatch.length} products on Supabase.`);
  } else {
    console.error(`❌ Failed. Status: ${status}, Body: ${body}`);
  }
}

main().catch(console.error);
