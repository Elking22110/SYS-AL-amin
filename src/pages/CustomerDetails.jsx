import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowRight,
    User,
    Phone,
    Mail,
    Calendar,
    DollarSign,
    ShoppingCart,
    CreditCard,
    FileText,
    Trash2,
    Eye,
    Printer,
    Banknote
} from 'lucide-react';
import soundManager from '../utils/soundManager.js';
import { formatDate, getCurrentDate } from '../utils/dateUtils.js';
import safeMath from '../utils/safeMath.js';
import { publish, subscribe, EVENTS } from '../utils/observerManager';
import thermalPrinter from '../utils/thermalPrinter.js';

const CustomerDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [customer, setCustomer] = useState(null);
    const [invoices, setInvoices] = useState([]);
    const [payments, setPayments] = useState([]);
    const [activeTab, setActiveTab] = useState('invoices'); // 'invoices' | 'payments'
    
    // Settlement Modal state
    const [showSettlementModal, setShowSettlementModal] = useState(false);
    const [settleAmount, setSettleAmount] = useState('');
    const [settlementMethod, setSettlementMethod] = useState('نقدي');
    const [settlementNotes, setSettlementNotes] = useState('');

    useEffect(() => {
        loadData();

        const handleStorageChange = (e) => {
            if (e.key === 'customers' || e.key === 'sales' || e.key === 'shifts') {
                loadData();
            }
        };

        window.addEventListener('storage', handleStorageChange);
        const unsubCustomers = typeof subscribe === 'function' ? subscribe(EVENTS.CUSTOMERS_CHANGED, loadData) : null;
        const unsubInvoices = typeof subscribe === 'function' ? subscribe(EVENTS.INVOICES_CHANGED, loadData) : null;

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            if (typeof unsubCustomers === 'function') unsubCustomers();
            if (typeof unsubInvoices === 'function') unsubInvoices();
        };
    }, [id]);

    const loadData = () => {
        try {
            // Load Customer Data
            const customersData = JSON.parse(localStorage.getItem('customers') || '[]');
            const currentCustomer = customersData.find(c => (c.id || c.phone).toString() === id);
            
            if (currentCustomer) {
                setCustomer(currentCustomer);

                // Load Invoices matching this customer
                const activeSales = JSON.parse(localStorage.getItem('sales') || '[]');
                const shifts = JSON.parse(localStorage.getItem('shifts') || '[]');
                const historicalSales = shifts.flatMap(shift => shift.sales || []);

                const cleanPhone = (p) => p ? p.toString().trim().replace(/[\s\-\(\)\+]/g, '') : '';
                const customerPhoneClean = cleanPhone(currentCustomer.phone);
                
                const allInvoices = [...historicalSales, ...activeSales].filter(inv => {
                    if (!inv) return false;
                    const invCustId = inv.customer?.id || inv.customerId || inv.customer_id;
                    const currentCustId = currentCustomer.id;
                    if (invCustId && currentCustId && invCustId.toString() === currentCustId.toString()) {
                        return true;
                    }
                    const invPhoneClean = cleanPhone(inv.customer?.phone);
                    return invPhoneClean === customerPhoneClean && customerPhoneClean !== '';
                });
                
                // Sort by date descending (الأحدث أولاً)
                allInvoices.sort((a, b) => {
                    const tb = new Date(b.timestamp || b.date).getTime();
                    const ta = new Date(a.timestamp || a.date).getTime();
                    if (tb !== ta && !isNaN(tb) && !isNaN(ta)) return tb - ta;
                    return (Number(b.id) || 0) - (Number(a.id) || 0);
                });
                
                // Fallback for older invoices that lack paymentStatus
                const normalizedInvoices = allInvoices.map(inv => {
                    if (inv.paymentStatus) return inv;
                    
                    // Determine status for legacy invoices
                    let status = 'complete';
                    const remaining = inv.downPayment?.remaining != null
                        ? Number(inv.downPayment.remaining)
                        : (inv.downPayment?.enabled ? safeMath.subtract(inv.total || 0, inv.downPayment.amount || 0) : 0);
                    
                    if (inv.paymentMethod === 'deferred' || remaining > 0) {
                        status = 'partial';
                    }
                    return { ...inv, paymentStatus: status };
                });

                setInvoices(normalizedInvoices);

                // Gather Customer Payments (سجل السداد)
                const pmtList = [];
                normalizedInvoices.forEach(inv => {
                    // 1. Down Payment (عربون الفاتورة)
                    if (inv.downPayment) {
                        const dpAmount = parseFloat(inv.downPayment.amount) || 0;
                        if (dpAmount > 0) {
                            pmtList.push({
                                id: `DP-${inv.id}`,
                                date: inv.timestamp || inv.date,
                                amount: dpAmount,
                                method: inv.paymentMethod === 'cash' ? 'نقدي' : inv.paymentMethod === 'wallet' ? 'محفظة إلكترونية' : inv.paymentMethod === 'instapay' ? 'انستا باي' : inv.paymentMethod === 'deferred' ? 'آجل' : 'نقدي',
                                description: `عربون للفاتورة #${inv.id}`,
                                notes: inv.downPayment.deliveryDate ? `تاريخ التسليم: ${inv.downPayment.deliveryDate}` : ''
                            });
                        }
                    }

                    // 2. Invoice Settlements (تسويات دفعات الفاتورة المتبقية)
                    if (Array.isArray(inv.settlements)) {
                        inv.settlements.forEach((settle, sIdx) => {
                            pmtList.push({
                                id: `STL-INV-${inv.id}-${sIdx}`,
                                date: settle.timestamp,
                                amount: parseFloat(settle.amount) || 0,
                                method: settle.method || 'نقدي',
                                description: `سداد متبقي للفاتورة #${inv.id}`,
                                notes: settle.notes || ''
                            });
                        });
                    }
                    if (inv.settlement && typeof inv.settlement === 'object') {
                        const amt = parseFloat(inv.settlement.amount) || 0;
                        if (amt > 0) {
                            pmtList.push({
                                id: `STL-INV-OLD-${inv.id}`,
                                date: inv.settlement.timestamp,
                                amount: amt,
                                method: inv.settlement.method || 'نقدي',
                                description: `سداد متبقي للفاتورة #${inv.id}`,
                                notes: inv.settlement.notes || ''
                            });
                        }
                    }
                });

                // 3. General Debt Settlements from shifts
                const allShifts = [...shifts];
                const activeShift = JSON.parse(localStorage.getItem('activeShift') || 'null');
                if (activeShift) {
                    allShifts.push(activeShift);
                }

                allShifts.forEach(shift => {
                    // Extract from customerSettlements
                    if (Array.isArray(shift.customerSettlements)) {
                        shift.customerSettlements.forEach(settle => {
                            const isMatch = (settle.customerId && currentCustomer.id && settle.customerId.toString() === currentCustomer.id.toString()) ||
                                            (cleanPhone(settle.customerPhone) === customerPhoneClean && customerPhoneClean !== '');
                            if (isMatch) {
                                pmtList.push({
                                    id: settle.id || `STL-GEN-${Date.now()}-${Math.random()}`,
                                    date: settle.timestamp,
                                    amount: parseFloat(settle.amount) || 0,
                                    method: settle.method || 'نقدي',
                                    description: 'سداد مديونية عامة (حساب العميل)',
                                    notes: settle.notes || ''
                                });
                            }
                        });
                    }

                    // Extract from sales with isDebtPayment: true
                    if (Array.isArray(shift.sales)) {
                        shift.sales.forEach(sale => {
                            if (sale.isDebtPayment) {
                                const isMatch = (sale.customer?.id && currentCustomer.id && sale.customer.id.toString() === currentCustomer.id.toString()) ||
                                                (cleanPhone(sale.customer?.phone) === customerPhoneClean && customerPhoneClean !== '');
                                if (isMatch) {
                                    pmtList.push({
                                        id: sale.id || `STL-DP-${Date.now()}-${Math.random()}`,
                                        date: sale.timestamp,
                                        amount: parseFloat(sale.total) || 0,
                                        method: sale.paymentMethod === 'cash' ? 'نقدي' : sale.paymentMethod === 'wallet' ? 'محفظة إلكترونية' : sale.paymentMethod === 'instapay' ? 'انستا باي' : 'نقدي',
                                        description: 'سداد مديونية عامة (قائمة العملاء)',
                                        notes: sale.notes || ''
                                    });
                                }
                            }
                        });
                    }
                });

                // Deduplicate and Sort payments
                const uniquePaymentsMap = new Map();
                pmtList.forEach(pmt => {
                    if (pmt.id) {
                        uniquePaymentsMap.set(pmt.id, pmt);
                    }
                });
                const sortedPayments = Array.from(uniquePaymentsMap.values()).sort((a, b) => {
                    const tb = new Date(b.date).getTime();
                    const ta = new Date(a.date).getTime();
                    return tb - ta;
                });
                setPayments(sortedPayments);

            } else {
                setCustomer(null);
            }
        } catch (error) {
            console.error('Error loading customer details:', error);
        }
    };

    // Settlement logic for general customer debt
    const handleSettleDebt = () => {
        const amount = parseFloat(settleAmount);
        
        if (!amount || amount <= 0) {
            alert('الرجاء إدخال مبلغ صحيح للسداد');
            return;
        }

        if (amount > (customer.debt || 0)) {
            alert('مبلغ السداد أكبر من إجمالي المديونية');
            return;
        }

        try {
            const customersData = JSON.parse(localStorage.getItem('customers') || '[]');
            const index = customersData.findIndex(c => (c.id || c.phone).toString() === id);
            
            if (index !== -1) {
                // Update debt
                customersData[index].debt = Math.max(0, safeMath.subtract(customersData[index].debt || 0, amount));
                localStorage.setItem('customers', JSON.stringify(customersData));
                
                // Record the general settlement in activeShift
                const activeShift = JSON.parse(localStorage.getItem('activeShift') || 'null');
                if (activeShift && activeShift.status === 'active') {
                    const settlement = {
                        id: 'CUST-STL-' + Date.now(),
                        customerId: customer.id,
                        customerName: customer.name,
                        amount: amount,
                        method: settlementMethod,
                        notes: settlementNotes,
                        timestamp: new Date().toISOString(),
                        type: 'customer_debt_settlement'
                    };
                    
                    activeShift.customerSettlements = [...(activeShift.customerSettlements || []), settlement];
                    localStorage.setItem('activeShift', JSON.stringify(activeShift));
                }

                publish(EVENTS.CUSTOMERS_CHANGED, { type: 'update' });
                soundManager.play('save');
                alert(`تم سداد ${amount} ج.م بنجاح`);
                setShowSettlementModal(false);
                setSettleAmount('');
                setSettlementNotes('');
                loadData(); // refresh
            }
        } catch (error) {
            console.error('Error settling debt:', error);
            alert('حدث خطأ أثناء السداد');
        }
    };

    if (!customer) {
        return (
            <div className="min-h-screen relative flex items-center justify-center pt-20">
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-3 animate-float"></div>
                </div>
                <div className="text-slate-800 text-xl font-bold bg-white p-8 rounded-2xl shadow-xl">
                    جاري تحميل بيانات العميل... أو العميل غير موجود.
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen relative overflow-hidden pb-10">
            {/* Background Animation */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-3 animate-float"></div>
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-3 animate-float" style={{ animationDelay: '2s' }}></div>
            </div>

            <div className="relative z-10 p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6">

                {/* Header Navigation */}
                <div className="flex items-center space-x-4 mb-4 rtl:space-x-reverse">
                    <button
                        onClick={() => navigate('/customers')}
                        className="flex items-center text-blue-500 hover:text-slate-800 transition-colors bg-white bg-opacity-80 shadow-sm px-4 py-2 rounded-xl font-bold"
                    >
                        <ArrowRight className="h-5 w-5 ml-2" />
                        العودة للعملاء
                    </button>
                </div>

                {/* Customer Info Hero Details */}
                <div className="bg-white bg-opacity-90 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                    <div className="flex items-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center ml-4 shadow-lg border-4 border-white">
                            <User className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-2xl font-bold text-slate-800">{customer.name}</h1>
                                <span className={`text-xs font-bold px-3 py-1 rounded-full shadow-sm ${
                                    customer.status === 'VIP' ? 'bg-gradient-to-r from-amber-200 to-yellow-400 text-amber-900' :
                                    customer.status === 'نشط' ? 'bg-gradient-to-r from-emerald-200 to-green-400 text-emerald-900' :
                                    'bg-gradient-to-r from-slate-200 to-gray-300 text-slate-700'
                                }`}>
                                    {customer.status || 'عادي'}
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center text-sm gap-3">
                                <span className="flex items-center text-slate-600 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                                    <Phone className="h-4 w-4 ml-1 text-blue-500" /> {customer.phone}
                                </span>
                                {customer.email && (
                                    <span className="flex items-center text-slate-600 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                                        <Mail className="h-4 w-4 ml-1 text-purple-500" /> {customer.email}
                                    </span>
                                )}
                                <span className="flex items-center text-slate-600 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                                    <Calendar className="h-4 w-4 ml-1 text-green-500" /> {customer.joinDate || '-'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        {customer.debt > 0 && (
                            <button
                                onClick={() => { soundManager.play('openWindow'); setShowSettlementModal(true); }}
                                className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white flex items-center px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-green-500/30 transition-all hover:-translate-y-0.5"
                            >
                                <CreditCard className="h-5 w-5 ml-2" />
                                سداد مديونية للعميل
                            </button>
                        )}
                    </div>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
                    <div className="bg-white bg-opacity-90 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl flex flex-col items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-blue-500 opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
                        <ShoppingCart className="h-10 w-10 text-blue-500 mb-2 filter drop-shadow-sm" />
                        <p className="text-sm text-slate-500 font-bold">إجمالي المشتريات كقيمة</p>
                        <h3 className="text-2xl lg:text-3xl font-black text-slate-800 mt-1">{(customer.totalSpent || 0).toLocaleString('en-US')} ج.م</h3>
                    </div>
                    
                    <div className={`bg-white bg-opacity-90 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl flex flex-col items-center justify-center relative overflow-hidden group ${(customer.debt || 0) > 0 ? 'ring-2 ring-red-400/50' : ''}`}>
                        <div className="absolute inset-0 bg-red-500 opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
                        <DollarSign className={`h-10 w-10 mb-2 filter drop-shadow-sm ${(customer.debt || 0) > 0 ? 'text-red-500' : 'text-slate-400'}`} />
                        <p className="text-sm text-slate-500 font-bold">إجمالي المديونية (المتبقي)</p>
                        <h3 className={`text-2xl lg:text-3xl font-black mt-1 ${(customer.debt || 0) > 0 ? 'text-red-600' : 'text-slate-800'}`}>{(customer.debt || 0).toLocaleString('en-US')} ج.م</h3>
                    </div>
                    
                    <div className="bg-white bg-opacity-90 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl flex flex-col items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-purple-500 opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
                        <FileText className="h-10 w-10 text-purple-500 mb-2 filter drop-shadow-sm" />
                        <p className="text-sm text-slate-500 font-bold">عدد الفواتير</p>
                        <h3 className="text-2xl lg:text-3xl font-black text-slate-800 mt-1">{invoices.length} فاتورة</h3>
                    </div>
                </div>

                {/* Tabs Selector */}
                <div className="flex border-b border-slate-200 bg-white bg-opacity-70 p-2 rounded-2xl backdrop-blur-md shadow-md gap-2">
                    <button
                        onClick={() => setActiveTab('invoices')}
                        className={`flex-1 py-3 px-6 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                            activeTab === 'invoices'
                                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                        }`}
                    >
                        <FileText className="h-5 w-5" />
                        سجل الفواتير والمشتريات ({invoices.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('payments')}
                        className={`flex-1 py-3 px-6 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                            activeTab === 'payments'
                                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                        }`}
                    >
                        <Banknote className="h-5 w-5" />
                        سجل السداد والمدفوعات ({payments.length})
                    </button>
                </div>

                {/* Content Area */}
                {activeTab === 'invoices' ? (
                    <div className="bg-white bg-opacity-90 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl overflow-hidden">
                        <div className="p-5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center">
                                <FileText className="h-5 w-5 ml-2 text-blue-500" />
                                سجل الفواتير والمشتريات
                            </h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-right border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/80 border-b border-slate-200">
                                        <th className="px-6 py-4 text-slate-600 font-bold text-sm">رقم الفاتورة</th>
                                        <th className="px-6 py-4 text-slate-600 font-bold text-sm">التاريخ والوقت</th>
                                        <th className="px-6 py-4 text-slate-600 font-bold text-sm">طريقة الدفع</th>
                                        <th className="px-6 py-4 text-slate-600 font-bold text-sm">حالة الدفع</th>
                                        <th className="px-6 py-4 text-slate-600 font-bold text-sm">قيمة الفاتورة</th>
                                        <th className="px-6 py-4 text-slate-600 font-bold text-sm text-center">الإجراءات</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {invoices.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-12 text-center text-slate-500 font-medium">لا توجد فواتير أو مشتريات لهذا العميل حتى الآن.</td>
                                        </tr>
                                    ) : (
                                        invoices.map((inv, idx) => {
                                            const remaining = inv.downPayment?.remaining || 0;
                                            return (
                                                <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                                                    <td className="px-6 py-4 font-mono font-bold text-slate-800 text-sm">#{inv.id}</td>
                                                    <td className="px-6 py-4 text-slate-500 text-xs font-medium">{new Date(inv.timestamp || inv.date).toLocaleString('ar-EG')}</td>
                                                    <td className="px-6 py-4 text-slate-700 text-sm font-semibold">
                                                        {inv.paymentMethod === 'cash' ? 'نقدي' : inv.paymentMethod === 'deferred' ? 'آجل' : inv.paymentMethod === 'wallet' ? 'محفظة' : 'انستا باي'}
                                                        {inv.downPayment?.enabled && remaining > 0 && (
                                                            <span className="mr-2 inline-block bg-yellow-100 text-yellow-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                                                                متبقي عربون
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-700 text-sm">
                                                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                                                            inv.paymentStatus === 'complete' ? 'bg-emerald-100 text-emerald-700' :
                                                            inv.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-red-100 text-red-700'
                                                        }`}>
                                                            {inv.paymentStatus === 'complete' ? 'مكتمل' : inv.paymentStatus === 'partial' ? 'جزئي' : 'معلق'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-blue-600 font-extrabold text-sm">{(inv.total || 0).toLocaleString('en-US')} ج.م</td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex gap-2 justify-center">
                                                            <button
                                                                onClick={() => {
                                                                    navigate('/reports', { state: { openInvoiceId: inv.id, from: `/customers/${id}` } });
                                                                }}
                                                                className="px-4 py-2.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-xl text-sm font-bold hover:bg-blue-100 cursor-pointer flex items-center gap-2 transition-all duration-200"
                                                            >
                                                                <Eye className="h-5 w-5" />
                                                                عرض وتعديل
                                                            </button>

                                                            {/* زر سداد المتبقي */}
                                                            {((inv.downPayment?.enabled && remaining > 0) || (inv.paymentMethod === 'deferred' && inv.paymentStatus !== 'complete')) ? (
                                                                <button
                                                                    onClick={() => {
                                                                        navigate('/reports', { state: { settleInvoiceId: inv.id, from: `/customers/${id}` } });
                                                                    }}
                                                                    className="px-4 py-2.5 bg-green-50 text-green-600 border border-green-200 rounded-xl text-sm font-bold hover:bg-green-100 cursor-pointer flex items-center gap-2 transition-all duration-200"
                                                                    title="سداد المتبقي من الفاتورة"
                                                                >
                                                                    <Banknote className="h-5 w-5" />
                                                                    سداد المتبقي
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    className="px-4 py-2.5 bg-green-50 text-green-600 border border-green-200 rounded-xl text-sm font-bold invisible pointer-events-none flex items-center gap-2"
                                                                    aria-hidden="true"
                                                                >
                                                                    <Banknote className="h-5 w-5" />
                                                                    سداد المتبقي
                                                                </button>
                                                            )}

                                                            {/* زر الطباعة */}
                                                            <button
                                                                onClick={() => thermalPrinter.printInvoice(inv)}
                                                                className="p-3 bg-slate-50 text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-100 cursor-pointer min-w-[42px] min-h-[42px] flex items-center justify-center transition-all duration-200"
                                                                title="طباعة الفاتورة"
                                                            >
                                                                <Printer className="h-5 w-5" />
                                                            </button>

                                                            {/* زر الحذف */}
                                                            <button
                                                                onClick={() => {
                                                                    navigate('/reports', { state: { deleteInvoiceId: inv.id, from: `/customers/${id}` } });
                                                                }}
                                                                className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-xl hover:bg-red-100 cursor-pointer min-w-[42px] min-h-[42px] flex items-center justify-center transition-all duration-200"
                                                                title="حذف الفاتورة"
                                                            >
                                                                <Trash2 className="h-5 w-5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white bg-opacity-90 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl overflow-hidden">
                        <div className="p-5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center">
                                <Banknote className="h-5 w-5 ml-2 text-blue-500" />
                                سجل السداد والمدفوعات
                            </h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-right border-collapse border-spacing-0">
                                <thead>
                                    <tr className="bg-slate-50/80 border-b border-slate-200">
                                        <th className="px-6 py-4 text-slate-600 font-bold text-sm">التاريخ والوقت</th>
                                        <th className="px-6 py-4 text-slate-600 font-bold text-sm">بيان الدفعة</th>
                                        <th className="px-6 py-4 text-slate-600 font-bold text-sm">طريقة الدفع</th>
                                        <th className="px-6 py-4 text-slate-600 font-bold text-sm">المبلغ المدفوع</th>
                                        <th className="px-6 py-4 text-slate-600 font-bold text-sm">ملاحظات</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {payments.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-12 text-center text-slate-500 font-medium">لا توجد مدفوعات مسجلة لهذا العميل حتى الآن.</td>
                                        </tr>
                                    ) : (
                                        payments.map((pmt, idx) => (
                                            <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                                                <td className="px-6 py-4 text-slate-500 text-xs font-medium">
                                                    {new Date(pmt.date).toLocaleString('ar-EG')}
                                                </td>
                                                <td className="px-6 py-4 text-slate-800 text-sm font-semibold">
                                                    {pmt.description}
                                                </td>
                                                <td className="px-6 py-4 text-slate-700 text-sm font-semibold">
                                                    {pmt.method}
                                                </td>
                                                <td className="px-6 py-4 text-emerald-600 font-extrabold text-sm">
                                                    {(pmt.amount || 0).toLocaleString('en-US')} ج.م
                                                </td>
                                                <td className="px-6 py-4 text-slate-500 text-xs">
                                                    {pmt.notes || '-'}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

            </div>

            {/* General Settle Debt Modal */}
            {showSettlementModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999]">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800">تسوية مديونية العميل</h3>
                        </div>
                        
                        <div className="bg-red-50 p-4 rounded-xl mb-6 border border-red-100">
                            <p className="text-red-600 text-sm mb-1 font-bold">إجمالي المديونية الحالية</p>
                            <p className="text-3xl font-black text-red-700">
                                {Number(customer.debt || 0).toLocaleString('en-US')} <span className="text-lg">ج.م</span>
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">المبلغ المراد سداده <span className="text-red-500">*</span></label>
                                <input
                                    type="number"
                                    min="1"
                                    max={customer.debt || 0}
                                    value={settleAmount}
                                    onChange={(e) => setSettleAmount(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="أدخل المبلغ..."
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">طريقة الدفع</label>
                                <select
                                    value={settlementMethod}
                                    onChange={(e) => setSettlementMethod(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="نقدي">نقدي</option>
                                    <option value="تحويل بنكي">تحويل بنكي</option>
                                    <option value="شيك">شيك</option>
                                    <option value="محفظة إلكترونية">محفظة إلكترونية</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">ملاحظات (اختياري)</label>
                                <textarea
                                    value={settlementNotes}
                                    onChange={(e) => setSettlementNotes(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="اكتب أي تفاصيل إضافية..."
                                    rows="2"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={handleSettleDebt}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-green-200"
                            >
                                تأكيد السداد
                            </button>
                            <button
                                onClick={() => setShowSettlementModal(false)}
                                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
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

export default CustomerDetails;
