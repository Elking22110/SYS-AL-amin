/**
 * debug-match-test.cjs — diagnostic for company code matching
 */
const fs = require('fs');
const path = require('path');

const LOG_PATH = path.join(__dirname, '..', 'debug-6d4555.log');
const ENDPOINT = 'http://127.0.0.1:7421/ingest/baaa0d01-24a0-4303-a164-d2aca3efeaa4';
const SESSION = '6d4555';

function agentLog(hypothesisId, location, message, data) {
  const payload = { sessionId: SESSION, hypothesisId, location, message, data, timestamp: Date.now(), runId: 'pre-fix' };
  // #region agent log
  fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': SESSION }, body: JSON.stringify(payload) }).catch(() => {});
  try { fs.appendFileSync(LOG_PATH, JSON.stringify(payload) + '\n'); } catch (_) {}
  // #endregion
}

// Minimal re-implementation of link-company-codes helpers for diagnosis
function normalizeAr(str) {
  if (!str) return '';
  return str.replace(/[\uFEF5-\uFEFC]/g, 'لا').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
    .replace(/وصل[هة]/g, 'جلبه').replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - '٠'.charCodeAt(0)))
    .replace(/[\u064B-\u065F]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

const FRACTION_TO_MM = { '1/2': 20, '2/1': 20, '3/4': 25, '4/3': 25, '1': 32, '2': 63 };
const VALID_MM = new Set([20, 25, 32, 40, 48, 50, 60, 63, 75, 90, 110, 125, 160, 200]);
const INCH_TO_MM = { '0.5': 20, '0.75': 25, '1': 32, '1.25': 40, '1.5': 50, '2': 63 };

function extractSizes(text) {
  if (!text) return [];
  let t = text.replace(/٫/g, '.').replace(/,/g, '.');
  t = t.replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - '٠'.charCodeAt(0)));
  t = t.replace(/١\s*\/\s*٢/g, '1/2').replace(/٢\s*\/\s*١/g, '1/2').replace(/٣\s*\/\s*٤/g, '3/4').replace(/٤\s*\/\s*٣/g, '3/4');
  const sizes = [];
  t = t.replace(/(?<![\d.])(\d+(?:\.\d+)?)\s*(?:م|متر|سم|cm)(?![\d\w\u0600-\u06FF])/g, ' ');
  for (const match of t.matchAll(/\b(\d+[\-\s.]+\d+\/\d+|\d+\/\d+)\b/g)) {
    let rawVal = match[1].replace(/\s+/g, '').replace('-', '/').replace('.', '/');
    if (rawVal === '1/2' || rawVal === '2/1') rawVal = '1/2';
    else if (rawVal === '3/4' || rawVal === '4/3') rawVal = '3/4';
    const mm = FRACTION_TO_MM[rawVal];
    if (mm !== undefined) sizes.push(mm);
  }
  let clean = t.replace(/\b([0-9]\/[0-9]|[0-9]\-[0-9]\/[0-9])\b/g, ' ').replace(/[/*]/g, ' ');
  for (const match of clean.matchAll(/(?<![\d.])(\d+(?:\.\d+)?)(?![\d.])/g)) {
    const val = parseFloat(match[1]);
    if (VALID_MM.has(val)) sizes.push(val);
    else if (INCH_TO_MM[String(val)] !== undefined) sizes.push(INCH_TO_MM[String(val)]);
  }
  return [...new Set(sizes)];
}

const isMale = t => normalizeAr(t).match(/ذكر|خارجي|خارجى/);
const isFemale = t => normalizeAr(t).match(/انثي|انثى|داخلي|داخلى/);

function parseCompanyLine(line) {
  line = line.trim();
  if (!line || /^(Code|Brand|#)/.test(line)) return null;
  const codeM = line.match(/\b(\d{9})\b/);
  if (!codeM) return null;
  const code = codeM[1];
  let cleanLine = line.replace(/\b\d{9}\b/, '').trim();
  const BRANDS = ['BR', 'KS', 'SM', 'SG', 'SL', 'NC', 'MX'];
  let brand = null, lp = null;
  for (const b of BRANDS) {
    const r1 = new RegExp('\\b' + b + '\\s+(\\d+(?:\\.\\d+)?)\\b', 'i');
    const r2 = new RegExp('\\b(\\d+(?:\\.\\d+)?)\\s+' + b + '\\b', 'i');
    let m = cleanLine.match(r1);
    if (m) { brand = b; lp = parseFloat(m[1]); break; }
    m = cleanLine.match(r2);
    if (m) { brand = b; lp = parseFloat(m[1]); break; }
  }
  if (!brand) { const bm = cleanLine.match(/\b(BR|KS|SM|SG|SL|NC|MX)\b/); if (bm) brand = bm[1]; }
  const name = cleanLine.replace(/[*]+/g, '').replace(/\b(BR|KS|SM)\b/g, '').trim().replace(/\s+/g, ' ');
  return { code, name, brand, lp: lp || 0 };
}

const seedData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'products_seed.json'), 'utf8'));
const sourceText = fs.readFileSync(path.join(__dirname, 'company_list_source.txt'), 'utf8');
const companyList = sourceText.split('\n').map(parseCompanyLine).filter(Boolean);
const brFittings = companyList.filter(c => c.brand === 'BR' && /^3[5-9]\d{7}$/.test(c.code));

const TEST_IDS = [10037, 10039, 10040, 10046, 10047, 10054, 10061, 10174, 10175];
const products = seedData.products.filter(p => TEST_IDS.includes(p.id));

agentLog('INIT', 'debug-match-test.cjs', 'Starting diagnostic', { testCount: products.length, companyCount: companyList.length });

for (const p of products) {
  const pName = p.name || '';
  const pSizes = extractSizes(pName);

  agentLog('A', 'debug-match-test.cjs:extractSizes', 'Size extraction', {
    id: p.id, name: pName, extractedSizes: pSizes, currentBarcode: p.barcode
  });

  agentLog('B', 'debug-match-test.cjs:gender', 'Gender detection', {
    id: p.id, name: pName, isMale: !!isMale(pName), isFemale: !!isFemale(pName), currentBarcode: p.barcode
  });

  const priceMatches = companyList.filter(c =>
    c.brand === 'BR' && p.price > 0 && Math.abs(c.lp - p.price) / p.price < 0.05
  ).slice(0, 5);

  const currentComp = companyList.find(c => c.code === p.barcode);
  const priceDiff = currentComp && p.price > 0 ? Math.abs(p.price - currentComp.lp) / p.price : null;

  agentLog('D', 'debug-match-test.cjs:price', 'Price validation', {
    id: p.id, price: p.price, currentBarcode: p.barcode,
    currentCompName: currentComp?.name, currentCompPrice: currentComp?.lp,
    priceDiffPercent: priceDiff != null ? (priceDiff * 100).toFixed(1) : null,
    priceMatches: priceMatches.map(c => ({ code: c.code, name: c.name, lp: c.lp }))
  });
}

const manualCode = fs.readFileSync(path.join(__dirname, 'manual-codes.cjs'), 'utf8');
const manualIds = new Set([...manualCode.matchAll(/^\s*(\d+):\s*'(\d+)'/gm)].map(m => parseInt(m[1])));

agentLog('E', 'debug-match-test.cjs:manual', 'Manual codes coverage', {
  uncovered: products.filter(p => !manualIds.has(p.id)).map(p => ({ id: p.id, name: p.name, barcode: p.barcode })),
  covered: products.filter(p => manualIds.has(p.id)).map(p => ({ id: p.id, barcode: p.barcode }))
});

console.log('Diagnostic complete. Check debug-6d4555.log');
