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
  
  function parseCompanyLine(line) {
    line = line.trim();
    if (!line || /^(Code|Brand|#)/.test(line)) return null;
    const codeM = line.match(/\b(\d{9})\b/);
    if (!codeM) return null;
    const code = codeM[1];
    
    let cleanLine = line.replace(/\b\d{9}\b/, '').trim();
    const BRANDS = ['BR','KS','SM','SG','SL','NC','MX','BU','FT','MP'];
    let brand = null;
    let lp = null;
    
    for (const b of BRANDS) {
      const r1 = new RegExp('\\b' + b + '\\s+(\\d+(?:\\.\\d+)?)\\b', 'i');
      const r2 = new RegExp('\\b(\\d+(?:\\.\\d+)?)\\s+' + b + '\\b', 'i');
      
      let m = cleanLine.match(r1);
      if (m) { brand = b; lp = parseFloat(m[1]); cleanLine = cleanLine.replace(r1,'').trim(); break; }
      m = cleanLine.match(r2);
      if (m) { brand = b; lp = parseFloat(m[1]); cleanLine = cleanLine.replace(r2,'').trim(); break; }
    }
    
    if (!brand) {
      const bm = cleanLine.match(/\b(BR|KS|SM|SG|SL|NC|MX|BU|FT|MP)\b/);
      if (bm) {
        brand = bm[1];
        cleanLine = cleanLine.replace(/\b(BR|KS|SM|SG|SL|NC|MX|BU|FT|MP)\b/,'').trim();
      }
    }
    
    const name = cleanLine.replace(/[*]+/g,'').trim().replace(/\s+/g,' ');
    return { code, name, brand, lp };
  }

  const companyProducts = [];
  sourceText.split('\n').forEach(line => {
    const cp = parseCompanyLine(line);
    if (cp) companyProducts.push(cp);
  });

  console.log(`📋 Loaded ${companyProducts.length} items from company price list for verification.`);

  let priceMismatches = 0;
  let codeMismatches = 0;

  companyProducts.forEach(cp => {
    const sysP = barcodeMap.get(cp.code);
    if (!sysP) {
      console.warn(`⚠️ Warning: Company code [${cp.code}] "${cp.name}" (Price: ${cp.lp}) is NOT mapped to any active product in the seed.`);
      codeMismatches++;
    } else {
      // Check price matching
      if (Math.abs(sysP.price - cp.lp) > 0.001) {
        console.error(`❌ Price Mismatch for barcode ${cp.code}:\n  - System: "${sysP.name}" -> ${sysP.price} EGP\n  - Company List: "${cp.name}" -> ${cp.lp} EGP`);
        hasErrors = true;
        priceMismatches++;
      }
    }
  });

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
