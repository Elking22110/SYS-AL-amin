/**
 * Subcategory & Product Historical Sorter Utility
 * 
 * Sorts Subcategories and Products across all Main Categories according to historical client rules:
 * 1. Smart White: 4" -> 6" -> 2" -> 3" -> 1.5" -> 1"
 * 2. Kessel: Pipes -> Kessel Orange -> Fitting sizes
 * 3. Inside each subcategory, preserves historical product sequence from products_seed.json.
 */

export const SMART_SUBCAT_RANKS = {
  'بوصه 4': 1,
  'بوصه 6': 2,
  'بوصه 2': 3,
  'بوصه 3': 4,
  'بوصه ١,٥': 5,
  'بوصه 1.5': 5,
  '١بوصه': 6,
  '1بوصه': 6,
  'افيز اسمارت': 7
};

export const KESSEL_SUBCAT_RANKS = {
  'مواسير كيسل': 1,
  'كيسيل برتقالي': 2,
  'كاسل برتقالي': 2,
  '1785526252019': 2,
  'نظام كيسيل المدفون ١١٠': 2,
  'نظام كيسيل المدفون ١٦٠': 2,
  'نظام كيسل المدفون ٢٠٠': 2,
  'قطع ٤٠ كيسل': 3,
  'قطع ٥٠': 4,
  'قطع ٦٣ كيسل': 5,
  'قطع ٧٥': 6,
  'قطع ١١٠': 7,
  'قطع ١٦٠': 8,
  'بلاعات كيسل': 9,
  'قطع ١بوصه كيسل': 10
};

export const SMART_HISTORICAL_POS = {
  "20000": 1, "20001": 2, "20002": 3, "20003": 4, "20004": 5, "20005": 6, "20006": 7, "20007": 8, "20008": 9, "20009": 10,
  "20010": 11, "20011": 12, "20012": 13, "20013": 14, "20014": 15, "20015": 16, "20016": 17, "20017": 18, "20018": 19, "20019": 20,
  "20020": 21, "20021": 22, "20022": 23, "20023": 24, "20024": 25, "20025": 26, "20026": 27, "20027": 28, "20028": 29, "20029": 30,
  "20030": 31, "20031": 32, "20032": 33, "20033": 34, "20034": 35, "20035": 36, "20036": 37, "20037": 38, "20038": 39, "20039": 40,
  "20040": 41, "20041": 42, "20042": 43, "20043": 44, "20044": 45, "20045": 46, "20046": 47, "20047": 48, "20048": 49, "20049": 50,
  "20050": 51, "20051": 52, "20052": 53, "20053": 54, "20054": 55, "20055": 56, "20056": 57, "20057": 58, "20058": 59, "20059": 60,
  "20060": 61, "20061": 62, "20062": 63, "20063": 64, "20064": 65, "20065": 66, "20066": 67, "20067": 68, "20068": 69, "20069": 70,
  "20070": 71, "20071": 72, "20072": 73, "20073": 74, "20074": 75, "20075": 76, "20076": 77, "20077": 78, "20078": 79, "20079": 80,
  "20080": 81, "20081": 82, "20082": 83, "20083": 84, "20084": 85, "20085": 86, "20086": 87, "20087": 88, "20088": 89, "20089": 90,
  "20090": 91, "20091": 92, "20092": 93, "20093": 94, "20094": 95, "20095": 96, "20096": 97, "20097": 98, "20098": 99, "20099": 100,
  "20100": 101, "20101": 102, "20102": 103, "20103": 104, "20104": 105, "20105": 106, "20106": 107, "20107": 108, "20108": 109, "20109": 110,
  "20110": 111, "20111": 112, "20112": 113, "20113": 114, "20114": 115, "20115": 116, "20116": 117, "20117": 118, "20118": 119, "20119": 120,
  "20120": 121, "20121": 122, "20122": 123, "20123": 124, "20124": 125, "20125": 126, "20126": 127, "20127": 128, "20128": 129, "20129": 130,
  "20130": 131
};

export const KESSEL_HISTORICAL_POS = {
  "40000": 1, "40001": 2, "40002": 3, "40003": 4, "40004": 5, "40005": 6, "40006": 7, "40007": 8, "40008": 9, "40009": 10,
  "40010": 11, "40011": 12, "40012": 13, "40013": 14, "40014": 15, "40015": 16, "40016": 17, "40017": 18, "40018": 19, "40019": 20,
  "40020": 21, "40021": 22, "40022": 23, "40023": 24, "40024": 25, "40025": 26, "40026": 27, "40027": 28, "40028": 29, "40029": 30,
  "40030": 31, "40031": 32, "40032": 33, "40033": 34, "40035": 35, "40036": 36, "40037": 37, "40038": 38, "40039": 39, "40040": 40,
  "40041": 41, "40042": 42, "40043": 43, "40044": 44, "40045": 45, "40046": 46, "40047": 47, "40048": 49, "40049": 49, "40050": 50,
  "40051": 51, "40052": 52, "40053": 53, "40054": 54, "40055": 55, "40056": 56, "40057": 57, "40058": 58, "40059": 59, "40060": 60,
  "40061": 61, "40062": 62, "40063": 63, "40064": 64, "40065": 65, "40066": 66, "40067": 67, "40068": 68, "40069": 69, "40070": 70,
  "40071": 71, "40072": 72, "40073": 73, "40074": 74, "40075": 75, "40076": 76, "40077": 77, "40078": 78, "40079": 79, "40080": 80,
  "40081": 81, "40082": 82, "40083": 83, "40084": 84, "40085": 85, "40086": 86, "40087": 87, "40088": 88, "40089": 89, "40090": 90,
  "40091": 91, "40092": 92, "40093": 93, "40094": 94, "40095": 95, "40096": 96, "40097": 97, "40098": 98, "40099": 99, "40100": 100,
  "40101": 101, "40102": 102, "40103": 103, "40106": 104, "40107": 105, "40108": 106, "40109": 107, "40110": 108, "40111": 109, "40112": 110,
  "40113": 111, "40114": 112, "40115": 113, "40116": 114, "40117": 115, "40118": 116, "40119": 117, "40120": 118, "40121": 119, "40122": 120,
  "40123": 121, "40124": 122, "40125": 123, "40126": 124, "40127": 125, "40128": 126, "40129": 127, "40130": 128, "40131": 129, "40132": 130,
  "40133": 131, "40134": 132, "40135": 133, "40136": 134, "40137": 135, "40138": 136, "40139": 137, "40150": 138, "40151": 139, "40160": 140,
  "40161": 141, "40162": 142, "40163": 143, "40164": 144, "40165": 145, "40166": 146, "40167": 147, "40168": 148, "40169": 149, "40170": 150,
  "40171": 151, "40180": 152, "40181": 153, "40182": 154, "40183": 155
};

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

  // Whole inch sizes (checked in ascending order to prioritize smaller size when multiple exist)
  if (/\b1\b|1\s*بوص|1بوص|ابوص|ا\s*بوص/.test(str)) return 1.0;
  if (/\b2\b|2\s*بوص|2بوص/.test(str)) return 2.0;
  if (/\b3\b|3\s*بوص|3بوص/.test(str)) return 3.0;
  if (/\b4\b|4\s*بوص|4بوص/.test(str)) return 4.0;
  if (/\b5\b|5\s*بوص|5بوص/.test(str)) return 5.0;
  if (/\b6\b|6\s*بوص|6بوص/.test(str)) return 6.0;
  if (/\b8\b|8\s*بوص|8بوص/.test(str)) return 8.0;

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
 * 3 = Kisel (كيسيل)
 * 4 = Other
 */
export function getBrandRank(subName, mainCategoryName = '') {
  const subLower = (subName || '').toLowerCase();
  const mainLower = (mainCategoryName || '').toLowerCase();
  const isAhramGroup = mainLower.includes('الاهرام') || mainLower.includes('الأهرام') || subLower.includes('الاهرام') || subLower.includes('الأهرام');

  if (isAhramGroup) {
    if (subLower.includes('ابيض') || subLower.includes('أبيض')) {
      return 2;
    }
    if (subLower.includes('صرف') || subLower.includes('كيسل') || subLower.includes('كيسيل') || subLower.includes('kisel') || subLower.includes('kessel')) {
      return 3;
    }
    return 1; // Default inside Ahram group is Poly
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

  const mainLower = (mainCategoryName || '').toLowerCase();
  const isSmart = mainLower.includes('اسمارت') || mainLower.includes('سمارت');
  const isKessel = mainLower.includes('كيسيل') || mainLower.includes('كيسل');

  return [...subcats].sort((a, b) => {
    const nameA = typeof a === 'string' ? a : (a?.name || a?.id || '');
    const nameB = typeof b === 'string' ? b : (b?.name || b?.id || '');

    if (isSmart) {
      const rankA = SMART_SUBCAT_RANKS[nameA] || 99;
      const rankB = SMART_SUBCAT_RANKS[nameB] || 99;
      if (rankA !== rankB) return rankA - rankB;
    }

    if (isKessel) {
      const rankA = KESSEL_SUBCAT_RANKS[nameA] || 99;
      const rankB = KESSEL_SUBCAT_RANKS[nameB] || 99;
      if (rankA !== rankB) return rankA - rankB;
    }

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

/**
 * Sort Products by historical sequence from products_seed.json without modifying database records.
 */
export function sortProductsByHistoricalOrder(products = [], mainCategoryName = '') {
  if (!Array.isArray(products) || products.length === 0) return [];

  const mainLower = (mainCategoryName || '').toLowerCase();
  const isSmart = mainLower.includes('اسمارت') || mainLower.includes('سمارت');
  const isKessel = mainLower.includes('كيسيل') || mainLower.includes('كيسل');

  return [...products].sort((a, b) => {
    const subA = a.computedSubCategory || a.sub_category_id || a.subCategoryId || '';
    const subB = b.computedSubCategory || b.sub_category_id || b.subCategoryId || '';

    if (isSmart) {
      const rankA = SMART_SUBCAT_RANKS[subA] || 99;
      const rankB = SMART_SUBCAT_RANKS[subB] || 99;
      if (rankA !== rankB) return rankA - rankB;

      const posA = SMART_HISTORICAL_POS[String(a.id)] || 999999;
      const posB = SMART_HISTORICAL_POS[String(b.id)] || 999999;
      if (posA !== posB) return posA - posB;
    } else if (isKessel) {
      const rankA = KESSEL_SUBCAT_RANKS[subA] || 99;
      const rankB = KESSEL_SUBCAT_RANKS[subB] || 99;
      if (rankA !== rankB) return rankA - rankB;

      const posA = KESSEL_HISTORICAL_POS[String(a.id)] || 999999;
      const posB = KESSEL_HISTORICAL_POS[String(b.id)] || 999999;
      if (posA !== posB) return posA - posB;
    }

    return String(a.id).localeCompare(String(b.id));
  });
}

export default sortSubcategories;

