const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const FALLBACK_URL = 'https://akkjkjbnhafmolpvoiln.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

const supabase = createClient(FALLBACK_URL, FALLBACK_KEY);

async function auditKesselSubcatsAndColors() {
  console.log('==================================================');
  console.log('AUDITING KESSEL SUBCATEGORIES, PRODUCTS & COLORS');
  console.log('==================================================\n');

  // 1. Fetch Cloud Subcategories for Kessel
  const { data: categories } = await supabase.from('categories').select('*');
  const kesselSubs = categories.filter(c => c.parent_id === 'كيسيل' || c.id === 'كيسيل');

  console.log('--- CLOUD SUBCATEGORIES FOR KESSEL ---');
  kesselSubs.forEach(c => console.log(` - Subcat ID: "${c.id}" | Name: "${c.name}"`));

  // 2. Fetch Cloud Products for Kessel
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('main_category_id', 'كيسيل');

  console.log(`\nTotal Products under main_category_id = "كيسيل": ${products.length}`);

  // Count products by sub_category_id
  const subCounts = new Map();
  products.forEach(p => {
    const sub = p.sub_category_id || 'NULL';
    subCounts.set(sub, (subCounts.get(sub) || 0) + 1);
  });

  console.log('\n--- PRODUCT COUNTS BY sub_category_id ---');
  subCounts.forEach((count, sub) => {
    console.log(` - sub_category_id: "${sub}" -> ${count} products`);
  });

  // Check matching between subcategory name/id and product sub_category_id
  console.log('\n--- SUBCATEGORY MATCHING AUDIT ---');
  kesselSubs.forEach(c => {
    if (c.id === 'كيسيل') return;
    const matchById = products.filter(p => p.sub_category_id === c.id);
    const matchByName = products.filter(p => p.sub_category_id === c.name);
    console.log(`Subcategory Name: "${c.name}" (ID: "${c.id}")`);
    console.log(`   Matches by ID "${c.id}": ${matchById.length}`);
    console.log(`   Matches by Name "${c.name}": ${matchByName.length}`);
  });
}

auditKesselSubcatsAndColors();
