// نظام التحقق من البيانات والتخزين
import { getCurrentDate } from './dateUtils.js';
export class DataValidator {
  // التحقق من صحة البيانات المحفوظة
  static validateStoredData() {
    const errors = [];
    
    try {
      // التحقق من المنتجات
      const products = JSON.parse(localStorage.getItem('products') || '[]');
      if (!Array.isArray(products)) {
        errors.push('منتجات غير صحيحة');
      } else {
        products.forEach((product, index) => {
          // price===0 مقبول، category أو subCategoryId مطلوب
          const hasCategory = product.category || product.subCategoryId || product.mainCategoryId;
          const hasPrice = product.price !== undefined && product.price !== null && product.price !== '';
          if (!product.id || !product.name || !hasPrice || !hasCategory) {
            errors.push(`منتج ${index + 1} غير مكتمل`);
          }
        });
      }

      // التحقق من الفئات
      const categories = JSON.parse(localStorage.getItem('productCategories') || '[]');
      if (!Array.isArray(categories)) {
        errors.push('فئات غير صحيحة');
      } else {
        categories.forEach((category, index) => {
          if (!category.name) {
            errors.push(`فئة ${index + 1} غير مكتملة`);
          }
        });
      }

      // التحقق من المبيعات
      const sales = JSON.parse(localStorage.getItem('sales') || '[]');
      if (!Array.isArray(sales)) {
        errors.push('مبيعات غير صحيحة');
      }

      // التحقق من إعدادات المتجر
      const storeInfo = JSON.parse(localStorage.getItem('storeInfo') || '{}');
      if (typeof storeInfo !== 'object' || !storeInfo.storeName) {
        errors.push('إعدادات المتجر غير مكتملة أو مفقودة');
      }

      // التحقق من إعدادات نقاط البيع
      const posSettings = JSON.parse(localStorage.getItem('pos-settings') || '{}');
      if (typeof posSettings !== 'object' || !posSettings.companyName) {
        errors.push('إعدادات نقاط البيع غير مكتملة أو مفقودة');
      }


    } catch (error) {
      errors.push('خطأ في قراءة البيانات المحفوظة');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // إصلاح البيانات التالفة
  static repairData() {
    try {
      // إصلاح المنتجات
      let products = JSON.parse(localStorage.getItem('products') || '[]');
      if (!Array.isArray(products)) {
        products = [];
      }
      products = products.filter(product => {
        // قبول price===0، وقبول category أو subCategoryId أو mainCategoryId
        const hasCategory = product && (product.category || product.subCategoryId || product.mainCategoryId);
        const hasPrice = product && product.price !== undefined && product.price !== null && product.price !== '';
        return product && product.id && product.name && hasPrice && hasCategory;
      });
      localStorage.setItem('products', JSON.stringify(products));

      // إصلاح الفئات
      let categories = JSON.parse(localStorage.getItem('productCategories') || '[]');
      if (!Array.isArray(categories)) {
        categories = [];
      }
      categories = categories.filter(category => 
        category && category.name
      );
      localStorage.setItem('productCategories', JSON.stringify(categories));

      // إصلاح المبيعات
      let sales = JSON.parse(localStorage.getItem('sales') || '[]');
      if (!Array.isArray(sales)) {
        sales = [];
      }
      localStorage.setItem('sales', JSON.stringify(sales));

      // إصلاح إعدادات المتجر
      let storeInfo = JSON.parse(localStorage.getItem('storeInfo') || '{}');
      if (typeof storeInfo !== 'object' || !storeInfo.storeName) {
        storeInfo = {
          storeName: 'متجر الأمين',
          storePhone: '01029022006',
          storeAddress: 'باسوس - القناطر الخيرية - الطريق الدائري',
          storeEmail: 'info@msgroupplast.com',
          storeTaxNumber: '300123456789003',
          storeLogo: '',
          storeDescription: 'نظام إدارة المبيعات المتطور',
          taxEnabled: false,
          taxRate: 15,
          taxName: 'ضريبة القيمة المضافة',
          inventoryEnabled: true,
          ...storeInfo
        };
      }
      localStorage.setItem('storeInfo', JSON.stringify(storeInfo));

      // إصلاح إعدادات نقاط البيع
      let posSettings = JSON.parse(localStorage.getItem('pos-settings') || '{}');
      if (typeof posSettings !== 'object' || !posSettings.companyName) {
        posSettings = {
          companyName: storeInfo.storeName || 'متجر الأمين',
          companyAddress: storeInfo.storeAddress || 'باسوس - القناطر الخيرية - الطريق الدائري',
          companyPhone: storeInfo.storePhone || '01029022006',
          companyEmail: storeInfo.storeEmail || 'info@msgroupplast.com',
          currency: 'EGP',
          language: 'ar',
          timezone: 'Africa/Cairo',
          taxEnabled: storeInfo.taxEnabled !== undefined ? storeInfo.taxEnabled : false,
          taxRate: storeInfo.taxRate || 15,
          taxName: storeInfo.taxName || 'ضريبة القيمة المضافة',
          allowRegistration: true,
          requireEmailVerification: true,
          defaultRole: 'cashier',
          printerName: 'EPSON TM-T20III',
          paperSize: '80mm',
          printLogo: true,
          printFooter: true,
          autoBackup: true,
          backupFrequency: 'daily',
          backupLocation: 'local',
          emailNotifications: true,
          smsNotifications: false,
          lowStockAlerts: true,
          salesReports: true,
          theme: 'light',
          primaryColor: '#8B5CF6',
          sidebarCollapsed: false,
          soundsEnabled: true,
          soundVolume: 0.7,
          clickSounds: true,
          notificationSounds: true,
          systemSounds: true,
          maintenanceMode: false,
          debugMode: false,
          analyticsEnabled: true,
          inventoryEnabled: storeInfo.inventoryEnabled !== undefined ? storeInfo.inventoryEnabled : true,
          ...posSettings
        };
      }
      localStorage.setItem('pos-settings', JSON.stringify(posSettings));

      // إصلاح إعدادات النظام
      let systemSettings = JSON.parse(localStorage.getItem('system-settings') || '{}');
      if (typeof systemSettings !== 'object' || !systemSettings.theme) {
        systemSettings = {
          ...posSettings,
          ...systemSettings
        };
      }
      localStorage.setItem('system-settings', JSON.stringify(systemSettings));


      return true;
    } catch (error) {
      console.error('خطأ في إصلاح البيانات:', error);
      return false;
    }
  }

  // إنشاء نسخة احتياطية من البيانات
  static createBackup() {
    try {
      const backup = {
        timestamp: getCurrentDate(),
        products: JSON.parse(localStorage.getItem('products') || '[]'),
        categories: JSON.parse(localStorage.getItem('productCategories') || '[]'),
        sales: JSON.parse(localStorage.getItem('sales') || '[]'),
        storeInfo: JSON.parse(localStorage.getItem('storeInfo') || '{}'),
        activeShift: JSON.parse(localStorage.getItem('activeShift') || 'null')
      };
      
      localStorage.setItem('dataBackup', JSON.stringify(backup));
      return true;
    } catch (error) {
      console.error('خطأ في إنشاء النسخة الاحتياطية:', error);
      return false;
    }
  }

  // استعادة النسخة الاحتياطية
  static restoreBackup() {
    try {
      const backup = JSON.parse(localStorage.getItem('dataBackup') || '{}');
      if (!backup.timestamp) {
        return false;
      }

      localStorage.setItem('products', JSON.stringify(backup.products || []));
      localStorage.setItem('productCategories', JSON.stringify(backup.categories || []));
      localStorage.setItem('sales', JSON.stringify(backup.sales || []));
      localStorage.setItem('storeInfo', JSON.stringify(backup.storeInfo || {}));
      if (backup.activeShift) {
        localStorage.setItem('activeShift', JSON.stringify(backup.activeShift));
      }

      return true;
    } catch (error) {
      console.error('خطأ في استعادة النسخة الاحتياطية:', error);
      return false;
    }
  }

  // تنظيف البيانات القديمة
  static cleanupOldData() {
    try {
      // تنظيف سجلات النشاط القديمة (أكثر من 30 يوم)
      const activityLogs = JSON.parse(localStorage.getItem('activity_logs') || '[]');
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const cleanedLogs = activityLogs.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate > thirtyDaysAgo;
      });
      
      localStorage.setItem('activity_logs', JSON.stringify(cleanedLogs));
      
      // تنظيف النسخ الاحتياطية القديمة (أكثر من 7 أيام)
      const backups = JSON.parse(localStorage.getItem('backups') || '[]');
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const cleanedBackups = backups.filter(backup => {
        const backupDate = new Date(backup.timestamp);
        return backupDate > sevenDaysAgo;
      });
      
      localStorage.setItem('backups', JSON.stringify(cleanedBackups));
      
      console.log('✅ تم تنظيف البيانات القديمة بنجاح');
      return true;
    } catch (error) {
      console.error('خطأ في تنظيف البيانات القديمة:', error);
      return false;
    }
  }
}

// نظام مراقبة التخزين
export class StorageMonitor {
  static init() {
    // مراقبة تغييرات localStorage
    window.addEventListener('storage', (e) => {
      if (e.key && e.newValue !== e.oldValue) {
        console.log(`تم تحديث ${e.key} في localStorage`);
      }
    });

    // مراقبة أخطاء localStorage
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key, value) {
      try {
        originalSetItem.call(this, key, value);
      } catch (error) {
        console.error('خطأ في حفظ البيانات:', error);
        // محاولة تنظيف المساحة
        DataValidator.cleanupOldData();
        try {
          originalSetItem.call(this, key, value);
        } catch (retryError) {
          console.error('فشل في إعادة المحاولة:', retryError);
        }
      }
    };
  }

  // التحقق من مساحة التخزين المتاحة
  static checkStorageSpace() {
    try {
      const testKey = 'storageTest';
      const testData = 'x'.repeat(1024 * 1024); // 1MB
      
      localStorage.setItem(testKey, testData);
      localStorage.removeItem(testKey);
      
      return true;
    } catch (error) {
      console.warn('مساحة التخزين ممتلئة:', error);
      return false;
    }
  }
}




