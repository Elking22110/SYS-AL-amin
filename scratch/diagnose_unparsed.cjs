const fs = require('fs');
const path = require('path');

const pdfTextPath = path.join(__dirname, '..', 'scripts', 'extracted_pdf_text.txt');
const companySourcePath = path.join(__dirname, '..', 'scripts', 'company_list_source.txt');

if (!fs.existsSync(pdfTextPath)) {
  console.error('File not found:', pdfTextPath);
  process.exit(1);
}

const pdfText = fs.readFileSync(pdfTextPath, 'utf8');
const lines = pdfText.split('\n');

const companySourceText = fs.existsSync(companySourcePath) ? fs.readFileSync(companySourcePath, 'utf8') : '';
const companyCodes = new Set();
companySourceText.split('\n').forEach(line => {
  const m = line.match(/\b(\d{9})\b/);
  if (m) companyCodes.add(m[1]);
});

console.log(`📋 Loaded ${companyCodes.size} codes from company_list_source.txt`);

let totalNineDigitCodesInPdf = 0;
const missedCodes = [];

lines.forEach((line, index) => {
  // البحث عن أي 9 أرقام متتالية حتى لو ملتصقة بكلمات
  const m = line.match(/(\d{9})/);
  if (m) {
    totalNineDigitCodesInPdf++;
    const code = m[1];
    if (!companyCodes.has(code)) {
      missedCodes.push({ lineNum: index + 1, code, text: line.trim() });
    }
  }
});

console.log(`\n📊 PDF Analysis:`);
console.log(`- Total consecutive 9-digit numbers found in PDF: ${totalNineDigitCodesInPdf}`);
console.log(`- Missed codes (in PDF but not in company_list_source.txt): ${missedCodes.length}`);

if (missedCodes.length > 0) {
  console.log(`\n📝 Missed items sample (First 20 items):`);
  missedCodes.slice(0, 20).forEach(item => {
    console.log(`  Line ${item.lineNum}: [${item.code}] -> "${item.text}"`);
  });
}
