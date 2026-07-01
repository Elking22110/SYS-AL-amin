import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Package,
  Filter,
  Download,
  Upload,
  Tag,
  AlertTriangle,
  FolderPlus,
  Image,
  Camera,
  X,
  Shield
} from 'lucide-react';
import { useNotifications } from '../components/NotificationSystem';
import { ImageManager } from '../utils/imageManager';
import soundManager from '../utils/soundManager.js';
import emojiManager from '../utils/emojiManager.js';
import { formatDate, formatTimeOnly } from '../utils/dateUtils.js';
import { useAuth } from '../components/AuthProvider';
import { publish, subscribe, EVENTS } from '../utils/observerManager';
import safeMath from '../utils/safeMath.js';
import databaseManager from '../utils/database';

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
      <span className="font-bold text-slate-800 text-sm md:text-base leading-snug">
        {title}
      </span>
      {/* المقاسات في الأسفل على سطر منفصل تماماً */}
      {sizes.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1 justify-start shrink-0">
          {sizes.map((size, idx) => (
            <span
              key={idx}
              className="inline-block font-mono font-black text-[11px] md:text-[13px] text-blue-700 bg-blue-50/80 px-2 py-0.5 rounded border border-blue-300 shadow-xs"
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

const Products = () => {
  const { user, hasPermission } = useAuth();
  const {
    notifyProductAdded,
    notifyProductUpdated,
    notifyProductDeleted,
    notifyCategoryAdded,
    notifyCategoryUpdated,
    notifyCategoryDeleted,
    notifyValidationError,
    notifyDuplicateError
  } = useNotifications();

  // فحص الصلاحيات (استثناء للمدير العام)
  if (user?.role !== 'admin' && !hasPermission('manage_products')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <div className="glass-card p-8 text-center max-w-md mx-4">
          <div className="w-20 h-20 bg-red-500 bg-opacity-20 rounded-full mx-auto mb-6 flex items-center justify-center">
            <Shield className="h-10 w-10 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">غير مصرح لك</h2>
          <p className="text-purple-200 mb-6">
            ليس لديك صلاحية للوصول إلى صفحة المنتجات. يرجى التواصل مع المدير.
          </p>
          <div className="text-sm text-slate-500">
            دورك الحالي: {user?.role === 'admin' ? 'مدير عام' : user?.role === 'manager' ? 'مدير' : 'كاشير'}
          </div>
        </div>
      </div>
    );
  }
  const [products, setProducts] = useState([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    category: 'خلاطات وصنابير',
    stock: '',
    minStock: ''
  });
  const [productImages, setProductImages] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  // تعريف الفئات قبل أي استخدام لها في callbacks
  const [categories, setCategories] = useState([]);

  // مُحدّث فوري للحالة من التخزين المحلي
  const forceReloadProductsAndCategories = React.useCallback(() => {
    try {
      const savedProducts = JSON.parse(localStorage.getItem('products') || '[]');
      setProducts(Array.isArray(savedProducts) ? savedProducts : []);
    } catch (_) {
      setProducts([]);
    }
    try {
      const savedCategories = JSON.parse(localStorage.getItem('productCategories') || '[]');
      setCategories(Array.isArray(savedCategories) ? savedCategories : []);
    } catch (_) {
      setCategories([]);
    }
  }, [setProducts, setCategories]);

  // التحقق من صحة اسم المنتج
  const validateProductName = (name) => {
    if (!name || name.trim().length === 0) {
      return { isValid: false, message: 'اسم المنتج مطلوب' };
    }
    if (name.trim().length < 2) {
      return { isValid: false, message: 'اسم المنتج يجب أن يكون أكثر من حرفين' };
    }
    if (name.trim().length > 100) {
      return { isValid: false, message: 'اسم المنتج يجب أن يكون أقل من 100 حرف' };
    }
    return { isValid: true, message: '' };
  };

  // التحقق من صحة السعر
  const validatePrice = (price) => {
    if (!price || price === '') {
      return { isValid: false, message: 'السعر مطلوب' };
    }
    const numPrice = parseFloat(price);
    if (isNaN(numPrice)) {
      return { isValid: false, message: 'السعر يجب أن يكون رقماً صحيحاً' };
    }
    if (numPrice <= 0) {
      return { isValid: false, message: 'السعر يجب أن يكون أكبر من صفر' };
    }
    if (numPrice > 999999) {
      return { isValid: false, message: 'السعر كبير جداً (أكثر من 999,999)' };
    }
    return { isValid: true, message: '' };
  };

  // التحقق من صحة المخزون
  const validateStock = (stock) => {
    if (!stock || stock === '') {
      return { isValid: false, message: 'المخزون مطلوب' };
    }
    const numStock = parseInt(stock);
    if (isNaN(numStock)) {
      return { isValid: false, message: 'المخزون يجب أن يكون رقماً صحيحاً' };
    }
    if (numStock < 0) {
      return { isValid: false, message: 'المخزون لا يمكن أن يكون سالباً' };
    }
    if (numStock > 99999) {
      return { isValid: false, message: 'المخزون كبير جداً (أكثر من 99,999)' };
    }
    return { isValid: true, message: '' };
  };

  // التحقق من صحة الحد الأدنى للمخزون
  const validateMinStock = (minStock, stock) => {
    if (!minStock || minStock === '') {
      return { isValid: false, message: 'الحد الأدنى للمخزون مطلوب' };
    }
    const numMinStock = parseInt(minStock);
    const numStock = parseInt(stock);
    if (isNaN(numMinStock)) {
      return { isValid: false, message: 'الحد الأدنى للمخزون يجب أن يكون رقماً صحيحاً' };
    }
    if (numMinStock < 0) {
      return { isValid: false, message: 'الحد الأدنى للمخزون لا يمكن أن يكون سالباً' };
    }
    if (numMinStock > numStock) {
      return { isValid: false, message: 'الحد الأدنى للمخزون لا يمكن أن يكون أكبر من المخزون الحالي' };
    }
    return { isValid: true, message: '' };
  };
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: ''
  });


  // تحميل البيانات من localStorage عند بدء التطبيق (بدون بيانات افتراضية)
  useEffect(() => {
    try {
      const savedProducts = JSON.parse(localStorage.getItem('products') || '[]');
      const productsArr = Array.isArray(savedProducts) ? savedProducts : [];
      setProducts(productsArr);
    } catch (_) {
      setProducts([]);
    }
    try {
      const savedCategories = JSON.parse(localStorage.getItem('productCategories') || '[]');
      const catsArr = Array.isArray(savedCategories) ? savedCategories : [];
      // دمج أي فئات موجودة داخل قائمة المنتجات وغير موجودة في قائمة الفئات
      const productsNow = JSON.parse(localStorage.getItem('products') || '[]');
      const productCategoryNames = Array.from(new Set((productsNow || []).map(p => p && p.category).filter(Boolean)));
      const have = new Set(catsArr.map(c => c && c.name));
      const missing = productCategoryNames.filter(n => !have.has(n)).map(name => ({ name, description: '' }));
      const merged = missing.length > 0 ? [...catsArr, ...missing] : catsArr;

      // Ensure 'خامات توريد' always exists
      const hasSupplyCategory = merged.some(c => c.name === 'خامات توريد');
      if (!hasSupplyCategory) {
        merged.push({ name: 'خامات توريد', description: 'مواد التوريد المرتبطة بالموردين (ثابتة)' });
      }

      setCategories(merged);
      if (missing.length > 0 || !hasSupplyCategory) {
        try { localStorage.setItem('productCategories', JSON.stringify(merged)); } catch (_) { }
      }
    } catch (_) {
      setCategories([]);
    }
  }, []);

  // مسح كل البيانات القديمة وتحويل النظام لمتجر أدوات صحية مع استيراد كافة البيانات المستخرجة
  useEffect(() => {
    const runMigration = async () => {
      try {
        const migrationDone = localStorage.getItem('migration_sanitary_alamin_v3') === 'true';
        if (migrationDone) return;

        console.log('جارِ استيراد قاعدة بيانات الأدوات الصحية الكاملة لمتجر الأمين...');
        const response = await fetch('/products_seed.json');
        if (!response.ok) {
          throw new Error('فشل تحميل ملف البيانات الأولية للمنتجات');
        }
        const seedData = await response.json();
        const categories = seedData.categories || [];
        const products = seedData.products || [];

        // مسح كل البيانات القديمة
        const keysToClear = [
          'products', 'productCategories', 'sales', 'customers',
          'suppliers', 'supplier_supplies', 'supplier_payments',
          'shifts', 'activeShift', 'notifications',
          'reseed_done_msgroupplast_v3', 'reseed_done_msgroupplast_v2',
          'reseed_done_msgroupplast_v1', 'pos-settings', 
          'migration_sanitary_alamin_v1', 'migration_sanitary_alamin_v2'
        ];
        keysToClear.forEach(k => { try { localStorage.removeItem(k); } catch (_) {} });

        // مسح IndexedDB القديمة وإعادة تهيئتها بالبيانات الكاملة
        try {
          await databaseManager.importData({
            products: products,
            categories: categories,
            users: [
              {
                id: 'admin',
                username: 'admin',
                email: 'admin@alaminstore.com',
                role: 'admin',
                name: 'المدير العام'
              }
            ]
          });
          console.log('تم استيراد البيانات إلى IndexedDB بنجاح');
        } catch (dbErr) {
          console.error('خطأ أثناء تهيئة قاعدة البيانات:', dbErr);
        }

        localStorage.setItem('productCategories', JSON.stringify(categories));
        localStorage.setItem('products', JSON.stringify(products));
        localStorage.setItem('migration_sanitary_alamin_v3', 'true');

        setCategories(categories);
        setProducts(products);

        try { publish(EVENTS.CATEGORIES_CHANGED, { type: 'migration_seed', count: categories.length }); } catch (_) {}
        try { publish(EVENTS.PRODUCTS_CHANGED, { type: 'migration_seed', count: products.length }); } catch (_) {}
        console.log('اكتملت هجرة البيانات بنجاح لعدد ' + products.length + ' منتج!');
      } catch (err) {
        console.error('حدث خطأ أثناء استيراد البيانات الأولية:', err);
      }
    };

    runMigration();
  }, []);

  // بذرة بيانات أساسية - أدوات صحية (مرة واحدة فقط إذا كانت القوائم فارغة)
  useEffect(() => {
    try {
      const savedProducts = JSON.parse(localStorage.getItem('products') || '[]');
      const savedCategories = JSON.parse(localStorage.getItem('productCategories') || '[]');
      if ((Array.isArray(savedProducts) && savedProducts.length > 0) || (Array.isArray(savedCategories) && savedCategories.length > 0)) {
        return;
      }

      const sanitaryCategories = [
        { name: 'خلاطات وصنابير', description: 'خلاطات حمام ومطبخ - جميع الماركات والأحجام' },
        { name: 'أطباق توواليت', description: 'أطباق توواليت صيني وأوروبي' },
        { name: 'أحواض', description: 'أحواض حمام وغسيل' },
        { name: 'شاور وكابينات', description: 'وحدات استحمام وكابينات زجاجية' },
        { name: 'أنابيب وتوصيلات', description: 'مواسير PVC وتوصيلات' },
        { name: 'عدد ومستلزمات', description: 'أدوات سباكة وعدد صيانة' },
        { name: 'أطقم حمام', description: 'أطقم حمام كاملة صيني وأوروبي' },
        { name: 'خزانات مياه', description: 'خزانات مياه أرضية وعلوية' },
        { name: 'خامات توريد', description: 'مواد التوريد المرتبطة بالموردين (ثابتة)' }
      ];

      localStorage.setItem('productCategories', JSON.stringify(sanitaryCategories));
      localStorage.setItem('products', JSON.stringify([]));
      setCategories(sanitaryCategories);
      setProducts([]);
      try { publish(EVENTS.CATEGORIES_CHANGED, { type: 'seed', count: sanitaryCategories.length }); } catch (_) {}
    } catch (_) {}
  }, [setProducts, setCategories]);

  // (تم استبدال seed النايلون القديم بـ seed أدوات صحية في الـ useEffect أعلاه)

  // مزامنة الفئات مع فئات المنتجات: إضافة أي فئة تظهر داخل المنتجات وغير موجودة في قائمة الفئات
  useEffect(() => {
    try {
      const categoryNameSet = new Set((categories || []).map(c => c && c.name));
      const missing = Array.from(new Set((products || []).map(p => p && p.category).filter(Boolean)))
        .filter(name => !categoryNameSet.has(name))
        .map(name => ({ name, description: '' }));
      if (missing.length > 0) {
        const merged = [...categories, ...missing];
        setCategories(merged);
        try { localStorage.setItem('productCategories', JSON.stringify(merged)); } catch (_) { }
        try { publish(EVENTS.CATEGORIES_CHANGED, { type: 'sync_from_products', added: missing.length }); } catch (_) { }
      }
    } catch (_) { }
  }, [products]);

  // تحميل صور المنتجات الموجودة
  useEffect(() => {
    // تحميل صور المنتجات الموجودة بدلاً من حذفها
    const savedImages = JSON.parse(localStorage.getItem('productImages') || '{}');
    setProductImages(savedImages);
    console.log('تم تحميل صور المنتجات الموجودة:', Object.keys(savedImages).length, 'صورة');
  }, []);

  // إدارة صور المنتجات
  const handleImageUpload = async (productId, file) => {
    try {
      const imageData = await ImageManager.saveProductImage(productId, file);
      setProductImages(prev => ({
        ...prev,
        [productId]: imageData
      }));
      return imageData;
    } catch (error) {
      console.error('خطأ في رفع الصورة:', error);
      return null;
    }
  };

  const handleImageDelete = (productId) => {
    ImageManager.deleteProductImage(productId);
    setProductImages(prev => {
      const newImages = { ...prev };
      delete newImages[productId];
      return newImages;
    });
  };

  const openImageModal = (productId) => {
    setSelectedImage(productId);
    setShowImageModal(true);
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    setSelectedImage(null);
  };

  // إضافة فئة جديدة
  const handleAddCategory = () => {
    if (!newCategory.name.trim()) {
      notifyValidationError('اسم الفئة', 'اسم الفئة مطلوب ولا يمكن أن يكون فارغاً');
      return;
    }

    // التحقق من عدم وجود فئة بنفس الاسم
    const categoryExists = categories.some(cat => cat.name === newCategory.name);
    if (categoryExists) {
      notifyDuplicateError(newCategory.name, 'فئة');
      return;
    }

    const updatedCategories = [...categories, { ...newCategory }];
    setCategories(updatedCategories);

    // حفظ الفئات في localStorage
    localStorage.setItem('productCategories', JSON.stringify(updatedCategories));

    // إرسال إشارة لتحديث نقطة البيع فورياً
    window.dispatchEvent(new CustomEvent('categoriesUpdated', {
      detail: {
        action: 'added',
        category: newCategory,
        categories: updatedCategories
      }
    }));

    // نشر حدث تغيير الفئات
    publish(EVENTS.CATEGORIES_CHANGED, {
      type: 'create',
      category: newCategory,
      categories: updatedCategories
    });

    // إعادة تعيين النموذج
    setNewCategory({ name: '', description: '' });
    setShowAddCategoryModal(false);

    // إشعار نجاح إضافة الفئة
    notifyCategoryAdded(newCategory.name);
  };

  // حذف فئة
  const handleDeleteCategory = (categoryName) => {
    if (categoryName === 'الكل') {
      alert('لا يمكن حذف فئة "الكل"');
      return;
    }

    if (categoryName === 'خامات توريد') {
      alert('لا يمكن حذف الفئة الثابتة "خامات توريد"');
      return;
    }

    // التحقق من وجود منتجات في هذه الفئة
    const productsInCategory = products.filter(product => product.category === categoryName);
    if (productsInCategory.length > 0) {
      alert(`لا يمكن حذف هذه الفئة لأنها تحتوي على ${productsInCategory.length} منتج. يرجى نقل المنتجات إلى فئة أخرى أولاً.`);
      return;
    }

    if (window.confirm(`هل أنت متأكد من حذف فئة "${categoryName}"؟`)) {
      const updatedCategories = categories.filter(cat => cat.name !== categoryName);
      setCategories(updatedCategories);

      // حفظ الفئات في localStorage
      localStorage.setItem('productCategories', JSON.stringify(updatedCategories));

      // نشر حدث تغيير الفئات
      publish(EVENTS.CATEGORIES_CHANGED, {
        type: 'delete',
        categoryName: categoryName,
        categories: updatedCategories
      });

      // إشعار نجاح حذف الفئة
      notifyCategoryDeleted(categoryName);
    }
  };

  // تحميل الفئات المحفوظة بدون إدخال بيانات افتراضية
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('productCategories') || '[]');
      setCategories(Array.isArray(saved) ? saved : []);
    } catch (_) {
      setCategories([]);
    }
  }, []);

  const [visibleCount, setVisibleCount] = useState(30);

  useEffect(() => {
    setVisibleCount(30);
  }, [searchTerm, selectedCategory]);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'الكل' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const displayedProducts = filteredProducts.slice(0, visibleCount);

  // الحصول على قائمة أسماء الفئات للفلترة
  const categoryNames = ['الكل', ...categories.map(cat => cat.name)];

  const handleAddProduct = () => {
    // التحقق من صحة البيانات
    if (!newProduct.name.trim()) {
      notifyValidationError('اسم المنتج', 'اسم المنتج مطلوب ولا يمكن أن يكون فارغاً');
      return;
    }

    if (!newProduct.price || parseFloat(newProduct.price) <= 0) {
      notifyValidationError('السعر', 'السعر مطلوب ويجب أن يكون أكبر من صفر');
      return;
    }

    // التحقق من عدم تكرار اسم المنتج
    const existingProduct = products.find(p => p.name.toLowerCase() === newProduct.name.toLowerCase());
    if (existingProduct) {
      notifyDuplicateError(newProduct.name, 'منتج');
      return;
    }

    // التحقق من صحة الفئة المختارة
    const categoryExists = categories.some(cat => cat.name === newProduct.category);
    if (!categoryExists) {
      notifyValidationError('الفئة', 'يرجى اختيار فئة صحيحة من القائمة');
      return;
    }

    const product = {
      id: Date.now(),
      ...newProduct,
      price: parseFloat(newProduct.price),
      stock: parseInt(newProduct.stock) || 0,
      minStock: parseInt(newProduct.minStock) || 0
    };
    const updatedProducts = [...products, product];
    setProducts(updatedProducts);

    // حفظ المنتجات في localStorage
    localStorage.setItem('products', JSON.stringify(updatedProducts));

    // إرسال إشارة لتحديث نقطة البيع فورياً
    window.dispatchEvent(new CustomEvent('productsUpdated', {
      detail: {
        action: 'added',
        product: product,
        products: updatedProducts
      }
    }));

    // نشر حدث تغيير المنتجات
    publish(EVENTS.PRODUCTS_CHANGED, {
      type: 'create',
      product: product,
      products: updatedProducts
    });

    setNewProduct({
      name: '',
      price: '',
      category: categories.length > 0 ? categories[0].name : 'خلاطات وصنابير',
      stock: '',
      minStock: ''
    });
    setShowAddModal(false);

    // إشعار نجاح الإضافة
    notifyProductAdded(product.name);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setNewProduct(product);
    setShowAddModal(true);
  };

  const handleUpdateProduct = () => {
    if (editingProduct && newProduct.name && newProduct.price) {
      const updatedProduct = {
        ...editingProduct,
        ...newProduct,
        price: parseFloat(newProduct.price),
        stock: parseInt(newProduct.stock) || 0,
        minStock: parseInt(newProduct.minStock) || 0
      };
      const updatedProducts = products.map(p => p.id === editingProduct.id ? updatedProduct : p);
      setProducts(updatedProducts);

      // حفظ المنتجات في localStorage
      localStorage.setItem('products', JSON.stringify(updatedProducts));

      // إرسال إشارة لتحديث نقطة البيع فورياً
      window.dispatchEvent(new CustomEvent('productsUpdated', {
        detail: {
          action: 'updated',
          product: updatedProduct,
          products: updatedProducts
        }
      }));

      // نشر حدث تغيير المنتجات
      publish(EVENTS.PRODUCTS_CHANGED, {
        type: 'update',
        product: updatedProduct,
        products: updatedProducts
      });

      setEditingProduct(null);
      setNewProduct({
        name: '',
        price: '',
        category: categories.length > 0 ? categories[0].name : 'خلاطات وصنابير',
        stock: '',
        minStock: ''
      });
      setShowAddModal(false);

      // إشعار نجاح التحديث
      notifyProductUpdated(updatedProduct.name);
    }
  };

  const handleDeleteProduct = (id) => {
    const product = products.find(p => p.id === id);
    if (window.confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
      const updatedProducts = products.filter(p => p.id !== id);
      setProducts(updatedProducts);

      // حفظ المنتجات في localStorage
      localStorage.setItem('products', JSON.stringify(updatedProducts));

      // إرسال إشارة لتحديث نقطة البيع فورياً
      window.dispatchEvent(new CustomEvent('productsUpdated', {
        detail: {
          action: 'deleted',
          product: product,
          products: updatedProducts
        }
      }));

      // نشر حدث تغيير المنتجات
      publish(EVENTS.PRODUCTS_CHANGED, {
        type: 'delete',
        productId: id,
        products: updatedProducts
      });

      // إشعار نجاح الحذف
      notifyProductDeleted(product.name);
    }
  };

  const lowStockProducts = products.filter(p => p.stock <= p.minStock);
  console.log('=== حساب المنتجات منخفضة المخزون ===');
  console.log('المنتجات:', products.length);
  console.log('المنتجات منخفضة المخزون:', lowStockProducts.length);
  console.log('تفاصيل المنتجات منخفضة المخزون:', lowStockProducts.map(p => `${p.name}: ${p.stock}/${p.minStock}`));
  console.log('جميع المنتجات:', products.map(p => `${p.name}: ${p.stock}/${p.minStock}`));
  console.log('=== نهاية الحساب ===');

  // فحص المخزون المنخفض (بدون إشعارات)
  useEffect(() => {
    console.log('useEffect triggered - products:', products.length, 'lowStock:', lowStockProducts.length);
    if (products.length > 0 && lowStockProducts.length > 0) {
      console.log('منتجات منخفضة المخزون:', lowStockProducts.length);
      // تم إلغاء الإشعارات - فقط تتبع في console
      lowStockProducts.forEach(product => {
        console.log('منتج منخفض المخزون:', product.name, 'المخزون:', product.stock, 'الحد الأدنى:', product.minStock);
      });
    } else {
      console.log('لا توجد منتجات منخفضة المخزون أو المنتجات غير محملة');
    }
  }, [products, lowStockProducts]);

  // الاشتراك في أحداث تغيير المنتجات من صفحات أخرى
  useEffect(() => {
    const reloadProducts = () => {
      const savedProducts = JSON.parse(localStorage.getItem('products') || '[]');
      setProducts(savedProducts);
      console.log('🔄 تم إعادة تحميل المنتجات:', savedProducts.length);
    };

    const reloadCategories = () => {
      const savedCategories = JSON.parse(localStorage.getItem('productCategories') || '[]');
      setCategories(savedCategories);
      console.log('🔄 تم إعادة تحميل الفئات:', savedCategories.length);
    };

    // الاشتراك في أحداث تغيير المنتجات — تحديث فوري للصفحة بدون انتظار
    const unsubscribe = subscribe(EVENTS.PRODUCTS_CHANGED, (payload) => {
      console.log('📨 استقبال حدث تغيير المنتجات (تحديث فوري):', payload);
      try { window.location.reload(); } catch (_) { reloadProducts(); }
    });

    // الاشتراك في أحداث تغيير الفئات — تحديث فوري للصفحة بدون انتظار
    const unsubscribeCategories = subscribe(EVENTS.CATEGORIES_CHANGED, (payload) => {
      console.log('📨 استقبال حدث تغيير الفئات (تحديث فوري):', payload);
      try { window.location.reload(); } catch (_) { reloadCategories(); }
    });

    // الاشتراك في أحداث استيراد البيانات
    const unsubscribeImport = subscribe(EVENTS.DATA_IMPORTED, (payload) => {
      if (payload.includes?.('products')) {
        console.log('📨 استقبال حدث استيراد المنتجات');
        reloadProducts();
      }
      if (payload.includes?.('categories')) {
        console.log('📨 استقبال حدث استيراد الفئات');
        reloadCategories();
      }
    });

    return () => {
      unsubscribe();
      unsubscribeCategories();
      unsubscribeImport();
    };
  }, []);

  // الاستماع لتغييرات التخزين (احتياطي) وتحديث فوري داخل نفس الصفحة
  useEffect(() => {
    const onStorage = (e) => {
      if (!e || !e.key) return;
      if (e.key === 'products' || e.key === 'productCategories' || (e.key.startsWith('__evt__:'))) {
        forceReloadProductsAndCategories();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [forceReloadProductsAndCategories]);

  // useEffect منفصل لتحديث المنتجات منخفضة المخزون
  useEffect(() => {
    console.log('=== useEffect منفصل للمنتجات منخفضة المخزون ===');
    console.log('المنتجات في useEffect:', products.length);
    const calculatedLowStock = products.filter(p => p.stock <= p.minStock);
    console.log('المنتجات منخفضة المخزون المحسوبة:', calculatedLowStock.length);
    console.log('تفاصيل المنتجات منخفضة المخزون المحسوبة:', calculatedLowStock.map(p => `${p.name}: ${p.stock}/${p.minStock}`));
    console.log('=== نهاية useEffect منفصل ===');
  }, [products]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Animation */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-5 animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-5 animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-40 left-40 w-96 h-96 bg-green-500 rounded-full mix-blend-multiply filter blur-3xl opacity-5 animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="relative z-10 p-3 md:p-4 lg:p-6 xl:p-8 space-y-3 md:space-y-4 lg:space-y-6 xl:space-y-8 max-w-full overflow-x-hidden">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
          <div className="flex-1">
            <h1 className="text-sm md:text-base lg:text-lg xl:text-xl font-bold text-slate-900 mb-2 md:mb-3">
              إدارة المنتجات
            </h1>
            <p className="text-slate-600 text-xs md:text-xs lg:text-sm xl:text-sm font-medium">إدارة مخزون الأدوات الصحية - متجر الأمين</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                soundManager.play('openWindow');
                setShowAddModal(true);
              }}
              className="btn-primary flex items-center px-3 md:px-4 py-2 md:py-3 text-xs md:text-xs lg:text-sm font-semibold min-h-[40px] cursor-pointer"
              style={{
                pointerEvents: 'auto',
                zIndex: 10,
                position: 'relative'
              }}
            >
              <Plus className="h-4 w-4 md:h-5 md:w-5 mr-2 md:mr-3" />
              إضافة منتج جديد
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowAddCategoryModal(true);
              }}
              className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-slate-800 px-3 md:px-4 py-2 md:py-3 rounded-lg text-xs md:text-xs lg:text-sm font-semibold transition-all duration-300 flex items-center min-h-[40px] cursor-pointer"
              style={{
                pointerEvents: 'auto',
                zIndex: 10,
                position: 'relative'
              }}
            >
              <FolderPlus className="h-4 w-4 md:h-5 md:w-5 mr-2 md:mr-3" />
              إضافة فئة جديدة
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 ipad-grid ipad-pro-grid gap-3 md:gap-4 lg:gap-6 xl:gap-8">
          <div className="glass-card hover-lift group cursor-pointer p-4 md:p-6 lg:p-8">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-600 mb-1 uppercase tracking-wide">إجمالي المنتجات</p>
                <p className="text-lg md:text-xl lg:text-2xl font-bold text-slate-800 mb-2">{products.length}</p>
                <div className="flex items-center text-xs">
                  <span className="text-blue-300 font-medium">منتجات متاحة</span>
                </div>
              </div>
              <div className="p-2 md:p-3 lg:p-4 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl md:rounded-2xl group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Package className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6 text-slate-800" />
              </div>
            </div>
          </div>

          <div className="glass-card hover-lift group cursor-pointer p-4 md:p-6 lg:p-8">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-600 mb-1 uppercase tracking-wide">قيمة المخزون</p>
                <p className="text-lg md:text-xl lg:text-2xl font-bold text-slate-800 mb-2">
                  ${products.reduce((total, p) => safeMath.add(total, safeMath.multiply(p.price, p.stock)), 0).toLocaleString('en-US')}
                </p>
                <div className="flex items-center text-xs">
                  <span className="text-green-300 font-medium">قيمة المخزون</span>
                </div>
              </div>
              <div className="p-2 md:p-3 lg:p-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl md:rounded-2xl group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Tag className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6 text-slate-800" />
              </div>
            </div>
          </div>

          <div className="glass-card hover-lift group cursor-pointer p-6 md:p-8 lg:p-10 xl:p-12 col-span-2">
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <div className="flex-1">
                <p className="text-sm md:text-base font-medium text-slate-600 mb-2 uppercase tracking-wide">منخفضة المخزون</p>
                <p className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-slate-800 mb-4">{lowStockProducts.length}</p>
                {console.log('لوحة التحكم - عدد المنتجات منخفضة المخزون:', lowStockProducts.length)}
                <div className="flex items-center text-sm md:text-base">
                  <span className="text-orange-300 font-medium">تحتاج إعادة تموين</span>
                </div>
                {lowStockProducts.length > 0 && (
                  <div className="mt-4 text-sm md:text-base text-orange-200 max-h-32 md:max-h-40 overflow-y-auto">
                    {lowStockProducts.map(product => (
                      <div key={product.id} className="truncate mb-1">
                        {emojiManager.getProductEmoji(product)} {product.name}: {product.stock}/{product.minStock}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-4 md:p-5 lg:p-6 xl:p-8 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl md:rounded-2xl group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <AlertTriangle className="h-6 w-6 md:h-8 md:w-8 lg:h-10 lg:w-10 xl:h-12 xl:w-12 text-slate-800" />
              </div>
            </div>
          </div>

        </div>

        {/* Filters */}
        <div className="glass-card p-4 md:p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute right-3 md:right-4 top-1/2 transform -translate-y-1/2 text-blue-300 h-5 w-5 md:h-6 md:w-6" />
              <input
                type="text"
                placeholder="البحث بالاسم..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-modern w-full pr-12 md:pr-14 pl-3 md:pl-4 py-3 md:py-4 text-base md:text-lg text-right font-medium"
              />
            </div>

            <div className="relative">
              <Filter className="absolute right-3 md:right-4 top-1/2 transform -translate-y-1/2 text-blue-300 h-5 w-5 md:h-6 md:w-6" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="input-modern pr-12 md:pr-14 pl-3 md:pl-4 py-3 md:py-4 text-base md:text-lg text-right font-medium appearance-none bg-white border-slate-400 text-slate-800"
              >

                {categoryNames.map(category => (
                  <option key={category} value={category} className="bg-white text-slate-800">{category}</option>
                ))}
              </select>
            </div>

            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (selectedCategory === 'الكل' || !selectedCategory) { return; }
                const newName = window.prompt('أدخل اسم الفئة الجديد', selectedCategory);
                if (!newName || newName.trim() === '' || newName === selectedCategory) return;
                if (categories.some(c => c.name === newName)) { notifyDuplicateError(newName, 'فئة'); return; }
                const updatedCategories = categories.map(c => c.name === selectedCategory ? { ...c, name: newName } : c);
                setCategories(updatedCategories);
                localStorage.setItem('productCategories', JSON.stringify(updatedCategories));
                const updatedProductsLocal = products.map(p => p.category === selectedCategory ? { ...p, category: newName } : p);
                setProducts(updatedProductsLocal);
                localStorage.setItem('products', JSON.stringify(updatedProductsLocal));
                try { publish(EVENTS.CATEGORIES_CHANGED, { type: 'update', from: selectedCategory, to: newName, categories: updatedCategories }); } catch (_) { }
                try { publish(EVENTS.PRODUCTS_CHANGED, { type: 'bulk_update_category', from: selectedCategory, to: newName }); } catch (_) { }

                // إرسال إشارة لتحديث نقطة البيع فورياً
                window.dispatchEvent(new CustomEvent('categoriesUpdated', {
                  detail: {
                    action: 'updated',
                    oldCategory: selectedCategory,
                    newCategory: newName,
                    categories: updatedCategories
                  }
                }));

                notifyCategoryUpdated(selectedCategory, newName);
                setSelectedCategory(newName);
              }}
              disabled={selectedCategory === 'الكل' || !selectedCategory}
              className={`btn-primary flex items-center px-4 md:px-6 py-3 md:py-4 text-sm md:text-base font-semibold min-h-[50px] cursor-pointer ${selectedCategory === 'الكل' || !selectedCategory ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{
                pointerEvents: selectedCategory === 'الكل' || !selectedCategory ? 'none' : 'auto',
                zIndex: 10,
                position: 'relative'
              }}
            >
              <Edit className="h-5 w-5 md:h-6 md:w-6 mr-2" />
              تعديل الفئة
            </button>

            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (selectedCategory === 'الكل' || !selectedCategory) { return; }
                const productsInCategory = products.filter(p => p.category === selectedCategory);
                if (!window.confirm(`سيتم حذف الفئة "${selectedCategory}" مع ${productsInCategory.length} منتج تابع لها. هل تريد المتابعة؟`)) return;
                // حذف المنتجات التابعة لهذه الفئة
                const remainingProducts = products.filter(p => p.category !== selectedCategory);
                setProducts(remainingProducts);
                localStorage.setItem('products', JSON.stringify(remainingProducts));
                try { publish(EVENTS.PRODUCTS_CHANGED, { type: 'bulk_delete_by_category', categoryName: selectedCategory, products: remainingProducts }); } catch (_) { }

                // حذف الفئة نفسها
                const updatedCategories = categories.filter(c => c.name !== selectedCategory);
                setCategories(updatedCategories);
                localStorage.setItem('productCategories', JSON.stringify(updatedCategories));
                try { publish(EVENTS.CATEGORIES_CHANGED, { type: 'delete', categoryName: selectedCategory, categories: updatedCategories }); } catch (_) { }

                notifyCategoryDeleted(selectedCategory);
                setSelectedCategory('الكل');
              }}
              disabled={selectedCategory === 'الكل' || !selectedCategory}
              className={`bg-gradient-to-r from-red-600 to-pink-600 text-slate-800 px-4 md:px-6 py-3 md:py-4 rounded-2xl md:rounded-3xl hover:from-red-700 hover:to-pink-700 transition-all duration-300 flex items-center text-sm md:text-base font-semibold shadow-lg min-h-[50px] cursor-pointer ${selectedCategory === 'الكل' || !selectedCategory ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{
                pointerEvents: selectedCategory === 'الكل' || !selectedCategory ? 'none' : 'auto',
                zIndex: 10,
                position: 'relative'
              }}
            >
              <Trash2 className="h-5 w-5 md:h-6 md:w-6 mr-2" />
              حذف الفئة
            </button>
          </div>
        </div>

        {/* Products Table */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white bg-opacity-10">
                <tr>
                  <th className="px-4 md:px-6 py-3 md:py-4 text-right text-xs md:text-sm font-semibold text-slate-600 uppercase tracking-wider">الصورة</th>
                  <th className="px-4 md:px-6 py-3 md:py-4 text-right text-xs md:text-sm font-semibold text-slate-600 uppercase tracking-wider">المنتج</th>
                  <th className="px-4 md:px-6 py-3 md:py-4 text-right text-xs md:text-sm font-semibold text-slate-600 uppercase tracking-wider">السعر</th>
                  <th className="px-4 md:px-6 py-3 md:py-4 text-right text-xs md:text-sm font-semibold text-slate-600 uppercase tracking-wider">المخزون</th>
                  <th className="px-4 md:px-6 py-3 md:py-4 text-right text-xs md:text-sm font-semibold text-slate-600 uppercase tracking-wider">التصنيف</th>
                  <th className="px-4 md:px-6 py-3 md:py-4 text-right text-xs md:text-sm font-semibold text-slate-600 uppercase tracking-wider">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white divide-opacity-10">
                {selectedCategory === '' && (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-blue-300 text-sm">
                      اختر فئة من الفلترة لعرض المنتجات
                    </td>
                  </tr>
                )}
                {displayedProducts.map((product, index) => (
                  <tr key={product.id} className="hover:bg-white hover:bg-opacity-5 transition-all duration-300">
                    <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center">
                        <div className="relative group">
                          <div className="w-12 h-12 md:w-16 md:h-16 rounded-lg md:rounded-xl overflow-hidden border-2 border-slate-400 hover:border-blue-500 transition-colors duration-300">
                            {productImages[product.id] ? (
                              <img
                                src={productImages[product.id]}
                                alt={product.name}
                                className="w-full h-full object-cover"
                                onClick={() => openImageModal(product.id)}
                              />
                            ) : (
                              <img
                                src={ImageManager.getDefaultImage(product.category)}
                                alt={product.name}
                                className="w-full h-full object-cover"
                                onClick={() => openImageModal(product.id)}
                              />
                            )}
                          </div>
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 rounded-lg md:rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <div className="flex space-x-1">
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  document.getElementById(`image-upload-${product.id}`).click();
                                }}
                                className="p-1 bg-blue-500 rounded-full hover:bg-blue-600 transition-colors duration-300 min-w-[24px] min-h-[24px] cursor-pointer"
                                title="رفع صورة"
                                style={{
                                  pointerEvents: 'auto',
                                  zIndex: 10,
                                  position: 'relative'
                                }}
                              >
                                <Camera className="h-3 w-3 text-slate-800" />
                              </button>
                              {productImages[product.id] && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleImageDelete(product.id);
                                  }}
                                  className="p-1 bg-red-500 rounded-full hover:bg-red-600 transition-colors duration-300 min-w-[24px] min-h-[24px] cursor-pointer"
                                  title="حذف الصورة"
                                  style={{
                                    pointerEvents: 'auto',
                                    zIndex: 10,
                                    position: 'relative'
                                  }}
                                >
                                  <X className="h-3 w-3 text-slate-800" />
                                </button>
                              )}
                            </div>
                          </div>
                          <input
                            id={`image-upload-${product.id}`}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files[0]) {
                                handleImageUpload(product.id, e.target.files[0]);
                              }
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap">
                          <div className="text-sm md:text-base font-semibold text-slate-800 text-right" style={{ direction: 'rtl', unicodeBidi: 'plaintext' }}>
                            <div className="flex items-center">
                              <span className="ml-2 shrink-0">{emojiManager.getProductEmoji(product)}</span>
                              {renderProductTitleAndSize(product.name)}
                            </div>
                          </div>
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap text-sm md:text-base text-slate-800 font-semibold">${product.price}</td>
                    <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 md:px-3 py-1 md:py-2 text-xs md:text-sm font-semibold rounded-full ${product.stock <= product.minStock
                        ? 'bg-red-500 bg-opacity-20 text-red-300 border border-red-500 border-opacity-30'
                        : 'bg-green-500 bg-opacity-20 text-green-300 border border-green-500 border-opacity-30'
                        }`}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap text-sm md:text-base text-blue-300 font-medium">{product.category}</td>
                    <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2 md:space-x-3">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            soundManager.play('update');
                            handleEditProduct(product);
                          }}
                          className="p-2 bg-blue-500 bg-opacity-20 rounded-xl hover:bg-opacity-30 transition-all duration-300 text-blue-300 hover:text-blue-200 min-w-[40px] min-h-[40px] cursor-pointer"
                          style={{
                            pointerEvents: 'auto',
                            zIndex: 10,
                            position: 'relative'
                          }}
                        >
                          <Edit className="h-4 w-4 md:h-5 md:w-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            soundManager.play('delete');
                            handleDeleteProduct(product.id);
                          }}
                          className="p-2 bg-red-500 bg-opacity-20 rounded-xl hover:bg-opacity-30 transition-all duration-300 text-red-300 hover:text-red-200 min-w-[40px] min-h-[40px] cursor-pointer"
                          style={{
                            pointerEvents: 'auto',
                            zIndex: 10,
                            position: 'relative'
                          }}
                        >
                          <Trash2 className="h-4 w-4 md:h-5 md:w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredProducts.length > visibleCount && (
            <div className="flex justify-center p-4 border-t border-white border-opacity-10">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setVisibleCount(prev => prev + 50);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold transition-all duration-200 cursor-pointer"
              >
                عرض المزيد (+50 منتج) — المعروض حالياً {visibleCount} من أصل {filteredProducts.length}
              </button>
            </div>
          )}
        </div>


        {/* نافذة إضافة فئة جديدة */}
        {showAddCategoryModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-800">إضافة فئة جديدة</h3>
                <button
                  onClick={() => {
                    setShowAddCategoryModal(false);
                    setNewCategory({ name: '', description: '' });
                  }}
                  className="text-slate-500 hover:text-slate-800 transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    اسم الفئة *
                  </label>
                  <input
                    type="text"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    className="input-modern w-full"
                    placeholder="أدخل اسم الفئة"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    وصف الفئة
                  </label>
                  <textarea
                    value={newCategory.description}
                    onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                    className="input-modern w-full h-20 resize-none"
                    placeholder="وصف مختصر للفئة"
                  />
                </div>

                {/* معاينة الفئة */}
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-slate-600 mb-2">معاينة الفئة:</h4>
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-800 font-medium">
                      {newCategory.name || 'اسم الفئة'}
                    </span>
                  </div>
                  {newCategory.description && (
                    <p className="text-sm text-slate-500 mt-1">{newCategory.description}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowAddCategoryModal(false);
                    setNewCategory({ name: '', description: '' });
                  }}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors min-h-[40px] cursor-pointer"
                  style={{
                    pointerEvents: 'auto',
                    zIndex: 10,
                    position: 'relative'
                  }}
                >
                  إلغاء
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleAddCategory();
                  }}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-slate-800 rounded-lg transition-all min-h-[40px] cursor-pointer"
                  style={{
                    pointerEvents: 'auto',
                    zIndex: 10,
                    position: 'relative'
                  }}
                >
                  إضافة الفئة
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Image Modal */}
        {showImageModal && selectedImage && (
          <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="glass-card p-6 w-full max-w-2xl mx-4 animate-fadeInUp">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-slate-800">صورة المنتج</h2>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    closeImageModal();
                  }}
                  className="p-2 bg-gray-600 rounded-full hover:bg-slate-200 transition-colors duration-300 min-w-[40px] min-h-[40px] cursor-pointer"
                  style={{
                    pointerEvents: 'auto',
                    zIndex: 10,
                    position: 'relative'
                  }}
                >
                  <X className="h-5 w-5 text-slate-800" />
                </button>
              </div>

              <div className="text-center">
                {productImages[selectedImage] ? (
                  <img
                    src={productImages[selectedImage]}
                    alt="صورة المنتج"
                    className="max-w-full max-h-96 mx-auto rounded-lg shadow-lg"
                  />
                ) : (
                  <img
                    src={ImageManager.getDefaultImage(products.find(p => p.id === selectedImage)?.category || 'إكسسوارات')}
                    alt="صورة المنتج الافتراضية"
                    className="max-w-full max-h-96 mx-auto rounded-lg shadow-lg"
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Product Modal - خارج الكارد الرئيسي تماماً */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[9999] backdrop-blur-sm"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999
          }}

        >
          <div
            className="glass-card p-6 md:p-8 w-full max-w-md mx-4 animate-fadeInUp"
            style={{
              position: 'relative',
              zIndex: 10000,
              backgroundColor: 'rgba(17, 24, 39, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-4 md:mb-6 bg-gradient-to-r from-white via-blue-200 to-indigo-300 bg-clip-text text-transparent">
              {editingProduct ? 'تعديل المنتج' : 'إضافة منتج جديد'}
            </h2>

            <div className="space-y-4 md:space-y-5">
              <div>
                <label className="block text-sm md:text-base font-semibold text-purple-200 mb-2">اسم المنتج</label>
                <input
                  type="text"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="input-modern w-full px-3 md:px-4 py-3 md:py-4 text-base md:text-lg text-right font-medium"
                  placeholder="أدخل اسم المنتج"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm md:text-base font-semibold text-purple-200 mb-2">السعر</label>
                  <input
                    type="number"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    className="input-modern w-full px-3 md:px-4 py-3 md:py-4 text-base md:text-lg text-right font-medium"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm md:text-base font-semibold text-purple-200 mb-2">التصنيف</label>
                <select
                  value={newProduct.category}
                  onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                  className="input-modern w-full px-3 md:px-4 py-3 md:py-4 text-base md:text-lg text-right font-medium appearance-none bg-white border-slate-400 text-slate-800"
                >
                  {categories.map(category => (
                    <option key={category.name} value={category.name} className="bg-white text-slate-800">{category.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm md:text-base font-semibold text-purple-200 mb-2">المخزون</label>
                  <input
                    type="number"
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                    className="input-modern w-full px-3 md:px-4 py-3 md:py-4 text-base md:text-lg text-right font-medium"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm md:text-base font-semibold text-purple-200 mb-2">الحد الأدنى</label>
                  <input
                    type="number"
                    value={newProduct.minStock}
                    onChange={(e) => setNewProduct({ ...newProduct, minStock: e.target.value })}
                    className="input-modern w-full px-3 md:px-4 py-3 md:py-4 text-base md:text-lg text-right font-medium"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 md:space-x-4 mt-6 md:mt-8">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  soundManager.play('closeWindow');
                  setShowAddModal(false);
                  setEditingProduct(null);
                  setNewProduct({
                    name: '',
                    price: '',
                    category: categories.length > 0 ? categories[0].name : 'نايلون بيور',
                    stock: '',
                    minStock: ''
                  });
                }}
                className="px-4 md:px-6 py-2 md:py-3 text-blue-300 hover:text-blue-200 font-semibold transition-colors duration-300 min-h-[40px] cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  soundManager.play('save');
                  editingProduct ? handleUpdateProduct() : handleAddProduct();
                }}
                className="btn-primary px-4 md:px-6 py-2 md:py-3 text-sm md:text-base font-semibold min-h-[40px] cursor-pointer"
              >
                {editingProduct ? 'تحديث المنتج' : 'إضافة المنتج'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Modal - خارج الكارد الرئيسي تماماً */}
      {showAddCategoryModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[9999] backdrop-blur-sm"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999
          }}

        >
          <div
            className="glass-card p-6 w-full max-w-md mx-4 animate-fadeInUp"
            style={{
              position: 'relative',
              zIndex: 10000,
              backgroundColor: 'rgba(17, 24, 39, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800">إضافة فئة جديدة</h3>
              <button
                onClick={() => {
                  soundManager.play('closeWindow');
                  setShowAddCategoryModal(false);
                  setNewCategory({ name: '', description: '' });
                }}
                className="text-slate-500 hover:text-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  اسم الفئة *
                </label>
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  className="input-modern w-full"
                  placeholder="أدخل اسم الفئة"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  وصف الفئة
                </label>
                <textarea
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  className="input-modern w-full h-20 resize-none"
                  placeholder="وصف مختصر للفئة"
                />
              </div>

              {/* معاينة الفئة */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-slate-600 mb-2">معاينة الفئة:</h4>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <span className="text-blue-400 font-medium">{newCategory.name || 'اسم الفئة'}</span>
                  <span className="text-slate-500 text-sm">({newCategory.description || 'وصف الفئة'})</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  soundManager.play('closeWindow');
                  setShowAddCategoryModal(false);
                  setNewCategory({ name: '', description: '' });
                }}
                className="px-4 py-2 text-slate-500 hover:text-slate-800 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  soundManager.play('save');
                  handleAddCategory();
                }}
                className="bg-blue-600 hover:bg-blue-700 text-slate-800 px-4 py-2 rounded-lg transition-colors"
              >
                إضافة الفئة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal - خارج الكارد الرئيسي تماماً */}
      {showImageModal && selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[9999] backdrop-blur-sm"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999
          }}

        >
          <div
            className="glass-card p-6 w-full max-w-2xl mx-4 animate-fadeInUp"
            style={{
              position: 'relative',
              zIndex: 10000,
              backgroundColor: 'rgba(17, 24, 39, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-800">صورة المنتج</h2>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  soundManager.play('closeWindow');
                  closeImageModal();
                }}
                className="p-2 bg-gray-600 rounded-full hover:bg-slate-200 transition-colors duration-300 min-w-[40px] min-h-[40px] cursor-pointer"
              >
                <X className="h-5 w-5 text-slate-800" />
              </button>
            </div>

            <div className="text-center">
              {productImages[selectedImage] ? (
                <img
                  src={productImages[selectedImage]}
                  alt="صورة المنتج"
                  className="max-w-full max-h-96 mx-auto rounded-lg shadow-lg"
                />
              ) : (
                <img
                  src={ImageManager.getDefaultImage(products.find(p => p.id === selectedImage)?.category || 'إكسسوارات')}
                  alt="صورة المنتج الافتراضية"
                  className="max-w-full max-h-96 mx-auto rounded-lg shadow-lg"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
