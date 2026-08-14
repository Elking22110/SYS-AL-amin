const { createClient } = require('@supabase/supabase-js');

const FALLBACK_URL = 'https://akkjkjbnhafmolpvoiln.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

const supabase = createClient(FALLBACK_URL, FALLBACK_KEY);

async function verifyAllKesselWithCodes() {
  console.log('==================================================');
  console.log('VERIFYING ALL KESSEL PRODUCTS & CODES IN CLOUD');
  console.log('==================================================\n');

  const { data: cloudKessel } = await supabase
    .from('products')
    .select('id, name, barcode, price, sub_category_id, image_path')
    .eq('main_category_id', 'كيسيل');

  console.log(`Total Active Kessel Products in Cloud: ${cloudKessel ? cloudKessel.length : 0}`);

  const subcatCounts = {};
  cloudKessel.forEach(p => {
    const sub = p.sub_category_id || 'عام';
    subcatCounts[sub] = (subcatCounts[sub] || 0) + 1;
  });

  console.log('\nSubcategory Breakdown:');
  Object.entries(subcatCounts).forEach(([sub, count]) => {
    console.log(` - Subcategory "${sub}": ${count} products`);
  });

  console.log('\nSample Kessel Products with Codes (POS Card View):');
  cloudKessel.slice(0, 15).forEach(p => {
    let meta = {};
    if (typeof p.image_path === 'string' && p.image_path.startsWith('{')) {
      try { meta = JSON.parse(p.image_path); } catch (_) {}
    }
    const code = p.barcode || meta.code || 'NO_CODE';
    console.log(` 🏷️ [Code: ${code}] | Name: "${p.name}" | Price: ${p.price} EGP | Sub: "${p.sub_category_id}"`);
  });
}

verifyAllKesselWithCodes();
