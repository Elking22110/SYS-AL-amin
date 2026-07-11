import React, { useState, useCallback, useMemo } from 'react';
import { CreditCard, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { useNotifications } from '../NotificationSystem';
import soundManager from '../../utils/soundManager.js';
import errorHandler from '../../utils/errorHandler.js';
import { getLocalDateString, getLocalDateFormatted, formatDateToDDMMYYYY } from '../../utils/dateUtils.js';

const PaymentManager = ({
  downPayment,
  setDownPayment,
  getTotal,
  getRemainingAmount,
  onConfirmSale
}) => {
  const { notifySuccess, notifyError } = useNotifications();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');

  // التحقق من صحة العربون
  const isDownPaymentValid = useMemo(() => {
    if (!downPayment.enabled) return true;

    const amount = parseFloat(downPayment.amount) || 0;
    const total = getTotal || 0;

    return amount > 0 && amount < total && downPayment.deliveryDate;
  }, [downPayment, getTotal]);

  // تحديث مبلغ العربون
  const updateDownPaymentAmount = useCallback((value) => {
    soundManager.play('downPayment');
    setDownPayment({
      ...downPayment,
      amount: value === '' ? '' : parseFloat(value) || ''
    });
  }, [downPayment, setDownPayment]);

  // تحديث تاريخ الاستلام
  const updateDeliveryDate = useCallback((field, value) => {
    if (value === '') return;

    const currentDate = downPayment.deliveryDate || getLocalDateString();
    const [year, month, day] = currentDate.split('-');

    let newDate;
    if (field === 'day') {
      const dayPadded = value.padStart(2, '0');
      newDate = `${year}-${month}-${dayPadded}`;
    } else if (field === 'month') {
      const monthPadded = value.padStart(2, '0');
      newDate = `${year}-${monthPadded}-${day}`;
    } else if (field === 'year') {
      newDate = `${value}-${month}-${day}`;
    }

    setDownPayment({ ...downPayment, deliveryDate: newDate });
  }, [downPayment, setDownPayment]);

  // تطبيق نسبة سريعة للعربون
  const applyQuickPercentage = useCallback((percentage) => {
    const total = getTotal || 0;
    const amount = safeMath.calculatePercentage(total, percentage).toFixed(2); // Using safeMath
    setDownPayment({ ...downPayment, amount });
    setCustomPercentage(percentage); // Update custom percentage when quick percentage is applied
  }, [getTotal, downPayment, setDownPayment]);

  // Handle custom percentage input change
  const handleCustomPercentageChange = useCallback((e) => {
    let percentage = e.target.value.replace(/[^0-9.]/g, '');
    if (parseFloat(percentage) > 100) percentage = '100';
    setCustomPercentage(percentage);

    const total = getTotal || 0;
    if (percentage === '' || isNaN(parseFloat(percentage))) {
      setDownPayment({ ...downPayment, amount: '' });
    } else {
      const amount = safeMath.calculatePercentage(total, parseFloat(percentage)).toFixed(2);
      setDownPayment({ ...downPayment, amount });
    }
  }, [getTotal, downPayment, setDownPayment]);

  // تعيين تاريخ اليوم
  const setToday = useCallback(() => {
    const today = getLocalDateString();
    setDownPayment({ ...downPayment, deliveryDate: today });
  }, [downPayment, setDownPayment]);

  // تعيين تاريخ الغد
  const setTomorrow = useCallback(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.getFullYear() + '-' +
      String(tomorrow.getMonth() + 1).padStart(2, '0') + '-' +
      String(tomorrow.getDate()).padStart(2, '0');
    setDownPayment({ ...downPayment, deliveryDate: tomorrowStr });
  }, [downPayment, setDownPayment]);

  // إغلاق التقويم عند النقر خارجه
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDatePicker && !event.target.closest('.date-picker-container')) {
        setShowDatePicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDatePicker]);

  // إنشاء التقويم
  const renderCalendar = useCallback(() => {
    if (!downPayment.deliveryDate) return null;

    const currentDate = new Date(downPayment.deliveryDate);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];

    // أيام فارغة في البداية
    for (let i = 0; i < startingDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-1"></div>);
    }

    // أيام الشهر
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = day === currentDate.getDate();
      const isToday = new Date().getDate() === day &&
        new Date().getMonth() === month &&
        new Date().getFullYear() === year;

      days.push(
        <button
          key={day}
          onClick={() => {
            const newDate = new Date(year, month, day);
            // استخدام التاريخ المحلي بدلاً من UTC لتجنب مشكلة فرق اليوم
            const localDateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            setDownPayment({
              ...downPayment,
              deliveryDate: localDateString
            });
            setShowDatePicker(false);
          }}
          className={`p-1 text-xs rounded hover:bg-blue-500 hover:text-slate-800 transition-colors ${isSelected
            ? 'bg-blue-500 text-slate-800'
            : isToday
              ? 'bg-gray-600 text-slate-800'
              : 'text-slate-600 hover:bg-gray-600'
            }`}
        >
          {day}
        </button>
      );
    }

    return days;
  }, [downPayment, setDownPayment]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-md p-4 text-right">
      <h2 className="text-base font-extrabold text-slate-800 mb-4 flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-blue-500" />
        إدارة الدفع
      </h2>

      {/* طريقة الدفع */}
      <div className="mb-4">
        <label className="block text-slate-700 text-xs font-bold mb-2">طريقة الدفع:</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'cash', label: 'نقدي', icon: '💵' },
            { value: 'deferred', label: 'آجل', icon: '⏳' },
            { value: 'wallet', label: 'محفظة إلكترونية', icon: '📱' },
            { value: 'instapay', label: 'انستا باي', icon: '💳' },
          ].map((method) => (
            <button
              key={method.value}
              onClick={() => setPaymentMethod(method.value)}
              className={`p-2 rounded-xl border-2 transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${paymentMethod === method.value
                ? 'border-blue-500 bg-blue-500 bg-opacity-20 text-blue-600 font-bold'
                : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-300 hover:bg-blue-50'
                }`}
            >
              <span className="text-base">{method.icon}</span>
              <span className="text-xs font-bold">{method.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* العربون */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-slate-700 text-xs font-bold">العربون:</label>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              soundManager.play('downPayment');
              const newEnabled = !downPayment.enabled;

              if (newEnabled && (!downPayment.amount || parseFloat(downPayment.amount) <= 0)) {
                notifyError('تحذير', 'يرجى إدخال مبلغ العربون بعد التفعيل');
              }

              setDownPayment({
                ...downPayment,
                enabled: newEnabled,
                deliveryDate: newEnabled ? getLocalDateString() : downPayment.deliveryDate
              });
            }}
            className={`px-3 py-1 text-xs rounded-lg font-bold transition-all duration-200 cursor-pointer ${downPayment.enabled
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-300'
              }`}
          >
            {downPayment.enabled ? 'مفعل' : 'تفعيل العربون'}
          </button>
        </div>

        {downPayment.enabled && (
          <div className="space-y-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            {/* مبلغ العربون */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">
                مبلغ العربون (جنيه)
                {(!downPayment.amount || parseFloat(downPayment.amount) <= 0) && (
                  <span className="text-red-500 text-[10px] block">⚠️ يرجى إدخال مبلغ العربون</span>
                )}
              </label>
              <input
                type="number"
                value={downPayment.amount}
                onChange={(e) => updateDownPaymentAmount(e.target.value)}
                className={`input-modern w-full px-2.5 py-1 text-xs text-right border border-slate-300 rounded-lg ${(!downPayment.amount || parseFloat(downPayment.amount) <= 0)
                  ? 'border-red-500 bg-red-50'
                  : ''
                  }`}
                placeholder="0"
                min="0"
                step="0.01"
              />

              {/* أزرار النسب السريعة */}
              <div className="flex gap-1.5 mt-1.5">
                {[25, 50, 75].map(pct => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => applyQuickPercentage(pct)}
                    className="text-[10px] bg-white hover:bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-300 font-bold cursor-pointer"
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* تاريخ الاستلام */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">
                تاريخ الاستلام
                <span className="text-slate-400 text-[10px] block">
                  اليوم: {getLocalDateFormatted()} (ميلادي)
                </span>
              </label>

              <div className="relative">
                <div className="flex gap-1 items-center">
                  <input
                    type="number"
                    placeholder="يوم"
                    min="1"
                    max="31"
                    value={downPayment.deliveryDate ? parseInt(downPayment.deliveryDate.split('-')[2]) : ''}
                    onChange={(e) => updateDeliveryDate('day', e.target.value)}
                    className="input-modern w-1/3 px-2 py-1 text-xs text-center border border-slate-300 rounded-lg"
                  />
                  <span className="text-slate-400 text-xs">/</span>
                  <input
                    type="number"
                    placeholder="شهر"
                    min="1"
                    max="12"
                    value={downPayment.deliveryDate ? parseInt(downPayment.deliveryDate.split('-')[1]) : ''}
                    onChange={(e) => updateDeliveryDate('month', e.target.value)}
                    className="input-modern w-1/3 px-2 py-1 text-xs text-center border border-slate-300 rounded-lg"
                  />
                  <span className="text-slate-400 text-xs">/</span>
                  <input
                    type="number"
                    placeholder="سنة"
                    min="2025"
                    max="2030"
                    value={downPayment.deliveryDate ? downPayment.deliveryDate.split('-')[0] : ''}
                    onChange={(e) => updateDeliveryDate('year', e.target.value)}
                    className="input-modern w-1/3 px-2 py-1 text-xs text-center border border-slate-300 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 px-2 py-1.5 rounded-lg text-xs cursor-pointer"
                    title="اختيار من التقويم"
                  >
                    📅
                  </button>
                </div>

                {/* التقويم */}
                {showDatePicker && (
                  <div
                    className="absolute z-50 bg-white border border-slate-300 rounded-xl p-3 mt-1.5 shadow-xl date-picker-container right-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-center mb-2">
                      <div className="flex justify-between items-center mb-2">
                        <button
                          onClick={() => {
                            const currentDate = new Date(downPayment.deliveryDate);
                            currentDate.setMonth(currentDate.getMonth() - 1);
                            setDownPayment({
                              ...downPayment,
                              deliveryDate: currentDate.toISOString().split('T')[0]
                            });
                          }}
                          className="text-slate-600 hover:text-slate-800"
                        >
                          ‹
                        </button>
                        <span className="text-slate-800 text-xs font-bold">
                          {new Date(downPayment.deliveryDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long'
                          })}
                        </span>
                        <button
                          onClick={() => {
                            const currentDate = new Date(downPayment.deliveryDate);
                            currentDate.setMonth(currentDate.getMonth() + 1);
                            setDownPayment({
                              ...downPayment,
                              deliveryDate: currentDate.toISOString().split('T')[0]
                            });
                          }}
                          className="text-slate-600 hover:text-slate-800"
                        >
                          ›
                        </button>
                      </div>
                    </div>

                    {/* أيام الأسبوع */}
                    <div className="grid grid-cols-7 gap-1 mb-1">
                      {['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'].map(day => (
                        <div key={day} className="text-[10px] text-slate-400 font-bold text-center p-0.5">
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* أيام الشهر */}
                    <div className="grid grid-cols-7 gap-1 text-[11px]">
                      {renderCalendar()}
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-200">
                      <button
                        onClick={() => setShowDatePicker(false)}
                        className="w-full text-center text-xs font-bold text-blue-600 hover:text-blue-800"
                      >
                        إغلاق
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* أزرار سريعة للتاريخ */}
              <div className="flex justify-between items-center mt-2 text-[10px]">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={setToday}
                    className="text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
                  >
                    اليوم
                  </button>
                  <button
                    type="button"
                    onClick={setTomorrow}
                    className="text-green-600 hover:text-green-800 font-bold cursor-pointer"
                  >
                    غداً
                  </button>
                </div>
                <div className="text-slate-400">
                  تنسيق: يوم/شهر/سنة
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ملخص الدفع */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 text-xs space-y-2">
        <h3 className="text-slate-700 font-bold border-b border-slate-200 pb-1 mb-1">ملخص الحساب:</h3>

        <div className="space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-500">إجمالي الفاتورة:</span>
            <span className="text-slate-800 font-bold">
              {(getTotal || 0).toLocaleString('en-US')} ج.م
            </span>
          </div>

          {downPayment.enabled && (
            <>
              <div className="flex justify-between">
                <span className="text-slate-500">العربون المدفوع:</span>
                <span className="text-green-600 font-bold">
                  {(downPayment.amount || 0).toLocaleString('en-US')} ج.م
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-red-500">المبلغ المتبقي:</span>
                <span className="text-red-600 font-bold">
                  {(getRemainingAmount || 0).toLocaleString('en-US')} ج.م
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">تاريخ الاستلام:</span>
                <span className="text-slate-700 font-bold">
                  {formatDateToDDMMYYYY(downPayment.deliveryDate)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* زر إتمام البيع */}
      <button
        onClick={() => onConfirmSale(paymentMethod)}
        disabled={!isDownPaymentValid}
        className={`w-full py-2.5 px-4 rounded-xl font-bold text-sm transition-all duration-300 cursor-pointer ${isDownPaymentValid
          ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-slate-800 hover:scale-[1.02] shadow-md'
          : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
          }`}
      >
        {isDownPaymentValid ? (
          <div className="flex items-center justify-center gap-2">
            <CheckCircle className="h-5 w-5" />
            إتمام البيع
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <AlertCircle className="h-5 w-5" />
            يرجى إكمال بيانات العربون
          </div>
        )}
      </button>
    </div>
  );
};

export default PaymentManager;
