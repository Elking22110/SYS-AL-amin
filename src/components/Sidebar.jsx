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
  TrendingUp,
  Bell,
  User,
  LogOut,
  Clock,
  DollarSign
} from "lucide-react";
import soundManager from '../utils/soundManager.js';

const Sidebar = () => {
  const location = useLocation();
  const { user, logout, hasPermission, hasRole } = useAuth();
  const [syncStatus, setSyncStatus] = useState(syncManager.status);

  useEffect(() => {
    const unsubscribe = syncManager.subscribe(status => setSyncStatus(status));
    syncManager.startAutoSync();
    return () => {
      unsubscribe();
      syncManager.stopAutoSync();
    };
  }, []);

  const renderSyncIndicator = () => {
    let iconColor = 'bg-slate-400';
    let text = 'غير متصل بالسحاب';
    let textColor = 'text-slate-500';
    let isOffline = syncStatus === 'offline';
    let isSyncing = syncStatus === 'syncing';
    let isError = syncStatus === 'error';
    let isSynced = syncStatus === 'synced';

    if (isOffline) {
      iconColor = 'bg-red-500 animate-pulse';
      text = 'يعمل محلياً (دون اتصال)';
      textColor = 'text-red-600';
    } else if (isSyncing) {
      iconColor = 'bg-yellow-500 animate-pulse';
      text = 'جاري مزامنة السحاب...';
      textColor = 'text-yellow-600';
    } else if (isError) {
      iconColor = 'bg-orange-500 animate-bounce';
      text = 'فشل التزامن السحابي';
      textColor = 'text-orange-600';
    } else if (isSynced) {
      iconColor = 'bg-green-500';
      text = 'متصل ومزامن بالسحاب';
      textColor = 'text-green-600';
    }

    return (
      <div className="mx-6 mt-3 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between gap-2.5 text-[10px] font-semibold select-none shadow-sm transition-all duration-300">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${iconColor}`}></span>
          <span className={`${textColor}`}>{text}</span>
        </div>
        {window.navigator.onLine && (
          <button
            onClick={() => syncManager.triggerSync()}
            disabled={isSyncing}
            className={`p-1 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer ${isSyncing ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="مزامنة الآن يدويًا"
          >
            🔄
          </button>
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
    // المدير العام يرى جميع الأقسام
    if (hasRole('admin')) return true;

    if (item.permission && !hasPermission(item.permission)) return false;
    if (item.role && !hasRole(item.role)) return false;
    return true;
  });

  return (
    <div className="w-64 md:w-72 lg:w-80 xl:w-84 ipad-sidebar ipad-pro-sidebar text-slate-800 flex flex-col shadow-2xl relative overflow-y-auto no-scrollbar flex-shrink-0 h-screen nav-enhanced pb-4">

      {/* Header */}
      <div className="p-6 border-b border-purple-500 border-opacity-20 relative z-10">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-glow">
            <Store className="h-6 w-6 text-slate-800" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900">
              متجر الأمين
            </h1>
            <p className="text-xs text-slate-600 font-medium">أدوات صحية وسباكة</p>
          </div>
        </div>
      </div>

      {/* مؤشر حالة التزامن السحابي */}
      {renderSyncIndicator()}


      {/* Navigation */}
      <nav className="flex-1 p-4 relative z-10">
        <div className="space-y-3">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => soundManager.play('click')}
                className={`menu-item flex items-center justify-between p-4 rounded-xl group relative overflow-hidden transition-all duration-300 ${isActive
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-glow'
                  : 'text-slate-700 hover:bg-violet-500 hover:bg-opacity-10 hover:text-violet-600 dark:text-slate-300 dark:hover:text-violet-400'
                  }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg transition-colors ${isActive
                    ? 'bg-white bg-opacity-20'
                    : 'bg-slate-100 dark:bg-slate-800 group-hover:bg-violet-100 dark:group-hover:bg-violet-950'
                    }`}>
                    <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-violet-600 dark:text-slate-400'
                      }`} />
                  </div>
                  <span className="font-semibold text-sm">{item.label}</span>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-full font-semibold transition-all ${isActive
                  ? 'bg-white bg-opacity-20 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-violet-100 group-hover:text-violet-600 dark:text-slate-400'
                  }`}>
                  {item.shortcut}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>


      {/* User Profile Section */}
      {(
        <div className="p-4 border-t border-purple-500 border-opacity-20 relative z-10">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-slate-800" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-slate-800">{user ? user.username : 'غير مسجل'}</div>
              {user && (
                <div className="text-xs text-slate-500">
                  {user.role === 'admin' ? 'مدير عام' : user.role === 'manager' ? 'مدير' : 'كاشير'}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Link
              to="/profile"
              onClick={() => soundManager.play('click')}
              className={`flex items-center p-3 rounded-lg ${location.pathname === '/profile'
                ? 'bg-purple-500 bg-opacity-20 text-purple-300'
                : 'text-slate-700 hover:bg-purple-500 hover:bg-opacity-10 hover:text-slate-800'
                }`}
            >
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

            {/* معلومات الإصدار والمتجر */}
            <div className="text-center pt-2">
              <div className="text-xs text-slate-600 mb-1 font-semibold">الإصدار 2.0.0</div>
              <div className="text-xs text-slate-500 font-medium">© 2026 متجر الأمين</div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Sidebar;