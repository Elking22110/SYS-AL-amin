const { createClient } = require('@supabase/supabase-js');

const FALLBACK_URL = 'https://akkjkjbnhafmolpvoiln.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

const supabase = createClient(FALLBACK_URL, FALLBACK_KEY);

async function investigateProducts400() {
  console.log('==================================================');
  console.log('INVESTIGATING SUPABASE PRODUCTS 400 ERROR');
  console.log('==================================================\n');

  // 1. Fetch 1 row to inspect valid column names returned from Supabase
  const { data: sampleData, error: sampleError } = await supabase
    .from('products')
    .select('*')
    .limit(1);

  if (sampleError) {
    console.error('❌ Failed to select sample product:', sampleError);
  } else if (sampleData && sampleData.length > 0) {
    console.log('✅ Real Columns in Supabase public.products:');
    console.log(Object.keys(sampleData[0]).sort().join(', '));
    console.log('\nSample Record Keys & Types:');
    Object.entries(sampleData[0]).forEach(([k, v]) => {
      console.log(` - ${k}: ${typeof v} (value: ${JSON.stringify(v)})`);
    });
  }

  // 2. Read what payload is being constructed by syncManager.js mapLocalToCloud
  // Let's test upserting a sample item with and without sort_order or client-only properties
  const sampleItem = sampleData && sampleData.length > 0 ? sampleData[0] : null;
  if (!sampleItem) {
    console.log('No sample product found to test upsert');
    return;
  }

  console.log('\n--- TEST A: Upserting exact fetched product record without changes ---');
  const testAPayload = { ...sampleItem };
  delete testAPayload.created_at; // keep updated_at
  testAPayload.updated_at = new Date().toISOString();

  const { data: resA, error: errA } = await supabase
    .from('products')
    .upsert(testAPayload);

  if (errA) {
    console.error('❌ TEST A Failed:');
    console.error('Message:', errA.message);
    console.error('Details:', errA.details);
    console.error('Hint:', errA.hint);
    console.error('Code:', errA.code);
  } else {
    console.log('✅ TEST A Succeeded!');
  }

  console.log('\n--- TEST B: Testing sort_order column presence & upsert ---');
  const testBPayload = { ...testAPayload, sort_order: sampleItem.sort_order || 10 };
  const { data: resB, error: errB } = await supabase
    .from('products')
    .upsert(testBPayload);

  if (errB) {
    console.error('❌ TEST B Failed:');
    console.error('Message:', errB.message);
    console.error('Details:', errB.details);
    console.error('Hint:', errB.hint);
    console.error('Code:', errB.code);
  } else {
    console.log('✅ TEST B Succeeded!');
  }

  console.log('\n--- TEST C: Testing payload with client-only properties (e.g. sync_status, costPrice, _isNewLocally, customColor) ---');
  const testCPayload = {
    ...testAPayload,
    sync_status: 'synced',
    costPrice: 50,
    _isNewLocally: false,
    customColor: '#ffffff'
  };
  const { data: resC, error: errC } = await supabase
    .from('products')
    .upsert(testCPayload);

  if (errC) {
    console.error('❌ TEST C (Client-only fields) Result:');
    console.error('Message:', errC.message);
    console.error('Details:', errC.details);
    console.error('Hint:', errC.hint);
    console.error('Code:', errC.code);
  } else {
    console.log('✅ TEST C Succeeded!');
  }
}

investigateProducts400();
