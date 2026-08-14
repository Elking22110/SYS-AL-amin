const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const FALLBACK_URL = 'https://akkjkjbnhafmolpvoiln.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

const supabase = createClient(FALLBACK_URL, FALLBACK_KEY);

async function auditMissingKesselBarcodes() {
  console.log('==================================================');
  console.log('AUDITING KESSEL PRODUCTS WITHOUT CODES / BARCODES');
  console.log('==================================================\n');

  const { data: cloudKessel } = await supabase
    .from('products')
    .select('*')
    .eq('main_category_id', 'كيسيل');

  const missingCodeProds = cloudKessel.filter(p => !p.barcode || p.barcode.trim() === '');
  console.log(`Found ${missingCodeProds.length} Kessel products with missing barcode/code in Cloud:`);

  missingCodeProds.forEach(p => {
    console.log(` - ID: [${p.id}] | Name: "${p.name}" | Subcat: "${p.sub_category_id}" | Barcode: "${p.barcode}"`);
  });
}

auditMissingKesselBarcodes();
