const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const FALLBACK_URL = 'https://akkjkjbnhafmolpvoiln.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2pramJuaGFmbW9scHZvaWxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDAxMjcsImV4cCI6MjA5OTcxNjEyN30.ZM8XrstSbziMpgVUozw2mNo05u_9vVtbuOz8wtbJa2w';

const supabase = createClient(FALLBACK_URL, FALLBACK_KEY);

async function verifyPostCorrections() {
  console.log('==================================================');
  console.log('SIS AL AMEEN — POST CORRECTIONS VERIFICATION');
  console.log('==================================================\n');

  const snapshotFiles = fs.readdirSync('.').filter(f => f.startsWith('before_snapshot_code_corrections_'));
  if (snapshotFiles.length === 0) {
    console.error('❌ Snapshot file not found');
    process.exit(1);
  }

  const latestSnapshot = snapshotFiles.sort().pop();
  const snapshotData = JSON.parse(fs.readFileSync(latestSnapshot, 'utf8'));

  console.log(`Loaded snapshot file -> ${latestSnapshot}`);

  const { data: currentProds, error } = await supabase.from('products').select('*');
  if (error || !currentProds) {
    console.error('❌ Failed to fetch current products:', error);
    process.exit(1);
  }

  let verifiedCount = 0;

  for (const item of snapshotData) {
    const before = item.beforeRecord;
    const targetCode = item.targetCorrection.correctCode;
    const current = currentProds.find(p => p.id === before.id);

    if (!current) {
      console.error(`❌ Product ID ${before.id} is missing from Supabase!`);
      process.exit(1);
    }

    const sameId = current.id === before.id;
    const sameName = current.name === before.name;
    const samePrice = current.price === before.price;
    const sameStock = current.stock === before.stock;
    const sameMainCat = current.main_category_id === before.main_category_id;
    const sameSubCat = current.sub_category_id === before.sub_category_id;
    const barcodeCorrect = current.barcode === targetCode;

    if (sameId && sameName && samePrice && sameStock && sameMainCat && sameSubCat && barcodeCorrect) {
      console.log(`✅ [VERIFIED] "${current.name}" (ID ${current.id}): Barcode=${current.barcode} | Price=${current.price} | Category unchanged`);
      verifiedCount++;
    } else {
      console.error(`❌ [VERIFICATION FAILED] "${current.name}" (ID ${current.id}): Mismatch detected!`);
      process.exit(1);
    }
  }

  console.log(`\n==================================================`);
  console.log(`Total Products on Cloud: ${currentProds.length}`);
  console.log(`Verified Corrected Records: ${verifiedCount} / ${snapshotData.length}`);
  console.log('==================================================');

  if (verifiedCount === snapshotData.length) {
    console.log('\n🎉 SMART WHITE VERIFIED CODE CORRECTION = PASS!');
  } else {
    process.exit(1);
  }
}

verifyPostCorrections();
