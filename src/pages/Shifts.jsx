import React from 'react';
import { useAuth } from '../components/AuthProvider';
import ShiftManager from '../components/ShiftManager';
import { Shield } from 'lucide-react';

const Shifts = () => {
  const { user, hasPermission } = useAuth();

  // فحص الصلاحيات (استثناء للمدير العام)
  if (user?.role !== 'admin' && !hasPermission('manage_shifts')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center">
        <div className="glass-card p-8 text-center max-w-md mx-4">
          <div className="w-20 h-20 bg-red-500 bg-opacity-20 rounded-full mx-auto mb-6 flex items-center justify-center">
            <Shield className="h-10 w-10 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">غير مصرح لك</h2>
          <p className="text-purple-200 mb-6">
            ليس لديك صلاحية للوصول إلى صفحة الورديات. يرجى التواصل مع المدير.
          </p>
          <div className="text-sm text-gray-400">
            دورك الحالي: {user?.role === 'admin' ? 'مدير عام' : user?.role === 'manager' ? 'مدير' : 'كاشير'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">إدارة الورديات</h1>
          <p className="text-purple-200">إدارة ورديات العمل ومراقبة الأداء</p>
        </div>
        
        <ShiftManager />
      </div>
    </div>
  );
};

export default Shifts;
