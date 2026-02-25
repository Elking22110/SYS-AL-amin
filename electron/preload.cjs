const { contextBridge, ipcRenderer } = require('electron');

// تعريض واجهة آمنة للعمليات الرئيسية
contextBridge.exposeInMainWorld('electronAPI', {
  // معلومات التطبيق
  getAppVersion: () => ipcRenderer.invoke('app-version'),
  getAppPath: () => ipcRenderer.invoke('app-path'),

  // حوارات النظام
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),

  // الطباعة
  printInvoice: (data) => ipcRenderer.invoke('print-invoice', data),

  // النسخ الاحتياطي
  backupData: (data) => ipcRenderer.invoke('backup-data', data),
  restoreData: () => ipcRenderer.invoke('restore-data'),

  // أحداث القائمة
  onMenuNew: (callback) => ipcRenderer.on('menu-new', callback),
  onMenuOpen: (callback) => ipcRenderer.on('menu-open', callback),
  onMenuSave: (callback) => ipcRenderer.on('menu-save', callback),
  onMenuSettings: (callback) => ipcRenderer.on('menu-settings', callback),

  // أحداث الطباعة
  onPrintInvoiceData: (callback) => ipcRenderer.on('print-invoice-data', callback),

  // إزالة المستمعين
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),

  // معلومات النظام
  platform: process.platform,
  isElectron: true
});

// تعريض واجهة للوصول إلى نظام الملفات (محدود)
contextBridge.exposeInMainWorld('fileSystem', {
  // قراءة ملف
  readFile: async (filePath) => {
    try {
      const fs = require('fs').promises;
      const data = await fs.readFile(filePath, 'utf8');
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // كتابة ملف
  writeFile: async (filePath, data) => {
    try {
      const fs = require('fs').promises;
      await fs.writeFile(filePath, data, 'utf8');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // التحقق من وجود ملف
  fileExists: async (filePath) => {
    try {
      const fs = require('fs').promises;
      await fs.access(filePath);
      return { success: true, exists: true };
    } catch (error) {
      return { success: true, exists: false };
    }
  },

  // إنشاء مجلد
  createDirectory: async (dirPath) => {
    try {
      const fs = require('fs').promises;
      await fs.mkdir(dirPath, { recursive: true });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // قراءة محتويات المجلد
  readDirectory: async (dirPath) => {
    try {
      const fs = require('fs').promises;
      const files = await fs.readdir(dirPath);
      return { success: true, files };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
});

// تعريض واجهة للوصول إلى مسار المستخدم
contextBridge.exposeInMainWorld('userData', {
  // الحصول على مسار بيانات المستخدم
  getUserDataPath: () => {
    const { app } = require('electron');
    return app.getPath('userData');
  },

  // الحصول على مسار سطح المكتب
  getDesktopPath: () => {
    const { app } = require('electron');
    return app.getPath('desktop');
  },

  // الحصول على مسار المستندات
  getDocumentsPath: () => {
    const { app } = require('electron');
    return app.getPath('documents');
  },

  // الحصول على مسار التحميلات
  getDownloadsPath: () => {
    const { app } = require('electron');
    return app.getPath('downloads');
  }
});

// تعريض واجهة للتحكم في النافذة
contextBridge.exposeInMainWorld('windowControl', {
  // تصغير النافذة
  minimize: () => {
    const { remote } = require('electron');
    if (remote) {
      remote.getCurrentWindow().minimize();
    }
  },

  // تكبير/تصغير النافذة
  maximize: () => {
    const { remote } = require('electron');
    if (remote) {
      const window = remote.getCurrentWindow();
      if (window.isMaximized()) {
        window.unmaximize();
      } else {
        window.maximize();
      }
    }
  },

  // إغلاق النافذة
  close: () => {
    const { remote } = require('electron');
    if (remote) {
      remote.getCurrentWindow().close();
    }
  },

  // التحقق من حالة النافذة
  isMaximized: () => {
    const { remote } = require('electron');
    if (remote) {
      return remote.getCurrentWindow().isMaximized();
    }
    return false;
  }
});

// تعريض واجهة للتحكم في الصوت
contextBridge.exposeInMainWorld('audioControl', {
  // تشغيل صوت
  playSound: (soundPath) => {
    try {
      const { shell } = require('electron');
      shell.openPath(soundPath);
    } catch (error) {
      console.error('خطأ في تشغيل الصوت:', error);
    }
  },

  // إشعار صوتي
  playNotification: () => {
    try {
      // استخدام صوت النظام الافتراضي
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
      audio.play().catch(() => {
        // تجاهل الأخطاء إذا لم يتمكن من تشغيل الصوت
      });
    } catch (error) {
      console.error('خطأ في تشغيل الإشعار الصوتي:', error);
    }
  }
});

// تعريض واجهة للتحكم في الطابعة الحرارية
contextBridge.exposeInMainWorld('thermalPrinter', {
  // طباعة فاتورة
  printInvoice: async (invoiceData) => {
    try {
      return await ipcRenderer.invoke('print-invoice', invoiceData);
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // اختبار الطابعة
  testPrinter: async () => {
    try {
      const testData = {
        type: 'test',
        content: 'اختبار الطابعة الحرارية'
      };
      return await ipcRenderer.invoke('print-invoice', testData);
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
});

// تعريض واجهة للتحكم في قاعدة البيانات المحلية
contextBridge.exposeInMainWorld('localDatabase', {
  // حفظ البيانات
  saveData: async (key, data) => {
    try {
      const userDataPath = require('electron').app.getPath('userData');
      const dbPath = require('path').join(userDataPath, 'pos-database.json');
      const fs = require('fs').promises;
      
      let database = {};
      try {
        const existingData = await fs.readFile(dbPath, 'utf8');
        database = JSON.parse(existingData);
      } catch (error) {
        // إنشاء قاعدة بيانات جديدة إذا لم تكن موجودة
      }
      
      database[key] = data;
      await fs.writeFile(dbPath, JSON.stringify(database, null, 2));
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // تحميل البيانات
  loadData: async (key) => {
    try {
      const userDataPath = require('electron').app.getPath('userData');
      const dbPath = require('path').join(userDataPath, 'pos-database.json');
      const fs = require('fs').promises;
      
      const data = await fs.readFile(dbPath, 'utf8');
      const database = JSON.parse(data);
      
      return { success: true, data: database[key] || null };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // حذف البيانات
  deleteData: async (key) => {
    try {
      const userDataPath = require('electron').app.getPath('userData');
      const dbPath = require('path').join(userDataPath, 'pos-database.json');
      const fs = require('fs').promises;
      
      let database = {};
      try {
        const existingData = await fs.readFile(dbPath, 'utf8');
        database = JSON.parse(existingData);
      } catch (error) {
        return { success: true }; // لا يوجد شيء لحذفه
      }
      
      delete database[key];
      await fs.writeFile(dbPath, JSON.stringify(database, null, 2));
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
});

// منع الوصول المباشر إلى Node.js APIs
delete window.require;
delete window.exports;
delete window.module;