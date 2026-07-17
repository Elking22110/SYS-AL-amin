import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const seedPath   = path.join(__dirname, '..', 'public', 'products_seed.json');
const sourcePath = path.join(__dirname, '..', 'scripts', 'company_list_source.txt');

const seedData     = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const sourceText   = fs.readFileSync(sourcePath, 'utf8');
const allProducts  = seedData.products || [];

function normalizeAr(str) {
  if (!str) return '';
  return str
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/وصل[هة]/g, 'جلبه')
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - '٠'.charCodeAt(0)))
    .replace(/[\u064B-\u065F]/g, '')
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
      else if (rawVal === '1/1/2' || rawVal === '1/2/1' || rawVal === '1-1/2') mapped = '1-1/2';
      else if (rawVal === '1/1/4' || rawVal === '1/4/1' || rawVal === '1-1/4') mapped = '1-1/4';
      if (FRACTION_TO_MM[mapped] !== undefined) {
        sizes.push(FRACTION_TO_MM[mapped]);
      }
    }
  }

  const smallFractionRegex = /\b([0-9]\/[0-9]|[0-9]\-[0-9]\/[0-9])\b/g;
  let cleanText = t.replace(smallFractionRegex, ' ');
  cleanText = cleanText.replace(/[\/\*]/g, ' ');

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

function parseCompanyLine(line) {
  line = line.trim();
  if (!line || line.startsWith('Code') || line.startsWith('#') || line.startsWith('Brand')) return null;
  
  // 1. Extract 9-digit code
  let codeMatch = line.match(/\b(\d{9})\b/);
  if (!codeMatch) return null;
  let code = codeMatch[1];
  
  // Clean line from code
  let cleanLine = line.replace(/\b\d{9}\b/, '').trim();
  
  // 2. Find brand and price adjacent to each other
  // Brands list
  const BRANDS = ['BR', 'KS', 'SM', 'SG', 'SL', 'NC', 'MX', 'BU', 'FT', 'MP'];
  let brand = null;
  let lp = null;
  
  for (const b of BRANDS) {
    // Regex for: Brand followed by Price, or Price followed by Brand
    const regex1 = new RegExp('\\b' + b + '\\s+(\\d+(?:\\.\\d+)?)\\b', 'i');
    const regex2 = new RegExp('\\b(\\d+(?:\\.\\d+)?)\\s+' + b + '\\b', 'i');
    
    let match = cleanLine.match(regex1);
    if (match) {
      brand = b;
      lp = parseFloat(match[1]);
      cleanLine = cleanLine.replace(regex1, '').trim();
      break;
    }
    
    match = cleanLine.match(regex2);
    if (match) {
      brand = b;
      lp = parseFloat(match[1]);
      cleanLine = cleanLine.replace(regex2, '').trim();
      break;
    }
  }

  // Fallback if brand-price matching fails (e.g. price is separated or missing)
  if (!brand) {
    let brandMatch = cleanLine.match(/\b(BR|KS|SM|SG|SL|NC|MX|BU|FT|MP)\b/);
    if (brandMatch) {
      brand = brandMatch[1];
      cleanLine = cleanLine.replace(/\b(BR|KS|SM|SG|SL|NC|MX|BU|FT|MP)\b/, '').trim();
    }
  }

  // Remaining line is the clean name
  let name = cleanLine
    .replace(/[*]+/g, '')
    .trim()
    .replace(/\s+/g, ' ');

  return { code, name, brand, lp };
}

const companyList = [];
for (const line of sourceText.split('\n')) {
  const parsed = parseCompanyLine(line);
  if (parsed) companyList.push(parsed);
}

// Let's run a diagnostic match on a few products
console.log('Parsed company list length:', companyList.length);
const brProducts = allProducts.filter(p => p.mainCategoryId === 'Br');
console.log('BR products length:', brProducts.length);

const testProd = brProducts.find(p => p.name.includes('جلبة بسن داخلى ٢/١ بوصة BR'));
console.log('\nTest Product:', testProd);
if (testProd) {
  const pSizes = extractSizes(testProd.name);
  console.log('Product sizes extracted:', pSizes);
  
  // Find matching company fittings
  const brCompanyFittings = companyList.filter(c => c.brand === 'BR' && /^3[5-9]\d{7}$/.test(c.code));
  console.log('BR fittings in company list:', brCompanyFittings.length);
  
  const testComp = brCompanyFittings.find(c => c.name.includes('وصلة بسن داخلى 20*1/2') || c.code === '361060001');
  console.log('Company product:', testComp);
  if (testComp) {
    const cSizes = extractSizes(testComp.name);
    console.log('Company sizes extracted:', cSizes);
    console.log('Sizes length match:', pSizes.length === cSizes.length);
    const allSizesMatch = pSizes.every(ps => cSizes.some(cs => Math.abs(cs - ps) <= 3));
    console.log('All sizes match:', allSizesMatch);
    
    // Check type overlap
    const pTypes = detectPartType(testProd.name);
    const cTypes = detectPartType(testComp.name);
    console.log('Product types:', pTypes);
    console.log('Company types:', cTypes);
  }
}
