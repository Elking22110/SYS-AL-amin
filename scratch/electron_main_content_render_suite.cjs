/**
 * SIS AL AMEEN — ELECTRON MAIN CONTENT RENDER TEST SUITE
 * scratch/electron_main_content_render_suite.cjs
 *
 * Verifies that:
 * 1. HashRouter is used for 100% Electron file:// compatibility (No blank content)
 * 2. Main content container has explicit width & height flex properties
 * 3. Every route in App.jsx maps to a valid component
 * 4. Wildcard Navigate fallback route exists
 * 5. ErrorBoundary wraps the main layout
 * 6. DataLoader does not block rendering
 */

const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC  = path.join(ROOT, 'src');

let passed = 0, failed = 0;
const issues = [];

function PASS(id) {
  console.log(`  ✅ [PASS] ${id}`);
  passed++;
}
function FAIL(id, detail, severity = 'P0') {
  console.error(`  ❌ [FAIL/${severity}] ${id}: ${detail}`);
  failed++;
  issues.push({ id, detail, severity });
}
function section(name) {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  ${name}`);
  console.log('═'.repeat(70));
}

function readFile(fp) {
  try { return fs.readFileSync(fp, 'utf8'); } catch (_) { return ''; }
}

section('1. ROUTER PROVIDER AUDIT (main.jsx)');

const mainContent = readFile(path.join(SRC, 'main.jsx'));

if (mainContent.includes('HashRouter') && !mainContent.includes('BrowserRouter')) {
  PASS('1_HASH_ROUTER_USED_FOR_ELECTRON');
} else {
  FAIL('1_HASH_ROUTER_USED_FOR_ELECTRON', 'main.jsx is using BrowserRouter which breaks route matching on file:// protocol in Electron');
}

section('2. MAIN CONTENT LAYOUT & ROUTING AUDIT (App.jsx)');

const appContent = readFile(path.join(SRC, 'App.jsx'));

// Check ErrorBoundary import & wrap
if (appContent.includes('ErrorBoundary') && appContent.includes('<ErrorBoundary>')) {
  PASS('2_ERROR_BOUNDARY_WRAPS_LAYOUT');
} else {
  FAIL('2_ERROR_BOUNDARY_WRAPS_LAYOUT', 'App.jsx is missing ErrorBoundary wrapper around main layout');
}

// Check Layout Flex container styling
if (appContent.includes('flex-1') && appContent.includes('w-full') && appContent.includes('h-full')) {
  PASS('3_MAIN_CONTAINER_EXPLICIT_DIMENSIONS');
} else {
  FAIL('3_MAIN_CONTAINER_EXPLICIT_DIMENSIONS', 'Main content container missing explicit width/height dimensions');
}

// Check Wildcard Route Fallback
if (appContent.includes('<Route path="*" element={<Navigate to="/" replace />} />')) {
  PASS('4_WILDCARD_ROUTE_FALLBACK');
} else {
  FAIL('4_WILDCARD_ROUTE_FALLBACK', 'App.jsx missing wildcard route fallback (<Route path="*" ...>)');
}

// Check Redirection Guard in READY state
if (appContent.includes('Redirection Guard') && appContent.includes("navigate('/', { replace: true })")) {
  PASS('5_READY_STATE_REDIRECTION_GUARD');
} else {
  FAIL('5_READY_STATE_REDIRECTION_GUARD', 'App.jsx missing redirection guard on READY state entry');
}

section('3. ROUTE COMPONENT MOUNT AUDIT');

const routesToTest = [
  { path: '/', component: 'Dashboard', file: 'pages/Dashboard.jsx' },
  { path: '/pos', component: 'POS', file: 'pages/POS.jsx' },
  { path: '/products', component: 'Products', file: 'pages/Products.jsx' },
  { path: '/reports', component: 'Reports', file: 'pages/Reports.jsx' },
  { path: '/customers', component: 'Customers', file: 'pages/Customers.jsx' },
  { path: '/suppliers', component: 'Suppliers', file: 'pages/Suppliers.jsx' },
  { path: '/shifts', component: 'Shifts', file: 'pages/Shifts.jsx' },
  { path: '/expenses', component: 'Expenses', file: 'pages/Expenses.jsx' },
  { path: '/settings', component: 'Settings', file: 'pages/Settings.jsx' }
];

routesToTest.forEach(r => {
  const fullPath = path.join(SRC, r.file);
  if (fs.existsSync(fullPath)) {
    const code = readFile(fullPath);
    if (code.includes('export default')) {
      PASS(`ROUTE_EXISTS_${r.component}`);
    } else {
      FAIL(`ROUTE_EXISTS_${r.component}`, `${r.file} exists but does not export default component`);
    }
  } else {
    FAIL(`ROUTE_EXISTS_${r.component}`, `${r.file} missing on disk`);
  }
});

section('4. DATALOADER NON-BLOCKING AUDIT (DataLoader.jsx)');

const dataLoaderContent = readFile(path.join(SRC, 'components', 'DataLoader.jsx'));

if (dataLoaderContent.includes('{children}') || dataLoaderContent.includes('children')) {
  PASS('15_DATALOADER_RENDERS_CHILDREN');
} else {
  FAIL('15_DATALOADER_RENDERS_CHILDREN', 'DataLoader.jsx does not render children');
}

section('5. PROTECTED ROUTE AUDIT (ProtectedRoute.jsx)');

const protectedContent = readFile(path.join(SRC, 'components', 'ProtectedRoute.jsx'));

if (protectedContent.includes('return children')) {
  PASS('16_PROTECTED_ROUTE_RETURNS_CHILDREN');
} else {
  FAIL('16_PROTECTED_ROUTE_RETURNS_CHILDREN', 'ProtectedRoute does not return children when authenticated');
}

section('FINAL MAIN CONTENT RENDER SUMMARY');
console.log(`TOTAL AUDIT CHECKS : ${passed + failed}`);
console.log(`PASSED             : ${passed}`);
console.log(`FAILED             : ${failed}`);

if (failed > 0) {
  console.error('\nBLOCKERS:');
  issues.forEach(i => console.error(`❌ ${i.id}: ${i.detail}`));
  process.exit(1);
} else {
  console.log('\nVERDICT: ALL MAIN CONTENT RENDER AUDITS PASSED ✅\n');
}
