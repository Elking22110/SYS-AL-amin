import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  ClipboardList,
  FileText,
  Search,
  Edit,
  Trash2,
  Eye,
  Printer,
  Banknote,
  User,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  ShoppingCart,
  Star,
  Filter,
  Download,
  Upload
} from 'lucide-react';
import soundManager from '../utils/soundManager.js';
import { formatDate, formatTimeOnly, getCurrentDate } from '../utils/dateUtils.js';
import { publish, subscribe, EVENTS } from '../utils/observerManager';
import safeMath from '../utils/safeMath.js';
import thermalPrinter from '../utils/thermalPrinter.js';

const Customers = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('الكل');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    type: 'عميل عادي',
    debt: 0
  });

  const [selectedType, setSelectedType] = useState('الكل');
  const [settlingCustomer, setSettlingCustomer] = useState(null);
  const [settleAmount, setSettleAmount] = useState('');

  const statuses = ['الكل', 'نشط', 'VIP', 'جديد', 'غير نشط'];

  // تحميل العملاء من التخزين المحلي مباشرة دون حسابات معقدة ومكررة
  useEffect(() => {
    const loadCustomers = () => {
      try {
        const savedCustomers = JSON.parse(localStorage.getItem('customers') || '[]');

        // تحديث حالة العميل التلقائي
        const updatedCustomers = savedCustomers.map(customer => {
          let status = customer.status;
          if (customer.totalSpent >= 5000) {
            status = 'VIP';
          } else if (customer.totalSpent >= 2000) {
            status = 'نشط';
          } else if (customer.orders === 1) {
            status = 'جديد';
          }
          return { ...customer, status };
        });

        setCustomers(updatedCustomers);
        console.log('تم تحميل العملاء:', updatedCustomers.length, 'عميل');
      } catch (error) {
        console.error('خطأ في تحميل العملاء:', error);
        setCustomers([]);
      }
    };

    loadCustomers();

    // مراقبة تغييرات العملاء
    const handleStorageChange = (e) => {
      if (e.key === 'customers') {
        loadCustomers();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    const unsubCustomers = typeof subscribe === 'function' ? subscribe(EVENTS.CUSTOMERS_CHANGED, loadCustomers) : null;

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      if (typeof unsubCustomers === 'function') unsubCustomers();
    };
  }, []);

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'الكل' || customer.status === selectedStatus;
    const matchesType = selectedType === 'الكل' || (customer.type || 'عميل عادي') === selectedType;
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleAddCustomer = () => {
    if (newCustomer.name && newCustomer.phone) {
      const customer = {
        id: Date.now(),
        ...newCustomer,
        totalSpent: 0,
        orders: 0,
        lastVisit: getCurrentDate().split('T')[0],
        joinDate: getCurrentDate().split('T')[0],
        status: 'جديد'
      };
      const updatedCustomers = [...customers, customer];
      setCustomers(updatedCustomers);

      // حفظ العملاء في localStorage
      localStorage.setItem('customers', JSON.stringify(updatedCustomers));

      // نشر حدث تغيير العملاء
      publish(EVENTS.CUSTOMERS_CHANGED, {
        type: 'create',
        customer: customer,
        customers: updatedCustomers
      });

      setNewCustomer({
        name: '',
        phone: '',
        email: '',
        address: '',
        type: 'عميل عادي',
        debt: 0
      });
      setShowAddModal(false);
    }
  };

  const handleEditCustomer = (customer) => {
    setEditingCustomer(customer);
    setNewCustomer({
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      type: customer.type || 'عميل عادي',
      debt: customer.debt || 0
    });
    setShowAddModal(true);
  };

  const handleUpdateCustomer = () => {
    if (editingCustomer && newCustomer.name && newCustomer.phone) {
      const updatedCustomer = {
        ...editingCustomer,
        ...newCustomer
      };
      const updatedCustomers = customers.map(c => String(c.id) === String(editingCustomer.id) ? updatedCustomer : c);
      setCustomers(updatedCustomers);

      // حفظ العملاء في localStorage
      localStorage.setItem('customers', JSON.stringify(updatedCustomers));

      // نشر حدث تغيير العملاء
      publish(EVENTS.CUSTOMERS_CHANGED, {
        type: 'update',
        customer: updatedCustomer,
        customers: updatedCustomers
      });

      setEditingCustomer(null);
      setNewCustomer({
        name: '',
        phone: '',
        email: '',
        address: '',
        type: 'عميل عادي',
        debt: 0
      });
      setShowAddModal(false);
    }
  };

  const handleSettleDebt = () => {
    if (settlingCustomer && settleAmount) {
      const amount = parseFloat(settleAmount) || 0;
      if (amount <= 0) {
        alert('يرجى إدخال مبلغ صحيح أكبر من الصفر');
        return;
      }
      
      const currentDebt = settlingCustomer.debt || 0;
      const newDebt = Math.max(0, safeMath.subtract(currentDebt, amount));

      const updatedCustomer = {
        ...settlingCustomer,
        debt: newDebt
      };

      const updatedCustomers = customers.map(c => String(c.id) === String(settlingCustomer.id) ? updatedCustomer : c);
      setCustomers(updatedCustomers);
      localStorage.setItem('customers', JSON.stringify(updatedCustomers));

      // تسجيل الدفعة في الوردية النشطة لضمان دقة الحسابات
      try {
        const activeShift = JSON.parse(localStorage.getItem('activeShift') || 'null');
        if (activeShift && activeShift.status === 'active') {
          const debtPaymentRecord = {
            id: 'DP-' + Date.now(),
            isDebtPayment: true,
            total: amount,
            paymentMethod: 'cash', // الافتراضي نقدي من شاشة العملاء
            timestamp: new Date().toISOString(),
            shiftId: activeShift.id,
            customer: settlingCustomer
          };
          activeShift.sales = [...(activeShift.sales || []), debtPaymentRecord];
          localStorage.setItem('activeShift', JSON.stringify(activeShift));
          window.dispatchEvent(new CustomEvent('dataUpdated', { detail: { type: 'shift' } }));
        }
      } catch (err) {
        console.error('Error logging debt payment to shift:', err);
      }

      publish(EVENTS.CUSTOMERS_CHANGED, {
        type: 'update',
        customer: updatedCustomer,
        customers: updatedCustomers
      });

      alert(`تم سداد مبلغ ${amount.toLocaleString('en-US')} ج.م. المديونية المتبقية: ${newDebt.toLocaleString('en-US')} ج.م`);
      setSettlingCustomer(null);
      setSettleAmount('');
    }
  };

  const handleDeleteCustomer = (id) => {
    if (window.confirm('هل أنت متأكد من حذف هذا العميل؟')) {
      const updatedCustomers = customers.filter(c => String(c.id) !== String(id));
      setCustomers(updatedCustomers);

      // حفظ العملاء في localStorage
      localStorage.setItem('customers', JSON.stringify(updatedCustomers));

      // نشر حدث تغيير العملاء
      publish(EVENTS.CUSTOMERS_CHANGED, {
        type: 'delete',
        customerId: id,
        customers: updatedCustomers
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'VIP': return 'bg-purple-100 text-purple-800';
      case 'نشط': return 'bg-green-100 text-green-800';
      case 'جديد': return 'bg-blue-100 text-blue-800';
      case 'غير نشط': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const topCustomers = customers
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5);

  // الاشتراك في أحداث تغيير العملاء من صفحات أخرى
  useEffect(() => {
    const reloadCustomers = () => {
      const savedCustomers = JSON.parse(localStorage.getItem('customers') || '[]');
      setCustomers(savedCustomers);
      console.log('🔄 تم إعادة تحميل العملاء:', savedCustomers.length);
    };

    // الاشتراك في أحداث تغيير العملاء
    const unsubscribe = subscribe(EVENTS.CUSTOMERS_CHANGED, (payload) => {
      console.log('📨 استقبال حدث تغيير العملاء:', payload);
      reloadCustomers();
    });

    // الاشتراك في أحداث استيراد البيانات
    const unsubscribeImport = subscribe(EVENTS.DATA_IMPORTED, (payload) => {
      if (payload.includes?.('customers')) {
        console.log('📨 استقبال حدث استيراد العملاء');
        reloadCustomers();
      }
    });

    return () => {
      unsubscribe();
      unsubscribeImport();
    };
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Animation */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-3 animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-3 animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-40 left-40 w-96 h-96 bg-green-500 rounded-full mix-blend-multiply filter blur-3xl opacity-3 animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="relative z-10 p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center animate-fadeInDown space-y-4 md:space-y-0">
          <div className="flex-1">
            <h1 className="text-sm md:text-base lg:text-lg xl:text-xl font-bold text-slate-900 mb-2 md:mb-3">
              إدارة العملاء
            </h1>
            <p className="text-slate-600 text-xs md:text-xs lg:text-sm xl:text-sm font-medium">إدارة بيانات عملاء متجر الأمين للأدوات الصحية</p>
          </div>
          <button
            onClick={() => { soundManager.play('openWindow'); setShowAddModal(true); }}
            className="btn-primary flex items-center px-3 md:px-4 py-2 md:py-3 text-xs md:text-xs lg:text-sm font-semibold"
          >
            <Plus className="h-4 w-4 md:h-5 md:w-5 mr-2 md:mr-3" />
            إضافة عميل جديد
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 lg:gap-6 xl:gap-8">
          <div className="glass-card hover-lift animate-fadeInUp group cursor-pointer p-4 md:p-6 lg:p-8" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div className="flex-1">
                <p className="text-xs md:text-sm font-medium text-slate-600 mb-1 md:mb-2 uppercase tracking-wide">إجمالي العملاء</p>
                <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-800 mb-2 md:mb-3">{customers.length}</p>
                <div className="flex items-center text-xs md:text-sm">
                  <span className="text-blue-300 font-medium">عملاء مسجلون</span>
                </div>
              </div>
              <div className="p-3 md:p-4 lg:p-5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl md:rounded-3xl group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <User className="h-6 w-6 md:h-8 md:w-8 lg:h-10 lg:w-10 text-slate-800" />
              </div>
            </div>
          </div>

          <div className="glass-card hover-lift animate-fadeInUp group cursor-pointer p-4 md:p-6 lg:p-8" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div className="flex-1">
                <p className="text-xs md:text-sm font-medium text-slate-600 mb-1 md:mb-2 uppercase tracking-wide">عملاء VIP</p>
                <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-800 mb-2 md:mb-3">
                  {customers.filter(c => c.status === 'VIP').length}
                </p>
                <div className="flex items-center text-xs md:text-sm">
                  <span className="text-slate-500 font-medium">عملاء مميزون</span>
                </div>
              </div>
              <div className="p-3 md:p-4 lg:p-5 bg-gradient-to-r from-purple-500 to-violet-500 rounded-2xl md:rounded-3xl group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Star className="h-6 w-6 md:h-8 md:w-8 lg:h-10 lg:w-10 text-slate-800" />
              </div>
            </div>
          </div>

          <div className="glass-card hover-lift animate-fadeInUp group cursor-pointer p-4 md:p-6 lg:p-8" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div className="flex-1">
                <p className="text-xs md:text-sm font-medium text-slate-600 mb-1 md:mb-2 uppercase tracking-wide">متوسط قيمة المشتريات</p>
                <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-800 mb-2 md:mb-3">
                  {Math.round(customers.reduce((total, c) => safeMath.add(total, c.totalSpent), 0) / (customers.length || 1)).toLocaleString('en-US')} ج.م
                </p>
                <div className="flex items-center text-xs md:text-sm">
                  <span className="text-green-300 font-medium">متوسط المشتريات</span>
                </div>
              </div>
              <div className="p-3 md:p-4 lg:p-5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl md:rounded-3xl group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <DollarSign className="h-6 w-6 md:h-8 md:w-8 lg:h-10 lg:w-10 text-slate-800" />
              </div>
            </div>
          </div>

          <div className="glass-card hover-lift animate-fadeInUp group cursor-pointer p-4 md:p-6 lg:p-8" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div className="flex-1">
                <p className="text-xs md:text-sm font-medium text-slate-600 mb-1 md:mb-2 uppercase tracking-wide">مديونيات العملاء المستحقة</p>
                <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-red-400 mb-2 md:mb-3">
                  {customers.reduce((sum, c) => safeMath.add(sum, c.debt || 0), 0).toLocaleString('en-US')} ج.م
                </p>
                <div className="flex items-center text-xs md:text-sm">
                  <span className="text-red-300 font-medium">إجمالي ديون العملاء آجل</span>
                </div>
              </div>
              <div className="p-3 md:p-4 lg:p-5 bg-gradient-to-r from-red-500 to-rose-500 rounded-2xl md:rounded-3xl group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <DollarSign className="h-6 w-6 md:h-8 md:w-8 lg:h-10 lg:w-10 text-slate-800" />
              </div>
            </div>
          </div>
        </div>

        {/* Top Customers */}
        <div className="glass-card hover-lift animate-fadeInUp mb-4 md:mb-6" style={{ animationDelay: '0.5s' }}>
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h3 className="text-lg font-bold text-slate-800">أفضل العملاء</h3>
            <div className="p-2 bg-gradient-to-r from-purple-500 to-violet-500 rounded-lg">
              <Star className="h-6 w-6 text-slate-800" />
            </div>
          </div>
          <div className="space-y-3">
            {topCustomers.map((customer, index) => (
              <div key={customer.id} className="flex items-center justify-between p-4 bg-white bg-opacity-10 rounded-lg hover:bg-opacity-20 transition-all duration-300">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center mr-4 shadow-lg">
                    <span className="text-slate-800 font-bold text-sm">{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-lg">{customer.name}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Phone className="h-3 w-3 text-green-600" />
                      <p className="text-sm text-green-800 font-semibold bg-green-500 bg-opacity-20 px-2.5 py-1 rounded-full">{customer.phone}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-emerald-800 bg-emerald-500 bg-opacity-20 px-3 py-1 rounded-full">
                    {customer.totalSpent.toLocaleString('en-US')} ج.م
                  </div>
                  <div className="text-xs text-orange-800 font-semibold bg-orange-500 bg-opacity-20 px-2.5 py-1 rounded-full mt-1">
                    {customer.orders} طلب
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="glass-card hover-lift animate-fadeInUp mb-4 md:mb-6" style={{ animationDelay: '0.6s' }}>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-400 h-5 w-5" />
              <input
                type="text"
                placeholder="البحث بالاسم أو الهاتف أو البريد الإلكتروني..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-3 text-right bg-white bg-opacity-10 border border-blue-500 border-opacity-30 rounded-lg text-slate-800 placeholder-blue-300 focus:outline-none focus:border-blue-400 focus:border-opacity-60"
              />
            </div>

            <div className="relative">
              <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-600 h-5 w-5" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="pr-10 pl-4 py-3 text-right appearance-none bg-white bg-opacity-10 border border-purple-500 border-opacity-30 rounded-lg text-slate-800 focus:outline-none focus:border-purple-400 focus:border-opacity-60"
              >
                {statuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div className="relative">
              <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-indigo-400 h-5 w-5" />
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="pr-10 pl-4 py-3 text-right appearance-none bg-white bg-opacity-10 border border-indigo-500 border-opacity-30 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-400 focus:border-opacity-60"
              >
                {['الكل', 'عميل عادي', 'صنايعي', 'تاجر'].map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <button className="bg-gradient-to-r from-gray-600 to-gray-700 text-slate-800 px-4 py-3 rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-300 flex items-center border border-gray-500 border-opacity-30 hover:scale-105">
              <Download className="h-5 w-5 mr-2" />
              تصدير
            </button>

            <button className="bg-gradient-to-r from-green-600 to-emerald-600 text-slate-800 px-4 py-3 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-300 flex items-center border border-green-500 border-opacity-30 hover:scale-105">
              <Upload className="h-5 w-5 mr-2" />
              استيراد
            </button>
          </div>
        </div>

        {/* Customers Table */}
        <div className="glass-card hover-lift animate-fadeInUp overflow-hidden table-enhanced" style={{ animationDelay: '0.7s' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="px-4 md:px-6 py-3 text-right text-xs font-bold text-slate-800 uppercase tracking-wider">العميل</th>
                  <th className="px-4 md:px-6 py-3 text-right text-xs font-bold text-slate-800 uppercase tracking-wider">نوع العميل</th>
                  <th className="px-4 md:px-6 py-3 text-right text-xs font-bold text-slate-800 uppercase tracking-wider">معلومات الاتصال</th>
                  <th className="px-4 md:px-6 py-3 text-right text-xs font-bold text-slate-800 uppercase tracking-wider">المديونية</th>
                  <th className="px-4 md:px-6 py-3 text-right text-xs font-bold text-slate-800 uppercase tracking-wider">إجمالي المشتريات</th>
                  <th className="px-4 md:px-6 py-3 text-right text-xs font-bold text-slate-800 uppercase tracking-wider">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white divide-opacity-20">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-white hover:bg-opacity-10 transition-colors">
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center space-x-3 space-x-reverse">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
                          <User className="h-5 w-5 text-slate-800" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-800">{customer.name}</div>
                          <div className="text-xs text-blue-800 font-semibold bg-blue-500 bg-opacity-20 px-2 py-1 rounded-full inline-block mt-1">
                            انضم: {customer.joinDate}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap text-right">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-full ${
                        customer.type === 'صنايعي' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                        customer.type === 'تاجر' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                        'bg-slate-100 text-slate-800 border border-slate-200'
                      }`}>
                        {customer.type || 'عميل عادي'}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap text-right">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <Phone className="h-4 w-4 text-green-600" />
                          <div className="text-sm font-semibold text-green-800 bg-green-500 bg-opacity-20 px-2 py-1 rounded-full">
                            {customer.phone}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <Mail className="h-4 w-4 text-purple-600" />
                          <div className="text-sm font-semibold text-purple-800 bg-purple-500 bg-opacity-20 px-2 py-1 rounded-full">
                            {customer.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                          (customer.debt || 0) > 0 ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-slate-100 text-slate-800 border border-slate-200'
                        }`}>
                          {(customer.debt || 0).toLocaleString('en-US')} ج.م
                        </span>
                        {(customer.debt || 0) > 0 && (
                          <button
                            onClick={() => { soundManager.play('openWindow'); setSettlingCustomer(customer); setSettleAmount(''); }}
                            className="text-xs bg-red-600 text-slate-800 font-extrabold px-2.5 py-1 rounded hover:bg-red-700 transition-colors cursor-pointer"
                            title="تسوية مديونية العميل"
                          >
                            سداد
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-bold text-emerald-800 bg-emerald-500 bg-opacity-20 px-3 py-1 rounded-full inline-block">
                        {(customer.totalSpent || 0).toLocaleString('en-US')} ج.م
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                      <div className="flex space-x-2 space-x-reverse items-center">
                        <button
                          onClick={() => { soundManager.play('openWindow'); navigate(`/customers/${customer.id || customer.phone}`); }}
                          className="text-emerald-600 hover:text-emerald-500 transition-colors p-2.5 hover:bg-emerald-500 hover:bg-opacity-20 rounded-xl min-w-[42px] min-h-[42px] flex items-center justify-center cursor-pointer"
                          title="سجل العميل"
                        >
                          <ClipboardList className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => { soundManager.play('update'); handleEditCustomer(customer); }}
                          className="text-blue-400 hover:text-blue-300 transition-colors p-2.5 hover:bg-blue-500 hover:bg-opacity-20 rounded-xl min-w-[42px] min-h-[42px] flex items-center justify-center cursor-pointer"
                          title="تعديل العميل"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => { soundManager.play('delete'); handleDeleteCustomer(customer.id); }}
                          className="text-red-400 hover:text-red-300 transition-colors p-2.5 hover:bg-red-500 hover:bg-opacity-20 rounded-xl min-w-[42px] min-h-[42px] flex items-center justify-center cursor-pointer"
                          title="حذف العميل"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Add/Edit Customer Modal - خارج الكارد الرئيسي تماماً */}
      
      {/* نافذة تسوية المديونية */}
      {settlingCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[9999] backdrop-blur-sm">
          <div className="bg-white p-6 w-full max-w-sm mx-4 border border-slate-200 rounded-2xl shadow-2xl">
            <h3 className="text-lg font-bold text-slate-800 mb-2">سداد مديونية العميل</h3>
            <p className="text-slate-600 text-sm mb-4">العميل: <strong className="text-slate-800">{settlingCustomer.name}</strong></p>
            
            <div className="bg-slate-50 p-4 rounded-xl mb-4 border border-slate-200">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600 font-semibold">المديونية الحالية:</span>
                <span className="text-red-400 font-bold text-base">{(settlingCustomer.debt || 0).toLocaleString('en-US')} ج.م</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">المبلغ المدفوع (جنيه):</label>
                <input
                  type="number"
                  autoFocus
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="input-modern w-full px-3 py-2 text-right"
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => { soundManager.play('closeWindow'); setSettlingCustomer(null); setSettleAmount(''); }}
                className="px-4 py-2 text-slate-500 hover:text-slate-700 transition-colors font-semibold"
              >
                إلغاء
              </button>
              <button
                onClick={() => { soundManager.play('save'); handleSettleDebt(); }}
                className="btn-primary px-4 py-2"
                disabled={!settleAmount || parseFloat(settleAmount) <= 0}
              >
                تأكيد سداد
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[9999] backdrop-blur-sm"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999
          }}
        >
          <div
            className="bg-white p-6 w-full max-w-md mx-4 animate-fadeInUp rounded-2xl shadow-2xl border border-slate-200"
            style={{
              position: 'relative',
              zIndex: 10000,
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >

            <h2 className="text-xl font-bold text-slate-800 mb-4">
              {editingCustomer ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">اسم العميل</label>
                <input
                  type="text"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  className="input-modern w-full px-3 py-2 text-right"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">رقم الهاتف</label>
                <input
                  type="tel"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  className="input-modern w-full px-3 py-2 text-right"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  className="input-modern w-full px-3 py-2 text-right"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">تصنيف العميل</label>
                <select
                  value={newCustomer.type}
                  onChange={(e) => setNewCustomer({ ...newCustomer, type: e.target.value })}
                  className="input-modern w-full px-3 py-2 text-right"
                >
                  <option value="عميل عادي">عميل عادي</option>
                  <option value="صنايعي">صنايعي</option>
                  <option value="تاجر">تاجر</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">المديونية الابتدائية (جنيه)</label>
                <input
                  type="number"
                  value={newCustomer.debt}
                  onChange={(e) => setNewCustomer({ ...newCustomer, debt: parseFloat(e.target.value) || 0 })}
                  className="input-modern w-full px-3 py-2 text-right"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">العنوان</label>
                <textarea
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  rows={3}
                  className="input-modern w-full px-3 py-2 text-right"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  soundManager.play('closeWindow');
                  setShowAddModal(false);
                  setEditingCustomer(null);
                  setNewCustomer({
                    name: '',
                    phone: '',
                    email: '',
                    address: '',
                    type: 'عميل عادي',
                    debt: 0
                  });
                }}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={() => { soundManager.play('save'); editingCustomer ? handleUpdateCustomer() : handleAddCustomer(); }}
                className="btn-primary px-4 py-2"
              >
                {editingCustomer ? 'تحديث' : 'إضافة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
