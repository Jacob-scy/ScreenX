const fs = require('fs');
const path = require('path');

const siteDir = 'D:\\ClaudeCodePj\\ScreenX\\release-site';
const files = fs.readdirSync(siteDir).filter(f => f.endsWith('.html') || f.endsWith('.js') || f.endsWith('.css'));

for (const file of files) {
  const filePath = path.join(siteDir, file);
  const buf = fs.readFileSync(filePath);
  const hasReplacement = buf.includes(Buffer.from([0xef, 0xbf, 0xbd]));
  console.log(file + ': ' + buf.length + ' bytes, badEncoding: ' + hasReplacement);
}
