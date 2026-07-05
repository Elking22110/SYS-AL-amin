import React, { useState, useEffect, useCallback } from 'react';
import { Search, Package, Shirt, Footprints, Watch, Headphones, Smartphone, Laptop, Home, Car, Gamepad2, Book, Camera, Gift } from 'lucide-react';
import storageOptimizer from '../../utils/storageOptimizer.js';
import errorHandler from '../../utils/errorHandler.js';
import searchOptimizer from '../../utils/searchOptimizer.js';

// دالة لتصحيح الكسور العكسية وفصل المقاسات لعرضها في الأسفل تماماً لمنع تشوه التفاف النصوص
const renderProductTitleAndSize = (name) => {
  if (!name) return null;

  // 1. تصحيح الكسور العكسية في الأنظمة القديمة
  let cleanName = name;
  cleanName = cleanName.replace(/\b2\/1\b/g, '1/2');
  cleanName = cleanName.replace(/\b4\/3\b/g, '3/4');
  cleanName = cleanName.replace(/\b8\/1\b/g, '1/8');
  cleanName = cleanName.replace(/\b8\/3\b/g, '3/8');
  cleanName = cleanName.replace(/\b8\/5\b/g, '5/8');
  cleanName = cleanName.replace(/\b4\/1\b/g, '1/4');

  // 2. استخراج الأرقام والكسور التي تمثل المقاسات
  const regex = /([0-9\/\.\-*+xX×"”']+)/g;
  const matches = cleanName.match(regex) || [];
  const sizes = matches.filter(m => /[0-9]/.test(m));

  // 3. حذف المقاسات من العنوان الأساسي ليبقى اسم القطعة نظيفاً ومنسقاً
  let title = cleanName;
  sizes.forEach(size => {
    title = title.replace(size, '');
  });
  // تنظيف أي مسافات زائدة أو شرطات معلقة في النهاية
  title = title.replace(/\s+/g, ' ').replace(/-\s*$/, '').trim();

  return (
    <div className="flex flex-col text-right" style={{ direction: 'rtl' }}>
      {/* اسم القطعة بالكامل */}
      <span className="font-bold text-slate-800 text-sm md:text-base leading-snug group-hover:text-blue-600 transition-colors product-title-text">
        {title}
      </span>
      {/* المقاسات في الأسفل على سطر منفصل تماماً */}
      {sizes.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5 justify-start shrink-0">
          {sizes.map((size, idx) => (
            <span
              key={idx}
              className="inline-block font-mono font-black text-sm md:text-base text-blue-700 bg-blue-50/85 px-3 py-1 rounded-lg border-2 border-blue-300 shadow-sm hover:scale-105 transition-transform"
              style={{ direction: 'ltr', unicodeBidi: 'embed' }}
            >
              {size}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

const ProductGrid = ({
  selectedCategory,
  onCategoryChange,
  onAddToCart,
  categories,
  setCategories,
  products,
  setProducts,
  productImages,
  setProductImages
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMainGroup, setSelectedMainGroup] = useState('الكل');
  const [visibleCount, setVisibleCount] = useState(36);

  // المجموعات الرئيسية ديناميكياً من التصنيفات
  const MAIN_GROUPS = React.useMemo(() => {
    const list = [{ key: 'الكل', label: 'كل الأصناف' }];
    const mainCats = categories.filter(c => !c.parentId);
    mainCats.forEach(cat => {
      list.push({ key: cat.id || cat.name, label: cat.name });
    });
    return list;
  }, [categories]);

  // دالة للحصول على الأيقونة المناسبة لكل فئة
  const getCategoryIcon = (categoryName) => {
    const categoryIcons = {
      'ملابس': <Shirt className="h-8 w-8 text-blue-400" />,
      'أحذية': <Footprints className="h-8 w-8 text-brown-400" />,
      'ساعات': <Watch className="h-8 w-8 text-yellow-400" />,
      'إلكترونيات': <Smartphone className="h-8 w-8 text-purple-400" />,
      'أجهزة كمبيوتر': <Laptop className="h-8 w-8 text-slate-500" />,
      'منزل': <Home className="h-8 w-8 text-green-400" />,
      'سيارات': <Car className="h-8 w-8 text-red-400" />,
      'ألعاب': <Gamepad2 className="h-8 w-8 text-pink-400" />,
      'كتب': <Book className="h-8 w-8 text-orange-400" />,
      'كاميرات': <Camera className="h-8 w-8 text-indigo-400" />,
      'هدايا': <Gift className="h-8 w-8 text-rose-400" />,
      'سماعات': <Headphones className="h-8 w-8 text-cyan-400" />
    };

    return categoryIcons[categoryName] || <Package className="h-8 w-8 text-slate-500" />;
  };

  // دالة تصنيف المنتجات للمجموعات الفعلية من قاعدة بيانات نظام المدير
  const getProductGroupAndSub = useCallback((product) => {
    // 1. استخدام الحقول الهيكلية الجديدة مباشرةً (كل منتجات الـ seed لها هذه الحقول)
    if (product.mainCategoryId) {
      return {
        mainGroup: product.mainCategoryId,
        subCategory: product.subCategoryId || 'عام'
      };
    }

    // 2. مطابقة الفئة القديمة مع المجموعات في قاعدة البيانات
    if (product.category) {
      const matchedCat = categories.find(c => c.name === product.category);
      if (matchedCat) {
        if (matchedCat.parentId) {
          return { mainGroup: matchedCat.parentId, subCategory: matchedCat.id || matchedCat.name };
        } else {
          return { mainGroup: matchedCat.id || matchedCat.name, subCategory: 'عام' };
        }
      }
    }

    // 3. Fallback للمنتجات القديمة التي لا تحمل mainCategoryId
    const fullName = `${product.name || ''} ${product.category || ''}`.toLowerCase();
    let mainGroup = 'mg_other';
    if (fullName.includes('بي ار') || fullName.includes('br')) mainGroup = 'mg_br';
    else if (fullName.includes('سمارت')) mainGroup = 'mg_smart';
    else if (fullName.includes('كيسل') || fullName.includes('كيسيل')) mainGroup = 'mg_kessel';
    else if (fullName.includes('الأهرام') || fullName.includes('الاهرام')) mainGroup = 'mg_ahram';
    else if (fullName.includes('الشريف')) mainGroup = 'mg_shareef';
    else if (fullName.includes('بروج')) mainGroup = 'mg_borj';
    else if (fullName.includes('بولو')) mainGroup = 'mg_polo';
    else if (fullName.includes('سانبيور')) mainGroup = 'mg_sanpure';

    return { mainGroup, subCategory: product.category || 'عام' };
  }, [categories]);

  // تحميل البيانات المحسنة
  const loadData = useCallback(async () => {
    try {
      const [categoriesData, productsData] = await Promise.all([
        storageOptimizer.get('productCategories', []),
        storageOptimizer.get('products', [])
      ]);

      setCategories(categoriesData);
      setProducts(productsData);
      setProductImages({});
    } catch (error) {
      errorHandler.handleError(error, 'Data Loading', 'high');
    }
  }, [setCategories, setProducts, setProductImages]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // تصنيف المنتجات للمجموعات والاقسام
  const processedProducts = React.useMemo(() => {
    return products.map(product => {
      const { mainGroup, subCategory } = getProductGroupAndSub(product);
      return {
        ...product,
        computedMainGroup: mainGroup,
        computedSubCategory: subCategory
      };
    });
  }, [products, getProductGroupAndSub]);

  // تصفية الفئات الفرعية المتاحة بناء على المجموعة الرئيسية المحددة من قاعدة البيانات
  const filteredCategories = React.useMemo(() => {
    if (selectedMainGroup === 'الكل') {
      // عرض جميع المجموعات الفرعية (التي لها أب)
      return categories.filter(c => c.parentId).map(c => ({ id: c.id, name: c.name }));
    }

    const selectedGroup = categories.find(c => (String(c.id) === String(selectedMainGroup) || c.name === selectedMainGroup) && !c.parentId);
    if (selectedGroup) {
      const filtered = categories
        .filter(c => String(c.parentId) === String(selectedGroup.id) || String(c.parentId) === String(selectedGroup.name))
        .map(c => ({ id: c.id, name: c.name }));

      // ترتيب مخصص لمجموعات BR بناءً على صورة العميل
      if (selectedGroup.name === 'BR') {
        const BR_SUBCATEGORIES_ORDER = [
          'قطع مشكله BR اسمارت و',
          'قطع ٢/١',
          'قطع ٤/٣ بوصة',
          'قطع ١ بوصة',
          'قطع ١,٢٥ بوصة',
          'قطع ١,٥ بوصة',
          'قطع ٢ بوصة',
          'قطع اسواد ٣/٤',
          'قطع ١ بوصه اسود',
          'قطع ١,٥ اسود',
          'افيز اسمارت'
        ];
        const orderMap = {};
        BR_SUBCATEGORIES_ORDER.forEach((name, idx) => {
          orderMap[name] = idx;
        });

        filtered.sort((a, b) => {
          const orderA = orderMap[a.name] !== undefined ? orderMap[a.name] : 999;
          const orderB = orderMap[b.name] !== undefined ? orderMap[b.name] : 999;
          return orderA - orderB;
        });
      }

      // ترتيب مخصص لمجموعات سمارت ابيض
      if (selectedGroup.name === 'سمارت ابيض') {
        const SMART_WHITE_SUBCATEGORIES_ORDER = [
          'بوصه 1',
          'بوصه 1.5',
          'بوصه 2',
          'بوصه 3',
          'بوصه 4',
          'بوصه 6'
        ];
        const orderMap = {};
        SMART_WHITE_SUBCATEGORIES_ORDER.forEach((name, idx) => {
          orderMap[name] = idx;
        });

        filtered.sort((a, b) => {
          const orderA = orderMap[a.name] !== undefined ? orderMap[a.name] : 999;
          const orderB = orderMap[b.name] !== undefined ? orderMap[b.name] : 999;
          return orderA - orderB;
        });
      }

      // ترتيب مخصص لمجموعات لوازم حديد انفيت
      if (selectedGroup.name === 'لوازم حديد انفيت') {
        const IRON_INFIT_ORDER = [
          'إسود',
          'أبيض',
          'مقاسات حديد',
          'كولية ظهر'
        ];
        const orderMap = {};
        IRON_INFIT_ORDER.forEach((name, idx) => {
          orderMap[name] = idx;
        });

        filtered.sort((a, b) => {
          const orderA = orderMap[a.name] !== undefined ? orderMap[a.name] : 999;
          const orderB = orderMap[b.name] !== undefined ? orderMap[b.name] : 999;
          return orderA - orderB;
        });
      }

      // ترتيب مخصص لمجموعات كيسيل
      if (selectedGroup.name === 'كيسيل') {
        const KESSEL_ORDER = [
          'مواسير كيسل',
          'نظام كيسيل المدفون ١١٠',
          'نظام كيسيل المدفون ١٦٠',
          'نظام كيسل المدفون ٢٠٠',
          'قطع ٦٣ كيسل',
          'قطع ٤٠ كيسل',
          'قطع ٥٠',
          'قطع ٧٥',
          'قطع ١١٠',
          'قطع ١٦٠',
          'بلاعات كيسل',
          'قطع ١بوضه كيسل'
        ];
        const orderMap = {};
        KESSEL_ORDER.forEach((name, idx) => { orderMap[name] = idx; });
        filtered.sort((a, b) => {
          const orderA = orderMap[a.name] !== undefined ? orderMap[a.name] : 999;
          const orderB = orderMap[b.name] !== undefined ? orderMap[b.name] : 999;
          return orderA - orderB;
        });
      }

      // ترتيب مخصص لمجموعات تكنو بولى
      if (selectedGroup.name === 'تكنو بولى') {
        const TECHNO_POLY_ORDER = [
          'مواسير تكنو',
          'قطع ٢٠ مم',
          'قطع ٢٥ مم',
          'قطع ٣٢ مم',
          'قطع ٤٠ مم',
          'قطع ٥٠ مم',
          'قطع مشكلة تكنو'
        ];
        const orderMap = {};
        TECHNO_POLY_ORDER.forEach((name, idx) => { orderMap[name] = idx; });
        filtered.sort((a, b) => {
          const orderA = orderMap[a.name] !== undefined ? orderMap[a.name] : 999;
          const orderB = orderMap[b.name] !== undefined ? orderMap[b.name] : 999;
          return orderA - orderB;
        });
      }

      // ترتيب مخصص لمجموعات أفيز+طقم تثبيت+غراء
      if (selectedGroup.name === 'أفيز+طقم تثبيت+غراء') {
        const FIXING_ORDER = ['أفيز وتثبيت', 'غراء ومواد لصق', 'سيليكون وسيليكون عظم'];
        const orderMap = {};
        FIXING_ORDER.forEach((name, idx) => { orderMap[name] = idx; });
        filtered.sort((a, b) => (orderMap[a.name] ?? 999) - (orderMap[b.name] ?? 999));
      }

      // ترتيب مخصص لمجموعات خلاطات
      if (selectedGroup.name === 'خلاطات') {
        const MIXER_ORDER = ['خلاطات مطبخ', 'خلاطات حمام ودش', 'إكسسوارات وقطع غيار خلاطات'];
        const orderMap = {};
        MIXER_ORDER.forEach((name, idx) => { orderMap[name] = idx; });
        filtered.sort((a, b) => (orderMap[a.name] ?? 999) - (orderMap[b.name] ?? 999));
      }

      // ترتيب مخصص لمجموعات مجموعه ديورافيت وايديال
      if (selectedGroup.name === 'مجموعه ديورافيت وايديال') {
        const DURAVIT_ORDER = ['أطقم حمام كاملة', 'أحواض ديورافيت وايديال', 'قواعد حمام وإكسسوارات صيني'];
        const orderMap = {};
        DURAVIT_ORDER.forEach((name, idx) => { orderMap[name] = idx; });
        filtered.sort((a, b) => (orderMap[a.name] ?? 999) - (orderMap[b.name] ?? 999));
      }

      // ترتيب مخصص لمجموعات الاهرام بولى + صرف
      if (selectedGroup.name === 'الاهرام بولى + صرف') {
        const AHRAM_ORDER = ['مواسير صرف الاهرام', 'قطع صرف ابيض', 'قطع صرف رمادي', 'لوازم صرف متنوعة'];
        const orderMap = {};
        AHRAM_ORDER.forEach((name, idx) => { orderMap[name] = idx; });
        filtered.sort((a, b) => (orderMap[a.name] ?? 999) - (orderMap[b.name] ?? 999));
      }

      // ترتيب مخصص لمجموعات سانبيور
      if (selectedGroup.name === 'سانبيور') {
        const SANPURE_ORDER = ['وصلات خراطيم سانبيور', 'مجموعات دش وسماعات', 'إكسسوارات سانبيور متنوعة'];
        const orderMap = {};
        SANPURE_ORDER.forEach((name, idx) => { orderMap[name] = idx; });
        filtered.sort((a, b) => (orderMap[a.name] ?? 999) - (orderMap[b.name] ?? 999));
      }

      return filtered;
    }

    // Fallback في حال كانت المجموعة الرئيسية مجموعة الكلمات المفتاحية القديمة (مثل "أخرى")
    let relevantProducts = processedProducts;
    if (selectedMainGroup !== 'الكل') {
      relevantProducts = processedProducts.filter(p => p.computedMainGroup === selectedMainGroup);
    }
    const uniqueSubs = Array.from(new Set(relevantProducts.map(p => p.computedSubCategory)));
    return uniqueSubs.map(sub => ({ name: sub }));
  }, [categories, processedProducts, selectedMainGroup]);

  // تصفية المنتجات المحسنة مع البحث الذكي والمجموعات
  const filteredProducts = React.useMemo(() => {
    if (searchOptimizer.getSearchStats().indexSize === 0) {
      searchOptimizer.createIndex(processedProducts, ['name', 'sku', 'barcode', 'description']);
    }

    let searchResults = processedProducts;
    if (searchTerm.trim().length > 1) {
      searchResults = searchOptimizer.performSearch(searchTerm, processedProducts, ['name', 'sku', 'barcode', 'description']);
    }

    return searchResults.filter(product => {
      if (selectedMainGroup !== 'الكل') {
        if (product.computedMainGroup !== selectedMainGroup) return false;
      }
      return selectedCategory === 'الكل' || product.computedSubCategory === selectedCategory;
    });
  }, [processedProducts, selectedMainGroup, selectedCategory, searchTerm]);

  // إعادة ضبط مؤشر عدد المنتجات المعروضة عند تغيير الفلاتر لتجنب البطء
  useEffect(() => {
    setVisibleCount(36);
  }, [selectedCategory, selectedMainGroup, searchTerm]);

  const displayedProducts = React.useMemo(() => {
    return filteredProducts.slice(0, visibleCount);
  }, [filteredProducts, visibleCount]);


  return (
    <div className="flex-1 bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-slate-200">
      {/* شريط البحث والفلاتر */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* البحث في المنتجات */}
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
            <input
              type="text"
              placeholder="البحث بالاسم، الكود، أو الباركود..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
            />
          </div>
        </div>

        {/* فئات المنتجات الرئيسية (سريعة التنقل) */}
        <div className="border-b border-slate-200 pb-4">
          <span className="block text-xs font-extrabold text-slate-500 mb-2">مجموعات رئيسية (الماركات):</span>
          <div className="flex flex-row overflow-x-auto gap-2 pb-2 scrollbar-none" style={{ direction: 'rtl' }}>
            {MAIN_GROUPS.map((group) => (
              <button
                key={group.key}
                onClick={() => {
                  setSelectedMainGroup(group.key);
                  onCategoryChange('الكل'); // تصفير القسم الفرعي عند الانتقال لماركة جديدة
                }}
                className={`px-5 py-3 rounded-lg font-extrabold transition-all duration-200 text-xs md:text-sm whitespace-nowrap cursor-pointer shadow-xs border ${
                  selectedMainGroup === group.key
                    ? 'bg-amber-400 text-slate-900 border-amber-500 font-black shadow-md'
                    : 'bg-slate-200 text-slate-800 hover:bg-slate-300 border-slate-300'
                }`}
              >
                {group.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* التخطيط ثنائي العمود: المجموعات الفرعية على اليمين وشبكة المنتجات على اليسار */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* المجموعات الفرعية على اليمين */}
        <div className="w-full lg:w-56 shrink-0 flex flex-col gap-1.5 bg-slate-100 p-3 rounded-xl border border-slate-300 max-h-[600px] overflow-y-auto no-scrollbar">
          <span className="block text-center text-xs font-black text-slate-600 border-b border-slate-300 pb-2 mb-2">
            مجموعات فرعية
          </span>
          <button
            onClick={() => onCategoryChange('الكل')}
            className={`w-full py-3 px-3 rounded-lg text-right font-extrabold transition-all text-xs border ${
              selectedCategory === 'الكل'
                ? 'bg-blue-600 text-white border-blue-600 shadow-md font-black'
                : 'bg-white text-slate-800 hover:bg-slate-50 border-slate-200'
            }`}
          >
            📂 عرض الكل
          </button>
          {filteredCategories.map((category, index) => (
            <button
              key={category.id || category.name || index}
              onClick={() => onCategoryChange(category.name)}
              className={`w-full py-3 px-3 rounded-lg text-right font-extrabold transition-all text-xs border ${
                selectedCategory === category.name
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md font-black'
                  : 'bg-white text-slate-800 hover:bg-slate-50 border-slate-200'
              }`}
            >
              🏷️ {category.name}
            </button>
          ))}
        </div>

        {/* شبكة المنتجات على اليسار */}
        <div className="flex-1 w-full">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {displayedProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => onAddToCart(product)}
                className="pos-product-card bg-white cursor-pointer hover:bg-blue-50/50 transition-all duration-300 hover:scale-105 hover:shadow-md border border-slate-200 hover:border-blue-400 flex flex-col justify-between group"
              >
                {/* كود المنتج الصغير */}
                <div className="flex justify-start items-center mb-2 text-xs border-b border-slate-100 pb-2">
                  <span className="text-slate-400 font-mono text-[10px]">
                    كود: {product.sku || product.barcode}
                  </span>
                </div>

                <div className="text-right flex-1 flex flex-col justify-between">
                  <div className="mb-3">
                    {renderProductTitleAndSize(product.name)}
                  </div>
                  
                  <div className="price-row font-bold text-right" style={{ direction: 'rtl' }}>
                    <span className="text-slate-500 text-xs font-semibold">السعر</span>
                    {(product.price > 0)
                      ? <span className="text-emerald-700 font-black text-sm md:text-base">{Number(product.price).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ج.م</span>
                      : <span className="text-orange-500 font-bold text-xs">يرجى تحديد السعر</span>
                    }
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* زر تحميل المزيد */}
          {filteredProducts.length > visibleCount && (
            <div className="flex justify-center py-6">
              <button
                onClick={() => setVisibleCount(prev => prev + 36)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition-all duration-200 cursor-pointer"
              >
                عرض المزيد (+36 منتج)
              </button>
            </div>
          )}

          {/* رسالة عدم وجود منتجات */}
          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-500 mb-2">
                لا توجد منتجات مطابقة
              </h3>
              <p className="text-slate-400">
                {searchTerm ? 'لم يتم العثور على منتجات تطابق البحث' : 'لا توجد منتجات في هذا القسم'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductGrid;
