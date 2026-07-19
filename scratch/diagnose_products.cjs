const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://akkjkjbnhafmolpvoiln.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function diagnose() {
  console.log('Fetching products count from Supabase...');
  const { count, error } = await supabase.from('products').select('*', { count: 'exact', head: true });
  if (error) {
    console.error('Error fetching count:', error);
    return;
  }
  console.log('Total products count in Supabase products table:', count);

  // Let's fetch some products to see if there are any deleted ones or what their status is
  const { data, error: fetchError } = await supabase.from('products').select('id, name, price, stock').limit(10);
  if (fetchError) {
    console.error('Error fetching sample products:', fetchError);
  } else {
    console.log('Sample product records:');
    data.forEach(p => {
      console.log(`- ID: ${p.id}, Name: ${p.name}, Price: ${p.price}, Stock: ${p.stock}`);
    });
  }
}

diagnose();
