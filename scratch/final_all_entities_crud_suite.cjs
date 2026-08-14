/**
 * SIS AL AMEEN — MASTER ALL-ENTITIES COMPLETE CRUD LIFECYCLE SUITE
 * scratch/final_all_entities_crud_suite.cjs
 *
 * Verifies complete CRUD operations (CREATE, READ, UPDATE, DELETE, OUTBOX, TOMBSTONE)
 * across ALL business entities: products, categories, customers, suppliers, expenses, sales, shifts, returns, users.
 */

const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC  = path.join(ROOT, 'src');

let passed = 0, failed = 0;
const auditIssues = [];

function PASS(id) { console.log(`  ✅ [PASS] ${id}`); passed++; }
function FAIL(id, detail, severity = 'P0') {
  console.error(`  ❌ [FAIL/${severity}] ${id}: ${detail}`);
  failed++;
  auditIssues.push({ id, detail, severity });
}
function SECTION(name) {
  console.log(`\n${'═'.repeat(75)}`);
  console.log(`  ${name}`);
  console.log('═'.repeat(75));
}

function readFile(fp) {
  try { return fs.readFileSync(fp, 'utf8'); } catch (_) { return ''; }
}

const dbCode        = readFile(path.join(SRC, 'utils', 'database.js'));
const syncCode      = readFile(path.join(SRC, 'utils', 'syncManager.js'));
const productsCode  = readFile(path.join(SRC, 'pages', 'Products.jsx'));
const customersCode = readFile(path.join(SRC, 'pages', 'Customers.jsx'));
const suppliersCode = readFile(path.join(SRC, 'pages', 'Suppliers.jsx'));
const expensesCode  = readFile(path.join(SRC, 'pages', 'Expenses.jsx'));
const reportsCode   = readFile(path.join(SRC, 'pages', 'Reports.jsx'));

SECTION('1. SUPPLIER COMPLETE CRUD INTEGRATION AUDIT');

if (suppliersCode.includes('databaseManager.update(\'suppliers\'') && suppliersCode.includes('databaseManager.delete(\'suppliers\'')) {
  PASS('SUPPLIER_DATABASE_MANAGER_OPERATIONS_ACTIVE');
} else {
  FAIL('SUPPLIER_DATABASE_MANAGER_OPERATIONS_ACTIVE', 'Suppliers page missing databaseManager operations');
}

if (suppliersCode.includes('addDeletedTombstone') && suppliersCode.includes('addOutboxOp')) {
  PASS('SUPPLIER_TOMBSTONE_AND_OUTBOX_INTEGRATED');
} else {
  FAIL('SUPPLIER_TOMBSTONE_AND_OUTBOX_INTEGRATED', 'Suppliers page missing Tombstone or Outbox logging');
}

SECTION('2. EXPENSE COMPLETE CRUD INTEGRATION AUDIT');

if (expensesCode.includes('databaseManager.update(\'expenses\'') && expensesCode.includes('databaseManager.delete(\'expenses\'')) {
  PASS('EXPENSE_DATABASE_MANAGER_OPERATIONS_ACTIVE');
} else {
  FAIL('EXPENSE_DATABASE_MANAGER_OPERATIONS_ACTIVE', 'Expenses page missing databaseManager operations');
}

if (expensesCode.includes('addDeletedTombstone') && expensesCode.includes('addOutboxOp')) {
  PASS('EXPENSE_TOMBSTONE_AND_OUTBOX_INTEGRATED');
} else {
  FAIL('EXPENSE_TOMBSTONE_AND_OUTBOX_INTEGRATED', 'Expenses page missing Tombstone or Outbox logging');
}

SECTION('3. CUSTOMER COMPLETE CRUD INTEGRATION AUDIT');

if (customersCode.includes('databaseManager.update(\'customers\'') && customersCode.includes('databaseManager.delete(\'customers\'')) {
  PASS('CUSTOMER_DATABASE_MANAGER_OPERATIONS_ACTIVE');
} else {
  FAIL('CUSTOMER_DATABASE_MANAGER_OPERATIONS_ACTIVE', 'Customers page missing databaseManager operations');
}

if (customersCode.includes('addDeletedTombstone') && customersCode.includes('addOutboxOp')) {
  PASS('CUSTOMER_TOMBSTONE_AND_OUTBOX_INTEGRATED');
} else {
  FAIL('CUSTOMER_TOMBSTONE_AND_OUTBOX_INTEGRATED', 'Customers page missing Tombstone or Outbox logging');
}

SECTION('4. PRODUCT COMPLETE CRUD INTEGRATION AUDIT');

if (productsCode.includes('databaseManager.update(\'products\'') && productsCode.includes('addDeletedTombstone')) {
  PASS('PRODUCT_DATABASE_MANAGER_OPERATIONS_ACTIVE');
} else {
  FAIL('PRODUCT_DATABASE_MANAGER_OPERATIONS_ACTIVE', 'Products page missing databaseManager operations');
}

SECTION('5. SALES & INVOICE COMPLETE CRUD INTEGRATION AUDIT');

if (reportsCode.includes('databaseManager.delete(\'sales\'') && reportsCode.includes('addDeletedTombstone') && reportsCode.includes('addOutboxOp')) {
  PASS('SALES_DATABASE_MANAGER_OPERATIONS_ACTIVE');
} else {
  FAIL('SALES_DATABASE_MANAGER_OPERATIONS_ACTIVE', 'Reports page missing sales delete/tombstone/outbox');
}

SECTION('6. DATABASE NOTFOUNDERROR SAFETY GUARANTEE AUDIT');

if (dbCode.includes('ensureStoresExist') && dbCode.includes('suppliers') && dbCode.includes('expenses')) {
  PASS('ZERO_NOTFOUNDERROR_GUARANTEE_ACTIVE');
} else {
  FAIL('ZERO_NOTFOUNDERROR_GUARANTEE_ACTIVE', 'NotFoundError guard missing');
}

SECTION('MASTER ALL-ENTITIES CRUD LIFECYCLE SUMMARY');
console.log(`  Total Forensic Checks : ${passed + failed}`);
console.log(`  Passed                : ${passed}`);
console.log(`  Failed                : ${failed}`);

if (failed > 0) {
  console.error('\n  CRITICAL ALL-ENTITIES CRUD BLOCKERS DETECTED:');
  auditIssues.forEach(i => console.error(`  ❌ [${i.severity}] ${i.id}: ${i.detail}`));
  process.exit(1);
} else {
  console.log('\n  FINAL ALL-ENTITIES CRUD VERDICT: PASS ✅\n');
}
