import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { User, Lock, Eye, EyeOff, Loader2, Shield, Key, AlertCircle, CheckCircle } from 'lucide-react';

const LoginForm = () => {
  const { login, loading } = useAuth();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!formData.username || !formData.password) {
      setError('يرجى ملء جميع الحقول');
      return;
    }
    const result = await login(formData.username, formData.password);
    if (result.success) {
      setSuccess('تم تسجيل الدخول بنجاح!');
    } else {
      setError(result.error || 'فشل في تسجيل الدخول');
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="glass-card hover-lift p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center animate-pulse-custom">
              <Shield className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">تسجيل الدخول</h1>
            <p className="text-purple-200 text-sm">مرحبا بك</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500 bg-opacity-20 border border-red-500 border-opacity-30 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-300 mr-2" />
                <span className="text-red-300 text-sm">{error}</span>
              </div>
            </div>
          )}
          {success && (
            <div className="mb-6 p-4 bg-green-500 bg-opacity-20 border border-green-500 border-opacity-30 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-300 mr-2" />
                <span className="text-green-300 text-sm">{success}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <User className="absolute right-4 top-1/2 transform -translate-y-1/2 text-purple-300 h-5 w-5" />
              <input type="text" name="username" value={formData.username} onChange={(e)=>setFormData({...formData, username:e.target.value})} className="input-modern w-full pr-12 pl-4 py-4 text-right font-medium" placeholder="اسم المستخدم" disabled={loading} autoComplete="username" />
            </div>
            <div className="relative">
              <Lock className="absolute right-4 top-1/2 transform -translate-y-1/2 text-purple-300 h-5 w-5" />
              <input type={showPassword?'text':'password'} name="password" value={formData.password} onChange={(e)=>setFormData({...formData, password:e.target.value})} className="input-modern w-full pr-12 pl-12 py-4 text-right font-medium" placeholder="كلمة المرور" disabled={loading} autoComplete="current-password" />
              <button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-300 hover:text-white transition-colors" disabled={loading}>
                {showPassword ? <EyeOff className="h-5 w-5"/> : <Eye className="h-5 w-5"/>}
              </button>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center">
              {loading ? (<><Loader2 className="h-5 w-5 mr-2 animate-spin"/>جاري تسجيل الدخول...</>) : (<><Key className="h-5 w-5 mr-2"/>تسجيل الدخول</>)}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
