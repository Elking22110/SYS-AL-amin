/**
 * Subcategory Sorter Utility
 * 
 * Sorts Subcategories across all Main Categories according to business rules:
 * 1. Group by Brand order: Poly (1) -> Smart (2) -> Kisel (3) -> Other (4)
 * 2. Inside each Brand, sort by actual numeric inch size from smallest to largest.
 */

/**
 * Parse actual numeric inch size from subcategory name.
 * Returns numeric value (e.g. 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 6.0, 8.0) or 999 if N/A.
 */
export function parseInchSize(name) {
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

/**
 * Get Brand Rank for a Subcategory:
 * 1 = Poly (بولي)
 * 2 = Smart (اسمارت)
 * 3 = Kisel (كيسل)
 * 4 = Other
 */
export function getBrandRank(subName, mainCategoryName = '') {
  const subLower = (subName || '').toLowerCase();
  const mainLower = (mainCategoryName || '').toLowerCase();
  const isAhramGroup = mainLower.includes('الاهرام') || mainLower.includes('الأهرام') || subLower.includes('الاهرام') || subLower.includes('الأهرام');

  if (isAhramGroup) {
    if (subLower.includes('بولي') || subLower.includes('بولى') || subLower.includes('poly')) {
      return 1;
    }
    if (subLower.includes('ابيض') || subLower.includes('أبيض')) {
      return 2;
    }
    if (subLower.includes('صرف') || subLower.includes('كيسل') || subLower.includes('كيسيل')) {
      return 3;
    }
  }

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

/**
 * Sort Array of Subcategory objects or strings according to Brand & Numeric Inch rules.
 */
export function sortSubcategories(subcats = [], mainCategoryName = '') {
  if (!Array.isArray(subcats)) return [];

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

export default sortSubcategories;
