const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, '..', 'public', 'products_seed.json');
const sourcePath = path.join(__dirname, 'company_list_source.txt');

const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const sourceText = fs.readFileSync(sourcePath, 'utf8');
const allProducts = seedData.products || [];

const unmatchedBR = allProducts.filter(p => p.mainCategoryId === 'Br' && !p.barcode);

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
for (const line of sourceText.split('\n')) {
  const parsed = parseCompanyLine(line);
  if (parsed) companyProducts.push(parsed);
}
const brCompanyList = companyProducts.filter(cp => cp.brand === 'BR');

console.log(`Searching for the ${unmatchedBR.length} unmatched BR products in the company list...`);

function normalizeAr(str) {
  if (!str) return '';
  return str
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const FRACTION_TO_MM = {
  '1/2': 20, '2/1': 20, '1/2"': 20,
  '3/4': 25, '4/3': 25, '3/4"': 25,
  '1/4-1': 40, '1-1/4': 40, '1.1/4': 40, '1.25': 40,
  '1/2-1': 50, '1-1/2': 50, '1.1/2': 50, '1.5': 50,
  '1': 32, '2': 63, '2.5': 75, '3': 90, '4': 110, '5': 125, '6': 160, '8': 200,
};

function extractSizes(text) {
  if (!text) return [];
  let t = text.replace(/٫/g, '.').replace(/,/g, '.');
  t = t.replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - '٠'.charCodeAt(0)));
  t = t.replace(/١\s*\/\s*٢/g, '1/2')
       .replace(/٢\s*\/\s*١/g, '1/2')
       .replace(/٣\s*\/\s*٤/g, '3/4')
       .replace(/٤\s*\/\s*٣/g, '3/4')
       .replace(/١/g, '1')
       .replace(/٢/g, '2')
       .replace(/٣/g, '3')
       .replace(/٤/g, '4')
       .replace(/٥/g, '5')
       .replace(/٦/g, '6')
       .replace(/٧/g, '7')
       .replace(/٨/g, '8')
       .replace(/٩/g, '9');

  const sizes = [];
  t = t.replace(/(?<![\d\.])(\d+(?:\.\d+)?)\s*(?:م|متر|سم|cm|meter|meters)(?![\d\w\u0600-\u06FF])/g, ' ');

  const fracMatches = t.matchAll(/\b(\d+[\-\s\.]+\d+\/\d+|\d+\/\d+)\b/g);
  for (const match of fracMatches) {
    const rawVal = match[1].replace(/\s+/g, '').replace('-', '/').replace('.', '/');
    const parts = rawVal.split('/').map(Number);
    if (parts.every(p => p < 10)) {
      let mapped = rawVal;
      if (rawVal === '1/2' || rawVal === '2/1') mapped = '1/2';
      else if (rawVal === '3/4' || rawVal === '4/3') mapped = '3/4';
      else if (['1/1/2','1/2/1','1-1/2'].includes(rawVal)) mapped = '1-1/2';
      else if (['1/1/4','1/4/1','1-1/4'].includes(rawVal)) mapped = '1-1/4';
      if (FRACTION_TO_MM[mapped] !== undefined) sizes.push(FRACTION_TO_MM[mapped]);
    }
  }

  const smallFractionRegex = /\b([0-9]\/[0-9]|[0-9]\-[0-9]\/[0-9])\b/g;
  let cleanText = t.replace(smallFractionRegex, ' ');
  cleanText = cleanText.replace(/[\/\*×]/g, ' ');

  const numMatches = cleanText.matchAll(/(?<![\d\.])(\d+(?:\.\d+)?)(?![\d\.])/g);
  const VALID_MM_SIZES = new Set([20, 25, 32, 40, 48, 50, 60, 63, 75, 90, 110, 125, 160, 200]);
  const VALID_INCH_SIZES = {
    '0.5': 20, '0.75': 25, '1': 32, '1.25': 40, '1.5': 50, '2': 63, '2.5': 75, '3': 90, '4': 110, '6': 160, '8': 200
  };

  for (const match of numMatches) {
    const val = parseFloat(match[1]);
    const valStr = String(val);
    if (VALID_MM_SIZES.has(val)) {
      sizes.push(val);
    } else if (VALID_INCH_SIZES[valStr] !== undefined) {
      sizes.push(VALID_INCH_SIZES[valStr]);
    }
  }
  return [...new Set(sizes)];
}

const results = [];

unmatchedBR.forEach(p => {
  const pName = p.name;
  const pSizes = extractSizes(pName);
  
  // Find candidates with similar name keywords or size match
  const candidates = [];
  const pWords = normalizeAr(pName).split(' ').filter(w => w.length > 2 && w !== 'بوصة' && w !== 'بوصه' && w !== 'لحام' && w !== 'بي' && w !== 'ار' && w !== 'br');
  
  brCompanyList.forEach(cp => {
    const cName = cp.name;
    const cSizes = extractSizes(cName);
    
    // Check if sizes are compatible
    const sizesCompatible = pSizes.length === 0 || cSizes.length === 0 || pSizes.some(ps => cSizes.includes(ps));
    if (!sizesCompatible) return;
    
    // Check word matches
    const cWords = normalizeAr(cName).split(' ');
    const matchedWords = pWords.filter(pw => cWords.some(cw => cw.includes(pw)));
    
    if (matchedWords.length > 0) {
      const matchScore = matchedWords.length / pWords.length;
      candidates.push({ cp, matchScore, matchedWords });
    }
  });
  
  candidates.sort((a, b) => b.matchScore - a.matchScore);
  
  results.push({
    product: p,
    pSizes,
    candidates: candidates.slice(0, 3) // top 3 candidates
  });
});

// Output results
results.forEach(res => {
  console.log(`\nProduct: [${res.product.id}] ${res.product.name} (Sizes: ${res.pSizes.join(', ')})`);
  if (res.candidates.length === 0) {
    console.log('  No matching candidates found in company list');
  } else {
    res.candidates.forEach(cand => {
      console.log(`  -> [${cand.cp.code}] ${cand.cp.name} | Price: ${cand.cp.lp} (Score: ${(cand.matchScore * 100).toFixed(0)}%, Words: ${cand.matchedWords.join(',')})`);
    });
  }
});
