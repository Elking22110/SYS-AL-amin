const fs = require('fs');
const path = require('path');

const pdfTextPath = path.join(__dirname, 'extracted_pdf_text.txt');
const companySourcePath = path.join(__dirname, 'company_list_source.txt');

if (!fs.existsSync(pdfTextPath)) {
  console.error('File not found:', pdfTextPath);
  process.exit(1);
}

const pdfText = fs.readFileSync(pdfTextPath, 'utf8');
const lines = pdfText.split('\n');

const allBrands = ["BR", "KS", "SM", "SG", "SL", "NC", "MX", "BU", "FT", "MP"];
const parsedItems = [];

lines.forEach((line, index) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  // البحث عن أول 9 أرقام متتالية في السطر (حتى لو ملتصقة)
  const codeMatch = trimmed.match(/(\d{9})/);
  if (!codeMatch) return;

  const code = codeMatch[1];
  let lineNoCode = trimmed.replace(code, '').trim();

  // تحديد الماركة/البراند
  let brand = "UNKNOWN";
  for (const b of allBrands) {
    if (lineNoCode.includes(b)) {
      brand = b;
      break;
    }
  }

  // استخراج السعر من نهاية السطر
  const tokens = lineNoCode.split(/\s+/);
  let price = null;
  for (let i = tokens.length - 1; i >= 0; i--) {
    const val = parseFloat(tokens[i]);
    if (!isNaN(val) && (tokens[i].includes('.') || (val > 0 && i === tokens.length - 1))) {
      price = val;
      break;
    }
  }

  // إذا لم نجد سعراً بطريقة parseFloat التقليدية، نبحث بريجكس في النهاية
  if (price === null) {
    const priceMatch = lineNoCode.match(/(\d+(?:\.\d+)?)\s*$/);
    if (priceMatch) {
      price = parseFloat(priceMatch[1]);
    }
  }

  if (price !== null) {
    // تنظيف الاسم من الكود والسعر والماركة
    let name = lineNoCode.replace(String(price), '').trim();
    // إزالة رمز الماركة المكرر في الأطراف
    allBrands.forEach(b => {
      const rx = new RegExp('\\b' + b + '\\b', 'g');
      name = name.replace(rx, '');
    });
    name = name.replace(/[*]+/g, '').replace(/\s+/g, ' ').trim();

    parsedItems.push({ code, name, brand, price, raw: trimmed });
  } else {
    console.warn(`⚠️ Warning: Line ${index + 1} has code ${code} but no price found: "${trimmed}"`);
  }
});

// حفظ البيانات في company_list_source.txt بالصيغة المطلوبة للسيستم
let outputContent = "Code Material Brand LP\n";
parsedItems.forEach(item => {
  // كتابة السطر بالصيغة القياسية: الباركود + الاسم + الماركة + السعر
  // سنحافظ على اسم الماركة في النص لسهولة المطابقة السابقة
  outputContent += `${item.code} ${item.name} ${item.brand} ${item.price.toFixed(2)}\n`;
});

fs.writeFileSync(companySourcePath, outputContent, 'utf8');
console.log(`\n✅ Reparsing complete!`);
console.log(`- Total items written to company_list_source.txt: ${parsedItems.length}`);
console.log(`- Brand breakdown:`);
const brandCounts = {};
parsedItems.forEach(item => {
  brandCounts[item.brand] = (brandCounts[item.brand] || 0) + 1;
});
Object.entries(brandCounts).forEach(([b, count]) => {
  console.log(`  ${b}: ${count} items`);
});
