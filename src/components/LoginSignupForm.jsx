import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle,
  CheckCircle,
  Loader2,
  Shield,
  Key,
  Mail,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import soundManager from '../utils/soundManager.js';

const LoginSignupForm = () => {
  const { login, loading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // تفعيل الأنيميشن عند تحميل المكون
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsActive(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (isLogin) {
      // تسجيل الدخول
      if (!formData.username || !formData.password) {
        soundManager.play('error');
        setError('يرجى ملء جميع الحقول');
        return;
      }

      const result = await login(formData.username, formData.password);
      
      if (result.success) {
        soundManager.play('login');
        setSuccess('تم تسجيل الدخول بنجاح!');
      } else {
        soundManager.play('error');
        setError(result.error || 'فشل في تسجيل الدخول');
      }
    } else {
      // إنشاء حساب جديد
      if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
        soundManager.play('error');
        setError('يرجى ملء جميع الحقول');
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        soundManager.play('error');
        setError('كلمة المرور غير متطابقة');
        return;
      }

      // محاكاة إنشاء حساب جديد
      soundManager.play('success');
      setSuccess('تم إنشاء الحساب بنجاح!');
      
      // تبديل إلى تسجيل الدخول بعد 2 ثانية
      setTimeout(() => {
        setIsLogin(true);
        setFormData(prev => ({
          ...prev,
          email: '',
          confirmPassword: ''
        }));
      }, 2000);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    soundManager.play('click');
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (error) setError('');
  };

  const toggleMode = () => {
    soundManager.play('click');
    setIsLogin(!isLogin);
    setFormData({
      username: '',
      email: '',
      password: '',
      confirmPassword: ''
    });
    setError('');
    setSuccess('');
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      {/* Background Animation */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-40 left-40 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" style={{animationDelay: '4s'}}></div>
      </div>

      <div className="relative z-10 w-full max-w-4xl mx-4">
        <div className={`container ${isActive ? 'active' : ''}`}>
          <div className="form-box">
            {/* Login Form */}
            <div className={`form-box Login ${isLogin ? 'active' : ''}`}>
              <div className="animation" style={{'--li': 1}}>
                <div className="glass-card hover-lift p-8">
                  {/* Header */}
                  <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center animate-pulse-custom">
                      <Shield className="h-10 w-10 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2 bg-gradient-to-r from-white via-purple-200 to-blue-300 bg-clip-text text-transparent">
                      تسجيل الدخول
                    </h1>
                    <p className="text-purple-200 text-sm">
                      مرحباً بك مرة أخرى
                    </p>
                  </div>

                  {/* Error/Success Messages */}
                  {error && (
                    <div className="mb-6 p-4 bg-red-500 bg-opacity-20 border border-red-500 border-opacity-30 rounded-lg animate-fadeInDown">
                      <div className="flex items-center">
                        <AlertCircle className="h-5 w-5 text-red-300 mr-2" />
                        <span className="text-red-300 text-sm">{error}</span>
                      </div>
                    </div>
                  )}

                  {success && (
                    <div className="mb-6 p-4 bg-green-500 bg-opacity-20 border border-green-500 border-opacity-30 rounded-lg animate-fadeInDown">
                      <div className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-300 mr-2" />
                        <span className="text-green-300 text-sm">{success}</span>
                      </div>
                    </div>
                  )}

                  {/* Login Form */}
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Username Field */}
                    <div className="relative">
                      <User className="absolute right-4 top-1/2 transform -translate-y-1/2 text-purple-300 h-5 w-5" />
                      <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        className="input-modern w-full pr-12 pl-4 py-4 text-right font-medium"
                        placeholder="اسم المستخدم"
                        disabled={loading}
                        autoComplete="username"
                      />
                    </div>

                    {/* Password Field */}
                    <div className="relative">
                      <Lock className="absolute right-4 top-1/2 transform -translate-y-1/2 text-purple-300 h-5 w-5" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="input-modern w-full pr-12 pl-12 py-4 text-right font-medium"
                        placeholder="كلمة المرور"
                        disabled={loading}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => { soundManager.play('click'); setShowPassword(!showPassword); }}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-300 hover:text-white transition-colors"
                        disabled={loading}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>

                    {/* Login Button */}
                    <button
                      type="submit"
                      disabled={loading}
                      onClick={() => soundManager.play('click')}
                      className="btn-primary w-full py-4 text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          جاري تسجيل الدخول...
                        </>
                      ) : (
                        <>
                          <Key className="h-5 w-5 mr-2" />
                          تسجيل الدخول
                        </>
                      )}
                    </button>
                  </form>

                  {/* Switch to Signup */}
                  <div className="mt-6 text-center">
                    <p className="text-gray-400 text-sm">
                      ليس لديك حساب؟{' '}
                      <button
                        type="button"
                        onClick={toggleMode}
                        className="text-purple-400 hover:text-purple-300 transition-colors font-semibold"
                      >
                        إنشاء حساب جديد
                      </button>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Signup Form */}
            <div className={`form-box Register ${!isLogin ? 'active' : ''}`}>
              <div className="animation" style={{'--li': 2}}>
                <div className="glass-card hover-lift p-8">
                  {/* Header */}
                  <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full mx-auto mb-4 flex items-center justify-center animate-pulse-custom">
                      <User className="h-10 w-10 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2 bg-gradient-to-r from-white via-pink-200 to-purple-300 bg-clip-text text-transparent">
                      إنشاء حساب جديد
                    </h1>
                    <p className="text-pink-200 text-sm">
                      انضم إلينا اليوم
                    </p>
                  </div>

                  {/* Error/Success Messages */}
                  {error && (
                    <div className="mb-6 p-4 bg-red-500 bg-opacity-20 border border-red-500 border-opacity-30 rounded-lg animate-fadeInDown">
                      <div className="flex items-center">
                        <AlertCircle className="h-5 w-5 text-red-300 mr-2" />
                        <span className="text-red-300 text-sm">{error}</span>
                      </div>
                    </div>
                  )}

                  {success && (
                    <div className="mb-6 p-4 bg-green-500 bg-opacity-20 border border-green-500 border-opacity-30 rounded-lg animate-fadeInDown">
                      <div className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-300 mr-2" />
                        <span className="text-green-300 text-sm">{success}</span>
                      </div>
                    </div>
                  )}

                  {/* Signup Form */}
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Username Field */}
                    <div className="relative">
                      <User className="absolute right-4 top-1/2 transform -translate-y-1/2 text-pink-300 h-5 w-5" />
                      <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        className="input-modern w-full pr-12 pl-4 py-4 text-right font-medium"
                        placeholder="اسم المستخدم"
                        disabled={loading}
                        autoComplete="username"
                      />
                    </div>

                    {/* Email Field */}
                    <div className="relative">
                      <Mail className="absolute right-4 top-1/2 transform -translate-y-1/2 text-pink-300 h-5 w-5" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="input-modern w-full pr-12 pl-4 py-4 text-right font-medium"
                        placeholder="البريد الإلكتروني"
                        disabled={loading}
                        autoComplete="email"
                      />
                    </div>

                    {/* Password Field */}
                    <div className="relative">
                      <Lock className="absolute right-4 top-1/2 transform -translate-y-1/2 text-pink-300 h-5 w-5" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="input-modern w-full pr-12 pl-12 py-4 text-right font-medium"
                        placeholder="كلمة المرور"
                        disabled={loading}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => { soundManager.play('click'); setShowPassword(!showPassword); }}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 text-pink-300 hover:text-white transition-colors"
                        disabled={loading}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>

                    {/* Confirm Password Field */}
                    <div className="relative">
                      <Lock className="absolute right-4 top-1/2 transform -translate-y-1/2 text-pink-300 h-5 w-5" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className="input-modern w-full pr-12 pl-12 py-4 text-right font-medium"
                        placeholder="تأكيد كلمة المرور"
                        disabled={loading}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => { soundManager.play('click'); setShowConfirmPassword(!showConfirmPassword); }}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 text-pink-300 hover:text-white transition-colors"
                        disabled={loading}
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>

                    {/* Signup Button */}
                    <button
                      type="submit"
                      disabled={loading}
                      onClick={() => soundManager.play('click')}
                      className="btn-secondary w-full py-4 text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          جاري إنشاء الحساب...
                        </>
                      ) : (
                        <>
                          <User className="h-5 w-5 mr-2" />
                          إنشاء حساب جديد
                        </>
                      )}
                    </button>
                  </form>

                  {/* Switch to Login */}
                  <div className="mt-6 text-center">
                    <p className="text-gray-400 text-sm">
                      لديك حساب بالفعل؟{' '}
                      <button
                        type="button"
                        onClick={toggleMode}
                        className="text-pink-400 hover:text-pink-300 transition-colors font-semibold"
                      >
                        تسجيل الدخول
                      </button>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginSignupForm;
