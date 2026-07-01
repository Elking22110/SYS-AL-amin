import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
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
                className={`menu-item flex items-center justify-between p-4 rounded-xl group relative overflow-hidden ${isActive
                  ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-slate-800 shadow-glow'
                  : 'text-slate-700 hover:bg-purple-500 hover:bg-opacity-10 hover:text-slate-800'
                  }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${isActive
                    ? 'bg-purple-400 bg-opacity-30'
                    : 'bg-gray-500 bg-opacity-20 group-hover:bg-purple-500 group-hover:bg-opacity-30'
                    }`}>
                    <Icon className={`h-4 w-4 ${isActive ? 'text-slate-800' : 'text-slate-600 group-hover:text-slate-800'
                      }`} />
                  </div>
                  <span className="font-semibold text-sm">{item.label}</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${isActive
                  ? 'bg-purple-400 bg-opacity-30 text-slate-800'
                  : 'bg-gray-500 bg-opacity-20 text-slate-600 group-hover:bg-purple-500 group-hover:bg-opacity-30 group-hover:text-slate-800'
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