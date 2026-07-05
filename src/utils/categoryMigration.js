// Category Hierarchy Migration Utility
// المجموعات الرئيسية والفرعية الفعلية من قاعدة بيانات نظام المدير (7273 منتج)

const CORE_MAIN_GROUPS = [
  { id: 'mg_br',      name: 'BR',           description: 'بي ار - مواسير ولوازم',         parentId: null },
  { id: 'mg_smart',   name: 'سمارت هوم',    description: 'سمارت هوم - مواسير ولوازم',    parentId: null },
  { id: 'mg_kessel',  name: 'كيسل',          description: 'كيسل - مواسير ولوازم',          parentId: null },
  { id: 'mg_ahram',   name: 'الأهرام',       description: 'الأهرام - مواسير ولوازم',       parentId: null },
  { id: 'mg_shareef', name: 'الشريف',        description: 'الشريف - مواسير ولوازم',        parentId: null },
  { id: 'mg_borj',    name: 'بروج',          description: 'بروج - مواسير ولوازم',          parentId: null },
  { id: 'mg_polo',    name: 'بولو بلاست',   description: 'بولو بلاست - مواسير ولوازم',   parentId: null },
  { id: 'mg_sanpure', name: 'سانبيور',       description: 'سانبيور - أطقم حمامات كاملة',  parentId: null },
  { id: 'mg_other',   name: 'أخرى',         description: 'لوازم صحية عامة ومتنوعة',      parentId: null },
];

// المجموعات الفرعية الفعلية لكل مجموعة رئيسية (من بيانات نظام المدير الحقيقية)
const SUBCATEGORIES_BY_GROUP = {
  'mg_br': [
    'قطع 1/2 بوصة',
    'قطع 3/4 بوصة',
    'قطع 1 بوصة',
    'قطع 1.25 بوصة',
    'قطع 1.5 بوصة',
    'قطع 2 بوصة',
    'قطع أسود',
    'قطع مشكلة BR',
  ],
  'mg_smart': [
    'قطع 1/2 بوصة',
    'قطع 3/4 بوصة',
    'قطع 1 بوصة',
    'قطع 1.5 بوصة',
    'قطع 2 بوصة',
    'قطع 2.5 بوصة',
    'قطع 3 بوصة',
    'قطع 4 بوصة',
    'قطع أسود',
    'قطع مشكلة',
    'إكسسوارات',
  ],
  'mg_kessel': [
    'مواسير كيسل',
    'قطع 40-50-75مم',
    'قطع 110مم',
    'قطع 160مم',
    'نظام مدفون 110',
    'نظام مدفون 160',
    'نظام مدفون 200',
    'بلاعات كيسل',
  ],
  'mg_ahram': [
    'مواسير الأهرام',
    'قطع صرف 1.5 بوصة',
    'قطع صرف 2 بوصة',
    'قطع صرف 3 بوصة',
    'قطع صرف 4 بوصة',
    'قطع صرف 6 بوصة',
    'قطع صرف رمادي',
    'بلاعات الأهرام',
    'إكسسوارات الأهرام',
    'قطع متنوعة',
  ],
  'mg_shareef': [
    'مواسير الشريف',
    'قطع 1/2 بوصة',
    'قطع 1 بوصة',
    'قطع 1.5 بوصة',
    'قطع 2 بوصة',
    'قطع 2.5 بوصة',
    'قطع 3 بوصة',
    'قطع 4 بوصة',
    'قطع 6 بوصة',
    'قطع رمادي 1/2 بوصة',
    'قطع رمادي 1 بوصة',
    'قطع رمادي 1.5 بوصة',
    'قطع رمادي 2 بوصة',
    'قطع رمادي 3 بوصة',
    'قطع متنوعة',
  ],
  'mg_borj': [
    'قطع 1.5 بوصة',
    'قطع 2 بوصة',
    'قطع 3 بوصة',
    'قطع 4 بوصة',
    'قطع 6 بوصة',
    'قطع مشكلة',
  ],
  'mg_polo': [
    'مواسير بولو بلاست',
    'قطع 1 بوصة',
    'قطع 1.5 بوصة',
  ],
  'mg_sanpure': [
    'أطقم حمامات كاملة',
  ],
  'mg_other': [
    'وصلات استانلس',
    'إنفيت أسود',
    'إنفيت أبيض',
    'مقاسات حديد',
    'كولية ظهر',
    'قلوب نحاس وخلاطات',
    'حنفيات',
    'خلاطات متنوعة',
    'خلاطات متوسطة',
    'أطقم خلاطات فاخرة',
    'أطقم خلاطات رويال',
    'حنفيات نص خلاط',
    'خلاطات دش دفن',
    'خلاطات شيف',
    'خلاطات هواي',
    'لواكير وقطع غيار',
    'وصلات وتوصيلات نيكل',
    'محابس بلية وبلاكور',
    'محابس بلية شيلد',
    'محابس بلاكور',
    'محابس كروية',
    'محابس متنوعة',
    'شيك بلف وبلف',
    'شيك بلف سخان',
    'شيك بلف هواي',
    'أفيز وعوازل',
    'عوازل ومستلزمات تركيب',
    'وصلات شاور وخرطوم',
    'خراطيم وأنابيك',
    'إكسسوارات خلاطات',
    'إكسسوارات حمام',
    'دش وسماعات',
    'خراطيم وشلالات',
    'إكسسوارات دش',
    'مصفى دش',
    'أغطية بيبات وسدادات',
    'أغطية بلاعات 15سم',
    'أغطية بلاعات 20سم',
    'صرف ومصافي',
    'قطع صرف 4 بوصة',
    'بريز وصرف',
    'قطع 40مم',
    'طقم ديورافيت إيكو',
    'طقم ديورافيت جولف',
    'طقم ديورافيت دي كود',
    'طقم إيديال ستاندر صوفيا',
    'بانيو ديورافيت',
    'بانيو إيديال',
    'بانيو الطيب',
    'بانيو فرانكي',
    'طوابق بانيو',
    'أحواض رجل فرانكي',
    'أحواض مطبخ مكسيم',
    'أحواض مطبخ فرانكي',
    'أحواض إنست فرانكي',
    'حلل مطبخ فرانكي',
    'أحواض مطبخ خاصة',
    'أحواض استانلس',
    'أحواض المنار',
    'أحواض سان بيور وحده',
    'أحواض برقبة سان بيور',
    'قواعد سان بيور',
    'سدري سان بيور عادي',
    'سدري سان بيور سوفت',
    'مراحيض سان بيور معلقة',
    'أطقم ليسيكو',
    'أطقم سان بيور',
    'أحواض ديكور',
    'طقم إكسسوار أبيض',
    'طقم صبانات',
    'صبانة وفوطة',
    'طقم إكسسوار متنوع',
    'فلاتر مياه',
    'عبوات فلاتر',
    'شمع فلاتر',
    'محطات تحلية',
    'شمع وفلاتر تحلية',
    'موتورات 1/2 حصان',
    'موتورات 1 حصان',
    'موتورات 1 حصان متنوعة',
    'موتورات 1.5 حصان',
    'موتورات 2 حصان',
    'موتورات 2+ حصان',
    'بلونات موتورات',
    'أوتوماتيك موتورات',
    'أوتوماتيك وفلومك',
    'قطع غيار موتورات',
    'نحاسة وفلانشة موتور',
    'أجهزة حساس ضغط',
    'لوازم موتورات',
    'طقم جلب وتوصيلات',
    'جلب كبيرة وسيفون',
    'ماكينات كومبنيشن',
    'مواسير روكسي 1/2',
    'مواسير روكسي 2 بوصة',
    'مواسير روكسي متنوعة',
    'قطع ابيض روكسي 1 بوصة',
    'قطع ابيض روكسي 1.5',
    'قطع ابيض روكسي 2',
    'قطع ابيض روكسي 3',
    'قطع ابيض روكسي 4',
    'قطع ابيض روكسي 6',
    'مدفون كيسل 110',
    'مدفون كيسل 160',
    'مدفون كيسل 200',
    'لوازم عامة',
  ],
};

export function runCategoryMigration() {
  try {
    const savedCategories = JSON.parse(localStorage.getItem('productCategories') || '[]');
    if (!Array.isArray(savedCategories) || savedCategories.length === 0) {
      // If empty, the main seed logic will run
      return;
    }

    // Check if migration v7 is already done
    const migrationFlag = localStorage.getItem('categories_hierarchical_migration_v7');
    if (migrationFlag === 'true') {
      return;
    }

    console.log('Running Category Hierarchy Migration V7 (Almodeer-aligned)...');

    // Build fresh category list from actual Almodeer structure
    const categoriesList = [];

    // Add main groups
    CORE_MAIN_GROUPS.forEach(group => {
      categoriesList.push({
        id: group.id,
        name: group.name,
        description: group.description,
        parentId: null,
      });
    });

    // Add sub-categories for each main group
    Object.entries(SUBCATEGORIES_BY_GROUP).forEach(([mainGroupId, subs]) => {
      subs.forEach(subName => {
        const subId = `${mainGroupId}_${subName.replace(/\s+/g, '_').replace(/[^\w\u0600-\u06FF]/g, '')}`;
        categoriesList.push({
          id: subId,
          name: subName,
          description: `مجموعة فرعية: ${subName}`,
          parentId: mainGroupId,
        });
      });
    });

    // Preserve any user-added categories that don't conflict
    const existingNames = new Set(categoriesList.map(c => c.name));
    savedCategories.forEach(cat => {
      if (!existingNames.has(cat.name) && cat.name && cat.name !== 'خامات توريد') {
        // Find best parent for user-created categories
        const nm = (cat.name || '').toLowerCase();
        let parentId = 'mg_other';
        if (nm.includes('br') || nm.includes('بي ار')) parentId = 'mg_br';
        else if (nm.includes('سمارت')) parentId = 'mg_smart';
        else if (nm.includes('كيسل') || nm.includes('كيسيل')) parentId = 'mg_kessel';
        else if (nm.includes('أهرام') || nm.includes('الاهرام') || nm.includes('الأهرام')) parentId = 'mg_ahram';
        else if (nm.includes('الشريف')) parentId = 'mg_shareef';
        else if (nm.includes('بروج')) parentId = 'mg_borj';
        else if (nm.includes('بولو')) parentId = 'mg_polo';
        else if (nm.includes('سانبيور')) parentId = 'mg_sanpure';

        categoriesList.push({
          id: cat.id || cat.name,
          name: cat.name,
          description: cat.description || '',
          parentId: cat.parentId || parentId,
        });
        existingNames.add(cat.name);
      }
    });

    localStorage.setItem('productCategories', JSON.stringify(categoriesList));
    localStorage.setItem('categories_hierarchical_migration_v7', 'true');
    // Clear old migration flags
    localStorage.removeItem('categories_hierarchical_migration_v6');
    localStorage.removeItem('categories_hierarchical_migration_v5');
    console.log(`Category Hierarchy Migration V7 completed: ${categoriesList.length} categories`);
  } catch (error) {
    console.error('Error during category migration v7:', error);
  }
}
