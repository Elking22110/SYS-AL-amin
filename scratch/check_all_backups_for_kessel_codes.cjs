const fs = require('fs');
const path = require('path');

const brainDir = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\ebd2664e-4f6d-489b-b8c1-eb85182a52e4';

function searchAllBackups() {
  console.log('==================================================');
  console.log('SEARCHING ALL BACKUPS FOR KESSEL CODES');
  console.log('==================================================\n');

  const walk = (dir) => {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('.system_generated')) {
          results = results.concat(walk(fullPath));
        }
      } else if (file.endsWith('.json') || file.endsWith('.md')) {
        results.push(fullPath);
      }
    });
    return results;
  };

  const allFiles = walk(brainDir);
  console.log(`Scanning ${allFiles.length} files...`);

  for (const f of allFiles) {
    try {
      const raw = fs.readFileSync(f, 'utf8');
      if (raw.includes('375020016') || raw.includes('كيسيل') || raw.includes('كيسل')) {
        console.log(` 📄 Found Kessel data in file: ${path.relative(brainDir, f)} (${(raw.length/1024).toFixed(1)} KB)`);
      }
    } catch (_) {}
  }
}

searchAllBackups();
