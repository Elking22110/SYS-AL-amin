import React, { useState, useCallback, useMemo } from 'react';
import { CreditCard, AlertCircle, CheckCircle } from 'lucide-react';
import { useNotifications } from '../NotificationSystem';
import soundManager from '../../utils/soundManager.js';
import safeMath from '../../utils/safeMath.js';

const PaymentManager = ({
  downPayment,
  setDownPayment,
  getTotal,
  getRemainingAmount,
  onConfirmSale
}) => {
  const { notifyError } = useNotifications();
  const [paymentMethod, setPaymentMethod] = useState('cash');

  // التحقق من صحة العربون
  const isDownPaymentValid = useMemo(() => {
    if (!downPayment.enabled) return true;

    const amount = parseFloat(downPayment.amount) || 0;
    const total = getTotal || 0;

    return amount > 0 && amount < total;
  }, [downPayment, getTotal]);

  // تحديث مبلغ العربون
  const updateDownPaymentAmount = useCallback((value) => {
    soundManager.play('downPayment');
    setDownPayment({
      ...downPayment,
      amount: value === '' ? '' : parseFloat(value) || ''
    });
  }, [downPayment, setDownPayment]);

  // تطبيق نسبة سريعة للعربون
  const applyQuickPercentage = useCallback((percentage) => {
    const total = getTotal || 0;
    const amount = safeMath.calculatePercentage(total, percentage).toFixed(2);
    setDownPayment({ ...downPayment, amount });
  }, [getTotal, downPayment, setDownPayment]);

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
                enabled: newEnabled
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
