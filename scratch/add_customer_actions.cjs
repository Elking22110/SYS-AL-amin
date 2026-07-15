const fs = require('fs');
const path = require('path');

const customersFile = 'd:\\My Work\\pos-main\\src\\pages\\Customers.jsx';
const reportsFile = 'd:\\My Work\\pos-main\\src\\pages\\Reports.jsx';

// 1. Modify Customers.jsx
let customersCode = fs.readFileSync(customersFile, 'utf8');

// Add useNavigate and thermalPrinter
if (!customersCode.includes('useNavigate')) {
    customersCode = customersCode.replace(
        "import React, { useState, useEffect } from 'react';",
        "import React, { useState, useEffect } from 'react';\nimport { useNavigate } from 'react-router-dom';"
    );
}

if (!customersCode.includes('thermalPrinter')) {
    customersCode = customersCode.replace(
        "import safeMath from '../utils/safeMath.js';",
        "import safeMath from '../utils/safeMath.js';\nimport thermalPrinter from '../utils/thermalPrinter.js';"
    );
}

// Add Eye and Printer to lucide-react imports
if (!customersCode.includes('Eye,')) {
    customersCode = customersCode.replace('Trash2,', 'Trash2,\n  Eye,\n  Printer,\n  Banknote,');
}

// Add navigate hook inside Customers component
if (!customersCode.includes('const navigate = useNavigate();')) {
    customersCode = customersCode.replace(
        'const [customers, setCustomers] = useState([]);',
        'const navigate = useNavigate();\n  const [customers, setCustomers] = useState([]);'
    );
}

// Add the Actions column header
if (!customersCode.includes('الإجراءات')) {
    customersCode = customersCode.replace(
        '<th className="px-6 py-4 text-slate-600 font-bold text-sm">قيمة الفاتورة</th>',
        '<th className="px-6 py-4 text-slate-600 font-bold text-sm">قيمة الفاتورة</th>\n                          <th className="px-6 py-4 text-slate-600 font-bold text-sm text-center">الإجراءات</th>'
    );
}

// Add the Actions column cells
const actionCell = `                              <td className="px-6 py-4">
                                <div className="flex gap-2 justify-center">
                                  {/* زر فتح وتعديل الفاتورة */}
                                  <button
                                    onClick={() => {
                                      setHistoryCustomer(null);
                                      navigate('/reports', { state: { openInvoiceId: inv.id } });
                                    }}
                                    className="px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-xs font-bold hover:bg-blue-100 cursor-pointer flex items-center gap-1"
                                  >
                                    <Eye className="h-4 w-4" />
                                    عرض وتعديل
                                  </button>

                                  {/* زر الطباعة */}
                                  <button
                                    onClick={() => thermalPrinter.printInvoice(inv)}
                                    className="p-2 bg-slate-50 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 cursor-pointer"
                                    title="طباعة الفاتورة"
                                  >
                                    <Printer className="h-4 w-4" />
                                  </button>

                                  {/* زر الحذف */}
                                  <button
                                    onClick={() => {
                                      setHistoryCustomer(null);
                                      navigate('/reports', { state: { deleteInvoiceId: inv.id } });
                                    }}
                                    className="p-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 cursor-pointer"
                                    title="حذف الفاتورة"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>`;

if (!customersCode.includes('عرض وتعديل')) {
    customersCode = customersCode.replace(
        '<td className="px-6 py-4 text-blue-600 font-extrabold text-sm">{(inv.total || 0).toLocaleString(\'en-US\')} ج.م</td>',
        '<td className="px-6 py-4 text-blue-600 font-extrabold text-sm">{(inv.total || 0).toLocaleString(\'en-US\')} ج.م</td>\n' + actionCell
    );
}

fs.writeFileSync(customersFile, customersCode);

// 2. Modify Reports.jsx to handle navigation state
let reportsCode = fs.readFileSync(reportsFile, 'utf8');

// Add useLocation to react-router-dom
if (!reportsCode.includes('useLocation')) {
    reportsCode = reportsCode.replace(
        "import React, { useState, useEffect } from 'react';",
        "import React, { useState, useEffect } from 'react';\nimport { useLocation, useNavigate } from 'react-router-dom';"
    );
}

// Inject location handling inside Reports component
if (!reportsCode.includes('const location = useLocation();')) {
    reportsCode = reportsCode.replace(
        'const { notifySuccess, notifyError } = useNotifications();',
        `const { notifySuccess, notifyError } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();`
    );

    const useLocationEffect = `
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
    }
  }, [location.state, allSales]);
`;

    reportsCode = reportsCode.replace(
        '// بحث وإضافة المنتجات داخل الفاتورة',
        useLocationEffect + '\n  // بحث وإضافة المنتجات داخل الفاتورة'
    );
}

fs.writeFileSync(reportsFile, reportsCode);
console.log('Successfully injected actions and navigation routing!');
