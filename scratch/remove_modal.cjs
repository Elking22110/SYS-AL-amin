const fs = require('fs');
const path = require('path');

const customersFile = 'd:\\My Work\\pos-main\\src\\pages\\Customers.jsx';
let customersCode = fs.readFileSync(customersFile, 'utf8');

// 1. Remove historyCustomer state
customersCode = customersCode.replace(
    /const \[historyCustomer, setHistoryCustomer\] = useState\(null\);\n/g,
    ''
);

// 2. Change the button action for "سجل العميل"
customersCode = customersCode.replace(
    /onClick=\{\(\) => \{ soundManager.play\('openWindow'\); setHistoryCustomer\(customer\); \}\}/g,
    "onClick={() => { soundManager.play('openWindow'); navigate(`/customers/${customer.id || customer.phone}`); }}"
);

// 3. Remove the entire history modal
// The modal starts with "{/* سجل مشتريات العميل (Modal) */}" and ends before "{/* نافذة تسوية المديونية */}"
const modalStartIndex = customersCode.indexOf('{/* سجل مشتريات العميل (Modal) */}');
const modalEndIndex = customersCode.indexOf('{/* نافذة تسوية المديونية */}');

if (modalStartIndex !== -1 && modalEndIndex !== -1) {
    customersCode = customersCode.substring(0, modalStartIndex) + customersCode.substring(modalEndIndex);
}

fs.writeFileSync(customersFile, customersCode);
console.log('Customers.jsx modal removed and navigation added.');
