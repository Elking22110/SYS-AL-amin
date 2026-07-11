import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Package, Shirt, Footprints, Watch, Headphones, Smartphone, Laptop, Home, Car, Gamepad2, Book, Camera, Gift, ChevronRight, ChevronLeft } from 'lucide-react';
import storageOptimizer from '../../utils/storageOptimizer.js';
import errorHandler from '../../utils/errorHandler.js';
import searchOptimizer from '../../utils/searchOptimizer.js';
import soundManager from '../../utils/soundManager.js';

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
    <div className="text-right" style={{ direction: 'rtl' }}>
      <span className="font-bold text-slate-800 text-sm md:text-base leading-snug group-hover:text-blue-600 transition-colors line-clamp-2">
        {cleanName}
      </span>
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
      } else if (fullName.includes('مدفون') || fullName.includes('نظام') || fullName.includes('شاسيه') || fullName.includes('خزان')) {
        if (fullName.includes('110') || fullName.includes('١١٠')) {
          subCategory = 'نظام كيسيل المدفون ١١٠';
        } else if (fullName.includes('160') || fullName.includes('١٦٠')) {
          subCategory = 'نظام كيسيل المدفون ١٦٠';
        } else {
          subCategory = 'نظام كيسل المدفون ٢٠٠';
        }
      } else if (fullName.includes('ماسور') || fullName.includes('مواسير')) {
        subCategory = 'مواسير كيسل';
      } else {
        if (fullName.includes('63') || fullName.includes('٦٣')) {
          subCategory = 'قطع ٦٣ كيسل';
        } else if (fullName.includes('40') || fullName.includes('٤٠')) {
          subCategory = 'قطع ٤٠ كيسل';
        } else if (fullName.includes('50') || fullName.includes('٥٠')) {
          subCategory = 'قطع ٥٠';
        } else if (fullName.includes('75') || fullName.includes('٧٥')) {
          subCategory = 'قطع ٧٥';
        } else if (fullName.includes('110') || fullName.includes('١١٠')) {
          subCategory = 'قطع ١١٠';
        } else if (fullName.includes('160') || fullName.includes('١٦٠')) {
          subCategory = 'قطع ١٦٠';
        } else if (fullName.includes('1') || fullName.includes('١') || fullName.includes('بوصه') || fullName.includes('بوصة')) {
          subCategory = 'قطع ١بوصه كيسل';
        } else {
          subCategory = 'قطع ٥٠';
        }
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
      if (fullName.includes('كيسل') || fullName.includes('٥٠ ملى')) {
        subCategory = 'قطع ٥٠ ملى كيسل الاهرام';
      } else if (fullName.includes('٧٥ ملى')) {
        subCategory = 'قطع ٧٥ ملى كيسل الاهرام';
      } else if (fullName.includes('١١٠ ملى')) {
        subCategory = 'قطع ١١٠ ملى كيسل الاهرام';
      } else if (fullName.includes('١٦٠ ملى')) {
        subCategory = 'قطع ١٦٠ ملى كيسل الاهرام';
      } else if (fullName.includes('بولي') || fullName.includes('٢/١')) {
        subCategory = 'قطع ٢/١ بولى الاهرام';
      } else if (fullName.includes('٤/٣')) {
        subCategory = 'قطع ٤/٣ بولى الاهرام';
      } else if (fullName.includes('ابيض') || fullName.includes('أبيض')) {
        if (fullName.includes('1.5') || fullName.includes('١.٥')) subCategory = 'قطع ١,٥ ابيض الاهرام';
        else if (fullName.includes('2') || fullName.includes('٢')) subCategory = 'قطع ٢بوصه الاهرام ابيض';
        else if (fullName.includes('3') || fullName.includes('٣')) subCategory = 'قطع ٣بوصه الاهرام ابيض';
        else if (fullName.includes('4') || fullName.includes('٤')) subCategory = 'قطع ٤بوصه الاهرام ابيض';
        else if (fullName.includes('6') || fullName.includes('٦')) subCategory = 'قطع ٦بوصه الاهرام ابيض';
        else subCategory = 'قطع ١بوصه الاهرام ابيض';
      } else {
        subCategory = 'قطع ٢/١ بولى الاهرام';
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
      if (selectedGroup.name === 'Br' || selectedGroup.name === 'BR') {
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

      // ترتيب مخصص لمجموعات اسمارت ابيض
      if (selectedGroup.name === 'اسمارت ابيض' || selectedGroup.name === 'سمارت ابيض') {
        const SMART_WHITE_SUBCATEGORIES_ORDER = [
          'بوصه 6',
          'بوصه 4',
          'بوصه 3',
          'بوصه 2',
          'بوصه ١,٥',
          '١بوصه'
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
      if (selectedGroup.name === 'كيسيل' || selectedGroup.name === 'كيسل') {
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
          'قطع ١بوصه كيسل'
        ];
        const orderMap = {};
        KESSEL_ORDER.forEach((name, idx) => {
          orderMap[name] = idx;
        });

        filtered.sort((a, b) => {
          const orderA = orderMap[a.name] !== undefined ? orderMap[a.name] : 999;
          const orderB = orderMap[b.name] !== undefined ? orderMap[b.name] : 999;
          return orderA - orderB;
        });
      }

      // ترتيب مخصص لمجموعات قطع اكوا استار
      if (selectedGroup.name === 'قطع اكوا استار') {
        const AQUA_STAR_ORDER = [
          'قطع ١/٢ بوصة اكوا استار',
          'قطع ٣/٤ بوصة اكوا استار',
          'قطع ١ بوصة اكوا استار',
          'قطع ١,٥ بوصة اكوا استار',
          'قطع ٢ بوصة اكوا استار'
        ];
        const orderMap = {};
        AQUA_STAR_ORDER.forEach((name, idx) => {
          orderMap[name] = idx;
        });

        filtered.sort((a, b) => {
          const orderA = orderMap[a.name] !== undefined ? orderMap[a.name] : 999;
          const orderB = orderMap[b.name] !== undefined ? orderMap[b.name] : 999;
          return orderA - orderB;
        });
      }

      // ترتيب مخصص لمجموعات حنفيات ونواكل
      if (selectedGroup.name === 'مجموعه حنفيات+نواكل' || selectedGroup.id === 'مجموعه حنفيات+نواكل') {
        const FAUCETS_NICKELS_ORDER = [
          'محبس زاوية',
          'حنفيات',
          'قلب+اوكرة+قنطرة',
          'نبل + مساليب نيكل',
          'حنفيات غساله',
          'مجموعه نواكل متعدده'
        ];
        const orderMap = {};
        FAUCETS_NICKELS_ORDER.forEach((name, idx) => {
          orderMap[name] = idx;
        });

        filtered.sort((a, b) => {
          const orderA = orderMap[a.name] !== undefined ? orderMap[a.name] : 999;
          const orderB = orderMap[b.name] !== undefined ? orderMap[b.name] : 999;
          return orderA - orderB;
        });
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
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-3">
            {displayedProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => onAddToCart(product)}
                className="pos-product-card bg-white cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-blue-400 hover:-translate-y-0.5 border-2 border-slate-200 flex flex-col rounded-xl group"
              >
                {/* اسم المنتج */}
                <div className="flex-1 overflow-hidden">
                  <div className="text-right leading-tight">
                    {renderProductTitleAndSize(product.name)}
                  </div>
                </div>

                {/* السعر */}
                <div className="pt-1 mt-1 border-t border-emerald-100 flex justify-between items-center">
                  <span className="text-slate-400 text-xs font-semibold">السعر</span>
                  <span className="text-emerald-700 font-black text-xl leading-none">
                    {Number(product.price || 0).toLocaleString('ar-EG')}
                    <span className="text-sm font-bold text-emerald-600 mr-1">ج.م</span>
                  </span>
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
