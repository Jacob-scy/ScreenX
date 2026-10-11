# ScreenX 公开发布与维护指南 (PUBLIC_RELEASE.md)

## 1. 总体分发架构

ScreenX 的公网发布与分发体系基于轻量化、全球 CDN 边缘节点构建：

```text
                 nav.jacobscy.xyz (Personal Portal)
                        │
                        │ ScreenX 入口
                        ▼
              screenx.jacobscy.xyz (Cloudflare Pages)
              - 官方产品页面与功能展示
              - 系统规格与使用指南
              - 首次运行安全说明 (SmartScreen)
              - 安装与卸载指南
              - 常见问题解答 (FAQ)
              - 隐私说明 (/privacy)
              - 版本发布说明与 SHA-256 校验清单 (/release)
              - 开源与 GPL-3.0 合规声明
                        │
             ┌──────────┴──────────┐
             │                     │
             ▼                     ▼
        产品介绍               下载 Windows
                                   │
                                   ▼
                         download.jacobscy.xyz (Cloudflare R2 自定义域名)
                                   │
                 ┌─────────────────┼────────────────┐
                 ▼                 ▼                ▼
     ScreenX-Setup-1.0.0.exe  ScreenX-1.0.0-win.zip  ScreenX-1.0.0-source.zip
         (NSIS 安装包)          (绿色便携版)           (GPL-3.0 源码归档)
```

## 2. 官方公网地址与端点

- **产品官方主页**: `https://screenx.jacobscy.xyz/`
- **版本发布与校验**: `https://screenx.jacobscy.xyz/release` (或 `/release.html`)
- **隐私说明**: `https://screenx.jacobscy.xyz/privacy` (或 `/privacy.html`)
- **文件下载 CDN**: `https://download.jacobscy.xyz/`
- **个人导航门户**: `https://nav.jacobscy.xyz/`
- **最新元数据 API**: `https://download.jacobscy.xyz/latest.json`
- **完整性校验和**: `https://download.jacobscy.xyz/screenx/v1.0.0/SHA256SUMS.txt`
- **开源协议**: GNU General Public License v3.0 (GPL-3.0)

## 3. 发布物目录规范 (Cloudflare R2)

存储桶 `screenx-releases` 统一以前缀 `screenx/` 组织：

```text
screenx/
├── latest.json
└── v1.0.0/
    ├── SHA256SUMS.txt
    ├── ScreenX-Setup-1.0.0.exe
    ├── ScreenX-1.0.0-win.zip
    └── ScreenX-1.0.0-source.zip
```

- 版本目录（如 `/screenx/v1.0.0/`）属于不可变资产，设置长期缓存时间。
- 根元数据文件（`/latest.json` 及 `/screenx/latest.json`）属于动态入口，设置短缓存（`Cache-Control: max-age=60, must-revalidate`）。

## 4. 标准发布 11 步操作规程 (Standard Release Workflow)

每次发布新版本（例如 `v1.0.1`）时，遵循以下 11 步操作标准：

### 步骤 1：修改版本号 (Update Version)
- 修改 `package.json` 中的 `"version": "1.0.1"`。
- 同步更新相关文档版本记录。

### 步骤 2：构建 Windows 核心产物 (Build Windows)
- 执行代码规范检查与测试：`pnpm run lint`、`pnpm run typecheck`、`pnpm run test`。
- 编译 Windows 原生物理缓冲区捕获引擎：`pnpm run build:native`（生成 `resources/bin/wincapture.exe`）。
- 编译主进程与渲染进程：`electron-vite build`。

### 步骤 3：生成 NSIS 安装包 (Generate Installer)
- 运行 `electron-builder` 打包 Windows 引导安装包。
- 产出产物：`release/v1.0.1/ScreenX-Setup-1.0.1.exe`。

### 步骤 4：生成绿色便携版 ZIP (Generate Portable)
- 打包无需安装的便携版本。
- 注意排除构建缓存与无用跨平台文件（严格控制在 Cloudflare 限制以内）。
- 产出产物：`release/v1.0.1/ScreenX-1.0.1-win.zip`。

### 步骤 5：生成 GPL-3.0 纯净源码包 (Generate Source ZIP)
- 遵循 GPL-3.0 协议要求制作完整源码归档包。
- 严格排除：`node_modules`、`dist`、`build`、`.git`、`.env*`、Cloudflare 密钥及本地临时文件。
- 产出产物：`release/v1.0.1/ScreenX-1.0.1-source.zip`。

### 步骤 6：计算并生成 SHA-256 完整性校验和 (Generate SHA-256)
- 针对上述三大产物生成哈希：
  ```powershell
  Get-FileHash release\v1.0.1\* -Algorithm SHA256
  ```
- 生成 `release/v1.0.1/SHA256SUMS.txt` 与 `release-site/SHA256SUMS.txt`。

### 步骤 7：上传产物至 Cloudflare R2 (Upload R2)
- 上传所有二进制产物与 `SHA256SUMS.txt` 至 `screenx-releases` 存储桶 `screenx/v1.0.1/` 目录。

### 步骤 8：更新版本元数据 manifest (Update latest.json)
- 在 `release/latest.json` 中更新版本号、各安装包直链及真实 SHA-256 哈希值。
- 将 `latest.json` 上传至 R2，设置短缓存策略（`max-age=60`）。

### 步骤 9：更新并部署静态官网 (Deploy Pages)
- 更新 `release-site/` 页面（更新 `index.html`、`release.html`、`privacy.html` 与 `sitemap.xml`）。
- 运行 `pnpm run deploy:site`（或 `node scripts/deploy-site.js`）部署至 Cloudflare Pages。

### 步骤 10：更新个人导航门户 (Update Navigation)
- 检查 `D:\ClaudeCodePj\Navigation`。
- 确认 `portal-frontend/app/stores/resource.ts` 中的 ScreenX 版本号与链接一致。

### 步骤 11：全量公网自测与验收 (Verification)
- 验证 `https://screenx.jacobscy.xyz/` 首页、功能卡片、FAQ 与首运说明。
- 验证所有下载链接（安装包、便携版、源码包、校验和）均返回 `HTTP 200 OK` 且哈希匹配。
- 验证 `nav.jacobscy.xyz` 跳转正常无死链。

## 5. 自动化脚本支持

本项目已提供自动化辅助脚本：
- `pnpm run build:release` (一键执行步骤 2~6)
- `pnpm run deploy:site` (一键执行步骤 9)
- `pnpm run publish:r2` (一键执行步骤 7~8)
- `pnpm run release` (全链路一键自动完成)

---
*注：详细架构说明与部署实战请参考 [DEPLOY.md](./DEPLOY.md)。*
