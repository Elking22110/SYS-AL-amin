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
      // إعدادات التسمية والسرعة الجرافيكية
      cache: false,
      offscreen: false
    },
    icon: path.join(__dirname, '../public/favicon.ico'),
    title: 'SIS AL AMEEN - نظام الأمين',
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
    // في وضع الإنتاج: تحميل dist/index.html الذي تنتجه Vite مباشرة لمنع خطأ الملفات المفقودة
    const distIndexPath = path.join(app.getAppPath(), 'dist', 'index.html');
    mainWindow.loadFile(distIndexPath);
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

  // معالجة فتح النوافذ والروابط الخارجية مع السماح بنوافذ الطباعة والصفحات الداخلية
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // 🛡️ السماح بنوافذ الطباعة والصفحات المؤقتة والمسارات المحلية (about:blank, file:, data:, blob:)
    if (!url || url === 'about:blank' || url.startsWith('about:') || url.startsWith('file:') || url.startsWith('blob:') || url.startsWith('data:')) {
      return { action: 'allow' };
    }

    // فتح الروابط الخارجية الحقيقية (http / https) في المتصفح الخارجي
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }

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
              message: 'SIS AL AMEEN - نظام الأمين',
              detail: 'إصدار 2.0.0\nنظام متكامل لإدارة نقاط البيع والمخزون\nجميع الحقوق محفوظة © 2026 SIS AL AMEEN'
            });
          }
        },
        {
          label: 'دليل المستخدم',
          click: () => {
            // دليل المستخدم — يُضاف لاحقاً عند توفر الرابط الرسمي
            dialog.showMessageBox(mainWindow, { type: 'info', title: 'دليل المستخدم', message: 'يرجى التواصل مع فريق الدعم الفني للحصول على دليل المستخدم.' });
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
  // ⚠️ P0 FIX: DO NOT call session.clearStorageData() or clearCache() here.
  // clearStorageData() wipes ALL IndexedDB data (products, sales, customers, etc.) on every launch.
  // clearCache() breaks offline access to cached assets.
  // Both are FORBIDDEN in a production POS application.
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

// معالجة التحكم في النافذة (بديل عن remote المحذوف في Electron 14+)
ipcMain.handle('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});
ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  }
});
ipcMain.handle('window-close', () => {
  if (mainWindow) mainWindow.close();
});
ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
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