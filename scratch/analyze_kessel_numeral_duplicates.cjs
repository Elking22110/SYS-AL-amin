const { createClient } = require('@supabase/supabase-js');

const FALLBACK_URL = 'https://akkjkjbnhafmolpvoiln.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

const supabase = createClient(FALLBACK_URL, FALLBACK_KEY);

// Helper to normalize digits to Eastern Arabic digits (٠-٩)
function normalizeArabicDigits(str) {
  if (!str) return '';
  return str
    // Persian/Urdu digits to Eastern Arabic digits
    .replace(/۰/g, '٠').replace(/۱/g, '١').replace(/۲/g, '٢').replace(/۳/g, '٣').replace(/۴/g, '٤')
    .replace(/۵/g, '٥').replace(/۶/g, '٦').replace(/۷/g, '٧').replace(/۸/g, '٨').replace(/۹/g, '٩')
    // Western digits to Eastern Arabic digits
    .replace(/0/g, '٠').replace(/1/g, '١').replace(/2/g, '٢').replace(/3/g, '٣').replace(/4/g, '٤')
    .replace(/5/g, '٥').replace(/6/g, '٦').replace(/7/g, '٧').replace(/8/g, '٨').replace(/9/g, '٩')
    .trim();
}

async function analyzeAndFixKesselNumerals() {
  console.log('==================================================');
  console.log('ANALYZING KESSEL NUMERAL DUPLICATES & UNIFYING');
  console.log('==================================================\n');

  // Fetch all categories
  const { data: categories } = await supabase.from('categories').select('*');
  const kesselCats = categories.filter(c => c.parent_id === 'كيسيل' || c.id === 'كيسيل' || (c.name && c.name.includes('كيسيل')));

  console.log(`Total Kessel Categories in DB: ${kesselCats.length}`);

  // Map of normalized name to canonical category object
  const normalizedCatMap = new Map();
  const catIdRedirectMap = new Map(); // oldId -> canonicalId

  kesselCats.forEach(c => {
    if (c.id === 'كيسيل') return;
    const normName = normalizeArabicDigits(c.name);

    if (!normalizedCatMap.has(normName)) {
      normalizedCatMap.set(normName, c);
    } else {
      const canonical = normalizedCatMap.get(normName);
      catIdRedirectMap.set(c.id, canonical.id);
      console.log(` 🔄 Merging Category [ID: "${c.id}" | Name: "${c.name}"] -> Canonical [ID: "${canonical.id}" | Name: "${canonical.name}"]`);
    }
  });

  // Fetch all Kessel products
  const { data: kesselProds } = await supabase
    .from('products')
    .select('id, name, sub_category_id')
    .eq('main_category_id', 'كيسيل');

  console.log(`\nTotal Kessel Products in DB: ${kesselProds.length}`);

  const nowIso = new Date().toISOString();
  let updatedProductCount = 0;

  // Update products sub_category_id to canonical normalized subcategory name/ID
  const updatedProdsPayload = [];
  kesselProds.forEach(p => {
    const rawSub = p.sub_category_id || 'عام';
    const normSub = normalizeArabicDigits(rawSub);
    const redirectId = catIdRedirectMap.get(rawSub);

    let targetSub = rawSub;
    if (redirectId) {
      targetSub = redirectId;
    } else {
      // Find matching canonical category by normalized name
      const matchingCanonical = Array.from(normalizedCatMap.values()).find(c => normalizeArabicDigits(c.name) === normSub);
      if (matchingCanonical) {
        targetSub = matchingCanonical.name;
      }
    }

    if (targetSub !== p.sub_category_id) {
      updatedProdsPayload.push({
        id: String(p.id),
        sub_category_id: targetSub,
        updated_at: nowIso
      });
      updatedProductCount++;
    }
  });

  console.log(`Products needing subcategory normalization: ${updatedProductCount}`);

  // Delete redundant category records from Supabase Cloud
  const redundantCatIds = Array.from(catIdRedirectMap.keys());
  if (redundantCatIds.length > 0) {
    console.log(`Deleting ${redundantCatIds.length} redundant duplicate category records from Cloud...`);
    const { error: delCatErr } = await supabase.from('categories').delete().in('id', redundantCatIds);
    if (!delCatErr) {
      console.log(' ✅ Redundant category records deleted from Cloud.');
    } else {
      console.error(' ❌ Error deleting redundant categories:', delCatErr.message);
    }
  }

  // Update products in chunks
  if (updatedProdsPayload.length > 0) {
    console.log(`Updating ${updatedProdsPayload.length} products to unified subcategories...`);
    const chunkSize = 50;
    for (let i = 0; i < updatedProdsPayload.length; i += chunkSize) {
      const chunk = updatedProdsPayload.slice(i, i + chunkSize);
      await supabase.from('products').upsert(chunk);
    }
    console.log(' ✅ Products updated successfully.');
  }

  // Final verification of categories
  const { data: finalCats } = await supabase.from('categories').select('*').eq('parent_id', 'كيسيل');
  console.log(`\n🎉 Final Active Subcategories for Kessel in Cloud (${finalCats.length}):`);
  finalCats.forEach(c => {
    console.log(` - ID: "${c.id}" | Name: "${c.name}"`);
  });
}

analyzeAndFixKesselNumerals();
