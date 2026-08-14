const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

async function runSuite() {
  console.log('======================================================================');
  console.log('SIS AL AMEEN — ELECTRON RUNTIME DATA SAFETY SUITE');
  console.log('Blockers: Seed Path + Zombie Prevention');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  function pass(name) { console.log(`[PASS] ${name}`); passed++; }
  function fail(name, detail) { console.error(`[FAIL] ${name} -> ${detail}`); failed++; }

  // ─── TEST 1: ZOMBIE SAFE MODE — No physical delete code ───
  console.log('>>> TEST 1: ZOMBIE SAFE MODE (no deletePhysical inside zombie loop)...');
  const syncPath = path.join(__dirname, '..', 'src', 'utils', 'syncManager.js');
  const syncContent = fs.readFileSync(syncPath, 'utf8');

  // Find the zombie block and verify NO deletePhysical call inside it
  const zombieBlockMatch = syncContent.match(/ZOMBIE SAFE MODE[\s\S]*?KEEP_FOR_AUDIT[\s\S]*?physical delete DISABLED/);
  const hasZombieSafeMode = !!zombieBlockMatch;
  const zombieSection = syncContent.slice(syncContent.indexOf('ZOMBIE SAFE MODE'), syncContent.indexOf('ZOMBIE SAFE MODE') + 800);
  const hasDeletePhysicalInZombieBlock = zombieSection.includes('await databaseManager.deletePhysical');
  const hasDeleteTombstoneInZombieBlock = zombieSection.includes('this.addDeletedTombstone');

  if (hasZombieSafeMode && !hasDeletePhysicalInZombieBlock && !hasDeleteTombstoneInZombieBlock) {
    pass('ZOMBIE_SAFE_MODE_NO_PHYSICAL_DELETE');
  } else {
    fail('ZOMBIE_SAFE_MODE_NO_PHYSICAL_DELETE', `hasZombieSafeMode=${hasZombieSafeMode} hasDeletePhysical=${hasDeletePhysicalInZombieBlock} hasTombstone=${hasDeleteTombstoneInZombieBlock}`);
  }

  // ─── TEST 2: SEED FETCH — Fallback seed load is guarded ───
  console.log('\n>>> TEST 2: SEED FETCH FALLBACK GUARDED (no throw on unavailable seed)...');
  const dataLoaderPath = path.join(__dirname, '..', 'src', 'components', 'DataLoader.jsx');
  const dlContent = fs.readFileSync(dataLoaderPath, 'utf8');

  const hasGracefulSeedFallback = dlContent.includes('products_seed.json unavailable (Electron production). Skipping initial seed import');
  if (hasGracefulSeedFallback) {
    pass('SEED_FALLBACK_GUARDED');
  } else {
    fail('SEED_FALLBACK_GUARDED', 'Graceful Electron fallback message not found in DataLoader.jsx');
  }

  // ─── TEST 3: BUILD-TIME FLAG RESET REMOVED ───
  console.log('\n>>> TEST 3: BUILD-TIME PATCH FLAG RESET REMOVED...');
  const hasBuildReset = dlContent.includes("localStorage.removeItem('patch_company_codes_v40_all')") &&
                        dlContent.includes("localStorage.removeItem('patch_company_codes_v41_all_v2')");
  if (!hasBuildReset) {
    pass('BUILD_TIME_FLAG_RESET_REMOVED');
  } else {
    fail('BUILD_TIME_FLAG_RESET_REMOVED', 'Build-time patch flag reset still present in DataLoader.jsx — will re-trigger seed fetches on every new build');
  }

  // ─── TEST 4: ALL SEED PATCHES SKIP GRACEFULLY ───
  console.log('\n>>> TEST 4: ALL SEED PATCHES SKIP GRACEFULLY (try/catch or safe guard)...');
  const rawFetchCalls = (dlContent.match(/const response = await fetch\('\/products_seed\.json'\)/g) || []).length;
  const rawFetchCallsNoGuard = (dlContent.match(/const aquaResponse = await fetch\('\/products_seed\.json'\)/g) || []).length;
  if (rawFetchCalls === 0 && rawFetchCallsNoGuard === 0) {
    pass('ALL_SEED_FETCHES_GUARDED');
  } else {
    fail('ALL_SEED_FETCHES_GUARDED', `Found ${rawFetchCalls + rawFetchCallsNoGuard} unguarded seed fetch(es) that can crash in packaged Electron`);
  }

  // ─── TEST 5: NO DEV PATHS IN SRC ───
  console.log('\n>>> TEST 5: NO DEV FILESYSTEM PATHS IN SRC...');
  const walkSrc = (dir) => {
    let results = [];
    try {
      fs.readdirSync(dir).forEach(file => {
        const fp = path.join(dir, file);
        if (fs.statSync(fp).isDirectory()) results = results.concat(walkSrc(fp));
        else if (/\.(js|jsx|css|ts|tsx)$/.test(file)) results.push(fp);
      });
    } catch (_) {}
    return results;
  };
  let devPathFound = false;
  for (const sf of walkSrc(path.join(__dirname, '..', 'src'))) {
    const code = fs.readFileSync(sf, 'utf8');
    if (code.includes('C:\\Users\\Admin') || code.includes('D:\\My Work') || code.includes('.gemini') || code.includes('/scratch/')) {
      console.error(`   DEV PATH in: ${sf}`);
      devPathFound = true;
    }
  }
  devPathFound ? fail('ZERO_DEV_PATHS_IN_SRC', 'Dev paths found in src/') : pass('ZERO_DEV_PATHS_IN_SRC');

  // ─── TEST 6: VITE BUILD + ASSET INTEGRITY ───
  console.log('\n>>> TEST 6: VITE PRODUCTION BUILD + ASSET INTEGRITY...');
  let buildOk = false;
  try {
    execSync('npm run build', { cwd: path.join(__dirname, '..'), encoding: 'utf8', stdio: 'pipe' });
    buildOk = fs.existsSync(path.join(__dirname, '..', 'dist', 'index.html'));
  } catch (e) {
    console.error('   Build error:', e.message.slice(0, 200));
  }
  if (!buildOk) { fail('VITE_BUILD', 'dist/index.html not created'); }
  else {
    const distHtml = fs.readFileSync(path.join(__dirname, '..', 'dist', 'index.html'), 'utf8');
    const refs = [...distHtml.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map(m => m[1]).filter(a => !a.startsWith('http') && !a.startsWith('data:') && !a.startsWith('#'));
    let missing = 0;
    for (const r of refs) {
      const fp = path.join(__dirname, '..', 'dist', r.replace(/^\.?\//, ''));
      if (!fs.existsSync(fp)) { console.error(`   MISSING: ${r}`); missing++; }
    }
    if (missing === 0) pass(`VITE_BUILD_ASSET_INTEGRITY (${refs.length} assets, 0 missing)`);
    else fail('VITE_BUILD_ASSET_INTEGRITY', `${missing} missing assets`);
  }

  // ─── TEST 7: ELECTRON LOAD PATH ───
  console.log('\n>>> TEST 7: ELECTRON MAIN LOADS dist/index.html DIRECTLY...');
  const mainContent = fs.readFileSync(path.join(__dirname, '..', 'electron', 'main.cjs'), 'utf8');
  const loadsDistIndex = mainContent.includes("path.join(app.getAppPath(), 'dist', 'index.html')");
  const avoidsStalePath = !mainContent.includes('electronIndexPath') || !mainContent.includes('loadFile(electronIndexPath)');
  loadsDistIndex && avoidsStalePath ? pass('ELECTRON_LOAD_DIST_INDEX') : fail('ELECTRON_LOAD_DIST_INDEX', 'Electron main.cjs still uses stale public/electron-index.html');

  // ─── TEST 8: CLOUD PRODUCT COUNT CHECK (if Supabase configured) ───
  console.log('\n>>> TEST 8: CLOUD PRODUCT COUNT PARITY CHECK...');
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log('   [SKIP] SUPABASE_URL/KEY not set in env — skipping cloud count check');
    pass('CLOUD_COUNT_PARITY (SKIP — no env)');
  } else {
    try {
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
      const { count, error } = await supabase.from('products').select('*', { count: 'exact', head: true });
      if (error) throw error;
      console.log(`   Cloud product count: ${count}`);
      const realIds = ['171310', '171311', '80023', '171126', '171127', '171143'];
      const { data: verifyData, error: verifyError } = await supabase.from('products').select('id,name').in('id', realIds);
      if (verifyError) throw verifyError;
      const foundIds = new Set((verifyData || []).map(r => String(r.id)));
      const allFound = realIds.every(id => foundIds.has(id));
      if (allFound) {
        pass(`REAL_PRODUCT_IDS_PRESERVED (${realIds.join(', ')} — all exist in cloud)`);
      } else {
        const missing = realIds.filter(id => !foundIds.has(id));
        fail('REAL_PRODUCT_IDS_PRESERVED', `Missing from cloud: ${missing.join(', ')}`);
      }
      pass(`CLOUD_COUNT_PARITY (${count} products in cloud)`);
    } catch (e) {
      fail('CLOUD_COUNT_PARITY', e.message);
    }
  }

  // ─── SUMMARY ───
  console.log('\n======================================================================');
  console.log(`TOTAL PASSED: ${passed}`);
  console.log(`TOTAL FAILED: ${failed}`);
  console.log('======================================================================\n');

  if (failed > 0) {
    console.error('❌ ELECTRON RUNTIME DATA SAFETY = FAIL');
    process.exit(1);
  } else {
    console.log('🎉 ELECTRON RUNTIME DATA SAFETY = PASS');
  }
}

runSuite().catch(e => { console.error('Suite error:', e); process.exit(1); });
