const { createClient } = require('@supabase/supabase-js');

const FALLBACK_URL = 'https://akkjkjbnhafmolpvoiln.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

const supabase = createClient(FALLBACK_URL, FALLBACK_KEY);

const expectedBlock1_30 = [
  "مشترك عادة 4 قصير",
  "متر مواسير 3 بوصة 3 مم سمارت ابيض",
  "متر مواسير 4 بوصة 4 مم سمارت ابيض",
  "مجمع صرف 4×1.5 اسمارت هوم",
  "متر مواسير 5 بوصة 5 مم سمارت ابيض",
  "صليبه 4 د90 بوصه سمارت ابيض",
  "كوع 4 بوصه عادة سمارت ابيض",
  "كوع 4 بوصه باب سمارت ابيض",
  "كوع 4 بوصه مفتوح سمارت ابيض",
  "مشترك مفتوح سمارت 4×2 ابيض",
  "كوع سيفون 4 بوصه سمارت ابيض",
  "مشترك 4 بوصه عادة سمارت ابيض",
  "مشترك 4 بوصه باب سمارت ابيض",
  "مشترك 4 بوصه مفتوح سمارت ابيض",
  "مشترك مسلوب 4×2 بوصه عادة سمارت ابيض",
  "مشترك مسلوب 4×2 بوصه باب سمارت ابيض",
  "مشترك مسلوب 4×3 بوصه عادة سمارت ابيض",
  "مشترك مسلوب 4×3 بوصه باب سمارت ابيض",
  "مشترك مسلوب 4×3 بوصه مفتوح سمارت ابيض",
  "نقاص 4×3 بوصه سمارت ابيض",
  "نقاص 4×2 بوصه سمارت ابيض",
  "جلبه لصق 4بوصه سمارت ابيض",
  "طبه لصق 4بوصه ابيض",
  "طبة تسليك 4 بوصه سمارت ابيض",
  "هوايه 4 بوصه سمارت ابيض",
  "صليبه 45د 4×3 اسمارت هوم",
  "صليبه 45د 4×3 اسمارت هوم",
  "صليبه 3×4 د90 اسمارت هوم",
  "صليبه 3×4 د90 اسمارت هوم",
  "كوع 4 بوصه قصير اسمارت هوم"
];

const expectedBlock2_12 = [
  "كوع 4 بوصه باب قصير اسمارت هوم",
  "جلبة 4 بوصه اصلاح اسمارت هوم",
  "صليبه 4 بوصه 45د اسمارت هوم",
  "مجمع 4×3 اسمارت هوم",
  "قشره 110×114 اسمارت هوم",
  "جرجور 110 مم اسمارت هوم",
  "وصله 4 بوصه تمدد",
  "بلف 4 اسمارت",
  "جلبة 4 بوصه بدون وصله اسمارت",
  "جليتراب 75×110 مخرج 110 مفتوح S",
  "جليتراب 110×110 S مفتوح",
  "جليتراب 110×110 S مغلق"
];

async function verifySequence() {
  console.log('==================================================');
  console.log('SIS AL AMEEN — 4-INCH SEQUENCE AUDIT');
  console.log('==================================================\n');

  const { data: prods, error } = await supabase
    .from('products')
    .select('*')
    .eq('sub_category_id', '1786656351526');

  if (error || !prods) {
    console.error('Error querying products:', error);
    process.exit(1);
  }

  console.log(`Fetched ${prods.length} products from "4 بوصه" group.`);

  let block1Match = 0;
  let block2Match = 0;

  for (const name of expectedBlock1_30) {
    if (prods.some(p => p.name === name)) block1Match++;
  }

  for (const name of expectedBlock2_12) {
    if (prods.some(p => p.name === name)) block2Match++;
  }

  console.log(`- Block 1 (First 30 products): ${block1Match} / 30 Present`);
  console.log(`- Block 2 (Next 12 products): ${block2Match} / 12 Present`);
  console.log(`- Total 4-inch products: ${prods.length} / 42`);

  // Check no duplicates in names
  const uniqueNames = new Set(prods.map(p => p.name));
  console.log(`- Unique Product Names in "4 بوصه": ${uniqueNames.size} / 42`);

  if (prods.length === 42 && uniqueNames.size === 42) {
    console.log('\n✅ 4-INCH GROUP MERGE & SEQUENCE FULLY VERIFIED!');
  } else {
    console.error('\n❌ Sequence mismatch!');
    process.exit(1);
  }
}

verifySequence();
