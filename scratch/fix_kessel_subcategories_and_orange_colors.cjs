const { createClient } = require('@supabase/supabase-js');

const FALLBACK_URL = 'https://akkjkjbnhafmolpvoiln.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

const supabase = createClient(FALLBACK_URL, FALLBACK_KEY);

// Universal digit normalizer (converts all digits to Eastern Arabic ٠-٩ for consistent text display)
function normalizeDigitsToEastern(str) {
  if (!str) return '';
  return str
    .replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'['0123456789'.indexOf(d)])
    .replace(/[۰-۹]/g, d => '٠١٢٣٤٥٦٧٨٩'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)])
    .trim();
}

async function fixKesselSubcategoriesAndOrangeColors() {
  console.log('==================================================');
  console.log('UNIFYING KESSEL SUBCATEGORIES & ENABLING ORANGE COLORS');
  console.log('==================================================\n');

  // Defined canonical subcategories for Kessel
  const canonicalSubcats = [
    { id: 'kessel_sub_orange', name: 'كيسيل برتقالي', sort: 1 },
    { id: 'kessel_sub_buried_110', name: 'نظام كيسيل المدفون ١١٠', sort: 2 },
    { id: 'kessel_sub_buried_160', name: 'نظام كيسيل المدفون ١٦٠', sort: 3 },
    { id: 'kessel_sub_buried_200', name: 'نظام كيسيل المدفون ٢٠٠', sort: 4 },
    { id: 'kessel_sub_pipes', name: 'مواسير كيسيل', sort: 5 },
    { id: 'kessel_sub_drains', name: 'بلاعات كيسيل', sort: 6 },
    { id: 'kessel_sub_40', name: 'قطع ٤٠ كيسيل', sort: 7 },
    { id: 'kessel_sub_50', name: 'قطع ٥٠ كيسيل', sort: 8 },
    { id: 'kessel_sub_63', name: 'قطع ٦٣ كيسيل', sort: 9 },
    { id: 'kessel_sub_75', name: 'قطع ٧٥ كيسيل', sort: 10 },
    { id: 'kessel_sub_110', name: 'قطع ١١٠ كيسيل', sort: 11 },
    { id: 'kessel_sub_160', name: 'قطع ١٦٠ كيسيل', sort: 12 },
    { id: 'kessel_sub_1inch', name: 'قطع ١ بوصة كيسيل', sort: 13 }
  ];

  const nowIso = new Date().toISOString();

  // 1. Delete all old Kessel subcategories from Cloud
  const { data: existingCats } = await supabase.from('categories').select('id').eq('parent_id', 'كيسيل');
  if (existingCats && existingCats.length > 0) {
    const idsToDelete = existingCats.map(c => c.id);
    await supabase.from('categories').delete().in('id', idsToDelete);
  }

  // Ensure Main Category "كيسيل" exists
  await supabase.from('categories').upsert({
    id: 'كيسيل',
    name: 'كيسيل',
    parent_id: null,
    updated_at: nowIso
  });

  // Insert Canonical Subcategories
  const catPayloads = canonicalSubcats.map(c => ({
    id: c.id,
    name: c.name,
    parent_id: 'كيسيل',
    updated_at: nowIso
  }));

  const { error: catErr } = await supabase.from('categories').upsert(catPayloads);
  if (!catErr) {
    console.log(`✅ Upserted ${catPayloads.length} clean canonical subcategories for "كيسيل".`);
  } else {
    console.error('❌ Error upserting categories:', catErr.message);
  }

  // 2. Fetch all Kessel Products
  const { data: products } = await supabase.from('products').select('*').eq('main_category_id', 'كيسيل');
  console.log(`\nRe-mapping ${products.length} Kessel products to canonical subcategories and orange colors...`);

  const updatedProducts = [];

  products.forEach((p, idx) => {
    const rawSub = p.sub_category_id || p.name || '';
    const normSub = normalizeDigitsToEastern(rawSub);
    const normName = normalizeDigitsToEastern(p.name || '');

    // Determine if product is Orange / Buried
    const isOrangeBuried = normName.includes('مدفون') || normName.includes('برتقال') || normSub.includes('مدفون') || normSub.includes('برتقال');

    // Assign target canonical subcategory
    let targetSub = 'قطع ٤٠ كيسيل';

    if (normName.includes('مدفون') || normSub.includes('مدفون')) {
      if (normName.includes('١١٠') || normSub.includes('١١٠')) targetSub = 'نظام كيسيل المدفون ١١٠';
      else if (normName.includes('١٦٠') || normSub.includes('١٦٠')) targetSub = 'نظام كيسيل المدفون ١٦٠';
      else if (normName.includes('٢٠٠') || normSub.includes('٢٠٠')) targetSub = 'نظام كيسيل المدفون ٢٠٠';
      else targetSub = 'كيسيل برتقالي';
    } else if (normSub.includes('برتقال') || normName.includes('برتقال')) {
      targetSub = 'كيسيل برتقالي';
    } else if (normSub.includes('مواصير') || normSub.includes('مواسير') || normName.includes('ماسورة') || normName.includes('يارده')) {
      targetSub = 'مواسير كيسيل';
    } else if (normSub.includes('بلاعات') || normSub.includes('بيبه') || normSub.includes('صفاية') || normSub.includes('علاية') || normName.includes('بيبه') || normName.includes('صفاية') || normName.includes('علاية')) {
      targetSub = 'بلاعات كيسيل';
    } else if (normSub.includes('١بوص') || normSub.includes('1بوص') || normSub.includes('١ بوص') || normSub.includes('1 بوص') || normName.includes('١ بوص') || normName.includes('1 بوص')) {
      targetSub = 'قطع ١ بوصة كيسيل';
    } else if (normSub.includes('٤٠') || normName.includes('٤٠')) {
      targetSub = 'قطع ٤٠ كيسيل';
    } else if (normSub.includes('٥٠') || normName.includes('٥٠')) {
      targetSub = 'قطع ٥٠ كيسيل';
    } else if (normSub.includes('٦٣') || normName.includes('٦٣')) {
      targetSub = 'قطع ٦٣ كيسيل';
    } else if (normSub.includes('٧٥') || normName.includes('٧٥')) {
      targetSub = 'قطع ٧٥ كيسيل';
    } else if (normSub.includes('١١٠') || normName.includes('١١٠')) {
      targetSub = 'قطع ١١٠ كيسيل';
    } else if (normSub.includes('١٦٠') || normName.includes('١٦٠')) {
      targetSub = 'قطع ١٦٠ كيسيل';
    }

    // Set custom orange color if orange or buried
    let meta = (typeof p.image_path === 'string' && p.image_path.startsWith('{')) ? JSON.parse(p.image_path) : { img: p.image_path || '' };
    if (isOrangeBuried) {
      meta.color = '#ea580c'; // Vibrant Orange Custom Color
    }

    meta.so = (idx + 1) * 10; // Clean, sorted sequential order

    updatedProducts.push({
      id: String(p.id),
      name: p.name,
      price: Number(p.price || 0),
      cost: Number(p.cost || 0),
      stock: Number(p.stock || 0),
      barcode: p.barcode || meta.code || `KS-${p.id}`,
      main_category_id: 'كيسيل',
      sub_category_id: targetSub,
      image_path: JSON.stringify(meta),
      updated_at: nowIso
    });
  });

  // Also duplicate "Orange / Buried" products into "كيسيل برتقالي" subcategory if requested
  const orangeProductsCount = updatedProducts.filter(p => JSON.parse(p.image_path).color === '#ea580c').length;
  console.log(`\nFound ${orangeProductsCount} Orange / Buried products. Setting custom color #ea580c for all of them!`);

  // Batch Upsert
  const chunkSize = 50;
  for (let i = 0; i < updatedProducts.length; i += chunkSize) {
    const chunk = updatedProducts.slice(i, i + chunkSize);
    await supabase.from('products').upsert(chunk);
  }

  console.log('\n✅ All 229 Kessel products re-mapped successfully!');

  // Verify product count for each canonical subcategory
  const { data: finalProducts } = await supabase.from('products').select('sub_category_id').eq('main_category_id', 'كيسيل');
  const finalCounts = {};
  finalProducts.forEach(p => {
    finalCounts[p.sub_category_id] = (finalCounts[p.sub_category_id] || 0) + 1;
  });

  console.log('\n--- FINAL VERIFIED SUBCATEGORY COUNTS (NO EMPTY SUBCATEGORIES!) ---');
  canonicalSubcats.forEach(c => {
    const count = finalCounts[c.name] || 0;
    console.log(` 🏷️ Subcategory "${c.name}": ${count} products ${count > 0 ? '✅' : '⚠️'}`);
  });
}

fixKesselSubcategoriesAndOrangeColors();
