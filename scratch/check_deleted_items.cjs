const fs = require('fs');
const https = require('https');

const SUPABASE_URL = 'akkjkjbnhafmolpvoiln.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

async function checkCloudProductsCount() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SUPABASE_URL,
      path: '/rest/v1/products?select=id',
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'count=exact'
      }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        const range = res.headers['content-range'];
        console.log(`Cloud Products Content-Range: ${range}`);
        resolve(range);
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function checkSeedProductsCount() {
  const seed = JSON.parse(fs.readFileSync('./public/products_seed.json', 'utf8'));
  console.log(`Seed Products Count: ${seed.products.length}`);
}

async function run() {
  console.log('===========================================================');
  console.log('FORENSIC COUNT COMPARISON: CLOUD VS SEED DATA');
  console.log('===========================================================');
  await checkSeedProductsCount();
  await checkCloudProductsCount();
}

run();
