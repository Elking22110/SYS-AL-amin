const fs = require('fs');
const https = require('https');

const SUPABASE_URL = 'akkjkjbnhafmolpvoiln.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

async function fetchAllCloudProductIds() {
  let allCloudIds = new Set();
  let offset = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const pageIds = await new Promise((resolve, reject) => {
      const options = {
        hostname: SUPABASE_URL,
        path: `/rest/v1/products?select=id&offset=${offset}&limit=${pageSize}`,
        method: 'GET',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      };
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            resolve(data.map(p => String(p.id)));
          } catch (e) {
            resolve([]);
          }
        });
      });
      req.on('error', reject);
      req.end();
    });

    pageIds.forEach(id => allCloudIds.add(id));
    if (pageIds.length < pageSize) {
      hasMore = false;
    } else {
      offset += pageSize;
    }
  }

  return allCloudIds;
}

async function runForensicMissingAnalysis() {
  console.log('Fetching all product IDs from Supabase Cloud...');
  const cloudIds = await fetchAllCloudProductIds();
  console.log(`Fetched ${cloudIds.size} total product IDs from Supabase Cloud.`);

  const seed = JSON.parse(fs.readFileSync('./public/products_seed.json', 'utf8'));
  const missingProducts = seed.products.filter(p => !cloudIds.has(String(p.id)));

  console.log(`\nFound ${missingProducts.length} missing products from Cloud!`);

  // Group missing products by mainCategoryId
  const byMainCat = {};
  missingProducts.forEach(p => {
    const main = p.mainCategoryId || 'UNASSIGNED';
    byMainCat[main] = (byMainCat[main] || 0) + 1;
  });

  console.log('\nMissing Products Breakdown by Main Category:');
  Object.entries(byMainCat).sort((a, b) => b[1] - a[1]).forEach(([main, count]) => {
    console.log(`- ${main}: ${count} missing products`);
  });

  console.log('\nFirst 20 Missing Products Sample:');
  missingProducts.slice(0, 20).forEach(p => {
    console.log(`ID: ${p.id} | Name: ${p.name} | Main: ${p.mainCategoryId} | Sub: ${p.subCategoryId}`);
  });
}

runForensicMissingAnalysis();
