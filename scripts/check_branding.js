const fs = require('fs');
const path = require('path');

const files = [
  'assets/branding/ScreenX.png',
  'assets/branding/ScreenX.ico',
  'assets/branding/ScreenX.svg',
  'assets/branding/ScreenX-og.png',
  'assets/logo/icon.ico',
  'release-site/assets/favicon.ico',
  'release-site/assets/favicon-32x32.png',
  'release-site/assets/ScreenX-og.png',
  'release-site/assets/logo.svg'
];

let allPass = true;
for (const f of files) {
  const full = path.join('D:\\ClaudeCodePj\\ScreenX', f);
  if (fs.existsSync(full)) {
    const s = fs.statSync(full);
    console.log(`[PASS] ${f} (${s.size} bytes)`);
  } else {
    console.log(`[FAIL] ${f} MISSING`);
    allPass = false;
  }
}
if (!allPass) process.exit(1);
