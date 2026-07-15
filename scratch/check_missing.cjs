const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase credentials in .env!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    // 1. Read seed file
    const seedData = require('../public/products_seed.json');
    const seedProducts = seedData.products || [];
    console.log("Seed file contains:", seedProducts.length, "products");

    // 2. Fetch all products from Supabase
    let cloudProducts = [];
    let hasMore = true;
    let from = 0;
    const limit = 1000;

    console.log("Fetching products from Supabase...");
    while (hasMore) {
      const { data, error } = await supabase
        .from('products')
        .select('id')
        .range(from, from + limit - 1);

      if (error) throw error;

      if (data && data.length > 0) {
        cloudProducts = [...cloudProducts, ...data];
        from += limit;
        if (data.length < limit) hasMore = false;
      } else {
        hasMore = false;
      }
    }

    console.log("Supabase contains:", cloudProducts.length, "products");

    // 3. Find missing products
    const cloudIds = new Set(cloudProducts.map(p => String(p.id)));
    const missing = seedProducts.filter(p => !cloudIds.has(String(p.id)));

    console.log("Number of missing products:", missing.length);

    if (missing.length > 0) {
      // Group by mainCategoryId
      const grouped = {};
      missing.forEach(p => {
        const cat = p.mainCategoryId || 'No Category';
        grouped[cat] = (grouped[cat] || 0) + 1;
      });
      console.log("Missing products by mainCategoryId:", grouped);
      
      // Print first 5 missing products
      console.log("First 5 missing products:", missing.slice(0, 5).map(p => ({ id: p.id, name: p.name, mainCategoryId: p.mainCategoryId })));
    } else {
      console.log("All products from seed file are present in Supabase!");
    }

  } catch (err) {
    console.error("Error during check:", err);
  }
}

run();
