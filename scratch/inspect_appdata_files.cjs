const fs = require('fs');
const path = require('path');

const dirs = [
  'C:\\Users\\Admin\\AppData\\Roaming\\pos-system-modern-ui',
  'C:\\Users\\Admin\\AppData\\Roaming\\SIS AL AMEEN'
];

function inspectAppDir(dirPath) {
  console.log('\n========================================');
  console.log('Inspecting:', dirPath);
  console.log('========================================');
  if (!fs.existsSync(dirPath)) {
    console.log('Does not exist.');
    return;
  }
  
  function walk(currentDir, depth = 0) {
    if (depth > 4) return;
    try {
      const items = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(currentDir, item.name);
        if (item.isDirectory()) {
          console.log(`${'  '.repeat(depth)}[DIR] ${item.name}`);
          walk(fullPath, depth + 1);
        } else {
          const stats = fs.statSync(fullPath);
          console.log(`${'  '.repeat(depth)}[FILE] ${item.name} (${stats.size} bytes)`);
        }
      }
    } catch (e) {
      console.log('Error reading:', currentDir, e.message);
    }
  }
  
  walk(dirPath);
}

dirs.forEach(inspectAppDir);
