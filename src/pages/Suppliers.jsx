import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  User,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  ShoppingCart,
  Star,
  Filter,
  Download,
  Upload,
  FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import soundManager from '../utils/soundManager.js';
import { formatDate, formatTimeOnly, getCurrentDate } from '../utils/dateUtils.js';
import { publish, subscribe, EVENTS } from '../utils/observerManager';
import safeMath from '../utils/safeMath.js';

const Suppliers = () => {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('الكل');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });

  const statuses = ['الكل', 'نشط', 'VIP', 'جديد', 'غير نشط'];

  // تحميل الموردين المحفوظين لضمان عدم التصفير بعد نهاية الوردية
  useEffect(() => {
    const loadSuppliers = () => {
      try {
        const savedSuppliers = JSON.parse(localStorage.getItem('suppliers') || '[]');
        if (Array.isArray(savedSuppliers) && savedSuppliers.length > 0) {
          setSuppliers(savedSuppliers);
        } else {
          setSuppliers([]);
        }
      } catch (error) {
        console.error('خطأ في تحميل الموردين:', error);
        setSuppliers([]);
      }
    };

    loadSuppliers();

    // مراقبة التغييرات المحلية
    const handleStorageChange = () => {
      loadSuppliers();
    };

    window.addEventListener('storage', handleStorageChange);
    const unsubInvoices = typeof subscribe === 'function' ? subscribe('SUPPLIERS_CHANGED', loadSuppliers) : null;


    return () => {
      window.removeEventListener('storage', handleStorageChange);
      if (typeof unsubInvoices === 'function') unsubInvoices();
      if (typeof unsubShifts === 'function') unsubShifts();
    };
  }, []);

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.phone.includes(searchTerm) ||
      supplier.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'الكل' || supplier.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const handleAddSupplier = () => {
    if (newSupplier.name && newSupplier.phone) {
      const supplier = {
        id: Date.now(),
        ...newSupplier,
        totalSpent: 0,
        orders: 0,
        lastVisit: getCurrentDate().split('T')[0],
        joinDate: getCurrentDate().split('T')[0],
        status: 'جديد'
      };
      const updatedSuppliers = [...suppliers, supplier];
      setSuppliers(updatedSuppliers);

      // حفظ الموردين في localStorage
      localStorage.setItem('suppliers', JSON.stringify(updatedSuppliers));

      // نشر حدث تغيير الموردين
      publish('SUPPLIERS_CHANGED', {
        type: 'create',
        supplier: supplier,
        suppliers: updatedSuppliers
      });

      setNewSupplier({
        name: '',
        phone: '',
        email: '',
        address: ''
      });
      setShowAddModal(false);
    }
  };

  const handleEditSupplier = (supplier) => {
    setEditingSupplier(supplier);
    setNewSupplier({
      name: supplier.name,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address
    });
    setShowAddModal(true);
  };

  const handleUpdateSupplier = () => {
    if (editingSupplier && newSupplier.name && newSupplier.phone) {
      const updatedSupplier = {
        ...editingSupplier,
        ...newSupplier
      };
      const updatedSuppliers = suppliers.map(c => c.id === editingSupplier.id ? updatedSupplier : c);
      setSuppliers(updatedSuppliers);

      // حفظ الموردين في localStorage
      localStorage.setItem('suppliers', JSON.stringify(updatedSuppliers));

      // نشر حدث تغيير الموردين
      publish('SUPPLIERS_CHANGED', {
        type: 'update',
        supplier: updatedSupplier,
        suppliers: updatedSuppliers
      });

      setEditingSupplier(null);
      setNewSupplier({
        name: '',
        phone: '',
        email: '',
        address: ''
      });
      setShowAddModal(false);
    }
  };

  const handleDeleteSupplier = (id) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المورد؟')) {
      const updatedSuppliers = suppliers.filter(c => c.id !== id);
      setSuppliers(updatedSuppliers);

      // حفظ الموردين في localStorage
      localStorage.setItem('suppliers', JSON.stringify(updatedSuppliers));

      // نشر حدث تغيير الموردين
      publish('SUPPLIERS_CHANGED', {
        type: 'delete',
        supplierId: id,
        suppliers: updatedSuppliers
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

  const topSuppliers = suppliers
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5);

  // الاشتراك في أحداث تغيير الموردين من صفحات أخرى
  useEffect(() => {
    const reloadSuppliers = () => {
      const savedSuppliers = JSON.parse(localStorage.getItem('suppliers') || '[]');
      setSuppliers(savedSuppliers);
      console.log('🔄 تم إعادة تحميل الموردين:', savedSuppliers.length);
    };

    // الاشتراك في أحداث تغيير الموردين
    const unsubscribe = subscribe('SUPPLIERS_CHANGED', (payload) => {
      console.log('📨 استقبال حدث تغيير الموردين:', payload);
      reloadSuppliers();
    });

    // الاشتراك في أحداث استيراد البيانات
    const unsubscribeImport = subscribe(EVENTS.DATA_IMPORTED, (payload) => {
      if (payload.includes?.('suppliers')) {
        console.log('📨 استقبال حدث استيراد الموردين');
        reloadSuppliers();
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
            <h1 className="text-sm md:text-base lg:text-lg xl:text-xl font-bold text-white mb-2 md:mb-3 bg-gradient-to-r from-white via-purple-200 to-purple-300 bg-clip-text text-transparent">
              إدارة الموردين
            </h1>
            <p className="text-purple-200 text-xs md:text-xs lg:text-sm xl:text-sm font-medium">إدارة بيانات ومحفوظات الموردين للمصنع</p>
          </div>
          <button
            onClick={() => { soundManager.play('openWindow'); setShowAddModal(true); }}
            className="btn-primary flex items-center px-3 md:px-4 py-2 md:py-3 text-xs md:text-xs lg:text-sm font-semibold"
          >
            <Plus className="h-4 w-4 md:h-5 md:w-5 mr-2 md:mr-3" />
            إضافة مورد جديد
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 lg:gap-6 xl:gap-8">
          <div className="glass-card hover-lift animate-fadeInUp group cursor-pointer p-4 md:p-6 lg:p-8" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div className="flex-1">
                <p className="text-xs md:text-sm font-medium text-purple-200 mb-1 md:mb-2 uppercase tracking-wide">إجمالي الموردين</p>
                <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2 md:mb-3">{suppliers.length}</p>
                <div className="flex items-center text-xs md:text-sm">
                  <span className="text-blue-300 font-medium">موردون مسجلون</span>
                </div>
              </div>
              <div className="p-3 md:p-4 lg:p-5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl md:rounded-3xl group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <User className="h-6 w-6 md:h-8 md:w-8 lg:h-10 lg:w-10 text-white" />
              </div>
            </div>
          </div>

          <div className="glass-card hover-lift animate-fadeInUp group cursor-pointer p-4 md:p-6 lg:p-8" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div className="flex-1">
                <p className="text-xs md:text-sm font-medium text-purple-200 mb-1 md:mb-2 uppercase tracking-wide">موردين VIP</p>
                <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2 md:mb-3">
                  {suppliers.filter(c => c.status === 'VIP').length}
                </p>
                <div className="flex items-center text-xs md:text-sm">
                  <span className="text-purple-300 font-medium">موردون مميزون</span>
                </div>
              </div>
              <div className="p-3 md:p-4 lg:p-5 bg-gradient-to-r from-purple-500 to-violet-500 rounded-2xl md:rounded-3xl group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Star className="h-6 w-6 md:h-8 md:w-8 lg:h-10 lg:w-10 text-white" />
              </div>
            </div>
          </div>

          <div className="glass-card hover-lift animate-fadeInUp group cursor-pointer p-4 md:p-6 lg:p-8" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div className="flex-1">
                <p className="text-xs md:text-sm font-medium text-purple-200 mb-1 md:mb-2 uppercase tracking-wide">متوسط قيمة المشتريات</p>
                <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2 md:mb-3">
                  ${Math.round(suppliers.reduce((total, c) => safeMath.add(total, c.totalSpent), 0) / (suppliers.length || 1))}
                </p>
                <div className="flex items-center text-xs md:text-sm">
                  <span className="text-green-300 font-medium">متوسط المشتريات</span>
                </div>
              </div>
              <div className="p-3 md:p-4 lg:p-5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl md:rounded-3xl group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <DollarSign className="h-6 w-6 md:h-8 md:w-8 lg:h-10 lg:w-10 text-white" />
              </div>
            </div>
          </div>

          <div className="glass-card hover-lift animate-fadeInUp group cursor-pointer p-4 md:p-6 lg:p-8" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div className="flex-1">
                <p className="text-xs md:text-sm font-medium text-purple-200 mb-1 md:mb-2 uppercase tracking-wide">موردون جدد هذا الشهر</p>
                <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2 md:mb-3">
                  {suppliers.filter(c => c.status === 'جديد').length}
                </p>
                <div className="flex items-center text-xs md:text-sm">
                  <span className="text-orange-300 font-medium">موردون جدد</span>
                </div>
              </div>
              <div className="p-3 md:p-4 lg:p-5 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl md:rounded-3xl group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Calendar className="h-6 w-6 md:h-8 md:w-8 lg:h-10 lg:w-10 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Top Suppliers */}
        <div className="glass-card hover-lift animate-fadeInUp mb-4 md:mb-6" style={{ animationDelay: '0.5s' }}>
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h3 className="text-lg font-bold text-white">أفضل الموردين</h3>
            <div className="p-2 bg-gradient-to-r from-purple-500 to-violet-500 rounded-lg">
              <Star className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="space-y-3">
            {topSuppliers.map((supplier, index) => (
              <div key={supplier.id} className="flex items-center justify-between p-4 bg-white bg-opacity-10 rounded-lg hover:bg-opacity-20 transition-all duration-300">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center mr-4 shadow-lg">
                    <span className="text-white font-bold text-sm">{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-bold text-white text-lg">{supplier.name}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Phone className="h-3 w-3 text-green-400" />
                      <p className="text-sm text-green-300 font-medium bg-green-500 bg-opacity-20 px-2 py-1 rounded-full">{supplier.phone}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-emerald-400 bg-emerald-500 bg-opacity-20 px-3 py-1 rounded-full">
                    ${supplier.totalSpent}
                  </div>
                  <div className="text-xs text-orange-300 bg-orange-500 bg-opacity-20 px-2 py-1 rounded-full mt-1">
                    {supplier.orders} طلب
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
                className="w-full pr-10 pl-4 py-3 text-right bg-white bg-opacity-10 border border-blue-500 border-opacity-30 rounded-lg text-white placeholder-blue-300 focus:outline-none focus:border-blue-400 focus:border-opacity-60"
              />
            </div>

            <div className="relative">
              <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-400 h-5 w-5" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="pr-10 pl-4 py-3 text-right appearance-none bg-white bg-opacity-10 border border-purple-500 border-opacity-30 rounded-lg text-white focus:outline-none focus:border-purple-400 focus:border-opacity-60"
              >
                {statuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <button className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-4 py-3 rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-300 flex items-center border border-gray-500 border-opacity-30 hover:scale-105">
              <Download className="h-5 w-5 mr-2" />
              تصدير
            </button>

            <button className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-3 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-300 flex items-center border border-green-500 border-opacity-30 hover:scale-105">
              <Upload className="h-5 w-5 mr-2" />
              استيراد
            </button>
          </div>
        </div>

        {/* Suppliers Table */}
        <div className="glass-card hover-lift animate-fadeInUp overflow-hidden table-enhanced" style={{ animationDelay: '0.7s' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-800 to-gray-900">
                <tr>
                  <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-blue-300 uppercase tracking-wider">المورد</th>
                  <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-green-300 uppercase tracking-wider">معلومات الاتصال</th>
                  <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-emerald-300 uppercase tracking-wider">إجمالي المشتريات</th>
                  <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-orange-300 uppercase tracking-wider">عدد الطلبات</th>
                  <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-cyan-300 uppercase tracking-wider">آخر زيارة</th>
                  <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-purple-300 uppercase tracking-wider">الحالة</th>
                  <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white divide-opacity-20">
                {filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-white hover:bg-opacity-10 transition-colors">
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center ml-3 shadow-lg">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white">{supplier.name}</div>
                          <div className="text-xs text-blue-300 bg-blue-500 bg-opacity-20 px-2 py-1 rounded-full inline-block mt-1">
                            انضم: {supplier.joinDate}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-green-400" />
                          <div className="text-sm font-semibold text-green-300 bg-green-500 bg-opacity-20 px-2 py-1 rounded-full">
                            {supplier.phone}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-purple-400" />
                          <div className="text-sm font-medium text-purple-300 bg-purple-500 bg-opacity-20 px-2 py-1 rounded-full">
                            {supplier.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-emerald-400 bg-emerald-500 bg-opacity-20 px-3 py-1 rounded-full inline-block">
                        ${supplier.totalSpent}
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-orange-400 bg-orange-500 bg-opacity-20 px-3 py-1 rounded-full inline-block">
                        {supplier.orders} طلب
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-cyan-300 bg-cyan-500 bg-opacity-20 px-3 py-1 rounded-full inline-block">
                        {supplier.lastVisit}
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(supplier.status)}`}>
                        {supplier.status}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => { soundManager.play('update'); handleEditSupplier(supplier); }}
                          className="text-blue-400 hover:text-blue-300 transition-colors p-2 hover:bg-blue-500 hover:bg-opacity-20 rounded-lg"
                          title="تعديل المورد"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => { soundManager.play('openWindow'); navigate(`/suppliers/${supplier.id}`); }}
                          className="text-emerald-400 hover:text-emerald-300 transition-colors p-2 hover:bg-emerald-500 hover:bg-opacity-20 rounded-lg"
                          title="عرض التفاصيل والتوريدات"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => { soundManager.play('delete'); handleDeleteSupplier(supplier.id); }}
                          className="text-red-400 hover:text-red-300 transition-colors p-2 hover:bg-red-500 hover:bg-opacity-20 rounded-lg"
                          title="حذف المورد"
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Add/Edit Supplier Modal - خارج الكارد الرئيسي تماماً */}
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
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              soundManager.play('closeWindow');
              setShowAddModal(false);
              setEditingSupplier(null);
              setNewSupplier({
                name: '',
                phone: '',
                email: '',
                address: ''
              });
            }
          }}
        >
          <div
            className="glass-card p-6 w-full max-w-md mx-4 animate-fadeInUp"
            style={{
              position: 'relative',
              zIndex: 10000,
              backgroundColor: 'rgba(17, 24, 39, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <h2 className="text-xl font-bold text-white mb-4">
              {editingSupplier ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-purple-200 mb-1">اسم المورد</label>
                <input
                  type="text"
                  value={newSupplier.name}
                  onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                  className="input-modern w-full px-3 py-2 text-right"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-purple-200 mb-1">رقم الهاتف</label>
                <input
                  type="tel"
                  value={newSupplier.phone}
                  onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                  className="input-modern w-full px-3 py-2 text-right"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-purple-200 mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={newSupplier.email}
                  onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                  className="input-modern w-full px-3 py-2 text-right"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-purple-200 mb-1">العنوان</label>
                <textarea
                  value={newSupplier.address}
                  onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
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
                  setEditingSupplier(null);
                  setNewSupplier({
                    name: '',
                    phone: '',
                    email: '',
                    address: ''
                  });
                }}
                className="px-4 py-2 text-purple-200 hover:text-white transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={() => { soundManager.play('save'); editingSupplier ? handleUpdateSupplier() : handleAddSupplier(); }}
                className="btn-primary px-4 py-2"
              >
                {editingSupplier ? 'تحديث' : 'إضافة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Suppliers;
