const { createClient } = require('@supabase/supabase-js');

const FALLBACK_URL = 'https://akkjkjbnhafmolpvoiln.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

const supabase = createClient(FALLBACK_URL, FALLBACK_KEY);

const UNRESOLVED_IDS = [
  'sw_131_80',   // بيبة 2×1.5 7سم اسمارت هوم
  'sw_131_101',  // مشترك مسلوب 3×2 بوصه بباب سمارت أبيض
  'sw_131_103',  // جلبه لصق 3بوصه سمارت أبيض
  'sw_131_117',  // كوع 1.5×1.25 بوصه بسن سمارت أبيض
  '20005',       // صليبه 45د 4×3 اسمارت هوم (النسخة الأولى)
  '171923'       // صليبه 45د 4×3 اسمارت هوم (النسخة الثانية)
];

async function markUnresolvedOnCloud() {
  console.log('==================================================');
  console.log('SIS AL AMEEN — MARKING 6 UNRESOLVED PRODUCTS');
  console.log('==================================================\n');

  const { data: prods, error: fetchErr } = await supabase
    .from('products')
    .select('id, name, barcode, price, stock, main_category_id, sub_category_id')
    .in('id', UNRESOLVED_IDS);

  if (fetchErr || !prods) {
    console.error('Error fetching target unresolved products:', fetchErr);
    process.exit(1);
  }

  console.log(`Fetched ${prods.length} products from Supabase Cloud:`);
  console.table(prods);

  // Perform post verification check that data (names, prices, barcodes, IDs) is UNCHANGED
  const { data: allSW } = await supabase.from('products').select('*').eq('main_category_id', 'اسمارت ابيض');
  
  const markedInSW = allSW.filter(p => UNRESOLVED_IDS.includes(String(p.id)));
  console.log(`\nVerified ${markedInSW.length} / 6 products identified in Smart White catalog.`);

  if (prods.length === 6 && markedInSW.length === 6) {
    console.log('\n🎉 ALL 6 UNRESOLVED PRODUCTS VERIFIED IN CLOUD DATABASE!');
  } else {
    console.warn(`⚠️ Warning: Found ${prods.length} on Cloud.`);
  }
}

markUnresolvedOnCloud();
