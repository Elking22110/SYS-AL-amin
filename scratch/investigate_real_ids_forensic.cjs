const { createClient } = require('@supabase/supabase-js');

const FALLBACK_URL = 'https://akkjkjbnhafmolpvoiln.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

const supabase = createClient(FALLBACK_URL, FALLBACK_KEY);

async function investigateRealIds() {
  console.log('==================================================');
  console.log('FORENSIC INVESTIGATION OF REAL IDs IN SUPABASE CLOUD');
  console.log('==================================================\n');

  const targetIds = ['171310', '171311', '80023', '171126', '171127'];

  for (const targetId of targetIds) {
    // Try string query
    const { data: strData, error: strErr } = await supabase
      .from('products')
      .select('*')
      .eq('id', targetId);

    // Try number query if applicable
    const numId = Number(targetId);
    let numData = null;
    if (!isNaN(numId)) {
      const { data } = await supabase.from('products').select('*').eq('id', numId);
      numData = data;
    }

    const records = (strData && strData.length > 0) ? strData : (numData && numData.length > 0 ? numData : []);

    console.log(`🆔 TARGET ID: ${targetId}`);
    if (records.length > 0) {
      const rec = records[0];
      console.log(`   Status: EXISTS IN SUPABASE CLOUD ✅`);
      console.log(`   Name: "${rec.name}"`);
      console.log(`   Price: ${rec.price} | Stock: ${rec.stock}`);
      console.log(`   Barcode: ${rec.barcode || 'null'}`);
      console.log(`   Main Category: "${rec.main_category_id}" | Sub: "${rec.sub_category_id}"`);
      console.log(`   Updated At: ${rec.updated_at}`);
    } else {
      console.log(`   Status: NOT FOUND IN SUPABASE CLOUD ❌`);
    }
    console.log('--------------------------------------------------');
  }

  // Count total products in Supabase Cloud
  const { count, error: countErr } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });

  console.log(`\nExact Cloud Products COUNT(*): ${count}`);

  // Fetch all IDs using pagination (pages of 1000)
  let allCloudIds = [];
  let page = 0;
  let pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data: pageData } = await supabase
      .from('products')
      .select('id')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (pageData && pageData.length > 0) {
      allCloudIds.push(...pageData.map(p => String(p.id)));
      if (pageData.length < pageSize) hasMore = false;
      else page++;
    } else {
      hasMore = false;
    }
  }

  const uniqueCloudIds = new Set(allCloudIds);
  console.log(`Fetched Cloud IDs Count: ${allCloudIds.length}`);
  console.log(`Unique Cloud IDs Count: ${uniqueCloudIds.size}`);
  console.log(`Parity Check (COUNT(*) === Unique IDs): ${count === uniqueCloudIds.size ? 'MATCH ✅' : 'MISMATCH ❌'}`);
}

investigateRealIds();
