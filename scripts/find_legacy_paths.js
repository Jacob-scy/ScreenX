const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const ignoreDirs = new Set(['node_modules', 'build', 'dist', '.git', 'out', 'artifacts']);

function walk(dir, results = []) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (ignoreDirs.has(file)) continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath, results);
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

const files = walk(rootDir);
console.log(`Scanning ${files.length} files in ${rootDir}...`);

const matches = [];

for (const f of files) {
  try {
    const content = fs.readFileSync(f, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (/ClaudeCodePj[\\\/]Screenshot/i.test(line)) {
        matches.push({ file: path.relative(rootDir, f), line: idx + 1, text: line.trim() });
      }
    });
  } catch (e) {
    // binary or unreadable
  }
}

console.log(`\nFound ${matches.length} legacy path references:`);
matches.forEach(m => {
  console.log(`[${m.file}:${m.line}] ${m.text}`);
});
