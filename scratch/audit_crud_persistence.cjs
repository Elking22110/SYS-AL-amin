const fs = require('fs');
const https = require('https');

const SUPABASE_URL = 'akkjkjbnhafmolpvoiln.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

function httpPost(table, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const options = {
      hostname: SUPABASE_URL,
      path: `/rest/v1/${table}`,
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=representation',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        resolve({ status: res.statusCode, body: body ? JSON.parse(body) : null });
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function httpDelete(table, id) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SUPABASE_URL,
      path: `/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`,
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    };
    const req = https.request(options, (res) => {
      resolve({ status: res.statusCode });
    });
    req.on('error', reject);
    req.end();
  });
}

async function runCrudAudit() {
  console.log('===========================================================');
  console.log('TESTING COMPLETE CRUD & PERSISTENCE PIPELINE ON SUPABASE');
  console.log('===========================================================');

  const testProdId = `test_audit_${Date.now()}`;
  const nowIso = new Date().toISOString();

  // 1. CREATE PRODUCT
  console.log('\n--- 1. CREATE PRODUCT ---');
  const createPayload = [{
    id: testProdId,
    name: 'منتج تجربة تدقيق الجاهزية',
    price: 150.5,
    cost: 100.0,
    stock: 50,
    barcode: 'AUDIT_BARCODE_001',
    main_category_id: 'الاهرام بولي+صرف',
    sub_category_id: 'قطع ١,٥ بولى الاهرام',
    image_path: JSON.stringify({ color: '#ff0000', code: 'SUPP_999', wp: 130, img: 'test.jpg' }),
    updated_at: nowIso
  }];

  const createRes = await httpPost('products', createPayload);
  console.log(`Create Product Status: ${createRes.status} | Output:`, createRes.body);
  const createdSuccess = createRes.status >= 200 && createRes.status < 300;

  // 2. UPDATE PRODUCT (Price, Cost, Stock, Barcode, SubCategory, Wholesale Price)
  console.log('\n--- 2. UPDATE PRODUCT ---');
  const updatePayload = [{
    id: testProdId,
    name: 'منتج تجربة تدقيق الجاهزية (معدل)',
    price: 175.0,
    cost: 110.0,
    stock: 45,
    barcode: 'AUDIT_BARCODE_002',
    main_category_id: 'الاهرام بولي+صرف',
    sub_category_id: 'قطع ١بوصه بولى الاهرام',
    image_path: JSON.stringify({ color: '#00ff00', code: 'SUPP_888', wp: 140, img: 'test_updated.jpg' }),
    updated_at: new Date().toISOString()
  }];

  const updateRes = await httpPost('products', updatePayload);
  console.log(`Update Product Status: ${updateRes.status} | Output:`, updateRes.body);
  const updatedSuccess = updateRes.status >= 200 && updateRes.status < 300;

  // 3. DELETE PRODUCT (Tombstone & Physical Delete)
  console.log('\n--- 3. DELETE PRODUCT ---');
  const deleteRes = await httpDelete('products', testProdId);
  console.log(`Delete Product Status: ${deleteRes.status} (Expected 204 or 200)`);
  const deletedSuccess = deleteRes.status >= 200 && deleteRes.status < 300;

  // 4. CATEGORY & SUBCATEGORY CRUD
  console.log('\n--- 4. CATEGORY CRUD ---');
  const testCatId = `cat_audit_${Date.now()}`;
  const catCreatePayload = [{
    id: testCatId,
    name: 'فئة رئيسية تجربة تدقيق',
    parent_id: null,
    updated_at: new Date().toISOString()
  }];

  const catCreateRes = await httpPost('categories', catCreatePayload);
  console.log(`Create Main Category Status: ${catCreateRes.status} | Output:`, catCreateRes.body);

  const catDeleteRes = await httpDelete('categories', testCatId);
  console.log(`Delete Main Category Status: ${catDeleteRes.status}`);

  console.log('\n===========================================================');
  console.log('SUMMARY AUDIT RESULTS:');
  console.log(`Product Create: ${createdSuccess ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log(`Product Update: ${updatedSuccess ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log(`Product Delete: ${deletedSuccess ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log('===========================================================');
}

runCrudAudit();
