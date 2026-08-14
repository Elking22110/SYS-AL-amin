const { createClient } = require('@supabase/supabase-js');

const FALLBACK_URL = 'https://akkjkjbnhafmolpvoiln.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

const supabase = createClient(FALLBACK_URL, FALLBACK_KEY);

async function fixKessel40() {
  const { data: prods } = await supabase.from('products').select('*').eq('main_category_id', 'كيسيل');

  const prods40 = prods.filter(p => p.name.includes('٤٠') || p.name.includes('40'));
  console.log(`Found ${prods40.length} products with 40 in name:`);
  prods40.forEach(p => console.log(` - [${p.id}] ${p.name} | Current Sub: "${p.sub_category_id}"`));

  const nowIso = new Date().toISOString();
  const updates = prods40.map(p => ({
    id: String(p.id),
    sub_category_id: 'قطع ٤٠ كيسيل',
    updated_at: nowIso
  }));

  if (updates.length > 0) {
    await supabase.from('products').upsert(updates);
    console.log(`✅ Updated ${updates.length} products to subcategory "قطع ٤٠ كيسيل"!`);
  }
}

fixKessel40();
