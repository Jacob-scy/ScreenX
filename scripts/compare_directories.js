const fs = require('fs');
const path = require('path');

const dirOld = 'D:\\ClaudeCodePj\\Screenshot';
const dirNew = 'D:\\ClaudeCodePj\\ScreenX';

const ignoreSet = new Set(['node_modules', 'build', 'dist', '.git', 'out', 'artifacts', 'temp']);

function walk(dir, base = '', results = []) {
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const item of list) {
    if (ignoreSet.has(item)) continue;
    const rel = path.join(base, item);
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full, rel, results);
    } else {
      results.push(rel);
    }
  }
  return results;
}

const oldFiles = walk(dirOld);
const newFiles = new Set(walk(dirNew));

console.log(`Screenshot total files (excluding temp/build/git): ${oldFiles.length}`);
console.log(`ScreenX total files (excluding temp/build/git): ${newFiles.size}`);

const onlyInOld = [];
for (const f of oldFiles) {
  if (!newFiles.has(f)) {
    onlyInOld.push(f);
  }
}

console.log(`\nFiles only in Screenshot (${onlyInOld.length}):`);
onlyInOld.forEach(f => console.log(' - ' + f));
