import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { User, Lock, Eye, EyeOff, Loader2, Shield, Key, AlertCircle, CheckCircle } from 'lucide-react';

const LoginForm = () => {
  const { login, loading } = useAuth();
  const [formData, setFormData] = useState({ username: 'admin', password: 'admin' });
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
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center bg-slate-900">
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-slate-800/90 border border-slate-700 rounded-2xl shadow-2xl p-8 backdrop-blur-xl">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Shield className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">SIS AL AMEEN - نظام الأمين</h1>
            <p className="text-slate-400 text-sm">تسجيل الدخول إلى النظام</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/40 rounded-xl">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2 shrink-0" />
                <span className="text-red-200 text-sm">{error}</span>
              </div>
            </div>
          )}
          {success && (
            <div className="mb-6 p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-xl">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-emerald-400 mr-2 shrink-0" />
                <span className="text-emerald-200 text-sm">{success}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative">
              <User className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
              <input type="text" name="username" value={formData.username} onChange={(e)=>setFormData({...formData, username:e.target.value})} className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pr-12 pl-4 py-3.5 text-right font-medium text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all" placeholder="اسم المستخدم" disabled={loading} autoComplete="username" />
            </div>
            <div className="relative">
              <Lock className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
              <input type={showPassword?'text':'password'} name="password" value={formData.password} onChange={(e)=>setFormData({...formData, password:e.target.value})} className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pr-12 pl-12 py-3.5 text-right font-medium text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all" placeholder="كلمة المرور" disabled={loading} autoComplete="current-password" />
              <button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors" disabled={loading}>
                {showPassword ? <EyeOff className="h-5 w-5"/> : <Eye className="h-5 w-5"/>}
              </button>
            </div>
            <button type="submit" disabled={loading} className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-lg font-bold shadow-lg shadow-violet-600/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center">
              {loading ? (<><Loader2 className="h-5 w-5 mr-2 animate-spin"/>جاري تسجيل الدخول...</>) : (<><Key className="h-5 w-5 mr-2"/>تسجيل الدخول</>)}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
