# ScreenX 公网发布与部署文档 — Cloudflare Pages / R2 / Navigation 完整指南

> **适用软件**：ScreenX (Windows 桌面版 x64)  
> **当前版本**：v1.0.0  
> **最后更新**：2026-09-25  
> **核心发布体系**：Cloudflare Pages (产品官网) + Cloudflare R2 (安装包 CDN) + Navigation (个人导航门户)  
> **生产服务矩阵**：
> - 官网入口：`https://screenx.jacobscy.xyz/`
> - 下载直达：`https://download.jacobscy.xyz/`
> - 导航集成：`https://nav.jacobscy.xyz/`
> - 元数据接口：`https://download.jacobscy.xyz/screenx/latest.json`

---

## 目录

- [1. 总体架构与发布拓扑](#1-总体架构与发布拓扑)
- [2. 发布资产与规范定义](#2-发布资产与规范定义)
- [3. 本地环境与前置依赖准备](#3-本地环境与前置依赖准备)
- [4. Step-by-Step 生产部署操作指南](#4-step-by-step-生产部署操作指南)
  - [4.1 步骤一：Windows 正式安装包与全量发布物构建](#41-步骤一windows-正式安装包与全量发布物构建)
  - [4.2 步骤二：Cloudflare CLI (Wrangler) 授权认证](#42-步骤二cloudflare-cli-wrangler-授权认证)
  - [4.3 步骤三：部署静态官网至 Cloudflare Pages](#43-步骤三部署静态官网至-cloudflare-pages)
  - [4.4 步骤四：绑定官网自定义域名 (screenx.jacobscy.xyz)](#44-步骤四绑定官网自定义域名-screenxjacobscyxyz)
  - [4.5 步骤五：开通 R2 存储桶并同步全量发布包](#45-步骤五开通-r2-存储桶并同步全量发布包)
  - [4.6 步骤六：配置 R2 自定义下载域名 (download.jacobscy.xyz)](#46-步骤六配置-r2-自定义下载域名-downloadjacobscyxyz)
  - [4.7 步骤七：联动 Navigation 门户与生产验证](#47-步骤七联动-navigation-门户与生产验证)
- [5. 过程核心问题与排障复盘 (FAQ)](#5-过程核心问题与排障复盘-faq)
  - [Q1: electron-builder 打包时依赖下载超时卡死？](#q1-electron-builder-打包时依赖下载超时卡死)
  - [Q2: 执行 Wrangler 命令提示 You are not authenticated？](#q2-执行-wrangler-命令提示-you-are-not-authenticated)
  - [Q3: 静态站点默认部署为了 Preview 预览环境而非 Production？](#q3-静态站点默认部署为了-preview-预览环境而非-production)
  - [Q4: 访问 screenx.jacobscy.xyz 提示 SSL/TLS 握手失败或无法访问？](#q4-访问-screenxjacobscyxyz-提示-ssltls-握手失败或无法访问)
  - [Q5: 存储桶创建报错：Please enable R2 through the Cloudflare Dashboard [code: 10042]？](#q5-存储桶创建报错please-enable-r2-through-the-cloudflare-dashboard-code-10042)
  - [Q6: Wrangler 上传提示 Resource location: local 导致未推送到云端？](#q6-wrangler-上传提示-resource-location-local-导致未推送到云端)
  - [Q7: GPL-3.0 法律合规与源码包自动化生成要求？](#q7-gpl-30-法律合规与源码包自动化生成要求)
  - [Q8: 截图核心防退化与 Native Capture 进程泄漏审计？](#q8-截图核心防退化与-native-capture-进程泄漏审计)
- [6. 自动化脚本与命令速查](#6-自动化脚本与命令速查)
- [7. 新版本发版标准作业程序 (SOP)](#7-新版本发版标准作业程序-sop)

---

## 1. 总体架构与发布拓扑

ScreenX 不经过任何 Linux 服务器，不污染 Linux 既有 Web 业务，基于 **Cloudflare 边缘网络 + 原生 Windows 构建链** 打造完全解耦的高可用分发体系：

```text
                 nav.jacobscy.xyz (Personal Portal)
                        │
                        │ 点击 ScreenX 独立卡片 (在新标签页打开)
                        ▼
              screenx.jacobscy.xyz (Cloudflare Pages)
             ┌─────────────────────────────────────────┐
             │ • 现代暗黑科技风 Hero 展示               │
             │ • 6 大核心桌面功能 (截图/OCR/搜索/翻译)  │
             │ • 系统规格与 Alt+C 快捷键说明           │
             │ • GPL-3.0 开源合规声明与源码直链        │
             │ • 动态抓取 latest.json 自动匹配最新版本 │
             └────────────────────┬────────────────────┘
                                  │
                                  ▼ 点击 [下载 Windows 版]
                        download.jacobscy.xyz (Cloudflare R2 自定义域名)
                                  │
                 ┌────────────────┼────────────────┐
                 ▼                ▼                ▼
      ScreenX-Setup-1.0.0.exe  ScreenX-1.0.0-win.zip  ScreenX-1.0.0-source.zip
         (官方 NSIS 安装包)       (绿色便携免安装包)      (GPL-3.0 纯净源码包)
```

---

## 2. 发布资产与规范定义

所有产物均受版本号严格控制，存放在项目根目录 `release/`：

| 资产文件名 | 规格/大小 | HTTP Content-Type | 缓存策略 (Cache-Control) | 作用 |
| :--- | :--- | :--- | :--- | :--- |
| `ScreenX-Setup-1.0.0.exe` | 约 224.6 MB | `application/octet-stream` | 1 年 (不可变资源) | Windows 官方安装向导，支持卸载、开始菜单与快捷方式 |
| `ScreenX-1.0.0-win.zip` | 约 305.5 MB | `application/zip` | 1 年 (不可变资源) | 绿色免安装版，解压即用，适合 U 盘或快速体验 |
| `ScreenX-1.0.0-source.zip` | 约 32.4 MB | `application/zip` | 1 年 (不可变资源) | GPL-3.0 纯净源码归档（剔除 node_modules、build、dist 等） |
| `latest.json` | 约 388 字节 | `application/json` | `max-age=60, must-revalidate` | 版本元数据 API，供官网动态拉取最新下载直链与版本号 |

---

## 3. 本地环境与前置依赖准备

部署前请确保本地具备以下工具：

1. **Node.js**: `v20.x` 或以上版本。
2. **包管理器**: `pnpm` (推荐 `pnpm@9.x` 或更高)。
3. **C# 编译器**: Windows 自带 `.NET Framework` 目录下的 `csc.exe`（用于编译原生 `wincapture.exe`）。
4. **Cloudflare CLI**: 本地已在 devDependencies 中安装 `wrangler`。

---

## 4. Step-by-Step 生产部署操作指南

### 4.1 步骤一：Windows 正式安装包与全量发布物构建

执行预设的一键构建脚本，该脚本自动处理高 DPI 原生捕获组件、打包、源码归档与元数据生成：

```powershell
cd D:\ClaudeCodePj\ScreenX
pnpm run build:release
```

- **输出路径**：`D:\ClaudeCodePj\ScreenX\release\`
- **验证点**：检查目录中已生成 `ScreenX-Setup-1.0.0.exe`、`ScreenX-1.0.0-win.zip`、`ScreenX-1.0.0-source.zip` 以及 `latest.json`。

### 4.2 步骤二：Cloudflare CLI (Wrangler) 授权认证

由于系统安全规范严禁在代码中硬编码任何 Token 或密码，首次使用需执行官方浏览器 OAuth 授权：

```powershell
pnpm exec wrangler login
```

- **操作**：默认浏览器会自动弹出 Cloudflare 官方授权页面，点击 **“Allow”** 即可授权成功。
- **验证**：运行 `pnpm exec wrangler whoami`，终端显示当前 Cloudflare 账户信息。

### 4.3 步骤三：部署静态官网至 Cloudflare Pages

执行官网部署脚本，使用 Wrangler Direct Upload 将 `release-site/` 静态站点直接部署至全球 CDN：

```powershell
pnpm run deploy:site
```

- **生效地址**：控制台将输出类似 `https://screenx-8aw.pages.dev/` 的官方预览地址。
- **验证点**：使用浏览器或终端访问，HTTP 状态码返回 `200 OK`，页面样式与交互完整。

### 4.4 步骤四：绑定官网自定义域名 (screenx.jacobscy.xyz)

Cloudflare Pages 部署完成后，需在控制台为项目关联正式公网域名：

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)；
2. 导航至 **Workers & Pages** -> 点击名为 **`screenx`** 的项目；
3. 点击顶部 **Custom domains (自定义域)** 选项卡 -> 点击 **Set up a custom domain**；
4. 填入：`screenx.jacobscy.xyz`，点击 **Continue** -> **Activate domain**；
5. DNS 记录将自动创建并完成 SSL 证书签发。

### 4.5 步骤五：开通 R2 存储桶并同步全量发布包

1. **首次开通 R2**：
   - 登录 Cloudflare 控制台，点击左侧菜单 **R2**；
   - 点击 **Get Started / 启用 R2**（每月 10GB 免费存储和 1000 万次读取，0 费用）。
2. **执行全量对象同步**：
   ```powershell
   pnpm run publish:r2
   ```
   脚本将全自动创建存储桶 `screenx-releases`，并以上传参数 `--remote` 将安装包、便携包、源码包与 `latest.json` 推送到云端。

### 4.6 步骤六：配置 R2 自定义下载域名 (download.jacobscy.xyz)

为存储桶绑定外部 CDN 访问域名：

1. 在 Cloudflare Dashboard 左侧点击 **R2** -> 点击存储桶 **`screenx-releases`**；
2. 切换到 **Settings (设置)** 选项卡 -> 找到 **Public access (公开访问)**；
3. 在 **Custom Domains (自定义域)** 下点击 **Connect Domain**；
4. 输入：`download.jacobscy.xyz`，确认连接绑定；
5. 验证访问：打开 `https://download.jacobscy.xyz/screenx/latest.json`，能正常返回 JSON 元数据。

### 4.7 步骤七：联动 Navigation 门户与生产验证

在 `D:\ClaudeCodePj\Navigation\portal-frontend` 中注册 ScreenX 卡片条目：

1. **资源配置**：在 `app/stores/resource.ts` 的 `Projects` 区域追加：
   ```typescript
   {
     id: 'project-screenx',
     title: 'ScreenX',
     description: 'Windows 截图 · OCR · 搜索 · 翻译 · 贴图 · 滚动截图',
     type: 'project',
     url: 'https://screenx.jacobscy.xyz/',
     icon: 'https://screenx.jacobscy.xyz/assets/logo.svg',
     category: '独立项目',
     categoryId: 'cat-projects',
     tags: ['Electron', 'TypeScript', 'Windows', 'OCR'],
     status: 'active',
     target: 'external',
     visibility: 'public',
     viewCount: 660,
     order: 140,
     meta: {
       techStack: ['Electron', 'TypeScript', 'C# WinCapture', 'PaddleOCR'],
       author: 'Jacob',
       version: '1.0.0',
     },
   }
   ```
2. **构建验证**：
   ```powershell
   cd D:\ClaudeCodePj\Navigation\portal-frontend
   pnpm run build
   ```
   确保 Nuxt Nitro 生产环境编译通过。

---

## 5. 过程核心问题与排障复盘 (FAQ)

### Q1: electron-builder 打包时依赖下载超时卡死？
- **现象**：执行 `pnpm run build:release` 时，构建卡在 `Downloading winCodeSign...` 或 `nsis-resources...`，或直接抛出网络连接异常。
- **根本原因 (Root Cause)**：`electron-builder` 在 Windows 首次打包 NSIS 时，需从 GitHub Release 下载预编译签名工具与 NSIS 插件，在国内网络环境下直连经常受阻。
- **解决方案**：在 `scripts/build-release.js` 中自动为子进程注入代理环境变量（例如本地运行的 HTTP 代理）：
  ```javascript
  const proxy = 'http://127.0.0.1:7897';
  process.env.HTTP_PROXY = proxy;
  process.env.HTTPS_PROXY = proxy;
  process.env.ELECTRON_BUILDER_BINARIES_MIRROR = 'https://npmmirror.com/mirrors/electron-builder-binaries/';
  ```

### Q2: 执行 Wrangler 命令提示 You are not authenticated？
- **现象**：`pnpm run deploy:site` 报错退出，提示 `You are not authenticated. Please run wrangler login`。
- **根本原因**：全新终端或未登录环境下，Wrangler 没有本地缓存的 OAuth 访问凭证。
- **解决方案**：在终端执行 `pnpm exec wrangler login`，浏览器完成点击授权，无需在 Git 中提交任何私密 Token。

### Q3: 静态站点默认部署为了 Preview 预览环境而非 Production？
- **现象**：部署后生成的链接为 `https://27260474.screenx-8aw.pages.dev`，Cloudflare 控制台显示环境为 `Preview`。
- **根本原因**：本地 Git 处于特性分支（如 `feature/screenshot-personal-edition`），Wrangler 默认规则是将非主分支推为 Preview 部署。
- **解决方案**：修改 `scripts/deploy-site.js`，部署命令显式传入 `--branch main --commit-dirty=true`：
  ```javascript
  execSync(`pnpm exec wrangler pages deploy "${siteDir}" --project-name ${projectName} --branch main --commit-dirty=true`, { stdio: 'inherit' });
  ```

### Q4: 访问 screenx.jacobscy.xyz 提示 SSL/TLS 握手失败或无法访问？
- **现象**：执行 `curl https://screenx.jacobscy.xyz` 报错 `curl: (35) schannel: failed to receive handshake, SSL/TLS connection failed`。
- **根本原因**：Pages 项目虽已部署，但该二级域名尚未与 Pages 实例建立 Custom Domain 路由映射，导致 Cloudflare 边缘节点未下发对应 SSL 证书。
- **解决方案**：登录 Cloudflare Dashboard -> **Workers & Pages** -> 选择 **`screenx`** -> **Custom domains** -> 绑定 `screenx.jacobscy.xyz`。

### Q5: 存储桶创建报错：Please enable R2 through the Cloudflare Dashboard [code: 10042]？
- **现象**：运行 `publish:r2` 时抛出 `A request to the Cloudflare API failed. Please enable R2 through the Cloudflare Dashboard. [code: 10042]`。
- **根本原因**：Cloudflare 账户此前从未在网页端点亮 R2 服务协议。
- **解决方案**：登录 Cloudflare Dashboard，在左侧侧边栏点击 **R2**，点击 **启用 / Get Started** 确认开通（免费 10GB 额度），开通后再次运行即可顺利创建 `screenx-releases` 桶。

### Q6: Wrangler 上传提示 Resource location: local 导致未推送到云端？
- **现象**：执行 `wrangler r2 object put` 时提示 `Resource location: local. Use --remote if you want to access the remote instance`，云端桶中未见安装包。
- **根本原因**：Wrangler 4.x+ 引入了本地模拟存储环境，默认对未明确标注 target 的命令操作本地 mock 存储。
- **解决方案**：在 `scripts/publish-r2.js` 的所有 R2 操作命令末尾显式追加 `--remote` 参数：
  ```javascript
  const cmd = `pnpm exec wrangler r2 object put ${bucketName}/... --file "..." --remote`;
  ```

### Q7: GPL-3.0 法律合规与源码包自动化生成要求？
- **现象**：基于 GPL-3.0 项目（eSearch）修改后公开分发二进制时，若无对应源码归档将构成许可违规。
- **解决方案**：
  1. 保留根目录 [`LICENSE`](file:///D:/ClaudeCodePj/ScreenX/LICENSE) 与原作者 `xushengfeng` 署名；
  2. 建立规范的 [`NOTICE.md`](file:///D:/ClaudeCodePj/ScreenX/NOTICE.md) 说明主要演进变更；
  3. 构建脚本中通过 `archiver` 自动将 `src/`, `resources/`, `test/`, `package.json`, `NOTICE.md` 压缩生成 `ScreenX-x.y.z-source.zip`，并同安装包一并同步至 R2；
  4. 官网首页底部设立专属【开源与许可】区块，直连源码下载。

### Q8: 截图核心防退化与 Native Capture 进程泄漏审计？
- **现象**：发版过程中如盲目重写捕获逻辑，极易引发 Windows GDI 句柄泄漏或后台残留多个僵尸 `wincapture.exe`。
- **排障与审计策略**：
  1. 绝不修改经测试验证稳定的原生 C# 捕获管道与异步守护机制；
  2. 构建完成后通过自动化测试套件与进程审计命令复核：
     ```powershell
     Get-Process -Name "*wincapture*", "*ScreenX*", "*screenshot*" -ErrorAction SilentlyContinue
     ```
     确保应用启动、截图与关闭后无任何孤立子进程驻留，CPU 与内存开销为 0。

---

## 6. 自动化脚本与命令速查

| 命令 | 对应脚本 | 行为说明 |
| :--- | :--- | :--- |
| `pnpm run build:release` | `scripts/build-release.js` | 编译 C# 原生模块，打包 NSIS 安装包、绿色包、源码归档与 latest.json |
| `pnpm run deploy:site` | `scripts/deploy-site.js` | 将 `release-site/` 生产静态站部署到 Cloudflare Pages |
| `pnpm run publish:r2` | `scripts/publish-r2.js` | 将 release 产物全量推送到 Cloudflare R2 云端存储桶 |
| `pnpm run release` | 整合流水线 | 串联执行上述全套流程，完成一键全量发版 |

---

## 7. 新版本发版标准作业程序 (SOP)

当 ScreenX 演进到下一版本（例如从 `1.0.0` 升级至 `1.0.1`）：

```powershell
# 1. 检出工作区并修改版本号
# 编辑 package.json 中的 "version": "1.0.1"

# 2. 执行全自动化发布流水线
cd D:\ClaudeCodePj\ScreenX
pnpm run release

# 3. 验证公网下载与版本元数据
curl -I https://download.jacobscy.xyz/screenx/latest.json
curl -I https://download.jacobscy.xyz/screenx/v1.0.1/ScreenX-Setup-1.0.1.exe

# 4. 验证官网展示
# 访问 https://screenx.jacobscy.xyz/，确认 Hero 区域显示版本为 1.0.1 且下载按钮链接已刷新
```
