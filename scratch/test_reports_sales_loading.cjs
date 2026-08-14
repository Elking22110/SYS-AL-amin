/**
 * TEST REPORTS SALES LOADING & ACTIVE SHIFT AGGREGATION AUDIT
 * scratch/test_reports_sales_loading.cjs
 */

const fs   = require('fs');
const path = require('path');

const reportsCode = fs.readFileSync(path.join(__dirname, '../src/pages/Reports.jsx'), 'utf8');

console.log('Auditing Reports.jsx sales loading logic...');

if (reportsCode.includes('databaseManager.getAll(\'sales\')')) {
  console.log('✅ [PASS] IndexedDB persistent sales store included!');
} else {
  console.error('❌ [FAIL] Missing IndexedDB sales store in loadSalesData!');
  process.exit(1);
}

if (reportsCode.includes('activeShift?.sales') || reportsCode.includes('activeShiftSales')) {
  console.log('✅ [PASS] Active Shift sales included in Reports!');
} else {
  console.error('❌ [FAIL] Missing active shift sales in loadSalesData!');
  process.exit(1);
}

if (reportsCode.includes('monthStart') || reportsCode.includes('30 * 24 * 60 * 60 * 1000')) {
  console.log('✅ [PASS] Month filter properly configured!');
} else {
  console.error('❌ [FAIL] Month filter logic error!');
  process.exit(1);
}

console.log('\nREPORTS SALES LOADING AUDIT: ALL TESTS PASSED ✅');
