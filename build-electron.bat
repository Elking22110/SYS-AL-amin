@echo off
chcp 65001 >nul
echo ========================================
echo    بناء تطبيق سطح المكتب - Electron
echo ========================================
echo.

echo [1/4] تنظيف الملفات السابقة...
if exist "dist" rmdir /s /q "dist"
if exist "release" rmdir /s /q "release"
echo ✓ تم تنظيف الملفات السابقة

echo.
echo [2/4] تثبيت التبعيات...
call npm install
if %errorlevel% neq 0 (
    echo ❌ فشل في تثبيت التبعيات
    pause
    exit /b 1
)
echo ✓ تم تثبيت التبعيات بنجاح

echo.
echo [3/4] بناء التطبيق...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ فشل في بناء التطبيق
    pause
    exit /b 1
)
echo ✓ تم بناء التطبيق بنجاح

echo.
echo [4/4] بناء تطبيق Electron...
call npm run electron:build
if %errorlevel% neq 0 (
    echo ❌ فشل في بناء تطبيق Electron
    pause
    exit /b 1
)
echo ✓ تم بناء تطبيق Electron بنجاح

echo.
echo ========================================
echo    تم البناء بنجاح! 🎉
echo ========================================
echo.
echo يمكنك العثور على التطبيق في مجلد: release\
echo.
pause