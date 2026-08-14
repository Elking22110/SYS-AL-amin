import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Package, Shirt, Footprints, Watch, Headphones, Smartphone, Laptop, Home, Car, Gamepad2, Book, Camera, Gift, ChevronRight, ChevronLeft } from 'lucide-react';
import storageOptimizer from '../../utils/storageOptimizer.js';
import errorHandler from '../../utils/errorHandler.js';
import searchOptimizer from '../../utils/searchOptimizer.js';
import soundManager from '../../utils/soundManager.js';
import { sortSubcategories, parseInchSize, getBrandRank, sortProductsByHistoricalOrder } from '../../utils/subcategorySorter.js';
import { isUnresolvedProduct } from '../../utils/unresolvedProducts.js';
import { useLongPressDrag } from '../../hooks/useLongPressDrag.js';
import { calculateReorder } from '../../utils/reorderManager.js';
import databaseManager from '../../utils/database.js';
import syncManager from '../../utils/syncManager.js';
import { supabase, isKeysConfigured } from '../../utils/supabaseClient.js';
import { publish, EVENTS } from '../../utils/observerManager.js';






// دالة لتصحيح التنسيق وإزالة الرموز الزائدة وفك التداخل في أسماء المنتجات
const renderProductTitleAndSize = (name) => {
  if (!name) return null;

  let cleanName = name;

  // 1. إزالة الأصفار والرموز المعلقة في نهاية الاسم مثل ' 0 00', ' 0 0', ' 00 00'
  cleanName = cleanName.replace(/\s+0+(?:\s+0+)*\s*$/g, '');

  // 2. إزالة الشرطات الزائدة في بداية الاسم
  cleanName = cleanName.replace(/^[-\s]+/, '');

  // 3. تصحيح الكسور العكسية
  cleanName = cleanName.replace(/\b2\/1\b/g, '1/2');
  cleanName = cleanName.replace(/\b4\/3\b/g, '3/4');
  cleanName = cleanName.replace(/\b8\/1\b/g, '1/8');
  cleanName = cleanName.replace(/\b8\/3\b/g, '3/8');
  cleanName = cleanName.replace(/\b8\/5\b/g, '5/8');
  cleanName = cleanName.replace(/\b4\/1\b/g, '1/4');

  // 4. فك التصاق "مم" أو "سم" بالأرقام مثل "مم60جلبة" -> "60 مم جلبة"
  cleanName = cleanName.replace(/مم(\d+)/g, '$1 مم ');
  cleanName = cleanName.replace(/سم(\d+)/g, '$1 سم ');

  // 5. تنظيف المسافات الزائدة
  cleanName = cleanName.replace(/\s+/g, ' ').trim();

  return (
    <div className="text-right" style={{ direction: 'rtl' }}>
      <span className="font-bold text-slate-800 text-sm md:text-base leading-snug group-hover:text-blue-600 transition-colors">
        {cleanName}
      </span>
    </div>
  );
};

const getContrastTextColor = (hexColor) => {
  if (!hexColor) return '#ffffff';
  const hex = hexColor.replace('#', '');
  if (hex.length !== 6) return '#ffffff';
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#000000' : '#ffffff';
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
  const [isMainGroupsExpanded, setIsMainGroupsExpanded] = useState(false);
  const [visibleCount, setVisibleCount] = useState(36);
  const searchInputRef = useRef(null);
  const mainGroupsRef = useRef(null);

  // دالة تحريك شريط المجموعات الرئيسية باللمس أو النقر على الأزرار
  const scrollMainGroups = (direction) => {
    if (mainGroupsRef.current) {
      const scrollAmount = direction === 'left' ? -250 : 250;
      mainGroupsRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // تركيز تلقائي على حقل البحث عند التحميل لسرعة الباركود
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

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

  // دالة تصنيف المنتجات للمجموعات والاقسام الاصلية لنظام المدير مع دعم الترتيب الهرمي الجديد والقديم
  const getProductGroupAndSub = useCallback((product) => {
    let mainGroup = 'Br';
    let subCategory = 'عام';

    // 1. تحديد بناءً على الحقول الهيكلية الجديدة
    if (product.mainCategoryId) {
      const mainCat = categories.find(c => String(c.id) === String(product.mainCategoryId) || c.name === product.mainCategoryId);
      const subCat = product.subCategoryId ? categories.find(c => String(c.id) === String(product.subCategoryId) || c.name === product.subCategoryId) : null;
      return {
        mainGroup: mainCat ? (mainCat.id || mainCat.name) : 'Br',
        subCategory: subCat ? subCat.name : 'عام'
      };
    }

    // 2. البحث عما إذا كان اسم التصنيف المسجل قديماً يطابق اسماً فرعياً له أب
    if (product.category) {
      const matchedCat = categories.find(c => c.name === product.category);
      if (matchedCat) {
        if (matchedCat.parentId) {
          const parentCat = categories.find(c => String(c.id) === String(matchedCat.parentId) || c.name === matchedCat.parentId);
          return {
            mainGroup: parentCat ? (parentCat.id || parentCat.name) : 'Br',
            subCategory: matchedCat.name
          };
        } else {
          return {
            mainGroup: matchedCat.id || matchedCat.name,
            subCategory: 'عام'
          };
        }
      }
    }

    // 3. Fallback للتحليل التلقائي القديم بالاسم والكلمات المفتاحية
    const name = product.name || '';
    const category = product.category || '';
    const fullName = `${name} ${category}`.toLowerCase();

    // تحديد المجموعة الرئيسية
    if (fullName.includes('بي ار') || fullName.includes('br')) {
      mainGroup = 'Br';
    } else if (fullName.includes('بروج') || fullName.includes('بولو') || fullName.includes('بلاست')) {
      mainGroup = 'Br';
    } else if (fullName.includes('سمارت') || fullName.includes('اسمارت')) {
      if ((fullName.includes('حوض') || fullName.includes('حلة') || fullName.includes('حله')) && fullName.includes('استانلس')) {
        mainGroup = 'احواض استانلس';
      } else {
        mainGroup = 'اسمارت ابيض';
      }
    } else if (fullName.includes('انفيت') || fullName.includes('حديد')) {
      mainGroup = 'لوازم حديد انفيت';
    } else if (fullName.includes('كيسل') || fullName.includes('كيسيل')) {
      mainGroup = 'كيسيل';
    } else if (fullName.includes('تكنو')) {
      mainGroup = 'تكنو بولي';
    } else if (fullName.includes('ديورافيت') || fullName.includes('ديوروفيت') || fullName.includes('دروفت') || fullName.includes('ايديال') || fullName.includes('ستاندر')) {
      mainGroup = 'مجموعه دروفت +ايديال';
    } else if (fullName.includes('خلاط')) {
      mainGroup = 'خلاطات';
    } else if (fullName.includes('افيز') || fullName.includes('أفيز') || fullName.includes('غراء') || fullName.includes('تثبيت') || fullName.includes('سيليكون') || fullName.includes('سليكون')) {
      mainGroup = 'افيز+تثبيت+غراء';
    } else if (fullName.includes('الاهرام') || fullName.includes('الأهرام')) {
      mainGroup = 'الاهرام بولي+صرف';
    } else if (fullName.includes('سانبيور') || fullName.includes('سان بيور') || fullName.includes('ليسيكو') || fullName.includes('ليسكو')) {
      mainGroup = 'سانبيور+ديروفيت+ايديال+ليسكو';
    } else if (fullName.includes('ماتور') || fullName.includes('موتور') || fullName.includes('بلونه') || fullName.includes('بالونة') || fullName.includes('اتوماتيك') || fullName.includes('أوتوماتيك') || fullName.includes('عداد') || fullName.includes('نحاسه') || fullName.includes('نحاسة')) {
      mainGroup = 'مجموعه مواتير';
    } else if (fullName.includes('اكسسوار') || fullName.includes('إكسسوار')) {
      mainGroup = 'اطقم اكسسوار';
    } else if (fullName.includes('فلتر') || fullName.includes('فلاتر') || fullName.includes('شمع')) {
      mainGroup = 'مجموعهفلاتر+قطع غيار';
    } else if (fullName.includes('غطاء') || fullName.includes('غطيان') || fullName.includes('بلاعة') || fullName.includes('بلاعات') || fullName.includes('صفاية') || fullName.includes('صفايه')) {
      mainGroup = 'غطاء بلاعات';
    } else if (fullName.includes('صرف') && (fullName.includes('6') || fullName.includes('٦') || fullName.includes('بوصه 6') || fullName.includes('6 بوصه') || fullName.includes('6بوصه'))) {
      mainGroup = 'قطع صرف 6 بوصه';
    } else if (fullName.includes('جوليت')) {
      mainGroup = 'جوليت صيني';
    } else if (fullName.includes('مكن') || fullName.includes('سيديلى') || fullName.includes('سيديلي')) {
      mainGroup = 'مكن كومبينيشمن';
    } else if ((fullName.includes('حوض') || fullName.includes('حلة') || fullName.includes('حله')) && fullName.includes('استانلس')) {
      mainGroup = 'احواض استانلس';
    } else if (fullName.includes('بلاكور') || fullName.includes('بلف') || fullName.includes('عوامات') || fullName.includes('عوامة') || fullName.includes('عوامه') || fullName.includes('محبس')) {
      if (fullName.includes('اكوا') || fullName.includes('أكوا')) {
        mainGroup = 'قطع اكوا استار';
      } else {
        mainGroup = 'قطع بلاكور+محابس+شيك بلف';
      }
    } else if (fullName.includes('اكوا') || fullName.includes('أكوا')) {
      mainGroup = 'قطع اكوا استار';
    } else if (fullName.includes('حنفيات') || fullName.includes('حنفية') || fullName.includes('حنفيه') || fullName.includes('نواكل') || fullName.includes('نكل')) {
      mainGroup = 'مجموعه حنفيات+نواكل';
    } else if (fullName.includes('وصلة') || fullName.includes('وصله')) {
      mainGroup = 'وصله متعدده';
    } else if (fullName.includes('شاور') || fullName.includes('مسطرة') || fullName.includes('مسطره') || fullName.includes('مساطر') || fullName.includes('دش')) {
      mainGroup = 'شاور+مساطر';
    } else if (fullName.includes('مراية') || fullName.includes('مرايه') || fullName.includes('مرايات') || fullName.includes('وحدات حوض') || fullName.includes('وحدة حوض')) {
      mainGroup = 'وحدات حوض+مرايات';
    }

    // تحديد المجموعة الفرعية بناء على الكلمات المفتاحية والمقاسات
    if (mainGroup === 'Br') {
      if (fullName.includes('اسود') || fullName.includes('أسود')) {
        if (fullName.includes('1.5') || fullName.includes('١.٥')) subCategory = 'قطع ١,٥ اسود';
        else if (fullName.includes('1') || fullName.includes('١')) subCategory = 'قطع ١ بوصه اسود';
        else subCategory = 'قطع اسواد ٣/٤';
      } else if (fullName.includes('افيز') || fullName.includes('أفيز')) {
        subCategory = 'افيز اسمارت';
      } else if (fullName.includes('مشكله') || fullName.includes('مشكلة')) {
        subCategory = 'قطع مشكله BR اسمارت و';
      } else if (fullName.includes('2/1') || fullName.includes('١/٢') || fullName.includes('1/2')) {
        subCategory = 'قطع ٢/١';
      } else if (fullName.includes('4/3') || fullName.includes('٣/٤') || fullName.includes('3/4')) {
        subCategory = 'قطع ٤/٣ بوصة';
      } else if (fullName.includes('1.25') || fullName.includes('١.٢٥') || fullName.includes('1/4 1') || fullName.includes('1 1/4')) {
        subCategory = 'قطع ١,٢٥ بوصة';
      } else if (fullName.includes('1.5') || fullName.includes('١.٥') || fullName.includes('1/2 1') || fullName.includes('1 1/2')) {
        subCategory = 'قطع ١,٥ بوصة';
      } else if (fullName.includes('2') || fullName.includes('٢')) {
        subCategory = 'قطع ٢ بوصة';
      } else if (fullName.includes('1') || fullName.includes('١')) {
        subCategory = 'قطع ١ بوصة';
      } else {
        subCategory = 'قطع مشكله BR اسمارت و';
      }
    } else if (mainGroup === 'اسمارت ابيض') {
      if (fullName.includes('افيز') || fullName.includes('أفيز')) {
        subCategory = 'افيز اسمارت';
      } else if (fullName.includes('6') || fullName.includes('٦')) {
        subCategory = 'بوصه 6';
      } else if (fullName.includes('4') || fullName.includes('٤')) {
        subCategory = 'بوصه 4';
      } else if (fullName.includes('3') || fullName.includes('٣')) {
        subCategory = 'بوصه 3';
      } else if (fullName.includes('2') || fullName.includes('٢')) {
        subCategory = 'بوصه 2';
      } else if (fullName.includes('1.5') || fullName.includes('١.٥') || fullName.includes('1 1/2') || fullName.includes('1/2 1')) {
        subCategory = 'بوصه ١,٥';
      } else if (fullName.includes('1') || fullName.includes('١')) {
        subCategory = '١بوصه';
      } else {
        subCategory = 'بوصه 4';
      }
    } else if (mainGroup === 'لوازم حديد انفيت') {
      if (fullName.includes('كوليه') || fullName.includes('كولية') || fullName.includes('ظهر')) {
        subCategory = 'كولية ظهر';
      } else if (fullName.includes('اسود') || fullName.includes('أسود') || fullName.includes('إسود')) {
        subCategory = 'إسود';
      } else if (fullName.includes('ابيض') || fullName.includes('أبيض') || fullName.includes('أبيـض')) {
        subCategory = 'أبيض';
      } else {
        subCategory = 'مقاسات حديد';
      }
    } else if (mainGroup === 'كيسيل') {
      if (fullName.includes('بلاعة') || fullName.includes('بلاعه') || fullName.includes('بلاعات') || fullName.includes('صفاية') || fullName.includes('صفايه')) {
        subCategory = 'بلاعات كيسل';
      } else {
        subCategory = 'كيسيل عام';
      }
    } else if (mainGroup === 'تكنو بولي') {
      if (fullName.includes('صرف')) {
        if (fullName.includes('1.5') || fullName.includes('١.٥')) subCategory = 'صرف ١,٥ تكنو';
        else if (fullName.includes('2') || fullName.includes('٢')) subCategory = 'صرف ٢ تكنو';
        else if (fullName.includes('3') || fullName.includes('٣')) subCategory = 'صرف ٣ تكنو';
        else if (fullName.includes('4') || fullName.includes('٤')) subCategory = 'صرف ٤ تكنو';
        else if (fullName.includes('6') || fullName.includes('٦')) subCategory = 'صرف ٦ تكنو';
        else subCategory = 'صرف ٢ تكنو';
      } else {
        if (fullName.includes('2/1') || fullName.includes('١/٢') || fullName.includes('1/2')) subCategory = 'بولى ٢/١';
        else if (fullName.includes('4/3') || fullName.includes('٣/٤') || fullName.includes('3/4')) subCategory = 'بولى ٤/٣ تكنو';
        else if (fullName.includes('1.5') || fullName.includes('١.٥')) subCategory = 'بولى ١,٥ تكنو';
        else if (fullName.includes('2') || fullName.includes('٢')) subCategory = 'بولى ٢ تكنو';
        else if (fullName.includes('1') || fullName.includes('١')) subCategory = 'بولى ١ تكنو';
        else subCategory = 'بولى ٢/١';
      }
    } else if (mainGroup === 'مجموعه دروفت +ايديال') {
      if (fullName.includes('بانيو')) {
        if (fullName.includes('الطيب')) subCategory = 'بانيو الطيب';
        else if (fullName.includes('اديال') || fullName.includes('ايديال')) subCategory = 'بانيو اديال';
        else subCategory = 'بانيو ديورافيت';
      } else if (fullName.includes('جولف')) {
        subCategory = 'طقم صينى - جولف';
      } else if (fullName.includes('كود') || fullName.includes('code')) {
        subCategory = 'طقم صينى - دي كود';
      } else {
        subCategory = 'طقم صينى - إكو';
      }
    } else if (mainGroup === 'خلاطات') {
      if (fullName.includes('رويال')) {
        subCategory = 'طقم خلاط رويال';
      } else if (fullName.includes('نص')) {
        subCategory = 'نص خلاط';
      } else if (fullName.includes('دش') || fullName.includes('ديكور')) {
        subCategory = 'قطع خلاط دش - ديكور';
      } else if (fullName.includes('شيف') || fullName.includes('الشيف')) {
        subCategory = 'خلاط مطبخ الشيف';
      } else if (fullName.includes('شطاف')) {
        subCategory = 'خلاط شطاف';
      } else if (fullName.includes('شواي')) {
        subCategory = 'خلاطات شواي';
      } else if (fullName.includes('جولد') || fullName.includes('ايديال')) {
        subCategory = 'طقم خلاط - جولد ايديال';
      } else {
        subCategory = 'اطقم خلاطات عرض';
      }
    } else if (mainGroup === 'افيز+تثبيت+غراء') {
      if (fullName.includes('فيشر')) {
        subCategory = 'أفيز فيشر';
      } else if (fullName.includes('مسمار')) {
        subCategory = 'طقم مسمار';
      } else if (fullName.includes('تفلون') || fullName.includes('غراء') || fullName.includes('سيليكون') || fullName.includes('سليكون')) {
        subCategory = 'تفلون + غراء + سيليكون';
      } else {
        subCategory = 'صرف احواض + قاعدة';
      }
    } else if (mainGroup === 'الاهرام بولي+صرف') {
      const isAhramSarf = fullName.includes('صرف') || fullName.includes('كيسل') ||
        fullName.includes('٥٠ ملى') || fullName.includes('٧٥ ملى') ||
        fullName.includes('١١٠ ملى') || fullName.includes('١٦٠ ملى') ||
        fullName.includes('50مل') || fullName.includes('75مل') ||
        fullName.includes('110مل') || fullName.includes('160مل');

      const isAhramAbiad = fullName.includes('ابيض') || fullName.includes('أبيض') || fullName.includes('ابيض');
      const isAhramBoly = fullName.includes('بولي') || fullName.includes('بولى') || (!isAhramSarf && !isAhramAbiad);

      if (isAhramBoly) {
        // --- قطع بولي الاهرام مصنفة بالمقاس من الأصغر للأكبر ---
        if (fullName.includes('٢/١') || fullName.includes('2/1') || fullName.includes('1/2') || fullName.includes('نص')) {
          subCategory = 'قطع ٢/١ بولى الاهرام';
        } else if (fullName.includes('٤/٣') || fullName.includes('4/3') || fullName.includes('3/4')) {
          subCategory = 'قطع ٤/٣ بولى الاهرام';
        } else if (fullName.includes('1.5') || fullName.includes('١.٥') || fullName.includes('١,٥') || fullName.includes('1,5') || fullName.includes('1 1/2') || fullName.includes('1½')) {
          subCategory = 'قطع ١,٥ بولى الاهرام';
        } else if (fullName.includes('1 1/4') || fullName.includes('١ ١/٤') || fullName.includes('1.25') || fullName.includes('١.٢٥')) {
          subCategory = 'قطع ١,٥ بولى الاهرام';
        } else if (fullName.includes('75') || fullName.includes('٧٥') || fullName.includes('2') || fullName.includes('٢') || fullName.includes('3') || fullName.includes('٣')) {
          subCategory = 'بولى ٢ و ٣ بوصه الاهرام';
        } else if (fullName.includes('1') || fullName.includes('١') || fullName.includes('ابوصه') || fullName.includes('أبوصه')) {
          subCategory = 'قطع ١بوصه بولى الاهرام';
        } else {
          subCategory = 'قطع ٢/١ بولى الاهرام';
        }
      } else if (isAhramSarf) {
        // --- قطع صرف/كيسل الاهرام مصنفة بالمقاس ---
        if (fullName.includes('١٦٠') || fullName.includes('160')) {
          subCategory = 'قطع ١٦٠ ملى كيسل الاهرام';
        } else if (fullName.includes('١١٠') || fullName.includes('110')) {
          subCategory = 'قطع ١١٠ ملى كيسل الاهرام';
        } else if (fullName.includes('٧٥') || fullName.includes('75')) {
          subCategory = 'قطع ٧٥ ملى كيسل الاهرام';
        } else if (fullName.includes('٥٠') || fullName.includes('50')) {
          subCategory = 'قطع ٥٠ ملى كيسل الاهرام';
        } else if (fullName.includes('٦') || fullName.includes('6')) {
          subCategory = 'قطع ١٦٠ ملى كيسل الاهرام';
        } else if (fullName.includes('٤') || fullName.includes('4')) {
          subCategory = 'قطع ١١٠ ملى كيسل الاهرام';
        } else if (fullName.includes('٣') || fullName.includes('3')) {
          subCategory = 'قطع ٧٥ ملى كيسل الاهرام';
        } else if (fullName.includes('٢') || fullName.includes('2')) {
          subCategory = 'قطع ٥٠ ملى كيسل الاهرام';
        } else {
          subCategory = 'قطع ٥٠ ملى كيسل الاهرام';
        }
      } else if (isAhramAbiad) {
        // --- قطع أبيض الاهرام مصنفة بالمقاس ---
        if (fullName.includes('6') || fullName.includes('٦')) {
          subCategory = 'قطع ٦بوصه الاهرام ابيض';
        } else if (fullName.includes('4') || fullName.includes('٤')) {
          subCategory = 'قطع ٤بوصه الاهرام ابيض';
        } else if (fullName.includes('3') || fullName.includes('٣')) {
          subCategory = 'قطع ٣بوصه الاهرام ابيض';
        } else if (fullName.includes('2') || fullName.includes('٢')) {
          subCategory = 'قطع ٢بوصه الاهرام ابيض';
        } else if (fullName.includes('1.5') || fullName.includes('١.٥') || fullName.includes('١,٥') || fullName.includes('1,5') || fullName.includes('1 1/2') || fullName.includes('نص')) {
          subCategory = 'قطع ١,٥ ابيض الاهرام';
        } else if (fullName.includes('1') || fullName.includes('١') || fullName.includes('ابوصه') || fullName.includes('أبوصه')) {
          subCategory = 'قطع ١بوصه الاهرام ابيض';
        } else {
          subCategory = 'قطع ١بوصه الاهرام ابيض';
        }
      }
    } else if (mainGroup === 'سانبيور+dierovit+ideal+lesico' || mainGroup === 'سانبيور+ديروفيت+ايديال+ليسكو') {
      if (fullName.includes('وحده') || fullName.includes('وحدة')) {
        subCategory = 'احوض وحده sanبيور'; // matching exact name 'احوض وحده سانبيور'
      } else if (fullName.includes('كونبليشن') || fullName.includes('كومبنيشن')) {
        subCategory = 'كونبليشن سانبيور';
      } else if (fullName.includes('ورقبه') || fullName.includes('رقبة')) {
        subCategory = 'احوض ورقبه سانبيور';
      } else if (fullName.includes('سداري عاديه') || fullName.includes('سدري')) {
        subCategory = 'سداري عاديه';
      } else if (fullName.includes('سداري سوفت')) {
        subCategory = 'سداري سوفت';
      } else if (fullName.includes('معلق')) {
        subCategory = 'مرحاض معلق سانبيور';
      } else if (fullName.includes('ديورافيت')) {
        subCategory = 'صينى ديورافيت';
      } else if (fullName.includes('ايديال')) {
        subCategory = 'صينى ايديال ستاندر';
      } else if (fullName.includes('ليسيكو')) {
        subCategory = 'صينى سان بيور ليسيكو';
      } else {
        subCategory = 'صينى سان بيور';
      }
    } else if (mainGroup === 'مجموعه مواتير') {
      if (fullName.includes('بلونه') || fullName.includes('بالونة')) {
        subCategory = 'بلونه';
      } else if (fullName.includes('اتوماتيك') || fullName.includes('أوتوماتيك')) {
        subCategory = 'اتوماتيك ماتور';
      } else if (fullName.includes('عداد') || fullName.includes('نحاسه') || fullName.includes('نحاسة')) {
        subCategory = 'عداد ونحاسه';
      } else if (fullName.includes('جهاز')) {
        subCategory = 'جهاز ماتور';
      } else if (fullName.includes('2') || fullName.includes('٢')) {
        subCategory = 'مواتير ٢ حصان';
      } else {
        subCategory = 'ماتور ١ حصان';
      }
    } else if (mainGroup === 'غطاء بلاعات') {
      if (fullName.includes('15*15') || fullName.includes('15 * 15') || fullName.includes('١٥*١٥')) {
        subCategory = 'غطيان ١٥*١٥';
      } else if (fullName.includes('30*20') || fullName.includes('30 * 20') || fullName.includes('٣٠*٢٠') || fullName.includes('20*30') || fullName.includes('٢٠*٣٠')) {
        subCategory = 'غطيان ٢٠*٣٠';
      } else if (fullName.includes('شور') || fullName.includes('شاور') || fullName.includes('بيه')) {
        subCategory = 'بيه شور';
      } else if (fullName.includes('بلاستك') || fullName.includes('بلاستيك')) {
        subCategory = 'غطاء بلاستك';
      } else {
        subCategory = 'طابق بانيو + حوض';
      }
    } else if (mainGroup === 'مكن كومبينيشمن') {
      if (fullName.includes('ديوروفيت') || fullName.includes('ديورافيت')) {
        subCategory = 'ديوروفيت';
      } else if (fullName.includes('سيديلى') || fullName.includes('سيديلي') || fullName.includes('مسمار')) {
        subCategory = 'سيديلى + مسمار تثبيت';
      } else {
        subCategory = 'مكن كومبينشن';
      }
    } else if (mainGroup === 'قطع صرف 6 بوصه') {
      if (fullName.includes('ماسور') || fullName.includes('مواسير')) {
        subCategory = 'مواسير صرف';
      } else if (fullName.includes('6') || fullName.includes('٦')) {
        subCategory = 'قطع ٦ بوصه';
      } else if (fullName.includes('4') || fullName.includes('٤')) {
        subCategory = 'قطع ٤ بوصه';
      } else if (fullName.includes('3') || fullName.includes('٣')) {
        subCategory = 'قطع ٣ بوصه';
      } else if (fullName.includes('2') || fullName.includes('٢')) {
        subCategory = 'قطع ٢ بوصه';
      } else if (fullName.includes('1.5') || fullName.includes('١,٥')) {
        subCategory = 'قطع ١,٥ بوصه';
      } else if (fullName.includes('مجر') || fullName.includes('جلتراپ') || fullName.includes('جلتراب')) {
        subCategory = 'مجر + جلتراب';
      } else {
        subCategory = 'قطع صرف رمادي ضغط 80';
      }
    } else if (mainGroup === 'جوليت صيني') {
      subCategory = 'جوليت صيني';
    } else if (mainGroup === 'اطقم اكسسوار') {
      if (fullName.includes('بورسيلين') || fullName.includes('بورسلين')) {
        subCategory = 'اطقم اكسسوار بورسيلين';
      } else if (fullName.includes('استانلس') || fullName.includes('استالس') || fullName.includes('ستيل')) {
        subCategory = 'اطقم اكسسوار استالس';
      } else if (fullName.includes('صيانة') || fullName.includes('صيانه') || fullName.includes('فردي') || fullName.includes('فردى')) {
        subCategory = 'قطع صيانات فردي';
      } else if (fullName.includes('صابون') || fullName.includes('تاتش')) {
        subCategory = 'خزان صابون تاتش';
      } else {
        subCategory = 'اطقم اكسسوار عرض';
      }
    } else if (mainGroup === 'احواض استانلس') {
      if (fullName.includes('ايطالى') || fullName.includes('ايطالي')) {
        subCategory = 'حلة استانلس ايطالى';
      } else if (fullName.includes('المنار')) {
        subCategory = 'حلة استانلس المنار';
      } else if (fullName.includes('ترك') || fullName.includes('ستيل')) {
        subCategory = 'حلة استانلس ترك ستيل';
      } else if (fullName.includes('beka')) {
        subCategory = 'حلة استانلس BEKA Turkey-';
      } else if (fullName.includes('بلازا')) {
        subCategory = 'حلة استانلس بلازا';
      } else if (fullName.includes('كابولى') || fullName.includes('كابولي')) {
        subCategory = 'كابولى حوض استانلس';
      } else if (fullName.includes('سمارت')) {
        subCategory = 'حلة استانلس سمارت';
      } else {
        subCategory = 'احواض استانلس';
      }
    } else if (mainGroup === 'قطع بلاكور+محابس+شيك بلف') {
      if (fullName.includes('محبس') && fullName.includes('بلاكور')) {
        subCategory = 'محبس بلاكور';
      } else if (fullName.includes('جلب') && fullName.includes('بلاكور')) {
        subCategory = 'جلب بلاكور';
      } else if (fullName.includes('شيك بلف') && fullName.includes('بلاكور')) {
        subCategory = 'شيك بلف بلاكور';
      } else if (fullName.includes('بلية') || fullName.includes('بليه')) {
        subCategory = 'محبس بلية';
      } else if (fullName.includes('شيك بلف') && fullName.includes('نحاس')) {
        subCategory = 'شيك بلف نحاس';
      } else if (fullName.includes('شيك بلف') && fullName.includes('سخان')) {
        subCategory = 'شيك بلف سخان';
      } else if (fullName.includes('هيتر') || fullName.includes('ثيرموستات')) {
        subCategory = 'هيتر + ثيرموستات سخان';
      } else if (fullName.includes('عوامات') || fullName.includes('عوامة') || fullName.includes('عوامه')) {
        subCategory = 'عوامات نحاس خزان';
      } else {
        subCategory = 'محبس بلاكور';
      }
    } else if (mainGroup === 'قطع اكوا استار') {
      if (fullName.includes('2/1') || fullName.includes('١/٢') || fullName.includes('1/2')) {
        subCategory = 'قطع ١/٢ بوصة اكوا استار';
      } else if (fullName.includes('4/3') || fullName.includes('٣/٤') || fullName.includes('3/4')) {
        subCategory = 'قطع ٣/٤ بوصة اكوا استار';
      } else if (fullName.includes('1.5') || fullName.includes('١.٥') || fullName.includes('1/2 1') || fullName.includes('1 1/2')) {
        subCategory = 'قطع ١,٥ بوصة اكوا استار';
      } else if (fullName.includes('2') || fullName.includes('٢')) {
        subCategory = 'قطع ٢ بوصة اكوا استار';
      } else if (fullName.includes('1') || fullName.includes('١')) {
        subCategory = 'قطع ١ بوصة اكوا استار';
      } else {
        subCategory = 'قطع ١/٢ بوصة اكوا استار';
      }
    } else if (mainGroup === 'مجموعه حنفيات+نواكل') {
      if (fullName.includes('زاوية') || fullName.includes('زاويه') || fullName.includes('ذاوية') || fullName.includes('ذاويه')) {
        subCategory = 'محبس زاوية';
      } else if (fullName.includes('غسالة') || fullName.includes('غساله')) {
        subCategory = 'حنفيات غساله';
      } else if (fullName.includes('قلب') || fullName.includes('اوكرة') || fullName.includes('اوكره') || fullName.includes('أوكرة') || fullName.includes('أوكره') || fullName.includes('قنطرة') || fullName.includes('قنطره')) {
        subCategory = 'قلب+اوكرة+قنطرة';
      } else if (fullName.includes('نبل') || fullName.includes('مسلوب') || fullName.includes('مساليب')) {
        subCategory = 'نبل + مساليب نيكل';
      } else if (fullName.includes('طقم') || fullName.includes('مجموعة') || fullName.includes('مجموعه') || fullName.includes('متعدد') || fullName.includes('نواكل') || fullName.includes('نيكل')) {
        subCategory = 'مجموعه نواكل متعدده';
      } else {
        subCategory = 'حنفيات';
      }
    } else if (mainGroup === 'وصله متعدده') {
      if (fullName.includes('تجاري') || fullName.includes('تجارى')) {
        subCategory = 'وصلة تجاري';
      } else if (fullName.includes('فايبر')) {
        subCategory = 'وصلة فايبر';
      } else if (fullName.includes('اصيل') || fullName.includes('أصيل')) {
        subCategory = 'وصلة مرنة اصيل';
      } else if (fullName.includes('سوستة') || fullName.includes('شاور') || fullName.includes('دش')) {
        subCategory = 'وصلة سوستة شاور';
      } else {
        subCategory = 'وصلة تجاري';
      }
    } else if (mainGroup === 'شاور+مساطر') {
      if (fullName.includes('حراري') || fullName.includes('سخان')) {
        subCategory = 'شاور حراري';
      } else if (fullName.includes('استانلس') || fullName.includes('استالس')) {
        subCategory = 'شاور استانلس';
      } else {
        subCategory = 'مسطرة دش';
      }
    } else if (mainGroup === 'وحدات حوض+مرايات') {
      if (fullName.includes('مراية') || fullName.includes('مرايه') || fullName.includes('مرايات')) {
        subCategory = 'مرايات';
      } else {
        subCategory = 'وحدات حوض';
      }
    }

    return { mainGroup, subCategory };
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

    const handleGridSync = (e) => {
      const target = e?.detail?.table || e?.detail?.type || e?.key;
      if (!target || target === 'products' || target === 'categories' || target === 'productCategories') {
        storageOptimizer.clearCache('products');
        storageOptimizer.clearCache('productCategories');
        loadData();
      }
    };

    window.addEventListener('realtimeDataUpdate', handleGridSync);
    window.addEventListener('dataUpdated', handleGridSync);
    window.addEventListener('databaseSyncTrigger', handleGridSync);
    window.addEventListener('storage', handleGridSync);
    window.addEventListener('productsUpdated', loadData);

    return () => {
      window.removeEventListener('realtimeDataUpdate', handleGridSync);
      window.removeEventListener('dataUpdated', handleGridSync);
      window.removeEventListener('databaseSyncTrigger', handleGridSync);
      window.removeEventListener('storage', handleGridSync);
      window.removeEventListener('productsUpdated', loadData);
    };
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

  // أسماء فئات بلاعات كيسيل (تبقى منفصلة)
  const KEISEL_DRAIN_NAMES = React.useMemo(() => [
    'بلاعات كيسل', 'بلاعات كيسيل', 'بلاعة كيسل', 'بلاعة كيسيل'
  ], []);

  // تصفية الفئات الفرعية المتاحة بناء على المجموعة الرئيسية المحددة من قاعدة البيانات
  const filteredCategories = React.useMemo(() => {
    if (selectedMainGroup === 'الكل') {
      // عرض جميع المجموعات الفرعية (التي لها أب)
      const allChildSubs = categories.filter(c => c.parentId).map(c => ({ id: c.id, name: c.name }));
      return sortSubcategories(allChildSubs, selectedMainGroup);
    }

    const selectedGroup = categories.find(c => (String(c.id) === String(selectedMainGroup) || c.name === selectedMainGroup) && !c.parentId);
    if (selectedGroup) {
      const seenNames = new Set();
      const uniqueSubs = [];
      for (const c of categories) {
        if (String(c.parentId) === String(selectedGroup.id) || String(c.parentId) === String(selectedGroup.name)) {
          const normKey = (c.name || '')
            .replace(/[۰-۹]/g, d => '٠١٢٣٤٥٦٧٨٩'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)])
            .replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'['0123456789'.indexOf(d)])
            .replace(/\s+/g, ' ')
            .trim();
          if (!seenNames.has(normKey)) {
            seenNames.add(normKey);
            uniqueSubs.push({ id: c.id, name: c.name });
          }
        }
      }

      return sortSubcategories(uniqueSubs, selectedGroup.name);
    }

    // Fallback في حال كانت المجموعة الرئيسية مجموعة الكلمات المفتاحية القديمة (مثل "أخرى")
    let relevantProducts = processedProducts;
    if (selectedMainGroup !== 'الكل') {
      relevantProducts = processedProducts.filter(p => p.computedMainGroup === selectedMainGroup);
    }
    const uniqueSubs = Array.from(new Set(relevantProducts.map(p => p.computedSubCategory)));
    const mappedSubs = uniqueSubs.map(sub => ({ name: sub }));
    return sortSubcategories(mappedSubs, selectedMainGroup);
  }, [categories, processedProducts, selectedMainGroup]);

  // دالة استخراج المقاس الرقمي من اسم المنتج للترتيب من الأصغر للأكبر
  const extractSizeNumber = useCallback((name) => {
    if (!name) return 9999;
    const str = name.toLowerCase();
    // البحث عن مقاسات شائعة بالترتيب
    const patterns = [
      { re: /(?:^|\D)(\d+(?:[.,]\d+)?)\s*(?:مم|mm)/i, mul: 1 },
      { re: /(?:^|\D)(\d+(?:[.,]\d+)?)\s*(?:سم|cm)/i, mul: 10 },
      { re: /pp\s*(\d+)/i, mul: 1 },
      { re: /(?:^|\D)(\d+(?:[.,]\d+)?)/,               mul: 1 }
    ];
    for (const { re, mul } of patterns) {
      const m = str.match(re);
      if (m) return parseFloat(m[1].replace(',', '.')) * mul;
    }
    return 9999;
  }, []);

  // تصفية المنتجات مع البحث الفوري الشامل بالاسم والكود والباركود (مثل صفحة المنتجات)
  const filteredProducts = React.useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    const effectiveSubCat = (selectedCategory === 'الكل' && filteredCategories.length > 0)
      ? filteredCategories[0].name
      : selectedCategory;

    let result;
    if (!term) {
      result = processedProducts.filter(product => {
        if (selectedMainGroup !== 'الكل' && product.computedMainGroup !== selectedMainGroup) return false;
        if (effectiveSubCat !== 'الكل') {
          const prodSub = product.computedSubCategory || product.subCategory || product.sub_category_id || '';
          const prodName = product.name || '';

          if (effectiveSubCat === 'كيسيل برتقالي') {
            const isOrange = (product.customColor === '#ea580c') || prodSub.includes('برتقال') || prodSub.includes('مدفون') || prodName.includes('برتقال') || prodName.includes('مدفون');
            if (!isOrange) return false;
          } else {
            const normEff = effectiveSubCat.replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'['0123456789'.indexOf(d)]).replace(/[۰-۹]/g, d => '٠١٢٣٤٥٦٧٨٩'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)]).replace(/\s+/g, '');
            const normProd = prodSub.replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'['0123456789'.indexOf(d)]).replace(/[۰-۹]/g, d => '٠١٢٣٤٥٦٧٨٩'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)]).replace(/\s+/g, '');
            const isMatch = normProd === normEff || normProd.includes(normEff) || normEff.includes(normProd);
            if (!isMatch) return false;
          }
        }
        return true;
      });
    } else {
      // تقسيم كلمات البحث لدعم البحث المركب مثل "كوع 63" أو "اسمارت 90"
      const keywords = term.split(/\s+/).filter(Boolean);
      result = processedProducts.filter(product => {
        const nameStr = (product.name || '').toLowerCase();
        const idStr = String(product.id || '').toLowerCase();
        const barcodeStr = (product.barcode || '').toLowerCase();
        const supplierCodeStr = (product.supplierCode || '').toLowerCase();
        const skuStr = (product.sku || '').toLowerCase();
        const descStr = (product.description || '').toLowerCase();
        const categoryStr = (product.category || '').toLowerCase();
        const mainGroupStr = (product.computedMainGroup || '').toLowerCase();
        const subGroupStr = (product.computedSubCategory || '').toLowerCase();
        const combinedText = `${nameStr} ${idStr} ${barcodeStr} ${supplierCodeStr} ${skuStr} ${descStr} ${categoryStr} ${mainGroupStr} ${subGroupStr}`;
        // يجب أن توجد جميع كلمات البحث داخل السجل (تطابق شامل ودقيق)
        return keywords.every(kw => combinedText.includes(kw));
      });
    }

    if (selectedMainGroup && (selectedMainGroup.includes('الاهرام') || selectedMainGroup.includes('الأهرام'))) {
      result = [...result].sort((a, b) => {
        const subA = a.computedSubCategory || a.name || '';
        const subB = b.computedSubCategory || b.name || '';
        const brandA = getBrandRank(subA, selectedMainGroup);
        const brandB = getBrandRank(subB, selectedMainGroup);
        if (brandA !== brandB) return brandA - brandB;

        const sortA = (a.sort_order !== undefined && a.sort_order !== null && !isNaN(Number(a.sort_order))) ? Number(a.sort_order) : null;
        const sortB = (b.sort_order !== undefined && b.sort_order !== null && !isNaN(Number(b.sort_order))) ? Number(b.sort_order) : null;
        if (sortA !== null && sortB !== null && sortA !== sortB) return sortA - sortB;
        if (sortA !== null && sortB === null) return -1;
        if (sortA === null && sortB !== null) return 1;

        const sizeA = parseInchSize(a.name) !== 999 ? parseInchSize(a.name) : parseInchSize(subA);
        const sizeB = parseInchSize(b.name) !== 999 ? parseInchSize(b.name) : parseInchSize(subB);
        if (sizeA !== sizeB) return sizeA - sizeB;
        return (a.name || '').localeCompare(b.name || '', 'ar');
      });
    } else if (selectedMainGroup) {
      result = sortProductsByHistoricalOrder(result, selectedMainGroup);
    }


    return result;
  }, [processedProducts, selectedMainGroup, selectedCategory, searchTerm]);


  // إعادة ضبط مؤشر عدد المنتجات المعروضة عند تغيير الفلاتر لتجنب البطء
  useEffect(() => {
    setVisibleCount(36);
  }, [selectedCategory, selectedMainGroup, searchTerm]);

  const displayedProducts = React.useMemo(() => {
    return filteredProducts.slice(0, visibleCount);
  }, [filteredProducts, visibleCount]);

  // معالج إعادة ترتيب المنتجات بسلاسة ودون مساس بالبيانات الأخرى
  const handleReorderProducts = useCallback(async (fromIdx, toIdx) => {
    const { updatedProducts } = calculateReorder(displayedProducts, fromIdx, toIdx);
    if (!updatedProducts || updatedProducts.length === 0) return;

    const updatedMap = new Map(updatedProducts.map(p => [String(p.id), p]));
    const newAllProducts = products.map(p => updatedMap.get(String(p.id)) || p);

    setProducts(newAllProducts);
    localStorage.setItem('products', JSON.stringify(newAllProducts));
    storageOptimizer.clearCache('products');

    const nowIso = new Date().toISOString();

    await Promise.all(
      updatedProducts.map(async (p) => {
        const payload = { ...p, sync_status: 'pending', updated_at: nowIso };
        await syncManager.markPending('products', payload).catch(err => console.error('Reorder IDB error:', err));
      })
    );

    if (isKeysConfigured && supabase) {
      try {
        const cloudPayloads = updatedProducts.map(p => {
          const rawImg = p.image_path || p.imagePath || null;
          let meta = (typeof rawImg === 'string' && rawImg.startsWith('{')) ? JSON.parse(rawImg) : { img: rawImg || '' };
          meta.so = Number(p.sort_order);
          if (p.customColor) meta.color = p.customColor;
          if (p.supplierCode) meta.code = p.supplierCode;

          return {
            id: String(p.id),
            name: p.name,
            price: Number(p.price || 0),
            cost: Number(p.cost || 0),
            stock: Number(p.stock || 0),
            barcode: p.barcode || null,
            main_category_id: p.mainCategoryId || p.main_category_id || null,
            sub_category_id: p.subCategoryId || p.sub_category_id || null,
            image_path: JSON.stringify(meta),
            updated_at: nowIso
          };
        });

        const { error } = await supabase.from('products').upsert(cloudPayloads);
        if (!error) {
          await Promise.all(updatedProducts.map(async (p) => {
            p.sync_status = 'synced';
            delete p._isNewLocally;
            await databaseManager.update('products', p);
          }));
        }
      } catch (cloudErr) {
        console.warn('⚠️ [ProductGrid] Cloud reorder upsert warning:', cloudErr);
      }
    }

    syncManager.syncStore('products').catch(err => console.warn('Cloud sync reorder warning:', err));
    window.dispatchEvent(new CustomEvent('productsUpdated', { detail: { action: 'reordered', products: newAllProducts } }));
    try { publish(EVENTS.PRODUCTS_CHANGED, { type: 'reorder', products: newAllProducts }); } catch (_) {}
  }, [displayedProducts, products, setProducts]);

  const {
    dragState,
    containerRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    cancelDrag,
    shouldSuppressClick
  } = useLongPressDrag({
    items: displayedProducts,
    onReorder: handleReorderProducts,
    longPressDelay: 600
  });

  // إضافة معالج Enter للإضافة السريعة عند تصفية منتج واحد
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      const results = filteredProducts;
      if (results.length === 1) {
        onAddToCart(results[0]);
        setSearchTerm('');
        soundManager.play('click');
      }
    }
  };


  return (
    <div className="flex-1 bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-slate-200">
      {/* شريط البحث والفلاتر */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* البحث في المنتجات */}
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="البحث بالاسم، الكود، أو الباركود... (اضغط Enter للإضافة السريعة)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full pr-10 pl-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
            />
          </div>
        </div>

        {/* فئات المنتجات الرئيسية (سريعة التنقل) */}
        <div className="border-b border-slate-200 pb-4">
          <div className="flex justify-between items-center mb-2.5">
            <span className="block text-xs font-black text-slate-500">مجموعات رئيسية (الماركات):</span>
            <button
              type="button"
              onClick={() => setIsMainGroupsExpanded(!isMainGroupsExpanded)}
              className="text-[11px] bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>{isMainGroupsExpanded ? 'عرض شريطي ☰' : 'عرض شبكة ▦'}</span>
            </button>
          </div>
          
          {isMainGroupsExpanded ? (
            <div className="flex flex-wrap gap-1.5 pb-2" style={{ direction: 'rtl' }}>
              {MAIN_GROUPS.map((group) => (
                <button
                  key={group.key}
                  onClick={() => {
                    setSelectedMainGroup(group.key);
                    onCategoryChange('الكل');
                  }}
                  className={`px-4 py-2 md:py-2.5 rounded-lg font-extrabold transition-all duration-200 text-xs md:text-sm whitespace-nowrap cursor-pointer shadow-xs border ${
                    selectedMainGroup === group.key
                      ? 'bg-amber-400 text-slate-900 border-amber-500 font-black shadow-md'
                      : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  {group.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="relative flex items-center">
              {/* زر التمرير لليمين */}
              <button
                type="button"
                onClick={() => scrollMainGroups('right')}
                className="absolute right-0 z-10 p-1.5 rounded-full bg-white/90 hover:bg-white text-slate-700 shadow-md border border-slate-200 -mr-2 cursor-pointer transition-all duration-150 flex items-center justify-center hover:scale-105 active:scale-95"
                title="تصفح لليمين"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              
              {/* قائمة الفئات الأفقية */}
              <div
                ref={mainGroupsRef}
                className="flex flex-row overflow-x-auto gap-2 px-6 pb-2 scrollbar-none w-full scroll-smooth"
                style={{ direction: 'rtl' }}
              >
                {MAIN_GROUPS.map((group) => (
                  <button
                    key={group.key}
                    onClick={() => {
                      setSelectedMainGroup(group.key);
                      onCategoryChange('الكل');
                    }}
                    className={`px-5 py-3 rounded-lg font-extrabold transition-all duration-200 text-xs md:text-sm whitespace-nowrap cursor-pointer shadow-xs border ${
                      selectedMainGroup === group.key
                        ? 'bg-amber-400 text-slate-900 border-amber-500 font-black shadow-md'
                        : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    {group.label}
                  </button>
                ))}
              </div>
              
              {/* زر التمرير ليسار */}
              <button
                type="button"
                onClick={() => scrollMainGroups('left')}
                className="absolute left-0 z-10 p-1.5 rounded-full bg-white/90 hover:bg-white text-slate-700 shadow-md border border-slate-200 -ml-2 cursor-pointer transition-all duration-150 flex items-center justify-center hover:scale-105 active:scale-95"
                title="تصفح لليسار"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* التخطيط ثنائي العمود: المجموعات الفرعية على اليمين وشبكة المنتجات على اليسار */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* المجموعات الفرعية على اليمين */}
        <div className="w-full lg:w-56 lg:min-w-[14rem] lg:max-w-[14rem] flex-none flex flex-col gap-1.5 bg-slate-100 p-3 rounded-xl border border-slate-300 max-h-[600px] overflow-y-auto no-scrollbar">
          <span className="block text-center text-xs font-black text-slate-600 border-b border-slate-300 pb-2 mb-2">
            مجموعات فرعية
          </span>
          {filteredCategories.map((category, index) => (
            <button
              key={category.id || category.name || index}
              onClick={() => onCategoryChange(category.name)}
              className={`w-full py-3 px-3 rounded-lg text-right font-extrabold transition-colors text-xs border truncate ${
                selectedCategory === category.name
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md font-black'
                  : 'bg-white text-slate-800 hover:bg-slate-50 border-slate-200'
              }`}
            >
              🏷️ {category.name}
            </button>
          ))}
        </div>

        {/* شبكة المنتجات على اليسار (المكان المعتمد لإعادة الترتيب) */}
        <div className="flex-1 w-full" ref={containerRef} data-reorder-container="true">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-3">
            {displayedProducts.map((product, index) => {
              const name = product.name || '';
              const subName = String(product.subCategoryId || product.subCategory || '');
              const mainCatName = String(product.mainCategoryId || product.category || '');
              const hasCustomColor = Boolean(product.customColor && product.customColor.trim() !== '');

              const isSmart = mainCatName.includes('اسمارت') || name.includes('اسمارت') || subName.includes('اسمارت') || name.includes('سمارت') || subName.includes('سمارت');
              
              let isSmartBrownSize = false;
              if (isSmart) {
                const is2Or3InchSub = subName === 'بوصه 3' || subName === 'بوصه 2' || subName === 'بوصة 3' || subName === 'بوصة 2' || subName === '3 بوصة' || subName === '2 بوصة' || subName.includes('بوصه 3') || subName.includes('بوصه 2');
                if (is2Or3InchSub) {
                  isSmartBrownSize = true;
                } else {
                  const nameWithoutAngle = name.replace(/90\s*درجة|٩٠\s*درجة|90درجة|٩٠درجة/g, '');
                  isSmartBrownSize = nameWithoutAngle.includes('90') || nameWithoutAngle.includes('63') || nameWithoutAngle.includes('٩٠') || nameWithoutAngle.includes('٦٣') || nameWithoutAngle.includes('3 بوصه') || nameWithoutAngle.includes('2 بوصه') || nameWithoutAngle.includes('3 بوصة') || nameWithoutAngle.includes('2 بوصة');
                }
              }

              const isBlack = (
                name.includes('اسود') || name.includes('أسود') || name.includes('إسود') ||
                subName.includes('اسود') || subName.includes('أسود') || subName.includes('إسود') ||
                name.includes('جاليتراب') || name.includes('جالينراب') || name.includes('جالي تراب') || name.includes('جالين تراب') || subName.includes('جاليتراب') ||
                name.includes('تفتيش') || subName.includes('تفتيش') ||
                name.includes('مجرى') || name.includes('مجري') || subName.includes('مجرى') || subName.includes('مجري') ||
                name.includes('غرفة رفع') || name.includes('غرفه رفع') || subName.includes('غرفة رفع')
              );
              const isOrangeOrBuried = name.includes('مدفون') || name.includes('برتقالي') || name.includes('برتقالى') || subName.includes('مدفون') || subName.includes('برتقالي') || subName.includes('برتقالى');
              const isInsulated = name.includes('معزول') || name.includes('معزوله') || name.includes('معزولة') || subName.includes('معزول') || subName.includes('معزوله') || subName.includes('معزولة');
              
              const isUnresolved = isUnresolvedProduct(product);

              let cardClass = "pos-product-card relative cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-blue-400 hover:-translate-y-0.5 border-2 flex flex-col rounded-xl group select-none ";
              let inlineStyle = {};

              if (isUnresolved) {
                cardClass += "bg-emerald-500/10 border-emerald-500 border-r-4 border-r-emerald-600";
              } else if (hasCustomColor) {
                cardClass += "bg-white border-r-4";
                inlineStyle = { borderColor: product.customColor, borderRightColor: product.customColor };
              } else if (isBlack) {
                cardClass += "bg-zinc-100 border-zinc-300 border-r-4 border-r-black";
              } else if (isOrangeOrBuried) {
                cardClass += "bg-orange-50/70 border-orange-300 border-r-4 border-r-orange-500";
              } else if (isSmartBrownSize) {
                cardClass += "bg-amber-950/10 border-amber-800 border-r-4 border-r-amber-900";
              } else if (isInsulated) {
                cardClass += "bg-amber-50/60 border-amber-200 border-r-4 border-r-amber-500";
              } else {
                cardClass += "bg-white border-slate-200";
              }

              const isItemDragging = dragState.isDragging && dragState.draggedIndex === index;
              const isItemTarget = dragState.isDragging && dragState.targetIndex === index;

              if (isItemDragging) {
                if (dragState.isOverValid) {
                  cardClass += " opacity-30 border-dashed border-blue-500 scale-95 z-10";
                } else {
                  cardClass += " opacity-30 border-dashed border-red-500 scale-95 z-10";
                }
              } else if (isItemTarget && dragState.isOverValid) {
                cardClass += " ring-4 ring-emerald-500 border-emerald-500 bg-emerald-50/60 shadow-xl scale-102 transition-transform duration-150";
              }

              return (
                <React.Fragment key={product.id}>
                  <div
                    data-reorder-index={index}
                    onPointerDown={(e) => handlePointerDown(e, index, product)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={cancelDrag}
                    onClick={(e) => {
                      if (shouldSuppressClick() || dragState.isDragging) {
                        e.preventDefault();
                        e.stopPropagation();
                        return;
                      }
                      onAddToCart(product);
                    }}
                    className={cardClass}
                    style={inlineStyle}
                  >
                    {/* In-Place Target Highlight Overlay (Flicker-Free, No Layout Shift) */}
                    {isItemTarget && dragState.isOverValid && !isItemDragging && (
                      <div className="absolute inset-0 ring-4 ring-emerald-500 border-2 border-emerald-500 bg-emerald-500/20 rounded-xl pointer-events-none z-20 flex flex-col items-center justify-center backdrop-blur-[1px] transition-all duration-150">
                        <div className="bg-emerald-600 text-white px-3 py-1 rounded-full text-xs font-black shadow-lg flex items-center gap-1.5 animate-bounce">
                          <span>📍 المكان الجديد للمنتج</span>
                        </div>
                      </div>
                    )}

                {/* اسم المنتج */}
                <div className="flex-1 overflow-hidden">
                  <div className="text-right leading-tight">
                    {renderProductTitleAndSize(product.name)}
                    {isUnresolved && (
                      <span className="mt-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-700 border border-emerald-500/30">
                        🟢 مراجعة فنية
                      </span>
                    )}
                  </div>
                </div>

                {/* كود المورد ورقم الجملة */}
                {(product.supplierCode || product.barcode || (product.wholesalePrice && Number(product.wholesalePrice) > 0)) && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(product.supplierCode || product.barcode) && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-mono font-bold border border-blue-200 leading-tight">
                        🏷 {product.supplierCode || product.barcode}
                      </span>
                    )}
                    {(product.wholesalePrice && Number(product.wholesalePrice) > 0 && Number(product.wholesalePrice) !== Number(product.price)) && (
                      <span className="text-[9px] px-1 py-0.5 rounded bg-amber-50 text-amber-700 font-extrabold border border-amber-200 leading-tight">
                        📦 جملة: {Number(product.wholesalePrice).toLocaleString('ar-EG')}
                      </span>
                    )}
                  </div>
                )}

                {/* السعر */}
                {(() => {
                  if (hasCustomColor) {
                    const textColor = getContrastTextColor(product.customColor);
                    return (
                      <div className="p-2 rounded-lg mt-2 flex justify-end items-center shadow-inner" style={{ backgroundColor: product.customColor }}>
                        <span className="font-black text-lg leading-none" style={{ color: textColor }}>
                          {Number(product.price || 0).toLocaleString('ar-EG')}
                          <span className="text-xs font-bold opacity-80 mr-1" style={{ color: textColor }}>ج.م</span>
                        </span>
                      </div>
                    );
                  } else if (isBlack) {
                    return (
                      <div className="bg-black text-white p-2 rounded-lg mt-2 flex justify-end items-center shadow-inner">
                        <span className="text-white font-black text-lg leading-none">
                          {Number(product.price || 0).toLocaleString('ar-EG')}
                          <span className="text-xs font-bold text-zinc-300 mr-1">ج.م</span>
                        </span>
                      </div>
                    );
                  } else if (isOrangeOrBuried) {
                    return (
                      <div className="bg-orange-500 text-white p-2 rounded-lg mt-2 flex justify-end items-center shadow-inner">
                        <span className="text-white font-black text-lg leading-none">
                          {Number(product.price || 0).toLocaleString('ar-EG')}
                          <span className="text-xs font-bold text-orange-200 mr-1">ج.م</span>
                        </span>
                      </div>
                    );
                  } else if (isSmartBrownSize) {
                    return (
                      <div className="bg-amber-900 text-amber-100 p-2 rounded-lg mt-2 flex justify-end items-center shadow-inner">
                        <span className="text-amber-100 font-black text-lg leading-none">
                          {Number(product.price || 0).toLocaleString('ar-EG')}
                          <span className="text-xs font-bold text-amber-300 mr-1">ج.م</span>
                        </span>
                      </div>
                    );
                  } else if (isInsulated) {
                    return (
                      <div className="bg-zinc-900 text-yellow-400 p-2 rounded-lg mt-2 flex justify-end items-center shadow-inner">
                        <span className="text-yellow-400 font-black text-lg leading-none">
                          {Number(product.price || 0).toLocaleString('ar-EG')}
                          <span className="text-xs font-bold text-yellow-500 mr-1">ج.م</span>
                        </span>
                      </div>
                    );
                  } else {
                    return (
                      <div className="pt-1 mt-2 border-t border-emerald-100 flex justify-end items-center">
                        <span className="text-emerald-700 font-black text-xl leading-none">
                          {Number(product.price || 0).toLocaleString('ar-EG')}
                          <span className="text-sm font-bold text-emerald-600 mr-1">ج.م</span>
                        </span>
                      </div>
                    );
                  }
                })()}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Floating Drag Preview Overlay */}
      {dragState.isDragging && dragState.draggedIndex !== null && displayedProducts[dragState.draggedIndex] && (
        <div
          className={`fixed top-0 left-0 pointer-events-none z-[99999] shadow-2xl rounded-xl p-3 bg-white/95 border-2 ${dragState.isOverValid ? 'border-blue-500 ring-4 ring-blue-500/30' : 'border-red-500 ring-4 ring-red-500/30'} flex flex-col justify-between select-none`}
          style={{
            transform: `translate3d(${dragState.pointerPos.x - (dragState.grabOffset?.x || 0)}px, ${dragState.pointerPos.y - (dragState.grabOffset?.y || 0)}px, 0px)`,
            width: `${dragState.cardDimensions?.width || 180}px`,
            height: `${dragState.cardDimensions?.height || 110}px`,
            willChange: 'transform',
            pointerEvents: 'none'
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-600">🖐️ ترتيب المنتج</span>
            <span className={`text-[10px] ${dragState.isOverValid ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'} px-1.5 py-0.5 rounded font-mono font-bold`}>
              {dragState.isOverValid ? 'سحب صالح' : 'غير صالح'}
            </span>
          </div>
          <div className="font-bold text-slate-800 text-sm truncate text-right mt-1">
            {displayedProducts[dragState.draggedIndex].name}
          </div>
          <div className="text-left font-black text-blue-700 text-sm mt-1">
            {Number(displayedProducts[dragState.draggedIndex].price || 0).toLocaleString('ar-EG')} ج.م
          </div>
        </div>
      )}

      {/* Temporary Runtime Debug Panel for Reorder Verification */}
      {dragState.isDragging && (
        <div className="fixed bottom-4 left-4 z-[999999] bg-slate-900/90 text-white text-xs p-3 rounded-lg shadow-2xl border border-slate-700 font-mono space-y-1 pointer-events-none max-w-xs select-none">
          <div className="text-emerald-400 font-bold border-b border-slate-700 pb-1">
            🐞 [DRAG HIT TEST DEBUG]
          </div>
          <div>Pointer: ({dragState.pointerPos.x}, {dragState.pointerPos.y})</div>
          <div>Hit Stage: <span className="text-yellow-300 font-bold">{dragState.hitStage || 'GAP'}</span></div>
          <div>Target Card: <span className="text-emerald-300 font-bold">{dragState.targetProductName || 'None'}</span></div>
          <div>Target ID: {dragState.targetProductId || 'N/A'}</div>
          <div>Target Index: {dragState.targetIndex}</div>
          <div>Side: <span className="text-blue-300 font-bold">{dragState.targetPositionSide || 'BEFORE'}</span></div>
          <div>Dragged Item: {displayedProducts[dragState.draggedIndex]?.name}</div>
        </div>
      )}

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
