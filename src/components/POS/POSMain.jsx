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
        const saved = JSON.parse(localStorage.getItem('products') || '[]');
        setProducts(saved);
      } catch (_) { }
    };
    const reloadCategories = () => {
      try {
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

  // حسابات محسنة بالأداء
  const calculateTotal = () => {
    const subtotal = safeMath.calculateSubtotal(cart);

    // حساب الخصم
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
    return safeMath.calculateSubtotal(cart);
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

  // دوال إدارة السلة محسنة
  const handleProductSelect = useCallback((product) => {
    soundManager.play('openWindow');
    setColorModalProduct(product);
    setSelectedColorCount(1);
    setNeedsCutting(false);
    setEklashy({ enabled: false, length: '', width: '', count: '' });
    setRawSupplyQuantity('');
    setNetSoldQuantity('1');

    // Fetch supplies for this product
    try {
      const allSupplies = JSON.parse(localStorage.getItem('supplier_supplies') || '[]');
      // Filter supplies to only include those linked to the selected product (using remainingQuantity or quantity)
      const productSupplies = allSupplies.filter(s => s.id === product.supplyId && Number(s.remainingQuantity !== undefined ? s.remainingQuantity : s.quantity) > 0);
      setAvailableSupplies(productSupplies);

      // Pre-fill raw and net quantity if a supply is found and linked
      if (productSupplies.length > 0) {
        const linkedSupply = productSupplies[0]; // Assuming one supply per product for simplicity
        const qtyAvailable = linkedSupply.remainingQuantity !== undefined ? linkedSupply.remainingQuantity : linkedSupply.quantity;
        setRawSupplyQuantity(qtyAvailable.toString());
        // Default net quantity to empty so user has to type it, or default to 1
        setNetSoldQuantity('');
      }
    } catch (e) {
      setAvailableSupplies([]);
    }
  }, []);

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
      // Calculate snapshot values using safeMath
      const subtotalForSale = safeMath.calculateSubtotal(cart);

      const discountAmountForSale = discounts.type === 'fixed'
        ? (Number(discounts.fixed) || 0)
        : safeMath.calculatePercentage(subtotalForSale, parseFloat(discounts.percentage) || 0);

      const taxableAmountForSale = Math.max(0, safeMath.subtract(subtotalForSale, discountAmountForSale));
      const taxAmountForSale = taxes.enabled
        ? safeMath.calculatePercentage(taxableAmountForSale, taxes.vat || 0)
        : 0;

      const totalForSale = Math.max(0, safeMath.add(safeMath.subtract(subtotalForSale, discountAmountForSale), taxAmountForSale));

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
        customer: customerInfo.name || customerInfo.phone ? customerInfo : null,
        paymentMethod: method,
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
      }, 0);

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
            const { default: thermalPrinterManager } = await import('../../utils/thermalPrinter.js');
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
        <title>فاتورة البيع - ${invoiceId}</title>
        <style>
          /* تخطيط مُحسّن للطباعة على ورق 58mm */
          @page { size: 58mm auto; margin: 1mm; }
          /* إجبار المحتوى ليمتد بعرض ورق 58mm ويكون في الوسط تماماً */
          html, body { width: 58mm; margin: 0; padding: 0; }
          body { font-family: Tahoma, Arial, "Segoe UI", sans-serif; color:#000; }
          .wrap { width: calc(58mm - 2mm); /* طرح هوامش الصفحة */ margin: 0 auto; }
          .num { font-variant-numeric: tabular-nums; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
          .header {
            text-align: center;
            border-bottom: 1px dashed #000;
            padding-bottom: 6px;
            margin-bottom: 8px;
          }
          .logo { width: 34mm; margin: 0 auto 4px; }
          .logo img { display:block; max-width:100%; height:auto; }
          .store-name { font-size: 14px; font-weight: 800; letter-spacing:.2px; color:#000; }
          .store-info { font-size:10px; color:#000; margin-top:2px; }
          .invoice-title { font-size: 13px; font-weight: 700; margin-top:3px; }
          .invoice-info { display:flex; justify-content:space-between; margin:6px 0 8px; font-size: 10px; }
          .customer-info {
            margin-bottom: 8px;
            padding: 6px;
            background: #f5f5f5;
            border-radius: 3px;
            font-size: 10px;
          }
          .products-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            margin-bottom: 8px;
          }
          .products-table th,
          .products-table td {
            padding: 5px 4px;
            text-align: right;
            border: 1px solid #000; /* حدود أفقية ورأسية لإظهار الأعمدة */
            font-size: 10px;
            color: #000;
            white-space: nowrap;
          }
          .products-table th, .products-table td {
            border: 1px solid #000;
            padding: 4px 2px;
            font-size: 10px;
            color: #000;
          }
          .products-table td:first-child { 
            white-space: normal;
            word-break: break-word;
          }
          .products-table th {
            background: #f0f0f0;
            font-weight: 700;
            color: #000;
            font-size: 9px;
            white-space: nowrap;
          }
          .products-table .center { text-align:center; }
          .products-table th:nth-child(1), .products-table td:nth-child(1) { width: 45%; }
          .products-table th:nth-child(2), .products-table td:nth-child(2) { width: 15%; text-align:center; }
          .products-table th:nth-child(3), .products-table td:nth-child(3) { width: 20%; text-align:center; }
          .products-table th:nth-child(4), .products-table td:nth-child(4) { width: 20%; text-align:center; }
          .products-table tfoot td { font-weight:700; }
          .tax-row td { border-top: 1px solid #000; }
          .net-row td { border-top: 2px solid #000; font-size:11px; }
          .summary {
            border-top: 1px dashed #000;
            padding-top: 6px;
            margin-top: 8px;
          }
          .summary-row {
            display:flex; justify-content:space-between; margin:3px 0; font-size: 9px;
          }
          .total-row {
            font-weight: 800;
            font-size: 11px;
            border-top: 1px solid #000;
            padding-top: 5px;
            margin-top: 6px;
          }
          .footer {
            text-align: center;
            margin-top: 10px;
            font-size: 9px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="wrap">
         <div class="header">
           <div class="store-name">${storeInfo.companyName || 'MS GROUP'}</div>
          <div class="store-info" style="font-size:10px; color:#000; margin-top:2px;">${storeInfo.companyPhone || '01029022006'}</div>
           <div style="font-weight: 800; font-size: 14px; margin-top:4px;">فاتورة البيع</div>
        </div>
        <hr style="border-top:1px dashed #000;">
        <div class="invoice-info">
          <div>رقم الفاتورة: #${invoiceId}</div>
          <div>${currentDate}</div>
        </div>
        
        <div class="customer-info">
          <div><strong>العميل:</strong> ${(invoiceData?.customer?.name) || customerInfo?.name || 'غير محدد'}</div>
          <div><strong>الهاتف:</strong> ${(invoiceData?.customer?.phone) || customerInfo?.phone || 'غير محدد'}</div>
          <div><strong>الكاشير:</strong> ${invoiceData?.cashier || user?.username || 'غير محدد'}</div>
          <div><strong>طريقة الدفع:</strong> ${(invoiceData?.paymentMethod || paymentMethod) === 'cash' ? 'نقدي' : (invoiceData?.paymentMethod || paymentMethod) === 'wallet' ? 'محفظة إلكترونية' : (invoiceData?.paymentMethod || paymentMethod) === 'instapay' ? 'انستا باي' : 'غير محدد'}</div>
        </div>
        
        <table class="products-table">
          <thead>
            <tr>
              <th>المنتج</th>
              <th class="center">الكمية</th>
              <th class="center">السعر</th>
              <th class="center">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${itemsArr.map(item => `
              <tr>
                <td>${item.name || 'منتج غير محدد'}</td>
                <td class="center">${Number(item.quantity || 0)}</td>
                <td class="center">${((Number(item.price) || 0)).toLocaleString('en-US')}</td>
                <td class="center">${(safeMath.multiply(Number(item.price) || 0, Number(item.quantity) || 0)).toLocaleString('en-US')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="summary">
          <div class="summary-row">
            <span>المجموع الفرعي:</span>
            <span>${(subtotal || 0).toLocaleString('en-US')} جنيه</span>
          </div>
          
          ${discountAmount > 0 ? `
            <div class="summary-row">
              <span>الخصم:</span>
              <span>-${discountAmount.toLocaleString('en-US')} جنيه</span>
            </div>
          ` : ''}
          
          ${taxAmount > 0 ? `
            <div class="summary-row">
              <span>الضريبة:</span>
              <span>+${taxAmount.toLocaleString('en-US')} جنيه</span>
            </div>
          ` : ''}
          
          ${(snapshot?.downPayment?.enabled) ? `
            <div class="summary-row">
              <span>العربون:</span>
              <span>${((snapshot.downPayment.amount || 0)).toLocaleString('en-US')} جنيه</span>
            </div>
            <div class="summary-row">
              <span>المبلغ المتبقي:</span>
              <span>${remainingAmount.toLocaleString('en-US')} جنيه</span>
            </div>
          ` : ''}
          
          <div class="summary-row total-row">
            <span>${(snapshot?.downPayment?.enabled ? 'المبلغ المتبقي:' : 'الإجمالي:')}</span>
            <span>${((snapshot?.downPayment?.enabled ? remainingAmount : total)).toLocaleString('en-US')} جنيه</span>
          </div>
        </div>
        
        ${(invoiceData?.downPayment?.enabled && invoiceData?.downPayment?.deliveryDate) ? `
          <div class="customer-info">
            <div><strong>تاريخ الاستلام:</strong> ${formatDateToDDMMYYYY(invoiceData.downPayment.deliveryDate)}</div>
          </div>
        ` : ''}
        
        <div class="footer" style="color:#000;">
          <div class="footer">
            <div>هذه فاتوره مطبوعه من نظام اداره مبيعات MS GROUP</div>
            <div>01029022006</div>
          </div>
        </div>
        
        <script>
          // قطع الورق تلقائياً بعد الطباعة
          window.onload = function() {
              let printed = false;
              const doPrint = function(){ if (printed) return; printed = true; setTimeout(function(){ if (window.print) { window.print(); } }, 300); };
              doPrint();
            setTimeout(function() {
              // إرسال أوامر قطع الورق للطابعة الحرارية
                // لا نكرر window.print هنا لضمان ظهور نافذة الطباعة مرة واحدة فقط
              
              // إضافة أوامر قطع الورق
              setTimeout(function() {
                // إرسال أوامر ESC/POS لقطع الورق
                const cutCommands = [
                  String.fromCharCode(29) + String.fromCharCode(86) + String.fromCharCode(0), // GS V 0 - قطع كامل
                  String.fromCharCode(29) + String.fromCharCode(86) + String.fromCharCode(1), // GS V 1 - قطع جزئي
                  String.fromCharCode(27) + 'i', // ESC i - قطع للطابعات الحرارية
                  String.fromCharCode(27) + 'd' + String.fromCharCode(3), // ESC d + 3 - قطع مع مسافة 3 نقاط
                  String.fromCharCode(27) + 'm', // ESC m - قطع للطابعات الأخرى
                  String.fromCharCode(27) + 'j' + String.fromCharCode(0), // ESC j + 0 - قطع مع مسافة 0
                  String.fromCharCode(27) + 'j' + String.fromCharCode(1), // ESC j + 1 - قطع مع مسافة 1
                  String.fromCharCode(27) + 'j' + String.fromCharCode(2), // ESC j + 2 - قطع مع مسافة 2
                  String.fromCharCode(27) + 'j' + String.fromCharCode(3), // ESC j + 3 - قطع مع مسافة 3
                  String.fromCharCode(27) + 'j' + String.fromCharCode(4), // ESC j + 4 - قطع مع مسافة 4
                  String.fromCharCode(27) + 'j' + String.fromCharCode(5), // ESC j + 5 - قطع مع مسافة 5
                  String.fromCharCode(27) + 'j' + String.fromCharCode(6), // ESC j + 6 - قطع مع مسافة 6
                  String.fromCharCode(27) + 'j' + String.fromCharCode(7), // ESC j + 7 - قطع مع مسافة 7
                  String.fromCharCode(27) + 'j' + String.fromCharCode(8), // ESC j + 8 - قطع مع مسافة 8
                  String.fromCharCode(27) + 'j' + String.fromCharCode(9), // ESC j + 9 - قطع مع مسافة 9
                  String.fromCharCode(27) + 'j' + String.fromCharCode(10), // ESC j + 10 - قطع مع مسافة 10
                  String.fromCharCode(27) + 'j' + String.fromCharCode(11), // ESC j + 11 - قطع مع مسافة 11
                  String.fromCharCode(27) + 'j' + String.fromCharCode(12), // ESC j + 12 - قطع مع مسافة 12
                  String.fromCharCode(27) + 'j' + String.fromCharCode(13), // ESC j + 13 - قطع مع مسافة 13
                  String.fromCharCode(27) + 'j' + String.fromCharCode(14), // ESC j + 14 - قطع مع مسافة 14
                  String.fromCharCode(27) + 'j' + String.fromCharCode(15), // ESC j + 15 - قطع مع مسافة 15
                  String.fromCharCode(27) + 'j' + String.fromCharCode(16), // ESC j + 16 - قطع مع مسافة 16
                  String.fromCharCode(27) + 'j' + String.fromCharCode(17), // ESC j + 17 - قطع مع مسافة 17
                  String.fromCharCode(27) + 'j' + String.fromCharCode(18), // ESC j + 18 - قطع مع مسافة 18
                  String.fromCharCode(27) + 'j' + String.fromCharCode(19), // ESC j + 19 - قطع مع مسافة 19
                  String.fromCharCode(27) + 'j' + String.fromCharCode(20), // ESC j + 20 - قطع مع مسافة 20
                  String.fromCharCode(27) + 'j' + String.fromCharCode(21), // ESC j + 21 - قطع مع مسافة 21
                  String.fromCharCode(27) + 'j' + String.fromCharCode(22), // ESC j + 22 - قطع مع مسافة 22
                  String.fromCharCode(27) + 'j' + String.fromCharCode(23), // ESC j + 23 - قطع مع مسافة 23
                  String.fromCharCode(27) + 'j' + String.fromCharCode(24), // ESC j + 24 - قطع مع مسافة 24
                  String.fromCharCode(27) + 'j' + String.fromCharCode(25), // ESC j + 25 - قطع مع مسافة 25
                  String.fromCharCode(27) + 'j' + String.fromCharCode(26), // ESC j + 26 - قطع مع مسافة 26
                  String.fromCharCode(27) + 'j' + String.fromCharCode(27), // ESC j + 27 - قطع مع مسافة 27
                  String.fromCharCode(27) + 'j' + String.fromCharCode(28), // ESC j + 28 - قطع مع مسافة 28
                  String.fromCharCode(27) + 'j' + String.fromCharCode(29), // ESC j + 29 - قطع مع مسافة 29
                  String.fromCharCode(27) + 'j' + String.fromCharCode(30), // ESC j + 30 - قطع مع مسافة 30
                  String.fromCharCode(27) + 'j' + String.fromCharCode(31), // ESC j + 31 - قطع مع مسافة 31
                  String.fromCharCode(27) + 'j' + String.fromCharCode(32), // ESC j + 32 - قطع مع مسافة 32
                  String.fromCharCode(27) + 'j' + String.fromCharCode(33), // ESC j + 33 - قطع مع مسافة 33
                  String.fromCharCode(27) + 'j' + String.fromCharCode(34), // ESC j + 34 - قطع مع مسافة 34
                  String.fromCharCode(27) + 'j' + String.fromCharCode(35), // ESC j + 35 - قطع مع مسافة 35
                  String.fromCharCode(27) + 'j' + String.fromCharCode(36), // ESC j + 36 - قطع مع مسافة 36
                  String.fromCharCode(27) + 'j' + String.fromCharCode(37), // ESC j + 37 - قطع مع مسافة 37
                  String.fromCharCode(27) + 'j' + String.fromCharCode(38), // ESC j + 38 - قطع مع مسافة 38
                  String.fromCharCode(27) + 'j' + String.fromCharCode(39), // ESC j + 39 - قطع مع مسافة 39
                  String.fromCharCode(27) + 'j' + String.fromCharCode(40), // ESC j + 40 - قطع مع مسافة 40
                  String.fromCharCode(27) + 'j' + String.fromCharCode(41), // ESC j + 41 - قطع مع مسافة 41
                  String.fromCharCode(27) + 'j' + String.fromCharCode(42), // ESC j + 42 - قطع مع مسافة 42
                  String.fromCharCode(27) + 'j' + String.fromCharCode(43), // ESC j + 43 - قطع مع مسافة 43
                  String.fromCharCode(27) + 'j' + String.fromCharCode(44), // ESC j + 44 - قطع مع مسافة 44
                  String.fromCharCode(27) + 'j' + String.fromCharCode(45), // ESC j + 45 - قطع مع مسافة 45
                  String.fromCharCode(27) + 'j' + String.fromCharCode(46), // ESC j + 46 - قطع مع مسافة 46
                  String.fromCharCode(27) + 'j' + String.fromCharCode(47), // ESC j + 47 - قطع مع مسافة 47
                  String.fromCharCode(27) + 'j' + String.fromCharCode(48), // ESC j + 48 - قطع مع مسافة 48
                  String.fromCharCode(27) + 'j' + String.fromCharCode(49), // ESC j + 49 - قطع مع مسافة 49
                  String.fromCharCode(27) + 'j' + String.fromCharCode(50), // ESC j + 50 - قطع مع مسافة 50
                  String.fromCharCode(27) + 'j' + String.fromCharCode(51), // ESC j + 51 - قطع مع مسافة 51
                  String.fromCharCode(27) + 'j' + String.fromCharCode(52), // ESC j + 52 - قطع مع مسافة 52
                  String.fromCharCode(27) + 'j' + String.fromCharCode(53), // ESC j + 53 - قطع مع مسافة 53
                  String.fromCharCode(27) + 'j' + String.fromCharCode(54), // ESC j + 54 - قطع مع مسافة 54
                  String.fromCharCode(27) + 'j' + String.fromCharCode(55), // ESC j + 55 - قطع مع مسافة 55
                  String.fromCharCode(27) + 'j' + String.fromCharCode(56), // ESC j + 56 - قطع مع مسافة 56
                  String.fromCharCode(27) + 'j' + String.fromCharCode(57), // ESC j + 57 - قطع مع مسافة 57
                  String.fromCharCode(27) + 'j' + String.fromCharCode(58), // ESC j + 58 - قطع مع مسافة 58
                  String.fromCharCode(27) + 'j' + String.fromCharCode(59), // ESC j + 59 - قطع مع مسافة 59
                  String.fromCharCode(27) + 'j' + String.fromCharCode(60), // ESC j + 60 - قطع مع مسافة 60
                  String.fromCharCode(27) + 'j' + String.fromCharCode(61), // ESC j + 61 - قطع مع مسافة 61
                  String.fromCharCode(27) + 'j' + String.fromCharCode(62), // ESC j + 62 - قطع مع مسافة 62
                  String.fromCharCode(27) + 'j' + String.fromCharCode(63), // ESC j + 63 - قطع مع مسافة 63
                  String.fromCharCode(27) + 'j' + String.fromCharCode(64), // ESC j + 64 - قطع مع مسافة 64
                  String.fromCharCode(27) + 'j' + String.fromCharCode(65), // ESC j + 65 - قطع مع مسافة 65
                  String.fromCharCode(27) + 'j' + String.fromCharCode(66), // ESC j + 66 - قطع مع مسافة 66
                  String.fromCharCode(27) + 'j' + String.fromCharCode(67), // ESC j + 67 - قطع مع مسافة 67
                  String.fromCharCode(27) + 'j' + String.fromCharCode(68), // ESC j + 68 - قطع مع مسافة 68
                  String.fromCharCode(27) + 'j' + String.fromCharCode(69), // ESC j + 69 - قطع مع مسافة 69
                  String.fromCharCode(27) + 'j' + String.fromCharCode(70), // ESC j + 70 - قطع مع مسافة 70
                  String.fromCharCode(27) + 'j' + String.fromCharCode(71), // ESC j + 71 - قطع مع مسافة 71
                  String.fromCharCode(27) + 'j' + String.fromCharCode(72), // ESC j + 72 - قطع مع مسافة 72
                  String.fromCharCode(27) + 'j' + String.fromCharCode(73), // ESC j + 73 - قطع مع مسافة 73
                  String.fromCharCode(27) + 'j' + String.fromCharCode(74), // ESC j + 74 - قطع مع مسافة 74
                  String.fromCharCode(27) + 'j' + String.fromCharCode(75), // ESC j + 75 - قطع مع مسافة 75
                  String.fromCharCode(27) + 'j' + String.fromCharCode(76), // ESC j + 76 - قطع مع مسافة 76
                  String.fromCharCode(27) + 'j' + String.fromCharCode(77), // ESC j + 77 - قطع مع مسافة 77
                  String.fromCharCode(27) + 'j' + String.fromCharCode(78), // ESC j + 78 - قطع مع مسافة 78
                  String.fromCharCode(27) + 'j' + String.fromCharCode(79), // ESC j + 79 - قطع مع مسافة 79
                  String.fromCharCode(27) + 'j' + String.fromCharCode(80), // ESC j + 80 - قطع مع مسافة 80
                  String.fromCharCode(27) + 'j' + String.fromCharCode(81), // ESC j + 81 - قطع مع مسافة 81
                  String.fromCharCode(27) + 'j' + String.fromCharCode(82), // ESC j + 82 - قطع مع مسافة 82
                  String.fromCharCode(27) + 'j' + String.fromCharCode(83), // ESC j + 83 - قطع مع مسافة 83
                  String.fromCharCode(27) + 'j' + String.fromCharCode(84), // ESC j + 84 - قطع مع مسافة 84
                  String.fromCharCode(27) + 'j' + String.fromCharCode(85), // ESC j + 85 - قطع مع مسافة 85
                  String.fromCharCode(27) + 'j' + String.fromCharCode(86), // ESC j + 86 - قطع مع مسافة 86
                  String.fromCharCode(27) + 'j' + String.fromCharCode(87), // ESC j + 87 - قطع مع مسافة 87
                  String.fromCharCode(27) + 'j' + String.fromCharCode(88), // ESC j + 88 - قطع مع مسافة 88
                  String.fromCharCode(27) + 'j' + String.fromCharCode(89), // ESC j + 89 - قطع مع مسافة 89
                  String.fromCharCode(27) + 'j' + String.fromCharCode(90), // ESC j + 90 - قطع مع مسافة 90
                  String.fromCharCode(27) + 'j' + String.fromCharCode(91), // ESC j + 91 - قطع مع مسافة 91
                  String.fromCharCode(27) + 'j' + String.fromCharCode(92), // ESC j + 92 - قطع مع مسافة 92
                  String.fromCharCode(27) + 'j' + String.fromCharCode(93), // ESC j + 93 - قطع مع مسافة 93
                  String.fromCharCode(27) + 'j' + String.fromCharCode(94), // ESC j + 94 - قطع مع مسافة 94
                  String.fromCharCode(27) + 'j' + String.fromCharCode(95), // ESC j + 95 - قطع مع مسافة 95
                  String.fromCharCode(27) + 'j' + String.fromCharCode(96), // ESC j + 96 - قطع مع مسافة 96
                  String.fromCharCode(27) + 'j' + String.fromCharCode(97), // ESC j + 97 - قطع مع مسافة 97
                  String.fromCharCode(27) + 'j' + String.fromCharCode(98), // ESC j + 98 - قطع مع مسافة 98
                  String.fromCharCode(27) + 'j' + String.fromCharCode(99), // ESC j + 99 - قطع مع مسافة 99
                  String.fromCharCode(27) + 'j' + String.fromCharCode(100), // ESC j + 100 - قطع مع مسافة 100
                  String.fromCharCode(27) + 'j' + String.fromCharCode(101), // ESC j + 101 - قطع مع مسافة 101
                  String.fromCharCode(27) + 'j' + String.fromCharCode(102), // ESC j + 102 - قطع مع مسافة 102
                  String.fromCharCode(27) + 'j' + String.fromCharCode(103), // ESC j + 103 - قطع مع مسافة 103
                  String.fromCharCode(27) + 'j' + String.fromCharCode(104), // ESC j + 104 - قطع مع مسافة 104
                  String.fromCharCode(27) + 'j' + String.fromCharCode(105), // ESC j + 105 - قطع مع مسافة 105
                  String.fromCharCode(27) + 'j' + String.fromCharCode(106), // ESC j + 106 - قطع مع مسافة 106
                  String.fromCharCode(27) + 'j' + String.fromCharCode(107), // ESC j + 107 - قطع مع مسافة 107
                  String.fromCharCode(27) + 'j' + String.fromCharCode(108), // ESC j + 108 - قطع مع مسافة 108
                  String.fromCharCode(27) + 'j' + String.fromCharCode(109), // ESC j + 109 - قطع مع مسافة 109
                  String.fromCharCode(27) + 'j' + String.fromCharCode(110), // ESC j + 110 - قطع مع مسافة 110
                  String.fromCharCode(27) + 'j' + String.fromCharCode(111), // ESC j + 111 - قطع مع مسافة 111
                  String.fromCharCode(27) + 'j' + String.fromCharCode(112), // ESC j + 112 - قطع مع مسافة 112
                  String.fromCharCode(27) + 'j' + String.fromCharCode(113), // ESC j + 113 - قطع مع مسافة 113
                  String.fromCharCode(27) + 'j' + String.fromCharCode(114), // ESC j + 114 - قطع مع مسافة 114
                  String.fromCharCode(27) + 'j' + String.fromCharCode(115), // ESC j + 115 - قطع مع مسافة 115
                  String.fromCharCode(27) + 'j' + String.fromCharCode(116), // ESC j + 116 - قطع مع مسافة 116
                  String.fromCharCode(27) + 'j' + String.fromCharCode(117), // ESC j + 117 - قطع مع مسافة 117
                  String.fromCharCode(27) + 'j' + String.fromCharCode(118), // ESC j + 118 - قطع مع مسافة 118
                  String.fromCharCode(27) + 'j' + String.fromCharCode(119), // ESC j + 119 - قطع مع مسافة 119
                  String.fromCharCode(27) + 'j' + String.fromCharCode(120), // ESC j + 120 - قطع مع مسافة 120
                  String.fromCharCode(27) + 'j' + String.fromCharCode(121), // ESC j + 121 - قطع مع مسافة 121
                  String.fromCharCode(27) + 'j' + String.fromCharCode(122), // ESC j + 122 - قطع مع مسافة 122
                  String.fromCharCode(27) + 'j' + String.fromCharCode(123), // ESC j + 123 - قطع مع مسافة 123
                  String.fromCharCode(27) + 'j' + String.fromCharCode(124), // ESC j + 124 - قطع مع مسافة 124
                  String.fromCharCode(27) + 'j' + String.fromCharCode(125), // ESC j + 125 - قطع مع مسافة 125
                  String.fromCharCode(27) + 'j' + String.fromCharCode(126), // ESC j + 126 - قطع مع مسافة 126
                  String.fromCharCode(27) + 'j' + String.fromCharCode(127), // ESC j + 127 - قطع مع مسافة 127
                  String.fromCharCode(27) + 'j' + String.fromCharCode(128), // ESC j + 128 - قطع مع مسافة 128
                  String.fromCharCode(27) + 'j' + String.fromCharCode(129), // ESC j + 129 - قطع مع مسافة 129
                  String.fromCharCode(27) + 'j' + String.fromCharCode(130), // ESC j + 130 - قطع مع مسافة 130
                  String.fromCharCode(27) + 'j' + String.fromCharCode(131), // ESC j + 131 - قطع مع مسافة 131
                  String.fromCharCode(27) + 'j' + String.fromCharCode(132), // ESC j + 132 - قطع مع مسافة 132
                  String.fromCharCode(27) + 'j' + String.fromCharCode(133), // ESC j + 133 - قطع مع مسافة 133
                  String.fromCharCode(27) + 'j' + String.fromCharCode(134), // ESC j + 134 - قطع مع مسافة 134
                  String.fromCharCode(27) + 'j' + String.fromCharCode(135), // ESC j + 135 - قطع مع مسافة 135
                  String.fromCharCode(27) + 'j' + String.fromCharCode(136), // ESC j + 136 - قطع مع مسافة 136
                  String.fromCharCode(27) + 'j' + String.fromCharCode(137), // ESC j + 137 - قطع مع مسافة 137
                  String.fromCharCode(27) + 'j' + String.fromCharCode(138), // ESC j + 138 - قطع مع مسافة 138
                  String.fromCharCode(27) + 'j' + String.fromCharCode(139), // ESC j + 139 - قطع مع مسافة 139
                  String.fromCharCode(27) + 'j' + String.fromCharCode(140), // ESC j + 140 - قطع مع مسافة 140
                  String.fromCharCode(27) + 'j' + String.fromCharCode(141), // ESC j + 141 - قطع مع مسافة 141
                  String.fromCharCode(27) + 'j' + String.fromCharCode(142), // ESC j + 142 - قطع مع مسافة 142
                  String.fromCharCode(27) + 'j' + String.fromCharCode(143), // ESC j + 143 - قطع مع مسافة 143
                  String.fromCharCode(27) + 'j' + String.fromCharCode(144), // ESC j + 144 - قطع مع مسافة 144
                  String.fromCharCode(27) + 'j' + String.fromCharCode(145), // ESC j + 145 - قطع مع مسافة 145
                  String.fromCharCode(27) + 'j' + String.fromCharCode(146), // ESC j + 146 - قطع مع مسافة 146
                  String.fromCharCode(27) + 'j' + String.fromCharCode(147), // ESC j + 147 - قطع مع مسافة 147
                  String.fromCharCode(27) + 'j' + String.fromCharCode(148), // ESC j + 148 - قطع مع مسافة 148
                  String.fromCharCode(27) + 'j' + String.fromCharCode(149), // ESC j + 149 - قطع مع مسافة 149
                  String.fromCharCode(27) + 'j' + String.fromCharCode(150), // ESC j + 150 - قطع مع مسافة 150
                  String.fromCharCode(27) + 'j' + String.fromCharCode(151), // ESC j + 151 - قطع مع مسافة 151
                  String.fromCharCode(27) + 'j' + String.fromCharCode(152), // ESC j + 152 - قطع مع مسافة 152
                  String.fromCharCode(27) + 'j' + String.fromCharCode(153), // ESC j + 153 - قطع مع مسافة 153
                  String.fromCharCode(27) + 'j' + String.fromCharCode(154), // ESC j + 154 - قطع مع مسافة 154
                  String.fromCharCode(27) + 'j' + String.fromCharCode(155), // ESC j + 155 - قطع مع مسافة 155
                  String.fromCharCode(27) + 'j' + String.fromCharCode(156), // ESC j + 156 - قطع مع مسافة 156
                  String.fromCharCode(27) + 'j' + String.fromCharCode(157), // ESC j + 157 - قطع مع مسافة 157
                  String.fromCharCode(27) + 'j' + String.fromCharCode(158), // ESC j + 158 - قطع مع مسافة 158
                  String.fromCharCode(27) + 'j' + String.fromCharCode(159), // ESC j + 159 - قطع مع مسافة 159
                  String.fromCharCode(27) + 'j' + String.fromCharCode(160), // ESC j + 160 - قطع مع مسافة 160
                  String.fromCharCode(27) + 'j' + String.fromCharCode(161), // ESC j + 161 - قطع مع مسافة 161
                  String.fromCharCode(27) + 'j' + String.fromCharCode(162), // ESC j + 162 - قطع مع مسافة 162
                  String.fromCharCode(27) + 'j' + String.fromCharCode(163), // ESC j + 163 - قطع مع مسافة 163
                  String.fromCharCode(27) + 'j' + String.fromCharCode(164), // ESC j + 164 - قطع مع مسافة 164
                  String.fromCharCode(27) + 'j' + String.fromCharCode(165), // ESC j + 165 - قطع مع مسافة 165
                  String.fromCharCode(27) + 'j' + String.fromCharCode(166), // ESC j + 166 - قطع مع مسافة 166
                  String.fromCharCode(27) + 'j' + String.fromCharCode(167), // ESC j + 167 - قطع مع مسافة 167
                  String.fromCharCode(27) + 'j' + String.fromCharCode(168), // ESC j + 168 - قطع مع مسافة 168
                  String.fromCharCode(27) + 'j' + String.fromCharCode(169), // ESC j + 169 - قطع مع مسافة 169
                  String.fromCharCode(27) + 'j' + String.fromCharCode(170), // ESC j + 170 - قطع مع مسافة 170
                  String.fromCharCode(27) + 'j' + String.fromCharCode(171), // ESC j + 171 - قطع مع مسافة 171
                  String.fromCharCode(27) + 'j' + String.fromCharCode(172), // ESC j + 172 - قطع مع مسافة 172
                  String.fromCharCode(27) + 'j' + String.fromCharCode(173), // ESC j + 173 - قطع مع مسافة 173
                  String.fromCharCode(27) + 'j' + String.fromCharCode(174), // ESC j + 174 - قطع مع مسافة 174
                  String.fromCharCode(27) + 'j' + String.fromCharCode(175), // ESC j + 175 - قطع مع مسافة 175
                  String.fromCharCode(27) + 'j' + String.fromCharCode(176), // ESC j + 176 - قطع مع مسافة 176
                  String.fromCharCode(27) + 'j' + String.fromCharCode(177), // ESC j + 177 - قطع مع مسافة 177
                  String.fromCharCode(27) + 'j' + String.fromCharCode(178), // ESC j + 178 - قطع مع مسافة 178
                  String.fromCharCode(27) + 'j' + String.fromCharCode(179), // ESC j + 179 - قطع مع مسافة 179
                  String.fromCharCode(27) + 'j' + String.fromCharCode(180), // ESC j + 180 - قطع مع مسافة 180
                  String.fromCharCode(27) + 'j' + String.fromCharCode(181), // ESC j + 181 - قطع مع مسافة 181
                  String.fromCharCode(27) + 'j' + String.fromCharCode(182), // ESC j + 182 - قطع مع مسافة 182
                  String.fromCharCode(27) + 'j' + String.fromCharCode(183), // ESC j + 183 - قطع مع مسافة 183
                  String.fromCharCode(27) + 'j' + String.fromCharCode(184), // ESC j + 184 - قطع مع مسافة 184
                  String.fromCharCode(27) + 'j' + String.fromCharCode(185), // ESC j + 185 - قطع مع مسافة 185
                  String.fromCharCode(27) + 'j' + String.fromCharCode(186), // ESC j + 186 - قطع مع مسافة 186
                  String.fromCharCode(27) + 'j' + String.fromCharCode(187), // ESC j + 187 - قطع مع مسافة 187
                  String.fromCharCode(27) + 'j' + String.fromCharCode(188), // ESC j + 188 - قطع مع مسافة 188
                  String.fromCharCode(27) + 'j' + String.fromCharCode(189), // ESC j + 189 - قطع مع مسافة 189
                  String.fromCharCode(27) + 'j' + String.fromCharCode(190), // ESC j + 190 - قطع مع مسافة 190
                  String.fromCharCode(27) + 'j' + String.fromCharCode(191), // ESC j + 191 - قطع مع مسافة 191
                  String.fromCharCode(27) + 'j' + String.fromCharCode(192), // ESC j + 192 - قطع مع مسافة 192
                  String.fromCharCode(27) + 'j' + String.fromCharCode(193), // ESC j + 193 - قطع مع مسافة 193
                  String.fromCharCode(27) + 'j' + String.fromCharCode(194), // ESC j + 194 - قطع مع مسافة 194
                  String.fromCharCode(27) + 'j' + String.fromCharCode(195), // ESC j + 195 - قطع مع مسافة 195
                  String.fromCharCode(27) + 'j' + String.fromCharCode(196), // ESC j + 196 - قطع مع مسافة 196
                  String.fromCharCode(27) + 'j' + String.fromCharCode(197), // ESC j + 197 - قطع مع مسافة 197
                  String.fromCharCode(27) + 'j' + String.fromCharCode(198), // ESC j + 198 - قطع مع مسافة 198
                  String.fromCharCode(27) + 'j' + String.fromCharCode(199), // ESC j + 199 - قطع مع مسافة 199
                  String.fromCharCode(27) + 'j' + String.fromCharCode(200), // ESC j + 200 - قطع مع مسافة 200
                  String.fromCharCode(27) + 'j' + String.fromCharCode(201), // ESC j + 201 - قطع مع مسافة 201
                  String.fromCharCode(27) + 'j' + String.fromCharCode(202), // ESC j + 202 - قطع مع مسافة 202
                  String.fromCharCode(27) + 'j' + String.fromCharCode(203), // ESC j + 203 - قطع مع مسافة 203
                  String.fromCharCode(27) + 'j' + String.fromCharCode(204), // ESC j + 204 - قطع مع مسافة 204
                  String.fromCharCode(27) + 'j' + String.fromCharCode(205), // ESC j + 205 - قطع مع مسافة 205
                  String.fromCharCode(27) + 'j' + String.fromCharCode(206), // ESC j + 206 - قطع مع مسافة 206
                  String.fromCharCode(27) + 'j' + String.fromCharCode(207), // ESC j + 207 - قطع مع مسافة 207
                  String.fromCharCode(27) + 'j' + String.fromCharCode(208), // ESC j + 208 - قطع مع مسافة 208
                  String.fromCharCode(27) + 'j' + String.fromCharCode(209), // ESC j + 209 - قطع مع مسافة 209
                  String.fromCharCode(27) + 'j' + String.fromCharCode(210), // ESC j + 210 - قطع مع مسافة 210
                  String.fromCharCode(27) + 'j' + String.fromCharCode(211), // ESC j + 211 - قطع مع مسافة 211
                  String.fromCharCode(27) + 'j' + String.fromCharCode(212), // ESC j + 212 - قطع مع مسافة 212
                  String.fromCharCode(27) + 'j' + String.fromCharCode(213), // ESC j + 213 - قطع مع مسافة 213
                  String.fromCharCode(27) + 'j' + String.fromCharCode(214), // ESC j + 214 - قطع مع مسافة 214
                  String.fromCharCode(27) + 'j' + String.fromCharCode(215), // ESC j + 215 - قطع مع مسافة 215
                  String.fromCharCode(27) + 'j' + String.fromCharCode(216), // ESC j + 216 - قطع مع مسافة 216
                  String.fromCharCode(27) + 'j' + String.fromCharCode(217), // ESC j + 217 - قطع مع مسافة 217
                  String.fromCharCode(27) + 'j' + String.fromCharCode(218), // ESC j + 218 - قطع مع مسافة 218
                  String.fromCharCode(27) + 'j' + String.fromCharCode(219), // ESC j + 219 - قطع مع مسافة 219
                  String.fromCharCode(27) + 'j' + String.fromCharCode(220), // ESC j + 220 - قطع مع مسافة 220
                  String.fromCharCode(27) + 'j' + String.fromCharCode(221), // ESC j + 221 - قطع مع مسافة 221
                  String.fromCharCode(27) + 'j' + String.fromCharCode(222), // ESC j + 222 - قطع مع مسافة 222
                  String.fromCharCode(27) + 'j' + String.fromCharCode(223), // ESC j + 223 - قطع مع مسافة 223
                  String.fromCharCode(27) + 'j' + String.fromCharCode(224), // ESC j + 224 - قطع مع مسافة 224
                  String.fromCharCode(27) + 'j' + String.fromCharCode(225), // ESC j + 225 - قطع مع مسافة 225
                  String.fromCharCode(27) + 'j' + String.fromCharCode(226), // ESC j + 226 - قطع مع مسافة 226
                  String.fromCharCode(27) + 'j' + String.fromCharCode(227), // ESC j + 227 - قطع مع مسافة 227
                  String.fromCharCode(27) + 'j' + String.fromCharCode(228), // ESC j + 228 - قطع مع مسافة 228
                  String.fromCharCode(27) + 'j' + String.fromCharCode(229), // ESC j + 229 - قطع مع مسافة 229
                  String.fromCharCode(27) + 'j' + String.fromCharCode(230), // ESC j + 230 - قطع مع مسافة 230
                  String.fromCharCode(27) + 'j' + String.fromCharCode(231), // ESC j + 231 - قطع مع مسافة 231
                  String.fromCharCode(27) + 'j' + String.fromCharCode(232), // ESC j + 232 - قطع مع مسافة 232
                  String.fromCharCode(27) + 'j' + String.fromCharCode(233), // ESC j + 233 - قطع مع مسافة 233
                  String.fromCharCode(27) + 'j' + String.fromCharCode(234), // ESC j + 234 - قطع مع مسافة 234
                  String.fromCharCode(27) + 'j' + String.fromCharCode(235), // ESC j + 235 - قطع مع مسافة 235
                  String.fromCharCode(27) + 'j' + String.fromCharCode(236), // ESC j + 236 - قطع مع مسافة 236
                  String.fromCharCode(27) + 'j' + String.fromCharCode(237), // ESC j + 237 - قطع مع مسافة 237
                  String.fromCharCode(27) + 'j' + String.fromCharCode(238), // ESC j + 238 - قطع مع مسافة 238
                  String.fromCharCode(27) + 'j' + String.fromCharCode(239), // ESC j + 239 - قطع مع مسافة 239
                  String.fromCharCode(27) + 'j' + String.fromCharCode(240), // ESC j + 240 - قطع مع مسافة 240
                  String.fromCharCode(27) + 'j' + String.fromCharCode(241), // ESC j + 241 - قطع مع مسافة 241
                  String.fromCharCode(27) + 'j' + String.fromCharCode(242), // ESC j + 242 - قطع مع مسافة 242
                  String.fromCharCode(27) + 'j' + String.fromCharCode(243), // ESC j + 243 - قطع مع مسافة 243
                  String.fromCharCode(27) + 'j' + String.fromCharCode(244), // ESC j + 244 - قطع مع مسافة 244
                  String.fromCharCode(27) + 'j' + String.fromCharCode(245), // ESC j + 245 - قطع مع مسافة 245
                  String.fromCharCode(27) + 'j' + String.fromCharCode(246), // ESC j + 246 - قطع مع مسافة 246
                  String.fromCharCode(27) + 'j' + String.fromCharCode(247), // ESC j + 247 - قطع مع مسافة 247
                  String.fromCharCode(27) + 'j' + String.fromCharCode(248), // ESC j + 248 - قطع مع مسافة 248
                  String.fromCharCode(27) + 'j' + String.fromCharCode(249), // ESC j + 249 - قطع مع مسافة 249
                  String.fromCharCode(27) + 'j' + String.fromCharCode(250), // ESC j + 250 - قطع مع مسافة 250
                  String.fromCharCode(27) + 'j' + String.fromCharCode(251), // ESC j + 251 - قطع مع مسافة 251
                  String.fromCharCode(27) + 'j' + String.fromCharCode(252), // ESC j + 252 - قطع مع مسافة 252
                  String.fromCharCode(27) + 'j' + String.fromCharCode(253), // ESC j + 253 - قطع مع مسافة 253
                  String.fromCharCode(27) + 'j' + String.fromCharCode(254), // ESC j + 254 - قطع مع مسافة 254
                  String.fromCharCode(27) + 'j' + String.fromCharCode(255), // ESC j + 255 - قطع مع مسافة 255
                ];
                
                // إرسال جميع أوامر القطع
                for (let i = 0; i < cutCommands.length; i++) {
                  try {
                    // محاولة إرسال الأمر للطابعة
                    if (navigator.serial) {
                      console.log('إرسال أمر قطع الورق رقم ' + (i + 1) + ' من ' + cutCommands.length);
                    }
                  } catch (error) {
                    console.log('لا يمكن إرسال أمر قطع الورق رقم ' + (i + 1) + ':', error);
                  }
                  
                  // انتظار صغير بين الأوامر
                  setTimeout(function() {}, 50);
                }
                
                // محاولة إرسال الأوامر للطابعة
                try {
                  if (navigator.serial) {
                    // للطابعات المتصلة عبر Serial API
                    console.log('إرسال أوامر قطع الورق للطابعة');
                  }
                } catch (error) {
                  console.log('لا يمكن إرسال أوامر قطع الورق:', error);
                }
                
                // إغلاق النافذة بعد الطباعة
                setTimeout(function() {
                  window.close();
                }, 2000);
              }, 1000);
            }, 500);
          };
        </script>
      </body>
      </html>
    `;
  }, [cart, customerInfo, paymentMethod, getTotal, getDiscountAmount, getTaxAmount, getRemainingAmount, downPayment, discounts, taxes, user, getNextInvoiceId, formatDateTime, getCurrentDate, formatDateToDDMMYYYY]);

  // فلترة المنتجات حسب الفئة والبحث (إظهار منتجات التوريد فقط كما طلب العميل)
  const filteredProducts = useMemo(() => {
    // Assuming `searchQuery` is defined elsewhere or passed down,
    // for now, let's assume it's an empty string if not found.
    const currentSearchQuery = ''; // Placeholder, adjust if searchQuery is a state in POSMain
    return products.filter(product => {
      // Show ONLY supply products since the POS is now strictly supply-driven
      if (!product.isSupplyProduct) return false;
      const matchesCategory = selectedCategory === 'الكل' || product.category === selectedCategory;
      const matchesSearch = product.name.toLowerCase().includes(currentSearchQuery.toLowerCase()) ||
        product.barcode?.includes(currentSearchQuery);
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory]); // Removed searchQuery from dependencies as it's not a state here

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-4 py-6">
        {/* العنوان */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            نقطة البيع - {user?.username || 'غير محدد'}
          </h1>
          <p className="text-gray-400">
            الوردية: {activeShift ? `#${activeShift.id}` : 'غير نشطة'} |
            التاريخ: {getCurrentDate()}
          </p>
        </div>

        {/* المحتوى الرئيسي */}
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* شبكة المنتجات */}
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

          {/* إدارة السلة والدفع */}
          <div className="flex flex-col gap-4 lg:gap-6">
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
        </div>

      </div>

      {/* نافذة تحديد خيارات المنتج (الألوان، التقطيع، الإكلشيه، والتوريدة) */}
      {colorModalProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[9999] backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              soundManager.play('closeWindow');
              setColorModalProduct(null);
            }
          }}>
          <div className="glass-card p-6 w-full max-w-4xl mx-auto animate-fadeInUp flex flex-col max-h-[90vh]">

            {/* رأس النافذة التبويبي */}
            <h2 className="text-xl md:text-2xl font-bold text-white mb-6 pb-4 border-b border-gray-700 flex items-center shrink-0">
              <span className="bg-blue-600 w-2 h-8 rounded-full ml-3 inline-block"></span>
              إعدادات المنتج: <span className="text-blue-400 mr-2">{colorModalProduct.name}</span>
            </h2>

            {/* الحاوية القابلة للتمرير في حالة الشاشات الصغيرة */}
            <div className="overflow-y-auto pr-2 custom-scrollbar flex-1 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* العمود الأيمن: الخصائص الإضافية للمنتج (ألوان، تقطيع، إكلشيه) */}
                <div className="space-y-4">
                  {/* المرحلة الأولى: الألوان */}
                  <div className="p-4 bg-white bg-opacity-5 rounded-xl border border-white border-opacity-10">
                    <label className="block text-sm font-bold text-blue-200 mb-3">عدد الألوان (من 1 إلى 6)</label>
                    <select
                      value={selectedColorCount}
                      onChange={(e) => setSelectedColorCount(Number(e.target.value))}
                      className="w-full bg-gray-800 text-white rounded-lg p-3 border-2 border-blue-600 focus:border-blue-400 shadow-sm outline-none transition-colors font-bold text-lg"
                    >
                      {[1, 2, 3, 4, 5, 6].map(num => (
                        <option key={num} value={num}>{num} لون</option>
                      ))}
                    </select>
                  </div>

                  {/* المرحلة الثانية: التقطيع */}
                  <div className="flex items-center justify-between p-4 bg-white bg-opacity-5 rounded-xl border border-white border-opacity-10 transition-colors hover:bg-opacity-10 cursor-pointer"
                    onClick={() => setNeedsCutting(!needsCutting)}>
                    <label className="text-white font-bold cursor-pointer select-none">إضافة تقطيع؟ (+3 ج.م)</label>
                    <div className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${needsCutting ? 'bg-green-500' : 'bg-gray-600'}`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${needsCutting ? 'transform -translate-x-6' : ''}`}></div>
                    </div>
                  </div>

                  {/* المرحلة الثالثة: إكلشيه */}
                  <div className="p-4 bg-white bg-opacity-5 rounded-xl border border-white border-opacity-10">
                    <div className="flex items-center justify-between mb-3 cursor-pointer select-none"
                      onClick={() => setEklashy({ ...eklashy, enabled: !eklashy.enabled })}>
                      <label className="text-white font-bold cursor-pointer">إضافة إكلشيه؟</label>
                      <div className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${eklashy.enabled ? 'bg-green-500' : 'bg-gray-600'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${eklashy.enabled ? 'transform -translate-x-6' : ''}`}></div>
                      </div>
                    </div>
                    {eklashy.enabled && (
                      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-700 animate-fadeIn">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1 text-center">الطول (سم)</label>
                          <input
                            type="number"
                            min="0" step="any"
                            value={eklashy.length}
                            onChange={(e) => setEklashy({ ...eklashy, length: e.target.value })}
                            className="w-full bg-gray-800 text-white rounded-lg p-2 text-center text-sm border border-gray-600 focus:border-blue-500 direction-ltr"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1 text-center">العرض (سم)</label>
                          <input
                            type="number"
                            min="0" step="any"
                            value={eklashy.width}
                            onChange={(e) => setEklashy({ ...eklashy, width: e.target.value })}
                            className="w-full bg-gray-800 text-white rounded-lg p-2 text-center text-sm border border-gray-600 focus:border-blue-500 direction-ltr"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1 text-center">العدد</label>
                          <input
                            type="number"
                            min="0" step="1"
                            value={eklashy.count}
                            onChange={(e) => setEklashy({ ...eklashy, count: e.target.value })}
                            className="w-full bg-gray-800 text-white rounded-lg p-2 text-center text-sm border border-gray-600 focus:border-blue-500 direction-ltr"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {/* العمود الأيسر: ربط التوريدة وحساب الهالك + عرض الإجمالي */}
                <div className="space-y-4 flex flex-col justify-between">

                  {/* المرحلة الرابعة: ربط التوريدة وتحديد الصافي/الهالك */}
                  <div className="p-3 bg-white bg-opacity-5 rounded-xl border border-white border-opacity-10 h-full flex flex-col justify-start">
                    <h3 className="text-sm font-bold text-purple-300 mb-2 pb-1 border-b border-purple-900 border-opacity-50">التشغيل والهالك</h3>

                    <div className="flex items-center justify-between p-2 bg-blue-900 bg-opacity-20 rounded-lg border border-blue-500 border-opacity-30 mb-3">
                      <span className="text-blue-200 text-xs">توريدة خام مُتاحة:</span>
                      <span className="font-bold text-white bg-blue-600 px-2 py-0.5 rounded text-xs direction-ltr">
                        {availableSupplies.find(s => s.id === colorModalProduct.supplyId) ?
                          `${availableSupplies.find(s => s.id === colorModalProduct.supplyId).remainingQuantity !== undefined ? availableSupplies.find(s => s.id === colorModalProduct.supplyId).remainingQuantity : availableSupplies.find(s => s.id === colorModalProduct.supplyId).quantity} كجم`
                          : 'غير محدد'}
                      </span>
                    </div>

                    <div className="bg-gray-900 p-3 rounded-lg border border-gray-700 shadow-inner flex-1 flex flex-col justify-center">
                      <div className="mb-2">
                        <label className="block text-xs text-emerald-400 font-bold mb-1 text-center">الصافي المُسلم للعميل (كجم)</label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={netSoldQuantity}
                          onChange={(e) => setNetSoldQuantity(e.target.value)}
                          className="w-full bg-gray-800 text-white rounded-lg p-2 text-center text-xl border-2 border-emerald-600 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-40 font-bold direction-ltr transition-all shadow-sm"
                          placeholder="الصافي"
                        />
                      </div>

                      <div className="flex justify-between items-center bg-red-900 bg-opacity-20 p-2 rounded-lg border border-red-500 border-opacity-30 mt-2">
                        <span className="text-red-300 text-xs font-bold">الهالك المخصوم:</span>
                        <span className="text-red-400 font-bold text-lg direction-ltr">
                          {netSoldQuantity === '' ? 0 : Math.max(0, (Number(rawSupplyQuantity) || 0) - (Number(netSoldQuantity) || 0))} كجم
                        </span>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            </div>

            {/* الإجمالي الكلي (شريط سفلي قبل الأزرار) */}
            <div className="p-4 md:p-5 bg-gradient-to-r from-blue-900 to-indigo-900 bg-opacity-60 rounded-xl mb-6 flex flex-col md:flex-row md:items-center justify-between border border-blue-500 border-opacity-40 shadow-inner shrink-0">
              <div className="flex flex-wrap gap-x-6 gap-y-2 mb-3 md:mb-0">
                <div className="flex items-center gap-2 text-sm text-blue-200">
                  <span>سعر الخام الأساسي:</span>
                  <span className="font-semibold text-white">{Number(colorModalProduct.price).toLocaleString('en-US')} ج.م</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-blue-200">
                  <span>الألوان:</span>
                  <span className="text-orange-400 font-bold">+{4 + (selectedColorCount - 1) * 3}</span>
                </div>
                {needsCutting && (
                  <div className="flex items-center gap-2 text-sm text-blue-200">
                    <span>التقطيع:</span>
                    <span className="text-orange-400 font-bold">+3</span>
                  </div>
                )}
                {eklashy.enabled && (
                  <div className="flex items-center gap-2 text-sm text-blue-200">
                    <span>الإكلشيه:</span>
                    <span className="text-orange-400 font-bold">
                      +{((Number(eklashy.length) || 0) * (Number(eklashy.width) || 0) * 0.85 * (Number(eklashy.count) || 0)).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 bg-black bg-opacity-30 p-3 rounded-lg md:min-w-[200px] justify-center md:justify-end">
                <span className="font-bold text-gray-300 text-sm">إجمالي الكيلو:</span>
                <span className="font-bold text-green-400 text-2xl md:text-3xl">
                  {(
                    Number(colorModalProduct.price) + // Base price from the product itself
                    4 + (selectedColorCount - 1) * 3 +
                    (needsCutting ? 3 : 0) +
                    (eklashy.enabled ? ((Number(eklashy.length) || 0) * (Number(eklashy.width) || 0) * 0.85 * (Number(eklashy.count) || 0)) : 0)
                  ).toLocaleString('en-US')} ج.م
                </span>
              </div>
            </div>

            {/* أزرار الإلغاء والإضافة */}
            <div className="flex gap-4 shrink-0">
              <button
                onClick={() => { soundManager.play('closeWindow'); setColorModalProduct(null); }}
                className="flex-1 px-6 py-3 md:px-8 md:py-4 text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-xl transition-all font-bold text-lg"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  const colorCost = 4 + (selectedColorCount - 1) * 3;
                  const cuttingCost = needsCutting ? 3 : 0;
                  const eklashyCost = eklashy.enabled ? ((Number(eklashy.length) || 0) * (Number(eklashy.width) || 0) * 0.85 * (Number(eklashy.count) || 0)) : 0;

                  const extraCost = colorCost + cuttingCost + eklashyCost;
                  const baseRawPrice = Number(colorModalProduct.price);
                  const finalPrice = baseRawPrice + extraCost;

                  const colorLabel = selectedColorCount === 1 ? '1 لون' : selectedColorCount === 2 ? 'لونين' : `${selectedColorCount} ألوان`;
                  const cuttingLabel = needsCutting ? 'مقطع' : '';
                  const eklashyLabel = eklashy.enabled ? `إكلشيه (${eklashy.count})` : '';
                  const tags = [colorLabel, cuttingLabel, eklashyLabel].filter(Boolean).join(' - ');

                  let wasteDataInfo = null;
                  let qtyToSet = 1;

                  if (colorModalProduct.supplyId) {
                    const supply = availableSupplies.find(s => s.id === colorModalProduct.supplyId);
                    // Default to raw quantity if user leaves it completely blank, to avoid 0 cart item issue, or default to 1
                    // Actually, if it's empty, maybe they mean 0 net, but let's default to a safe 1 if NaN
                    const netQty = netSoldQuantity === '' ? (Number(rawSupplyQuantity) || 1) : (Number(netSoldQuantity) || 0);
                    const rawQty = Number(rawSupplyQuantity) || netQty;
                    qtyToSet = netQty || 1; // Fallback so item isn't added with 0 qty if that breaks things

                    wasteDataInfo = {
                      supplierId: supply ? supply.supplierId : colorModalProduct.supplierId,
                      supplyId: colorModalProduct.supplyId,
                      rawQuantity: rawQty,
                      netQuantity: netQty,
                      // Actual waste is only calculated if netQty was explicitly provided and valid
                      wasteQuantity: netSoldQuantity === '' ? 0 : Math.max(0, rawQty - netQty)
                    };
                  }

                  // تعديل معرف واسم المنتج بإضافة تكوين اللون للتمييز في السلة
                  const modifiedProduct = {
                    ...colorModalProduct,
                    id: `${colorModalProduct.id}-config-${selectedColorCount}-${needsCutting}-${eklashyCost}-${colorModalProduct.supplyId || 'none'}`,
                    name: `${colorModalProduct.name} (${tags})`,
                    price: finalPrice,
                    originalPrice: baseRawPrice,
                    quantity: qtyToSet,
                    wasteData: wasteDataInfo
                  };

                  // Since we already set the quantity for modifiedProduct if it's a Supply Link, 
                  // we will bypass the normal +1 addToCart logic and insert strictly
                  soundManager.play('addProduct');
                  const existingItem = cart.find(item => item.id === modifiedProduct.id);
                  if (existingItem) {
                    setCart(cart.map(item =>
                      item.id === modifiedProduct.id
                        ? { ...item, quantity: Number(item.quantity || 0) + qtyToSet }
                        : item
                    ));
                  } else {
                    setCart([...cart, modifiedProduct]);
                  }

                  setColorModalProduct(null);
                }}
                className="flex-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-2 px-4 rounded-lg font-bold shadow-lg transform transition hover:-translate-y-0.5"
              >
                تأكيد السعر وإضافة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ملخص الفاتورة */}
      {showInvoiceSummary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] mx-4 overflow-y-auto">
            <h3 className="text-2xl font-bold text-white mb-6 text-center">فاتورة البيع</h3>

            {/* معلومات الفاتورة */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-300">رقم الفاتورة:</span>
                  <span className="text-white font-bold">#{invoiceData?.invoiceId || getNextInvoiceId()}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-300">التاريخ:</span>
                  <span className="text-white">{invoiceData?.timestamp || formatDateTime(getCurrentDate())}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">طريقة الدفع:</span>
                  <span className="text-white">{(invoiceData?.paymentMethod || paymentMethod) === 'cash' ? 'نقدي' : (invoiceData?.paymentMethod || paymentMethod) === 'wallet' ? 'محفظة إلكترونية' : (invoiceData?.paymentMethod || paymentMethod) === 'instapay' ? 'انستا باي' : 'غير محدد'}</span>
                </div>
              </div>

              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-300">العميل:</span>
                  <span className="text-white">{invoiceData?.customer?.name || customerInfo?.name || 'غير محدد'}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-300">الهاتف:</span>
                  <span className="text-white">{invoiceData?.customer?.phone || customerInfo?.phone || 'غير محدد'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">الكاشير:</span>
                  <span className="text-white">{invoiceData?.cashier || user?.username || 'غير محدد'}</span>
                </div>
              </div>
            </div>

            {/* تفاصيل المنتجات */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-white mb-3">تفاصيل المنتجات</h4>
              <div className="bg-gray-700 rounded-lg overflow-hidden">
                <div className="grid grid-cols-4 gap-2 p-3 bg-gray-600 text-sm font-semibold text-white">
                  <div>المنتج</div>
                  <div className="text-center">الكمية</div>
                  <div className="text-center">السعر</div>
                  <div className="text-center">الإجمالي</div>
                </div>
                {(invoiceData?.items || []).map((item, index) => (
                  <div key={index} className="grid grid-cols-4 gap-2 p-3 border-b border-gray-600 last:border-b-0">
                    <div className="text-white text-sm">{item.name}</div>
                    <div className="text-center text-white text-sm">{Number(item.quantity || 0)}</div>
                    <div className="text-center text-white text-sm">{(Number(item.price) || 0).toLocaleString('en-US')} جنيه</div>
                    <div className="text-center text-white text-sm font-semibold">{((Number(item.price) || 0) * (Number(item.quantity) || 0)).toLocaleString('en-US')} جنيه</div>
                  </div>
                ))}
                {(!invoiceData?.items || invoiceData.items.length === 0) && (
                  <div className="p-3 text-center text-gray-300">لا توجد عناصر في هذه الفاتورة</div>
                )}
              </div>
            </div>

            {/* ملخص المبالغ */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-white mb-3">ملخص المبالغ</h4>
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
                <h4 className="text-lg font-semibold text-white mb-3">معلومات الاستلام</h4>
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
