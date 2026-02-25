import React, { useState, useEffect, useCallback } from 'react';
import { Search, Package, Shirt, Footprints, Watch, Headphones, Smartphone, Laptop, Home, Car, Gamepad2, Book, Camera, Gift } from 'lucide-react';
import storageOptimizer from '../../utils/storageOptimizer.js';
import errorHandler from '../../utils/errorHandler.js';
import searchOptimizer from '../../utils/searchOptimizer.js';

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

  // دالة للحصول على الأيقونة المناسبة لكل فئة
  const getCategoryIcon = (categoryName) => {
    const categoryIcons = {
      'ملابس': <Shirt className="h-8 w-8 text-blue-400" />,
      'أحذية': <Footprints className="h-8 w-8 text-brown-400" />,
      'ساعات': <Watch className="h-8 w-8 text-yellow-400" />,
      'إلكترونيات': <Smartphone className="h-8 w-8 text-purple-400" />,
      'أجهزة كمبيوتر': <Laptop className="h-8 w-8 text-gray-400" />,
      'منزل': <Home className="h-8 w-8 text-green-400" />,
      'سيارات': <Car className="h-8 w-8 text-red-400" />,
      'ألعاب': <Gamepad2 className="h-8 w-8 text-pink-400" />,
      'كتب': <Book className="h-8 w-8 text-orange-400" />,
      'كاميرات': <Camera className="h-8 w-8 text-indigo-400" />,
      'هدايا': <Gift className="h-8 w-8 text-rose-400" />,
      'سماعات': <Headphones className="h-8 w-8 text-cyan-400" />
    };
    
    return categoryIcons[categoryName] || <Package className="h-8 w-8 text-gray-400" />;
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

  // فلترة المنتجات المحسنة مع البحث الذكي
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

    // فلترة حسب الفئة
    return searchResults.filter(product => {
      return selectedCategory === 'الكل' || product.category === selectedCategory;
    });
  }, [products, selectedCategory, searchTerm]);


  return (
    <div className="flex-1 bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl shadow-2xl">
      {/* شريط البحث والفلاتر */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row gap-4 mb-4">
          {/* البحث */}
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="البحث في المنتجات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
          </div>
          
        </div>

        {/* فئات المنتجات */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => onCategoryChange('الكل')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              selectedCategory === 'الكل'
                ? 'bg-blue-500 text-white shadow-lg'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            الكل
          </button>
          {categories.map((category, index) => (
            <button
              key={category.id || category.name || index}
              onClick={() => onCategoryChange(category.name)}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                selectedCategory === category.name
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* شبكة المنتجات */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 ipad-grid ipad-pro-grid">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            onClick={() => onAddToCart(product)}
            className="bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl p-4 cursor-pointer hover:from-gray-600 hover:to-gray-700 transition-all duration-300 hover:scale-105 hover:shadow-xl border border-gray-600 hover:border-blue-400 group"
          >
            {/* أيقونة الفئة */}
            <div className="relative mb-3">
              <div className="w-full h-20 bg-gradient-to-br from-gray-600 to-gray-700 rounded-lg flex items-center justify-center">
                {getCategoryIcon(product.category)}
              </div>
              {product.stock <= 5 && (
                <div className="absolute top-1 right-1 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  منخفض
                </div>
              )}
            </div>

            {/* معلومات المنتج */}
            <div className="text-center">
              <h3 className="font-semibold text-white text-sm mb-1 line-clamp-2 group-hover:text-blue-300 transition-colors">
                {product.name}
              </h3>
              <p className="text-green-400 font-bold text-lg">
                {product.price.toLocaleString('en-US')} جنيه
              </p>
              <p className="text-gray-400 text-xs">
                المخزون: {product.stock}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* رسالة عدم وجود منتجات */}
      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">
            لا توجد منتجات
          </h3>
          <p className="text-gray-500">
            {searchTerm ? 'لم يتم العثور على منتجات تطابق البحث' : 'قم بإضافة منتجات جديدة'}
          </p>
        </div>
      )}
    </div>
  );
};

export default ProductGrid;
