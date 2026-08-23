const fs = require('fs');
const path = require('path');

const kesselScripts = [
  'fix_kessel_40.cjs',
  'restore_kessel_products_to_cloud.cjs',
  'audit_kessel_products.cjs',
  'diagnose_kessel_disappearance.cjs',
  'inspect_kessel_codes.cjs',
  'extract_all_kessel_codes.cjs',
  'verify_kessel_extraction.cjs',
  'verify_kessel_sync_ready.cjs'
];

kesselScripts.forEach(f => {
  const p = path.join(__dirname, f);
  if (!fs.existsSync(p)) return;
  console.log('\n========================================');
  console.log(`File: ${f}`);
  console.log('========================================');
  console.log(fs.readFileSync(p, 'utf8'));
});
