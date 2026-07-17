const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, '..', 'public', 'products_seed.json');
const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const products = seedData.products || [];

let cleanedCount = 0;
let remappedCount = 0;

products.forEach(p => {
  if (p.mainCategoryId === 'Br' || p.mainCategoryId === 'اسمارت ابيض' || p.mainCategoryId === 'كيسيل') {
    const code = p.supplierCode || p.barcode;
    if (!code) return;

    const name = p.name || '';
    
    // 1. إزالة الأكواد من المواسير المعزولة أو المغلفة لأنها غير موجودة بالملف الرسمي للشركة وتصنع محلياً
    if (name.includes('معزول') || name.includes('مغلف') || name.includes('عازل')) {
      delete p.barcode;
      delete p.sku;
      delete p.supplierCode;
      cleanedCount++;
      return;
    }

    // 2. تصحيح مواسير BR PN16 (بن 16) إلى أكوادها الصحيحة بدلاً من PN20
    if (p.mainCategoryId === 'Br' && name.includes('مواسير') || name.startsWith('م ')) {
      const isPN16 = name.includes('بن ١٦') || name.includes('بن 16') || name.includes('ضد ١٦') || name.includes('ضد 16');
      
      // تحديد القطر مم
      let mm = 0;
      if (name.includes('٢/١') || name.includes('20')) mm = 20;
      else if (name.includes('٣/٤') || name.includes('25')) mm = 25;
      else if (name.includes('١ بوصه') || name.includes('32')) mm = 32;
      else if (name.includes('١,٢٥') || name.includes('١.٢٥') || name.includes('40')) mm = 40;
      else if (name.includes('١,٥') || name.includes('١.٥') || name.includes('50')) mm = 50;
      else if (name.includes('٢ بوصه') || name.includes('63')) mm = 63;
      else if (name.includes('٧٥')) mm = 75;
      else if (name.includes('٩٠')) mm = 90;
      else if (name.includes('١١٠')) mm = 110;
      else if (name.includes('١٦٠')) mm = 160;

      if (mm > 0) {
        let correctCode = null;
        if (isPN16) {
          const pn16Map = {
            20: '331021101', 25: '331021102', 32: '331021103', 40: '331021104',
            50: '331021105', 63: '331021106', 75: '331021107', 90: '331021108',
            110: '331021109', 160: '331021111'
          };
          correctCode = pn16Map[mm];
        } else {
          const pn20Map = {
            20: '331020001', 25: '331020002', 32: '331020003', 40: '331020004',
            50: '331020005', 63: '331020006', 75: '331020007', 90: '331020008',
            110: '331020009', 160: '331020011'
          };
          correctCode = pn20Map[mm];
        }

        if (correctCode && code !== correctCode) {
          p.barcode = correctCode;
          p.sku = correctCode;
          p.supplierCode = correctCode;
          remappedCount++;
        }
      }
    }

    // 3. تصحيح مواسير كيسيل 1 بوصة (32 مم) ومواسير 50 مم
    if (p.mainCategoryId === 'كيسيل') {
      if (name.includes('١ بوصه كيسل') || name.includes('32 مم')) {
        if (code === '332020001') { // 332020001 هو 50 مم
          p.barcode = '332020009'; // 332020009 هو 32 مم
          p.sku = '332020009';
          p.supplierCode = '332020009';
          remappedCount++;
        }
      }
    }
  }
});

// إزالة الأكواد المكررة الباقية غير المنطقية لضمان فرادة الأكواد 100%
const codeMap = {};
products.forEach(p => {
  const code = p.supplierCode || p.barcode;
  if (!code) return;
  if (!codeMap[code]) {
    codeMap[code] = [];
  }
  codeMap[code].push(p);
});

let duplicatesCleaned = 0;
Object.keys(codeMap).forEach(code => {
  const list = codeMap[code];
  if (list.length > 1) {
    // نترك الصنف الأكثر ملاءمة (مثلاً الأقصر اسماً أو الأقدم ID) ونزيل الكود من الباقي
    list.sort((a, b) => (a.name || '').length - (b.name || '').length);
    // نترك أول واحد وننظف الباقي
    for (let i = 1; i < list.length; i++) {
      const p = list[i];
      delete p.barcode;
      delete p.sku;
      delete p.supplierCode;
      duplicatesCleaned++;
    }
  }
});

fs.writeFileSync(seedPath, JSON.stringify(seedData, null, 2), 'utf8');

console.log(`Cleaned ${cleanedCount} insulated/wrapped products (no official codes).`);
console.log(`Remapped ${remappedCount} misaligned products to their exact sizes/pressure codes.`);
console.log(`Resolved and cleared ${duplicatesCleaned} remaining duplicate assignments.`);
console.log('Sanitization of database product codes completed successfully.');
