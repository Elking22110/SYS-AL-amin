import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Trash2, Edit, X, Filter, FileText, Check, DollarSign } from 'lucide-react';
import soundManager from '../utils/soundManager';
import { getCurrentDate } from '../utils/dateUtils';
import safeMath from '../utils/safeMath';
import { useNotifications } from '../components/NotificationSystem';

const Expenses = () => {
    const [expenses, setExpenses] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all'); // all, labor, general, other
    const [showAddModal, setShowAddModal] = useState(false);
    const { notifySuccess, notifyError } = useNotifications();

    // نموذج إضافة/تعديل مصروف
    const [formData, setFormData] = useState({
        id: null,
        type: 'labor', // labor, general, other
        amount: '',
        description: '',
        date: getCurrentDate().split('T')[0],
    });

    const expenseTypes = {
        labor: 'يوميات عمالة',
        general: 'مصروفات نثريات',
        other: 'مصروفات أخرى'
    };

    useEffect(() => {
        try {
            const storedExpenses = JSON.parse(localStorage.getItem('expenses') || '[]');
            setExpenses(storedExpenses);
        } catch (error) {
            console.error("Error loading expenses:", error);
            setExpenses([]);
        }
    }, []);

    const saveExpenses = (newExpenses) => {
        try {
            localStorage.setItem('expenses', JSON.stringify(newExpenses));
            setExpenses(newExpenses);
            // Notify other parts of the app if needed (e.g. Dashboard)
            window.dispatchEvent(new Event('storage'));
        } catch (error) {
            console.error("Error saving expenses:", error);
            notifyError('خطأ', 'حدث خطأ أثناء حفظ المصروفات');
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        soundManager.play('click');

        if (!formData.amount || Number(formData.amount) <= 0) {
            notifyError('تنبيه', 'برجاء إدخال مبلغ صحيح أكبر من الصفر');
            return;
        }

        if (!formData.description.trim()) {
            notifyError('تنبيه', 'برجاء إدخال بيان/وصف للمصروف');
            return;
        }

        const newExpense = {
            ...formData,
            amount: Number(formData.amount),
            id: formData.id || Date.now()
        };

        let updatedExpenses;
        if (formData.id) {
            // وضع التعديل
            updatedExpenses = expenses.map(exp => exp.id === formData.id ? newExpense : exp);
            notifySuccess('نجاح', 'تم تعديل المصروف بنجاح');
        } else {
            // إضافة جديدة
            updatedExpenses = [newExpense, ...expenses];
            notifySuccess('نجاح', 'تم تسجيل المصروف بنجاح');
        }

        saveExpenses(updatedExpenses);
        closeModal();
    };

    const handleDelete = (id) => {
        soundManager.play('delete');
        if (window.confirm('هل أنت متأكد من حذف هذا المصروف؟')) {
            const updatedExpenses = expenses.filter(exp => exp.id !== id);
            saveExpenses(updatedExpenses);
            notifySuccess('نجاح', 'تم حذف المصروف بنجاح');
        }
    };

    const openEditModal = (expense) => {
        soundManager.play('click');
        setFormData(expense);
        setShowAddModal(true);
    };

    const closeModal = () => {
        soundManager.play('closeWindow');
        setShowAddModal(false);
        setFormData({
            id: null,
            type: 'labor',
            amount: '',
            description: '',
            date: getCurrentDate().split('T')[0],
        });
    };

    // تصفية وبحث
    const filteredExpenses = useMemo(() => {
        return expenses.filter(exp => {
            const matchesSearch = exp.description.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = filterType === 'all' || exp.type === filterType;
            return matchesSearch && matchesType;
        });
    }, [expenses, searchTerm, filterType]);

    // حساب الإجماليات
    const totals = useMemo(() => {
        return filteredExpenses.reduce((acc, curr) => {
            return safeMath.add(acc, curr.amount);
        }, 0);
    }, [filteredExpenses]);

    return (
        <div className="p-4 md:p-6 lg:p-8 animate-fadeIn h-full flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center">
                        <DollarSign className="w-8 h-8 mr-3 text-purple-400" />
                        المصروفات اليومية والعمالة
                    </h1>
                    <p className="text-gray-400 mt-1">تتبع وإدارة مصاريف العمالة والمصروفات النثرية</p>
                </div>

                <button
                    onClick={() => { soundManager.play('click'); setShowAddModal(true); }}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg flex items-center transition-colors shadow-lg shadow-purple-900/50"
                >
                    <Plus className="w-5 h-5 ml-2" />
                    إضافة مصروف جديد
                </button>
            </div>

            {/* لوحة الإحصائيات والبحث */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6">
                <div className="md:col-span-8 glass-card p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="ابحث في المصروفات (بالبيان)..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-800 text-white rounded-lg pl-4 pr-10 py-2.5 border border-gray-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                        />
                    </div>
                    <div className="relative w-full md:w-48">
                        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="w-full bg-gray-800 text-white rounded-lg pl-4 pr-10 py-2.5 border border-gray-700 outline-none appearance-none cursor-pointer"
                        >
                            <option value="all">كل المصروفات</option>
                            <option value="labor">يوميات عمالة</option>
                            <option value="general">نثريات</option>
                            <option value="other">أخرى</option>
                        </select>
                    </div>
                </div>

                <div className="md:col-span-4 glass-card p-4 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 flex flex-col justify-center items-center">
                    <p className="text-sm text-gray-400 mb-1">إجمالي المصروفات المعروضة</p>
                    <p className="text-3xl font-bold text-red-400">{Number(totals).toLocaleString('en-US')} ج.م</p>
                </div>
            </div>

            {/* جدول المصروفات */}
            <div className="glass-card flex-1 overflow-hidden relative rounded-xl border border-gray-700/50">
                <div className="overflow-x-auto h-full custom-scrollbar">
                    <table className="w-full text-right text-sm">
                        <thead className="text-xs text-gray-400 uppercase bg-gray-800/50 sticky top-0 z-10 backdrop-blur-sm">
                            <tr>
                                <th className="px-6 py-4 font-semibold">تاريخ المصروف</th>
                                <th className="px-6 py-4 font-semibold">بند المصروف</th>
                                <th className="px-6 py-4 font-semibold">المبلغ (ج.م)</th>
                                <th className="px-6 py-4 font-semibold w-2/5">البيان / الملاحظات</th>
                                <th className="px-6 py-4 font-semibold text-center">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700/50 text-gray-300">
                            {filteredExpenses.length > 0 ? (
                                filteredExpenses.map((expense) => (
                                    <tr key={expense.id} className="hover:bg-gray-700/30 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">{expense.date}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${expense.type === 'labor' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                                                expense.type === 'general' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                                    'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                                                }`}>
                                                {expenseTypes[expense.type]}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="font-bold text-red-300">{Number(expense.amount).toLocaleString('en-US')}</span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-white">{expense.description}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <div className="flex justify-center space-x-2 space-x-reverse opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => openEditModal(expense)}
                                                    className="p-1.5 bg-gray-700 hover:bg-blue-600 rounded text-gray-300 hover:text-white transition-colors"
                                                    title="تعديل"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(expense.id)}
                                                    className="p-1.5 bg-gray-700 hover:bg-red-600 rounded text-gray-300 hover:text-white transition-colors"
                                                    title="حذف"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <FileText className="w-12 h-12 mb-3 text-gray-600" />
                                            <p>لا توجد مصروفات مسجلة بهذا التصنيف.</p>
                                            {searchTerm && <p className="text-sm mt-1">جرب تغيير شروط البحث.</p>}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* نافذة إضافة/تعديل مصروف */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-scaleIn relative">
                        <button
                            onClick={closeModal}
                            className="absolute top-4 left-4 p-2 bg-gray-800 hover:bg-red-500 hover:text-white rounded-full text-gray-400 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <h2 className="text-xl font-bold text-white mb-6 pr-2 border-r-4 border-purple-500">
                            {formData.id ? 'تعديل المصروف' : 'تسجيل مصروف جديد'}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">بند المصروف <span className="text-red-500">*</span></label>
                                <select
                                    name="type"
                                    value={formData.type}
                                    onChange={handleInputChange}
                                    className="w-full bg-gray-800 text-white rounded-lg p-3 border border-gray-700 focus:border-purple-500 outline-none"
                                    required
                                >
                                    <option value="labor">يوميات عمالة</option>
                                    <option value="general">مصروفات نثريات</option>
                                    <option value="other">أخرى</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">المبلغ (ج.م) <span className="text-red-500">*</span></label>
                                <input
                                    type="number"
                                    name="amount"
                                    min="0"
                                    step="any"
                                    value={formData.amount}
                                    onChange={handleInputChange}
                                    className="w-full bg-gray-800 text-white rounded-lg p-3 border border-gray-700 focus:border-purple-500 outline-none direction-ltr font-bold text-lg text-left"
                                    placeholder="0.00"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">التاريخ</label>
                                <input
                                    type="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleInputChange}
                                    className="w-full bg-gray-800 text-white rounded-lg p-3 border border-gray-700 focus:border-purple-500 outline-none direction-ltr"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">البيان / الملاحظات <span className="text-red-500">*</span></label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    className="w-full bg-gray-800 text-white rounded-lg p-3 border border-gray-700 focus:border-purple-500 outline-none min-h-[100px] resize-y"
                                    placeholder="اكتب بيان المصروف هنا..."
                                    required
                                ></textarea>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium border border-gray-700"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    className="flex-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-bold flex items-center justify-center flex-[2]"
                                >
                                    <Check className="w-5 h-5 ml-2" />
                                    {formData.id ? 'حفظ التعديلات' : 'حفظ المصروف'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Expenses;
