import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowRight,
    User,
    Phone,
    Mail,
    Calendar,
    DollarSign,
    Package,
    Plus,
    CreditCard,
    FileText,
    Trash2,
    AlertTriangle
} from 'lucide-react';
import soundManager from '../utils/soundManager.js';
import { formatDate, getCurrentDate } from '../utils/dateUtils.js';
import safeMath from '../utils/safeMath.js';
import { publish, subscribe, EVENTS } from '../utils/observerManager';

const SupplierDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [supplier, setSupplier] = useState(null);
    const [supplies, setSupplies] = useState([]);
    const [payments, setPayments] = useState([]);

    // Modals state
    const [showSupplyModal, setShowSupplyModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    // Forms state
    const [newSupply, setNewSupply] = useState({
        productName: '',
        quantity: '',
        unitPrice: '',
        paidAmount: '0'
    });

    const [newPayment, setNewPayment] = useState({
        amount: '',
        paymentMethod: 'نقدي',
        notes: ''
    });

    const [activeTab, setActiveTab] = useState('supplies'); // 'supplies' or 'payments'

    useEffect(() => {
        loadData();

        // Listen to changes (if needed)
        return () => { };
    }, [id]);

    const loadData = () => {
        // Load Supplier Data
        const suppliersData = JSON.parse(localStorage.getItem('suppliers') || '[]');
        const currentSupplier = suppliersData.find(s => s.id.toString() === id);
        if (currentSupplier) {
            setSupplier(currentSupplier);
        }

        // Load Supplies
        const allSupplies = JSON.parse(localStorage.getItem('supplier_supplies') || '[]');
        const supplierSupplies = allSupplies.filter(s => s.supplierId.toString() === id);
        setSupplies(supplierSupplies.sort((a, b) => b.id - a.id));

        // Load Payments
        const allPayments = JSON.parse(localStorage.getItem('supplier_payments') || '[]');
        const supplierPayments = allPayments.filter(p => p.supplierId.toString() === id);
        setPayments(supplierPayments.sort((a, b) => b.id - a.id));
    };

    const calculateTotalSuppliesValue = () => {
        return supplies.reduce((total, s) => safeMath.add(total, s.totalPrice), 0);
    };

    const calculateTotalPaid = () => {
        const paidFromSupplies = supplies.reduce((total, s) => safeMath.add(total, s.paidAmount || 0), 0);
        const paidFromPayments = payments.reduce((total, p) => safeMath.add(total, p.amount || 0), 0);
        return safeMath.add(paidFromSupplies, paidFromPayments);
    };

    const totalRemaining = safeMath.subtract(calculateTotalSuppliesValue(), calculateTotalPaid());

    // Handle adding a new supply
    const handleAddSupply = () => {
        if (!newSupply.productName || !newSupply.quantity || !newSupply.unitPrice) {
            alert("يرجى ملء جميع الحقول المطلوبة للتوريدة");
            return;
        }

        const qty = parseFloat(newSupply.quantity);
        const price = parseFloat(newSupply.unitPrice);
        const paid = parseFloat(newSupply.paidAmount || 0);

        if (isNaN(qty) || qty <= 0 || isNaN(price) || price <= 0 || isNaN(paid) || paid < 0) {
            alert("يرجى إدخال قيم رقمية صحيحة");
            return;
        }

        const totalPrice = safeMath.multiply(qty, price);

        const supply = {
            id: Date.now(),
            supplierId: id,
            date: getCurrentDate().split('T')[0],
            productName: newSupply.productName,
            quantity: qty,
            unitPrice: price,
            totalPrice: totalPrice,
            paidAmount: paid,
            remainingAmount: safeMath.subtract(totalPrice, paid),
            remainingQuantity: qty, // Added to track raw material consumption separately from financial balance
            wasteQuantity: 0 // Initialize waste to 0
        };

        const allSupplies = JSON.parse(localStorage.getItem('supplier_supplies') || '[]');
        allSupplies.push(supply);
        localStorage.setItem('supplier_supplies', JSON.stringify(allSupplies));

        // Auto-create Product in POS Catalog
        const productsData = JSON.parse(localStorage.getItem('products') || '[]');
        // We'll create a unique product per supply or update if same name exists
        // Here, creating a new product per supply is better for the Supply Link feature, 
        // but to avoid clutter we can also just create it with a unique ID matching the supply ID
        const newProduct = {
            id: `supply_${supply.id}`,
            name: newSupply.productName,
            price: price, // Base raw price
            costPrice: price, // For profit calc
            stock: qty,
            category: 'خامات توريد', // default category
            isSupplyProduct: true,
            supplyId: supply.id,
            supplierId: id,
            barcode: '',
            status: 'active'
        };
        productsData.push(newProduct);
        localStorage.setItem('products', JSON.stringify(productsData));
        publish('PRODUCTS_CHANGED', { type: 'add' });

        // Update supplier global stats
        updateSupplierStats(id, totalPrice);

        soundManager.play('save');
        setShowSupplyModal(false);
        setNewSupply({ productName: '', quantity: '', unitPrice: '', paidAmount: '0' });
        loadData();
    };

    // Handle adding a payment
    const handleAddPayment = () => {
        if (!newPayment.amount) {
            alert("يرجى إدخال مبلغ الدفعة");
            return;
        }

        const amount = parseFloat(newPayment.amount);
        if (isNaN(amount) || amount <= 0) {
            alert("يرجى إدخال مبلغ صحيح");
            return;
        }

        if (amount > totalRemaining) {
            alert("لا يمكن سداد مبلغ أكبر من إجمالي المديونية.");
            return;
        }

        const payment = {
            id: Date.now(),
            supplierId: id,
            date: getCurrentDate().split('T')[0],
            amount: amount,
            paymentMethod: newPayment.paymentMethod,
            notes: newPayment.notes
        };

        const allPayments = JSON.parse(localStorage.getItem('supplier_payments') || '[]');
        allPayments.push(payment);
        localStorage.setItem('supplier_payments', JSON.stringify(allPayments));

        publish(EVENTS.SUPPLIERS_CHANGED, { type: 'add_payment' });

        soundManager.play('save');
        setShowPaymentModal(false);
        setNewPayment({ amount: '', paymentMethod: 'نقدي', notes: '' });
        loadData();
    };

    const handleDeleteSupply = (supplyId) => {
        if (window.confirm('هل أنت متأكد من حذف هذه التوريدة؟ سيتم أيضاً خصمها من الإجمالي.')) {
            const allSupplies = JSON.parse(localStorage.getItem('supplier_supplies') || '[]');
            const supplyToDelete = allSupplies.find(s => s.id === supplyId);

            if (supplyToDelete) {
                const filteredSupplies = allSupplies.filter(s => s.id !== supplyId);
                localStorage.setItem('supplier_supplies', JSON.stringify(filteredSupplies));

                // Remove linked product if exists
                const productsData = JSON.parse(localStorage.getItem('products') || '[]');
                const filteredProducts = productsData.filter(p => p.supplyId !== supplyId);
                localStorage.setItem('products', JSON.stringify(filteredProducts));
                publish('PRODUCTS_CHANGED', { type: 'delete' });

                // Refill supplier stats (subtraction)
                updateSupplierStats(id, -supplyToDelete.totalPrice);

                soundManager.play('delete');
                loadData();
            }
        }
    };

    const handleDeletePayment = (paymentId) => {
        if (window.confirm('هل أنت متأكد من حذف هذه الدفعة المالية؟')) {
            const allPayments = JSON.parse(localStorage.getItem('supplier_payments') || '[]');
            const filteredPayments = allPayments.filter(p => p.id !== paymentId);
            localStorage.setItem('supplier_payments', JSON.stringify(filteredPayments));

            publish(EVENTS.SUPPLIERS_CHANGED, { type: 'delete_payment' });

            soundManager.play('delete');
            loadData();
        }
    };

    const updateSupplierStats = (supplierId, additionalSpent) => {
        const suppliersData = JSON.parse(localStorage.getItem('suppliers') || '[]');
        const index = suppliersData.findIndex(s => s.id.toString() === supplierId);
        if (index !== -1) {
            const s = suppliersData[index];
            // If positive we add an order count (+1) and add to totalSpent, 
            // If negative we subtract an order count (-1) and subtract from totalSpent.
            s.totalSpent = Math.max(0, safeMath.add(s.totalSpent || 0, additionalSpent));
            if (additionalSpent > 0) {
                s.orders = (s.orders || 0) + 1;
            } else {
                s.orders = Math.max(0, (s.orders || 1) - 1);
            }
            suppliersData[index] = s;
            localStorage.setItem('suppliers', JSON.stringify(suppliersData));

            // Update local state supplier and trigger event
            setSupplier(s);
            publish(EVENTS.SUPPLIERS_CHANGED, { type: 'update' });
        }
    };

    if (!supplier) {
        return (
            <div className="min-h-screen relative flex items-center justify-center pt-20">
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-3 animate-float"></div>
                </div>
                <div className="text-slate-800 text-xl">جاري تحميل بيانات المورد... أو المورد غير موجود.</div>
            </div>
        );
    }

    // Calculated supply total inside new supply modal
    const newSupplyQty = parseFloat(newSupply.quantity) || 0;
    const newSupplyPrice = parseFloat(newSupply.unitPrice) || 0;
    const newSupplyTotal = safeMath.multiply(newSupplyQty, newSupplyPrice);
    const newSupplyPaid = parseFloat(newSupply.paidAmount) || 0;
    const newSupplyRemaining = safeMath.subtract(newSupplyTotal, newSupplyPaid);

    return (
        <div className="min-h-screen relative overflow-hidden pb-10">
            {/* Background Animation */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-3 animate-float"></div>
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-3 animate-float" style={{ animationDelay: '2s' }}></div>
            </div>

            <div className="relative z-10 p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6">

                {/* Header Navigation */}
                <div className="flex items-center space-x-4 mb-4 rtl:space-x-reverse">
                    <button
                        onClick={() => navigate('/suppliers')}
                        className="flex items-center text-blue-300 hover:text-slate-800 transition-colors bg-white bg-opacity-10 p-2 rounded-lg"
                    >
                        <ArrowRight className="h-5 w-5 ml-2" />
                        العودة للموردين
                    </button>
                </div>

                {/* Supplier Info Hero Details */}
                <div className="glass-card p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 animate-fadeInUp">
                    <div className="flex items-center">
                        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center ml-4 shadow-lg">
                            <User className="h-8 w-8 text-slate-800" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 mb-2">{supplier.name}</h1>
                            <div className="flex flex-wrap items-center text-sm gap-3">
                                <span className="flex items-center bg-green-500 bg-opacity-20 text-green-300 px-3 py-1 rounded-full">
                                    <Phone className="h-4 w-4 ml-1" /> {supplier.phone}
                                </span>
                                {supplier.email && (
                                    <span className="flex items-center bg-purple-500 bg-opacity-20 text-purple-300 px-3 py-1 rounded-full">
                                        <Mail className="h-4 w-4 ml-1" /> {supplier.email}
                                    </span>
                                )}
                                <span className="flex items-center bg-blue-500 bg-opacity-20 text-blue-300 px-3 py-1 rounded-full">
                                    <Calendar className="h-4 w-4 ml-1" /> انضم: {supplier.joinDate}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className={`px-4 py-2 font-bold rounded-full ${totalRemaining > 0 ? 'bg-red-500 bg-opacity-20 text-red-400' : 'bg-green-500 bg-opacity-20 text-green-400'
                            }`}>
                            المتبقي (الديون): {totalRemaining.toLocaleString('en-US')} ج.م
                        </span>
                    </div>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
                    <div className="glass-card p-6 flex flex-col items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-blue-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                        <DollarSign className="h-10 w-10 text-blue-400 mb-2" />
                        <p className="text-sm text-blue-200">إجمالي التوريدات كقيمة</p>
                        <h3 className="text-2xl lg:text-3xl font-bold text-slate-800 mt-1">{calculateTotalSuppliesValue().toLocaleString('en-US')} ج.م</h3>
                    </div>
                    <div className="glass-card p-6 flex flex-col items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-green-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                        <CreditCard className="h-10 w-10 text-green-400 mb-2" />
                        <p className="text-sm text-green-200">إجمالي المدفوع للمورد</p>
                        <h3 className="text-2xl lg:text-3xl font-bold text-slate-800 mt-1">{calculateTotalPaid().toLocaleString('en-US')} ج.م</h3>
                    </div>
                    <div className="glass-card p-6 flex flex-col items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-orange-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                        <Package className="h-10 w-10 text-orange-400 mb-2" />
                        <p className="text-sm text-orange-200">عدد التوريدات القادمة</p>
                        <h3 className="text-2xl lg:text-3xl font-bold text-slate-800 mt-1">{supplies.length}</h3>
                    </div>
                </div>

                {/* Action Buttons & Tabs Header */}
                <div className="flex flex-col md:flex-row justify-between items-center glass-card p-4 animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
                    <div className="flex space-x-2 rtl:space-x-reverse mb-4 md:mb-0">
                        <button
                            onClick={() => setActiveTab('supplies')}
                            className={`px-4 py-2 rounded-lg font-bold transition-all ${activeTab === 'supplies' ? 'bg-blue-600 text-slate-800' : 'text-blue-200 hover:bg-white hover:bg-opacity-10'}`}
                        >
                            سجل التوريدات
                        </button>
                        <button
                            onClick={() => setActiveTab('payments')}
                            className={`px-4 py-2 rounded-lg font-bold transition-all ${activeTab === 'payments' ? 'bg-green-600 text-slate-800' : 'text-green-200 hover:bg-white hover:bg-opacity-10'}`}
                        >
                            سجل المدفوعات (السداد)
                        </button>
                    </div>
                    <div className="flex space-x-3 rtl:space-x-reverse">
                        <button
                            onClick={() => { soundManager.play('openWindow'); setShowSupplyModal(true); }}
                            className="btn-primary flex items-center px-4 py-2"
                        >
                            <Plus className="h-5 w-5 ml-2" />
                            إضافة توريدة
                        </button>
                        <button
                            onClick={() => {
                                if (totalRemaining <= 0) {
                                    alert('لا توجد مديونية مستحقة لهذا المورد لسدادها.');
                                    return;
                                }
                                soundManager.play('openWindow');
                                setShowPaymentModal(true);
                            }}
                            className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-slate-800 flex items-center px-4 py-2 rounded-lg font-bold shadow-lg"
                        >
                            <CreditCard className="h-5 w-5 ml-2" />
                            سداد دفعة
                        </button>
                    </div>
                </div>

                {/* Content area based on active tab */}
                <div className="animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
                    {activeTab === 'supplies' && (
                        <div className="glass-card overflow-hidden table-enhanced">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gradient-to-r from-gray-800 to-gray-900">
                                        <tr>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">التاريخ</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-blue-300 uppercase tracking-wider">المنتج</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-orange-300 uppercase tracking-wider">الكمية</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-green-300 uppercase tracking-wider">السعر / الوحدة</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-800 uppercase tracking-wider">الإجمالي</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-emerald-300 uppercase tracking-wider">المدفوع</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-red-300 uppercase tracking-wider">المتبقي</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-purple-300 uppercase tracking-wider">الهالك</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">إجراء</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white divide-opacity-20">
                                        {supplies.map(supply => (
                                            <tr key={supply.id} className="hover:bg-white hover:bg-opacity-10 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{supply.date}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-300">{supply.productName}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-300">{supply.quantity} كجم</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-300">{supply.unitPrice.toLocaleString('en-US')} ج.م</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-800 bg-white bg-opacity-5 rounded-md">{supply.totalPrice.toLocaleString('en-US')} ج.م</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-300">{supply.paidAmount.toLocaleString('en-US')} ج.م</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-red-300">{supply.remainingAmount.toLocaleString('en-US')} ج.م</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-400 bg-red-900 bg-opacity-20 rounded-md">
                                                    {supply.wasteQuantity || 0} كجم
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <button
                                                        onClick={() => handleDeleteSupply(supply.id)}
                                                        className="text-red-400 hover:text-red-300 hover:bg-red-500 hover:bg-opacity-20 p-2 rounded-lg transition-colors"
                                                        title="حذف التوريدة"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {supplies.length === 0 && (
                                            <tr>
                                                <td colSpan="8" className="px-6 py-8 text-center text-slate-500">لا توجد توريدات مسجلة لهذا المورد بعد.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'payments' && (
                        <div className="glass-card overflow-hidden table-enhanced">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gradient-to-r from-gray-800 to-gray-900">
                                        <tr>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">رقم العملية</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">التاريخ</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-green-300 uppercase tracking-wider">المبلغ المسدد</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-blue-300 uppercase tracking-wider">طريقة الدفع</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-purple-300 uppercase tracking-wider">ملاحظات</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">إجراء</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white divide-opacity-20">
                                        {payments.map(payment => (
                                            <tr key={payment.id} className="hover:bg-white hover:bg-opacity-10 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">#{payment.id.toString().slice(-6)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{payment.date}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-400 bg-green-500 bg-opacity-10 rounded-md">
                                                    {payment.amount.toLocaleString('en-US')} ج.م
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-300 bg-blue-500 bg-opacity-10 rounded-full inline-flex mt-2 ml-4">
                                                    {payment.paymentMethod}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-purple-200">{payment.notes || '-'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <button
                                                        onClick={() => handleDeletePayment(payment.id)}
                                                        className="text-red-400 hover:text-red-300 hover:bg-red-500 hover:bg-opacity-20 p-2 rounded-lg transition-colors"
                                                        title="حذف الدفعة"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {payments.length === 0 && (
                                            <tr>
                                                <td colSpan="6" className="px-6 py-8 text-center text-slate-500">لا توجد دفعات مالية مسجلة مسبقاً لهذا المورد.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

            </div>

            {/* Add Supply Modal */}
            {showSupplyModal && (
                <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[9999] backdrop-blur-sm">
                    <div className="glass-card p-6 w-full max-w-lg mx-4 animate-fadeInUp">
                        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
                            <Package className="h-6 w-6 ml-2 text-blue-400" />
                            إضافة توريدة جديدة
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-purple-200 mb-1">اسم المنتج</label>
                                <input
                                    type="text"
                                    placeholder="مثال: قطن مصري فاخر"
                                    value={newSupply.productName}
                                    onChange={(e) => setNewSupply({ ...newSupply, productName: e.target.value })}
                                    className="input-modern w-full px-3 py-2 text-right"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-purple-200 mb-1">الكمية بالكيلو (كجم)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={newSupply.quantity}
                                        onChange={(e) => setNewSupply({ ...newSupply, quantity: e.target.value })}
                                        className="input-modern w-full px-3 py-2 text-right direction-ltr"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-purple-200 mb-1">سعر الكيلو</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={newSupply.unitPrice}
                                        onChange={(e) => setNewSupply({ ...newSupply, unitPrice: e.target.value })}
                                        className="input-modern w-full px-3 py-2 text-right direction-ltr"
                                    />
                                </div>
                            </div>

                            <div className="p-3 bg-white bg-opacity-5 rounded-lg border border-blue-500 border-opacity-30 flex justify-between items-center">
                                <span className="text-slate-600 font-medium">الإجمالي المحسوب:</span>
                                <span className="text-2xl font-bold text-slate-800">{newSupplyTotal.toLocaleString('en-US')} ج.م</span>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-purple-200 mb-1">المبلغ المدفوع (الآن)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={newSupply.paidAmount}
                                    onChange={(e) => setNewSupply({ ...newSupply, paidAmount: e.target.value })}
                                    className="input-modern w-full px-3 py-2 text-right direction-ltr"
                                />
                            </div>

                            {newSupplyRemaining > 0 && (
                                <div className="text-sm text-orange-300 flex items-center">
                                    <AlertTriangle className="h-4 w-4 ml-1" />
                                    المتبقي الآجل سيضاف لمديونية المورد: <strong>{newSupplyRemaining.toLocaleString('en-US')} ج.م</strong>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end space-x-3 rtl:space-x-reverse mt-6">
                            <button
                                onClick={() => { soundManager.play('closeWindow'); setShowSupplyModal(false); }}
                                className="px-4 py-2 text-purple-200 hover:text-slate-800 transition-colors"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handleAddSupply}
                                className="btn-primary px-4 py-2"
                            >
                                حفظ التوريدة
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Record Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[9999] backdrop-blur-sm">
                    <div className="glass-card p-6 w-full max-w-md mx-4 animate-fadeInUp">
                        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
                            <CreditCard className="h-6 w-6 ml-2 text-green-400" />
                            سداد دفعة مالية
                        </h2>

                        <div className="bg-red-500 bg-opacity-20 p-3 rounded-lg border border-red-500 mb-4 flex justify-between">
                            <span className="text-red-200">المديونية الحالية المستحقة:</span>
                            <span className="text-red-400 font-bold">{totalRemaining.toLocaleString('en-US')} ج.م</span>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-purple-200 mb-1">المبلغ المسدد</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    placeholder="0.00"
                                    value={newPayment.amount}
                                    onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                                    className="input-modern w-full px-3 py-2 text-right direction-ltr font-bold text-lg text-green-400"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-purple-200 mb-1">طريقة الدفع</label>
                                <select
                                    value={newPayment.paymentMethod}
                                    onChange={(e) => setNewPayment({ ...newPayment, paymentMethod: e.target.value })}
                                    className="input-modern w-full px-3 py-2 text-right"
                                >
                                    <option value="نقدي">نقدي</option>
                                    <option value="تحويل بنكي">تحويل بنكي</option>
                                    <option value="شيك">شيك</option>
                                    <option value="محفظة إلكترونية">محفظة إلكترونية</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-purple-200 mb-1">ملاحظات (اختياري)</label>
                                <textarea
                                    value={newPayment.notes}
                                    onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                                    rows="3"
                                    className="input-modern w-full px-3 py-2 text-right"
                                ></textarea>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 rtl:space-x-reverse mt-6">
                            <button
                                onClick={() => { soundManager.play('closeWindow'); setShowPaymentModal(false); }}
                                className="px-4 py-2 text-purple-200 hover:text-slate-800 transition-colors"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handleAddPayment}
                                className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-slate-800 px-4 py-2 rounded-lg font-bold"
                            >
                                حفظ الدفعة
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default SupplierDetails;
