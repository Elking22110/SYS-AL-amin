const fs = require('fs');
const path = require('path');

const catMigrationPath = path.join(__dirname, 'src/utils/categoryMigration.js');
let code = fs.readFileSync(catMigrationPath, 'utf8');

const match = code.match(/const ALL_CATEGORIES = (\[[\s\S]*?\]);/);
if (!match) {
  console.error("Could not match ALL_CATEGORIES");
  process.exit(1);
}

const ALL_CATEGORIES = eval(match[1]);

function parseInchSize(name) {
  if (!name) return 999;

  const original = String(name).trim();
  let str = original
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

  // Explicit mixed fractions
  if (str.includes('1,25') || str.includes('1.25') || str.includes('1 1/4') || str.includes('1/4 1') || str.includes('1¼') || str.includes('١¼')) return 1.25;
  if (str.includes('1,5') || str.includes('1.5') || str.includes('1 1/2') || str.includes('1/2 1') || str.includes('1½') || str.includes('١½')) return 1.5;
  if (str.includes('2,5') || str.includes('2.5') || str.includes('2 1/2') || str.includes('1/2 2') || str.includes('2½') || str.includes('٢½')) return 2.5;

  // Simple fractions ½ or 1/2 or 2/1
  if (str.includes('½') || str.includes('1/2') || str.includes('2/1')) return 0.5;

  // Simple fractions ¾ or 3/4 or 4/3
  if (str.includes('¾') || str.includes('3/4') || str.includes('4/3')) return 0.75;

  // Millimeter sizes (mm / ملى / ملم)
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

  // Whole inch sizes
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

  // Poly (Priority 1)
  if ((subLower.includes('بولي') || subLower.includes('بولى') || subLower.includes('poly') || subLower.includes('صدف')) && !subLower.includes('اسمارت') && !subLower.includes('سمارت') && !subLower.includes('smart')) {
    return 1;
  }
  // Smart (Priority 2)
  if (subLower.includes('اسمارت') || subLower.includes('سمارت') || subLower.includes('إسمارت') || subLower.includes('smart')) {
    return 2;
  }
  // Kisel (Priority 3)
  if (subLower.includes('كيسل') || subLower.includes('كيسيل') || subLower.includes('kessel') || subLower.includes('kisel')) {
    return 3;
  }

  // Fallback to Main Category Brand
  if ((mainLower.includes('بولي') || mainLower.includes('بولى') || mainLower.includes('br') || mainLower.includes('تكنو')) && !mainLower.includes('اسمارت') && !mainLower.includes('سمارت') && !mainLower.includes('smart')) {
    return 1;
  }
  if (mainLower.includes('اسمارت') || mainLower.includes('سمارت') || mainLower.includes('إسمارت') || mainLower.includes('smart')) {
    return 2;
  }
  if (mainLower.includes('كيسل') || mainLower.includes('كيسيل') || mainLower.includes('kessel') || mainLower.includes('kisel')) {
    return 3;
  }

  return 4;
}

function sortSubcategories(subcats, mainCategoryName = '') {
  return [...subcats].sort((a, b) => {
    const nameA = typeof a === 'string' ? a : (a?.name || a?.id || '');
    const nameB = typeof b === 'string' ? b : (b?.name || b?.id || '');

    const brandA = getBrandRank(nameA, mainCategoryName);
    const brandB = getBrandRank(nameB, mainCategoryName);

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

// Group ALL_CATEGORIES by Parent
const mainCats = ALL_CATEGORIES.filter(c => !c.parentId);
const subCatsByParent = {};
ALL_CATEGORIES.filter(c => c.parentId).forEach(c => {
  if (!subCatsByParent[c.parentId]) subCatsByParent[c.parentId] = [];
  subCatsByParent[c.parentId].push(c);
});

// Reconstruct pre-sorted ALL_CATEGORIES array
const reordered = [];
mainCats.forEach(main => {
  reordered.push(main);
  const subs = subCatsByParent[main.id] || [];
  const sortedSubs = sortSubcategories(subs, main.name);
  reordered.push(...sortedSubs);
});

console.log(`Reordered ${reordered.length} categories across ${mainCats.length} main categories.`);

// Format reordered ALL_CATEGORIES as JS code
const newArrayCode = JSON.stringify(reordered, null, 2);
const updatedCode = code.replace(/const ALL_CATEGORIES = \[[\s\S]*?\];/, `const ALL_CATEGORIES = ${newArrayCode};`);

// Update migration version flag to v25 to trigger instant re-seeding
const finalCode = updatedCode.replace(/categories_hierarchical_migration_v24/g, 'categories_hierarchical_migration_v25');

fs.writeFileSync(catMigrationPath, finalCode, 'utf8');
console.log("Successfully updated categoryMigration.js with pre-sorted subcategories (v25 flag)!");
