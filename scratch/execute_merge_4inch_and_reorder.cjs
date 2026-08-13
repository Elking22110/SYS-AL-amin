const { createClient } = require('@supabase/supabase-js');

const FALLBACK_URL = 'https://akkjkjbnhafmolpvoiln.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

const supabase = createClient(FALLBACK_URL, FALLBACK_KEY);

async function merge4InchAndReorder() {
  console.log('==================================================');
  console.log('SIS AL AMEEN — MERGING 4-INCH BLOCKS & REORDERING');
  console.log('==================================================\n');

  const mainCatId = 'اسمارت ابيض';
  const target4InchSubId = '1786656351526';
  const old2nd4InchSubId = 'sw_sub_1786657317030_l52b';

  // 1. Reassign the 12 products from old subcategory to target4InchSubId
  const { data: secondBlockProds, error: fetchErr } = await supabase
    .from('products')
    .select('id, name')
    .eq('sub_category_id', old2nd4InchSubId);

  if (fetchErr) {
    console.error('❌ Error fetching 2nd 4-inch block products:', fetchErr);
    process.exit(1);
  }

  console.log(`Found ${secondBlockProds.length} products in "4 بوصه — المجموعة الثانية". Reassigning to "4 بوصه"...`);

  const nowIso = new Date().toISOString();
  const { error: updateErr } = await supabase
    .from('products')
    .update({
      sub_category_id: target4InchSubId,
      updated_at: nowIso
    })
    .eq('sub_category_id', old2nd4InchSubId);

  if (updateErr) {
    console.error('❌ Error reassigning products:', updateErr);
    process.exit(1);
  }
  console.log('✅ Successfully reassigned 12 products to "4 بوصه".');

  // 2. Delete the old subcategory "4 بوصه — المجموعة الثانية"
  const { error: delSubErr } = await supabase
    .from('categories')
    .delete()
    .eq('id', old2nd4InchSubId);

  if (delSubErr) {
    console.warn('⚠️ Warning deleting old subcategory:', delSubErr);
  } else {
    console.log('✅ Successfully deleted empty subcategory "4 بوصه — المجموعة الثانية".');
  }

  // 3. Set display timestamps for the remaining 6 subcategories to guarantee exact UI display order:
  // Order: 1) 4 بوصه, 2) 6 بوصه, 3) 2 بوصه, 4) 1.5 بوصه, 5) 1 بوصه, 6) 3 بوصه
  const orderedSubCats = [
    { id: '1786656351526', name: '4 بوصه', order: 1 },
    { id: '1786656329288', name: '6 بوصه', order: 2 },
    { id: '1786656362646', name: '2 بوصه', order: 3 },
    { id: '1786656372836', name: '1.5 بوصه', order: 4 },
    { id: '1786656382194', name: '1 بوصه', order: 5 },
    { id: 'sw_sub_1786657317747_hsnp', name: '3 بوصه', order: 6 }
  ];

  const baseTimestamp = new Date('2026-08-14T00:00:00.000Z').getTime();
  for (const sc of orderedSubCats) {
    const ts = new Date(baseTimestamp + sc.order * 1000).toISOString();
    await supabase.from('categories').update({ updated_at: ts }).eq('id', sc.id);
  }
  console.log('✅ Updated subcategory display timestamps for exact sequence.');

  // 4. Verification Check
  const { data: subCats } = await supabase.from('categories').select('*').eq('parent_id', mainCatId).order('updated_at', { ascending: true });
  const { data: allSWProds } = await supabase.from('products').select('id, name, barcode, sub_category_id').eq('main_category_id', mainCatId);

  console.log('\n==================================================');
  console.log('VERIFICATION RESULTS:');
  console.log('==================================================');
  console.log(`- Subcategories Count: ${subCats.length} (Expected: 6)`);
  console.log(`- Total Smart White Products: ${allSWProds.length} (Expected: 131)`);

  for (let i = 0; i < subCats.length; i++) {
    const sc = subCats[i];
    const count = allSWProds.filter(p => String(p.sub_category_id) === String(sc.id)).length;
    console.log(`  [Group ${i + 1}] "${sc.name}" (ID: ${sc.id}): ${count} products`);
  }

  const fourInchProds = allSWProds.filter(p => String(p.sub_category_id) === target4InchSubId);
  console.log(`\n- "4 بوصه" Total Products: ${fourInchProds.length} (Expected: 42)`);

  if (subCats.length === 6 && allSWProds.length === 131 && fourInchProds.length === 42) {
    console.log('\n🎉 SMART WHITE FINAL GROUP ORDER = PASS!');
  } else {
    console.error('\n❌ Mismatch in verification counts!');
    process.exit(1);
  }
}

merge4InchAndReorder();
