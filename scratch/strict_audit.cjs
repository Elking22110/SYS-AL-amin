const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, '..', 'public', 'products_seed.json');
const sourcePath = path.join(__dirname, '..', 'scripts', 'company_list_source.txt');

if (!fs.existsSync(seedPath)) {
  console.error('❌ Products seed file not found!');
  process.exit(1);
}

const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const products = seedData.products || [];

console.log(`🔍 Starting strict audit of ${products.length} products...\n`);

let hasErrors = false;

// 1. Check ID Uniqueness
const idMap = new Map();
products.forEach(p => {
  if (idMap.has(p.id)) {
    console.error(`❌ Duplicate ID found: ${p.id} for "${p.name}" and "${idMap.get(p.id).name}"`);
    hasErrors = true;
  } else {
    idMap.set(p.id, p);
  }
});

// 2. Check Barcode Uniqueness
const barcodeMap = new Map();
products.forEach(p => {
  if (p.barcode) {
    const codeStr = String(p.barcode).trim();
    if (barcodeMap.has(codeStr)) {
      console.error(`❌ Duplicate Barcode found: "${codeStr}" shared by:\n  - ID: ${p.id} Name: "${p.name}"\n  - ID: ${barcodeMap.get(codeStr).id} Name: "${barcodeMap.get(codeStr).name}"`);
      hasErrors = true;
    } else {
      barcodeMap.set(codeStr, p);
    }
  }
});

// 3. Check Name Uniqueness within subCategory
const nameSubCatMap = new Map();
products.forEach(p => {
  const key = `${p.mainCategoryId}::${p.subCategoryId}::${p.name.trim()}`;
  if (nameSubCatMap.has(key)) {
    console.warn(`⚠️ Warning: Duplicate product name within same category/subcategory:\n  - ID: ${p.id} and ID: ${nameSubCatMap.get(key).id} are both named "${p.name}" under ${p.mainCategoryId} -> ${p.subCategoryId}`);
  } else {
    nameSubCatMap.set(key, p);
  }
});

// 4. Check category structure and values
products.forEach(p => {
  if (!p.mainCategoryId || String(p.mainCategoryId).trim() === "") {
    console.error(`❌ Product ID ${p.id} "${p.name}" is missing mainCategoryId!`);
    hasErrors = true;
  }
  if (!p.subCategoryId || String(p.subCategoryId).trim() === "") {
    console.error(`❌ Product ID ${p.id} "${p.name}" is missing subCategoryId!`);
    hasErrors = true;
  }
  if (typeof p.price !== 'number' || isNaN(p.price) || p.price < 0) {
    console.error(`❌ Product ID ${p.id} "${p.name}" has invalid price: ${p.price}`);
    hasErrors = true;
  }
});

// 5. Audit against company_list_source.txt
if (fs.existsSync(sourcePath)) {
  const sourceText = fs.readFileSync(sourcePath, 'utf8');
  
  const companyPriceMap = {};
  const companyNameMap = {};

  sourceText.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || /^(Code|Brand|#)/.test(trimmed)) return;

    // استخراج الكود المكون من 9 أرقام
    const codeMatch = trimmed.match(/\b(\d{9})\b/);
    if (!codeMatch) return;
    const code = codeMatch[1];

    // استخراج السعر المكتوب في نهاية السطر
    const tokens = trimmed.split(/\s+/);
    let price = null;
    
    for (let i = tokens.length - 1; i >= 0; i--) {
      const val = parseFloat(tokens[i]);
      if (!isNaN(val) && tokens[i].includes('.') || (val > 0 && i === tokens.length - 1)) {
        price = val;
        break;
      }
    }

    if (price !== null) {
      companyPriceMap[code] = price;
      
      let cleanName = trimmed.replace(code, '').replace(String(price), '').trim();
      cleanName = cleanName.replace(/\b(BR|KS|SM|SG|SL|NC|MX|BU|FT|MP)\b/g, '').replace(/[*]+/g, '').trim();
      companyNameMap[code] = cleanName;
    }
  });

  console.log(`📋 Loaded ${Object.keys(companyPriceMap).length} items from company price list for verification.`);

  let priceMismatches = 0;
  let codeMismatches = 0;

  for (const [code, compPrice] of Object.entries(companyPriceMap)) {
    const sysP = barcodeMap.get(code);
    if (!sysP) {
      console.warn(`⚠️ Warning: Company code [${code}] "${companyNameMap[code]}" (Price: ${compPrice}) is NOT mapped to any active product in the seed.`);
      codeMismatches++;
    } else {
      // Check price matching
      if (Math.abs(sysP.price - compPrice) > 0.001) {
        console.error(`❌ Price Mismatch for barcode ${code}:\n  - System: "${sysP.name}" -> ${sysP.price} EGP\n  - Company List: "${companyNameMap[code]}" -> ${compPrice} EGP`);
        hasErrors = true;
        priceMismatches++;
      }
    }
  }

  console.log(`\nPrice Mismatches: ${priceMismatches}`);
  console.log(`Unmapped Company Codes: ${codeMismatches}`);
} else {
  console.warn('⚠️ Warning: company_list_source.txt not found, skipping price match verification.');
}

if (hasErrors) {
  console.log('\n❌ AUDIT FAILED: Integrity errors were found in the database. Please review the output.');
  process.exit(1);
} else {
  console.log('\n✅ AUDIT PASSED: The database is 100% clean, consistent, and has absolutely zero duplicate barcodes or IDs.');
}
