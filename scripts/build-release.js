// @ts-check
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('>>> [1/5] 读取并验证项目版本与环境...');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = pkg.version;
const productName = pkg.productName || 'ScreenX';

console.log(`    产品名称: ${productName}`);
console.log(`    发布版本: ${version}`);

// 设置本地构建代理（防止 electron-builder 下载 winCodeSign/nsis 失败）
const proxy = 'http://127.0.0.1:7897';
process.env.HTTP_PROXY = proxy;
process.env.HTTPS_PROXY = proxy;
process.env.ALL_PROXY = proxy;
console.log(`    设置构建代理: ${proxy}`);

console.log('>>> [2/5] 编译原生模块与渲染进程...');
execSync('pnpm run build', { stdio: 'inherit', env: process.env });

console.log('>>> [3/5] 执行 electron-builder 生成 Windows 安装包与便携包...');
execSync('pnpm exec electron-builder --win -c electron-builder.config.js', { stdio: 'inherit', env: process.env });

const buildDir = path.resolve('build');
const releaseDir = path.resolve('release');
const releaseVerDir = path.join(releaseDir, `v${version}`);

if (!fs.existsSync(releaseVerDir)) {
    fs.mkdirSync(releaseVerDir, { recursive: true });
}

// 规范化安装包
const files = fs.readdirSync(buildDir);
const exeFile = files.find(f => f.toLowerCase().endsWith('.exe') && (f.includes('Setup') || f.includes(productName)));
if (exeFile) {
    const srcExe = path.join(buildDir, exeFile);
    const dstExe = path.join(releaseVerDir, `ScreenX-Setup-${version}.exe`);
    fs.copyFileSync(srcExe, dstExe);
    console.log(`    [OK] 安装包就绪: ${dstExe}`);
} else {
    console.warn('    [警告] 未在 build 目录下找到安装包 EXE 文件！');
}

// 规范化便携包
const zipFile = files.find(f => f.toLowerCase().endsWith('.zip') && f.includes(productName));
if (zipFile) {
    const srcZip = path.join(buildDir, zipFile);
    const dstZip = path.join(releaseVerDir, `ScreenX-${version}-win.zip`);
    fs.copyFileSync(srcZip, dstZip);
    console.log(`    [OK] 便携包就绪: ${dstZip}`);
}

console.log('>>> [4/5] 制作合规开源源码包 (ScreenX-' + version + '-source.zip)...');
const sourceZipDst = path.join(releaseVerDir, `ScreenX-${version}-source.zip`);
const tempSourceDir = path.join(process.env.TEMP || 'C:\\Windows\\Temp', `screenx-source-${version}`);

if (fs.existsSync(tempSourceDir)) {
    fs.rmSync(tempSourceDir, { recursive: true, force: true });
}
fs.mkdirSync(tempSourceDir, { recursive: true });

const includeList = [
    'src', 'resources', 'test', 'scripts', 'assets', 'lib',
    'package.json', 'pnpm-lock.yaml', 'tsconfig.json', 'tsconfig.node.json',
    'electron.vite.config.ts', 'electron-builder.config.js', 'biome.json',
    'vitest.config.ts', 'LICENSE', 'NOTICE.md', 'README.md', 'THIRD_PARTY_NOTICES.md'
];

for (const item of includeList) {
    if (fs.existsSync(item)) {
        fs.cpSync(item, path.join(tempSourceDir, item), { recursive: true });
    }
}

if (fs.existsSync(sourceZipDst)) {
    fs.unlinkSync(sourceZipDst);
}

// 使用 powershell Compress-Archive 压缩源码
execSync(`powershell -ExecutionPolicy Bypass -Command "Compress-Archive -Path '${tempSourceDir}\\*' -DestinationPath '${sourceZipDst}' -Force"`, { stdio: 'inherit' });
fs.rmSync(tempSourceDir, { recursive: true, force: true });
console.log(`    [OK] 源码包就绪: ${sourceZipDst}`);

const crypto = require('crypto');
function getFileSha256(filePath) {
    if (!fs.existsSync(filePath)) return '';
    return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

console.log('>>> [5/5] 计算真实 SHA-256 并生成发布元数据...');
const installerFile = `ScreenX-Setup-${version}.exe`;
const portableFile = `ScreenX-${version}-win.zip`;
const sourceFile = `ScreenX-${version}-source.zip`;

const installerHash = getFileSha256(path.join(releaseVerDir, installerFile));
const portableHash = getFileSha256(path.join(releaseVerDir, portableFile));
const sourceHash = getFileSha256(path.join(releaseVerDir, sourceFile));

const sumsContent = [
    `${installerHash}  ${installerFile}`,
    `${portableHash}  ${portableFile}`,
    `${sourceHash}  ${sourceFile}`
].join('\n') + '\n';

fs.writeFileSync(path.join(releaseVerDir, 'SHA256SUMS.txt'), sumsContent, 'utf8');
fs.writeFileSync(path.join(releaseDir, 'SHA256SUMS.txt'), sumsContent, 'utf8');
const siteDir = path.resolve('release-site');
if (fs.existsSync(siteDir)) {
    fs.writeFileSync(path.join(siteDir, 'SHA256SUMS.txt'), sumsContent, 'utf8');
}
console.log(`    [OK] SHA256SUMS.txt 已生成`);

const releaseDate = new Date().toISOString();
const latestMeta = {
    name: productName,
    version: version,
    platform: 'windows',
    arch: 'x64',
    releaseDate: releaseDate,
    installer: `https://download.jacobscy.xyz/screenx/v${version}/${installerFile}`,
    portable: `https://download.jacobscy.xyz/screenx/v${version}/${portableFile}`,
    source: `https://download.jacobscy.xyz/screenx/v${version}/${sourceFile}`,
    sha256: {
        installer: installerHash,
        portable: portableHash,
        source: sourceHash
    }
};

const latestJsonPath = path.join(releaseDir, 'latest.json');
fs.writeFileSync(latestJsonPath, JSON.stringify(latestMeta, null, 2), 'utf8');
console.log(`    [OK] 元数据就绪: ${latestJsonPath}`);

console.log('\n>>> 全部构建与发布产物准备完成！');
const releaseFiles = fs.readdirSync(releaseVerDir);
for (const rf of releaseFiles) {
    const st = fs.statSync(path.join(releaseVerDir, rf));
    console.log(`    - ${rf} (${(st.size / (1024 * 1024)).toFixed(2)} MB)`);
}
