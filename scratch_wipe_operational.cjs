const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://akkjkjbnhafmolpvoiln.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const tables = [
  'returns',
  'sales',
  'supplier_supplies',
  'supplier_payments',
  'suppliers',
  'expenses',
  'active_shift',
  'shifts',
  'customers'
];

async function wipeAll() {
  console.log('🔄 Wiping operational tables in Supabase cloud database...');
  for (const table of tables) {
    try {
      console.log(`⏳ Clearing table: ${table}...`);
      
      const { error } = await supabase
        .from(table)
        .delete()
        .neq('id', '_none_id_match_');
        
      if (error) {
        console.log(`⚠️ Trying numeric delete for ${table}... (${error.message})`);
        const { error: error2 } = await supabase
          .from(table)
          .delete()
          .gte('id', 0);
          
        if (error2) {
          console.log(`⚠️ Trying IS NOT NULL filter for ${table}... (${error2.message})`);
          const { error: error3 } = await supabase
            .from(table)
            .delete()
            .not('id', 'is', null);
            
          if (error3) {
            console.error(`❌ Failed to clear ${table}:`, error3.message);
          } else {
            console.log(`✅ Table ${table} wiped successfully.`);
          }
        } else {
          console.log(`✅ Table ${table} wiped successfully.`);
        }
      } else {
        console.log(`✅ Table ${table} wiped successfully.`);
      }
    } catch (e) {
      console.error(`❌ Exception deleting ${table}:`, e);
    }
  }
  console.log('🏁 All operational tables wiped cleanly in Supabase!');
  process.exit(0);
}

wipeAll();
