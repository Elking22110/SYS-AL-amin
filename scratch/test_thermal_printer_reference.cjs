/**
 * TEST THERMAL PRINTER REFERENCE AUDIT
 * scratch/test_thermal_printer_reference.cjs
 */

const fs   = require('fs');
const path = require('path');

const posMainCode = fs.readFileSync(path.join(__dirname, '../src/components/POS/POSMain.jsx'), 'utf8');

console.log('Auditing POSMain.jsx thermal printer references...');

if (posMainCode.includes('thermalPrinterManager.getPrinterSettings()')) {
  console.log('✅ [PASS] thermalPrinterManager.getPrinterSettings() properly referenced!');
} else {
  console.error('❌ [FAIL] Missing or invalid printer reference in POSMain.jsx!');
  process.exit(1);
}

if (!posMainCode.includes('printer.getPrinterSettings()')) {
  console.log('✅ [PASS] No undefined printer variable calls remain!');
} else {
  console.error('❌ [FAIL] Undefined printer.getPrinterSettings() call still exists!');
  process.exit(1);
}
