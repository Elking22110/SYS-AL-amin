/**
 * TEST DETERMINISTIC PAGINATION FIX
 * =================================
 * Compares un-tied pagination (.order('updated_at')) vs tied pagination (.order('updated_at').order('id'))
 * Reads all 2746 products from Supabase and checks if all 2746 unique IDs are fetched.
 *
 * Run: node scratch/test_deterministic_pagination.cjs
 */
'use strict';

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://akkjkjbnhafmolpvoiln.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testPagination(useTieBreaker = false) {
  let offset = 0;
  const pageSize = 1000;
  const idsSet = new Set();
  let hasMore = true;

  while (hasMore) {
    let query = supabase.from('products').select('id,updated_at').order('updated_at', { ascending: true });
    if (useTieBreaker) {
      query = query.order('id', { ascending: true });
    }
    query = query.range(offset, offset + pageSize - 1);

    const { data, error } = await query;
    if (error) throw error;
    if (data && data.length > 0) {
      data.forEach(item => idsSet.add(String(item.id)));
      offset += data.length;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  return idsSet;
}

async function main() {
  console.log('\n' + '═'.repeat(70));
  console.log('  TESTING DETERMINISTIC PAGINATION ON SUPABASE PRODUCTS');
  console.log('═'.repeat(70));

  console.log('\n[1] Fetching with ONLY .order("updated_at")...');
  const untiedSet = await testPagination(false);
  console.log(`  → Total unique IDs fetched (Untied): ${untiedSet.size} / 2746`);

  console.log('\n[2] Fetching with .order("updated_at").order("id")...');
  const tiedSet = await testPagination(true);
  console.log(`  → Total unique IDs fetched (Tied with ID): ${tiedSet.size} / 2746`);

  const target12 = ['171506', '171507', '171508', '171509', '171510', '171511', '171513', '171514', '171515', '171516', '171517', '171518'];

  console.log('\n  Checking 12 reported IDs in Untied set:');
  const missingUntied = target12.filter(id => !untiedSet.has(id));
  console.log(`    Missing in untied fetch: ${missingUntied.length} (${missingUntied.join(', ')})`);

  console.log('\n  Checking 12 reported IDs in Tied set:');
  const missingTied = target12.filter(id => !tiedSet.has(id));
  console.log(`    Missing in tied fetch  : ${missingTied.length} (${missingTied.join(', ')})`);

  console.log('\n' + '═'.repeat(70));
  if (tiedSet.size === 2746 && missingTied.length === 0) {
    console.log('  🎉 FIX VERIFIED! Adding .order("id") yields 100% (2746/2746) items with ZERO missing IDs!');
  } else {
    console.log('  ⚠️ Issue remains.');
  }
  console.log('═'.repeat(70) + '\n');
}

main().catch(console.error);
