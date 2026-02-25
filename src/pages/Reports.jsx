import { publish, EVENTS } from '../utils/observerManager';
import React, { useState, useEffect } from 'react';
import { useNotifications } from '../components/NotificationSystem';
import soundManager from '../utils/soundManager.js';
import emojiManager from '../utils/emojiManager.js';
import storageOptimizer from '../utils/storageOptimizer.js';
import { formatDate, formatTimeOnly, formatDateTime, formatDateOnly, getCurrentDate } from '../utils/dateUtils.js';
import safeMath from '../utils/safeMath.js';
import { useAuth } from '../components/AuthProvider';
import {
  Calendar,
  Download,
  Filter,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  PieChart,
  FileText,
  Trash2,
  Printer,
  Eye,
  CreditCard,
  Banknote,
  Smartphone,
  Receipt,
  X,
  CheckCircle,
  Shield
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

const Reports = () => {
  const { user, hasPermission } = useAuth();
  const { notifySuccess, notifyError } = useNotifications();

  // فحص الصلاحيات (استثناء للمدير العام)
  if (user?.role !== 'admin' && !hasPermission('view_reports')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center">
        <div className="glass-card p-8 text-center max-w-md mx-4">
          <div className="w-20 h-20 bg-red-500 bg-opacity-20 rounded-full mx-auto mb-6 flex items-center justify-center">
            <Shield className="h-10 w-10 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">غير مصرح لك</h2>
          <p className="text-purple-200 mb-6">
            ليس لديك صلاحية للوصول إلى صفحة التقارير. يرجى التواصل مع المدير.
          </p>
          <div className="text-sm text-gray-400">
            دورك الحالي: {user?.role === 'admin' ? 'مدير عام' : user?.role === 'manager' ? 'مدير' : 'كاشير'}
          </div>
        </div>
      </div>
    );
  }
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [selectedReport, setSelectedReport] = useState('sales');
  const [salesData, setSalesData] = useState([]);
  const [productsData, setProductsData] = useState([]);
  const [activeShiftSales, setActiveShiftSales] = useState([]);
  const [allSales, setAllSales] = useState([]);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceFilter, setInvoiceFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [realTimeData, setRealTimeData] = useState({
    dailySales: [],
    monthlySales: [],
    topProducts: [],
    categorySales: [],
    customerData: []
  });

  // State for Confirmation Modal
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

  // مصدر موحّد لعدد الفواتير المعروضة وفق التبويب الحالي
  const visibleInvoices = React.useMemo(() => {
    try {
      if (selectedReport === 'invoices' || selectedReport === 'partial-invoices') {
        return getCurrentData() || [];
      }
      return allSales || [];
    } catch (_) { return allSales || []; }
  }, [selectedReport, allSales, selectedPeriod, invoiceFilter, searchTerm]);

  // تحليل البيانات الحقيقية من localStorage
  useEffect(() => {
    const analyzeData = () => {
      try {
        // تحميل البيانات من مصادر متعددة
        const salesFromOptimizer = storageOptimizer.get('sales', []);
        const salesFromLocalStorage = JSON.parse(localStorage.getItem('sales') || '[]');

        // دمج البيانات من المصادر المختلفة
        const sales = salesFromOptimizer.length > 0 ? salesFromOptimizer : salesFromLocalStorage;

        const products = storageOptimizer.get('products', []);
        const activeShift = storageOptimizer.get('activeShift', null);

        // تحليل المبيعات اليومية
        const dailySales = analyzeDailySales(sales);

        // تحليل المبيعات الشهرية
        const monthlySales = analyzeMonthlySales(sales);

        // تحليل المنتجات الأكثر مبيعاً
        const topProducts = analyzeTopProducts(sales, products);

        // تحليل توزيع المبيعات حسب الفئة
        const categorySales = analyzeCategorySales(sales);

        // تحليل بيانات العملاء
        const customerData = analyzeCustomerData(sales);

        // تحليل مبيعات الوردية النشطة - التحقق من وجود وردية نشطة
        const shiftSales = activeShift && activeShift.status === 'active' ? activeShift.sales || [] : [];

        // تحميل جميع المبيعات من localStorage
        // ترتيب تنازلياً: الأحدث أولاً (حسب timestamp أو id)
        const sortedSales = [...sales].sort((a, b) => {
          const ta = new Date(a.timestamp || a.date || 0).getTime();
          const tb = new Date(b.timestamp || b.date || 0).getTime();
          if (ta && tb && ta !== tb) return tb - ta; // تنازلي (الأحدث أولاً)
          const ida = Number(a.id) || 0;
          const idb = Number(b.id) || 0;
          return idb - ida; // تنازلي بالرقم
        });
        setAllSales(sortedSales);
        console.log('تم تحميل المبيعات:', sales.length, 'فاتورة');

        setRealTimeData({
          dailySales,
          monthlySales,
          topProducts,
          categorySales,
          customerData
        });

        setActiveShiftSales(shiftSales);
      } catch (error) {
        console.error('خطأ في تحليل البيانات:', error);
        notifyError('خطأ في تحميل البيانات', 'حدث خطأ في تحليل البيانات');
      }
    };

    analyzeData();

    // تحديث البيانات كل 15 ثانية
    const interval = setInterval(analyzeData, 15000);

    // الاستماع لتحديثات من باقي أجزاء النظام (POS/شفت)
    const onExternalUpdate = () => analyzeData();
    const onShiftEnded = () => analyzeData();
    window.addEventListener('dataUpdated', onExternalUpdate);
    window.addEventListener('shiftEnded', onShiftEnded);

    return () => {
      clearInterval(interval);
      window.removeEventListener('dataUpdated', onExternalUpdate);
      window.removeEventListener('shiftEnded', onShiftEnded);
    };
  }, []);

  // تحليل المبيعات اليومية
  const analyzeDailySales = (sales) => {
    const last7Days = [];
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const daySales = (sales || []).filter(sale => {
        const saleDate = new Date(sale.timestamp || sale.date);
        return saleDate.toDateString() === date.toDateString();
      });

      const totalSales = daySales.reduce((sum, sale) => safeMath.add(sum, sale.total || 0), 0);
      const totalOrders = daySales.length;
      const uniqueCustomers = new Set(daySales.map(sale => sale.customer?.name || 'عميل غير محدد')).size;

      last7Days.push({
        day: days[date.getDay()],
        sales: totalSales,
        orders: totalOrders,
        customers: uniqueCustomers
      });
    }

    return last7Days;
  };

  // تحليل المبيعات الشهرية
  const analyzeMonthlySales = (sales) => {
    const monthlyData = [];
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthSales = sales.filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate.getMonth() === date.getMonth() && saleDate.getFullYear() === date.getFullYear();
      });

      const totalSales = monthSales.reduce((sum, sale) => safeMath.add(sum, sale.total || 0), 0);
      const totalOrders = monthSales.length;
      const uniqueCustomers = new Set(monthSales.map(sale => sale.customer?.name || 'عميل غير محدد')).size;

      monthlyData.push({
        month: months[date.getMonth()],
        sales: totalSales,
        orders: totalOrders,
        customers: uniqueCustomers
      });
    }

    return monthlyData;
  };

  // تحليل المنتجات الأكثر مبيعاً
  const analyzeTopProducts = (sales, products) => {
    const productSales = {};
    const idToName = new Map((products || []).map(p => [p.id, p.name]));
    const nameToName = new Map((products || []).map(p => [String(p.name || '').trim().toLowerCase(), p.name]));

    (sales || []).forEach(sale => {
      (sale.items || []).forEach(item => {
        const pid = item.id ?? item.productId ?? item.sku ?? `unk-${item.name || ''}`;
        const rawName = (item.name && item.name.trim()) || idToName.get(pid) || nameToName.get(String(item.name || '').trim().toLowerCase());
        const name = rawName || 'غير معروف';
        if (!productSales[pid]) {
          productSales[pid] = { name, sales: 0, revenue: 0, profit: 0 };
        }
        const qty = Number(item.quantity) || 0;
        const price = Number(item.price) || 0;
        const itemTotal = safeMath.multiply(price, qty);
        productSales[pid].sales += qty;
        productSales[pid].revenue = safeMath.add(productSales[pid].revenue, itemTotal);
        productSales[pid].profit = safeMath.add(productSales[pid].profit, safeMath.calculatePercentage(itemTotal, 30)); // تقدير ربح افتراضي 30%
      });
    });

    return Object.values(productSales)
      .filter(p => p.sales > 0)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10);
  };

  // تحليل توزيع المبيعات حسب الفئة
  const analyzeCategorySales = (sales) => {
    // توزيع المبيعات حسب فئة المنتج (من الفواتير + مخزون المنتجات)
    const products = JSON.parse(localStorage.getItem('products') || '[]');
    const idToCategory = new Map(products.map(p => [p.id, p.category || 'غير محدد']));
    const nameToCategory = new Map(products.map(p => [String(p.name || '').trim().toLowerCase(), p.category || 'غير محدد']));
    const categoryTotals = {};

    (sales || []).forEach(sale => {
      (sale.items || []).forEach(item => {
        const pid = item.id ?? item.productId ?? item.sku;
        const nameKey = String(item.name || '').trim().toLowerCase();
        const category = (item.category && String(item.category).trim()) || idToCategory.get(pid) || nameToCategory.get(nameKey) || 'غير محدد';
        if (!categoryTotals[category]) categoryTotals[category] = 0;
        const qty = Number(item.quantity) || 0;
        categoryTotals[category] += qty;
      });
    });

    const colors = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#14B8A6'];
    return Object.entries(categoryTotals).map(([name, value], index) => ({ name: String(name || 'غير محدد'), value: Number(value) || 0, color: colors[index % colors.length] }));
  };

  // تحليل بيانات العملاء
  const analyzeCustomerData = (sales) => {
    const customerData = {};

    sales.forEach(sale => {
      const customerName = sale.customer?.name || 'عميل غير محدد';
      if (!customerData[customerName]) {
        customerData[customerName] = {
          name: customerName,
          totalSpent: 0,
          orders: 0,
          lastVisit: sale.date
        };
      }
      customerData[customerName].totalSpent = safeMath.add(customerData[customerName].totalSpent, sale.total || 0);
      customerData[customerName].orders += 1;
      if (new Date(sale.date) > new Date(customerData[customerName].lastVisit)) {
        customerData[customerName].lastVisit = sale.date;
      }
    });

    return Object.values(customerData)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);
  };

  // إزالة البيانات التجريبية: نعتمد فقط على realTimeData
  const dailySalesData = realTimeData?.dailySales || [];

  const monthlySalesData = realTimeData?.monthlySales || [];

  const topProductsData = realTimeData?.topProducts || [];

  // بيانات توزيع المبيعات حسب التصنيف
  const categorySalesData = realTimeData?.categorySales || [];

  const customerData = realTimeData?.customerData || [];

  // دوال إدارة الفواتير
  const openInvoiceModal = (invoice) => {
    try {
      if (!invoice) {
        notifyError('خطأ في عرض التفاصيل', 'الفاتورة غير موجودة');
        return;
      }

      setSelectedInvoice(invoice);
      setShowInvoiceModal(true);

      // إشعار المستخدم
      notifySuccess('تم فتح تفاصيل الفاتورة', `فاتورة رقم #${invoice.id}`);
    } catch (error) {
      console.error('خطأ في فتح نافذة التفاصيل:', error);
      notifyError('خطأ في عرض التفاصيل', 'حدث خطأ غير متوقع');
    }
  };

  const closeInvoiceModal = () => {
    try {
      setShowInvoiceModal(false);
      setSelectedInvoice(null);
    } catch (error) {
      console.error('خطأ في إغلاق نافذة التفاصيل:', error);
    }
  };

  // إضافة مستمع لمفتاح Escape لإغلاق النافذة
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape' && showInvoiceModal) {
        closeInvoiceModal();
      }
    };

    if (showInvoiceModal) {
      document.addEventListener('keydown', handleEscapeKey);
      // منع التمرير في الخلفية
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'unset';
    };
  }, [showInvoiceModal]);


  const deleteInvoice = (invoiceId) => {
    const invoice = allSales.find(sale => sale.id === invoiceId);
    if (invoice) {
      const confirmDelete = () => {
        try {
          // إزالة الفاتورة من جميع المبيعات
          const allSalesData = JSON.parse(localStorage.getItem('sales') || '[]');
          const updatedSales = allSalesData.filter(sale => sale.id !== invoiceId);
          localStorage.setItem('sales', JSON.stringify(updatedSales));
          try { publish(EVENTS.INVOICES_CHANGED, { type: 'delete', invoiceId }); } catch (_) { }

          // إزالة الفاتورة من مبيعات الوردية النشطة
          const activeShift = JSON.parse(localStorage.getItem('activeShift') || 'null');
          if (activeShift) {
            activeShift.sales = activeShift.sales.filter(sale => sale.id !== invoiceId);
            activeShift.totalSales = safeMath.subtract(activeShift.totalSales, invoice.total || 0);
            activeShift.totalOrders -= 1;
            localStorage.setItem('activeShift', JSON.stringify(activeShift));
          }

          // تحديث البيانات المحلية
          setAllSales(updatedSales);
          setActiveShiftSales(prev => prev.filter(sale => sale.id !== invoiceId));

          // إغلاق نافذة التفاصيل إذا كانت مفتوحة
          if (selectedInvoice && selectedInvoice.id === invoiceId) {
            closeInvoiceModal();
          }
          closeConfirmModal();

          notifySuccess('تم حذف الفاتورة بنجاح', `فاتورة رقم #${invoiceId}`);
        } catch (error) {
          console.error('خطأ في حذف الفاتورة:', error);
          notifyError('خطأ في حذف الفاتورة', 'حدث خطأ غير متوقع');
        }
      };

      setConfirmModal({
        isOpen: true,
        title: 'تأكيد الحذف',
        content: (
          <div className="text-purple-200 mb-4">
            <p>رقم الفاتورة: <span className="text-white font-mono">#{invoice.id}</span></p>
            <p>المبلغ: <span className="text-white font-bold">{invoice.total} جنيه</span></p>
            <p>العميل: <span className="text-white">{invoice.customer?.name || 'عميل غير محدد'}</span></p>
          </div>
        ),
        message: 'تحذير: هذا الإجراء لا يمكن التراجع عنه!',
        onConfirm: confirmDelete
      });
    }
  };

  // توحيد شكل معرف الفاتورة: قبول أرقام فقط أو صيغ مختلفة وإرجاع INV-XXXXXXXX
  const normalizeInvoiceId = (raw) => {
    if (raw == null) return '';
    let s = String(raw).trim();
    if (s.startsWith('#')) s = s.slice(1);
    if (/^inv-/i.test(s)) return s.toUpperCase();
    if (/^\d+$/.test(s)) return `INV-${s.padStart(8, '0')}`;
    return s.toUpperCase();
  };

  const reprintInvoice = (invoiceId) => {
    try {
      // التأكد من أن invoiceId هو معرف صحيح
      const normId = normalizeInvoiceId(invoiceId);
      if (!normId || typeof normId !== 'string' || !/^INV-/.test(normId)) {
        console.error('معرف الفاتورة غير صحيح:', invoiceId);
        notifyError('خطأ في العثور على الفاتورة', 'معرف الفاتورة غير صحيح');
        return;
      }

      console.log('البحث عن الفاتورة رقم:', normId);
      console.log('عدد الفواتير في allSales:', allSales.length);

      // البحث في allSales أولاً
      let invoice = allSales.find(sale => {
        const sid = normalizeInvoiceId(sale.id);
        return sid === normId;
      });
      console.log('الفاتورة في allSales:', invoice ? 'موجودة' : 'غير موجودة');

      // إذا لم توجد، ابحث في localStorage.sales
      if (!invoice) {
        const localStorageSales = JSON.parse(localStorage.getItem('sales') || '[]');
        console.log('عدد الفواتير في localStorage:', localStorageSales.length);
        invoice = localStorageSales.find(sale => normalizeInvoiceId(sale.id) === normId);
        console.log('الفاتورة في localStorage:', invoice ? 'موجودة' : 'غير موجودة');
      }

      // إذا لم توجد، ابحث في جميع المفاتيح المحتملة
      if (!invoice) {
        const possibleKeys = ['sales', 'allSales', 'invoices', 'transactions'];
        for (const key of possibleKeys) {
          const data = JSON.parse(localStorage.getItem(key) || '[]');
          if (Array.isArray(data)) {
            invoice = data.find(sale => normalizeInvoiceId(sale.id) === normId);
            if (invoice) {
              console.log(`الفاتورة وجدت في ${key}`);
              break;
            }
          }
        }
      }

      if (invoice) {
        console.log('تم العثور على الفاتورة:', invoice);
        // إنشاء نافذة طباعة للفاتورة
        const printContent = generateInvoiceContent(invoice);
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(printContent);
          printWindow.document.close();
          // سيتم الطباعة من داخل القالب مرة واحدة عند تحميل الشعار/المحتوى
          notifySuccess('تم فتح نافذة الطباعة', 'تحقق من إعدادات الطابعة');
        } else {
          notifyError('خطأ في الطباعة', 'لا يمكن فتح نافذة الطباعة');
        }
      } else {
        console.log('الفاتورة غير موجودة في أي مكان');
        notifyError('خطأ في العثور على الفاتورة', `الفاتورة رقم ${invoiceId} غير موجودة`);
      }
    } catch (error) {
      console.error('خطأ في طباعة الفاتورة:', error);
      notifyError('خطأ في الطباعة', 'حدث خطأ غير متوقع');
    }
  };




  // دوال التحكم في المنتجات داخل الفاتورة
  // deprecated - kept to avoid breakage; new unified handlers are below
  const increaseItemQuantity = (invoiceId, itemIndex) => {
    try {
      const invoice = allSales.find(sale => sale.id === invoiceId);
      if (invoice && invoice.items[itemIndex]) {
        const updatedInvoice = { ...invoice };
        updatedInvoice.items[itemIndex].quantity += 1;

        // إعادة حساب المبالغ
        updatedInvoice.subtotal = safeMath.calculateSubtotal(updatedInvoice.items);
        const taxableAmount = Math.max(0, safeMath.subtract(updatedInvoice.subtotal, updatedInvoice.discountAmount || 0));
        updatedInvoice.total = Math.max(0, safeMath.add(taxableAmount, updatedInvoice.taxAmount || 0));

        // تحديث في localStorage + إنقاص المخزون للصنف
        const sales = JSON.parse(localStorage.getItem('sales') || '[]');
        const updatedSales = sales.map(sale => sale.id === invoiceId ? updatedInvoice : sale);
        localStorage.setItem('sales', JSON.stringify(updatedSales));
        try {
          const activeShift = JSON.parse(localStorage.getItem('activeShift') || 'null');
          if (activeShift && activeShift.status === 'active' && updatedInvoice.shiftId === activeShift.id) {
            activeShift.sales = activeShift.sales.map(s => s.id === invoiceId ? updatedInvoice : s);
            localStorage.setItem('activeShift', JSON.stringify(activeShift));
          }
        } catch (_) { }
        try { publish(EVENTS.INVOICES_CHANGED, { type: 'update', invoiceId }); } catch (_) { }
        try {
          const products = JSON.parse(localStorage.getItem('products') || '[]');
          const targetId = updatedInvoice.items[itemIndex].id;
          const target = products.find(p => p.id === targetId);
          if (target) { target.stock = Number(target.stock || 0) - 1; }
          localStorage.setItem('products', JSON.stringify(products));
        } catch (_) { }

        // تحديث البيانات المحلية
        setAllSales(updatedSales);
        setSelectedInvoice(updatedInvoice);

        notifySuccess('تم بنجاح', 'تم زيادة الكمية');
      }
    } catch (error) {
      console.error('خطأ في زيادة الكمية:', error);
      notifyError('خطأ', 'حدث خطأ أثناء زيادة الكمية');
    }
  };

  // deprecated - kept to avoid breakage; new unified handlers are below
  const decreaseItemQuantity = (invoiceId, itemIndex) => {
    try {
      const invoice = allSales.find(sale => sale.id === invoiceId);
      if (invoice && invoice.items[itemIndex]) {
        const updatedInvoice = { ...invoice };

        if (updatedInvoice.items[itemIndex].quantity > 1) {
          updatedInvoice.items[itemIndex].quantity -= 1;

          // إعادة حساب المبالغ
          updatedInvoice.subtotal = safeMath.calculateSubtotal(updatedInvoice.items);
          const taxableAmount = Math.max(0, safeMath.subtract(updatedInvoice.subtotal, updatedInvoice.discountAmount || 0));
          updatedInvoice.total = Math.max(0, safeMath.add(taxableAmount, updatedInvoice.taxAmount || 0));

          // تحديث في localStorage + زيادة المخزون للصنف
          const sales = JSON.parse(localStorage.getItem('sales') || '[]');
          let updatedSales = sales.map(sale => sale.id === invoiceId ? updatedInvoice : sale);
          // تنظيف أي سجلات مرتجع قديمة مرتبطة بهذه الفاتورة داخل sales (لمنع الفاتورة السالبة)
          updatedSales = updatedSales.filter(s => {
            const isRefundType = s && s.type === 'refund';
            const matchesRef = s && (s.refInvoiceId === invoiceId || (typeof s.id === 'string' && s.id.startsWith(`${invoiceId}-R`)));
            const isNegative = (Number(s?.total) || 0) < 0 && matchesRef;
            return !(isRefundType && matchesRef) && !isNegative;
          });
          localStorage.setItem('sales', JSON.stringify(updatedSales));
          try { publish(EVENTS.INVOICES_CHANGED, { type: 'update', invoiceId }); } catch (_) { }
          try {
            const products = JSON.parse(localStorage.getItem('products') || '[]');
            const targetId = updatedInvoice.items[itemIndex].id;
            const target = products.find(p => p.id === targetId);
            if (target) { target.stock = Number(target.stock || 0) + 1; }
            localStorage.setItem('products', JSON.stringify(products));
          } catch (_) { }

          // تحديث البيانات المحلية
          setAllSales(updatedSales);
          setSelectedInvoice(updatedInvoice);

          notifySuccess('تم بنجاح', 'تم تقليل الكمية');
        } else {
          notifyError('تحذير', 'لا يمكن تقليل الكمية عن 1. استخدم زر الحذف لحذف المنتج');
        }
      }
    } catch (error) {
      console.error('خطأ في تقليل الكمية:', error);
      notifyError('خطأ', 'حدث خطأ أثناء تقليل الكمية');
    }
  };

  // deprecated - kept to avoid breakage; new unified handlers are below
  const clearAllItemsFromInvoice = (invoiceId) => {
    try {
      const invoice = allSales.find(sale => sale.id === invoiceId);
      if (invoice && invoice.items.length > 0) {
        const onConfirm = () => {
          const updatedInvoice = { ...invoice };
          updatedInvoice.items = [];
          updatedInvoice.subtotal = 0;
          updatedInvoice.total = 0;

          // تحديث في localStorage
          const sales = JSON.parse(localStorage.getItem('sales') || '[]');
          const updatedSales = sales.map(sale => sale.id === invoiceId ? updatedInvoice : sale);
          localStorage.setItem('sales', JSON.stringify(updatedSales));
          try {
            const activeShift = JSON.parse(localStorage.getItem('activeShift') || 'null');
            if (activeShift && activeShift.status === 'active' && updatedInvoice.shiftId === activeShift.id) {
              activeShift.sales = activeShift.sales.map(s => s.id === invoiceId ? updatedInvoice : s);
              localStorage.setItem('activeShift', JSON.stringify(activeShift));
            }
          } catch (_) { }
          try { publish(EVENTS.INVOICES_CHANGED, { type: 'update', invoiceId }); } catch (_) { }

          // تحديث البيانات المحلية
          setAllSales(updatedSales);
          setSelectedInvoice(updatedInvoice);

          notifySuccess('تم بنجاح', 'تم حذف جميع المنتجات من الفاتورة');
          closeConfirmModal();
        };

        setConfirmModal({
          isOpen: true,
          title: 'تأكيد حذف جميع المنتجات',
          content: (
            <div className="mb-4 p-4 bg-gray-700 rounded-lg text-right">
              <p className="text-white font-medium">فاتورة #{invoice.id}</p>
              <p className="text-gray-300 text-sm">عدد المنتجات: {invoice.items.length}</p>
              <p className="text-gray-300 text-sm">إجمالي الفاتورة: {invoice.total} جنيه</p>
            </div>
          ),
          message: 'هل أنت متأكد من حذف جميع المنتجات من هذه الفاتورة؟',
          onConfirm
        });

      } else {
        notifyError('تحذير', 'لا توجد منتجات في هذه الفاتورة');
      }
    } catch (error) {
      console.error('خطأ في حذف جميع المنتجات:', error);
      notifyError('خطأ', 'حدث خطأ أثناء حذف جميع المنتجات');
    }
  };

  // deprecated - kept to avoid breakage; new unified handlers are below
  const removeItemFromInvoice = (invoiceId, itemIndex) => {
    try {
      const invoice = allSales.find(sale => sale.id === invoiceId);
      if (invoice && invoice.items[itemIndex]) {
        const itemToRemove = invoice.items[itemIndex];
        const onConfirm = () => {
          const updatedInvoice = { ...invoice };
          const removed = updatedInvoice.items[itemIndex];
          updatedInvoice.items = updatedInvoice.items.filter((_, index) => index !== itemIndex);

          // إعادة حساب المبالغ
          updatedInvoice.subtotal = safeMath.calculateSubtotal(updatedInvoice.items);
          const taxableAmount = Math.max(0, safeMath.subtract(updatedInvoice.subtotal, updatedInvoice.discountAmount || 0));
          updatedInvoice.total = Math.max(0, safeMath.add(taxableAmount, updatedInvoice.taxAmount || 0));

          // تحديث في localStorage + إعادة الكمية للمخزون
          const sales = JSON.parse(localStorage.getItem('sales') || '[]');
          const updatedSales = sales.map(sale => sale.id === invoiceId ? updatedInvoice : sale);
          localStorage.setItem('sales', JSON.stringify(updatedSales));
          try {
            const activeShift = JSON.parse(localStorage.getItem('activeShift') || 'null');
            if (activeShift && activeShift.status === 'active' && updatedInvoice.shiftId === activeShift.id) {
              activeShift.sales = activeShift.sales.map(s => s.id === invoiceId ? updatedInvoice : s);
              localStorage.setItem('activeShift', JSON.stringify(activeShift));
            }
          } catch (_) { }
          try { publish(EVENTS.INVOICES_CHANGED, { type: 'update', invoiceId }); } catch (_) { }

          // تسجيل المرتجع في تقرير المرتجعات (بدون إنشاء فاتورة جديدة في الوردية النشطة)
          try {
            const returnsList = JSON.parse(localStorage.getItem('returns') || '[]');
            const refundTotal = Math.abs((Number(removed.price) || 0) * (Number(removed.quantity) || 0));
            const refundRecord = {
              id: `${invoiceId}-RET-${Date.now()}`,
              refInvoiceId: invoiceId,
              timestamp: new Date().toISOString(),
              amount: refundTotal,
              item: {
                id: removed.id,
                name: removed.name,
                price: Number(removed.price) || 0,
                quantity: Number(removed.quantity) || 0
              },
              customer: updatedInvoice.customer || null,
              cashier: updatedInvoice.cashier || undefined,
              shiftId: updatedInvoice.shiftId || null
            };
            returnsList.push(refundRecord);
            localStorage.setItem('returns', JSON.stringify(returnsList));
            try { window.dispatchEvent(new CustomEvent('dataUpdated', { detail: { type: 'returns' } })); } catch (_) { }
            // نظّف أيضاً الوردية النشطة من أي مرتجع سابق مرتبط بهذه الفاتورة
            try {
              const activeShift = JSON.parse(localStorage.getItem('activeShift') || 'null');
              if (activeShift && activeShift.status === 'active') {
                activeShift.sales = (activeShift.sales || []).filter(s => {
                  const isRefundType = s && s.type === 'refund';
                  const matchesRef = s && (s.refInvoiceId === invoiceId || (typeof s.id === 'string' && s.id.startsWith(`${invoiceId}-R`)));
                  const isNegative = (Number(s?.total) || 0) < 0 && matchesRef;
                  return !(isRefundType && matchesRef) && !isNegative;
                });
                localStorage.setItem('activeShift', JSON.stringify(activeShift));
              }
            } catch (_) { }
          } catch (_) { }
          try {
            const products = JSON.parse(localStorage.getItem('products') || '[]');
            const target = products.find(p => p.id === removed.id);
            if (target) { target.stock = Number(target.stock || 0) + Number(removed.quantity || 0); }
            localStorage.setItem('products', JSON.stringify(products));
          } catch (_) { }

          // تحديث البيانات المحلية
          setAllSales(JSON.parse(localStorage.getItem('sales') || '[]'));
          setSelectedInvoice(updatedInvoice);

          notifySuccess('تم بنجاح', 'تم حذف المنتج من الفاتورة');
          closeConfirmModal();
        };

        setConfirmModal({
          isOpen: true,
          title: 'تأكيد حذف المنتج',
          content: (
            <div className="mb-4 p-4 bg-gray-700 rounded-lg text-right">
              <p className="text-white font-medium">{itemToRemove.name}</p>
              <p className="text-gray-300 text-sm">الكمية: {itemToRemove.quantity}</p>
              <p className="text-gray-300 text-sm">السعر: {itemToRemove.price} جنيه</p>
              <p className="text-gray-300 text-sm">المجموع: {safeMath.multiply(itemToRemove.price, itemToRemove.quantity)} جنيه</p>
            </div>
          ),
          message: 'هل أنت متأكد من حذف هذا المنتج من الفاتورة؟',
          onConfirm
        });

      }
    } catch (error) {
      console.error('خطأ في حذف المنتج:', error);
      notifyError('خطأ', 'حدث خطأ أثناء حذف المنتج');
    }
  };

  const generateInvoiceContent = (invoice) => {
    const storeInfo = JSON.parse(localStorage.getItem('storeInfo') || '{}');

    // حساب المجموع الفرعي إذا لم يكن موجوداً
    const subtotal = invoice.subtotal || safeMath.calculateSubtotal(invoice.items || []);
    const total = invoice.total || safeMath.add(Math.max(0, safeMath.subtract(subtotal, invoice.discountAmount || 0)), invoice.taxAmount || 0);

    // حساب المبلغ المتبقي
    const remainingAmount = invoice.downPayment && invoice.downPayment.enabled
      ? safeMath.subtract(total, invoice.downPayment.amount || 0)
      : total;

    return `
      <html dir="rtl">
        <head>
          <meta charset="utf-8">
          <title>فاتورة مبيعات</title>
          <style>
            @page { size: 58mm auto; margin: 1mm; }
            html, body { width: 58mm; margin: 0; padding: 0; }
            body { 
              font-family: Tahoma, 'Segoe UI', Arial, sans-serif; 
              direction: rtl; 
              text-align: right; 
              color: #000;
            }
            .wrap { width: calc(58mm - 2mm); margin: 0 auto; }
            .num { font-variant-numeric: tabular-nums; font-family: ui-monospace, Menlo, Consolas, 'Courier New', monospace; }
            .header { text-align: center; margin-bottom: 8px; border-bottom: 1px dashed #333; padding-bottom: 6px; }
            .store-name { font-size: 14px; font-weight: 800; margin-bottom: 4px; color:#000; }
            .store-info { font-size: 10px; color: #000; }
            .invoice-info { margin: 6px 0 8px; font-size: 10px; }
            .items { margin: 8px 0; }
            table.items-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            table.items-table th, table.items-table td { border: 1px solid #000; padding: 5px 4px; font-size: 10px; color:#000; white-space: nowrap; }
            table.items-table th { background: #f0f0f0; font-weight: 700; font-size: 9px; white-space: nowrap; word-break: normal; letter-spacing: 0; }
            /* الرجوع للإعدادات الافتراضية للخلايا */
            table.items-table td { font-size: 10px; line-height: 1.4; letter-spacing: 0; white-space: normal; word-break: break-word; }
            table.items-table th.name { width: 45%; }
            table.items-table th.qty { width: 15%; text-align: center; }
            table.items-table th.price { width: 20%; text-align: center; }
            table.items-table th.total { width: 20%; text-align: center; }
            table.items-table td.center { text-align: center; }
            .total { border-top: 1px solid #333; padding-top: 6px; margin-top: 8px; font-weight: 700; font-size: 9px; }
            .payment-details { margin: 8px 0; padding: 6px; background: #f5f5f5; border-radius: 3px; }
            .payment-method { margin: 6px 0; font-size: 9px; font-weight: 700; }
            .down-payment { background: #e3f2fd; padding: 6px; border-radius: 3px; margin: 6px 0; font-size: 9px; }
            .remaining-amount { background: #fff3e0; padding: 6px; border-radius: 3px; margin: 6px 0; font-weight: 700; font-size: 9px; }
            .footer { text-align: center; margin-top: 10px; font-size: 9px; color: #666; }
            .divider { border-top: 1px dashed #333; margin: 6px 0; }
          </style>
        </head>
        <body>
          <div class="wrap">
          <div class="header">
            <div class="store-name">${storeInfo.companyName || 'MS GROUP'}</div>
            <div class="store-info">${storeInfo.companyPhone || '01029022006'}</div>
            <div style="font-weight: 800; font-size: 14px; margin-top:4px;">فاتورة البيع</div>
          </div>
          
          <div class="invoice-info">
            <div><strong>رقم الفاتورة:</strong> ${invoice.id}</div>
            <div><strong>التاريخ:</strong> ${invoice.timestamp}</div>
            <div><strong>العميل:</strong> ${invoice.customer?.name || 'عميل غير محدد'}</div>
            <div><strong>الهاتف:</strong> ${invoice.customer?.phone || 'غير محدد'}</div>
          </div>
          
          <div class="divider"></div>
          
          <div class="items">
              <table class="items-table">
                <thead>
                  <tr>
                    <th class="name">الوصف</th>
                    <th class="qty">الكمية</th>
                    <th class="price">السعر</th>
                    <th class="total">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  ${(invoice.items || []).map(item => `
                    <tr>
                      <td>${item.name || ''}</td>
                      <td class="center num">${Number(item.quantity || 0)}</td>
                      <td class="center num">${(Number(item.price) || 0).toLocaleString('en-US')}</td>
                      <td class="center num">${(((Number(item.price) || 0) * (Number(item.quantity) || 0))).toLocaleString('en-US')}</td>
                    </tr>
            `).join('')}
                </tbody>
              </table>
          </div>
          
          <div class="total">
            <div>المجموع الفرعي: ${subtotal.toLocaleString('en-US')} جنيه</div>
            ${(invoice.discountAmount || 0) > 0 ? `<div>الخصم: -${(invoice.discountAmount || 0).toLocaleString('en-US')} جنيه</div>` : ''}
            ${(invoice.taxAmount || 0) > 0 ? `<div>الضريبة: ${(invoice.taxAmount || 0).toLocaleString('en-US')} جنيه</div>` : ''}
            <div style="border-top: 1px solid #333; padding-top: 5px; margin-top: 5px;">
              <strong>الإجمالي: ${total.toLocaleString('en-US')} جنيه</strong>
            </div>
          </div>
          
          <div class="payment-details">
            <div class="payment-method">
              طريقة الدفع: ${getPaymentMethodText(invoice.paymentMethod)}
            </div>
            
            ${invoice.downPayment && invoice.downPayment.enabled ? `
              <div class="down-payment">
                <div><strong>العربون المدفوع:</strong> ${(invoice.downPayment.amount || 0).toLocaleString('en-US')} جنيه</div>
                <div><strong>طريقة دفع العربون:</strong> ${getPaymentMethodText(invoice.paymentMethod)}</div>
                <div><strong>نوع العربون:</strong> ${invoice.downPayment.type === 'percentage' ? 'نسبة مئوية' : 'مبلغ ثابت'}</div>
              </div>
              
              <div class="remaining-amount">
                <div><strong>المبلغ المتبقي:</strong> ${remainingAmount.toLocaleString('en-US')} جنيه</div>
                ${invoice.settlement ? `<div><strong>تم سداده عن طريق:</strong> ${getPaymentMethodText(invoice.settlement.method)} (${(invoice.settlement.amount || 0).toLocaleString('en-US')} جنيه)</div>` : '<div style="font-size: 11px; color: #666;">يتم دفعه عند استلام الطلب</div>'}
              </div>
            ` : ''}
          </div>
          
          <div class="divider"></div>
          
          <div class="footer" style="color:#000;">
            <div>شكراً لزيارتكم</div>
            <div>هذه فاتوره مطبوعه من نظام اداره مبيعات MS GROUP</div>
            <div>01029022006</div>
          </div>
        </body>
      </html>
    `;
  };

  const getPaymentMethodText = (method) => {
    const methods = {
      'cash': 'نقداً',
      'wallet': 'محفظة إلكترونية',
      'instapay': 'انستا باي',
      'bank': 'تحويل بنكي'
    };
    return methods[method] || (method || 'غير محدد');
  };

  // تجميع الفواتير حسب التاريخ (يوم/شهر/سنة)
  const groupInvoicesByDate = (invoices = []) => {
    const formatKey = (dateValue) => {
      if (!dateValue) return 'غير محدد';
      const dt = new Date(dateValue);
      if (isNaN(dt.getTime())) return 'غير محدد';
      return dt.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
    };
    return invoices.reduce((acc, invoice) => {
      const key = formatKey(invoice.timestamp || invoice.date);
      if (!acc[key]) acc[key] = [];
      acc[key].push(invoice);
      return acc;
    }, {});
  };

  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case 'cash':
        return <Banknote className="h-4 w-4 text-green-500" />;
      case 'wallet':
        return <Smartphone className="h-4 w-4 text-blue-500" />;
      case 'instapay':
        return <CreditCard className="h-4 w-4 text-purple-500" />;
      default:
        return <Receipt className="h-4 w-4 text-gray-500" />;
    }
  };

  // مقارنة تواريخ في نفس اليوم (تجاهل الوقت)
  const isSameDay = (a, b) => {
    try {
      const da = new Date(a);
      const db = new Date(b);
      return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
    } catch (_) { return false; }
  };

  const reports = [
    { id: 'sales', name: 'تقرير المبيعات', icon: DollarSign },
    { id: 'products', name: 'المنتجات الأكثر مبيعاً', icon: Package },
    { id: 'customers', name: 'تقرير العملاء', icon: Users },
    { id: 'inventory', name: 'تقرير المخزون', icon: BarChart3 },
    { id: 'invoices', name: 'فواتير الوردية النشطة', icon: Receipt },
    { id: 'partial-invoices', name: 'الفواتير غير المكتملة', icon: DollarSign },
    { id: 'returns', name: 'المرتجعات', icon: Trash2 },
  ];

  const periods = [
    { id: 'all', name: 'الكل' },
    { id: 'day', name: 'اليوم' },
    { id: 'week', name: 'هذا الأسبوع' },
    { id: 'month', name: 'هذا الشهر' },
    { id: 'year', name: 'هذا العام' }
  ];

  const getFilteredInvoices = () => {
    // استخدام جميع المبيعات بدلاً من مبيعات الوردية النشطة فقط
    let filtered = allSales;
    console.log('جميع المبيعات:', allSales.length, 'فاتورة');

    // فلترة حسب الفترة الزمنية
    if (selectedPeriod !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      filtered = filtered.filter(invoice => {
        const invoiceDate = new Date(invoice.date);

        switch (selectedPeriod) {
          case 'day':
            return invoiceDate >= today;
          case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return invoiceDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return invoiceDate >= monthAgo;
          case 'year':
            const yearAgo = new Date(today);
            yearAgo.setFullYear(yearAgo.getFullYear() - 1);
            return invoiceDate >= yearAgo;
          default:
            return true;
        }
      });
    }

    // استبعاد الفواتير غير المكتملة من قائمة "الفواتير" العامة
    // تبقى الفواتير غير المكتملة فقط في تبويب "الفواتير غير المكتملة"
    filtered = filtered.filter(inv => {
      const hasDown = inv?.downPayment?.enabled;
      if (!hasDown) return true;
      const remaining = (inv.downPayment?.remaining != null)
        ? Number(inv.downPayment.remaining) || 0
        : (Number(inv.total) || 0) - (Number(inv.downPayment?.amount) || 0);
      return remaining <= 0;
    });

    // فلترة حسب نوع الدفع
    if (invoiceFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.paymentMethod === invoiceFilter);
    }

    // فلترة حسب البحث
    if (searchTerm) {
      filtered = filtered.filter(invoice =>
        (invoice.customer?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (invoice.customer?.phone || '').includes(searchTerm) ||
        invoice.id.toString().includes(searchTerm)
      );
    }

    console.log('الفواتير المفلترة:', filtered.length, 'فاتورة');
    return filtered;
  };

  // إحضار قائمة المرتجعات
  const getReturns = () => {
    try {
      const list = JSON.parse(localStorage.getItem('returns') || '[]');
      // فلترة حسب الفترة
      let filtered = list;
      if (selectedPeriod !== 'all') {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        filtered = filtered.filter(r => {
          const d = new Date(r.timestamp);
          switch (selectedPeriod) {
            case 'day':
              return d >= today;
            case 'week':
              const w = new Date(today); w.setDate(w.getDate() - 7); return d >= w;
            case 'month':
              const m = new Date(today); m.setMonth(m.getMonth() - 1); return d >= m;
            case 'year':
              const y = new Date(today); y.setFullYear(y.getFullYear() - 1); return d >= y;
            default:
              return true;
          }
        });
      }
      return filtered;
    } catch (_) { return []; }
  };

  const getPartialInvoices = () => {
    // فلترة الفواتير التي لها عربون ومبلغ متبقي (بدون تقييد بتاريخ اليوم)
    const partialInvoices = allSales.filter(invoice => {
      // التحقق من وجود عربون
      if (!invoice.downPayment || !invoice.downPayment.enabled) {
        return false;
      }

      // حساب المبلغ المتبقي
      const remaining = invoice.downPayment.remaining || (safeMath.subtract(invoice.total, invoice.downPayment.amount));
      // إرجاع الفواتير التي لها مبلغ متبقي أكبر من 0
      return Number(remaining) > 0;
    });

    console.log('جميع المبيعات:', allSales.length, 'فاتورة');
    console.log('الفواتير غير المكتملة:', partialInvoices.length, 'فاتورة');
    console.log('تفاصيل الفواتير غير المكتملة:', partialInvoices);

    return partialInvoices;
  };

  // ربط عناصر الفاتورة ببيانات المنتجات للحصول على الفئة عند غيابها
  const enrichInvoiceItemsWithCategory = (invoice) => {
    try {
      const products = JSON.parse(localStorage.getItem('products') || '[]');
      const idToCategory = new Map(products.map(p => [p.id, p.category || 'غير محدد']));
      const items = (invoice.items || []).map(it => ({
        ...it,
        category: it.category || idToCategory.get(it.id) || 'غير محدد'
      }));
      return { ...invoice, items };
    } catch (_) {
      return invoice;
    }
  };

  // تحديثات الفاتورة داخل المودال (زيادة/نقصان/حذف/مسح)
  const persistInvoices = (updatedList) => {
    localStorage.setItem('sales', JSON.stringify(updatedList));
    setAllSales(updatedList);
    const fresh = updatedList.find(s => s.id === selectedInvoice?.id);
    if (fresh) setSelectedInvoice(enrichInvoiceItemsWithCategory(fresh));
  };

  // مدمجة بالفعل أعلاه - لا نعيد تعريفها هنا

  // حالة نافذة اختيار طريقة سداد المتبقي
  const [showSettlementModal, setShowSettlementModal] = React.useState(false);
  const [settlementInvoiceId, setSettlementInvoiceId] = React.useState(null);
  const [settlementMethod, setSettlementMethod] = React.useState('cash');
  const [settlementRemaining, setSettlementRemaining] = React.useState(0);

  const openSettlementModal = (invoiceId) => {
    const invoice = allSales.find(sale => sale.id === invoiceId);
    if (!invoice || !invoice.downPayment || !invoice.downPayment.enabled) return;
    const remainingAmount = invoice.downPayment.remaining || (safeMath.subtract(invoice.total, invoice.downPayment.amount));
    setSettlementInvoiceId(invoiceId);
    setSettlementRemaining(Number(remainingAmount) || 0);
    setSettlementMethod('cash');
    setShowSettlementModal(true);
  };

  const payRemainingAmount = (invoiceId, methodOverride) => {
    if (!invoiceId) {
      notifyError('خطأ', 'رقم الفاتورة غير صحيح');
      return;
    }

    const invoice = allSales.find(sale => sale.id === invoiceId);
    if (!invoice) {
      notifyError('خطأ', 'الفاتورة غير موجودة');
      return;
    }

    if (!invoice.downPayment || !invoice.downPayment.enabled) {
      notifyError('خطأ', 'هذه الفاتورة لا تحتوي على عربون');
      return;
    }

    const remainingAmount = invoice.downPayment.remaining;
    if (remainingAmount <= 0) {
      notifyError('خطأ', 'هذه الفاتورة مدفوعة بالكامل');
      return;
    }

    const confirmMessage = `هل تريد سداد المبلغ المتبقي: ${remainingAmount.toFixed(2)} جنيه؟\n\nالفاتورة رقم: ${invoice.id}\nالعميل: ${invoice.customer?.name || 'عميل غير محدد'}\nالمبلغ الإجمالي: ${invoice.total.toFixed(2)} جنيه\nالعربون المدفوع: ${invoice.downPayment.amount.toFixed(2)} جنيه\nالمبلغ المتبقي: ${remainingAmount.toFixed(2)} جنيه`;

    if (confirm(confirmMessage)) {
      try {
        // اختيار طريقة دفع المتبقي
        const allowed = ['cash', 'wallet', 'instapay', 'bank'];
        let settlementMethod = (methodOverride || '').toLowerCase();
        if (!allowed.includes(settlementMethod)) {
          const methodInput = (prompt('اختَر طريقة دفع المتبقي: cash | wallet | instapay | bank', 'cash') || 'cash').trim().toLowerCase();
          settlementMethod = allowed.includes(methodInput) ? methodInput : 'cash';
        }
        const settlementInfo = { method: settlementMethod, amount: Number(remainingAmount) || 0, timestamp: new Date().toISOString() };

        // تحديث الفاتورة في localStorage
        const updatedSales = allSales.map(sale => {
          if (sale.id === invoiceId) {
            return {
              ...sale,
              settlement: settlementInfo,
              downPayment: {
                ...sale.downPayment,
                remaining: 0,
                enabled: false
              },
              // اعتبرها مكتملة الآن (لا عربون متبقٍ)
              paymentStatus: 'complete'
            };
          }
          return sale;
        });

        localStorage.setItem('sales', JSON.stringify(updatedSales));
        setAllSales(updatedSales);

        // تحديث الوردية النشطة بنفس التغيير لضمان تطابق التقارير
        try {
          const activeShift = JSON.parse(localStorage.getItem('activeShift') || 'null');
          if (activeShift && Array.isArray(activeShift.sales)) {
            const updatedShift = { ...activeShift };
            updatedShift.sales = (activeShift.sales || []).map(s => {
              if (s && s.id === invoiceId) {
                return {
                  ...s,
                  settlement: settlementInfo,
                  downPayment: {
                    ...(s.downPayment || {}),
                    remaining: 0,
                    enabled: false
                  },
                  paymentStatus: 'complete'
                };
              }
              return s;
            });
            localStorage.setItem('activeShift', JSON.stringify(updatedShift));
          }
        } catch (_) { }

        // نشر حدث لتحديث جميع الشاشات فوراً
        try { publish(EVENTS.INVOICES_CHANGED, { type: 'settled', invoiceId }); } catch (_) { }

        notifySuccess('تم السداد بنجاح', `تم سداد المبلغ المتبقي: ${remainingAmount.toFixed(2)} جنيه (${getPaymentMethodText(settlementMethod)})`);

        // إغلاق المودال
        setShowInvoiceModal(false);
        setSelectedInvoice(null);

        // إعادة تحميل الصفحة بعد ثانيتين
        setTimeout(() => {
          window.location.reload();
        }, 2000);

      } catch (error) {
        console.error('خطأ في سداد المبلغ المتبقي:', error);
        notifyError('خطأ في النظام', 'حدث خطأ أثناء سداد المبلغ المتبقي');
      }
    }
  };

  // تم إلغاء زر حذف كل الفواتير وإعادة الترقيم بناءً على طلب المستخدم

  const getCurrentData = () => {
    switch (selectedReport) {
      case 'sales':
        return selectedPeriod === 'week' ? realTimeData.dailySales : realTimeData.monthlySales;
      case 'products':
        return realTimeData.topProducts;
      case 'customers':
        return realTimeData.customerData;
      case 'inventory':
        return realTimeData.categorySales;
      case 'invoices': {
        // إظهار فواتير الوردية النشطة فقط، والمكتملة فقط
        const list = getFilteredInvoices();
        try {
          const active = JSON.parse(localStorage.getItem('activeShift') || 'null');
          const activeId = (active && active.status === 'active') ? active.id : null;
          if (!activeId) return [];
          return list.filter(inv => inv.shiftId === activeId);
        } catch (_) { return []; }
      }
      case 'partial-invoices': {
        const list = getPartialInvoices();
        const today = new Date();
        return list.filter(inv => isSameDay(inv.timestamp || inv.date, today));
      }
      default:
        return realTimeData.dailySales;
    }
  };

  const exportReport = () => {
    const data = getCurrentData();

    // تحسين تصدير CSV للتعامل مع الأحرف الخاصة
    const escapeCSV = (field) => {
      if (typeof field === 'string' && (field.includes(',') || field.includes('"') || field.includes('\n'))) {
        return `"${field.replace(/"/g, '""')}"`;
      }
      return field;
    };

    const csvContent = "data:text/csv;charset=utf-8," +
      Object.keys(data[0]).map(escapeCSV).join(",") + "\n" +
      data.map(row => Object.values(row).map(escapeCSV).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `report_${selectedReport}_${selectedPeriod}_${getCurrentDate().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // تنبيه نجاح التصدير
    notifySuccess('تم تصدير التقرير بنجاح', 'تم حفظ الملف في مجلد التحميلات');
  };

  const downloadReport = (reportType, item) => {
    // دالة لتحميل تقرير فردي
    const data = [item];
    const csvContent = "data:text/csv;charset=utf-8," +
      Object.keys(data[0]).map(key => `"${key}"`).join(",") + "\n" +
      data.map(row => Object.values(row).map(value => `"${value}"`).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `report_${reportType}_${item.id || item.name || 'item'}_${getCurrentDate().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    notifySuccess('تم تحميل التقرير', 'تم حفظ الملف في مجلد التحميلات');
  };

  const exportToPDF = () => {
    const data = getCurrentData();
    const reportTitle = reports.find(r => r.id === selectedReport)?.name || 'تقرير';
    const periodTitle = periods.find(p => p.id === selectedPeriod)?.name || 'فترة';

    // إنشاء محتوى PDF
    const pdfContent = `
      <html dir="rtl">
        <head>
          <meta charset="utf-8">
          <title>${reportTitle} - ${periodTitle}</title>
          <style>
            body { 
              font-family: 'Arial', sans-serif; 
              direction: rtl; 
              text-align: right; 
              padding: 20px; 
              background: white;
              color: black;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
            }
            .title {
              font-size: 24px;
              font-weight: bold;
              color: #333;
              margin-bottom: 10px;
            }
            .subtitle {
              font-size: 16px;
              color: #666;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 12px;
              text-align: right;
            }
            th {
              background-color: #f5f5f5;
              font-weight: bold;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 12px;
              color: #666;
              border-top: 1px solid #ddd;
              padding-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">${reportTitle}</div>
            <div class="subtitle">${periodTitle} - ${formatDateOnly(getCurrentDate())}</div>
          </div>
          
          <table>
            <thead>
              <tr>
                ${Object.keys(data[0]).map(key => `<th>${key}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${data.map(row =>
      `<tr>${Object.values(row).map(value => `<td>${value}</td>`).join('')}</tr>`
    ).join('')}
            </tbody>
+              {selectedReport !== 'invoices' && selectedReport !== 'partial-invoices' && getCurrentData().length === 0 && (
+                <tfoot>
+                  <tr>
+                    <td colSpan="6" className="px-4 md:px-6 py-8 text-center text-purple-200">لا توجد بيانات متاحة</td>
+                  </tr>
+                </tfoot>
+              )}
          </table>
          
          <div class="footer">
            <p>تم إنشاء هذا التقرير في ${formatDateTime(getCurrentDate())}</p>
            <p>نظام إدارة مصنع MS GROUP Plast</p>
          </div>
        </body>
      </html>
    `;

    // فتح نافذة جديدة للطباعة
    const printWindow = window.open('', '_blank');
    printWindow.document.write(pdfContent);
    printWindow.document.close();
    printWindow.print();

    // تنبيه نجاح التصدير
    notifySuccess('تم إنشاء تقرير PDF للطباعة', 'تم فتح نافذة الطباعة');
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Animation */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-3 animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-3 animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-40 left-40 w-96 h-96 bg-green-500 rounded-full mix-blend-multiply filter blur-3xl opacity-3 animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* نافذة سداد المتبقي - اختيار طريقة الدفع */}
      {showSettlementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-gray-800 rounded-xl p-4 md:p-6 w-full max-w-sm">
            <h3 className="text-white text-base md:text-lg font-bold mb-3">اختيار طريقة سداد المتبقي</h3>
            <p className="text-gray-300 text-sm mb-4">المبلغ المتبقي: <span className="text-yellow-300 font-semibold">{(settlementRemaining || 0).toLocaleString('en-US')}</span> جنيه</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { value: 'cash', label: 'نقداً' },
                { value: 'wallet', label: 'محفظة إلكترونية' },
                { value: 'instapay', label: 'انستا باي' },
                { value: 'bank', label: 'تحويل بنكي' }
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSettlementMethod(opt.value)}
                  className={`py-2 rounded-lg border-2 text-sm ${settlementMethod === opt.value ? 'border-blue-500 bg-blue-500 bg-opacity-20 text-blue-300' : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowSettlementModal(false); setSettlementInvoiceId(null); }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg"
              >إلغاء</button>
              <button
                onClick={() => { const id = settlementInvoiceId; const m = settlementMethod; setShowSettlementModal(false); setSettlementInvoiceId(null); payRemainingAmount(id, m); }}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg"
              >تأكيد السداد</button>
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center animate-fadeInDown space-y-4 md:space-y-0">
          <div className="flex-1">
            <h1 className="text-sm md:text-base lg:text-lg xl:text-xl font-bold text-white mb-2 md:mb-3 bg-gradient-to-r from-white via-purple-200 to-purple-300 bg-clip-text text-transparent">
              التقارير والإحصائيات
            </h1>
            <p className="text-purple-200 text-xs md:text-xs lg:text-sm xl:text-sm font-medium">تحليل شامل لأداء مبيعات الملابس الرجالية</p>
          </div>
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                soundManager.play('save');
                exportReport();
              }}
              className="btn-primary flex items-center px-3 md:px-4 py-2 md:py-3 text-xs md:text-xs lg:text-sm font-semibold min-h-[40px] cursor-pointer"
              style={{
                pointerEvents: 'auto',
                zIndex: 10,
                position: 'relative'
              }}
            >
              <Download className="h-4 w-4 md:h-5 md:w-5 mr-2" />
              تصدير CSV
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                soundManager.play('print');
                exportToPDF();
              }}
              className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-3 md:px-4 py-2 md:py-3 rounded-xl hover:from-red-600 hover:to-pink-600 transition-all duration-300 flex items-center text-xs md:text-xs lg:text-sm font-semibold shadow-lg min-h-[40px] cursor-pointer"
              style={{
                pointerEvents: 'auto',
                zIndex: 10,
                position: 'relative'
              }}
            >
              <FileText className="h-4 w-4 md:h-5 md:w-5 mr-2" />
              تصدير PDF
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                soundManager.play('update');
                window.location.reload();
              }}
              className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 md:px-4 py-2 md:py-3 rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-300 flex items-center text-xs md:text-xs lg:text-sm font-semibold shadow-lg min-h-[40px] cursor-pointer"
              title="تحديث البيانات"
              style={{
                pointerEvents: 'auto',
                zIndex: 10,
                position: 'relative'
              }}
            >
              <TrendingUp className="h-4 w-4 md:h-5 md:w-5 mr-2" />
              تحديث
            </button>
          </div>
        </div>

        {/* Report Type Selection */}
        <div className="glass-card p-4 md:p-6 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
          <h3 className="text-lg md:text-xl font-semibold text-white mb-4 md:mb-6">نوع التقرير</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 ipad-grid ipad-pro-grid gap-4">
            {reports.map((report) => {
              const Icon = report.icon;
              return (
                <button
                  key={report.id}
                  onClick={() => { soundManager.play('click'); setSelectedReport(report.id); }}
                  className={`p-3 md:p-4 rounded-xl md:rounded-lg border-2 flex flex-col items-center transition-all duration-300 ${selectedReport === report.id
                    ? 'border-blue-500 bg-blue-500 bg-opacity-20 text-blue-300 shadow-glow'
                    : 'border-white border-opacity-20 hover:border-opacity-30 hover:bg-white hover:bg-opacity-5'
                    }`}
                >
                  <Icon className="h-5 w-5 md:h-6 md:w-6 mb-2 text-white" />
                  <span className="text-xs md:text-sm font-medium text-white">{report.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Period Selection */}
        <div className="glass-card p-4 md:p-6 animate-fadeInUp mb-4 md:mb-6" style={{ animationDelay: '0.2s' }}>
          <h3 className="text-lg font-bold text-white mb-4">الفترة الزمنية</h3>
          <div className="flex flex-wrap gap-2 md:gap-3">
            {periods.map((period) => (
              <button
                key={period.id}
                onClick={() => { soundManager.play('click'); setSelectedPeriod(period.id); }}
                className={`px-3 md:px-4 py-2 rounded-lg border transition-colors ${selectedPeriod === period.id
                  ? 'border-blue-500 bg-blue-500 bg-opacity-20 text-blue-300 shadow-glow'
                  : 'border-white border-opacity-20 bg-white bg-opacity-10 text-white hover:bg-opacity-20'
                  }`}
              >
                {period.name}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 ipad-grid ipad-pro-grid gap-4 md:gap-6 mb-4 md:mb-6">
          <div className="glass-card hover-lift animate-fadeInUp group cursor-pointer p-4 md:p-6" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <p className="text-xs font-medium text-purple-200 mb-1 uppercase tracking-wide">إجمالي المبيعات</p>
                <p className="text-lg md:text-xl font-bold text-white mb-2">{(realTimeData?.dailySales?.reduce((s, d) => s + (Number(d.sales) || 0), 0) || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</p>
                <div className="flex items-center text-xs">
                  <TrendingUp className="h-3 w-3 text-green-400 mr-1" />
                  <span className="text-green-400 font-semibold">+12.5%</span>
                  <span className="text-purple-300 mr-1 font-medium">من الفترة الماضية</span>
                </div>
              </div>
              <div className="p-2 md:p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl md:rounded-2xl group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <DollarSign className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
            </div>
          </div>

          <div className="glass-card hover-lift animate-fadeInUp group cursor-pointer p-4 md:p-6" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <p className="text-xs font-medium text-purple-200 mb-1 uppercase tracking-wide">عدد الطلبات</p>
                <p className="text-lg md:text-xl font-bold text-white mb-2">{(visibleInvoices?.length || 0).toLocaleString('en-US')}</p>
                <div className="flex items-center text-xs">
                  <TrendingUp className="h-3 w-3 text-green-400 mr-1" />
                  <span className="text-green-400 font-semibold">+8.2%</span>
                  <span className="text-purple-300 mr-1 font-medium">من الفترة الماضية</span>
                </div>
              </div>
              <div className="p-2 md:p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl md:rounded-2xl group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <ShoppingCart className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
            </div>
          </div>

          <div className="glass-card hover-lift animate-fadeInUp group cursor-pointer p-4 md:p-6" style={{ animationDelay: '0.5s' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <p className="text-xs font-medium text-purple-200 mb-1 uppercase tracking-wide">متوسط قيمة الطلب</p>
                <p className="text-lg md:text-xl font-bold text-white mb-2">{(() => { const total = allSales.reduce((s, inv) => s + (Number(inv.total) || 0), 0); const orders = allSales.length || 1; return (total / orders).toLocaleString('en-US', { style: 'currency', currency: 'USD' }); })()}</p>
                <div className="flex items-center text-xs">
                  <TrendingUp className="h-3 w-3 text-green-400 mr-1" />
                  <span className="text-green-400 font-semibold">+5.7%</span>
                  <span className="text-purple-300 mr-1 font-medium">من الفترة الماضية</span>
                </div>
              </div>
              <div className="p-2 md:p-3 bg-gradient-to-r from-purple-500 to-violet-500 rounded-xl md:rounded-2xl group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
            </div>
          </div>

          <div className="glass-card hover-lift animate-fadeInUp group cursor-pointer p-4 md:p-6" style={{ animationDelay: '0.6s' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <p className="text-xs font-medium text-purple-200 mb-1 uppercase tracking-wide">عدد العملاء</p>
                <p className="text-lg md:text-xl font-bold text-white mb-2">{(new Set(allSales.map(inv => (inv.customer?.phone || inv.customer?.name || ''))).size).toLocaleString('en-US')}</p>
                <div className="flex items-center text-xs">
                  <TrendingUp className="h-3 w-3 text-green-400 mr-1" />
                  <span className="text-green-400 font-semibold">+15.3%</span>
                  <span className="text-purple-300 mr-1 font-medium">من الفترة الماضية</span>
                </div>
              </div>
              <div className="p-2 md:p-3 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl md:rounded-2xl group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Users className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 ipad-grid ipad-pro-grid gap-4 md:gap-6 mb-4 md:mb-6">
          {/* Sales Chart */}
          <div className="glass-card hover-lift animate-fadeInLeft" style={{ animationDelay: '0.7s' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">مخطط المبيعات</h3>
              <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={realTimeData?.dailySales || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey={selectedPeriod === 'week' ? 'day' : 'month'} stroke="rgba(255,255,255,0.7)" />
                <YAxis stroke="rgba(255,255,255,0.7)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '12px',
                    color: 'white'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Category Distribution */}
          <div className="glass-card hover-lift animate-fadeInRight chart-enhanced" style={{ animationDelay: '0.8s' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">توزيع المبيعات حسب التصنيف</h3>
              <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg">
                <PieChart className="h-6 w-6 text-white" />
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={categorySalesData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="#0f172a"
                  strokeWidth={2}
                >
                  {categorySalesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#0f172a" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '12px',
                    color: 'white'
                  }}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {categorySalesData.map((item, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <div className="w-3.5 h-3.5 rounded mr-2 border border-white/70" style={{ backgroundColor: item.color }}></div>
                    <span className="text-white">{item.name}</span>
                  </div>
                  <span className="font-medium text-white">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="glass-card hover-lift animate-fadeInUp overflow-hidden" style={{ animationDelay: '0.9s' }}>
          <div className="p-4 md:p-6 border-b border-white border-opacity-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
              <h3 className="text-lg font-bold text-white">
                {selectedReport === 'sales' && 'تفاصيل المبيعات'}
                {selectedReport === 'products' && 'المنتجات الأكثر مبيعاً'}
                {selectedReport === 'customers' && 'أفضل العملاء'}
                {selectedReport === 'inventory' && 'حالة المخزون'}
                {selectedReport === 'invoices' && 'فواتير الوردية النشطة'}
                {selectedReport === 'returns' && 'المرتجعات'}
                {selectedReport === 'partial-invoices' && 'الفواتير غير المكتملة'}
              </h3>


              {/* فلترة وبحث الفواتير */}
              {(selectedReport === 'invoices' || selectedReport === 'partial-invoices') && (
                <div className="w-full">
                  {/* إحصائيات سريعة */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="bg-green-500 bg-opacity-20 px-4 py-3 rounded-lg border border-green-500 border-opacity-30">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-green-300 text-sm">
                            {selectedReport === 'partial-invoices' ? 'الفواتير غير المكتملة' : 'إجمالي الفواتير'}
                          </p>
                          <p className="text-white font-bold text-xl">
                            {selectedReport === 'partial-invoices' ? getPartialInvoices().length : allSales.length}
                          </p>
                        </div>
                        <Receipt className="h-8 w-8 text-green-400" />
                      </div>
                    </div>

                    <div className="bg-blue-500 bg-opacity-20 px-4 py-3 rounded-lg border border-blue-500 border-opacity-30">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-blue-300 text-sm">
                            {selectedReport === 'partial-invoices' ? 'المبلغ المتبقي' : 'المبلغ الإجمالي'}
                          </p>
                          <p className="text-white font-bold text-xl">
                            {selectedReport === 'partial-invoices'
                              ? getPartialInvoices().reduce((sum, invoice) => {
                                const remaining = invoice.downPayment.remaining || (safeMath.subtract(invoice.total, invoice.downPayment.amount));
                                return sum + remaining;
                              }, 0).toFixed(2)
                              : allSales.reduce((sum, invoice) => sum + invoice.total, 0)
                            } جنيه
                          </p>
                        </div>
                        <DollarSign className="h-8 w-8 text-blue-400" />
                      </div>
                    </div>

                    <div className="bg-purple-500 bg-opacity-20 px-4 py-3 rounded-lg border border-purple-500 border-opacity-30">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-purple-300 text-sm">مع العربون</p>
                          <p className="text-white font-bold text-xl">
                            {allSales.filter(invoice => invoice.downPayment && invoice.downPayment.enabled).length}
                          </p>
                        </div>
                        <CreditCard className="h-8 w-8 text-purple-400" />
                      </div>
                    </div>

                    <div className="bg-orange-500 bg-opacity-20 px-4 py-3 rounded-lg border border-orange-500 border-opacity-30">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-orange-300 text-sm">مكتملة الدفع</p>
                          <p className="text-white font-bold text-xl">
                            {allSales.filter(invoice => !invoice.downPayment || !invoice.downPayment.enabled).length}
                          </p>
                        </div>
                        <CheckCircle className="h-8 w-8 text-orange-400" />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                    {/* البحث */}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="البحث في الفواتير..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input-enhanced bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg px-4 py-2 text-white placeholder-purple-200 focus:outline-none focus:border-blue-500 w-full sm:w-64"
                      />
                      <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-purple-200" />
                    </div>

                    {/* فلترة طريقة الدفع */}
                    <select
                      value={invoiceFilter}
                      onChange={(e) => setInvoiceFilter(e.target.value)}
                      className="input-enhanced bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="all">جميع طرق الدفع</option>
                      <option value="cash">نقداً</option>
                      <option value="wallet">محفظة إلكترونية</option>
                      <option value="instapay">دفع فوري</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
            <div className="overflow-x-auto table-enhanced">
              <table className="w-full">
                <thead className="bg-white bg-opacity-10">
                  <tr>
                    {selectedReport === 'sales' && (
                      <>
                        <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-purple-200 uppercase tracking-wider">التاريخ</th>
                        <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-purple-200 uppercase tracking-wider">المبيعات</th>
                        <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-purple-200 uppercase tracking-wider">الطلبات</th>
                        <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-purple-200 uppercase tracking-wider">العملاء</th>
                      </>
                    )}
                    {selectedReport === 'products' && (
                      <>
                        <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-purple-200 uppercase tracking-wider">المنتج</th>
                        <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-purple-200 uppercase tracking-wider">الكمية المباعة</th>
                        <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-purple-200 uppercase tracking-wider">الإيرادات</th>
                        <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-purple-200 uppercase tracking-wider">الربح</th>
                      </>
                    )}
                    {selectedReport === 'customers' && (
                      <>
                        <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-purple-200 uppercase tracking-wider">اسم العميل</th>
                        <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-purple-200 uppercase tracking-wider">إجمالي المشتريات</th>
                        <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-purple-200 uppercase tracking-wider">عدد الطلبات</th>
                        <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-purple-200 uppercase tracking-wider">آخر زيارة</th>
                      </>
                    )}
                    {selectedReport === 'inventory' && (
                      <>
                        <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-purple-200 uppercase tracking-wider">التصنيف</th>
                        <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-purple-200 uppercase tracking-wider">المبيعات (كمية)</th>
                        <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-purple-200 uppercase tracking-wider">النسبة%</th>
                      </>
                    )}
                    {(selectedReport === 'invoices' || selectedReport === 'partial-invoices') && (
                      <>
                        <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-purple-200 uppercase tracking-wider">رقم الفاتورة</th>
                        <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-purple-200 uppercase tracking-wider">العميل</th>
                        <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-purple-200 uppercase tracking-wider">المبلغ</th>
                        <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-purple-200 uppercase tracking-wider">طريقة الدفع</th>
                        <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-purple-200 uppercase tracking-wider">التاريخ</th>
                        <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-purple-200 uppercase tracking-wider">الإجراءات</th>
                      </>
                    )}
                    {selectedReport === 'returns' && (
                      <>
                        <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-purple-200 uppercase tracking-wider">التاريخ</th>
                        <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-purple-200 uppercase tracking-wider">رقم الفاتورة</th>
                        <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-purple-200 uppercase tracking-wider">المنتج</th>
                        <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-purple-200 uppercase tracking-wider">الكمية</th>
                        <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-purple-200 uppercase tracking-wider">المبلغ</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white divide-opacity-20">
                  {(() => {
                    if ((selectedReport === 'invoices' || selectedReport === 'partial-invoices')) {
                      const data = getCurrentData();
                      if (!data || data.length === 0) {
                        return (
                          <tr>
                            <td colSpan="6" className="px-4 md:px-6 py-12 text-center text-purple-200">لا توجد بيانات متاحة</td>
                          </tr>
                        );
                      }
                      const grouped = groupInvoicesByDate(data);
                      return Object.keys(grouped).map(dateKey => (
                        <React.Fragment key={dateKey}>
                          <tr className="bg-gray-700 bg-opacity-40">
                            <td colSpan="6" className="px-4 md:px-6 py-2 text-xs font-semibold text-purple-200">
                              {dateKey}
                            </td>
                          </tr>
                          {grouped[dateKey].map((item, index) => (
                            <tr key={item.id + index} className="hover:bg-gray-700 hover:bg-opacity-20" style={{ position: 'relative' }}>
                              {/* رقم الفاتورة */}
                              <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-white font-mono">{item.id}</td>
                              {/* العميل */}
                              <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-white">{item.customer?.name || 'غير محدد'}</td>
                              {/* المبلغ */}
                              <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-green-300 font-semibold">{(Number(item.total) || 0).toLocaleString('en-US')} جنيه</td>
                              {/* طريقة الدفع */}
                              <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-white">
                                {getPaymentMethodText(item.paymentMethod)}
                                {item.downPayment?.enabled && ((item.downPayment?.remaining ?? (safeMath.subtract(item.total, item.downPayment.amount))) > 0) && (
                                  <span className="ml-2 text-xs text-yellow-300">
                                    عربون: {getPaymentMethodText(item.paymentMethod)}
                                  </span>
                                )}
                                {item.settlement && (
                                  <span className="ml-2 text-xs text-green-300">
                                    متبقي: {getPaymentMethodText(item.settlement.method)}
                                  </span>
                                )}
                              </td>
                              {/* التاريخ */}
                              <td className="px-4 md:px-6 py-4 whitespace-nowrap text-xs text-purple-200">{formatDateTime(item.timestamp || item.date || '')}</td>
                              {/* الإجراءات */}
                              <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-white">
                                <div className="flex flex-wrap gap-2" style={{ position: 'relative', zIndex: 1, pointerEvents: 'auto' }}>
                                  <button
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); soundManager.play('openWindow'); openInvoiceModal(item); }}
                                    className="text-blue-400 hover:text-blue-300 transition-all duration-200 p-2 hover:bg-blue-500 hover:bg-opacity-20 rounded-lg border border-blue-400 border-opacity-30 hover:border-opacity-60 min-w-[40px] min-h-[40px] flex items-center justify-center cursor-pointer"
                                    title="عرض التفاصيل"
                                    style={{ pointerEvents: 'auto', zIndex: 2, position: 'relative' }}
                                  >
                                    <Eye className="h-5 w-5" />
                                  </button>
                                  {item.downPayment && item.downPayment.enabled && item.downPayment.remaining > 0 && (
                                    <button
                                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); soundManager.play('cash'); openSettlementModal(item.id); }}
                                      className="text-green-400 hover:text-green-300 transition-all duration-200 p-2 hover:bg-green-500 hover:bg-opacity-20 rounded-lg border border-green-400 border-opacity-30 hover:border-opacity-60 min-w-[40px] min-h-[40px] flex items-center justify-center cursor-pointer"
                                      title="سداد المبلغ المتبقي"
                                      style={{ pointerEvents: 'auto', zIndex: 2, position: 'relative' }}
                                    >
                                      <Banknote className="h-5 w-5" />
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); soundManager.play('print'); reprintInvoice(item.id); }}
                                    className="text-purple-400 hover:text-purple-300 transition-all duration-200 p-2 hover:bg-purple-500 hover:bg-opacity-20 rounded-lg border border-purple-400 border-opacity-30 hover:border-opacity-60 min-w-[40px] min-h-[40px] flex items-center justify-center cursor-pointer"
                                    title="طباعة مرة أخرى"
                                    style={{ pointerEvents: 'auto', zIndex: 2, position: 'relative' }}
                                  >
                                    <Printer className="h-5 w-5" />
                                  </button>
                                  <button
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); soundManager.play('delete'); deleteInvoice(item.id); }}
                                    className="text-red-400 hover:text-red-300 transition-all duration-200 p-2 hover:bg-red-500 hover:bg-opacity-20 rounded-lg border border-red-400 border-opacity-30 hover:border-opacity-60 min-w-[40px] min-h-[40px] flex items-center justify-center cursor-pointer"
                                    title="حذف الفاتورة"
                                    style={{ pointerEvents: 'auto', zIndex: 2, position: 'relative' }}
                                  >
                                    <Trash2 className="h-5 w-5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ));
                    }
                    // تقارير أخرى غير الفواتير
                    const data = getCurrentData();
                    if (!data || data.length === 0) {
                      return (
                        <tr>
                          <td colSpan="6" className="px-4 md:px-6 py-12 text-center text-purple-200">لا توجد بيانات متاحة</td>
                        </tr>
                      );
                    }
                    if (selectedReport === 'sales') {
                      return data.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-700 hover:bg-opacity-20">
                          <td className="px-4 md:px-6 py-3 text-white">{row.day || row.month}</td>
                          <td className="px-4 md:px-6 py-3 text-green-300 font-semibold">{Number(row.sales || 0).toLocaleString('en-US')}</td>
                          <td className="px-4 md:px-6 py-3 text-white">{row.orders}</td>
                          <td className="px-4 md:px-6 py-3 text-white">{row.customers}</td>
                        </tr>
                      ));
                    }
                    if (selectedReport === 'products') {
                      return data.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-700 hover:bg-opacity-20">
                          <td className="px-4 md:px-6 py-3 text-white">{row.name}</td>
                          <td className="px-4 md:px-6 py-3 text-white">{row.sales}</td>
                          <td className="px-4 md:px-6 py-3 text-green-300 font-semibold">{Number(row.revenue || 0).toLocaleString('en-US')}</td>
                          <td className="px-4 md:px-6 py-3 text-white">{Number(row.profit || 0).toLocaleString('en-US')}</td>
                        </tr>
                      ));
                    }
                    if (selectedReport === 'customers') {
                      return data.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-700 hover:bg-opacity-20">
                          <td className="px-4 md:px-6 py-3 text-white">{row.name}</td>
                          <td className="px-4 md:px-6 py-3 text-green-300 font-semibold">{Number(row.totalSpent || 0).toLocaleString('en-US')}</td>
                          <td className="px-4 md:px-6 py-3 text-white">{row.orders}</td>
                          <td className="px-4 md:px-6 py-3 text-white">{row.lastVisit}</td>
                        </tr>
                      ));
                    }
                    if (selectedReport === 'inventory') {
                      const totalQty = data.reduce((s, r) => s + (Number(r.value) || 0), 0) || 1;
                      return data.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-700 hover:bg-opacity-20">
                          <td className="px-4 md:px-6 py-3 text-white">{row.name}</td>
                          <td className="px-4 md:px-6 py-3 text-white">{Number(row.value || 0).toLocaleString('en-US')}</td>
                          <td className="px-4 md:px-6 py-3 text-white">{Math.round(((Number(row.value) || 0) / totalQty) * 100)}%</td>
                        </tr>
                      ));
                    }
                    if (selectedReport === 'returns') {
                      const rows = getReturns();
                      if (!rows || rows.length === 0) {
                        return (
                          <tr>
                            <td colSpan="5" className="px-4 md:px-6 py-12 text-center text-purple-200">لا توجد مرتجعات</td>
                          </tr>
                        );
                      }
                      return rows.map((r, idx) => (
                        <tr key={idx} className="hover:bg-gray-700 hover:bg-opacity-20">
                          <td className="px-4 md:px-6 py-3 text-sm text-white">{formatDateTime(r.timestamp)}</td>
                          <td className="px-4 md:px-6 py-3 text-sm text-white">#{r.refInvoiceId}</td>
                          <td className="px-4 md:px-6 py-3 text-sm text-white">{r.item?.name || ''}</td>
                          <td className="px-4 md:px-6 py-3 text-sm text-white">{r.item?.quantity || 0}</td>
                          <td className="px-4 md:px-6 py-3 text-sm text-red-400 font-semibold">-{(Number(r.amount) || 0).toFixed(2)} جنيه</td>
                        </tr>
                      ));
                    }
                    return null;
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Details Modal - خارج الكارد الرئيسي تماماً */}
      {showInvoiceModal && selectedInvoice && selectedInvoice.id && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-start justify-center z-[9999] backdrop-blur-sm overflow-y-auto"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            padding: '20px 0',
            alignItems: 'flex-start'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeInvoiceModal();
            }
          }}
        >
          <div
            className="glass-card p-4 w-full max-w-6xl mx-4 animate-fadeInUp"
            style={{
              position: 'relative',
              zIndex: 10000,
              backgroundColor: 'rgba(17, 24, 39, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
              maxHeight: '95vh',
              overflowY: 'auto',
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(255, 255, 255, 0.3) transparent',
              minHeight: 'auto'
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white border-opacity-20">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <Receipt className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">فاتورة مبيعات</h3>
                  <p className="text-purple-200 text-xs">
                    رقم الفاتورة: <span className="text-white font-mono bg-purple-500 bg-opacity-20 px-2 py-1 rounded text-xs">#{selectedInvoice?.id || 'غير محدد'}</span>
                  </p>
                  <p className="text-purple-200 text-xs mt-1">
                    تاريخ الإنشاء: {selectedInvoice?.timestamp || 'غير محدد'}
                  </p>
                  {selectedInvoice?.downPayment && selectedInvoice.downPayment.enabled && (
                    <div className="mt-2">
                      <span className="text-orange-300 text-xs bg-orange-500 bg-opacity-20 px-2 py-1 rounded-full border border-orange-400 border-opacity-30">
                        فاتورة بعربون
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  soundManager.play('closeWindow');
                  closeInvoiceModal();
                }}
                className="text-gray-400 hover:text-white transition-all duration-200 p-3 hover:bg-red-500 hover:bg-opacity-20 rounded-xl border border-gray-600 hover:border-red-500 min-w-[40px] min-h-[40px] flex items-center justify-center cursor-pointer"
                title="إغلاق النافذة"
                style={{
                  pointerEvents: 'auto',
                  zIndex: 10,
                  position: 'relative'
                }}
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Customer Info */}
              <div className="glass-card p-3">
                <h4 className="text-base font-semibold text-white mb-3">معلومات العميل</h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-purple-200 text-sm">الاسم:</span>
                    <span className="text-white font-medium text-sm">{selectedInvoice?.customer?.name || 'غير محدد'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-200 text-sm">الهاتف:</span>
                    <span className="text-white font-medium text-sm">{selectedInvoice?.customer?.phone || 'غير محدد'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-200 text-sm">عدد المنتجات:</span>
                    <span className="text-white font-medium">{selectedInvoice?.items?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-200 text-sm">إجمالي الكمية:</span>
                    <span className="text-white font-medium text-sm">
                      {selectedInvoice?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div className="glass-card p-3">
                <h4 className="text-base font-semibold text-white mb-3">معلومات الدفع</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-purple-200 text-sm">طريقة الدفع:</span>
                    <div className="flex items-center">
                      {getPaymentMethodIcon(selectedInvoice?.paymentMethod)}
                      <span className="text-white font-medium mr-2">{getPaymentMethodText(selectedInvoice?.paymentMethod)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-200">التاريخ:</span>
                    <span className="text-white font-medium">{selectedInvoice?.timestamp || 'غير محدد'}</span>
                  </div>

                  {/* تفاصيل العربون */}
                  {selectedInvoice?.downPayment && selectedInvoice.downPayment.enabled && (
                    <div className="mt-4 p-4 bg-white bg-opacity-5 rounded-xl border border-white border-opacity-20">
                      <div className="flex items-center mb-3">
                        <DollarSign className="h-5 w-5 text-gray-300 mr-2" />
                        <h5 className="text-white font-bold text-lg">تفاصيل العربون</h5>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-2 bg-white bg-opacity-10 rounded-lg">
                          <span className="text-gray-200 font-medium">المبلغ المدفوع:</span>
                          <span className="text-white font-bold text-lg">{selectedInvoice?.downPayment?.amount || 0} جنيه</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-white bg-opacity-10 rounded-lg">
                          <span className="text-gray-200 font-medium">نوع العربون:</span>
                          <span className="text-white font-medium">
                            {selectedInvoice?.downPayment?.type === 'percentage' ? 'نسبة مئوية' : 'مبلغ ثابت'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-white bg-opacity-10 rounded-lg border border-white border-opacity-10">
                          <span className="text-gray-200 font-medium">المبلغ المتبقي:</span>
                          <span className="text-white font-bold text-lg">
                            {(() => {
                              const total = selectedInvoice?.total || 0;
                              const downPaymentAmount = selectedInvoice?.downPayment?.amount || 0;
                              const remaining = selectedInvoice?.downPayment?.remaining || (safeMath.subtract(total, downPaymentAmount));
                              return remaining.toFixed(2);
                            })()} جنيه
                          </span>
                        </div>
                        <div className="text-center mt-3">
                          <span className="text-gray-200 text-sm bg-white bg-opacity-10 px-3 py-1 rounded-full border border-white border-opacity-10">
                            فاتورة بعربون
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="glass-card p-3 mb-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-base font-semibold text-white">المنتجات</h4>
                <div className="text-purple-200 text-xs">
                  إجمالي المنتجات: {selectedInvoice?.items?.length || 0}
                </div>
              </div>
              <div
                className="overflow-x-auto overflow-y-auto"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(255, 255, 255, 0.3) transparent',
                  maxHeight: selectedInvoice?.items?.length > 5 ? '400px' : 'auto'
                }}
              >
                <table className="w-full">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b-2 border-white border-opacity-30 bg-gradient-to-r from-purple-500 to-blue-500 bg-opacity-10">
                      <th className="text-right py-2 px-2 text-purple-200 font-bold text-xs">المنتج</th>
                      <th className="text-right py-2 px-2 text-purple-200 font-bold text-xs">الفئة</th>
                      <th className="text-right py-2 px-2 text-purple-200 font-bold text-xs">الكمية</th>
                      <th className="text-right py-2 px-2 text-purple-200 font-bold text-xs">السعر</th>
                      <th className="text-right py-2 px-2 text-purple-200 font-bold text-xs">المجموع</th>
                      <th className="text-right py-2 px-2 text-purple-200 font-bold text-xs">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(enrichInvoiceItemsWithCategory(selectedInvoice)?.items || []).map((item, index) => (
                      <tr key={index} className="border-b border-white border-opacity-10 hover:bg-white hover:bg-opacity-5 transition-colors">
                        <td className="py-2 px-2 text-white font-medium text-xs">{emojiManager.getProductEmoji(item)} {item.name}</td>
                        <td className="py-2 px-2 text-purple-200 text-xs">
                          <span className="bg-purple-500 bg-opacity-20 px-2 py-1 rounded-full text-xs">
                            {item.category || 'غير محدد'}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-white text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                soundManager.play('delete');
                                decreaseItemQuantity(selectedInvoice.id, index);
                              }}
                              className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-full text-sm transition-colors duration-150 select-none"
                              title="تقليل الكمية"
                            >
                              -
                            </button>
                            <span className="bg-blue-500 bg-opacity-20 px-3 py-2 rounded-full text-sm font-bold min-w-[38px] text-center select-none">
                              {item.quantity}
                            </span>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                soundManager.play('add');
                                increaseItemQuantity(selectedInvoice.id, index);
                              }}
                              className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-full text-sm transition-colors duration-150 select-none"
                              title="زيادة الكمية"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-white font-medium text-xs">{item.price} جنيه</td>
                        <td className="py-2 px-2 text-white font-bold text-green-400 text-sm">
                          {safeMath.multiply(item.price, item.quantity)} جنيه
                        </td>
                        <td className="py-2 px-2 text-white">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              soundManager.play('delete');
                              removeItemFromInvoice(selectedInvoice.id, index);
                            }}
                            className="text-red-400 hover:text-red-300 transition-colors duration-150 p-2 hover:bg-red-500 hover:bg-opacity-20 rounded-lg border border-red-400 border-opacity-30"
                            title="حذف المنتج"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="glass-card p-3 mb-4">
              <h4 className="text-base font-semibold text-white mb-3">تفاصيل المبلغ</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-1">
                  <span className="text-purple-200 text-sm">المجموع الفرعي:</span>
                  <span className="text-white font-medium text-sm">{selectedInvoice?.subtotal || 0} جنيه</span>
                </div>

                {selectedInvoice?.discountAmount > 0 && (
                  <div className="flex justify-between items-center py-1 bg-red-500 bg-opacity-10 rounded-lg px-2">
                    <span className="text-red-200 text-sm">الخصم:</span>
                    <span className="text-red-400 font-bold text-sm">-{selectedInvoice.discountAmount} جنيه</span>
                  </div>
                )}

                {selectedInvoice?.taxAmount > 0 && (
                  <div className="flex justify-between items-center py-1 bg-white bg-opacity-10 rounded-lg px-2">
                    <span className="text-gray-200 text-sm">الضريبة:</span>
                    <span className="text-white font-bold text-sm">{selectedInvoice.taxAmount} جنيه</span>
                  </div>
                )}

                {selectedInvoice?.downPayment && selectedInvoice.downPayment.enabled && (
                  <div className="bg-white bg-opacity-5 rounded-lg p-3 space-y-2 border border-white border-opacity-10">
                    <div className="flex items-center mb-1">
                      <DollarSign className="h-3 w-3 text-gray-300 mr-2" />
                      <span className="text-white font-semibold text-sm">ملخص الدفع</span>
                    </div>
                    <div className="flex justify-between items-center p-1 bg-white bg-opacity-10 rounded-lg">
                      <span className="text-gray-200 font-medium text-sm">العربون المدفوع:</span>
                      <span className="text-white font-bold text-sm">{selectedInvoice.downPayment.amount} جنيه</span>
                    </div>
                    <div className="flex justify-between items-center p-1 bg-white bg-opacity-10 rounded-lg border border-white border-opacity-10">
                      <span className="text-orange-200 font-medium text-sm">المبلغ المتبقي:</span>
                      <span className="text-white font-bold text-sm">
                        {selectedInvoice.downPayment.remaining || (safeMath.subtract(selectedInvoice.total, selectedInvoice.downPayment.amount))} جنيه
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center border-t-2 border-white border-opacity-30 pt-2 mt-2">
                  <span className="text-white font-bold text-lg">الإجمالي النهائي:</span>
                  <span className="text-white font-bold text-xl bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
                    {selectedInvoice?.total} جنيه
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <h4 className="text-base font-semibold text-white">الإجراءات المتاحة</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    soundManager.play('delete');
                    clearAllItemsFromInvoice(selectedInvoice.id);
                  }}
                  className="btn-primary bg-gradient-to-r from-red-500 to-pink-500 text-white px-5 py-4 rounded-2xl hover:from-red-600 hover:to-pink-600 transition-colors duration-150 flex items-center justify-center min-h-[56px] cursor-pointer select-none"
                  style={{
                    pointerEvents: 'auto',
                    zIndex: 10,
                    position: 'relative',
                    transform: 'none'
                  }}
                >
                  <Trash2 className="h-5 w-5 mr-2" />
                  حذف جميع المنتجات
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    soundManager.play('print');
                    reprintInvoice(selectedInvoice.id);
                  }}
                  className="btn-primary bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-5 py-4 rounded-2xl hover:from-purple-600 hover:to-indigo-600 transition-colors duration-150 flex items-center justify-center min-h-[56px] cursor-pointer select-none"
                  style={{
                    pointerEvents: 'auto',
                    zIndex: 10,
                    position: 'relative',
                    transform: 'none'
                  }}
                >
                  <Printer className="h-5 w-5 mr-2" />
                  طباعة مرة أخرى
                </button>
                {selectedInvoice?.downPayment && selectedInvoice.downPayment.enabled && selectedInvoice.downPayment.remaining > 0 && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      soundManager.play('cash');
                      payRemainingAmount(selectedInvoice?.id);
                    }}
                    className="btn-primary bg-gradient-to-r from-green-500 to-emerald-500 text-white px-5 py-4 rounded-2xl hover:from-green-600 hover:to-emerald-600 transition-colors duration-150 flex items-center justify-center min-h-[56px] cursor-pointer select-none"
                    style={{
                      pointerEvents: 'auto',
                      zIndex: 10,
                      position: 'relative',
                      transform: 'none'
                    }}
                  >
                    <DollarSign className="h-5 w-5 mr-2" />
                    سداد باقي المبلغ
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    soundManager.play('delete');
                    deleteInvoice(selectedInvoice?.id);
                  }}
                  className="btn-primary bg-gradient-to-r from-red-500 to-pink-500 text-white px-5 py-4 rounded-2xl hover:from-red-600 hover:to-pink-600 transition-colors duration-150 flex items-center justify-center min-h-[56px] cursor-pointer select-none text-base"
                  style={{
                    pointerEvents: 'auto',
                    zIndex: 10,
                    position: 'relative',
                    transform: 'none'
                  }}
                >
                  <Trash2 className="h-5 w-5 mr-2" />
                  حذف الفاتورة
                </button>
              </div>

              {/* زر إغلاق إضافي */}
              <div className="flex justify-center mt-6 pt-4 border-t border-white border-opacity-20">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    soundManager.play('closeWindow');
                    closeInvoiceModal();
                  }}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-xl transition-all duration-200 flex items-center min-h-[40px] cursor-pointer"
                  style={{
                    pointerEvents: 'auto',
                    zIndex: 10,
                    position: 'relative'
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة التأكيد (React State Modal بدلًا من DOM Injection) */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4" style={{ zIndex: 100000, pointerEvents: 'auto' }}>
          <div className="glass-card p-6 w-full max-w-md mx-4 text-center">
            <div className="w-16 h-16 bg-red-500 bg-opacity-20 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Trash2 className="h-8 w-8 text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-4">{confirmModal.title}</h3>
            {confirmModal.content}
            <p className="text-red-300 mb-6">{confirmModal.message}</p>
            <div className="flex gap-3">
              <button
                onClick={confirmModal.onConfirm}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl transition-colors"
              >
                تأكيد
              </button>
              <button
                onClick={closeConfirmModal}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-xl transition-colors"
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
