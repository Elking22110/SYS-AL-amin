const fs = require('fs');
const path = require('path');

const reportsFile = 'd:\\My Work\\pos-main\\src\\pages\\Reports.jsx';
const customersFile = 'd:\\My Work\\pos-main\\src\\pages\\Customers.jsx';

let reportsCode = fs.readFileSync(reportsFile, 'utf8');

// 1. Fix filteredInvoices in Reports.jsx (around line 1011)
if (!reportsCode.includes("inv.paymentMethod === 'deferred' && inv.paymentStatus !== 'complete'")) {
    reportsCode = reportsCode.replace(
        "result = result.filter(inv => inv.downPayment?.enabled && (inv.downPayment?.remaining || 0) > 0);",
        "result = result.filter(inv => (inv.downPayment?.enabled && (inv.downPayment?.remaining || 0) > 0) || (inv.paymentMethod === 'deferred' && inv.paymentStatus !== 'complete'));"
    );
}

// 2. Fix JSX button rendering in Reports.jsx (around line 1269)
if (!reportsCode.includes("(inv.paymentMethod === 'deferred' && inv.paymentStatus !== 'complete')")) {
    reportsCode = reportsCode.replace(
        "{inv.downPayment?.enabled && remaining > 0 && (",
        "{((inv.downPayment?.enabled && remaining > 0) || (inv.paymentMethod === 'deferred' && inv.paymentStatus !== 'complete')) && ("
    );
}

// 3. Fix handlePayRemaining logic in Reports.jsx (around line 504)
if (!reportsCode.includes("let calcRemaining = 0;")) {
    const handlePayRemainingRegex = /const handlePayRemaining = \(invoiceId\) => \{[\s\S]*?setShowSettlementModal\(true\);\n  \};/;
    const newHandlePayRemaining = `const handlePayRemaining = (invoiceId) => {
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
  };`;
    reportsCode = reportsCode.replace(handlePayRemainingRegex, newHandlePayRemaining);
}

// 4. Update Customer Debt inside confirmPayRemaining in Reports.jsx
if (!reportsCode.includes('customers[cIndex].debt = Math.max(0, safeMath.subtract(customers[cIndex].debt || 0, amountPaid));')) {
    const confirmReplacement = `// تحديث مديونية العميل في سجل العملاء
      const invoice = allSales.find(s => s.id === invoiceId);
      if (invoice && invoice.customer?.phone) {
        try {
          const customers = JSON.parse(localStorage.getItem('customers') || '[]');
          const cIndex = customers.findIndex(c => c.phone === invoice.customer.phone);
          if (cIndex !== -1) {
            customers[cIndex].debt = Math.max(0, safeMath.subtract(customers[cIndex].debt || 0, amountPaid));
            localStorage.setItem('customers', JSON.stringify(customers));
            try { publish(EVENTS.CUSTOMERS_CHANGED, { type: 'update' }); } catch (_) {}
          }
        } catch (e) {
          console.error("Error updating customer debt:", e);
        }
      }

      setAllSales(updatedSales);`;
      
    reportsCode = reportsCode.replace("setAllSales(updatedSales);", confirmReplacement);
}

fs.writeFileSync(reportsFile, reportsCode);

// 5. Update JSX in Customers.jsx to show the button for deferred invoices
let customersCode = fs.readFileSync(customersFile, 'utf8');

if (!customersCode.includes("(inv.paymentMethod === 'deferred' && inv.paymentStatus !== 'complete')")) {
    customersCode = customersCode.replace(
        "{inv.downPayment?.enabled && remaining > 0 && (",
        "{((inv.downPayment?.enabled && remaining > 0) || (inv.paymentMethod === 'deferred' && inv.paymentStatus !== 'complete')) && ("
    );
}

fs.writeFileSync(customersFile, customersCode);

console.log("Successfully fixed settlement logic and UI for deferred invoices!");
