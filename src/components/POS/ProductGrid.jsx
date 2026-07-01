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
      <span className="font-bold text-slate-800 text-sm md:text-base leading-snug group-hover:text-blue-600 transition-colors">
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

  // المجموعات الرئيسية للأدوات الصحية لتبسيط العرض
  const MAIN_GROUPS = [
    { key: 'الكل', label: 'كل الماركات' },
    { key: 'بي ار', label: 'بي ار BR' },
    { key: 'سمارت', label: 'سمارت هوم' },
    { key: 'الاهرام', label: 'الأهرام' },
    { key: 'سانبيور', label: 'سانبيور' },
    { key: 'أخرى', label: 'ماركات أخرى' }
  ];

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

  // تحميل البيانات المحسنة
  const loadData = useCallback(async () => {
    try {
      // استخدام StorageOptimizer للقراءة المحسنة
      const [categoriesData, productsData] = await Promise.all([
        storageOptimizer.get('productCategories', []),
        storageOptimizer.get('products', [])
      ]);

      setCategories(categoriesData);
      setProducts(productsData);
      setProductImages({}); // إزالة تحميل الصور
    } catch (error) {
      errorHandler.handleError(error, 'Data Loading', 'high');
    }
  }, [setCategories, setProducts, setProductImages]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // تصفية الفئات الفرعية المتاحة بناء على المجموعة الرئيسية المحددة
  const filteredCategories = React.useMemo(() => {
    if (selectedMainGroup === 'الكل') return categories;
    if (selectedMainGroup === 'أخرى') {
      const knownKeys = ['بولو بلاست', 'بي ار', 'BR', 'الشريف', 'سمارت', 'الاهرام', 'سانبيور'];
      return categories.filter(cat => !knownKeys.some(key => cat.name.includes(key)));
    }
    return categories.filter(cat => cat.name.includes(selectedMainGroup));
  }, [categories, selectedMainGroup]);

  // تصفية المنتجات المحسنة مع البحث الذكي والمجموعات
  const filteredProducts = React.useMemo(() => {
    // إنشاء فهرس للبحث إذا لم يكن موجوداً
    if (searchOptimizer.getSearchStats().indexSize === 0) {
      searchOptimizer.createIndex(products, ['name', 'sku', 'barcode', 'description']);
    }

    // البحث المحسن
    let searchResults = products;
    if (searchTerm.trim().length > 1) {
      searchResults = searchOptimizer.performSearch(searchTerm, products, ['name', 'sku', 'barcode', 'description']);
    }

    // فلترة حسب المجموعة الرئيسية والقسم الفرعي
    return searchResults.filter(product => {
      // 1. فلترة المجموعة الرئيسية
      if (selectedMainGroup !== 'الكل') {
        if (selectedMainGroup === 'أخرى') {
          const knownKeys = ['بولو بلاست', 'بي ار', 'BR', 'الشريف', 'سمارت', 'الاهرام', 'سانبيور'];
          const matchesKnown = knownKeys.some(key => product.category.includes(key) || product.name.includes(key));
          if (matchesKnown) return false;
        } else {
          const matchesGroup = product.category.includes(selectedMainGroup) || product.name.includes(selectedMainGroup);
          if (!matchesGroup) return false;
        }
      }

      // 2. فلترة القسم الفرعي المحدد
      return selectedCategory === 'الكل' || product.category === selectedCategory;
    });
  }, [products, selectedMainGroup, selectedCategory, searchTerm]);

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
        <div>
          <span className="block text-xs font-semibold text-slate-500 mb-2">تصفية حسب الشركة/الماركة:</span>
          <div className="flex flex-wrap gap-2">
            {MAIN_GROUPS.map((group) => (
              <button
                key={group.key}
                onClick={() => {
                  setSelectedMainGroup(group.key);
                  onCategoryChange('الكل'); // تصفير القسم الفرعي عند الانتقال لماركة جديدة
                }}
                className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 text-xs md:text-sm cursor-pointer ${
                  selectedMainGroup === group.key
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {group.label}
              </button>
            ))}
          </div>
        </div>

        {/* تصفية تفصيلية للأقسام الفرعية */}
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 w-full">
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              اختر القسم الفرعي المختار ({filteredCategories.length} قسم):
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 font-medium"
            >
              <option value="الكل">عرض الكل (جميع الأقسام الفرعية التابعة للماركة)</option>
              {filteredCategories.map((category, index) => (
                <option key={category.id || category.name || index} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* شبكة المنتجات */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {displayedProducts.map((product) => (
          <div
            key={product.id}
            onClick={() => onAddToCart(product)}
            className="bg-white rounded-xl p-3 cursor-pointer hover:bg-blue-50/50 transition-all duration-300 hover:scale-105 hover:shadow-md border border-slate-200 hover:border-blue-400 flex flex-col justify-between group h-full min-h-[110px]"
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
              
              <div className="mt-auto pt-2 border-t border-slate-100 flex justify-between items-center font-bold text-right" style={{ direction: 'rtl' }}>
                <span className="text-slate-700 text-xs font-bold">السعر:</span>
                <span className="text-emerald-800 font-black text-base md:text-lg">{product.price.toLocaleString('en-US')} ج.م</span>
              </div>
            </div>
          </div>
        ))}

        {/* زر تحميل المزيد */}
        {filteredProducts.length > visibleCount && (
          <div className="col-span-full flex justify-center py-6">
            <button
              onClick={() => setVisibleCount(prev => prev + 36)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition-all duration-200 cursor-pointer"
            >
              عرض المزيد (+36 منتج)
            </button>
          </div>
        )}
      </div>

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
  );
};

export default ProductGrid;
