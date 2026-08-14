const { createClient } = require('@supabase/supabase-js');

const FALLBACK_URL = 'https://akkjkjbnhafmolpvoiln.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

const supabase = createClient(FALLBACK_URL, FALLBACK_KEY);

async function verifyKesselSyncReady() {
  console.log('==================================================');
  console.log('VERIFYING KESSEL PRODUCTS IN CLOUD & SUBCATEGORIES');
  console.log('==================================================\n');

  // Categories
  const { data: categories } = await supabase.from('categories').select('*');
  const kesselSubcats = categories.filter(c => c.parent_id === 'كيسيل' || c.id === 'كيسيل' || c.name.includes('كيسيل'));

  console.log(`Main Category & Subcategories found (${kesselSubcats.length}):`);
  kesselSubcats.forEach(c => {
    console.log(` - ID: "${c.id}" | Name: "${c.name}" | Parent: "${c.parent_id}"`);
  });

  // Products
  const { data: kesselProds } = await supabase
    .from('products')
    .select('id, name, price, stock, sub_category_id')
    .eq('main_category_id', 'كيسيل');

  console.log(`\nTotal Active Kessel Products in Cloud: ${kesselProds.length}`);

  // Breakdown by subcategory
  const subcatCounts = {};
  kesselProds.forEach(p => {
    const sub = p.sub_category_id || 'غير محدد';
    subcatCounts[sub] = (subcatCounts[sub] || 0) + 1;
  });

  console.log('\nBreakdown of Kessel Products by Subcategory ID:');
  Object.entries(subcatCounts).forEach(([sub, count]) => {
    const subObj = categories.find(c => String(c.id) === String(sub));
    const subName = subObj ? subObj.name : sub;
    console.log(` - Subcategory "${subName}" (ID: ${sub}): ${count} products`);
  });

  console.log('\nSample Kessel Products:');
  kesselProds.slice(0, 10).forEach(p => {
    console.log(` - [${p.id}] ${p.name} | Price: ${p.price} EGP | Stock: ${p.stock}`);
  });
}

verifyKesselSyncReady();
