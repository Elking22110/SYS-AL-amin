import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Users,
  Package,
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  Activity,
  RefreshCw,
  Clock,
  ArrowLeftRight,
  ShieldCheck
} from 'lucide-react';
import soundManager from '../utils/soundManager.js';
import emojiManager from '../utils/emojiManager.js';
import storageOptimizer from '../utils/storageOptimizer.js';
import { formatDate, formatTimeOnly, formatWeekday, formatDateTime, getCurrentDate, getLocalDateString, getLocalDateFormatted, formatDateToDDMMYYYY } from '../utils/dateUtils.js';
import safeMath from '../utils/safeMath.js';

const Dashboard = () => {
  const navigate = useNavigate();
  const [activeShift, setActiveShift] = useState(null);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    totalCustomers: 0,
    totalProducts: 0
  });

  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [deliveryNotifications, setDeliveryNotifications] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // تحليل البيانات الحقيقية للوردية النشطة فقط
  const analyzeRealData = () => {
    try {
      const currentShift = storageOptimizer.get('activeShift', null);
      setActiveShift(currentShift);

      const products = storageOptimizer.get('products', []) || [];
      const totalProducts = products.length;

      // المنتجات منخفضة المخزون
      const lowStock = products.filter(p => p.stock <= (p.minStock || 5));

      if (!currentShift || currentShift.status !== 'active') {
        setStats({ totalSales: 0, totalOrders: 0, totalCustomers: 0, totalProducts });
        setLowStockProducts(lowStock);
        setDeliveryNotifications([]);
        setRecentOrders([]);
        return;
      }

      // مبيعات الوردية النشطة
      const allSales = storageOptimizer.get('sales', []);
      const shiftSales = allSales.filter(s => s.shiftId === currentShift.id);
      const totalSales = shiftSales.reduce((sum, sale) => safeMath.add(sum, sale.total || 0), 0);
      const totalOrders = shiftSales.length;

      // حساب عدد العملاء الفريدين في الوردية
      const customerMap = new Map();
      shiftSales.forEach(sale => {
        if (sale.customer && sale.customer.name) {
          customerMap.set(sale.customer.name, true);
        }
      });
      const totalCustomers = customerMap.size;

      // طلبات الاستلام المقررة اليوم
      const todayString = getLocalDateString();
      const deliveryOrders = shiftSales.filter(sale => {
        const hasDownPayment = sale.downPayment && sale.downPayment.enabled;
        const isToday = sale.downPayment?.deliveryDate === todayString;
        return hasDownPayment && isToday;
      });

      // آخر الطلبات في الوردية
      const recent = shiftSales
        .sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date))
        .slice(0, 5)
        .map(sale => ({
          id: sale.id,
          customer: sale.customer?.name || 'عميل نقدي',
          amount: sale.total || 0,
          time: formatTimeOnly(sale.timestamp || sale.date),
          paymentMethod: sale.paymentMethod
        }));

      setStats({
        totalSales,
        totalOrders,
        totalCustomers,
        totalProducts
      });

      setLowStockProducts(lowStock);
      setDeliveryNotifications(deliveryOrders);
      setRecentOrders(recent);
    } catch (error) {
      console.error('Error analyzing dashboard data:', error);
    }
  };

  const refreshData = () => {
    setIsRefreshing(true);
    soundManager.play('refresh');
    analyzeRealData();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  useEffect(() => {
    analyzeRealData();
    const interval = setInterval(analyzeRealData, 5000);
    return () => clearInterval(interval);
  }, []);

  const getPaymentMethodText = (method) => {
    switch (method) {
      case 'cash': return 'نقداً';
      case 'wallet': return 'محفظة';
      case 'instapay': return 'انستا باي';
      case 'bank': return 'تحويل';
      default: return method || 'غير محدد';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 relative pb-12 overflow-x-hidden">
      {/* Background shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/5 rounded-full filter blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/5 rounded-full filter blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">متجر الأمين للأدوات الصحية</h1>
            <p className="text-slate-500 text-sm mt-1">نظام إدارة المبيعات والمخزون اليومي السهل والمبسط</p>
          </div>
          <div className="flex items-center gap-3 mt-4 md:mt-0 text-right">
            <button
              onClick={refreshData}
              disabled={isRefreshing}
              className="p-2 bg-white text-slate-700 rounded-xl border border-slate-300 hover:bg-slate-50 shadow-sm cursor-pointer"
              title="تحديث البيانات"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <div>
              <div className="text-xs text-slate-500 font-semibold">تاريخ اليوم</div>
              <div className="text-slate-800 font-bold text-sm">{formatDateTime(getCurrentDate())}</div>
            </div>
          </div>
        </div>

        {/* حالة الوردية الحالية */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-right">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${activeShift ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">
                  {activeShift ? `الوردية نشطة ومفتوحة (رقم: ${activeShift.id})` : 'لا توجد وردية مفتوحة حالياً'}
                </h3>
                <p className="text-slate-500 text-xs mt-1">
                  {activeShift 
                    ? `الكاشير: ${activeShift.cashierName || 'غير محدد'} | بدأت في: ${formatTimeOnly(activeShift.startTime)}`
                    : 'يجب فتح وردية عمل جديدة لبدء عمليات البيع وتسجيل المعاملات.'}
                </p>
              </div>
            </div>
            <div>
              {activeShift ? (
                <button
                  onClick={() => { soundManager.play('click'); navigate('/pos'); }}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-sm transition-all cursor-pointer"
                >
                  فتح نقطة البيع والبدء بالبيع
                </button>
              ) : (
                <button
                  onClick={() => { soundManager.play('click'); navigate('/shifts'); }}
                  className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-sm shadow-sm transition-all cursor-pointer"
                >
                  الذهاب لصفحة الورديات لفتح وردية
                </button>
              )}
            </div>
          </div>
        </div>

        {/* إحصائيات الوردية النشطة */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-right space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-xs font-bold uppercase">مبيعات الوردية اليوم</span>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><DollarSign className="h-5 w-5" /></div>
            </div>
            <p className="text-2xl font-extrabold text-slate-800">{stats.totalSales.toLocaleString('en-US')} ج.م</p>
            <p className="text-xs text-slate-400">إجمالي المبالغ المستلمة بالوردية</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-right space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-xs font-bold uppercase">عدد فواتير الوردية</span>
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><ShoppingCart className="h-5 w-5" /></div>
            </div>
            <p className="text-2xl font-extrabold text-slate-800">{stats.totalOrders.toLocaleString('en-US')}</p>
            <p className="text-xs text-slate-400">عدد عمليات البيع المكتملة</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-right space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-xs font-bold uppercase">عملاء الوردية</span>
              <div className="p-2 bg-green-50 text-green-600 rounded-lg"><Users className="h-5 w-5" /></div>
            </div>
            <p className="text-2xl font-extrabold text-slate-800">{stats.totalCustomers}</p>
            <p className="text-xs text-slate-400">عدد العملاء الذين تم تسجيلهم اليوم</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-right space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-xs font-bold uppercase">إجمالي أصناف المحل</span>
              <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><Package className="h-5 w-5" /></div>
            </div>
            <p className="text-2xl font-extrabold text-slate-800">{stats.totalProducts.toLocaleString('en-US')}</p>
            <p className="text-xs text-slate-400">إجمالي المنتجات المسجلة بقاعدة البيانات</p>
          </div>
        </div>

        {/* الصف السفلي: التنبيهات والمعاملات الأخيرة */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* تنبيهات الاستلام (عربونات تسليم اليوم) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-right flex flex-col h-[400px]">
            <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              طلبات استلام اليوم (عربونات متبقية)
            </h4>
            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
              {deliveryNotifications.length > 0 ? (
                deliveryNotifications.map((order) => {
                  const remaining = safeMath.subtract(order.total, order.downPayment?.amount || 0);
                  return (
                    <div key={order.id} className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800 text-sm">فاتورة #{order.id}</span>
                        <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full font-bold">استلام اليوم</span>
                      </div>
                      <div className="text-xs text-slate-600">
                        <p>العميل: <strong>{order.customer?.name || 'غير محدد'}</strong></p>
                        <p>الهاتف: <strong className="font-mono">{order.customer?.phone || 'غير محدد'}</strong></p>
                        <p>المتبقي للسداد: <strong className="text-red-600">{remaining} ج.م</strong></p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-16 text-slate-400">
                  <Package className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-semibold">لا توجد طلبات تسليم عربون مجدولة لليوم</p>
                </div>
              )}
            </div>
          </div>

          {/* تنبيهات نواقص المخزون */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-right flex flex-col h-[400px]">
            <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              تنبيهات نواقص المخزون
            </h4>
            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
              {lowStockProducts.length > 0 ? (
                lowStockProducts.map((prod, idx) => (
                  <div key={idx} className="p-3 bg-red-50/40 rounded-xl border border-red-100 flex justify-between items-center text-sm">
                    <div>
                      <p className="font-bold text-slate-800">{prod.name}</p>
                      <p className="text-slate-500 text-xs mt-0.5">الحد الأدنى: {prod.minStock || 5}</p>
                    </div>
                    <div className="text-left">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${prod.stock === 0 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                        {prod.stock === 0 ? 'منتهي' : `متبقي: ${prod.stock}`}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-16 text-slate-400">
                  <Package className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-semibold">كافة المنتجات بمخزون كافٍ وممتاز</p>
                </div>
              )}
            </div>
          </div>

          {/* آخر المبيعات بالوردية */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-right flex flex-col h-[400px]">
            <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-600" />
              آخر مبيعات الوردية النشطة
            </h4>
            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
              {recentOrders.length > 0 ? (
                recentOrders.map((order, idx) => (
                  <div key={idx} className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/50 flex justify-between items-center text-sm">
                    <div className="space-y-1">
                      <p className="font-bold text-slate-800">فاتورة #{order.id}</p>
                      <p className="text-slate-500 text-xs">الوقت: {order.time} | طريقة الدفع: {getPaymentMethodText(order.paymentMethod)}</p>
                    </div>
                    <div className="text-left space-y-1">
                      <p className="font-extrabold text-blue-600">{order.amount} ج.م</p>
                      <span className="inline-block bg-green-100 text-green-800 text-[10px] px-2 py-0.5 rounded-full font-bold">مكتمل</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-16 text-slate-400">
                  <ShoppingCart className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-semibold">لم يتم إصدار أي فواتير في الوردية الحالية بعد</p>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default Dashboard;