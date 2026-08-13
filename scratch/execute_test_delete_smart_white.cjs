const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const FALLBACK_URL = 'https://akkjkjbnhafmolpvoiln.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

const supabase = createClient(FALLBACK_URL, FALLBACK_KEY);

async function deleteSmartWhiteForTest() {
  console.log('==================================================');
  console.log('TEST DELETE: All "اسمارت ابيض" Products from Supabase');
  console.log('==================================================\n');

  // 1. Fetch current Smart White products from Supabase
  const { data: smartProds, error: fetchErr } = await supabase
    .from('products')
    .select('*')
    .or('main_category_id.eq.اسمارت ابيض,main_category_id.eq.Smart White');

  if (fetchErr || !smartProds) {
    console.error('❌ Failed to fetch Smart White products:', fetchErr);
    process.exit(1);
  }

  console.log(`🔍 Found ${smartProds.length} Smart White products on Supabase.`);

  // 2. Extra safety pre-delete snapshot
  const backupPath = `scratch/pre_delete_smart_white_${Date.now()}.json`;
  fs.writeFileSync(backupPath, JSON.stringify(smartProds, null, 2));
  console.log(`💾 Safety snapshot saved to ${backupPath}`);

  // 3. Perform batch deletion on Supabase
  const prodIds = smartProds.map(p => String(p.id));
  console.log(`🗑️ Deleting ${prodIds.length} products from Supabase Cloud...`);

  // Delete in chunks of 100 to avoid payload limits
  const chunkSize = 100;
  let totalDeleted = 0;
  for (let i = 0; i < prodIds.length; i += chunkSize) {
    const chunk = prodIds.slice(i, i + chunkSize);
    const { error: delErr } = await supabase.from('products').delete().in('id', chunk);
    if (delErr) {
      console.error(`❌ Error deleting chunk ${i}:`, delErr);
    } else {
      totalDeleted += chunk.length;
    }
  }

  console.log(`✅ Successfully deleted ${totalDeleted} Smart White products from Supabase Cloud.`);

  // 4. Verify count on Supabase
  const { data: remaining, error: verifyErr } = await supabase
    .from('products')
    .select('id')
    .or('main_category_id.eq.اسمارت ابيض,main_category_id.eq.Smart White');

  const remainingCount = remaining ? remaining.length : 0;
  console.log(`📊 Remaining Smart White products on Supabase: ${remainingCount}`);

  // 5. Total Products Count Check
  const { data: totalRemaining } = await supabase.from('products').select('id');
  console.log(`📦 Total Products remaining on Supabase across ALL categories: ${totalRemaining?.length || 0}`);

  console.log('\n==================================================');
  console.log('TEST DELETE COMPLETED SUCCESSFULLY');
  console.log('==================================================');
}

deleteSmartWhiteForTest();
