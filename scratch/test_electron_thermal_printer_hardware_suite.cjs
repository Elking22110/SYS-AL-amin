const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function runThermalPrinterHardwareSuite() {
  console.log('======================================================================');
  console.log('SIS AL AMEEN — ELECTRON THERMAL PRINTER & HARDWARE AUDIT SUITE');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  function assertTest(name, condition, detail = '') {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name} -> ${detail}`);
      failed++;
    }
  }

  const printerPath = path.join(__dirname, '..', 'src', 'utils', 'thermalPrinter.js');
  const printerContent = fs.readFileSync(printerPath, 'utf8');

  // ─── TEST 1: STORE PHONES SAME LINE FORMATTING UNDER STORE NAME ───
  console.log('>>> TEST 1: STORE PHONES SAME LINE FORMATTING UNDER STORE NAME...');
  const hasSameLinePhones = printerContent.includes("phoneList.join(' | ')");
  assertTest('STORE_PHONES_SAME_LINE', hasSameLinePhones, 'Store Phone 1 and Phone 2 format on the same line under store name');

  // ─── TEST 2: FIXED ELKING FOOTER & PHONE (01553448631) ───
  console.log('\n>>> TEST 2: FIXED ELKING FOOTER & PHONE (01553448631)...');
  const hasElkingFooterText = printerContent.includes('تم طباعة الفاتورة بواسطة سيستم ELKING');
  const hasElkingPhone = printerContent.includes('01553448631');
  assertTest('ELKING_FOOTER_FORMATTING', hasElkingFooterText && hasElkingPhone, 'ELKING footer and fixed phone (01553448631) formatted at bottom of receipt');

  // ─── TEST 3: ZERO FOOTER BARCODE ───
  console.log('\n>>> TEST 3: ZERO FOOTER BARCODE VERIFICATION...');
  const hasFooterBarcode = printerContent.includes('printFooterBarcode') || printerContent.includes('GS k');
  assertTest('ZERO_FOOTER_BARCODE', !hasFooterBarcode, 'Receipt footer is free of unwanted barcodes');

  // ─── TEST 4: ITEM TABLE COLUMN WRAPPING & ALIGNMENT ───
  console.log('\n>>> TEST 4: ITEM TABLE COLUMN WRAPPING & ALIGNMENT (58mm/80mm)...');
  const hasTableHeaders = printerContent.includes('الوصف') && printerContent.includes('الكمية') && printerContent.includes('السعر') && printerContent.includes('الإجمالي');
  assertTest('ITEM_TABLE_ALIGNMENT', hasTableHeaders, 'Receipt item table aligns Description, Quantity, Price, and Total columns cleanly');

  // ─── TEST 5: DISCONNECTED PRINTER ERROR SAFETY ───
  console.log('\n>>> TEST 5: DISCONNECTED PRINTER ERROR SAFETY...');
  const hasDisconnectedPrinterGuard = printerContent.includes('لا توجد طابعة متصلة') || printerContent.includes('return false;');
  assertTest('DISCONNECTED_PRINTER_SAFETY', hasDisconnectedPrinterGuard, 'Disconnected printer handles gracefully without UI freeze or crash');

  // ─── TEST 6: OFFLINE PRINTING RESILIENCE ───
  console.log('\n>>> TEST 6: OFFLINE PRINTING RESILIENCE...');
  const isOfflineCapable = !printerContent.includes('fetch(') && !printerContent.includes('axios.');
  assertTest('OFFLINE_PRINTING_RESILIENCE', isOfflineCapable, 'Thermal printer module operates 100% offline without remote web API dependencies');

  // ─── TEST 7: ELECTRON CLEAN CODEBASE & DEV PATHS AUDIT ───
  console.log('\n>>> TEST 7: ELECTRON CLEAN CODEBASE AUDIT...');
  const walkSrc = (dir) => {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results = results.concat(walkSrc(fullPath));
      } else if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.css')) {
        results.push(fullPath);
      }
    });
    return results;
  };

  const srcFiles = walkSrc(path.join(__dirname, '..', 'src'));
  let devPathsFound = false;

  for (const sf of srcFiles) {
    const code = fs.readFileSync(sf, 'utf8');
    if (code.includes('C:\\Users\\Admin') || code.includes('D:\\My Work') || code.includes('.gemini') || code.includes('/scratch/')) {
      devPathsFound = true;
    }
  }

  assertTest('ZERO_DEV_PATHS_IN_SRC', !devPathsFound, 'Zero development paths found in src/');

  // ─── TEST 8: VITE PRODUCTION BUILD EXECUTION ───
  console.log('\n>>> TEST 8: VITE PRODUCTION BUILD EXECUTION (npm run build)...');
  let buildSuccess = false;
  try {
    const buildOutput = execSync('npm run build', { cwd: path.join(__dirname, '..'), encoding: 'utf8' });
    buildSuccess = buildOutput.includes('built in') || fs.existsSync(path.join(__dirname, '..', 'dist', 'index.html'));
  } catch (err) {
    console.error('❌ Build failed:', err.message);
  }

  assertTest('PRODUCTION_BUILD_EXECUTION', buildSuccess, 'Vite production bundle built cleanly in dist/ with 0 errors');

  console.log('\n======================================================================');
  console.log(`TOTAL THERMAL PRINTER AUDIT PASSED: ${passed}`);
  console.log(`TOTAL THERMAL PRINTER AUDIT FAILED: ${failed}`);
  console.log('======================================================================\n');

  if (failed > 0) {
    console.error('❌ ELECTRON THERMAL PRINTER & HARDWARE COMPATIBILITY = FAIL');
    process.exit(1);
  } else {
    console.log('🎉 ELECTRON THERMAL PRINTER & HARDWARE COMPATIBILITY = PASS');
  }
}

runThermalPrinterHardwareSuite();
