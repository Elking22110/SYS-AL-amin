const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

// إعدادات النافذة الرئيسية
let mainWindow;

// إنشاء النافذة الرئيسية
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      // إعدادات إضافية لحل مشاكل الـ cache والـ GPU
      cache: false,
      disableHardwareAcceleration: true,
      offscreen: false
    },
    icon: path.join(__dirname, '../public/favicon.ico'),
    title: 'نظام إدارة المبيعات - إبراهيم العراقي',
    titleBarStyle: 'default',
    show: false, // إخفاء النافذة حتى تحميل المحتوى
    frame: true,
    resizable: true,
    maximizable: true,
    minimizable: true,
    closable: true
  });

  // تحميل التطبيق
  if (isDev) {
    // في وضع التطوير
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // في وضع الإنتاج
    // محاولة تحميل الملف المخصص لـ Electron أولاً
    const electronIndexPath = path.join(__dirname, '../public/electron-index.html');
    const distIndexPath = path.join(__dirname, '../dist/index.html');
    
    // التحقق من وجود الملف المخصص
    const fs = require('fs');
    if (fs.existsSync(electronIndexPath)) {
      mainWindow.loadFile(electronIndexPath);
    } else {
      mainWindow.loadFile(distIndexPath);
    }
  }

  // إظهار النافذة عند تحميل المحتوى
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // التركيز على النافذة
    if (isDev) {
      mainWindow.focus();
    }
  });

  // معالجة أخطاء تحميل الصفحة
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('فشل في تحميل الصفحة:', errorDescription);
    dialog.showErrorBox('خطأ في تحميل التطبيق', `فشل في تحميل الصفحة: ${errorDescription}`);
  });

  // معالجة تحميل الصفحة بنجاح
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('تم تحميل الصفحة بنجاح');
  });

  // إعداد قائمة التطبيق
  createMenu();

  // معالجة إغلاق النافذة
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // منع التنقل إلى روابط خارجية
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // معالجة الأخطاء
  mainWindow.webContents.on('crashed', () => {
    dialog.showErrorBox('خطأ في التطبيق', 'حدث خطأ غير متوقع. سيتم إعادة تشغيل التطبيق.');
    app.relaunch();
    app.exit(0);
  });
}

// إنشاء قائمة التطبيق
function createMenu() {
  const template = [
    {
      label: 'ملف',
      submenu: [
        {
          label: 'جديد',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            // إضافة وظيفة جديدة
            mainWindow.webContents.send('menu-new');
          }
        },
        {
          label: 'فتح',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openFile'],
              filters: [
                { name: 'ملفات البيانات', extensions: ['json', 'csv'] }
              ]
            });
            
            if (!result.canceled) {
              mainWindow.webContents.send('menu-open', result.filePaths[0]);
            }
          }
        },
        {
          label: 'حفظ',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow.webContents.send('menu-save');
          }
        },
        { type: 'separator' },
        {
          label: 'إعدادات',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            mainWindow.webContents.send('menu-settings');
          }
        },
        { type: 'separator' },
        {
          label: 'خروج',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'تحرير',
      submenu: [
        { role: 'undo', label: 'تراجع' },
        { role: 'redo', label: 'إعادة' },
        { type: 'separator' },
        { role: 'cut', label: 'قص' },
        { role: 'copy', label: 'نسخ' },
        { role: 'paste', label: 'لصق' },
        { role: 'selectall', label: 'تحديد الكل' }
      ]
    },
    {
      label: 'عرض',
      submenu: [
        { role: 'reload', label: 'إعادة تحميل' },
        { role: 'forceReload', label: 'إعادة تحميل قسري' },
        { role: 'toggleDevTools', label: 'أدوات المطور' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'إعادة تعيين التكبير' },
        { role: 'zoomIn', label: 'تكبير' },
        { role: 'zoomOut', label: 'تصغير' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'ملء الشاشة' }
      ]
    },
    {
      label: 'نافذة',
      submenu: [
        { role: 'minimize', label: 'تصغير' },
        { role: 'close', label: 'إغلاق' }
      ]
    },
    {
      label: 'مساعدة',
      submenu: [
        {
          label: 'حول التطبيق',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'حول التطبيق',
              message: 'نظام إدارة المبيعات',
              detail: 'إصدار 2.0.0\nتم تطويره بواسطة إبراهيم العراقي\n\nنظام متكامل لإدارة نقاط البيع والمخزون'
            });
          }
        },
        {
          label: 'دليل المستخدم',
          click: () => {
            shell.openExternal('https://github.com/your-repo/pos-system/wiki');
          }
        }
      ]
    }
  ];

  // إضافة قائمة خاصة بـ macOS
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about', label: 'حول التطبيق' },
        { type: 'separator' },
        { role: 'services', label: 'الخدمات' },
        { type: 'separator' },
        { role: 'hide', label: 'إخفاء' },
        { role: 'hideothers', label: 'إخفاء الآخرين' },
        { role: 'unhide', label: 'إظهار الكل' },
        { type: 'separator' },
        { role: 'quit', label: 'خروج' }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// إعدادات إضافية لحل مشاكل الـ GPU
app.commandLine.appendSwitch('--disable-gpu');
app.commandLine.appendSwitch('--disable-gpu-sandbox');
app.commandLine.appendSwitch('--disable-software-rasterizer');
app.commandLine.appendSwitch('--disable-background-timer-throttling');
app.commandLine.appendSwitch('--disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('--disable-renderer-backgrounding');

// معالجة أحداث التطبيق
app.whenReady().then(() => {
  // تنظيف الـ cache عند بدء التطبيق
  const { session } = require('electron');
  session.defaultSession.clearCache();
  session.defaultSession.clearStorageData();
  
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// معالجة الأحداث من عملية العرض
ipcMain.handle('app-version', () => {
  return app.getVersion();
});

ipcMain.handle('app-path', () => {
  return app.getAppPath();
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

ipcMain.handle('show-message-box', async (event, options) => {
  const result = await dialog.showMessageBox(mainWindow, options);
  return result;
});

// معالجة طلبات الطباعة
ipcMain.handle('print-invoice', async (event, data) => {
  try {
    // إرسال بيانات الفاتورة للطباعة
    mainWindow.webContents.send('print-invoice-data', data);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// معالجة النسخ الاحتياطي
ipcMain.handle('backup-data', async (event, data) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'حفظ نسخة احتياطية',
      defaultPath: `backup-${new Date().toISOString().split('T')[0]}.json`,
      filters: [
        { name: 'ملفات JSON', extensions: ['json'] }
      ]
    });

    if (!result.canceled) {
      const fs = require('fs').promises;
      await fs.writeFile(result.filePath, JSON.stringify(data, null, 2));
      return { success: true, path: result.filePath };
    }
    
    return { success: false, message: 'تم إلغاء العملية' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// معالجة استعادة النسخة الاحتياطية
ipcMain.handle('restore-data', async (event) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'استعادة نسخة احتياطية',
      filters: [
        { name: 'ملفات JSON', extensions: ['json'] }
      ],
      properties: ['openFile']
    });

    if (!result.canceled) {
      const fs = require('fs').promises;
      const data = await fs.readFile(result.filePaths[0], 'utf8');
      return { success: true, data: JSON.parse(data) };
    }
    
    return { success: false, message: 'تم إلغاء العملية' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// منع إنشاء نوافذ جديدة
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});

// معالجة الأخطاء غير المعالجة
process.on('uncaughtException', (error) => {
  console.error('خطأ غير معالج:', error);
  dialog.showErrorBox('خطأ في التطبيق', error.message);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('رفض غير معالج:', reason);
  dialog.showErrorBox('خطأ في التطبيق', reason.toString());
});