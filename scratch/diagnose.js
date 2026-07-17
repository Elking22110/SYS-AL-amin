import fs from 'fs';
import path from 'path';

function normalizeAr(str) {
  if (!str) return '';
  return str
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - '٠'.charCodeAt(0)))
    .replace(/[\u064B-\u065F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// Map fraction strings to mm
const FRACTION_TO_MM = {
  '1/2': 20, '2/1': 20, '1/2"': 20,
  '3/4': 25, '4/3': 25, '3/4"': 25,
  '1/4-1': 40, '1-1/4': 40, '1.1/4': 40, '1.25': 40,
  '1/2-1': 50, '1-1/2': 50, '1.1/2': 50, '1.5': 50,
  '1': 32, '2': 63, '2.5': 75, '3': 90, '4': 110, '5': 125, '6': 160, '8': 200,
};

function extractSizes(text) {
  // 1. Replace Arabic decimal separator and comma with dot
  let t = text.replace(/٫/g, '.').replace(/,/g, '.');

  // 2. Replace Arabic numerals with English numerals
  t = t.replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - '٠'.charCodeAt(0)));
  
  // 3. Standardize Arabic fractions to English fraction formats
  t = t.replace(/١\s*\/\s*٢/g, '1/2')
       .replace(/٢\s*\/\s*١/g, '1/2') // flipped OCR
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

  // 4. Remove length measurements (e.g. 4م, 6 متر, 150 سم, 75 سم) to avoid extracting them as sizes
  // We match numbers followed by م or متر or سم or cm or mm (Wait, mm is size, so don't remove mm!)
  t = t.replace(/(?<![\d\.])(\d+(?:\.\d+)?)\s*(?:م|متر|سم|cm|meter|meters)(?![\d\w\u0600-\u06FF])/g, ' ');

  // 5. First, search for and extract known fraction matches from text:
  const fracMatches = t.matchAll(/\b(\d+[\-\s\.]+\d+\/\d+|\d+\/\d+)\b/g);
  for (const match of fracMatches) {
    const rawVal = match[1].replace(/\s+/g, '').replace('-', '/').replace('.', '/');
    const parts = rawVal.split('/').map(Number);
    // Treat as fraction only if parts are small (inches)
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

  // Remove small fractions to avoid their numbers being matched again
  const smallFractionRegex = /\b([0-9]\/[0-9]|[0-9]\-[0-9]\/[0-9])\b/g;
  let cleanText = t.replace(smallFractionRegex, ' ');

  // Replace any slashes/separators with spaces to isolate numbers
  cleanText = cleanText.replace(/[\/\*]/g, ' ');

  // Find all numbers (including decimals) in the remaining text
  const numMatches = cleanText.matchAll(/(?<![\d\.])(\d+(?:\.\d+)?)(?![\d\.])/g);
  
  // Valid mm sizes and inch sizes lists
  const VALID_MM_SIZES = new Set([20, 25, 32, 40, 48, 50, 60, 63, 75, 90, 110, 125, 160, 200]);
  const VALID_INCH_SIZES = {
    '0.5': 20, '0.75': 25, '1': 32, '1.25': 40, '1.5': 50, '2': 63, '2.5': 75, '3': 90, '4': 110, '6': 160, '8': 200
  };

  for (const match of numMatches) {
    const val = parseFloat(match[1]);
    const valStr = String(val);

    // If it's a valid millimeter size, add it directly
    if (VALID_MM_SIZES.has(val)) {
      sizes.push(val);
    } 
    // If it's a valid inch size, map it to mm
    else if (VALID_INCH_SIZES[valStr] !== undefined) {
      sizes.push(VALID_INCH_SIZES[valStr]);
    }
  }

  return [...new Set(sizes)];
}

console.log('--- TEST CASES ---');
console.log('كرنك لحام ٢/١ بوصة BR:', extractSizes('كرنك لحام ٢/١ بوصة BR')); // Expected: [20]
console.log('كوع لحام كرنك 25 مم:', extractSizes('كوع لحام كرنك 25 مم')); // Expected: [25]
console.log('كوع بسن خارجي ٢/١ بوصة BR:', extractSizes('كوع بسن خارجي ٢/١ بوصة BR')); // Expected: [20]
console.log('مشترك مسلوب ٤ * ٢ بوصه عاده:', extractSizes('مشترك مسلوب ٤ * ٢ بوصه عاده')); // Expected: [110, 63] (4" = 110, 2" = 63)
console.log('يارده ١,٥ * ١,٥ مم:', extractSizes('يارده ١,٥ * ١,٥ مم')); 
console.log('كوع 110 مم مدفون:', extractSizes('كوع 110 مم مدفون')); // Expected: [110]
console.log('كوع 45 درجة 32 مم:', extractSizes('كوع 45 درجة 32 مم')); // Expected: [32]
console.log('مشترك مسلوب 60/110 مم:', extractSizes('مشترك مسلوب 60/110 مم')); // Expected: [60, 110]
console.log('تى لحام مسلوب 20/25:', extractSizes('تى لحام مسلوب 20/25')); // Expected: [20, 25]
console.log('مواسير 160 مم صرف PP طول 6 متر:', extractSizes('مواسير 160 مم صرف PP طول 6 متر')); // Expected: [160] (not [160, 6])
console.log('PPR مواسير لحام 160مم 4م BR:', extractSizes('PPR مواسير لحام 160مم 4م BR')); // Expected: [160] (not [160, 110] from 4)


