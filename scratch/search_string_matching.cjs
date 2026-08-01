const fs = require('fs');

const patterns = [
  'KEISEL_TO_MERGE_NAMES',
  'KEISEL_DRAIN_NAMES',
  'includes',
  'category.name',
  'subCategoryId',
  'mainCategoryId'
];

function scanRepo(dir) {
  const results = [];
  const files = fs.readdirSync(dir, { recursive: true });

  files.forEach(f => {
    const fullPath = dir + '/' + f;
    if (fs.statSync(fullPath).isFile() && (f.endsWith('.js') || f.endsWith('.jsx'))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, idx) => {
        // Find category string matching logic specifically
        if (
          (line.includes('===') || line.includes('includes(') || line.includes('find(') || line.includes('filter(')) &&
          (line.includes('كيسيل') || line.includes('كيسل') || line.includes('بولي') || line.includes('الأهرام') || line.includes('الاهرام') || line.includes('ابيض') || line.includes('أبيض') || line.includes('صرف') || line.includes('نام') || line.includes('اسم') || line.includes('.name'))
        ) {
          results.push({
            file: f,
            lineNum: idx + 1,
            lineText: line.trim()
          });
        }
      });
    }
  });

  return results;
}

const matches = scanRepo('./src');
console.log(`Found ${matches.length} string-matching occurrences in business/category logic.`);
console.log('Top 40 relevant category string matching occurrences:\n');

matches.slice(0, 50).forEach((m, idx) => {
  console.log(`${idx + 1}. [${m.file}:${m.lineNum}] ${m.lineText}`);
});
