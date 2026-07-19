const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://akkjkjbnhafmolpvoiln.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function restore() {
  console.log('Reading seed products...');
  const seed = JSON.parse(fs.readFileSync('public/products_seed.json', 'utf8'));
  const seedProducts = seed.products || [];
  console.log(`Seed has ${seedProducts.length} products.`);

  console.log('Fetching existing products from Supabase...');
  
  // Fetch all products from Supabase in pages (since limit is 1000 usually)
  let cloudProducts = [];
  let hasMore = true;
  let page = 0;
  const pageSize = 1000;
  
  while (hasMore) {
    const { data, error } = await supabase
      .from('products')
      .select('id')
      .range(page * pageSize, (page + 1) * pageSize - 1);
      
    if (error) {
      console.error('Error fetching from Supabase:', error);
      return;
    }
    
    if (data && data.length > 0) {
      cloudProducts = [...cloudProducts, ...data];
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
    } else {
      hasMore = false;
    }
  }
  
  console.log(`Supabase has ${cloudProducts.length} products.`);
  
  const cloudIds = new Set(cloudProducts.map(p => String(p.id)));
  const missingProducts = seedProducts.filter(p => !cloudIds.has(String(p.id)));
  
  console.log(`Missing products to restore: ${missingProducts.length}`);
  
  if (missingProducts.length === 0) {
    console.log('No products are missing from Supabase. Nothing to restore.');
    return;
  }
  
  // Restore missing products to Supabase in chunks
  const chunkSize = 100;
  for (let i = 0; i < missingProducts.length; i += chunkSize) {
    const chunk = missingProducts.slice(i, i + chunkSize).map(p => ({
      id: String(p.id),
      name: p.name,
      price: Number(p.price) || 0,
      cost: Number(p.cost) || 0,
      stock: Number(p.stock) || 0,
      barcode: p.barcode || null,
      main_category_id: p.mainCategoryId || null,
      sub_category_id: p.subCategoryId || null,
      image_path: p.imagePath || null,
      updated_at: new Date().toISOString()
    }));
    
    console.log(`Restoring chunk ${i / chunkSize + 1} (${chunk.length} products)...`);
    const { error } = await supabase.from('products').upsert(chunk);
    if (error) {
      console.error('Error upserting chunk:', error);
    }
  }
  
  console.log('✅ Restoration of missing products to Supabase complete!');
}

restore();
