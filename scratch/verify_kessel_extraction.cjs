const { createClient } = require('@supabase/supabase-js');

const FALLBACK_URL = 'https://akkjkjbnhafmolpvoiln.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

const supabase = createClient(FALLBACK_URL, FALLBACK_KEY);

async function checkKesselInCloud() {
  const { data: subCats } = await supabase.from('categories').select('*').eq('parent_id', 'كيسيل');
  const { data: prods } = await supabase.from('products').select('*').eq('main_category_id', 'كيسيل');

  console.log('Kessel Subcategories in Supabase:', subCats ? subCats.length : 0);
  console.log('Kessel Products in Supabase:', prods ? prods.length : 0);
}

checkKesselInCloud();
