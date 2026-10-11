const https = require('https');

const urls = [
  'https://screenx.jacobscy.xyz/',
  'https://screenx.jacobscy.xyz/release',
  'https://screenx.jacobscy.xyz/privacy',
  'https://screenx.jacobscy.xyz/assets/ScreenX-og.png',
  'https://screenx.jacobscy.xyz/assets/favicon.ico',
  'https://screenx.jacobscy.xyz/assets/favicon-32x32.png',
  'https://screenx.jacobscy.xyz/assets/logo.svg',
  'https://screenx.jacobscy.xyz/assets/ScreenX.png',
  'https://download.jacobscy.xyz/screenx/latest.json',
  'https://download.jacobscy.xyz/screenx/v1.0.0/ScreenX-Setup-1.0.0.exe',
  'https://download.jacobscy.xyz/screenx/v1.0.0/ScreenX-1.0.0-win.zip',
  'https://download.jacobscy.xyz/screenx/v1.0.0/ScreenX-1.0.0-source.zip',
  'https://download.jacobscy.xyz/screenx/v1.0.0/SHA256SUMS.txt',
  'https://nav.jacobscy.xyz/'
];

async function checkUrl(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD', timeout: 10000 }, (res) => {
      resolve({ url, status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 400 });
    });
    req.on('error', (err) => resolve({ url, status: 'ERROR', error: err.message, ok: false }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ url, status: 'TIMEOUT', ok: false });
    });
    req.end();
  });
}

async function main() {
  console.log('=== Checking Public Endpoints ===');
  let passCount = 0;
  for (const url of urls) {
    const r = await checkUrl(url);
    const mark = r.ok ? '[PASS]' : '[FAIL]';
    console.log(`${mark} (${r.status}) ${r.url}`);
    if (r.ok) passCount++;
  }
  console.log(`\nResult: ${passCount}/${urls.length} endpoints passed.`);
}

main();
