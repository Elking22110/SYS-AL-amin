import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import syncManager from '../utils/syncManager';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  BarChart3,
  Users,
  Truck,
  Settings,
  Store,
  User,
  LogOut,
  Clock,
  DollarSign,
  Menu,
  X
} from "lucide-react";
import soundManager from '../utils/soundManager.js';

const Sidebar = () => {
  const location = useLocation();
  const { user, logout, hasPermission, hasRole } = useAuth();
  const [syncStatus, setSyncStatus] = useState(syncManager.status);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = syncManager.subscribe(status => setSyncStatus(status));
    syncManager.startAutoSync();
    return () => {
      unsubscribe();
      syncManager.stopAutoSync();
    };
  }, []);

  // إغلاق القائمة عند التنقل
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const renderSyncIndicator = () => {
    let iconColor = 'bg-slate-400';
    let text = 'غير متصل بالسحاب';
    let textColor = 'text-slate-500';
    const isOffline = syncStatus === 'offline';
    const isSyncing = syncStatus === 'syncing';
    const isError = syncStatus === 'error';
    const isSynced = syncStatus === 'synced';

    if (isOffline) { iconColor = 'bg-red-500 animate-pulse'; text = 'يعمل محلياً (دون اتصال)'; textColor = 'text-red-600'; }
    else if (isSyncing) { iconColor = 'bg-yellow-500 animate-pulse'; text = 'جاري مزامنة السحاب...'; textColor = 'text-yellow-600'; }
    else if (isError) { iconColor = 'bg-orange-500 animate-bounce'; text = 'فشل التزامن السحابي'; textColor = 'text-orange-600'; }
    else if (isSynced) { iconColor = 'bg-green-500'; text = 'متصل ومزامن بالسحاب'; textColor = 'text-green-600'; }

    return (
      <div className="mx-6 mt-3 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between gap-2.5 text-[10px] font-semibold select-none shadow-sm transition-all duration-300">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${iconColor}`}></span>
          <span className={textColor}>{text}</span>
        </div>
        {window.navigator.onLine && (
          <button
            onClick={() => syncManager.triggerSync()}
            disabled={isSyncing}
            className={`p-1 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer ${isSyncing ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="مزامنة الآن يدويًا"
          >🔄</button>
        )}
      </div>
    );
  };

  const menuItems = [
    { path: "/", icon: LayoutDashboard, label: "لوحة التحكم", shortcut: "Ctrl+1", permission: null },
    { path: "/pos", icon: ShoppingCart, label: "نقطة البيع", shortcut: "Ctrl+2", permission: "pos_access" },
    { path: "/products", icon: Package, label: "المنتجات", shortcut: "Ctrl+3", permission: "manage_products" },
    { path: "/reports", icon: BarChart3, label: "التقارير", shortcut: "Ctrl+4", permission: "view_reports" },
    { path: "/customers", icon: Users, label: "العملاء", shortcut: "Ctrl+5", permission: "customer_access" },
    { path: "/suppliers", icon: Truck, label: "الموردين", shortcut: "Ctrl+6", permission: "customer_access" },
    { path: "/expenses", icon: DollarSign, label: "المصروفات", shortcut: "Ctrl+9", permission: "view_reports" },
    { path: "/settings", icon: Settings, label: "الإعدادات", shortcut: "Ctrl+7", role: "admin" },
    { path: "/shifts", icon: Clock, label: "الورديات", shortcut: "Ctrl+8", permission: "manage_shifts" }
  ].filter(item => {
    if (hasRole('admin')) return true;
    if (item.permission && !hasPermission(item.permission)) return false;
    if (item.role && !hasRole(item.role)) return false;
    return true;
  });

  // أهم 4 صفحات لشريط التبويب السفلي على الموبايل
  const mobileBottomItems = menuItems.filter(i =>
    ['/', '/pos', '/products', '/customers'].includes(i.path)
  ).slice(0, 4);

  const syncDot = (
    <span
      className={`w-2 h-2 rounded-full inline-block ${
        syncStatus === 'synced' ? 'bg-green-500' :
        syncStatus === 'syncing' ? 'bg-yellow-500 animate-pulse' :
        syncStatus === 'offline' ? 'bg-red-500' : 'bg-orange-500'
      }`}
    />
  );

  return (
    <>
      {/* ============================================================
          DESKTOP SIDEBAR  (md and above)
      ============================================================ */}
      <div className="hidden md:flex w-64 md:w-72 lg:w-80 xl:w-84 ipad-sidebar ipad-pro-sidebar text-slate-800 flex-col shadow-2xl relative overflow-y-auto no-scrollbar flex-shrink-0 h-screen nav-enhanced pb-4">

        <div className="p-6 border-b border-purple-500 border-opacity-20 relative z-10">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-glow">
              <Store className="h-6 w-6 text-slate-800" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900">Elking</h1>
              <p className="text-xs text-slate-600 font-medium">Elking POS System</p>
            </div>
          </div>
        </div>

        {renderSyncIndicator()}

        <nav className="flex-1 p-4 relative z-10">
          <div className="space-y-3">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => soundManager.play('click')}
                  className={`menu-item flex items-center justify-between p-4 rounded-xl group relative overflow-hidden transition-all duration-300 ${isActive
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-glow'
                    : 'text-slate-700 hover:bg-violet-500 hover:bg-opacity-10 hover:text-violet-600'}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg transition-colors ${isActive ? 'bg-white bg-opacity-20' : 'bg-slate-100 group-hover:bg-violet-100'}`}>
                      <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-violet-600'}`} />
                    </div>
                    <span className="font-semibold text-sm">{item.label}</span>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full font-semibold ${isActive ? 'bg-white bg-opacity-20 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-violet-100 group-hover:text-violet-600'}`}>
                    {item.shortcut}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="p-4 border-t border-purple-500 border-opacity-20 relative z-10">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-slate-800" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-slate-800">{user ? user.username : 'غير مسجل'}</div>
              {user && <div className="text-xs text-slate-500">{user.role === 'admin' ? 'مدير عام' : user.role === 'manager' ? 'مدير' : 'كاشير'}</div>}
            </div>
          </div>
          <div className="space-y-2">
            <Link to="/profile" onClick={() => soundManager.play('click')} className={`flex items-center p-3 rounded-lg ${location.pathname === '/profile' ? 'bg-purple-500 bg-opacity-20 text-purple-300' : 'text-slate-700 hover:bg-purple-500 hover:bg-opacity-10 hover:text-slate-800'}`}>
              <User className="h-4 w-4 mr-3" />
              <span className="text-sm font-medium">الملف الشخصي</span>
            </Link>
            <button
              onClick={() => { if (user) { soundManager.play('logout'); logout(); } }}
              className={`w-full flex items-center p-3 rounded-lg ${user ? 'text-slate-700 hover:bg-red-500 hover:bg-opacity-10 hover:text-red-300' : 'text-gray-500 cursor-not-allowed opacity-50'}`}
              disabled={!user}
            >
              <LogOut className="h-4 w-4 mr-3" />
              <span className="text-sm font-medium">تسجيل الخروج</span>
            </button>
            <div className="text-center pt-2">
              <div className="text-xs text-slate-600 mb-1 font-semibold">الإصدار 2.0.0</div>
              <div className="text-xs text-slate-500 font-medium">© 2026 Elking</div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          MOBILE TOP BAR  (below md)
      ============================================================ */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 shadow-sm" style={{ direction: 'rtl' }}>
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <Store className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-slate-800 text-sm">Elking</span>
          </div>
          <div className="flex items-center gap-3">
            {syncDot}
            <button
              onClick={() => setMobileMenuOpen(v => !v)}
              className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-violet-100 hover:text-violet-700 transition-colors"
              aria-label="القائمة"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================
          MOBILE FULL MENU OVERLAY
      ============================================================ */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40" style={{ top: '56px' }}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          {/* Menu Sheet */}
          <div className="relative bg-white rounded-b-2xl shadow-2xl p-4" style={{ direction: 'rtl' }}>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {menuItems.map(item => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => { soundManager.play('click'); setMobileMenuOpen(false); }}
                    className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl transition-all active:scale-95 ${isActive
                      ? 'bg-violet-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-700 hover:bg-violet-50 hover:text-violet-700'}`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-[11px] font-semibold text-center leading-tight">{item.label}</span>
                  </Link>
                );
              })}
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-800">{user?.username || 'غير مسجل'}</div>
                  <div className="text-[10px] text-slate-500">{user?.role === 'admin' ? 'مدير عام' : 'كاشير'}</div>
                </div>
              </div>
              <button
                onClick={() => { if (user) { soundManager.play('logout'); logout(); } }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 transition-colors active:scale-95"
              >
                <LogOut className="h-4 w-4" />
                خروج
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MOBILE BOTTOM TAB BAR
      ============================================================ */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-slate-200 shadow-lg"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-stretch justify-around">
          {mobileBottomItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => soundManager.play('click')}
                className={`flex flex-col items-center gap-0.5 py-2 px-3 flex-1 transition-all active:scale-95 ${isActive ? 'text-violet-700' : 'text-slate-500'}`}
              >
                <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-violet-100' : ''}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className={`text-[10px] font-bold ${isActive ? 'text-violet-700' : 'text-slate-500'}`}>{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setMobileMenuOpen(v => !v)}
            className={`flex flex-col items-center gap-0.5 py-2 px-3 flex-1 transition-all active:scale-95 ${mobileMenuOpen ? 'text-violet-700' : 'text-slate-500'}`}
          >
            <div className={`p-1.5 rounded-xl ${mobileMenuOpen ? 'bg-violet-100' : ''}`}>
              <Menu className="h-5 w-5" />
            </div>
            <span className={`text-[10px] font-bold ${mobileMenuOpen ? 'text-violet-700' : 'text-slate-500'}`}>المزيد</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;