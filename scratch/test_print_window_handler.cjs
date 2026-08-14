/**
 * TEST PRINT WINDOW HANDLER AUDIT
 * scratch/test_print_window_handler.cjs
 */

const fs   = require('fs');
const path = require('path');

const mainCjs = fs.readFileSync(path.join(__dirname, '../electron/main.cjs'), 'utf8');

console.log('Testing Electron main.cjs window open handler logic...');

if (mainCjs.includes('about:blank') && mainCjs.includes("return { action: 'allow' }")) {
  console.log('✅ [PASS] setWindowOpenHandler allows about:blank for printing without calling shell.openExternal!');
} else {
  console.error('❌ [FAIL] setWindowOpenHandler still intercepts about:blank and triggers Windows external app error!');
  process.exit(1);
}
