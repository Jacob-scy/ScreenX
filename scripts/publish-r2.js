// @ts-check
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('>>> [Cloudflare R2] 开始同步 ScreenX 发布包到 R2...');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = pkg.version;
const bucketName = 'screenx-releases';

// 配置代理防止直传境外 R2 超时
const proxy = process.env.HTTP_PROXY || process.env.HTTPS_PROXY || 'http://127.0.0.1:7897';
process.env.HTTP_PROXY = proxy;
process.env.HTTPS_PROXY = proxy;
process.env.ALL_PROXY = proxy;
console.log(`    同步网络代理: ${proxy}`);

const releaseVerDir = path.resolve('release', `v${version}`);
const latestJson = path.resolve('release', 'latest.json');

if (!fs.existsSync(releaseVerDir) || !fs.existsSync(latestJson)) {
    console.error('发布产物不存在，请先运行: pnpm run build:release');
    process.exit(1);
}

// 检查/创建 Bucket
console.log(`>>> 检查/创建存储桶: ${bucketName}...`);
try {
    execSync(`pnpm exec wrangler r2 bucket create ${bucketName}`, { stdio: 'inherit', env: process.env });
} catch (e) {
    console.log(`存储桶 ${bucketName} 已存在或已就绪。`);
}

// 上传安装包
const installerPath = path.join(releaseVerDir, `ScreenX-Setup-${version}.exe`);
if (fs.existsSync(installerPath)) {
    console.log(`>>> 上传安装包: ScreenX-Setup-${version}.exe...`);
    const cmd = `pnpm exec wrangler r2 object put ${bucketName}/screenx/v${version}/ScreenX-Setup-${version}.exe --file "${installerPath}" --content-type application/octet-stream --content-disposition "attachment; filename=\\"ScreenX-Setup-${version}.exe\\"" --remote`;
    execSync(cmd, { stdio: 'inherit', env: process.env });
}

// 上传便携包
const zipPath = path.join(releaseVerDir, `ScreenX-${version}-win.zip`);
if (fs.existsSync(zipPath)) {
    console.log(`>>> 上传便携包: ScreenX-${version}-win.zip...`);
    const cmd = `pnpm exec wrangler r2 object put ${bucketName}/screenx/v${version}/ScreenX-${version}-win.zip --file "${zipPath}" --content-type application/zip --remote`;
    execSync(cmd, { stdio: 'inherit', env: process.env });
}

// 上传源码包
const sourcePath = path.join(releaseVerDir, `ScreenX-${version}-source.zip`);
if (fs.existsSync(sourcePath)) {
    console.log(`>>> 上传源码包: ScreenX-${version}-source.zip...`);
    const cmd = `pnpm exec wrangler r2 object put ${bucketName}/screenx/v${version}/ScreenX-${version}-source.zip --file "${sourcePath}" --content-type application/zip --remote`;
    execSync(cmd, { stdio: 'inherit', env: process.env });
}

// 上传 SHA256SUMS.txt
const sumsPath = path.join(releaseVerDir, 'SHA256SUMS.txt');
if (fs.existsSync(sumsPath)) {
    console.log(`>>> 上传 SHA256SUMS.txt...`);
    const sumsCmd = `pnpm exec wrangler r2 object put ${bucketName}/screenx/v${version}/SHA256SUMS.txt --file "${sumsPath}" --content-type text/plain --remote`;
    execSync(sumsCmd, { stdio: 'inherit', env: process.env });
}

// 上传 latest.json (发布目录与根目录双重支持)
console.log('>>> 上传最新元数据: latest.json (短缓存)...');
const metaCmd = `pnpm exec wrangler r2 object put ${bucketName}/screenx/latest.json --file "${latestJson}" --content-type application/json --cache-control "max-age=60, must-revalidate" --remote`;
execSync(metaCmd, { stdio: 'inherit', env: process.env });
const metaCmdRoot = `pnpm exec wrangler r2 object put ${bucketName}/latest.json --file "${latestJson}" --content-type application/json --cache-control "max-age=60, must-revalidate" --remote`;
execSync(metaCmdRoot, { stdio: 'inherit', env: process.env });

// 配置自定义域名 download.jacobscy.xyz
console.log('>>> 验证 R2 自定义域名 download.jacobscy.xyz 状态...');
try {
    execSync(`pnpm exec wrangler r2 bucket domain list ${bucketName}`, { stdio: 'inherit', env: process.env });
} catch (e) {
    console.log('自定义域名可能已关联。');
}

console.log('>>> R2 同步流程处理完成！');
