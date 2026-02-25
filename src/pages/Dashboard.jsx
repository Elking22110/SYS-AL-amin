import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  Package,
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  BarChart3,
  PieChart,
  Activity,
  RefreshCw
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import soundManager from '../utils/soundManager.js';
import emojiManager from '../utils/emojiManager.js';
import storageOptimizer from '../utils/storageOptimizer.js';
import { formatDate, formatTimeOnly, formatWeekday, formatDateTime, getCurrentDate, getLocalDateString, getLocalDateFormatted, formatDateToDDMMYYYY } from '../utils/dateUtils.js';
import safeMath from '../utils/safeMath.js';

// مكون Tooltip مخصص لتوزيع المبيعات
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
        <p className="text-white font-semibold text-sm mb-1">{data.name}</p>
        <p className="text-blue-300 text-sm">{data.value}%</p>
      </div>
    );
  }
  return null;
};

const Dashboard = () => {
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

  // تحليل البيانات الحقيقية (محصورة على الوردية النشطة فقط)
  const analyzeRealData = () => {
    try {
      const activeShift = storageOptimizer.get('activeShift', null);
      // إن لم توجد وردية نشطة، أعرض أصفاراً ولا تستخدم مبيعات سابقة
      if (!activeShift || !activeShift.id) {
        setStats({ totalSales: 0, totalOrders: 0, totalCustomers: 0, totalProducts: (storageOptimizer.get('products', []) || []).length });
        setLowStockProducts((storageOptimizer.get('products', []) || []).filter(p => p.stock <= p.minStock));
        setDeliveryNotifications([]);
        setRecentOrders([]);
        return;
      }

      // تحليل المبيعات الخاصة بالوردية النشطة فقط (نستخدم السجل العالمي المردود لضمان التزامن مع تعديلات الفواتير)
      const allSales = storageOptimizer.get('sales', []);
      const sales = allSales.filter(s => s.shiftId === activeShift.id);
      const totalSales = sales.reduce((sum, sale) => safeMath.add(sum, sale.total || 0), 0);
      const totalOrders = sales.length;

      // تحليل العملاء
      const customerMap = new Map();
      sales.forEach(sale => {
        if (sale.customer && sale.customer.name) {
          customerMap.set(sale.customer.name, true);
        }
      });
      const totalCustomers = customerMap.size;

      // تحليل المنتجات
      const products = storageOptimizer.get('products', []);
      const totalProducts = products.length;

      // تحليل المنتجات منخفضة المخزون
      const lowStock = products.filter(p => p.stock <= p.minStock);

      // تحليل طلبات الاستلام
      const today = getLocalDateString();
      console.log('البحث عن طلبات الاستلام لليوم:', today);
      console.log('التاريخ المحلي الحالي:', new Date().toLocaleDateString('en-US'));
      console.log('جميع المبيعات:', sales);

      const deliveryOrders = sales.filter(sale => {
        const hasDownPayment = sale.downPayment && sale.downPayment.enabled;
        const hasDeliveryDate = sale.downPayment && sale.downPayment.deliveryDate;
        const isToday = hasDeliveryDate && sale.downPayment.deliveryDate === today;

        console.log('فحص المبيعة:', {
          id: sale.id,
          hasDownPayment,
          hasDeliveryDate,
          deliveryDate: sale.downPayment?.deliveryDate,
          isToday
        });

        return hasDownPayment && isToday;
      });

      console.log('طلبات الاستلام المفلترة:', deliveryOrders);

      // تحليل آخر الطلبات
      const recent = sales
        .sort((a, b) => new Date(b.date || b.timestamp) - new Date(a.date || a.timestamp))
        .slice(0, 5)
        .map(sale => ({
          id: sale.id,
          customer: sale.customer?.name || 'عميل غير محدد',
          amount: sale.total || 0,
          time: formatTimeOnly(sale.date || sale.timestamp)
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

      console.log('تم تحليل البيانات الحقيقية:');
      console.log('- إجمالي المبيعات (وردية نشطة):', totalSales);
      console.log('- إجمالي الطلبات:', totalOrders);
      console.log('- إجمالي العملاء:', totalCustomers);
      console.log('- إجمالي المنتجات:', totalProducts);
      console.log('- المنتجات منخفضة المخزون:', lowStock.length);
      console.log('- آخر الطلبات:', recent.length);
      console.log('- طلبات الاستلام اليوم:', deliveryOrders.length);

    } catch (error) {
      console.error('خطأ في تحليل البيانات:', error);
    }
  };

  // دالة تحديث البيانات يدوياً
  const refreshData = () => {
    setIsRefreshing(true);
    soundManager.play('refresh');
    analyzeRealData();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  useEffect(() => {

    analyzeRealData();

    // مراقبة تغييرات البيانات
    const handleStorageChange = () => {
      analyzeRealData();
    };

    // تحديث البيانات كل 5 ثوانٍ للتأكد من ظهور البيانات الجديدة
    const interval = setInterval(analyzeRealData, 5000);

    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // تحليل المبيعات اليومية الحقيقية
  const getDailySalesData = () => {
    try {
      const sales = JSON.parse(localStorage.getItem('sales') || '[]');
      const dailySales = {};

      sales.forEach(sale => {
        // استخدام sale.date أو sale.timestamp حسب ما هو متاح
        const saleDate = sale.date || sale.timestamp;
        const date = new Date(saleDate);
        const dayKey = formatWeekday(sale.date || sale.timestamp);

        if (!dailySales[dayKey]) {
          dailySales[dayKey] = 0;
        }
        dailySales[dayKey] = safeMath.add(dailySales[dayKey], sale.total || 0);
      });

      const days = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
      return days.map(day => ({
        day,
        sales: dailySales[day] || 0
      }));
    } catch (error) {
      console.error('خطأ في تحليل المبيعات اليومية:', error);
      return [
        { day: 'السبت', sales: 0 },
        { day: 'الأحد', sales: 0 },
        { day: 'الاثنين', sales: 0 },
        { day: 'الثلاثاء', sales: 0 },
        { day: 'الأربعاء', sales: 0 },
        { day: 'الخميس', sales: 0 },
        { day: 'الجمعة', sales: 0 }
      ];
    }
  };

  const dailySalesData = getDailySalesData();

  // تحليل توزيع المبيعات الحقيقي
  const getSalesDistributionData = () => {
    try {
      const sales = JSON.parse(localStorage.getItem('sales') || '[]');
      const categorySales = {};

      sales.forEach(sale => {
        if (sale.items) {
          sale.items.forEach(item => {
            if (!categorySales[item.category]) {
              categorySales[item.category] = 0;
            }
            categorySales[item.category] = safeMath.add(categorySales[item.category], safeMath.multiply(item.price, item.quantity));
          });
        }
      });

      const totalSales = Object.values(categorySales).reduce((sum, value) => safeMath.add(sum, value), 0);
      const colors = ['#9333ea', '#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

      return Object.entries(categorySales).map(([name, value], index) => ({
        name,
        value: totalSales > 0 ? Math.round((value / totalSales) * 100) : 0,
        color: colors[index % colors.length]
      }));
    } catch (error) {
      console.error('خطأ في تحليل توزيع المبيعات:', error);
      const categoryData = [
        { name: 'نايلون بيور', value: 0, color: '#3b82f6' }, // أزرق
        { name: 'مطبوع كسر بيور', value: 0, color: '#10b981' }, // أخضر
        { name: 'رولات', value: 0, color: '#f59e0b' }, // برتقالي
        { name: 'نايلون مميز مطبوع', value: 0, color: '#ef4444' }, // أحمر
        { name: 'إضافات تصنيع', value: 0, color: '#9333ea' }, // بنفسجي
      ];
      return categoryData;
    }
  };

  const salesDistributionData = getSalesDistributionData();

  // بيانات الإيرادات
  const revenueData = [
    { month: 'يناير', revenue: 4000, profit: 2400 },
    { month: 'فبراير', revenue: 3000, profit: 1398 },
    { month: 'مارس', revenue: 2000, profit: 9800 },
    { month: 'أبريل', revenue: 2780, profit: 3908 },
    { month: 'مايو', revenue: 1890, profit: 4800 },
    { month: 'يونيو', revenue: 2390, profit: 3800 }
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Animation */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-3 animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-3 animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-40 left-40 w-96 h-96 bg-green-500 rounded-full mix-blend-multiply filter blur-3xl opacity-3 animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="relative z-10 p-2 md:p-4 lg:p-6 xl:p-8 space-y-2 md:space-y-4 lg:space-y-6 xl:space-y-8 max-w-full overflow-x-hidden">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center animate-fadeInDown space-y-4 md:space-y-0">
          <div className="flex-1">
            <h1 className="text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold text-white mb-2 md:mb-3 bg-gradient-to-r from-white via-purple-200 to-purple-300 bg-clip-text text-transparent">
              لوحة تحكم مصنع MS GROUP Plast
            </h1>
            <p className="text-purple-200 text-xs md:text-sm lg:text-base xl:text-lg font-medium">مرحباً بك في نظام إدارة المصنع المتطور</p>
          </div>
          <div className="text-right">
            <button
              onClick={refreshData}
              disabled={isRefreshing}
              className="mb-2 p-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg transition-colors"
              title="تحديث البيانات"
            >
              <RefreshCw className={`h-4 w-4 text-white ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <div className="text-xs text-purple-300 mb-1 font-medium">آخر تحديث</div>
            <div className="text-white font-semibold text-xs md:text-sm">{formatDateTime(getCurrentDate())}</div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 ipad-grid ipad-pro-grid gap-2 md:gap-4 lg:gap-6">
          <div className="glass-card hover-lift animate-fadeInUp group cursor-pointer p-4 md:p-6 lg:p-8" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div className="flex-1">
                <p className="text-xs font-medium text-purple-200 mb-1 uppercase tracking-wide">إجمالي المبيعات</p>
                <p className="text-lg md:text-xl lg:text-2xl font-bold text-white mb-2">${stats.totalSales.toLocaleString('en-US')}</p>
                <div className="flex items-center text-xs">
                  <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-green-400 mr-1 md:mr-2" />
                  <span className="text-green-400 font-semibold">+12.5%</span>
                  <span className="text-purple-300 mr-1 md:mr-2 font-medium">من الشهر الماضي</span>
                </div>
              </div>
              <div className="p-2 md:p-3 lg:p-4 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl md:rounded-2xl group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <DollarSign className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6 text-white" />
              </div>
            </div>
          </div>

          <div className="glass-card hover-lift animate-fadeInUp group cursor-pointer p-4 md:p-6 lg:p-8" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div className="flex-1">
                <p className="text-xs font-medium text-purple-200 mb-1 uppercase tracking-wide">إجمالي الطلبات</p>
                <p className="text-lg md:text-xl lg:text-2xl font-bold text-white mb-2">{stats.totalOrders.toLocaleString('en-US')}</p>
                <div className="flex items-center text-xs">
                  <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-green-400 mr-1 md:mr-2" />
                  <span className="text-green-400 font-semibold">+8.2%</span>
                  <span className="text-purple-300 mr-1 md:mr-2 font-medium">من الشهر الماضي</span>
                </div>
              </div>
              <div className="p-2 md:p-3 lg:p-4 bg-gradient-to-r from-green-500 to-green-600 rounded-xl md:rounded-2xl group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <ShoppingCart className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6 text-white" />
              </div>
            </div>
          </div>

          <div className="glass-card hover-lift animate-fadeInUp group cursor-pointer p-4 md:p-6 lg:p-8" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div className="flex-1">
                <p className="text-xs font-medium text-purple-200 mb-1 uppercase tracking-wide">إجمالي العملاء</p>
                <p className="text-lg md:text-xl lg:text-2xl font-bold text-white mb-2">{stats.totalCustomers}</p>
                <div className="flex items-center text-xs">
                  <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-green-400 mr-1 md:mr-2" />
                  <span className="text-green-400 font-semibold">+15.3%</span>
                  <span className="text-purple-300 mr-1 md:mr-2 font-medium">من الشهر الماضي</span>
                </div>
              </div>
              <div className="p-2 md:p-3 lg:p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl md:rounded-2xl group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Users className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6 text-white" />
              </div>
            </div>
          </div>

          <div className="glass-card hover-lift animate-fadeInUp group cursor-pointer p-4 md:p-6 lg:p-8" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div className="flex-1">
                <p className="text-xs font-medium text-purple-200 mb-1 uppercase tracking-wide">إجمالي المنتجات</p>
                <p className="text-lg md:text-xl lg:text-2xl font-bold text-white mb-2">{stats.totalProducts}</p>
                <div className="flex items-center text-xs">
                  <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-green-400 mr-1 md:mr-2" />
                  <span className="text-green-400 font-semibold">+5.7%</span>
                  <span className="text-purple-300 mr-1 md:mr-2 font-medium">من الشهر الماضي</span>
                </div>
              </div>
              <div className="p-2 md:p-3 lg:p-4 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl md:rounded-2xl group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Package className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 xl:grid-cols-2 ipad-grid ipad-pro-grid gap-4 md:gap-6">
          {/* Daily Sales Chart */}
          <div className="glass-card hover-lift animate-fadeInLeft" style={{ animationDelay: '0.5s' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">المبيعات اليومية</h3>
              <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dailySalesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="day" stroke="rgba(255,255,255,0.7)" />
                <YAxis stroke="rgba(255,255,255,0.7)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '12px',
                    color: 'white'
                  }}
                />
                <Bar dataKey="sales" fill="url(#gradient)" radius={[8, 8, 0, 0]} />
                <defs>
                  <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9333ea" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Delivery Notifications moved here instead of sales distribution */}
          <div className="glass-card hover-lift animate-fadeInRight" style={{ animationDelay: '0.6s' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">تنبيهات الاستلام</h3>
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg animate-pulse-custom">
                <Package className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="space-y-4">
              {deliveryNotifications.length > 0 ? (
                deliveryNotifications.map((order, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-blue-500 bg-opacity-20 rounded-xl hover:bg-opacity-30 transition-all duration-300 group border border-blue-500 border-opacity-30">
                    <div>
                      <p className="font-semibold text-white group-hover:text-blue-200 transition-colors">
                        {order.customer?.name || 'عميل غير محدد'}
                      </p>
                      <p className="text-sm text-blue-200">
                        {order.customer?.phone || 'لا يوجد رقم هاتف'}
                      </p>
                      <p className="text-xs text-blue-300">فاتورة رقم: {order.id}</p>
                      <p className="text-xs text-blue-400">تاريخ الاستلام: {formatDateToDDMMYYYY(order.downPayment?.deliveryDate)}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-white">فاتورة #{order.invoiceId || order.id}</h4>
                        <p className="font-bold text-green-400">{order.total} جنيه</p>
                      </div>
                      {order.downPayment?.enabled && (
                        <p className="text-sm text-yellow-300">متبقي: {(safeMath.subtract(order.total, order.downPayment?.amount || 0)).toFixed(2)} جنيه</p>
                      )}  <p className="text-xs text-blue-400 bg-blue-500 bg-opacity-30 px-2 py-1 rounded-full">استلام اليوم</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-400">لا توجد طلبات استلام اليوم</p>
                  <p className="text-xs text-gray-500 mt-2">اليوم: {getLocalDateFormatted()}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="glass-card hover-lift animate-fadeInUp" style={{ animationDelay: '0.9s' }}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white">الإيرادات والأرباح</h3>
            <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg">
              <Activity className="h-6 w-6 text-white" />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="month" stroke="rgba(255,255,255,0.7)" />
              <YAxis stroke="rgba(255,255,255,0.7)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  color: 'white'
                }}
              />
              <Area type="monotone" dataKey="revenue" stackId="1" stroke="#6366f1" fill="#6366f1" fillOpacity={0.6} />
              <Area type="monotone" dataKey="profit" stackId="1" stroke="#9333ea" fill="#9333ea" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 ipad-grid ipad-pro-grid gap-6">
          {/* Recent Orders */}
          <div className="glass-card hover-lift animate-fadeInUp" style={{ animationDelay: '0.7s' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">آخر الطلبات</h3>
              <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg">
                <Activity className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="space-y-4">
              {recentOrders.map((order, index) => (
                <div key={order.id} className="flex items-center justify-between p-4 bg-white bg-opacity-10 rounded-xl hover:bg-opacity-20 transition-all duration-300 group">
                  <div>
                    <p className="font-semibold text-white group-hover:text-purple-200 transition-colors">{order.customer}</p>
                    <p className="text-sm text-purple-200">{order.time}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-white text-lg">${order.amount}</p>
                    <p className="text-xs text-green-400 bg-green-500 bg-opacity-20 px-2 py-1 rounded-full">مكتمل</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Notifications removed here (تم نقلها لأعلى) */}

          {/* Low Stock Alert */}
          <div className="glass-card hover-lift animate-fadeInUp" style={{ animationDelay: '1.0s' }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">تنبيهات المخزون</h3>
              <div className="p-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg animate-pulse-custom">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="space-y-4">
              {lowStockProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-orange-500 bg-opacity-20 rounded-xl hover:bg-opacity-30 transition-all duration-300 group border border-orange-500 border-opacity-30">
                  <div>
                    <p className="font-semibold text-white group-hover:text-orange-200 transition-colors">{product.name}</p>
                    <p className="text-sm text-orange-200">الحد الأدنى: {product.minStock}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-lg ${product.stock === 0 ? 'text-red-400' : 'text-orange-300'}`}>
                      {product.stock} متبقي
                    </p>
                    <p className="text-xs text-orange-400 bg-orange-500 bg-opacity-30 px-2 py-1 rounded-full">مخزون منخفض</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;