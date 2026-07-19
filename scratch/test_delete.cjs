const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://akkjkjbnhafmolpvoiln.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDelete() {
  console.log('Testing delete on suppliers table...');
  const { error } = await supabase.from('suppliers').delete().in('id', ['1005']);
  if (error) {
    console.error('Delete error:', error);
  } else {
    console.log('Delete succeeded!');
    const { data } = await supabase.from('suppliers').select('*');
    console.log(`Remaining suppliers: ${data.length}`);
  }
}

testDelete();
