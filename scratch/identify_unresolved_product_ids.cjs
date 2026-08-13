const { createClient } = require('@supabase/supabase-js');

const FALLBACK_URL = 'https://akkjkjbnhafmolpvoiln.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

const supabase = createClient(FALLBACK_URL, FALLBACK_KEY);

async function findUnresolvedIds() {
  console.log('==================================================');
  console.log('IDENTIFYING THE 6 UNRESOLVED PRODUCT IDs ON SUPABASE');
  console.log('==================================================\n');

  const { data: swProds, error } = await supabase
    .from('products')
    .select('*')
    .eq('main_category_id', 'اسمارت ابيض');

  if (error || !swProds) {
    console.error('Error fetching products:', error);
    process.exit(1);
  }

  const targets = [
    { name: "بيبة 2×1.5 7سم اسمارت هوم", code: null },
    { name: "مشترك مسلوب 3×2 بوصه بباب سمارت أبيض", code: null },
    { name: "جلبه لصق 3بوصه سمارت أبيض", code: null },
    { name: "كوع 1.5×1.25 بوصه بسن سمارت أبيض", code: null },
    { name: "صليبه 45د 4×3 اسمارت هوم", code: "353091001" },
    { name: "صليبه 45د 4×3 اسمارت هوم", code: "353091003" }
  ];

  const foundIds = [];

  for (const t of targets) {
    const matches = swProds.filter(p => {
      const nameMatch = p.name === t.name;
      const codeMatch = t.code ? String(p.barcode || '').trim() === t.code : (!p.barcode || p.barcode === 'N/A');
      return nameMatch && codeMatch;
    });

    for (const m of matches) {
      if (!foundIds.some(f => f.id === m.id)) {
        foundIds.push({
          id: String(m.id),
          name: m.name,
          barcode: m.barcode,
          sub_category_id: m.sub_category_id
        });
      }
    }
  }

  console.log(`Found ${foundIds.length} target records:`);
  console.table(foundIds);

  console.log('\nCopyable Array of Product IDs:');
  console.log(JSON.stringify(foundIds.map(f => f.id), null, 2));
}

findUnresolvedIds();
