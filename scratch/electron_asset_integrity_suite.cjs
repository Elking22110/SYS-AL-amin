const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function runElectronAssetIntegritySuite() {
  console.log('======================================================================');
  console.log('SIS AL AMEEN — ELECTRON ASSET INTEGRITY & WHITE SCREEN AUDIT SUITE');
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

  // 1. Build Verification
  console.log('>>> STEP 1: EXECUTING VITE PRODUCTION BUILD (npm run build)...');
  let buildSuccess = false;
  try {
    const buildOutput = execSync('npm run build', { cwd: path.join(__dirname, '..'), encoding: 'utf8' });
    buildSuccess = buildOutput.includes('built in') || fs.existsSync(path.join(__dirname, '..', 'dist', 'index.html'));
  } catch (err) {
    console.error('❌ Build failed:', err.message);
  }

  assertTest('VITE_BUILD_SUCCESS', buildSuccess, 'Vite production build completed in dist/ with 0 errors');

  // 2. Parse dist/index.html and extract asset references
  console.log('\n>>> STEP 2: EXTRACTING & RESOLVING REFERENCED ASSETS FROM dist/index.html...');
  const distIndexPath = path.join(__dirname, '..', 'dist', 'index.html');
  const distHtml = fs.readFileSync(distIndexPath, 'utf8');

  // Extract all src and href attributes
  const assetRegex = /(?:src|href)=["']([^"']+)["']/g;
  let match;
  const referencedAssets = [];

  while ((match = assetRegex.exec(distHtml)) !== null) {
    const assetPath = match[1];
    if (!assetPath.startsWith('http') && !assetPath.startsWith('data:') && !assetPath.startsWith('#')) {
      referencedAssets.push(assetPath);
    }
  }

  console.log(`Extracted ${referencedAssets.length} asset references from dist/index.html:`);
  referencedAssets.forEach(a => console.log(`   - ${a}`));

  let missingCount = 0;
  referencedAssets.forEach(assetRelPath => {
    // Clean leading ./ or /
    const cleanRel = assetRelPath.replace(/^\.?\//, '');
    const fullPhysicalPath = path.join(__dirname, '..', 'dist', cleanRel);
    const exists = fs.existsSync(fullPhysicalPath);
    if (!exists) {
      console.error(`❌ MISSING ASSET: ${assetRelPath} -> Expected at ${fullPhysicalPath}`);
      missingCount++;
    } else {
      console.log(` ✅ EXISTS: ${assetRelPath}`);
    }
  });

  assertTest('DIST_ASSET_INTEGRITY', missingCount === 0, `All ${referencedAssets.length} referenced assets physically exist in dist/ (${missingCount} missing)`);

  // 3. Electron Main Process Load Path Audit
  console.log('\n>>> STEP 3: ELECTRON MAIN PROCESS LOAD PATH AUDIT...');
  const electronMainPath = path.join(__dirname, '..', 'electron', 'main.cjs');
  const mainContent = fs.readFileSync(electronMainPath, 'utf8');

  const loadsDistIndex = mainContent.includes("path.join(app.getAppPath(), 'dist', 'index.html')") || mainContent.includes("dist/index.html");
  const avoidsStaleElectronIndex = !mainContent.includes("electronIndexPath");

  assertTest('ELECTRON_LOAD_PATH', loadsDistIndex && avoidsStaleElectronIndex, 'Electron main process directly loads dist/index.html, avoiding stale public assets');

  // 4. Vite Base Configuration Check
  console.log('\n>>> STEP 4: VITE BASE CONFIGURATION CHECK...');
  const viteConfigPath = path.join(__dirname, '..', 'vite.config.js');
  const viteConfigContent = fs.readFileSync(viteConfigPath, 'utf8');
  const hasRelativeBase = viteConfigContent.includes("base: './'");

  assertTest('VITE_RELATIVE_BASE', hasRelativeBase, "vite.config.js specifies base: './' for Electron file:// URL compatibility");

  console.log('\n======================================================================');
  console.log(`TOTAL ASSET INTEGRITY TESTS PASSED: ${passed}`);
  console.log(`TOTAL ASSET INTEGRITY TESTS FAILED: ${failed}`);
  console.log('======================================================================\n');

  if (failed > 0) {
    console.error('❌ ELECTRON ASSET INTEGRITY & WHITE SCREEN FIX = FAIL');
    process.exit(1);
  } else {
    console.log('🎉 ELECTRON ASSET INTEGRITY & WHITE SCREEN FIX = PASS');
  }
}

runElectronAssetIntegritySuite();
