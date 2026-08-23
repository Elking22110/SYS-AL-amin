/**
 * PROVE WHAT THE EXE IS ACTUALLY RUNNING & AUDIT APPDATA LEVELDB
 * =============================================================
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

console.log('\n==================================================');
console.log('1. PROVE WHAT THE EXE IS ACTUALLY RUNNING');
console.log('==================================================');

const exeUnpackedPath = path.join(__dirname, '../release/win-unpacked/SIS AL AMEEN - نظام الأمين.exe');
const exeSetupPath = path.join(__dirname, '../release/SIS AL AMEEN - نظام الأمين Setup 2.0.0.exe');
const packageJsonPath = path.join(__dirname, '../package.json');

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

let gitCommit = 'UNKNOWN';
try {
  gitCommit = execSync('git rev-parse HEAD', { cwd: path.join(__dirname, '..') }).toString().trim();
} catch (_) {}

console.log(`Package Name        : ${packageJson.name}`);
console.log(`Package Version     : ${packageJson.version}`);
console.log(`Git Commit          : ${gitCommit}`);

if (fs.existsSync(exeUnpackedPath)) {
  const stats = fs.statSync(exeUnpackedPath);
  console.log(`EXE Unpacked Path   : ${exeUnpackedPath}`);
  console.log(`EXE Unpacked Size   : ${(stats.size / (1024 * 1024)).toFixed(2)} MB (${stats.size} bytes)`);
  console.log(`EXE Unpacked ModTime: ${stats.mtime.toISOString()}`);
} else {
  console.log(`❌ EXE Unpacked Path NOT FOUND: ${exeUnpackedPath}`);
}

if (fs.existsSync(exeSetupPath)) {
  const stats = fs.statSync(exeSetupPath);
  console.log(`EXE Setup Path      : ${exeSetupPath}`);
  console.log(`EXE Setup Size      : ${(stats.size / (1024 * 1024)).toFixed(2)} MB (${stats.size} bytes)`);
  console.log(`EXE Setup ModTime   : ${stats.mtime.toISOString()}`);
} else {
  console.log(`❌ EXE Setup Path NOT FOUND: ${exeSetupPath}`);
}

console.log('\n==================================================');
console.log('3. AUDIT ELECTRON USERDATA DIRECTORIES');
console.log('==================================================');

const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');

const targets = [
  { name: 'PROD (SIS AL AMEEN)', path: path.join(appData, 'SIS AL AMEEN') },
  { name: 'DEV (pos-system-modern-ui)', path: path.join(appData, 'pos-system-modern-ui') },
  { name: 'DEV (Electron)', path: path.join(appData, 'Electron') }
];

targets.forEach(target => {
  console.log(`\n📁 Target: ${target.name}`);
  console.log(`   Path  : ${target.path}`);
  if (!fs.existsSync(target.path)) {
    console.log(`   Status: ❌ Folder DOES NOT EXIST`);
    return;
  }
  console.log(`   Status: ✅ Folder EXISTS`);

  const idbPath = path.join(target.path, 'IndexedDB');
  if (fs.existsSync(idbPath)) {
    console.log(`   IndexedDB Folder: ${idbPath}`);
    const items = fs.readdirSync(idbPath);
    items.forEach(item => {
      const p = path.join(idbPath, item);
      const s = fs.statSync(p);
      console.log(`     - ${item} (${s.isDirectory() ? 'DIR' : 'FILE'}, ${(s.size / 1024).toFixed(1)} KB, Mod: ${s.mtime.toISOString()})`);
    });
  } else {
    console.log(`   IndexedDB Folder: ❌ NONE`);
  }

  const lsPath = path.join(target.path, 'Local Storage');
  if (fs.existsSync(lsPath)) {
    console.log(`   Local Storage Folder: ${lsPath}`);
    const items = fs.readdirSync(lsPath);
    items.forEach(item => {
      const p = path.join(lsPath, item);
      const s = fs.statSync(p);
      console.log(`     - ${item} (${s.isDirectory() ? 'DIR' : 'FILE'}, ${(s.size / 1024).toFixed(1)} KB, Mod: ${s.mtime.toISOString()})`);
    });
  } else {
    console.log(`   Local Storage Folder: ❌ NONE`);
  }
});

console.log('\n==================================================\n');
