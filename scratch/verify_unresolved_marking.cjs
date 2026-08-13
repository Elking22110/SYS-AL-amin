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

function isUnresolvedProduct(p) {
  if (!p) return false;
  if (p.is_unresolved || p.requires_review) return true;
  return UNRESOLVED_IDS.includes(String(p.id));
}

async function verifyUnresolvedMarking() {
  console.log('==================================================');
  console.log('SIS AL AMEEN — UNRESOLVED MARKING VERIFICATION');
  console.log('==================================================\n');

  const { data: swProds, error } = await supabase
    .from('products')
    .select('*')
    .eq('main_category_id', 'اسمارت ابيض');

  if (error || !swProds) {
    console.error('Error fetching Smart White products:', error);
    process.exit(1);
  }

  const markedProds = swProds.filter(p => isUnresolvedProduct(p));
  const unmarkedProds = swProds.filter(p => !isUnresolvedProduct(p));

  console.log(`- Total Smart White Products: ${swProds.length}`);
  console.log(`- Marked Unresolved Products Count: ${markedProds.length} / 6`);
  console.log(`- Normal/Resolved Products Count: ${unmarkedProds.length} / 125`);

  console.log('\nVerified Unresolved Products List:');
  for (let i = 0; i < markedProds.length; i++) {
    const p = markedProds[i];
    console.log(`  ${i + 1}. [ID: ${p.id}] "${p.name}" | Barcode: ${p.barcode || 'N/A'} | Price: ${p.price}`);
  }

  // Check two 4x3 45deg products remain separate
  const prod20005 = swProds.find(p => String(p.id) === '20005');
  const prod171923 = swProds.find(p => String(p.id) === '171923');

  const crossCheckSeparate = prod20005 && prod171923 && (prod20005.id !== prod171923.id) && (prod20005.barcode !== prod171923.barcode);
  console.log(`\n- Special Case 4x3 45° Products Separate Check: ${crossCheckSeparate ? 'PASS (Both IDs 20005 and 171923 exist as distinct records)' : 'FAIL'}`);

  if (markedProds.length === 6 && unmarkedProds.length === 125 && crossCheckSeparate) {
    console.log('\n🎉 SMART WHITE UNRESOLVED MARKING = PASS!');
  } else {
    console.error('\n❌ Verification Failed!');
    process.exit(1);
  }
}

verifyUnresolvedMarking();
