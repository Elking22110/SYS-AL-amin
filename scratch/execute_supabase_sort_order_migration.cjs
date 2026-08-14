const { createClient } = require('@supabase/supabase-js');

const FALLBACK_URL = 'https://akkjkjbnhafmolpvoiln.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

const supabase = createClient(FALLBACK_URL, FALLBACK_KEY);

async function migrateSortOrderColumn() {
  console.log('==================================================');
  console.log('MIGRATING SORT_ORDER COLUMN ON LIVE SUPABASE');
  console.log('==================================================\n');

  // Check if sort_order column already exists by selecting sort_order
  const { data: testData, error: testErr } = await supabase
    .from('products')
    .select('id, name, sort_order')
    .limit(1);

  if (!testErr) {
    console.log('✅ Column `sort_order` ALREADY EXISTS in live Supabase `products` table!');
    console.log('Sample row:', testData[0]);
    return;
  }

  console.log('Column sort_order does not exist yet. Error message:', testErr.message);

  // Try adding column via rpc exec_sql if available, or test direct postgres query
  const sqlCommands = [
    `ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sort_order NUMERIC;`
  ];

  for (const sql of sqlCommands) {
    console.log('Executing SQL:', sql);
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (rpcErr) {
      console.log('RPC exec_sql error:', rpcErr.message);
    } else {
      console.log('RPC exec_sql success:', rpcRes);
    }
  }

  // Verify again after RPC
  const { data: checkData, error: checkErr } = await supabase
    .from('products')
    .select('id, name, sort_order')
    .limit(1);

  if (!checkErr) {
    console.log('🎉 Column `sort_order` successfully added and verified!');
  } else {
    console.log('⚠️ Could not add column via exec_sql RPC. Testing alternative endpoints...');
  }
}

migrateSortOrderColumn();
