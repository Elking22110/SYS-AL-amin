const fs = require('fs');
const https = require('https');

const SUPABASE_URL = 'akkjkjbnhafmolpvoiln.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

function httpReq(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        resolve({ status: res.statusCode, body: body ? JSON.parse(body) : null });
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runStressVerification() {
  console.log('===========================================================');
  console.log('STARTING 100-CYCLE STRESS VERIFICATION & INTEGRITY TEST');
  console.log('===========================================================');

  let createCount = 0;
  let updateCount = 0;
  let deleteCount = 0;
  let failures = 0;

  const testIds = [];

  for (let i = 1; i <= 100; i++) {
    const pId = `stress_prod_${i}_${Date.now()}`;
    testIds.push(pId);

    // 1. CREATE
    const createOpt = {
      hostname: SUPABASE_URL,
      path: '/rest/v1/products',
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=representation'
      }
    };
    const cPayload = [{
      id: pId,
      name: `منتج اختبار الإجهاد ${i}`,
      price: 100 + i,
      cost: 50 + i,
      stock: 10 + i,
      barcode: `STRESS_${i}`,
      main_category_id: 'الاهرام بولي+صرف',
      sub_category_id: 'قطع ١,٥ بولى الاهرام',
      image_path: JSON.stringify({ color: '#112233', code: `ST_${i}`, wp: 80 + i, img: '' }),
      updated_at: new Date().toISOString()
    }];

    const cRes = await httpReq(createOpt, cPayload);
    if (cRes.status >= 200 && cRes.status < 300) createCount++;
    else { failures++; console.error(`Create failed cycle ${i}:`, cRes); }

    // 2. UPDATE
    const uPayload = [{
      id: pId,
      name: `منتج اختبار الإجهاد ${i} (معدل)`,
      price: 200 + i,
      cost: 150 + i,
      stock: 5 + i,
      barcode: `STRESS_UPD_${i}`,
      main_category_id: 'الاهرام بولي+صرف',
      sub_category_id: 'قطع ١بوصه بولى الاهرام',
      image_path: JSON.stringify({ color: '#445566', code: `ST_U_${i}`, wp: 180 + i, img: '' }),
      updated_at: new Date().toISOString()
    }];

    const uRes = await httpReq(createOpt, uPayload);
    if (uRes.status >= 200 && uRes.status < 300) updateCount++;
    else { failures++; console.error(`Update failed cycle ${i}:`, uRes); }

    // 3. DELETE
    const dOpt = {
      hostname: SUPABASE_URL,
      path: `/rest/v1/products?id=eq.${encodeURIComponent(pId)}`,
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    };
    const dRes = await httpReq(dOpt);
    if (dRes.status >= 200 && dRes.status < 300) deleteCount++;
    else { failures++; console.error(`Delete failed cycle ${i}:`, dRes); }

    if (i % 25 === 0) {
      console.log(`Completed ${i}/100 cycles...`);
    }
  }

  // Final verification: Ensure none of the 100 test items exist in DB
  console.log('\n--- FINAL INTEGRITY CHECK (VERIFY ZERO REAPPEARANCE) ---');
  const checkOpt = {
    hostname: SUPABASE_URL,
    path: `/rest/v1/products?id=in.(${testIds.join(',')})`,
    method: 'GET',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  };
  const checkRes = await httpReq(checkOpt);
  const remainingCount = (checkRes.body || []).length;

  console.log('\n===========================================================');
  console.log('STRESS TEST SUMMARY RESULTS:');
  console.log(`Total Cycles: 100`);
  console.log(`Creates Succeeded: ${createCount}/100`);
  console.log(`Updates Succeeded: ${updateCount}/100`);
  console.log(`Deletes Succeeded: ${deleteCount}/100`);
  console.log(`Total Failures: ${failures}`);
  console.log(`Remaining Zombie Records in DB: ${remainingCount}`);
  console.log(`Final Verification Result: ${failures === 0 && remainingCount === 0 ? 'PASSED 100% PERFECT ✅' : 'FAILED ❌'}`);
  console.log('===========================================================');
}

runStressVerification();
