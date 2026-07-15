const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://jwjjykrrnlnitelcgzfy.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_NZWEAHXuHWyBfPFwUgMahQ_Z3LHrg8k';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkData() {
  console.log('--- checking Supabase Tables ---');
  try {
    const tables = ['customers', 'sales', 'shifts', 'active_shift'];
    for (const t of tables) {
      const { data, error } = await supabase.from(t).select('*');
      if (error) {
        console.error(`Error fetching from ${t}:`, error.message);
      } else {
        console.log(`Table '${t}': ${data ? data.length : 0} rows.`);
        if (data && data.length > 0) {
          console.log(`  Sample row:`, JSON.stringify(data[0]).substring(0, 150));
        }
      }
    }
  } catch (err) {
    console.error('Connection failed:', err);
  }
}

checkData();
