/**
 * audit-all-mappings.cjs
 * سكريبت تدقيق شامل لاكتشاف أي تعارض أو أخطاء في تعيين الأكواد
 */

const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, '..', 'public', 'products_seed.json');
const sourcePath = path.join(__dirname, 'company_list_source.txt');

if (!fs.existsSync(seedPath) || !fs.existsSync(sourcePath)) {
  console.error('❌ الملفات المطلوبة غير موجودة');
  process.exit(1);
}

const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const products = seedData.products || [];

// قراءة قائمة أسعار الشركة وبناء قاموس مرجعي
const companyItems = {};
const sourceLines = fs.readFileSync(sourcePath, 'utf8').split('\n');
sourceLines.forEach(line => {
  const parts = line.trim().split(/\s+/);
  if (parts.length >= 3) {
    const code = parts[0];
    const price = parseFloat(parts[parts.length - 1]);
    const desc = parts.slice(1, parts.length - 2).join(' ');
    if (/^\d+$/.test(code)) {
      companyItems[code] = { desc, price };
    }
  }
});

// تعاريف الكلمات المفتاحية للمطابقة والتدقيق
function checkConflict(sysName, compDesc) {
  const sys = sysName.toLowerCase();
  const comp = compDesc.toLowerCase();
  const errors = [];

  // 1. تدقيق الزوايا (مفتوح / 45 vs عادة / 90)
  const sysOpen = sys.includes('مفتوح') || sys.includes('45') || sys.includes('٤٥');
  const compOpen = comp.includes('45') || comp.includes('مفتوح') || comp.includes('كوع 45');
  const sys90 = sys.includes('عاده') || sys.includes('عادة') || sys.includes('90') || sys.includes('٩٠');
  const comp90 = comp.includes('90') || comp.includes('87.5') || comp.includes('عادة') || comp.includes('عاده');

  if (sysOpen && comp90) {
    errors.push('تعارض زاوية: الاسم بالسيستم [مفتوح/45] والكود الممنوح [عادة/90]');
  }
  if (sys90 && compOpen) {
    errors.push('تعارض زاوية: الاسم بالسيستم [عادة/90] والكود الممنوح [مفتوح/45]');
  }

  // 2. تدقيق نوع المواسير (معزول vs عادي)
  const sysInsulated = sys.includes('معزول') || sys.includes('فايبر') || sys.includes('مغلف');
  const compInsulated = comp.includes('فايبر') || comp.includes('معزول') || comp.includes('uv');
  // استثناء قطع التوصيل لأنها خضراء عادية ولا تصنع معزولة
  const isFitting = sys.includes('كوع') || sys.includes('تى') || sys.includes('جلبه') || sys.includes('جلبة') || sys.includes('مشترك') || sys.includes('طبه') || sys.includes('طبة');
  
  if (!isFitting) {
    if (sysInsulated && !compInsulated && !comp.includes('الومنيوم') && !comp.includes('ألومنيوم')) {
      errors.push('تعارض نوع: الاسم بالسيستم [معزول/فايبر] والكود الممنوح مواسير عادية');
    }
    if (!sysInsulated && compInsulated) {
      errors.push('تعارض نوع: الاسم بالسيستم مواسير عادية والكود الممنوح [معزول/فايبر]');
    }
  }

  // 3. تدقيق البن (PN16 vs PN20)
  const sysPN16 = sys.includes('١٦') || sys.includes('16') || sys.includes('pn16');
  const compPN16 = comp.includes('pn16') || comp.includes('7.4');
  const sysPN20 = sys.includes('٢٠') || sys.includes('20') || sys.includes('pn20');
  const compPN20 = comp.includes('pn20') || comp.includes('sdr6') || comp.includes('sdr 6');

  if (sysPN16 && compPN20) {
    errors.push('تعارض ضغط: الاسم بالسيستم [بن 16] والكود الممنوح [بن 20]');
  }
  if (sysPN20 && compPN16) {
    errors.push('تعارض ضغط: الاسم بالسيستم [بن 20] والكود الممنوح [بن 16]');
  }

  // 4. تدقيق المقاسات والأقطار
  const sizeMap = [
    { keys: ['20', '٢٠', '2/1', '٢/١', 'نص'], val: 20 },
    { keys: ['25', '٢٥', '4/3', '٤/٣', 'تلت'], val: 25 },
    { keys: ['32', '٣٢', '1 بوصه', '١ بوصه', 'بوصه', 'بوصة'], val: 32 },
    { keys: ['40', '٤٠', '1.25', '١,٢٥', 'ربع'], val: 40 },
    { keys: ['50', '٥٠', '1.5', '١,٥', 'نص', 'متر بولي ١,٥'], val: 50 },
    { keys: ['63', '٦٣', '2 بوصه', '٢ بوصه', '2بوصه'], val: 63 },
    { keys: ['75', '٧٥', '3 بوصه', '٣ بوصه'], val: 75 },
    { keys: ['90', '٩٠', '3 بوصه', '٣ بوصه'], val: 90 },
    { keys: ['110', '١١٠', '4 بوصه', '٤ بوصه'], val: 110 },
    { keys: ['160', '١٦٠', '6 بوصه', '٦ بوصه'], val: 160 }
  ];

  // استبعاد الكلمات التي قد تخلط المقاسات
  let sysSize = null;
  let compSize = null;

  // فحص مقاس السيستم
  for (const s of sizeMap) {
    for (const key of s.keys) {
      if (sys.includes(key)) {
        sysSize = s.val;
        break;
      }
    }
    if (sysSize) break;
  }

  // فحص مقاس كود الشركة
  for (const s of sizeMap) {
    for (const key of s.keys) {
      if (comp.includes(key) || comp.includes(s.val + 'مم') || comp.includes(s.val + ' مم') || comp.includes('مم' + s.val)) {
        compSize = s.val;
        break;
      }
    }
    if (compSize) break;
  }

  // إذا تم العثور على المقاسين ولكنهما مختلفين
  if (sysSize && compSize && sysSize !== compSize) {
    // استثناءات المسميات المركبة مثل مشترك مسلوب 3 * 1.5
    const isRed = sys.includes('مسلوب') || sys.includes('نقاص') || sys.includes('مسلوبه');
    if (!isRed) {
      errors.push(`تعارض مقاس: السيستم [${sysSize} مم] والكود الممنوح [${compSize} مم]`);
    }
  }

  return errors;
}

const auditResults = [];

products.forEach(p => {
  if (p.barcode) {
    const comp = companyItems[p.barcode];
    if (comp) {
      const errors = checkConflict(p.name, comp.desc);
      
      // تدقيق فرق السعر الفاحش (أكثر من 40% فرق)
      if (p.price > 0 && comp.price > 0) {
        const diffPercent = Math.abs(p.price - comp.price) / p.price;
        if (diffPercent > 0.40) {
          // استثناء لبعض الفئات المبررة
          errors.push(`فرق سعر فاحش: السيستم [${p.price}] والشركة [${comp.price}] (${(diffPercent * 100).toFixed(1)}%)`);
        }
      }

      if (errors.length > 0) {
        auditResults.push({
          id: p.id,
          name: p.name,
          price: p.price,
          barcode: p.barcode,
          compDesc: comp.desc,
          compPrice: comp.price,
          errors
        });
      }
    }
  }
});

console.log('=== نتائج تقرير التدقيق الشامل ===');
console.log(`إجمالي التعارضات المكتشفة: ${auditResults.length}\n`);

auditResults.forEach((r, i) => {
  console.log(`${i+1}. صنف [ID: ${r.id}] ${r.name}`);
  console.log(`   - باركود: ${r.barcode} | سعر السيستم: ${r.price}`);
  console.log(`   - كود الشركة يمثل: ${r.compDesc} | سعر الشركة: ${r.compPrice}`);
  console.log(`   - الأخطاء المكتشفة:`);
  r.errors.forEach(e => console.log(`     ⚠️ ${e}`));
  console.log('-'.repeat(80));
});

// حفظ التقرير في ملف للمراجعة
fs.writeFileSync('audit_mismatches_report.txt', JSON.stringify(auditResults, null, 2), 'utf8');
console.log('✅ تم حفظ التقرير في audit_mismatches_report.txt');
