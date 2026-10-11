// @ts-check
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('>>> [Cloudflare Pages] 开始部署 ScreenX 官网...');
const siteDir = path.resolve('release-site');
const projectName = 'screenx';

if (!fs.existsSync(siteDir) || !fs.existsSync(path.join(siteDir, 'index.html'))) {
    console.error('静态站点目录不存在，请先检查 release-site/index.html');
    process.exit(1);
}

// 检查/创建 Pages 项目
console.log(`>>> 检查/创建 Cloudflare Pages 项目: ${projectName}...`);
try {
    execSync(`pnpm exec wrangler pages project create ${projectName} --production-branch main`, { stdio: 'inherit' });
} catch (e) {
    console.log(`Pages 项目 ${projectName} 已存在或准备就绪。`);
}

// 部署 release-site
console.log(`>>> 执行静态文件直接部署 (Direct Upload)...`);
execSync(`pnpm exec wrangler pages deploy "${siteDir}" --project-name ${projectName} --branch main --commit-dirty=true`, { stdio: 'inherit' });

console.log('>>> Pages 部署流程处理完成！');
console.log('    官方生产域名: https://screenx.jacobscy.xyz');
