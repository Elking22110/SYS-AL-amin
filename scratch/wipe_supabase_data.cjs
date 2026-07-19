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
  console.log('🔄 Wiping operational tables in Supabase...');
  for (const table of tables) {
    try {
      console.log(`⏳ Deleting from table: ${table}...`);
      
      const { data, error } = await supabase
        .from(table)
        .delete()
        .neq('id', '_none_');
        
      if (error) {
        console.log(`⚠️ Failed with string filter on ${table}: ${error.message}. Trying numeric...`);
        const { error: error2 } = await supabase
          .from(table)
          .delete()
          .gte('id', 0);
          
        if (error2) {
          console.log(`⚠️ Failed with numeric filter on ${table}: ${error2.message}. Trying IS NOT NULL...`);
          const { error: error3 } = await supabase
            .from(table)
            .delete()
            .not('id', 'is', null);
            
          if (error3) {
            console.error(`❌ Failed to delete from ${table}:`, error3);
          } else {
            console.log(`✅ Cleared ${table} successfully using IS NOT NULL.`);
          }
        } else {
          console.log(`✅ Cleared ${table} successfully using numeric filter.`);
        }
      } else {
        console.log(`✅ Cleared ${table} successfully using string filter.`);
      }
    } catch (e) {
      console.error(`❌ Exception deleting from ${table}:`, e);
    }
  }
  console.log('🏁 Finished Supabase wipe operations.');
}

wipeAll();
