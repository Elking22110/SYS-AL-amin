import React, { useState, useEffect } from 'react';
import { DataValidator } from '../utils/dataValidation';
import databaseManager from '../utils/database';

const DataLoader = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('جاري تحميل البيانات...');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingMessage('جاري تهيئة قاعدة البيانات...');
        await databaseManager.init();
        await databaseManager.ensureStoresExist();

        // تشغيل هجرة البيانات الصحية (seeding) إذا لم تكن قد جرت
        const migrationDone = localStorage.getItem('migration_sanitary_alamin_v20') === 'true';
        if (!migrationDone) {
          setLoadingMessage('جاري استيراد قاعدة البيانات لأول مرة (قد يستغرق ذلك ثوانٍ)...');
          console.log('جارِ استيراد قاعدة بيانات الأدوات الصحية الكاملة لمتجر الأمين من DataLoader...');
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
            'migration_sanitary_alamin_v1', 'migration_sanitary_alamin_v2',
            'migration_sanitary_alamin_v3', 'migration_sanitary_alamin_v4',
            'migration_sanitary_alamin_v5', 'migration_sanitary_alamin_v6', 'migration_sanitary_alamin_v7', 'migration_sanitary_alamin_v8', 'migration_sanitary_alamin_v9', 'migration_sanitary_alamin_v10', 'migration_sanitary_alamin_v11', 'migration_sanitary_alamin_v12', 'migration_sanitary_alamin_v13', 'migration_sanitary_alamin_v14', 'migration_sanitary_alamin_v15', 'migration_sanitary_alamin_v16', 'migration_sanitary_alamin_v17',
            'categories_hierarchical_migration_v6', 'categories_hierarchical_migration_v7'
          ];
          keysToClear.forEach(k => { try { localStorage.removeItem(k); } catch (_) {} });

          // مسح IndexedDB القديمة وإعادة تهيئتها بالبيانات الكاملة
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

          localStorage.setItem('productCategories', JSON.stringify(categories));
          localStorage.setItem('products', JSON.stringify(products));
          localStorage.setItem('migration_sanitary_alamin_v20', 'true');
        }

        setLoadingMessage('جاري التحقق من البيانات...');
        
        // التحقق من صحة البيانات
        const validation = DataValidator.validateStoredData();
        if (!validation.isValid) {
          setLoadingMessage('جاري إصلاح البيانات...');
          await new Promise(resolve => setTimeout(resolve, 1000)); // محاكاة وقت الإصلاح
          
          const repaired = DataValidator.repairData();
          if (!repaired) {
            setLoadingMessage('خطأ في إصلاح البيانات');
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }

        setLoadingMessage('جاري تحميل البيانات...');
        await new Promise(resolve => setTimeout(resolve, 500)); // محاكاة وقت التحميل
        
        setIsLoading(false);
      } catch (error) {
        console.error('خطأ في تحميل البيانات:', error);
        setLoadingMessage('خطأ في تحميل البيانات');
        await new Promise(resolve => setTimeout(resolve, 2000));
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">نظام إدارة المبيعات</h2>
          <p className="text-blue-300">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  return children;
};

export default DataLoader;




