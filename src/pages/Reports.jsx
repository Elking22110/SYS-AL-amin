import { publish, EVENTS } from '../utils/observerManager';
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ProductGrid from '../components/POS/ProductGrid';
import { useNotifications } from '../components/NotificationSystem';
import soundManager from '../utils/soundManager.js';
import emojiManager from '../utils/emojiManager.js';
import storageOptimizer from '../utils/storageOptimizer.js';
import { formatDate, formatTimeOnly, formatDateTime, formatDateOnly, getCurrentDate, formatDateToDDMMYYYY } from '../utils/dateUtils.js';
import safeMath from '../utils/safeMath.js';
import { useAuth } from '../components/AuthProvider';
import databaseManager from '../utils/database';
import {
  Calendar,
  Download,
  Filter,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Eye,
  Trash2,
  Printer,
  X,
  Receipt,
  Banknote,
  CheckCircle,
  Smartphone,
  Plus,
  Search
} from 'lucide-react';

// دالة لتصحيح الكسور العكسية وفصل المقاسات لعرضها في الأسفل تماماً
const renderProductTitleAndSize = (name) => {
  if (!name) return null;

  let cleanName = name;
  cleanName = cleanName.replace(/\b2\/1\b/g, '1/2');
  cleanName = cleanName.replace(/\b4\/3\b/g, '3/4');
  cleanName = cleanName.replace(/\b8\/1\b/g, '1/8');
  cleanName = cleanName.replace(/\b8\/3\b/g, '3/8');
  cleanName = cleanName.replace(/\b8\/5\b/g, '5/8');
  cleanName = cleanName.replace(/\b4\/1\b/g, '1/4');

  const regex = /([0-9\/\.\-*+xX×"”']+)/g;
  const matches = cleanName.match(regex) || [];
  const sizes = matches.filter(m => /[0-9]/.test(m));

  let title = cleanName;
  sizes.forEach(size => {
    title = title.replace(size, '');
  });
  title = title.replace(/\s+/g, ' ').replace(/-\s*$/, '').trim();

  return (
    <div className="flex flex-col text-right" style={{ direction: 'rtl' }}>
      <span className="font-bold text-slate-800 text-sm leading-snug">
        {title}
      </span>
      {sizes.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1 justify-start shrink-0">
          {sizes.map((size, idx) => (
            <span
              key={idx}
              className="inline-block font-mono font-black text-[10px] text-blue-700 bg-blue-50/80 px-1.5 py-0.5 rounded border border-blue-300 shadow-xs"
              style={{ direction: 'ltr', unicodeBidi: 'embed' }}
            >
              {size}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

const Reports = () => {
  const { user, hasPermission } = useAuth();
  const { notifySuccess, notifyError } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();

  // فحص الصلاحيات
  if (user?.role !== 'admin' && !hasPermission('view_reports')) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="glass-card p-8 text-center max-w-md mx-4">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">غير مصرح لك</h2>
          <p className="text-slate-600 mb-6">ليس لديك صلاحية للوصول إلى صفحة الفواتير والتقارير.</p>
        </div>
      </div>
    );
  }

  const [allSales, setAllSales] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // all | partial | returns
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('month'); // day | week | month | all

  
  // معالجة التنقل من صفحات أخرى
  useEffect(() => {
    if (location.state && allSales.length > 0) {
      if (location.state.openInvoiceId) {
        const invToOpen = allSales.find(s => s.id === location.state.openInvoiceId);
        if (invToOpen) {
          setSelectedInvoice(invToOpen);
          setShowInvoiceModal(true);
        }
        // تنظيف الحالة
        window.history.replaceState({}, document.title);
      }
      
      if (location.state.deleteInvoiceId) {
        // ننتظر قليلا حتى تكتمل دورة الرندر وتتوفر الدالة handleDeleteInvoice
        setTimeout(() => {
          handleDeleteInvoice(location.state.deleteInvoiceId);
        }, 100);
        // تنظيف الحالة
        window.history.replaceState({}, document.title);
      }
      
      if (location.state.settleInvoiceId) {
        setTimeout(() => {
          handlePayRemaining(location.state.settleInvoiceId);
        }, 100);
        // تنظيف الحالة
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, allSales]);

  // بحث وإضافة المنتجات داخل الفاتورة
  const [prodSearch, setProdSearch] = useState('');
  const [matchedProducts, setMatchedProducts] = useState([]);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [showPOSGrid, setShowPOSGrid] = useState(false);
  const [editSelectedCategory, setEditSelectedCategory] = useState('الكل');
  const [editProducts, setEditProducts] = useState([]);
  const [editCategories, setEditCategories] = useState([]);
  const [editProductImages, setEditProductImages] = useState({});
  const [editingQty, setEditingQty] = useState({});
  const [editingPrice, setEditingPrice] = useState({});
  const prodSearchInputRef = React.useRef(null);

  // Settlement Modal state
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [settlementInvoiceId, setSettlementInvoiceId] = useState(null);
  const [settlementRemaining, setSettlementRemaining] = useState(0);
  const [settlementAmount, setSettlementAmount] = useState('');
  const [settlementMethod, setSettlementMethod] = useState('cash');

  // Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    content: null,
    onConfirm: null,
  });

  const closeConfirmModal = () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  };

  // تحميل البيانات
  const loadSalesData = () => {
    try {
      const activeSales = JSON.parse(localStorage.getItem('sales') || '[]');
      const shifts = JSON.parse(localStorage.getItem('shifts') || '[]');
      const historicalSales = shifts.flatMap(shift => shift.sales || []);

      const salesMap = new Map();
      [...historicalSales, ...activeSales].forEach(sale => {
        if (sale && sale.id) {
          salesMap.set(sale.id, sale);
        }
      });

      const salesList = Array.from(salesMap.values()).sort((a, b) => {
        const ta = new Date(a.timestamp || a.date || 0).getTime();
        const tb = new Date(b.timestamp || b.date || 0).getTime();
        if (tb !== ta) return tb - ta;
        return (Number(b.id) || 0) - (Number(a.id) || 0);
      });

      setAllSales(salesList);
    } catch (error) {
      console.error('Error loading sales data:', error);
      notifyError('خطأ في تحميل الفواتير');
    }
  };

  useEffect(() => {
    loadSalesData();
    const interval = setInterval(loadSalesData, 15000);
    return () => clearInterval(interval);
  }, []);

  // تحميل المنتجات والفئات من أجل شبكة POS المدمجة عند فتح مودال الفاتورة
  useEffect(() => {
    if (showInvoiceModal) {
      try {
        const prods = JSON.parse(localStorage.getItem('products') || '[]');
        const cats = JSON.parse(localStorage.getItem('productCategories') || '[]');
        const imgs = JSON.parse(localStorage.getItem('productImages') || '{}');
        setEditProducts(prods);
        setEditCategories(cats);
        setEditProductImages(imgs);
        setShowPOSGrid(false); // إغلاق شبكة الـ POS كخيار افتراضي عند الفتح
      } catch (_) {}
    }
  }, [showInvoiceModal]);

  // تصفية المنتجات داخل نافذة التعديل
  useEffect(() => {
    try {
      const products = JSON.parse(localStorage.getItem('products') || '[]');
      if (!prodSearch.trim()) {
        // إذا كان البحث فارغاً، نعرض أول 100 منتج ليسهل الاختيار منها مباشرة
        setMatchedProducts(products.slice(0, 100));
        return;
      }
      const query = prodSearch.toLowerCase();
      const matched = products.filter(p => 
        (p.name || '').toLowerCase().includes(query) ||
        (p.sku || p.barcode || '').toLowerCase().includes(query)
      );
      setMatchedProducts(matched.slice(0, 100));
    } catch (_) {}
  }, [prodSearch]);

  // تعديل المخزون
  const adjustProductStock = (productId, diff) => {
    try {
      const products = JSON.parse(localStorage.getItem('products') || '[]');
      const target = products.find(p => p.id === productId);
      if (target) {
        target.stock = Number(target.stock || 0) - Number(diff);
        localStorage.setItem('products', JSON.stringify(products));
        window.dispatchEvent(new CustomEvent('dataUpdated', { detail: { type: 'products' } }));
      }
    } catch (error) {
      console.error('Error adjusting stock:', error);
    }
  };

  // تحديث الفاتورة بالكامل (المخازن، المبيعات، الشفتات)
  const updateInvoiceItems = (invoiceId, newItems) => {
    try {
      const invoice = allSales.find(sale => sale.id === invoiceId);
      if (!invoice) return;

      // 1. تعديل المخازن
      const oldItemsMap = new Map((invoice.items || []).map(item => [item.id, item.quantity]));
      const allIds = new Set([
        ...(invoice.items || []).map(i => i.id),
        ...newItems.map(i => i.id)
      ]);

      const returnsList = JSON.parse(localStorage.getItem('returns') || '[]');
      const activeShift = JSON.parse(localStorage.getItem('activeShift') || 'null');
      const shiftId = (activeShift && activeShift.status === 'active') ? activeShift.id : null;

      allIds.forEach(id => {
        const oldQty = oldItemsMap.get(id) || 0;
        const itemObj = (invoice.items || []).find(i => i.id === id) || newItems.find(i => i.id === id);
        const newQty = newItems.find(i => i.id === id)?.quantity || 0;
        const diff = newQty - oldQty;
        
        if (diff !== 0) {
          adjustProductStock(id, diff);
        }

        // إذا قلت الكمية، يعتبر مرتجعاً ويسجل في كشف المرتجعات للوردية
        if (diff < 0) {
          const returnedQty = Math.abs(diff);
          const refundAmount = returnedQty * (itemObj?.price || 0);

          const returnEntry = {
            id: `${Date.now()}_${id}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            refInvoiceId: invoiceId,
            customer: invoice.customer || { name: 'غير محدد', phone: '' },
            item: {
              id: id,
              name: itemObj?.name || 'منتج غير معروف',
              quantity: returnedQty
            },
            amount: refundAmount,
            shiftId: shiftId
          };

          returnsList.push(returnEntry);
        }
      });

      localStorage.setItem('returns', JSON.stringify(returnsList));

      // 2. إعادة حساب الحسابات للفاتورة
      const updatedInvoice = { ...invoice };
      updatedInvoice.items = newItems;
      updatedInvoice.subtotal = newItems.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);
      
      const discountAmount = updatedInvoice.discountAmount || 0;
      const taxAmount = updatedInvoice.taxAmount || 0;
      updatedInvoice.total = Math.max(0, updatedInvoice.subtotal - discountAmount + taxAmount);

      // تحديث العربون والمتبقي
      if (updatedInvoice.downPayment && updatedInvoice.downPayment.enabled) {
        const paidAmount = updatedInvoice.downPayment.amount || 0;
        updatedInvoice.downPayment.remaining = Math.max(0, updatedInvoice.total - paidAmount);
        if (updatedInvoice.downPayment.remaining <= 0) {
          updatedInvoice.downPayment.enabled = false;
          updatedInvoice.paymentStatus = 'complete';
        }
      }

      // 3. التخزين في localStorage
      const sales = JSON.parse(localStorage.getItem('sales') || '[]');
      const updatedSales = sales.map(sale => sale.id === invoiceId ? updatedInvoice : sale);
      localStorage.setItem('sales', JSON.stringify(updatedSales));

      // 4. تحديث الوردية النشطة
      try {
        const activeShift = JSON.parse(localStorage.getItem('activeShift') || 'null');
        if (activeShift && activeShift.status === 'active') {
          const shiftSaleIdx = (activeShift.sales || []).findIndex(s => s.id === invoiceId);
          if (shiftSaleIdx !== -1) {
            activeShift.sales[shiftSaleIdx] = updatedInvoice;
            activeShift.totalSales = activeShift.sales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
            localStorage.setItem('activeShift', JSON.stringify(activeShift));
          }
        }
      } catch (err) {}

      // 5. تحديث الشفتات السابقة
      try {
        const shifts = JSON.parse(localStorage.getItem('shifts') || '[]');
        const updatedShifts = shifts.map(shift => {
          const saleIdx = (shift.sales || []).findIndex(s => s.id === invoiceId);
          if (saleIdx !== -1) {
            shift.sales[saleIdx] = updatedInvoice;
            shift.totalSales = shift.sales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
          }
          return shift;
        });
        localStorage.setItem('shifts', JSON.stringify(updatedShifts));
      } catch (err) {}

      // 6. تحديث الحالة المحلية
      // تحديث مديونية العميل في سجل العملاء
      const customerInvoice = allSales.find(s => s.id === invoiceId);
      if (customerInvoice && customerInvoice.customer?.phone) {
        try {
          const customers = JSON.parse(localStorage.getItem('customers') || '[]');
          const cIndex = customers.findIndex(c => c.phone === customerInvoice.customer.phone);
          if (cIndex !== -1) {
            customers[cIndex].debt = Math.max(0, safeMath.subtract(customers[cIndex].debt || 0, amountPaid));
            localStorage.setItem('customers', JSON.stringify(customers));
            try { publish(EVENTS.CUSTOMERS_CHANGED, { type: 'update' }); } catch (_) {}
          }
        } catch (e) {
          console.error("Error updating customer debt:", e);
        }
      }

      setAllSales(updatedSales);
      setSelectedInvoice(updatedInvoice);
      notifySuccess('تم تعديل وتحديث الفاتورة بنجاح');
      try { publish(EVENTS.INVOICES_CHANGED, { type: 'update', invoiceId }); } catch (_) {}
    } catch (error) {
      console.error('Error updating invoice:', error);
      notifyError('خطأ في تحديث الفاتورة');
    }
  };

  // التحكم في زيادة/نقصان الكمية
  const changeItemQty = (invoiceId, itemIndex, delta) => {
    if (!selectedInvoice) return;
    const items = [...selectedInvoice.items];
    const item = items[itemIndex];
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      // حذف العنصر إذا وصلت الكمية لصفر
      deleteItemFromInvoice(invoiceId, itemIndex);
      return;
    }

    items[itemIndex] = { ...item, quantity: newQty };
    updateInvoiceItems(invoiceId, items);
  };

  const updateItemQtyDirectly = (invoiceId, itemIndex, newQty) => {
    if (!selectedInvoice) return;
    const items = [...selectedInvoice.items];
    const item = items[itemIndex];
    if (!item) return;

    if (newQty <= 0) {
      deleteItemFromInvoice(invoiceId, itemIndex);
      return;
    }

    items[itemIndex] = { ...item, quantity: newQty };
    updateInvoiceItems(invoiceId, items);
  };

  const updateItemPriceDirectly = (invoiceId, itemIndex, newPrice) => {
    if (!selectedInvoice) return;
    const items = [...selectedInvoice.items];
    const item = items[itemIndex];
    if (!item) return;

    items[itemIndex] = { ...item, price: parseFloat(newPrice) || 0 };
    updateInvoiceItems(invoiceId, items);
  };

  // حذف منتج من الفاتورة
  const deleteItemFromInvoice = (invoiceId, itemIndex) => {
    if (!selectedInvoice) return;
    const items = selectedInvoice.items.filter((_, idx) => idx !== itemIndex);
    updateInvoiceItems(invoiceId, items);
  };

  // إضافة منتج جديد للفاتورة
  const handleAddProductToInvoice = (invoiceId, product) => {
    if (!selectedInvoice) return;
    const items = [...selectedInvoice.items];
    const existingIndex = items.findIndex(it => it.id === product.id);

    if (existingIndex !== -1) {
      items[existingIndex] = {
        ...items[existingIndex],
        quantity: items[existingIndex].quantity + 1
      };
    } else {
      items.push({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        category: product.category,
        unit: product.unit || 'قطعة'
      });
    }

    updateInvoiceItems(invoiceId, items);
    notifySuccess('تم إضافة الصنف للفاتورة');
  };

  // معالج Enter للإضافة السريعة في مودال تعديل الفاتورة بالتقارير
  const handleProdSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (matchedProducts.length === 1) {
        handleAddProductToInvoice(selectedInvoice.id, matchedProducts[0]);
        setProdSearch('');
        soundManager.play('add');
      }
    }
  };

  // حذف الفاتورة بالكامل
  const handleDeleteInvoice = (invoiceId) => {
    const invoice = allSales.find(sale => sale.id === invoiceId);
    if (!invoice) return;

    const confirmDelete = () => {
      try {
        // إرجاع المنتجات للمخزن
        (invoice.items || []).forEach(item => {
          adjustProductStock(item.id, -item.quantity);
        });

        // إزالة من المبيعات
        const sales = JSON.parse(localStorage.getItem('sales') || '[]');
        const updatedSales = sales.filter(sale => sale.id !== invoiceId);
        localStorage.setItem('sales', JSON.stringify(updatedSales));

        // إزالة من الوردية النشطة
        const activeShift = JSON.parse(localStorage.getItem('activeShift') || 'null');
        if (activeShift) {
          activeShift.sales = (activeShift.sales || []).filter(sale => sale.id !== invoiceId);
          activeShift.totalSales = activeShift.sales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
          activeShift.totalOrders = activeShift.sales.length;
          localStorage.setItem('activeShift', JSON.stringify(activeShift));
        }

        setAllSales(updatedSales);
        setShowInvoiceModal(false);
        setSelectedInvoice(null);
        closeConfirmModal();
        notifySuccess('تم حذف الفاتورة بنجاح');
        try { publish(EVENTS.INVOICES_CHANGED, { type: 'delete', invoiceId }); } catch (_) {}
      } catch (error) {
        console.error('Error deleting invoice:', error);
        notifyError('خطأ في حذف الفاتورة');
      }
    };

    setConfirmModal({
      isOpen: true,
      title: 'حذف الفاتورة نهائياً',
      content: (
        <div className="text-right text-slate-700 space-y-1 mb-4">
          <p>رقم الفاتورة: <strong className="font-mono">#{invoice.id}</strong></p>
          <p>العميل: <strong>{invoice.customer?.name || 'غير حدد'}</strong></p>
          <p>المبلغ الإجمالي: <strong>{invoice.total} ج.م</strong></p>
        </div>
      ),
      message: 'تنبيه: سيتم مسح الفاتورة تماماً وإرجاع كافة المنتجات للمخازن، هذا الإجراء لا يمكن التراجع عنه!',
      onConfirm: confirmDelete
    });
  };

  // سداد المبلغ المتبقي (عربون)
  const handlePayRemaining = (invoiceId) => {
    const invoice = allSales.find(sale => sale.id === invoiceId);
    if (!invoice || (!invoice.downPayment?.enabled && invoice.paymentMethod !== 'deferred')) return;

    let calcRemaining = 0;
    if (invoice.downPayment?.enabled) {
      calcRemaining = invoice.downPayment.remaining || (safeMath.subtract(invoice.total, invoice.downPayment.amount));
    } else if (invoice.paymentMethod === 'deferred') {
      const settledAmount = (invoice.settlements || []).reduce((sum, s) => sum + (Number(s.amount) || 0), 0) + (invoice.settlement ? Number(invoice.settlement.amount) || 0 : 0);
      calcRemaining = safeMath.subtract(invoice.total, settledAmount);
    }

    if (calcRemaining <= 0) {
      notifyError('لا يوجد مبلغ متبقي لهذه الفاتورة');
      return;
    }

    setSettlementInvoiceId(invoiceId);
    setSettlementRemaining(Number(calcRemaining) || 0);
    setSettlementAmount(Number(calcRemaining) || 0);
    setSettlementMethod('cash');
    setShowSettlementModal(true);
  };

  const confirmPayRemaining = () => {
    try {
      const amountPaid = parseFloat(settlementAmount) || 0;
      if (amountPaid <= 0 || amountPaid > settlementRemaining) {
        notifyError('برجاء إدخال مبلغ صحيح لا يتجاوز المبلغ المتبقي');
        return;
      }
      
      const invoiceId = settlementInvoiceId;
      const method = settlementMethod;
      const newRemaining = Math.max(0, settlementRemaining - amountPaid);
      const isComplete = newRemaining <= 0;

      const activeShift = JSON.parse(localStorage.getItem('activeShift') || 'null');
      const activeShiftId = (activeShift && activeShift.status === 'active') ? activeShift.id : null;
      
      const settlementData = {
        method,
        amount: amountPaid,
        timestamp: new Date().toISOString(),
        shiftId: activeShiftId
      };

      const updateInvoiceData = (sale) => ({
        ...sale,
        settlements: [...(sale.settlements || []), ...(sale.settlement ? [sale.settlement] : []), settlementData], // migrate old settlement to array
        settlement: undefined,
        downPayment: {
          ...sale.downPayment,
          remaining: newRemaining,
          amount: (sale.downPayment?.amount || 0) + amountPaid,
          enabled: !isComplete // keep enabled if partial
        },
        paymentStatus: isComplete ? 'complete' : 'partial'
      });

      const updatedSales = allSales.map(sale => {
        if (sale.id === invoiceId) {
          return updateInvoiceData(sale);
        }
        return sale;
      });

      localStorage.setItem('sales', JSON.stringify(updatedSales));
      
      // تحديث الوردية النشطة
      if (activeShift && Array.isArray(activeShift.sales)) {
        activeShift.sales = activeShift.sales.map(s => {
          if (s.id === invoiceId) {
            return {
...updateInvoiceData(s)
            };
          }
          return s;
        });
        localStorage.setItem('activeShift', JSON.stringify(activeShift));
      }

      // تحديث الشفتات السابقة
      try {
        const shifts = JSON.parse(localStorage.getItem('shifts') || '[]');
        const updatedShifts = shifts.map(shift => {
          const saleIdx = (shift.sales || []).findIndex(s => s.id === invoiceId);
          if (saleIdx !== -1) {
            shift.sales[saleIdx] = {
...updateInvoiceData(shift.sales[saleIdx])
            };
            shift.totalSales = shift.sales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
          }
          return shift;
        });
        localStorage.setItem('shifts', JSON.stringify(updatedShifts));
      } catch (err) {}

      setAllSales(updatedSales);
      setShowSettlementModal(false);
      setShowInvoiceModal(false);
      setSelectedInvoice(null);
      notifySuccess(isComplete ? 'تم سداد المبلغ المتبقي وإغلاق الفاتورة بنجاح' : `تم سداد ${amountPaid} بنجاح، المتبقي ${newRemaining}`);
      try { publish(EVENTS.INVOICES_CHANGED, { type: 'settled', invoiceId }); } catch (_) {}
    } catch (error) {
      console.error('Error paying remaining:', error);
      notifyError('خطأ في سداد المتبقي');
    }
  };

  // طباعة الفاتورة
  const reprintInvoice = (invoice) => {
    try {
      const storeInfo = JSON.parse(localStorage.getItem('storeInfo') || '{}');
      const subtotal = invoice.subtotal || 0;
      const total = invoice.total || 0;
      const discountAmount = invoice.discountAmount || 0;
      const taxAmount = invoice.taxAmount || 0;
      const remainingAmount = invoice.downPayment?.remaining || 0;
      const invoiceId = invoice.id;
      
      const logoSrc = storeInfo.logo || '';
      const currentDate = formatDate(invoice.timestamp || invoice.date || new Date());
      const cashierName = invoice.cashier || user?.username || 'غير محدد';
      const paymentMethodText = invoice.paymentMethod === 'cash' ? '💵 نقدي' : invoice.paymentMethod === 'wallet' ? '📱 محفظة إلكترونية' : invoice.paymentMethod === 'instapay' ? '💳 انستا باي' : invoice.paymentMethod === 'deferred' ? '⏳ آجل' : '💵 نقدي';
      const customerName = invoice.customer?.name || 'عميل نقدي';
      const customerPhone = invoice.customer?.phone || 'غير محدد';
      const itemsArr = invoice.items || [];

      const printContent = `
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
              font-size: 12px;
              font-weight: bold;
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
                  <div class="store-subtitle" style="font-weight: 800; color: #0f172a; margin-bottom: 2px;">إدارة محمد أمين</div>
                  <div class="store-subtitle">هاتف: ${storeInfo.companyPhone || '01017856684 - 01200054511 - 01125291815'}</div>
                  <div class="store-subtitle" style="font-size: 11px;">العنوان: ${storeInfo.companyAddress || 'طريق القناطر - الحادثة بجوار ماركت سلسبيل'}</div>
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
                      <span class="info-val">${cashierName}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">طريقة الدفع:</span>
                      <span class="info-val">${paymentMethodText}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <div class="details-card">
                    <h4>بيانات العميل</h4>
                    <div class="info-row">
                      <span class="info-label">اسم العميل:</span>
                      <span class="info-val">${customerName}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">رقم الهاتف:</span>
                      <span class="info-val direction-ltr">${customerPhone}</span>
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
                ${invoice.downPayment?.enabled ? `
                  <tr>
                    <td class="label">العربون المدفوع:</td>
                    <td class="value">${(invoice.downPayment.amount || 0).toLocaleString('en-US')} ج.م</td>
                  </tr>
                ` : ''}
                <tr class="total-row">
                  <td class="label">${(invoice.downPayment?.enabled ? 'المبلغ المتبقي المستحق:' : 'الإجمالي النهائي:')}</td>
                  <td class="value">${((invoice.downPayment?.enabled ? remainingAmount : total)).toLocaleString('en-US')} ج.م</td>
                </tr>
              </table>
            </div>

            ${(invoice.downPayment?.enabled && invoice.downPayment?.deliveryDate) ? `
              <div style="margin-top: 20px; font-size: 12px; color: #334155; background-color: #f1f5f9; padding: 10px 15px; border-radius: 8px; border: 1px dashed #cbd5e1;">
                🗓️ <strong>تاريخ الاستلام المتوقع:</strong> ${formatDateToDDMMYYYY(invoice.downPayment.deliveryDate)}
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
              <div style="font-size: 11px; color: #000000; font-weight: bold;">برمجة وتطوير Elking للبرمجيات - هاتف: 01553448631</div>
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

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        notifySuccess('تم إرسال الفاتورة للطابعة');
      } else {
        notifyError('فشل فتح نافذة الطباعة');
      }
    } catch (error) {
      console.error(error);
      notifyError('حدث خطأ أثناء الطباعة');
    }
  };

  // فلترة الفواتير المعروضة
  const filteredInvoices = React.useMemo(() => {
    let result = [...allSales];

    // فلترة حسب التبويب
    if (activeTab === 'partial') {
      result = result.filter(inv => (inv.downPayment?.enabled && (inv.downPayment?.remaining || 0) > 0) || (inv.paymentMethod === 'deferred' && inv.paymentStatus !== 'complete'));
    } else if (activeTab === 'returns') {
      // المرتجعات المسجلة
      try {
        const activeReturns = JSON.parse(localStorage.getItem('returns') || '[]');
        const shifts = JSON.parse(localStorage.getItem('shifts') || '[]');
        const historicalReturns = shifts.flatMap(shift => shift.returns || []);

        const returnsMap = new Map();
        [...historicalReturns, ...activeReturns].forEach(ret => {
          if (ret && ret.id) {
            returnsMap.set(ret.id, ret);
          }
        });

        const returns = Array.from(returnsMap.values()).sort((a, b) => {
          const ta = new Date(a.timestamp || a.date || 0).getTime();
          const tb = new Date(b.timestamp || b.date || 0).getTime();
          return tb - ta;
        });

        return returns.filter(ret => {
          if (!searchTerm.trim()) return true;
          const query = searchTerm.toLowerCase();
          
          const dateObj = new Date(ret.timestamp || ret.date);
          let dateMatches = false;
          let isTodayInvoice = false;
          
          if (!isNaN(dateObj.getTime())) {
            const dayStr = String(dateObj.getDate()).padStart(2, '0');
            const monthStr = String(dateObj.getMonth() + 1).padStart(2, '0');
            const yearStr = String(dateObj.getFullYear());
            const formattedShort1 = `${dayStr}/${monthStr}/${yearStr}`; // DD/MM/YYYY
            const formattedShort2 = `${yearStr}-${monthStr}-${dayStr}`; // YYYY-MM-DD
            dateMatches = formattedShort1.includes(query) || formattedShort2.includes(query);

            const todayObj = new Date();
            isTodayInvoice = dateObj.getDate() === todayObj.getDate() &&
                             dateObj.getMonth() === todayObj.getMonth() &&
                             dateObj.getFullYear() === todayObj.getFullYear();
          }

          const isTodayQuery = query === 'اليوم' || query === 'today';

          return (
            String(ret.refInvoiceId).toLowerCase().includes(query) ||
            (ret.customer?.name || '').toLowerCase().includes(query) ||
            (ret.customer?.phone || '').includes(query) ||
            dateMatches ||
            (isTodayQuery && isTodayInvoice)
          );
        }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      } catch (_) {
        return [];
      }
    }

    // فلترة حسب طريقة الدفع
    if (paymentFilter !== 'all' && activeTab !== 'returns') {
      result = result.filter(inv => inv.paymentMethod === paymentFilter);
    }

    // فلترة حسب الفترة الزمنية
    if (periodFilter !== 'all' && activeTab !== 'returns') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      result = result.filter(inv => {
        const d = new Date(inv.timestamp || inv.date || 0);
        switch (periodFilter) {
          case 'day':
            return d >= today;
          case 'week':
            const w = new Date(today); w.setDate(w.getDate() - 7); return d >= w;
          case 'month':
            const m = new Date(today); m.setMonth(m.getMonth() - 1); return d >= m;
          default:
            return true;
        }
      });
    }

    // فلترة حسب البحث (رقم الفاتورة، اسم العميل، الهاتف، تاريخ اليوم، تاريخ مخصص)
    if (searchTerm.trim() && activeTab !== 'returns') {
      const query = searchTerm.toLowerCase();
      result = result.filter(inv => {
        const dateObj = new Date(inv.timestamp || inv.date);
        let dateMatches = false;
        let isTodayInvoice = false;
        
        if (!isNaN(dateObj.getTime())) {
          const dayStr = String(dateObj.getDate()).padStart(2, '0');
          const monthStr = String(dateObj.getMonth() + 1).padStart(2, '0');
          const yearStr = String(dateObj.getFullYear());
          const formattedShort1 = `${dayStr}/${monthStr}/${yearStr}`; // DD/MM/YYYY
          const formattedShort2 = `${yearStr}-${monthStr}-${dayStr}`; // YYYY-MM-DD
          dateMatches = formattedShort1.includes(query) || formattedShort2.includes(query);

          const todayObj = new Date();
          isTodayInvoice = dateObj.getDate() === todayObj.getDate() &&
                           dateObj.getMonth() === todayObj.getMonth() &&
                           dateObj.getFullYear() === todayObj.getFullYear();
        }

        const isTodayQuery = query === 'اليوم' || query === 'today';

        return (
          (inv.customer?.name || '').toLowerCase().includes(query) ||
          (inv.customer?.phone || '').includes(query) ||
          String(inv.id).toLowerCase().includes(query) ||
          dateMatches ||
          (isTodayQuery && isTodayInvoice)
        );
      });
    }

    return result;
  }, [allSales, activeTab, searchTerm, paymentFilter, periodFilter]);

  const getPaymentMethodText = (method) => {
    switch (method) {
      case 'cash': return 'نقداً';
      case 'wallet': return 'محفظة إلكترونية';
      case 'instapay': return 'انستا باي';
      case 'deferred': return 'آجل';
      default: return method || 'غير محدد';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 relative pb-12">
      {/* الخلفية والمؤثرات */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/5 rounded-full filter blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/5 rounded-full filter blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10 space-y-6">
        {/* رأس الصفحة */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Receipt className="h-7 w-7 text-blue-600" />
              إدارة الفواتير والمبيعات
            </h1>
            <p className="text-slate-500 text-sm mt-1">البحث عن الفواتير، إجراء المرتجعات، وتعديل الأصناف وقيم المبيعات فورياً</p>
          </div>
          <div className="flex gap-2 mt-4 md:mt-0">
            <button
              onClick={() => { soundManager.play('update'); loadSalesData(); notifySuccess('تم تحديث البيانات'); }}
              className="px-4 py-2 bg-white text-slate-700 rounded-xl border border-slate-300 hover:bg-slate-50 font-bold text-sm shadow-sm cursor-pointer flex items-center gap-2"
            >
              تحديث
            </button>
          </div>
        </div>

        {/* أدوات البحث والفلاتر */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
          {/* شريط البحث الموحد */}
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
            <input
              type="text"
              placeholder="البحث برقم الفاتورة، اسم العميل، أو رقم الهاتف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {/* تصفية طريقة الدفع */}
            {activeTab !== 'returns' && (
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent cursor-pointer"
              >
                <option value="all">كل طرق الدفع</option>
                <option value="cash">نقداً</option>
                <option value="wallet">محفظة إلكترونية</option>
                <option value="instapay">انستا باي</option>
                <option value="deferred">آجل</option>
              </select>
            )}

            {/* تصفية الفترة */}
            {activeTab !== 'returns' && (
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                className="px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent cursor-pointer"
              >
                <option value="all">كل الأوقات</option>
                <option value="day">اليوم</option>
                <option value="week">آخر 7 أيام</option>
                <option value="month">هذا الشهر</option>
              </select>
            )}
          </div>
        </div>

        {/* تبويبات الأقسام */}
        <div className="flex gap-2 border-b border-slate-200 pb-px">
          {[
            { id: 'all', label: 'كل الفواتير' },
            { id: 'partial', label: 'الفواتير غير المكتملة (متبقي عربون)' },
            { id: 'returns', label: 'سجل المرتجعات' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { soundManager.play('click'); setActiveTab(tab.id); }}
              className={`px-6 py-3 font-bold text-sm transition-all border-b-2 cursor-pointer ${activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* جدول الفواتير */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {activeTab !== 'returns' ? (
                    <>
                      <th className="px-6 py-4 text-slate-600 font-bold text-sm">رقم الفاتورة</th>
                      <th className="px-6 py-4 text-slate-600 font-bold text-sm">اسم العميل</th>
                      <th className="px-6 py-4 text-slate-600 font-bold text-sm">التاريخ والوقت</th>
                      <th className="px-6 py-4 text-slate-600 font-bold text-sm">طريقة الدفع</th>
                      <th className="px-6 py-4 text-slate-600 font-bold text-sm">قيمة الفاتورة</th>
                      <th className="px-6 py-4 text-slate-600 font-bold text-sm text-center">الإجراءات</th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 py-4 text-slate-600 font-bold text-sm">تاريخ المرتجع</th>
                      <th className="px-6 py-4 text-slate-600 font-bold text-sm">رقم الفاتورة الأصلي</th>
                      <th className="px-6 py-4 text-slate-600 font-bold text-sm">اسم العميل</th>
                      <th className="px-6 py-4 text-slate-600 font-bold text-sm">المنتج المرتجع</th>
                      <th className="px-6 py-4 text-slate-600 font-bold text-sm">الكمية المرتجعة</th>
                      <th className="px-6 py-4 text-slate-600 font-bold text-sm">المبلغ المرتجع</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500 font-medium">لا توجد نتائج مطابقة للبحث أو الفلترة</td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => {
                    if (activeTab !== 'returns') {
                      const remaining = inv.downPayment?.remaining || 0;
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-mono font-bold text-slate-800 text-sm">{inv.id}</td>
                          <td className="px-6 py-4 text-slate-700 text-sm font-semibold">{inv.customer?.name || 'غير محدد'}</td>
                          <td className="px-6 py-4 text-slate-500 text-xs">{formatDateTime(inv.timestamp || inv.date)}</td>
                          <td className="px-6 py-4 text-slate-700 text-sm font-semibold">
                            {getPaymentMethodText(inv.paymentMethod)}
                            {inv.downPayment?.enabled && remaining > 0 && (
                              <span className="mr-2 inline-block bg-yellow-100 text-yellow-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                                متبقي عربون
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-blue-600 font-extrabold text-sm">{inv.total.toLocaleString('en-US')} ج.م</td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2 justify-center">
                              {/* زر فتح وتعديل الفاتورة */}
                              <button
                                onClick={() => { soundManager.play('openWindow'); setSelectedInvoice(inv); setShowInvoiceModal(true); }}
                                className="px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-xs font-bold hover:bg-blue-100 cursor-pointer flex items-center gap-1"
                              >
                                <Eye className="h-4 w-4" />
                                عرض وتعديل
                              </button>

                              {/* زر سداد المتبقي */}
                              {((inv.downPayment?.enabled && remaining > 0) || (inv.paymentMethod === 'deferred' && inv.paymentStatus !== 'complete')) ? (
                                <button
                                  onClick={() => handlePayRemaining(inv.id)}
                                  className="px-3 py-1.5 bg-green-50 text-green-600 border border-green-200 rounded-lg text-xs font-bold hover:bg-green-100 cursor-pointer flex items-center gap-1"
                                >
                                  <Banknote className="h-4 w-4" />
                                  سداد المتبقي
                                </button>
                              ) : (
                                <button
                                  className="px-3 py-1.5 bg-green-50 text-green-600 border border-green-200 rounded-lg text-xs font-bold invisible pointer-events-none flex items-center gap-1"
                                  aria-hidden="true"
                                >
                                  <Banknote className="h-4 w-4" />
                                  سداد المتبقي
                                </button>
                              )}

                              {/* زر الطباعة */}
                              <button
                                onClick={() => reprintInvoice(inv)}
                                className="p-2 bg-slate-50 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 cursor-pointer"
                                title="طباعة الفاتورة"
                              >
                                <Printer className="h-4 w-4" />
                              </button>

                              {/* زر الحذف */}
                              <button
                                onClick={() => handleDeleteInvoice(inv.id)}
                                className="p-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 cursor-pointer"
                                title="حذف الفاتورة"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    } else {
                      // تبويب المرتجعات
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 text-slate-500 text-xs">{formatDateTime(inv.timestamp)}</td>
                          <td className="px-6 py-4 font-mono font-bold text-slate-800 text-sm">{inv.refInvoiceId}</td>
                          <td className="px-6 py-4 text-slate-700 text-sm font-semibold">{inv.customer?.name || 'غير محدد'}</td>
                          <td className="px-6 py-4 text-slate-800 text-sm">{inv.item?.name}</td>
                          <td className="px-6 py-4 text-slate-800 text-sm font-bold">{inv.item?.quantity}</td>
                          <td className="px-6 py-4 text-red-600 font-extrabold text-sm">-{inv.amount.toLocaleString('en-US')} ج.م</td>
                        </tr>
                      );
                    }
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* مودال تفاصيل وتعديل الفاتورة */}
      {showInvoiceModal && selectedInvoice && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] backdrop-blur-sm p-4 overflow-y-auto"
        >
          <div className={`bg-white rounded-2xl w-full flex flex-col overflow-hidden shadow-2xl border border-slate-200 animate-fadeInUp transition-all duration-300 ${showPOSGrid ? 'max-w-7xl h-[92vh]' : 'max-w-4xl max-h-[90vh]'}`}>
            {/* رأس المودال */}
            <div className="p-4 md:p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
              <div className="text-right">
                <h3 className="text-lg font-bold text-slate-800">تفاصيل وتعديل الفاتورة</h3>
                <p className="text-slate-500 text-xs mt-1">
                  رقم: <span className="font-mono font-bold text-slate-700 bg-slate-200/60 px-2 py-0.5 rounded">#{selectedInvoice.id}</span> |
                  التاريخ: {formatDateTime(selectedInvoice.timestamp || selectedInvoice.date)}
                </p>
              </div>
              <button
                onClick={() => { soundManager.play('closeWindow'); setShowInvoiceModal(false); }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-xl cursor-pointer"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* محتوى المودال القابل للتمرير */}
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <div className={showPOSGrid ? "grid grid-cols-1 lg:grid-cols-12 gap-6 items-start h-full" : "space-y-6"}>
                
                {/* العمود الأيمن: بيانات الفاتورة والأصناف */}
                <div className={showPOSGrid ? "lg:col-span-5 space-y-6 overflow-y-auto max-h-[75vh] pr-2 text-right custom-scrollbar" : "space-y-6 text-right"}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* بيانات العميل */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 text-right space-y-2">
                      <h4 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-1.5 mb-2">معلومات العميل</h4>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">الاسم:</span>
                        <span className="font-semibold text-slate-800">{selectedInvoice.customer?.name || 'غير محدد'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">الهاتف:</span>
                        <span className="font-semibold text-slate-800">{selectedInvoice.customer?.phone || 'غير حدد'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">الكاشير المسئول:</span>
                        <span className="font-semibold text-slate-800">{selectedInvoice.cashier || 'غير محدد'}</span>
                      </div>
                    </div>

                    {/* تفاصيل السداد */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 text-right space-y-2">
                      <h4 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-1.5 mb-2">بيانات الدفع والحساب</h4>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">طريقة الدفع الأساسية:</span>
                        <span className="font-semibold text-slate-800">{getPaymentMethodText(selectedInvoice.paymentMethod)}</span>
                      </div>
                      {selectedInvoice.downPayment?.enabled && (
                        <div className="pt-2 border-t border-slate-200 space-y-1">
                          <div className="flex justify-between text-sm text-yellow-800">
                            <span>العربون المدفوع:</span>
                            <span className="font-bold">{selectedInvoice.downPayment.amount} ج.م</span>
                          </div>
                          <div className="flex justify-between text-sm text-red-600">
                            <span>المبلغ المتبقي:</span>
                            <span className="font-bold">{(selectedInvoice.downPayment.remaining || 0).toFixed(2)} ج.م</span>
                          </div>
                        </div>
                      )}
                      {(selectedInvoice.settlements || (selectedInvoice.settlement ? [selectedInvoice.settlement] : [])).length > 0 && (
                        <div className="pt-2 border-t border-slate-200 space-y-1">
                          <h5 className="text-xs font-bold text-slate-600 mb-1 border-b pb-1">سجل السداد:</h5>
                          {(selectedInvoice.settlements || (selectedInvoice.settlement ? [selectedInvoice.settlement] : [])).map((s, idx) => (
                            <div key={idx} className="flex justify-between text-xs text-green-700">
                              <span>سداد ({s.method === 'cash' ? 'نقداً' : s.method === 'wallet' ? 'محفظة' : s.method === 'instapay' ? 'انستا باي' : 'آجل'}):</span>
                              <span className="font-bold">{s.amount} ج.م</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* إضافة صنف جديد للفاتورة */}
                  <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/20 text-right flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex-1 w-full relative">
                      <h4 className="text-sm font-bold text-slate-800 mb-2">إضافة صنف جديد للفاتورة:</h4>
                      <div className="relative">
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400">
                          <Search className="h-5 w-5" />
                        </div>
                        <input
                          ref={prodSearchInputRef}
                          type="text"
                          placeholder="اضغط هنا لعرض كافة المنتجات أو ابحث بالاسم/الباركود لسهولة الاختيار... (اضغط Enter للإضافة السريعة)"
                          value={prodSearch}
                          onChange={(e) => setProdSearch(e.target.value)}
                          onKeyDown={handleProdSearchKeyDown}
                          onFocus={() => setIsInputFocused(true)}
                          onBlur={() => setTimeout(() => setIsInputFocused(false), 250)}
                          className="w-full pr-10 pl-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all text-sm font-medium"
                        />
                        {isInputFocused && matchedProducts.length > 0 && (
                          <div className="absolute top-full right-0 left-0 bg-white text-slate-800 rounded-xl shadow-xl z-[10005] mt-1.5 border border-slate-300 max-h-60 overflow-y-auto text-right">
                            {matchedProducts.map(prod => (
                              <div
                                key={prod.id}
                                onClick={() => {
                                  handleAddProductToInvoice(selectedInvoice.id, prod);
                                  setProdSearch('');
                                }}
                                className="p-3 hover:bg-blue-50 border-b border-slate-100 flex justify-between items-center cursor-pointer text-xs md:text-sm font-semibold"
                              >
                                <div className="flex flex-col text-right">
                                  <span className="text-slate-800">{prod.name}</span>
                                  <span className="text-slate-400 text-[10px] mt-0.5">{prod.category || 'عام'}</span>
                                </div>
                                <span className="text-blue-600 font-extrabold">{prod.price} ج.م</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="shrink-0 w-full md:w-auto self-end">
                      <button
                        onClick={() => {
                          soundManager.play('click');
                          setShowPOSGrid(!showPOSGrid);
                        }}
                        className={`w-full md:w-auto px-5 py-2.5 rounded-xl font-bold border shadow-sm transition-all cursor-pointer text-sm flex items-center justify-center gap-2 ${
                          showPOSGrid 
                            ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700' 
                            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>🏪 تصفح من نقطة البيع</span>
                      </button>
                    </div>
                  </div>

                  {/* جدول أصناف الفاتورة */}
                  <div className="space-y-3">
                    <h4 className="text-base font-bold text-slate-800 text-right">أصناف الفاتورة</h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                      <table className="w-full text-right border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-4 py-3 text-slate-600 font-bold text-xs">اسم الصنف والمقاس</th>
                            <th className="px-4 py-3 text-slate-600 font-bold text-xs text-center">الكمية بالفاتورة</th>
                            <th className="px-4 py-3 text-slate-600 font-bold text-xs">سعر الوحدة</th>
                            <th className="px-4 py-3 text-slate-600 font-bold text-xs">إجمالي الصنف</th>
                            <th className="px-4 py-3 text-slate-600 font-bold text-xs text-center">الإجراءات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(selectedInvoice.items || []).map((item, idx) => {
                            const qtyValue = editingQty[item.id] !== undefined ? editingQty[item.id] : item.quantity;
                            const priceValue = editingPrice[item.id] !== undefined ? editingPrice[item.id] : item.price;
                            return (
                              <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-4 py-3 text-sm">{renderProductTitleAndSize(item.name)}</td>
                                <td className="px-4 py-3 text-center">
                                  <div className="flex justify-center items-center gap-2">
                                    <button
                                      onClick={() => { soundManager.play('delete'); changeItemQty(selectedInvoice.id, idx, -1); }}
                                      className="w-8 h-8 rounded-full bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 font-bold text-base flex items-center justify-center transition-colors cursor-pointer"
                                      title="مرتجع قطعة واحدة"
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      value={qtyValue}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setEditingQty(prev => ({ ...prev, [item.id]: val }));
                                        const parsed = parseInt(val);
                                        if (!isNaN(parsed) && parsed > 0) {
                                          updateItemQtyDirectly(selectedInvoice.id, idx, parsed);
                                        }
                                      }}
                                      onBlur={() => {
                                        const parsed = parseInt(qtyValue);
                                        if (isNaN(parsed) || parsed <= 0) {
                                          updateItemQtyDirectly(selectedInvoice.id, idx, 1);
                                        }
                                        setEditingQty(prev => {
                                          const copy = { ...prev };
                                          delete copy[item.id];
                                          return copy;
                                        });
                                      }}
                                      className="w-12 text-center bg-slate-100 border border-slate-200 text-slate-800 font-bold py-1 px-1 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                    <button
                                      onClick={() => { soundManager.play('add'); changeItemQty(selectedInvoice.id, idx, 1); }}
                                      className="w-8 h-8 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 font-bold text-base flex items-center justify-center transition-colors cursor-pointer"
                                      title="إضافة قطعة واحدة"
                                    >
                                      +
                                    </button>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-slate-700 text-sm font-semibold">
                                  <div className="flex items-center justify-start gap-1">
                                    <input
                                      type="number"
                                      value={priceValue}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setEditingPrice(prev => ({ ...prev, [item.id]: val }));
                                        const parsed = parseFloat(val);
                                        if (!isNaN(parsed) && parsed >= 0) {
                                          updateItemPriceDirectly(selectedInvoice.id, idx, parsed);
                                        }
                                      }}
                                      onBlur={() => {
                                        const parsed = parseFloat(priceValue);
                                        if (isNaN(parsed) || parsed < 0) {
                                          updateItemPriceDirectly(selectedInvoice.id, idx, item.price);
                                        }
                                        setEditingPrice(prev => {
                                          const copy = { ...prev };
                                          delete copy[item.id];
                                          return copy;
                                        });
                                      }}
                                      className="w-16 text-center bg-slate-50 border border-slate-200 text-slate-800 font-bold py-1 px-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                    <span className="text-xs text-slate-500 mr-1">ج.م</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-blue-600 text-sm font-bold">{((item.price) * (item.quantity)).toLocaleString('en-US')} ج.م</td>
                                <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => { soundManager.play('delete'); deleteItemFromInvoice(selectedInvoice.id, idx); }}
                                  className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer"
                                  title="حذف هذا البند بالكامل"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* ملخص المبالغ */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-right space-y-2">
                    <div className="flex justify-between text-sm text-slate-600">
                      <span>المجموع الفرعي للأصناف:</span>
                      <span className="font-semibold text-slate-800">{selectedInvoice.subtotal} ج.م</span>
                    </div>
                    {selectedInvoice.discountAmount > 0 && (
                      <div className="flex justify-between text-sm text-red-600">
                        <span>الخصم المطبق:</span>
                        <span className="font-bold">-{selectedInvoice.discountAmount} ج.م</span>
                      </div>
                    )}
                    {selectedInvoice.taxAmount > 0 && (
                      <div className="flex justify-between text-sm text-slate-600">
                        <span>الضريبة:</span>
                        <span className="font-semibold text-slate-800">+{selectedInvoice.taxAmount} ج.م</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-lg font-bold text-slate-800 pt-2 border-t border-slate-200">
                      <span>الإجمالي النهائي للمبيعات:</span>
                      <span className="text-blue-600 font-extrabold text-xl">{selectedInvoice.total.toLocaleString('en-US')} ج.م</span>
                    </div>
                  </div>
                </div>

                {/* العمود الأيسر: شبكة منتجات نقطة البيع */}
                {showPOSGrid && (
                  <div className="lg:col-span-7 bg-slate-50 rounded-2xl border border-slate-200 p-4 h-[75vh] overflow-y-auto flex flex-col custom-scrollbar text-right">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-4 shrink-0">
                      <span className="text-sm font-bold text-slate-800">🏪 تصفح واختيار منتجات نقطة البيع</span>
                      <button 
                        onClick={() => { soundManager.play('click'); setShowPOSGrid(false); }}
                        className="text-xs bg-red-50 text-red-600 hover:bg-red-100 px-2.5 py-1.5 rounded-lg border border-red-200 font-bold transition-all cursor-pointer"
                      >
                        إغلاق شبكة المنتجات
                      </button>
                    </div>
                    <div className="flex-1 min-h-0">
                      <ProductGrid
                        selectedCategory={editSelectedCategory}
                        onCategoryChange={setEditSelectedCategory}
                        onAddToCart={(product) => handleAddProductToInvoice(selectedInvoice.id, product)}
                        categories={editCategories}
                        setCategories={setEditCategories}
                        products={editProducts}
                        setProducts={setEditProducts}
                        productImages={editProductImages}
                        setProductImages={setEditProductImages}
                      />
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* تذييل المودال (العمليات) */}
            <div className="p-4 md:p-6 border-t border-slate-200 bg-slate-50 flex flex-wrap gap-2 justify-end shrink-0">
              <button
                onClick={() => reprintInvoice(selectedInvoice)}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-sm hover:bg-blue-700 cursor-pointer flex items-center gap-2"
              >
                <Printer className="h-4 w-4" />
                طباعة الفاتورة
              </button>

              <button
                onClick={() => handleDeleteInvoice(selectedInvoice.id)}
                className="px-5 py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm shadow-sm hover:bg-red-700 cursor-pointer flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                حذف الفاتورة بالكامل
              </button>

              <button
                onClick={() => { soundManager.play('closeWindow'); setShowInvoiceModal(false); }}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-sm cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مودال اختيار طريقة سداد العربون */}
      {showSettlementModal && (
        <div className="fixed inset-0 z-[10010] flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-right border border-slate-200 shadow-2xl">
            <h3 className="text-slate-800 text-lg font-bold mb-2">تسوية المبلغ المتبقي</h3>
            <p className="text-slate-600 text-sm mb-4">إجمالي المبلغ المتبقي: <strong className="text-red-600 font-extrabold text-base">{settlementRemaining} ج.م</strong></p>
            
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-500 mb-1">المبلغ المراد سداده:</label>
              <input 
                type="number" 
                value={settlementAmount} 
                onChange={(e) => setSettlementAmount(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-slate-800 focus:ring-2 focus:ring-blue-500 font-bold"
                placeholder="أدخل المبلغ..."
                min="0.1"
                step="0.1"
              />
            </div>

            <label className="block text-xs font-semibold text-slate-500 mb-2">اختر طريقة السداد:</label>
            <div className="grid grid-cols-2 gap-2 mb-6">
              {[
                { value: 'cash', label: 'نقداً' },
                { value: 'wallet', label: 'محفظة إلكترونية' },
                { value: 'instapay', label: 'انستا باي' },
                { value: 'deferred', label: 'آجل' }
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSettlementMethod(opt.value)}
                  className={`py-2 px-3 rounded-xl border-2 font-bold text-xs transition-all cursor-pointer ${settlementMethod === opt.value
                    ? 'border-blue-600 bg-blue-50 text-blue-600'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setShowSettlementModal(false); setSettlementInvoiceId(null); }}
                className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 py-2.5 rounded-xl font-bold text-xs cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={confirmPayRemaining}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl font-bold text-xs cursor-pointer"
              >
                تأكيد سداد {settlementAmount || 0} ج.م
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة تأكيد الحذف */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4" style={{ zIndex: 100000 }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md text-center border border-slate-200 shadow-2xl animate-fadeInUp">
            <div className="w-16 h-16 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Trash2 className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">{confirmModal.title}</h3>
            {confirmModal.content}
            <p className="text-red-500 font-bold text-sm mb-6">{confirmModal.message}</p>
            <div className="flex gap-3">
              <button
                onClick={confirmModal.onConfirm}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs cursor-pointer"
              >
                تأكيد الحذف
              </button>
              <button
                onClick={closeConfirmModal}
                className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-2.5 rounded-xl font-bold text-xs cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
