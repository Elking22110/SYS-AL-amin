const fs = require('fs');
const path = require('path');

const customersFile = 'd:\\My Work\\pos-main\\src\\pages\\Customers.jsx';
let customersCode = fs.readFileSync(customersFile, 'utf8');

const modalStartIndex = customersCode.indexOf('{/* نافذة سجل العميل */}');
const modalEndIndex = customersCode.indexOf('{/* نافذة تسوية المديونية */}');

if (modalStartIndex !== -1 && modalEndIndex !== -1) {
    customersCode = customersCode.substring(0, modalStartIndex) + customersCode.substring(modalEndIndex);
    fs.writeFileSync(customersFile, customersCode);
    console.log('Modal removed successfully.');
} else {
    console.log('Could not find modal delimiters.');
    console.log('Start index:', modalStartIndex);
    console.log('End index:', modalEndIndex);
}
