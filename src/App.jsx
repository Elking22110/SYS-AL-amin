import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./components/AuthProvider";
import { NotificationProvider } from "./components/NotificationSystem";
import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import Products from "./pages/Products";
import Reports from "./pages/Reports";
import Customers from "./pages/Customers";
import CustomerDetails from "./pages/CustomerDetails";
import Suppliers from "./pages/Suppliers";
import SupplierDetails from "./pages/SupplierDetails";
import Expenses from "./pages/Expenses";
import Settings from "./pages/Settings";
import Shifts from "./pages/Shifts";
import UserProfile from "./components/UserProfile";
import LoginForm from "./components/LoginForm";
import LicenseActivationModal from "./components/LicenseActivationModal";
import { licenseManager } from "./utils/licenseManager.js";
import { observerManager } from "./utils/observerManager";
import { DataValidator, StorageMonitor } from "./utils/dataValidation";
import DataLoader from "./components/DataLoader";
import databaseManager from "./utils/database";
import { getCurrentDate, cleanExistingData } from './utils/dateUtils.js';
import { subscribe, EVENTS } from "./utils/observerManager";
import { hashPassword } from './utils/security.js';
import { initTheme } from "./utils/themeUtils";
import { runCategoryMigration } from "./utils/categoryMigration";
import syncManager from "./utils/syncManager";
import ErrorBoundary from "./components/ErrorBoundary";

function MainAppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [bootState, setBootState] = useState('BOOTING'); // 'BOOTING' | 'LICENSE_REQUIRED' | 'AUTH_REQUIRED' | 'READY'

  // 1. Core Boot State Gate Enforcement
  const checkBootGates = () => {
    // Step A: Validate License Gate
    const licCheck = licenseManager.verifyActivation();
    if (!licCheck || !licCheck.isActivated) {
      syncManager.stopAutoSync();
      setBootState('LICENSE_REQUIRED');
      return;
    }

    // Step B: Validate User Auth Gate
    if (authLoading) return; // Wait for auth provider to finish checking storage

    if (!user) {
      syncManager.stopAutoSync();
      setBootState('AUTH_REQUIRED');
      return;
    }

    // Step C: License Valid + User Authenticated -> READY
    setBootState('READY');
    syncManager.startAutoSync();

    // Redirection Guard: ensure valid page path
    const validPaths = ['/', '/pos', '/products', '/reports', '/customers', '/suppliers', '/shifts', '/expenses', '/settings', '/profile'];
    if (!validPaths.some(p => location.pathname === p || location.pathname.startsWith(p + '/'))) {
      navigate('/', { replace: true });
    }
  };

  useEffect(() => {
    checkBootGates();
  }, [user, authLoading]);

  // Handle License Activation Event
  const handleLicenseActivated = () => {
    checkBootGates();
  };

  // Keyboard Shortcuts (Gated by READY state)
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (bootState !== 'READY') return;
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;

      if (event.ctrlKey) {
        switch (event.key) {
          case '1': event.preventDefault(); navigate('/'); break;
          case '2': event.preventDefault(); navigate('/pos'); break;
          case '3': event.preventDefault(); navigate('/products'); break;
          case '4': event.preventDefault(); navigate('/reports'); break;
          case '5': event.preventDefault(); navigate('/customers'); break;
          case '6': event.preventDefault(); navigate('/suppliers'); break;
          case '7': event.preventDefault(); navigate('/settings'); break;
          case '8': event.preventDefault(); navigate('/shifts'); break;
          default: break;
        }
      }
      if (event.key === 'F1') {
        event.preventDefault();
        alert('اختصارات لوحة المفاتيح:\n\nCtrl+1: لوحة التحكم\nCtrl+2: نقطة البيع\nCtrl+3: المنتجات\nCtrl+4: التقارير\nCtrl+5: العملاء\nCtrl+6: الموردين\nCtrl+7: الإعدادات\n\nF1: عرض هذه المساعدة');
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate, bootState]);

  // Observer & Shift events (Gated by READY state)
  useEffect(() => {
    if (bootState !== 'READY') return;

    observerManager.stopAll();
    initTheme();

    const initDatabase = async () => {
      try {
        await databaseManager.init();
        await databaseManager.ensureStoresExist();
        cleanExistingData();
        runCategoryMigration();
      } catch (error) {
        console.error('❌ خطأ في تهيئة قاعدة البيانات:', error);
      }
    };
    initDatabase();
    StorageMonitor.init();

    const validation = DataValidator.validateStoredData();
    if (!validation.isValid) {
      DataValidator.repairData();
    }

    // إنشاء نسخة احتياطية كل 15 دقيقة لتخفيف الضغط على الذاكرة والـ CPU
    const backupInterval = setInterval(() => DataValidator.createBackup(), 900000);
    const cleanupInterval = setInterval(() => DataValidator.cleanupOldData(), 86400000);

    return () => {
      clearInterval(backupInterval);
      clearInterval(cleanupInterval);
    };
  }, [bootState]);

  // ─── GATE 1: BOOTING LOADER ───
  if (bootState === 'BOOTING' || authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-semibold">جاري التثبت من ترخيص وأمان النظام...</p>
        </div>
      </div>
    );
  }

  // ─── GATE 2: LICENSE ACTIVATION REQUIRED ───
  if (bootState === 'LICENSE_REQUIRED') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <LicenseActivationModal
          isOpen={true}
          onClose={null}
          onActivated={handleLicenseActivated}
        />
      </div>
    );
  }

  // ─── GATE 3: USER AUTHENTICATION REQUIRED ───
  if (bootState === 'AUTH_REQUIRED') {
    return <LoginForm />;
  }

  // ─── GATE 4: FULL PROTECTED APPLICATION (READY) ───
  return (
    <ErrorBoundary>
      <DataLoader>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 max-w-full w-full h-full ipad-main-content ipad-pro-main-content pt-14 md:pt-0 pb-16 md:pb-0">
            <Routes>
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/pos" element={<ProtectedRoute requiredPermission="pos_access"><POS /></ProtectedRoute>} />
              <Route path="/products" element={<ProtectedRoute requiredPermission="manage_products"><Products /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute requiredPermission="view_reports"><Reports /></ProtectedRoute>} />
              <Route path="/customers" element={<ProtectedRoute requiredPermission="manage_customers"><Customers /></ProtectedRoute>} />
              <Route path="/customers/:id" element={<ProtectedRoute requiredPermission="manage_customers"><CustomerDetails /></ProtectedRoute>} />
              <Route path="/suppliers" element={<ProtectedRoute requiredPermission="manage_customers"><Suppliers /></ProtectedRoute>} />
              <Route path="/suppliers/:id" element={<ProtectedRoute requiredPermission="manage_customers"><SupplierDetails /></ProtectedRoute>} />
              <Route path="/shifts" element={<ProtectedRoute requiredPermission="manage_shifts"><Shifts /></ProtectedRoute>} />
              <Route path="/expenses" element={<ProtectedRoute requiredPermission="view_reports"><Expenses /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute requiredRole="admin"><Settings /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
      </DataLoader>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <MainAppShell />
      </AuthProvider>
    </NotificationProvider>
  );
}

export default App;