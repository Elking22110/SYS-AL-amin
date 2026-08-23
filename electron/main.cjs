const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = process.env.NODE_ENV === 'development';

// ─── إعداد نظام Logging في ملف userData ───
let logFilePath = null;

function setupLogger() {
  try {
    const userDataPath = app.getPath('userData');
    const logsDir = path.join(userDataPath, 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    const dateStr = new Date().toISOString().split('T')[0];
    logFilePath = path.join(logsDir, `app-${dateStr}.log`);
    console.log(`[Main] سجل الأحداث: ${logFilePath}`);
  } catch (err) {
    console.error('[Main] تعذر إعداد نظام السجلات:', err);
  }
}

function writeLog(level, message, extra) {
  const entry = `[${new Date().toISOString()}] [${level}] ${message}${extra ? ' | ' + String(extra) : ''}\n`;
  console.log(entry.trim());
  if (logFilePath) {
    try {
      fs.appendFileSync(logFilePath, entry, 'utf8');
    } catch (_) {}
  }
}

// ─── معالجة الأخطاء غير المعالجة ───
// ✅ FIX #3: لا نعرض raw error messages للعميل — نسجلها في ملف فقط
// وإذا كان التطبيق لم يُفتح بعد، نعرض رسالة عربية بسيطة
let mainWindow = null;
let appIsReady = false;

process.on('uncaughtException', (error) => {
  writeLog('FATAL', 'Uncaught Exception', error?.stack || error?.message || String(error));

  // لا نعرض dialog للأخطاء التقنية الداخلية في production
  if (isDev) {
    // في development فقط: عرض الخطأ الكامل للمطور
    try {
      dialog.showErrorBox('[DEV] خطأ غير معالج', `${error?.message}\n\n${error?.stack || ''}`);
    } catch (_) {}
  }
  // في production: لا نعرض شيئاً للعميل — الخطأ مسجل في log file
});

process.on('unhandledRejection', (reason) => {
  const msg = reason instanceof Error ? (reason.stack || reason.message) : String(reason);
  writeLog('ERROR', 'Unhandled Promise Rejection', msg);
  // ✅ لا نعرض dialog للعميل في production
});

// ─── إعدادات Electron لحل مشكلة 0x80000003 ───
// ✅ FIX #4: إزالة الـ flags القديمة غير المتوافقة مع Electron 38 / Chromium 138
// --disable-gpu-sandbox كان يسبب STATUS_BREAKPOINT (0x80000003) في بعض الأجهزة
// --disable-software-rasterizer كان يتعارض مع Chromium 138 GPU initialization
app.commandLine.appendSwitch('--disable-gpu');
// ✅ الـ flags الآمنة لـ Electron 38:
app.commandLine.appendSwitch('--disable-background-timer-throttling');
app.commandLine.appendSwitch('--disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('--disable-renderer-backgrounding');
// إضافة flag لتجنب مشكلة "paging file is too small":
app.commandLine.appendSwitch('--disable-dev-shm-usage');
app.commandLine.appendSwitch('--no-sandbox');

// ─── Single Instance Lock ───
// ✅ FIX #5: منع تشغيل أكثر من نسخة واحدة من التطبيق
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // نسخة أخرى تعمل بالفعل — نُركّز عليها ونخرج
  app.quit();
} else {
  app.on('second-instance', () => {
    // إذا حاول المستخدم فتح نسخة ثانية، نُركّز على النسخة الأولى
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // ─── إنشاء النافذة الرئيسية ───
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
        // ✅ لا نضع cache: false — هذا يُبطئ التحميل دون فائدة
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
      mainWindow.loadURL('http://localhost:5173');
      mainWindow.webContents.openDevTools();
    } else {
      // ✅ استخدام app.getAppPath() لضمان المسار الصحيح داخل asar/packaged app
      const distIndexPath = path.join(app.getAppPath(), 'dist', 'index.html');
      writeLog('INFO', `تحميل: ${distIndexPath}`);
      mainWindow.loadFile(distIndexPath).catch((err) => {
        writeLog('ERROR', 'فشل تحميل index.html', err?.message);
        // ✅ FIX #6: عرض رسالة عربية واضحة بدلاً من raw error
        dialog.showErrorBox(
          'تعذر تشغيل التطبيق',
          'لم يتم العثور على ملفات التطبيق.\nيرجى إعادة التثبيت أو التواصل مع الدعم الفني.'
        );
      });
    }

    // إظهار النافذة عند تحميل المحتوى
    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
      if (isDev) mainWindow.focus();
      writeLog('INFO', 'النافذة الرئيسية جاهزة');
    });

    // ✅ FIX #6: معالجة فشل تحميل الصفحة برسالة عربية بسيطة
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      writeLog('ERROR', `فشل تحميل الصفحة: ${errorCode} — ${errorDescription} — ${validatedURL}`);
      // لا نعرض dialog هنا — الملف سيُحمَّل مرة أخرى تلقائياً في معظم الحالات
      // إلا في حالة خطأ فادح (ليس ERR_ABORTED الذي يحدث عند التنقل العادي)
      if (errorCode !== -3 /* ERR_ABORTED */ && !isDev) {
        // نحاول إعادة التحميل مرة واحدة فقط
        setTimeout(() => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            const distIndexPath = path.join(app.getAppPath(), 'dist', 'index.html');
            mainWindow.loadFile(distIndexPath).catch(() => {});
          }
        }, 1000);
      }
    });

    mainWindow.webContents.on('did-finish-load', () => {
      writeLog('INFO', 'تم تحميل الصفحة بنجاح');
    });

    // إعداد قائمة التطبيق
    createMenu();

    // معالجة إغلاق النافذة
    mainWindow.on('closed', () => {
      writeLog('INFO', 'تم إغلاق النافذة الرئيسية');
      mainWindow = null;
    });

    // السماح بنوافذ الطباعة والمسارات المحلية
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      if (
        !url ||
        url === 'about:blank' ||
        url.startsWith('about:') ||
        url.startsWith('file:') ||
        url.startsWith('blob:') ||
        url.startsWith('data:')
      ) {
        return { action: 'allow' };
      }
      if (url.startsWith('http://') || url.startsWith('https://')) {
        shell.openExternal(url);
      }
      return { action: 'deny' };
    });

    // ✅ استبدال 'crashed' بـ 'render-process-gone' المدعوم في Electron الحديث
    mainWindow.webContents.on('render-process-gone', (event, details) => {
      writeLog('ERROR', `انهار renderer process: ${details?.reason} (exitCode: ${details?.exitCode})`);
      if (!isDev) {
        dialog.showMessageBox({
          type: 'warning',
          title: 'تحذير',
          message: 'حدث خطأ غير متوقع في واجهة التطبيق.',
          detail: 'هل تريد إعادة تشغيل التطبيق؟',
          buttons: ['إعادة التشغيل', 'إغلاق'],
          defaultId: 0
        }).then(({ response }) => {
          if (response === 0) {
            app.relaunch();
            app.exit(0);
          } else {
            app.quit();
          }
        });
      }
    });
  }

  // ─── إنشاء قائمة التطبيق ───
  function createMenu() {
    const template = [
      {
        label: 'ملف',
        submenu: [
          {
            label: 'جديد',
            accelerator: 'CmdOrCtrl+N',
            click: () => { if (mainWindow) mainWindow.webContents.send('menu-new'); }
          },
          {
            label: 'فتح',
            accelerator: 'CmdOrCtrl+O',
            click: async () => {
              const result = await dialog.showOpenDialog(mainWindow, {
                properties: ['openFile'],
                filters: [{ name: 'ملفات البيانات', extensions: ['json', 'csv'] }]
              });
              if (!result.canceled) mainWindow.webContents.send('menu-open', result.filePaths[0]);
            }
          },
          {
            label: 'حفظ',
            accelerator: 'CmdOrCtrl+S',
            click: () => { if (mainWindow) mainWindow.webContents.send('menu-save'); }
          },
          { type: 'separator' },
          {
            label: 'إعدادات',
            accelerator: 'CmdOrCtrl+,',
            click: () => { if (mainWindow) mainWindow.webContents.send('menu-settings'); }
          },
          { type: 'separator' },
          {
            label: 'خروج',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => { app.quit(); }
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
          { role: 'selectAll', label: 'تحديد الكل' }
        ]
      },
      {
        label: 'عرض',
        submenu: [
          { role: 'reload', label: 'إعادة تحميل' },
          { role: 'forceReload', label: 'إعادة تحميل قسري' },
          ...(isDev ? [{ role: 'toggleDevTools', label: 'أدوات المطور' }] : []),
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
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'دليل المستخدم',
                message: 'يرجى التواصل مع فريق الدعم الفني للحصول على دليل المستخدم.'
              });
            }
          },
          ...(isDev ? [{
            label: 'فتح ملف السجلات',
            click: () => {
              if (logFilePath) shell.openPath(path.dirname(logFilePath));
            }
          }] : [])
        ]
      }
    ];

    if (process.platform === 'darwin') {
      template.unshift({
        label: app.getName(),
        submenu: [
          { role: 'about', label: 'حول التطبيق' },
          { type: 'separator' },
          { role: 'services', label: 'الخدمات' },
          { type: 'separator' },
          { role: 'hide', label: 'إخفاء' },
          { role: 'hideOthers', label: 'إخفاء الآخرين' },
          { role: 'unhide', label: 'إظهار الكل' },
          { type: 'separator' },
          { role: 'quit', label: 'خروج' }
        ]
      });
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  // ─── أحداث التطبيق ───
  app.whenReady().then(() => {
    appIsReady = true;
    setupLogger();
    writeLog('INFO', `تشغيل التطبيق — isDev: ${isDev} — version: ${app.getVersion()}`);
    createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
  });

  app.on('window-all-closed', () => {
    writeLog('INFO', 'تم إغلاق جميع النوافذ');
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('before-quit', () => {
    writeLog('INFO', 'التطبيق على وشك الإغلاق');
  });

  // ─── IPC Handlers ───
  ipcMain.handle('app-version', () => app.getVersion());
  ipcMain.handle('app-path', () => app.getAppPath());
  ipcMain.handle('user-data-path', () => app.getPath('userData'));

  ipcMain.handle('window-minimize', () => { if (mainWindow) mainWindow.minimize(); });
  ipcMain.handle('window-maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) mainWindow.unmaximize();
      else mainWindow.maximize();
    }
  });
  ipcMain.handle('window-close', () => { if (mainWindow) mainWindow.close(); });
  ipcMain.handle('window-is-maximized', () => mainWindow ? mainWindow.isMaximized() : false);

  ipcMain.handle('show-save-dialog', async (event, options) => {
    return dialog.showSaveDialog(mainWindow, options);
  });

  ipcMain.handle('show-open-dialog', async (event, options) => {
    return dialog.showOpenDialog(mainWindow, options);
  });

  ipcMain.handle('show-message-box', async (event, options) => {
    return dialog.showMessageBox(mainWindow, options);
  });

  ipcMain.handle('print-invoice', async (event, data) => {
    try {
      if (mainWindow) mainWindow.webContents.send('print-invoice-data', data);
      return { success: true };
    } catch (error) {
      writeLog('ERROR', 'فشل إرسال بيانات الطباعة', error?.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('backup-data', async (event, data) => {
    try {
      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'حفظ نسخة احتياطية',
        defaultPath: `backup-${new Date().toISOString().split('T')[0]}.json`,
        filters: [{ name: 'ملفات JSON', extensions: ['json'] }]
      });
      if (!result.canceled) {
        fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2), 'utf8');
        return { success: true, path: result.filePath };
      }
      return { success: false, message: 'تم إلغاء العملية' };
    } catch (error) {
      writeLog('ERROR', 'فشل النسخ الاحتياطي', error?.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('restore-data', async () => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        title: 'استعادة نسخة احتياطية',
        filters: [{ name: 'ملفات JSON', extensions: ['json'] }],
        properties: ['openFile']
      });
      if (!result.canceled) {
        const data = fs.readFileSync(result.filePaths[0], 'utf8');
        return { success: true, data: JSON.parse(data) };
      }
      return { success: false, message: 'تم إلغاء العملية' };
    } catch (error) {
      writeLog('ERROR', 'فشل استعادة البيانات', error?.message);
      return { success: false, error: error.message };
    }
  });

  // منع إنشاء نوافذ جديدة من web-contents
  app.on('web-contents-created', (event, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        shell.openExternal(url);
      }
      return { action: 'deny' };
    });
  });
}