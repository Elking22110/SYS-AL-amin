// نظام النسخ الاحتياطية التلقائية
import databaseManager from './database.js';
import { getCurrentDate } from './dateUtils.js';
import encryptionManager from './encryption.js';

class BackupManager {
  constructor() {
    this.backupInterval = null;
    this.autoBackupEnabled = true;
    this.backupFrequency = 30 * 60 * 1000; // 30 دقيقة
    this.maxBackups = 10; // أقصى عدد نسخ احتياطية
    this.isBackingUp = false;
  }

  // تهيئة نظام النسخ الاحتياطية
  async init() {
    try {
      // تحميل إعدادات النسخ الاحتياطية
      await this.loadSettings();
      
      // بدء النسخ الاحتياطية التلقائية
      if (this.autoBackupEnabled) {
        this.startAutoBackup();
      }

      // تنظيف النسخ القديمة
      await this.cleanupOldBackups();

      console.log('تم تهيئة نظام النسخ الاحتياطية بنجاح');
    } catch (error) {
      console.error('خطأ في تهيئة نظام النسخ الاحتياطية:', error);
    }
  }

  // تحميل إعدادات النسخ الاحتياطية
  async loadSettings() {
    try {
      const settings = await databaseManager.get('settings', 'backup_settings');
      if (settings) {
        this.autoBackupEnabled = settings.autoBackupEnabled || true;
        this.backupFrequency = settings.backupFrequency || 30 * 60 * 1000;
        this.maxBackups = settings.maxBackups || 10;
      }
    } catch (error) {
      console.warn('خطأ في تحميل إعدادات النسخ الاحتياطية:', error);
    }
  }

  // حفظ إعدادات النسخ الاحتياطية
  async saveSettings() {
    try {
      const settings = {
        key: 'backup_settings',
        autoBackupEnabled: this.autoBackupEnabled,
        backupFrequency: this.backupFrequency,
        maxBackups: this.maxBackups,
        lastUpdated: getCurrentDate()
      };

      await databaseManager.update('settings', settings);
    } catch (error) {
      console.error('خطأ في حفظ إعدادات النسخ الاحتياطية:', error);
    }
  }

  // بدء النسخ الاحتياطية التلقائية
  startAutoBackup() {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
    }

    this.backupInterval = setInterval(async () => {
      if (!this.isBackingUp) {
        await this.createAutoBackup();
      }
    }, this.backupFrequency);

    console.log('تم بدء النسخ الاحتياطية التلقائية');
  }

  // إيقاف النسخ الاحتياطية التلقائية
  stopAutoBackup() {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
    }
    console.log('تم إيقاف النسخ الاحتياطية التلقائية');
  }

  // إنشاء نسخة احتياطية تلقائية
  async createAutoBackup() {
    try {
      this.isBackingUp = true;
      
      const backup = await databaseManager.createBackup('auto');
      
      // تشفير النسخة الاحتياطية
      const encryptedBackup = encryptionManager.encryptObject(backup);
      
      // حفظ النسخة المشفرة
      await databaseManager.update('backups', {
        ...backup,
        encrypted: true,
        encryptedData: encryptedBackup
      });

      console.log('تم إنشاء نسخة احتياطية تلقائية:', backup.id);
      
      // تنظيف النسخ القديمة
      await this.cleanupOldBackups();
      
    } catch (error) {
      console.error('خطأ في إنشاء النسخة الاحتياطية التلقائية:', error);
    } finally {
      this.isBackingUp = false;
    }
  }

  // إنشاء نسخة احتياطية يدوية
  async createManualBackup(type = 'manual') {
    try {
      this.isBackingUp = true;
      
      // التأكد من تهيئة قاعدة البيانات أولاً
      await databaseManager.init();
      
      const backup = await databaseManager.createBackup(type);
      
      // تشفير النسخة الاحتياطية
      const encryptedBackup = encryptionManager.encryptObject(backup);
      
      // حفظ النسخة المشفرة
      await databaseManager.update('backups', {
        ...backup,
        encrypted: true,
        encryptedData: encryptedBackup
      });

      console.log('تم إنشاء نسخة احتياطية يدوية:', backup.id);
      return backup;
      
    } catch (error) {
      console.error('خطأ في إنشاء النسخة الاحتياطية اليدوية:', error);
      throw error;
    } finally {
      this.isBackingUp = false;
    }
  }

  // استعادة نسخة احتياطية
  async restoreBackup(backupId) {
    try {
      // التأكد من تهيئة قاعدة البيانات أولاً
      await databaseManager.init();
      
      const backup = await databaseManager.get('backups', backupId);
      if (!backup) {
        throw new Error('النسخة الاحتياطية غير موجودة');
      }

      let backupData = backup.data;
      
      // فك تشفير النسخة الاحتياطية إذا كانت مشفرة
      if (backup.encrypted && backup.encryptedData) {
        try {
          backupData = encryptionManager.decryptObject(backup.encryptedData);
        } catch (decryptError) {
          console.error('خطأ في فك تشفير النسخة الاحتياطية:', decryptError);
          throw new Error('فشل في فك تشفير النسخة الاحتياطية');
        }
      }

      // التحقق من صحة بيانات النسخة الاحتياطية
      if (!backupData || typeof backupData !== 'object') {
        throw new Error('بيانات النسخة الاحتياطية غير صحيحة');
      }

      // استعادة البيانات
      await databaseManager.importData(backupData);
      
      console.log('تم استعادة النسخة الاحتياطية:', backupId);
      return true;
      
    } catch (error) {
      console.error('خطأ في استعادة النسخة الاحتياطية:', error);
      throw error;
    }
  }

  // تصدير نسخة احتياطية
  async exportBackup(backupId) {
    try {
      const backup = await databaseManager.get('backups', backupId);
      if (!backup) {
        throw new Error('النسخة الاحتياطية غير موجودة');
      }

      let backupData = backup.data;
      
      // فك تشفير النسخة الاحتياطية إذا كانت مشفرة
      if (backup.encrypted && backup.encryptedData) {
        backupData = encryptionManager.decryptObject(backup.encryptedData);
      }

      // إنشاء ملف JSON
      const jsonData = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      
      // تحميل الملف
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${backupId}_${getCurrentDate().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('تم تصدير النسخة الاحتياطية:', backupId);
      return true;
      
    } catch (error) {
      console.error('خطأ في تصدير النسخة الاحتياطية:', error);
      throw error;
    }
  }

  // تصدير الإعدادات فقط
  async exportSettings() {
    try {
      const settingsData = await databaseManager.exportSettings();
      
      // تحويل البيانات إلى JSON
      const jsonData = JSON.stringify(settingsData, null, 2);
      
      // إنشاء ملف للتحميل
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // تحميل الملف
      const a = document.createElement('a');
      a.href = url;
      a.download = `settings_${getCurrentDate().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('تم تصدير الإعدادات بنجاح');
      return true;
      
    } catch (error) {
      console.error('خطأ في تصدير الإعدادات:', error);
      throw error;
    }
  }

  // استيراد الإعدادات
  async importSettings(file) {
    try {
      const text = await file.text();
      const settingsData = JSON.parse(text);
      
      await databaseManager.importSettings(settingsData);
      
      console.log('تم استيراد الإعدادات بنجاح');
      return true;
      
    } catch (error) {
      console.error('خطأ في استيراد الإعدادات:', error);
      throw error;
    }
  }

  // استيراد نسخة احتياطية
  async importBackup(file) {
    try {
      const text = await file.text();
      const backupData = JSON.parse(text);
      
      // إنشاء نسخة احتياطية جديدة
      const backup = {
        id: `imported_${Date.now()}`,
        type: 'imported',
        date: getCurrentDate(),
        data: backupData
      };

      // تشفير النسخة الاحتياطية
      const encryptedBackup = encryptionManager.encryptObject(backup);
      
      // حفظ النسخة المشفرة
      await databaseManager.add('backups', {
        ...backup,
        encrypted: true,
        encryptedData: encryptedBackup
      });

      console.log('تم استيراد النسخة الاحتياطية:', backup.id);
      return backup;
      
    } catch (error) {
      console.error('خطأ في استيراد النسخة الاحتياطية:', error);
      throw error;
    }
  }

  // تنظيف النسخ القديمة
  async cleanupOldBackups() {
    try {
      const backups = await databaseManager.getAll('backups');
      
      // ترتيب النسخ حسب التاريخ (الأحدث أولاً)
      backups.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      // حذف النسخ الزائدة
      if (backups.length > this.maxBackups) {
        const toDelete = backups.slice(this.maxBackups);
        
        for (const backup of toDelete) {
          await databaseManager.delete('backups', backup.id);
        }
        
        console.log(`تم حذف ${toDelete.length} نسخة احتياطية قديمة`);
      }
      
    } catch (error) {
      console.error('خطأ في تنظيف النسخ القديمة:', error);
    }
  }

  // الحصول على قائمة النسخ الاحتياطية
  async getBackups() {
    try {
      const backups = await databaseManager.getAll('backups');
      return backups.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (error) {
      console.error('خطأ في الحصول على قائمة النسخ الاحتياطية:', error);
      return [];
    }
  }

  // حذف نسخة احتياطية
  async deleteBackup(backupId) {
    try {
      await databaseManager.delete('backups', backupId);
      console.log('تم حذف النسخة الاحتياطية:', backupId);
      return true;
    } catch (error) {
      console.error('خطأ في حذف النسخة الاحتياطية:', error);
      throw error;
    }
  }

  // تحديث إعدادات النسخ الاحتياطية
  async updateSettings(settings) {
    try {
      this.autoBackupEnabled = settings.autoBackupEnabled ?? this.autoBackupEnabled;
      this.backupFrequency = settings.backupFrequency ?? this.backupFrequency;
      this.maxBackups = settings.maxBackups ?? this.maxBackups;

      await this.saveSettings();

      // إعادة تشغيل النسخ التلقائية إذا تم تفعيلها
      if (this.autoBackupEnabled) {
        this.startAutoBackup();
      } else {
        this.stopAutoBackup();
      }

      console.log('تم تحديث إعدادات النسخ الاحتياطية');
      return true;
    } catch (error) {
      console.error('خطأ في تحديث إعدادات النسخ الاحتياطية:', error);
      throw error;
    }
  }

  // الحصول على إحصائيات النسخ الاحتياطية
  async getStats() {
    try {
      const backups = await this.getBackups();
      const totalSize = backups.reduce((total, backup) => {
        return total + (backup.encryptedData ? backup.encryptedData.length : 0);
      }, 0);

      return {
        totalBackups: backups.length,
        totalSize: totalSize,
        lastBackup: backups.length > 0 ? backups[0].date : null,
        autoBackupEnabled: this.autoBackupEnabled,
        backupFrequency: this.backupFrequency,
        maxBackups: this.maxBackups
      };
    } catch (error) {
      console.error('خطأ في الحصول على إحصائيات النسخ الاحتياطية:', error);
      return null;
    }
  }

  // التحقق من صحة النسخة الاحتياطية
  async validateBackup(backupId) {
    try {
      const backup = await databaseManager.get('backups', backupId);
      if (!backup) {
        return { valid: false, error: 'النسخة الاحتياطية غير موجودة' };
      }

      // فك تشفير النسخة الاحتياطية
      let backupData = backup.data;
      if (backup.encrypted && backup.encryptedData) {
        try {
          backupData = encryptionManager.decryptObject(backup.encryptedData);
        } catch (error) {
          return { valid: false, error: 'خطأ في فك تشفير النسخة الاحتياطية' };
        }
      }

      // التحقق من وجود البيانات الأساسية
      const requiredStores = ['products', 'categories', 'customers', 'sales'];
      for (const store of requiredStores) {
        if (!backupData[store] || !Array.isArray(backupData[store])) {
          return { valid: false, error: `البيانات المطلوبة غير موجودة: ${store}` };
        }
      }

      return { valid: true, data: backupData };
    } catch (error) {
      console.error('خطأ في التحقق من صحة النسخة الاحتياطية:', error);
      return { valid: false, error: 'خطأ في التحقق من النسخة الاحتياطية' };
    }
  }
}

// إنشاء مثيل واحد من مدير النسخ الاحتياطية
const backupManager = new BackupManager();

export default backupManager;


