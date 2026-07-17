/**
 * validate-codes.cjs
 * يتحقق من توافق الأقطار بين اسم المنتج في السيستم وكود الشركة الممنوح له
 */
const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, '..', 'public', 'products_seed.json');
const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const products = seedData.products || [];

// قراءة قائمة الشركة لتسهيل التحقق من الكود
const companyListPath = path.join(__dirname, 'company_list_source.txt');
const companyLines = fs.existsSync(companyListPath) ? fs.readFileSync(companyListPath, 'utf8').split('\n') : [];
const companyMap = {};
companyLines.forEach(line => {
  const m = line.match(/\b(\d{9})\b/);
  if (m) {
    companyMap[m[1]] = line.trim();
  }
});

let errorsCount = 0;

console.log('=== بدء التحقق من توافق الأكواد مع الأقطار ===\n');

products.forEach(p => {
  if (!p.barcode) return;

  const code = p.barcode;
  const sysName = p.name;
  const compName = companyMap[code] || '';

  // 1. التحقق من مقاس 1/2 بوصة (20 مم)
  if (sysName.includes('2/1') || sysName.includes('٢/١') || sysName.includes(' 20') || sysName.includes(' مم20') || sysName.includes(' مم 20')) {
    if (code.startsWith('331020') && !code.endsWith('001')) {
      console.log(`⚠️ تنبيه مقاس (1/2" PN20): ID: ${p.id} | ${sysName} | الكود الممنوح: ${code} (${compName})`);
      errorsCount++;
    }
    if (code.startsWith('331021') && !code.endsWith('101') && !code.endsWith('111')) { // 16 PN16
      // 331021101 is 20mm PN16
      if (!code.endsWith('101')) {
        console.log(`⚠️ تنبيه مقاس (1/2" PN16): ID: ${p.id} | ${sysName} | الكود الممنوح: ${code} (${compName})`);
        errorsCount++;
      }
    }
  }

  // 2. التحقق من مقاس 3/4 بوصة (25 مم)
  if (sysName.includes('3/4') || sysName.includes('٣/٤') || sysName.includes(' 25') || sysName.includes(' مم25')) {
    if (code.startsWith('331020') && !code.endsWith('002')) {
      console.log(`⚠️ تنبيه مقاس (3/4" PN20): ID: ${p.id} | ${sysName} | الكود الممنوح: ${code} (${compName})`);
      errorsCount++;
    }
    if (code.startsWith('331021') && !code.endsWith('102')) {
      console.log(`⚠️ تنبيه مقاس (3/4" PN16): ID: ${p.id} | ${sysName} | الكود الممنوح: ${code} (${compName})`);
      errorsCount++;
    }
  }

  // 3. التحقق من مقاس 1 بوصة (32 مم)
  if (sysName.includes('بوصه 1') || sysName.includes('بوصة 1') || sysName.includes('1 بوصه') || sysName.includes('١ بوصه') || sysName.includes(' 32') || sysName.includes(' مم32')) {
    if (sysName.includes('1.25') || sysName.includes('1.5') || sysName.includes('١,٥') || sysName.includes('١,٢٥')) return;
    if (code.startsWith('331020') && !code.endsWith('003')) {
      console.log(`⚠️ تنبيه مقاس (1" PN20): ID: ${p.id} | ${sysName} | الكود الممنوح: ${code} (${compName})`);
      errorsCount++;
    }
    if (code.startsWith('331021') && !code.endsWith('103')) {
      console.log(`⚠️ تنبيه مقاس (1" PN16): ID: ${p.id} | ${sysName} | الكود الممنوح: ${code} (${compName})`);
      errorsCount++;
    }
  }
});

console.log(`\n=== تم الانتهاء. إجمالي التنبيهات المكتشفة: ${errorsCount} ===`);
