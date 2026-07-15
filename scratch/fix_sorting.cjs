const fs = require('fs');
const path = require('path');

const reportsFile = 'd:\\My Work\\pos-main\\src\\pages\\Reports.jsx';
const customerDetailsFile = 'd:\\My Work\\pos-main\\src\\pages\\CustomerDetails.jsx';

// 1. Fix Reports.jsx
let reportsCode = fs.readFileSync(reportsFile, 'utf8');

const reportsSortRegex = /const ta = new Date\(a\.timestamp \|\| a\.date \|\| 0\)\.getTime\(\);\s*const tb = new Date\(b\.timestamp \|\| b\.date \|\| 0\)\.getTime\(\);\s*return tb - ta; \/\/ الأحدث أولاً/g;

reportsCode = reportsCode.replace(
    reportsSortRegex,
    `const ta = new Date(a.timestamp || a.date || 0).getTime();
        const tb = new Date(b.timestamp || b.date || 0).getTime();
        if (tb !== ta) return tb - ta;
        return (Number(b.id) || 0) - (Number(a.id) || 0);`
);

fs.writeFileSync(reportsFile, reportsCode);

// 2. Fix CustomerDetails.jsx
let cdCode = fs.readFileSync(customerDetailsFile, 'utf8');

const cdSortRegex = /allInvoices\.sort\(\(a, b\) => new Date\(b\.timestamp \|\| b\.date\)\.getTime\(\) - new Date\(a\.timestamp \|\| a\.date\)\.getTime\(\)\);/g;

cdCode = cdCode.replace(
    cdSortRegex,
    `allInvoices.sort((a, b) => {
                    const tb = new Date(b.timestamp || b.date).getTime();
                    const ta = new Date(a.timestamp || a.date).getTime();
                    if (tb !== ta && !isNaN(tb) && !isNaN(ta)) return tb - ta;
                    return (Number(b.id) || 0) - (Number(a.id) || 0);
                });`
);

fs.writeFileSync(customerDetailsFile, cdCode);

console.log('Fixed sorting in both Reports and CustomerDetails.');
