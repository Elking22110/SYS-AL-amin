@echo off
chcp 65001 >nul
echo ========================================
echo  بناء التطبيق النهائي للتوزيع - Electron
echo ========================================
echo.

echo [1/5] تنظيف شامل...
if exist "dist" rmdir /s /q "dist"
if exist "release" rmdir /s /q "release"
if exist "node_modules" rmdir /s /q "node_modules"
echo ✓ تم التنظيف الشامل

echo.
echo [2/5] تثبيت التبعيات من جديد...
call npm install
if %errorlevel% neq 0 (
    echo ❌ فشل في تثبيت التبعيات
    pause
    exit /b 1
)
echo ✓ تم تثبيت التبعيات بنجاح

echo.
echo [3/5] فحص الأمان...
call npm audit
echo ✓ تم فحص الأمان

echo.
echo [4/5] بناء التطبيق للإنتاج...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ فشل في بناء التطبيق
    pause
    exit /b 1
)
echo ✓ تم بناء التطبيق بنجاح

echo.
echo [5/5] بناء التطبيق النهائي للتوزيع...
call npm run electron:dist
if %errorlevel% neq 0 (
    echo ❌ فشل في بناء التطبيق النهائي
    pause
    exit /b 1
)
echo ✓ تم بناء التطبيق النهائي بنجاح

echo.
echo ========================================
echo    تم البناء النهائي بنجاح! 🎉
echo ========================================
echo.
echo يمكنك العثور على التطبيق في مجلد: release\
echo.
echo الملفات المتاحة:
dir /b release\*.exe 2>nul
dir /b release\*.msi 2>nul
dir /b release\*.dmg 2>nul
dir /b release\*.AppImage 2>nul
echo.
echo حجم التطبيق:
for %%f in (release\*.exe) do echo %%~nxf: %%~zf bytes
for %%f in (release\*.msi) do echo %%~nxf: %%~zf bytes
echo.
pause