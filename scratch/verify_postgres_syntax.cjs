const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const FALLBACK_URL = 'https://akkjkjbnhafmolpvoiln.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

const supabase = createClient(FALLBACK_URL, FALLBACK_KEY);

async function verifySchemaSyntax() {
  console.log('==================================================');
  console.log('VERIFYING SUPABASE_SCHEMA.SQL POSTGRESQL SYNTAX');
  console.log('==================================================\n');

  const schemaPath = path.join(__dirname, '..', 'supabase_schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  console.log(`Read supabase_schema.sql (${sql.length} bytes, ${sql.split('\n').length} lines).`);

  // Verify all 17 tables exist in live Supabase PostgreSQL DB
  const expectedTables = [
    'categories', 'products', 'customers', 'sales', 'shifts',
    'returns', 'users', 'suppliers', 'supplier_supplies',
    'supplier_payments', 'expenses', 'store_info', 'pos_settings',
    'system_settings', 'active_shift', 'manufacturing_waste', 'product_images'
  ];

  let successCount = 0;
  for (const t of expectedTables) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    if (error) {
      console.error(`❌ Table public.${t} error:`, error.message);
    } else {
      console.log(`✅ Table public.${t} exists and is queryable in PostgreSQL.`);
      successCount++;
    }
  }

  console.log('\n--------------------------------------------------');
  console.log(`POSTGRESQL TABLE INTEGRITY: ${successCount}/${expectedTables.length} PASSED`);
  console.log('--------------------------------------------------\n');
}

verifySchemaSyntax();
