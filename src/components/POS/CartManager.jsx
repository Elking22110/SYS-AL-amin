import React, { useState, useCallback, useMemo } from 'react';
import { ShoppingCart, Trash2, Plus, Minus, X } from 'lucide-react';
import { useNotifications } from '../NotificationSystem';
import soundManager from '../../utils/soundManager.js';
import errorHandler from '../../utils/errorHandler.js';
import safeMath from '../../utils/safeMath.js';

const CartManager = ({
  cart,
  setCart,
  onUpdateQuantity,
  onRemoveFromCart,
  getTotal,
  getDiscountAmount,
  getTaxAmount,
  getRemainingAmount,
  discounts,
  setDiscounts,
  taxes,
  setTaxes,
  downPayment,
  setDownPayment,
  customerInfo,
  setCustomerInfo,
  onOpenDiscountModal,
  onOpenTaxModal
}) => {
  const { notifySuccess, notifyError } = useNotifications();
  const [editingQty, setEditingQty] = useState({});
  const [editingPrice, setEditingPrice] = useState({});

  // حساب الإجمالي الفرعي
  const getSubtotal = useMemo(() => {
    return safeMath.calculateSubtotal(cart);
  }, [cart]);

  // تحديث سعر المنتج يدويًا في السلة
  const updatePrice = useCallback((id, newPrice) => {
    setCart(prevCart => prevCart.map(item =>
      item.id === id ? { ...item, price: parseFloat(newPrice) || 0 } : item
    ));
  }, [setCart]);

  // تحديث كمية المنتج - محسن بالأداء
  const updateQuantity = useCallback((id, newQuantity) => {
    if (newQuantity <= 0) {
      onRemoveFromCart(id);
    } else {
      onUpdateQuantity(id, newQuantity);
    }
  }, [onUpdateQuantity, onRemoveFromCart]);

  // حذف منتج من السلة - محسن بالأداء
  const removeFromCart = useCallback((id) => {
    soundManager.play('removeProduct');
    onRemoveFromCart(id);
  }, [onRemoveFromCart]);

  // مسح السلة بالكامل
  const clearCart = useCallback(() => {
    if (cart.length === 0) return;
    if (window.confirm('هل تريد مسح السلة بالكامل؟')) {
      soundManager.play('delete');
      setCart([]);
      notifySuccess('تم مسح السلة', 'تم حذف جميع المنتجات من السلة');
    }
  }, [cart.length, setCart, notifySuccess]);

  // تطبيق خصم
  const applyDiscount = useCallback((type, value) => {
    try {
      if (type === 'percentage') {
        const percentage = parseFloat(value);
        if (percentage < 0 || percentage > 100) {
          notifyError('خطأ في الخصم', 'نسبة الخصم يجب أن تكون بين 0 و 100');
          return;
        }
        setDiscounts({ type: 'percentage', percentage, fixed: '' });
      } else {
        const fixed = parseFloat(value);
        if (fixed < 0 || fixed > getSubtotal) {
          notifyError('خطأ في الخصم', 'مبلغ الخصم يجب أن يكون بين 0 وإجمالي الفاتورة');
          return;
        }
        setDiscounts({ type: 'fixed', fixed, percentage: '' });
      }
      notifySuccess('تم تطبيق الخصم', 'تم تطبيق الخصم بنجاح');
    } catch (error) {
      errorHandler.handleError(error, 'Apply Discount', 'medium');
      notifyError('خطأ في الخصم', 'حدث خطأ أثناء تطبيق الخصم');
    }
  }, [getSubtotal, setDiscounts, notifySuccess, notifyError]);

  // إزالة الخصم
  const removeDiscount = useCallback(() => {
    setDiscounts({ type: 'percentage', percentage: '', fixed: '' });
    notifySuccess('تم إزالة الخصم', 'تم إزالة الخصم من الفاتورة');
  }, [setDiscounts, notifySuccess]);

  // تطبيق الضريبة
  const applyTax = useCallback((vat, name) => {
    try {
      if (vat < 0 || vat > 100) {
        notifyError('خطأ في الضريبة', 'نسبة الضريبة يجب أن تكون بين 0 و 100');
        return;
      }
      if (setTaxes) {
        setTaxes({ enabled: true, vat, name });
      }
      notifySuccess('تم تطبيق الضريبة', 'تم تطبيق الضريبة بنجاح');
    } catch (error) {
      errorHandler.handleError(error, 'Apply Tax', 'medium');
      notifyError('خطأ في الضريبة', 'حدث خطأ أثناء تطبيق الضريبة');
    }
  }, [notifySuccess, notifyError]);

  // إزالة الضريبة
  const removeTax = useCallback(() => {
    if (setTaxes) {
      setTaxes({ enabled: false, vat: 0, name: '' });
    }
    notifySuccess('تم إزالة الضريبة', 'تم إزالة الضريبة من الفاتورة');
  }, [notifySuccess]);

  return (
    <div className="w-full bg-white border border-slate-200 rounded-xl shadow-lg p-6 flex flex-col">
      {/* عنوان السلة */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <ShoppingCart className="h-6 w-6 text-blue-400" />
          سلة المشتريات
        </h2>
        {cart.length > 0 && (
          <button
            onClick={clearCart}
            className="text-red-400 hover:text-red-300 transition-colors p-1"
            title="مسح السلة"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        )}
      </div>


      {/* قائمة المنتجات في السلة */}
      <div className="flex-1 overflow-y-auto mb-4">
        {cart.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingCart className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <p className="text-slate-500">السلة فارغة</p>
            <p className="text-gray-500 text-sm">أضف منتجات للبدء</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cart.map((item) => {
              const qtyValue = editingQty[item.id] !== undefined ? editingQty[item.id] : item.quantity;
              const priceValue = editingPrice[item.id] !== undefined ? editingPrice[item.id] : item.price;
              
              return (
                <div
                  key={item.id}
                  className="bg-slate-50 rounded-lg p-3 hover:bg-blue-50 transition-colors border border-slate-100"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-slate-800 text-sm line-clamp-2">
                      {item.name}
                    </h4>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-400 hover:text-red-300 transition-colors p-1"
                      title="حذف المنتج"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="bg-red-500 hover:bg-red-600 text-slate-800 w-6 h-6 rounded-full flex items-center justify-center text-sm transition-colors"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <input
                        type="number"
                        value={qtyValue}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditingQty(prev => ({ ...prev, [item.id]: val }));
                          const parsed = parseInt(val);
                          if (!isNaN(parsed) && parsed > 0) {
                            updateQuantity(item.id, parsed);
                          }
                        }}
                        onBlur={() => {
                          const parsed = parseInt(qtyValue);
                          if (isNaN(parsed) || parsed <= 0) {
                            updateQuantity(item.id, 1);
                          }
                          setEditingQty(prev => {
                            const copy = { ...prev };
                            delete copy[item.id];
                            return copy;
                          });
                        }}
                        className="w-12 text-center bg-slate-200 text-slate-800 font-bold py-1 px-1 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="bg-green-500 hover:bg-green-600 text-slate-800 w-6 h-6 rounded-full flex items-center justify-center text-sm transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    
                    <div className="text-right flex flex-col items-end">
                      <div className="text-left font-bold text-slate-800 pr-2 whitespace-nowrap min-w-[70px]">
                        {(safeMath.multiply(item.price, item.quantity)).toLocaleString('en-US')} جنيه
                      </div>
                      
                      {/* السعر القابل للتعديل */}
                      <div className="flex items-center gap-1 mt-1 justify-end">
                        <span className="text-slate-500 text-[10px]">ج.م</span>
                        <input
                          type="number"
                          value={priceValue}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditingPrice(prev => ({ ...prev, [item.id]: val }));
                            const parsed = parseFloat(val);
                            if (!isNaN(parsed) && parsed >= 0) {
                              updatePrice(item.id, parsed);
                            }
                          }}
                          onBlur={() => {
                            const parsed = parseFloat(priceValue);
                            if (isNaN(parsed) || parsed < 0) {
                              updatePrice(item.id, item.price);
                            }
                            setEditingPrice(prev => {
                              const copy = { ...prev };
                              delete copy[item.id];
                              return copy;
                            });
                          }}
                          className="w-16 text-center bg-slate-100 border border-slate-300 text-slate-800 font-bold py-0.5 px-1 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 focus:bg-white transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-slate-500 text-[10px]">× {item.quantity}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ملخص السلة */}
      {cart.length > 0 && (
        <div className="border-t border-slate-200 pt-4 space-y-3">
          {/* المجموع الفرعي */}
          <div className="flex justify-between items-center">
            <span className="text-slate-600">المجموع الفرعي:</span>
            <span className="text-slate-600 font-semibold">
              {getSubtotal.toLocaleString('en-US')} جنيه
            </span>
          </div>

          {/* الخصم */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-slate-600">الخصم:</span>
              {getDiscountAmount > 0 && (
                <button
                  onClick={removeDiscount}
                  className="text-red-400 hover:text-red-300 text-xs"
                  title="إزالة الخصم"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-400 font-semibold">
                -{getDiscountAmount.toLocaleString('en-US')} جنيه
              </span>
              <button
                onClick={() => setShowDiscountModal(true)}
                className="text-blue-400 hover:text-blue-300 text-xs"
                title="تطبيق خصم"
              >
                تعديل
              </button>
            </div>
          </div>

          {/* الضريبة */}
          {taxes.enabled && (
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-slate-600">{taxes.name}:</span>
                <button
                  onClick={removeTax}
                  className="text-red-400 hover:text-red-300 text-xs"
                  title="إزالة الضريبة"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-orange-300 font-semibold">
                  +{getTaxAmount.toLocaleString('en-US')} جنيه
                </span>
                <button
                  onClick={() => setShowTaxModal(true)}
                  className="text-blue-400 hover:text-blue-300 text-xs"
                  title="تعديل الضريبة"
                >
                  تعديل
                </button>
              </div>
            </div>
          )}

          {/* العربون */}
          {downPayment.enabled && (
            <div className="flex justify-between items-center">
              <span className="text-slate-600">العربون:</span>
              <span className="text-blue-400 font-semibold">
                {downPayment.amount.toLocaleString('en-US')} جنيه
              </span>
            </div>
          )}

          {/* الإجمالي */}
          <div className="flex justify-between items-center pt-2 border-t border-slate-200">
            <span className="text-slate-800 font-bold text-lg">
              {downPayment.enabled ? 'المتبقي:' : 'الإجمالي:'}
            </span>
            <span className="text-slate-800 font-bold text-lg">
              {getRemainingAmount.toLocaleString('en-US')} جنيه
            </span>
          </div>
        </div>
      )}

      {/* بيانات العميل - مصغرة */}
      {cart.length > 0 && (
        <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <h4 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-1">
            <span className="text-slate-600">👤</span>
            بيانات العميل
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <input
                id="customer-name-input"
                type="text"
                value={customerInfo?.name || ''}
                onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                placeholder="اسم العميل"
                className="w-full px-2 py-1 bg-slate-100 border border-slate-300 rounded text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-400 text-xs"
              />
            </div>
            <div>
              <input
                id="customer-phone-input"
                type="tel"
                value={customerInfo?.phone || ''}
                onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                placeholder="رقم الهاتف *"
                className="w-full px-2 py-1 bg-slate-100 border border-slate-300 rounded text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-400 text-xs"
                required
              />
            </div>
          </div>
          {!customerInfo?.phone && (
            <p className="text-red-400 text-xs mt-1">رقم الهاتف مطلوب</p>
          )}
        </div>
      )}

      {/* أزرار الإجراءات */}
      {cart.length > 0 && (
        <div className="mt-4 space-y-2">
          <button
            onClick={() => onOpenDiscountModal && onOpenDiscountModal()}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-slate-800 py-2 px-4 rounded-lg font-semibold transition-all duration-200 hover:scale-105"
          >
            تطبيق خصم
          </button>

          <button
            onClick={() => onOpenTaxModal && onOpenTaxModal()}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-slate-800 py-2 px-4 rounded-lg font-semibold transition-all duration-200 hover:scale-105"
          >
            {taxes.enabled ? 'تعديل الضريبة' : 'تطبيق ضريبة'}
          </button>
        </div>
      )}
    </div>
  );
};

export default CartManager;
