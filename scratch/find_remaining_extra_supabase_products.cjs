const https = require('https');
const fs    = require('fs');
const path  = require('path');

const SUPABASE_URL = 'akkjkjbnhafmolpvoiln.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

function fetchPage(offset = 0, limit = 1000) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: SUPABASE_URL,
      path: `/rest/v1/products?select=id,name,barcode,price,updated_at&limit=${limit}&offset=${offset}`,
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json'
      }
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  const seedPath = path.join(__dirname, '../public/products_seed.json');
  const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  const approvedProds = seedData.products || [];
  const approvedIds = new Set(approvedProds.map(p => String(p.id)));

  console.log(`Approved catalog count: ${approvedProds.length}`);

  let allCloud = [];
  let page = await fetchPage(0, 1000);
  allCloud.push(...page);
  page = await fetchPage(1000, 1000);
  allCloud.push(...page);
  page = await fetchPage(2000, 1000);
  allCloud.push(...page);

  console.log(`Cloud products count: ${allCloud.length}`);

  const extraInCloud = allCloud.filter(p => !approvedIds.has(String(p.id)));
  console.log(`Extra products in cloud (not in approved catalog): ${extraInCloud.length}`);

  extraInCloud.forEach((p, i) => {
    console.log(`[${i+1}] ID: ${p.id} | Name: "${p.name}" | Price: ${p.price} | Barcode: ${p.barcode || '-'}`);
  });

  if (extraInCloud.length > 0) {
    console.log('\nDeleting these remaining extra items from Supabase...');
    const idsToDelete = extraInCloud.map(p => encodeURIComponent(String(p.id))).join(',');
    const deleteOpts = {
      hostname: SUPABASE_URL,
      path: `/rest/v1/products?id=in.(${idsToDelete})`,
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json'
      }
    };
    await new Promise((res, rej) => {
      const req = https.request(deleteOpts, r => res(r.statusCode));
      req.on('error', rej);
      req.end();
    });
    console.log('✅ Remaining extra items deleted.');
  }
}

main().catch(console.error);
