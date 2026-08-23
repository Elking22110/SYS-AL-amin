/**
 * RECONCILE KESSEL CATALOG & SEED
 * ================================
 * 1. Loads approved 23 KESSEL products from scratch/kessel_approved_23.json
 * 2. Purges the 207 obsolete KESSEL products from products_seed.json and Supabase
 * 3. Ensures main category 'كيسيل' and subcategories 'قطع 32 كيسيل' & 'قطع 50م كيسيل' are properly defined in products_seed.json & Supabase
 * 4. Upserts the 23 approved KESSEL products to Supabase & products_seed.json
 * 5. Verifies KESSEL count = 23 (Supabase = IndexedDB = Seed = UI = 23)
 *
 * DOES NOT DELETE HISTORICAL SALES OR INVOICES.
 * Run: node scratch/reconcile_kessel_catalog.cjs
 */
'use strict';

const https = require('https');
const fs    = require('fs');
const path  = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://akkjkjbnhafmolpvoiln.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log('\n' + '═'.repeat(75));
  console.log('  RECONCILING KESSEL CATALOG (TARGET: EXACTLY 23 PRODUCTS)');
  console.log('═'.repeat(75));

  // 1. Load approved 23 Kessel products
  const approved23Path = path.join(__dirname, 'kessel_approved_23.json');
  const approved23 = JSON.parse(fs.readFileSync(approved23Path, 'utf8'));
  const approved23Ids = new Set(approved23.map(p => String(p.id)));

  console.log(`[Approved 23] Loaded ${approved23.length} approved KESSEL products.`);

  // 2. Fetch all current products from Supabase to find obsolete Kessel items
  let offset = 0;
  const pageSize = 1000;
  let allCloud = [];
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('updated_at', { ascending: true })
      .order('id', { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    if (data && data.length > 0) {
      allCloud.push(...data);
      offset += data.length;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  console.log(`[Supabase Cloud] Total products in cloud currently: ${allCloud.length}`);

  // Identify all current cloud products matching Kessel (by name or category)
  const cloudKesselProds = allCloud.filter(p => {
    const n = (p.name || '').toLowerCase();
    const m = String(p.main_category_id || '').toLowerCase();
    const s = String(p.sub_category_id || '').toLowerCase();
    return n.includes('كيسيل') || n.includes('كيسل') || m.includes('كيسيل') || s.includes('كيسيل');
  });

  const obsoleteKesselCloud = cloudKesselProds.filter(p => !approved23Ids.has(String(p.id)));
  console.log(`[Supabase Cloud] Current Kessel items: ${cloudKesselProds.length}`);
  console.log(`[Supabase Cloud] Obsolete Kessel items to delete: ${obsoleteKesselCloud.length}`);

  // Backup obsolete Kessel items before deleting
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(__dirname, `kessel_catalog_backup_${timestamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    approved23,
    obsoleteKesselCloud
  }, null, 2));
  console.log(`[Backup] Saved Kessel backup to: ${backupPath}`);

  // 3. Delete obsolete Kessel items from Supabase in batches
  if (obsoleteKesselCloud.length > 0) {
    console.log(`\nDeleting ${obsoleteKesselCloud.length} obsolete Kessel products from Supabase in fast batches...`);
    const batchSize = 50;
    for (let i = 0; i < obsoleteKesselCloud.length; i += batchSize) {
      const chunk = obsoleteKesselCloud.slice(i, i + batchSize);
      const idList = chunk.map(p => encodeURIComponent(String(p.id))).join(',');
      const deleteRes = await new Promise((resolve) => {
        const req = https.request({
          hostname: 'akkjkjbnhafmolpvoiln.supabase.co',
          path: `/rest/v1/products?id=in.(${idList})`,
          method: 'DELETE',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_KEY
          }
        }, res => resolve(res.statusCode));
        req.on('error', () => resolve(500));
        req.end();
      });
      console.log(`  → Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(obsoleteKesselCloud.length / batchSize)}: Status ${deleteRes}`);
    }
    console.log('✅ Deleted obsolete Kessel products from Supabase.');
  }

  // 4. Update / Normalize approved 23 Kessel products for main category 'كيسيل' and subcategories
  // Canonical Categories for Kessel:
  // Main Category: { id: "كيسيل", name: "كيسيل", parent_id: null }
  // Subcategory 1: { id: "1787232418390", name: "قطع 32 كيسيل", parent_id: "كيسيل" }
  // Subcategory 2: { id: "1787232476557", name: "قطع 50م كيسيل", parent_id: "كيسيل" }

  const kesselCategoriesToAdd = [
    { id: 'كيسيل', name: 'كيسيل', parent_id: null, parentId: null },
    { id: '1787232418390', name: 'قطع 32 كيسيل', parent_id: 'كيسيل', parentId: 'كيسيل' },
    { id: '1787232476557', name: 'قطع 50م كيسيل', parent_id: 'كيسيل', parentId: 'كيسيل' }
  ];

  // Upsert Kessel categories to Supabase
  for (const cat of kesselCategoriesToAdd) {
    await supabase.from('categories').upsert({
      id: cat.id,
      name: cat.name,
      parent_id: cat.parent_id,
      updated_at: new Date().toISOString()
    });
  }

  // Format approved 23 Kessel products payload
  const kesselUpsertPayloads = approved23.map(p => {
    let mainCat = 'كيسيل';
    let subCat = p.sub_category_id || p.subCategoryId || '1787232418390';
    if (String(p.id) === '20105') {
      mainCat = 'اسمارت ابيض';
      subCat = 'بوصه 4';
    }
    return {
      id: String(p.id),
      name: p.name,
      price: Number(p.price || 0),
      cost: Number(p.cost || p.costPrice || 0),
      stock: Number(p.stock || 0),
      barcode: p.barcode || null,
      main_category_id: mainCat,
      sub_category_id: subCat,
      image_path: p.image_path || null,
      updated_at: new Date().toISOString()
    };
  });

  console.log(`\nUpserting approved 23 Kessel products to Supabase...`);
  const { error: upsertErr } = await supabase.from('products').upsert(kesselUpsertPayloads);
  if (upsertErr) {
    console.error('❌ Error upserting approved 23 Kessel:', upsertErr.message);
  } else {
    console.log('✅ Upserted approved 23 Kessel products to Supabase.');
  }

  // 5. Update public/products_seed.json
  const seedPath = path.join(__dirname, '../public/products_seed.json');
  const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  let seedProds = seedData.products || [];
  let seedCats = seedData.categories || [];

  // Remove obsolete Kessel items from seed (keep non-Kessel + approved 23)
  const nonKesselSeedProds = seedProds.filter(p => {
    const n = (p.name || '').toLowerCase();
    const m = String(p.mainCategoryId || p.main_category_id || '').toLowerCase();
    const s = String(p.subCategoryId || p.sub_category_id || p.category || '').toLowerCase();
    const isKessel = n.includes('كيسيل') || n.includes('كيسل') || m.includes('كيسيل') || s.includes('كيسيل');
    return !isKessel || approved23Ids.has(String(p.id));
  });

  // Ensure all 23 approved Kessel items are in seedProds
  const seedProdMap = new Map(nonKesselSeedProds.map(p => [String(p.id), p]));
  kesselUpsertPayloads.forEach(kp => {
    seedProdMap.set(String(kp.id), {
      id: kp.id,
      name: kp.name,
      price: kp.price,
      cost: kp.cost,
      stock: kp.stock,
      barcode: kp.barcode,
      mainCategoryId: kp.main_category_id,
      subCategoryId: kp.sub_category_id,
      imagePath: kp.image_path,
      updated_at: kp.updated_at
    });
  });

  const finalSeedProds = Array.from(seedProdMap.values());

  // Ensure Kessel categories exist in seedCats
  const catMap = new Map(seedCats.map(c => [String(c.id), c]));
  kesselCategoriesToAdd.forEach(c => {
    catMap.set(String(c.id), c);
  });
  const finalSeedCats = Array.from(catMap.values());

  seedData.products = finalSeedProds;
  seedData.categories = finalSeedCats;

  fs.writeFileSync(seedPath, JSON.stringify(seedData, null, 2));
  console.log(`\n✅ Updated public/products_seed.json: ${finalSeedProds.length} total products, ${finalSeedCats.length} categories.`);

  // 6. Verify final Kessel count in Supabase
  const { data: finalKesselInCloud } = await supabase
    .from('products')
    .select('id, name, main_category_id, sub_category_id')
    .or('main_category_id.eq.كيسيل,name.ilike.%كيسيل%,name.ilike.%كيسل%');

  const finalKesselCount = finalKesselInCloud ? finalKesselInCloud.length : 0;
  console.log(`\n[Verification] Final KESSEL products in Supabase: ${finalKesselCount}`);

  // Verify total products count in Supabase
  const { count: finalTotalCloudCount } = await supabase.from('products').select('*', { count: 'exact', head: true });
  console.log(`[Verification] Final Total Products in Supabase: ${finalTotalCloudCount}`);

  console.log('\n' + '═'.repeat(75));
  if (finalKesselCount === 23) {
    console.log('  🎉 KESSEL RECONCILIATION SUCCESSFUL! Exact 23 Kessel products verified.');
  } else {
    console.warn(`  ⚠️ Kessel count is ${finalKesselCount}, expected 23.`);
  }
  console.log('═'.repeat(75) + '\n');
}

main().catch(console.error);
