import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../AuthProvider';
import { useNotifications } from '../NotificationSystem';
import ProductGrid from './ProductGrid';
import CartManager from './CartManager';
import PaymentManager from './PaymentManager';
import soundManager from '../../utils/soundManager.js';
import { publish, subscribe, EVENTS } from '../../utils/observerManager';
import errorHandler from '../../utils/errorHandler.js';
import storageOptimizer from '../../utils/storageOptimizer.js';
import { getLocalDateString, formatDateTime, getCurrentDate, formatDateToDDMMYYYY } from '../../utils/dateUtils.js';
import safeMath from '../../utils/safeMath';
import { getNextInvoiceId } from '../../utils/sequence';
import thermalPrinterManager from '../../utils/thermalPrinter.js';

const POSMain = () => {
  const { user, logActivity } = useAuth();
  const { notifySuccess, notifyError } = useNotifications();

  // States
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [cart, setCart] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [productImages, setProductImages] = useState({});
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '' });
  const [downPayment, setDownPayment] = useState({
    enabled: false,
    amount: '',
    deliveryDate: getLocalDateString()
  });
  const [discounts, setDiscounts] = useState({
    percentage: '',
    fixed: '',
    type: 'percentage'
  });
  const [taxes, setTaxes] = useState(() => {
    const savedStoreInfo = storageOptimizer.get('storeInfo', {});
    return {
      vat: savedStoreInfo.taxRate || 15,
      enabled: savedStoreInfo.taxEnabled === true,
      name: savedStoreInfo.taxName || 'ضريبة القيمة المضافة'
    };
  });
  const [activeShift, setActiveShift] = useState(null);
  const [showInvoiceSummary, setShowInvoiceSummary] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  // نوافذ الخصم والضريبة - على مستوى POSMain لتجنب تقييد overflow
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showTaxModal, setShowTaxModal] = useState(false);

  // Multi-stage pricing states
  const [colorModalProduct, setColorModalProduct] = useState(null);
  const [selectedColorCount, setSelectedColorCount] = useState(1);
  const [needsCutting, setNeedsCutting] = useState(false);
  const [eklashy, setEklashy] = useState({ enabled: false, length: '', width: '', count: '' });

  // Stage 4 states
  const [availableSupplies, setAvailableSupplies] = useState([]);
  const [rawSupplyQuantity, setRawSupplyQuantity] = useState('');
  const [netSoldQuantity, setNetSoldQuantity] = useState('1');

  // إعداد معالج الأخطاء
  useEffect(() => {
    errorHandler.setNotificationCallback((message, type) => {
      if (type === 'error') {
        notifyError('خطأ', message);
      } else if (type === 'warning') {
        notifyError('تحذير', message);
      } else {
        notifySuccess('معلومة', message);
      }
    });
  }, [notifySuccess, notifyError]);

  // تحميل الوردية النشطة
  useEffect(() => {
    const loadActiveShift = () => {
      try {
        const shift = storageOptimizer.get('activeShift', null);
        setActiveShift(shift);
      } catch (error) {
        errorHandler.handleError(error, 'Load Active Shift', 'medium');
      }
    };

    loadActiveShift();
    // تحدّث فور بدء/إنهاء الوردية دون رفرش
    const onStarted = () => loadActiveShift();
    const onEnded = () => setActiveShift(null);
    window.addEventListener('shiftStarted', onStarted);
    window.addEventListener('shiftEnded', onEnded);
    const unsubscribeShift = typeof subscribe === 'function' ? subscribe(EVENTS.SHIFTS_CHANGED, loadActiveShift) : null;
    return () => {
      window.removeEventListener('shiftStarted', onStarted);
      window.removeEventListener('shiftEnded', onEnded);
      if (typeof unsubscribeShift === 'function') unsubscribeShift();
    };
  }, []);

  // تحميل المنتجات والفئات والاشتراك في تحديثهما
  useEffect(() => {
    const reloadProducts = () => {
      try {
        storageOptimizer.clearCache();
        const saved = JSON.parse(localStorage.getItem('products') || '[]');
        setProducts(saved);
      } catch (_) { }
    };
    const reloadCategories = () => {
      try {
        storageOptimizer.clearCache();
        const saved = JSON.parse(localStorage.getItem('productCategories') || '[]');
        setCategories(saved);
      } catch (_) { }
    };

    // تحميل أولي
    reloadProducts();
    reloadCategories();

    // الاشتراك في تغييرات المنتجات والفئات
    const unsubProducts = typeof subscribe === 'function' ? subscribe(EVENTS.PRODUCTS_CHANGED, reloadProducts) : null;
    const unsubCategories = typeof subscribe === 'function' ? subscribe(EVENTS.CATEGORIES_CHANGED, reloadCategories) : null;

    return () => {
      if (typeof unsubProducts === 'function') unsubProducts();
      if (typeof unsubCategories === 'function') unsubCategories();
    };
  }, []);

  // حساب الإجمالي الفرعي مع خصومات الأصناف الفردية
  const calcSubtotalWithItemDiscounts = (cartItems) => {
    return (cartItems || cart).reduce((sum, item) => {
      const linePrice = safeMath.multiply(item.price, item.quantity);
      const itemDiscPct = Number(item.itemDiscount) || 0;
      const itemDiscAmt = safeMath.multiply(linePrice, itemDiscPct / 100);
      return safeMath.add(sum, safeMath.subtract(linePrice, itemDiscAmt));
    }, 0);
  };

  // حسابات محسنة بالأداء
  const calculateTotal = () => {
    const subtotal = calcSubtotalWithItemDiscounts();

    // حساب الخصم الكلي (على المجموع بعد خصومات الأصناف)
    const discountAmount = discounts.type === 'fixed'
      ? Number(discounts.fixed) || 0
      : safeMath.calculatePercentage(subtotal, parseFloat(discounts.percentage) || 0);

    // حساب الضريبة (على المبلغ بعد الخصم)
    const taxableAmount = safeMath.subtract(subtotal, discountAmount);
    const taxAmount = taxes.enabled ? safeMath.calculatePercentage(taxableAmount, taxes.vat || 0) : 0;

    const finalTotal = safeMath.add(safeMath.subtract(subtotal, discountAmount), taxAmount);
    return Math.max(0, finalTotal);
  };

  const calculateSubtotal = () => {
    return calcSubtotalWithItemDiscounts();
  };

  const getTotal = useMemo(() => calculateTotal(), [cart, discounts, taxes]);

  const getRemainingAmount = useMemo(() => {
    const downPaymentAmount = downPayment.enabled ? parseFloat(downPayment.amount) || 0 : 0;
    return safeMath.subtract(getTotal, downPaymentAmount);
  }, [getTotal, downPayment]);

  // حساب مبلغ الخصم
  const getDiscountAmount = useMemo(() => {
    const subtotal = safeMath.calculateSubtotal(cart);
    if (discounts.type === 'fixed') {
      return Number(discounts.fixed) || 0;
    } else {
      const percentage = parseFloat(discounts.percentage) || 0;
      return safeMath.calculatePercentage(subtotal, percentage);
    }
  }, [cart, discounts]);

  // حساب مبلغ الضريبة
  const getTaxAmount = useMemo(() => {
    if (!taxes.enabled) return 0;
    const subtotal = safeMath.calculateSubtotal(cart);
    const taxableAmount = Math.max(0, safeMath.subtract(subtotal, getDiscountAmount));
    return safeMath.calculatePercentage(taxableAmount, taxes.vat || 0);
  }, [cart, getDiscountAmount, taxes]);

  const addToCart = useCallback((product) => {
    soundManager.play('addProduct');

    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: Number(item.quantity || 0) + 1 }
          : item
      ));
    } else {
      setCart([
        ...cart,
        {
          ...product,
          price: Number(product.price) || 0,
          quantity: 1
        }
      ]);
    }
  }, [cart]);

  // دوال إدارة السلة محسنة
  const handleProductSelect = useCallback((product) => {
    addToCart(product);
  }, [addToCart]);

  const updateQuantity = useCallback((id, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(id);
    } else {
      setCart(cart.map(item =>
        item.id === id ? { ...item, quantity: Number(newQuantity) || 0 } : item
      ));
    }
  }, [cart]);

  const removeFromCart = useCallback((id) => {
    soundManager.play('removeProduct');
    setCart(cart.filter(item => item.id !== id));
    try { publish(EVENTS.POS_CART_CHANGED, { type: 'remove', id }); } catch (_) { }
  }, [cart]);

  // تحديث طريقة الدفع
  const handlePaymentMethodChange = useCallback((method) => {
    setPaymentMethod(method);
  }, []);

  // إتمام البيع
  const confirmSale = useCallback(async (method) => {
    try {
      if (!activeShift || activeShift.status !== 'active') {
        notifyError('الوردية مغلقة', 'يجب فتح وردية جديدة أولاً لتتمكن من إتمام المبيعات.');
        return;
      }

      if (cart.length === 0) {
        notifyError('خطأ في البيع', 'السلة فارغة');
        return;
      }

      // التحقق من المخزون فقط إذا كان مفعلاً من الإعدادات
      try {
        const storeInfo = JSON.parse(localStorage.getItem('storeInfo') || '{}');
        const settings = JSON.parse(localStorage.getItem('pos-settings') || '{}');
        const rawFlag = (storeInfo.inventoryEnabled !== undefined ? storeInfo.inventoryEnabled : settings.inventoryEnabled);
        const inventoryEnabled = !(rawFlag === false || rawFlag === 'false' || rawFlag === 0 || rawFlag === '0'); // افتراضياً مفعّل إلا لو صرّح بالتعطيل
        if (inventoryEnabled) {
          const productsMap = new Map(products.map(p => [p.id, p]));
          const outOfStock = cart.find(it => {
            const p = productsMap.get(it.id);
            return p && Number(p.stock || 0) <= 0;
          });
          if (outOfStock) {
            notifyError('نفاد المخزون', `المنتج "${outOfStock.name}" غير متوفر في المخزون (0). أزل المنتج أو زوّد المخزون.`);
            return;
          }
        }
      } catch (_) { }

      // التحقق من بيانات العميل
      if (!customerInfo.phone || customerInfo.phone.trim() === '') {
        notifyError('بيانات العميل', 'رقم الهاتف مطلوب لإتمام الفاتورة');
        return;
      }

      // التحقق من صحة العربون
      if (downPayment.enabled) {
        if (!downPayment.amount || parseFloat(downPayment.amount) <= 0) {
          notifyError('خطأ في العربون', 'يرجى إدخال مبلغ العربون');
          return;
        }

        if (parseFloat(downPayment.amount) >= getTotal) {
          notifyError('خطأ في العربون', 'مبلغ العربون يجب أن يكون أقل من إجمالي الفاتورة');
          return;
        }

        if (!downPayment.deliveryDate) {
          notifyError('خطأ في التاريخ', 'يرجى اختيار تاريخ الاستلام');
          return;
        }
      }

      // إنشاء الفاتورة
      const invoiceId = getNextInvoiceId();
      // Calculate snapshot values using safeMath (including per-item discounts)
      const subtotalForSale = cart.reduce((sum, item) => {
        const linePrice = safeMath.multiply(item.price, item.quantity);
        const itemDiscPct = Number(item.itemDiscount) || 0;
        const itemDiscAmt = safeMath.multiply(linePrice, itemDiscPct / 100);
        return safeMath.add(sum, safeMath.subtract(linePrice, itemDiscAmt));
      }, 0);

      const discountAmountForSale = discounts.type === 'fixed'
        ? (Number(discounts.fixed) || 0)
        : safeMath.calculatePercentage(subtotalForSale, parseFloat(discounts.percentage) || 0);

      const taxableAmountForSale = Math.max(0, safeMath.subtract(subtotalForSale, discountAmountForSale));
      const taxAmountForSale = taxes.enabled
        ? safeMath.calculatePercentage(taxableAmountForSale, taxes.vat || 0)
        : 0;

      const totalForSale = Math.max(0, safeMath.add(safeMath.subtract(subtotalForSale, discountAmountForSale), taxAmountForSale));

      // تحديث مديونية وبيانات العميل أولاً للحصول على معرف العميل الفريد
      let finalCustomer = null;
      try {
        if (customerInfo.phone && customerInfo.phone.trim() !== '') {
          const savedCustomers = JSON.parse(localStorage.getItem('customers') || '[]');
          const phoneTrimmed = customerInfo.phone.trim();
          const existingCustIndex = savedCustomers.findIndex(c => c.phone.trim() === phoneTrimmed);
          
          let addedDebt = 0;
          if (method === 'deferred' || downPayment.enabled) {
            const paidNow = downPayment.enabled ? (parseFloat(downPayment.amount) || 0) : 0;
            addedDebt = Math.max(0, safeMath.subtract(totalForSale, paidNow));
          }

          if (existingCustIndex !== -1) {
            const existing = savedCustomers[existingCustIndex];
            finalCustomer = {
              ...existing,
              name: customerInfo.name || existing.name,
              totalSpent: safeMath.add(existing.totalSpent || 0, totalForSale),
              orders: (existing.orders || 0) + 1,
              debt: safeMath.add(existing.debt || 0, addedDebt),
              lastVisit: getCurrentDate().split('T')[0]
            };
            savedCustomers[existingCustIndex] = finalCustomer;
          } else {
            finalCustomer = {
              id: Date.now().toString(), // ضمان معرف نصي فريد
              name: customerInfo.name || 'عميل جديد',
              phone: phoneTrimmed,
              email: 'غير محدد',
              address: 'غير محدد',
              type: customerInfo.type || 'عميل عادي',
              debt: addedDebt,
              totalSpent: totalForSale,
              orders: 1,
              lastVisit: getCurrentDate().split('T')[0],
              joinDate: getCurrentDate().split('T')[0],
              status: 'جديد'
            };
            savedCustomers.push(finalCustomer);
          }
          
          localStorage.setItem('customers', JSON.stringify(savedCustomers));
          
          try {
            publish(EVENTS.CUSTOMERS_CHANGED, {
              type: existingCustIndex !== -1 ? 'update' : 'create',
              customer: finalCustomer,
              customers: savedCustomers
            });
          } catch (_) {}
        }
      } catch (err) {
        console.error('Error updating customer debt/stats on sale:', err);
      }

      // تحديد حالة السداد بدقة للفاتورة
      let initialPaymentStatus = 'complete';
      if (downPayment.enabled) {
        const remaining = Math.max(0, safeMath.subtract(totalForSale, parseFloat(downPayment.amount) || 0));
        initialPaymentStatus = remaining > 0 ? 'partial' : 'complete';
      } else if (method === 'deferred') {
        initialPaymentStatus = 'partial';
      }

      const sale = {
        id: invoiceId,
        date: getCurrentDate(),
        timestamp: formatDateTime(getCurrentDate()),
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: Number(item.price) || 0,
          quantity: Number(item.quantity) || 0,
          total: safeMath.multiply(Number(item.price) || 0, Number(item.quantity) || 0),
          originalPrice: Number(item.originalPrice) || Number(item.price) || 0,
          costPrice: Number(item.costPrice) || 0, // التأكد من إضافة سعر التكلفة
          discount: item.discount || 0,
          wasteData: item.wasteData || null // حفظ بيانات الهالك
        })),
        subtotal: subtotalForSale,
        discount: (discounts.percentage || discounts.fixed) ? {
          type: discounts.type,
          amount: discountAmountForSale
        } : null,
        tax: taxes.enabled ? {
          name: taxes.name,
          rate: Number(taxes.vat) || 0,
          amount: taxAmountForSale
        } : null,
        total: totalForSale,
        downPayment: downPayment.enabled ? {
          enabled: true,
          amount: parseFloat(downPayment.amount),
          deliveryDate: downPayment.deliveryDate,
          remaining: Math.max(0, safeMath.subtract(totalForSale, parseFloat(downPayment.amount) || 0))
        } : null,
        customer: finalCustomer || (customerInfo.name || customerInfo.phone ? customerInfo : null),
        customerId: finalCustomer ? finalCustomer.id : null,
        paymentMethod: method,
        paymentStatus: initialPaymentStatus,
        cashier: user?.username || 'غير محدد',
        shiftId: activeShift?.id || null,
        syncStatus: 'pending',
        amount: totalForSale, // Added for consistency with newSale structure
        discountAmount: discountAmountForSale, // Added for consistency
        taxAmount: taxAmountForSale // Added for consistency
      };

      // حفظ لقطة بيانات للعرض في الملخص قبل مسح السلة
      setInvoiceData({
        invoiceId,
        items: sale.items,
        customer: sale.customer,
        paymentMethod: sale.paymentMethod,
        paymentStatus: sale.paymentStatus,
        subtotal: sale.subtotal,
        discountAmount: sale.discount?.amount || 0,
        taxAmount: sale.tax?.amount || 0,
        total: sale.total,
        downPayment: sale.downPayment,
        cashier: sale.cashier,
        timestamp: sale.timestamp
      });

      // حفظ المبيعة
      const existingSales = storageOptimizer.get('sales', []);
      const updatedSales = [...existingSales, sale];
      storageOptimizer.set('sales', updatedSales);

      try { window.dispatchEvent(new CustomEvent('dataUpdated', { detail: { type: 'sales' } })); } catch (_) { }

      // Handle remainingQuantity for supplies & delete product if empty
      try {
        const allSupplies = JSON.parse(localStorage.getItem('supplier_supplies') || '[]');
        let suppliesUpdated = false;
        let productsToRemove = [];

        cart.forEach(item => {
          if (item.wasteData && item.wasteData.supplyId) {
            const supplyIndex = allSupplies.findIndex(s => s.id === item.wasteData.supplyId);
            if (supplyIndex !== -1) {
              const consumedRawQty = Number(item.wasteData.rawQuantity) || 0;
              const currentQty = allSupplies[supplyIndex].remainingQuantity !== undefined ? allSupplies[supplyIndex].remainingQuantity : allSupplies[supplyIndex].quantity;

              allSupplies[supplyIndex].remainingQuantity = Math.max(0, currentQty - consumedRawQty);

              // Accumulate waste tracking on the supply itself
              const wasteQty = Number(item.wasteData.wasteQuantity) || 0;
              allSupplies[supplyIndex].wasteQuantity = (Number(allSupplies[supplyIndex].wasteQuantity) || 0) + wasteQty;

              suppliesUpdated = true;

              // If the supply is fully consumed, mark for deletion
              if (allSupplies[supplyIndex].remainingQuantity <= 0) {
                // Find the product linked to this supply and mark its ID for removal
                const productLinkedToSupply = products.find(p => p.supplyId === allSupplies[supplyIndex].id);
                if (productLinkedToSupply) {
                  productsToRemove.push(productLinkedToSupply.id);
                }
              }
            }
          }
        });

        if (suppliesUpdated) {
          localStorage.setItem('supplier_supplies', JSON.stringify(allSupplies));
        }

        // Remove empty supply products from catalog
        if (productsToRemove.length > 0) {
          const currentProducts = JSON.parse(localStorage.getItem('products') || '[]');
          const updatedCatalog = currentProducts.filter(p => !productsToRemove.includes(p.id)); // Filter by product ID
          if (updatedCatalog.length !== currentProducts.length) {
            localStorage.setItem('products', JSON.stringify(updatedCatalog));
            setProducts(updatedCatalog);
            publish(EVENTS.PRODUCTS_CHANGED, { type: 'delete' });
          }
        }

      } catch (e) { console.error('Error updating supply remaining amounts', e); }

      // تحديث المخزون فقط إذا كان مفعلاً
      let updatedProducts = products;
      try {
        const storeInfo = JSON.parse(localStorage.getItem('storeInfo') || '{}');
        const settings = JSON.parse(localStorage.getItem('pos-settings') || '{}');
        const rawFlag = (storeInfo.inventoryEnabled !== undefined ? storeInfo.inventoryEnabled : settings.inventoryEnabled);
        const inventoryEnabled = !(rawFlag === false || rawFlag === 'false' || rawFlag === 0 || rawFlag === '0');
        if (inventoryEnabled) {
          updatedProducts = products.map(product => {
            const cartItem = cart.find(item => item.id === product.id);
            if (cartItem) {
              return {
                ...product,
                stock: Math.max(0, product.stock - cartItem.quantity)
              };
            }
            return product;
          });
        }
      } catch (_) { }

      setProducts(updatedProducts);
      // حفظ فوري وتفعيل التحديث اللحظي
      storageOptimizer.setImmediate('products', updatedProducts);

      // Update waste records (هالك)
      try {
        const wasteRecords = JSON.parse(localStorage.getItem('manufacturing_waste') || '[]');
        const newWasteEntries = [];

        cart.forEach(item => {
          if (item.wasteData) {
            newWasteEntries.push({
              id: Date.now() + Math.random(),
              invoiceId: invoiceId,
              date: getCurrentDate(),
              productName: item.name,
              supplierId: item.wasteData.supplierId,
              supplyId: item.wasteData.supplyId,
              rawQuantity: item.wasteData.rawQuantity,
              netQuantity: item.wasteData.netQuantity,
              wasteQuantity: item.wasteData.wasteQuantity
            });
          }
        });

        if (newWasteEntries.length > 0) {
          localStorage.setItem('manufacturing_waste', JSON.stringify([...wasteRecords, ...newWasteEntries]));
        }
      } catch (e) { console.error('Error saving waste records', e); }

      try { window.dispatchEvent(new CustomEvent('dataUpdated', { detail: { type: 'products' } })); } catch (_) { }
      try { publish && EVENTS && publish(EVENTS.PRODUCTS_CHANGED, { type: 'stock_update_after_sale', products: updatedProducts }); } catch (_) { }

      // تحديث الوردية
      if (activeShift) {
        const updatedShift = {
          ...activeShift,
          sales: [...(activeShift.sales || []), sale],
          totalSales: (activeShift.totalSales || 0) + getTotal,
          totalOrders: (activeShift.totalOrders || 0) + 1,
          userName: user?.username || activeShift.userName,
          lastActivity: getCurrentDate()
        };
        setActiveShift(updatedShift);
        storageOptimizer.set('activeShift', updatedShift);
        try { window.dispatchEvent(new CustomEvent('dataUpdated', { detail: { type: 'shift' } })); } catch (_) { }
      }

      // تسجيل النشاط
      logActivity('sale_completed', {
        invoiceId,
        total: getTotal,
        itemsCount: cart.length,
        paymentMethod: method,
        hasDownPayment: downPayment.enabled
      });

      // تشغيل الصوت وإظهار الملخص أولاً
      soundManager.play('success');
      setShowInvoiceSummary(true);

      // منع أي إعادة تحميل تلقائي أثناء عرض الملخص/الطباعة لبضع ثوانٍ
      try {
        const suppressForMs = 30000; // منع التحديث 30 ثانية حتى يضغط المستخدم طباعة
        sessionStorage.setItem('suppressGlobalReloadUntil', String(Date.now() + suppressForMs));
        sessionStorage.setItem('allowGlobalReload', 'false');
      } catch (_) { }

      // ثم إعادة تعيين السلة والحقول بعد العرض
      setTimeout(() => {
        setCart([]);
        setCustomerInfo({ name: '', phone: '' });
        setDownPayment({ enabled: false, amount: '', deliveryDate: getLocalDateString() });
        setDiscounts({ percentage: '', fixed: '', type: 'percentage' });
        window.dispatchEvent(new CustomEvent('focusPOSSearch'));
      }, 50);

      notifySuccess('تم البيع بنجاح', `تم إنشاء الفاتورة رقم ${invoiceId}`);

    } catch (error) {
      errorHandler.handleError(error, 'Confirm Sale', 'high');
      notifyError('خطأ في البيع', 'حدث خطأ أثناء إتمام البيع');
    }
  }, [
    cart, downPayment, getTotal, getRemainingAmount, discounts, taxes,
    customerInfo, user, activeShift, products, setProducts,
    setActiveShift, logActivity, notifySuccess, notifyError
  ]);

  // إعداد اختصارات لوحة المفاتيح العالمية لتسهيل وتسريع عمليات البيع
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('focusPOSSearch'));
      } else if (e.key === 'F4') {
        e.preventDefault();
        const phoneInput = document.getElementById('customer-phone-input');
        if (phoneInput) {
          phoneInput.focus();
          phoneInput.select();
        }
      } else if (e.key === 'F8') {
        e.preventDefault();
        // إتمام البيع السريع كاش
        confirmSale('cash');
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [confirmSale]);

  const handlePrintInvoice = useCallback(() => {
    try {
      // إن وُجد Web Serial API، حاول الطباعة الحرارية مع قطع الورق
      const tryThermal = async () => {
        try {
          if (navigator.serial && invoiceData) {
            const receiptData = {
              printerSettings: printer.getPrinterSettings(),
              storeInfo: {
                storeName: 'MS GROUP',
                storeAddress: 'باسوس - القناطر الخيرية - الطريق الدائري',
                storePhone: '01029022006'
              },
              invoiceId: invoiceData.invoiceId,
              items: invoiceData.items || [],
              subtotal: Number(invoiceData.subtotal || 0),
              discount: Number(invoiceData.discountAmount || 0),
              tax: Number(invoiceData.taxAmount || 0),
              total: Number(invoiceData.total || 0),
              downPayment: Number(invoiceData.downPayment?.amount || 0),
              remaining: invoiceData.downPayment?.enabled
                ? Math.max(0, Number(invoiceData.total || 0) - Number(invoiceData.downPayment?.amount || 0))
                : Number(invoiceData.total || 0),
              customerName: invoiceData.customer?.name || '',
              customerPhone: invoiceData.customer?.phone || '',
              deliveryDate: invoiceData.downPayment?.deliveryDate || '',
              paymentMethod: (invoiceData.paymentMethod === 'cash'
                ? 'نقدي'
                : invoiceData.paymentMethod === 'wallet'
                  ? 'محفظة إلكترونية'
                  : invoiceData.paymentMethod === 'instapay'
                    ? 'انستا باي'
                    : 'غير محدد')
            };
            const ok = await thermalPrinterManager.printReceipt(receiptData);
            if (ok) {
              notifySuccess('تمت الطباعة الحرارية', 'تم إرسال أمر القطع للطابعة');
              return true;
            }
          }
        } catch (e) {
          console.warn('تعذر استخدام الطابعة الحرارية، سيتم استخدام طباعة المتصفح.', e);
        }
        return false;
      };

      (async () => {
        const thermalDone = await tryThermal();
        if (thermalDone) return;

        // احتياطي: طباعة المتصفح
        const invoiceContent = generateInvoicePrintContent(invoiceData);
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(invoiceContent);
          printWindow.document.close();
          // سيتم تنفيذ window.print مرة واحدة من داخل القالب بعد تحميل الشعار
          notifySuccess('تم فتح نافذة الطباعة', 'تحقق من إعدادات الطابعة');
        } else {
          notifyError('خطأ في الطباعة', 'لا يمكن فتح نافذة الطباعة');
        }
      })();
    } catch (error) {
      console.error('خطأ في طباعة الفاتورة:', error);
      notifyError('خطأ في الطباعة', 'حدث خطأ غير متوقع');
    }
  }, [invoiceData, cart, customerInfo, paymentMethod, getTotal, getDiscountAmount, getTaxAmount, getRemainingAmount, downPayment, discounts, taxes, user, notifySuccess, notifyError]);

  const generateInvoicePrintContent = useCallback((snapshot) => {
    const storeInfo = (() => {
      try { return JSON.parse(localStorage.getItem('storeInfo') || '{}'); } catch (_) { return {}; }
    })();
    const logoSrc = storeInfo.logo || `${window.location.origin}/favicon.svg`;
    const invoiceId = snapshot?.invoiceId || getNextInvoiceId();
    const currentDate = formatDateTime(getCurrentDate());
    const itemsArr = snapshot?.items || cart;
    const subtotal = snapshot?.subtotal ?? safeMath.calculateSubtotal(itemsArr);
    const discountAmount = snapshot?.discountAmount ?? ((discounts.type === 'percentage')
      ? safeMath.calculatePercentage(subtotal, parseFloat(discounts.percentage) || 0)
      : (parseFloat(discounts.fixed) || 0));
    const taxAmount = snapshot?.taxAmount ?? (taxes.enabled
      ? safeMath.calculatePercentage(Math.max(0, safeMath.subtract(subtotal, discountAmount)), Number(taxes.vat) || 0)
      : 0);
    const total = snapshot?.total ?? Math.max(0, safeMath.add(safeMath.subtract(subtotal, discountAmount), taxAmount));
    const remainingAmount = snapshot?.downPayment?.enabled
      ? Math.max(0, safeMath.subtract(total, parseFloat(snapshot.downPayment.amount) || 0))
      : total;

    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>فاتورة بيع - ${invoiceId}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700;800&display=swap" rel="stylesheet">
        <style>
          @page {
            size: auto;
            margin: 8mm;
          }
          body {
            font-family: 'Almarai', Arial, "Segoe UI", Tahoma, sans-serif;
            color: #1e293b;
            background-color: #fff;
            margin: 0;
            padding: 0;
            direction: rtl;
            font-size: 13px;
            font-weight: 700;
            line-height: 1.5;
          }
          .invoice-box {
            max-width: 100%;
            margin: 0 auto;
            padding: 0;
          }
          .header-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
          }
          .header-table td {
            vertical-align: middle;
            border: none;
            padding: 0;
          }
          .logo {
            max-height: 60px;
            width: auto;
            margin-bottom: 6px;
          }
          .store-title {
            font-size: 18px;
            font-weight: 900;
            color: #0f172a;
            margin-bottom: 4px;
          }
          .store-subtitle {
            font-size: 14px;
            font-weight: 900;
            color: #000000;
          }
          .invoice-title-col {
            text-align: left;
          }
          .invoice-title-text {
            font-size: 22px;
            font-weight: 900;
            color: #0f172a;
            margin-bottom: 6px;
          }
          .info-badge {
            display: inline-block;
            background-color: #f8fafc;
            border: 1.5px solid #cbd5e1;
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 700;
            color: #1e293b;
            text-align: right;
            line-height: 1.6;
          }
          .divider {
            border-top: 2px solid #cbd5e1;
            margin: 15px 0;
          }
          .details-grid {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
          }
          .details-grid td {
            width: 50%;
            vertical-align: top;
            padding: 0 0 0 10px;
            border: none;
          }
          .details-grid td:last-child {
            padding: 0 10px 0 0;
          }
          .details-card {
            background-color: #f8fafc;
            border: 1.5px solid #cbd5e1;
            border-radius: 10px;
            padding: 12px;
            height: 100%;
            box-sizing: border-box;
          }
          .details-card h4 {
            margin: 0 0 8px 0;
            font-size: 13px;
            font-weight: 900;
            color: #0f172a;
            border-bottom: 1.5px solid #cbd5e1;
            padding-bottom: 6px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 6px;
            font-size: 12px;
          }
          .info-label {
            color: #475569;
            font-weight: 700;
          }
          .info-val {
            color: #0f172a;
            font-weight: 800;
          }
          .products-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .products-table th {
            background-color: #f1f5f9;
            border: 1.5px solid #cbd5e1;
            padding: 10px;
            font-size: 12px;
            font-weight: 900;
            color: #0f172a;
            text-align: right;
          }
          .products-table td {
            border: 1.5px solid #e2e8f0;
            padding: 8px 10px;
            font-size: 13px;
            font-weight: 700;
            color: #1e293b;
          }
          .products-table tr:nth-child(even) td {
            background-color: #f8fafc;
          }
          .text-center { text-align: center !important; }
          .text-left { text-align: left !important; }
          .summary-table-container {
            width: 100%;
            margin-top: 15px;
          }
          .summary-table {
            width: 340px;
            margin-right: auto;
            border-collapse: collapse;
          }
          .summary-table td {
            padding: 6px 10px;
            font-size: 13px;
            border: none;
          }
          .summary-table .label {
            color: #475569;
            font-weight: 700;
            text-align: right;
          }
          .summary-table .value {
            color: #0f172a;
            font-weight: 800;
            text-align: left;
          }
          .summary-table .total-row td {
            border-top: 2px solid #0f172a;
            padding-top: 10px;
            font-size: 15px;
            font-weight: 900;
          }
          .summary-table .total-row .label {
            color: #0f172a;
          }
          .summary-table .total-row .value {
            color: #059669;
            font-size: 17px;
          }
          .footer-section {
            margin-top: 40px;
            border-top: 1.5px dashed #cbd5e1;
            padding-top: 15px;
            text-align: center;
            font-size: 11px;
            font-weight: bold;
            color: #000000;
          }
          .signatures {
            margin-top: 35px;
            display: flex;
            justify-content: space-between;
            padding: 0 30px;
          }
          .sig-box {
            text-align: center;
            width: 160px;
          }
          .sig-line {
            border-bottom: 1.5px solid #cbd5e1;
            margin-bottom: 8px;
            height: 30px;
          }
          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .details-card {
              background-color: #f8fafc !important;
            }
            .products-table th {
              background-color: #f1f5f9 !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <table class="header-table">
            <tr>
              <td>
                ${storeInfo.logo ? `<img src="${logoSrc}" class="logo" alt="Logo" />` : ''}
                <div class="store-title">${storeInfo.companyName || 'الأمين للأدوات الصحية'}</div>
                <div class="store-subtitle" style="font-weight: 900; color: #000000; margin-bottom: 2px; font-size: 14px;">إدارة محمد أمين</div>
                <div class="store-subtitle" style="font-weight: 900; color: #000000; font-size: 14px;">هاتف: ${storeInfo.companyPhone || '01017856684 - 01200054511 - 01125291815'}</div>
                <div class="store-subtitle" style="font-weight: 900; color: #000000; font-size: 14px;">العنوان: ${storeInfo.companyAddress || 'طريق القناطر - الحادثة بجوار ماركت سلسبيل'}</div>
              </td>
              <td class="invoice-title-col">
                <div class="invoice-title-text">فاتورة بيع</div>
                <div class="info-badge">
                  <strong>رقم الفاتورة:</strong> #${invoiceId}<br/>
                  <strong>التاريخ:</strong> ${currentDate}
                </div>
              </td>
            </tr>
          </table>

          <table class="details-grid">
            <tr>
              <td>
                <div class="details-card">
                  <h4>تفاصيل الفاتورة</h4>
                  <div class="info-row">
                    <span class="info-label">الكاشير:</span>
                    <span class="info-val">${invoiceData?.cashier || user?.username || 'غير محدد'}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">طريقة الدفع:</span>
                    <span class="info-val">${(invoiceData?.paymentMethod || paymentMethod) === 'cash' ? '💵 نقدي' : (invoiceData?.paymentMethod || paymentMethod) === 'wallet' ? '📱 محفظة إلكترونية' : (invoiceData?.paymentMethod || paymentMethod) === 'instapay' ? '💳 انستا باي' : (invoiceData?.paymentMethod || paymentMethod) === 'deferred' ? '⏳ آجل' : '💵 نقدي'}</span>
                  </div>
                </div>
              </td>
              <td>
                <div class="details-card">
                  <h4>بيانات العميل</h4>
                  <div class="info-row">
                    <span class="info-label">اسم العميل:</span>
                    <span class="info-val">${(invoiceData?.customer?.name) || customerInfo?.name || 'عميل نقدي'}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">رقم الهاتف:</span>
                    <span class="info-val direction-ltr">${(invoiceData?.customer?.phone) || customerInfo?.phone || 'غير محدد'}</span>
                  </div>
                </div>
              </td>
            </tr>
          </table>

          <table class="products-table">
            <thead>
              <tr>
                <th style="width: 8%" class="text-center">م</th>
                <th>بيان المنتجات</th>
                <th style="width: 15%" class="text-center">الكمية</th>
                <th style="width: 20%" class="text-center">سعر الوحدة</th>
                <th style="width: 20%" class="text-center">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              ${itemsArr.map((item, idx) => `
                <tr>
                  <td class="text-center">${idx + 1}</td>
                  <td><strong>${item.name || 'منتج غير محدد'}</strong></td>
                  <td class="text-center">${Number(item.quantity || 0)}</td>
                  <td class="text-center">${(Number(item.price) || 0).toLocaleString('en-US')} ج.م</td>
                  <td class="text-center"><strong>${(safeMath.multiply(Number(item.price) || 0, Number(item.quantity) || 0)).toLocaleString('en-US')} ج.م</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="summary-table-container">
            <table class="summary-table">
              <tr>
                <td class="label">إجمالي القيمة:</td>
                <td class="value">${(subtotal || 0).toLocaleString('en-US')} ج.م</td>
              </tr>
              ${discountAmount > 0 ? `
                <tr>
                  <td class="label">الخصم الممنوح:</td>
                  <td class="value text-red-600">-${discountAmount.toLocaleString('en-US')} ج.م</td>
                </tr>
              ` : ''}
              ${taxAmount > 0 ? `
                <tr>
                  <td class="label">الضريبة المضافة:</td>
                  <td class="value">+${taxAmount.toLocaleString('en-US')} ج.م</td>
                </tr>
              ` : ''}
              ${(snapshot?.downPayment?.enabled) ? `
                <tr>
                  <td class="label">العربون المدفوع:</td>
                  <td class="value">${((snapshot.downPayment.amount || 0)).toLocaleString('en-US')} ج.م</td>
                </tr>
              ` : ''}
              <tr class="total-row">
                <td class="label">${(snapshot?.downPayment?.enabled ? 'المبلغ المتبقي المستحق:' : 'الإجمالي النهائي:')}</td>
                <td class="value">${((snapshot?.downPayment?.enabled ? remainingAmount : total)).toLocaleString('en-US')} ج.م</td>
              </tr>
            </table>
          </div>

          ${(invoiceData?.downPayment?.enabled && invoiceData?.downPayment?.deliveryDate) ? `
            <div style="margin-top: 20px; font-size: 12px; color: #334155; background-color: #f1f5f9; padding: 10px 15px; border-radius: 8px; border: 1px dashed #cbd5e1;">
              🗓️ <strong>تاريخ الاستلام المتوقع:</strong> ${formatDateToDDMMYYYY(invoiceData.downPayment.deliveryDate)}
            </div>
          ` : ''}

          <div class="signatures">
            <div class="sig-box">
              <div class="sig-line"></div>
              <span>توقيع العميل / المستلم</span>
            </div>
            <div class="sig-box">
              <div class="sig-line"></div>
              <span>توقيع الكاشير / المسؤول</span>
            </div>
          </div>

          <div class="footer-section">
            <div style="font-weight: 800; margin-bottom: 4px; color: #000000;">شكراً لتعاملكم معنا</div>
            <div style="font-size: 14px; color: #000000; font-weight: 900;">برمجة وتطوير Elking للبرمجيات - هاتف: 01553448631</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 500);
            }, 300);
          };
        </script>
      </body>
      </html>
    `;
  }, [cart, customerInfo, paymentMethod, getTotal, getDiscountAmount, getTaxAmount, getRemainingAmount, downPayment, discounts, taxes, user, getNextInvoiceId, formatDateTime, getCurrentDate, formatDateToDDMMYYYY]);
  // فلترة المنتجات - إظهار منتجات البيع العادية وتصفية خامات التوريد الخام
  // نترك مهمة البحث والفلترة حسب الفئة لمكون ProductGrid الداخلي لضمان الكفاءة
  const filteredProducts = useMemo(() => {
    return (products || []).filter(product => product && !product.isSupplyProduct);
  }, [products]);

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <div className="container mx-auto px-4 py-4">
        {/* المحتوى الرئيسي */}
        <div className="flex flex-row gap-4 lg:gap-6 items-start w-full" dir="rtl">
          {/* إدارة السلة والدفع - تظهر على اليمين في RTL لأنها الأولى في JSX */}
          <div className="flex flex-col gap-4 lg:gap-6 w-[24rem] xl:w-[28rem] sticky top-4 h-[calc(100vh-32px)] overflow-y-auto pr-2 custom-scrollbar shrink-0">
            <CartManager
              cart={cart}
              setCart={setCart}
              onUpdateQuantity={updateQuantity}
              onRemoveFromCart={removeFromCart}
              getTotal={getTotal}
              getDiscountAmount={getDiscountAmount}
              getTaxAmount={getTaxAmount}
              getRemainingAmount={getRemainingAmount}
              discounts={discounts}
              setDiscounts={setDiscounts}
              taxes={taxes}
              setTaxes={setTaxes}
              downPayment={downPayment}
              setDownPayment={setDownPayment}
              customerInfo={customerInfo}
              setCustomerInfo={setCustomerInfo}
              onOpenDiscountModal={() => setShowDiscountModal(true)}
              onOpenTaxModal={() => setShowTaxModal(true)}
            />

            <PaymentManager
              downPayment={downPayment}
              setDownPayment={setDownPayment}
              getTotal={getTotal}
              getRemainingAmount={getRemainingAmount}
              onConfirmSale={confirmSale}
              paymentMethod={paymentMethod}
              setPaymentMethod={handlePaymentMethodChange}
            />
          </div>

          {/* شبكة المنتجات - تظهر على اليسار في RTL لأنها الثانية في JSX */}
          <div className="flex-1 min-w-0">
            <ProductGrid
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              onAddToCart={handleProductSelect}
              categories={categories}
              setCategories={setCategories}
              products={filteredProducts} // Pass filtered products
              setProducts={setProducts}
              productImages={productImages}
              setProductImages={setProductImages}
            />
          </div>
        </div>

      </div>

      {/* نافذة الخصم - على مستوى POSMain لتجنب overflow clipping */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999] backdrop-blur-sm">
          <div className="bg-white rounded-xl p-6 w-96 max-w-full mx-4 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-800 mb-4">تطبيق خصم</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-slate-600 mb-2">نوع الخصم:</label>
                <select
                  value={discounts.type}
                  onChange={(e) => setDiscounts({ ...discounts, type: e.target.value, percentage: '', fixed: '' })}
                  className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="percentage">نسبة مئوية (%)</option>
                  <option value="fixed">مبلغ ثابت (جنيه)</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 mb-2">
                  {discounts.type === 'percentage' ? 'النسبة المئوية:' : 'المبلغ:'}
                </label>
                <input
                  type="number"
                  autoFocus
                  value={discounts.type === 'percentage' ? discounts.percentage : discounts.fixed}
                  onChange={(e) => setDiscounts({ ...discounts, [discounts.type === 'percentage' ? 'percentage' : 'fixed']: e.target.value })}
                  className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder={discounts.type === 'percentage' ? '0 - 100' : '0'}
                  min="0"
                  max={discounts.type === 'percentage' ? '100' : undefined}
                  step={discounts.type === 'percentage' ? '1' : '0.01'}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowDiscountModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-4 rounded-lg transition-colors border border-slate-300"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  const val = discounts.type === 'percentage' ? discounts.percentage : discounts.fixed;
                  const num = parseFloat(val);
                  if (discounts.type === 'percentage' && (num < 0 || num > 100)) {
                    alert('نسبة الخصم يجب أن تكون بين 0 و 100');
                    return;
                  }
                  
                  // توزيع نسبة الخصم تلقائياً على الأصناف بالسلة
                  if (discounts.type === 'percentage' && !isNaN(num) && num >= 0) {
                    setCart(prevCart => prevCart.map(item => ({
                      ...item,
                      itemDiscount: num
                    })));
                    // تصفير الخصم الكلي لمنع الحساب المزدوج
                    setDiscounts({ ...discounts, percentage: '', fixed: '' });
                  }
                  
                  setShowDiscountModal(false);
                }}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-4 rounded-lg transition-colors font-semibold"
              >
                تطبيق الخصم
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة الضريبة - على مستوى POSMain */}
      {showTaxModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999] backdrop-blur-sm">
          <div className="bg-white rounded-xl p-6 w-96 max-w-full mx-4 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-800 mb-4">تطبيق ضريبة</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-slate-600 mb-2">اسم الضريبة:</label>
                <input
                  type="text"
                  value={taxes.name}
                  onChange={(e) => setTaxes({ ...taxes, name: e.target.value })}
                  className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="مثال: ضريبة القيمة المضافة"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-2">النسبة المئوية:</label>
                <input
                  type="number"
                  autoFocus
                  value={taxes.vat}
                  onChange={(e) => setTaxes({ ...taxes, vat: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="0-100"
                  min="0" max="100" step="0.1"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowTaxModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-4 rounded-lg transition-colors border border-slate-300"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  setTaxes({ ...taxes, enabled: true });
                  setShowTaxModal(false);
                }}
                className="flex-1 bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded-lg transition-colors font-semibold"
              >
                تطبيق الضريبة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ملخص الفاتورة */}
      {showInvoiceSummary && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999] backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] mx-auto overflow-y-auto shadow-2xl text-right animate-fadeInUp">
            <h3 className="text-xl font-extrabold text-slate-800 mb-6 text-center border-b border-slate-100 pb-4 flex items-center justify-center gap-2">
              📄 فاتورة البيع المبدئية
            </h3>

            {/* معلومات الفاتورة */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-bold">رقم الفاتورة:</span>
                  <span className="text-slate-800 font-bold text-sm bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-lg border border-blue-100">#{invoiceData?.invoiceId || getNextInvoiceId()}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-bold">التاريخ:</span>
                  <span className="text-slate-800 font-bold">{invoiceData?.timestamp || formatDateTime(getCurrentDate())}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-bold">طريقة الدفع:</span>
                  <span className="text-slate-800 font-bold">{(invoiceData?.paymentMethod || paymentMethod) === 'cash' ? '💵 نقدي' : (invoiceData?.paymentMethod || paymentMethod) === 'wallet' ? '📱 محفظة إلكترونية' : (invoiceData?.paymentMethod || paymentMethod) === 'instapay' ? '💳 انستا باي' : (invoiceData?.paymentMethod || paymentMethod) === 'deferred' ? '⏳ آجل' : '💵 نقدي'}</span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-bold">العميل:</span>
                  <span className="text-slate-800 font-bold">{invoiceData?.customer?.name || customerInfo?.name || 'غير محدد'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-bold">الهاتف:</span>
                  <span className="text-slate-800 font-bold direction-ltr">{invoiceData?.customer?.phone || customerInfo?.phone || 'غير محدد'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-bold">الكاشير:</span>
                  <span className="text-slate-800 font-bold">{invoiceData?.cashier || user?.username || 'غير محدد'}</span>
                </div>
              </div>
            </div>

            {/* تفاصيل المنتجات */}
            <div className="mb-6">
              <h4 className="text-sm font-extrabold text-slate-700 mb-3">تفاصيل المنتجات</h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="grid grid-cols-4 gap-2 p-3 bg-slate-100 text-xs font-extrabold text-slate-700 border-b border-slate-200">
                  <div>المنتج</div>
                  <div className="text-center">الكمية</div>
                  <div className="text-center">السعر</div>
                  <div className="text-center">الإجمالي</div>
                </div>
                {(invoiceData?.items || []).map((item, index) => (
                  <div key={index} className="grid grid-cols-4 gap-2 p-3 border-b border-slate-100 hover:bg-slate-50 transition-colors last:border-b-0 text-slate-800 font-medium">
                    <div className="text-sm">{item.name}</div>
                    <div className="text-center text-sm">{Number(item.quantity || 0)}</div>
                    <div className="text-center text-sm">{(Number(item.price) || 0).toLocaleString('en-US')} جنيه</div>
                    <div className="text-center text-sm font-bold text-blue-600">{((Number(item.price) || 0) * (Number(item.quantity) || 0)).toLocaleString('en-US')} جنيه</div>
                  </div>
                ))}
                {(!invoiceData?.items || invoiceData.items.length === 0) && (
                  <div className="p-3 text-center text-slate-400 font-medium">لا توجد عناصر في هذه الفاتورة</div>
                )}
              </div>
            </div>

            {/* ملخص المبالغ */}
            <div className="mb-6">
              <h4 className="text-sm font-extrabold text-slate-700 mb-3">ملخص المبالغ</h4>
              <div className="bg-gray-700 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-300">الإجمالي الفرعي:</span>
                  <span className="text-white">{(invoiceData?.subtotal ?? safeMath.calculateSubtotal(invoiceData?.items || [])).toLocaleString('en-US')} جنيه</span>
                </div>

                {(invoiceData?.discountAmount || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-300">الخصم:</span>
                    <span className="text-red-400">-{(invoiceData.discountAmount || 0).toLocaleString('en-US')} جنيه</span>
                  </div>
                )}

                {((invoiceData?.taxAmount || 0) > 0) && (
                  <div className="flex justify-between">
                    <span className="text-gray-300">الضريبة:</span>
                    <span className="text-orange-400">+{(invoiceData.taxAmount || 0).toLocaleString('en-US')} جنيه</span>
                  </div>
                )}

                {(invoiceData?.downPayment?.enabled) && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-300">العربون:</span>
                      <span className="text-blue-400">{(invoiceData.downPayment.amount || 0).toLocaleString('en-US')} جنيه</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">المبلغ المتبقي:</span>
                      <span className="text-yellow-400">{(Math.max(0, (invoiceData.total || 0) - (parseFloat(invoiceData.downPayment.amount) || 0))).toLocaleString('en-US')} جنيه</span>
                    </div>
                  </>
                )}

                <div className="border-t border-gray-600 pt-2">
                  <div className="flex justify-between">
                    <span className="text-white font-bold text-lg">
                      {invoiceData?.downPayment?.enabled ? 'المبلغ المتبقي:' : 'إجمالي الفاتورة:'}
                    </span>
                    <span className="text-white font-bold text-lg">
                      {(invoiceData?.downPayment?.enabled
                        ? Math.max(0, (invoiceData.total || 0) - (parseFloat(invoiceData.downPayment.amount) || 0))
                        : (invoiceData?.total || 0)
                      ).toLocaleString('en-US')} جنيه
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* معلومات إضافية */}
            {downPayment.enabled && downPayment.deliveryDate && (
              <div className="mb-6">
                <h4 className="text-sm font-extrabold text-slate-700 mb-3">معلومات الاستلام</h4>
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="flex justify-between">
                    <span className="text-gray-300">تاريخ الاستلام:</span>
                    <span className="text-white">{formatDateToDDMMYYYY(downPayment.deliveryDate)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* أزرار الإجراءات */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowInvoiceSummary(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-lg transition-colors font-semibold"
              >
                إغلاق
              </button>
              <button
                onClick={() => {
                  handlePrintInvoice();
                }}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg transition-colors font-semibold"
              >
                طباعة الفاتورة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default POSMain;
