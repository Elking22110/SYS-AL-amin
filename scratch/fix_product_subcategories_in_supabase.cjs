/**
 * fix_product_subcategories_in_supabase.cjs
 * يصلح الـ subCategoryId الغلط في قاعدة بيانات Supabase مباشرةً
 * الاستخدام: node scratch/fix_product_subcategories_in_supabase.cjs
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'akkjkjbnhafmolpvoiln.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

// ============================================================
// Build the full fix map from the seed analysis
// ============================================================

// Direct subCategoryId remapping
const DIRECT_MAP = {
  'قطع ١١٠ كيسيل': 'قطع ١١٠',
  'قطع ١٦٠ كيسيل': 'قطع ١٦٠',
  'قطع ٧٥ كيسيل':  'قطع ٧٥',
  'قطع ٦٣ كيسيل':  'قطع ٦٣ كيسل',
  'قطع ٥٠ كيسيل':  'قطع ٥٠',
  'قطع ٢٠٠ كيسيل': 'نظام كيسل المدفون ٢٠٠',
  'قطع ٦ بوصه':    'قطع ٦بوصه',
  'قطع ٤ بوصه':    'قطع ٤بوصه',
  'قطع ٣ بوصه':    'قطع ٣بوصه',
  'قطع ٢ بوصه':    'قطع ٢بوصه',
  'مجر + جلتراب':  'مجر + جلتراپ',
  'وصلة تجاري':    'وصلة مرنة تجاري',
  'قطع ١بوصه بولى الاهرام': 'قطع ١بوصه الاهرام ابيض',
  'قطع ١,٥ بولى الاهرام':   'قطع ١,٥ ابيض الاهرام',
};

// Kessel generic: subCategoryId = قطع كيسيل -> classify by product name
function getKesselSubCat(name) {
  if (name.includes('مواسير') || name.includes('ياردة') || 
      name.includes('غطاء مواسير') || name.includes('وصلة بباب كشف') || 
      name.includes('طبة بيبة') || name.includes('50/40مسلوب') || 
      name.includes('مجمع صرف')) {
    return 'مواسير كيسل';
  }
  if (name.includes('صفاية') || name.includes('عﻼية بغطاء') || 
      name.includes('عﻼية صفاية') || name.includes('بيبة') || 
      name.includes('بيبه') || name.includes('مخرج جانبى') || 
      name.includes('مخرج من أسفل') || name.includes('غطاء بيبة') || 
      name.includes('رقبة جاليتراب') || name.includes('رقبة طويلة') || 
      name.includes('برقع بيبة') || name.includes('مانع رائحة') || 
      name.includes('غطاء استانلس') || name.includes('صفاية مخرج') || 
      name.includes('صفاية قصيرة') || name.includes('صفاية بمخرج')) {
    return 'بلاعات كيسل';
  }
  return 'بلاعات كيسل';
}

// Smart: subCategoryId = قطع سمارت -> classify by product name
function getSmartSubCat(name) {
  if (/مم\s*1[56]\d|مم\s*3\d\d|١٦٠|مم160|315مم/.test(name)) return 'بوصه 6';
  if (/مم\s*1[01]\d|١١٠|110مم|مم110/.test(name)) return 'بوصه 4';
  if (/مم\s*[789]\d|٧٥|٩٠|75مم|90مم|مم75|مم90/.test(name)) return 'بوصه 3';
  if (/مم\s*6[03]|٦٣|٦٠|63مم|60مم|مم63|مم60/.test(name)) return 'بوصه 2';
  if (/مم\s*4[58]|مم\s*32|٤٨|٣٢|بوصة1|1\"|\"1|١ بوصة|بوصه 1/.test(name)) return 'بوصه ١,٥';
  if (/3\/4|¾|٤\/٣|مم\s*2[59]/.test(name)) return '١بوصه';
  if (name.includes('غرفة') || name.includes('مجرى مائى') || 
      name.includes('مجرى مائي') || name.includes('جاليتراب') || 
      name.includes('جلتراب') || name.includes('حديد مجلفن')) return 'بوصه 4';
  if (name.includes('وصلة مرنة') || name.includes('حنفية') || 
      name.includes('خﻼط دفن')) return '١بوصه';
  if (name.includes('مسلوب')) {
    if (/١١٠|110/.test(name)) return 'بوصه 4';
    if (/٧٥|٩٠|75|90/.test(name)) return 'بوصه 3';
    if (/٦٣|٦٠|63|60/.test(name)) return 'بوصه 2';
    return 'بوصه 3';
  }
  if (name.includes('سيفون') || name.includes('وصلة تمدد') || 
      name.includes('مانع ارتداد') || name.includes('جلبة إصﻼح')) {
    if (/١١٠|110/.test(name)) return 'بوصه 4';
    if (/٧٥|75/.test(name)) return 'بوصه 3';
    if (/٦٠|٦٣|60|63/.test(name)) return 'بوصه 2';
    return 'بوصه 4';
  }
  if (name.includes('غطاء') || name.includes('وش استانلس')) return 'بوصه 4';
  if (name.includes('مواسير')) {
    if (/١٦٠|160/.test(name)) return 'بوصه 6';
    if (/١١٠|110/.test(name)) return 'بوصه 4';
    if (/٧٥|75/.test(name)) return 'بوصه 3';
    if (/٦٣|٦٠|63|60/.test(name)) return 'بوصه 2';
    if (/٣٢|32/.test(name)) return 'بوصه ١,٥';
    return 'بوصه 4';
  }
  return 'بوصه 4';
}

// BR Laham: mainCategoryId = بي ار لحام -> move to Br with correct sub
function getBrSubCat(subOld, name) {
  if (subOld === 'قطع بولي' || subOld === 'فلانشات وقطع بولي') {
    let newSub = 'قطع ٢ بوصة';
    if (/مم\s*25|مم25/.test(name)) newSub = 'قطع ٢/١';
    else if (/مم\s*32|مم32/.test(name)) newSub = 'قطع ٤/٣ بوصة';
    else if (/مم\s*40|مم40/.test(name)) newSub = 'قطع ١ بوصة';
    else if (/مم\s*50|مم50/.test(name)) newSub = 'قطع ١,٢٥ بوصة';
    else if (/مم\s*63|مم63/.test(name)) newSub = 'قطع ١,٥ بوصة';
    else if (/مم\s*75|مم75/.test(name)) newSub = 'قطع ٢ بوصة';
    else if (/مم\s*90|مم90/.test(name)) newSub = 'قطع ٢ بوصة';
    else if (/مم\s*110|مم110/.test(name)) newSub = 'قطع مشكله BR اسمارت و';
    else if (/مم\s*160|مم160/.test(name)) newSub = 'قطع مشكله BR اسمارت و';
    if (subOld === 'فلانشات وقطع بولي') newSub = 'قطع مشكله BR اسمارت و';
    return newSub;
  }
  if (subOld === 'محابس ووصلات بولي') {
    if (/١\s*بوصه|1 بوصه|1"|32|١بوص/.test(name)) return 'قطع ١ بوصة';
    if (/3\/4|٤\/٣/.test(name)) return 'قطع ٤/٣ بوصة';
    return 'قطع ١ بوصة';
  }
  return 'قطع ٢ بوصة';
}

// Ahram: بولى ٢ و ٣ بوصه الاهرام
function getAhramSubCat(name) {
  if (/٢\s*بوصه|م\s*2|ص2/.test(name)) return 'قطع ٢بوصه الاهرام ابيض';
  if (/٣\s*بوصه|٣بوصه/.test(name)) return 'قطع ٣بوصه الاهرام ابيض';
  if (/مم\s*63|٦٣/.test(name)) return 'قطع ٢بوصه الاهرام ابيض';
  if (/مم\s*75|٧٥/.test(name)) return 'قطع ٣بوصه الاهرام ابيض';
  return 'قطع ٢بوصه الاهرام ابيض';
}

// ============================================================
// API helper
// ============================================================
function apiRequest(method, path, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: SUPABASE_URL,
      path: `/rest/v1/${path}`,
      method,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
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

async function fetchAll(table) {
  // Fetch all products in batches of 1000
  let all = [];
  let offset = 0;
  const batchSize = 1000;
  while (true) {
    const result = await apiRequest('GET', `${table}?select=id,name,sub_category_id,main_category_id&limit=${batchSize}&offset=${offset}`, null, { 'Accept': 'application/json' });
    if (!result.ok) {
      console.error('Error fetching:', result.body.substring(0, 300));
      break;
    }
    const rows = JSON.parse(result.body);
    if (!rows || rows.length === 0) break;
    all = all.concat(rows);
    if (rows.length < batchSize) break;
    offset += batchSize;
    process.stdout.write(`\r  Fetched ${all.length} products...`);
  }
  console.log(`\n  Total fetched: ${all.length}`);
  return all;
}

async function main() {
  console.log('='.repeat(60));
  console.log('🔧 Fix Product Subcategory IDs in Supabase');
  console.log('='.repeat(60));

  // 1. Fetch all products from Supabase
  console.log('\n📥 Fetching all products from Supabase...');
  const products = await fetchAll('products');
  console.log(`Fetched ${products.length} products.`);

  // 2. Determine fixes needed
  const updates = []; // { id, newSubCat, newMainCat (optional) }

  for (const p of products) {
    const sub = p.sub_category_id;
    const main = p.main_category_id;
    const name = p.name || '';

    // Direct mapping
    if (sub && DIRECT_MAP[sub]) {
      updates.push({ id: p.id, sub_category_id: DIRECT_MAP[sub] });
      continue;
    }

    // قطع كيسيل (generic Kessel)
    if (sub === 'قطع كيسيل' && main === 'كيسيل') {
      updates.push({ id: p.id, sub_category_id: getKesselSubCat(name) });
      continue;
    }

    // قطع سمارت
    if (sub === 'قطع سمارت' && main === 'اسمارت ابيض') {
      updates.push({ id: p.id, sub_category_id: getSmartSubCat(name) });
      continue;
    }

    // بي ار لحام -> Br
    if (main === 'بي ار لحام') {
      const newSub = getBrSubCat(sub, name);
      updates.push({ id: p.id, main_category_id: 'Br', sub_category_id: newSub });
      continue;
    }

    // بولى ٢ و ٣ بوصه الاهرام
    if (sub === 'بولى ٢ و ٣ بوصه الاهرام') {
      updates.push({ id: p.id, sub_category_id: getAhramSubCat(name) });
      continue;
    }

    // عام + أصناف متنوعة -> remove subCategoryId
    if (sub === 'عام' && main === 'أصناف متنوعة') {
      updates.push({ id: p.id, sub_category_id: null });
      continue;
    }
  }

  console.log(`\n🔍 Found ${updates.length} products needing subcategory fixes.`);
  if (updates.length === 0) {
    console.log('✅ Everything looks correct already!');
    return;
  }

  // Group by what fields are being updated
  const byMainAndSub = updates.filter(u => u.main_category_id);
  const bySubOnly = updates.filter(u => !u.main_category_id);
  
  console.log(`  - Sub only changes: ${bySubOnly.length}`);
  console.log(`  - Main + Sub changes: ${byMainAndSub.length}`);

  // 3. Apply updates in batches using PATCH
  // Supabase PATCH by ID requires filtering
  const batchSize = 50;
  let done = 0;
  let errors = 0;

  // Process sub-only updates in groups by new sub_category_id value
  // (batch update all products with same new value at once using IN filter)
  const byNewSub = {};
  bySubOnly.forEach(u => {
    const key = u.sub_category_id || 'NULL';
    if (!byNewSub[key]) byNewSub[key] = [];
    byNewSub[key].push(u.id);
  });

  console.log('\n📤 Applying sub_category_id updates...');
  for (const [newSub, ids] of Object.entries(byNewSub)) {
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      const idList = batch.map(id => `"${id}"`).join(',');
      const body = { sub_category_id: newSub === 'NULL' ? null : newSub, updated_at: new Date().toISOString() };
      const result = await apiRequest('PATCH', `products?id=in.(${idList})`, body, { 'Prefer': 'return=minimal' });
      if (result.ok) {
        done += batch.length;
        process.stdout.write(`\r  ✅ Updated ${done}/${updates.length} products...`);
      } else {
        errors += batch.length;
        console.error(`\n  ❌ Error updating batch [newSub=${newSub}]:`, result.body.substring(0, 200));
      }
    }
  }

  // Process main + sub updates individually (they need different values per product)
  // Group by combination
  const byCombo = {};
  byMainAndSub.forEach(u => {
    const key = `${u.main_category_id}|${u.sub_category_id}`;
    if (!byCombo[key]) byCombo[key] = [];
    byCombo[key].push(u.id);
  });

  for (const [combo, ids] of Object.entries(byCombo)) {
    const [newMain, newSub] = combo.split('|');
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      const idList = batch.map(id => `"${id}"`).join(',');
      const body = { main_category_id: newMain, sub_category_id: newSub, updated_at: new Date().toISOString() };
      const result = await apiRequest('PATCH', `products?id=in.(${idList})`, body, { 'Prefer': 'return=minimal' });
      if (result.ok) {
        done += batch.length;
        process.stdout.write(`\r  ✅ Updated ${done}/${updates.length} products...`);
      } else {
        errors += batch.length;
        console.error(`\n  ❌ Error updating batch [main=${newMain}, sub=${newSub}]:`, result.body.substring(0, 200));
      }
    }
  }

  console.log(`\n\n=== DONE ===`);
  console.log(`✅ Successfully updated: ${done}`);
  if (errors > 0) console.log(`❌ Errors: ${errors}`);
  console.log('');
  console.log('🔄 Now trigger a product sync on the POS app to pull the changes locally.');
}

main().catch(console.error);
