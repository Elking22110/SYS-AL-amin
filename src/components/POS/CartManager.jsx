import React, { useState, useCallback, useMemo } from 'react';
import { ShoppingCart, Trash2, Plus, Minus, X, Tag, Percent } from 'lucide-react';
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
  const [editingDiscount, setEditingDiscount] = useState({});
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // حساب الإجمالي الفرعي مع خصومات الأصناف
  const getSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const linePrice = safeMath.multiply(item.price, item.quantity);
      const itemDisc = Number(item.itemDiscount) || 0;
      const discAmt = safeMath.multiply(linePrice, itemDisc / 100);
      return safeMath.add(sum, safeMath.subtract(linePrice, discAmt));
    }, 0);
  }, [cart]);

  // تحديث سعر المنتج
  const updatePrice = useCallback((id, newPrice) => {
    setCart(prevCart => prevCart.map(item =>
      item.id === id ? { ...item, price: parseFloat(newPrice) || 0 } : item
    ));
  }, [setCart]);

  // تحديث خصم الصنف المفرد (%)
  const updateItemDiscount = useCallback((id, rawVal) => {
    const val = parseFloat(rawVal);
    if (isNaN(val) || val < 0) {
      setCart(prev => prev.map(item => item.id === id ? { ...item, itemDiscount: 0 } : item));
      return;
    }
    if (val > 100) {
      notifyError('خصم خاطئ', 'نسبة الخصم لا يمكن أن تتجاوز 100%');
      setCart(prev => prev.map(item => item.id === id ? { ...item, itemDiscount: 100 } : item));
      return;
    }
    setCart(prev => prev.map(item => item.id === id ? { ...item, itemDiscount: val } : item));
  }, [setCart, notifyError]);

  // تحديث الكمية
  const updateQuantity = useCallback((id, newQuantity) => {
    if (newQuantity <= 0) {
      onRemoveFromCart(id);
    } else {
      onUpdateQuantity(id, newQuantity);
    }
  }, [onUpdateQuantity, onRemoveFromCart]);

  // التنقل بالأسهم لأعلى وأسفل بين حقول نفس النوع عبر المنتجات
  const handleKeyDown = useCallback((e, fieldType, currentIndex) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextInput = document.querySelector(`[data-field-type="${fieldType}"][data-item-index="${currentIndex + 1}"]`);
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevInput = document.querySelector(`[data-field-type="${fieldType}"][data-item-index="${currentIndex - 1}"]`);
      if (prevInput) {
        prevInput.focus();
        prevInput.select();
      }
    }
  }, []);

  // حذف منتج
  const removeFromCart = useCallback((id) => {
    soundManager.play('removeProduct');
    onRemoveFromCart(id);
  }, [onRemoveFromCart]);

  // مسح السلة
  const clearCart = useCallback(() => {
    if (cart.length === 0) return;
    if (window.confirm('هل تريد مسح السلة بالكامل؟')) {
      soundManager.play('delete');
      setCart([]);
      notifySuccess('تم مسح السلة', 'تم حذف جميع المنتجات من السلة');
    }
  }, [cart.length, setCart, notifySuccess]);

  // التمرير التلقائي لأسفل السلة عند إضافة منتج جديد
  React.useEffect(() => {
    const container = document.getElementById('cart-items-container');
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [cart.length]);

  // إزالة الخصم الكلي
  const removeDiscount = useCallback(() => {
    setDiscounts({ type: 'percentage', percentage: '', fixed: '' });
    notifySuccess('تم إزالة الخصم', 'تم إزالة الخصم من الفاتورة');
  }, [setDiscounts, notifySuccess]);

  // إزالة الضريبة
  const removeTax = useCallback(() => {
    setTaxes({ enabled: false, percentage: 0, amount: 0, name: '' });
    notifySuccess('تم إزالة الضريبة', 'تم إزالة الضريبة من الفاتورة');
  }, [setTaxes, notifySuccess]);

  // البحث في العملاء
  const handleCustomerSearch = useCallback((value, field) => {
    let updatedInfo = { ...customerInfo, [field]: value };
    if (!value.trim()) {
      delete updatedInfo.type;
      delete updatedInfo.debt;
    }
    setCustomerInfo(updatedInfo);
    if (value.trim().length > 0) {
      try {
        const savedCustomers = JSON.parse(localStorage.getItem('customers') || '[]');
        const matches = savedCustomers.filter(c =>
          c.name.toLowerCase().includes(value.toLowerCase()) ||
          c.phone.includes(value)
        ).slice(0, 5);
        setCustomerSuggestions(matches);
        setShowSuggestions(matches.length > 0);
      } catch (err) { console.error(err); }
    } else {
      setCustomerSuggestions([]);
      setShowSuggestions(false);
    }
  }, [customerInfo, setCustomerInfo]);

  // اختيار عميل
  const selectCustomer = useCallback((customer) => {
    setCustomerInfo({
      ...customerInfo,
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      type: customer.type || 'عميل عادي',
      debt: customer.debt || 0
    });
    setShowSuggestions(false);
  }, [customerInfo, setCustomerInfo]);

  return (
    <div className="w-full bg-white border border-slate-200 rounded-2xl shadow-lg pb-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-l from-blue-50 to-white">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-blue-500" />
          سلة المشتريات
          {cart.length > 0 && (
            <span className="bg-blue-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {cart.length}
            </span>
          )}
        </h2>
        {cart.length > 0 && (
          <button
            onClick={clearCart}
            className="text-red-400 hover:text-red-500 hover:bg-red-50 transition-all p-1.5 rounded-lg"
            title="مسح السلة"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Items List ── */}
      <div 
        id="cart-items-container" 
        className="px-3 py-2 space-y-2 overflow-y-auto max-h-[38vh] xl:max-h-[46vh] custom-scrollbar text-right"
      >
        {cart.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="h-14 w-14 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">السلة فارغة</p>
            <p className="text-slate-300 text-xs mt-1">أضف منتجات للبدء</p>
          </div>
        ) : (
          cart.map((item, index) => {
            const qtyValue = editingQty[item.id] !== undefined ? editingQty[item.id] : item.quantity;
            const priceValue = editingPrice[item.id] !== undefined ? editingPrice[item.id] : item.price;
            const discValue = editingDiscount[item.id] !== undefined ? editingDiscount[item.id] : (item.itemDiscount || '');
            const activeDisc = Number(item.itemDiscount) || 0;
            const lineRaw = safeMath.multiply(item.price, item.quantity);
            const discAmt = safeMath.multiply(lineRaw, activeDisc / 100);
            const lineNet = safeMath.subtract(lineRaw, discAmt);

            return (
              <div
                key={item.id}
                className={`rounded-xl border p-2 transition-all duration-200 ${
                  activeDisc > 0
                    ? 'border-orange-200 bg-orange-50/60 shadow-sm'
                    : 'border-slate-200 bg-slate-50 hover:bg-blue-50/30'
                }`}
              >
                {/* Row 1: Name + Remove */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h4 className="font-bold text-slate-800 text-xs leading-snug line-clamp-2">
                    {item.name}
                  </h4>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-0.5 rounded-lg transition-all flex-shrink-0"
                    title="حذف المنتج"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Three Fields Grid (Price, Discount %, Quantity) */}
                <div className="grid grid-cols-[2.2fr_1.3fr_1.7fr] gap-1.5 items-end">
                  
                  {/* Price Input (السعر) */}
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-black text-slate-500 text-right pr-1">السعر (ج.م)</span>
                    <input
                      type="number"
                      value={priceValue}
                      data-field-type="price"
                      data-item-index={index}
                      onKeyDown={(e) => handleKeyDown(e, 'price', index)}
                      onFocus={(e) => e.target.select()}
                      onClick={(e) => e.target.select()}
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
                      className="w-full text-center bg-white border border-slate-300 text-slate-800 font-bold py-1 px-1 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>

                  {/* Discount Input (الخصم %) */}
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-black text-slate-500 text-right pr-1">الخصم %</span>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={discValue}
                        data-field-type="discount"
                        data-item-index={index}
                        onKeyDown={(e) => handleKeyDown(e, 'discount', index)}
                        onFocus={(e) => e.target.select()}
                        onClick={(e) => e.target.select()}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditingDiscount(prev => ({ ...prev, [item.id]: val }));
                          const n = parseFloat(val);
                          if (!isNaN(n)) {
                            if (n > 100) {
                              notifyError('خصم خاطئ', 'الحد الأقصى للخصم 100%');
                            } else if (n >= 0) {
                              updateItemDiscount(item.id, n);
                            }
                          } else if (val === '' || val === '0') {
                            updateItemDiscount(item.id, 0);
                          }
                        }}
                        onBlur={() => {
                          const n = parseFloat(discValue);
                          if (isNaN(n) || n < 0) updateItemDiscount(item.id, 0);
                          else if (n > 100) updateItemDiscount(item.id, 100);
                          setEditingDiscount(prev => {
                            const copy = { ...prev };
                            delete copy[item.id];
                            return copy;
                          });
                        }}
                        placeholder="0"
                        className={`w-full text-center font-bold py-1 px-1 rounded-md text-xs border focus:outline-none focus:ring-2 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                          activeDisc > 0
                            ? 'bg-orange-50 border-orange-300 text-orange-700 focus:ring-orange-300'
                            : 'bg-white border-slate-300 text-slate-700 focus:ring-blue-500'
                        }`}
                      />
                      <Percent className={`absolute left-1 h-2.5 w-2.5 pointer-events-none ${activeDisc > 0 ? 'text-orange-400' : 'text-slate-300'}`} />
                    </div>
                  </div>

                  {/* Quantity Input (العدد) */}
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-black text-slate-500 text-center">العدد</span>
                    <div className="flex items-center gap-0.5 bg-white border border-slate-300 rounded-md p-0.5">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-500 w-4 h-4 rounded flex items-center justify-center transition-colors flex-shrink-0"
                      >
                        <Minus className="h-2 w-2" />
                      </button>
                      <input
                        type="number"
                        value={qtyValue}
                        data-field-type="qty"
                        data-item-index={index}
                        onKeyDown={(e) => handleKeyDown(e, 'qty', index)}
                        onFocus={(e) => e.target.select()}
                        onClick={(e) => e.target.select()}
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
                        className="w-full text-center font-bold text-slate-800 text-xs focus:outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="bg-slate-100 hover:bg-green-50 text-slate-600 hover:text-green-500 w-4 h-4 rounded flex items-center justify-center transition-colors flex-shrink-0"
                      >
                        <Plus className="h-2 w-2" />
                      </button>
                    </div>
                  </div>

                </div>

                {/* Calculation Summary Footer */}
                {(activeDisc > 0 || item.quantity > 1) && (
                  <div className="flex justify-between items-center mt-1.5 pt-1 border-t border-slate-200/60 text-[11px]">
                    <div className="text-slate-400">
                      {activeDisc > 0 && (
                        <span className="text-orange-600 font-bold bg-orange-100/80 px-1.5 py-0.5 rounded text-[10px]">
                          خصم: -{discAmt.toLocaleString()} ج
                        </span>
                      )}
                    </div>
                    <div className="font-extrabold text-slate-900 text-xs">
                      {lineNet.toLocaleString()} ج.م
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Summary ── */}
      {cart.length > 0 && (
        <div className="border-t border-slate-100 px-5 py-4 space-y-2.5 bg-slate-50/80">

          {/* خصومات الأصناف */}
          {(() => {
            const totalItemDisc = cart.reduce((sum, item) => {
              const line = safeMath.multiply(item.price, item.quantity);
              return safeMath.add(sum, safeMath.multiply(line, (Number(item.itemDiscount) || 0) / 100));
            }, 0);
            return totalItemDisc > 0 ? (
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-1.5 text-orange-600 font-medium">
                  <Tag className="h-3.5 w-3.5" />
                  خصومات الأصناف:
                </span>
                <span className="text-orange-600 font-bold">
                  -{totalItemDisc.toLocaleString('en-US', { maximumFractionDigits: 0 })} جنيه
                </span>
              </div>
            ) : null;
          })()}

          {/* المجموع الفرعي */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">المجموع الفرعي:</span>
            <span className="text-slate-700 font-semibold">
              {getSubtotal.toLocaleString('en-US', { maximumFractionDigits: 0 })} جنيه
            </span>
          </div>

          {/* الخصم الكلي */}
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">الخصم:</span>
              {getDiscountAmount > 0 && (
                <button onClick={removeDiscount} className="text-red-300 hover:text-red-500 transition-colors" title="إزالة الخصم">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-500 font-semibold">
                -{getDiscountAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })} جنيه
              </span>
              <button
                onClick={() => onOpenDiscountModal && onOpenDiscountModal()}
                className="text-[10px] bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-0.5 rounded-md font-semibold transition-all"
              >
                تعديل
              </button>
            </div>
          </div>

          {/* الضريبة */}
          {taxes.enabled && (
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">{taxes.name}:</span>
                <button onClick={removeTax} className="text-red-300 hover:text-red-500 transition-colors" title="إزالة الضريبة">
                  <X className="h-3 w-3" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-purple-600 font-semibold">
                  +{getTaxAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })} جنيه
                </span>
                <button
                  onClick={() => onOpenTaxModal && onOpenTaxModal()}
                  className="text-[10px] bg-purple-100 hover:bg-purple-200 text-purple-700 px-2 py-0.5 rounded-md font-semibold transition-all"
                >
                  تعديل
                </button>
              </div>
            </div>
          )}

          {/* العربون */}
          {downPayment.enabled && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">العربون:</span>
              <span className="text-blue-600 font-semibold">
                {Number(downPayment.amount || 0).toLocaleString('en-US')} جنيه
              </span>
            </div>
          )}

          {/* الإجمالي */}
          <div className="flex justify-between items-center pt-3 border-t border-slate-200 mt-1">
            <span className="text-slate-800 font-extrabold text-base">
              {downPayment.enabled ? 'المتبقي:' : 'الإجمالي:'}
            </span>
            <span className="text-blue-700 font-extrabold text-xl tracking-tight">
              {getRemainingAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              <span className="text-sm text-slate-500 font-normal mr-1">جنيه</span>
            </span>
          </div>

          {/* أزرار الخصم والضريبة */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => onOpenDiscountModal && onOpenDiscountModal()}
              className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-l from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm py-2 rounded-xl font-bold shadow-sm transition-all hover:shadow-md active:scale-95"
            >
              <Tag className="h-3.5 w-3.5" />
              خصم كلي
            </button>
            <button
              onClick={() => onOpenTaxModal && onOpenTaxModal()}
              className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-l from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-sm py-2 rounded-xl font-bold shadow-sm transition-all hover:shadow-md active:scale-95"
            >
              <Percent className="h-3.5 w-3.5" />
              {taxes.enabled ? 'تعديل الضريبة' : 'ضريبة'}
            </button>
          </div>
        </div>
      )}

      {/* ── Customer Info ── */}
      {cart.length > 0 && (
        <div className="px-4 pb-4 relative">
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
            <h4 className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
              <span>👤</span> بيانات العميل
            </h4>
            <div className="grid grid-cols-2 gap-2 relative">
              <input
                id="customer-name-input"
                type="text"
                value={customerInfo?.name || ''}
                onChange={(e) => handleCustomerSearch(e.target.value, 'name')}
                onFocus={() => { if (customerSuggestions.length > 0) setShowSuggestions(true); }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="اسم العميل"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:bg-white text-xs transition-all"
              />
              <input
                id="customer-phone-input"
                type="tel"
                value={customerInfo?.phone || ''}
                onChange={(e) => handleCustomerSearch(e.target.value, 'phone')}
                onFocus={() => { if (customerSuggestions.length > 0) setShowSuggestions(true); }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="رقم الهاتف *"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:bg-white text-xs transition-all"
                required
              />
            </div>

            {/* اقتراحات العملاء */}
            {showSuggestions && customerSuggestions.length > 0 && (
              <div className="absolute z-50 left-4 right-4 mt-1 bg-white border border-blue-200 shadow-2xl rounded-xl max-h-44 overflow-y-auto">
                {customerSuggestions.map((cust, idx) => (
                  <div
                    key={idx}
                    onClick={() => selectCustomer(cust)}
                    className="p-2.5 border-b border-slate-50 hover:bg-blue-50 cursor-pointer flex flex-col transition-colors last:border-0"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-sm text-slate-800">{cust.name}</span>
                      <span className="text-xs text-slate-400">{cust.phone}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-md">{cust.type || 'عميل عادي'}</span>
                      {Number(cust.debt) > 0 && (
                        <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-md font-bold">
                          مديونية: {Number(cust.debt).toLocaleString('en-US')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {customerInfo?.phone && customerInfo?.name && (
              <div className="mt-2 flex items-center justify-between gap-2 text-xs bg-blue-50 border border-blue-100 text-blue-800 p-2 rounded-lg flex-wrap">
                <span className="font-semibold">👤 {customerInfo.name}</span>
                <span className="bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded text-[10px]">
                  {customerInfo.type || 'عميل عادي'}
                </span>
                {Number(customerInfo.debt || 0) > 0 && (
                  <span className="text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded text-[10px]">
                    مديونية: {(customerInfo.debt || 0).toLocaleString('en-US')} ج
                  </span>
                )}
              </div>
            )}
            {!customerInfo?.phone && (
              <p className="text-red-400 text-[10px] mt-1.5 flex items-center gap-1">
                <span>⚠️</span> رقم الهاتف مطلوب
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CartManager;
