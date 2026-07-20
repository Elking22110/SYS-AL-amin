/**
 * fix_smart_subcategories.cjs
 * يصلح منتجات اسمارت ابيض الي لسه sub_category_id = 'قطع سمارت' في Supabase
 */

const https = require('https');

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
        'Accept': 'application/json',
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

// ============================================================
// Smart sub-category classifier by product name
// Sub cats: بوصه 6, بوصه 4, بوصه 3, بوصه 2, بوصه ١,٥, ١بوصه
// ============================================================
function getSmartSubCat(name) {
  // === مم160+ or مم315 -> بوصه 6
  if (/مم\s*1[6-9]\d|مم\s*[23]\d\d|١٦٠|١٦0|160مم|مم160|315مم|مم315/.test(name)) return 'بوصه 6';

  // === مم110 -> بوصه 4
  if (/مم\s*1[01]\d(?!\d)|١١٠|110مم|مم110(?!\d)/.test(name)) return 'بوصه 4';

  // === مم75 or مم90 -> بوصه 3
  if (/مم\s*[789]\d(?!\d)|٧٥|٩٠|75مم|90مم|مم75(?!\d)|مم90(?!\d)/.test(name)) return 'بوصه 3';

  // === مم63 or مم60 -> بوصه 2
  if (/مم\s*6[03](?!\d)|٦٣|٦٠|63مم|60مم|مم63(?!\d)|مم60(?!\d)/.test(name)) return 'بوصه 2';

  // === مم48 or مم32 or 1 بوصة -> بوصه ١,٥
  if (/مم\s*4[58](?!\d)|مم\s*32(?!\d)|٤٨|٣٢|بوصة1(?!\d)|1\"(?!\d)|\"1(?!\d)|١ بوصة|بوصه 1|١بوصه/.test(name)) return 'بوصه ١,٥';

  // === ¾" or مم20-25 -> ١بوصه
  if (/3\/4|¾|٤\/٣|٣\/٤|مم\s*2[05](?!\d)|مم20|مم25/.test(name)) return '١بوصه';

  // === غرفة / مجرى / جاليتراب / قفيز -> بوصه 4
  if (name.includes('غرفة') || name.includes('مجرى مائى') || name.includes('مجرى مائي') ||
      name.includes('جاليتراب') || name.includes('جلتراب') || name.includes('قفيز') ||
      name.includes('حديد مجلفن') || name.includes('غرفة رفع')) return 'بوصه 4';

  // === وصلة مرنة / وصلة / حنفية / خلاط دفن -> ١بوصه  
  if (name.includes('وصلة مرنة') || name.includes('حنفية') || name.includes('خﻼط دفن') ||
      name.includes('خلاط دفن') || name.includes('حنفية الغسالة') || name.includes('وش استانلس')) return '١بوصه';

  // === مسلوب (reducers) - look at sizes in name
  if (name.includes('مسلوب')) {
    if (/١١٠|110/.test(name)) return 'بوصه 4';
    if (/١٦٠|160/.test(name)) return 'بوصه 6';
    if (/٧٥|٩٠|75|90/.test(name)) return 'بوصه 3';
    if (/٦٣|٦٠|63|60/.test(name)) return 'بوصه 2';
    if (/٤٨|48/.test(name)) return 'بوصه ١,٥';
    if (/٣\/٤|3\/4/.test(name)) return '١بوصه';
    return 'بوصه 3';
  }

  // === سيفون / وصلة تمدد / مانع ارتداد / جلبة إصلاح
  if (name.includes('سيفون') || name.includes('وصلة تمدد') || name.includes('مانع ارتداد') ||
      name.includes('جلبة إصﻼح') || name.includes('جلبة اصلاح')) {
    if (/١١٠|110/.test(name)) return 'بوصه 4';
    if (/١٦٠|160/.test(name)) return 'بوصه 6';
    if (/٧٥|75/.test(name)) return 'بوصه 3';
    if (/٦٣|٦٠|63|60/.test(name)) return 'بوصه 2';
    if (/٤٨|48/.test(name)) return 'بوصه ١,٥';
    return 'بوصه 4';
  }

  // === غطاء / وش / رقبة -> بوصه 4 (default for miscellaneous covers)
  if (name.includes('غطاء') || name.includes('وش')) {
    if (/١١٠|110/.test(name)) return 'بوصه 4';
    if (/١٦٠|160/.test(name)) return 'بوصه 6';
    if (/٧٥|75/.test(name)) return 'بوصه 3';
    return 'بوصه 4';
  }

  // === مواسير (pipes) by size
  if (name.includes('مواسير')) {
    if (/١٦٠|160/.test(name)) return 'بوصه 6';
    if (/١١٠|110/.test(name)) return 'بوصه 4';
    if (/٧٥|75/.test(name)) return 'بوصه 3';
    if (/٦٣|٦٠|63|60/.test(name)) return 'بوصه 2';
    if (/٣٢|32/.test(name)) return 'بوصه ١,٥';
    return 'بوصه 4';
  }

  // === بيبة / مجرى / مجمع -> by size
  if (name.includes('بيبة') || name.includes('بيبه') || name.includes('مجرى') ||
      name.includes('مجمع') || name.includes('جاليتراب') || name.includes('رقبة')) {
    if (/١١٠|110/.test(name)) return 'بوصه 4';
    if (/١٦٠|160/.test(name)) return 'بوصه 6';
    if (/٧٥|75/.test(name)) return 'بوصه 3';
    if (/٦٣|٦٠|63|60/.test(name)) return 'بوصه 2';
    return 'بوصه 4';
  }

  // === كوع / مشترك / جلبة / طبة / مسلوب -> look at bigger size in name
  // Try largest mm mentioned
  const mmMatches = name.match(/مم\s*(\d+)/g) || [];
  const mmValues = mmMatches.map(m => parseInt(m.replace(/مم\s*/, '')));
  const maxMm = mmValues.length > 0 ? Math.max(...mmValues) : 0;

  if (maxMm >= 160) return 'بوصه 6';
  if (maxMm >= 110) return 'بوصه 4';
  if (maxMm >= 75) return 'بوصه 3';
  if (maxMm >= 63) return 'بوصه 2';
  if (maxMm >= 40) return 'بوصه ١,٥';
  if (maxMm >= 20) return '١بوصه';

  // Also try Arabic numerals
  if (/١١٠/.test(name)) return 'بوصه 4';
  if (/٧٥/.test(name)) return 'بوصه 3';
  if (/٦٣|٦٠/.test(name)) return 'بوصه 2';
  if (/٤٨|٣٢/.test(name)) return 'بوصه ١,٥';

  // Default
  return 'بوصه 4';
}

// ============================================================
// Main: fetch all SM with 'قطع سمارت', classify, update Supabase
// ============================================================
async function main() {
  console.log('='.repeat(60));
  console.log('🔧 Fix Smart Home Products Sub-Category in Supabase');
  console.log('='.repeat(60));

  // Fetch all SM products with wrong sub_category_id = 'قطع سمارت'
  const encodedMain = encodeURIComponent('اسمارت ابيض');
  const encodedSub = encodeURIComponent('قطع سمارت');

  const result = await apiRequest('GET',
    `products?main_category_id=eq.${encodedMain}&sub_category_id=eq.${encodedSub}&select=id,name&limit=500`
  );

  if (!result.ok) {
    console.error('❌ Failed to fetch products:', result.body.substring(0, 300));
    return;
  }

  const products = JSON.parse(result.body);
  console.log(`\n📦 Found ${products.length} SM products still with "قطع سمارت" subcategory\n`);

  if (products.length === 0) {
    console.log('✅ All Smart products already have correct subcategories!');
    return;
  }

  // Classify each product
  const groups = {};
  products.forEach(p => {
    const sub = getSmartSubCat(p.name || '');
    if (!groups[sub]) groups[sub] = [];
    groups[sub].push(p.id);
  });

  console.log('📊 Classification results:');
  Object.entries(groups).forEach(([sub, ids]) => {
    console.log(`  ${sub}: ${ids.length} products`);
  });

  // Apply updates in batches grouped by new sub_category_id
  let totalUpdated = 0;
  let totalErrors = 0;
  const batchSize = 50;

  for (const [newSub, ids] of Object.entries(groups)) {
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      const idList = batch.map(id => `"${id}"`).join(',');
      const body = { sub_category_id: newSub, updated_at: new Date().toISOString() };
      const patchResult = await apiRequest(
        'PATCH',
        `products?id=in.(${idList})`,
        body,
        { 'Prefer': 'return=minimal' }
      );

      if (patchResult.ok) {
        totalUpdated += batch.length;
        process.stdout.write(`\r  ✅ Updated ${totalUpdated}/${products.length} products...`);
      } else {
        totalErrors += batch.length;
        console.error(`\n  ❌ Error [newSub=${newSub}]:`, patchResult.body.substring(0, 200));
      }
    }
  }

  console.log(`\n\n=== DONE ===`);
  console.log(`✅ Successfully updated: ${totalUpdated}`);
  if (totalErrors > 0) console.log(`❌ Errors: ${totalErrors}`);

  // Verify
  const verifyResult = await apiRequest('GET',
    `products?main_category_id=eq.${encodedMain}&sub_category_id=eq.${encodedSub}&select=id&limit=10`
  );
  const remaining = JSON.parse(verifyResult.body);
  console.log(`\n🔍 Remaining with "قطع سمارت": ${remaining.length}`);
  if (remaining.length === 0) console.log('✅ All Smart products now have correct subcategories in Supabase!');
}

main().catch(console.error);
