import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { formatDateTime, getCurrentDate } from '../utils/dateUtils.js';
import { 
  User, 
  Mail, 
  Shield, 
  Key, 
  LogOut, 
  Save, 
  Eye, 
  EyeOff,
  CheckCircle,
  AlertCircle,
  Loader2,
  Settings,
  Activity,
  Clock
} from 'lucide-react';

const UserProfile = () => {
  const { user, logout, updateUser, changePassword, logActivity } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'كلمات المرور الجديدة غير متطابقة' });
      setLoading(false);
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل' });
      setLoading(false);
      return;
    }

    const result = await changePassword(passwordForm.oldPassword, passwordForm.newPassword);
    
    if (result.success) {
      setMessage({ type: 'success', text: 'تم تغيير كلمة المرور بنجاح' });
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } else {
      setMessage({ type: 'error', text: result.error || 'فشل في تغيير كلمة المرور' });
    }
    
    setLoading(false);
  };

  const handleLogout = () => {
    logActivity('LOGOUT_CONFIRMED', { username: user.username });
    logout();
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-purple-500 bg-opacity-20 text-purple-300 border-purple-500 border-opacity-30';
      case 'manager': return 'bg-blue-500 bg-opacity-20 text-blue-300 border-blue-500 border-opacity-30';
      case 'cashier': return 'bg-green-500 bg-opacity-20 text-green-300 border-green-500 border-opacity-30';
      default: return 'bg-gray-500 bg-opacity-20 text-gray-300 border-gray-500 border-opacity-30';
    }
  };

  const getRoleName = (role) => {
    switch (role) {
      case 'admin': return 'مدير عام';
      case 'manager': return 'مدير';
      case 'cashier': return 'كاشير';
      default: return 'مستخدم';
    }
  };

  const getPermissionColor = (permission) => {
    switch (permission) {
      case 'admin': return 'bg-red-500 bg-opacity-20 text-red-300';
      case 'write': return 'bg-blue-500 bg-opacity-20 text-blue-300';
      case 'read': return 'bg-green-500 bg-opacity-20 text-green-300';
      case 'delete': return 'bg-orange-500 bg-opacity-20 text-orange-300';
      default: return 'bg-gray-500 bg-opacity-20 text-gray-300';
    }
  };

  return (
    <div className="glass-card hover-lift animate-fadeInUp p-6">
      <div className="flex items-center mb-6">
        <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mr-4">
          <User className="h-8 w-8 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">{user.username}</h2>
          <p className="text-purple-200">{user.email}</p>
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getRoleColor(user.role)}`}>
            {user.role === 'admin' ? 'مدير عام' : user.role === 'manager' ? 'مدير' : 'كاشير'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'profile' 
              ? 'bg-purple-500 bg-opacity-20 text-purple-300 border border-purple-500 border-opacity-30' 
              : 'text-white hover:bg-white hover:bg-opacity-10'
          }`}
        >
          <User className="h-4 w-4 inline mr-2" />
          الملف الشخصي
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'security' 
              ? 'bg-purple-500 bg-opacity-20 text-purple-300 border border-purple-500 border-opacity-30' 
              : 'text-white hover:bg-white hover:bg-opacity-10'
          }`}
        >
          <Shield className="h-4 w-4 inline mr-2" />
          الأمان
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'activity' 
              ? 'bg-purple-500 bg-opacity-20 text-purple-300 border border-purple-500 border-opacity-30' 
              : 'text-white hover:bg-white hover:bg-opacity-10'
          }`}
        >
          <Activity className="h-4 w-4 inline mr-2" />
          النشاط
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">اسم المستخدم</label>
              <div className="input-modern flex items-center">
                <User className="h-5 w-5 text-purple-300 mr-3" />
                <span className="text-white">{user.username}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">البريد الإلكتروني</label>
              <div className="input-modern flex items-center">
                <Mail className="h-5 w-5 text-purple-300 mr-3" />
                <span className="text-white">{user.email}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-purple-200 mb-2">الدور</label>
            <div className="input-modern flex items-center">
              <Shield className="h-5 w-5 text-purple-300 mr-3" />
              <span className="text-white">
                {user.role === 'admin' ? 'مدير عام' : user.role === 'manager' ? 'مدير' : 'كاشير'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-purple-200 mb-2">الصلاحيات</label>
            <div className="flex flex-wrap gap-2">
              {user.permissions.map((permission) => (
                <span
                  key={permission}
                  className={`px-3 py-1 text-xs font-semibold rounded-full ${getPermissionColor(permission)}`}
                >
                  {permission === 'admin' ? 'إدارة' : 
                   permission === 'write' ? 'كتابة' : 
                   permission === 'read' ? 'قراءة' : 
                   permission === 'delete' ? 'حذف' : permission}
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-purple-200 mb-2">آخر تسجيل دخول</label>
            <div className="input-modern flex items-center">
              <Clock className="h-5 w-5 text-purple-300 mr-3" />
              <span className="text-white">{formatDateTime(user.lastLogin)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="relative">
              <Key className="absolute right-4 top-1/2 transform -translate-y-1/2 text-purple-300 h-5 w-5" />
              <input
                type={showPasswords.old ? 'text' : 'password'}
                value={passwordForm.oldPassword}
                onChange={(e) => setPasswordForm({...passwordForm, oldPassword: e.target.value})}
                className="input-modern w-full pr-12 pl-12 py-3 text-right font-medium"
                placeholder="كلمة المرور الحالية"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPasswords({...showPasswords, old: !showPasswords.old})}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-300 hover:text-white transition-colors"
              >
                {showPasswords.old ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            <div className="relative">
              <Key className="absolute right-4 top-1/2 transform -translate-y-1/2 text-purple-300 h-5 w-5" />
              <input
                type={showPasswords.new ? 'text' : 'password'}
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                className="input-modern w-full pr-12 pl-12 py-3 text-right font-medium"
                placeholder="كلمة المرور الجديدة"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-300 hover:text-white transition-colors"
              >
                {showPasswords.new ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            <div className="relative">
              <Key className="absolute right-4 top-1/2 transform -translate-y-1/2 text-purple-300 h-5 w-5" />
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                className="input-modern w-full pr-12 pl-12 py-3 text-right font-medium"
                placeholder="تأكيد كلمة المرور الجديدة"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPasswords({...showPasswords, confirm: !showPasswords.confirm})}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-300 hover:text-white transition-colors"
              >
                {showPasswords.confirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {message.text && (
              <div className={`p-4 rounded-lg ${
                message.type === 'success' 
                  ? 'bg-green-500 bg-opacity-20 border border-green-500 border-opacity-30' 
                  : 'bg-red-500 bg-opacity-20 border border-red-500 border-opacity-30'
              }`}>
                <div className="flex items-center">
                  {message.type === 'success' ? (
                    <CheckCircle className="h-5 w-5 text-green-300 mr-2" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-300 mr-2" />
                  )}
                  <span className={`text-sm ${
                    message.type === 'success' ? 'text-green-300' : 'text-red-300'
                  }`}>
                    {message.text}
                  </span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  جاري التحديث...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  تغيير كلمة المرور
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <div className="space-y-4">
          <div className="text-center text-purple-200">
            <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>سجل النشاطات سيتم عرضه هنا</p>
            <p className="text-sm">جميع العمليات الحساسة يتم تسجيلها تلقائياً</p>
          </div>
        </div>
      )}

      {/* Logout Button */}
      <div className="mt-8 pt-6 border-t border-white border-opacity-20">
        <button
          onClick={handleLogout}
          className="w-full bg-red-500 bg-opacity-20 text-red-300 py-3 rounded-lg hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center border border-red-500 border-opacity-30"
        >
          <LogOut className="h-5 w-5 mr-2" />
          تسجيل الخروج
        </button>
      </div>
    </div>
  );
};

export default UserProfile;
