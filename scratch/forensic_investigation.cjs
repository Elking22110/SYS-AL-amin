const fs = require('fs');

const searchTerms = [
  'delete',
  'tombstone',
  'deduplicate',
  'deduplication',
  'sync_status',
  'deletedRecords',
  'purge',
  'cleanup'
];

function scanFilesForDeletions(dir) {
  const results = [];
  const files = fs.readdirSync(dir, { recursive: true });

  files.forEach(f => {
    const fullPath = dir + '/' + f;
    if (fs.statSync(fullPath).isFile() && (f.endsWith('.js') || f.endsWith('.jsx'))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, idx) => {
        if (
          line.includes('.delete(') ||
          line.includes('.deletePhysical(') ||
          line.includes("sync_status = 'deleted'") ||
          line.includes('sync_status === \'deleted\'') ||
          line.includes('deletedRecords') ||
          line.includes('dedup') ||
          line.includes('clean') ||
          line.includes('purge')
        ) {
          results.push({
            file: f,
            lineNum: idx + 1,
            lineText: line.trim()
          });
        }
      });
    }
  });

  return results;
}

const matches = scanFilesForDeletions('./src');
console.log(`Found ${matches.length} deletion/tombstone/deduplication occurrences in code:\n`);
matches.forEach((m, idx) => {
  console.log(`${idx + 1}. [${m.file}:${m.lineNum}] ${m.lineText}`);
});
