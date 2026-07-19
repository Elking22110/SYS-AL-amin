const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://akkjkjbnhafmolpvoiln.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSuppliers() {
  console.log('Fetching suppliers from Supabase...');
  const { data, error } = await supabase.from('suppliers').select('*');
  if (error) {
    console.error('Error fetching suppliers:', error);
  } else {
    console.log(`Found ${data.length} suppliers in Supabase:`);
    data.forEach(s => {
      console.log(`- ID: ${s.id}, Value:`, s.value, `, Updated At: ${s.updated_at}`);
    });
  }
}

checkSuppliers();
