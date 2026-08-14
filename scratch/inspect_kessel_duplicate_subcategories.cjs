const { createClient } = require('@supabase/supabase-js');

const FALLBACK_URL = 'https://akkjkjbnhafmolpvoiln.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

const supabase = createClient(FALLBACK_URL, FALLBACK_KEY);

async function inspectDuplicateSubcategories() {
  console.log('==================================================');
  console.log('INSPECTING DUPLICATE KESSEL SUBCATEGORIES IN CLOUD');
  console.log('==================================================\n');

  const { data: allCategories } = await supabase.from('categories').select('*');

  const kesselSubs = allCategories.filter(c => c.parent_id === 'كيسيل' || c.id === 'كيسيل' || (c.name && c.name.includes('كيسيل')));

  console.log(`Total Kessel categories/subcategories found in Cloud: ${kesselSubs.length}\n`);

  const nameMap = new Map();
  kesselSubs.forEach(c => {
    const list = nameMap.get(c.name) || [];
    list.push(c);
    nameMap.set(c.name, list);
  });

  console.log('--- SUBCATEGORY NAME OCCURRENCES ---');
  nameMap.forEach((list, name) => {
    if (list.length > 1) {
      console.log(`⚠️ DUPLICATE NAME: "${name}" (${list.length} records)`);
      list.forEach(c => console.log(`    - ID: "${c.id}" | Parent: "${c.parent_id}"`));
    } else {
      console.log(`   SINGLE NAME: "${name}" (ID: "${list[0].id}")`);
    }
  });
}

inspectDuplicateSubcategories();
