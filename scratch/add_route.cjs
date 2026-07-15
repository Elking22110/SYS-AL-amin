const fs = require('fs');
const path = require('path');

const appFile = 'd:\\My Work\\pos-main\\src\\App.jsx';
let appCode = fs.readFileSync(appFile, 'utf8');

// 1. Add import for CustomerDetails
if (!appCode.includes('import CustomerDetails')) {
    appCode = appCode.replace(
        "import Customers from './pages/Customers';",
        "import Customers from './pages/Customers';\nimport CustomerDetails from './pages/CustomerDetails';"
    );
}

// 2. Add route for CustomerDetails
if (!appCode.includes('path="/customers/:id"')) {
    appCode = appCode.replace(
        '<Route path="/customers" element={<Customers />} />',
        '<Route path="/customers" element={<Customers />} />\n                <Route path="/customers/:id" element={<CustomerDetails />} />'
    );
}

fs.writeFileSync(appFile, appCode);
console.log('App.jsx updated with CustomerDetails route.');
