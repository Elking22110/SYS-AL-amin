const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const FALLBACK_URL = 'https://akkjkjbnhafmolpvoiln.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

const supabase = createClient(FALLBACK_URL, FALLBACK_KEY);

// Backup file for lookup
const backupPath = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\ebd2664e-4f6d-489b-b8c1-eb85182a52e4\\backup_smart_kessel_br_2026-08-13T20-57-58-085Z.json';
const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
const backupSmartWhite = backupData.products.smart_white || [];

function normalize(s) {
  if (!s) return '';
  return s.toString()
    .replace(/[٠١٢٣٤٥٦٧٨٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)])
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim().toLowerCase();
}

const backupByBarcode = new Map();
const backupByNameNorm = new Map();

for (const p of backupSmartWhite) {
  if (p.barcode) backupByBarcode.set(String(p.barcode).trim(), p);
  if (p.name) backupByNameNorm.set(normalize(p.name), p);
}

const rawSections = [
  {
    subCatName: "4 بوصه",
    items: [
      { seq: 1, name: "مشترك عادة 4 قصير", code: "353060002" },
      { seq: 2, name: "متر مواسير 3 بوصة 3 مم سمارت ابيض", code: "333030005" },
      { seq: 3, name: "متر مواسير 4 بوصة 4 مم سمارت ابيض", code: "333040003" },
      { seq: 4, name: "مجمع صرف 4×1.5 اسمارت هوم", code: "373010042" },
      { seq: 5, name: "متر مواسير 5 بوصة 5 مم سمارت ابيض", code: "333050004" },
      { seq: 6, name: "صليبه 4 د90 بوصه سمارت ابيض", code: "353091002" },
      { seq: 7, name: "كوع 4 بوصه عادة سمارت ابيض", code: "353020004" },
      { seq: 8, name: "كوع 4 بوصه باب سمارت ابيض", code: "353030003" },
      { seq: 9, name: "كوع 4 بوصه مفتوح سمارت ابيض", code: "353010004" },
      { seq: 10, name: "مشترك مفتوح سمارت 4×2 ابيض", code: "353050005" },
      { seq: 11, name: "كوع سيفون 4 بوصه سمارت ابيض", code: "373030001" },
      { seq: 12, name: "مشترك 4 بوصه عادة سمارت ابيض", code: "353060004" },
      { seq: 13, name: "مشترك 4 بوصه باب سمارت ابيض", code: "353090003" },
      { seq: 14, name: "مشترك 4 بوصه مفتوح سمارت ابيض", code: "353050004" },
      { seq: 15, name: "مشترك مسلوب 4×2 بوصه عادة سمارت ابيض", code: "353080002" },
      { seq: 16, name: "مشترك مسلوب 4×2 بوصه باب سمارت ابيض", code: "353092002" },
      { seq: 17, name: "مشترك مسلوب 4×3 بوصه عادة سمارت ابيض", code: "353080003" },
      { seq: 18, name: "مشترك مسلوب 4×3 بوصه باب سمارت ابيض", code: "353092003" },
      { seq: 19, name: "مشترك مسلوب 4×3 بوصه مفتوح سمارت ابيض", code: "353070002" },
      { seq: 20, name: "نقاص 4×3 بوصه سمارت ابيض", code: "373050004" },
      { seq: 21, name: "نقاص 4×2 بوصه سمارت ابيض", code: "373050005" },
      { seq: 22, name: "جلبه لصق 4بوصه سمارت ابيض", code: "353093004" },
      { seq: 23, name: "طبه لصق 4بوصه ابيض", code: "353095003" },
      { seq: 24, name: "طبة تسليك 4 بوصه سمارت ابيض", code: "353095004" },
      { seq: 25, name: "هوايه 4 بوصه سمارت ابيض", code: "373040001" },
      { seq: 26, name: "صليبه 45د 4×3 اسمارت هوم", code: "353091001" },
      { seq: 27, name: "صليبه 45د 4×3 اسمارت هوم", code: "353091003" },
      { seq: 28, name: "صليبه 3×4 د90 اسمارت هوم", code: "353091004" },
      { seq: 29, name: "صليبه 3×4 د90 اسمارت هوم", code: "353091005" },
      { seq: 30, name: "كوع 4 بوصه قصير اسمارت هوم", code: "353020005" }
    ]
  },
  {
    subCatName: "6 بوصه",
    items: [
      { seq: 1, name: "متر مواسير 6 بوصه 4 مم سمارت أبيض", code: "333060003" },
      { seq: 2, name: "صليبه 6 بوصه اسمارت هوم", code: "353091006" },
      { seq: 3, name: "متر مواسير 6 بوصه 5 مم سمارت أبيض", code: "333060004" },
      { seq: 4, name: "مجره عملاقه اسمارت", code: "373099902" },
      { seq: 5, name: "بلف 6 بوصه اسمارت", code: "373099903" },
      { seq: 6, name: "متر 8 بوصه برتقالى", code: "333080001" },
      { seq: 7, name: "كوع 6 بوصه عادة سمارت أبيض", code: "353020006" },
      { seq: 8, name: "كوع 6 بوصه بباب سمارت أبيض", code: "353030004" },
      { seq: 9, name: "كوع 6 بوصه مفتوح سمارت أبيض", code: "353010005" },
      { seq: 10, name: "مشترك 6 بوصه عادة سمارت أبيض", code: "353060005" },
      { seq: 11, name: "مشترك 6 بوصه بباب سمارت أبيض", code: "353090004" },
      { seq: 12, name: "مشترك 6 بوصه مفتوح سمارت أبيض", code: "353050006" },
      { seq: 13, name: "مشترك مسلوب 6×4 بوصه عادة سمارت أبيض", code: "353080004" },
      { seq: 14, name: "مشترك مسلوب 6×4 بوصه بباب سمارت أبيض", code: "353092004" },
      { seq: 15, name: "مشترك مسلوب 6×4 بوصه مفتوح سمارت أبيض", code: "353070003" },
      { seq: 16, name: "نقاص مسلوب 6×4 بوصه سمارت أبيض", code: "373050006" },
      { seq: 17, name: "جلمه لصق 6 بوصه سمارت أبيض", code: "353093005" },
      { seq: 18, name: "طبه تسليك 6 بوصه سمارت أبيض", code: "353095005" },
      { seq: 19, name: "طبه 6 بوصه عميه", code: "353095007" },
      { seq: 20, name: "كوع 6 بوصه عادة قصير", code: "353020016" },
      { seq: 21, name: "غرفه تفتيش سمارت 50×50", code: "373099904" },
      { seq: 22, name: "غرفه تفتيش سمارت 60×60", code: "373099905" }
    ]
  },
  {
    subCatName: "4 بوصه — المجموعة الثانية",
    items: [
      { seq: 1, name: "كوع 4 بوصه باب قصير اسمارت هوم", code: "353030005" },
      { seq: 2, name: "جلبة 4 بوصه اصلاح اسمارت هوم", code: "373099907" },
      { seq: 3, name: "صليبه 4 بوصه 45د اسمارت هوم", code: "353091007" },
      { seq: 4, name: "مجمع 4×3 اسمارت هوم", code: "373010043" },
      { seq: 5, name: "قشره 110×114 اسمارت هوم", code: "373020004" },
      { seq: 6, name: "جرجور 110 مم اسمارت هوم", code: "373099908" },
      { seq: 7, name: "وصله 4 بوصه تمدد", code: "373099909" },
      { seq: 8, name: "بلف 4 اسمارت", code: "373099910" },
      { seq: 9, name: "جلبة 4 بوصه بدون وصله اسمارت", code: "373099911" },
      { seq: 10, name: "جليتراب 75×110 مخرج 110 مفتوح S", code: "373099912" },
      { seq: 11, name: "جليتراب 110×110 S مفتوح", code: "373099914" },
      { seq: 12, name: "جليتراب 110×110 S مغلق", code: "373099915" }
    ]
  },
  {
    subCatName: "2 بوصه",
    items: [
      { seq: 1, name: "قشرة سمارت رمادي 60×63", code: "373020001" },
      { seq: 2, name: "متر مواسير 2 بوصه 3مم سمارت أبيض", code: "333020001" },
      { seq: 3, name: "هوايه 2 بوصه اسمارت", code: "373040003" },
      { seq: 4, name: "متر مواسير 2 بوصه 4مم سمارت أبيض", code: "333020002" },
      { seq: 5, name: "كوع 2 بوصه ساده سمارت أبيض", code: "353020002" },
      { seq: 6, name: "كوع 2 بوصه بباب سمارت أبيض", code: "353030001" },
      { seq: 7, name: "كوع 2 بوصه مفتوح سمارت أبيض", code: "353010002" },
      { seq: 8, name: "مشترك 2 بوصه ساده سمارت أبيض", code: "353060003" },
      { seq: 9, name: "مشترك 2 بوصه بباب سمارت أبيض", code: "353090001" },
      { seq: 10, name: "مشترك 2 بوصه مفتوح سمارت أبيض", code: "353050002" },
      { seq: 11, name: "بيبه 2×1.5 بوصه سمارت أبيض", code: "373010022" },
      { seq: 12, name: "بيبه 2×2 بوصه سمارت أبيض", code: "373010032" },
      { seq: 13, name: "بوش 2×1.5 سمارت أبيض", code: "373050001" },
      { seq: 14, name: "طبه تسليك 2 بوصه سمارت أبيض", code: "353095001" },
      { seq: 15, name: "جلبه لصق 2 بوصه سمارت أبيض", code: "371099133" },
      { seq: 16, name: "بيبه 2×1.5 7سم اسمارت هوم", code: "N/A" },
      { seq: 17, name: "طبه 2 بوصه", code: "353095025" }
    ]
  },
  {
    subCatName: "3 بوصه",
    items: [
      { seq: 1, name: "جلبة بسن 3 بوصة داخلي", code: "353093009" },
      { seq: 2, name: "جلبة بسن 3 بوصة خارجي", code: "353093003" },
      { seq: 3, name: "متر مواسير 3 بوصه 3مم سمارت أبيض", code: "333030005" },
      { seq: 4, name: "متر مواسير 3 بوصه 4مم سمارت أبيض", code: "333030003" },
      { seq: 5, name: "صليبه 3 بوصه اسمارت هوم", code: "353091013" },
      { seq: 6, name: "متر مواسير 3 بوصه 5مم سمارت أبيض", code: "333030004" },
      { seq: 7, name: "كوع 3بوصه عادة سمارت أبيض", code: "353010003" },
      { seq: 8, name: "كوع 3بوصه بباب سمارت أبيض", code: "353030002" },
      { seq: 9, name: "كوع 3بوصه مفتوح سمارت أبيض", code: "353020003" },
      { seq: 10, name: "رقبة بيبه 15×15 سمارت", code: "373020002" },
      { seq: 11, name: "رقبة بيبه 30×30 سمارت", code: "373020003" },
      { seq: 12, name: "مشترك 3بوصه عادة سمارت أبيض", code: "353050003" },
      { seq: 13, name: "مشترك 3بوصه بباب سمارت أبيض", code: "353090002" },
      { seq: 14, name: "مشترك 3بوصه مفتوح سمارت أبيض", code: "353050003_dup" },
      { seq: 15, name: "بيبه 3×1.5 بوصه سمارت أبيض", code: "373010012" },
      { seq: 16, name: "بيبه 3×2 بوصه سمارت أبيض", code: "373010029" },
      { seq: 17, name: "مشترك مسلوب 3×1.5 بوصه عادة سمارت أبيض", code: "373050002" },
      { seq: 18, name: "مشترك مسلوب 3×1.5 بوصه بباب سمارت أبيض", code: "353092001" },
      { seq: 19, name: "مشترك مسلوب 3×2 بوصه عادة سمارت أبيض", code: "37305021" },
      { seq: 20, name: "مشترك مسلوب 3×2 بوصه بباب سمارت أبيض", code: "N/A" },
      { seq: 21, name: "نقاص 3×2 بوصه سمارت أبيض", code: "373050003" },
      { seq: 22, name: "جلبه لصق 3بوصه سمارت أبيض", code: "N/A" },
      { seq: 23, name: "طبة تسليك 3 بوصه سمارت أبيض", code: "353095002" },
      { seq: 24, name: "هوايه 3 بوصه سمارت أبيض", code: "373040002" },
      { seq: 25, name: "بيبه 3×3 8سم اسمارت هوم", code: "352092003" },
      { seq: 26, name: "جلبه 3بوصه اصلاح اسمارت هوم", code: "373099913" },
      { seq: 27, name: "جرجوري 75مما سمارت هوم", code: "373099906" },
      { seq: 28, name: "طبة 3 بوصه عميه", code: "353095006" }
    ]
  },
  {
    subCatName: "1.5 بوصه",
    items: [
      { seq: 1, name: "متر مواسير 1.5 بوصه 2.5مم سمارت أبيض", code: "333010001" },
      { seq: 2, name: "جلبة 1.5 بسن اسمارت هوم", code: "371099135" },
      { seq: 3, name: "طبه 1.5 عميه", code: "353095012" },
      { seq: 4, name: "متر مواسير 1.5 بوصه 3.7مم سمارت أبيض", code: "333010002" },
      { seq: 5, name: "كوع 1.5 بوصه ساده سمارت أبيض", code: "353020116" },
      { seq: 6, name: "كوع 1.5 بوصه مفتوح سمارت أبيض", code: "353020001" },
      { seq: 7, name: "كوع 1.5 بوصه بسن سمارت أبيض", code: "353040002" },
      { seq: 8, name: "كوع 1.5×1.25 بوصه بسن سمارت أبيض", code: "N/A" },
      { seq: 9, name: "مشترك 1.5 بوصه ساده سمارت أبيض", code: "353060001" },
      { seq: 10, name: "مشترك 1.5 بوصه مفتوح سمارت أبيض", code: "353050001" },
      { seq: 11, name: "جلبه لصق 1.5 بوصه سمارت أبيض", code: "371099132" },
      { seq: 12, name: "بيبه صفايه اسمارت هوم", code: "373099901" },
      { seq: 13, name: "قشره 50 اسمارت 48* هوم", code: "353093001" }
    ]
  },
  {
    subCatName: "1 بوصه",
    items: [
      { seq: 1, name: "م 1 بوصه 1.8 اسمارت هوم", code: "333060007" },
      { seq: 2, name: "طبة 1 بوصه اسمارت هوم", code: "353095020" },
      { seq: 3, name: "م 1 بوصه سمك 2.4 اسمارت هوم", code: "333060008" },
      { seq: 4, name: "كوع 1 بوصه اسمارت هوم", code: "353020000" },
      { seq: 5, name: "كوع 1 بوصه مفتوح اسمارت هوم", code: "353020007" },
      { seq: 6, name: "جلبه 1 بوصه اسمارت هوم", code: "353093007" },
      { seq: 7, name: "واي 1 بوصه اسمارت هوم", code: "353050007" },
      { seq: 8, name: "مشترك 1 بوصه اسمارت هوم", code: "353060000" },
      { seq: 9, name: "بوش 1.5×1 اسمارت هوم", code: "352092008" }
    ]
  }
];

async function executeImport131() {
  console.log('==================================================');
  console.log('SIS AL AMEEN — EXECUTING SMART WHITE 131 IMPORT');
  console.log('==================================================\n');

  const mainCatId = 'اسمارت ابيض';
  const nowIso = new Date().toISOString();

  // 1. Ensure Main Category exists
  const { data: existingMain } = await supabase.from('categories').select('*').eq('id', mainCatId).single();
  if (!existingMain) {
    console.log('Creating main category "اسمارت ابيض"...');
    await supabase.from('categories').upsert({
      id: mainCatId,
      name: mainCatId,
      parent_id: null,
      updated_at: nowIso
    });
  }

  // 2. Process Subcategories
  const subCategoryMap = new Map();
  for (const sec of rawSections) {
    const subName = sec.subCatName;
    const { data: existingSub } = await supabase
      .from('categories')
      .select('*')
      .eq('name', subName)
      .eq('parent_id', mainCatId);

    let subId;
    if (existingSub && existingSub.length > 0) {
      subId = existingSub[0].id;
    } else {
      subId = 'sw_sub_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      console.log(`Creating subcategory "${subName}" (ID: ${subId})...`);
      await supabase.from('categories').upsert({
        id: subId,
        name: subName,
        parent_id: mainCatId,
        updated_at: nowIso
      });
    }
    subCategoryMap.set(subName, subId);
  }

  // 3. Prepare 131 Products Payload with GUARANTEED UNIQUE IDs
  const productsToInsert = [];
  const usedIds = new Set();
  let globalSeq = 0;

  for (let sIdx = 0; sIdx < rawSections.length; sIdx++) {
    const sec = rawSections[sIdx];
    const subCatId = subCategoryMap.get(sec.subCatName);

    for (const item of sec.items) {
      globalSeq++;
      const codeClean = item.code.replace('_dup', '').trim();
      const barcodeMatch = codeClean !== 'N/A' ? backupByBarcode.get(codeClean) : null;
      const nameMatch = backupByNameNorm.get(normalize(item.name));
      const matched = barcodeMatch || nameMatch;

      let candidateId = matched ? String(matched.id) : `sw_131_${globalSeq}`;
      if (usedIds.has(candidateId)) {
        candidateId = `sw_131_${globalSeq}_${Date.now()}`;
      }
      usedIds.add(candidateId);

      const prodBarcode = codeClean !== 'N/A' ? codeClean : (matched ? matched.barcode : null);
      const priceVal = matched && matched.price ? parseFloat(matched.price) : 0;
      const costVal = matched && matched.cost ? parseFloat(matched.cost) : (priceVal > 0 ? parseFloat((priceVal * 0.85).toFixed(2)) : 0);
      const stockVal = matched && matched.stock ? parseInt(matched.stock) : 100;

      let imageVal = matched ? (matched.image_path || matched.imagePath || null) : null;
      if (!imageVal && matched && (matched.customColor || matched.supplierCode || matched.wholesalePrice)) {
        imageVal = JSON.stringify({
          color: matched.customColor || '',
          code: matched.supplierCode || '',
          wp: matched.wholesalePrice || 0,
          img: ''
        });
      }

      productsToInsert.push({
        id: candidateId,
        name: item.name,
        price: priceVal,
        cost: costVal,
        stock: stockVal,
        barcode: prodBarcode,
        main_category_id: mainCatId,
        sub_category_id: subCatId,
        image_path: imageVal,
        updated_at: nowIso
      });
    }
  }

  console.log(`\nPrepared ${productsToInsert.length} products with unique IDs for insertion.`);

  // Batch Upsert to Supabase Cloud in chunks of 50
  const chunkSize = 50;
  for (let i = 0; i < productsToInsert.length; i += chunkSize) {
    const chunk = productsToInsert.slice(i, i + chunkSize);
    console.log(`Upserting chunk ${i / chunkSize + 1} (${chunk.length} products)...`);
    const { error: upsertErr } = await supabase.from('products').upsert(chunk);
    if (upsertErr) {
      console.error(`❌ Error upserting chunk ${i / chunkSize + 1}:`, upsertErr);
      process.exit(1);
    }
  }

  // Verification Check
  const { data: cloudProds, error: verifyErr } = await supabase
    .from('products')
    .select('id, name, barcode, main_category_id, sub_category_id')
    .eq('main_category_id', mainCatId);

  if (verifyErr) {
    console.error('❌ Verification failed:', verifyErr);
    process.exit(1);
  }

  console.log('\n==================================================');
  console.log(`✅ SUCCESS! Total Products in "اسمارت ابيض" on Cloud: ${cloudProds.length}`);
  console.log('==================================================');
}

executeImport131();
