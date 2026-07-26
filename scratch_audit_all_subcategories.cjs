const fs = require('fs');
const path = require('path');

// Read ALL_CATEGORIES from categoryMigration.js
const code = fs.readFileSync(path.join(__dirname, 'src/utils/categoryMigration.js'), 'utf8');

// Extract ALL_CATEGORIES array text using regex
const match = code.match(/const ALL_CATEGORIES = (\[[\s\S]*?\]);/);
if (!match) {
  console.error("Could not find ALL_CATEGORIES");
  process.exit(1);
}

const ALL_CATEGORIES = eval(match[1]);

function parseInchSize(name) {
  if (!name) return 999;
  
  let str = String(name)
    .replace(/٠/g, '0')
    .replace(/١/g, '1')
    .replace(/٢/g, '2')
    .replace(/٣/g, '3')
    .replace(/٤/g, '4')
    .replace(/٥/g, '5')
    .replace(/٦/g, '6')
    .replace(/٧/g, '7')
    .replace(/٨/g, '8')
    .replace(/٩/g, '9');

  // Fractions
  if (str.includes('1,25') || str.includes('1.25') || str.includes('1 1/4') || str.includes('1/4 1') || str.includes('1/4')) {
    return 1.25;
  }
  if (str.includes('1,5') || str.includes('1.5') || str.includes('1 1/2') || str.includes('1/2 1') || (str.includes('1/2') && str.includes('1') && !str.includes('2/1'))) {
    return 1.5;
  }
  if (str.includes('2,5') || str.includes('2.5') || str.includes('2 1/2') || str.includes('1/2 2')) {
    return 2.5;
  }
  if (str.includes('1/2') || str.includes('2/1') || str.includes('½')) {
    return 0.5;
  }
  if (str.includes('3/4') || str.includes('4/3') || str.includes('¾')) {
    return 0.75;
  }

  // Millimeter sizes (mm)
  if (str.includes('200')) return 8.0;
  if (str.includes('160')) return 6.0;
  if (str.includes('110')) return 4.0;
  if (str.includes('90')) return 3.0;
  if (str.includes('75')) return 2.5;
  if (str.includes('63')) return 2.0;
  if (str.includes('50')) return 1.5;
  if (str.includes('40')) return 1.25;
  if (str.includes('32')) return 1.0;
  if (str.includes('25')) return 0.75;
  if (str.includes('20')) return 0.5;

  // Single digit inch numbers (e.g. 6, 5, 4, 3, 2, 1)
  if (/\b8\b|8\s*بوص|8بوص/.test(str)) return 8.0;
  if (/\b6\b|6\s*بوص|6بوص/.test(str)) return 6.0;
  if (/\b5\b|5\s*بوص|5بوص/.test(str)) return 5.0;
  if (/\b4\b|4\s*بوص|4بوص/.test(str)) return 4.0;
  if (/\b3\b|3\s*بوص|3بوص/.test(str)) return 3.0;
  if (/\b2\b|2\s*بوص|2بوص/.test(str)) return 2.0;
  if (/\b1\b|1\s*بوص|1بوص/.test(str)) return 1.0;

  const numMatch = str.match(/(\d+(?:\.\d+)?)/);
  if (numMatch) {
    const val = parseFloat(numMatch[1]);
    if (val > 0 && val <= 20) return val;
  }

  return 999;
}

function getBrandRank(subName, mainCategoryName = '') {
  const subLower = (subName || '').toLowerCase();
  const mainLower = (mainCategoryName || '').toLowerCase();

  // Explicit Subcategory Brand match takes priority
  if ((subLower.includes('بولي') || subLower.includes('بولى') || subLower.includes('poly') || subLower.includes('صدف')) && !subLower.includes('اسمارت') && !subLower.includes('سمارت') && !subLower.includes('smart')) {
    return 1; // Poly
  }
  if (subLower.includes('اسمارت') || subLower.includes('سمارت') || subLower.includes('إسمارت') || subLower.includes('smart')) {
    return 2; // Smart
  }
  if (subLower.includes('كيسل') || subLower.includes('كيسيل') || subLower.includes('kessel') || subLower.includes('kisel')) {
    return 3; // Kisel
  }

  // Fallback to Main Category Brand match
  if ((mainLower.includes('بولي') || mainLower.includes('بولى') || mainLower.includes('br') || mainLower.includes('تكنو')) && !mainLower.includes('اسمارت') && !mainLower.includes('سمارت') && !mainLower.includes('smart')) {
    return 1; // Poly
  }
  if (mainLower.includes('اسمارت') || mainLower.includes('سمارت') || mainLower.includes('إسمارت') || mainLower.includes('smart')) {
    return 2; // Smart
  }
  if (mainLower.includes('كيسل') || mainLower.includes('كيسيل') || mainLower.includes('kessel') || mainLower.includes('kisel')) {
    return 3; // Kisel
  }

  return 4; // Other
}

function sortSubcategories(subcats, mainCatName = '') {
  return [...subcats].sort((a, b) => {
    const nameA = typeof a === 'string' ? a : (a.name || a.id || '');
    const nameB = typeof b === 'string' ? b : (b.name || b.id || '');

    const brandA = getBrandRank(nameA, mainCatName);
    const brandB = getBrandRank(nameB, mainCatName);

    if (brandA !== brandB) {
      return brandA - brandB;
    }

    const inchA = parseInchSize(nameA);
    const inchB = parseInchSize(nameB);

    if (inchA !== inchB) {
      return inchA - inchB;
    }

    return nameA.localeCompare(nameB, 'ar');
  });
}

// Group ALL_CATEGORIES by Main Category
const mainCats = ALL_CATEGORIES.filter(c => !c.parentId);
const subCatsByParent = {};
ALL_CATEGORIES.filter(c => c.parentId).forEach(c => {
  if (!subCatsByParent[c.parentId]) subCatsByParent[c.parentId] = [];
  subCatsByParent[c.parentId].push(c);
});

console.log("=== SUBCATEGORY SORTING AUDIT FOR ALL MAIN CATEGORIES ===");

mainCats.forEach(main => {
  const subs = subCatsByParent[main.id] || [];
  if (subs.length === 0) return;
  const sorted = sortSubcategories(subs, main.name);
  console.log(`\n📂 Main Category: [${main.name}] (${subs.length} subcategories)`);
  console.log("  Sorted:");
  sorted.forEach(s => {
    const brand = getBrandRank(s.name, main.name);
    const brandName = brand === 1 ? 'Poly' : brand === 2 ? 'Smart' : brand === 3 ? 'Kisel' : 'Other';
    const inch = parseInchSize(s.name);
    console.log(`    - [Brand: ${brandName}, Size: ${inch === 999 ? 'N/A' : inch + '"'}] -> ${s.name}`);
  });
});
