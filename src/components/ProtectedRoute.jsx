import React from 'react';
import { useAuth } from './AuthProvider';
import LoginForm from './LoginForm';
import { Loader2, Shield, AlertTriangle } from 'lucide-react';

const ProtectedRoute = ({ children, requiredPermission = null, requiredRole = null }) => {
  const { user, loading } = useAuth();

  // عرض شاشة التحميل
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // إذا لم يكن المستخدم مسجل الدخول
  if (!user) {
    return <LoginForm />;
  }

  // التحقق من الصلاحيات المطلوبة (استثناء للمدير العام)
  if (requiredPermission && user.role !== 'admin' && !user.permissions.includes(requiredPermission)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="glass-card hover-lift animate-fadeInUp p-8 max-w-md mx-4 text-center">
          <div className="w-16 h-16 bg-red-500 bg-opacity-20 rounded-full mx-auto mb-4 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-red-300" />
          </div>
          <h2 className="text-xl font-bold text-white mb-4">غير مصرح لك</h2>
          <p className="text-purple-200 mb-6">
            ليس لديك الصلاحية المطلوبة للوصول إلى هذه الصفحة
          </p>
          <div className="text-sm text-purple-300">
            <p>الصلاحية المطلوبة: <span className="font-mono">{requiredPermission}</span></p>
            <p>صلاحياتك الحالية: <span className="font-mono">{user.permissions.join(', ')}</span></p>
          </div>
        </div>
      </div>
    );
  }

  // التحقق من الدور المطلوب (استثناء للمدير العام)
  if (requiredRole && user.role !== 'admin' && user.role !== requiredRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="glass-card hover-lift animate-fadeInUp p-8 max-w-md mx-4 text-center">
          <div className="w-16 h-16 bg-red-500 bg-opacity-20 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Shield className="h-8 w-8 text-red-300" />
          </div>
          <h2 className="text-xl font-bold text-white mb-4">غير مصرح لك</h2>
          <p className="text-purple-200 mb-6">
            ليس لديك الدور المطلوب للوصول إلى هذه الصفحة
          </p>
          <div className="text-sm text-purple-300">
            <p>الدور المطلوب: <span className="font-mono">{requiredRole}</span></p>
            <p>دورك الحالي: <span className="font-mono">{user.role}</span></p>
          </div>
        </div>
      </div>
    );
  }

  // إذا كان المستخدم مسجل الدخول ولديه الصلاحيات المطلوبة
  return children;
};

export default ProtectedRoute;
