import React, { useState, useEffect } from 'react';
import { Store, Save, RefreshCw, Building, Phone, Mail, MapPin } from 'lucide-react';

const StoreSettings = () => {
  const [storeInfo, setStoreInfo] = useState({
    storeName: 'متجر الأمين',
    storePhone: '01029022006',
    storeAddress: 'باسوس - القناطر الخيرية - الطريق الدائري',
    storeEmail: 'info@msgroupplast.com',
    storeTaxNumber: '300123456789003',
    storeLogo: '',
    storeDescription: 'نظام إدارة المبيعات المتطور',
    // إعدادات الضرائب
    taxEnabled: false,
    taxRate: 15,
    taxName: 'ضريبة القيمة المضافة'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  // تحميل بيانات المتجر المحفوظة
  useEffect(() => {
    const savedStoreInfo = localStorage.getItem('storeInfo');
    if (savedStoreInfo) {
      setStoreInfo(JSON.parse(savedStoreInfo));
    }
  }, []);

  // الاستماع لأمر الحفظ العام القادم من شاشة الإعدادات (زر الحفظ العلوي)
  useEffect(() => {
    const handleExternalSave = () => {
      // استدعاء نفس منطق الحفظ الداخلي
      handleSave();
    };

    window.addEventListener('save-store-settings', handleExternalSave);
    return () => {
      window.removeEventListener('save-store-settings', handleExternalSave);
    };
  }, [storeInfo]);

  // حفظ بيانات المتجر
  const handleSave = async () => {
    setIsLoading(true);
    try {
      localStorage.setItem('storeInfo', JSON.stringify(storeInfo));
      setMessage('تم حفظ بيانات المتجر بنجاح!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('حدث خطأ في حفظ البيانات');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  // إعادة تعيين البيانات
  const handleReset = () => {
    setStoreInfo({
      storeName: 'متجر الأمين',
      storePhone: '01029022006',
      storeAddress: 'باسوس - القناطر الخيرية - الطريق الدائري',
      storeEmail: 'info@msgroupplast.com',
      storeTaxNumber: '',
      storeLogo: '',
      storeDescription: '',
      // إعدادات الضرائب
      taxEnabled: false,
      taxRate: 15,
      taxName: 'ضريبة القيمة المضافة'
    });
    setMessage('تم إعادة تعيين البيانات');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleInputChange = (field, value) => {
    setStoreInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center">
          <Store className="h-6 w-6 text-slate-800" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">إعدادات المتجر</h2>
          <p className="text-slate-600 text-sm">قم بتخصيص بيانات متجرك للفواتير والإيصالات</p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.includes('نجح') ? 'bg-green-500 bg-opacity-20 text-green-300' : 'bg-red-500 bg-opacity-20 text-red-300'
          }`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* معلومات أساسية */}
        <div className="glass-card p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Building className="h-5 w-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-slate-800">المعلومات الأساسية</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">
                اسم المتجر *
              </label>
              <input
                type="text"
                value={storeInfo.storeName || ''}
                onChange={(e) => handleInputChange('storeName', e.target.value)}
                className="input-modern w-full"
                placeholder="أدخل اسم المتجر"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">
                وصف المتجر
              </label>
              <textarea
                value={storeInfo.storeDescription || ''}
                onChange={(e) => handleInputChange('storeDescription', e.target.value)}
                className="input-modern w-full h-20 resize-none"
                placeholder="وصف مختصر عن المتجر"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">
                الرقم الضريبي
              </label>
              <input
                type="text"
                value={storeInfo.storeTaxNumber || ''}
                onChange={(e) => handleInputChange('storeTaxNumber', e.target.value)}
                className="input-modern w-full"
                placeholder="الرقم الضريبي للمتجر"
              />
            </div>
          </div>
        </div>

        {/* معلومات الاتصال */}
        <div className="glass-card p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Phone className="h-5 w-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-slate-800">معلومات الاتصال</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">
                العنوان
              </label>
              <div className="relative">
                <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 h-4 w-4" />
                <input
                  type="text"
                  value={storeInfo.storeAddress || ''}
                  onChange={(e) => handleInputChange('storeAddress', e.target.value)}
                  className="input-modern w-full pr-10"
                  placeholder="عنوان المتجر"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">
                رقم الهاتف
              </label>
              <div className="relative">
                <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 h-4 w-4" />
                <input
                  type="tel"
                  value={storeInfo.storePhone || ''}
                  onChange={(e) => handleInputChange('storePhone', e.target.value)}
                  className="input-modern w-full pr-10"
                  placeholder="رقم الهاتف"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 h-4 w-4" />
                <input
                  type="email"
                  value={storeInfo.storeEmail || ''}
                  onChange={(e) => handleInputChange('storeEmail', e.target.value)}
                  className="input-modern w-full pr-10"
                  placeholder="البريد الإلكتروني"
                />
              </div>
            </div>
          </div>
        </div>

        {/* إعدادات الضرائب */}
        <div className="glass-card p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Building className="h-5 w-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-slate-800">إعدادات الضرائب</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-600">تفعيل الضريبة</label>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleInputChange('taxEnabled', !storeInfo.taxEnabled);
                }}
                className={`w-16 h-8 rounded-full transition-all duration-200 cursor-pointer ${storeInfo.taxEnabled ? 'bg-green-500' : 'bg-gray-500'
                  }`}
                style={{
                  pointerEvents: 'auto',
                  zIndex: 10,
                  position: 'relative',
                  minWidth: '64px',
                  minHeight: '32px'
                }}
              >
                <div className={`w-6 h-6 bg-white rounded-full transition-all duration-200 ${storeInfo.taxEnabled ? 'translate-x-8' : 'translate-x-1'
                  }`}></div>
              </button>
            </div>

            {storeInfo.taxEnabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">اسم الضريبة</label>
                  <input
                    type="text"
                    value={storeInfo.taxName || ''}
                    onChange={(e) => handleInputChange('taxName', e.target.value)}
                    className="input-modern w-full"
                    placeholder="ضريبة القيمة المضافة"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">نسبة الضريبة (%)</label>
                  <input
                    type="number"
                    value={storeInfo.taxRate || 0}
                    onChange={(e) => handleInputChange('taxRate', parseFloat(e.target.value) || 0)}
                    className="input-modern w-full"
                    placeholder="15"
                    min="0"
                    max="100"
                  />
                </div>
              </>
            )}
          </div>

          {/* معاينة الضريبة */}
          <div className="mt-6">
            <h4 className="text-sm font-medium text-slate-600 mb-3">معاينة الضريبة</h4>
            <div className="bg-white rounded-lg p-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">المجموع الفرعي:</span>
                  <span className="text-slate-800">$100.00</span>
                </div>
                {storeInfo.taxEnabled && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">{storeInfo.taxName} ({storeInfo.taxRate}%):</span>
                    <span className="text-slate-800">${(100 * storeInfo.taxRate / 100).toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-slate-400 pt-2">
                  <div className="flex justify-between">
                    <span className="text-slate-800 font-bold">الإجمالي:</span>
                    <span className="text-slate-800 font-bold">
                      ${storeInfo.taxEnabled ? (100 + (100 * storeInfo.taxRate / 100)).toFixed(2) : '100.00'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* معاينة الفاتورة */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">معاينة الفاتورة</h3>
        <div className="bg-white text-black p-6 rounded-lg font-mono text-sm">
          <div className="text-center mb-4">
            <h4 className="text-lg font-bold">{storeInfo.storeName || 'اسم المتجر'}</h4>
            {storeInfo.storeDescription && (
              <p className="text-sm text-gray-600">{storeInfo.storeDescription}</p>
            )}
            <hr className="my-2" />
          </div>

          <div className="space-y-1 text-xs">
            {storeInfo.storeAddress && <p>العنوان: {storeInfo.storeAddress}</p>}
            {storeInfo.storePhone && <p>الهاتف: {storeInfo.storePhone}</p>}
            {storeInfo.storeEmail && <p>البريد: {storeInfo.storeEmail}</p>}
            {storeInfo.storeTaxNumber && <p>الرقم الضريبي: {storeInfo.storeTaxNumber}</p>}
          </div>

          <hr className="my-2" />
          <div className="text-center text-xs text-gray-600">
            <p>شكراً لزيارتكم</p>
            <p>متجر الأمين - أدوات صحية وسباكة</p>
            <p>جميع الحقوق محفوظة {new Date().getFullYear()} ©</p>
          </div>
        </div>
      </div>

      {/* أزرار التحكم */}
      <div className="flex justify-end space-x-4">
        <button
          onClick={handleReset}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-slate-200 text-slate-800 rounded-lg transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          <span>إعادة تعيين</span>
        </button>

        <button
          onClick={handleSave}
          disabled={isLoading || !storeInfo.storeName}
          className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-slate-800 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="h-4 w-4" />
          <span>{isLoading ? 'جاري الحفظ...' : 'حفظ البيانات'}</span>
        </button>
      </div>
    </div>
  );
};

export default StoreSettings;
