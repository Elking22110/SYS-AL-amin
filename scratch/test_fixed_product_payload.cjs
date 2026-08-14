const { createClient } = require('@supabase/supabase-js');

const FALLBACK_URL = 'https://akkjkjbnhafmolpvoiln.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

const supabase = createClient(FALLBACK_URL, FALLBACK_KEY);

async function testFixedProductPayload() {
  console.log('==================================================');
  console.log('TESTING FIXED PRODUCT PAYLOAD AGAINST LIVE SUPABASE');
  console.log('==================================================\n');

  // Fetch sample product
  const { data: sampleData } = await supabase.from('products').select('*').limit(1);
  if (!sampleData || sampleData.length === 0) {
    console.error('No sample product found');
    return;
  }

  const sample = sampleData[0];
  console.log('Sample Product ID:', sample.id);

  // Construct strict cloud payload without sort_order or client-only properties
  const fixedPayload = {
    id: String(sample.id),
    name: sample.name,
    price: sample.price,
    cost: sample.cost,
    stock: sample.stock,
    barcode: sample.barcode,
    main_category_id: sample.main_category_id,
    sub_category_id: sample.sub_category_id,
    image_path: sample.image_path,
    updated_at: new Date().toISOString()
  };

  console.log('\nStrict Payload sent to Supabase:', JSON.stringify(fixedPayload, null, 2));

  // Upsert to Supabase
  const { data, error } = await supabase.from('products').upsert(fixedPayload);

  if (error) {
    console.error('❌ FAIL:', error);
  } else {
    console.log('\n✅ SUCCESS: Supabase returned HTTP 200/201 Success!');
  }
}

testFixedProductPayload();
